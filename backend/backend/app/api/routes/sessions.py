from fastapi import APIRouter, Depends

from app.api.deps import get_repository
from app.features.squat.repository import SquatRepository
from app.features.squat.schemas import SessionSummary

router = APIRouter(prefix="/api/v1/squat", tags=["squat"])


@router.get("/sessions", response_model=list[SessionSummary])
def list_sessions(repository: SquatRepository = Depends(get_repository)) -> list[SessionSummary]:
    return repository.list_sessions()
