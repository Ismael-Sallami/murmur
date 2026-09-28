"""Adaptador para exportación a Notion (REST API y protocolo MCP).

Permite publicar los apuntes generados directamente en una base de datos
o página de Notion con bloques estructurados.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List
import httpx

from murmur.config import settings

logger = logging.getLogger(__name__)


class NotionAdapter:
    """Gestiona la creación de páginas y bloques en Notion."""

    def __init__(
        self,
        api_key: str | None = None,
        database_id: str | None = None,
    ) -> None:
        self.api_key = api_key or settings.notion_api_key
        self.database_id = database_id or settings.notion_database_id
        self.base_url = "https://api.notion.com/v1"

    def _markdown_to_notion_blocks(self, content: str) -> List[Dict[str, Any]]:
        """Convierte líneas de Markdown básicas a bloques de Notion."""
        blocks = []
        for line in content.splitlines():
            line_str = line.strip()
            if not line_str:
                continue

            if line_str.startswith("### "):
                blocks.append({
                    "object": "block",
                    "type": "heading_3",
                    "heading_3": {
                        "rich_text": [{"type": "text", "text": {"content": line_str[4:]}}]
                    },
                })
            elif line_str.startswith("## "):
                blocks.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": line_str[3:]}}]
                    },
                })
            elif line_str.startswith("# "):
                blocks.append({
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [{"type": "text", "text": {"content": line_str[2:]}}]
                    },
                })
            elif line_str.startswith("- ") or line_str.startswith("* "):
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": line_str[2:]}}]
                    },
                })
            elif line_str.startswith("> "):
                blocks.append({
                    "object": "block",
                    "type": "callout",
                    "callout": {
                        "rich_text": [{"type": "text", "text": {"content": line_str[2:]}}],
                        "icon": {"emoji": "💡"},
                    },
                })
            else:
                blocks.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": line_str}}]
                    },
                })

        # La API de Notion permite un máximo de 100 bloques por petición inicial
        return blocks[:99]

    async def export_page(
        self,
        title: str,
        content: str,
        subject: str = "General",
    ) -> Dict[str, Any]:
        """Crea una nueva página con el apunte en Notion."""
        if not self.api_key:
            raise ValueError("No se ha configurado NOTION_API_KEY en .env")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }

        blocks = self._markdown_to_notion_blocks(content)

        payload: Dict[str, Any] = {
            "parent": {"database_id": self.database_id} if self.database_id else {"page_id": ""},
            "properties": {
                "title": {
                    "title": [{"text": {"content": title}}]
                }
            },
            "children": blocks,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{self.base_url}/pages", headers=headers, json=payload)
            if response.status_code not in (200, 201):
                logger.error("Error al exportar a Notion: %s", response.text)
                response.raise_for_status()

            logger.info("Página creada exitosamente en Notion: %s", title)
            return response.json()
