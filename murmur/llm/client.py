"""Cliente agnóstico para modelos de lenguaje (LLM).

Soporta múltiples proveedores mediante sus endpoints REST:
- Groq Cloud (Llama 3.3, Qwen 2.5)
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet)
- Google Gemini (Gemini 1.5/2.0 Flash)
- Ollama (Modelos locales)
"""

import logging
from typing import Any, Dict
import httpx

from murmur.config import settings
from murmur.llm.prompts import ACADEMIC_SYSTEM_PROMPT, CORNELL_TEMPLATE

logger = logging.getLogger(__name__)


class LLMClient:
    """Cliente unificado para generación de contenido académico con cualquier LLM."""

    def __init__(
        self,
        provider: str | None = None,
        model: str | None = None,
    ) -> None:
        self.provider = (provider or settings.llm_provider).lower()
        self.model = model or settings.llm_model

    async def generate_notes(
        self,
        transcript: str,
        subject: str = "General",
        session_date: str = "Hoy",
    ) -> str:
        """Genera apuntes de clase estructurados a partir de la transcripción cruda."""
        if not transcript.strip():
            raise ValueError("La transcripción está vacía; no se pueden generar apuntes.")

        user_prompt = CORNELL_TEMPLATE.format(
            subject=subject,
            session_date=session_date,
            transcript=transcript,
        )

        logger.info(
            "Generando apuntes con proveedor '%s' (modelo: %s)...",
            self.provider,
            self.model,
        )

        if self.provider in ("groq", "openai", "ollama"):
            return await self._call_openai_compatible(user_prompt)
        elif self.provider == "anthropic":
            return await self._call_anthropic(user_prompt)
        elif self.provider == "gemini":
            return await self._call_gemini(user_prompt)
        else:
            raise ValueError(f"Proveedor LLM no soportado: {self.provider}")

    async def _call_openai_compatible(self, prompt: str) -> str:
        """Llama a APIs compatibles con el protocolo de OpenAI (Groq, OpenAI, Ollama)."""
        if self.provider == "groq":
            api_key = settings.groq_api_key
            if not api_key:
                raise ValueError("Se requiere GROQ_API_KEY en .env")
            url = "https://api.groq.com/openai/v1/chat/completions"
        elif self.provider == "openai":
            api_key = settings.openai_api_key
            if not api_key:
                raise ValueError("Se requiere OPENAI_API_KEY en .env")
            url = "https://api.openai.com/v1/chat/completions"
        else:  # ollama
            api_key = "ollama"
            url = f"{settings.ollama_base_url}/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": ACADEMIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code != 200:
                logger.error("Error en respuesta LLM: %s", response.text)
                response.raise_for_status()

            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _call_anthropic(self, prompt: str) -> str:
        """Llama a la API oficial de Anthropic Messages (Claude 3.5)."""
        api_key = settings.anthropic_api_key
        if not api_key:
            raise ValueError("Se requiere ANTHROPIC_API_KEY en .env para usar Claude")

        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "system": ACADEMIC_SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096,
            "temperature": 0.3,
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]

    async def _call_gemini(self, prompt: str) -> str:
        """Llama a la API de Google Gemini (v1beta)."""
        api_key = settings.gemini_api_key
        if not api_key:
            raise ValueError("Se requiere GEMINI_API_KEY en .env para usar Gemini")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={api_key}"
        payload = {
            "systemInstruction": {"parts": [{"text": ACADEMIC_SYSTEM_PROMPT}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
            },
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
