"""Private learning records and deterministic Markdown exports. No model calls."""
from datetime import date, datetime
from contextlib import nullcontext
import hashlib
import json
import re
import uuid
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo
from . import core, routes

FIELDS = ('title', 'track', 'stage', 'entry_date', 'kind', 'status', 'evidence_type',
          'task_id', 'body', 'question', 'prediction', 'procedure', 'result',
          'conclusion', 'next_step', 'links', 'learning_route')
LABELS = {'body': '学习收获', 'question': '想解决的问题', 'prediction': '预测与依据',
          'procedure': '操作与条件', 'result': '实际观察', 'conclusion': '结论与边界',
          'next_step': '下一步'}
STATUS = {'draft': '草稿', 'recorded': '已记录', 'blocked': '待解决'}
KINDS = {'activity': '学习动态', 'note': '阅读笔记', 'experiment': '实验记录', 'review': '阶段复盘'}
EVIDENCE = {'reading': '阅读理解', 'calculation': '计算', 'simulation': '仿真',
            'hardware': '硬件测量', 'mixed': '多种证据（分别注明）', 'activity': '操作记录（非掌握证明）'}

def init(db):
    db.execute('''CREATE TABLE IF NOT EXISTS learning_entries(
      id TEXT PRIMARY KEY, title TEXT NOT NULL, track TEXT NOT NULL, stage TEXT,
      entry_date TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
      evidence_type TEXT NOT NULL, task_id INTEGER, body TEXT, question TEXT,
      prediction TEXT, procedure TEXT, result TEXT, conclusion TEXT, next_step TEXT,
      links TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)''')
    db.execute('CREATE INDEX IF NOT EXISTS journal_date ON learning_entries(entry_date,track)')

def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('请填写有效的学习日期')
    date.fromisoformat(value)
    return value

def clean_text(body, name, limit=10000):
    value = body.get(name, '')
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f'{name} 内容过长或格式无效')
    return value.strip()

def decode(row):
    value = dict(row)
    value['links'] = json.loads(value['links'])
    return value

def save(body, *, db=None, automatic=False):
    title = clean_text(body, 'title', 300)
    if not title:
        raise ValueError('请给这次学习起一个标题')
    track, stage = body.get('track', 'robotics'), body.get('stage', '')
    road = next((r for r in core.config('roadmaps') if r['id'] == track), None)
    if not road or stage not in ['', *[s['id'] for s in road['stages']]]:
        raise ValueError('学习方向或阶段无效')
    kind, status = body.get('kind', 'note'), body.get('status', 'draft')
    evidence = body.get('evidence_type', 'reading')
    if kind not in KINDS or status not in ('draft', 'recorded', 'blocked') or evidence not in EVIDENCE:
        raise ValueError('记录类型、状态或证据类型无效')
    entry_date = valid_date(body.get('entry_date', ''))
    texts = {name: clean_text(body, name) for name in LABELS}
    if status == 'recorded' and not any(texts.values()):
        raise ValueError('保存为已记录前，请填写学习收获或实验内容')
    links = body.get('links', [])
    if not isinstance(links, list) or len(links) > 20:
        raise ValueError('最多保存20个资料链接')
    safe_links = []
    for link in links:
        if not isinstance(link, str) or len(link) > 2000:
            raise ValueError('资料链接格式无效')
        parsed = urlsplit(link)
        if parsed.scheme not in ('http', 'https') or not parsed.hostname or parsed.username or parsed.password or any(c.isspace() for c in link):
            raise ValueError('资料链接仅支持不含凭证的 HTTP / HTTPS 地址')
        if link not in safe_links:
            safe_links.append(link)
    identifier = body.get('id') or str(uuid.uuid4())
    if not isinstance(identifier, str) or not re.fullmatch(r'[A-Za-z0-9-]{16,80}', identifier):
        raise ValueError('学习记录标识无效')
    task_id = body.get('task_id') or None
    if task_id is not None:
        task_id = int(task_id)
    values = dict(title=title, track=track, stage=stage, entry_date=entry_date,
                  kind=kind, status=status, evidence_type=evidence, task_id=task_id,
                  **texts, links=json.dumps(safe_links, ensure_ascii=False))
    with (nullcontext(db) if db is not None else core.connect()) as db:
        if not db.in_transaction:db.execute('BEGIN IMMEDIATE')
        old = db.execute('SELECT * FROM learning_entries WHERE id=?', (identifier,)).fetchone()
        # Repeated automatic events must not overwrite later edits or undo archiving.
        if old and automatic:return decode(old)
        if identifier.startswith('auto-') and not automatic and not old:
            raise ValueError('自动记录标识仅由学习操作生成')
        if task_id is not None:
            task = db.execute('SELECT * FROM tasks WHERE id=?', (task_id,)).fetchone()
            if not task or task['track'] != track:
                raise ValueError('关联任务不存在或不属于当前学习方向')
        owner=old or (task if task_id is not None else None)
        values['learning_route']=routes.resolve(body,track,owner)
        if task_id is not None and not routes.belongs(task,values['learning_route']):raise ValueError('关联任务不属于当前学习路线')
        timestamp = core.now()
        if old:
            # Protect another tab's edits; identical retries remain harmless.
            if all(old[k] == values[k] for k in FIELDS):
                return decode(old)
            if body.get('updated_at') != old['updated_at']:
                raise ValueError('记录已在其他页面更新，请刷新后重新编辑；本次编辑已保留在浏览器')
            db.execute('UPDATE learning_entries SET '+','.join(k+'=?' for k in FIELDS)+',updated_at=? WHERE id=?',
                       tuple(values[k] for k in FIELDS)+(timestamp, identifier))
        else:
            db.execute('INSERT INTO learning_entries(id,'+','.join(FIELDS)+',created_at,updated_at) VALUES('+','.join('?' for _ in range(len(FIELDS)+3))+')',
                       (identifier,)+tuple(values[k] for k in FIELDS)+(timestamp, timestamp))
        return decode(db.execute('SELECT * FROM learning_entries WHERE id=?', (identifier,)).fetchone())

