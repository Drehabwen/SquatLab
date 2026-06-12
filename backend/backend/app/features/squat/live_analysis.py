from dataclasses import dataclass
from threading import Lock
from time import monotonic_ns
from uuid import uuid4

from app.core.errors import NotFoundError
from app.features.squat.pose_contract import (
    MIN_KEYPOINT_VISIBILITY,
    REQUIRED_ANALYSIS_POINTS,
)
from app.features.squat.schemas import CameraViewMode, LiveSquatMetricsResponse

Point = tuple[float, float]
TRACKED_POINTS = REQUIRED_ANALYSIS_POINTS
VIEW_MODES: tuple[CameraViewMode, CameraViewMode] = ("front", "side")


@dataclass
class LiveAnalysisState:
    phase: str = "up"
    rep_count: int = 0
    smoothed_metrics: dict[str, float] | None = None
    previous_points: dict[str, Point] | None = None
    last_rep_timestamp_ms: int | None = None
    tempo_seconds: float | None = None


class LiveSquatSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, dict[CameraViewMode, LiveAnalysisState]] = {}
        self._lock = Lock()

    def create_session(self) -> str:
        session_id = f"live-{uuid4().hex[:12]}"
        with self._lock:
            self._sessions[session_id] = {
                view_mode: LiveAnalysisState()
                for view_mode in VIEW_MODES
            }
        return session_id

    def close_session(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def clear(self) -> None:
        with self._lock:
            self._sessions.clear()

    def update(
        self,
        session_id: str,
        view_mode: CameraViewMode,
        keypoints: list[object],
        *,
        now_ms: int | None = None,
    ) -> LiveSquatMetricsResponse | None:
        with self._lock:
            session_views = self._sessions.get(session_id)
            if session_views is None:
                raise NotFoundError(f"Live camera session not found: {session_id}")

            state = session_views[view_mode]
            return derive_live_metrics(
                keypoints=keypoints,
                state=state,
                now_ms=now_ms or monotonic_ns() // 1_000_000,
            )


def collect_missing_required_points(keypoints: list[object]) -> list[str]:
    visible_points = build_visible_point_map(keypoints)
    return [
        name for name in REQUIRED_ANALYSIS_POINTS
        if name not in visible_points
    ]


def derive_live_metrics(
    *,
    keypoints: list[object],
    state: LiveAnalysisState,
    now_ms: int,
) -> LiveSquatMetricsResponse | None:
    visible_points = build_visible_point_map(keypoints)
    if any(name not in visible_points for name in REQUIRED_ANALYSIS_POINTS):
        return None

    left_hip = visible_points["left_hip"]
    right_hip = visible_points["right_hip"]
    left_knee = visible_points["left_knee"]
    right_knee = visible_points["right_knee"]
    left_ankle = visible_points["left_ankle"]
    right_ankle = visible_points["right_ankle"]
    left_shoulder = visible_points.get("left_shoulder")
    right_shoulder = visible_points.get("right_shoulder")

    hip_width = distance(left_hip, right_hip)
    shoulder_width = distance(left_shoulder, right_shoulder) if left_shoulder and right_shoulder else 0.0
    width_scale = max(hip_width, shoulder_width, 0.12)

    left_knee_angle = angle_at(left_hip, left_knee, left_ankle)
    right_knee_angle = angle_at(right_hip, right_knee, right_ankle)
    mean_knee_angle = average([left_knee_angle, right_knee_angle])

    raw_depth = clamp01((175.0 - mean_knee_angle) / 95.0)
    raw_knee_sway_ratio = clamp01(
        average([
            abs(left_knee[0] - left_ankle[0]),
            abs(right_knee[0] - right_ankle[0]),
        ]) / (width_scale * 4.0)
    )
    raw_knee_valgus_angle = round_to_two_decimals(
        clamp01(
            max(
                abs(left_knee[0] - left_ankle[0]),
                abs(right_knee[0] - right_ankle[0]),
            ) / (width_scale * 0.6)
        ) * 30.0
    )

    shoulder_center = midpoint(left_shoulder, right_shoulder) if left_shoulder and right_shoulder else midpoint(left_hip, right_hip)
    hip_center = midpoint(left_hip, right_hip)
    ankle_center = midpoint(left_ankle, right_ankle)
    body_center = midpoint(shoulder_center, hip_center)
    raw_center_deviation_ratio = clamp01(abs(body_center[0] - ankle_center[0]) / (width_scale * 1.2))
    raw_left_right_symmetry = clamp01(1.0 - abs(left_knee_angle - right_knee_angle) / 60.0)

    tracked_points = {name: visible_points[name] for name in TRACKED_POINTS}
    raw_linkage_smoothness = calculate_linkage_smoothness(
        previous_points=state.previous_points,
        current_points=tracked_points,
        width_scale=width_scale,
    )

    next_metrics = {
        "knee_sway_ratio": raw_knee_sway_ratio,
        "knee_valgus_angle": raw_knee_valgus_angle,
        "center_deviation_ratio": raw_center_deviation_ratio,
        "left_right_symmetry": raw_left_right_symmetry,
        "linkage_smoothness": raw_linkage_smoothness,
        "squat_depth_ratio": raw_depth,
    }

    state.smoothed_metrics = (
        smooth_metric_set(state.smoothed_metrics, next_metrics)
        if state.smoothed_metrics
        else next_metrics
    )
    state.previous_points = tracked_points
    update_rep_state(state=state, depth_ratio=raw_depth, now_ms=now_ms)

    return LiveSquatMetricsResponse(
        squat_count=state.rep_count,
        knee_sway_ratio=state.smoothed_metrics["knee_sway_ratio"],
        knee_valgus_angle=state.smoothed_metrics["knee_valgus_angle"],
        center_deviation_ratio=state.smoothed_metrics["center_deviation_ratio"],
        left_right_symmetry=state.smoothed_metrics["left_right_symmetry"],
        linkage_smoothness=state.smoothed_metrics["linkage_smoothness"],
        squat_depth_ratio=state.smoothed_metrics["squat_depth_ratio"],
        tempo_seconds=state.tempo_seconds,
    )


def build_visible_point_map(keypoints: list[object]) -> dict[str, Point]:
    visible_points: dict[str, Point] = {}
    for keypoint in keypoints:
        visibility = float(getattr(keypoint, "visibility", 1.0))
        if visibility < MIN_KEYPOINT_VISIBILITY:
            continue

        visible_points[str(getattr(keypoint, "name"))] = (
            float(getattr(keypoint, "x")),
            float(getattr(keypoint, "y")),
        )

    return visible_points


def calculate_linkage_smoothness(
    *,
    previous_points: dict[str, Point] | None,
    current_points: dict[str, Point],
    width_scale: float,
) -> float:
    if not previous_points:
        return 0.82

    deltas = [
        distance(previous_points[name], current_points[name]) / width_scale
        for name in TRACKED_POINTS
    ]
    mean_delta = average(deltas)
    spread = average([abs(delta - mean_delta) for delta in deltas])
    return clamp01(1.0 - spread / 0.12)


def update_rep_state(*, state: LiveAnalysisState, depth_ratio: float, now_ms: int) -> None:
    if state.phase == "up" and depth_ratio >= 0.58:
        state.phase = "down"
        return

    if state.phase == "down" and depth_ratio <= 0.3:
        state.phase = "up"
        state.rep_count += 1

        if state.last_rep_timestamp_ms is not None:
            state.tempo_seconds = round_to_one_decimal((now_ms - state.last_rep_timestamp_ms) / 1000.0)

        state.last_rep_timestamp_ms = now_ms


def smooth_metric_set(previous: dict[str, float], current: dict[str, float]) -> dict[str, float]:
    return {
        key: smooth_value(previous[key], current[key])
        for key in current
    }


def smooth_value(previous: float, current: float, weight: float = 0.28) -> float:
    return previous * (1.0 - weight) + current * weight


def midpoint(first: Point, second: Point) -> Point:
    return (
        (first[0] + second[0]) / 2.0,
        (first[1] + second[1]) / 2.0,
    )


def angle_at(start: Point, pivot: Point, end: Point) -> float:
    start_vector = (start[0] - pivot[0], start[1] - pivot[1])
    end_vector = (end[0] - pivot[0], end[1] - pivot[1])
    dot = start_vector[0] * end_vector[0] + start_vector[1] * end_vector[1]
    magnitude = vector_magnitude(start_vector) * vector_magnitude(end_vector)
    if magnitude == 0:
        return 180.0

    cosine = max(-1.0, min(1.0, dot / magnitude))
    from math import acos, pi

    return acos(cosine) * (180.0 / pi)


def distance(first: Point | None, second: Point | None) -> float:
    if first is None or second is None:
        return 0.0
    return vector_magnitude((first[0] - second[0], first[1] - second[1]))


def vector_magnitude(vector: Point) -> float:
    from math import hypot

    return hypot(vector[0], vector[1])


def average(values: list[float]) -> float:
    return sum(values) / max(len(values), 1)


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def round_to_one_decimal(value: float) -> float:
    return round(value, 1)


def round_to_two_decimals(value: float) -> float:
    return round(value, 2)
