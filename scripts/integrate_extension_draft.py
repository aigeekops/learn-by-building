#!/usr/bin/env python3
"""Integrate ten original course companions, preserving existing public identities."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
MODULES = ('cs234', 'bonn', 'manipulation', 'nav2', 'moveit', 'cs224r',
           'underactuated', 'cs231n', 'arduino', 'lerobot')
START = '/* EXTENSION_DRAFT_START */'
END = '/* EXTENSION_DRAFT_END */'
RUNTIME = r'<!-- EXTENSION_RUNTIME_START -->.*?<!-- EXTENSION_RUNTIME_END -->\n?'


def catalog():
    data = {'checked': '2026-11-09', 'courses': [], 'lessons': [], 'sources': {},
            'policy': '本站原创中文主题选编；各课按实际公开版本定位。算例、代码与独立任务分别核对，未制作的原课范围保留说明。'}
    existing_ids = set()
    for name in ('ai_courses', 'foundation_courses', 'application_courses'):
        existing = json.loads((ROOT / 'config' / (name + '.json')).read_text())
        existing_ids.update(l['id'] for l in existing['lessons'])
    for name in MODULES:
        module = json.loads((ROOT / 'config' / f'extension_{name}.json').read_text())
        if module['course']['id'] != name or len(module['lessons']) != 8:
            raise ValueError('新增课程身份或讲次缺失：' + name)
        if data['sources'].keys() & module['sources'].keys():
            raise ValueError('来源身份重复：' + name)
        data['courses'].append(module['course'])
        data['lessons'].extend(module['lessons'])
        data['sources'].update(module['sources'])
    ids = [l['id'] for l in data['lessons']]
    if len(ids) != len(set(ids)) or set(ids) & existing_ids:
        raise ValueError('新增讲次覆盖既有身份')
    for lesson in data['lessons']:
        if lesson['course'] not in MODULES or any(s not in data['sources'] for s in lesson['sources']):
            raise ValueError('新增讲次归属或来源不匹配：' + lesson['id'])
        if not lesson['sections'] or len(lesson['explanation']) < 3:
            raise ValueError('新增讲次正文缺失：' + lesson['id'])
        if any(b['lesson'] not in set(ids) | existing_ids for b in lesson['bridges']):
            raise ValueError('跨课连接无效：' + lesson['id'])
        example = ROOT / 'examples/extension-courses' / (lesson['id'] + '.cjs')
        if not example.is_file() or not any(s.get('code') == example.read_text() for s in lesson['sections']):
            raise ValueError('页面代码与本地例程不一致：' + lesson['id'])
    return data


def transform(html, data=None):
    data = data or catalog()
    if 'AI_DRAFT_INTEGRATION_START' not in html:
        raise ValueError('新增课需要已有的统一阅读器')
    pattern = re.escape(START) + r'.*?' + re.escape(END) + r'\n?'
    if len(re.findall(pattern, html, flags=re.S)) > 1:
        raise ValueError('新增课程接入重复')
    html = re.sub(pattern, '', html, flags=re.S)
    html = re.sub(RUNTIME, '', html, flags=re.S)
    marker = '  const lessonInfo = {'
    if html.count(marker) != 1:
        raise ValueError('新增课程接入位置不唯一')
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    adapter = (ROOT / 'web/extension-draft-integration.js').read_text().replace('__EXTENSION_DATA__', encoded)
    html = html.replace(marker, START + '\n' + adapter + '\n' + END + '\n' + marker, 1)
    runtime = '<!-- EXTENSION_RUNTIME_START -->\n'
    for name in ('extension-course-models.js', 'extension-course-scenes.js'):
        runtime += '<script>\n' + (ROOT / 'web' / name).read_text().replace('</script', '<\\/script') + '\n</script>\n'
    runtime += '<style>\n' + (ROOT / 'web/extension-courses.css').read_text() + '\n</style>\n<!-- EXTENSION_RUNTIME_END -->\n'
    html = html.replace('</head>', runtime + '</head>', 1)
    marker = ',courseList='
    if html.count(marker) != 1:
        raise ValueError('缺少唯一未来路线目录')
    start = html.index(marker) + len(marker)
    rows, length = json.JSONDecoder().raw_decode(html[start:])
    for course in data['courses']:
        matches = [row for row in rows if row['id'] == course['id']]
        if len(matches) != 1:
            raise ValueError('原有课程身份缺失或重复：' + course['id'])
        row = matches[0]
        row['course'] = course['id']
        row['phase'] = '本站独立配套课件 · 八讲主题选编'
        items = [l for l in data['lessons'] if l['course'] == course['id']]
        row['units'] = [{'lesson_id': l['id'], 'title': l['title'], 'goal': l['question'], 'output': l['outcome']} for l in items]
        load = row.get('study_load', {})
        estimates = load.get('lesson_minutes', {})
        row['study_load'] = {**load, 'core_minutes': load.get('core_minutes', 180),
                             'lesson_minutes': {l['id']: estimates.get(l['id'], l['study_minutes']) for l in items}}
    return html[:start] + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + html[start + length:]


if __name__ == '__main__':
    data = catalog()
    print(json.dumps({c['id']: sum(l['course'] == c['id'] for l in data['lessons']) for c in data['courses']}))
