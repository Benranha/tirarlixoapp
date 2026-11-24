import webpush from "web-push";
import { listarInscricoes, removerInscricao } from "./db";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:contato@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function notificarTodos(titulo: string, corpo: string) {
  const inscricoes = await listarInscricoes();
  const payload = JSON.stringify({ title: titulo, body: corpo, url: "/" });
  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification(i, payload);
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await removerInscricao(i.endpoint);
        else console.error("push falhou", e?.statusCode, e?.body);
      }
    })
  );
  return inscricoes.length;
}
