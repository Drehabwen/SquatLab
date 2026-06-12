import base64
import binascii
import logging
import time
from collections.abc import Iterator
from functools import lru_cache

import cv2
import numpy as np
from fastapi import APIRouter, Depends, Response, status
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError
from app.features.squat.live_analysis import LiveSquatSessionStore, collect_missing_required_points
from app.features.squat.pose_contract import MIN_KEYPOINT_VISIBILITY, POSE_CONNECTIONS
from app.features.squat.schemas import (
    CameraAnalysisSessionResponse,
    CameraFrameAnalysisResponse,
    CameraFrameRequest,
    CameraKeypointsResponse,
    CameraStatusResponse,
    LiveSquatMetricsResponse,
    PoseKeypoint,
)
from app.features.squat.visual_detection import PoseDetector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/camera", tags=["camera"])


@lru_cache
def get_pose_detector() -> PoseDetector:
    settings = get_settings()
    return PoseDetector(model_path=settings.pose_model_path)


def get_pose_detector_dependency() -> PoseDetector:
    return get_pose_detector()


@lru_cache
def get_live_analysis_store() -> LiveSquatSessionStore:
    return LiveSquatSessionStore()


def get_live_analysis_store_dependency() -> LiveSquatSessionStore:
    return get_live_analysis_store()


def close_pose_detector_cache() -> None:
    if get_pose_detector.cache_info().currsize == 0:
        return

    detector = get_pose_detector()
    detector.close()
    get_pose_detector.cache_clear()


def clear_live_analysis_store_cache() -> None:
    if get_live_analysis_store.cache_info().currsize == 0:
        return

    store = get_live_analysis_store()
    store.clear()
    get_live_analysis_store.cache_clear()


def open_camera_capture() -> cv2.VideoCapture:
    camera_index = get_settings().app_camera_device_index
    capture = cv2.VideoCapture(camera_index)
    if not capture.isOpened():
        capture.release()
        raise ServiceUnavailableError(
            f"Camera device {camera_index} is not available."
        )

    capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    return capture


def build_keypoints_response(detector: PoseDetector, frame) -> CameraKeypointsResponse:
    pose_frame = detector.process_frame(frame)
    return build_keypoints_payload(detector=detector, pose_frame=pose_frame)


def build_keypoints_payload(*, detector: PoseDetector, pose_frame) -> CameraKeypointsResponse:
    return CameraKeypointsResponse(
        has_detection=pose_frame.has_detection,
        frame_width=pose_frame.frame_width,
        frame_height=pose_frame.frame_height,
        keypoints=[
            PoseKeypoint(
                name=keypoint.name,
                x=keypoint.x,
                y=keypoint.y,
                z=keypoint.z,
                visibility=keypoint.visibility,
            )
            for keypoint in pose_frame.keypoints
        ],
        detector_backend=detector.backend,
    )


def build_frame_analysis_payload(
    *,
    detector: PoseDetector,
    pose_frame,
    session_id: str,
    view_mode: str,
    live_metrics: LiveSquatMetricsResponse | None,
) -> CameraFrameAnalysisResponse:
    keypoints = [
        PoseKeypoint(
            name=keypoint.name,
            x=keypoint.x,
            y=keypoint.y,
            z=keypoint.z,
            visibility=keypoint.visibility,
        )
        for keypoint in pose_frame.keypoints
    ]

    if not pose_frame.has_detection:
        readiness_state = "no_detection"
        missing_keypoints = []
    else:
        missing_keypoints = collect_missing_required_points(pose_frame.keypoints)
        if missing_keypoints:
            readiness_state = "insufficient_pose"
        else:
            readiness_state = "ready" if live_metrics and live_metrics.squat_count > 0 else "capturing"

    return CameraFrameAnalysisResponse(
        session_id=session_id,
        has_detection=pose_frame.has_detection,
        frame_width=pose_frame.frame_width,
        frame_height=pose_frame.frame_height,
        keypoints=keypoints,
        detector_backend=detector.backend,
        live_metrics=live_metrics,
        view_mode=view_mode,
        readiness_state=readiness_state,
        missing_keypoints=missing_keypoints,
        min_keypoint_visibility=MIN_KEYPOINT_VISIBILITY,
        pose_connections=list(POSE_CONNECTIONS),
    )


