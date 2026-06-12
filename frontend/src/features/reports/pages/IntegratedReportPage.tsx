import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import type { IntegratedReportResponse } from "../../../shared/types/api";
import { Button, Icon, SkeletonCard, SurfaceCard } from "../../../shared/components/ui";
import { AiAnalysisCard } from "../components/AiAnalysisCard";
import { PsiRiskSection } from "../components/PsiRiskSection";
import { EvidenceSection } from "../components/EvidenceSection";
import { RecommendationsSection } from "../components/RecommendationsSection";

const CONSISTENCY_LABEL: Record<string, string> = {
  none: "无跨协议证据",
  single_protocol: "单协议一致",
  multi_protocol_consistent: "多协议一致",
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

      {/* 姿势对称指数 & 综合风险评估 */}
      <PsiRiskSection
        psiScore={report.psi_score}
        overallRisk={report.overall_risk}
        nextAction={report.next_action}
        severityGrades={report.severity_grades}
      />

      {/* 报告摘要 */}
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

      {/* 跨协议证据链 */}
      <EvidenceSection evidenceList={report.cross_protocol_evidence} />

      {/* 行动建议 */}
      <RecommendationsSection recommendations={report.recommendations} />

      {/* AI临床建议 / 审核 */}
      <section className="report-ai-section">
        <AiAnalysisCard sessionId={report.session_id} />
      </section>

      {/* 免责声明 */}
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

      {/* 页面底部操作栏 */}
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
