import { useEffect, useState } from "react";
import { apiClient } from "../../../shared/api/client";
import type { ReportPreviewResponse } from "../../../shared/types/api";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useSessionReportPreview(sessionId: string | null) {
  const [report, setReport] = useState<ReportPreviewResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) {
      setReport(null);
      setError("");
      setIsLoading(false);
      return;
    }

    const resolvedSessionId = sessionId;
    let isActive = true;

    async function loadReportPreview() {
      setIsLoading(true);

      try {
        const nextReport = await apiClient.previewReport({ session_id: resolvedSessionId });
        if (!isActive) {
          return;
        }

        setReport(nextReport);
        setError("");
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        setError(getErrorMessage(caughtError, "Load failed"));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadReportPreview();

    return () => {
      isActive = false;
    };
  }, [sessionId]);

  return {
    report,
    error,
    isLoading,
  };
}
