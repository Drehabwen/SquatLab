ASSESSMENT_PAYLOAD = {
    "squat_count": 6,
    "knee_sway_ratio": 0.08,
    "knee_valgus_angle": 9,
    "center_deviation_ratio": 0.06,
    "left_right_symmetry": 0.9,
    "linkage_smoothness": 0.82,
    "squat_depth_ratio": 0.78,
}


def create_assessment(client):
    return client.post("/api/v1/squat/assessments", json=ASSESSMENT_PAYLOAD)


def test_create_assessment_returns_visual_scoring_result(client):
    response = create_assessment(client)

    assert response.status_code == 201
    payload = response.json()
    assert payload["session_id"].startswith("squat-")
    assert payload["overall_score"] > 0
    assert isinstance(payload["findings"], list)
    assert isinstance(payload["suggestions"], list)


def test_list_sessions_returns_saved_assessment(client):
    create_response = create_assessment(client)
    session_id = create_response.json()["session_id"]

    response = client.get("/api/v1/squat/sessions")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["session_id"] == session_id
    assert payload[0]["squat_count"] == ASSESSMENT_PAYLOAD["squat_count"]


def test_report_preview_returns_saved_findings(client):
    create_response = create_assessment(client)
    session_id = create_response.json()["session_id"]

    response = client.post(
        "/api/v1/squat/reports/preview",
        json={"session_id": session_id},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["session_id"] == session_id
    assert payload["title"]
    assert isinstance(payload["findings"], list)
    assert isinstance(payload["recommendations"], list)


def test_report_preview_returns_404_for_unknown_session(client):
    response = client.post(
        "/api/v1/squat/reports/preview",
        json={"session_id": "squat-missing"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["type"] == "NotFoundError"
