#!/usr/bin/env python3
"""Refresh AI companions in the existing unified draft, preserving other content."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DEST = ROOT.parents[1] / 'output/learning-unified-20261108'
MODULES = ('ai-course-models.js', 'attention-workbench.js', 'ai-cme295-2026.js', 'ai-cs336-2026.js', 'ai-cs146s-2026.js')
COURSES = {'cme295', 'cs336', 'cs146s'}
ADAPTER = r'/\* AI_DRAFT_INTEGRATION_START \*/.*?/\* AI_DRAFT_INTEGRATION_END \*/'
RUNTIME = r'<!-- AI_COURSE_RUNTIME_START -->.*?<!-- AI_COURSE_RUNTIME_END -->'
SLOT = '<!-- AI_COURSE_RUNTIME_SLOT -->'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encoded(data):
    return json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')


def plan_rows(html):
    marker = ',courseList='
    if html.count(marker) != 1:
        raise ValueError('需要唯一的原有个人路线课程定义')
    start = html.index(marker) + len(marker)
    rows, length = json.JSONDecoder().raw_decode(html[start:])
    return rows, start, length


def remove_assets(html, slot=False):
    """Accept both the unmarked old draft and our marked, repeatable refresh."""
    marked = len(re.findall(RUNTIME, html, flags=re.S))
    if marked > 1:
        raise ValueError('AI 运行时重复，停止接入')
    html = re.sub(RUNTIME, lambda _: SLOT if slot else '', html, flags=re.S)
    prefixes = tuple((ROOT / 'web' / name).read_text().splitlines()[0] for name in MODULES)
    base = prefixes[0]
    found = 0

    def script(match):
        nonlocal found
        body = match.group(1).lstrip()
        if not body.startswith(prefixes):
            return match.group(0)
        if body.startswith(base):
            found += 1
            return SLOT if slot else ''
        return ''

    html = re.sub(r'<script>\s*(.*?)</script>', script, html, flags=re.S)
    html = re.sub(r'<style>\s*(.*?)</style>',
                  lambda m: '' if m.group(1).lstrip().startswith('#lbb-course-prototype .aid-scope') else m.group(0),
                  html, flags=re.S)
    if slot and (marked + found != 1 or html.count(SLOT) != 1):
        raise ValueError('未找到唯一的原有 AI 运行时，保留草稿不覆盖')
    return html


def retained_fingerprint(html):
    """Compare every non-AI part, including record code, map and other courses."""
    html = remove_assets(html)
    html = re.sub(ADAPTER, '', html, flags=re.S)
    rows, start, length = plan_rows(html)
    for row in rows:
        if row['id'] in COURSES:
            for key in ('units', 'phase', 'course'):
                row.pop(key, None)
    html = html[:start] + encoded(rows) + html[start + length:]
    # Asset removal can leave empty lines; substantive lines stay byte-identical.
    text = '\n'.join(line for line in html.splitlines() if line.strip())
    return hashlib.sha256(text.encode()).hexdigest()


def transform(html, data=None):
    data = data or json.loads((ROOT / 'config/ai_courses.json').read_text())
    if data.get('material_year') != 2026 or {c['id'] for c in data['courses']} != COURSES:
        raise ValueError('只接入三门课程的 2026 年公开材料')
    if len(re.findall(ADAPTER, html, flags=re.S)) != 1:
        raise ValueError('需要已接入 AI 样章的统一草稿')
    retained = retained_fingerprint(html)
    adapter = (ROOT / 'web/ai-draft-integration.js').read_text().replace('__AI_COURSE_DATA__', encoded(data))
    html = re.sub(ADAPTER, lambda _: '/* AI_DRAFT_INTEGRATION_START */\n' + adapter + '\n/* AI_DRAFT_INTEGRATION_END */', html, flags=re.S)
    html = remove_assets(html, slot=True)
    runtime = '<!-- AI_COURSE_RUNTIME_START -->\n'
    for name in MODULES:
        runtime += '<script>\n' + (ROOT / 'web' / name).read_text().replace('</script', '<\\/script') + '\n</script>\n'
    for name in ('ai-draft-integration.css', 'attention-workbench.css'):
        runtime += '<style>\n' + (ROOT / 'web' / name).read_text() + '\n</style>\n'
    runtime += '<!-- AI_COURSE_RUNTIME_END -->'
    html = html.replace(SLOT, runtime, 1)
    rows, start, length = plan_rows(html)
    for course in COURSES:
        matches = [row for row in rows if row['id'] == course]
        if len(matches) != 1:
            raise ValueError('原有课程身份缺失或重复：' + course)
        row = matches[0]
        row['course'] = course
        row['phase'] = '2026 已公开材料配套'
        row['units'] = [{'lesson_id': l['id'], 'title': l['title'], 'goal': l['question'], 'output': l['outcome']}
                        for l in data['lessons'] if l['course'] == course]
    html = html[:start] + encoded(rows) + html[start + length:]
    if '<iframe' in html or retained_fingerprint(html) != retained:
        raise ValueError('非 AI 草稿内容发生变化，停止写入')
    return html


def build(destination=DEFAULT_DEST):
    target = destination.resolve() / 'index.html'
    if not target.is_file():
        raise ValueError('需要已有统一地图草稿，不能覆盖任意目录')
    before = digest(target)
    previous = target.read_text()
    data = json.loads((ROOT / 'config/ai_courses.json').read_text())
    html = transform(previous, data)
    if digest(target) != before:
        raise RuntimeError('草稿有并发修改，请重新运行接入')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = target.parent / 'backups' / f'before-ai-courseware-{stamp}.html'
    backup.parent.mkdir(exist_ok=True)
    shutil.copy2(target, backup)
    incoming = target.with_name('index.ai-incoming.html')
    incoming.write_text(html)
    os.replace(incoming, target)
    receipt = {
        'material_year': 2026, 'target': str(target), 'backup': str(backup),
        'previous_sha256': before, 'sha256': digest(target),
        'courseware_sha256': digest(ROOT / 'config/ai_courses.json'),
        'lectures': len(data['lessons']),
        'models': len({d['modelId'] for l in data['lessons'] for d in l.get('demos', [{'modelId': l.get('modelId', l['id'])}])}),
        'sections': sum(len(l.get('sections', [])) for l in data['lessons']),
        'courses': {c['id']: sum(l['course'] == c['id'] for l in data['lessons']) for c in data['courses']},
        'mode': 'incremental_existing_draft',
        'retained_content_sha256': retained_fingerprint(previous),
        'non_ai_content_unchanged': retained_fingerprint(previous) == retained_fingerprint(html),
        'saved_learning_records_rewritten': False, 'iframes': 0,
        'completed_utc': datetime.now(timezone.utc).isoformat(),
    }
    (target.parent / 'ai-integration-receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(receipt, ensure_ascii=False))
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_DEST)
    build(parser.parse_args().output)
