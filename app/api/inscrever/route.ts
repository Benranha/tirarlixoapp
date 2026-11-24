import { NextRequest, NextResponse } from "next/server";
import { salvarInscricao } from "@/lib/db";

export async function POST(req: NextRequest) {
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ erro: "inscrição inválida" }, { status: 400 });
  }
  await salvarInscricao(sub);
  return NextResponse.json({ ok: true });
}
