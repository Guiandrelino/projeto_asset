from fastapi import FastAPI

from asset_intelligence.demo import ASSETS, demo_prices
from asset_intelligence.risk import analyze_portfolio

app = FastAPI(title="Asset Intelligence Platform", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/v1/demo/portfolio")
def demo_portfolio() -> dict:
    return {
        "name": "Carteira Brasil — demonstração",
        "currency": "BRL",
        "data_source": "synthetic",
        "notice": "Dados fictícios. ETFs não têm decomposição de exposição nos ativos subjacentes.",
        "assets": ASSETS,
    }


@app.get("/api/v1/demo/risk")
def demo_risk() -> dict:
    return {
        "data_source": "synthetic",
        "notice": "Não representa performance real nem recomendação de investimento.",
        **analyze_portfolio(demo_prices(), {asset["ticker"]: asset["weight"] for asset in ASSETS}),
    }
