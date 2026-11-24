// Tirar o Lixo - versão ESP32 (final, sem cabo). Mesma lógica do UNO,
// mas envia direto para o servidor via Wi-Fi.
//
// Ligações:
//   Botão: entre o GPIO 4 e GND (pull-up interno).
//   Analógico: sinal no GPIO 34 (só entrada), VCC em 3V3, GND em GND.
//   LED da placa (GPIO 2) acende quando "cheio".
//
// Instalação do core:  arduino-cli core install esp32:esp32
// Compilar:            arduino-cli compile --fqbn esp32:esp32:esp32 firmware/esp32
// Enviar:              arduino-cli upload -p /dev/cu.usbserial-XXXX --fqbn esp32:esp32:esp32 firmware/esp32

#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID  = "NOME_DA_SUA_REDE";
const char* WIFI_SENHA = "SENHA_DA_REDE";
const char* URL_API    = "https://SEU-APP.vercel.app/api/estado";
const char* TOKEN      = "COLE_AQUI_O_DEVICE_TOKEN";

const int PINO_BOTAO = 4;
const int PINO_ANALOGICO = 34;
const int PINO_LED = 2;
const unsigned long DEBOUNCE_MS = 50;
const unsigned long INTERVALO_ENVIO_MS = 15000;

bool cheio = false;
int ultimoBotao = HIGH;
unsigned long ultimaMudancaBotao = 0;
unsigned long ultimoEnvio = 0;
int ultimoNivelEnviado = -1;

int lerNivel() {
  long soma = 0;
  for (int i = 0; i < 8; i++) soma += analogRead(PINO_ANALOGICO);
  return map(soma / 8, 0, 4095, 0, 100);
}

void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  Serial.print("Conectando ao Wi-Fi");
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) { delay(500); Serial.print("."); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " ok" : " falhou");
}

void enviar(int nivel) {
  conectarWifi();
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(URL_API);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", TOKEN);
  String corpo = String("{\"cheio\":") + (cheio ? "true" : "false") + ",\"nivel\":" + nivel + "}";
  int codigo = http.POST(corpo);
  Serial.printf("POST %s -> %d\n", corpo.c_str(), codigo);
  http.end();
  ultimoEnvio = millis();
  ultimoNivelEnviado = nivel;
}

void setup() {
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  pinMode(PINO_LED, OUTPUT);
  Serial.begin(115200);
  conectarWifi();
  enviar(lerNivel());
}

void loop() {
  int leitura = digitalRead(PINO_BOTAO);
  if (leitura != ultimoBotao) { ultimaMudancaBotao = millis(); ultimoBotao = leitura; }
  static int estadoEstavel = HIGH;
  if (millis() - ultimaMudancaBotao > DEBOUNCE_MS && leitura != estadoEstavel) {
    estadoEstavel = leitura;
    if (estadoEstavel == LOW) {
      cheio = !cheio;
      digitalWrite(PINO_LED, cheio);
      enviar(lerNivel());
    }
  }
  int nivel = lerNivel();
  if (millis() - ultimoEnvio > INTERVALO_ENVIO_MS && abs(nivel - ultimoNivelEnviado) >= 3) enviar(nivel);
}
