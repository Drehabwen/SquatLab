import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type {
  CameraFrameAnalysisResponse,
  CameraKeypoint,
  LiveSquatMetricsResponse,
  ProtocolResultResponse,
  ProtocolType,
} from "../../../shared/types/api";
import { Button, Icon, PsiGauge, SeverityBars, SurfaceCard } from "../../../shared/components/ui";
import { CameraFeed, type CameraFeedState } from "../../squat/components/CameraFeed";

const INITIAL_CAMERA_STATE: CameraFeedState = {
  status: "idle",
  isStarting: false,
  isStreaming: false,
  isFullscreen: false,
  hasDetection: false,
  readinessState: null,
  error: "",
};

const PROTOCOL_CONFIG: Record<
  string,
  {
    title: string;
    description: string;
    defaultView: "front" | "side";
    instructions: string[];
  }
> = {
  static_posture: {
    title: "静态姿势评估",
    description: "正面站立，评估肩高差、骨盆倾斜、躯干侧移",
    defaultView: "front",
    instructions: [
      "面向摄像头，自然站立",
      "双臂自然下垂于身体两侧",
      "保持静止 3 秒",
      "点击「分析」进行评估",
    ],
  },
  adams_forward_bend: {
    title: "Adams 前屈测试",
    description: "缓慢前屈，评估胸椎和腰椎的不对称",
    defaultView: "side",
    instructions: [
      "侧身站立，缓慢向前弯腰",
      "保持膝盖伸直，双脚并拢",
      "在最低点保持 2 秒",
      "点击「分析」进行评估",
    ],
  },
  squat: {
    title: "深蹲动作评估",
    description: "动态深蹲，评估深度、稳定性、对称性",
    defaultView: "side",
    instructions: [
      "先从侧面开始，完成 1 次完整深蹲",
      "切换到正面，再完成 1 次深蹲",
      "保持动作平稳，膝盖不要内扣",
      "深蹲计数≥1 后点击「分析」",
    ],
  },
};

function findKeypoint(keypoints: CameraKeypoint[], name: string): CameraKeypoint | undefined {
  return keypoints.find((k) => k.name === name);
}

function buildStaticPostureMetrics(keypoints: CameraKeypoint[]): Record<string, number> {
  const leftShoulder = findKeypoint(keypoints, "left_shoulder");
  const rightShoulder = findKeypoint(keypoints, "right_shoulder");
  const leftHip = findKeypoint(keypoints, "left_hip");
  const rightHip = findKeypoint(keypoints, "right_hip");
  const nose = findKeypoint(keypoints, "nose");

  const shoulderHeightDiff =
    leftShoulder && rightShoulder
      ? Math.abs(leftShoulder.y - rightShoulder.y)
      : 0;

  const pelvicTilt =
    leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : 0;

  const trunkShift =
    nose && leftHip && rightHip
      ? Math.abs(nose.x - (leftHip.x + rightHip.x) / 2)
      : 0;

  return {
    shoulder_height_diff: Math.round(shoulderHeightDiff * 1000) / 1000,
    pelvic_tilt: Math.round(pelvicTilt * 1000) / 1000,
    trunk_shift: Math.round(trunkShift * 1000) / 1000,
  };
}

function buildAdamsMetrics(keypoints: CameraKeypoint[]): Record<string, number> {
  const leftShoulder = findKeypoint(keypoints, "left_shoulder");
  const rightShoulder = findKeypoint(keypoints, "right_shoulder");
  const leftHip = findKeypoint(keypoints, "left_hip");
  const rightHip = findKeypoint(keypoints, "right_hip");

  const thoracicAsymmetry =
    leftShoulder && rightShoulder
      ? Math.abs(leftShoulder.y - rightShoulder.y)
      : 0;

  const lumbarAsymmetry =
    leftHip && rightHip ? Math.abs(leftHip.y - rightHip.y) : 0;

  return {
    thoracic_asymmetry: Math.round(thoracicAsymmetry * 1000) / 1000,
    lumbar_asymmetry: Math.round(lumbarAsymmetry * 1000) / 1000,
  };
}

