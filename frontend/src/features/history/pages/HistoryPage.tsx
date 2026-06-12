import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Icon,
  SkeletonList,
  SurfaceCard,
} from "../../../shared/components/ui";
import { HistoryEmptyState } from "../components/HistoryEmptyState";
import { HistoryList } from "../components/HistoryList";
import { HistoryToolbar } from "../components/HistoryToolbar";
import { useSessionSummaries } from "../hooks/useSessionSummaries";
import { exportSessionSummaries, filterSessions } from "../lib/sessionUtils";

export function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { sessions, error, isLoading } = useSessionSummaries();

  const filteredSessions = useMemo(
    () => filterSessions(sessions, searchQuery),
    [searchQuery, sessions]
  );

  return (
    <div className="history-page page-stack">
      <section className="history-header">
        <div className="history-title-row">
          <h1 className="page-title">{t("history.title")}</h1>
          <Button
            variant="tertiary"
            icon="download"
            onClick={() => exportSessionSummaries(filteredSessions)}
            disabled={filteredSessions.length === 0}
          >
            {t("history.export")}
          </Button>
        </div>
        <p className="page-subtitle">{t("history.subtitle")}</p>
      </section>

      <HistoryToolbar
        searchQuery={searchQuery}
        searchPlaceholder={t("history.searchSessions")}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery("")}
        clearLabel={t("history.clearSearch")}
      />

      {isLoading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <SurfaceCard variant="low" padding="medium" className="error-card">
          <div className="error-content">
            <Icon name="error" />
            <p>{error}</p>
          </div>
        </SurfaceCard>
      ) : filteredSessions.length === 0 ? (
        <HistoryEmptyState
          hasSearchQuery={Boolean(searchQuery)}
          title={searchQuery ? t("history.noResults") : t("history.noSessions")}
          description={searchQuery ? t("history.noResultsDesc") : t("history.noSessionsDesc")}
          actionLabel={t("home.startAssessment")}
          clearLabel={t("history.clearSearch")}
          onClearSearch={() => setSearchQuery("")}
        />
      ) : (
        <HistoryList
          sessions={filteredSessions}
          locale={i18n.language}
          typeLabel={t("history.type")}
          countLabel={t("assessment.squatCount")}
          scoreLabel={t("history.score")}
          onSelectSession={(sessionId) => navigate(`/history/${encodeURIComponent(sessionId)}`)}
        />
      )}
    </div>
  );
}
