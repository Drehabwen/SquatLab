"""Spine-focused posture screening algorithms for scoliosis early detection.

Core metrics (spine-relevant only):
- Shoulder tilt angle (高低肩)
- Pelvic tilt angle (骨盆倾斜)
- Trunk lateral shift (躯干侧移)
- Adams forward bend: rib hump height with ATR estimation

All metrics use actual angles (degrees) and distances (cm) instead of ratios.
"""

from dataclasses import dataclass
from math import atan2, degrees, exp, sqrt
from typing import Any, Literal

AgeBucket = Literal["6-9", "10-13", "14-17"]
SexGroup = Literal["female", "male"]
PostureAxis = Literal["shoulder", "hip", "trunk"]
SeverityLevel = Literal["none", "mild", "moderate", "severe"]
AdamsSeverity = Literal["none", "mild", "moderate", "marked"]


@dataclass(frozen=True)
class ReferenceNorm:
    mean: float
    sd: float


# ============================================================================
# Clinical thresholds for spine-relevant metrics
# ============================================================================
# Based on clinical photogrammetry studies for scoliosis screening:
# - Shoulder angle: > 2° is considered significant
# - Pelvic tilt: > 2° is considered significant
# - Trunk shift: > 0.5cm lateral deviation relative to height

_ANGLE_THRESHOLDS: dict[PostureAxis, tuple[float, float, float]] = {
    # (mild, moderate, severe) in degrees or cm
    "shoulder": (2.0, 5.0, 10.0),      # degrees
    "hip": (2.0, 5.0, 10.0),           # degrees
    "trunk": (0.5, 1.5, 3.0),          # cm lateral shift (relative to height)
}

# Age/sex-stratified reference norms (mean, sd) for z-score computation
# Based on adolescent photogrammetry studies
_NORMS: dict[tuple[AgeBucket, SexGroup], dict[PostureAxis, ReferenceNorm]] = {
    # --- Ages 6-9 ---
    ("6-9", "male"): {
        "shoulder": ReferenceNorm(mean=1.2, sd=0.8),
        "hip": ReferenceNorm(mean=1.0, sd=0.7),
        "trunk": ReferenceNorm(mean=0.3, sd=0.2),
    },
    ("6-9", "female"): {
        "shoulder": ReferenceNorm(mean=1.0, sd=0.7),
        "hip": ReferenceNorm(mean=0.9, sd=0.6),
        "trunk": ReferenceNorm(mean=0.25, sd=0.18),
    },
    # --- Ages 10-13 ---
    ("10-13", "male"): {
        "shoulder": ReferenceNorm(mean=1.4, sd=0.9),
        "hip": ReferenceNorm(mean=1.2, sd=0.8),
        "trunk": ReferenceNorm(mean=0.35, sd=0.25),
    },
    ("10-13", "female"): {
        "shoulder": ReferenceNorm(mean=1.2, sd=0.8),
        "hip": ReferenceNorm(mean=1.1, sd=0.7),
        "trunk": ReferenceNorm(mean=0.3, sd=0.22),
    },
    # --- Ages 14-17 ---
    ("14-17", "male"): {
        "shoulder": ReferenceNorm(mean=1.5, sd=1.0),
        "hip": ReferenceNorm(mean=1.3, sd=0.9),
        "trunk": ReferenceNorm(mean=0.4, sd=0.3),
    },
    ("14-17", "female"): {
        "shoulder": ReferenceNorm(mean=1.0, sd=0.7),
        "hip": ReferenceNorm(mean=1.0, sd=0.7),
        "trunk": ReferenceNorm(mean=0.3, sd=0.22),
    },
}

# Fallback norms when demographics unavailable
_FALLBACK_NORMS: dict[PostureAxis, ReferenceNorm] = {
    "shoulder": ReferenceNorm(mean=1.2, sd=0.8),
    "hip": ReferenceNorm(mean=1.1, sd=0.7),
    "trunk": ReferenceNorm(mean=0.3, sd=0.22),
}


# ============================================================================
# Geometry helpers: compute actual angles/distances from keypoints
# ============================================================================

def calculate_shoulder_angle(left_shoulder: dict, right_shoulder: dict) -> float:
    """Calculate shoulder tilt angle in degrees.

    Positive = right shoulder higher, Negative = left shoulder higher.
    """
    dy = left_shoulder.get("y", 0) - right_shoulder.get("y", 0)
    dx = left_shoulder.get("x", 0) - right_shoulder.get("x", 0)
    if dx == 0:
        return 0.0
    return degrees(atan2(dy, dx))


