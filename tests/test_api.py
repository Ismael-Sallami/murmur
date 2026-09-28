"""Pruebas de endpoints FastAPI."""

import pytest
from httpx import ASGITransport, AsyncClient
from murmur.main import app


@pytest.mark.asyncio
async def test_openapi_and_docs():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert schema["info"]["title"] == "Murmur API"


@pytest.mark.asyncio
async def test_export_obsidian(tmp_path):
    from murmur.api.routes_export import dispatcher
    dispatcher.obsidian.vault_path = tmp_path

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "target": "obsidian",
            "title": "Clase de Prueba",
            "content": "# Contenido de Prueba\n\nTexto de los apuntes",
            "subject": "Matemáticas",
        }
        response = await client.post("/api/export", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "file_path" in data
        assert str(tmp_path) in data["file_path"]


@pytest.mark.asyncio
async def test_auto_structure_and_tree(tmp_path):
    from murmur.core.file_organizer import file_organizer
    file_organizer.base_dir = tmp_path / "clases"
    file_organizer.base_dir.mkdir(parents=True, exist_ok=True)
    file_organizer.latex_adapter.output_dir = file_organizer.base_dir

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "subject": "Física Cuántica",
            "title": "Principio de Incertidumbre",
            "transcript": "El principio de Heisenberg determina la precisión...",
            "notes_md": "## Incertidumbre\n\n$$\\Delta x \\Delta p \\ge \\frac{\\hbar}{2}$$",
        }
        response = await client.post("/api/files/auto-structure", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "files" in data
        assert "transcript_txt" in data["files"]
        assert "notes_md" in data["files"]
        assert "metadata_json" in data["files"]

        # Comprobar árbol de ficheros
        tree_res = await client.get("/api/files/tree")
        assert tree_res.status_code == 200
        tree_data = tree_res.json()
        assert tree_data["status"] == "success"
        assert len(tree_data["tree"]) >= 1
