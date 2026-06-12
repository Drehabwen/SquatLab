from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_database
from app.api.routes.camera import clear_live_analysis_store_cache
from app.core.config import get_settings
from app.main import app


@pytest.fixture
def client(monkeypatch) -> Iterator[TestClient]:
    test_data_dir = Path(__file__).resolve().parents[1] / ".test-data"
    test_data_dir.mkdir(exist_ok=True)
    db_path = test_data_dir / f"qingyue-zhiheng-{uuid4().hex}.db"

    monkeypatch.setenv("APP_DB_PATH", str(db_path))
    monkeypatch.setenv("APP_POSE_MODEL_PATH", "")

    get_settings.cache_clear()
    get_database.cache_clear()
    clear_live_analysis_store_cache()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    get_database.cache_clear()
    get_settings.cache_clear()
    clear_live_analysis_store_cache()
