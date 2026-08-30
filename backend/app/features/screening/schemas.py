from datetime import datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

ProtocolType = Literal["static_posture", "adams_forward_bend", "squat"]
CaptureMethod = Literal[
    "phone_camera",
    "manual_observation",
    "validated_external_device",
    "imported_record",
]
ReviewStatus = Literal["not_required", "pending", "approved", "rejected"]
EvidenceStatus = Literal[
    "usable",
    "missing",
    "recapture_required",
    "review_required",
    "conflict",
    "unverified_source",
]
ReportReadinessState = Literal[
    "ready",
    "missing_evidence",
    "recapture_required",
    "review_required",
    "conflict_detected",
]
WorkflowStatus = Literal[
    "pending_initial_screening",
    "initial_screening_in_progress",
    "pending_standard_screening",
    "pending_recapture",
    "pending_review",
    "pending_report",
    "pending_retest",
    "archived",
]
SeverityLevel = Literal["none", "mild", "moderate", "severe"]
ScreeningStatus = Literal[
    "in_progress",
    "pending_standard_screening",
    "pending_report",
    "completed",
    "pending_recapture",
    "pending_review",
    "archived",
]
ProtocolStatus = Literal[
    "not_started",
    "capturing",
    "captured",
    "analyzed",
    "needs_recapture",
    "needs_review",
]
CaptureQuality = Literal["poor", "acceptable", "good"]
OverallRisk = Literal["low", "attention", "review_required", "recapture_needed"]
NextAction = Literal["pass", "retest_later", "recapture", "manual_review", "professional_evaluation"]
Direction = Literal["left", "right", "forward", "unclear"]
Confidence = Literal["low", "medium", "high"]


class SubjectCreateRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    sex: Literal["female", "male", "unknown"] = "unknown"
    age: int | None = Field(default=None, ge=3, le=120)
    height_cm: float | None = Field(default=None, ge=60, le=240)
    notes: str = Field(default="", max_length=500)


class SubjectResponse(SubjectCreateRequest):
    subject_id: str
    created_at: datetime


class ScreeningSessionCreateRequest(BaseModel):
    subject_id: str = Field(min_length=1)
    protocols: list[ProtocolType] = Field(default_factory=lambda: ["static_posture", "adams_forward_bend"])


class ProtocolProgress(BaseModel):
    protocol: ProtocolType
    status: ProtocolStatus


class ScreeningSessionCreateResponse(BaseModel):
    session_id: str
    subject_id: str
    status: ScreeningStatus
    protocols: list[ProtocolProgress]
    created_at: datetime


class ProtocolAnalyzeRequest(BaseModel):
    capture_quality: CaptureQuality
    metrics: dict[str, Any] = Field(default_factory=dict)
    per_frame_metrics: list[dict[str, Any]] | None = Field(default=None)
    capture_method: CaptureMethod = "phone_camera"
    observer_training_verified: bool = False
    device_id: str | None = Field(default=None, max_length=120)
    device_validation_recorded: bool = False
    recorded_by: str | None = Field(default=None, max_length=120)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=160)


class ProtocolResultResponse(BaseModel):
    result_id: str
    session_id: str
    protocol: ProtocolType
    status: ProtocolStatus
    capture_quality: CaptureQuality
    metrics: dict[str, Any]
    findings: list[str]
    risk_flags: list[str]
    recommendations: list[str]
    needs_recapture: bool
    needs_review: bool
    capture_method: CaptureMethod = "phone_camera"
    observer_training_verified: bool = False
    device_id: str | None = None
    device_validation_recorded: bool = False
    recorded_by: str | None = None
    review_status: ReviewStatus = "not_required"
    evidence_id: str | None = None
    evidence_version: int | None = None
    created_at: datetime
    updated_at: datetime
    # Static posture enriched fields (null for other protocols)
    severity_grades: dict[str, SeverityLevel] | None = None
    psi_score: float | None = None


class CrossProtocolEvidence(BaseModel):
    pattern: str
    protocols: list[ProtocolType]
    direction: Direction | None = None
    evidence: list[str]
    confidence: Confidence


