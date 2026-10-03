from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from asset_intelligence.demo import ASSETS, demo_prices
from asset_intelligence.optimization import OptimizationError, optimize_allocation

CURRENT = {asset["ticker"]: asset["weight"] for asset in ASSETS}


def test_solution_is_feasible_and_improves_feasible_current():
    result = optimize_allocation(demo_prices(), CURRENT, 0.4)
    weights = list(result["scenario"]["weights"].values())
    assert sum(weights) == pytest.approx(1)
    assert all(0 <= value <= 0.4 + 1e-8 for value in weights)
    assert result["scenario"]["metrics"]["annualized_volatility"] <= result["current"]["metrics"]["annualized_volatility"] + 1e-8
    assert result["optimization"]["converged"]


def test_binding_cap_forces_equal_weights():
    result = optimize_allocation(demo_prices(), CURRENT, 0.2)
    assert list(result["scenario"]["weights"].values()) == pytest.approx([0.2] * 5)


def test_analytical_two_asset_solution():
    returns = np.array([[0.01, 0], [-0.01, 0], [0, 0.02], [0, -0.02]])
    prices = pd.DataFrame(np.vstack([np.ones(2), np.cumprod(1 + returns, axis=0)]), columns=["A", "B"], index=pd.date_range("2025-01-01", periods=5))
    result = optimize_allocation(prices, {"A": 0.5, "B": 0.5}, 1)
    assert result["scenario"]["weights"] == pytest.approx({"A": 0.8, "B": 0.2}, abs=1e-6)


@pytest.mark.parametrize("cap", [0, -1, 0.19, 1.1, np.nan, np.inf, True])
def test_invalid_or_infeasible_caps(cap):
    with pytest.raises(ValueError):
        optimize_allocation(demo_prices(), CURRENT, cap)


def test_zero_variance_returns_valid_weights():
    prices = demo_prices() * 0 + 100
    result = optimize_allocation(prices, CURRENT)
    assert result["scenario"]["metrics"]["annualized_volatility"] == 0


def test_solver_failure_is_not_returned_as_success():
    with patch("asset_intelligence.optimization.minimize", return_value=SimpleNamespace(success=False, x=np.full(5, 0.2))):
        with pytest.raises(OptimizationError):
            optimize_allocation(demo_prices(), CURRENT)
