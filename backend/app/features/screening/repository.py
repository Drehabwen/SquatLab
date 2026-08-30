import json
from datetime import UTC, datetime

from app.core.errors import ConflictError, NotFoundError
from app.shared.db import DatabaseManager

from .readiness import ReportReadinessPolicy
from .schemas import (
    EvidenceRecordResponse,
    EvidenceReviewEventResponse,
    IntegratedReportResponse,
    ProtocolProgress,
    ProtocolResultResponse,
    ProtocolType,
    ScreeningSessionCreateResponse,
    ScreeningSessionDetailResponse,
    ScreeningSessionSummary,
    SubjectCreateRequest,
    SubjectResponse,
    WorkflowEventResponse,
    WorkflowStateResponse,
    WorkflowStatus,
    build_evidence_id,
    build_review_event_id,
    build_screening_session_id,
    build_workflow_event_id,
)
from .workflow import ScreeningWorkflowMachine

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
                    "pending_standard_screening",
                    json.dumps(unique_protocols, ensure_ascii=False),
                    created_at.isoformat(),
                ),
            )
            connection.execute(
                """
                INSERT INTO workflow_events (
                    workflow_event_id, session_id, from_status, to_status,
                    trigger, actor_id, evidence_id, created_at
                )
                VALUES (?, ?, NULL, ?, ?, NULL, NULL, ?)
                """,
                (
                    build_workflow_event_id(),
                    session_id,
                    "pending_standard_screening",
                    "session_created",
                    created_at.isoformat(),
                ),
            )

        return ScreeningSessionCreateResponse(
            session_id=session_id,
            subject_id=subject_id,
            status="pending_standard_screening",
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

    def save_protocol_result(
        self,
        result: ProtocolResultResponse,
        *,
        idempotency_key: str | None = None,
    ) -> ProtocolResultResponse:
        self._get_session_row(result.session_id)
        with self.db.connect() as connection:
            if idempotency_key:
                existing = connection.execute(
                    """
                    SELECT evidence_id, session_id, protocol_type, version,
                           supersedes_evidence_id, idempotency_key, result_snapshot,
                           recorded_by, created_at
                    FROM screening_evidence
                    WHERE session_id = ? AND idempotency_key = ?
                    """,
                    (result.session_id, idempotency_key),
                ).fetchone()
                if existing is not None:
                    record = self._evidence_record_from_row(existing, connection)
                    if record.protocol != result.protocol:
                        raise ConflictError(
                            "同一幂等键不能用于不同筛查协议。"
                        )
                    return record.result

            previous = connection.execute(
                """
                SELECT evidence_id, version
                FROM screening_evidence
                WHERE session_id = ? AND protocol_type = ?
                ORDER BY version DESC
                LIMIT 1
                """,
                (result.session_id, result.protocol),
            ).fetchone()
            version = (previous[1] + 1) if previous else 1
            evidence_id = build_evidence_id()
            versioned_result = result.model_copy(
                update={
                    "evidence_id": evidence_id,
                    "evidence_version": version,
                }
            )
            connection.execute(
                """
                INSERT INTO screening_evidence (
                    evidence_id, session_id, protocol_type, version,
                    supersedes_evidence_id, idempotency_key, result_snapshot,
                    recorded_by, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence_id,
                    result.session_id,
                    result.protocol,
                    version,
                    previous[0] if previous else None,
                    idempotency_key,
                    json.dumps(versioned_result.model_dump(mode="json"), ensure_ascii=False),
                    result.recorded_by,
                    result.created_at.isoformat(),
                ),
            )
            self._upsert_protocol_projection(connection, versioned_result)

        self._refresh_session_status(
            result.session_id,
            trigger="evidence_submitted",
            actor_id=result.recorded_by,
            evidence_id=evidence_id,
        )
        return versioned_result

    def list_protocol_results(self, session_id: str) -> list[ProtocolResultResponse]:
        with self.db.connect() as connection:
            projection_rows = connection.execute(
                """
                SELECT result_id, session_id, protocol_type, status, capture_quality,
                       metrics, findings, risk_flags, recommendations,
                       needs_recapture, needs_review, capture_method,
                       observer_training_verified, device_id,
                       device_validation_recorded, recorded_by, review_status,
                       created_at, updated_at
                FROM protocol_results
                WHERE session_id = ?
                ORDER BY created_at ASC
                """,
                (session_id,),
            ).fetchall()
            results = {
                result.protocol: result
                for result in (
                    self._protocol_result_from_row(row) for row in projection_rows
                )
            }
            evidence_rows = connection.execute(
                """
                SELECT e.evidence_id, e.session_id, e.protocol_type, e.version,
                       e.supersedes_evidence_id, e.idempotency_key,
                       e.result_snapshot, e.recorded_by, e.created_at
                FROM screening_evidence e
                WHERE e.session_id = ?
                  AND NOT EXISTS (
                      SELECT 1
                      FROM screening_evidence newer
                      WHERE newer.session_id = e.session_id
                        AND newer.protocol_type = e.protocol_type
                        AND newer.version > e.version
                  )
                ORDER BY e.created_at ASC
                """,
                (session_id,),
            ).fetchall()
            for row in evidence_rows:
                record = self._evidence_record_from_row(row, connection)
                results[record.protocol] = record.result
        return list(results.values())

    def list_evidence_records(
        self,
        session_id: str,
        *,
        latest_only: bool = False,
    ) -> list[EvidenceRecordResponse]:
        self._get_session_row(session_id)
        latest_clause = """
          AND NOT EXISTS (
              SELECT 1
              FROM screening_evidence newer
              WHERE newer.session_id = e.session_id
                AND newer.protocol_type = e.protocol_type
                AND newer.version > e.version
          )
        """ if latest_only else ""
        with self.db.connect() as connection:
            rows = connection.execute(
                f"""
                SELECT e.evidence_id, e.session_id, e.protocol_type, e.version,
                       e.supersedes_evidence_id, e.idempotency_key,
                       e.result_snapshot, e.recorded_by, e.created_at
                FROM screening_evidence e
                WHERE e.session_id = ?
                {latest_clause}
                ORDER BY e.protocol_type ASC, e.version ASC
                """,
                (session_id,),
            ).fetchall()
            return [
                self._evidence_record_from_row(row, connection)
                for row in rows
            ]

    def list_evidence_review_events(
        self,
        session_id: str,
        evidence_id: str,
    ) -> list[EvidenceReviewEventResponse]:
        self._get_session_row(session_id)
        with self.db.connect() as connection:
            evidence = connection.execute(
                """
                SELECT evidence_id
                FROM screening_evidence
                WHERE evidence_id = ? AND session_id = ?
                """,
                (evidence_id, session_id),
            ).fetchone()
            if evidence is None:
                raise NotFoundError(f"Evidence not found: {evidence_id}")
            rows = connection.execute(
                """
                SELECT review_event_id, evidence_id, decision,
                       reviewed_by, reason, created_at
                FROM evidence_review_events
                WHERE evidence_id = ?
                ORDER BY created_at ASC, rowid ASC
                """,
                (evidence_id,),
            ).fetchall()
        return [
            EvidenceReviewEventResponse(
                review_event_id=row[0],
                evidence_id=row[1],
                decision=row[2],
                reviewed_by=row[3],
                reason=row[4],
                created_at=datetime.fromisoformat(row[5]),
            )
            for row in rows
        ]

    def review_protocol_result(
        self,
        *,
        session_id: str,
        protocol: ProtocolType,
        decision: str,
        reviewed_by: str,
        reason: str = "",
    ) -> ProtocolResultResponse:
        self._get_session_row(session_id)
        evidence_id: str | None = None
        result: ProtocolResultResponse | None = None
        with self.db.connect() as connection:
            evidence = connection.execute(
                """
                SELECT evidence_id, session_id, protocol_type, version,
                       supersedes_evidence_id, idempotency_key, result_snapshot,
                       recorded_by, created_at
                FROM screening_evidence
                WHERE session_id = ? AND protocol_type = ?
                ORDER BY version DESC
                LIMIT 1
                """,
                (session_id, protocol),
            ).fetchone()
            if evidence is None:
                cursor = connection.execute(
                    """
                    UPDATE protocol_results
                    SET review_status = ?, recorded_by = ?, updated_at = ?
                    WHERE session_id = ? AND protocol_type = ?
                    """,
                    (
                        decision,
                        reviewed_by,
                        datetime.now(UTC).isoformat(),
                        session_id,
                        protocol,
                    ),
                )
                if cursor.rowcount == 0:
                    raise NotFoundError(
                        f"Protocol result not found: {session_id}/{protocol}"
                    )
            else:
                evidence_id = evidence[0]
                connection.execute(
                    """
                    INSERT INTO evidence_review_events (
                        review_event_id, evidence_id, decision,
                        reviewed_by, reason, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        build_review_event_id(),
                        evidence_id,
                        decision,
                        reviewed_by,
                        reason,
                        datetime.now(UTC).isoformat(),
                    ),
                )
                result = self._evidence_record_from_row(evidence, connection).result

        if result is None:
            result = next(
                item
                for item in self.list_protocol_results(session_id)
                if item.protocol == protocol
            )
        self._refresh_session_status(
            session_id,
            trigger=f"review_{decision}",
            actor_id=reviewed_by,
            evidence_id=evidence_id,
        )
        return result

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
                SET completed_at = ?
                WHERE session_id = ?
                """,
                (
                    report.created_at.isoformat(),
                    report.session_id,
                ),
            )
        self.transition_workflow(
            report.session_id,
            target="archived",
            trigger="formal_report_generated",
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

    def get_workflow_state(self, session_id: str) -> WorkflowStateResponse:
        row = self._get_session_row(session_id)
        readiness = ReportReadinessPolicy().evaluate(
            session_id=session_id,
            results=self.list_protocol_results(session_id),
        )
        return WorkflowStateResponse(
            session_id=session_id,
            status=ScreeningWorkflowMachine().normalize(row[2]),
            readiness=readiness,
            history=self.list_workflow_events(session_id),
        )

    def list_workflow_events(self, session_id: str) -> list[WorkflowEventResponse]:
        self._get_session_row(session_id)
        with self.db.connect() as connection:
            rows = connection.execute(
                """
                SELECT workflow_event_id, session_id, from_status, to_status,
                       trigger, actor_id, evidence_id, created_at
                FROM workflow_events
                WHERE session_id = ?
                ORDER BY created_at ASC, rowid ASC
                """,
                (session_id,),
            ).fetchall()
        return [
            WorkflowEventResponse(
                workflow_event_id=row[0],
                session_id=row[1],
                from_status=row[2],
                to_status=row[3],
                trigger=row[4],
                actor_id=row[5],
                evidence_id=row[6],
                created_at=datetime.fromisoformat(row[7]),
            )
            for row in rows
        ]

    def transition_workflow(
        self,
        session_id: str,
        *,
        target: WorkflowStatus,
        trigger: str,
        actor_id: str | None = None,
        evidence_id: str | None = None,
    ) -> None:
        machine = ScreeningWorkflowMachine()
        row = self._get_session_row(session_id)
        current_raw = row[2]
        current = machine.normalize(current_raw)
        if current == target:
            return
        if not machine.can_transition(current_raw, target):
            raise ConflictError(f"不允许的工作流转换：{current} → {target}")
        timestamp = datetime.now(UTC)
        with self.db.connect() as connection:
            connection.execute(
                "UPDATE screening_sessions SET status = ? WHERE session_id = ?",
                (target, session_id),
            )
            connection.execute(
                """
                INSERT INTO workflow_events (
                    workflow_event_id, session_id, from_status, to_status,
                    trigger, actor_id, evidence_id, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    build_workflow_event_id(),
                    session_id,
                    current,
                    target,
                    trigger,
                    actor_id,
                    evidence_id,
                    timestamp.isoformat(),
                ),
            )

    def _refresh_session_status(
        self,
        session_id: str,
        *,
        trigger: str,
        actor_id: str | None = None,
        evidence_id: str | None = None,
    ) -> None:
        readiness = ReportReadinessPolicy().evaluate(
            session_id=session_id,
            results=self.list_protocol_results(session_id),
        )
        target = ScreeningWorkflowMachine().target_for_readiness(readiness.state)
        self.transition_workflow(
            session_id,
            target=target,
            trigger=trigger,
            actor_id=actor_id,
            evidence_id=evidence_id,
        )

    def _upsert_protocol_projection(
        self,
        connection,
        result: ProtocolResultResponse,
    ) -> None:
        connection.execute(
            """
            INSERT INTO protocol_results (
                result_id, session_id, protocol_type, status, capture_quality,
                metrics, findings, risk_flags, recommendations,
                needs_recapture, needs_review, capture_method,
                observer_training_verified, device_id,
                device_validation_recorded, recorded_by, review_status,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id, protocol_type) DO UPDATE SET
                status = excluded.status,
                capture_quality = excluded.capture_quality,
                metrics = excluded.metrics,
                findings = excluded.findings,
                risk_flags = excluded.risk_flags,
                recommendations = excluded.recommendations,
                needs_recapture = excluded.needs_recapture,
                needs_review = excluded.needs_review,
                capture_method = excluded.capture_method,
                observer_training_verified = excluded.observer_training_verified,
                device_id = excluded.device_id,
                device_validation_recorded = excluded.device_validation_recorded,
                recorded_by = excluded.recorded_by,
                review_status = excluded.review_status,
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
                result.capture_method,
                int(result.observer_training_verified),
                result.device_id,
                int(result.device_validation_recorded),
                result.recorded_by,
                result.review_status,
                result.created_at.isoformat(),
                result.updated_at.isoformat(),
            ),
        )

    def _evidence_record_from_row(
        self,
        row,
        connection,
    ) -> EvidenceRecordResponse:
        result = ProtocolResultResponse.model_validate(json.loads(row[6]))
        review = connection.execute(
            """
            SELECT decision
            FROM evidence_review_events
            WHERE evidence_id = ?
            ORDER BY created_at DESC, rowid DESC
            LIMIT 1
            """,
            (row[0],),
        ).fetchone()
        if review is not None:
            result = result.model_copy(update={"review_status": review[0]})
        result = result.model_copy(
            update={"evidence_id": row[0], "evidence_version": row[3]}
        )
        return EvidenceRecordResponse(
            evidence_id=row[0],
            session_id=row[1],
            protocol=row[2],
            version=row[3],
            supersedes_evidence_id=row[4],
            idempotency_key=row[5],
            result=result,
            recorded_by=row[7],
            created_at=datetime.fromisoformat(row[8]),
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
            capture_method=row[11],
            observer_training_verified=bool(row[12]),
            device_id=row[13],
            device_validation_recorded=bool(row[14]),
            recorded_by=row[15],
            review_status=row[16],
            created_at=datetime.fromisoformat(row[17]),
            updated_at=datetime.fromisoformat(row[18]),
        )
