import { env } from "../config/env";
import type {
  BatchImportResponse,
  CameraAnalysisSessionResponse,
  CameraFrameAnalysisResponse,
  CameraStatusResponse,
  HealthResponse,
  LlmAnalysisResponse,
  ReportPreviewRequest,
  ReportPreviewResponse,
  IntegratedReportResponse,
  ProtocolAnalyzeRequest,
  ProtocolReviewRequest,
  ProtocolResultResponse,
  ProtocolType,
  ReportReadinessResponse,
  SessionSummary,
  ScreeningSessionCreateRequest,
  ScreeningSessionCreateResponse,
  ScreeningSessionDetailResponse,
  ScreeningSessionSummary,
  SquatAssessmentRequest,
  SquatAssessmentResult,
  SubjectCreateRequest,
  SubjectResponse,
} from "../types/api";

async function buildError(response: Response): Promise<Error> {
  const message = await response.text();
  let parsedMessage = "";

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } };
    parsedMessage = parsed.error?.message || "";
  } catch {
    parsedMessage = "";
  }

  return new Error(parsedMessage || message || `Request failed: ${response.status}`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.json() as Promise<T>;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw await buildError(response);
  }
}

async function requestFile<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  health: () => request<HealthResponse>("/health"),
  cameraStatus: () => request<CameraStatusResponse>("/api/v1/camera/status"),
  createCameraSession: () =>
    request<CameraAnalysisSessionResponse>("/api/v1/camera/sessions", {
      method: "POST",
    }),
  closeCameraSession: (sessionId: string) =>
    requestVoid(`/api/v1/camera/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    }),
  analyzeCameraFrame: (sessionId: string, viewMode: "front" | "side", frameDataUrl: string) =>
    request<CameraFrameAnalysisResponse>("/api/v1/camera/analyze-frame", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        view_mode: viewMode,
        frame_data_url: frameDataUrl,
      }),
    }),
  createAssessment: (payload: SquatAssessmentRequest) =>
    request<SquatAssessmentResult>("/api/v1/squat/assessments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSessions: () => request<SessionSummary[]>("/api/v1/squat/sessions"),
  previewReport: (payload: ReportPreviewRequest) =>
    request<ReportPreviewResponse>("/api/v1/squat/reports/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSubjects: () => request<SubjectResponse[]>("/api/v1/subjects"),
  createSubject: (payload: SubjectCreateRequest) =>
    request<SubjectResponse>("/api/v1/subjects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createScreeningSession: (payload: ScreeningSessionCreateRequest) =>
    request<ScreeningSessionCreateResponse>("/api/v1/screening/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listScreeningSessions: () => request<ScreeningSessionSummary[]>("/api/v1/screening/sessions"),
  getScreeningSession: (sessionId: string) =>
    request<ScreeningSessionDetailResponse>(`/api/v1/screening/sessions/${encodeURIComponent(sessionId)}`),
  analyzeProtocol: (sessionId: string, protocol: ProtocolType, payload: ProtocolAnalyzeRequest) =>
    request<ProtocolResultResponse>(
      `/api/v1/screening/sessions/${encodeURIComponent(sessionId)}/protocols/${encodeURIComponent(protocol)}/analyze`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  getReportReadiness: (sessionId: string) =>
    request<ReportReadinessResponse>(
      `/api/v1/screening/sessions/${encodeURIComponent(sessionId)}/report-readiness`,
    ),
  reviewProtocol: (
    sessionId: string,
    protocol: ProtocolType,
    payload: ProtocolReviewRequest,
  ) =>
    request<ProtocolResultResponse>(
      `/api/v1/screening/sessions/${encodeURIComponent(sessionId)}/protocols/${encodeURIComponent(protocol)}/review`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  generateIntegratedReport: (sessionId: string) =>
    request<IntegratedReportResponse>(
      `/api/v1/screening/sessions/${encodeURIComponent(sessionId)}/reports/integrated`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ),
  getIntegratedReport: (sessionId: string) =>
    request<IntegratedReportResponse>(
      `/api/v1/screening/sessions/${encodeURIComponent(sessionId)}/reports/integrated`,
    ),
  getLlmAnalysis: (sessionId: string) =>
    request<LlmAnalysisResponse>(
      `/api/v1/screening/sessions/${encodeURIComponent(sessionId)}/reports/llm-analysis`,
      { method: "POST" },
    ),
  importSubjectsBatch: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFile<BatchImportResponse>("/api/v1/subjects/batch", formData);
  },
  importSessionsBatch: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFile<BatchImportResponse>("/api/v1/screening/sessions/batch", formData);
  },
  syncToRehabWorkstation: async (sessionId: string) => {
    // 1. Fetch full session details
    const sessionDetail = await apiClient.getScreeningSession(sessionId);
    
    // 2. Fetch LLM analysis if it exists (try-catch to prevent blocking if it fails or hasn't been generated yet)
    let llmAnalysis = null;
    try {
      llmAnalysis = await apiClient.getLlmAnalysis(sessionId);
    } catch {
      // Silence if not generated or fails
    }
    
    // 3. Send package to Rehab-main integration hub on port 8000.
    const payload: any = {
      session_id: sessionDetail.session_id,
      subject: {
        subject_id: sessionDetail.subject_id,
        display_name: sessionDetail.subject_display_name,
        sex: "unknown",
        age: null,
        height_cm: null,
        notes: ""
      },
      protocol_results: sessionDetail.protocol_results.map(r => ({
        result_id: r.result_id,
        protocol: r.protocol,
        status: r.status,
        capture_quality: r.capture_quality,
        metrics: r.metrics,
        findings: r.findings,
        risk_flags: r.risk_flags,
        recommendations: r.recommendations,
        psi_score: r.psi_score,
        severity_grades: r.severity_grades
      })),
      integrated_report: sessionDetail.integrated_report ? {
        report_id: sessionDetail.integrated_report.report_id,
        title: sessionDetail.integrated_report.title,
        overall_risk: sessionDetail.integrated_report.overall_risk,
        consistency_level: sessionDetail.integrated_report.consistency_level,
        main_patterns: sessionDetail.integrated_report.main_patterns,
        next_action: sessionDetail.integrated_report.next_action,
        summary: sessionDetail.integrated_report.summary,
        recommendations: sessionDetail.integrated_report.recommendations
      } : null,
      llm_analysis: llmAnalysis ? {
        enhanced_summary: llmAnalysis.enhanced_summary,
        clinical_context: llmAnalysis.clinical_context,
        risk_narrative: llmAnalysis.risk_narrative,
        suggestions: llmAnalysis.suggestions,
        limitations: llmAnalysis.limitations
      } : null,
      created_at: sessionDetail.created_at,
      completed_at: sessionDetail.completed_at
    };
    
    // We also need to get the subject details to populate sex/age/height
    try {
      const subjects = await apiClient.listSubjects();
      const matched = subjects.find(s => s.subject_id === sessionDetail.subject_id);
      if (matched) {
        payload.subject.sex = matched.sex;
        payload.subject.age = matched.age;
        payload.subject.height_cm = matched.height_cm;
        payload.subject.notes = matched.notes || "";
      }
    } catch {
      // Fallback to default subject if list fails
    }

    let syncUrl = "http://localhost:8000/api/integration/sync-screening";
    try {
      const url = new URL(env.rehabHubApiBaseUrl);
      url.pathname = "/api/integration/sync-screening";
      url.search = "";
      url.hash = "";
      syncUrl = url.toString();
    } catch {
      // Fallback
    }

    const response = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `同步失败 (HTTP ${response.status})`);
    }

    return response.json();
  }
};
