"""initial_schema

Revision ID: f96984a166a4
Revises:
Create Date: 2026-05-12 15:05:59.418566

Creates the baseline database schema for 青跃智衡 v2.0
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f96984a166a4"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS squat_sessions (
            session_id TEXT PRIMARY KEY,
            squat_count INTEGER NOT NULL,
            overall_score REAL NOT NULL,
            summary TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS squat_visual_assessments (
            session_id TEXT NOT NULL,
            front_score REAL NOT NULL,
            side_score REAL NOT NULL,
            findings TEXT NOT NULL,
            suggestions TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES squat_sessions(session_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS subjects (
            subject_id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            sex TEXT NOT NULL,
            age INTEGER,
            height_cm REAL,
            notes TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS screening_sessions (
            session_id TEXT PRIMARY KEY,
            subject_id TEXT NOT NULL,
            status TEXT NOT NULL,
            protocols TEXT NOT NULL,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            FOREIGN KEY(subject_id) REFERENCES subjects(subject_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS protocol_results (
            result_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            protocol_type TEXT NOT NULL,
            status TEXT NOT NULL,
            capture_quality TEXT NOT NULL,
            metrics TEXT NOT NULL,
            findings TEXT NOT NULL,
            risk_flags TEXT NOT NULL,
            recommendations TEXT NOT NULL,
            needs_recapture INTEGER NOT NULL,
            needs_review INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(session_id, protocol_type),
            FOREIGN KEY(session_id) REFERENCES screening_sessions(session_id)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS integrated_reports (
            report_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            overall_risk TEXT NOT NULL,
            consistency_level TEXT NOT NULL,
            main_patterns TEXT NOT NULL,
            cross_protocol_evidence TEXT NOT NULL,
            next_action TEXT NOT NULL,
            summary TEXT NOT NULL,
            recommendations TEXT NOT NULL,
            disclaimer TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(session_id) REFERENCES screening_sessions(session_id)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS integrated_reports")
    op.execute("DROP TABLE IF EXISTS protocol_results")
    op.execute("DROP TABLE IF EXISTS screening_sessions")
    op.execute("DROP TABLE IF EXISTS subjects")
    op.execute("DROP TABLE IF EXISTS squat_visual_assessments")
    op.execute("DROP TABLE IF EXISTS squat_sessions")
