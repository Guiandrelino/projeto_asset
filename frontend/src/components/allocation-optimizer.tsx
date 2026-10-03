"use client";

import { useState, type FormEvent } from "react";
import type { Portfolio, Risk } from "@/lib/types";

interface OptimizationResult {
  current: Risk;
  scenario: Risk;
  metric_deltas: Risk["metrics"];
  optimization: { max_weight: number; iterations: number; converged: boolean };
}
const percent = (value: number) => new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const metrics: { key: keyof Risk["metrics"]; label: string }[] = [
  { key: "annualized_volatility", label: "Volatilidade anualizada" },
  { key: "max_drawdown", label: "Drawdown máximo" },
  { key: "historical_var", label: "VaR histórico" },
  { key: "historical_expected_shortfall", label: "Expected Shortfall" },
  { key: "total_return", label: "Retorno no período" },
];

export default function AllocationOptimizer({ portfolio }: { portfolio: Portfolio }) {
  const [limit, setLimit] = useState("40");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const cap = limit.trim() === "" ? NaN : Number(limit.replace(",", "."));
  const minimum = 100 / portfolio.assets.length;
  const valid = Number.isFinite(cap) && cap >= minimum && cap <= 100;

  async function optimize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_weight: cap / 100 }), signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Falha na otimização.");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível otimizar.");
    } finally {
      setPending(false);
    }
  }

  function exportResult() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "minima-variancia-demo.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="panel simulator" id="optimization" aria-labelledby="optimization-title">
    <div className="panel-heading"><div><h2 id="optimization-title">Otimização de mínima variância</h2><p>Minimize a variância histórica, com posições compradas e limite por instrumento.</p></div><span className="subtle-tag">SLSQP</span></div>
    <form className="simulator-form" onSubmit={optimize}>
      <div className="optimizer-controls"><label htmlFor="max-weight">Peso máximo por ativo (%)<input id="max-weight" type="text" inputMode="decimal" disabled={pending} value={limit} aria-describedby="cap-help" onChange={event => { setLimit(event.target.value); setError(""); setResult(null); }} /></label><button className="button primary" type="submit" disabled={pending || !valid}>{pending ? "Otimizando…" : "Calcular mínima variância"}</button></div>
      <p className="optimizer-help" id="cap-help">Use de {percent(minimum / 100)} a 100%. Com {portfolio.assets.length} ativos, um limite menor não permite alocar 100% do capital.</p>
    </form>
    {error && <p className="simulation-error" role="alert">{error}</p>}
    {result && <div className="simulation-results" aria-live="polite">
      <h3>Pesos calculados · limite de {percent(result.optimization.max_weight)}</h3>
      <div className="table-scroll"><table className="holdings-table"><thead><tr><th scope="col">Ativo</th><th scope="col" className="align-right">Peso atual</th><th scope="col" className="align-right">Peso otimizado</th></tr></thead><tbody>{portfolio.assets.map(asset => <tr key={asset.ticker}><th scope="row">{asset.ticker}</th><td className="align-right">{percent(result.current.weights[asset.ticker])}</td><td className="align-right">{percent(result.scenario.weights[asset.ticker])}</td></tr>)}</tbody></table></div>
      <h3>Risco e desempenho no mesmo histórico</h3>
      <div className="table-scroll"><table className="holdings-table"><thead><tr><th scope="col">Indicador</th><th scope="col" className="align-right">Atual</th><th scope="col" className="align-right">Otimizado</th><th scope="col" className="align-right">Diferença (p.p.)</th></tr></thead><tbody>{metrics.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th><td className="align-right">{percent(result.current.metrics[key])}</td><td className="align-right">{percent(result.scenario.metrics[key])}</td><td className="align-right">{new Intl.NumberFormat("pt-BR", { signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(result.metric_deltas[key] * 100)}</td></tr>)}</tbody></table></div>
      <div className="optimizer-summary"><p>Solver convergiu em {result.optimization.iterations} iterações. HHI: {result.current.metrics.concentration_hhi.toFixed(3)} → {result.scenario.metrics.concentration_hhi.toFixed(3)}. Pesos exibidos são arredondados; o JSON preserva a precisão.</p><button className="button" onClick={exportResult}>Exportar otimização JSON</button></div>
    </div>}
    <div className="panel-footer">Otimização no próprio histórico (in-sample), não validação fora da amostra. Minimiza apenas variância — não retorno, VaR ou drawdown. Um limite mais restritivo pode elevar o risco em relação à carteira atual. Sem custos, restrições por setor ou decomposição do ETF. Não altera a carteira e não é recomendação de investimento.</div>
  </section>;
}
