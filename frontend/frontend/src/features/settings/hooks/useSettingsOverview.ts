import { useEffect, useState } from "react";
import { apiClient } from "../../../shared/api/client";
import type {
  CameraStatusResponse,
  HealthResponse,
  ScreeningSessionSummary,
} from "../../../shared/types/api";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useSettingsOverview() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatusResponse | null>(null);
  const [sessions, setSessions] = useState<ScreeningSessionSummary[]>([]);
  const [serviceError, setServiceError] = useState("");
  const [dataError, setDataError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadOverview() {
      setIsLoading(true);

      const [healthResult, cameraStatusResult, sessionsResult] =
        await Promise.allSettled([
          apiClient.health(),
          apiClient.cameraStatus(),
          apiClient.listScreeningSessions(),
        ]);

      if (!isActive) return;

      const serviceErrors: string[] = [];

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else {
        setHealth(null);
        serviceErrors.push(
          `[Health] ${getErrorMessage(healthResult.reason, "Service unavailable")}`,
        );
      }

      if (cameraStatusResult.status === "fulfilled") {
        setCameraStatus(cameraStatusResult.value);
      } else {
        setCameraStatus(null);
        serviceErrors.push(
          `[Camera] ${getErrorMessage(cameraStatusResult.reason, "Camera status unavailable")}`,
        );
      }

      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value);
        setDataError("");
      } else {
        setSessions([]);
        setDataError(
          `[Data] ${getErrorMessage(sessionsResult.reason, "Records unavailable")}`,
        );
      }

      setServiceError([...new Set(serviceErrors)].join(" "));
      setIsLoading(false);
    }

    loadOverview();

    return () => {
      isActive = false;
    };
  }, []);

  const completedCount = sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const pendingCount = sessions.filter(
    (s) =>
      s.status === "pending_review" ||
      s.status === "pending_recapture" ||
      s.status === "pending_report",
  ).length;

  return {
    cameraStatus,
    completedCount,
    dataError,
    health,
    isLoading,
    latestSession: sessions[0] ?? null,
    pendingCount,
    serviceError,
    sessions,
    totalSessions: sessions.length,
  };
}
