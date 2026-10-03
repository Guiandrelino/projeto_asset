"""Comparação de cenários sobre o mesmo histórico, sem persistir alterações."""

import pandas as pd

from asset_intelligence.risk import analyze_portfolio


def compare_allocations(
    prices: pd.DataFrame,
    current_weights: dict[str, float],
    scenario_weights: dict[str, float],
) -> dict:
    """Pesos em frações; validação e convenções idênticas ao motor de risco.

    Deltas são cenário menos atual. Retornos são retrospectivos, não previsões.
    """
    current = analyze_portfolio(prices, current_weights)
    scenario = analyze_portfolio(prices, scenario_weights)
    return {
        "current": current,
        "scenario": scenario,
        "metric_deltas": {
            key: scenario["metrics"][key] - value
            for key, value in current["metrics"].items()
        },
    }
