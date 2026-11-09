// Bench-only logic: Serial sends distance_cm then newline; -1 means invalid.
// Pin 9 drives an LED with a resistor for this exercise, not a motor.
const byte outputPin = 9, enablePin = 2;
char digits[12]; byte used = 0; bool malformed = false;
long distanceCm = -1;
unsigned long observedAt = 0;
bool observed = false;
void setup() { pinMode(outputPin, OUTPUT); pinMode(enablePin, INPUT_PULLUP); Serial.begin(9600); }
void loop() {
  while (Serial.available()) {
    const char c = (char)Serial.read();
    if (c == '\n') {
      if (used == 0) malformed = true;
      long value = 0; bool negative = used > 0 && digits[0] == '-';
      if (negative && used == 1) malformed = true;
      for (byte i = negative ? 1 : 0; i < used; ++i) {
        if (digits[i] < '0' || digits[i] > '9') { malformed = true; break; }
        value = value * 10 + (digits[i] - '0');
        if (value > 1000) { malformed = true; break; }
      }
      distanceCm = malformed || negative ? -1 : value;
      observed = true; observedAt = millis(); used = 0; malformed = false;
    } else if (c != '\r') {
      if (used < sizeof(digits)) digits[used++] = c; else malformed = true;
    }
  }
  const unsigned long now = millis();
  const bool fresh = observed && (unsigned long)(now - observedAt) <= 300;
  const bool enabled = digitalRead(enablePin) == LOW;
  analogWrite(outputPin, fresh && enabled && distanceCm >= 15 ? 100 : 0);
}
