from datetime import UTC, datetime

from app.core.errors import ConflictError

from .schemas import (
    EvidenceRequirement,
    OptionalEvidenceSummary,
    ProtocolResultResponse,
    ReportReadinessResponse,
)

POLICY_VERSION = "formal-report-readiness/1.0"


class ReportReadinessPolicy:
    """Authoritative formal-report gate.

    Gait silhouette and squat may enrich triage, but neither can replace usable
    static-posture evidence and a qualified manual/external-device Adams record.
    """

    def evaluate(
        self,
        *,
        session_id: str,
        results: list[ProtocolResultResponse],
        now: datetime | None = None,
    ) -> ReportReadinessResponse:
        by_protocol = {result.protocol: result for result in results}
        requirements = [
            self._static_requirement(by_protocol.get("static_posture")),
            self._adams_requirement(by_protocol.get("adams_forward_bend")),
        ]
        blockers = [item.reason for item in requirements if item.status != "usable"]

        conflict_reason = self._direction_conflict(
            by_protocol.get("static_posture"),
            by_protocol.get("adams_forward_bend"),
        )
        if conflict_reason:
            blockers.append(conflict_reason)

        if any(item.status == "recapture_required" for item in requirements):
            state = "recapture_required"
            workflow_status = "pending_recapture"
        elif conflict_reason or any(item.status == "conflict" for item in requirements):
            state = "conflict_detected"
            workflow_status = "pending_review"
        elif any(item.status == "review_required" for item in requirements):
            state = "review_required"
            workflow_status = "pending_review"
        elif any(item.status in {"missing", "unverified_source"} for item in requirements):
            state = "missing_evidence"
            workflow_status = "pending_standard_screening"
        else:
            state = "ready"
            workflow_status = "pending_report"

        squat = by_protocol.get("squat")
        optional_evidence = [
            OptionalEvidenceSummary(
                key="gait_silhouette",
                label="步态剪影",
                status="not_recorded",
                purpose="仅用于初筛分流与纵向比较，不参与正式报告门禁。",
            ),
            OptionalEvidenceSummary(
                key="squat",
                label="深蹲",
                status=(
                    "not_recorded"
                    if squat is None
                    else "unusable"
                    if squat.needs_recapture
                    else "available"
                ),
                purpose="可选动作证据；缺失或失败不阻断正式筛查报告。",
            ),
        ]

        return ReportReadinessResponse(
            session_id=session_id,
            state=state,
            workflow_status=workflow_status,
            can_generate_formal_report=state == "ready",
            requirements=requirements,
            optional_evidence=optional_evidence,
            blockers=blockers,
            policy_version=POLICY_VERSION,
            evaluated_at=now or datetime.now(UTC),
        )

    def enforce(
        self,
        *,
        session_id: str,
        results: list[ProtocolResultResponse],
    ) -> ReportReadinessResponse:
        readiness = self.evaluate(session_id=session_id, results=results)
        if not readiness.can_generate_formal_report:
            details = "；".join(readiness.blockers) or "正式报告条件尚未满足"
            raise ConflictError(f"正式报告门禁未通过：{details}")
        return readiness

    def _static_requirement(
        self,
        result: ProtocolResultResponse | None,
    ) -> EvidenceRequirement:
        return self._base_requirement(
            key="static_posture",
            label="静态体态",
            result=result,
        )

    def _adams_requirement(
        self,
        result: ProtocolResultResponse | None,
    ) -> EvidenceRequirement:
        base = self._base_requirement(
            key="adams_forward_bend",
            label="Adams 人工观察",
            result=result,
        )
        if base.status != "usable" or result is None:
            return base

        manual_is_qualified = (
            result.capture_method == "manual_observation"
            and result.observer_training_verified
        )
        device_is_qualified = (
            result.capture_method == "validated_external_device"
            and result.observer_training_verified
            and result.device_validation_recorded
            and bool(result.device_id)
        )
        if not (manual_is_qualified or device_is_qualified):
            base.status = "unverified_source"
            base.reason = (
                "Adams 必须由已确认培训资质的观察者人工记录；ATR 仅接受有来源的"
                "已验证外部设备记录，手机估算不能解锁正式报告。"
            )
        return base

    def _base_requirement(
        self,
        *,
        key: str,
        label: str,
        result: ProtocolResultResponse | None,
    ) -> EvidenceRequirement:
        if result is None:
            return EvidenceRequirement(
                key=key,
                label=label,
                status="missing",
                reason=f"缺少{label}证据。",
            )
        if result.needs_recapture or result.capture_quality == "poor":
            return EvidenceRequirement(
                key=key,
                label=label,
                status="recapture_required",
                reason=f"{label}采集质量不合格，需要重新采集。",
                result_id=result.result_id,
            )
        if result.review_status == "rejected":
            return EvidenceRequirement(
                key=key,
                label=label,
                status="review_required",
                reason=f"{label}复核未通过，需要修正或重新采集。",
                result_id=result.result_id,
            )
        if result.needs_review and result.review_status != "approved":
            return EvidenceRequirement(
                key=key,
                label=label,
                status="review_required",
                reason=f"{label}存在需人工复核的发现。",
                result_id=result.result_id,
            )
        return EvidenceRequirement(
            key=key,
            label=label,
            status="usable",
            reason=f"{label}证据可用于正式报告。",
            result_id=result.result_id,
        )

    def _direction_conflict(
        self,
        static: ProtocolResultResponse | None,
        adams: ProtocolResultResponse | None,
    ) -> str | None:
        if static is None or adams is None:
            return None
        static_direction = static.metrics.get("suspected_direction")
        adams_direction = adams.metrics.get("suspected_side")
        known = {"left", "right"}
        if static_direction in known and adams_direction in known and static_direction != adams_direction:
            return "静态体态与 Adams 的侧向记录冲突，需要人工复核。"
        return None
