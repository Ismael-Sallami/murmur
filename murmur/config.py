"""Módulo de configuración centralizada de Murmur.

Utiliza Pydantic Settings para cargar variables de entorno, validar tipos
y proporcionar valores predeterminados seguros para desarrollo y producción.
"""

from pathlib import Path
from typing import Any, Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración global de la aplicación Murmur."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Configuración de Red y Servidor ---
    host: str = "0.0.0.0"
    port: int = 8000
    data_dir: Path = Path("./data")

    # --- Configuración de Whisper ---
    whisper_provider: Literal["groq", "openai", "faster-whisper"] = "groq"
    groq_api_key: str | None = None
    openai_api_key: str | None = None

    # Configuración local de Whisper
    local_whisper_model: str = "base"
    local_whisper_device: str = "auto"
    local_whisper_compute_type: str = "int8"

    # --- Configuración de Modelos de Lenguaje (LLM) ---
    llm_provider: Literal["groq", "openai", "anthropic", "gemini", "ollama"] = "groq"
    llm_model: str = "llama-3.3-70b-versatile"
    anthropic_api_key: str | None = None
    gemini_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # --- Configuración de Exportación (Obsidian / Notion / LaTeX) ---
    obsidian_vault_path: Path | None = None
    notion_api_key: str | None = None
    notion_database_id: str | None = None

    @field_validator("obsidian_vault_path", mode="before")
    @classmethod
    def clean_obsidian_path(cls, v: Any) -> Path | None:
        """Evita que cadenas vacías o relativas sin definir apunten al directorio raíz actual."""
        if not v or str(v).strip() in ("", ".", "./"):
            return None
        return Path(v)

    def ensure_directories(self) -> None:
        """Crea los directorios necesarios si aún no existen."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        (self.data_dir / "uploads").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "chunks").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "transcripts").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "notes").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "exports").mkdir(parents=True, exist_ok=True)


# Instancia singleton de configuración
settings = Settings()
settings.ensure_directories()
