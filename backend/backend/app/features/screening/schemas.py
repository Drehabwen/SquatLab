from datetime import datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

ProtocolType = Literal["static_posture", "adams_forward_bend", "squat"]
SeverityLevel = Literal["none", "mild", "moderate", "severe"]
ScreeningStatus = Literal[
    "in_progress",
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
    protocols: list[ProtocolType] = Field(default_factory=lambda: ["static_posture", "adams_forward_bend", "squat"])


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


def build_subject_id() -> str:
    return f"subj-{uuid4().hex[:10]}"


def build_screening_session_id() -> str:
    return f"screen-{uuid4().hex[:10]}"


def build_protocol_result_id(protocol: ProtocolType) -> str:
    prefix = protocol.replace("_", "-")
    return f"res-{prefix}-{uuid4().hex[:8]}"


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
