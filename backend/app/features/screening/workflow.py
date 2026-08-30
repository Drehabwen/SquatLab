from .schemas import ReportReadinessState, WorkflowStatus

LEGACY_STATUS_MAP: dict[str, WorkflowStatus] = {
    "in_progress": "pending_standard_screening",
    "completed": "archived",
    "pending_recapture": "pending_recapture",
    "pending_review": "pending_review",
    "pending_report": "pending_report",
    "archived": "archived",
}

READINESS_STATUS_MAP: dict[ReportReadinessState, WorkflowStatus] = {
    "missing_evidence": "pending_standard_screening",
    "recapture_required": "pending_recapture",
    "review_required": "pending_review",
    "conflict_detected": "pending_review",
    "ready": "pending_report",
}

ALLOWED_TRANSITIONS: dict[WorkflowStatus, set[WorkflowStatus]] = {
    "pending_initial_screening": {
        "initial_screening_in_progress",
        "pending_standard_screening",
        "pending_review",
    },
    "initial_screening_in_progress": {
        "pending_initial_screening",
        "pending_standard_screening",
        "pending_recapture",
        "pending_review",
        "pending_retest",
    },
    "pending_standard_screening": {
        "pending_recapture",
        "pending_review",
        "pending_report",
    },
    "pending_recapture": {
        "pending_standard_screening",
        "pending_review",
        "pending_report",
    },
    "pending_review": {
        "pending_standard_screening",
        "pending_recapture",
        "pending_report",
    },
    "pending_report": {
        "pending_standard_screening",
        "pending_recapture",
        "pending_review",
        "pending_retest",
        "archived",
    },
    "pending_retest": {
        "pending_initial_screening",
        "pending_standard_screening",
        "archived",
    },
    "archived": {"pending_retest"},
}


class ScreeningWorkflowMachine:
    def normalize(self, status: str) -> WorkflowStatus:
        if status in LEGACY_STATUS_MAP:
            return LEGACY_STATUS_MAP[status]
        return status  # type: ignore[return-value]

    def target_for_readiness(self, state: ReportReadinessState) -> WorkflowStatus:
        return READINESS_STATUS_MAP[state]

    def can_transition(self, current: str, target: WorkflowStatus) -> bool:
        normalized = self.normalize(current)
        return normalized == target or target in ALLOWED_TRANSITIONS[normalized]
