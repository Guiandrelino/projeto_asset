import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from asset_intelligence.api import app
from asset_intelligence.demo import ASSETS, demo_prices
from asset_intelligence.risk import analyze_portfolio


def frame(values):
    return pd.DataFrame({"TEST3": values}, index=pd.date_range("2025-01-01", periods=len(values)))


def test_known_losses():
    result = analyze_portfolio(frame([100, 90, 81]), {"TEST3": 1})
    metrics = result["metrics"]
    assert metrics["total_return"] == pytest.approx(-0.19)
    assert metrics["max_drawdown"] == pytest.approx(-0.19)
    assert metrics["historical_var"] == pytest.approx(0.10)
    assert metrics["historical_expected_shortfall"] == pytest.approx(0.10)
    assert metrics["annualized_volatility"] == pytest.approx(0)
    assert result["correlation"]["TEST3"]["TEST3"] is None


def test_no_loss_has_zero_var_and_es():
    metrics = analyze_portfolio(frame([100, 110, 121]), {"TEST3": 1})["metrics"]
    assert metrics["historical_var"] == 0
    assert metrics["historical_expected_shortfall"] == 0
    assert metrics["max_drawdown"] == 0


@pytest.mark.parametrize("weights", [{"TEST3": -1}, {"TEST3": 0.9}, {"OTHER3": 1}, {"TEST3": np.nan}])
def test_invalid_weights(weights):
    with pytest.raises(ValueError):
        analyze_portfolio(frame([100, 101, 102]), weights)


@pytest.mark.parametrize("values", [[100, np.nan, 102], [100, 0, 102], [100, np.inf, 102], [100, 101]])
def test_invalid_prices(values):
    with pytest.raises(ValueError):
        analyze_portfolio(frame(values), {"TEST3": 1})


def test_unsorted_dates():
    with pytest.raises(ValueError):
        analyze_portfolio(frame([100, 101, 102]).iloc[::-1], {"TEST3": 1})


def test_portfolio_volatility_matches_return_series():
    prices = demo_prices()
    weights = {asset["ticker"]: asset["weight"] for asset in ASSETS}
    result = analyze_portfolio(prices, weights)
    returns = prices.pct_change().iloc[1:] @ pd.Series(weights)
    assert result["metrics"]["annualized_volatility"] == pytest.approx(returns.std(ddof=1) * np.sqrt(252))
    assert result["metrics"]["historical_expected_shortfall"] >= result["metrics"]["historical_var"]
    pd.testing.assert_frame_equal(prices, demo_prices())


def test_api():
    client = TestClient(app)
    assert client.get("/health").json() == {"status": "ok"}
    assert len(client.get("/api/v1/demo/portfolio").json()["assets"]) == 5
    response = client.get("/api/v1/demo/risk")
    assert response.status_code == 200
    assert response.json()["data_source"] == "synthetic"
    assert response.json()["period"]["return_observations"] == 252
