"""Goal-based short learning plans. Rules and check-ins never call a model."""
from datetime import date, timedelta
import hashlib
import json
import math
import re
from . import core, study, routes

LEVELS={'zero':'从零开始','basic':'有基础，补关键环节','project':'围绕项目实践'}
GOALS={'robotics':'机器人入门','embedded':'电子制作与嵌入式','agent':'AI / Agent 工程'}
def practice_days(block, minutes):
    """Editorial time estimates suggest pacing, never certify understanding."""
    estimate=block.get('study_load',{}).get('core_minutes',180)
    return max(3,math.ceil(estimate/minutes))

def init(db):
    db.executescript('''CREATE TABLE IF NOT EXISTS learning_plans(id TEXT PRIMARY KEY, profile TEXT NOT NULL, payload_hash TEXT NOT NULL, active INTEGER DEFAULT 1, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plan_tasks(plan_id TEXT NOT NULL, task_id INTEGER PRIMARY KEY, day_index INTEGER NOT NULL, unit_id TEXT, phase TEXT);''')

def preview(body):
    goal,level=body.get('goal','robotics'),body.get('level','zero')
    raw_minutes=body.get('minutes',30)
    if isinstance(raw_minutes,bool) or not isinstance(raw_minutes,(int,str)) or not re.fullmatch(r'[0-9]{1,4}',str(raw_minutes).strip()):
        raise ValueError('每日可投入时间请填写 1–1440 分钟的整数')
    minutes,days=int(raw_minutes),int(body.get('days',7))
    if not 1<=minutes<=1440:raise ValueError('每日可投入时间请填写 1–1440 分钟的整数')
    if goal not in GOALS or level not in LEVELS or days not in (7,14):raise ValueError('学习目标、阶段或时间设置无效')
    progression=body.get('progression','sequential')
    if progression not in ('current','sequential'):raise ValueError('排期方式无效，请选择当前块或按参考用时预排')
    try:start=date.fromisoformat(body['start'])
    except (ValueError,KeyError,TypeError):raise ValueError('开始日期无效')
    track='agent' if goal=='agent' else 'robotics'
    curriculum=core.config(track+'_curriculum')
    units=[(m,b) for m in curriculum['months'] for b in m['blocks']]
    start_block=body.get('start_block') or units[0][1]['id']
    offset=next((i for i,(_,b) in enumerate(units) if b['id']==start_block),None)
    if offset is None:raise ValueError('起始学习块不属于当前路线')
    profile=dict(goal=goal,level=level,minutes=minutes,days=days,start=start.isoformat(),start_block=start_block)
    # Keep the legacy profile shape intact for saved-plan retries.
    if 'progression' in body:profile['progression']=progression
    device=body.get('device','browser');practice=body.get('practice','simulation')
    if device not in ('browser','windows','macos','linux') or practice not in ('simulation','hardware'):raise ValueError('设备或练习条件无效')
    profile.update(device=device,practice=practice)
    setup=('当前仅用浏览器；涉及终端或本地软件时，先准备对应环境，不因排期跳过配置。' if device=='browser' else '当前设备：'+{'windows':'Windows','macos':'macOS','linux':'Linux'}[device]+'；安装步骤以课程对应版本为准。')
    setup+=(' 尚无硬件，优先使用本站模型、纸上计算或课程样例；无法运行的部分保留待做。' if track=='robotics' and practice=='simulation' else ' 硬件实验先确认接线、器件与额定值；网页模型不等于实物验证。' if track=='robotics' else ' 模型额度不是起步条件，先用固定响应检查程序；真实调用自行配置并记录。')
    tasks=[]
    # Practice pace follows content load; each seventh calendar day retrieves prior learning.
    unit_index,practice_index=offset,0
    for i in range(days):
        review=(i+1)%7==0
        if progression=='sequential' and not review and practice_index>=practice_days(units[unit_index][1],minutes):
            if unit_index+1<len(units):unit_index+=1;practice_index=0
            else:practice_index=practice_days(units[unit_index][1],minutes)-1
        month,block=units[unit_index]
        steps=block['sessions'];allocated=practice_days(block,minutes)
        sequence=[
            ('understand','看懂并开始',steps[0]),
            ('understand','对照例子解释','回看昨天这一步：'+steps[0]+' 写下一个原先不懂的词，用例子解释；尚未跑通就继续此步。'),
            ('practice','跟着做一次',steps[1]),
            ('practice','只改一个条件','在上次练习中只改一个输入或条件，先预测再观察。上次练习：'+steps[1]),
            ('explain','解释与核对',steps[2]),
            ('explain','脱离示例复现','收起示例，重新完成本块第一步，再对照检查。第一步：'+steps[0])]
        if review:
            phase,label='review','复盘与决定下一步'
            instruction='对照本块验收：'+block['acceptance']+' 用真实记录指出已会和仍不会的内容；未通过则重排本块，不因日期到了就跳过。'
            if block.get('recall'):instruction+='\n间隔回想：'+block['recall']['prompt']
        elif progression=='current' and practice_index>=allocated:
            phase='explain'
            if (practice_index-allocated)%2==0:
                label='独立复现当前块'
                instruction='收起示例，独立复现本块练习：'+steps[1]+' 写下自己的预测、真实输出和仍需提示的地方。'
            else:
                label='核对并补练当前块'
                instruction='对照本块验收核对上次结果：'+block['acceptance']+' 选一个没有解释清楚或尚未跑通的地方，回看对应步骤后重做并记录。'
            instruction+='\n参考练习次数已经排完，仍只练当前块；未通过就继续补练，通过验收后由你再安排下一块，计划不会自动判定掌握。'
            practice_index+=1
        else:
            first=min(5,practice_index*6//allocated)
            last=min(6,max(first+1,(practice_index+1)*6//allocated))
            selected=sequence[first:last]
            phase=selected[0][0];label=' / '.join(x[1] for x in selected)
            instruction='\n'.join(x[2] for x in selected)
            instruction+=f'\n本块第 {practice_index+1}/{allocated} 次建议练习；先完成当次最小动作，未完成可续练。'
            practice_index+=1
        reading=block['readings'][0]
        note=(instruction+'\n\n开始前：'+block['prerequisite']+'\n先懂一句话：'+block['intuition']+
              '\n本次预算：'+str(minutes)+' 分钟。时间少就只做上述第一项，未做完留到下次；时间多可复现或改例子，不强行跨阶段。'+
              '\n练习条件：'+setup+'\n阅读入口：'+reading['title']+' '+reading['url']+'\n阅读范围：'+block['scope']+
              '\n整块验收（不代表本次必须全部完成）：'+block['acceptance']+
              '\n卡住回补：'+block['remedy']['text']+'\n每次只记录真实完成部分；模拟、计算与实物分开说明。')
        if block.get('walkthrough'):note+='\n从“回到本块教材与跟练”打开本站课例，按步骤预测，再展开结果核对。'
        if block.get('bridge'):note+='\n先修小课：'+block['bridge']['title']+'。'+block['bridge']['before']
        note+='\n参考用时来自课程编排，不是实测承诺；采用计划不会验证先修或自动标记掌握。'
        tasks.append(dict(title=block['title']+' · '+label,track=track,learning_route=routes.for_goal(goal),stage=month['stage'],due=(start+timedelta(days=i)).isoformat(),minutes=minutes,note=note,source_url=reading['url'],day_index=i+1,unit_id='curriculum:'+block['id'],phase=phase,electronics_unit=''))

    return dict(profile=profile,tasks=tasks)

def create(body):
    key=body.get('id','')
    if not isinstance(key,str) or not re.fullmatch(r'[A-Za-z0-9-]{16,80}',key):raise ValueError('计划标识无效')
    result=preview(body);serialized=json.dumps(result,ensure_ascii=False,sort_keys=True)
    digest=hashlib.sha256(serialized.encode()).hexdigest()
    with core.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT payload_hash,profile FROM learning_plans WHERE id=?',(key,)).fetchone()
        if old:
            if old[0]!=digest and json.loads(old[1])!=result['profile']:raise ValueError('此计划已保存，请重新预览后再创建')
            return
        db.execute('UPDATE learning_plans SET active=0 WHERE active=1 AND learning_route=?',(routes.for_goal(result['profile']['goal']),))
        db.execute('INSERT INTO learning_plans(id,profile,payload_hash,created_at,learning_route) VALUES(?,?,?,?,?)',(key,json.dumps(result['profile'],ensure_ascii=False),digest,core.now(),routes.for_goal(result['profile']['goal'])))
        for t in result['tasks']:
            task=db.execute('INSERT INTO tasks(title,track,stage,due,minutes,note,source_url,created_at,electronics_unit,learning_route) VALUES(?,?,?,?,?,?,?,?,?,?)',tuple(t[k] for k in ('title','track','stage','due','minutes','note','source_url'))+(core.now(),t['electronics_unit'],t['learning_route'])).lastrowid
            db.execute('INSERT INTO plan_tasks VALUES(?,?,?,?,?)',(key,task,t['day_index'],t['unit_id'],t['phase']))

def state(goal=None):
    with core.connect() as db:
        if goal is not None and goal not in routes.ROUTES:raise ValueError('学习路线无效')
        p=db.execute('SELECT * FROM learning_plans WHERE active=1'+(' AND learning_route=?' if goal else '')+' ORDER BY created_at DESC,rowid DESC LIMIT 1', (goal,) if goal else ()).fetchone()
        if not p:return None
        tasks=[dict(r) for r in db.execute('SELECT t.*,pt.day_index,pt.unit_id,pt.phase FROM plan_tasks pt JOIN tasks t ON t.id=pt.task_id WHERE pt.plan_id=? ORDER BY pt.day_index',(p['id'],))]
    return dict(id=p['id'],profile=json.loads(p['profile']),tasks=tasks)

def checkin(body):
    task_id=int(body['task_id'])
    with core.connect() as db:
        task=db.execute('SELECT t.id,t.state FROM tasks t JOIN plan_tasks p ON p.task_id=t.id WHERE t.id=?',(task_id,)).fetchone()
        if not task:raise ValueError('计划任务不存在')
        receipt=db.execute("SELECT name FROM sqlite_master WHERE name='study_receipts'").fetchone()
        exists=receipt and db.execute('SELECT key FROM study_receipts WHERE key=?',(f'plan-checkin-{task_id}-v1',)).fetchone()
        if task['state']=='done' and not exists:return
    study.finish(dict(session_key=f'plan-checkin-{task_id}-v1',task_id=task_id,minutes=body.get('minutes',0),complete=True,evidence=body.get('evidence',''),note=body.get('evidence','')))

def postpone(goal=None):
    active=state(goal)
    if not active:raise ValueError('还没有学习计划')
    with core.connect() as db:
        for t in active['tasks']:
            if t['state']!='done':
                try:due=(date.fromisoformat(t['due'])+timedelta(days=1)).isoformat()
                except ValueError:continue
                db.execute("UPDATE tasks SET due=? WHERE id=? AND state!='done'",(due,t['id']))