class IntegratedReportResponse(BaseModel):
    report_id: str
    session_id: str
    title: str
    overall_risk: OverallRisk
    consistency_level: Literal["none", "single_protocol", "multi_protocol_consistent"]
    main_patterns: list[str]
    cross_protocol_evidence: list[CrossProtocolEvidence]
    next_action: NextAction
    summary: str
    recommendations: list[str]
    disclaimer: str
    created_at: datetime
    psi_score: float | None = None
    severity_grades: dict[str, SeverityLevel] | None = None


class ScreeningSessionDetailResponse(BaseModel):
    session_id: str
    subject_id: str
    subject_display_name: str
    status: ScreeningStatus
    overall_risk: OverallRisk | None = None
    protocol_results: list[ProtocolResultResponse]
    integrated_report: IntegratedReportResponse | None
    created_at: datetime
    completed_at: datetime | None = None


class ScreeningSessionSummary(BaseModel):
    session_id: str
    subject_id: str
    subject_display_name: str
    status: ScreeningStatus
    overall_risk: OverallRisk | None = None
    next_action: NextAction | None = None
    completed_protocols: list[ProtocolType]
    created_at: datetime
    completed_at: datetime | None = None


class EvidenceRequirement(BaseModel):
    key: Literal["static_posture", "adams_forward_bend"]
    label: str
    required: bool = True
    status: EvidenceStatus
    reason: str
    result_id: str | None = None


class OptionalEvidenceSummary(BaseModel):
    key: Literal["gait_silhouette", "squat"]
    label: str
    status: Literal["available", "not_recorded", "unusable"]
    purpose: str


class ReportReadinessResponse(BaseModel):
    session_id: str
    state: ReportReadinessState
    workflow_status: WorkflowStatus
    can_generate_formal_report: bool
    requirements: list[EvidenceRequirement]
    optional_evidence: list[OptionalEvidenceSummary]
    blockers: list[str]
    policy_version: str
    evaluated_at: datetime


class ProtocolReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    reviewed_by: str = Field(min_length=1, max_length=120)
    reason: str = Field(default="", max_length=500)


class EvidenceRecordResponse(BaseModel):
    evidence_id: str
    session_id: str
    protocol: ProtocolType
    version: int
    supersedes_evidence_id: str | None = None
    idempotency_key: str | None = None
    result: ProtocolResultResponse
    recorded_by: str | None = None
    created_at: datetime


class EvidenceReviewEventResponse(BaseModel):
    review_event_id: str
    evidence_id: str
    decision: Literal["approved", "rejected"]
    reviewed_by: str
    reason: str
    created_at: datetime


class WorkflowEventResponse(BaseModel):
    workflow_event_id: str
    session_id: str
    from_status: str | None = None
    to_status: WorkflowStatus
    trigger: str
    actor_id: str | None = None
    evidence_id: str | None = None
    created_at: datetime


class WorkflowStateResponse(BaseModel):
    session_id: str
    status: WorkflowStatus
    readiness: ReportReadinessResponse
    history: list[WorkflowEventResponse]


def build_subject_id() -> str:
    return f"subj-{uuid4().hex[:10]}"


def build_screening_session_id() -> str:
    return f"screen-{uuid4().hex[:10]}"


def build_protocol_result_id(protocol: ProtocolType) -> str:
    prefix = protocol.replace("_", "-")
    return f"res-{prefix}-{uuid4().hex[:8]}"


def build_evidence_id() -> str:
    return f"evidence-{uuid4().hex[:12]}"


def build_review_event_id() -> str:
    return f"review-{uuid4().hex[:12]}"


def build_workflow_event_id() -> str:
    return f"workflow-{uuid4().hex[:12]}"


class BatchImportRowResult(BaseModel):
    row_index: int
    success: bool
    entity_id: str | None = None
    errors: list[str] = []


class BatchImportResponse(BaseModel):
    total_rows: int
    success_count: int
    failure_count: int
    results: list[BatchImportRowResult]


class LlmAnalysisResponse(BaseModel):
    session_id: str
    enhanced_summary: str | None = None
    clinical_context: str | None = None
    risk_narrative: str | None = None
    suggestions: list[str] = []
    limitations: list[str] = []
    raw_response: str | None = None


def build_report_id() -> str:
    return f"report-{uuid4().hex[:10]}"
