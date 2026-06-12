import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type { IntegratedReportResponse } from "../../../shared/types/api";
import { Button, Icon, PsiGauge, SeverityBars, SkeletonCard, SurfaceCard } from "../../../shared/components/ui";
import { AiAnalysisCard } from "../components/AiAnalysisCard";

const RISK_LABEL: Record<string, string> = {
  low: "低风险",
  attention: "需关注",
  review_required: "需审核",
  recapture_needed: "需重采",
};

const RISK_CLASS: Record<string, string> = {
  low: "risk-low",
  attention: "risk-attention",
  review_required: "risk-review_required",
  recapture_needed: "risk-recapture_needed",
};

const CONSISTENCY_LABEL: Record<string, string> = {
  none: "无跨协议证据",
  single_protocol: "单协议一致",
  multi_protocol_consistent: "多协议一致",
};

const NEXT_ACTION_LABEL: Record<string, string> = {
  pass: "通过",
  retest_later: "建议复测",
  recapture: "需重新采集",
  manual_review: "需人工审核",
  professional_evaluation: "建议专业评估",
};

const PROTOCOL_LABEL: Record<string, string> = {
  static_posture: "静态姿势",
  adams_forward_bend: "Adams前屈",
  squat: "深蹲",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "低置信度",
  medium: "中等置信度",
  high: "高置信度",
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function IntegratedReportPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<IntegratedReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Integration States
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    apiClient
      .getIntegratedReport(sessionId)
      .then(setReport)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "加载报告失败"),
      )
      .finally(() => setLoading(false));

    // Check synced history status from local storage
    const isSynced = localStorage.getItem(`synced_${sessionId}`) === "true";
    setSynced(isSynced);
  }, [sessionId]);

  const handleSync = async () => {
    if (!sessionId) return;
    setSyncing(true);
    setToast({ show: false, type: "success", message: "" });
    try {
      await apiClient.syncToRehabWorkstation(sessionId);
      setSynced(true);
      localStorage.setItem(`synced_${sessionId}`, "true");
      setToast({
        show: true,
        type: "success",
        message: "同步成功！已接入康复师临床工作站 🚀",
      });
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    } catch (err) {
      setToast({
        show: true,
        type: "error",
        message: err instanceof Error ? err.message : "同步失败，请检查网络或康复服务是否启动",
      });
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 5000);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="report-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() =>
              navigate(`/sessions/${encodeURIComponent(sessionId ?? "")}`)
            }
          >
            <Icon name="arrow_back" />
            <span>返回会话</span>
          </button>
        </section>
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-page page-stack">
        <section className="page-header">
          <button
            className="back-button"
            type="button"
            onClick={() =>
              navigate(`/sessions/${encodeURIComponent(sessionId ?? "")}`)
            }
          >
            <Icon name="arrow_back" />
            <span>返回会话</span>
          </button>
          <h1 className="page-title">综合报告</h1>
        </section>
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error || "报告未生成"}</p>
          </div>
          <div className="form-actions" style={{ marginTop: "1rem" }}>
            <Button
              variant="primary"
              icon="auto_awesome"
              onClick={async () => {
                const sid = sessionId;
                if (!sid) return;
                try {
                  setError("");
                  setLoading(true);
                  const newReport =
                    await apiClient.generateIntegratedReport(sid);
                  setReport(newReport);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "报告生成失败",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              生成综合报告
            </Button>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  const riskClass = RISK_CLASS[report.overall_risk] || "";

  return (
    <div className="report-page page-stack">
      <style>{`
        .sync-toast {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.75rem 1.25rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 500;
          pointer-events: none;
          animation: syncToastFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .sync-toast.error {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(127, 29, 29, 0.9);
        }
        .sync-toast.success {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(20, 83, 45, 0.9);
        }
        @keyframes syncToastFadeIn {
          from { opacity: 0; transform: translate(-50%, 1.5rem); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .btn-synced {
          opacity: 0.85;
          color: #22c55e !important;
          border-color: rgba(34, 197, 94, 0.3) !important;
          background: rgba(34, 197, 94, 0.05) !important;
        }
        .btn-sync-glow {
          position: relative;
          overflow: hidden;
        }
        .btn-sync-glow::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 45%,
            rgba(255, 255, 255, 0.15) 50%,
            transparent 55%
          );
          transform: rotate(45deg);
          animation: btnGlowSweep 3.5s infinite linear;
          pointer-events: none;
        }
        @keyframes btnGlowSweep {
          0% { transform: translate(-30%, -30%) rotate(45deg); }
          100% { transform: translate(30%, 30%) rotate(45deg); }
        }
      `}</style>

      {toast.show && (
        <div className={`sync-toast ${toast.type}`}>
          <Icon name={toast.type === "success" ? "check_circle" : "error"} />
          <span>{toast.message}</span>
        </div>
      )}

      <section className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() =>
            navigate(`/sessions/${encodeURIComponent(sessionId ?? "")}`)
          }
        >
          <Icon name="arrow_back" />
          <span>返回会话</span>
        </button>
        <h1 className="page-title">{report.title}</h1>
        <p className="page-subtitle">{formatDate(report.created_at)}</p>
      </section>

      <section className="report-risk-section">
        <div className="report-hero-grid">
          {report.psi_score != null && (
            <SurfaceCard variant="high" padding="large" className="report-psi-card">
              <PsiGauge score={report.psi_score} size="medium" />
              <p className="section-caption" style={{ textAlign: "center", marginTop: "0.5rem" }}>
                姿势对称指数 (PSI)
              </p>
            </SurfaceCard>
          )}
          <SurfaceCard variant="high" padding="large">
            <div className="report-risk-card">
              <Icon name="shield" />
              <p className={`report-risk-level ${riskClass}`}>
                {RISK_LABEL[report.overall_risk] || report.overall_risk}
              </p>
              <p className="section-caption">综合风险评估</p>
              <div style={{ marginTop: "0.75rem" }}>
                <span className="risk-tag">
                  {NEXT_ACTION_LABEL[report.next_action] || report.next_action}
                </span>
              </div>
            </div>
          </SurfaceCard>
        </div>
        {report.severity_grades && Object.keys(report.severity_grades).length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <SurfaceCard variant="lowest" padding="medium">
              <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>三轴严重度评估</h3>
              <SeverityBars grades={report.severity_grades} />
            </SurfaceCard>
          </div>
        )}
      </section>

      <section className="report-summary-section">
        <SurfaceCard variant="lowest" padding="large">
          <h2 className="section-title">报告摘要</h2>
          <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
            {report.summary}
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <span className="section-caption">
              一致性:{" "}
              {CONSISTENCY_LABEL[report.consistency_level] ||
                report.consistency_level}
            </span>
            {report.main_patterns.length > 0 ? (
              <span className="section-caption">
                主要模式: {report.main_patterns.join("、")}
              </span>
            ) : null}
          </div>
        </SurfaceCard>
      </section>

      {report.cross_protocol_evidence.length > 0 ? (
        <section className="report-evidence-section">
          <h2 className="section-title">跨协议证据链</h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {report.cross_protocol_evidence.map((evidence, idx) => (
              <SurfaceCard key={idx} variant="lowest" padding="medium">
                <div className="evidence-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                      {evidence.pattern}
                    </h3>
                    <span className="section-caption">
                      {CONFIDENCE_LABEL[evidence.confidence] ||
                        evidence.confidence}
                    </span>
                  </div>
                  <div style={{ marginTop: "0.25rem" }}>
                    {evidence.direction ? (
                      <span className="section-caption">
                        方向: {evidence.direction} ·{" "}
                      </span>
                    ) : null}
                    <span className="section-caption">
                      来源协议:{" "}
                      {evidence.protocols
                        .map((p) => PROTOCOL_LABEL[p] || p)
                        .join("、")}
                    </span>
                  </div>
                  {evidence.evidence.length > 0 ? (
                    <ul
                      className="report-findings-list"
                      style={{ marginTop: "0.5rem" }}
                    >
                      {evidence.evidence.map((e, i) => (
                        <li key={i} className="report-finding-item">
                          <span className="report-finding-dot">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </SurfaceCard>
            ))}
          </div>
        </section>
      ) : null}

      {report.recommendations.length > 0 ? (
        <section className="report-recommendations-section">
          <h2 className="section-title">行动建议</h2>
          <SurfaceCard variant="lowest" padding="medium">
            <ul className="report-findings-list">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="report-finding-item">
                  <span className="report-finding-dot">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </section>
      ) : null}

      <section className="report-ai-section">
        <AiAnalysisCard sessionId={report.session_id} />
      </section>

      <section className="report-disclaimer-section">
        <SurfaceCard variant="lowest" padding="medium">
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
            }}
          >
            {report.disclaimer}
          </p>
        </SurfaceCard>
      </section>

      <div className="form-actions" style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Button
          variant="secondary"
          icon="arrow_back"
          onClick={() =>
            navigate(`/sessions/${encodeURIComponent(sessionId ?? "")}`)
          }
        >
          返回会话
        </Button>
        <Button
          variant={synced ? "ghost" : "primary"}
          icon={synced ? "cloud_done" : "cloud_sync"}
          loading={syncing}
          disabled={synced}
          onClick={handleSync}
          className={`${synced ? "btn-synced" : "btn-sync-glow"}`}
        >
          {synced ? "已同步至康复工作台" : "同步至康复工作台"}
        </Button>
      </div>
    </div>
  );
}
