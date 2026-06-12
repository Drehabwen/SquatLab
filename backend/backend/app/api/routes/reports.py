from fastapi import APIRouter, Depends

from app.api.deps import get_repository
from app.features.squat.repository import SquatRepository
from app.features.squat.schemas import ReportPreviewRequest, ReportPreviewResponse

router = APIRouter(prefix="/api/v1/squat", tags=["squat"])


@router.post("/reports/preview", response_model=ReportPreviewResponse)
def preview_report(
    payload: ReportPreviewRequest,
    repository: SquatRepository = Depends(get_repository),
) -> ReportPreviewResponse:
    return repository.build_report_preview(payload.session_id)
