import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../shared/api/client";
import type {
  CameraFrameAnalysisResponse,
  LiveSquatMetricsResponse,
  SquatAssessmentRequest,
  SquatAssessmentResult,
} from "../../../shared/types/api";
import {
  Badge,
  SurfaceCard,
  Button,
  InsightCard,
  StatCard,
  Icon,
  DataBadge,
} from "../../../shared/components/ui";
import { CameraFeed, type CameraFeedState } from "../components/CameraFeed";

const INITIAL_CAMERA_STATE: CameraFeedState = {
  status: "idle",
  isStarting: false,
  isStreaming: false,
  isFullscreen: false,
  hasDetection: false,
  readinessState: null,
  error: "",
};

function toAssessmentPayload(metrics: LiveSquatMetricsResponse): SquatAssessmentRequest {
  return {
    squat_count: metrics.squat_count,
    knee_sway_ratio: metrics.knee_sway_ratio,
    knee_valgus_angle: metrics.knee_valgus_angle,
    center_deviation_ratio: metrics.center_deviation_ratio,
    left_right_symmetry: metrics.left_right_symmetry,
    linkage_smoothness: metrics.linkage_smoothness,
    squat_depth_ratio: metrics.squat_depth_ratio,
  };
}

type SessionPhase = "idle" | "starting" | "framing" | "capturing" | "ready" | "error";

function deriveSessionPhase(
  cameraState: CameraFeedState,
  liveMetrics: LiveSquatMetricsResponse | null,
): SessionPhase {
  if (cameraState.status === "error") {
    return "error";
  }

  if (cameraState.status === "idle") {
    return "idle";
  }

  if (cameraState.status === "starting") {
    return "starting";
  }

  if (cameraState.readinessState === "ready") {
    return "ready";
  }

  if (cameraState.readinessState === "capturing") {
    return "capturing";
  }

  if (cameraState.readinessState === "insufficient_pose" || cameraState.readinessState === "no_detection") {
    return "framing";
  }

  if (!cameraState.hasDetection) {
    return "framing";
  }

  return (liveMetrics?.squat_count ?? 0) > 0 ? "ready" : "capturing";
}

function getPhaseBadgeLabel(phase: SessionPhase, t: ReturnType<typeof useTranslation>["t"]) {
  if (phase === "idle") {
    return t("assessment.phaseIdle");
  }

  if (phase === "starting") {
    return t("assessment.phaseStarting");
  }

  if (phase === "framing") {
    return t("assessment.phaseFraming");
  }

  if (phase === "capturing") {
    return t("assessment.phaseCapturing");
  }

  if (phase === "ready") {
    return t("assessment.phaseReady");
  }

  return t("assessment.phaseError");
}

function getSessionSignal(
  phase: SessionPhase,
  t: ReturnType<typeof useTranslation>["t"],
  errorMessage: string,
) {
  if (phase === "idle") {
    return {
      description: t("assessment.signalIdleDesc"),
      icon: "videocam",
      title: t("assessment.signalIdleTitle"),
    };
  }

  if (phase === "starting") {
    return {
      description: t("assessment.signalStartingDesc"),
      icon: "sync",
      title: t("assessment.signalStartingTitle"),
    };
  }

  if (phase === "framing") {
    return {
      description: t("assessment.signalFramingDesc"),
      icon: "center_focus_strong",
      title: t("assessment.signalFramingTitle"),
    };
  }

  if (phase === "capturing") {
    return {
      description: t("assessment.signalCapturingDesc"),
      icon: "play_circle",
      title: t("assessment.signalCapturingTitle"),
    };
  }

  if (phase === "ready") {
    return {
      description: t("assessment.signalReadyDesc"),
      icon: "task_alt",
      title: t("assessment.signalReadyTitle"),
    };
  }

  return {
    description: errorMessage || t("assessment.signalErrorDesc"),
    icon: "error",
    title: t("assessment.signalErrorTitle"),
  };
}

