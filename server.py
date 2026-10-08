#!/usr/bin/env python3
"""Local, single-user learning platform. Run: python3 server.py"""
import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs
from radar import core, journal, plans, backup, community

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send(self,data,status=200,kind='application/json; charset=utf-8'):
        raw=json.dumps(data,ensure_ascii=False).encode() if kind.startswith('application/json') else data
        self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'")
        self.end_headers();self.wfile.write(raw)
    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')
    def do_GET(self):
        if not self.valid_host(): return self.send({'error':'Invalid Host'},403)
        route=urlsplit(self.path).path
        if route=='/api/backup':return self.send(backup.export())
        if route in ('/api/state','/api/export'):
            with core.connect() as db:
                tables={t:[dict(r) for r in db.execute(f'SELECT * FROM {t}')] for t in ('tasks','sessions')}
                tables['learning_entries']=[journal.decode(r) for r in db.execute('SELECT * FROM learning_entries ORDER BY entry_date DESC,updated_at DESC')]
            tables['guides']=core.config('guides')
            tables['electronics_paths']=core.config('electronics_paths')
            tables['ee_textbook']=core.config('ee_textbook')
            tables['learning_links']=core.config('learning_links')
            tables['robotics_curriculum']=core.config('robotics_curriculum')
            tables['agent_curriculum']=core.config('agent_curriculum')
            tables['community']=community.clean(core.config('community'))
            tables['electronics_beginner']=core.config('electronics_beginner')
            tables['learning_plan']=plans.state()
            from radar import routes
            tables['learning_routes']=routes.ROUTES
            tables['learning_plans']={goal:plans.state(goal) for goal in routes.ROUTES}
            tables['roadmaps']=core.config('roadmaps')
            return self.send(tables)
        if route=='/api/journal/review':
            try:
                query=parse_qs(urlsplit(self.path).query)
                return self.send(journal.review(query.get('start',[''])[0],query.get('end',[''])[0],query.get('track',['all'])[0],query.get('route',[None])[0]))
            except (ValueError,TypeError):return self.send({'error':'复盘日期或学习方向无效'},400)
        files={'/automatic-journal.js':('automatic-journal.js','text/javascript; charset=utf-8'),'/immersive.js':('immersive.js','text/javascript; charset=utf-8'),'/immersive.css':('immersive.css','text/css; charset=utf-8'),'/electronics-basics.js':('electronics-basics.js','text/javascript; charset=utf-8'),'/electronics-beginner.js':('electronics-beginner.js','text/javascript; charset=utf-8'),'/electronics-beginner.css':('electronics-beginner.css','text/css; charset=utf-8'),'/electronics-models.js':('electronics-models.js','text/javascript; charset=utf-8'),'/electronics-lessons.js':('electronics-lessons.js','text/javascript; charset=utf-8'),'/electronics-lessons.css':('electronics-lessons.css','text/css; charset=utf-8'),'/personal-plan.js':('personal-plan.js','text/javascript; charset=utf-8'),'/rc-lab.js':('rc-lab.js','text/javascript; charset=utf-8'),'/learning-paths.js':('learning-paths.js','text/javascript; charset=utf-8'),'/electronics-lab.js':('electronics-lab.js','text/javascript; charset=utf-8'),'/electronics-lab.css':('electronics-lab.css','text/css; charset=utf-8'),'/journal.js':('journal.js','text/javascript; charset=utf-8'),'/journal.css':('journal.css','text/css; charset=utf-8'),'/dashboard.js':('dashboard.js','text/javascript; charset=utf-8'),'/':('index.html','text/html; charset=utf-8'),'/app.js':('app.js','text/javascript; charset=utf-8'),'/style.css':('style.css','text/css; charset=utf-8')}
        files['/workspace-tools.js']=('workspace-tools.js','text/javascript; charset=utf-8')
        files.update({'/author.json':('author.json','application/json; charset=utf-8'),'/wechat-follow.js':('wechat-follow.js','text/javascript; charset=utf-8'),'/wechat-follow.css':('wechat-follow.css','text/css; charset=utf-8')})
        if (core.ROOT/'web/assets/wechat-qr.jpg').is_file():
            files['/assets/wechat-qr.jpg']=('assets/wechat-qr.jpg','image/jpeg')
        files['/community.js']=('community.js','text/javascript; charset=utf-8')
        files['/community.css']=('community.css','text/css; charset=utf-8')
        files.update({'/site-route.js':('site-route.js','text/javascript; charset=utf-8'),'/site-route.css':('site-route.css','text/css; charset=utf-8'),'/ee-textbook.js':('ee-textbook.js','text/javascript; charset=utf-8'),'/ee-textbook.css':('ee-textbook.css','text/css; charset=utf-8')})
        files.update({'/learning-links.js':('learning-links.js','text/javascript; charset=utf-8'),'/learning-links.css':('learning-links.css','text/css; charset=utf-8')})
        files.update({'/robotics-curriculum.js':('robotics-curriculum.js','text/javascript; charset=utf-8'),'/robotics-curriculum.css':('robotics-curriculum.css','text/css; charset=utf-8')})
        for name in ('divider-load','diagnosis-path','load-current-tradeoff'):
            files[f'/assets/{name}.png']=(f'assets/{name}.png','image/png')
        if route not in files:return self.send({'error':'Not found'},404)
        name,mime=files[route];raw=(core.ROOT/'web'/name).read_bytes()
        return self.send(json.loads(raw) if mime.startswith('application/json') else raw,kind=mime)
    def do_POST(self):
        if not self.valid_host():return self.send({'error':'Invalid Host'},403)
        origin=self.headers.get('Origin')
        if origin and origin not in (f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'):return self.send({'error':'Invalid Origin'},403)
        if self.headers.get('Content-Type')!='application/json':return self.send({'error':'JSON required'},415)
        try:
            route=urlsplit(self.path).path
            length=int(self.headers.get('Content-Length',0))
            limit=20*1024*1024 if route in ('/api/backup/preview','/api/backup/restore') else 100000
            if not 0<length<limit:raise ValueError('请求大小无效')
            body=json.loads(self.rfile.read(length));route=urlsplit(self.path).path
            if not isinstance(body,dict):raise ValueError('请求应为JSON对象')
            if route=='/api/backup/preview':return self.send(backup.preview(body.get('backup')))
            if route=='/api/backup/restore':return self.send(backup.restore(body))
            if route=='/api/plan/preview':return self.send(plans.preview(body))
            if route=='/api/plan':
                plans.create(body);return self.send({'ok':True})
            if route=='/api/plan/checkin':
                plans.checkin(body);return self.send({'ok':True})
            if route=='/api/plan/postpone':
                plans.postpone(body.get('goal'));return self.send({'ok':True})
            if route=='/api/journal/automatic':
                return self.send({'ok':True,'entry':journal.automatic(body)})
            if route=='/api/journal':
                return self.send({'ok':True,'entry':journal.save(body)})
            elif route=='/api/journal/archive':
                journal.archive(body)
                return self.send({'ok':True})
            if route=='/api/tasks':
                title=str(body.get('title','')).strip()
                if not title:raise ValueError('请填写任务名称')
                track=body.get('track','agent'); stage=body.get('stage','')
                roads=core.config('roadmaps'); valid=next((r for r in roads if r['id']==track),None)
                if not valid or (stage and stage not in [s['id'] for s in valid['stages']]):raise ValueError('路线或阶段无效')
                due=body.get('due','')
                if due and not re.fullmatch(r'\d{4}-\d{2}-\d{2}',due):raise ValueError('日期格式无效')
                minutes=int(body.get('minutes',30))
                if not 1<=minutes<=1440:raise ValueError('时长必须在1到1440分钟之间')
                state=body.get('state','todo');evidence=str(body.get('evidence','')).strip()
                if state not in ('todo','doing','done'):raise ValueError('状态无效')
                if state=='done' and not evidence:raise ValueError('完成任务前，请记录学习成果或验证证据')
                url=body.get('source_url','')
                if url:core.canonical(url)
                unit=body.get('electronics_unit')
                if unit is not None and (not isinstance(unit,str) or (unit and (track!='robotics' or unit not in {u['id'] for u in core.config('electronics_paths')['units']}))):raise ValueError('电子学习单元无效')
                ee_lesson=body.get('ee_lesson')
                if ee_lesson is not None and (not isinstance(ee_lesson,str) or (ee_lesson and (track!='robotics' or ee_lesson not in {l['id'] for l in core.config('ee_textbook')['lessons']}))):raise ValueError('电路导学单元无效')
                values=(title[:300],track,stage,due,minutes,state,evidence[:5000],str(body.get('note',''))[:5000],url,core.now() if state=='done' else None)
                with core.connect() as db:
                    db.execute('BEGIN IMMEDIATE')
                    row=None
                    if body.get('id'):
                        row=db.execute('SELECT * FROM tasks WHERE id=?',(body['id'],)).fetchone()
                        if not row:raise ValueError('任务不存在')
                        if state=='done' and row['completed_at']:values=values[:-1]+(row['completed_at'],)
                        db.execute('UPDATE tasks SET title=?,track=?,stage=?,due=?,minutes=?,state=?,evidence=?,note=?,source_url=?,completed_at=? WHERE id=?',values+(body['id'],))
                    else:created=db.execute('INSERT INTO tasks(title,track,stage,due,minutes,state,evidence,note,source_url,completed_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',values+(core.now(),))
                    task_id=body['id'] if body.get('id') else created.lastrowid
                    from radar import routes
                    learning_route=routes.resolve(body,track,row if body.get('id') else None)
                    db.execute('UPDATE tasks SET learning_route=? WHERE id=?',(learning_route,task_id))
                    if ee_lesson is not None:db.execute('UPDATE tasks SET ee_lesson=? WHERE id=?',(ee_lesson,task_id))
                    elif track!='robotics':db.execute("UPDATE tasks SET ee_lesson='' WHERE id=?",(task_id,))
                    if unit is not None:db.execute('UPDATE tasks SET electronics_unit=? WHERE id=?',(unit,task_id))
                    elif track!='robotics':db.execute("UPDATE tasks SET electronics_unit='' WHERE id=?",(task_id,))
                    if state=='done' and (row is None or row['state']!='done'):
                        saved=db.execute('SELECT * FROM tasks WHERE id=?',(task_id,)).fetchone()
                        journal.record_task(db,saved,'task-done:'+str(task_id)+':'+core.now(),evidence=saved['evidence'],completed=True)
            elif route=='/api/study/finish':
                from radar.study import finish
                finish(body)
            elif route=='/api/tasks/delete':
                with core.connect() as db:db.execute('DELETE FROM tasks WHERE id=?',(body['id'],))
            elif route=='/api/sessions':
                minutes=int(body['minutes'])
                if not 1<=minutes<=1440:raise ValueError('时长必须在1到1440分钟之间')
                with core.connect() as db:
                    task=db.execute('SELECT * FROM tasks WHERE id=?',(body['task_id'],)).fetchone()
                    if not task:raise ValueError('任务不存在')
                    from radar import routes
                    note=str(body.get('note',''))[:1000]
                    session=db.execute('INSERT INTO sessions(task_id,minutes,note,created_at,learning_route) VALUES(?,?,?,?,?)',(body['task_id'],minutes,note,core.now(),routes.resolve({},task['track'],task)))
                    journal.record_task(db,task,'session:'+str(session.lastrowid),minutes,note=note)
            elif route=='/api/community':
                core.save_config('community',community.clean(body))
            else:return self.send({'error':'Not found'},404)
            self.send({'ok':True})
        except (ValueError,KeyError,TypeError) as exc:self.send({'error':str(exc)},400)
        except Exception:self.send({'error':'操作失败，请检查服务配置或稍后重试'},500)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
    core.init()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'动手学 · Learn by Building → http://127.0.0.1:{args.port}',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:stop.set();server.server_close()
if __name__=='__main__':main()
