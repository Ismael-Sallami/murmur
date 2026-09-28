"""Despachador central y cliente MCP (Model Context Protocol).

Proporciona un punto de entrada único para conectar el pipeline de Murmur
con herramientas de productividad y bases de conocimiento.
"""

import logging
from typing import Any, Dict, Literal
from murmur.mcp.obsidian_adapter import ObsidianAdapter
from murmur.mcp.latex_adapter import LaTeXAdapter
from murmur.mcp.notion_adapter import NotionAdapter

logger = logging.getLogger(__name__)

ExportTarget = Literal["obsidian", "latex", "notion"]


class MCPDispatcher:
    """Orquestador de exportaciones para múltiples destinos y servidores MCP."""

    def __init__(self) -> None:
        self.obsidian = ObsidianAdapter()
        self.latex = LaTeXAdapter()
        self.notion = NotionAdapter()

    async def export(
        self,
        target: ExportTarget,
        title: str,
        content: str,
        subject: str = "General",
        compile_pdf: bool = True,
    ) -> Dict[str, Any]:
        """Exporta los apuntes al destino deseado.

        Args:
            target: Destino ('obsidian', 'latex', 'notion').
            title: Título de la clase.
            content: Apuntes generados en Markdown.
            subject: Nombre de la asignatura.
            compile_pdf: En caso de LaTeX, intentar compilar a PDF.

        Returns:
            Diccionario con el resultado de la operación (rutas o IDs creados).
        """
        logger.info("Exportando apuntes a destino MCP '%s' para la clase '%s'", target, title)

        if target == "obsidian":
            path = await self.obsidian.export_note(title=title, content=content, subject=subject)
            return {"status": "success", "target": "obsidian", "file_path": str(path)}

        elif target == "latex":
            results = await self.latex.export_latex(
                title=title, content=content, subject=subject, compile_pdf=compile_pdf
            )
            return {
                "status": "success",
                "target": "latex",
                "tex_path": str(results["tex"]),
                "pdf_path": str(results["pdf"]) if results["pdf"] else None,
            }

        elif target == "notion":
            res = await self.notion.export_page(title=title, content=content, subject=subject)
            return {"status": "success", "target": "notion", "notion_id": res.get("id")}

        else:
            raise ValueError(f"Destino de exportación desconocido: {target}")
