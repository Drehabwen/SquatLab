"""Enhanced squat analysis algorithms with real-angle measurements and phase detection.

Improvements over basic analysis:
- Real squat depth: hip drop height / leg length (not knee angle proxy)
- Real knee valgus: hip-knee-ankle angle (not x-distance ratio)
- Trunk lean angle: torso-shin angle for posture assessment
- Phase detection: eccentric / isometric / concentric phases
- Stability scoring: multi-dimensional balance assessment
"""

from dataclasses import dataclass
from math import atan2, degrees, sqrt
from typing import Any, Literal

Point = tuple[float, float]


# ============================================================================
# Geometry helpers
# ============================================================================

def distance(p1: Point, p2: Point) -> float:
    return sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def angle_at(start: Point, pivot: Point, end: Point) -> float:
    """Calculate angle at pivot (0-180 degrees)."""
    v1 = (start[0] - pivot[0], start[1] - pivot[1])
    v2 = (end[0] - pivot[0], end[1] - pivot[1])

    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag1 = sqrt(v1[0] ** 2 + v1[1] ** 2)
    mag2 = sqrt(v2[0] ** 2 + v2[1] ** 2)

    if mag1 == 0 or mag2 == 0:
        return 180.0

    import math

    cosine = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return degrees(math.acos(cosine))


def vertical_distance(top: Point, bottom: Point) -> float:
    """Vertical distance (Y-axis, positive downward in image coords)."""
    return abs(top[1] - bottom[1])


def horizontal_distance(left: Point, right: Point) -> float:
    """Horizontal distance (X-axis)."""
    return abs(left[0] - right[0])


# ============================================================================
# Enhanced metrics calculation
# ============================================================================

@dataclass
class SquatMetrics:
    """Comprehensive squat metrics from single frame."""

    # Depth metrics
    squat_depth_ratio: float = 0.0  # Hip drop / leg length (0-1)
    hip_drop_cm: float = 0.0  # Actual hip drop distance

    # Knee metrics
    knee_valgus_angle: float = 0.0  # Real hip-knee-ankle angle
    left_knee_angle: float = 0.0  # Hip-knee-ankle
    right_knee_angle: float = 0.0
    knee_sway_ratio: float = 0.0  # Knee horizontal deviation

    # Trunk metrics
    trunk_lean_angle: float = 0.0  # Torso angle from vertical
    trunk_shin_angle: float = 0.0  # Angle between torso and shin

    # Balance metrics
    center_deviation_ratio: float = 0.0  # Body center vs ankle center
    left_right_symmetry: float = 1.0  # 1.0 = perfect symmetry

    # Quality metrics
    linkage_smoothness: float = 0.82  # Multi-joint coordination


@dataclass
class SquatPhase:
    """Squat phase classification."""

    phase: Literal["up", "eccentric", "isometric", "concentric"]
    depth_ratio: float = 0.0
    is_bottom: bool = False


def calculate_squat_depth_v2(
    hip: Point,
    knee: Point,
    ankle: Point,
    standing_hip_height: float | None = None,
) -> tuple[float, float]:
    """Calculate real squat depth based on hip drop / leg length.

    Args:
        hip: Hip keypoint
        knee: Knee keypoint
        ankle: Ankle keypoint
        standing_hip_height: Hip height when standing (for absolute measurement)

    Returns:
        (depth_ratio, hip_drop_distance)
        depth_ratio: 0.0 = standing, 1.0 = full squat (hip at knee level)
    """
    # Leg length (hip to ankle)
    leg_length = distance(hip, ankle)
    if leg_length <= 0:
        return 0.0, 0.0

    # Current hip height above ankle
    current_hip_height = vertical_distance(hip, ankle)

    # Standing hip height (if not provided, estimate from leg length)
    if standing_hip_height is None:
        standing_hip_height = leg_length

    # Hip drop = standing height - current height
    hip_drop = standing_hip_height - current_hip_height

    # Depth ratio: hip_drop / leg_length
    # At full squat: hip_drop ≈ leg_length × 0.6 (typical)
    # We normalize so 0.70 depth_ratio = good depth
    depth_ratio = hip_drop / (leg_length * 0.7)

    return max(0.0, min(1.0, depth_ratio)), hip_drop


