#!/usr/bin/env python3
"""Ponte serial -> servidor, para rodar no Raspberry Pi com o Arduino UNO na USB.

Lê linhas "ESTADO cheio=0|1 nivel=0..100" da serial e faz POST na API.
Configuração pelo arquivo /etc/tirarlixo.env (ou variáveis de ambiente):
  PORTA=/dev/ttyACM0
  API_URL=https://SEU-APP.vercel.app/api/estado
  DEVICE_TOKEN=...
"""
import glob, json, os, re, sys, time, threading, urllib.request, urllib.error
import serial  # pip install pyserial

PADRAO = re.compile(r"^ESTADO cheio=(\d) nivel=(\d+)")
BOTAO = re.compile(r"^BOTAO")

def achar_porta():
    p = os.environ.get("PORTA")
    if p: return p
    for c in sorted(glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*")):
        return c
    return None

def enviar(url, token, corpo):
    corpo = json.dumps(corpo).encode()
    req = urllib.request.Request(url, data=corpo, method="POST", headers={
        "Content-Type": "application/json", "x-device-token": token})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status, json.loads(r.read() or b"{}")

def consultar_servo(url_estado):
    url = url_estado.replace("/api/estado", "/api/servo")
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read())

def laco_servo(s, url_estado, parar):
    """Consulta o servidor a cada segundo e executa comandos novos do servo 360."""
    ultimo_seq = None
    while not parar.is_set():
        try:
            c = consultar_servo(url_estado)
            seq = int(c.get("seq", 0))
            if ultimo_seq is None:
                ultimo_seq = seq          # ignora comandos antigos ao iniciar
            elif seq > ultimo_seq:
                ultimo_seq = seq
                acao, ms = c.get("acao"), int(c.get("ms", 0))
                if acao == "parar": linha = "PARAR\n"
                else: linha = f"GIRAR {0 if acao == 'esq' else 180} {ms}\n"
                s.write(linha.encode()); s.flush()
                print(time.strftime("%H:%M:%S"), "servo:", linha.strip(), flush=True)
        except Exception as e:
            print("servo: falha ao consultar:", e, flush=True)
        parar.wait(1.0)

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
                time.sleep(2)  # espera o Arduino reiniciar ao abrir a porta
                parar = threading.Event()
                threading.Thread(target=laco_servo, args=(s, url, parar), daemon=True).start()
                while True:
                    linha = s.readline().decode(errors="ignore").strip()
                    if BOTAO.match(linha):
                        corpo = {"evento": "botao"}
                    else:
                        m = PADRAO.match(linha)
                        if not m: continue
                        corpo = {"cheio": m.group(1) == "1", "nivel": int(m.group(2))}
                    try:
                        status, resp = enviar(url, token, corpo)
                        extra = f" ({resp.get('notificados')} notificados)" if resp.get("notificados") else ""
                        print(time.strftime("%H:%M:%S"), corpo, "->", status, "cheio=" + str(resp.get("cheio")), extra, flush=True)
                    except (urllib.error.URLError, OSError) as e:
                        print("Falha ao enviar:", e, flush=True)
        except serial.SerialException as e:
            try: parar.set()
            except NameError: pass
            print("Serial caiu:", e, "- reconectando em 3s", flush=True); time.sleep(3)

if __name__ == "__main__":
    main()
