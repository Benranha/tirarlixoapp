import { neon } from "@neondatabase/serverless";

export type Estado = { cheio: boolean; nivel: number; atualizado_em: string };
export type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

const temBanco = !!process.env.DATABASE_URL;
const sql = temBanco ? neon(process.env.DATABASE_URL!) : null;

// Fallback em memória (só para desenvolvimento local sem banco).
const mem = {
  estado: { cheio: false, nivel: 0, atualizado_em: new Date(0).toISOString() } as Estado,
  inscricoes: new Map<string, Inscricao>(),
};

export async function lerEstado(): Promise<Estado> {
  if (!sql) return mem.estado;
  const rows = await sql`SELECT cheio, nivel, atualizado_em FROM estado WHERE id = 1`;
  if (rows.length === 0) return { cheio: false, nivel: 0, atualizado_em: new Date(0).toISOString() };
  const r = rows[0];
  return { cheio: r.cheio, nivel: r.nivel, atualizado_em: new Date(r.atualizado_em).toISOString() };
}

export async function salvarEstado(cheio: boolean, nivel: number): Promise<Estado> {
  if (!sql) {
    mem.estado = { cheio, nivel, atualizado_em: new Date().toISOString() };
    return mem.estado;
  }
  const rows = await sql`
    INSERT INTO estado (id, cheio, nivel, atualizado_em) VALUES (1, ${cheio}, ${nivel}, now())
    ON CONFLICT (id) DO UPDATE SET cheio = EXCLUDED.cheio, nivel = EXCLUDED.nivel, atualizado_em = now()
    RETURNING cheio, nivel, atualizado_em`;
  const r = rows[0];
  return { cheio: r.cheio, nivel: r.nivel, atualizado_em: new Date(r.atualizado_em).toISOString() };
}

export async function salvarInscricao(i: Inscricao) {
  if (!sql) { mem.inscricoes.set(i.endpoint, i); return; }
  await sql`INSERT INTO inscricoes (endpoint, p256dh, auth) VALUES (${i.endpoint}, ${i.keys.p256dh}, ${i.keys.auth})
            ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
}

export async function listarInscricoes(): Promise<Inscricao[]> {
  if (!sql) return [...mem.inscricoes.values()];
  const rows = await sql`SELECT endpoint, p256dh, auth FROM inscricoes`;
  return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
}

export async function removerInscricao(endpoint: string) {
  if (!sql) { mem.inscricoes.delete(endpoint); return; }
  await sql`DELETE FROM inscricoes WHERE endpoint = ${endpoint}`;
}
