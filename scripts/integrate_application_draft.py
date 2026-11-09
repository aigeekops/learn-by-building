#!/usr/bin/env python3
"""Integrate selected Agent and ML delivery lessons with the existing reader."""
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
MODULES = ('hfagents', 'fsdl')
START = '/* APPLICATION_DRAFT_START */'
END = '/* APPLICATION_DRAFT_END */'
RUNTIME = r'<!-- APPLICATION_RUNTIME_START -->.*?<!-- APPLICATION_RUNTIME_END -->\n?'


def catalog():
    data = {'checked': '2026-11-09', 'courses': [], 'lessons': [], 'sources': {},
            'policy': '第二批为本站原创中文配套选编。按各课实际公开版本定位材料，以可复算案例、代码和独立练习解释原理。'}
    for name in MODULES:
        module = json.loads((ROOT / 'config' / f'application_{name}.json').read_text())
        if module['course']['id'] != name or not module['lessons']:
            raise ValueError('第二批课程身份或内容无效：' + name)
        if data['sources'].keys() & module['sources'].keys():
            raise ValueError('第二批来源 ID 重复')
        data['courses'].append(module['course'])
        data['lessons'].extend(module['lessons'])
        data['sources'].update(module['sources'])
    program_spec = importlib.util.spec_from_file_location('course_programs', ROOT / 'scripts/course_programs.py')
    programs = importlib.util.module_from_spec(program_spec)
    program_spec.loader.exec_module(programs)
    programs.embed_programs(data['lessons'])
    ids = [l['id'] for l in data['lessons']]
    if len(ids) != len(set(ids)):
        raise ValueError('第二批讲次 ID 重复')
    existing = json.loads((ROOT / 'config/ai_courses.json').read_text())
    existing_ids = {l['id'] for l in existing['lessons']}
    for name in ('cs50p', 'missing', 'd2l'):
        existing_ids.update(l['id'] for l in json.loads((ROOT / 'config' / f'foundation_{name}.json').read_text())['lessons'])
    if set(ids) & existing_ids:
        raise ValueError('新增讲次覆盖既有课程身份')
    for lesson in data['lessons']:
        if lesson['course'] not in MODULES:
            raise ValueError('第二批讲次归属不匹配')
        for source in lesson['sources']:
            if source not in data['sources']:
                raise ValueError('第二批来源缺失：' + source)
        for bridge in lesson['bridges']:
            if bridge['lesson'] not in set(ids) | existing_ids:
                raise ValueError('第二批跨课连接缺失：' + bridge['lesson'])
    links = {'hfagents-project': [('fsdl-metrics', '继续到工程交付：先确定成功指标')],
             'fsdl-release': [('hfagents-evaluation', '连接 Agent：按独立任务重新评测')]}
    for lesson in data['lessons']:
        for target, label in links.get(lesson['id'], []):
            if not any(b['lesson'] == target for b in lesson['bridges']):
                lesson['bridges'].append({'lesson': target, 'label': label})
    return data


def transform(html, data=None):
    data = data or catalog()
    if 'AI_DRAFT_INTEGRATION_START' not in html:
        raise ValueError('第二批课程需要原有统一阅读器')
    pattern = re.escape(START) + r'.*?' + re.escape(END) + r'\n?'
    if len(re.findall(pattern, html, flags=re.S)) > 1:
        raise ValueError('第二批课程接入重复')
    html = re.sub(pattern, '', html, flags=re.S)
    html = re.sub(RUNTIME, '', html, flags=re.S)
    marker = '  const lessonInfo = {'
    if html.count(marker) != 1:
        raise ValueError('第二批课程接入位置不唯一')
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    adapter = (ROOT / 'web/application-draft-integration.js').read_text().replace('__APPLICATION_DATA__', encoded)
    html = html.replace(marker, START + '\n' + adapter + '\n' + END + '\n' + marker, 1)
    runtime = '<!-- APPLICATION_RUNTIME_START -->\n'
    for name in MODULES:
        for asset in (f'application-{name}.js', f'application-{name}-scenes.js'):
            runtime += '<script>\n' + (ROOT / 'web' / asset).read_text().replace('</script', '<\\/script') + '\n</script>\n'
    runtime += '<style>\n' + (ROOT / 'web/application-draft-integration.css').read_text() + '\n</style>\n<!-- APPLICATION_RUNTIME_END -->\n'
    html = html.replace('</head>', runtime + '</head>', 1)
    marker = ',courseList='
    if html.count(marker) != 1:
        raise ValueError('第二批课程缺少唯一的未来路线目录')
    start = html.index(marker) + len(marker)
    rows, length = json.JSONDecoder().raw_decode(html[start:])
    for course in data['courses']:
        matches = [r for r in rows if r['id'] == course['id']]
        if len(matches) != 1:
            raise ValueError('第二批原有课程身份缺失或重复：' + course['id'])
        row = matches[0]
        row['course'] = course['id']
        row['phase'] = '第二批配套教学'
        row['units'] = [{'lesson_id': l['id'], 'title': l['title'], 'goal': l['question'], 'output': l['outcome']}
                        for l in data['lessons'] if l['course'] == course['id']]
    html = html[:start] + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + html[start+length:]
    spec = importlib.util.spec_from_file_location('application_map_status', ROOT / 'scripts/sync_course_map.py')
    status = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(status)
    return status.transform(html)


if __name__ == '__main__':
    data = catalog()
    (ROOT / 'config/application_courses.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({c['id']: sum(l['course'] == c['id'] for l in data['lessons']) for c in data['courses']}))
