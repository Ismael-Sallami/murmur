"""Punto de entrada principal de la aplicación Murmur.

Inicia el servidor FastAPI con soporte para CORS, monta las rutas de la API
y sirve la Progressive Web App (PWA) para móvil, tablet y escritorio.
"""

import argparse
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from murmur.config import settings
from murmur.api.routes_audio import router as audio_router
from murmur.api.routes_notes import router as notes_router
from murmur.api.routes_export import router as export_router

# Configuración básica de logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("murmur")

app = FastAPI(
    title="Murmur API",
    description="Sistema inteligente de captura de clases, transcripción con Whisper y apuntes con LLMs y MCP.",
    version="0.1.0",
)

# Habilitar CORS para permitir acceso desde dispositivos en la misma red local o túneles
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rutas de API
app.include_router(audio_router)
app.include_router(notes_router)
app.include_router(export_router)

# Servir el frontend PWA si el directorio existe
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


def cli_main() -> None:
    """Función de arranque por línea de comandos (CLI)."""
    parser = argparse.ArgumentParser(description="Murmur - Servidor de Clases Inteligente")
    parser.add_argument("--host", default=settings.host, help="Host a escuchar (ej. 0.0.0.0)")
    parser.add_argument("--port", type=int, default=settings.port, help="Puerto del servidor")
    parser.add_argument("--reload", action="store_true", help="Recargar automáticamente en cambios de código")
    args = parser.parse_args()

    logger.info("Iniciando Murmur en http://%s:%d", args.host, args.port)
    uvicorn.run("murmur.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    cli_main()
