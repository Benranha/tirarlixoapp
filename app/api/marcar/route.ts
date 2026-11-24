import { NextRequest, NextResponse } from "next/server";
import { lerEstado, salvarEstado } from "@/lib/db";
import { notificarTodos } from "@/lib/push";

export const dynamic = "force-dynamic";

// Chamado pelo app: { "cheio": true|false }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (typeof body?.cheio !== "boolean") return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  const anterior = await lerEstado();
  const atual = await salvarEstado(body.cheio, anterior.nivel);
  let notificados = 0;
  if (!anterior.cheio && atual.cheio) notificados = await notificarTodos("O lixo tá cheio", "Hora de tirar o lixo.");
  else if (anterior.cheio && !atual.cheio) notificados = await notificarTodos("Lixo esvaziado", "Alguém tirou o lixo.");
  return NextResponse.json({ ...atual, notificados });
}
