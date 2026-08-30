"""add immutable evidence ledger and workflow events

Revision ID: 20260730_02
Revises: 20260730_01
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260730_02"
down_revision: str | Sequence[str] | None = "20260730_01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS screening_evidence (
            evidence_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            protocol_type TEXT NOT NULL,
            version INTEGER NOT NULL,
            supersedes_evidence_id TEXT,
            idempotency_key TEXT,
            result_snapshot TEXT NOT NULL,
            recorded_by TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(session_id, protocol_type, version),
            UNIQUE(session_id, idempotency_key),
            FOREIGN KEY(session_id) REFERENCES screening_sessions(session_id),
            FOREIGN KEY(supersedes_evidence_id) REFERENCES screening_evidence(evidence_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS evidence_review_events (
            review_event_id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL,
            decision TEXT NOT NULL,
            reviewed_by TEXT NOT NULL,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(evidence_id) REFERENCES screening_evidence(evidence_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS workflow_events (
            workflow_event_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            trigger TEXT NOT NULL,
            actor_id TEXT,
            evidence_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES screening_sessions(session_id),
            FOREIGN KEY(evidence_id) REFERENCES screening_evidence(evidence_id)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_screening_evidence_session_protocol "
        "ON screening_evidence(session_id, protocol_type, version DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_evidence_review_events_evidence "
        "ON evidence_review_events(evidence_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_workflow_events_session "
        "ON workflow_events(session_id, created_at ASC)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS workflow_events")
    op.execute("DROP TABLE IF EXISTS evidence_review_events")
    op.execute("DROP TABLE IF EXISTS screening_evidence")
