"""Versioned learning-record backups. Preview is read-only; restore is atomic."""
import hashlib
import json
import os
import re
import sqlite3
import uuid
from datetime import date
from urllib.parse import urlsplit
from . import core

# Preserve the v1 format identifier so backups made before the project rename remain importable.
TABLES=('tasks','sessions','learning_entries','learning_plans','plan_tasks','study_receipts')
LIMIT=12*1024*1024

def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def schemas(db):
    result={name:[dict(r) for r in db.execute('PRAGMA table_info('+name+')')] for name in TABLES}
    if not result['study_receipts']:
        result['study_receipts']=[dict(name='key',type='TEXT',notnull=0,pk=1),dict(name='payload_hash',type='TEXT',notnull=1,pk=0)]
    return result

def snapshot(db):
    result={}
    for name,cols in schemas(db).items():
        exists=db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(name,)).fetchone()
        pk=next(c['name'] for c in cols if c['pk'])
        result[name]=[dict(r) for r in db.execute('SELECT * FROM '+name+' ORDER BY '+pk)] if exists else []
    return result

def export():
    with core.connect() as db:
        db.execute('BEGIN')
        tables=snapshot(db)
    return dict(format='learning-radar-records',version=1,created_at=core.now(),tables=tables,
                scope='已保存的两条路线任务、学习时长、笔记、计划和防重复记录；不含资讯、密钥、配置、浏览器草稿或未结束计时。')

def safe_url(value):
    if not isinstance(value,str):return False
    p=urlsplit(value)
    return p.scheme in ('https','http') and bool(p.hostname) and not p.username and not p.password and not any(c.isspace() for c in value)

def validate(data,db):
    if not isinstance(data,dict) or data.get('format')!='learning-radar-records' or type(data.get('version')) is not int or data['version']!=1:
        raise ValueError('仅支持动手学学习记录备份 v1；旧版全量导出不能直接恢复')
    if len(json.dumps(data,ensure_ascii=False).encode())>LIMIT:raise ValueError('备份超过 12 MB，请分开迁移或使用数据库备份')
    tables=data.get('tables')
    if not isinstance(tables,dict) or set(tables)!=set(TABLES):raise ValueError('备份的数据表不完整或含未知表')
    for name,cols in schemas(db).items():
        rows=tables[name];keys={c['name'] for c in cols};pk=next(c['name'] for c in cols if c['pk']);seen=set()
        if not isinstance(rows,list) or len(rows)>100000:raise ValueError('备份记录数量或格式无效')
        for row in rows:
            if not isinstance(row,dict) or set(row)!=keys:raise ValueError('备份字段与当前版本不兼容：'+name)
            for col in cols:
                v=row[col['name']]
                if v is None:
                    if col['notnull'] or col['pk']:raise ValueError('必填字段为空：'+name)
                elif col['type']=='INTEGER':
                    if type(v) is not int:raise ValueError('整数格式无效：'+name)
                elif not isinstance(v,str) or len(v)>100000:raise ValueError('文字格式或长度无效：'+name)
            if row[pk] in seen:raise ValueError('备份存在重复标识：'+name)
            seen.add(row[pk])
    tasks={t['id']:t for t in tables['tasks']};plans={p['id']:p for p in tables['learning_plans']}
    for t in tables['tasks']:
        if t['id']<1 or not t['title'].strip() or t['track'] not in ('robotics','agent') or t['learning_route']!=t['track'] or t['state'] not in ('todo','doing','done') or type(t['minutes']) is not int or not 1<=t['minutes']<=1440:
            raise ValueError('任务内容或路线无效')
        if t['state']=='done' and not (t['evidence'] or '').strip():raise ValueError('已完成任务缺少成果')
        if t['source_url'] and not safe_url(t['source_url']):raise ValueError('任务链接无效')
        if t['due']:date.fromisoformat(t['due'])
    for s in tables['sessions']:
        if s['id']<1 or not isinstance(s['minutes'],int) or not 1<=s['minutes']<=1440 or s['learning_route'] not in ('robotics','agent'):raise ValueError('学习时长记录无效')
        # Deleted tasks legitimately leave historical sessions and notes behind.
        if s['task_id'] in tasks and tasks[s['task_id']]['learning_route']!=s['learning_route']:raise ValueError('学习时长跨路线关联')
    for e in tables['learning_entries']:
        from . import journal
        if not e['title'].strip() or e['track'] not in ('agent','robotics') or e['learning_route']!=e['track'] or e['kind'] not in journal.KINDS or e['status'] not in journal.STATUS or e['evidence_type'] not in journal.EVIDENCE or e['archived'] not in (0,1):raise ValueError('学习笔记内容无效')
        date.fromisoformat(e['entry_date']);links=json.loads(e['links'])
        if not isinstance(links,list) or len(links)>20 or not all(safe_url(u) for u in links):raise ValueError('笔记链接无效')
        if e['task_id'] in tasks and tasks[e['task_id']]['learning_route']!=e['learning_route']:raise ValueError('笔记跨路线关联')
    active=set()
    for p in plans.values():
        profile=json.loads(p['profile'])
        if not isinstance(profile,dict) or profile.get('goal') not in ('robotics','embedded','agent') or p['active'] not in (0,1) or p['learning_route']!=('agent' if profile['goal']=='agent' else 'robotics'):raise ValueError('计划配置无效')
        if any(type(profile.get(k)) is not int for k in ('minutes','days')) or not 1<=profile['minutes']<=1440 or profile['days'] not in (7,14) or profile.get('level') not in ('zero','basic','project'):raise ValueError('计划时间或基础设置无效')
        date.fromisoformat(profile['start'])
        if p['active']:
            if p['learning_route'] in active:raise ValueError('同一路线存在多个当前计划')
            active.add(p['learning_route'])
    for t in tables['plan_tasks']:
        if t['task_id']<1 or t['plan_id'] not in plans or not 1<=t['day_index']<=14 or t['phase'] not in ('understand','practice','explain','review'):raise ValueError('计划任务关联无效')
        if t['task_id'] in tasks and tasks[t['task_id']]['learning_route']!=plans[t['plan_id']]['learning_route']:raise ValueError('计划任务跨路线关联')
    for r in tables['study_receipts']:
        if not re.fullmatch(r'[A-Za-z0-9-]{16,80}',r['key']) or not re.fullmatch(r'[a-f0-9]{64}',r['payload_hash']):raise ValueError('防重复记录无效')
    return tables

