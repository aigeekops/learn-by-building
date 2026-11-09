const unsigned long intervalMs = 200;
unsigned long last = 0;
bool on = false;
void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  const unsigned long now = millis();
  if ((unsigned long)(now - last) >= intervalMs) {
    last = now; on = !on;
    digitalWrite(LED_BUILTIN, on ? HIGH : LOW);
  }
  // Other non-blocking sensor/state work can run here.
}
