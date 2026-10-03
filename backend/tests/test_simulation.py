import numpy as np
import pytest

from asset_intelligence.demo import ASSETS, demo_prices
from asset_intelligence.simulation import compare_allocations

CURRENT = {asset["ticker"]: asset["weight"] for asset in ASSETS}


def test_identical_scenario_has_zero_deltas():
    result = compare_allocations(demo_prices(), CURRENT, CURRENT)
    assert all(value == 0 for value in result["metric_deltas"].values())
    assert result["current"] == result["scenario"]


def test_concentrated_scenario_preserves_period_and_inputs():
    scenario = dict.fromkeys(CURRENT, 0.0)
    scenario["PETR4"] = 1.0
    before = CURRENT.copy()
    result = compare_allocations(demo_prices(), CURRENT, scenario)
    assert result["current"]["period"] == result["scenario"]["period"]
    assert result["scenario"]["metrics"]["concentration_hhi"] == 1
    for key, delta in result["metric_deltas"].items():
        assert delta == pytest.approx(result["scenario"]["metrics"][key] - result["current"]["metrics"][key])
    assert CURRENT == before


@pytest.mark.parametrize("scenario", [
    {}, {"PETR4": 1}, dict.fromkeys(CURRENT, 0.1),
    {**CURRENT, "PETR4": -0.2}, {**CURRENT, "PETR4": np.nan},
])
def test_invalid_scenarios_rejected(scenario):
    with pytest.raises(ValueError):
        compare_allocations(demo_prices(), CURRENT, scenario)
