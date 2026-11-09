"""Desktop C++ syntax check only. This does not compile an AVR target or use hardware."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def check():
    compiler = shutil.which('clang++') or shutil.which('g++')
    if not compiler:
        raise RuntimeError('No desktop C++ compiler available')
    results = []
    with tempfile.TemporaryDirectory(prefix='extension-arduino-syntax-') as temporary:
        work = Path(temporary)
        (work / 'Arduino.h').write_text('''#pragma once
using byte = unsigned char;
constexpr int HIGH=1, LOW=0, INPUT_PULLUP=2, OUTPUT=1, LED_BUILTIN=13, A0=14;
void pinMode(int,int); void digitalWrite(int,int); int digitalRead(int);
int analogRead(int); void analogWrite(int,int); void delay(unsigned long);
unsigned long millis();
struct SerialApi { void begin(unsigned long); int available(); int read();
  void print(int); void print(char); void println(int); void println(float,int); };
extern SerialApi Serial;
''')
        (work / 'Servo.h').write_text('class Servo { public: void attach(int); void writeMicroseconds(int); };\n')
        for sketch in sorted((ROOT / 'examples/extension-arduino').glob('*/*.ino')):
            completed = subprocess.run([compiler, '-std=c++11', '-x', 'c++', '-fsyntax-only',
                                        '-include', str(work / 'Arduino.h'), '-I', str(work), str(sketch)],
                                       capture_output=True, text=True, check=False)
            if completed.returncode:
                raise RuntimeError(str(sketch) + '\n' + completed.stderr)
            results.append({'sketch': str(sketch.relative_to(ROOT)), 'desktop_syntax': 'passed'})
    return {'compiler': compiler, 'checked_sketches': len(results), 'results': results,
            'avr_target_compilation': 'not run', 'hardware_execution': 'not run',
            'scope': 'Desktop C++ syntax with declaration-only Arduino/Servo shims; not SDK validation.'}


if __name__ == '__main__':
    print(json.dumps(check(), ensure_ascii=False, indent=2))
