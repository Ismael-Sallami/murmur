"""Punto de entrada principal de la aplicación Murmur.

Inicia el servidor FastAPI con soporte para CORS, monta las rutas de la API,
resuelve favicon, gestiona certificados SSL y sirve la SPA en React optimizada.
"""

import argparse
import logging
from pathlib import Path
import socket
import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
import uvicorn

from murmur.config import settings
from murmur.api.routes_audio import router as audio_router
from murmur.api.routes_notes import router as notes_router
from murmur.api.routes_export import router as export_router
from murmur.api.routes_files import router as files_router

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

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Favicon endpoints para evitar 404
@app.get("/favicon.ico", include_in_schema=False)
@app.get("/favicon.svg", include_in_schema=False)
async def get_favicon():
    svg_path = Path(__file__).parent.parent / "frontend" / "favicon.svg"
    if svg_path.exists():
        return FileResponse(svg_path, media_type="image/svg+xml")
    return Response(status_code=204)

# Registrar rutas de API
app.include_router(audio_router)
app.include_router(notes_router)
app.include_router(export_router)
app.include_router(files_router)

# Servir el frontend compilado en React (dist) o el fallback
base_dir = Path(__file__).parent.parent
dist_dir = base_dir / "frontend" / "dist"
frontend_dir = base_dir / "frontend"

if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend_dist")
elif frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


def get_lan_ip() -> str:
    """Detecta la dirección IP local de la máquina en la red Wi-Fi/LAN."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def ensure_self_signed_cert(cert_path: Path, key_path: Path) -> None:
    """Genera un certificado SSL autofirmado si no existe para habilitar HTTPS en la LAN."""
    if not cert_path.exists() or not key_path.exists():
        cert_path.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key_path),
            "-out", str(cert_path),
            "-sha256", "-days", "365", "-nodes",
            "-subj", "/CN=murmur.local",
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def cli_main() -> None:
    """Función de arranque por línea de comandos (CLI)."""
    parser = argparse.ArgumentParser(description="Murmur - Servidor de Clases Inteligente")
    parser.add_argument("--host", default=settings.host, help="Host a escuchar (ej. 0.0.0.0)")
    parser.add_argument("--port", type=int, default=settings.port, help="Puerto del servidor (por defecto 8000)")
    parser.add_argument("--ssl", action="store_true", help="Activar HTTPS con certificado autofirmado (para móviles)")
    parser.add_argument("--reload", action="store_true", help="Recargar en cambios de código")
    args = parser.parse_args()

    lan_ip = get_lan_ip()
    protocol = "https" if args.ssl else "http"

    ssl_cert_path = settings.data_dir / "certs" / "cert.pem"
    ssl_key_path = settings.data_dir / "certs" / "key.pem"

    if args.ssl:
        ensure_self_signed_cert(ssl_cert_path, ssl_key_path)

    # Banner informativo
    print("\n" + "=" * 64)
    print("  🎙️  Murmur iniciado exitosamente")
    print("=" * 64)
    print(f"  • En este PC:          {protocol}://localhost:{args.port}")
    print(f"  • En tu red local:     {protocol}://{lan_ip}:{args.port}")
    if not args.ssl:
        print("\n  💡 Consejo de seguridad:")
        print(f"     Abre '{protocol}://localhost:{args.port}' (no uses 0.0.0.0) para que el")
        print("     navegador active el contexto seguro y permita el acceso al micrófono.")
        print(f"     Para grabar desde móvil o tablet por Wi-Fi, inicia con: murmur --ssl")
    else:
        print("\n  🔒 Modo HTTPS activo:")
        print(f"     Acepta la advertencia del certificado autofirmado en tu móvil.")
    print("=" * 64 + "\n")

    uvicorn_kwargs = {
        "app": "murmur.main:app",
        "host": args.host,
        "port": args.port,
        "reload": args.reload,
    }

    if args.ssl:
        uvicorn_kwargs["ssl_certfile"] = str(ssl_cert_path)
        uvicorn_kwargs["ssl_keyfile"] = str(ssl_key_path)

    uvicorn.run(**uvicorn_kwargs)


if __name__ == "__main__":
    cli_main()
