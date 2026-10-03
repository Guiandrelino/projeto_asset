import pytest
from fastapi.testclient import TestClient

from asset_intelligence.api import app
from asset_intelligence.demo import ASSETS

client = TestClient(app)
weights = {asset["ticker"]: asset["weight"] for asset in ASSETS}


def test_simulation_api_and_no_mutation():
    before = client.get("/api/v1/demo/portfolio").json()
    response = client.post("/api/v1/demo/simulate", json={"weights": weights})
    assert response.status_code == 200
    assert response.json()["data_source"] == "synthetic"
    assert response.json()["metric_deltas"]["total_return"] == 0
    assert client.get("/api/v1/demo/portfolio").json() == before


@pytest.mark.parametrize("payload", [
    {}, {"weights": {}}, {"weights": {"UNKNOWN": 1}},
    {"weights": {**weights, "PETR4": 0.3}},
    {"weights": {**weights, "PETR4": -0.1}},
    {"weights": {**weights, "PETR4": "0.2"}},
    {"weights": {**weights, "PETR4": True}},
    {"weights": weights, "extra": 1},
])
def test_invalid_payload_returns_422(payload):
    assert client.post("/api/v1/demo/simulate", json=payload).status_code == 422
