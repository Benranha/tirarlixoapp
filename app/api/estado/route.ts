import { NextRequest, NextResponse } from "next/server";
import { lerEstado, salvarEstado } from "@/lib/db";
import { notificarTodos } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await lerEstado());
}

// Chamado pela placa: { "cheio": true|false, "nivel": 0..100 }
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-device-token");
  if (!token || token !== process.env.DEVICE_TOKEN) {
    return NextResponse.json({ erro: "token inválido" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.cheio !== "boolean") {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }
  const nivel = Math.max(0, Math.min(100, Math.round(Number(body.nivel ?? 0))));

  const anterior = await lerEstado();
  const atual = await salvarEstado(body.cheio, nivel);

  let notificados = 0;
  if (!anterior.cheio && atual.cheio) {
    notificados = await notificarTodos("O lixo tá cheio", "Hora de tirar o lixo.");
  } else if (anterior.cheio && !atual.cheio) {
    notificados = await notificarTodos("Lixo esvaziado", "A lixeira voltou ao normal.");
  }
  return NextResponse.json({ ...atual, notificados });
}
