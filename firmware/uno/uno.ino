// Tirar o Lixo - versão Arduino UNO (teste via USB).
// A placa envia linhas pela serial: ESTADO cheio=0|1 nivel=0..100
// O script ponte/ponte.js no computador repassa para o servidor.
//
// Ligações:
//   Botão: entre o pino 2 e GND (usa pull-up interno).
//   Analógico (potenciômetro ou sensor): sinal no A0, VCC em 5V, GND em GND.
//   LED da placa (pino 13) acende quando "cheio".

const int PINO_BOTAO = 2;
const int PINO_ANALOGICO = A0;
const unsigned long DEBOUNCE_MS = 50;
const unsigned long INTERVALO_ENVIO_MS = 2000;

bool cheio = false;
int ultimoBotao = HIGH;
unsigned long ultimaMudancaBotao = 0;
unsigned long ultimoEnvio = 0;
int ultimoNivelEnviado = -1;

int lerNivel() {
  long soma = 0;
  for (int i = 0; i < 8; i++) soma += analogRead(PINO_ANALOGICO);
  return map(soma / 8, 0, 1023, 0, 100);
}

void enviar(int nivel) {
  Serial.print("ESTADO cheio=");
  Serial.print(cheio ? 1 : 0);
  Serial.print(" nivel=");
  Serial.println(nivel);
  ultimoEnvio = millis();
  ultimoNivelEnviado = nivel;
}

void setup() {
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  delay(300);
  enviar(lerNivel());
}

void loop() {
  int leitura = digitalRead(PINO_BOTAO);
  if (leitura != ultimoBotao) {
    ultimaMudancaBotao = millis();
    ultimoBotao = leitura;
  }
  static int estadoEstavel = HIGH;
  if (millis() - ultimaMudancaBotao > DEBOUNCE_MS && leitura != estadoEstavel) {
    estadoEstavel = leitura;
    if (estadoEstavel == LOW) {          // botão apertado
      cheio = !cheio;                     // alterna cheio / vazio
      digitalWrite(LED_BUILTIN, cheio);
      enviar(lerNivel());
    }
  }

  int nivel = lerNivel();
  if (millis() - ultimoEnvio > INTERVALO_ENVIO_MS && abs(nivel - ultimoNivelEnviado) >= 3) {
    enviar(nivel);
  }
}
