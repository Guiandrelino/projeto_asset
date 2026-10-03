"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowUpRight, BarChart3, ChevronRight, Database, Download, Globe2, Layers, LayoutDashboard, RefreshCw, ShieldCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Portfolio, Risk } from "@/lib/types";
import AllocationSimulator from "@/components/allocation-simulator";

const colors = ["#5ee0b0", "#65aaf5", "#a38df2", "#edbf74", "#e58fa4"];
const percent = (value: number) => new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
const number = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const shortDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

export default function Dashboard({ portfolio, risk }: { portfolio: Portfolio; risk: Risk }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const metrics = risk.metrics;
  const tickers = portfolio.assets.map(asset => asset.ticker);
  const cards = [
    { label: "Volatilidade anualizada", value: metrics.annualized_volatility, detail: `${risk.assumptions.annualization_factor} pregões · desvio amostral`, icon: Activity },
    { label: "Drawdown máximo", value: metrics.max_drawdown, detail: "Maior queda desde um pico", icon: BarChart3 },
    { label: "VaR histórico", value: metrics.historical_var, detail: `${percent(risk.assumptions.confidence)} de confiança · ${risk.assumptions.risk_horizon_days} dia`, icon: ShieldCheck },
    { label: "Expected Shortfall", value: metrics.historical_expected_shortfall, detail: "Perda média na cauda do VaR", icon: Layers },
  ];
  function exportAnalysis() {
    const blob = new Blob([JSON.stringify({ portfolio, risk }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "carteira-brasil-demo.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="app-shell">
    <a className="skip-link" href="#overview">Ir para o conteúdo</a>
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-icon"><Layers size={22} /></span><span>asset<span className="brand-sub">INTELLIGENCE</span></span></a>
      <div className="workspace"><span className="workspace-icon">BR</span><div>Workspace Brasil<small>Ambiente demonstrativo</small></div></div>
      <span className="nav-caption">MONITORAMENTO</span>
      <nav aria-label="Navegação principal">
        <a className="nav-active" href="#overview"><LayoutDashboard size={18} />Visão geral</a>
        <a href="#composition"><Layers size={18} />Carteira</a>
        <a href="#correlation"><ShieldCheck size={18} />Análise de risco</a>
        <a href="#simulation"><Activity size={18} />Simular alocação</a>
        <a href="#methodology"><Database size={18} />Dados e metodologia</a>
      </nav>
      <div className="sidebar-bottom"><span className="status-dot" />Dados sintéticos<small>Motor de risco · v0.1</small></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace Brasil <ChevronRight size={14} /><strong>Visão geral</strong></div><span className="market-tag"><Globe2 size={14} /> BRL · Brasil</span></header>
      <main id="overview">
        <div className="page-heading"><div><span className="eyebrow">PORTFOLIO INTELLIGENCE</span><h1>Carteira Brasil<span className="demo-tag">DEMO</span></h1><p>Exposição, desempenho e risco em uma única visão.</p></div><div className="actions"><button className="button" onClick={exportAnalysis}><Download size={16} />Exportar JSON</button><button className="button primary" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={16} className={pending ? "spinning" : ""} />{pending ? "Atualizando…" : "Atualizar"}</button></div></div>
        <div className="demo-banner"><Database size={18} /><p><strong>Demonstração com dados sintéticos.</strong> Não representa cotações ou desempenho real da B3, nem recomendação de investimento.</p></div>
        <div className="context-row"><span><span className="status-dot" />API conectada na última consulta</span><span>{date(risk.period.start)} — {date(risk.period.end)} <span className="separator">/</span> {risk.period.return_observations} retornos diários</span></div>
        <section className="metrics-grid" aria-label="Indicadores de risco">{cards.map(({ label, value, detail, icon: Icon }) => <article className="metric-card" key={label}><div className="metric-label">{label}<Icon size={17} /></div><strong className="metric-value">{percent(value)}</strong><small>{detail}</small></article>)}</section>
        <div className="charts-grid">
          <section className="panel equity-panel" aria-labelledby="equity-title"><div className="panel-heading"><div><h2 id="equity-title">Evolução do patrimônio</h2><p>Índice normalizado · capital inicial = 1</p></div><span className={`return-badge ${metrics.total_return < 0 ? "negative" : ""}`}><ArrowUpRight size={16} />{percent(metrics.total_return)}<small>no período</small></span></div>
            <div className="equity-chart" role="img" aria-label={`Curva de patrimônio sintético: retorno no período de ${percent(metrics.total_return)}. Os valores individuais estão disponíveis na exportação JSON.`}>
              <ResponsiveContainer width="100%" height="100%"><AreaChart data={risk.equity_curve} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}><defs><linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5ee0b0" stopOpacity={0.22} /><stop offset="100%" stopColor="#5ee0b0" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#253141" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickFormatter={shortDate} minTickGap={55} tick={{ fill: "#8997ab", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={["auto", "auto"]} tickFormatter={number} tick={{ fill: "#8997ab", fontSize: 11 }} axisLine={false} tickLine={false} width={45} /><Tooltip contentStyle={{ background: "#15202d", border: "1px solid #334155", borderRadius: 10, color: "#e5ecf5" }} labelFormatter={value => date(String(value))} formatter={value => [number(Number(value)), "Patrimônio"]} /><Area type="monotone" dataKey="value" stroke="#5ee0b0" strokeWidth={2} fill="url(#equity-fill)" /></AreaChart></ResponsiveContainer>
            </div><div className="panel-footer"><span className="legend-dot" />Carteira simulada · pesos fixos e rebalanceamento diário</div>
          </section>
          <section className="panel allocation-panel" aria-labelledby="allocation-title"><div className="panel-heading"><div><h2 id="allocation-title">Alocação por ativo</h2><p>{portfolio.assets.length} instrumentos · posições compradas</p></div><Layers size={19} className="muted" /></div><div className="allocation-content">{portfolio.assets.map((asset, index) => <div className="allocation-item" key={asset.ticker}><div><span><i style={{ background: colors[index % colors.length] }} />{asset.ticker}</span><strong>{percent(asset.weight)}</strong></div><div className="weight-track"><div style={{ width: `${asset.weight * 100}%`, background: colors[index % colors.length] }} /></div></div>)}</div><div className="allocation-summary"><span>Concentração HHI<strong>{number(metrics.concentration_hhi)}</strong></span><span>Moeda-base<strong>{portfolio.currency}</strong></span></div></section>
        </div>
        <section className="panel holdings-panel" id="composition"><div className="panel-heading"><div><h2>Composição da carteira</h2><p>Pesos demonstrativos, sem valores financeiros ou quantidades.</p></div><span className="subtle-tag">LONG ONLY</span></div><div className="table-scroll"><table className="holdings-table"><thead><tr><th scope="col">Ativo</th><th scope="col">Nome</th><th scope="col">Classe</th><th scope="col">Setor</th><th scope="col" className="align-right">Peso</th></tr></thead><tbody>{portfolio.assets.map((asset, index) => <tr key={asset.ticker}><th scope="row"><span className="ticker-cell"><i style={{ background: colors[index % colors.length] }} />{asset.ticker}</span></th><td>{asset.name}</td><td><span className="subtle-tag">{asset.asset_class}</span></td><td>{asset.sector}</td><td className="align-right weight-cell">{percent(asset.weight)}</td></tr>)}</tbody></table></div><div className="panel-footer">BOVA11 pode se sobrepor às ações. A exposição do ETF não está decomposta em seus ativos subjacentes.</div></section>
        <div className="bottom-grid"><section className="panel" id="correlation"><div className="panel-heading"><div><h2>Matriz de correlação</h2><p>Retornos diários · correlação de Pearson</p></div></div><div className="table-scroll correlation-wrap"><table className="correlation-table"><thead><tr><th scope="col"><span className="sr-only">Ativo</span></th>{tickers.map(ticker => <th scope="col" key={ticker}>{ticker}</th>)}</tr></thead><tbody>{tickers.map(row => <tr key={row}><th scope="row">{row}</th>{tickers.map(col => { const value = risk.correlation[col]?.[row] ?? null; return <td key={col} style={{ background: value === null ? "transparent" : value >= 0 ? `rgba(94,224,176,${0.06 + Math.abs(value) * 0.28})` : `rgba(101,170,245,${0.06 + Math.abs(value) * 0.28})` }}>{value === null ? "—" : value.toFixed(2).replace(".", ",")}</td>; })}</tr>)}</tbody></table></div><div className="panel-footer">−1: relação inversa · 0: sem relação linear · +1: mesma direção</div></section>
          <section className="panel methodology" id="methodology"><div className="panel-heading"><div><h2>Premissas da análise</h2><p>Transparência antes da decisão</p></div><ShieldCheck size={19} className="muted" /></div><dl><div><dt>Origem dos dados</dt><dd>Sintéticos · seed fixa</dd></div><div><dt>Estratégia</dt><dd>Pesos fixos diários</dd></div><div><dt>Custos e impostos</dt><dd>Não incluídos</dd></div><div><dt>Calendário</dt><dd>Dias úteis genéricos</dd></div><div><dt>Horizonte VaR / ES</dt><dd>{risk.assumptions.risk_horizon_days} dia · {percent(risk.assumptions.confidence)}</dd></div></dl><p className="method-note">O calendário não reproduz os pregões da B3. As métricas não capturam todos os riscos, como liquidez, e não garantem resultados futuros.</p></section></div>
        <AllocationSimulator portfolio={portfolio} />
        <footer className="page-footer"><span>Asset Intelligence Platform</span><span>Ambiente demonstrativo · sem dados de mercado reais</span></footer>
      </main>
    </div>
  </div>;
}
