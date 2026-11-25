import { NextRequest, NextResponse } from "next/server";
import { lerServo, salvarServo } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ angulo: await lerServo() });
}

// { "angulo": 0..180 } ou { "delta": +15 / -15 }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  let alvo: number;
  if (typeof body?.angulo === "number") alvo = body.angulo;
  else if (typeof body?.delta === "number") alvo = (await lerServo()) + body.delta;
  else return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  return NextResponse.json({ angulo: await salvarServo(alvo) });
}
