"use client";

import { useState, type FormEvent } from "react";
import type { Portfolio, Risk } from "@/lib/types";

interface Comparison {
  current: Risk;
  scenario: Risk;
  metric_deltas: Risk["metrics"];
}
const percent = (value: number) => new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const labels: { key: keyof Risk["metrics"]; label: string }[] = [
  { key: "total_return", label: "Retorno no período" },
  { key: "annualized_volatility", label: "Volatilidade anualizada" },
  { key: "max_drawdown", label: "Drawdown máximo" },
  { key: "historical_var", label: "VaR histórico" },
  { key: "historical_expected_shortfall", label: "Expected Shortfall" },
];

export default function AllocationSimulator({ portfolio }: { portfolio: Portfolio }) {
  const initial = () => Object.fromEntries(portfolio.assets.map(asset => [asset.ticker, String(asset.weight * 100)]));
  const [inputs, setInputs] = useState<Record<string, string>>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Comparison | null>(null);
  const values = Object.values(inputs).map(value => value.trim() === "" ? NaN : Number(value.replace(",", ".")));
  const total = values.reduce((sum, value) => sum + value, 0);
  const valid = values.every(value => Number.isFinite(value) && value >= 0 && value <= 100) && Math.abs(total - 100) <= 0.000001;

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const weights = Object.fromEntries(Object.entries(inputs).map(([ticker, value]) => [ticker, Number(value.replace(",", ".")) / 100]));
      const response = await fetch("/api/simulate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights }), signal: AbortSignal.timeout(12000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Não foi possível simular.");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao simular. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return <section className="panel simulator" id="simulation" aria-labelledby="simulation-title">
    <div className="panel-heading"><div><h2 id="simulation-title">Simulador de alocação</h2><p>Altere os pesos e compare os indicadores no mesmo histórico sintético.</p></div><span className="subtle-tag">WHAT-IF</span></div>
    <form onSubmit={simulate} className="simulator-form">
      <fieldset disabled={pending}><legend className="sr-only">Pesos do cenário em porcentagem</legend><div className="simulation-inputs">{portfolio.assets.map(asset => <label key={asset.ticker} htmlFor={`weight-${asset.ticker}`}><span>{asset.ticker} <small>(%)</small></span><input id={`weight-${asset.ticker}`} type="text" inputMode="decimal" value={inputs[asset.ticker]} onChange={event => { setInputs(previous => ({ ...previous, [asset.ticker]: event.target.value })); setResult(null); setError(""); }} /></label>)}</div></fieldset>
      <div className="simulation-toolbar"><p aria-live="polite">Total: <strong>{Number.isFinite(total) ? percent(total / 100) : "—"}</strong>{!valid && <span className="validation-note"> Use pesos de 0 a 100%, somando 100%.</span>}</p><div className="actions"><button className="button" type="button" disabled={pending} onClick={() => { setInputs(initial()); setResult(null); setError(""); }}>Restaurar pesos</button><button className="button primary" type="submit" disabled={!valid || pending}>{pending ? "Calculando…" : "Comparar cenário"}</button></div></div>
    </form>
    {error && <p className="simulation-error" role="alert">{error}</p>}
    {result && <div className="simulation-results" aria-live="polite"><h3>Comparação com a carteira atual</h3><div className="table-scroll"><table className="holdings-table"><thead><tr><th scope="col">Indicador</th><th scope="col" className="align-right">Atual</th><th scope="col" className="align-right">Cenário</th><th scope="col" className="align-right">Diferença (p.p.)</th></tr></thead><tbody>{labels.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th><td className="align-right">{percent(result.current.metrics[key])}</td><td className="align-right">{percent(result.scenario.metrics[key])}</td><td className="align-right">{new Intl.NumberFormat("pt-BR", { signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(result.metric_deltas[key] * 100)}</td></tr>)}</tbody></table></div><p className="method-note">HHI atual: {result.current.metrics.concentration_hhi.toFixed(3)} · HHI cenário: {result.scenario.metrics.concentration_hhi.toFixed(3)}. Diferenças = cenário − atual; não indicam automaticamente uma melhoria.</p></div>}
    <div className="panel-footer">Simulação retrospectiva, com rebalanceamento diário e sem custos. Não altera a carteira original e não prevê retornos futuros. A exportação do dashboard continua representando a carteira original.</div>
  </section>;
}
