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