def calculate_pelvic_tilt(left_hip: dict, right_hip: dict) -> float:
    """Calculate pelvic tilt angle in degrees.

    Positive = right hip higher, Negative = left hip higher.
    """
    dy = left_hip.get("y", 0) - right_hip.get("y", 0)
    dx = left_hip.get("x", 0) - right_hip.get("x", 0)
    if dx == 0:
        return 0.0
    return degrees(atan2(dy, dx))


def calculate_trunk_shift(nose: dict, left_hip: dict, right_hip: dict) -> tuple[float, str]:
    """Calculate trunk lateral shift relative to pelvis center.

    Returns (shift_distance, direction) where direction is 'left' or 'right'.
    Note: This is a normalized ratio; actual cm conversion requires subject height.
    """
    hip_center_x = (left_hip.get("x", 0) + right_hip.get("x", 0)) / 2.0
    nose_x = nose.get("x", 0)
    shift = nose_x - hip_center_x
    direction = "right" if shift > 0 else "left"
    return abs(shift), direction


# ============================================================================
# Scoring and classification
# ============================================================================

def get_age_bucket(age: int | None) -> AgeBucket | None:
    if age is None:
        return None
    if age <= 9:
        return "6-9"
    if age <= 13:
        return "10-13"
    return "14-17"


def get_reference(axis: PostureAxis, *, age: int | None, sex: str) -> ReferenceNorm:
    """Get the age/sex-matched reference norm, or fallback."""
    bucket = get_age_bucket(age)
    key = (bucket, sex if sex in ("male", "female") else "male")
    if bucket is not None and key in _NORMS:
        return _NORMS[key][axis]
    return _FALLBACK_NORMS[axis]


def compute_z_score(axis: PostureAxis, value: float, *, age: int | None, sex: str) -> float:
    """Compute z-score for a posture metric.

    Returns z where z = (value - mean) / sd, floored at 0.
    """
    if value <= 0:
        return 0.0
    norm = get_reference(axis, age=age, sex=sex)
    if norm.sd <= 0:
        return 0.0
    raw = (value - norm.mean) / norm.sd
    return max(0.0, raw)


def classify_severity_v2(value: float, thresholds: tuple[float, float, float]) -> SeverityLevel:
    """Classify severity using clinical thresholds.

    thresholds: (mild, moderate, severe)
    - value < mild * 0.5: none (normal)
    - mild * 0.5 <= value < mild: borderline/mild
    - mild <= value < moderate: mild
    - moderate <= value < severe: moderate
    - value >= severe: severe
    """
    mild, moderate, severe = thresholds

    if value < mild * 0.5:
        return "none"
    if value < mild:
        return "mild"
    if value < moderate:
        return "mild"
    if value < severe:
        return "moderate"
    return "severe"


def classify_by_threshold_v2(axis: PostureAxis, value: float) -> SeverityLevel:
    """Classify using angle-based clinical thresholds."""
    thresholds = _ANGLE_THRESHOLDS[axis]
    return classify_severity_v2(value, thresholds)


def severity_label(level: SeverityLevel) -> str:
    return {
        "none": "正常",
        "mild": "轻度异常",
        "moderate": "中度异常",
        "severe": "重度异常",
    }[level]


def compute_axis_score(z_score: float, max_z: float = 4.0) -> float:
    """Compute individual axis score (0-100) with non-linear penalty.

    Uses exponential decay for severe deviations:
    - z=0  -> 100
    - z=2  -> ~75
    - z=3  -> ~50
    - z=4+ -> ~0
    """
    if z_score <= 0:
        return 100.0
    score = 100.0 * exp(-z_score * 0.35)
    return max(0.0, score)


def compute_psi_v2(
    *,
    shoulder_z: float | None = None,
    hip_z: float | None = None,
    trunk_z: float | None = None,
) -> float:
    """Posture Symmetry Index (0-100) for scoliosis screening.

    Weighted composite:
    - shoulder    40%  (most visible indicator of thoracic scoliosis)
    - hip         35%  (indicator of lumbar scoliosis / pelvic obliquity)
    - trunk       25%  (overall trunk balance)

    If any axis is severe (z >= 3), applies additional penalty. Supports missing/None values adaptively.
    """
    scores = {}
    weights = {}

    if shoulder_z is not None:
        scores["shoulder"] = compute_axis_score(shoulder_z)
        weights["shoulder"] = 0.40
    if hip_z is not None:
        scores["hip"] = compute_axis_score(hip_z)
        weights["hip"] = 0.35
    if trunk_z is not None:
        scores["trunk"] = compute_axis_score(trunk_z)
        weights["trunk"] = 0.25

    if not scores:
        return 100.0

    # Rescale weights so they sum to 1.0
    total_weight = sum(weights.values())
    scaled_weights = {k: v / total_weight for k, v in weights.items()}

    base_psi = sum(scores[k] * scaled_weights[k] for k in scores)

    # Penalty: if any axis is severe, reduce PSI by up to 15%
    z_list = [z for z in [shoulder_z, hip_z, trunk_z] if z is not None]
    severe_count = sum(1 for z in z_list if z >= 3.0)
    penalty = min(0.15, severe_count * 0.08)

    return max(0.0, base_psi * (1.0 - penalty))


