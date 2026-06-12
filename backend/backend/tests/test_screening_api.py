def create_subject(client):
    response = client.post(
        "/api/v1/subjects",
        json={
            "display_name": "学生001",
            "sex": "female",
            "age": 12,
            "height_cm": 152,
            "notes": "",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_screening_session(client):
    subject = create_subject(client)
    response = client.post(
        "/api/v1/screening/sessions",
        json={
            "subject_id": subject["subject_id"],
            "protocols": ["static_posture", "adams_forward_bend", "squat"],
        },
    )
    assert response.status_code == 201
    return response.json()


def analyze_default_protocols(client, session_id: str):
    static_response = client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/static_posture/analyze",
        json={
            "capture_quality": "good",
            "metrics": {
                "shoulder_height_diff_ratio": 0.04,
                "pelvis_height_diff_ratio": 0.03,
                "trunk_lateral_shift_ratio": 0.05,
                "suspected_direction": "right",
            },
        },
    )
    assert static_response.status_code == 200

    adams_response = client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/adams_forward_bend/analyze",
        json={
            "capture_quality": "good",
            "metrics": {
                "forward_bend_completed": True,
                "stable_hold_seconds": 2.4,
                "thoracic_asymmetry": "moderate",
                "lumbar_asymmetry": "mild",
                "suspected_side": "right",
                "trunk_rotation_sign": True,
                "confidence": "medium",
            },
        },
    )
    assert adams_response.status_code == 200

    squat_response = client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/squat/analyze",
        json={
            "capture_quality": "acceptable",
            "metrics": {
                "squat_count": 6,
                "knee_sway_ratio": 0.08,
                "knee_valgus_angle": 9,
                "center_deviation_ratio": 0.06,
                "left_right_symmetry": 0.9,
                "linkage_smoothness": 0.82,
                "squat_depth_ratio": 0.78,
                "dynamic_shift_direction": "right",
            },
        },
    )
    assert squat_response.status_code == 200


def test_create_screening_session_returns_protocol_progress(client):
    session = create_screening_session(client)

    assert session["session_id"].startswith("screen-")
    assert session["status"] == "in_progress"
    assert [item["protocol"] for item in session["protocols"]] == [
        "static_posture",
        "adams_forward_bend",
        "squat",
    ]


def test_protocol_analysis_returns_structured_result(client):
    session = create_screening_session(client)
    session_id = session["session_id"]

    # 先完成前序协议
    client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/static_posture/analyze",
        json={
            "capture_quality": "good",
            "metrics": {"shoulder_height_diff_ratio": 0.02, "pelvis_height_diff_ratio": 0.01},
        },
    )
    response = client.post(
        f"/api/v1/screening/sessions/{session_id}/protocols/adams_forward_bend/analyze",
        json={
            "capture_quality": "good",
            "metrics": {
                "forward_bend_completed": True,
                "thoracic_asymmetry": "moderate",
                "lumbar_asymmetry": "none",
                "suspected_side": "right",
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["protocol"] == "adams_forward_bend"
    assert payload["status"] == "needs_review"
    assert payload["needs_review"] is True
    assert payload["risk_flags"]


def test_integrated_report_detects_multi_protocol_consistency(client):
    session = create_screening_session(client)
    session_id = session["session_id"]
    analyze_default_protocols(client, session_id)

    response = client.post(f"/api/v1/screening/sessions/{session_id}/reports/integrated", json={})

    assert response.status_code == 200
    payload = response.json()
    assert payload["overall_risk"] == "review_required"
    assert payload["next_action"] == "manual_review"
    assert payload["consistency_level"] == "multi_protocol_consistent"
    assert payload["cross_protocol_evidence"]


def test_poor_capture_quality_routes_to_recapture(client):
    session = create_screening_session(client)
    session_id = session["session_id"]

    # 三项协议都分析完（静态姿势为 poor 质量）
    for protocol in ("static_posture", "adams_forward_bend", "squat"):
        response = client.post(
            f"/api/v1/screening/sessions/{session_id}/protocols/{protocol}/analyze",
            json={"capture_quality": "poor", "metrics": {}},
        )
        assert response.status_code == 200, f"{protocol} analyze failed: {response.status_code}"

    report_response = client.post(f"/api/v1/screening/sessions/{session_id}/reports/integrated", json={})

    assert report_response.status_code == 200
    report = report_response.json()
    assert report["overall_risk"] == "recapture_needed"
    assert report["next_action"] == "recapture"


def test_list_screening_sessions_includes_report_summary(client):
    session = create_screening_session(client)
    session_id = session["session_id"]
    analyze_default_protocols(client, session_id)
    client.post(f"/api/v1/screening/sessions/{session_id}/reports/integrated", json={})

    response = client.get("/api/v1/screening/sessions")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["session_id"] == session_id
    assert payload[0]["overall_risk"] == "review_required"
    assert payload[0]["completed_protocols"] == [
        "static_posture",
        "adams_forward_bend",
        "squat",
    ]
