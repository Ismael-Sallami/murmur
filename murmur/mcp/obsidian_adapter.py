"""Adaptador para exportación a Obsidian (Vault local o vía Obsidian MCP).

Escribe notas en formato Markdown enriquecido, con YAML Frontmatter,
etiquetas jerárquicas y compatibilidad con wikilinks de Obsidian.
"""

from datetime import datetime
import logging
from pathlib import Path
import re
import aiofiles

from murmur.config import settings

logger = logging.getLogger(__name__)


class ObsidianAdapter:
    """Gestiona la exportación y sincronización de apuntes en una bóveda de Obsidian."""

    def __init__(self, vault_path: Path | None = None) -> None:
        self.vault_path = vault_path or settings.obsidian_vault_path

    def _sanitize_filename(self, title: str) -> str:
        """Limpia caracteres inválidos para nombres de archivo."""
        clean = re.sub(r'[\\/*?:"<>|]', "", title)
        return clean.strip() or "Apuntes_Clase"

    async def export_note(
        self,
        title: str,
        content: str,
        subject: str = "General",
        tags: list[str] | None = None,
    ) -> Path:
        """Crea una nota en la bóveda de Obsidian con frontmatter y estructura de carpetas.

        Args:
            title: Título de la clase/nota.
            content: Contenido generado en Markdown.
            subject: Nombre de la asignatura (crea subcarpeta si no existe).
            tags: Lista de etiquetas para el frontmatter.

        Returns:
            Path a la nota creada.
        """
        base_dir = self.vault_path or (settings.data_dir / "exports" / "obsidian")
        subject_dir = base_dir / self._sanitize_filename(subject)
        subject_dir.mkdir(parents=True, exist_ok=True)

        clean_title = self._sanitize_filename(title)
        date_str = datetime.now().strftime("%Y-%m-%d")
        note_filename = f"{clean_title}.md"
        target_path = subject_dir / note_filename

        # Formateo de Frontmatter YAML para Obsidian Dataview / Metadata
        frontmatter_tags = ["apuntes", "murmur", subject.lower().replace(" ", "-")]
        if tags:
            frontmatter_tags.extend(tags)

        frontmatter = (
            "---\n"
            f"title: \"{clean_title}\"\n"
            f"date: {date_str}\n"
            f"subject: \"{subject}\"\n"
            f"tags: [{', '.join(frontmatter_tags)}]\n"
            "type: lecture-notes\n"
            "---\n\n"
        )

        full_note = frontmatter + content

        async with aiofiles.open(target_path, "w", encoding="utf-8") as f:
            await f.write(full_note)

        logger.info("Nota de Obsidian guardada con éxito en: %s", target_path)
        return target_path
