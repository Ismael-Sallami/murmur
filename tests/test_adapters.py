"""Pruebas unitarias para adaptadores de Obsidian y LaTeX."""

import pytest
from pathlib import Path
from murmur.mcp.obsidian_adapter import ObsidianAdapter
from murmur.mcp.latex_adapter import LaTeXAdapter


@pytest.mark.asyncio
async def test_obsidian_adapter(tmp_path: Path):
    adapter = ObsidianAdapter(vault_path=tmp_path)
    title = "Tema 1: Mecánica Cuántica"
    content = "## Principio de Incertidumbre\n\nEl principio de [[Heisenberg]] establece..."
    subject = "Física Avanzada"

    note_path = await adapter.export_note(title=title, content=content, subject=subject)

    assert note_path.exists()
    assert note_path.parent.name == "Física Avanzada"
    text = note_path.read_text(encoding="utf-8")
    assert "---" in text
    assert "title: \"Tema 1 Mecánica Cuántica\"" in text
    assert "tags: [apuntes, murmur, física-avanzada]" in text
    assert "[[Heisenberg]]" in text


@pytest.mark.asyncio
async def test_latex_adapter(tmp_path: Path):
    adapter = LaTeXAdapter(output_dir=tmp_path)
    title = "Termodinámica"
    content = "## Primer Principio\n\n> Aviso importante para el examen\n\nLa energía interna $\\Delta U = Q - W$..."
    subject = "Física"

    result = await adapter.export_latex(title=title, content=content, subject=subject, compile_pdf=False)
    tex_path = result["tex"]

    assert tex_path is not None
    assert tex_path.exists()
    tex_content = tex_path.read_text(encoding="utf-8")
    assert "\\documentclass" in tex_content
    assert "\\subsection{Primer Principio}" in tex_content
    assert "\\begin{tcolorbox}[title=Nota Importante]" in tex_content
