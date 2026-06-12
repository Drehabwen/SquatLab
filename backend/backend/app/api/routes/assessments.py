from fastapi import APIRouter, Depends, status

from app.api.deps import get_repository
from app.features.squat.repository import SquatRepository
from app.features.squat.schemas import (
    SquatAssessmentRequest,
    SquatAssessmentResult,
    build_session_id,
)
from app.features.squat.service import SquatAssessmentService

router = APIRouter(prefix="/api/v1/squat", tags=["squat"])


@router.post("/assessments", response_model=SquatAssessmentResult, status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: SquatAssessmentRequest,
    repository: SquatRepository = Depends(get_repository),
) -> SquatAssessmentResult:
    service = SquatAssessmentService()
    result = service.score(payload, build_session_id())
    repository.save_assessment(payload, result)
    return result
