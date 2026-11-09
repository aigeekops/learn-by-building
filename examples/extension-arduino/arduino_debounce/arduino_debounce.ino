const byte buttonPin = 2;
const unsigned long quietMs = 20;
int candidate = HIGH, stable = HIGH;
unsigned long since = 0;
bool on = false;
void setup() { pinMode(buttonPin, INPUT_PULLUP); pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  const unsigned long now = millis();
  const int raw = digitalRead(buttonPin);
  if (raw != candidate) { candidate = raw; since = now; }
  if (candidate != stable && (unsigned long)(now - since) >= quietMs) {
    stable = candidate;
    if (stable == LOW) { on = !on; digitalWrite(LED_BUILTIN, on ? HIGH : LOW); }
  }
}
