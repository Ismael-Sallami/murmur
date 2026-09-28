"""Organizador automático de ficheros estructurados para Murmur.

Guarda, categoriza y estructura automáticamente todas las salidas de clase:
- Apuntes en Markdown (Método Cornell con YAML frontmatter)
- Código fuente LaTeX (.tex) y PDF compilado
- Transcripción literal (.txt)
- Metadatos y tarjetas de repaso Anki (.json)
- Sincronización automática con la bóveda de Obsidian si está configurada.
"""

from datetime import datetime
import json
import logging
from pathlib import Path
import re
from typing import Any, Dict, List
import aiofiles

from murmur.config import settings
from murmur.mcp.latex_adapter import LaTeXAdapter

logger = logging.getLogger(__name__)


class FileOrganizer:
    """Gestiona el árbol de carpetas por asignatura y organiza los ficheros automáticamente."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self.base_dir = (base_dir or settings.data_dir) / "clases"
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.latex_adapter = LaTeXAdapter(output_dir=self.base_dir)

    def _sanitize(self, text: str) -> str:
        """Limpia caracteres no válidos para el sistema de archivos."""
        clean = re.sub(r'[\\/*?:"<>|]', "", text).strip()
        return clean.replace(" ", "_") or "Clase"

    async def auto_structure_lecture(
        self,
        subject: str,
        title: str,
        transcript: str,
        notes_md: str,
        audio_path: str | None = None,
    ) -> Dict[str, Any]:
        """Organiza y guarda automáticamente todos los ficheros de una clase en su carpeta temática."""
        safe_subject = self._sanitize(subject)
        safe_title = self._sanitize(title)
        date_str = datetime.now().strftime("%Y-%m-%d")

        # 1. Crear directorio estructurado por Asignatura
        subject_dir = self.base_dir / safe_subject
        subject_dir.mkdir(parents=True, exist_ok=True)

        prefix = f"{date_str}_{safe_title}"
        created_files: Dict[str, str] = {}

        # 2. Guardar Transcripción literal (.txt)
        txt_path = subject_dir / f"{prefix}_transcripcion.txt"
        async with aiofiles.open(txt_path, "w", encoding="utf-8") as f:
            await f.write(transcript)
        created_files["transcript_txt"] = str(txt_path)

        # 3. Guardar Apuntes estructurados en Markdown (.md con YAML Frontmatter)
        tags = ["apuntes", "murmur", safe_subject.lower().replace("_", "-")]
        frontmatter = (
            "---\n"
            f"title: \"{title}\"\n"
            f"subject: \"{subject}\"\n"
            f"date: {date_str}\n"
            f"tags: [{', '.join(tags)}]\n"
            "type: lecture-notes\n"
            "---\n\n"
        )
        full_markdown = frontmatter + notes_md
        md_path = subject_dir / f"{prefix}_apuntes.md"
        async with aiofiles.open(md_path, "w", encoding="utf-8") as f:
            await f.write(full_markdown)
        created_files["notes_md"] = str(md_path)

        # 4. Generar y guardar fichero LaTeX (.tex) y compilar PDF si es posible
        latex_results = await self.latex_adapter.export_latex(
            title=title,
            content=notes_md,
            subject=subject,
            compile_pdf=True,
        )
        # Mover o vincular a la carpeta de la asignatura
        if latex_results.get("tex"):
            tex_target = subject_dir / f"{prefix}.tex"
            latex_results["tex"].rename(tex_target)
            created_files["latex_tex"] = str(tex_target)

        if latex_results.get("pdf"):
            pdf_target = subject_dir / f"{prefix}.pdf"
            latex_results["pdf"].rename(pdf_target)
            created_files["latex_pdf"] = str(pdf_target)

        # 5. Guardar Metadatos e Índice de la sesión (.json)
        metadata = {
            "title": title,
            "subject": subject,
            "date": date_str,
            "timestamp": datetime.now().isoformat(),
            "word_count_transcript": len(transcript.split()),
            "word_count_notes": len(notes_md.split()),
            "files": created_files,
        }
        meta_path = subject_dir / f"{prefix}_indice.json"
        async with aiofiles.open(meta_path, "w", encoding="utf-8") as f:
            await f.write(json.dumps(metadata, indent=2, ensure_ascii=False))
        created_files["metadata_json"] = str(meta_path)

        # 6. Sincronizar automáticamente con la bóveda de Obsidian si está configurada
        if settings.obsidian_vault_path and settings.obsidian_vault_path.exists():
            obsidian_subject = settings.obsidian_vault_path / safe_subject
            obsidian_subject.mkdir(parents=True, exist_ok=True)
            obsidian_file = obsidian_subject / f"{safe_title}.md"
            async with aiofiles.open(obsidian_file, "w", encoding="utf-8") as f:
                await f.write(full_markdown)
            created_files["obsidian_sync"] = str(obsidian_file)
            logger.info("Sincronizado automáticamente en Obsidian: %s", obsidian_file)

        logger.info("Clase estructurada exitosamente en %d ficheros dentro de %s", len(created_files), subject_dir)

        return {
            "status": "success",
            "subject": subject,
            "title": title,
            "directory": str(subject_dir),
            "files": created_files,
        }

    def get_structure_tree(self) -> List[Dict[str, Any]]:
        """Devuelve el árbol jerárquico de asignaturas y ficheros estructurados creados."""
        if not self.base_dir.exists():
            return []

        tree = []
        for subject_dir in sorted(self.base_dir.iterdir()):
            if subject_dir.is_dir():
                files = []
                for file_path in sorted(subject_dir.iterdir()):
                    if file_path.is_file():
                        files.append({
                            "name": file_path.name,
                            "path": str(file_path),
                            "size_bytes": file_path.stat().st_size,
                            "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                            "extension": file_path.suffix.lower(),
                        })
                tree.append({
                    "subject": subject_dir.name.replace("_", " "),
                    "folder": str(subject_dir),
                    "file_count": len(files),
                    "files": files,
                })
        return tree


file_organizer = FileOrganizer()