def automatic(body):
    """Save a client-observed teaching interaction, with no task/time side effects."""
    key=body.get('source_key','');entry=body.get('entry')
    if not isinstance(key,str) or not re.fullmatch(r'(basic|divider|lesson|rc|ee|curriculum):[A-Za-z0-9:_-]{1,120}',key) or not isinstance(entry,dict):
        raise ValueError('自动学习记录来源无效')
    payload={k:v for k,v in entry.items() if k in FIELDS}
    payload.update(status='recorded',entry_date=entry.get('entry_date') or local_day(core.now()))
    if payload.get('kind') not in ('activity','experiment','note') or payload.get('evidence_type') not in ('activity','calculation','reading','simulation'):
        raise ValueError('网页操作不能自动记录为硬件测量或学习结论')
    if payload.get('conclusion') or payload.get('prediction'):
        raise ValueError('自动记录不生成个人预测或学习结论')
    identifier=hashlib.sha256(json.dumps([key,payload],sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return save({**payload,'id':'auto-'+identifier},automatic=True)

def record_task(db, task, event_key, minutes=0, *, evidence='', note='', timer_seconds=None, completed=False):
    """Journal the committed action inside the same transaction as its receipt."""
    timing=(f'本次专注计时 {timer_seconds//60} 分 {timer_seconds%60} 秒；计入 {minutes} 分钟。'
            if timer_seconds is not None else f'本次登记学习时长 {minutes} 分钟。')
    action='已提交成果并标记任务完成。' if completed else '已结束并保存本次学习，任务仍可继续。'
    return save(dict(id='auto-'+hashlib.sha256(event_key.encode()).hexdigest(),title=('完成任务：' if completed else '学习记录：')+task['title'][:290],
                     track=task['track'],learning_route=routes.resolve({},task['track'],task),stage=task['stage'] or '',
                     entry_date=local_day(core.now()),kind='activity',status='recorded',evidence_type='activity',task_id=task['id'],
                     body=timing+'\n'+action+'\n自动记录操作，不代表知识验收通过。',result=evidence,note='',
                     procedure=note,links=[task['source_url']] if task['source_url'] else []),db=db,automatic=True)

def archive(body):
    if type(body.get('archived')) is not bool:
        raise ValueError('归档状态无效')
    with core.connect() as db:
        if not db.execute('UPDATE learning_entries SET archived=?,updated_at=? WHERE id=?',
                          (int(body['archived']), core.now(), body.get('id'))).rowcount:
            raise ValueError('记录不存在')

def entry_markdown(entry):
    road = next(r for r in core.config('roadmaps') if r['id'] == entry['track'])
    stage = next((s['name'] for s in road['stages'] if s['id'] == entry['stage']), '未归入阶段')
    parts = [f"# {entry['title']}", f"{entry['entry_date']} · {road['name']} · {stage}",
             f"{KINDS[entry['kind']]} · 证据：{EVIDENCE[entry['evidence_type']]} · 状态："+
             {'draft': '草稿', 'recorded': '已记录', 'blocked': '待解决'}[entry['status']]]
    for name, label in LABELS.items():
        if entry[name]:
            parts.extend([f'## {label}', entry[name]])
    if entry['links']:
        parts.extend(['## 资料与成果链接', '\n'.join('- '+u for u in entry['links'])])
    return '\n\n'.join(parts)+'\n'

def local_day(timestamp):
    return datetime.fromisoformat(timestamp).astimezone(ZoneInfo('Asia/Shanghai')).date().isoformat()

def review(start, end, track='all', route=None):
    if route is not None and route not in routes.ROUTES:raise ValueError('学习路线无效')
    start, end = valid_date(start), valid_date(end)
    if not 0 <= (date.fromisoformat(end)-date.fromisoformat(start)).days <= 30:
        raise ValueError('复盘时间范围应为1到31天')
    roads = core.config('roadmaps')
    if track not in ['all', *[r['id'] for r in roads]]:
        raise ValueError('学习方向无效')
    with core.connect() as db:
        entries = [decode(r) for r in db.execute('SELECT * FROM learning_entries WHERE archived=0 AND entry_date BETWEEN ? AND ? ORDER BY entry_date,created_at', (start, end))]
        tasks = [dict(r) for r in db.execute('SELECT * FROM tasks')]
        sessions = [dict(r) for r in db.execute('SELECT * FROM sessions')]
    if route is not None:
        task_lookup={t['id']:t for t in tasks}
        entries=[e for e in entries if routes.belongs(e,route)]
        sessions=[s for s in sessions if (s['learning_route']==route or (not s['learning_route'] and s['task_id'] in task_lookup and routes.belongs(task_lookup[s['task_id']],route)))]
        tasks=[t for t in tasks if routes.belongs(t,route)]
    entries = [e for e in entries if track == 'all' or e['track'] == track]
    task_map = {t['id']: t for t in tasks}
    sessions = [s for s in sessions if start <= local_day(s['created_at']) <= end and
                (track == 'all' or task_map.get(s['task_id'], {}).get('track') == track or routes.ROUTES.get(s.get('learning_route'),{}).get('track') == track)]
    completed = [t for t in tasks if t['completed_at'] and start <= local_day(t['completed_at']) <= end and (track == 'all' or t['track'] == track)]
    name = '全部方向' if track == 'all' else next(r['name'] for r in roads if r['id'] == track)
    if route is not None:name=routes.ROUTES[route]['name']
    parts = [f'# 学习复盘 {start} 至 {end}', name,
             f"实际记录 {sum(s['minutes'] for s in sessions)} 分钟 · 完成任务 {len(completed)} 项 · 学习记录 {len(entries)} 篇",
             '以下按已有记录整理，未自动生成经历或学习结论。', '## 完成的任务']
    parts.append('\n'.join('- '+t['title']+'\n  '+t['evidence'].replace('\n','\n  ') for t in completed) or '本期没有标记完成的任务。')
    parts.append('## 学习记录')
    for e in entries:
        parts.extend([f"### {e['entry_date']} {e['title']}", f"{KINDS[e['kind']]} · {EVIDENCE[e['evidence_type']]} · 状态：{STATUS[e['status']]}"])
        for field, label in LABELS.items():
            if e[field]: parts.append(f'**{label}**\n\n'+e[field])
        if e['links']: parts.append('\n'.join('- '+u for u in e['links']))
    if not entries: parts.append('本期尚未保存学习记录。')
    parts.extend(['## 下阶段想继续的问题', '结合上述记录，补充自己的判断与安排。'])
    return {'markdown': '\n\n'.join(parts)+'\n', 'minutes': sum(s['minutes'] for s in sessions),
            'entries': len(entries), 'completed': len(completed)}
