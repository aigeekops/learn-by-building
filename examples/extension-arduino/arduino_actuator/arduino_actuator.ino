// Requires the Servo library and separately checked servo power/wiring.
// The example only commands the documented/calibrated center pulse.
#include <Servo.h>
Servo joint;
void setup() { joint.attach(9); joint.writeMicroseconds(1500); }
void loop() { }
