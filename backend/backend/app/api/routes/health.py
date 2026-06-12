from fastapi import APIRouter

from app.api.deps import get_database
from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError
from app.features.squat.schemas import HealthPayload

router = APIRouter()


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
