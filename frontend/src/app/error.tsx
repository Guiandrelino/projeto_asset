"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="connection-screen"><div className="connection-card"><h1>Não foi possível exibir a análise</h1><p>Verifique a API e tente novamente.</p><button className="button primary" onClick={reset}>Tentar novamente</button></div></main>;
}
