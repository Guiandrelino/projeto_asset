import Dashboard from "@/components/dashboard";
import type { Portfolio, Risk } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData<T>(path: string): Promise<T> {
  const base = process.env.API_BASE_URL || "http://127.0.0.1:8000";
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`API retornou ${response.status}`);
  return response.json() as Promise<T>;
}

export default async function Page() {
  let portfolio: Portfolio;
  let risk: Risk;
  try {
    [portfolio, risk] = await Promise.all([
      getData<Portfolio>("/api/v1/demo/portfolio"),
      getData<Risk>("/api/v1/demo/risk"),
    ]);
  } catch {
    return <main className="connection-screen"><div className="connection-card">
      <span className="eyebrow">ASSET INTELLIGENCE</span>
      <h1>Não foi possível conectar à API</h1>
      <p>Inicie o backend em outro terminal, na raiz do projeto:</p>
      <code>.\.venv\Scripts\python.exe -m uvicorn asset_intelligence.api:app --reload</code>
      <p>O endereço padrão é <strong>http://127.0.0.1:8000</strong>. Se usar outro endereço, configure API_BASE_URL no arquivo frontend/.env.local.</p>
      <Link className="button primary" href="/">Tentar novamente</Link>
    </div></main>;
  }
  return <Dashboard portfolio={portfolio} risk={risk} />;
}
