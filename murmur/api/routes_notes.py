"""Rutas de la API para generación de apuntes académicos con LLM."""

from datetime import datetime
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiofiles

from murmur.config import settings
from murmur.llm.client import LLMClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notes", tags=["Apuntes"])


class GenerateNotesRequest(BaseModel):
    """Parámetros para la generación de apuntes."""
    transcript: str
    subject: str = "General"
    session_date: str | None = None
    llm_provider: str | None = None
    llm_model: str | None = None


@router.post("/generate")
async def generate_notes(request: GenerateNotesRequest):
    """Procesa una transcripción cruda con el LLM seleccionado para generar apuntes."""
    date_val = request.session_date or datetime.now().strftime("%d/%m/%Y")

    try:
        client = LLMClient(provider=request.llm_provider, model=request.llm_model)
        notes_md = await client.generate_notes(
            transcript=request.transcript,
            subject=request.subject,
            session_date=date_val,
        )

        # Persistir los apuntes generados en disco
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_subject = request.subject.replace(" ", "_")
        note_file = settings.data_dir / "notes" / f"{safe_subject}_{timestamp}.md"

        async with aiofiles.open(note_file, "w", encoding="utf-8") as f:
            await f.write(notes_md)

        return {
            "status": "success",
            "subject": request.subject,
            "session_date": date_val,
            "notes": notes_md,
            "saved_file": str(note_file),
        }
    except Exception as e:
        logger.error("Error al generar apuntes: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
