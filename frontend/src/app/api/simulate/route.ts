import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "JSON inválido." }, { status: 400 });
  }
  try {
    const base = process.env.API_BASE_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/demo/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 422) {
      return NextResponse.json({ detail: "Pesos inválidos. Informe todos os ativos, com pesos entre 0 e 100% e total de 100%." }, { status: 422 });
    }
    if (!response.ok) throw new Error("Backend indisponível");
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ detail: "Não foi possível simular. Verifique se a API está rodando e tente novamente." }, { status: 503 });
  }
}
