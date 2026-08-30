def create_session(client):
    subject = client.post(
        "/api/v1/subjects",
        json={"display_name": "证据账本测试学生", "age": 12},
    ).json()
    response = client.post(
        "/api/v1/screening/sessions",
        json={
            "subject_id": subject["subject_id"],
            "protocols": ["static_posture", "adams_forward_bend"],
        },
    )
    assert response.status_code == 201
    return response.json()


def submit_static(
    client,
    session_id,
    *,
    idempotency_key,
    capture_quality="good",
    shoulder_ratio=0,
):
    return client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/static_posture/analyze",
        json={
            "capture_quality": capture_quality,
            "capture_method": "phone_camera",
            "recorded_by": "operator-01",
            "idempotency_key": idempotency_key,
            "metrics": {
                "shoulder_height_diff_ratio": shoulder_ratio,
                "pelvis_height_diff_ratio": 0,
                "trunk_lateral_shift_ratio": 0,
            },
        },
    )


def submit_adams(
    client,
    session_id,
    *,
    idempotency_key,
    thoracic="none",
):
    return client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/adams_forward_bend/analyze",
        json={
            "capture_quality": "good",
            "capture_method": "manual_observation",
            "observer_training_verified": True,
            "recorded_by": "trained-observer-01",
            "idempotency_key": idempotency_key,
            "metrics": {
                "forward_bend_completed": True,
                "thoracic_asymmetry": thoracic,
                "lumbar_asymmetry": "none",
                "suspected_side": "unclear",
            },
        },
    )


def test_evidence_ledger_versions_are_immutable_and_idempotent(client):
    session_id = create_session(client)["session_id"]

    first = submit_static(
        client,
        session_id,
        idempotency_key="static-submission-0001",
        shoulder_ratio=0.01,
    )
    assert first.status_code == 200
    assert first.json()["evidence_version"] == 1

    replay = submit_static(
        client,
        session_id,
        idempotency_key="static-submission-0001",
        shoulder_ratio=0.09,
    )
    assert replay.status_code == 200
    assert replay.json()["evidence_id"] == first.json()["evidence_id"]
    assert replay.json()["metrics"]["shoulder_height_diff_ratio"] == 0.01

    second = submit_static(
        client,
        session_id,
        idempotency_key="static-submission-0002",
        shoulder_ratio=0.02,
    )
    assert second.status_code == 200
    assert second.json()["evidence_version"] == 2

    ledger = client.get(
        f"/api/v1/screening/sessions/{session_id}/evidence"
    ).json()
    static_versions = [
        item for item in ledger if item["protocol"] == "static_posture"
    ]
    assert [item["version"] for item in static_versions] == [1, 2]
    assert static_versions[0]["result"]["metrics"]["shoulder_height_diff_ratio"] == 0.01
    assert static_versions[1]["supersedes_evidence_id"] == static_versions[0]["evidence_id"]

    latest = client.get(
        f"/api/v1/screening/sessions/{session_id}/evidence",
        params={"latest_only": True},
    ).json()
    assert len(latest) == 1
    assert latest[0]["version"] == 2


def test_review_is_an_append_only_event_and_updates_workflow(client):
    session_id = create_session(client)["session_id"]
    submit_static(
        client,
        session_id,
        idempotency_key="static-review-flow-0001",
    )
    adams = submit_adams(
        client,
        session_id,
        idempotency_key="adams-review-flow-0001",
        thoracic="moderate",
    )
    assert adams.status_code == 200
    evidence_id = adams.json()["evidence_id"]

    pending = client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()
    assert pending["status"] == "pending_review"
    assert pending["readiness"]["state"] == "review_required"

    review = client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/adams_forward_bend/review",
        json={
            "decision": "approved",
            "reviewed_by": "reviewer-01",
            "reason": "已核对人工观察记录与原始证据。",
        },
    )
    assert review.status_code == 200
    assert review.json()["review_status"] == "approved"

    events = client.get(
        f"/api/v1/screening/sessions/{session_id}/evidence/{evidence_id}/reviews"
    ).json()
    assert len(events) == 1
    assert events[0]["decision"] == "approved"
    assert events[0]["reason"] == "已核对人工观察记录与原始证据。"

    ready = client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()
    assert ready["status"] == "pending_report"
    assert ready["readiness"]["can_generate_formal_report"] is True


def test_workflow_tracks_recapture_recovery_and_report_archive(client):
    session_id = create_session(client)["session_id"]
    initial = client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()
    assert initial["status"] == "pending_standard_screening"
    assert initial["history"][0]["trigger"] == "session_created"

    poor = submit_static(
        client,
        session_id,
        idempotency_key="static-recapture-0001",
        capture_quality="poor",
    )
    assert poor.status_code == 200
    assert client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()["status"] == "pending_recapture"

    good = submit_static(
        client,
        session_id,
        idempotency_key="static-recapture-0002",
    )
    assert good.status_code == 200
    assert client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()["status"] == "pending_standard_screening"

    adams = submit_adams(
        client,
        session_id,
        idempotency_key="adams-ready-0001",
    )
    assert adams.status_code == 200
    assert client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()["status"] == "pending_report"

    report = client.post(
        f"/api/v1/screening/sessions/{session_id}/reports/integrated",
        json={},
    )
    assert report.status_code == 200
    archived = client.get(
        f"/api/v1/screening/sessions/{session_id}/workflow"
    ).json()
    assert archived["status"] == "archived"
    assert archived["history"][-1]["trigger"] == "formal_report_generated"
