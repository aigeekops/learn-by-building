// Button between pin 2 and GND. Uno R3 built-in LED shows pressed state.
const byte buttonPin = 2;
void setup() {
  pinMode(buttonPin, INPUT_PULLUP); pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  const bool pressed = digitalRead(buttonPin) == LOW;
  digitalWrite(LED_BUILTIN, pressed ? HIGH : LOW);
  Serial.println(pressed ? 1 : 0); delay(20);
}
