import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button, EmptyState, Icon, SkeletonCard, SurfaceCard } from "../../../shared/components/ui";
import { useHomeDashboard } from "../hooks/useHomeDashboard";

function formatSessionDate(dateString: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(dateString));
}

function formatSessionTime(dateString: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const {
    averageScore,
    error,
    isLoading,
    latestReport,
    latestSession,
    reportError,
    totalSessions,
    trendPoints,
  } = useHomeDashboard();

  const latestDate = latestSession ? formatSessionDate(latestSession.created_at, i18n.language) : "";
  const latestTime = latestSession ? formatSessionTime(latestSession.created_at, i18n.language) : "";
  const dashboardErrorCopy = t("home.dataLoadError");
  const primaryFinding =
    latestReport?.findings[0] ??
    (reportError ? t("home.reportUnavailable") : t("home.primaryFindingEmpty"));
  const nextRecommendation =
    latestReport?.recommendations[0] ??
    (reportError ? t("home.reportUnavailable") : t("home.recommendationEmpty"));

  return (
    <div className="home-page dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-hero-pill">{t("home.heroPill")}</span>
          <h1 className="dashboard-hero-title">{t("home.title")}</h1>
          <p className="dashboard-hero-description">{t("home.subtitle")}</p>
          <Link to="/assessment" className="dashboard-hero-button">
            {t("home.startAssessment")}
            <Icon name="arrow_forward" className="dashboard-hero-button-icon" filled />
          </Link>
        </div>

        <div className="dashboard-hero-image-wrap" aria-hidden="true">
          <img
            alt="Squat training"
            className="dashboard-hero-image"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBh91cz71Scy4Qrh2oxD1qaiAY3OqGDP41u2PMoc036dX0cp_CBPLtO5NEa0IsN76FPfnDoyKJi7bevyAmSBZwiLACJMMmqpaL4G56H0_GJ-fYIpYpefcRvfEhkVeOWNjpKra-ooPw7qgrhxGO8NgzeL9buv4RkxEFiKLlxYKY1wxQZ6Y_rfl3E47W450ZLLIAooeh6RtbQHc0Vn9OAPNK69MD-b7XgR9s6H3QVv67K3J2G1JccGjj7jTS8hpX0XOJtcg-hKKKC9NDU"
          />
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-column dashboard-column-primary">
          <div className="dashboard-section-heading">{t("home.latestSection")}</div>
          {isLoading ? (
            <SkeletonCard lines={5} />
          ) : error ? (
            <SurfaceCard variant="low" padding="medium" className="error-card">
              <div className="error-content">
                <Icon name="error" />
                <p>{error}</p>
              </div>
            </SurfaceCard>
          ) : latestSession ? (
            <article className="dashboard-card dashboard-card-session">
              <div className="dashboard-session-header">
                <div>
                  <p className="dashboard-session-date">{latestDate}</p>
                  <h2 className="dashboard-session-title">{t("home.latestTitle")}</h2>
                </div>
                <span className="dashboard-score-badge">{t("home.latestBadge")}</span>
              </div>

              <div className="dashboard-score-row">
                <div className="dashboard-score-block">
                  <p className="dashboard-score-label">{t("home.latestScoreLabel")}</p>
                  <div className="dashboard-score-value">
                    {latestSession.overall_score}
                    <span>/100</span>
                  </div>
                </div>
                <div className="dashboard-score-divider" />
                <div className="dashboard-score-block">
                  <p className="dashboard-score-label">{t("home.latestCountLabel")}</p>
                  <div className="dashboard-score-value dashboard-score-value-dark">
                    {latestSession.squat_count}
                  </div>
                </div>
              </div>

              <div className="dashboard-session-summary-block">
                <p className="dashboard-session-summary-label">{t("home.latestSummaryLabel")}</p>
                <p className="dashboard-session-summary">{latestSession.summary}</p>
              </div>

              <div className="dashboard-metric-stack">
                <div className="dashboard-metric-row">
                  <div className="dashboard-metric-left">
                    <Icon
                      name="schedule"
                      className="dashboard-metric-icon"
                      color="var(--color-brand-primary-teal-500)"
                    />
                    <span className="dashboard-metric-name">{t("home.latestTimeLabel")}</span>
                  </div>
                  <span className="dashboard-metric-value">{latestTime}</span>
                </div>
              </div>
            </article>
          ) : (
            <article className="dashboard-card dashboard-card-session">
              <EmptyState
                icon="query_stats"
                title={t("home.emptyTitle")}
                description={t("home.emptyDesc")}
                action={
                  <Button variant="secondary" icon="play_arrow" to="/assessment">
                    {t("home.startAssessment")}
                  </Button>
                }
              />
            </article>
          )}
        </div>

        <div className="dashboard-column dashboard-column-secondary">
          <div className="dashboard-section-header">
            <div className="dashboard-section-heading">{t("home.recentSection")}</div>
            <Link to="/history" className="dashboard-link-button">
              {t("home.recentViewAll")}
            </Link>
          </div>
          <div className="dashboard-activity-grid">
            <article className="dashboard-card dashboard-activity-card">
              <div className="dashboard-activity-header">
                <div className="dashboard-activity-icon">
                  <Icon name="fitness_center" color="var(--color-brand-primary-teal-500)" />
                </div>
                <div>
                  <h3 className="dashboard-activity-title">{t("home.recentTrendTitle")}</h3>
                  <p className="dashboard-activity-meta">{t("home.recentTrendMeta")}</p>
                </div>
              </div>
              <div className={`dashboard-chart ${trendPoints.length === 0 ? "dashboard-chart-empty" : ""}`}>
                {trendPoints.length > 0 ? (
                  <div className="dashboard-chart-bars">
                    {trendPoints.map((point, index) => (
                      <span
                        key={point.sessionId}
                        className={`dashboard-chart-bar dashboard-chart-bar-${(index % 5) + 1}`}
                        style={{ height: `${point.height}%` }}
                        title={`${t("history.score")}: ${point.score}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-empty-copy">
                    {error ? dashboardErrorCopy : t("home.recentTrendEmpty")}
                  </p>
                )}
              </div>
              <div className="dashboard-activity-footer">
                <span>{t("home.totalSessionsLabel")}: {totalSessions}</span>
                <span className="dashboard-activity-accent">
                  {t("home.averageScoreLabel")}: {averageScore ?? "--"}
                </span>
              </div>
            </article>

            <article className="dashboard-card dashboard-activity-card">
              <div className="dashboard-activity-header">
                <div className="dashboard-activity-icon">
                  <Icon name="history" color="var(--color-brand-primary-teal-500)" />
                </div>
                <div>
                  <h3 className="dashboard-activity-title">{t("home.reportSnapshotTitle")}</h3>
                  <p className="dashboard-activity-meta">
                    {latestSession ? `${latestDate} | ${latestTime}` : t("home.reportSnapshotMeta")}
                  </p>
                </div>
              </div>
              <div className="dashboard-data-list">
                {latestSession ? (
                  <>
                    <div className="dashboard-data-list-row">
                      <span className="dashboard-data-list-label">{t("home.latestSummaryLabel")}</span>
                      <span className="dashboard-data-list-value">{latestSession.summary}</span>
                    </div>
                    <div className="dashboard-data-list-row">
                      <span className="dashboard-data-list-label">{t("home.primaryFindingLabel")}</span>
                      <span className="dashboard-data-list-value">{primaryFinding}</span>
                    </div>
                  </>
                ) : (
                  <p className="dashboard-empty-copy">
                    {error ? dashboardErrorCopy : t("home.reportSnapshotEmpty")}
                  </p>
                )}
              </div>
            </article>
          </div>

          <article className="dashboard-insight">
            <div className="dashboard-insight-icon">
              <Icon name="tips_and_updates" size="small" color="var(--color-pure-white)" filled />
            </div>
            <div>
              <h3 className="dashboard-insight-title">{t("home.aiTipTitle")}</h3>
              <p className="dashboard-insight-copy">
                {latestSession ? nextRecommendation : (error ? dashboardErrorCopy : t("home.recommendationEmpty"))}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
