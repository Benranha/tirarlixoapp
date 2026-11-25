// Tirar o Lixo - versão Arduino UNO (só botão, por enquanto sem sensor analógico).
// Cada aperto do botão envia a linha "BOTAO" pela serial. Quem decide cheio/vazio é o servidor.
// Ligações: botão entre o pino 2 e GND (pull-up interno). LED da placa acende quando cheia.

#include <Servo.h>

const int PINO_BOTAO = 2;
const int PINO_SERVO = 9;   // sinal do servo (fio laranja/amarelo). VCC no 5V, GND no GND.
Servo servo;                 // servo de rotação contínua: 90 = parado, 0 = um lado, 180 = outro
String comando;
unsigned long servoPararEm = 0; // 0 = sem parada agendada
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

// Mede a tensão de alimentação (VCC) em milivolts usando a referência interna de 1,1V.
long lerVccMv() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  long resultado = ADCL;
  resultado |= ADCH << 8;
  return 1125300L / resultado;
}

void lerComandos() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      comando.trim();
      if (comando.startsWith("GIRAR ")) {           // GIRAR <0..180> <ms>  (ms 0 = até PARAR)
        int esp = comando.indexOf(' ', 6);
        int vel = constrain(comando.substring(6, esp).toInt(), 0, 180);
        long ms = esp > 0 ? comando.substring(esp + 1).toInt() : 0;
        servo.write(vel);
        servoPararEm = ms > 0 ? millis() + ms : 0;
        Serial.print("GIRAR_OK "); Serial.print(vel); Serial.print(' '); Serial.println(ms);
      } else if (comando == "PARAR") {
        servo.write(90); servoPararEm = 0;
        Serial.println("PARAR_OK");
      } else if (comando == "VCC") {
        Serial.print("VCC "); Serial.println(lerVccMv());
      }
      comando = "";
    } else if (comando.length() < 32) comando += c;
  }
}

void loop() {
  lerComandos();
  if (servoPararEm && (long)(millis() - servoPararEm) >= 0) { servo.write(90); servoPararEm = 0; }
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
