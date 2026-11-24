import { NextResponse } from "next/server";
import { notificarTodos } from "@/lib/push";

export async function POST() {
  const n = await notificarTodos("Teste", "As notificações estão funcionando.");
  return NextResponse.json({ notificados: n });
}
