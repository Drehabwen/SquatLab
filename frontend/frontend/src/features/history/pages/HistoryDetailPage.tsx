import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  Button,
  DataBadge,
  Icon,
  SkeletonCard,
  SurfaceCard,
} from "../../../shared/components/ui";
import { useSessionReportPreview } from "../hooks/useSessionReportPreview";
import { exportSessionReport } from "../lib/sessionUtils";

export function HistoryDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const decodedSessionId = sessionId ? decodeURIComponent(sessionId) : null;
  const { t } = useTranslation();
  const { report, error, isLoading } = useSessionReportPreview(decodedSessionId);

  return (
    <div className="history-page page-stack">
      <section className="history-header">
        <div className="history-title-row">
          <div className="stack">
            <h1 className="page-title">{report?.title ?? t("history.detailTitle")}</h1>
            <p className="page-subtitle">{t("history.detailSubtitle")}</p>
          </div>
          <div className="history-actions">
            <Button variant="ghost" icon="arrow_back" to="/history">
              {t("history.backToHistory")}
            </Button>
            <Button
              variant="tertiary"
              icon="download"
              onClick={() => report && exportSessionReport(report)}
              disabled={!report}
            >
              {t("history.exportSession")}
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <SkeletonCard lines={5} />
      ) : error || !report ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error || t("history.reportUnavailable")}</p>
          </div>
        </SurfaceCard>
      ) : (
        <>
          <section className="assessment-lower-grid">
            <SurfaceCard variant="lowest" padding="large">
              <div className="assessment-surface-head">
                <div>
                  <h2 className="assessment-surface-title">{t("history.summary")}</h2>
                  <p className="assessment-surface-copy">{report.summary}</p>
                </div>
                <DataBadge
                  variant="primary"
                  label={t("history.sessionId")}
                  value={report.session_id}
                />
              </div>
            </SurfaceCard>

            <SurfaceCard variant="high" padding="large">
              <div className="assessment-surface-head">
                <div>
                  <h2 className="assessment-surface-title">{t("history.recommendations")}</h2>
                  <p className="assessment-surface-copy">{t("history.recommendationsDesc")}</p>
                </div>
              </div>
              <ul className="assessment-suggestion-list">
                {report.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </SurfaceCard>
          </section>

          <section className="assessment-grid">
            <SurfaceCard variant="lowest" padding="large">
              <div className="assessment-surface-head">
                <div>
                  <h2 className="assessment-surface-title">{t("history.findings")}</h2>
                  <p className="assessment-surface-copy">{t("history.findingsDesc")}</p>
                </div>
              </div>
              <ul className="assessment-suggestion-list">
                {report.findings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            </SurfaceCard>

            <SurfaceCard variant="lowest" padding="large">
              <div className="assessment-surface-head">
                <div>
                  <h2 className="assessment-surface-title">{t("history.nextStepTitle")}</h2>
                  <p className="assessment-surface-copy">{t("history.nextStepDesc")}</p>
                </div>
              </div>
              <div className="assessment-cta-row">
                <Button variant="primary" icon="play_arrow" to="/assessment">
                  {t("home.startAssessment")}
                </Button>
                <Button variant="tertiary" icon="history" to="/history">
                  {t("history.backToHistory")}
                </Button>
              </div>
            </SurfaceCard>
          </section>
        </>
      )}
    </div>
  );
}
