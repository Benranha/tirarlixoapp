import { NextRequest, NextResponse } from "next/server";
import { lerComandoServo, novoComandoServo } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await lerComandoServo());
}

// { "acao": "esq" | "dir" | "parar", "ms": 500 }   (ms = 0 gira até mandar parar)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!["esq", "dir", "parar"].includes(body?.acao)) return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  return NextResponse.json(await novoComandoServo(body.acao, Number(body.ms ?? 0)));
}
