"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const PASSO = 15;

export default function ServoPage() {
  const [angulo, setAngulo] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    try { setAngulo((await (await fetch("/api/servo", { cache: "no-store" })).json()).angulo); } catch {}
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 3000); return () => clearInterval(t); }, []);

  async function mover(delta: number) {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await fetch("/api/servo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ delta }) });
      if (r.ok) setAngulo((await r.json()).angulo);
    } finally { setOcupado(false); }
  }
  async function irPara(a: number) {
    const r = await fetch("/api/servo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ angulo: a }) });
    if (r.ok) setAngulo((await r.json()).angulo);
  }

  const a = angulo ?? 90;
  return (
    <main>
      <h1>⚙️ Servo</h1>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ position: "relative", width: 200, height: 110, margin: "0 auto 12px", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "200px 200px 0 0", border: "6px solid #2a3a31", borderBottom: 0 }} />
          <div style={{ position: "absolute", left: "50%", bottom: 0, width: 4, height: 90, background: "var(--ok)", borderRadius: 2,
            transformOrigin: "bottom center", transform: `translateX(-50%) rotate(${a - 90}deg)`, transition: "transform .3s" }} />
        </div>
        <div style={{ fontSize: "2.4rem", fontWeight: 700 }}>{angulo === null ? "…" : `${angulo}°`}</div>
        <p className="muted" style={{ marginTop: 4 }}>Passo de {PASSO}°. Vai de 0° a 180°.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button className="primary" style={{ fontSize: "2rem", padding: 24 }} disabled={ocupado || a <= 0} onClick={() => mover(-PASSO)} aria-label="Girar para a esquerda">←</button>
        <button className="primary" style={{ fontSize: "2rem", padding: 24 }} disabled={ocupado || a >= 180} onClick={() => mover(PASSO)} aria-label="Girar para a direita">→</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <button onClick={() => irPara(0)}>0°</button>
        <button onClick={() => irPara(90)}>90°</button>
        <button onClick={() => irPara(180)}>180°</button>
      </div>
      <p className="muted" style={{ textAlign: "center" }}><Link href="/" style={{ color: "var(--fg)" }}>← Voltar para a lixeira</Link></p>
    </main>
  );
}
