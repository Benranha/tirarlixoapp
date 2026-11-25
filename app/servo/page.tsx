"use client";
import { useState } from "react";
import Link from "next/link";

const TEMPOS = [
  { rotulo: "0,5 s", ms: 500 },
  { rotulo: "1 s", ms: 1000 },
  { rotulo: "3 s", ms: 3000 },
  { rotulo: "Contínuo", ms: 0 },
];

export default function ServoPage() {
  const [ms, setMs] = useState(500);
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState("");

  async function enviar(acao: "esq" | "dir" | "parar") {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await fetch("/api/servo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao, ms: acao === "parar" ? 0 : ms }) });
      setMsg(r.ok
        ? acao === "parar" ? "Parando." : `Girando para a ${acao === "esq" ? "esquerda" : "direita"}${ms ? ` por ${ms / 1000} s` : " até mandar parar"}.`
        : "Falhou ao enviar.");
    } finally { setOcupado(false); }
  }

  return (
    <main>
      <h1>⚙️ Servo 360°</h1>
      <div className="card">
        <p className="muted" style={{ margin: "0 0 10px" }}>Tempo de cada toque</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {TEMPOS.map((t) => (
            <button key={t.ms} className={ms === t.ms ? "primary" : ""} onClick={() => setMs(t.ms)}>{t.rotulo}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button className="primary" style={{ fontSize: "2.2rem", padding: 28 }} disabled={ocupado} onClick={() => enviar("esq")} aria-label="Girar para a esquerda">←</button>
        <button className="primary" style={{ fontSize: "2.2rem", padding: 28 }} disabled={ocupado} onClick={() => enviar("dir")} aria-label="Girar para a direita">→</button>
      </div>
      <button style={{ background: "var(--bad)", fontSize: "1.1rem" }} disabled={ocupado} onClick={() => enviar("parar")}>■ Parar</button>
      {msg && <p className="muted" style={{ textAlign: "center", margin: 0 }}>{msg}</p>}
      <p className="muted" style={{ textAlign: "center" }}>Leva até 1 segundo para a placa receber o comando.</p>
      <p className="muted" style={{ textAlign: "center" }}><Link href="/" style={{ color: "var(--fg)" }}>← Voltar para a lixeira</Link></p>
    </main>
  );
}
