from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.api.deps import get_screening_repository
from app.features.screening.importer import (
    BATCH_LIMIT,
    parse_file,
    validate_session_row,
    validate_subject_row,
)
from app.features.screening.llm_service import LlmAnalysisService
from app.features.screening.readiness import ReportReadinessPolicy
from app.features.screening.repository import ScreeningRepository
from app.features.screening.schemas import (
    BatchImportResponse,
    BatchImportRowResult,
    EvidenceRecordResponse,
    EvidenceReviewEventResponse,
    IntegratedReportResponse,
    LlmAnalysisResponse,
    ProtocolAnalyzeRequest,
    ProtocolResultResponse,
    ProtocolReviewRequest,
    ProtocolType,
    ReportReadinessResponse,
    ScreeningSessionCreateRequest,
    ScreeningSessionCreateResponse,
    ScreeningSessionDetailResponse,
    ScreeningSessionSummary,
    SubjectCreateRequest,
    SubjectResponse,
    WorkflowStateResponse,
    build_protocol_result_id,
)
from app.features.screening.service import ScreeningAnalysisService

router = APIRouter(prefix="/api/v1", tags=["screening"])


@router.get("/subjects", response_model=list[SubjectResponse])
def list_subjects(
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> list[SubjectResponse]:
    return repository.list_subjects()


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreateRequest,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> SubjectResponse:
    return repository.create_subject(payload)


@router.post(
    "/screening/sessions",
    response_model=ScreeningSessionCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_screening_session(
    payload: ScreeningSessionCreateRequest,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> ScreeningSessionCreateResponse:
    return repository.create_session(subject_id=payload.subject_id, protocols=payload.protocols)


@router.get("/screening/sessions", response_model=list[ScreeningSessionSummary])
def list_screening_sessions(
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> list[ScreeningSessionSummary]:
    return repository.list_sessions()


@router.get("/screening/sessions/{session_id}", response_model=ScreeningSessionDetailResponse)
def get_screening_session(
    session_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> ScreeningSessionDetailResponse:
    return repository.get_session_detail(session_id)


@router.post(
    "/screening/sessions/{session_id}/protocols/{protocol}/analyze",
    response_model=ProtocolResultResponse,
)
def analyze_protocol(
    session_id: str,
    protocol: ProtocolType,
    payload: ProtocolAnalyzeRequest,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> ProtocolResultResponse:
    repository._enforce_protocol_sequence(session_id, protocol)
    subject = repository.get_subject_for_session(session_id)
    service = ScreeningAnalysisService()
    result = service.analyze_protocol(
        result_id=build_protocol_result_id(protocol),
        session_id=session_id,
        protocol=protocol,
        capture_quality=payload.capture_quality,
        metrics=payload.metrics,
        per_frame_metrics=payload.per_frame_metrics,
        subject_age=subject.age if subject else None,
        subject_sex=subject.sex if subject else "unknown",
        capture_method=payload.capture_method,
        observer_training_verified=payload.observer_training_verified,
        device_id=payload.device_id,
        device_validation_recorded=payload.device_validation_recorded,
        recorded_by=payload.recorded_by,
    )
    return repository.save_protocol_result(
        result,
        idempotency_key=payload.idempotency_key,
    )


@router.post(
    "/screening/sessions/{session_id}/reports/integrated",
    response_model=IntegratedReportResponse,
)
def generate_integrated_report(
    session_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> IntegratedReportResponse:
    repository.get_session_detail(session_id)
    results = repository.list_protocol_results(session_id)
    ReportReadinessPolicy().enforce(session_id=session_id, results=results)
    service = ScreeningAnalysisService()
    report = service.build_integrated_report(session_id=session_id, results=results)
    repository.save_integrated_report(report)
    return report


@router.get(
    "/screening/sessions/{session_id}/report-readiness",
    response_model=ReportReadinessResponse,
)
def get_report_readiness(
    session_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> ReportReadinessResponse:
    repository.get_session_detail(session_id)
    return ReportReadinessPolicy().evaluate(
        session_id=session_id,
        results=repository.list_protocol_results(session_id),
    )


@router.post(
    "/screening/sessions/{session_id}/protocols/{protocol}/review",
    response_model=ProtocolResultResponse,
)
def review_protocol(
    session_id: str,
    protocol: ProtocolType,
    payload: ProtocolReviewRequest,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> ProtocolResultResponse:
    return repository.review_protocol_result(
        session_id=session_id,
        protocol=protocol,
        decision=payload.decision,
        reviewed_by=payload.reviewed_by,
        reason=payload.reason,
    )


@router.get(
    "/screening/sessions/{session_id}/evidence",
    response_model=list[EvidenceRecordResponse],
)
def list_screening_evidence(
    session_id: str,
    latest_only: bool = Query(default=False),
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> list[EvidenceRecordResponse]:
    return repository.list_evidence_records(
        session_id,
        latest_only=latest_only,
    )


@router.get(
    "/screening/sessions/{session_id}/evidence/{evidence_id}/reviews",
    response_model=list[EvidenceReviewEventResponse],
)
def list_evidence_reviews(
    session_id: str,
    evidence_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> list[EvidenceReviewEventResponse]:
    return repository.list_evidence_review_events(session_id, evidence_id)


@router.get(
    "/screening/sessions/{session_id}/workflow",
    response_model=WorkflowStateResponse,
)
def get_screening_workflow(
    session_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> WorkflowStateResponse:
    return repository.get_workflow_state(session_id)


@router.get(
    "/screening/sessions/{session_id}/reports/integrated",
    response_model=IntegratedReportResponse,
)
def get_integrated_report(
    session_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> IntegratedReportResponse:
    return repository.get_integrated_report(session_id)


@router.post(
    "/screening/sessions/{session_id}/reports/llm-analysis",
    response_model=LlmAnalysisResponse,
)
def get_llm_analysis(
    session_id: str,
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> LlmAnalysisResponse:
    session_detail = repository.get_session_detail(session_id)
    report = session_detail.integrated_report
    if report is None:
        from app.core.errors import ConflictError
        raise ConflictError("请先生成综合报告再进行AI分析")

    subject = repository.get_subject_for_session(session_id)
    service = LlmAnalysisService()
    data = service.analyze(
        session_id=session_id,
        subject_display_name=session_detail.subject_display_name,
        subject_age=subject.age if subject else None,
        subject_sex=subject.sex if subject else "unknown",
        report=report,
        protocol_results=session_detail.protocol_results,
    )
    return LlmAnalysisResponse(
        session_id=session_id,
        enhanced_summary=data.get("enhanced_summary"),
        clinical_context=data.get("clinical_context"),
        risk_narrative=data.get("risk_narrative"),
        suggestions=data.get("suggestions", []),
        limitations=data.get("limitations", []),
        raw_response=data.get("raw_response"),
    )


@router.post("/subjects/batch", response_model=BatchImportResponse)
def batch_import_subjects(
    file: UploadFile = File(...),
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> BatchImportResponse:
    if not file.filename:
        return BatchImportResponse(total_rows=0, success_count=0, failure_count=0, results=[])

    content = file.file.read()
    rows = parse_file(file.filename, content)

    if len(rows) > BATCH_LIMIT:
        rows = rows[:BATCH_LIMIT]

    results: list[BatchImportRowResult] = []
    for idx, row in enumerate(rows):
        payload, errors = validate_subject_row(row, idx)
        if errors:
            results.append(BatchImportRowResult(row_index=idx, success=False, errors=errors))
            continue

        try:
            subject = repository.create_subject(payload)  # type: ignore[arg-type]
            results.append(BatchImportRowResult(row_index=idx, success=True, entity_id=subject.subject_id, errors=[]))
        except Exception as e:
            results.append(BatchImportRowResult(row_index=idx, success=False, errors=[str(e)]))

    return BatchImportResponse(
        total_rows=len(rows),
        success_count=sum(1 for r in results if r.success),
        failure_count=sum(1 for r in results if not r.success),
        results=results,
    )


@router.post("/screening/sessions/batch", response_model=BatchImportResponse)
def batch_import_sessions(
    file: UploadFile = File(...),
    repository: ScreeningRepository = Depends(get_screening_repository),
) -> BatchImportResponse:
    if not file.filename:
        return BatchImportResponse(total_rows=0, success_count=0, failure_count=0, results=[])

    content = file.file.read()
    rows = parse_file(file.filename, content)

    if len(rows) > BATCH_LIMIT:
        rows = rows[:BATCH_LIMIT]

    results: list[BatchImportRowResult] = []
    for idx, row in enumerate(rows):
        data, errors = validate_session_row(row, idx)
        if errors:
            results.append(BatchImportRowResult(row_index=idx, success=False, errors=errors))
            continue

        try:
            subject_id = data["subject_id"]  # type: ignore[index]
            if not subject_id:
                subj = repository.create_subject(
                    SubjectCreateRequest(display_name=data["subject_display_name"])  # type: ignore[index]
                )
                subject_id = subj.subject_id

            session = repository.create_session(subject_id=subject_id, protocols=data["protocols"])  # type: ignore[index]
            results.append(BatchImportRowResult(row_index=idx, success=True, entity_id=session.session_id, errors=[]))
        except Exception as e:
            results.append(BatchImportRowResult(row_index=idx, success=False, errors=[str(e)]))

    return BatchImportResponse(
        total_rows=len(rows),
        success_count=sum(1 for r in results if r.success),
        failure_count=sum(1 for r in results if not r.success),
        results=results,
    )
