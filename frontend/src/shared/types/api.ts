export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
}

export interface CameraStatusResponse {
  available: boolean;
  backend: string;
  detail: string;
}

export interface CameraAnalysisSessionResponse {
  session_id: string;
}

export interface CameraKeypoint {
  name: string;
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface CameraKeypointsResponse {
  has_detection: boolean;
  frame_width: number;
  frame_height: number;
  keypoints: CameraKeypoint[];
  detector_backend: string;
}

export interface LiveSquatMetricsResponse {
  squat_count: number;
  knee_sway_ratio: number;
  knee_valgus_angle: number;
  center_deviation_ratio: number;
  left_right_symmetry: number;
  linkage_smoothness: number;
  squat_depth_ratio: number;
  tempo_seconds: number | null;
}

export interface CameraFrameAnalysisResponse extends CameraKeypointsResponse {
  session_id: string;
  view_mode: "front" | "side";
  readiness_state: "no_detection" | "insufficient_pose" | "capturing" | "ready";
  missing_keypoints: string[];
  min_keypoint_visibility: number;
  pose_connections: [string, string][];
  live_metrics: LiveSquatMetricsResponse | null;
}

export interface SquatAssessmentRequest {
  squat_count: number;
  knee_sway_ratio: number;
  knee_valgus_angle: number;
  center_deviation_ratio: number;
  left_right_symmetry: number;
  linkage_smoothness: number;
  squat_depth_ratio: number;
}

export interface SquatAssessmentResult {
  overall_score: number;
  front_score: number;
  side_score: number;
  findings: string[];
  summary: string;
  suggestions: string[];
  session_id: string;
}

export interface SessionSummary {
  session_id: string;
  overall_score: number;
  squat_count: number;
  created_at: string;
  summary: string;
}

export interface ReportPreviewRequest {
  session_id: string;
}

export interface ReportPreviewResponse {
  session_id: string;
  title: string;
  summary: string;
  findings: string[];
  recommendations: string[];
}

export type ProtocolType = "static_posture" | "adams_forward_bend" | "squat";
export type SeverityLevel = "none" | "mild" | "moderate" | "severe";
export type ScreeningStatus =
  | "in_progress"
  | "pending_report"
  | "completed"
  | "pending_recapture"
  | "pending_review"
  | "archived";
export type ProtocolStatus =
  | "not_started"
  | "capturing"
  | "captured"
  | "analyzed"
  | "needs_recapture"
  | "needs_review";
export type CaptureQuality = "poor" | "acceptable" | "good";
export type OverallRisk = "low" | "attention" | "review_required" | "recapture_needed";
export type NextAction = "pass" | "retest_later" | "recapture" | "manual_review" | "professional_evaluation";
export type Direction = "left" | "right" | "forward" | "unclear";
export type Confidence = "low" | "medium" | "high";

export interface SubjectCreateRequest {
  display_name: string;
  sex?: "female" | "male" | "unknown";
  age?: number | null;
  height_cm?: number | null;
  notes?: string;
}

export interface SubjectResponse extends Required<SubjectCreateRequest> {
  subject_id: string;
  created_at: string;
}

export interface ScreeningSessionCreateRequest {
  subject_id: string;
  protocols: ProtocolType[];
}

export interface ProtocolProgress {
  protocol: ProtocolType;
  status: ProtocolStatus;
}

export interface ScreeningSessionCreateResponse {
  session_id: string;
  subject_id: string;
  status: ScreeningStatus;
  protocols: ProtocolProgress[];
  created_at: string;
}

export interface ProtocolAnalyzeRequest {
  capture_quality: CaptureQuality;
  metrics: Record<string, number | string | boolean | null>;
  per_frame_metrics?: Record<string, number | string | boolean | null>[];
}

export interface ProtocolResultResponse {
  result_id: string;
  session_id: string;
  protocol: ProtocolType;
  status: ProtocolStatus;
  capture_quality: CaptureQuality;
  metrics: Record<string, number | string | boolean | null>;
  findings: string[];
  risk_flags: string[];
  recommendations: string[];
  needs_recapture: boolean;
  needs_review: boolean;
  severity_grades?: Record<string, SeverityLevel> | null;
  psi_score?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CrossProtocolEvidence {
  pattern: string;
  protocols: ProtocolType[];
  direction?: Direction | null;
  evidence: string[];
  confidence: Confidence;
}

export interface IntegratedReportResponse {
  report_id: string;
  session_id: string;
  title: string;
  overall_risk: OverallRisk;
  consistency_level: "none" | "single_protocol" | "multi_protocol_consistent";
  main_patterns: string[];
  cross_protocol_evidence: CrossProtocolEvidence[];
  next_action: NextAction;
  summary: string;
  recommendations: string[];
  disclaimer: string;
  created_at: string;
  psi_score?: number | null;
  severity_grades?: Record<string, SeverityLevel> | null;
}

export interface ScreeningSessionDetailResponse {
  session_id: string;
  subject_id: string;
  subject_display_name: string;
  status: ScreeningStatus;
  overall_risk: OverallRisk | null;
  protocol_results: ProtocolResultResponse[];
  integrated_report: IntegratedReportResponse | null;
  created_at: string;
  completed_at: string | null;
}

export interface BatchImportRowResult {
  row_index: number;
  success: boolean;
  entity_id?: string | null;
  errors: string[];
}

export interface BatchImportResponse {
  total_rows: number;
  success_count: number;
  failure_count: number;
  results: BatchImportRowResult[];
}

export interface ScreeningSessionSummary {
  session_id: string;
  subject_id: string;
  subject_display_name: string;
  status: ScreeningStatus;
  overall_risk: OverallRisk | null;
  next_action: NextAction | null;
  completed_protocols: ProtocolType[];
  created_at: string;
  completed_at: string | null;
}

export interface LlmAnalysisResponse {
  session_id: string;
  enhanced_summary?: string | null;
  clinical_context?: string | null;
  risk_narrative?: string | null;
  suggestions: string[];
  limitations: string[];
  raw_response?: string | null;
}
