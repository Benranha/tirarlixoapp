# Tirar o Lixo

Lixeira que avisa no celular quando está cheia. Um botão na placa alterna entre "cheio" e "vazio" e dispara uma notificação push "O lixo tá cheio". Um sensor analógico mostra na página quanto a lixeira já encheu.

## Como funciona

```
[placa: botão + analógico] --Wi-Fi--> [API na Vercel] --push--> [celular com o app instalado]
```

- `firmware/esp32/` é a versão final: a placa manda o estado direto pela internet, sem cabo.
- `firmware/uno/` é a versão de teste com o Arduino UNO ligado na USB. O script `ponte/ponte.js` lê a serial e repassa para a API.
- `app/` é o web app (Next.js). Instalável no celular como PWA, com notificações push.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # ou use o .env.local já gerado
npm run dev                  # http://localhost:3000
```

Sem `DATABASE_URL` o app guarda o estado em memória (serve para testar). Para produção, crie um banco Postgres no Neon, rode `schema.sql` nele e defina `DATABASE_URL`.

### Testar com o UNO

1. Botão entre o pino 2 e GND. Potenciômetro ou sensor no A0.
2. Gravar o firmware:
   ```bash
   arduino-cli compile --fqbn arduino:avr:uno firmware/uno
   arduino-cli upload -p /dev/cu.usbmodem1101 --fqbn arduino:avr:uno firmware/uno
   ```
3. Em outro terminal: `npm run ponte`

### Simular a placa sem hardware

```bash
curl -X POST localhost:3000/api/estado -H 'content-type: application/json' \
  -H "x-device-token: $DEVICE_TOKEN" -d '{"cheio":true,"nivel":80}'
```

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Chaves das notificações push. Gere com `npm run vapid`. |
| `VAPID_SUBJECT` | `mailto:` do responsável pelo app. |
| `DEVICE_TOKEN` | Senha que a placa envia no header `x-device-token`. |
| `DATABASE_URL` | Conexão Postgres (Neon). Opcional em desenvolvimento. |

## Publicar na Vercel

```bash
vercel link
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY   # repita para cada variável
vercel --prod
```

Depois, no `firmware/esp32/esp32.ino`, preencha o Wi-Fi, a URL do app e o `DEVICE_TOKEN`.

## API

- `GET /api/estado` devolve `{ cheio, nivel, atualizado_em }`.
- `POST /api/estado` (header `x-device-token`) recebe `{ cheio: boolean, nivel: 0..100 }`. Quando `cheio` muda de falso para verdadeiro, envia push a todos os aparelhos inscritos.
- `POST /api/inscrever` registra um aparelho para push.
- `POST /api/testar-push` envia uma notificação de teste.

## Notificações no iPhone

O iOS só permite push em páginas adicionadas à tela inicial (Compartilhar > Adicionar à Tela de Início). Abra o app por esse ícone antes de tocar em "Ativar notificações".
