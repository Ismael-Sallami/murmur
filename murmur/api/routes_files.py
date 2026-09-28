"""Rutas de API para exploración y estructuración automática de ficheros."""

import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from murmur.config import settings
from murmur.core.file_organizer import file_organizer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["Ficheros Estructurados"])


class AutoStructureRequest(BaseModel):
    subject: str
    title: str
    transcript: str
    notes_md: str
    audio_path: str | None = None


@router.post("/auto-structure")
async def auto_structure_lecture(request: AutoStructureRequest):
    """Guarda y estructura automáticamente la clase en carpetas por asignatura."""
    try:
        result = await file_organizer.auto_structure_lecture(
            subject=request.subject,
            title=request.title,
            transcript=request.transcript,
            notes_md=request.notes_md,
            audio_path=request.audio_path,
        )
        return result
    except Exception as e:
        logger.error("Error en estructuración automática de ficheros: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tree")
async def get_files_tree():
    """Devuelve la jerarquía organizada de asignaturas y ficheros generados."""
    try:
        tree = file_organizer.get_structure_tree()
        return {"status": "success", "tree": tree}
    except Exception as e:
        logger.error("Error al obtener árbol de ficheros: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_structured_file(file_path: str):
    """Permite descargar directamente cualquiera de los ficheros estructurados generados."""
    target = Path(file_path).resolve()
    base = settings.data_dir.resolve()

    # Seguridad: Evitar Directory Traversal
    if not str(target).startswith(str(base)):
        raise HTTPException(status_code=403, detail="Acceso denegado a rutas fuera del directorio de datos.")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Fichero no encontrado.")

    return FileResponse(
        path=target,
        filename=target.name,
        media_type="application/octet-stream",
    )