def decode_frame_data_url(frame_data_url: str) -> np.ndarray:
    encoded_payload = frame_data_url.split(",", 1)[-1].strip()
    if not encoded_payload:
        raise HTTPException(status_code=400, detail="Frame payload is empty.")

    try:
        frame_bytes = base64.b64decode(encoded_payload, validate=True)
    except binascii.Error as error:
        raise HTTPException(status_code=400, detail="Frame payload is not valid base64.") from error

    image_buffer = np.frombuffer(frame_bytes, dtype=np.uint8)
    frame = cv2.imdecode(image_buffer, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Frame payload is not a valid image.")

    return frame


def generate_frames(detector: PoseDetector) -> Iterator[bytes]:
    capture = open_camera_capture()

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                logger.warning("Failed to read frame from camera stream")
                break

            pose_frame = detector.process_frame(frame)
            frame_with_overlay = detector.draw_keypoints(frame.copy(), pose_frame)
            encoded, buffer = cv2.imencode(".jpg", frame_with_overlay)
            if not encoded:
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
            time.sleep(0.03)
    finally:
        capture.release()
        logger.info("Camera released")


@router.get("/status", response_model=CameraStatusResponse)
def camera_status(
    detector: PoseDetector = Depends(get_pose_detector_dependency),
) -> CameraStatusResponse:
    return CameraStatusResponse(
        available=detector.available,
        backend=detector.backend,
        detail=detector.availability_detail,
    )


@router.post(
    "/sessions",
    response_model=CameraAnalysisSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_camera_session(
    store: LiveSquatSessionStore = Depends(get_live_analysis_store_dependency),
) -> CameraAnalysisSessionResponse:
    return CameraAnalysisSessionResponse(session_id=store.create_session())


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def close_camera_session(
    session_id: str,
    store: LiveSquatSessionStore = Depends(get_live_analysis_store_dependency),
) -> Response:
    store.close_session(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/stream")
def video_stream(
    detector: PoseDetector = Depends(get_pose_detector_dependency),
) -> StreamingResponse:
    if not detector.available:
        raise ServiceUnavailableError(detector.availability_detail)

    return StreamingResponse(
        generate_frames(detector),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/keypoints", response_model=CameraKeypointsResponse)
def get_keypoints(
    detector: PoseDetector = Depends(get_pose_detector_dependency),
) -> CameraKeypointsResponse:
    if not detector.available:
        raise ServiceUnavailableError(detector.availability_detail)

    capture = open_camera_capture()
    try:
        ok, frame = capture.read()
    finally:
        capture.release()

    if not ok:
        raise ServiceUnavailableError("Failed to read frame from camera device.")

    return build_keypoints_response(detector, frame)


@router.post("/analyze-frame", response_model=CameraFrameAnalysisResponse)
def analyze_frame(
    payload: CameraFrameRequest,
    detector: PoseDetector = Depends(get_pose_detector_dependency),
    store: LiveSquatSessionStore = Depends(get_live_analysis_store_dependency),
) -> CameraFrameAnalysisResponse:
    if not detector.available:
        raise ServiceUnavailableError(detector.availability_detail)

    frame = decode_frame_data_url(payload.frame_data_url)
    pose_frame = detector.process_frame(frame)
    live_metrics = (
        store.update(payload.session_id, payload.view_mode, pose_frame.keypoints)
        if pose_frame.has_detection
        else None
    )

    return build_frame_analysis_payload(
        detector=detector,
        pose_frame=pose_frame,
        session_id=payload.session_id,
        view_mode=payload.view_mode,
        live_metrics=live_metrics,
    )
