#!/usr/bin/env python3
"""Ponte serial -> servidor, para rodar no Raspberry Pi com o Arduino UNO na USB.

Lê linhas "ESTADO cheio=0|1 nivel=0..100" da serial e faz POST na API.
Configuração pelo arquivo /etc/tirarlixo.env (ou variáveis de ambiente):
  PORTA=/dev/ttyACM0
  API_URL=https://SEU-APP.vercel.app/api/estado
  DEVICE_TOKEN=...
"""
import glob, json, os, re, sys, time, urllib.request, urllib.error
import serial  # pip install pyserial

PADRAO = re.compile(r"^ESTADO cheio=(\d) nivel=(\d+)")

def achar_porta():
    p = os.environ.get("PORTA")
    if p: return p
    for c in sorted(glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*")):
        return c
    return None

def enviar(url, token, cheio, nivel):
    corpo = json.dumps({"cheio": cheio, "nivel": nivel}).encode()
    req = urllib.request.Request(url, data=corpo, method="POST", headers={
        "Content-Type": "application/json", "x-device-token": token})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status, json.loads(r.read() or b"{}")

def main():
    url = os.environ.get("API_URL"); token = os.environ.get("DEVICE_TOKEN")
    if not url or not token:
        print("Defina API_URL e DEVICE_TOKEN", file=sys.stderr); sys.exit(1)
    while True:
        porta = achar_porta()
        if not porta:
            print("Arduino não encontrado, tentando de novo em 5s"); time.sleep(5); continue
        try:
            with serial.Serial(porta, 9600, timeout=5) as s:
                print(f"Lendo {porta} e enviando para {url}", flush=True)
                while True:
                    linha = s.readline().decode(errors="ignore").strip()
                    m = PADRAO.match(linha)
                    if not m: continue
                    cheio, nivel = m.group(1) == "1", int(m.group(2))
                    try:
                        status, resp = enviar(url, token, cheio, nivel)
                        extra = f" ({resp.get('notificados')} notificados)" if resp.get("notificados") else ""
                        print(time.strftime("%H:%M:%S"), {"cheio": cheio, "nivel": nivel}, "->", status, extra, flush=True)
                    except (urllib.error.URLError, OSError) as e:
                        print("Falha ao enviar:", e, flush=True)
        except serial.SerialException as e:
            print("Serial caiu:", e, "- reconectando em 3s", flush=True); time.sleep(3)

if __name__ == "__main__":
    main()
