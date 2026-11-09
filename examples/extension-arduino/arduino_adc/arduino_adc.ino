// Uno R3 only: input must stay within board limits; measure Vref independently.
const float measuredReference = 5.0f;
void setup() { Serial.begin(9600); }
void loop() {
  const int raw = analogRead(A0);
  const float endpointVolts = raw * measuredReference / 1023.0f;
  Serial.print(raw); Serial.print(','); Serial.println(endpointVolts, 4);
  delay(100);
}
