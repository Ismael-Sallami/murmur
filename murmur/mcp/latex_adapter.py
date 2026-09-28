"""Adaptador para exportación a LaTeX y compilación a PDF de alta calidad.

Transforma los apuntes en Markdown en documentos LaTeX estructurados,
maquetados con estilo de artículo académico y cajas de teoremas/conceptos.
"""

import asyncio
from datetime import datetime
import logging
from pathlib import Path
import re
import shutil
import aiofiles

from murmur.config import settings

logger = logging.getLogger(__name__)

LATEX_TEMPLATE = r"""\documentclass[11pt,a4paper]{{article}}
\usepackage[utf8]{{inputenc}}
\usepackage[spanish,es-nodecimaldot]{{babel}}
\usepackage{{amsmath,amssymb,amsfonts,amsthm}}
\usepackage{{geometry}}
\geometry{{margin=2.5cm}}
\usepackage{{hyperref}}
\usepackage{{xcolor}}
\usepackage{{tcolorbox}}
\usepackage{{enumitem}}

\hypersetup{{
    colorlinks=true,
    linkcolor=blue!70!black,
    urlcolor=blue!70!black
}}

% Estilo de cajas para avisos y definiciones
\tcbset{{
    colback=blue!5!white,
    colframe=blue!75!black,
    arc=3mm,
    fonttitle=\bfseries
}}

\title{{\textbf{{{title}}}}}
\author{{\textbf{{Asignatura:}} {subject}}}
\date{{{date}}}

\begin{{document}}

\maketitle
\tableofcontents
\vspace{{1cm}}
\hrule
\vspace{{0.5cm}}

{body}

\end{{document}}
"""


class LaTeXAdapter:
    """Gestiona la conversión de apuntes a documentos LaTeX y compilación a PDF."""

    def __init__(self, output_dir: Path | None = None) -> None:
        self.output_dir = output_dir or (settings.data_dir / "exports" / "latex")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _markdown_to_latex(self, md: str) -> str:
        """Conversión básica y robusta de Markdown estructurado a sintaxis LaTeX."""
        text = md

        # Eliminar encabezado principal si ya se incluye en el título
        text = re.sub(r"^#\s+.*\n", "", text)

        # Encabezados
        text = re.sub(r"^###\s+(.*)$", r"\\subsubsection{\1}", text, flags=re.MULTILINE)
        text = re.sub(r"^##\s+(.*)$", r"\\subsection{\1}", text, flags=re.MULTILINE)

        # Negritas y cursivas
        text = re.sub(r"\*\*(.*?)\*\*", r"\\textbf{\1}", text)
        text = re.sub(r"\*(.*?)\*", r"\\textit{\1}", text)

        # Bloques de cita / Avisos a tcolorbox
        def _quote_repl(match):
            content = match.group(1).strip()
            return f"\\begin{{tcolorbox}}[title=Nota Importante]\n{content}\n\\end{{tcolorbox}}"

        text = re.sub(r"^>\s+(.*)$", _quote_repl, text, flags=re.MULTILINE)

        # Limpiar wikilinks [[Concepto]] -> Concepto
        text = re.sub(r"\[\[(.*?)\]\]", r"\\textbf{\1}", text)

        # Reglas horizontales
        text = re.sub(r"^---+$", r"\\hrulefill", text, flags=re.MULTILINE)

        return text

    async def export_latex(
        self,
        title: str,
        content: str,
        subject: str = "General",
        compile_pdf: bool = True,
    ) -> dict[str, Path | None]:
        """Genera el código fuente .tex y opcionalmente compila a PDF si existe pdflatex o tectonic."""
        clean_title = re.sub(r'[\\/*?:"<>|]', "", title).strip() or "Apuntes"
        date_str = datetime.now().strftime("%d de %B de %Y")

        latex_body = self._markdown_to_latex(content)
        full_latex = LATEX_TEMPLATE.format(
            title=clean_title,
            subject=subject,
            date=date_str,
            body=latex_body,
        )

        tex_path = self.output_dir / f"{clean_title}.tex"
        async with aiofiles.open(tex_path, "w", encoding="utf-8") as f:
            await f.write(full_latex)

        pdf_path: Path | None = None
        if compile_pdf:
            compiler = shutil.which("tectonic") or shutil.which("pdflatex")
            if compiler:
                logger.info("Compilando LaTeX con %s...", compiler)
                cmd = (
                    [compiler, "-interaction=nonstopmode", f"-output-directory={self.output_dir}", str(tex_path)]
                    if "pdflatex" in compiler
                    else [compiler, str(tex_path), "--outdir", str(self.output_dir)]
                )
                try:
                    proc = await asyncio.create_subprocess_exec(
                        *cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    await proc.communicate()
                    expected_pdf = self.output_dir / f"{clean_title}.pdf"
                    if expected_pdf.exists():
                        pdf_path = expected_pdf
                        logger.info("PDF compilado con éxito: %s", pdf_path)
                except Exception as e:
                    logger.warning("No se pudo compilar el PDF automáticamente: %s", e)
            else:
                logger.info("No se encontró pdflatex ni tectonic en el sistema. Se generó solo el .tex.")

        return {"tex": tex_path, "pdf": pdf_path}
