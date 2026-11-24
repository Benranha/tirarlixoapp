// Ponte serial -> servidor, para testar com o Arduino UNO ligado na USB.
// Uso: PORTA=/dev/cu.usbmodem1101 API_URL=http://localhost:3000/api/estado DEVICE_TOKEN=xxx npm run ponte
// (lê também o arquivo .env.local se existir)
const fs = require("fs");
const path = require("path");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const envFile = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const linha of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const PORTA = process.env.PORTA || "/dev/cu.usbmodem1101";
const API_URL = process.env.API_URL || "http://localhost:3000/api/estado";
const TOKEN = process.env.DEVICE_TOKEN;
if (!TOKEN) { console.error("Defina DEVICE_TOKEN"); process.exit(1); }

const porta = new SerialPort({ path: PORTA, baudRate: 9600 });
const linhas = porta.pipe(new ReadlineParser({ delimiter: "\n" }));
console.log(`Lendo ${PORTA} e enviando para ${API_URL}`);

linhas.on("data", async (linha) => {
  const m = linha.trim().match(/^ESTADO cheio=(\d) nivel=(\d+)/);
  if (!m) return;
  const corpo = { cheio: m[1] === "1", nivel: Number(m[2]) };
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-device-token": TOKEN },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    console.log(new Date().toLocaleTimeString("pt-BR"), JSON.stringify(corpo), "->", r.status, j.notificados ? `(${j.notificados} notificados)` : "");
  } catch (e) {
    console.error("Falha ao enviar:", e.message);
  }
});
porta.on("error", (e) => { console.error("Erro na serial:", e.message); process.exit(1); });
