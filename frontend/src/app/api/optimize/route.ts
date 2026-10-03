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
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/demo/optimize`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (response.status === 422) {
      return NextResponse.json({ detail: "Limite inválido ou inviável. Para os cinco ativos, use de 20% a 100%." }, { status: 422 });
    }
    if (!response.ok) throw new Error("Otimização indisponível");
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ detail: "Não foi possível otimizar. Verifique a API ou tente outro limite." }, { status: 503 });
  }
}
