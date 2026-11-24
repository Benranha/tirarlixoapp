// Tirar o Lixo - versão Arduino UNO (só botão, por enquanto sem sensor analógico).
// Envia linhas pela serial: ESTADO cheio=0|1 nivel=0
//
// Apertar o botão alterna entre CHEIA e VAZIA.
// Ligações: botão entre o pino 2 e GND (pull-up interno). LED da placa acende quando cheia.

const int PINO_BOTAO = 2;
const unsigned long DEBOUNCE_MS = 50;

bool cheio = false;
int ultimoBotao = HIGH;
int estadoEstavel = HIGH;
unsigned long ultimaMudancaBotao = 0;

void enviar() {
  Serial.print("ESTADO cheio=");
  Serial.print(cheio ? 1 : 0);
  Serial.println(" nivel=0");
}

void setup() {
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  delay(500);
  ultimoBotao = estadoEstavel = digitalRead(PINO_BOTAO); // ignora o estado inicial do botão
  enviar();
}

void loop() {
  int leitura = digitalRead(PINO_BOTAO);
  if (leitura != ultimoBotao) { ultimaMudancaBotao = millis(); ultimoBotao = leitura; }
  if (millis() - ultimaMudancaBotao > DEBOUNCE_MS && leitura != estadoEstavel) {
    estadoEstavel = leitura;
    if (estadoEstavel == LOW) {      // apertou
      cheio = !cheio;
      digitalWrite(LED_BUILTIN, cheio);
      enviar();
    }
  }
}
