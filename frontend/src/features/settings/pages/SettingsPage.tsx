import { useState } from "react";
import { useTranslation } from "react-i18next";
import { exportSessionSummaries } from "../../history/lib/sessionUtils";
import { env } from "../../../shared/config/env";
import {
  Button,
  EmptyState,
  Icon,
  SkeletonCard,
  StatCard,
  SurfaceCard,
} from "../../../shared/components/ui";
import { useSettingsOverview } from "../hooks/useSettingsOverview";

function formatSessionDateTime(dateString: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const {
    cameraStatus,
    completedCount,
    dataError,
    health,
    isLoading,
    latestSession,
    pendingCount,
    serviceError,
    sessions,
    totalSessions,
  } = useSettingsOverview();

  const [customUrl, setCustomUrl] = useState(env.apiBaseUrl);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  const latestCapturedAt = latestSession
    ? formatSessionDateTime(latestSession.created_at, i18n.language)
    : "";
  const isServiceOnline = health?.status === "ok";
  const isCameraReady = cameraStatus?.available ?? false;

  return (
    <div className="settings-page page-stack">
      <section className="settings-header">
        <h1 className="page-title">{t("settings.title")}</h1>
        <p className="page-subtitle">{t("settings.subtitle")}</p>
      </section>

      {serviceError ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{serviceError}</p>
          </div>
        </SurfaceCard>
      ) : null}

      <section className="settings-section">
        <h2 className="section-title">{t("settings.environment")}</h2>
        <SurfaceCard variant="lowest" padding="medium" className="env-card">
          <div className="env-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="env-label">{t("settings.apiBaseUrl")}</span>
              {!isEditingUrl ? (
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 500
                  }}
                >
                  <Icon name="edit" />
                  修改
                </button>
              ) : null}
            </div>
            {!isEditingUrl ? (
              <span className="env-value" style={{ wordBreak: "break-all" }}>{env.apiBaseUrl}</span>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--color-surface-low)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    padding: "0.4rem 0.6rem",
                    color: "var(--color-text)",
                    fontSize: "0.85rem"
                  }}
                  placeholder="例如 http://192.168.3.15:8000"
                />
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => {
                    env.apiBaseUrl = customUrl.trim();
                    setIsEditingUrl(false);
                    window.location.reload();
                  }}
                >
                  保存
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => {
                    setCustomUrl(env.apiBaseUrl);
                    setIsEditingUrl(false);
                  }}
                >
                  取消
                </Button>
              </div>
            )}
          </div>
          <div className="env-item">
            <span className="env-label">{t("settings.serviceName")}</span>
            <span className="env-value">
              {health?.service ?? "青跃智衡 API"}
            </span>
          </div>
          <div className="env-item">
            <span className="env-label">{t("settings.serviceVersion")}</span>
            <span className="env-value">{health?.version ?? "--"}</span>
          </div>
          <div className="env-item">
            <span className="env-label">
              {t("settings.connectionStatus")}
            </span>
            <span
              className={`env-value${isServiceOnline ? "" : " env-value-disabled"}`}
            >
              {isServiceOnline
                ? t("settings.statusOnline")
                : t("settings.statusOffline")}
            </span>
          </div>
          <div className="env-item">
            <span className="env-label">{t("settings.cameraStatus")}</span>
            <span
              className={`env-value${isCameraReady ? "" : " env-value-disabled"}`}
            >
              {isCameraReady
                ? t("settings.cameraReady")
                : t("settings.cameraUnavailable")}
            </span>
          </div>
          <div className="env-item">
            <span className="env-label">{t("settings.detectorBackend")}</span>
            <span className="env-value">
              {cameraStatus?.backend ?? "--"}
            </span>
          </div>
        </SurfaceCard>
      </section>

      <section className="settings-section">
        <h2 className="section-title">{t("settings.savedData")}</h2>
        {isLoading ? (
          <>
            <SkeletonCard lines={3} />
            <div style={{ height: "0.75rem" }} />
            <SkeletonCard lines={3} />
          </>
        ) : dataError ? (
          <SurfaceCard variant="low" padding="medium" className="error-card">
            <div className="error-content">
              <Icon name="error" />
              <p>{dataError}</p>
            </div>
          </SurfaceCard>
        ) : totalSessions === 0 ? (
          <SurfaceCard variant="lowest" padding="large">
            <EmptyState
              icon="query_stats"
              title={t("settings.noRecords")}
              description={t("settings.noRecordsDesc")}
              action={
                <Button variant="secondary" icon="play_arrow" to="/sessions/new">
                  {t("home.startAssessment")}
                </Button>
              }
            />
          </SurfaceCard>
        ) : (
          <>
            <div className="settings-grid">
              <StatCard
                label={t("settings.totalSessions")}
                value={totalSessions}
                icon="history"
              />
              <StatCard
                label={t("settings.completedCount")}
                value={completedCount}
                icon="check_circle"
                variant="highlight"
              />
              <StatCard
                label={t("settings.pendingCount")}
                value={pendingCount}
                icon="pending"
                variant="accent"
              />
            </div>

            {latestSession ? (
              <SurfaceCard
                variant="lowest"
                padding="medium"
                className="about-info"
              >
                <h3 className="about-name">{t("settings.latestSession")}</h3>
                <div className="env-item">
                  <span className="env-label">{t("settings.subject")}</span>
                  <span className="env-value">
                    {latestSession.subject_display_name}
                  </span>
                </div>
                <div className="env-item">
                  <span className="env-label">{t("settings.time")}</span>
                  <span className="env-value">{latestCapturedAt}</span>
                </div>
                <div className="env-item">
                  <span className="env-label">{t("settings.status")}</span>
                  <span className="env-value">{latestSession.status}</span>
                </div>
              </SurfaceCard>
            ) : null}
          </>
        )}
      </section>

      <section className="settings-section">
        <h2 className="section-title">{t("settings.dataActions")}</h2>
        <SurfaceCard variant="low" padding="medium">
          <div className="data-actions">
            <Button
              variant="tertiary"
              icon="download"
              onClick={() =>
                exportSessionSummaries(
                  sessions.map((s) => ({
                    session_id: s.session_id,
                    overall_score:
                      s.overall_risk === "low"
                        ? 90
                        : s.overall_risk === "attention"
                          ? 75
                          : s.overall_risk === "review_required"
                            ? 60
                            : 50,
                    squat_count: s.completed_protocols?.length ?? 0,
                    summary: `${s.subject_display_name} - ${s.status}`,
                    created_at: s.created_at,
                  })),
                )
              }
              disabled={sessions.length === 0}
            >
              {t("settings.exportRecords")}
            </Button>
            <Button variant="tertiary" icon="history" to="/sessions">
              {t("settings.viewRecords")}
            </Button>
            <Button variant="tertiary" icon="upload" to="/import">
              {t("settings.batchImport")}
            </Button>
            <Button variant="secondary" icon="add" to="/sessions/new">
              {t("settings.newScreening")}
            </Button>
          </div>
        </SurfaceCard>
      </section>

      <section className="settings-section">
        <h2 className="section-title">{t("settings.about")}</h2>
        <SurfaceCard variant="lowest" padding="medium">
          <div className="about-info">
            <p className="about-name">青跃智衡</p>
            <p className="about-version">{t("settings.version")}</p>
            <p className="about-description">{t("settings.description")}</p>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
