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
  const [instalado, setInstalado] = useState(true);
  const [ios, setIos] = useState(false);

  async function carregar() {
    try { setEstado(await (await fetch("/api/estado", { cache: "no-store" })).json()); } catch {}
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 5000);
    const ehIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIos(ehIos); setInstalado(!ehIos || standalone);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setSuporta(false); return () => clearInterval(t); }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setInscrito(!!sub);
    });
    return () => clearInterval(t);
  }, []);

  async function ativarNotificacoes() {
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setMsg("Permissão negada. Libere as notificações nos ajustes do navegador e tente de novo."); return; }
      const reg = await navigator.serviceWorker.ready;
      const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(chave) });
      const r = await fetch("/api/inscrever", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
      if (r.ok) { setInscrito(true); setMsg("Pronto. Você vai receber o aviso quando o lixo encher."); }
      else setMsg(`O servidor recusou a inscrição (${r.status}).`);
    } catch (e: any) {
      setMsg(`Falhou: ${e?.message || e}`);
    }
  }

  async function marcar(cheio: boolean) {
    const r = await fetch("/api/marcar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cheio }) });
    if (r.ok) setEstado(await r.json());
  }

  async function testar() {
    const r = await (await fetch("/api/testar-push", { method: "POST" })).json();
    setMsg(`Notificação de teste enviada para ${r.notificados} aparelho(s).`);
  }

  const classe = estado?.cheio ? "bad" : "ok";
  const texto = !estado ? "Carregando…" : estado.cheio ? "O lixo tá cheio" : "Tudo certo";

  return (
    <main>
      <h1>🗑️ Tirar o Lixo</h1>
      <div className={`status ${classe}`}>{texto}</div>
      {estado && (estado.cheio
        ? <button className="primary" onClick={() => marcar(false)}>Esvaziei o lixo</button>
        : <button onClick={() => marcar(true)}>Marcar como cheio</button>)}
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          {estado && estado.atualizado_em !== new Date(0).toISOString()
            ? `Atualizado ${new Date(estado.atualizado_em).toLocaleString("pt-BR")}`
            : "Aguardando a primeira leitura da placa."}
        </p>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!instalado ? (
          <p className="muted" style={{ margin: 0 }}>
            No iPhone as notificações só funcionam com o app instalado. Toque em <strong>Compartilhar</strong> (quadrado com seta),
            depois em <strong>Adicionar à Tela de Início</strong>, e abra o app pelo ícone novo.
          </p>
        ) : !suporta ? (
          <p className="muted" style={{ margin: 0 }}>Este navegador não suporta notificações push.{ios ? " Atualize o iOS para 16.4 ou mais novo." : ""}</p>
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
