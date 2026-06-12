import logging
import shutil
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

from .pose_contract import MIN_KEYPOINT_VISIBILITY, POSE_CONNECTIONS

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent.parent.parent.parent.parent / "pose_landmarker.task"

try:
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    HAS_TASK_API = True
except ImportError:  # pragma: no cover - depends on local MediaPipe install
    python = None
    vision = None
    HAS_TASK_API = False


@dataclass
class KeypointData:
    name: str
    x: float
    y: float
    z: float
    visibility: float


@dataclass
class PoseFrame:
    keypoints: list[KeypointData] = field(default_factory=list)
    frame_width: int = 0
    frame_height: int = 0
    has_detection: bool = False


class PoseDetector:
    def __init__(
        self,
        model_path: Path | None,
        *,
        num_poses: int = 1,
        min_detection_confidence: float = 0.5,
        min_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ) -> None:
        self.backend = "mediapipe_tasks"
        self.model_path = model_path
        self._landmarker = None
        self._availability_detail = ""
        self._detection_lock = threading.Lock()
        self._last_timestamp_ms = 0
        self._num_poses = num_poses
        self._min_detection_confidence = min_detection_confidence
        self._min_presence_confidence = min_presence_confidence
        self._min_tracking_confidence = min_tracking_confidence

        self._initialize()

    @property
    def available(self) -> bool:
        return self._landmarker is not None

    @property
    def availability_detail(self) -> str:
        return self._availability_detail

    def process_frame(self, frame: np.ndarray, timestamp_ms: int | None = None) -> PoseFrame:
        if not self.available:
            raise RuntimeError(self.availability_detail)

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        with self._detection_lock:
            resolved_timestamp = self._next_timestamp(timestamp_ms)
            result = self._landmarker.detect_for_video(mp_image, resolved_timestamp)

        return self._build_pose_frame(
            result=result,
            frame_width=frame.shape[1],
            frame_height=frame.shape[0],
        )

    def close(self) -> None:
        if self._landmarker is not None:
            self._landmarker.close()
            self._landmarker = None
            logger.info("PoseDetector closed")

    def draw_keypoints(self, frame: np.ndarray, pose_frame: PoseFrame) -> np.ndarray:
        if not pose_frame.has_detection:
            return frame

        visible_keypoints = {
            keypoint.name: keypoint
            for keypoint in pose_frame.keypoints
            if keypoint.visibility >= MIN_KEYPOINT_VISIBILITY
        }

        for start_name, end_name in POSE_CONNECTIONS:
            start = visible_keypoints.get(start_name)
            end = visible_keypoints.get(end_name)
            if start is None or end is None:
                continue

            cv2.line(
                frame,
                self._to_frame_point(start, frame.shape[1], frame.shape[0]),
                self._to_frame_point(end, frame.shape[1], frame.shape[0]),
                (20, 184, 166),
                2,
                lineType=cv2.LINE_AA,
            )

        for keypoint in visible_keypoints.values():
            point = self._to_frame_point(keypoint, frame.shape[1], frame.shape[0])
            cv2.circle(frame, point, 5, (255, 255, 255), -1, lineType=cv2.LINE_AA)
            cv2.circle(frame, point, 3, (245, 158, 11), -1, lineType=cv2.LINE_AA)

        return frame

    def _initialize(self) -> None:
        if not HAS_TASK_API:
            self._availability_detail = "MediaPipe Tasks API is unavailable."
            logger.warning(self._availability_detail)
            return

        if self.model_path is None:
            self._availability_detail = "Pose model path is not configured."
            logger.warning(self._availability_detail)
            return

        if not self.model_path.exists():
            self._availability_detail = f"Pose model not found: {self.model_path}"
            logger.warning(self._availability_detail)
            return

        try:
            cached_model_path = self._prepare_model_asset(self.model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=str(cached_model_path)),
                running_mode=vision.RunningMode.VIDEO,
                num_poses=self._num_poses,
                min_pose_detection_confidence=self._min_detection_confidence,
                min_pose_presence_confidence=self._min_presence_confidence,
                min_tracking_confidence=self._min_tracking_confidence,
            )
            self._landmarker = vision.PoseLandmarker.create_from_options(options)
            self._availability_detail = "Pose detection ready."
            logger.info("PoseDetector initialized using %s", cached_model_path)
        except Exception as error:  # pragma: no cover - environment specific
            self._availability_detail = f"Pose detector unavailable: {error}"
            logger.warning(self._availability_detail)

    def _prepare_model_asset(self, model_path: Path) -> Path:
        cache_root = Path(tempfile.gettempdir()) / "qingyue-zhiheng-mediapipe"
        cache_root.mkdir(parents=True, exist_ok=True)
        cached_model_path = cache_root / model_path.name

        source_stat = model_path.stat()
        if not cached_model_path.exists():
            shutil.copyfile(model_path, cached_model_path)
            return cached_model_path

        cached_stat = cached_model_path.stat()
        if (
            cached_stat.st_size != source_stat.st_size
            or cached_stat.st_mtime_ns < source_stat.st_mtime_ns
        ):
            shutil.copyfile(model_path, cached_model_path)

        return cached_model_path

    def _next_timestamp(self, timestamp_ms: int | None) -> int:
        resolved = timestamp_ms or time.monotonic_ns() // 1_000_000
        if resolved <= self._last_timestamp_ms:
            resolved = self._last_timestamp_ms + 1
        self._last_timestamp_ms = resolved
        return resolved

    def _build_pose_frame(self, *, result, frame_width: int, frame_height: int) -> PoseFrame:
        pose_frame = PoseFrame(
            frame_width=frame_width,
            frame_height=frame_height,
            has_detection=False,
        )

        pose_landmarks = getattr(result, "pose_landmarks", None) or []
        if not pose_landmarks:
            return pose_frame

        primary_pose = pose_landmarks[0]
        pose_frame.has_detection = True

        for index, landmark in enumerate(primary_pose):
            pose_frame.keypoints.append(
                KeypointData(
                    name=vision.PoseLandmark(index).name.lower(),
                    x=float(landmark.x),
                    y=float(landmark.y),
                    z=float(landmark.z),
                    visibility=float(getattr(landmark, "visibility", 1.0)),
                )
            )

        return pose_frame

    @staticmethod
    def _to_frame_point(keypoint: KeypointData, frame_width: int, frame_height: int) -> tuple[int, int]:
        x = int(max(0.0, min(1.0, keypoint.x)) * frame_width)
        y = int(max(0.0, min(1.0, keypoint.y)) * frame_height)
        return (x, y)
