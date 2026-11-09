// Uno R3 pin 9 PWM; LED needs its own series resistor.
const byte pwmPin = 9;
const byte level = 128;
void setup() { pinMode(pwmPin, OUTPUT); analogWrite(pwmPin, level); }
void loop() { }
