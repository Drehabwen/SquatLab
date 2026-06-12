from datetime import UTC, datetime
from typing import Any

from .normative import (
    classify_by_threshold,
    classify_severity,
    compute_psi,
    compute_z_score,
)
from .normative import (
    severity_label as _severity_label,
)
from .schemas import (
    CaptureQuality,
    CrossProtocolEvidence,
    IntegratedReportResponse,
    ProtocolResultResponse,
    ProtocolStatus,
    ProtocolType,
    build_report_id,
)

DISCLAIMER = "本报告用于姿态与动作风险筛查参考，不作为医学诊断依据。如筛查结果提示明显风险，建议由专业人员进一步评估。"


class ScreeningAnalysisService:
    def analyze_protocol(
        self,
        *,
        result_id: str,
        session_id: str,
        protocol: ProtocolType,
        capture_quality: CaptureQuality,
        metrics: dict[str, Any],
        subject_age: int | None = None,
        subject_sex: str = "unknown",
        now: datetime | None = None,
    ) -> ProtocolResultResponse:
        timestamp = now or datetime.now(UTC)
        findings, risk_flags, recommendations, enriched = self._derive_protocol_output(
            protocol=protocol,
            capture_quality=capture_quality,
            metrics=metrics,
            subject_age=subject_age,
            subject_sex=subject_sex,
        )
        needs_recapture = capture_quality == "poor"
        needs_review = (not needs_recapture) and self._needs_protocol_review(protocol, metrics, risk_flags)
        status: ProtocolStatus = (
            "needs_recapture"
            if needs_recapture
            else "needs_review"
            if needs_review
            else "analyzed"
        )

        severity_grades = enriched.get("severity_grades") if enriched else None
        psi_score = enriched.get("psi_score") if enriched else None

        return ProtocolResultResponse(
            result_id=result_id,
            session_id=session_id,
            protocol=protocol,
            status=status,
            capture_quality=capture_quality,
            metrics=metrics,
            findings=findings,
            risk_flags=risk_flags,
            recommendations=recommendations,
            needs_recapture=needs_recapture,
            needs_review=needs_review,
            severity_grades=severity_grades,
            psi_score=psi_score,
            created_at=timestamp,
            updated_at=timestamp,
        )

    def build_integrated_report(
        self,
        *,
        session_id: str,
        results: list[ProtocolResultResponse],
        now: datetime | None = None,
    ) -> IntegratedReportResponse:
        timestamp = now or datetime.now(UTC)
        if any(result.needs_recapture for result in results):
            return self._build_recapture_report(session_id=session_id, results=results, timestamp=timestamp)

        evidence = self._build_cross_protocol_evidence(results)
        adams_result = next((result for result in results if result.protocol == "adams_forward_bend"), None)
        adams_severity = str((adams_result.metrics if adams_result else {}).get("thoracic_asymmetry", "none"))

        # PSI from static posture (if available)
        static_result = next((r for r in results if r.protocol == "static_posture"), None)
        psi_score = static_result.psi_score if static_result else None
        low_psi = psi_score is not None and psi_score < 70

        if adams_severity in {"moderate", "marked"} or any(result.needs_review for result in results) or low_psi:
            overall_risk = "review_required"
            next_action = "manual_review"
        elif evidence:
            overall_risk = "attention"
            next_action = "retest_later"
        elif any(result.risk_flags for result in results):
            overall_risk = "attention"
            next_action = "retest_later"
        else:
            overall_risk = "low"
            next_action = "pass"

        consistency_level = "multi_protocol_consistent" if evidence else ("single_protocol" if any(result.risk_flags for result in results) else "none")
        main_patterns = [item.pattern for item in evidence] or self._single_protocol_patterns(results)
        summary = self._build_summary(overall_risk=overall_risk, evidence=evidence, results=results)
        recommendations = self._build_report_recommendations(overall_risk=overall_risk, next_action=next_action)

        severity_grades = static_result.severity_grades if static_result else None

        return IntegratedReportResponse(
            report_id=build_report_id(),
            session_id=session_id,
            title="姿态与动作联合筛查报告",
            overall_risk=overall_risk,
            consistency_level=consistency_level,
            main_patterns=main_patterns,
            cross_protocol_evidence=evidence,
            next_action=next_action,
            summary=summary,
            recommendations=recommendations,
            disclaimer=DISCLAIMER,
            created_at=timestamp,
            psi_score=psi_score,
            severity_grades=severity_grades,
        )

    def _derive_protocol_output(
        self,
        *,
        protocol: ProtocolType,
        capture_quality: CaptureQuality,
        metrics: dict[str, Any],
        subject_age: int | None = None,
        subject_sex: str = "unknown",
    ) -> tuple[list[str], list[str], list[str], dict[str, Any] | None]:
        if capture_quality == "poor":
            return (
                ["采集质量不足，当前结果不适合生成正式筛查解释"],
                ["capture_quality_poor"],
                ["建议按引导重新采集后再生成报告。"],
                None,
            )

        if protocol == "static_posture":
            return self._derive_static_posture(metrics, subject_age=subject_age, subject_sex=subject_sex)
        if protocol == "adams_forward_bend":
            return self._derive_adams(metrics)
        return self._derive_squat(metrics)

    def _derive_static_posture(
        self,
        metrics: dict[str, Any],
        *,
        subject_age: int | None = None,
        subject_sex: str = "unknown",
    ) -> tuple[list[str], list[str], list[str], dict[str, Any]]:
        findings: list[str] = []
        flags: list[str] = []
        direction = str(metrics.get("suspected_direction", "unclear"))
        dir_label = "右" if direction == "right" else "左" if direction == "left" else ""

        # Support both old and new metric field names
        shoulder = float(_coalesce(metrics, "shoulder_symmetry_ratio", "shoulder_height_diff_ratio") or 0)
        hip = float(_coalesce(metrics, "hip_symmetry_ratio", "pelvis_height_diff_ratio") or 0)
        trunk = float(_coalesce(metrics, "vertical_alignment_ratio", "trunk_lateral_shift_ratio") or 0)

        has_demographics = subject_age is not None and subject_sex in ("male", "female")

        # Compute severity for each axis
        axes: list[tuple[str, float, str, str]] = [
            ("shoulder", shoulder, "肩部", f"static_shoulder_asymmetry_{direction}"),
            ("hip", hip, "骨盆", f"static_pelvis_asymmetry_{direction}"),
            ("trunk", trunk, "躯干", f"static_trunk_asymmetry_{direction}"),
        ]

        severity_grades: dict[str, str] = {}
        z_scores: dict[str, float] = {}

        for axis, value, label, flag in axes:
            if has_demographics:
                z = compute_z_score(axis, value, age=subject_age, sex=subject_sex)
                severity = classify_severity(z)
            else:
                z = None
                severity = classify_by_threshold(axis, value)

            severity_grades[axis] = severity
            z_scores[axis] = z if z is not None else 0.0

            if severity != "none":
                sev_text = self._severity_label(severity)
                findings.append(f"{dir_label}{label}{sev_text}")
                flags.append(flag)

        # PSI score
        psi = compute_psi(
            shoulder_z=z_scores["shoulder"],
            hip_z=z_scores["hip"],
            trunk_z=z_scores["trunk"],
        )

        # Build recommendations based on PSI
        if psi >= 85:
            recs = ["建议按周期常规复查。"]
        elif psi >= 70:
            recs = ["建议结合前屈筛查和动态动作结果进行综合判断。"]
        else:
            recs = ["建议由专业人员进行详细的姿势评估。", "建议结合前屈筛查和动态动作结果进行综合判断。"]

        enriched = {
            "severity_grades": severity_grades,
            "psi_score": round(psi, 1),
            "z_scores": {k: round(v, 2) for k, v in z_scores.items()},
            "use_normative": has_demographics,
        }

        return (
            findings or ["静态体态未见明显不对称"],
            flags,
            recs,
            enriched,
        )

    def _severity_label(self, value: str) -> str:
        """Human-readable severity label for findings."""
        if value in ("none", "mild", "moderate", "severe"):
            return _severity_label(value)
        return {
            "mild": "轻度",
            "moderate": "较明显",
            "marked": "明显",
        }.get(value, "")

    def _derive_adams(self, metrics: dict[str, Any]) -> tuple[list[str], list[str], list[str], None]:
        if not bool(metrics.get("forward_bend_completed", True)):
            return (
                ["Adams 前屈动作未完整完成"],
                ["adams_incomplete"],
                ["建议重新采集并保持峰值前屈 2-3 秒。"],
                None,
            )

        findings: list[str] = []
        flags: list[str] = []
        side = str(metrics.get("suspected_side", "unclear"))
        side_label = "右侧" if side == "right" else "左侧" if side == "left" else ""

        thoracic = str(metrics.get("thoracic_asymmetry", "none"))
        lumbar = str(metrics.get("lumbar_asymmetry", "none"))
        if thoracic in {"mild", "moderate", "marked"}:
            findings.append(f"胸段{side_label}不对称{self._severity_label(thoracic)}")
            flags.append(f"adams_thoracic_asymmetry_{side}")
        if lumbar in {"mild", "moderate", "marked"}:
            findings.append(f"腰段{side_label}不对称{self._severity_label(lumbar)}")
            flags.append(f"adams_lumbar_asymmetry_{side}")

        return (
            findings or ["Adams 前屈未见明显背部左右不对称"],
            flags,
            ["建议由专业人员复核本次前屈筛查证据。"] if flags else ["建议按周期复查。"],
            None,
        )

    def _derive_squat(self, metrics: dict[str, Any]) -> tuple[list[str], list[str], list[str], None]:
        findings: list[str] = []
        flags: list[str] = []
        direction = str(metrics.get("dynamic_shift_direction", "unclear"))

        if float(metrics.get("center_deviation_ratio", 0) or 0) >= 0.06:
            findings.append(("右" if direction == "right" else "左" if direction == "left" else "") + "侧重心偏移")
            flags.append(f"dynamic_weight_shift_{direction}")
        if float(metrics.get("left_right_symmetry", 1) or 1) < 0.88:
            findings.append("左右发力与节奏不够对称")
            flags.append("dynamic_asymmetry")
        if float(metrics.get("knee_valgus_angle", 0) or 0) > 10:
            findings.append("膝部内扣趋势明显")
            flags.append("dynamic_knee_valgus")

        return (
            findings or ["深蹲动作控制整体稳定"],
            flags,
            ["建议结合静态体态结果观察是否存在同方向偏移。"] if flags else ["可按现有训练节奏继续观察。"],
            None,
        )

    def _needs_protocol_review(self, protocol: ProtocolType, metrics: dict[str, Any], risk_flags: list[str]) -> bool:
        if protocol != "adams_forward_bend":
            return False
        return str(metrics.get("thoracic_asymmetry", "none")) in {"moderate", "marked"} or len(risk_flags) >= 2

    def _build_recapture_report(
        self,
        *,
        session_id: str,
        results: list[ProtocolResultResponse],
        timestamp: datetime,
    ) -> IntegratedReportResponse:
        poor_protocols = [result.protocol for result in results if result.needs_recapture]
        return IntegratedReportResponse(
            report_id=build_report_id(),
            session_id=session_id,
            title="姿态与动作联合筛查报告",
            overall_risk="recapture_needed",
            consistency_level="none",
            main_patterns=["capture_quality_poor"],
            cross_protocol_evidence=[],
            next_action="recapture",
            summary=f"{'、'.join(poor_protocols)} 采集质量不足，建议重新采集后再生成正式筛查解释。",
            recommendations=["请按采集引导重新完成质量不足的项目。"],
            disclaimer=DISCLAIMER,
            created_at=timestamp,
        )

    def _build_cross_protocol_evidence(self, results: list[ProtocolResultResponse]) -> list[CrossProtocolEvidence]:
        right_evidence = self._collect_directional_evidence(results, "right")
        left_evidence = self._collect_directional_evidence(results, "left")
        evidence: list[CrossProtocolEvidence] = []
        if len(right_evidence) >= 2:
            evidence.append(CrossProtocolEvidence(
                pattern="trunk_asymmetry_right",
                protocols=[item[0] for item in right_evidence],
                direction="right",
                evidence=[item[1] for item in right_evidence],
                confidence="medium",
            ))
        if len(left_evidence) >= 2:
            evidence.append(CrossProtocolEvidence(
                pattern="trunk_asymmetry_left",
                protocols=[item[0] for item in left_evidence],
                direction="left",
                evidence=[item[1] for item in left_evidence],
                confidence="medium",
            ))
        return evidence

    def _collect_directional_evidence(
        self,
        results: list[ProtocolResultResponse],
        direction: str,
    ) -> list[tuple[ProtocolType, str]]:
        collected: list[tuple[ProtocolType, str]] = []
        for result in results:
            if any(flag.endswith(f"_{direction}") for flag in result.risk_flags):
                collected.append((result.protocol, result.findings[0]))
        return collected

    def _single_protocol_patterns(self, results: list[ProtocolResultResponse]) -> list[str]:
        patterns: list[str] = []
        for result in results:
            patterns.extend(result.risk_flags[:2])
        return patterns[:4]

    def _build_summary(
        self,
        *,
        overall_risk: str,
        evidence: list[CrossProtocolEvidence],
        results: list[ProtocolResultResponse],
    ) -> str:
        if overall_risk == "low":
            return "本次静态体态、Adams 前屈和深蹲动作结果未见明显一致性风险。"
        if evidence:
            first = evidence[0]
            return f"{'右侧' if first.direction == 'right' else '左侧'}相关不对称在多个筛查项目中均有体现，建议专业人员复核。"
        flagged = next((result for result in results if result.risk_flags), None)
        if flagged:
            return f"本次主要在 {flagged.protocol} 项目中观察到风险提示，建议后续复查观察。"
        return "本次筛查存在需要关注的项目，建议结合人工复核判断。"

    def _build_report_recommendations(self, *, overall_risk: str, next_action: str) -> list[str]:
        if next_action == "manual_review":
            return ["建议进行人工复核，确认本次筛查证据是否稳定。", "如复核仍提示明显风险，建议进一步专业评估。"]
        if next_action == "retest_later":
            return ["建议 4-8 周后复查，观察姿态和动作控制变化。"]
        if next_action == "pass":
            return ["建议按周期进行常规复查。"]
        return ["建议按系统提示处理本次筛查任务。"]

def _coalesce(metrics: dict[str, Any], *keys: str) -> Any | None:
    """Return the first key that exists in metrics, or None."""
    for key in keys:
        if key in metrics and metrics[key] is not None:
            return metrics[key]
    return None
