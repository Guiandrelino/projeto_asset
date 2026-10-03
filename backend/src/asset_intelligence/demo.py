"""Dados fictícios, sem vínculo com cotações ou performance real da B3."""

import numpy as np
import pandas as pd

ASSETS = [
    {"ticker": "PETR4", "name": "Petrobras PN", "asset_class": "Ação", "sector": "Petróleo e gás", "weight": 0.20},
    {"ticker": "VALE3", "name": "Vale ON", "asset_class": "Ação", "sector": "Mineração", "weight": 0.20},
    {"ticker": "ITUB4", "name": "Itaú Unibanco PN", "asset_class": "Ação", "sector": "Financeiro", "weight": 0.20},
    {"ticker": "WEGE3", "name": "WEG ON", "asset_class": "Ação", "sector": "Industrial", "weight": 0.15},
    {"ticker": "BOVA11", "name": "ETF Ibovespa", "asset_class": "ETF", "sector": "Multissetorial", "weight": 0.25},
]


def demo_prices() -> pd.DataFrame:
    """253 observações artificiais; dias úteis NÃO representam o calendário B3.

    Fator comum e ruídos idiossincráticos geram retornos correlacionados.
    Seed e período fixos tornam a demonstração reproduzível.
    """
    rng = np.random.default_rng(42)
    dates = pd.bdate_range(end="2025-12-30", periods=253)
    market = rng.normal(0.0003, 0.01, (252, 1))
    noise = rng.normal(0, [0.014, 0.013, 0.009, 0.012, 0.003], (252, 5))
    log_returns = market * np.array([1.1, 1.0, 0.9, 1.0, 1.0]) + noise
    initial = np.array([35.0, 55.0, 32.0, 45.0, 120.0])
    values = initial * np.exp(np.vstack([np.zeros(5), np.cumsum(log_returns, axis=0)]))
    return pd.DataFrame(values, index=dates, columns=[asset["ticker"] for asset in ASSETS])
