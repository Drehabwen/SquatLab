import base64
from types import SimpleNamespace

import cv2
import numpy as np

from app.api.routes.camera import get_pose_detector_dependency


class StubUnavailableDetector:
    backend = "stub"
    available = False
    availability_detail = "Pose detector is disabled in tests."


class StubAvailableDetector:
    backend = "stub"
    available = True
    availability_detail = "Pose detector ready."

    def process_frame(self, frame):
        return SimpleNamespace(
            has_detection=True,
            frame_width=int(frame.shape[1]),
            frame_height=int(frame.shape[0]),
            keypoints=[
                SimpleNamespace(name="left_shoulder", x=0.4, y=0.28, z=0.0, visibility=0.99),
                SimpleNamespace(name="right_shoulder", x=0.6, y=0.28, z=0.0, visibility=0.99),
                SimpleNamespace(
                    name="left_hip",
                    x=0.45,
                    y=0.55,
                    z=0.0,
                    visibility=0.99,
                ),
                SimpleNamespace(name="right_hip", x=0.55, y=0.55, z=0.0, visibility=0.99),
                SimpleNamespace(name="left_knee", x=0.44, y=0.73, z=0.0, visibility=0.99),
                SimpleNamespace(name="right_knee", x=0.56, y=0.73, z=0.0, visibility=0.99),
                SimpleNamespace(name="left_ankle", x=0.44, y=0.92, z=0.0, visibility=0.99),
                SimpleNamespace(name="right_ankle", x=0.56, y=0.92, z=0.0, visibility=0.99),
            ],
        )


def test_camera_status_reports_dependency_state(client):
    client.app.dependency_overrides[get_pose_detector_dependency] = (
        lambda: StubUnavailableDetector()
    )

    response = client.get("/api/v1/camera/status")

    assert response.status_code == 200
    assert response.json() == {
        "available": False,
        "backend": "stub",
        "detail": "Pose detector is disabled in tests.",
    }


def test_camera_keypoints_returns_503_when_detector_is_unavailable(client):
    client.app.dependency_overrides[get_pose_detector_dependency] = (
        lambda: StubUnavailableDetector()
    )

    response = client.get("/api/v1/camera/keypoints")

    assert response.status_code == 503
    assert response.json()["error"]["type"] == "ServiceUnavailableError"


def test_camera_analyze_frame_returns_pose_keypoints_and_live_metrics(client):
    client.app.dependency_overrides[get_pose_detector_dependency] = (
        lambda: StubAvailableDetector()
    )

    create_session_response = client.post("/api/v1/camera/sessions")
    session_id = create_session_response.json()["session_id"]

    frame = np.zeros((4, 4, 3), dtype=np.uint8)
    encoded, buffer = cv2.imencode(".jpg", frame)
    assert encoded

    payload = {
        "session_id": session_id,
        "view_mode": "front",
        "frame_data_url": f"data:image/jpeg;base64,{base64.b64encode(buffer.tobytes()).decode('ascii')}"
    }

    response = client.post("/api/v1/camera/analyze-frame", json=payload)

    assert response.status_code == 200
    json_payload = response.json()
    assert json_payload["session_id"] == session_id
    assert json_payload["view_mode"] == "front"
    assert json_payload["has_detection"] is True
    assert json_payload["readiness_state"] == "capturing"
    assert json_payload["frame_width"] == 4
    assert json_payload["frame_height"] == 4
    assert json_payload["detector_backend"] == "stub"
    assert len(json_payload["keypoints"]) == 8
    assert json_payload["missing_keypoints"] == []
    assert len(json_payload["pose_connections"]) > 0
    assert json_payload["live_metrics"]["squat_count"] == 0
    assert 0 <= json_payload["live_metrics"]["squat_depth_ratio"] <= 1
