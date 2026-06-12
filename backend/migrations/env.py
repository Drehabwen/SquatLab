import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings  # noqa: E402

# Alembic Config
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# No SQLAlchemy MetaData for autogenerate — migrations are written manually.
target_metadata = None

# Derive the database URL — prefer the config override (e.g. from
# DatabaseManager.initialize), fall back to the app settings default.
_DB_URL = config.get_main_option("sqlalchemy.url")
if not _DB_URL:
    settings = get_settings()
    _DB_URL = f"sqlite:///{settings.db_path.as_posix()}"

DB_URL = _DB_URL


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generates SQL script)."""
    context.configure(
        url=DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the live database."""
    connectable = create_engine(DB_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