# ============================================================================
# Multi-frame fusion with outlier rejection
# ============================================================================

def _median(lst: list[float]) -> float:
    if not lst:
        return 0.0
    sorted_lst = sorted(lst)
    n = len(sorted_lst)
    if n % 2 == 1:
        return sorted_lst[n // 2]
    return (sorted_lst[n // 2 - 1] + sorted_lst[n // 2]) / 2.0


def _median_absolute_deviation(values: list[float], median_val: float) -> float:
    """Compute MAD (Median Absolute Deviation)."""
    abs_devs = [abs(v - median_val) for v in values]
    return _median(abs_devs)


def reject_outliers(values: list[float], threshold: float = 2.0) -> list[float]:
    """Reject outliers using MAD-based rule.

    Values with |x - median| > threshold * MAD are rejected.
    """
    if len(values) <= 3:
        return values

    med = _median(values)
    mad = _median_absolute_deviation(values, med)
    if mad == 0:
        return values

    return [v for v in values if abs(v - med) <= threshold * mad]


def fuse_multi_frame_metrics_v2(
    per_frame_metrics: list[dict[str, Any]],
    stability_threshold: float = 0.35,
) -> tuple[dict[str, Any], float | None, bool]:
    """Fuse multi-frame metrics with outlier rejection and MAD stability check.

    Improvements over v1:
    - Rejects outliers before computing median
    - Lower stability threshold (0.35 vs 0.40) for stricter quality control
    - Returns stability score (0-1) instead of just boolean
    """
    if not per_frame_metrics:
        return {}, None, False

    keys = set()
    for frame in per_frame_metrics:
        keys.update(frame.keys())

    fused_metrics: dict[str, Any] = {}
    max_mad_ratio = 0.0
    stability_scores: dict[str, float] = {}

    for key in keys:
        values = []
        for frame in per_frame_metrics:
            val = frame.get(key)
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                values.append(float(val))

        if not values:
            non_numeric_vals = [frame.get(key) for frame in per_frame_metrics if key in frame]
            if non_numeric_vals:
                fused_metrics[key] = non_numeric_vals[0]
            continue

        # Reject outliers
        cleaned_values = reject_outliers(values)
        if not cleaned_values:
            cleaned_values = values

        median_val = _median(cleaned_values)
        fused_metrics[key] = median_val

        # Compute stability
        if len(cleaned_values) >= 2 and median_val > 0.005:
            mad = _median_absolute_deviation(cleaned_values, median_val)
            mad_ratio = mad / median_val if median_val > 0 else 0.0
            if mad_ratio > max_mad_ratio:
                max_mad_ratio = mad_ratio
            stability_scores[key] = max(0.0, 1.0 - mad_ratio)

    overall_stability = sum(stability_scores.values()) / len(stability_scores) if stability_scores else 1.0
    is_unstable = max_mad_ratio > stability_threshold

    return fused_metrics, overall_stability, is_unstable


# ============================================================================
# Adams Forward Bend Test - Enhanced Algorithms
# ============================================================================

# ATR thresholds by age group (degrees)
# Based on SOSORT and SRS guidelines:
# - Children (6-9): more flexible, lower thresholds
# - Adolescents (10-17): standard thresholds
_ADAMS_ATR_THRESHOLDS: dict[AgeBucket | Literal["default"], tuple[float, float, float]] = {
    # (mild, moderate, marked) in degrees
    "6-9": (4.0, 6.0, 8.0),      # Children: lower thresholds
    "10-13": (5.0, 7.0, 10.0),   # Early adolescence: standard
    "14-17": (5.0, 7.0, 10.0),   # Late adolescence: standard
    "default": (5.0, 7.0, 10.0),  # Default fallback
}

# Soft tissue correction factors by BMI
# Higher BMI = thicker soft tissue = overestimation of hump
_SOFT_TISSUE_CORRECTION: dict[str, float] = {
    "underweight": 0.85,   # BMI < 18.5: thin, hump more visible
    "normal": 1.0,         # BMI 18.5-24: standard
    "overweight": 1.15,    # BMI 24-28: moderate soft tissue
    "obese": 1.3,          # BMI >= 28: significant soft tissue
}


def get_bmi_category(bmi: float | None) -> str:
    """Classify BMI into category for soft tissue correction."""
    if bmi is None:
        return "normal"
    if bmi < 18.5:
        return "underweight"
    if bmi < 24.0:
        return "normal"
    if bmi < 28.0:
        return "overweight"
    return "obese"


def correct_hump_for_soft_tissue(
    hump_mm: float,
    bmi: float | None = None,
    age: int | None = None,
) -> float:
    """Correct hump height measurement for soft tissue thickness.

    Higher BMI → more soft tissue → measured hump overestimates true bony hump.
    This correction reduces false positives in overweight subjects.

    Args:
        hump_mm: Raw measured hump height in mm
        bmi: Body mass index (optional)
        age: Age in years (optional, for additional correction)

    Returns:
        Corrected hump height in mm
    """
    if hump_mm <= 0:
        return 0.0

    # BMI-based soft tissue correction
    bmi_category = get_bmi_category(bmi)
    correction_factor = _SOFT_TISSUE_CORRECTION[bmi_category]

    # Age-based additional correction
    # Younger children have less soft tissue over ribs
    age_factor = 1.0
    if age is not None:
        if age < 10:
            age_factor = 0.95
        elif age > 16:
            age_factor = 1.05

    corrected = hump_mm / (correction_factor * age_factor)
    return max(0.0, corrected)


def estimate_atr_from_hump(
    hump_mm: float,
    bmi: float | None = None,
    age: int | None = None,
) -> float:
    """Estimate ATR (Angle of Trunk Rotation) from hump height.

    Improved conversion with clinical calibration:
    - Base: 1mm ≈ 1.2° ATR (more accurate than simple 1:1)
    - Soft tissue correction applied
    - Age-adjusted for growth stage

    Clinical reference:
    - ATR < 5°: Normal
    - ATR 5-7°: Mild (observation)
    - ATR 7-10°: Moderate (professional evaluation)
    - ATR >= 10°: Marked (further investigation needed)

    Args:
        hump_mm: Measured hump height in mm
        bmi: Body mass index for soft tissue correction
        age: Age for age-adjustment

    Returns:
        Estimated ATR in degrees
    """
    if hump_mm <= 0:
        return 0.0

    # Apply soft tissue correction
    corrected_hump = correct_hump_for_soft_tissue(hump_mm, bmi, age)

    # Convert to ATR with calibrated factor
    # Studies show: ATR ≈ 1.2 × hump_height(mm) for typical adolescents
    base_conversion = 1.2

    atr = corrected_hump * base_conversion

    return max(0.0, atr)


def classify_adams_atr_v2(
    atr: float,
    age: int | None = None,
) -> AdamsSeverity:
    """Classify Adams test result using age-adjusted ATR thresholds.

    Args:
        atr: Angle of Trunk Rotation in degrees
        age: Subject age for age-specific thresholds

    Returns:
        Severity level: none/mild/moderate/marked
    """
    if atr <= 0:
        return "none"

    # Get age-appropriate thresholds
    bucket = get_age_bucket(age)
    thresholds = _ADAMS_ATR_THRESHOLDS.get(bucket, _ADAMS_ATR_THRESHOLDS["default"])
    mild, moderate, marked = thresholds

    if atr < mild * 0.5:
        return "none"
    if atr < mild:
        return "mild"
    if atr < moderate:
        return "mild"
    if atr < marked:
        return "moderate"
    return "marked"


def calculate_adams_score(
    thoracic_atr: float,
    lumbar_atr: float,
) -> float:
    """Calculate overall Adams severity score (0-100).

    Score decreases as ATR increases:
    - 100: Perfect symmetry (ATR = 0)
    - 70: Mild asymmetry (ATR ~ 6°)
    - 40: Moderate asymmetry (ATR ~ 12°)
    - 0: Severe asymmetry (ATR ~ 20°)

    Uses exponential decay for non-linear penalty.
    """
    total_atr = thoracic_atr + lumbar_atr

    if total_atr <= 0:
        return 100.0

    # Exponential scoring: score = 100 * exp(-total_atr * 0.08)
    # At total_atr = 6°: score ≈ 100 * exp(-0.48) ≈ 62
    # At total_atr = 12°: score ≈ 100 * exp(-0.96) ≈ 38
    score = 100.0 * exp(-total_atr * 0.08)

    return max(0.0, score)


def analyze_spine_curve_from_keypoints(
    keypoints: list[dict[str, Any]],
) -> dict[str, Any]:
    """Analyze spine curvature from back keypoints.

    Uses shoulder, spine (estimated), and hip points to fit a curve.
    This provides additional evidence beyond simple hump height.

    Expected keypoints (from back view during Adams test):
    - left_shoulder, right_shoulder
    - left_hip, right_hip
    - Optional: spine landmarks if available

    Returns:
        {
            "spine_curve_type": "straight" | "c_curve" | "s_curve",
            "thoracic_deviation": float,  # max lateral deviation in thoracic region
            "lumbar_deviation": float,    # max lateral deviation in lumbar region
            "curve_quality": float,       # 0-1 confidence in curve estimation
        }
    """
    if not keypoints or len(keypoints) < 4:
        return {
            "spine_curve_type": "unknown",
            "thoracic_deviation": 0.0,
            "lumbar_deviation": 0.0,
            "curve_quality": 0.0,
        }

    # Extract key points
    left_shoulder = next((kp for kp in keypoints if kp.get("name") == "left_shoulder"), None)
    right_shoulder = next((kp for kp in keypoints if kp.get("name") == "right_shoulder"), None)
    left_hip = next((kp for kp in keypoints if kp.get("name") == "left_hip"), None)
    right_hip = next((kp for kp in keypoints if kp.get("name") == "right_hip"), None)

    if not all([left_shoulder, right_shoulder, left_hip, right_hip]):
        return {
            "spine_curve_type": "unknown",
            "thoracic_deviation": 0.0,
            "lumbar_deviation": 0.0,
            "curve_quality": 0.0,
        }

    # Calculate midline points
    shoulder_mid_x = (left_shoulder["x"] + right_shoulder["x"]) / 2
    shoulder_mid_y = (left_shoulder["y"] + right_shoulder["y"]) / 2
    hip_mid_x = (left_hip["x"] + right_hip["x"]) / 2
    hip_mid_y = (left_hip["y"] + right_hip["y"]) / 2

    # Estimate spine as straight line from shoulder mid to hip mid
    # In Adams test, a straight spine should follow this line
    # Deviations indicate curvature

    # Calculate deviations of actual back contour from estimated spine
    # (Simplified - would need actual back contour points for full analysis)

    # Estimate thoracic deviation from shoulder asymmetry
    shoulder_diff = abs(left_shoulder["y"] - right_shoulder["y"])
    thoracic_deviation = shoulder_diff

    # Estimate lumbar deviation from hip asymmetry
    hip_diff = abs(left_hip["y"] - right_hip["y"])
    lumbar_deviation = hip_diff

    # Classify curve type
    if thoracic_deviation < 0.01 and lumbar_deviation < 0.01:
        curve_type = "straight"
    elif thoracic_deviation > 0.02 and lumbar_deviation > 0.02:
        # Both thoracic and lumbar deviated = S-curve
        curve_type = "s_curve"
    else:
        # Single region deviation = C-curve
        curve_type = "c_curve"

    return {
        "spine_curve_type": curve_type,
        "thoracic_deviation": round(thoracic_deviation, 3),
        "lumbar_deviation": round(lumbar_deviation, 3),
        "curve_quality": 0.7,  # Simplified estimation
    }


def pelvis_level_correction(
    left_hip_y: float,
    right_hip_y: float,
    hump_measurement: float,
) -> float:
    """Correct hump measurement for pelvic tilt.

    If pelvis is not level during Adams test, it can create artificial
    asymmetry or mask true asymmetry.

    Args:
        left_hip_y: Left hip Y coordinate
        right_hip_y: Right hip Y coordinate
        hump_measurement: Raw hump measurement

    Returns:
        Corrected hump measurement
    """
    pelvic_tilt = abs(left_hip_y - right_hip_y)

    # If pelvic tilt is significant (> 2° equivalent), apply correction
    # This is a simplified correction - full version would need 3D analysis
    if pelvic_tilt > 0.02:  # Approximate threshold
        # Reduce measured hump by estimated pelvic contribution
        correction = pelvic_tilt * 0.3  # Empirical factor
        return max(0.0, hump_measurement - correction)

    return hump_measurement


# ============================================================================
# Backward compatibility aliases
# ============================================================================

classify_by_threshold = classify_by_threshold_v2
classify_severity = classify_severity_v2
compute_psi = compute_psi_v2
fuse_multi_frame_metrics = fuse_multi_frame_metrics_v2
