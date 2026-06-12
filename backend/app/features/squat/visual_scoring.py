from dataclasses import dataclass


@dataclass(frozen=True)
class VisualScoringThresholds:
    knee_sway_ratio: float = 0.08
    knee_valgus_angle: float = 10.0
    center_deviation_ratio: float = 0.10
    left_right_symmetry: float = 0.85
    linkage_smoothness: float = 0.70
    squat_depth_ratio: float = 0.70


@dataclass
class VisualScoringBreakdown:
    front_score: int
    side_score: int
    findings: list[str]
    suggestions: list[str]


DEFAULT_VISUAL_THRESHOLDS = VisualScoringThresholds()


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def calculate_front_view_score(
    knee_sway_ratio: float,
    knee_valgus_angle: float,
    center_deviation_ratio: float,
    left_right_symmetry: float,
) -> int:
    sway_score = clamp01(1 - knee_sway_ratio / 0.12)
    valgus_score = clamp01(1 - knee_valgus_angle / 20.0)
    center_score = clamp01(1 - center_deviation_ratio / 0.15)
    symmetry_score = clamp01(left_right_symmetry)

    score = 100 * (
        sway_score * 0.30
        + valgus_score * 0.25
        + center_score * 0.20
        + symmetry_score * 0.25
    )

    return round(score)


def calculate_side_view_score(
    linkage_smoothness: float,
    squat_depth_ratio: float,
) -> int:
    linkage_score = clamp01(linkage_smoothness)
    depth_score = clamp01(squat_depth_ratio)

    score = 100 * (
        linkage_score * 0.55
        + depth_score * 0.45
    )

    return round(score)


def build_findings(
    *,
    knee_sway_ratio: float,
    knee_valgus_angle: float,
    center_deviation_ratio: float,
    left_right_symmetry: float,
    linkage_smoothness: float,
    squat_depth_ratio: float,
    thresholds: VisualScoringThresholds = DEFAULT_VISUAL_THRESHOLDS,
) -> list[str]:
    findings: list[str] = []

    if knee_sway_ratio > thresholds.knee_sway_ratio:
        findings.append("膝部左右晃动较明显")

    if knee_valgus_angle > thresholds.knee_valgus_angle:
        findings.append("膝部内扣趋势明显")

    if center_deviation_ratio > thresholds.center_deviation_ratio:
        findings.append("重心存在单侧偏移")

    if left_right_symmetry < thresholds.left_right_symmetry:
        findings.append("左右发力与节奏不够对称")

    if linkage_smoothness < thresholds.linkage_smoothness:
        findings.append("髋膝踝联动不够顺畅")

    if squat_depth_ratio < thresholds.squat_depth_ratio:
        findings.append("下蹲深度不足")

    return findings


def build_suggestions(
    *,
    knee_sway_ratio: float,
    knee_valgus_angle: float,
    center_deviation_ratio: float,
    left_right_symmetry: float,
    linkage_smoothness: float,
    squat_depth_ratio: float,
    thresholds: VisualScoringThresholds = DEFAULT_VISUAL_THRESHOLDS,
) -> list[str]:
    suggestions: list[str] = []

    if knee_sway_ratio > thresholds.knee_sway_ratio:
        suggestions.append("膝部左右晃动较明显，优先加强下肢稳定与节奏控制。")

    if knee_valgus_angle > thresholds.knee_valgus_angle:
        suggestions.append("存在膝内扣趋势，注意膝盖方向与脚尖方向保持一致。")

    if center_deviation_ratio > thresholds.center_deviation_ratio:
        suggestions.append("重心存在单侧偏移，注意下蹲和起身过程保持身体居中。")

    if left_right_symmetry < thresholds.left_right_symmetry:
        suggestions.append("左右发力不够对称，建议增加单侧控制训练。")

    if linkage_smoothness < thresholds.linkage_smoothness:
        suggestions.append("髋膝踝联动不够顺畅，建议先放慢节奏巩固动作模式。")

    if squat_depth_ratio < thresholds.squat_depth_ratio:
        suggestions.append("下蹲深度不足，建议优先改善髋膝协同和踝活动度。")

    if not suggestions:
        suggestions.append("本次视觉评分显示动作整体稳定，可在下一阶段加入节奏控制或轻负重进阶。")

    return suggestions[:3]