function buildSquatMetrics(liveMetrics: LiveSquatMetricsResponse): Record<string, number> {
  return {
    squat_count: liveMetrics.squat_count,
    knee_sway_ratio: liveMetrics.knee_sway_ratio,
    knee_valgus_angle: liveMetrics.knee_valgus_angle,
    center_deviation_ratio: liveMetrics.center_deviation_ratio,
    left_right_symmetry: liveMetrics.left_right_symmetry,
    linkage_smoothness: liveMetrics.linkage_smoothness,
    squat_depth_ratio: liveMetrics.squat_depth_ratio,
  };
}

export function ProtocolCapturePage() {
  const { id: sessionId, protocol } = useParams<{
    id: string;
    protocol: string;
  }>();
  const navigate = useNavigate();

  const config = PROTOCOL_CONFIG[protocol ?? ""];
  const protocolType = (protocol ?? "squat") as ProtocolType;

  const [viewMode, setViewMode] = useState<"front" | "side">(
    config?.defaultView ?? "front",
  );
  const [cameraState, setCameraState] =
    useState<CameraFeedState>(INITIAL_CAMERA_STATE);
  const [latestKeypoints, setLatestKeypoints] = useState<CameraKeypoint[]>([]);
  const [liveMetrics, setLiveMetrics] =
    useState<LiveSquatMetricsResponse | null>(null);
  const [result, setResult] = useState<ProtocolResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captureQuality, setCaptureQuality] = useState<"poor" | "acceptable" | "good">("good");

  const handleCameraAnalysis = useCallback(
    (analysis: CameraFrameAnalysisResponse) => {
      setLatestKeypoints(analysis.keypoints ?? []);
      setLiveMetrics(analysis.live_metrics ?? null);
    },
    [],
  );

  const handleCameraStateChange = useCallback(
    (nextState: CameraFeedState) => {
      setCameraState(nextState);
      if (!nextState.isStreaming) {
        setLatestKeypoints([]);
        setLiveMetrics(null);
      }
    },
    [],
  );

  const canAnalyze =
    cameraState.isStreaming &&
    !loading &&
    (protocolType === "squat"
      ? (liveMetrics?.squat_count ?? 0) > 0
      : latestKeypoints.length > 0);

  async function handleAnalyze() {
    if (!sessionId || !canAnalyze) return;

    setLoading(true);
    setError("");

    try {
      let metrics: Record<string, number>;
      if (protocolType === "squat" && liveMetrics) {
        metrics = buildSquatMetrics(liveMetrics);
      } else if (protocolType === "adams_forward_bend") {
        metrics = buildAdamsMetrics(latestKeypoints);
      } else {
        metrics = buildStaticPostureMetrics(latestKeypoints);
      }

      const protocolResult = await apiClient.analyzeProtocol(
        sessionId,
        protocolType,
        {
          capture_quality: captureQuality,
          metrics,
        },
      );
      setResult(protocolResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  if (!config) {
    return (
      <div className="protocol-capture-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/sessions")}
          >
            <Icon name="arrow_back" />
            <span>返回列表</span>
          </button>
          <h1 className="page-title">未知协议</h1>
        </section>
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>不支持的协议类型: {protocol}</p>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  const phaseStatus = result
    ? "completed"
    : loading
      ? "analyzing"
      : cameraState.readinessState === "ready"
        ? "ready"
        : cameraState.isStreaming
          ? "capturing"
          : "idle";

  return (
    <div className="protocol-capture-page page-stack">
      <section className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() =>
            navigate(
              `/sessions/${encodeURIComponent(sessionId ?? "")}`,
            )
          }
        >
          <Icon name="arrow_back" />
          <span>返回会话</span>
        </button>
        <h1 className="page-title">{config.title}</h1>
        <p className="page-subtitle">{config.description}</p>
      </section>

      {error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : null}

      <section className="capture-stage">
        <div className="capture-camera-area capture-viewfinder">
          {protocolType === "squat" ? (
            <div className="camera-mode-switch" style={{ marginBottom: "0.5rem" }}>
              <button
                type="button"
                className={`camera-mode-pill ${viewMode === "side" ? "active" : ""}`}
                aria-pressed={viewMode === "side"}
                onClick={() => setViewMode("side")}
              >
                侧面
              </button>
              <button
                type="button"
                className={`camera-mode-pill ${viewMode === "front" ? "active" : ""}`}
                aria-pressed={viewMode === "front"}
                onClick={() => setViewMode("front")}
              >
                正面
              </button>
            </div>
          ) : null}

          <CameraFeed
            viewMode={viewMode}
            onAnalysis={handleCameraAnalysis}
            onStateChange={handleCameraStateChange}
          />
        </div>

        <div className="capture-side-panel">
          <SurfaceCard variant="lowest" padding="large">
            <h2 className="section-title">采集指南</h2>
            <ol className="capture-instructions">
              {config.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </SurfaceCard>

          {protocolType === "squat" && liveMetrics ? (
            <SurfaceCard variant="lowest" padding="medium">
              <h3 className="section-title">实时数据</h3>
              <div className="capture-metrics">
                <div className="capture-metric">
                  <span className="capture-metric-label">深蹲次数</span>
                  <span className="capture-metric-value">
                    {liveMetrics.squat_count}
                  </span>
                </div>
                <div className="capture-metric">
                  <span className="capture-metric-label">深度比率</span>
                  <span className="capture-metric-value">
                    {Math.round(liveMetrics.squat_depth_ratio * 100)}%
                  </span>
                </div>
                <div className="capture-metric">
                  <span className="capture-metric-label">对称性</span>
                  <span className="capture-metric-value">
                    {Math.round(liveMetrics.left_right_symmetry * 100)}%
                  </span>
                </div>
                <div className="capture-metric">
                  <span className="capture-metric-label">稳定性</span>
                  <span className="capture-metric-value">
                    {Math.round(liveMetrics.linkage_smoothness * 100)}%
                  </span>
                </div>
              </div>
            </SurfaceCard>
          ) : null}

          <div className="capture-actions capture-controls capture-submit-sticky">
            {!result ? (
              <>
                <div className="quality-selector">
                  <span className="quality-selector-label">采集质量</span>
                  <div className="quality-selector-pills">
                    {(["poor", "acceptable", "good"] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={`quality-pill ${captureQuality === q ? "quality-pill-active" : ""}`}
                        aria-pressed={captureQuality === q}
                        onClick={() => setCaptureQuality(q)}
                      >
                        {q === "poor" ? "较差" : q === "acceptable" ? "可接受" : "良好"}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="large"
                  icon="auto_awesome"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  loading={loading}
                >
                  {loading ? "分析中…" : "开始分析"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {result ? (
        <section className="capture-result-section">
          <SurfaceCard variant="high" padding="large">
            <div className="result-header">
              <h2 className="section-title">分析结果</h2>
              <span className={`status-badge status-${result.status}`}>
                {result.status === "analyzed"
                  ? "已分析"
                  : result.status === "needs_recapture"
                    ? "需重采"
                    : result.status === "needs_review"
                      ? "需审核"
                      : result.status}
              </span>
            </div>

            {protocolType === "static_posture" && result.psi_score != null && (
              <div className="capture-visualization-row">
                <PsiGauge score={result.psi_score} size="small" />
                {result.severity_grades && (
                  <SeverityBars grades={result.severity_grades} />
                )}
              </div>
            )}

            {result.findings.length > 0 ? (
              <div style={{ marginTop: "1rem" }}>
                <h3 className="section-title">发现项</h3>
                <ul className="report-findings-list">
                  {result.findings.map((f, i) => (
                    <li key={i} className="report-finding-item">
                      <span className="report-finding-dot">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.risk_flags.length > 0 ? (
              <div style={{ marginTop: "1rem" }}>
                <h3 className="section-title">风险标记</h3>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {result.risk_flags.map((flag) => (
                    <span key={flag} className="risk-tag">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {result.recommendations.length > 0 ? (
              <div style={{ marginTop: "1rem" }}>
                <h3 className="section-title">建议</h3>
                <ul className="report-findings-list">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="report-finding-item">
                      <span className="report-finding-dot">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="form-actions" style={{ marginTop: "1.5rem" }}>
              <Button
                variant="primary"
                icon="arrow_back"
                onClick={() =>
                  navigate(
                    `/sessions/${encodeURIComponent(sessionId ?? "")}`,
                  )
                }
              >
                返回会话
              </Button>
            </div>
          </SurfaceCard>
        </section>
      ) : null}
    </div>
  );
}
