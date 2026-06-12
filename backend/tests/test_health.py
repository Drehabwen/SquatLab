def test_health_endpoint_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "青跃智衡 API"
    assert payload["version"] == "2.0.0"


def test_ready_endpoint_returns_ok(client):
    response = client.get("/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "青跃智衡 API"
    assert payload["version"] == "2.0.0"
