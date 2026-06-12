from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.api.deps import get_database
from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError
from app.features.squat.schemas import HealthPayload

router = APIRouter()


class VersionPayload(BaseModel):
    latest_version: str
    apk_url: str
    update_log: str
    force_update: bool


@router.get("/health", response_model=HealthPayload)
def health() -> HealthPayload:
    settings = get_settings()
    return HealthPayload(service=settings.app_name)


@router.get("/ready", response_model=HealthPayload)
def ready() -> HealthPayload:
    settings = get_settings()
    try:
        get_database().check_ready()
    except RuntimeError as error:
        raise ServiceUnavailableError(str(error)) from error
    return HealthPayload(service=settings.app_name)


@router.get("/version", response_model=VersionPayload)
def get_version(request: Request) -> VersionPayload:
    # Get base URL of the incoming request (e.g. http://192.168.1.100:8000/)
    base_url = str(request.base_url)
    return VersionPayload(
        latest_version="1.1.0",  # Latest version available on server
        apk_url=f"{base_url}static/app-debug.apk",
        update_log="1. 优化了脊柱侧弯早筛姿态评估算法\n2. 适配了 iPad 等平板设备的全屏显示与手势操作\n3. 提升了三维姿态特征检测的帧率与稳定性",
        force_update=False
    )
