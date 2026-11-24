#!/bin/bash
# Rode no Raspberry Pi, dentro desta pasta:  sudo bash instalar.sh
set -e
sudo apt-get install -y python3-serial
sudo mkdir -p /opt/tirarlixo
sudo cp ponte.py /opt/tirarlixo/ponte.py
if [ ! -f /etc/tirarlixo.env ]; then
  read -p "URL da API (ex.: https://seu-app.vercel.app/api/estado): " URL
  read -p "DEVICE_TOKEN: " TOKEN
  printf "API_URL=%s\nDEVICE_TOKEN=%s\n" "$URL" "$TOKEN" | sudo tee /etc/tirarlixo.env >/dev/null
  sudo chmod 600 /etc/tirarlixo.env
fi
sudo usermod -aG dialout pi || true
sudo cp tirarlixo.service /etc/systemd/system/tirarlixo.service
sudo systemctl daemon-reload
sudo systemctl enable --now tirarlixo
echo "Pronto. Acompanhe com: journalctl -u tirarlixo -f"
