from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from asset_intelligence.api import app
from asset_intelligence.optimization import OptimizationError

client = TestClient(app)


def test_optimization_endpoint_defaults_and_no_mutation():
    before = client.get("/api/v1/demo/portfolio").json()
    response = client.post("/api/v1/demo/optimize", json={})
    assert response.status_code == 200
    result = response.json()
    assert result["data_source"] == "synthetic"
    assert result["optimization"]["max_weight"] == 0.4
    assert result["optimization"]["converged"]
    assert client.get("/api/v1/demo/portfolio").json() == before


@pytest.mark.parametrize("payload", [{"max_weight": 0.19}, {"max_weight": 0}, {"max_weight": 2}, {"max_weight": "0.4"}, {"max_weight": True}, {"unknown": 1}])
def test_invalid_optimization_request(payload):
    assert client.post("/api/v1/demo/optimize", json=payload).status_code == 422


def test_solver_failure_returns_503():
    with patch("asset_intelligence.api.optimize_allocation", side_effect=OptimizationError("Falha do solver")):
        assert client.post("/api/v1/demo/optimize", json={}).status_code == 503
