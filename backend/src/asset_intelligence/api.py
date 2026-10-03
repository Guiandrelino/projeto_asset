from typing import Annotated

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from asset_intelligence.demo import ASSETS, demo_prices
from asset_intelligence.risk import analyze_portfolio
from asset_intelligence.simulation import compare_allocations
from asset_intelligence.optimization import OptimizationError, optimize_allocation

app = FastAPI(title="Asset Intelligence Platform", version="0.1.0")


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    weights: dict[str, Annotated[float, Field(ge=0, le=1, allow_inf_nan=False, strict=True)]] = Field(min_length=1)


class OptimizationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    max_weight: Annotated[float, Field(gt=0, le=1, allow_inf_nan=False, strict=True)] = 0.4


@app.post("/api/v1/demo/optimize")
def optimize(request: OptimizationRequest) -> dict:
    try:
        result = optimize_allocation(
            demo_prices(), {asset["ticker"]: asset["weight"] for asset in ASSETS}, request.max_weight,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except OptimizationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {
        "data_source": "synthetic",
        "notice": "Mínima variância no próprio histórico sintético. Não é recomendação nem garantia de risco futuro.",
        **result,
    }


@app.post("/api/v1/demo/simulate")
def simulate(request: SimulationRequest) -> dict:
    try:
        comparison = compare_allocations(
            demo_prices(),
            {asset["ticker"]: asset["weight"] for asset in ASSETS},
            request.weights,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "data_source": "synthetic",
        "notice": "Simulação retrospectiva, sem alteração da carteira e sem previsão de retornos.",
        **comparison,
    }


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
