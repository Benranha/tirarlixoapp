"use client";
import { useEffect, useState } from "react";

type Estado = { cheio: boolean; nivel: number; atualizado_em: string };

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function Page() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [inscrito, setInscrito] = useState(false);
  const [suporta, setSuporta] = useState(true);
  const [msg, setMsg] = useState("");

  async function carregar() {
    try { setEstado(await (await fetch("/api/estado", { cache: "no-store" })).json()); } catch {}
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 5000);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setSuporta(false); return () => clearInterval(t); }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setInscrito(!!sub);
    });
    return () => clearInterval(t);
  }, []);

  async function ativarNotificacoes() {
    setMsg("");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setMsg("Permissão negada. Libere as notificações nas configurações do navegador."); return; }
    const reg = await navigator.serviceWorker.ready;
    const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(chave) });
    const r = await fetch("/api/inscrever", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
    if (r.ok) { setInscrito(true); setMsg("Pronto. Você vai receber o aviso quando o lixo encher."); }
    else setMsg("Não consegui registrar este aparelho.");
  }

  async function testar() {
    const r = await (await fetch("/api/testar-push", { method: "POST" })).json();
    setMsg(`Notificação de teste enviada para ${r.notificados} aparelho(s).`);
  }

  const nivel = estado?.nivel ?? 0;
  const classe = estado?.cheio ? "bad" : nivel >= 75 ? "warn" : "ok";
  const texto = !estado ? "Carregando…" : estado.cheio ? "O lixo tá cheio" : nivel >= 75 ? "Quase cheio" : "Tudo certo";
  const cor = classe === "bad" ? "var(--bad)" : classe === "warn" ? "var(--warn)" : "var(--ok)";

  return (
    <main>
      <h1>🗑️ Tirar o Lixo</h1>
      <div className={`status ${classe}`}>{texto}</div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Nível da lixeira</span><strong>{nivel}%</strong>
        </div>
        <div className="barra"><div style={{ width: `${nivel}%`, background: cor }} /></div>
        <p className="muted">
          {estado && estado.atualizado_em !== new Date(0).toISOString()
            ? `Atualizado ${new Date(estado.atualizado_em).toLocaleString("pt-BR")}`
            : "Aguardando a primeira leitura da placa."}
        </p>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!suporta ? (
          <p className="muted">Este navegador não suporta notificações push. No iPhone, adicione o app à tela inicial primeiro.</p>
        ) : inscrito ? (
          <>
            <p className="muted" style={{ margin: 0 }}>Notificações ativas neste aparelho.</p>
            <button onClick={testar}>Enviar notificação de teste</button>
          </>
        ) : (
          <button className="primary" onClick={ativarNotificacoes}>Ativar notificações</button>
        )}
        {msg && <p className="muted" style={{ margin: 0 }}>{msg}</p>}
      </div>
    </main>
  );
}
