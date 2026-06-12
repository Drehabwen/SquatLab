from dataclasses import dataclass

from .schemas import SquatAssessmentRequest, SquatAssessmentResult
from .visual_scoring import (
    build_findings,
    build_suggestions,
    calculate_front_view_score,
    calculate_side_view_score,
)


@dataclass
class ScoringBreakdown:
    front_score: int
    side_score: int
    findings: list[str]
    suggestions: list[str]


class SquatAssessmentService:
    def score(self, payload: SquatAssessmentRequest, session_id: str) -> SquatAssessmentResult:
        breakdown = self._build_breakdown(payload)
        overall_score = round(
            breakdown.front_score * 0.50
            + breakdown.side_score * 0.50
        )
        summary = self._build_summary(
            findings=breakdown.findings,
            overall_score=overall_score,
            front_score=breakdown.front_score,
            side_score=breakdown.side_score,
        )

        return SquatAssessmentResult(
            session_id=session_id,
            overall_score=overall_score,
            front_score=breakdown.front_score,
            side_score=breakdown.side_score,
            findings=breakdown.findings,
            summary=summary,
            suggestions=breakdown.suggestions,
        )

    def _build_breakdown(self, payload: SquatAssessmentRequest) -> ScoringBreakdown:
        front_score = calculate_front_view_score(
            knee_sway_ratio=payload.knee_sway_ratio,
            knee_valgus_angle=payload.knee_valgus_angle,
            center_deviation_ratio=payload.center_deviation_ratio,
            left_right_symmetry=payload.left_right_symmetry,
        )
        side_score = calculate_side_view_score(
            linkage_smoothness=payload.linkage_smoothness,
            squat_depth_ratio=payload.squat_depth_ratio,
        )
        findings = build_findings(
            knee_sway_ratio=payload.knee_sway_ratio,
            knee_valgus_angle=payload.knee_valgus_angle,
            center_deviation_ratio=payload.center_deviation_ratio,
            left_right_symmetry=payload.left_right_symmetry,
            linkage_smoothness=payload.linkage_smoothness,
            squat_depth_ratio=payload.squat_depth_ratio,
        )
        suggestions = build_suggestions(
            knee_sway_ratio=payload.knee_sway_ratio,
            knee_valgus_angle=payload.knee_valgus_angle,
            center_deviation_ratio=payload.center_deviation_ratio,
            left_right_symmetry=payload.left_right_symmetry,
            linkage_smoothness=payload.linkage_smoothness,
            squat_depth_ratio=payload.squat_depth_ratio,
        )

        return ScoringBreakdown(
            front_score=front_score,
            side_score=side_score,
            findings=findings,
            suggestions=suggestions,
        )

    def _build_summary(
        self,
        *,
        findings: list[str],
        overall_score: int,
        front_score: int,
        side_score: int,
    ) -> str:
        if not findings:
            return (
                f"本次深蹲视觉评分为 {overall_score} 分，"
                f"正面得分 {front_score}，侧面得分 {side_score}，整体动作控制稳定。"
            )

        top_findings = "、".join(findings[:3])
        return (
            f"本次深蹲视觉评分为 {overall_score} 分，"
            f"正面得分 {front_score}，侧面得分 {side_score}，"
            f"主要观察到：{top_findings}。"
        )
