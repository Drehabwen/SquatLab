import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../shared/i18n";
import { apiClient } from "../../../shared/api/client";
import { CameraFeed } from "./CameraFeed";

vi.mock("../../../shared/api/client", () => ({
  apiClient: {
    cameraStatus: vi.fn(),
    createCameraSession: vi.fn(),
    closeCameraSession: vi.fn(),
    analyzeCameraFrame: vi.fn(),
  },
}));

function buildAnalysis(viewMode: "front" | "side") {
  return {
    session_id: "live-session-1",
    has_detection: true,
    frame_width: 640,
    frame_height: 480,
    keypoints: [],
    detector_backend: "stub",
    live_metrics: {
      squat_count: viewMode === "front" ? 2 : 1,
      knee_sway_ratio: 0.1,
      knee_valgus_angle: 4,
      center_deviation_ratio: 0.08,
      left_right_symmetry: 0.92,
      linkage_smoothness: 0.88,
      squat_depth_ratio: 0.7,
      tempo_seconds: 1.4,
    },
    view_mode: viewMode,
    readiness_state: "capturing" as const,
    missing_keypoints: [],
    min_keypoint_visibility: 0.35,
    pose_connections: [],
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("CameraFeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(apiClient.cameraStatus).mockResolvedValue({
      available: true,
      backend: "stub",
      detail: "",
    });
    vi.mocked(apiClient.createCameraSession).mockResolvedValue({
      session_id: "live-session-1",
    });
    vi.mocked(apiClient.closeCameraSession).mockResolvedValue(undefined);
    vi.mocked(apiClient.analyzeCameraFrame).mockImplementation(async (_, viewMode) => {
      return buildAnalysis(viewMode);
    });

    const fakeTrack = { stop: vi.fn() };
    const fakeStream = {
      getTracks: () => [fakeTrack],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("uses the latest view mode for frame analysis after switching views", async () => {
    const { rerender } = render(
      <CameraFeed viewMode="side" />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: i18n.t("camera.start") }),
      );
      await flushAsyncWork();
    });

    expect(apiClient.analyzeCameraFrame).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.analyzeCameraFrame).mock.calls[0]?.[1]).toBe("side");

    rerender(<CameraFeed viewMode="front" />);

    await act(async () => {
      vi.advanceTimersByTime(160);
      await flushAsyncWork();
    });

    expect(apiClient.analyzeCameraFrame).toHaveBeenCalledTimes(2);
    expect(vi.mocked(apiClient.analyzeCameraFrame).mock.calls[1]?.[1]).toBe("front");
  });
});
