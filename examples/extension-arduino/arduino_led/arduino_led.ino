// Uno R3: pin 9 -> resistor -> LED -> GND; check polarity and ratings first.
const byte ledPin = 9;
void setup() { pinMode(ledPin, OUTPUT); }
void loop() {
  digitalWrite(ledPin, HIGH); delay(500);
  digitalWrite(ledPin, LOW); delay(500);
}