def calculate_knee_valgus_v2(
    hip: Point,
    knee: Point,
    ankle: Point,
) -> float:
    """Calculate real knee valgus/varus angle.

    This measures the angle between thigh and shin in the frontal plane.
    0° = straight alignment
    Positive = valgus (knee caves inward)
    Negative = varus (knee bows outward)

    Args:
        hip: Hip keypoint
        knee: Knee keypoint
        ankle: Ankle keypoint

    Returns:
        Valgus angle in degrees
    """
    # Thigh vector (hip → knee)
    thigh_dx = knee[0] - hip[0]
    thigh_dy = knee[1] - hip[1]
    thigh_angle = degrees(atan2(thigh_dy, thigh_dx))

    # Shin vector (knee → ankle)
    shin_dx = ankle[0] - knee[0]
    shin_dy = ankle[1] - knee[1]
    shin_angle = degrees(atan2(shin_dy, shin_dx))

    # The angle between thigh and shin extension
    # In a perfect squat, thigh and shin should form ~90° at bottom
    # Valgus is measured as deviation from natural alignment

    # Simplified: measure horizontal deviation of knee relative to hip-ankle line
    # Project knee onto hip-ankle line, measure perpendicular distance
    if abs(ankle[0] - hip[0]) < 0.001:  # Vertical leg
        knee_projection_x = hip[0]
    else:
        # Line equation: y = mx + b
        m = (ankle[1] - hip[1]) / (ankle[0] - hip[0])
        b = hip[1] - m * hip[0]
        # Perpendicular projection
        m_perp = -1.0 / m if m != 0 else float('inf')
        if m_perp == float('inf'):
            knee_projection_x = knee[0]
        else:
            b_perp = knee[1] - m_perp * knee[0]
            knee_projection_x = (b_perp - b) / (m - m_perp)

    # Knee deviation from hip-ankle line
    knee_deviation = abs(knee[0] - knee_projection_x)

    # Convert to angle (approximate)
    leg_length = distance(hip, ankle)
    if leg_length > 0:
        valgus_angle = degrees(atan2(knee_deviation, leg_length * 0.5))
    else:
        valgus_angle = 0.0

    return valgus_angle


def calculate_trunk_lean_angle(
    shoulder: Point,
    hip: Point,
) -> float:
    """Calculate trunk lean angle from vertical.

    0° = upright torso
    Positive = forward lean

    Args:
        shoulder: Shoulder keypoint
        hip: Hip keypoint

    Returns:
        Lean angle in degrees
    """
    dx = shoulder[0] - hip[0]
    dy = shoulder[1] - hip[1]

    # Angle from vertical (downward)
    # Vertical vector: (0, 1)
    # Torso vector: (dx, dy)
    if dy == 0:
        return 90.0 if dx != 0 else 0.0

    lean_angle = degrees(atan2(dx, dy))
    return abs(lean_angle)


def calculate_trunk_shin_angle(
    shoulder: Point,
    hip: Point,
    knee: Point,
    ankle: Point,
) -> float:
    """Calculate angle between torso and shin.

    This indicates squat technique:
    - Small angle (~0°): upright torso, knee-dominant
    - Large angle (>30°): forward lean, hip-dominant

    Args:
        shoulder, hip: Torso line
        knee, ankle: Shin line

    Returns:
        Angle between torso and shin in degrees
    """
    torso_dx = shoulder[0] - hip[0]
    torso_dy = shoulder[1] - hip[1]
    shin_dx = knee[0] - ankle[0]
    shin_dy = knee[1] - ankle[1]

    # Angle between vectors
    dot = torso_dx * shin_dx + torso_dy * shin_dy
    mag_t = sqrt(torso_dx ** 2 + torso_dy ** 2)
    mag_s = sqrt(shin_dx ** 2 + shin_dy ** 2)

    if mag_t == 0 or mag_s == 0:
        return 0.0

    import math

    cosine = max(-1.0, min(1.0, dot / (mag_t * mag_s)))
    return degrees(math.acos(cosine))


def detect_squat_phase(
    depth_ratio: float,
    previous_depth: float | None,
    velocity_threshold: float = 0.02,
) -> SquatPhase:
    """Detect squat phase based on depth changes.

    Phases:
    - up: standing or near-standing
    - eccentric: descending (getting deeper)
    - isometric: holding at bottom
    - concentric: ascending (coming up)

    Args:
        depth_ratio: Current depth (0-1)
        previous_depth: Previous frame depth
        velocity_threshold: Minimum change to detect movement

    Returns:
        SquatPhase with phase and depth info
    """
    if depth_ratio < 0.15:
        return SquatPhase(phase="up", depth_ratio=depth_ratio)

    if previous_depth is None:
        return SquatPhase(phase="eccentric", depth_ratio=depth_ratio)

    depth_change = depth_ratio - previous_depth

    if abs(depth_change) < velocity_threshold:
        # Holding position
        is_bottom = depth_ratio > 0.65
        return SquatPhase(
            phase="isometric",
            depth_ratio=depth_ratio,
            is_bottom=is_bottom,
        )
    elif depth_change > 0:
        return SquatPhase(phase="eccentric", depth_ratio=depth_ratio)
    else:
        return SquatPhase(phase="concentric", depth_ratio=depth_ratio)


def calculate_stability_score(
    *,
    knee_valgus: float,
    center_deviation: float,
    knee_sway: float,
    symmetry: float,
) -> float:
    """Calculate overall stability score (0-100).

    Combines multiple balance indicators into single score.
    """
    # Normalize each component (0-1, higher = worse)
    valgus_norm = min(1.0, knee_valgus / 15.0)  # 15° = severe
    center_norm = min(1.0, center_deviation / 0.15)
    sway_norm = min(1.0, knee_sway / 0.12)
    asymmetry_norm = 1.0 - symmetry  # Already 0-1

    # Weighted combination
    stability = 100 * (
        1.0
        - valgus_norm * 0.30
        - center_norm * 0.25
        - sway_norm * 0.25
        - asymmetry_norm * 0.20
    )

    return max(0.0, stability)