def preview(data):
    with core.connect() as db:
        db.execute('BEGIN')
        tables=validate(data,db);current=snapshot(db)
    return dict(counts={k:len(v) for k,v in tables.items()},current={k:len(v) for k,v in current.items()},
                checksum=digest(data),revision=digest(current),created_at=str(data.get('created_at','')))

def restore(body):
    if body.get('confirmation')!='replace-learning-records':raise ValueError('请先预览并确认替换学习记录')
    data=body.get('backup')
    with core.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        tables=validate(data,db);current=snapshot(db)
        if body.get('checksum')!=digest(data) or body.get('revision')!=digest(current):raise ValueError('文件或当前记录已变化，请重新预览后恢复')
        folder=core.DATA/'backups';folder.mkdir(exist_ok=True)
        path=folder/('before-restore-'+uuid.uuid4().hex+'.json')
        old=dict(format='learning-radar-records',version=1,created_at=core.now(),tables=current)
        with open(path,'x',encoding='utf-8',opener=lambda p,flags:os.open(p,flags,0o600)) as f:
            json.dump(old,f,ensure_ascii=False,indent=2)
        db.execute('CREATE TABLE IF NOT EXISTS study_receipts(key TEXT PRIMARY KEY,payload_hash TEXT NOT NULL)')
        for name in reversed(TABLES):db.execute('DELETE FROM '+name)
        try:
            for name in TABLES:
                for row in tables[name]:
                    cols=list(row)
                    db.execute('INSERT INTO '+name+' ('+','.join(cols)+') VALUES('+','.join('?' for _ in cols)+')',tuple(row[k] for k in cols))
        except sqlite3.IntegrityError as exc:raise ValueError('备份关系校验失败，现有记录未替换') from exc
    return dict(ok=True,safety_backup=path.name)
