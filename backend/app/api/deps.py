from functools import lru_cache

from app.core.config import get_settings
from app.features.screening.repository import ScreeningRepository
from app.features.squat.repository import SquatRepository
from app.shared.db import DatabaseManager


@lru_cache
def get_database() -> DatabaseManager:
    settings = get_settings()
    return DatabaseManager(settings.db_path)


def get_repository() -> SquatRepository:
    return SquatRepository(get_database())


def get_screening_repository() -> ScreeningRepository:
    return ScreeningRepository(get_database())
