"""Atomic learning-session receipts, deterministic and model-free."""
import hashlib
import json
import re
from . import core, routes, journal


def finish(body):
    key=str(body.get('session_key',''))
    if not re.fullmatch(r'[A-Za-z0-9-]{16,80}',key):raise ValueError('学习记录标识无效')
    minutes=int(body.get('minutes') or 0)
    if not 0<=minutes<=1440:raise ValueError('学习时长应在 0–1440 分钟之间')
    complete=body.get('complete') is True
    evidence=str(body.get('evidence','')).strip()[:5000]
    note=str(body.get('note','')).strip()[:1000]
    timer_seconds=body.get('timer_seconds')
    if timer_seconds is not None and (type(timer_seconds) is not int or not 0<=timer_seconds<=86400 or minutes!=timer_seconds//60):
        raise ValueError('计时秒数与记录分钟不一致')
    if complete and not evidence:raise ValueError('完成任务前，请填写成果或验证证据')
    if not complete and not minutes and timer_seconds is None:raise ValueError('请填写学习时长，或记录成果并完成任务')
    task_id=int(body['task_id'])
    fields=[task_id,minutes,complete,evidence,note]
    if timer_seconds is not None:fields.append(timer_seconds)
    digest=hashlib.sha256(json.dumps(fields,ensure_ascii=False).encode()).hexdigest()
    with core.connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS study_receipts(key TEXT PRIMARY KEY,payload_hash TEXT NOT NULL)')
        db.execute('BEGIN IMMEDIATE')
        previous=db.execute('SELECT payload_hash FROM study_receipts WHERE key=?',(key,)).fetchone()
        if previous:
            if previous[0]!=digest:raise ValueError('此记录已保存，请刷新后再修改')
            return
        task=db.execute('SELECT * FROM tasks WHERE id=?',(task_id,)).fetchone()
        if not task:raise ValueError('任务已删除，请刷新列表')
        if minutes:db.execute('INSERT INTO sessions(task_id,minutes,note,created_at,learning_route) VALUES(?,?,?,?,?)',(task_id,minutes,note,core.now(),routes.resolve({},task['track'],task)))
        if complete:db.execute("UPDATE tasks SET state='done',evidence=?,completed_at=COALESCE(completed_at,?) WHERE id=?",(evidence,core.now(),task_id))
        elif evidence:db.execute('UPDATE tasks SET evidence=? WHERE id=?',(evidence,task_id))
        journal.record_task(db,task,'study:'+key,minutes,evidence=evidence,note=note,timer_seconds=timer_seconds,completed=complete)
        db.execute('INSERT INTO study_receipts VALUES(?,?)',(key,digest))
