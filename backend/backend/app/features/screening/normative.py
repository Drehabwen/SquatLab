"""Age/sex-stratified reference data for adolescent posture screening.

Reference values compiled from photogrammetry-based posture studies in
adolescent populations (ages 6-17).  Values represent asymmetry ratios
where 0 = perfect symmetry and higher = more asymmetric.

When demographics are unavailable, fixed clinical thresholds are used as
fallback (shoulder 0.03, hip 0.03, trunk 0.04).
"""

from dataclasses import dataclass
from typing import Literal

AgeBucket = Literal["6-9", "10-13", "14-17"]
SexGroup = Literal["female", "male"]
PostureAxis = Literal["shoulder", "hip", "trunk"]
SeverityLevel = Literal["none", "mild", "moderate", "severe"]


@dataclass(frozen=True)
class ReferenceNorm:
    mean: float
    sd: float


# Reference means and SDs per (age_bucket, sex) for each posture axis.
# Higher ratio = more asymmetry, so z = max(0, (value - mean)) / sd.
#
# Clinical fallback thresholds (used when age/sex unknown):
#   shoulder >= 0.03, hip >= 0.03, trunk >= 0.04
_FALLBACK_THRESHOLDS: dict[PostureAxis, float] = {
    "shoulder": 0.030,
    "hip": 0.030,
    "trunk": 0.040,
}

_FALLBACK_MEAN_SD: dict[PostureAxis, tuple[float, float]] = {
    "shoulder": (0.010, 0.010),
    "hip": (0.010, 0.008),
    "trunk": (0.012, 0.010),
}

_NORMS: dict[tuple[AgeBucket, SexGroup], dict[PostureAxis, ReferenceNorm]] = {
    # --- Ages 6-9 ---
    ("6-9", "male"): {
        "shoulder": ReferenceNorm(mean=0.012, sd=0.008),
        "hip": ReferenceNorm(mean=0.010, sd=0.007),
        "trunk": ReferenceNorm(mean=0.012, sd=0.009),
    },
    ("6-9", "female"): {
        "shoulder": ReferenceNorm(mean=0.010, sd=0.007),
        "hip": ReferenceNorm(mean=0.009, sd=0.006),
        "trunk": ReferenceNorm(mean=0.011, sd=0.008),
    },
    # --- Ages 10-13 ---
    ("10-13", "male"): {
        "shoulder": ReferenceNorm(mean=0.014, sd=0.009),
        "hip": ReferenceNorm(mean=0.012, sd=0.008),
        "trunk": ReferenceNorm(mean=0.014, sd=0.010),
    },
    ("10-13", "female"): {
        "shoulder": ReferenceNorm(mean=0.012, sd=0.008),
        "hip": ReferenceNorm(mean=0.011, sd=0.007),
        "trunk": ReferenceNorm(mean=0.013, sd=0.009),
    },
    # --- Ages 14-17 ---
    ("14-17", "male"): {
        "shoulder": ReferenceNorm(mean=0.015, sd=0.010),
        "hip": ReferenceNorm(mean=0.013, sd=0.009),
        "trunk": ReferenceNorm(mean=0.016, sd=0.011),
    },
    ("14-17", "female"): {
        "shoulder": ReferenceNorm(mean=0.010, sd=0.007),
        "hip": ReferenceNorm(mean=0.010, sd=0.007),
        "trunk": ReferenceNorm(mean=0.012, sd=0.009),
    },
}


def get_age_bucket(age: int | None) -> AgeBucket | None:
    if age is None:
        return None
    if age <= 9:
        return "6-9"
    if age <= 13:
        return "10-13"
    return "14-17"


def get_reference(axis: PostureAxis, *, age: int | None, sex: str) -> ReferenceNorm:
    """Get the age/sex-matched reference norm, or fallback mean/SD."""
    bucket = get_age_bucket(age)
    key = (bucket, sex if sex in ("male", "female") else "male")
    if bucket is not None and key in _NORMS:
        return _NORMS[key][axis]
    mean, sd = _FALLBACK_MEAN_SD[axis]
    return ReferenceNorm(mean=mean, sd=sd)


def compute_z_score(axis: PostureAxis, value: float, *, age: int | None, sex: str) -> float:
    """Compute z-score for a posture metric.

    Returns z where z = (value - mean) / sd, floored at 0.
    Higher z means more asymmetric relative to the reference population.
    """
    if value <= 0:
        return 0.0
    norm = get_reference(axis, age=age, sex=sex)
    if norm.sd <= 0:
        return 0.0
    raw = (value - norm.mean) / norm.sd
    return max(0.0, raw)


def classify_severity(z_score: float) -> SeverityLevel:
    """Classify severity from z-score."""
    if z_score < 1.0:
        return "none"
    if z_score < 2.0:
        return "mild"
    if z_score < 3.0:
        return "moderate"
    return "severe"


def classify_by_threshold(axis: PostureAxis, value: float) -> SeverityLevel:
    """Fallback: classify using fixed clinical thresholds without z-score.

    Uses the original 0.03/0.03/0.04 thresholds but split into tiers:
    - none: below 60% of threshold
    - mild: 60-100% of threshold
    - moderate: 100-150% of threshold
    - severe: above 150% of threshold
    """
    threshold = _FALLBACK_THRESHOLDS[axis]
    if value <= 0:
        return "none"
    ratio = value / threshold if threshold > 0 else 0.0
    if ratio < 0.6:
        return "none"
    if ratio < 1.0:
        return "mild"
    if ratio < 1.5:
        return "moderate"
    return "severe"


def severity_label(level: SeverityLevel) -> str:
    return {
        "none": "正常",
        "mild": "轻度异常",
        "moderate": "中度异常",
        "severe": "重度异常",
    }[level]


def compute_psi(
    *,
    shoulder_z: float,
    hip_z: float,
    trunk_z: float,
) -> float:
    """Posture Symmetry Index (0-100).

    Weighted composite:
      - shoulder 40%
      - hip      35%
      - trunk    25%

    Each sub-score = max(0, 100 - z * 25), so z=4.0 floors the axis to 0.
    """
    shoulder_score = max(0.0, 100.0 - shoulder_z * 25.0)
    hip_score = max(0.0, 100.0 - hip_z * 25.0)
    trunk_score = max(0.0, 100.0 - trunk_z * 25.0)
    return shoulder_score * 0.40 + hip_score * 0.35 + trunk_score * 0.25
