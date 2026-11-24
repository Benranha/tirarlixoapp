CREATE TABLE IF NOT EXISTS estado (
  id            integer PRIMARY KEY,
  cheio         boolean NOT NULL DEFAULT false,
  nivel         integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inscricoes (
  endpoint text PRIMARY KEY,
  p256dh   text NOT NULL,
  auth     text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
INSERT INTO estado (id) VALUES (1) ON CONFLICT DO NOTHING;
