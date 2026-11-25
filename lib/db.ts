import { neon } from "@neondatabase/serverless";

export type Estado = { cheio: boolean; nivel: number; atualizado_em: string };
export type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

const temBanco = !!process.env.DATABASE_URL;
const sql = temBanco ? neon(process.env.DATABASE_URL!) : null;

// Cria as tabelas na primeira chamada (uma vez por instância).
let schemaPronto: Promise<void> | null = null;
function garantirSchema() {
  if (!sql) return Promise.resolve();
  if (!schemaPronto) {
    schemaPronto = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS estado (
        id integer PRIMARY KEY, cheio boolean NOT NULL DEFAULT false,
        nivel integer NOT NULL DEFAULT 0, atualizado_em timestamptz NOT NULL DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS servo (id integer PRIMARY KEY, angulo integer NOT NULL DEFAULT 90)`;
      await sql`CREATE TABLE IF NOT EXISTS inscricoes (
        endpoint text PRIMARY KEY, p256dh text NOT NULL, auth text NOT NULL,
        criado_em timestamptz NOT NULL DEFAULT now())`;
    })().catch((e) => { schemaPronto = null; throw e; });
  }
  return schemaPronto;
}

// Fallback em memória (só para desenvolvimento local sem banco).
const mem = {
  estado: { cheio: false, nivel: 0, atualizado_em: new Date(0).toISOString() } as Estado,
  inscricoes: new Map<string, Inscricao>(),
  servo: 90,
};

export async function lerEstado(): Promise<Estado> {
  await garantirSchema();
  if (!sql) return mem.estado;
  const rows = await sql`SELECT cheio, nivel, atualizado_em FROM estado WHERE id = 1`;
  if (rows.length === 0) return { cheio: false, nivel: 0, atualizado_em: new Date(0).toISOString() };
  const r = rows[0];
  return { cheio: r.cheio, nivel: r.nivel, atualizado_em: new Date(r.atualizado_em).toISOString() };
}

export async function salvarEstado(cheio: boolean, nivel: number): Promise<Estado> {
  await garantirSchema();
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
  await garantirSchema();
  if (!sql) { mem.inscricoes.set(i.endpoint, i); return; }
  await sql`INSERT INTO inscricoes (endpoint, p256dh, auth) VALUES (${i.endpoint}, ${i.keys.p256dh}, ${i.keys.auth})
            ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`;
}

export async function listarInscricoes(): Promise<Inscricao[]> {
  await garantirSchema();
  if (!sql) return [...mem.inscricoes.values()];
  const rows = await sql`SELECT endpoint, p256dh, auth FROM inscricoes`;
  return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
}

export async function removerInscricao(endpoint: string) {
  await garantirSchema();
  if (!sql) { mem.inscricoes.delete(endpoint); return; }
  await sql`DELETE FROM inscricoes WHERE endpoint = ${endpoint}`;
}

export async function lerServo(): Promise<number> {
  await garantirSchema();
  if (!sql) return mem.servo;
  const rows = await sql`SELECT angulo FROM servo WHERE id = 1`;
  return rows.length ? rows[0].angulo : 90;
}

export async function salvarServo(angulo: number): Promise<number> {
  await garantirSchema();
  const a = Math.max(0, Math.min(180, Math.round(angulo)));
  if (!sql) { mem.servo = a; return a; }
  await sql`INSERT INTO servo (id, angulo) VALUES (1, ${a}) ON CONFLICT (id) DO UPDATE SET angulo = EXCLUDED.angulo`;
  return a;
}
