"""add evidence provenance and review state

Revision ID: 20260730_01
Revises: f96984a166a4
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_01"
down_revision: str | Sequence[str] | None = "f96984a166a4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("protocol_results") as batch_op:
        batch_op.add_column(
            sa.Column(
                "capture_method",
                sa.String(),
                nullable=False,
                server_default="phone_camera",
            )
        )
        batch_op.add_column(
            sa.Column(
                "observer_training_verified",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )
        batch_op.add_column(
            sa.Column("device_id", sa.String())
        )
        batch_op.add_column(
            sa.Column(
                "device_validation_recorded",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )
        batch_op.add_column(
            sa.Column("recorded_by", sa.String())
        )
        batch_op.add_column(
            sa.Column(
                "review_status",
                sa.String(),
                nullable=False,
                server_default="not_required",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("protocol_results") as batch_op:
        batch_op.drop_column("review_status")
        batch_op.drop_column("recorded_by")
        batch_op.drop_column("device_validation_recorded")
        batch_op.drop_column("device_id")
        batch_op.drop_column("observer_training_verified")
        batch_op.drop_column("capture_method")
