import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../../shared/i18n";

const cameraFeedMockState = vi.hoisted(() => ({
  instanceCounter: 0,
}));

vi.mock("../components/CameraFeed", async () => {
  const React = await import("react");

  return {
    CameraFeed: ({
      onAnalysis,
    }: {
      onAnalysis?: (analysis: {
        session_id: string;
        has_detection: boolean;
        frame_width: number;
        frame_height: number;
        keypoints: never[];
        detector_backend: string;
        live_metrics: {
          squat_count: number;
          knee_sway_ratio: number;
          knee_valgus_angle: number;
          center_deviation_ratio: number;
          left_right_symmetry: number;
          linkage_smoothness: number;
          squat_depth_ratio: number;
          tempo_seconds: number | null;
        };
        view_mode: "side";
        readiness_state: "capturing";
        missing_keypoints: never[];
        min_keypoint_visibility: number;
        pose_connections: never[];
      }) => void;
    }) => {
      const [instanceId] = React.useState(() => ++cameraFeedMockState.instanceCounter);

      return (
        <div
          data-testid="camera-feed"
          data-instance-id={String(instanceId)}
        >
          <button
            type="button"
            onClick={() => {
              onAnalysis?.({
                session_id: "live-session-1",
                has_detection: true,
                frame_width: 640,
                frame_height: 480,
                keypoints: [],
                detector_backend: "stub",
                live_metrics: {
                  squat_count: 4,
                  knee_sway_ratio: 0.1,
                  knee_valgus_angle: 4,
                  center_deviation_ratio: 0.08,
                  left_right_symmetry: 0.91,
                  linkage_smoothness: 0.86,
                  squat_depth_ratio: 0.72,
                  tempo_seconds: 1.6,
                },
                view_mode: "side",
                readiness_state: "capturing",
                missing_keypoints: [],
                min_keypoint_visibility: 0.35,
                pose_connections: [],
              });
            }}
          >
            emit-analysis
          </button>
        </div>
      );
    },
  };
});

import { SquatSessionPage } from "./SquatSessionPage";

describe("SquatSessionPage", () => {
  beforeEach(() => {
    cameraFeedMockState.instanceCounter = 0;
  });

  it("remounts the camera feed and clears live metrics when resetting the session", () => {
    render(
      <MemoryRouter>
        <SquatSessionPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("camera-feed")).toHaveAttribute("data-instance-id", "1");

    fireEvent.click(screen.getByRole("button", { name: "emit-analysis" }));
    expect(screen.getByText("4")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("assessment.resetSession") }),
    );

    expect(screen.queryByText("4")).not.toBeInTheDocument();
    expect(screen.getByTestId("camera-feed")).toHaveAttribute("data-instance-id", "2");
  });
});
