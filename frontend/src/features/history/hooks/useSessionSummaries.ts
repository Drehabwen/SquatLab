import { useEffect, useState } from "react";
import { apiClient } from "../../../shared/api/client";
import type { SessionSummary } from "../../../shared/types/api";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useSessionSummaries() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSessions() {
      setIsLoading(true);

      try {
        const nextSessions = await apiClient.listSessions();
        if (!isActive) {
          return;
        }

        setSessions(nextSessions);
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

    loadSessions();

    return () => {
      isActive = false;
    };
  }, []);

  return {
    sessions,
    error,
    isLoading,
  };
}
