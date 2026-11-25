// Tirar o Lixo - versão Arduino UNO (só botão, por enquanto sem sensor analógico).
// Cada aperto do botão envia a linha "BOTAO" pela serial. Quem decide cheio/vazio é o servidor.
// Ligações: botão entre o pino 2 e GND (pull-up interno). LED da placa acende quando cheia.

#include <Servo.h>

const int PINO_BOTAO = 2;
const int PINO_SERVO = 9;   // sinal do servo (fio laranja/amarelo). VCC no 5V, GND no GND.
Servo servo;
String comando;
const unsigned long DEBOUNCE_MS = 50;

int ultimoBotao = HIGH;
int estadoEstavel = HIGH;
unsigned long ultimaMudancaBotao = 0;


void setup() {
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  delay(500);
  ultimoBotao = estadoEstavel = digitalRead(PINO_BOTAO); // ignora o estado inicial do botão
  servo.attach(PINO_SERVO);
  servo.write(90);
  Serial.println("PRONTO");
}

void lerComandos() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      comando.trim();
      if (comando.startsWith("SERVO ")) {
        int a = constrain(comando.substring(6).toInt(), 0, 180);
        servo.write(a);
        Serial.print("SERVO_OK "); Serial.println(a);
      }
      comando = "";
    } else if (comando.length() < 32) comando += c;
  }
}

void loop() {
  lerComandos();
  int leitura = digitalRead(PINO_BOTAO);
  if (leitura != ultimoBotao) { ultimaMudancaBotao = millis(); ultimoBotao = leitura; }
  if (millis() - ultimaMudancaBotao > DEBOUNCE_MS && leitura != estadoEstavel) {
    estadoEstavel = leitura;
    if (estadoEstavel == LOW) {      // apertou
      Serial.println("BOTAO");
      digitalWrite(LED_BUILTIN, HIGH); delay(100); digitalWrite(LED_BUILTIN, LOW);
    }
  }
}
