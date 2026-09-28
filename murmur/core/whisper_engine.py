"""Motores de transcripción Whisper para Murmur.

Implementa una interfaz unificada para transcribir audios de clases mediante:
1. Groq Cloud Whisper (ultra-rápido, ideal para audios largos sin GPU local).
2. OpenAI Whisper API (oficial).
3. faster-whisper local (basado en CTranslate2 con filtro Silero-VAD).
"""

import abc
import asyncio
import logging
from pathlib import Path
from typing import Any, Dict
import httpx

from murmur.config import settings

logger = logging.getLogger(__name__)


class TranscriptionResult:
    """Resultado estandarizado de una transcripción."""

    def __init__(self, text: str, language: str = "es", raw_data: Dict[str, Any] | None = None) -> None:
        self.text = text.strip()
        self.language = language
        self.raw_data = raw_data or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "language": self.language,
            "raw_data": self.raw_data,
        }


class BaseWhisperEngine(abc.ABC):
    """Interfaz abstracta para motores de transcripción."""

    @abc.abstractmethod
    async def transcribe(self, audio_path: Path, language: str = "es") -> TranscriptionResult:
        """Transcribe un archivo de audio a texto.

        Args:
            audio_path: Ruta al archivo de audio en disco.
            language: Código de idioma ISO (por defecto 'es').

        Returns:
            TranscriptionResult con el texto obtenido.
        """
        pass


class GroqWhisperEngine(BaseWhisperEngine):
    """Motor de transcripción acelerado mediante la API de Groq Cloud (whisper-large-v3)."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.groq_api_key
        if not self.api_key:
            raise ValueError(
                "No se ha configurado GROQ_API_KEY. Añádela a tu archivo .env o selecciona otro proveedor."
            )
        self.endpoint = "https://api.groq.com/openai/v1/audio/transcriptions"
        self.model = "whisper-large-v3-turbo"

    async def transcribe(self, audio_path: Path, language: str = "es") -> TranscriptionResult:
        logger.info("Enviando audio a Groq Whisper (%s): %s", self.model, audio_path.name)
        headers = {"Authorization": f"Bearer {self.api_key}"}

        async with httpx.AsyncClient(timeout=300.0) as client:
            with open(audio_path, "rb") as f:
                files = {"file": (audio_path.name, f, "audio/mpeg")}
                data = {
                    "model": self.model,
                    "language": language,
                    "response_format": "verbose_json",
                }
                response = await client.post(self.endpoint, headers=headers, files=files, data=data)

            if response.status_code != 200:
                logger.error("Error en respuesta de Groq: %s", response.text)
                response.raise_for_status()

            payload = response.json()
            return TranscriptionResult(
                text=payload.get("text", ""),
                language=payload.get("language", language),
                raw_data=payload,
            )


class OpenAIWhisperEngine(BaseWhisperEngine):
    """Motor de transcripción oficial de OpenAI (whisper-1)."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.openai_api_key
        if not self.api_key:
            raise ValueError(
                "No se ha configurado OPENAI_API_KEY. Añádela a tu archivo .env o selecciona otro proveedor."
            )
        self.endpoint = "https://api.openai.com/v1/audio/transcriptions"
        self.model = "whisper-1"

    async def transcribe(self, audio_path: Path, language: str = "es") -> TranscriptionResult:
        logger.info("Enviando audio a OpenAI Whisper API: %s", audio_path.name)
        headers = {"Authorization": f"Bearer {self.api_key}"}

        async with httpx.AsyncClient(timeout=300.0) as client:
            with open(audio_path, "rb") as f:
                files = {"file": (audio_path.name, f, "audio/mpeg")}
                data = {
                    "model": self.model,
                    "language": language,
                    "response_format": "verbose_json",
                }
                response = await client.post(self.endpoint, headers=headers, files=files, data=data)

            if response.status_code != 200:
                logger.error("Error en respuesta de OpenAI: %s", response.text)
                response.raise_for_status()

            payload = response.json()
            return TranscriptionResult(
                text=payload.get("text", ""),
                language=payload.get("language", language),
                raw_data=payload,
            )


class FasterWhisperEngine(BaseWhisperEngine):
    """Motor de transcripción 100% local basado en faster-whisper (CTranslate2)."""

    def __init__(
        self,
        model_size: str | None = None,
        device: str | None = None,
        compute_type: str | None = None,
    ) -> None:
        self.model_size = model_size or settings.local_whisper_model
        self.device = device or settings.local_whisper_device
        self.compute_type = compute_type or settings.local_whisper_compute_type
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info(
                    "Cargando modelo local faster-whisper '%s' (device=%s, compute=%s)...",
                    self.model_size,
                    self.device,
                    self.compute_type,
                )
                self._model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type,
                )
            except ImportError as exc:
                raise ImportError(
                    "Para usar el motor local debes instalar: pip install 'murmur[local-whisper]'"
                ) from exc
        return self._model

    async def transcribe(self, audio_path: Path, language: str = "es") -> TranscriptionResult:
        logger.info("Transcribiendo localmente con faster-whisper: %s", audio_path.name)
        loop = asyncio.get_running_loop()

        def _sync_transcribe():
            model = self._get_model()
            # vad_filter=True activa Silero-VAD para descartar tramos sin voz y evitar bucles
            segments, info = model.transcribe(
                str(audio_path),
                language=language,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500),
            )
            text_chunks = [segment.text for segment in segments]
            full_text = " ".join(text_chunks).strip()
            return full_text, info.language

        text, detected_lang = await loop.run_in_executor(None, _sync_transcribe)
        return TranscriptionResult(text=text, language=detected_lang)


def get_whisper_engine(provider: str | None = None) -> BaseWhisperEngine:
    """Factory para obtener la instancia del motor de transcripción configurado."""
    chosen_provider = provider or settings.whisper_provider

    if chosen_provider == "groq":
        return GroqWhisperEngine()
    elif chosen_provider == "openai":
        return OpenAIWhisperEngine()
    elif chosen_provider in ("faster-whisper", "local"):
        return FasterWhisperEngine()
    else:
        raise ValueError(f"Proveedor de Whisper desconocido o no soportado: {chosen_provider}")
