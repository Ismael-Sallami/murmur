"""Rutas de la API para gestión de audio y transcripción.

Soporta subida de archivos directos, streaming de chunks desde navegadores
móviles y ejecución del pipeline de Whisper.
"""

from datetime import datetime
import logging
from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
import aiofiles

from murmur.config import settings
from murmur.core.audio import AudioManager
from murmur.core.whisper_engine import get_whisper_engine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/audio", tags=["Audio"])
audio_manager = AudioManager()


class TranscribeRequest(BaseModel):
    """Petición para transcribir un archivo ya subido."""
    audio_path: str
    language: str = "es"
    whisper_provider: str | None = None


@router.post("/upload")
async def upload_audio_file(file: UploadFile = File(...)):
    """Sube un archivo de audio completo desde cualquier dispositivo."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="El archivo no tiene nombre válido.")

    content = await file.read()
    saved_path = await audio_manager.save_upload(file.filename, content)
    return {
        "status": "success",
        "filename": file.filename,
        "path": str(saved_path),
        "size_bytes": len(content),
    }


@router.post("/chunk")
async def upload_audio_chunk(
    session_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
):
    """Recibe un fragmento temporal de audio durante la grabación en directo."""
    content = await chunk.read()
    saved_path = await audio_manager.save_chunk(session_id, chunk_index, content)
    return {
        "status": "success",
        "session_id": session_id,
        "chunk_index": chunk_index,
        "path": str(saved_path),
    }


@router.post("/finalize")
async def finalize_recording_session(session_id: str = Form(...)):
    """Finaliza una sesión de grabación móvil y concatena todos sus trozos con ffmpeg."""
    try:
        merged_path = await audio_manager.merge_session_chunks(session_id)
        return {
            "status": "success",
            "session_id": session_id,
            "merged_path": str(merged_path),
        }
    except Exception as e:
        logger.error("Error al ensamblar la sesión %s: %s", session_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    """Ejecuta la transcripción con Whisper para el archivo especificado."""
    path = Path(request.audio_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {request.audio_path}")

    try:
        engine = get_whisper_engine(request.whisper_provider)
        result = await engine.transcribe(path, language=request.language)

        # Guardar copia de la transcripción en bruto
        date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        txt_path = settings.data_dir / "transcripts" / f"{path.stem}_{date_str}.txt"
        async with aiofiles.open(txt_path, "w", encoding="utf-8") as f:
            await f.write(result.text)

        return {
            "status": "success",
            "text": result.text,
            "language": result.language,
            "transcript_file": str(txt_path),
        }
    except Exception as e:
        logger.error("Error en la transcripción: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
