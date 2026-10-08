"""Stable learning-workspace attribution. Switching views never rewrites history."""
import json

ROUTES={'robotics':{'name':'机器人工程','track':'robotics'},'agent':{'name':'AI / Agent 工程','track':'agent'}}

def for_goal(goal):
    return 'agent' if goal=='agent' else 'robotics'

def resolve(body,track,old=None):
    old=dict(old) if old is not None else {}
    value=body.get('learning_route')
    if value is None:
        value=old.get('learning_route') if old.get('track',track)==track else None
        value=value or ('agent' if track=='agent' else 'robotics')
    if not isinstance(value,str) or value not in ROUTES or ROUTES[value]['track']!=track:
        raise ValueError('学习路线与方向不匹配')
    return value

def belongs(row,route):
    row=dict(row)
    return (row.get('learning_route') or ('agent' if row.get('track')=='agent' else 'robotics'))==route

def init(db):
    migrated='learning_route' not in {r['name'] for r in db.execute('PRAGMA table_info(learning_plans)')}
    for table in ('tasks','sessions','learning_entries','learning_plans'):
        if 'learning_route' not in {r['name'] for r in db.execute('PRAGMA table_info('+table+')')}:
            db.execute('ALTER TABLE '+table+" ADD COLUMN learning_route TEXT NOT NULL DEFAULT ''")
    for p in db.execute("SELECT id,profile FROM learning_plans WHERE learning_route='' ").fetchall():
        goal=for_goal(json.loads(p['profile']).get('goal','robotics'))
        db.execute('UPDATE learning_plans SET learning_route=? WHERE id=?',(goal,p['id']))
    db.execute("UPDATE tasks SET learning_route=CASE WHEN track='agent' THEN 'agent' ELSE 'robotics' END WHERE learning_route=''")
    db.execute("UPDATE learning_entries SET learning_route=COALESCE((SELECT learning_route FROM tasks WHERE id=learning_entries.task_id),CASE WHEN track='agent' THEN 'agent' ELSE 'robotics' END) WHERE learning_route=''")
    db.execute("UPDATE sessions SET learning_route=COALESCE((SELECT learning_route FROM tasks WHERE id=sessions.task_id),'') WHERE learning_route=''")
    if migrated:
        for goal in ROUTES:
            latest=db.execute('SELECT id FROM learning_plans WHERE learning_route=? ORDER BY created_at DESC,rowid DESC LIMIT 1',(goal,)).fetchone()
            if latest:
                db.execute('UPDATE learning_plans SET active=0 WHERE learning_route=?',(goal,))
                db.execute('UPDATE learning_plans SET active=1 WHERE id=?',(latest['id'],))
    db.execute('CREATE INDEX IF NOT EXISTS tasks_route ON tasks(learning_route)')
    db.execute('CREATE INDEX IF NOT EXISTS entries_route ON learning_entries(learning_route,entry_date)')
