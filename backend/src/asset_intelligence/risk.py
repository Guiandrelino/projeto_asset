"""Métricas para uma carteira long-only, rebalanceada diariamente a pesos fixos."""

import numpy as np
import pandas as pd


def analyze_portfolio(
    prices: pd.DataFrame,
    weights: dict[str, float],
    confidence: float = 0.95,
    annualization: int = 252,
) -> dict:
    """Retornos simples; VaR/ES de 1 dia, positivos para perdas (piso zero).

    O drawdown inclui o capital inicial. Não modela custos, impostos, caixa,
    liquidez nem eventos corporativos: preços reais devem chegar ajustados.
    """
    if not 0 < confidence < 1:
        raise ValueError("A confiança deve estar entre 0 e 1, exclusivamente.")
    if not isinstance(annualization, int) or isinstance(annualization, bool) or annualization <= 0:
        raise ValueError("O fator de anualização deve ser um inteiro positivo.")
    if prices.empty or len(prices) < 3 or not weights:
        raise ValueError("Informe ativos e pelo menos três observações de preços.")
    if not isinstance(prices.index, pd.DatetimeIndex) or prices.index.hasnans:
        raise ValueError("O índice de preços deve conter datas válidas.")
    if prices.index.has_duplicates or not prices.index.is_monotonic_increasing:
        raise ValueError("As datas devem ser únicas e estar em ordem crescente.")
    if prices.columns.has_duplicates or set(prices.columns) != set(weights):
        raise ValueError("Os ativos dos preços e dos pesos devem coincidir, sem duplicatas.")
    w = np.array([weights[ticker] for ticker in prices.columns], dtype=float)
    if not np.isfinite(w).all() or (w < 0).any() or not np.isclose(w.sum(), 1, atol=1e-8, rtol=0):
        raise ValueError("Os pesos devem ser finitos, não negativos e somar 1.")
    values = prices.to_numpy(dtype=float)
    if not np.isfinite(values).all() or (values <= 0).any():
        raise ValueError("Os preços devem ser positivos e completos; não há preenchimento automático.")

    returns = prices.pct_change(fill_method=None).iloc[1:]
    portfolio = returns.to_numpy() @ w
    covariance = returns.cov().to_numpy() * annualization
    volatility = float(np.sqrt(max(float(w @ covariance @ w), 0)))
    wealth = np.concatenate(([1.0], np.cumprod(1 + portfolio)))
    drawdowns = wealth / np.maximum.accumulate(wealth) - 1
    losses = -portfolio
    var_threshold = float(np.quantile(losses, confidence))
    tail = losses[losses >= var_threshold]
    correlation = returns.corr().astype(object).where(returns.corr().notna(), None)

    return {
        "period": {"start": prices.index[0].date().isoformat(), "end": prices.index[-1].date().isoformat(), "return_observations": len(portfolio)},
        "assumptions": {"currency": "BRL", "annualization_factor": annualization, "confidence": confidence, "risk_horizon_days": 1, "rebalancing": "daily_constant_weights", "costs_included": False},
        "metrics": {
            "total_return": float(wealth[-1] - 1),
            "annualized_volatility": volatility,
            "max_drawdown": float(drawdowns.min()),
            "historical_var": max(var_threshold, 0.0),
            "historical_expected_shortfall": max(float(tail.mean()), 0.0),
            "concentration_hhi": float(w @ w),
        },
        "weights": dict(zip(prices.columns, w.tolist())),
        "correlation": correlation.to_dict(),
        "equity_curve": [{"date": date.date().isoformat(), "value": float(value)} for date, value in zip(prices.index, wealth)],
    }
