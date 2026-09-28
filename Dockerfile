# ==============================================================================
# Dockerfile optimizado para AulaScribe
# ==============================================================================
FROM python:3.12-slim

# Instalar ffmpeg para concatenación y procesamiento de audio
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar uv para acelerar la instalación de dependencias
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copiar definiciones del proyecto
COPY pyproject.toml ./

# Instalar dependencias en el entorno global del contenedor
RUN uv pip install --system -e .

# Copiar código fuente y frontend
COPY aulascribe/ ./aulascribe/
COPY frontend/ ./frontend/
COPY .env.example ./.env.example

# Puerto por defecto
EXPOSE 8000

# Arrancar la aplicación
CMD ["python", "-m", "aulascribe.main", "--host", "0.0.0.0", "--port", "8000"]
