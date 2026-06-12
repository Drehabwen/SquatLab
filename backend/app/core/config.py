from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "青跃智衡 API"
    app_env: str = "development"
    app_port: int = 8010
    app_allowed_origins: list[str] = [
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176",
        "http://localhost:5200",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5176",
        "http://127.0.0.1:5200",
    ]
    app_db_path: str = "data/qingyue-zhiheng.db"
    app_pose_model_path: str = "pose_landmarker.task"
    app_camera_device_index: int = 0
    # LLM
    llm_api_key: str = ""
    llm_model: str = "claude-haiku-4-5-20251001"
    llm_timeout_seconds: int = 30
    llm_cache_ttl_seconds: int = 3600

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
    )

    @field_validator("app_allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        return [item.strip() for item in value.split(",") if item.strip()]

    @property
    def backend_root(self) -> Path:
        return Path(__file__).resolve().parents[2]

    def resolve_backend_path(self, value: str) -> Path:
        path = Path(value)
        if path.is_absolute():
            return path
        return self.backend_root / path

    @property
    def db_path(self) -> Path:
        return self.resolve_backend_path(self.app_db_path)

    @property
    def pose_model_path(self) -> Path | None:
        if not self.app_pose_model_path:
            return None
        return self.resolve_backend_path(self.app_pose_model_path)


@lru_cache
def get_settings() -> Settings:
    return Settings()
