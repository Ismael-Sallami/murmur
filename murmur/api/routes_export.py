"""Rutas de la API para exportación de apuntes vía MCP."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from murmur.mcp.client import MCPDispatcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["Exportación"])
dispatcher = MCPDispatcher()


class ExportRequest(BaseModel):
    """Petición de exportación a herramientas externas."""
    target: Literal["obsidian", "latex", "notion"]
    title: str
    content: str
    subject: str = "General"
    compile_pdf: bool = True


@router.post("")
async def export_notes(request: ExportRequest):
    """Exporta los apuntes generados al destino MCP seleccionado."""
    try:
        result = await dispatcher.export(
            target=request.target,
            title=request.title,
            content=request.content,
            subject=request.subject,
            compile_pdf=request.compile_pdf,
        )
        return result
    except Exception as e:
        logger.error("Error al exportar (%s): %s", request.target, e)
        raise HTTPException(status_code=500, detail=str(e))
