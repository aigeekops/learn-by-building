#!/usr/bin/env python3
"""Merge independently authored 2026 course modules with stable lesson identifiers."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
MODULES=('cme295','cs336','cs146s')

def merge():
    dest=ROOT/'config/ai_courses.json'
    data=json.loads(dest.read_text())
    for name in MODULES:
        path=ROOT/'config'/f'ai_{name}_2026.json'
        if not path.is_file():
            raise ValueError(f'课程模块尚未就绪：{name}')
        module=json.loads(path.read_text())
        course=module['course']
        if course['id']!=name or not module['lessons']:
            raise ValueError(f'课程模块无效：{name}')
        if any(l['course']!=name for l in module['lessons']):
            raise ValueError('课程归属不匹配')
        data['courses']=[course if c['id']==name else c for c in data['courses']]
        data['lessons']=[l for l in data['lessons'] if l['course']!=name]+module['lessons']
        data['sources'].update(module['sources'])
    order={c['id']:i for i,c in enumerate(data['courses'])}
    data['lessons'].sort(key=lambda l:order[l['course']])
    ids=[l['id'] for l in data['lessons']]
    if len(set(ids))!=len(ids):raise ValueError('课件 ID 重复')
    for l in data['lessons']:
        for s in l['sources']:
            if s not in data['sources']:raise ValueError(f"{l['id']} 来源缺失：{s}")
        for b in l['bridges']:
            if b['lesson'] not in ids:raise ValueError(f"{l['id']} 跨课程连接无效：{b['lesson']}")
    data['checked']='2026-11-08'
    data['policy']='以 2026 年已公开并核实的教学材料为准，逐讲配套中文讲解、计算演示与练习。本站教学模型与完整官方训练/工程实验分开标注；未发布材料待公开后再加入。'
    data['coverage']={name:sum(l['course']==name for l in data['lessons']) for name in MODULES}
    tmp=dest.with_suffix('.tmp')
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    tmp.replace(dest)
    return data['coverage']

if __name__=='__main__': print(json.dumps(merge(),ensure_ascii=False))
