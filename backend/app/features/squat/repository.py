import json
from datetime import UTC, datetime

from app.core.errors import NotFoundError
from app.shared.db import DatabaseManager

from .schemas import (
    ReportPreviewResponse,
    SessionSummary,
    SquatAssessmentRequest,
    SquatAssessmentResult,
)


class SquatRepository:
    def __init__(self, db: DatabaseManager) -> None:
        self.db = db

    def save_assessment(self, payload: SquatAssessmentRequest, result: SquatAssessmentResult) -> None:
        created_at = datetime.now(UTC).isoformat()

        with self.db.connect() as connection:
            connection.execute(
                """
                INSERT INTO squat_sessions (session_id, squat_count, overall_score, summary, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    result.session_id,
                    payload.squat_count,
                    result.overall_score,
                    result.summary,
                    created_at,
                ),
            )
            connection.execute(
                """
                INSERT INTO squat_visual_assessments (
                    session_id,
                    front_score,
                    side_score,
                    findings,
                    suggestions
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    result.session_id,
                    result.front_score,
                    result.side_score,
                    json.dumps(result.findings, ensure_ascii=False),
                    json.dumps(result.suggestions, ensure_ascii=False),
                ),
            )

    def list_sessions(self) -> list[SessionSummary]:
        with self.db.connect() as connection:
            rows = connection.execute(
                """
                SELECT session_id, squat_count, overall_score, summary, created_at
                FROM squat_sessions
                ORDER BY created_at DESC
                """
            ).fetchall()

        return [
            SessionSummary(
                session_id=row[0],
                squat_count=row[1],
                overall_score=row[2],
                summary=row[3],
                created_at=datetime.fromisoformat(row[4]),
            )
            for row in rows
        ]

    def build_report_preview(self, session_id: str) -> ReportPreviewResponse:
        with self.db.connect() as connection:
            visual_row = connection.execute(
                """
                SELECT s.session_id, s.summary, a.findings, a.suggestions
                FROM squat_sessions s
                JOIN squat_visual_assessments a ON a.session_id = s.session_id
                WHERE s.session_id = ?
                """,
                (session_id,),
            ).fetchone()

        if visual_row is None:
            raise NotFoundError(f"Session not found: {session_id}")

        return self._build_preview_response(
            session_id=visual_row[0],
            summary=visual_row[1],
            findings=json.loads(visual_row[2]),
            recommendations=json.loads(visual_row[3]),
        )

    def _build_preview_response(
        self,
        *,
        session_id: str,
        summary: str,
        findings: list[str],
        recommendations: list[str],
    ) -> ReportPreviewResponse:
        normalized_findings = findings or ["未观察到明显动作异常"]
        normalized_recommendations = recommendations or ["当前动作表现稳定，可继续保持现有训练节奏。"]

        return ReportPreviewResponse(
            session_id=session_id,
            title="深蹲视觉评分报告",
            summary=summary,
            findings=normalized_findings,
            recommendations=normalized_recommendations,
        )
