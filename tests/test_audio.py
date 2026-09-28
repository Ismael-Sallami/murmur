"""Pruebas unitarias para el gestor de audio."""

import pytest
from pathlib import Path
from murmur.core.audio import AudioManager


@pytest.mark.asyncio
async def test_save_upload_and_chunk(tmp_path: Path):
    manager = AudioManager(data_dir=tmp_path)
    
    # 1. Probar guardado de audio completo
    dummy_data = b"RIFF....WAVEfmt ...."
    saved_path = await manager.save_upload("test_audio.wav", dummy_data)
    assert saved_path.exists()
    assert saved_path.read_bytes() == dummy_data

    # 2. Probar guardado de chunks
    session_id = "test_session_123"
    chunk_0 = await manager.save_chunk(session_id, 0, b"chunk_zero_bytes")
    chunk_1 = await manager.save_chunk(session_id, 1, b"chunk_one_bytes")

    assert chunk_0.exists()
    assert chunk_1.exists()
    assert chunk_0.name == "chunk_00000.webm"
    assert chunk_1.name == "chunk_00001.webm"
