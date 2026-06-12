import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type {
  ProtocolStatus,
  ProtocolType,
  ScreeningSessionDetailResponse,
} from "../../../shared/types/api";
import { Button, Icon, PsiGauge, SkeletonCard, SurfaceCard } from "../../../shared/components/ui";

const STATUS_LABEL: Record<string, string> = {
  in_progress: "进行中",
  pending_report: "待报告",
  pending_recapture: "需重采",
  pending_review: "待审核",
  completed: "已完成",
  archived: "已归档",
};

const PROTOCOL_ORDER: ProtocolType[] = [
  "static_posture",
  "adams_forward_bend",
  "squat",
];

const PROTOCOL_LABEL: Record<string, string> = {
  static_posture: "静态姿势评估",
  adams_forward_bend: "Adams 前屈测试",
  squat: "深蹲动作评估",
};

const PROTOCOL_ICON: Record<string, string> = {
  static_posture: "accessibility_new",
  adams_forward_bend: "swipe_down",
  squat: "fitness_center",
};

const PROTOCOL_STATUS_LABEL: Record<string, string> = {
  not_started: "待开始",
  capturing: "采集中",
  captured: "已采集",
  analyzed: "已完成",
  needs_recapture: "需重采",
  needs_review: "需审核",
};

const RISK_LABEL: Record<string, string> = {
  low: "低风险",
  attention: "需关注",
  review_required: "需审核",
  recapture_needed: "需重采",
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] =
    useState<ScreeningSessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);

  function loadSession() {
    if (!id) return;
    setLoading(true);
    setError("");
    apiClient
      .getScreeningSession(id)
      .then(setSession)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "加载失败"),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSession();
  }, [id]);

  function getProtocolStatus(protocol: ProtocolType): ProtocolStatus {
    const result = session?.protocol_results.find(
      (p) => p.protocol === protocol,
    );
    return (result?.status as ProtocolStatus) ?? "not_started";
  }

  if (loading) {
    return (
      <div className="sessions-detail-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/sessions")}
          >
            <Icon name="arrow_back" />
            <span>返回</span>
          </button>
        </section>
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="sessions-detail-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/sessions")}
          >
            <Icon name="arrow_back" />
            <span>返回</span>
          </button>
        </section>
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error || "会话未找到"}</p>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  const allAnalyzed = PROTOCOL_ORDER.every(
    (p) => getProtocolStatus(p) === "analyzed",
  );

  const currentStepIndex = PROTOCOL_ORDER.findIndex(
    (p) => getProtocolStatus(p) !== "analyzed",
  );
  const nextProtocol =
    currentStepIndex >= 0 ? PROTOCOL_ORDER[currentStepIndex] : null;
  const nextProtocolLabel = nextProtocol
    ? PROTOCOL_LABEL[nextProtocol]
    : "";

  const staticResult = session.protocol_results.find(
    (r) => r.protocol === "static_posture",
  );
  const psiScore = staticResult?.psi_score ?? null;

  return (
    <div className="sessions-detail-page page-stack">
      <section className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() => navigate("/sessions")}
        >
          <Icon name="arrow_back" />
          <span>返回</span>
        </button>
        <h1 className="page-title">
          {session.subject_display_name}
        </h1>
        <div className="session-meta" style={{ marginTop: "0.25rem" }}>
          <span className={`status-badge status-${session.status}`}>
            {STATUS_LABEL[session.status] || session.status}
          </span>
          {session.overall_risk ? (
            <span className="risk-tag">
              {RISK_LABEL[session.overall_risk] || session.overall_risk}
            </span>
          ) : null}
        </div>
        <p className="page-subtitle" style={{ marginTop: "0.5rem" }}>
          筛查会话 · {formatDate(session.created_at)}
        </p>
      </section>

      {/* PSI Gauge — posture symmetry index */}
      {psiScore != null && (
        <section className="psi-gauge-section">
          <PsiGauge score={psiScore} size="small" />
          <div className="psi-gauge-caption">
            <p className="psi-gauge-title">姿势对称指数 (PSI)</p>
            <p className="psi-gauge-desc">综合肩、骨盆、躯干三项对称性评估</p>
          </div>
        </section>
      )}

      {/* Primary CTA — the single action button */}
      <section className="session-cta-section">
        {session.integrated_report ? (
          <Button
            variant="primary"
            size="large"
            icon="description"
            onClick={() =>
              navigate(
                `/sessions/${encodeURIComponent(session.session_id)}/report`,
              )
            }
          >
            查看综合报告
          </Button>
        ) : allAnalyzed ? (
          <Button
            variant="primary"
            size="large"
            icon="auto_awesome"
            loading={generatingReport}
            onClick={async () => {
              setGeneratingReport(true);
              try {
                await apiClient.generateIntegratedReport(session.session_id);
                loadSession();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "报告生成失败",
                );
              } finally {
                setGeneratingReport(false);
              }
            }}
          >
            生成综合报告
          </Button>
        ) : nextProtocol ? (
          <Button
            variant="primary"
            size="large"
            icon={
              getProtocolStatus(nextProtocol) === "needs_recapture"
                ? "refresh"
                : "play_arrow"
            }
            onClick={() =>
              navigate(
                `/sessions/${encodeURIComponent(session.session_id)}/protocols/${encodeURIComponent(nextProtocol as string)}`,
              )
            }
          >
            {getProtocolStatus(nextProtocol) === "needs_recapture"
              ? `重新采集：${nextProtocolLabel}`
              : `开始：${nextProtocolLabel}`}
          </Button>
        ) : null}
      </section>

      {/* Sequential progress pipeline */}
      <section className="detail-section">
        <h2 className="section-title">筛查流程</h2>
        <div className="protocol-pipeline">
          {PROTOCOL_ORDER.map((protocol, idx) => {
            const status = getProtocolStatus(protocol);
            const isCompleted = status === "analyzed";
            const isCurrent = idx === currentStepIndex;
            const isLocked = currentStepIndex >= 0 && idx > currentStepIndex;
            const needsRetry =
              status === "needs_recapture" || status === "needs_review";

            let stepClass = "pipeline-step";
            if (isCompleted) stepClass += " pipeline-step-done";
            else if (isCurrent && needsRetry) stepClass += " pipeline-step-retry";
            else if (isCurrent) stepClass += " pipeline-step-current";
            else if (isLocked) stepClass += " pipeline-step-locked";

            let iconName = "lock";
            if (isCompleted) iconName = "check_circle";
            else if (isCurrent && needsRetry) iconName = "error";
            else if (isCurrent) iconName = PROTOCOL_ICON[protocol];

            return (
              <div key={protocol} className={stepClass}>
                {/* Connector line */}
                {idx > 0 ? (
                  <div
                    className={`pipeline-connector ${
                      idx <= currentStepIndex ? "pipeline-connector-active" : ""
                    }`}
                  >
                    <div className="pipeline-connector-line" />
                    {idx <= currentStepIndex ? (
                      <Icon
                        name="arrow_forward"
                        size="small"
                        className="pipeline-connector-arrow"
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className="pipeline-step-card">
                  <div className="pipeline-step-icon">
                    <Icon name={iconName} />
                  </div>
                  <div className="pipeline-step-info">
                    <p className="pipeline-step-label">
                      第{idx + 1}步
                    </p>
                    <p className="pipeline-step-name">
                      {PROTOCOL_LABEL[protocol]}
                    </p>
                    <p className="pipeline-step-status">
                      {isLocked
                        ? "等待上一步完成"
                        : PROTOCOL_STATUS_LABEL[status] || status}
                    </p>
                  </div>
                  {isCurrent && !isCompleted ? (
                    <div className="pipeline-step-action">
                      <Button
                        variant={needsRetry ? "primary" : "secondary"}
                        size="small"
                        icon={
                          needsRetry ? "refresh" : "play_arrow"
                        }
                        onClick={() =>
                          navigate(
                            `/sessions/${encodeURIComponent(session.session_id)}/protocols/${encodeURIComponent(protocol)}`,
                          )
                        }
                      >
                        {needsRetry ? "重新采集" : "开始"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick recap of completed results */}
      {session.protocol_results.length > 0 ? (
        <section className="detail-section">
          <h2 className="section-title">已完成的评估</h2>
          {session.protocol_results
            .filter((p) => p.status === "analyzed")
            .map((protocol) => (
              <SurfaceCard
                key={protocol.protocol}
                variant="lowest"
                padding="medium"
                className="protocol-recap-card"
              >
                <div className="protocol-recap">
                  <div className="protocol-recap-header">
                    <Icon
                      name={PROTOCOL_ICON[protocol.protocol] || "fitness_center"}
                    />
                    <span className="protocol-recap-name">
                      {PROTOCOL_LABEL[protocol.protocol] || protocol.protocol}
                    </span>
                    <span className="status-badge status-completed">
                      已完成
                    </span>
                  </div>
                  {protocol.findings.length > 0 ? (
                    <ul className="report-findings-list">
                      {protocol.findings.slice(0, 3).map((f, i) => (
                        <li key={i} className="report-finding-item">
                          <span className="report-finding-dot">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {protocol.risk_flags.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                        marginTop: "0.5rem",
                      }}
                    >
                      {protocol.risk_flags.map((flag) => (
                        <span key={flag} className="risk-tag">
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </SurfaceCard>
            ))}
        </section>
      ) : null}
    </div>
  );
}
