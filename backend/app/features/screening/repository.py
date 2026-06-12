import json
from datetime import UTC, datetime

from app.core.errors import ConflictError, NotFoundError
from app.shared.db import DatabaseManager

from .schemas import (
    IntegratedReportResponse,
    ProtocolProgress,
    ProtocolResultResponse,
    ProtocolType,
    ScreeningSessionCreateResponse,
    ScreeningSessionDetailResponse,
    ScreeningSessionSummary,
    SubjectCreateRequest,
    SubjectResponse,
    build_screening_session_id,
    build_subject_id,
)

PROTOCOL_SEQUENCE: list[ProtocolType] = [
    "static_posture",
    "adams_forward_bend",
    "squat",
]


class ScreeningRepository:
    def __init__(self, db: DatabaseManager) -> None:
        self.db = db

    def _get_processed_protocols(self, session_id: str) -> set[ProtocolType]:
        results = self.list_protocol_results(session_id)
        return {r.protocol for r in results if r.status in ("analyzed", "needs_recapture", "needs_review")}

    def _enforce_protocol_sequence(self, session_id: str, protocol: ProtocolType) -> None:
        """Raise ConflictError if any prior protocol in the sequence is not yet analyzed."""
        try:
            target_idx = PROTOCOL_SEQUENCE.index(protocol)
        except ValueError:
            return

        analyzed = self._get_processed_protocols(session_id)
        for idx in range(target_idx):
            prerequisite = PROTOCOL_SEQUENCE[idx]
            if prerequisite not in analyzed:
                raise ConflictError(
                    f"必须先完成「{prerequisite}」才能进行「{protocol}」"
                )

    def _enforce_all_protocols_analyzed(self, session_id: str) -> None:
        """Raise ConflictError if not all protocols are analyzed."""
        analyzed = self._get_processed_protocols(session_id)
        missing = [p for p in PROTOCOL_SEQUENCE if p not in analyzed]
        if missing:
            raise ConflictError(
                f"所有协议完成后才能生成报告，尚未完成: {', '.join(missing)}"
            )

    def create_subject(self, payload: SubjectCreateRequest) -> SubjectResponse:
        import random
        
        created_at = datetime.now(UTC)
        subject_id = None
        ALLOWED_LETTERS = 'ABCDEFGHJKLMNPRTUVWXYZ'
        
        with self.db.connect() as connection:
            # Generate a unique 4-letter uppercase code
            for _ in range(100):
                candidate = ''.join(random.choice(ALLOWED_LETTERS) for _ in range(4))
                row = connection.execute(
                    "SELECT subject_id FROM subjects WHERE subject_id = ?",
                    (candidate,),
                ).fetchone()
                if row is None:
                    subject_id = candidate
                    break
            
            # Safe fallback if collisions are somehow exhausted
            if subject_id is None:
                subject_id = ''.join(random.choice(ALLOWED_LETTERS) for _ in range(4))

            subject = SubjectResponse(
                subject_id=subject_id,
                display_name=payload.display_name,
                sex=payload.sex,
                age=payload.age,
                height_cm=payload.height_cm,
                notes=payload.notes,
                created_at=created_at,
            )
            
            connection.execute(
                """
                INSERT INTO subjects (subject_id, display_name, sex, age, height_cm, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    subject.subject_id,
                    subject.display_name,
                    subject.sex,
                    subject.age,
                    subject.height_cm,
                    subject.notes,
                    subject.created_at.isoformat(),
                ),
            )
        return subject


    def list_subjects(self) -> list[SubjectResponse]:
        with self.db.connect() as connection:
            rows = connection.execute(
                """
                SELECT subject_id, display_name, sex, age, height_cm, notes, created_at
                FROM subjects
                ORDER BY created_at DESC
                """,
            ).fetchall()
        return [
            SubjectResponse(
                subject_id=row[0],
                display_name=row[1],
                sex=row[2],
                age=row[3],
                height_cm=row[4],
                notes=row[5],
                created_at=datetime.fromisoformat(row[6]),
            )
            for row in rows
        ]

    def create_session(self, *, subject_id: str, protocols: list[ProtocolType]) -> ScreeningSessionCreateResponse:
        self._ensure_subject_exists(subject_id)
        created_at = datetime.now(UTC)
        session_id = build_screening_session_id()
        unique_protocols = list(dict.fromkeys(protocols))
        with self.db.connect() as connection:
            connection.execute(
                """
                INSERT INTO screening_sessions (session_id, subject_id, status, protocols, created_at, completed_at)
                VALUES (?, ?, ?, ?, ?, NULL)
                """,
                (
                    session_id,
                    subject_id,
                    "in_progress",
                    json.dumps(unique_protocols, ensure_ascii=False),
                    created_at.isoformat(),
                ),
            )

        return ScreeningSessionCreateResponse(
            session_id=session_id,
            subject_id=subject_id,
            status="in_progress",
            protocols=[ProtocolProgress(protocol=protocol, status="not_started") for protocol in unique_protocols],
            created_at=created_at,
        )

    def get_session_detail(self, session_id: str) -> ScreeningSessionDetailResponse:
        with self.db.connect() as connection:
            row = connection.execute(
                """
                SELECT ss.session_id, ss.subject_id, s.display_name, ss.status,
                       ir.overall_risk, ss.created_at, ss.completed_at
                FROM screening_sessions ss
                JOIN subjects s ON s.subject_id = ss.subject_id
                LEFT JOIN integrated_reports ir ON ir.session_id = ss.session_id
                WHERE ss.session_id = ?
                """,
                (session_id,),
            ).fetchone()
        if row is None:
            raise NotFoundError(f"Screening session not found: {session_id}")
        results = self.list_protocol_results(session_id)
        report = self.get_integrated_report_or_none(session_id)
        return ScreeningSessionDetailResponse(
            session_id=row[0],
            subject_id=row[1],
            subject_display_name=row[2],
            status=row[3],
            overall_risk=row[4],
            protocol_results=results,
            integrated_report=report,
            created_at=datetime.fromisoformat(row[5]),
            completed_at=datetime.fromisoformat(row[6]) if row[6] else None,
        )

    def list_sessions(self) -> list[ScreeningSessionSummary]:
        with self.db.connect() as connection:
            rows = connection.execute(
                """
                SELECT ss.session_id, ss.subject_id, s.display_name, ss.status,
                       ir.overall_risk, ir.next_action, ss.created_at, ss.completed_at
                FROM screening_sessions ss
                JOIN subjects s ON s.subject_id = ss.subject_id
                LEFT JOIN integrated_reports ir ON ir.session_id = ss.session_id
                ORDER BY ss.created_at DESC
                """
            ).fetchall()

        return [
            ScreeningSessionSummary(
                session_id=row[0],
                subject_id=row[1],
                subject_display_name=row[2],
                status=row[3],
                overall_risk=row[4],
                next_action=row[5],
                completed_protocols=[result.protocol for result in self.list_protocol_results(row[0])],
                created_at=datetime.fromisoformat(row[6]),
                completed_at=datetime.fromisoformat(row[7]) if row[7] else None,
            )
            for row in rows
        ]

    def save_protocol_result(self, result: ProtocolResultResponse) -> None:
        self._get_session_row(result.session_id)
        with self.db.connect() as connection:
            connection.execute(
                """
                INSERT INTO protocol_results (
                    result_id, session_id, protocol_type, status, capture_quality,
                    metrics, findings, risk_flags, recommendations,
                    needs_recapture, needs_review, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id, protocol_type) DO UPDATE SET
                    status = excluded.status,
                    capture_quality = excluded.capture_quality,
                    metrics = excluded.metrics,
                    findings = excluded.findings,
                    risk_flags = excluded.risk_flags,
                    recommendations = excluded.recommendations,
                    needs_recapture = excluded.needs_recapture,
                    needs_review = excluded.needs_review,
                    updated_at = excluded.updated_at
                """,
                (
                    result.result_id,
                    result.session_id,
                    result.protocol,
                    result.status,
                    result.capture_quality,
                    json.dumps(result.metrics, ensure_ascii=False),
                    json.dumps(result.findings, ensure_ascii=False),
                    json.dumps(result.risk_flags, ensure_ascii=False),
                    json.dumps(result.recommendations, ensure_ascii=False),
                    int(result.needs_recapture),
                    int(result.needs_review),
                    result.created_at.isoformat(),
                    result.updated_at.isoformat(),
                ),
            )
        self._refresh_session_status(result.session_id)

    def list_protocol_results(self, session_id: str) -> list[ProtocolResultResponse]:
        with self.db.connect() as connection:
            rows = connection.execute(
                """
                SELECT result_id, session_id, protocol_type, status, capture_quality,
                       metrics, findings, risk_flags, recommendations,
                       needs_recapture, needs_review, created_at, updated_at
                FROM protocol_results
                WHERE session_id = ?
                ORDER BY created_at ASC
                """,
                (session_id,),
            ).fetchall()
        return [self._protocol_result_from_row(row) for row in rows]

    def save_integrated_report(self, report: IntegratedReportResponse) -> None:
        with self.db.connect() as connection:
            connection.execute(
                """
                INSERT INTO integrated_reports (
                    report_id, session_id, title, overall_risk, consistency_level,
                    main_patterns, cross_protocol_evidence, next_action, summary,
                    recommendations, disclaimer, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    report_id = excluded.report_id,
                    title = excluded.title,
                    overall_risk = excluded.overall_risk,
                    consistency_level = excluded.consistency_level,
                    main_patterns = excluded.main_patterns,
                    cross_protocol_evidence = excluded.cross_protocol_evidence,
                    next_action = excluded.next_action,
                    summary = excluded.summary,
                    recommendations = excluded.recommendations,
                    disclaimer = excluded.disclaimer,
                    created_at = excluded.created_at
                """,
                (
                    report.report_id,
                    report.session_id,
                    report.title,
                    report.overall_risk,
                    report.consistency_level,
                    json.dumps(report.main_patterns, ensure_ascii=False),
                    json.dumps([item.model_dump() for item in report.cross_protocol_evidence], ensure_ascii=False),
                    report.next_action,
                    report.summary,
                    json.dumps(report.recommendations, ensure_ascii=False),
                    report.disclaimer,
                    report.created_at.isoformat(),
                ),
            )
            connection.execute(
                """
                UPDATE screening_sessions
                SET status = ?, completed_at = ?
                WHERE session_id = ?
                """,
                (
                    "pending_recapture" if report.overall_risk == "recapture_needed" else "pending_review" if report.overall_risk == "review_required" else "completed",
                    report.created_at.isoformat(),
                    report.session_id,
                ),
            )

    def get_integrated_report(self, session_id: str) -> IntegratedReportResponse:
        report = self.get_integrated_report_or_none(session_id)
        if report is None:
            raise NotFoundError(f"Integrated report not found: {session_id}")
        return report

    def get_integrated_report_or_none(self, session_id: str) -> IntegratedReportResponse | None:
        with self.db.connect() as connection:
            row = connection.execute(
                """
                SELECT report_id, session_id, title, overall_risk, consistency_level,
                       main_patterns, cross_protocol_evidence, next_action, summary,
                       recommendations, disclaimer, created_at
                FROM integrated_reports
                WHERE session_id = ?
                """,
                (session_id,),
            ).fetchone()
        if row is None:
            return None
        return IntegratedReportResponse(
            report_id=row[0],
            session_id=row[1],
            title=row[2],
            overall_risk=row[3],
            consistency_level=row[4],
            main_patterns=json.loads(row[5]),
            cross_protocol_evidence=json.loads(row[6]),
            next_action=row[7],
            summary=row[8],
            recommendations=json.loads(row[9]),
            disclaimer=row[10],
            created_at=datetime.fromisoformat(row[11]),
        )

    def _ensure_subject_exists(self, subject_id: str) -> None:
        with self.db.connect() as connection:
            row = connection.execute(
                "SELECT subject_id FROM subjects WHERE subject_id = ?",
                (subject_id,),
            ).fetchone()
        if row is None:
            raise NotFoundError(f"Subject not found: {subject_id}")

    def get_subject_for_session(self, session_id: str) -> SubjectResponse | None:
        """Return the subject associated with a session, or None."""
        with self.db.connect() as connection:
            row = connection.execute(
                """
                SELECT s.subject_id, s.display_name, s.sex, s.age, s.height_cm, s.notes, s.created_at
                FROM subjects s
                JOIN screening_sessions ss ON ss.subject_id = s.subject_id
                WHERE ss.session_id = ?
                """,
                (session_id,),
            ).fetchone()
        if row is None:
            return None
        return SubjectResponse(
            subject_id=row[0],
            display_name=row[1],
            sex=row[2],
            age=row[3],
            height_cm=row[4],
            notes=row[5],
            created_at=datetime.fromisoformat(row[6]),
        )

    def _get_session_row(self, session_id: str):
        with self.db.connect() as connection:
            row = connection.execute(
                """
                SELECT session_id, subject_id, status, protocols, created_at, completed_at
                FROM screening_sessions
                WHERE session_id = ?
                """,
                (session_id,),
            ).fetchone()
        if row is None:
            raise NotFoundError(f"Screening session not found: {session_id}")
        return row

    def _refresh_session_status(self, session_id: str) -> None:
        results = self.list_protocol_results(session_id)
        if any(result.needs_recapture for result in results):
            status = "pending_recapture"
        elif any(result.needs_review for result in results):
            status = "pending_review"
        else:
            status = "pending_report"
        with self.db.connect() as connection:
            connection.execute(
                "UPDATE screening_sessions SET status = ? WHERE session_id = ?",
                (status, session_id),
            )

    def _protocol_result_from_row(self, row) -> ProtocolResultResponse:
        return ProtocolResultResponse(
            result_id=row[0],
            session_id=row[1],
            protocol=row[2],
            status=row[3],
            capture_quality=row[4],
            metrics=json.loads(row[5]),
            findings=json.loads(row[6]),
            risk_flags=json.loads(row[7]),
            recommendations=json.loads(row[8]),
            needs_recapture=bool(row[9]),
            needs_review=bool(row[10]),
            created_at=datetime.fromisoformat(row[11]),
            updated_at=datetime.fromisoformat(row[12]),
        )
