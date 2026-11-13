"""Install original practicum guides without adding duplicate courses or plan units."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent


def transform(html):
    data = json.loads((ROOT / 'config/robot_practicums.json').read_text())
    if len(data['practicums']) != 2 or len(data['so101']['rows']) != 18:
        raise ValueError('实训目录或 SO-101 资料基线不完整')
    html = re.sub(r'/\* ROBOT_PRACTICUMS_START \*/.*?/\* ROBOT_PRACTICUMS_END \*/\n?', '', html, flags=re.S)
    html = re.sub(r'<(?:script|style) id="robot-practicums-(?:runtime|style)">.*?</(?:script|style)>\n?', '', html, flags=re.S)
    marker = '  render();\n  if(globalThis.Tweak)'
    if html.count(marker) != 1:
        raise ValueError('实训接入启动位置缺失或重复')
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    runtime = 'globalThis.RobotPracticumData=' + payload + ';\n' + (ROOT / 'web/robot-practicums.js').read_text()
    html = html.replace('</head>', '<style id="robot-practicums-style">' + (ROOT / 'web/robot-practicums.css').read_text() + '</style>\n<script id="robot-practicums-runtime">' + runtime.replace('</script', '<\\/script') + '</script>\n</head>', 1)
    adapter = (ROOT / 'web/robot-practicums-integration.js').read_text()
    return html.replace(marker, '/* ROBOT_PRACTICUMS_START */\n' + adapter + '\n/* ROBOT_PRACTICUMS_END */\n' + marker, 1)