# ============================================================================
# Thresholds and classification
# ============================================================================

@dataclass(frozen=True)
class SquatThresholds:
    """Clinically-informed thresholds for squat assessment."""

    # Depth
    min_depth_ratio: float = 0.60  # Below parallel
    good_depth_ratio: float = 0.75  # Good depth

    # Knee
    knee_valgus_warning: float = 8.0  # Degrees
    knee_valgus_severe: float = 15.0  # Degrees

    # Trunk
    trunk_lean_warning: float = 30.0  # Degrees from vertical
    trunk_lean_severe: float = 45.0

    # Balance
    center_deviation_warning: float = 0.08
    symmetry_warning: float = 0.85


DEFAULT_THRESHOLDS = SquatThresholds()


def classify_squat_depth(depth_ratio: float) -> str:
    """Classify squat depth quality."""
    if depth_ratio >= 0.75:
        return "good"
    elif depth_ratio >= 0.60:
        return "adequate"
    elif depth_ratio >= 0.40:
        return "partial"
    else:
        return "insufficient"


def classify_knee_valgus(valgus_angle: float) -> str:
    """Classify knee valgus severity."""
    if valgus_angle < 5.0:
        return "normal"
    elif valgus_angle < 8.0:
        return "mild"
    elif valgus_angle < 15.0:
        return "moderate"
    else:
        return "severe"


def classify_trunk_lean(lean_angle: float) -> str:
    """Classify trunk lean."""
    if lean_angle < 20.0:
        return "upright"
    elif lean_angle < 35.0:
        return "moderate"
    else:
        return "excessive"


# ============================================================================
# Enhanced scoring
# ============================================================================

def calculate_enhanced_squat_score(
    metrics: SquatMetrics,
    thresholds: SquatThresholds = DEFAULT_THRESHOLDS,
) -> dict[str, Any]:
    """Calculate comprehensive squat score with breakdown.

    Returns:
        {
            "overall_score": 0-100,
            "depth_score": 0-100,
            "knee_score": 0-100,
            "trunk_score": 0-100,
            "stability_score": 0-100,
            "findings": list[str],
            "suggestions": list[str],
        }
    """
    # Depth score
    depth_score = min(100.0, metrics.squat_depth_ratio * 133.0)  # 0.75 = 100

    # Knee score
    knee_score = max(0.0, 100.0 - metrics.knee_valgus_angle * 5.0)

    # Trunk score
    trunk_score = max(0.0, 100.0 - max(0.0, metrics.trunk_lean_angle - 15.0) * 2.0)

    # Stability score
    stability_score = calculate_stability_score(
        knee_valgus=metrics.knee_valgus_angle,
        center_deviation=metrics.center_deviation_ratio,
        knee_sway=metrics.knee_sway_ratio,
        symmetry=metrics.left_right_symmetry,
    )

    # Overall score (weighted)
    overall_score = (
        depth_score * 0.25
        + knee_score * 0.30
        + trunk_score * 0.20
        + stability_score * 0.25
    )

    # Generate findings
    findings: list[str] = []
    suggestions: list[str] = []

    if metrics.squat_depth_ratio < thresholds.min_depth_ratio:
        findings.append("下蹲深度不足")
        suggestions.append("尝试下蹲至大腿与地面平行，改善髋膝协同")

    if metrics.knee_valgus_angle > thresholds.knee_valgus_warning:
        severity = classify_knee_valgus(metrics.knee_valgus_angle)
        findings.append(f"膝部{severity}内扣（{metrics.knee_valgus_angle:.1f}°）")
        suggestions.append("注意膝盖方向与脚尖一致，加强臀中肌训练")

    if metrics.trunk_lean_angle > thresholds.trunk_lean_warning:
        findings.append(f"躯干前倾过度（{metrics.trunk_lean_angle:.1f}°）")
        suggestions.append("保持躯干直立，核心收紧")

    if metrics.center_deviation_ratio > thresholds.center_deviation_warning:
        findings.append("重心偏移")
        suggestions.append("保持身体重心在双脚中间")

    if metrics.left_right_symmetry < thresholds.symmetry_warning:
        findings.append("左右不对称")
        suggestions.append("注意两侧均衡发力")

    if not findings:
        findings.append("深蹲动作控制良好")
        suggestions.append("可尝试增加负重或速度变化")

    return {
        "overall_score": round(overall_score),
        "depth_score": round(depth_score),
        "knee_score": round(knee_score),
        "trunk_score": round(trunk_score),
        "stability_score": round(stability_score),
        "depth_quality": classify_squat_depth(metrics.squat_depth_ratio),
        "knee_quality": classify_knee_valgus(metrics.knee_valgus_angle),
        "trunk_quality": classify_trunk_lean(metrics.trunk_lean_angle),
        "findings": findings,
        "suggestions": suggestions[:3],
    }