export function SquatSessionPage() {
  const [liveMetrics, setLiveMetrics] = useState<LiveSquatMetricsResponse | null>(null);
  const [result, setResult] = useState<SquatAssessmentResult | null>(null);
  const [viewMode, setViewMode] = useState<"side" | "front">("side");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraFeedResetKey, setCameraFeedResetKey] = useState(0);
  const [cameraState, setCameraState] = useState<CameraFeedState>(INITIAL_CAMERA_STATE);
  const { t } = useTranslation();

  const displayPayload = liveMetrics;
  const submissionPayload = liveMetrics ? toAssessmentPayload(liveMetrics) : null;
  const sessionPhase = deriveSessionPhase(cameraState, liveMetrics);
  const qualityStatus = sessionPhase === "capturing" || sessionPhase === "ready";
  const sessionStatusVariant = sessionPhase === "error"
    ? "error"
    : qualityStatus
      ? "success"
      : "warning";
  const canGenerateResult = Boolean(submissionPayload && sessionPhase === "ready");

  const cameraStatusCopy = sessionPhase === "error"
    ? cameraState.error
    : sessionPhase === "idle"
      ? t("assessment.statusStartCamera")
      : sessionPhase === "starting"
        ? t("common.loading")
        : sessionPhase === "framing"
          ? t("assessment.statusFindBody")
          : sessionPhase === "capturing"
            ? t("assessment.statusDoOneRep")
            : t("assessment.statusReadyToScore");

  const phaseBadgeLabel = getPhaseBadgeLabel(sessionPhase, t);
  const sessionSignal = getSessionSignal(sessionPhase, t, cameraState.error);

  const handleCameraAnalysis = useCallback((analysis: CameraFrameAnalysisResponse) => {
    setLiveMetrics(analysis.live_metrics ?? null);
  }, []);

  const handleCameraStateChange = useCallback((nextState: CameraFeedState) => {
    setCameraState(nextState);

    if (!nextState.isStreaming) {
      setLiveMetrics(null);
    }
  }, []);

  async function handleSubmit() {
    if (!submissionPayload) {
      setError(cameraStatusCopy);
      return;
    }

    if (sessionPhase !== "ready") {
      setError(cameraStatusCopy);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextResult = await apiClient.createAssessment({
        ...submissionPayload,
        squat_count: Math.max(1, submissionPayload.squat_count),
      });
      setResult(nextResult);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError("");
    setLoading(false);
    setViewMode("side");
    setLiveMetrics(null);
    setCameraState({ ...INITIAL_CAMERA_STATE });
    setCameraFeedResetKey((current) => current + 1);
  }

  return (
    <div className="assessment-page page-stack">
      <section className="assessment-header">
        <span className="page-eyebrow">{t("assessment.eyebrow")}</span>
        <h1 className="page-title">{t("assessment.title")}</h1>
        <p className="page-subtitle">{t("assessment.subtitle")}</p>
      </section>

      <section className="assessment-overview capture-layout">
        <div className="assessment-camera-stage capture-viewfinder">
          <div className="camera-grid" />
          <div className="camera-guides" />
          <div className="assessment-camera-frame">
            <div className="camera-overlay-top">
              <div className="camera-mode-switch">
                <button
                  type="button"
                  className={`camera-mode-pill ${viewMode === "side" ? "active" : ""}`}
                  onClick={() => setViewMode("side")}
                >
                  {t("assessment.sideView")}
                </button>
                <button
                  type="button"
                  className={`camera-mode-pill ${viewMode === "front" ? "active" : ""}`}
                  onClick={() => setViewMode("front")}
                >
                  {t("assessment.frontView")}
                </button>
              </div>

              <Badge variant={sessionStatusVariant}>
                {phaseBadgeLabel}
              </Badge>
            </div>

            <CameraFeed
              key={cameraFeedResetKey}
              viewMode={viewMode}
              className="camera-feed-embedded"
              onAnalysis={handleCameraAnalysis}
              onStateChange={handleCameraStateChange}
            />

            <div className="camera-overlay-bottom">
              <div className={`camera-status-card camera-status-card-${sessionStatusVariant}`}>
                <div className="assessment-signal-head">
                  <div className="assessment-signal-icon">
                    <Icon name={sessionSignal.icon} />
                  </div>
                  <div className="assessment-signal-copy-group">
                    <p className="camera-status-label">{t("assessment.sessionStatusLabel")}</p>
                    <h2 className="assessment-signal-title">{sessionSignal.title}</h2>
                  </div>
                </div>
                <p className="camera-status-copy assessment-signal-copy">{sessionSignal.description}</p>
              </div>

              <div className="assessment-hero-actions capture-controls capture-submit-sticky">
                <Button
                  variant="secondary"
                  size="large"
                  icon="analytics"
                  loading={loading}
                  disabled={!canGenerateResult}
                  onClick={handleSubmit}
                >
                  {loading ? t("assessment.analyzing") : t("assessment.generateResult")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="assessment-side-panel">
          <SurfaceCard variant="lowest" padding="large">
            <div className="assessment-surface-head">
              <div>
                <h2 className="assessment-surface-title">{t("assessment.sessionTitle")}</h2>
                <p className="assessment-surface-copy">{t("assessment.sessionCopy")}</p>
              </div>
              <DataBadge
                variant={sessionStatusVariant}
                label={t("assessment.sessionBadgeLabel")}
                value={phaseBadgeLabel}
              />
            </div>
            <div className="assessment-session-meter">
              <div className="assessment-session-tile">
                <span className="assessment-session-label">{t("assessment.viewModeLabel")}</span>
                <div className="assessment-session-value">
                  {viewMode === "side" ? t("assessment.sideViewShort") : t("assessment.frontViewShort")}
                </div>
              </div>
              <div className="assessment-session-tile">
                <span className="assessment-session-label">{t("assessment.repCountLabel")}</span>
                <div className="assessment-session-value">{displayPayload?.squat_count ?? "--"}</div>
              </div>
              <div className="assessment-session-tile">
                <span className="assessment-session-label">{t("assessment.timerLabel")}</span>
                <div className="assessment-session-value">
                  {liveMetrics?.tempo_seconds ? `${liveMetrics.tempo_seconds.toFixed(1)}s` : "--"}
                </div>
              </div>
              <div className="assessment-session-tile">
                <span className="assessment-session-label">{t("assessment.rangeLabel")}</span>
                <div className="assessment-session-value">
                  {displayPayload ? `${Math.round(displayPayload.squat_depth_ratio * 100)}%` : "--"}
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard variant="high" padding="large">
            <div className="assessment-surface-head">
              <div>
                <h2 className="assessment-surface-title">{t("assessment.protocolTitle")}</h2>
                <p className="assessment-surface-copy">{t("assessment.protocolCopy")}</p>
              </div>
            </div>
            <div className="assessment-checklist">
              <div className="assessment-guidance-item">
                <div className="assessment-guidance-icon">
                  <Icon name="height" />
                </div>
                <div>
                  <p className="assessment-checklist-title">{t("assessment.protocolStep1Title")}</p>
                  <p className="assessment-guidance-copy">{t("assessment.protocolStep1Copy")}</p>
                </div>
              </div>
              <div className="assessment-guidance-item">
                <div className="assessment-guidance-icon">
                  <Icon name="balance" />
                </div>
                <div>
                  <p className="assessment-checklist-title">{t("assessment.protocolStep2Title")}</p>
                  <p className="assessment-guidance-copy">{t("assessment.protocolStep2Copy")}</p>
                </div>
              </div>
              <div className="assessment-guidance-item">
                <div className="assessment-guidance-icon">
                  <Icon name="sports_martial_arts" />
                </div>
                <div>
                  <p className="assessment-checklist-title">{t("assessment.protocolStep3Title")}</p>
                  <p className="assessment-guidance-copy">{t("assessment.protocolStep3Copy")}</p>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </section>

      {error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : null}

      <section className="assessment-lower-grid">
        <SurfaceCard variant="lowest" padding="large">
          <div className="assessment-live-header">
            <div>
              <h2 className="assessment-surface-title">{t("assessment.liveMetricsTitle")}</h2>
              <p className="assessment-surface-copy">{t("assessment.liveMetricsCopy")}</p>
            </div>
            <DataBadge variant="primary" label={t("assessment.liveBadgeLabel")} value={t("assessment.liveBadgeValue")} />
          </div>
          <div className="assessment-live-grid">
            <StatCard
              label={t("assessment.depthRatio")}
              value={displayPayload ? Math.round(displayPayload.squat_depth_ratio * 100) : "--"}
              unit={displayPayload ? "%" : undefined}
              icon="height"
              variant="default"
            />
            <StatCard
              label={t("assessment.stability")}
              value={displayPayload ? Math.round(displayPayload.linkage_smoothness * 100) : "--"}
              unit={displayPayload ? "%" : undefined}
              icon="balance"
              variant="default"
            />
            <StatCard
              label={t("assessment.balance")}
              value={displayPayload ? Math.round(displayPayload.left_right_symmetry * 100) : "--"}
              unit={displayPayload ? "%" : undefined}
              icon="sports_martial_arts"
              variant="default"
            />
            <StatCard
              label={t("assessment.tempo")}
              value={liveMetrics?.tempo_seconds?.toFixed(1) ?? "--"}
              unit={liveMetrics?.tempo_seconds ? "s" : undefined}
              icon="speed"
              variant="accent"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard variant="low" padding="large">
          <div className="assessment-surface-head">
            <div>
              <h2 className="assessment-surface-title">{t("assessment.qualityTitle")}</h2>
              <p className="assessment-surface-copy">{t("assessment.qualityCopy")}</p>
            </div>
          </div>
          <div className="assessment-checklist">
            <div className="quality-item">
              <div className="quality-item-icon">
                <Icon name="warning" />
              </div>
              <div>
                <p className="assessment-checklist-title">{t("assessment.qualityStep1Title")}</p>
                <p className="quality-item-copy">{t("assessment.qualityStep1Copy")}</p>
              </div>
            </div>
            <div className="quality-item">
              <div className="quality-item-icon">
                <Icon name="trending_flat" />
              </div>
              <div>
                <p className="assessment-checklist-title">{t("assessment.qualityStep2Title")}</p>
                <p className="quality-item-copy">{t("assessment.qualityStep2Copy")}</p>
              </div>
            </div>
            <div className="quality-item">
              <div className="quality-item-icon">
                <Icon name="tips_and_updates" />
              </div>
              <div>
                <p className="assessment-checklist-title">{t("assessment.qualityStep3Title")}</p>
                <p className="quality-item-copy">{t("assessment.qualityStep3Copy")}</p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="assessment-grid assessment-grid-compact">
        <SurfaceCard variant="high" padding="large">
          <div className="assessment-surface-head">
            <div>
              <h2 className="assessment-surface-title">{t("assessment.reviewTitle")}</h2>
              <p className="assessment-surface-copy">{t("assessment.reviewCopy")}</p>
            </div>
            {result ? (
              <DataBadge variant="success" label={t("assessment.resultBadgeLabel")} value={result.overall_score} />
            ) : (
              <DataBadge variant="secondary" label={t("assessment.resultBadgeLabel")} value={t("assessment.resultBadgeEmpty")} />
            )}
          </div>

          {result ? (
            <div className="assessment-result-card">
              <div className="assessment-live-grid">
                <StatCard label={t("assessment.overallScore")} value={result.overall_score} unit="/100" icon="star" variant="highlight" />
                <StatCard label={t("assessment.frontScore")} value={result.front_score} icon="front_hand" variant="default" />
                <StatCard label={t("assessment.sideScore")} value={result.side_score} icon="height" variant="default" />
              </div>
              <p className="assessment-result-summary">{result.summary}</p>
              {result.findings.length > 0 ? (
                <div>
                  <h3 className="assessment-stage-title">{t("assessment.findings")}</h3>
                  <div className="assessment-chip-row">
                    {result.findings.map((finding) => (
                      <span key={finding} className="assessment-chip">
                        {finding}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="assessment-stage-title">{t("assessment.suggestions")}</h3>
                <ul className="assessment-suggestion-list">
                  {result.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="assessment-note">
              <p>{t("assessment.resultPendingNote")}</p>
            </div>
          )}
          <div className="assessment-cta-row">
            <Button variant="ghost" size="medium" icon="sync" onClick={handleReset}>
              {t("assessment.resetSession")}
            </Button>
            <Button variant="tertiary" size="medium" icon="history" to="/history">
              {t("assessment.openHistory")}
            </Button>
          </div>
        </SurfaceCard>

        <SurfaceCard variant="lowest" padding="large">
          <div className="assessment-surface-head">
            <div>
              <h2 className="assessment-surface-title">{t("assessment.coachingTitle")}</h2>
              <p className="assessment-surface-copy">{t("assessment.coachingCopy")}</p>
            </div>
          </div>
          <div className="stack">
            <InsightCard
              icon="tips_and_updates"
              iconBg="primary"
              title={t("assessment.coachingCard1Title")}
              description={t("assessment.coachingCard1Copy")}
            />
            <InsightCard
              icon="trending_flat"
              iconBg="tertiary"
              title={t("assessment.coachingCard2Title")}
              description={t("assessment.coachingCard2Copy")}
            />
            <InsightCard
              icon="sports_martial_arts"
              iconBg="secondary"
              title={t("assessment.coachingCard3Title")}
              description={t("assessment.coachingCard3Copy")}
            />
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
