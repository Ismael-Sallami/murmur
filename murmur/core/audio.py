"""Gestión, procesamiento y concatenación de flujos de audio para Murmur.

Maneja subidas de archivos completos, recepción de fragmentos (chunks) en tiempo
real desde navegadores móviles/tablets y normalización mediante ffmpeg.
"""

import asyncio
import logging
from pathlib import Path
from typing import List
import aiofiles

from murmur.config import settings

logger = logging.getLogger(__name__)


class AudioManager:
    """Administrador de archivos y fragmentos de audio para sesiones de clase."""

    def __init__(self, data_dir: Path | None = None) -> None:
        self.data_dir = data_dir or settings.data_dir
        self.uploads_dir = self.data_dir / "uploads"
        self.chunks_dir = self.data_dir / "chunks"
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.chunks_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, filename: str, content: bytes) -> Path:
        """Guarda un archivo de audio completo subido por el usuario.

        Args:
            filename: Nombre original o generado del archivo.
            content: Bytes del audio subido.

        Returns:
            Path al archivo guardado en disco.
        """
        target_path = self.uploads_dir / filename
        async with aiofiles.open(target_path, "wb") as f:
            await f.write(content)
        logger.info("Archivo de audio guardado exitosamente: %s (%d bytes)", target_path, len(content))
        return target_path

    async def save_chunk(self, session_id: str, chunk_index: int, content: bytes) -> Path:
        """Guarda un fragmento (chunk) de audio enviado durante la grabación en directo.

        Args:
            session_id: Identificador único de la clase o sesión.
            chunk_index: Índice correlativo del fragmento (0, 1, 2, ...).
            content: Bytes del fragmento (típicamente WebM/Opus).

        Returns:
            Path al archivo de fragmento guardado.
        """
        session_chunks_dir = self.chunks_dir / session_id
        session_chunks_dir.mkdir(parents=True, exist_ok=True)

        chunk_path = session_chunks_dir / f"chunk_{chunk_index:05d}.webm"
        async with aiofiles.open(chunk_path, "wb") as f:
            await f.write(content)
        logger.debug("Chunk %d guardado para la sesión %s", chunk_index, session_id)
        return chunk_path

    async def merge_session_chunks(self, session_id: str) -> Path:
        """Concatena todos los fragmentos acumulados de una sesión en un único archivo.

        Utiliza ffmpeg con el protocolo concat para unir los trozos de WebM/Opus
        sin pérdida y convertirlos a un archivo de audio estandarizado (MP3 / WAV).

        Args:
            session_id: Identificador de la sesión a ensamblar.

        Returns:
            Path al archivo final ensamblado y listo para transcripción.
        """
        session_chunks_dir = self.chunks_dir / session_id
        if not session_chunks_dir.exists():
            raise FileNotFoundError(f"No se encontraron fragmentos para la sesión: {session_id}")

        # Listar y ordenar todos los trozos por índice
        chunks = sorted(session_chunks_dir.glob("chunk_*.webm"))
        if not chunks:
            raise ValueError(f"La sesión {session_id} no contiene fragmentos de audio.")

        output_path = self.uploads_dir / f"session_{session_id}_merged.mp3"
        list_file = session_chunks_dir / "concat_list.txt"

        # Crear archivo de lista para el demuxer concat de ffmpeg
        # Formato: file 'ruta_absoluta'
        lines = [f"file '{chunk.resolve()}'\n" for chunk in chunks]
        async with aiofiles.open(list_file, "w") as f:
            await f.writelines(lines)

        # Invocar ffmpeg de forma asíncrona para unir y transcodificar
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-vn",
            "-ar", "16000",        # 16 kHz es la frecuencia óptima para Whisper
            "-ac", "1",            # Mono (reduce a la mitad el tamaño sin perder fidelidad de voz)
            "-b:a", "64k",         # Calidad excelente para voz
            str(output_path),
        ]

        logger.info("Concatenando %d chunks para la sesión %s...", len(chunks), session_id)
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            logger.error("Error al ejecutar ffmpeg: %s", stderr.decode())
            raise RuntimeError(f"Fallo en ffmpeg al unir los fragmentos: {stderr.decode()}")

        logger.info("Audio de la sesión %s ensamblado correctamente: %s", session_id, output_path)
        return output_path

    async def convert_to_whisper_format(self, input_path: Path) -> Path:
        """Normaliza cualquier archivo de audio de entrada a 16kHz mono.

        Esto garantiza la máxima compatibilidad y velocidad con Whisper, ya sea
        un .m4a grabado en iPhone, un .ogg de Android o una nota de voz.
        """
        output_path = input_path.with_suffix(".normalized.mp3")
        cmd = [
            "ffmpeg",
            "-y",
            "-i", str(input_path),
            "-vn",
            "-ar", "16000",
            "-ac", "1",
            "-b:a", "64k",
            str(output_path),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.warning("Fallo en normalización previa, usando archivo original: %s", stderr.decode())
            return input_path
        return output_path
