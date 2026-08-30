import sqlite3
from logging import getLogger
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = getLogger(__name__)

# Absolute path to alembic.ini and the migrations directory,
# resolved relative to this source file.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ALEMBIC_INI = _BACKEND_ROOT / "alembic.ini"
_ALEMBIC_MIGRATIONS = _BACKEND_ROOT / "migrations"


class DatabaseManager:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path

    def initialize(self) -> None:
        """Ensure the database file and all migrations are up to date."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        alembic_cfg = Config(str(_ALEMBIC_INI))
        alembic_cfg.set_main_option("script_location", str(_ALEMBIC_MIGRATIONS))
        # The env.py reads the DB URL from app settings, but we override it here
        # so that the same DatabaseManager instance's path is always used.
        alembic_cfg.set_main_option(
            "sqlalchemy.url",
            f"sqlite:///{self.db_path.as_posix()}",
        )

        logger.info("Running database migrations for %s", self.db_path)
        command.upgrade(alembic_cfg, "head")

    def connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def check_ready(self) -> None:
        required_tables = {
            "squat_sessions",
            "squat_visual_assessments",
            "subjects",
            "screening_sessions",
            "protocol_results",
            "integrated_reports",
            "screening_evidence",
            "evidence_review_events",
            "workflow_events",
        }

        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                """
            ).fetchall()

        existing_tables = {row[0] for row in rows}
        missing_tables = sorted(required_tables - existing_tables)
        if missing_tables:
            missing = ", ".join(missing_tables)
            raise RuntimeError(f"Missing required database tables: {missing}")
