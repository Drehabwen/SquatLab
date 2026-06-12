import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../shared/api/client";
import type { ReportPreviewResponse, SessionSummary } from "../../../shared/types/api";

const MAX_TREND_POINTS = 6;
const MIN_TREND_BAR_HEIGHT = 18;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export interface HomeTrendPoint {
  sessionId: string;
  score: number;
  height: number;
}

function buildTrendPoints(sessions: SessionSummary[]): HomeTrendPoint[] {
  const recentSessions = sessions.slice(0, MAX_TREND_POINTS).reverse();
  const maxScore = recentSessions.reduce(
    (highestScore, session) => Math.max(highestScore, session.overall_score),
    1,
  );

  return recentSessions.map((session) => ({
    sessionId: session.session_id,
    score: session.overall_score,
    height: Math.max(
      MIN_TREND_BAR_HEIGHT,
      Math.round((session.overall_score / maxScore) * 100),
    ),
  }));
}

export function useHomeDashboard() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [latestReport, setLatestReport] = useState<ReportPreviewResponse | null>(null);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);

      try {
        const nextSessions = await apiClient.listSessions();
        if (!isActive) {
          return;
        }

        setSessions(nextSessions);
        setError("");

        if (nextSessions.length === 0) {
          setLatestReport(null);
          setReportError("");
          setIsLoading(false);
          return;
        }

        try {
          const nextReport = await apiClient.previewReport({
            session_id: nextSessions[0].session_id,
          });
          if (!isActive) {
            return;
          }

          setLatestReport(nextReport);
          setReportError("");
        } catch (caughtError) {
          if (!isActive) {
            return;
          }

          setLatestReport(null);
          setReportError(getErrorMessage(caughtError, "Report unavailable"));
        }
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        setSessions([]);
        setLatestReport(null);
        setReportError("");
        setError(getErrorMessage(caughtError, "Load failed"));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const latestSession = sessions[0] ?? null;
  const averageScore = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    const totalScore = sessions.reduce((sum, session) => sum + session.overall_score, 0);
    return Math.round(totalScore / sessions.length);
  }, [sessions]);

  const trendPoints = useMemo(() => buildTrendPoints(sessions), [sessions]);

  return {
    averageScore,
    error,
    isLoading,
    latestReport,
    latestSession,
    reportError,
    totalSessions: sessions.length,
    trendPoints,
  };
}
