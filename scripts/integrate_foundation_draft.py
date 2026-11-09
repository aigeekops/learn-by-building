#!/usr/bin/env python3
"""Refresh foundation courseware while preserving the map and saved lesson IDs."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DEST = ROOT.parents[1] / 'output/learning-unified-20261108'
MODULES = ('cs50p', 'missing', 'd2l', 'linear', 'probability', 'cs229')
RUNTIME_MODULES = ('cs50p', 'missing', 'd2l', 'math')
SCENE_MODULES = ('foundation-coding-scenes.js', 'foundation-cs50p-extra-scenes.js',
                 'foundation-missing-extra-scenes.js', 'foundation-d2l-scenes.js', 'foundation-math-scenes.js')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def catalog():
    data = {'checked': '2026-11-09', 'courses': [], 'lessons': [], 'sources': {},
            'policy': '基础课为本站原创中文配套教学，按各课程实际公开版本编排。主题对应表标注本站已制作的内容；浏览器计算、终端实验和真实训练分别核验。'}
    for name in MODULES:
        module = json.loads((ROOT / 'config' / f'foundation_{name}.json').read_text())
        data['courses'].append(module['course'])
        data['lessons'].extend(module['lessons'])
        if data['sources'].keys() & module['sources'].keys():
            raise ValueError('基础课来源 ID 重复')
        data['sources'].update(module['sources'])
    program_spec = importlib.util.spec_from_file_location('course_programs', ROOT / 'scripts/course_programs.py')
    programs = importlib.util.module_from_spec(program_spec)
    program_spec.loader.exec_module(programs)
    programs.embed_programs(data['lessons'])
    ids = [l['id'] for l in data['lessons']]
    if len(set(ids)) != len(ids):
        raise ValueError('基础课讲次 ID 重复')
    course_ids = {c['id'] for c in data['courses']}
    for course in data['courses']:
        coverage = course.get('coverage')
        if not coverage:
            continue
        items = coverage.get('items', [])
        if not items or len({item['unit'] for item in items}) != len(items):
            raise ValueError('官方主题对应缺失或重复：' + course['id'])
        own_ids = {l['id'] for l in data['lessons'] if l['course'] == course['id']}
        for item in items:
            if not item.get('title') or not item.get('lessons') or not set(item['lessons']) <= own_ids:
                raise ValueError('官方主题对应的本站讲次无效：' + course['id'])
    existing = json.loads((ROOT / 'config/ai_courses.json').read_text())
    all_ids = set(ids) | {l['id'] for l in existing['lessons']}
    for lesson in data['lessons']:
        if lesson['course'] not in course_ids:
            raise ValueError('课程归属不匹配')
        for source in lesson['sources']:
            if source not in data['sources']:
                raise ValueError(f"来源缺失：{source}")
        for bridge in lesson['bridges']:
            if bridge['lesson'] not in all_ids:
                raise ValueError(f"课程连接缺失：{bridge['lesson']}")
    bridges = {
        'cs50p-files': [('missing-shell', '下一步：在终端中管理这个程序')],
        'missing-quality': [('d2l-tensors', '继续到深度学习：先看清张量形状')],
        'missing-git': [('cs50p-tests', '回补：用测试检查这次提交')],
        'd2l-tensors': [('cs50p-loops', '回补：列表与循环怎样组织数据')],
    }
    for lesson in data['lessons']:
        for target, label in bridges.get(lesson['id'], []):
            if not any(b['lesson'] == target for b in lesson['bridges']):
                lesson['bridges'].append({'lesson': target, 'label': label})
    return data


def transform(html, data=None):
    data = data or catalog()
    if 'AI_DRAFT_INTEGRATION_START' not in html:
        raise ValueError('需要已接入 AI 课件的统一草稿')
    html = re.sub(r'\n?/\* FOUNDATION_DRAFT_START \*/.*?/\* FOUNDATION_DRAFT_END \*/\n?', '', html, flags=re.S)
    html = re.sub(r'<!-- FOUNDATION_RUNTIME_START -->.*?<!-- FOUNDATION_RUNTIME_END -->\n?', '', html, flags=re.S)
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    adapter = (ROOT / 'web/foundation-draft-integration.js').read_text().replace('__FOUNDATION_DATA__', encoded)
    marker = '  const lessonInfo = {'
    if html.count(marker) != 1:
        raise ValueError('统一草稿接入位置不唯一')
    html = html.replace(marker, '/* FOUNDATION_DRAFT_START */\n' + adapter + '\n/* FOUNDATION_DRAFT_END */\n' + marker, 1)
    runtime = '<!-- FOUNDATION_RUNTIME_START -->\n'
    for name in RUNTIME_MODULES:
        source = (ROOT / 'web' / f'foundation-{name}.js').read_text().replace('</script', '<\\/script')
        runtime += '<script>\n' + source + '\n</script>\n'
    for name in SCENE_MODULES:
        source = (ROOT / 'web' / name).read_text().replace('</script', '<\\/script')
        runtime += '<script>\n' + source + '\n</script>\n'
    runtime += '<style>\n' + (ROOT / 'web/foundation-draft-integration.css').read_text() + '\n</style>\n<!-- FOUNDATION_RUNTIME_END -->\n'
    html = html.replace('</head>', runtime + '</head>', 1)
    # Keep the plan generator's course definitions current, without rewriting any
    # saved tasks, route IDs, receipts, journal entries or study minutes.
    for course in data['courses']:
        marker = ',courseList='
        if marker not in html:
            raise ValueError('找不到原有个人路线课程定义')
        start = html.index(marker) + len(marker)
        rows, length = json.JSONDecoder().raw_decode(html[start:])
        row = next((r for r in rows if r['id'] == course['id']), None)
        if row is None:
            raise ValueError('缺少原有课程身份：' + course['id'])
        row['course'] = course['id']
        row['phase'] = course.get('batch', '基础课') + ' · 本站配套教学'
        row['units'] = [{'lesson_id': l['id'], 'title': l['title'], 'goal': l['question'], 'output': l['outcome']}
                        for l in data['lessons'] if l['course'] == course['id']]
        load = row.setdefault('study_load', {
            'core_minutes': 180,
            'basis': '本站对讲解、阅读、跟练与独立核对的编排估计；非原课官方课时或实测承诺。',
        })
        previous_minutes = load.get('lesson_minutes', {})
        own_lessons = [l for l in data['lessons'] if l['course'] == course['id']]
        load['lesson_minutes'] = {
            l['id']: l.get('study_load', {}).get('core_minutes',
                previous_minutes.get(l['id'], load.get('core_minutes', 180)))
            for l in own_lessons
        }
        if any(not isinstance(minutes, (int, float)) or isinstance(minutes, bool) or
               not 0 < minutes < float('inf') for minutes in load['lesson_minutes'].values()):
            raise ValueError('基础课预计用时必须为有限正数：' + course['id'])
        # New public lectures get estimates without rewriting adopted plans.
        load = row.setdefault('study_load', {})
        prior = load.get('lesson_minutes', {})
        default = load.get('core_minutes', 180)
        load['lesson_minutes'] = {unit['lesson_id']: prior.get(unit['lesson_id'], default)
                                  for unit in row['units']}
        html = html[:start] + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + html[start+length:]
    spec=importlib.util.spec_from_file_location('local_course_card_preview',ROOT/'scripts/build_teaching_preview.py')
    preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
    return preview.upgrade_course_cards(html)


def build(destination=DEFAULT_DEST):
    target = destination.resolve() / 'index.html'
    before = digest(target)
    data = catalog()
    html = transform(target.read_text(), data)
    if digest(target) != before:
        raise RuntimeError('草稿有并发修改，请重新运行接入')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = target.parent / 'backups' / f'before-foundations-{stamp}.html'
    backup.parent.mkdir(exist_ok=True)
    shutil.copy2(target, backup)
    incoming = target.with_name('index.foundation-incoming.html')
    incoming.write_text(html)
    os.replace(incoming, target)
    (ROOT / 'config/foundation_courses.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    receipt = {'target': str(target), 'backup': str(backup), 'previous_sha256': before,
               'sha256': digest(target), 'courses': {c['id']: sum(l['course'] == c['id'] for l in data['lessons']) for c in data['courses']},
               'models': len({l.get('modelId', l['id']) for l in data['lessons']}),
               'stable_course_ids': True, 'saved_learning_records_rewritten': False,
               'completed_utc': datetime.now(timezone.utc).isoformat()}
    (target.parent / 'foundation-integration-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(receipt, ensure_ascii=False))
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_DEST)
    build(parser.parse_args().output)
