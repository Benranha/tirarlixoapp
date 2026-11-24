// Tirar o Lixo - versão Arduino UNO (ligado na USB do Raspberry Pi ou do computador).
// Envia linhas pela serial: ESTADO cheio=0|1 nivel=0..100
//
// Regras:
//   - Apertar o botão marca a lixeira como CHEIA (não desmarca).
//   - A lixeira volta a VAZIA sozinha quando o sensor fica abaixo de LIMIAR_VAZIO
//     por TEMPO_VAZIO_MS seguidos (a lixeira foi esvaziada).
//
// Ligações:
//   Botão: entre o pino 2 e GND (usa pull-up interno).
//   Analógico (potenciômetro ou sensor): sinal no A0, VCC em 5V, GND em GND.
//   LED da placa (pino 13) acende quando "cheio".

const int PINO_BOTAO = 2;
const int PINO_ANALOGICO = A0;
const int LIMIAR_VAZIO = 20;                 // % abaixo do qual considera esvaziada
const unsigned long TEMPO_VAZIO_MS = 3000;   // precisa ficar baixo por 3 s
const unsigned long DEBOUNCE_MS = 50;
const unsigned long INTERVALO_ENVIO_MS = 2000;

bool cheio = false;
int ultimoBotao = HIGH;
int estadoEstavel = HIGH;
unsigned long ultimaMudancaBotao = 0;
unsigned long ultimoEnvio = 0;
unsigned long inicioBaixo = 0;
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
  int nivel = lerNivel();

  // Botão: marca como cheia.
  int leitura = digitalRead(PINO_BOTAO);
  if (leitura != ultimoBotao) { ultimaMudancaBotao = millis(); ultimoBotao = leitura; }
  if (millis() - ultimaMudancaBotao > DEBOUNCE_MS && leitura != estadoEstavel) {
    estadoEstavel = leitura;
    if (estadoEstavel == LOW && !cheio) {
      cheio = true;
      digitalWrite(LED_BUILTIN, HIGH);
      inicioBaixo = 0;
      enviar(nivel);
    }
  }

  // Sensor: reseta sozinho quando fica baixo por um tempo.
  if (cheio) {
    if (nivel < LIMIAR_VAZIO) {
      if (inicioBaixo == 0) inicioBaixo = millis();
      else if (millis() - inicioBaixo >= TEMPO_VAZIO_MS) {
        cheio = false;
        digitalWrite(LED_BUILTIN, LOW);
        inicioBaixo = 0;
        enviar(nivel);
      }
    } else {
      inicioBaixo = 0;
    }
  }

  // Envio periódico do nível quando muda.
  if (millis() - ultimoEnvio > INTERVALO_ENVIO_MS && abs(nivel - ultimoNivelEnviado) >= 3) enviar(nivel);
}
