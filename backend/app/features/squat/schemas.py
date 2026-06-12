from datetime import datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

CameraViewMode = Literal["front", "side"]
CameraReadinessState = Literal["no_detection", "insufficient_pose", "capturing", "ready"]


class SquatAssessmentRequest(BaseModel):
    squat_count: int = Field(ge=1, le=100)
    knee_sway_ratio: float = Field(ge=0, le=1)
    knee_valgus_angle: float = Field(ge=0, le=60)
    center_deviation_ratio: float = Field(ge=0, le=1)
    left_right_symmetry: float = Field(ge=0, le=1)
    linkage_smoothness: float = Field(ge=0, le=1)
    squat_depth_ratio: float = Field(ge=0, le=1)


class SquatAssessmentResult(BaseModel):
    session_id: str
    overall_score: int
    front_score: int
    side_score: int
    findings: list[str]
    summary: str
    suggestions: list[str]


class SessionSummary(BaseModel):
    session_id: str
    squat_count: int
    overall_score: int
    summary: str
    created_at: datetime


class ReportPreviewRequest(BaseModel):
    session_id: str


class ReportPreviewResponse(BaseModel):
    session_id: str
    title: str
    summary: str
    findings: list[str]
    recommendations: list[str]


class CameraStatusResponse(BaseModel):
    available: bool
    backend: str
    detail: str


class CameraAnalysisSessionResponse(BaseModel):
    session_id: str


class PoseKeypoint(BaseModel):
    name: str
    x: float
    y: float
    z: float
    visibility: float


class CameraKeypointsResponse(BaseModel):
    has_detection: bool
    frame_width: int
    frame_height: int
    keypoints: list[PoseKeypoint]
    detector_backend: str


class CameraFrameRequest(BaseModel):
    session_id: str = Field(min_length=1)
    view_mode: CameraViewMode
    frame_data_url: str = Field(min_length=1)


class LiveSquatMetricsResponse(BaseModel):
    squat_count: int = Field(ge=0)
    knee_sway_ratio: float = Field(ge=0, le=1)
    knee_valgus_angle: float = Field(ge=0, le=60)
    center_deviation_ratio: float = Field(ge=0, le=1)
    left_right_symmetry: float = Field(ge=0, le=1)
    linkage_smoothness: float = Field(ge=0, le=1)
    squat_depth_ratio: float = Field(ge=0, le=1)
    tempo_seconds: float | None = Field(default=None, ge=0)


class CameraFrameAnalysisResponse(CameraKeypointsResponse):
    session_id: str
    view_mode: CameraViewMode
    readiness_state: CameraReadinessState
    missing_keypoints: list[str]
    min_keypoint_visibility: float = Field(ge=0, le=1)
    pose_connections: list[tuple[str, str]]
    live_metrics: LiveSquatMetricsResponse | None = None


class HealthPayload(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str = "2.0.0"


def build_session_id() -> str:
    return f"squat-{uuid4().hex[:12]}"
