#!/usr/bin/env python3
"""Refresh all authored animation players in the retained map with one atomic write."""
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import sys

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT))
TARGET=ROOT.parents[1]/'output/learning-unified-20261108/index.html'


def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result)
    return result


def replace_legacy(html):
    source=(ROOT/'web/course-teaching.js').read_text()
    prefix=source.splitlines()[0]
    count=0
    def replace_script(match):
        nonlocal count
        if not match.group(1).lstrip().startswith(prefix):return match.group(0)
        count+=1
        return '<script>\n'+source.replace('</script','<\\/script')+'\n</script>'
    html=re.sub(r'<script>\s*(.*?)</script>',replace_script,html,flags=re.S)
    if count!=1:raise ValueError('原配套教学运行时不唯一，未覆盖草稿')
    css=(ROOT/'web/course-teaching.css').read_text();count=0
    def replace_style(match):
        nonlocal count
        if not match.group(1).lstrip().startswith('.teaching-player{'):return match.group(0)
        count+=1;return '<style>\n'+css+'\n</style>'
    html=re.sub(r'<style>\s*(.*?)</style>',replace_style,html,flags=re.S)
    if count!=1:raise ValueError('原配套教学样式不唯一，未覆盖草稿')
    # Preserve existing mapped resources and all stable teaching unit IDs.
    adapter=(ROOT/'web/map-teaching.js').read_text()
    marker='  function renderTeachingLesson(){'
    start=html.index(marker)
    end=html.index("  root.addEventListener('click'",start)
    source_start=adapter.index(marker);source_end=adapter.index("  root.addEventListener('click'",source_start)
    html=html[:start]+adapter[source_start:source_end]+html[end:]
    return html


def build(target=TARGET):
    target=target.resolve();before=target.read_bytes();html=before.decode()
    html=module('integrate_ai_draft').transform(html)
    html=module('integrate_foundation_draft').transform(html)
    html=module('integrate_application_draft').transform(html)
    html=module('build_robotics_foundations').integrate_html(html)
    html=replace_legacy(html)
    if target.read_bytes()!=before:raise RuntimeError('草稿有并发修改，未覆盖目标')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup=target.parent/'backups'/f'before-split-animation-{stamp}.html'
    backup.parent.mkdir(exist_ok=True);shutil.copy2(target,backup)
    incoming=target.with_name('index.animation-incoming.html');incoming.write_text(html)
    if target.read_bytes()!=before:incoming.unlink();raise RuntimeError('草稿出现并发修改，请重试')
    os.replace(incoming,target)
    receipt={'target':str(target),'backup':str(backup),'previous_sha256':hashlib.sha256(before).hexdigest(),
             'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'families':['AI','foundations','applications','robotics','original companions'],
             'variable_values':'compact rows, complete data','saved_learning_records_rewritten':False,
             'completed_utc':datetime.now(timezone.utc).isoformat()}
    (target.parent/'animation-layout-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(receipt,ensure_ascii=False));return target


if __name__=='__main__':build()
