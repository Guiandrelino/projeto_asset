"""Mínima variância long-only com limite uniforme por instrumento."""

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from asset_intelligence.risk import analyze_portfolio
from asset_intelligence.simulation import compare_allocations


class OptimizationError(RuntimeError):
    """Solver não produziu uma solução válida."""


def optimize_allocation(prices: pd.DataFrame, current_weights: dict[str, float], max_weight: float = 0.4) -> dict:
    # Reutiliza todas as validações financeiras antes de construir a covariância.
    analyze_portfolio(prices, current_weights)
    count = len(prices.columns)
    if isinstance(max_weight, bool) or not np.isfinite(max_weight) or not 0 < max_weight <= 1:
        raise ValueError("O limite por ativo deve estar entre 0 e 1.")
    if max_weight * count < 1 - 1e-12:
        raise ValueError(f"Limite inviável: para {count} ativos, use pelo menos {1 / count:.0%}.")

    covariance = prices.pct_change(fill_method=None).iloc[1:].cov().to_numpy() * 252
    # Escala não altera o ótimo; evita parada precoce em variâncias muito pequenas.
    scale = max(float(np.max(np.diag(covariance))), 1e-12)
    matrix = covariance / scale
    initial = np.full(count, 1 / count)
    result = minimize(
        lambda w: float(w @ matrix @ w), initial,
        jac=lambda w: 2 * matrix @ w,
        method="SLSQP", bounds=[(0, max_weight)] * count,
        constraints=[{"type": "eq", "fun": lambda w: float(w.sum() - 1), "jac": lambda w: np.ones(count)}],
        options={"ftol": 1e-12, "maxiter": 1000},
    )
    w = result.x
    if (not result.success or not np.isfinite(w).all()
            or abs(float(w.sum()) - 1) > 1e-8
            or (w < -1e-8).any() or (w > max_weight + 1e-8).any()
            or float(w @ matrix @ w) > float(initial @ matrix @ initial) + 1e-8):
        raise OptimizationError("Não foi possível obter uma alocação válida. Tente novamente com outro limite.")
    # Correção apenas de ruído numérico; nunca arredonda pesos para apresentação.
    w = np.clip(w, 0, max_weight)
    w = w / w.sum()
    if (w > max_weight + 1e-8).any():
        raise OptimizationError("A solução excedeu o limite por ativo.")
    weights = dict(zip(prices.columns, w.tolist()))
    return {
        "optimization": {"objective": "minimum_variance", "solver": "SLSQP", "max_weight": max_weight, "long_only": True, "iterations": int(result.nit), "converged": True},
        **compare_allocations(prices, current_weights, weights),
    }
