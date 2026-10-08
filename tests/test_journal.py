import json
import tempfile
import unittest
from pathlib import Path
from radar import core, journal


class JournalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old = core.DATA
        core.DATA = Path(self.tmp.name)
        core.init()
        self.body = dict(id='journal-test-12345678', title='负载影响', track='robotics', stage='robotics-1',
                         entry_date='2026-10-07', kind='experiment', status='recorded',
                         evidence_type='calculation', question='为什么输出变化？', result='理想计算约1.67V',
                         conclusion='接入10kΩ负载后下方等效为5kΩ', next_step='在仿真中检查实际输入',
                         links=['https://www.falstad.com/circuit/'])

    def tearDown(self):
        core.DATA = self.old
        self.tmp.cleanup()

    def test_roundtrip_idempotency_and_conflicting_edits(self):
        first = journal.save(self.body)
        self.assertEqual(journal.save(self.body)['id'], first['id'])
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_entries').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0], 0)
        updated = journal.save({**self.body, 'updated_at': first['updated_at'], 'body': '记录一条新发现'})
        with self.assertRaises(ValueError):
            journal.save({**self.body, 'updated_at': first['updated_at'], 'body': '其他页面的修改'})
        self.assertEqual(updated['body'], '记录一条新发现')
        self.assertEqual(updated['created_at'], first['created_at'])

    def test_validation_keeps_database_clean(self):
        invalid = [{'entry_date':'2026-02-30'}, {'track':'other'}, {'stage':'agent-1'},
                   {'kind':'article'}, {'status':'finished'}, {'evidence_type':'proven'},
                   {'title':''}, {'links':['javascript:alert(1)']},
                   {'links':['https://user:password@example.com']}, {'links':'https://example.com'},
                   {'task_id':999}, {'result':'x'*10001}]
        for change in invalid:
            with self.subTest(change=list(change)), self.assertRaises(ValueError):
                journal.save({**self.body, **change})
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_entries').fetchone()[0], 0)

    def test_task_link_and_archive_restore_preserve_contents(self):
        with core.connect() as db:
            task = db.execute("INSERT INTO tasks(title,track) VALUES('Practice','robotics')").lastrowid
            other = db.execute("INSERT INTO tasks(title,track) VALUES('Other','agent')").lastrowid
        with self.assertRaises(ValueError): journal.save({**self.body,'task_id':other})
        entry = journal.save({**self.body,'task_id':task})
        journal.archive({'id':entry['id'],'archived':True})
        self.assertEqual(journal.review('2026-10-07','2026-10-07')['entries'], 0)
        journal.archive({'id':entry['id'],'archived':False})
        self.assertEqual(journal.review('2026-10-07','2026-10-07')['entries'], 1)
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT conclusion FROM learning_entries').fetchone()[0], self.body['conclusion'])

    def test_review_uses_shanghai_dates_and_track_filters(self):
        journal.save(self.body)
        journal.save({**self.body,'id':'agent-entry-12345678','track':'agent','stage':'agent-1','title':'Python'})
        with core.connect() as db:
            task = db.execute("INSERT INTO tasks(title,track,state,evidence,completed_at) VALUES(?,?,?,?,?)",
                              ('分压计算','robotics','done','计算并说明条件','2026-10-06T16:30:00+00:00')).lastrowid
            db.execute('INSERT INTO sessions(task_id,minutes,note,created_at) VALUES(?,?,?,?)',
                       (task,25,'计算练习','2026-10-06T16:30:00+00:00'))
        report = journal.review('2026-10-07','2026-10-07','robotics')
        self.assertEqual((report['minutes'],report['entries'],report['completed']), (25,1,1))
        self.assertIn('理想计算约1.67V',report['markdown'])
        self.assertNotIn('Python',report['markdown'])
        self.assertEqual(journal.review('2026-10-06','2026-10-06')['minutes'],0)
        for start,end in [('2026-10-08','2026-10-07'),('2026-01-01','2026-10-07')]:
            with self.assertRaises(ValueError): journal.review(start,end)

    def test_schema_upgrade_keeps_existing_tasks(self):
        with core.connect() as db: db.execute("INSERT INTO tasks(title,track) VALUES('Existing task','robotics')")
        core.init()
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT title FROM tasks').fetchone()[0], 'Existing task')
        entry = journal.save(self.body)
        self.assertIn('## 实际观察',journal.entry_markdown(entry))

    def test_http_routes_and_export_include_records(self):
        import threading
        from http.server import ThreadingHTTPServer
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError
        from server import Handler
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            request=Request(base+'/api/journal',data=json.dumps(self.body).encode(),headers={'Content-Type':'application/json','Origin':base})
            with urlopen(request) as r:self.assertTrue(json.load(r)['ok'])
            with urlopen(base+'/api/export') as r:
                exported=json.load(r)
                self.assertEqual(exported['learning_entries'][0]['id'],self.body['id'])
                self.assertEqual(len(exported['guides'][0]['steps']),3)
            with urlopen(base+'/api/journal/review?start=2026-10-07&end=2026-10-07&track=robotics') as r:
                self.assertEqual(json.load(r)['entries'],1)
            for archived in (True, False):
                request=Request(base+'/api/journal/archive',data=json.dumps({'id':self.body['id'],'archived':archived}).encode(),headers={'Content-Type':'application/json','Origin':base})
                with urlopen(request) as r:self.assertTrue(json.load(r)['ok'])
                with urlopen(base+'/api/state') as r:self.assertEqual(bool(json.load(r)['learning_entries'][0]['archived']),archived)
            for asset in ('electronics-lab.js', 'electronics-lab.css'):
                with urlopen(base+'/'+asset) as r:
                    self.assertEqual(r.status,200)
                    self.assertIn('circuit-lab',r.read().decode())
            def post_task(body):
                req=Request(base+'/api/tasks',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Origin':base})
                with urlopen(req) as response:return json.load(response)
            with urlopen(base+'/api/state') as r:
                state=json.load(r)
                self.assertEqual(set(state['learning_routes']),{'robotics','agent'})
                self.assertEqual(set(state['learning_plans']),{'robotics','agent'})
                self.assertEqual(state['learning_entries'][0]['learning_route'],'robotics')
            with self.assertRaises(HTTPError) as mismatch:post_task(dict(title='归属冲突',track='robotics',learning_route='agent'))
            self.assertEqual(mismatch.exception.code,400)
            task_body=dict(title='电子单元验证',track='robotics',electronics_unit='dc')
            post_task(task_body)
            with urlopen(base+'/api/state') as r:task=json.load(r)['tasks'][0]
            self.assertEqual(task['electronics_unit'],'dc')
            self.assertEqual(task['learning_route'],'robotics')
            post_task(dict(id=task['id'],title='修改任务',track='robotics'))
            with urlopen(base+'/api/state') as r:self.assertEqual(json.load(r)['tasks'][0]['electronics_unit'],'dc')
            with self.assertRaises(HTTPError) as invalid:post_task({**task_body,'electronics_unit':'unknown'})
            self.assertEqual(invalid.exception.code,400)
            post_task(dict(id=task['id'],title='改为AI任务',track='agent'))
            with urlopen(base+'/api/state') as r:
                tasks=json.load(r)['tasks'];self.assertEqual(len(tasks),1);self.assertEqual(tasks[0]['electronics_unit'],'')
            with urlopen(base+'/api/state') as r:
                curriculum=json.load(r)['electronics_beginner']
                self.assertEqual(len(curriculum['lessons']),9)
                self.assertIn('basics',curriculum['lessons'])
            for asset in ('electronics-models.js','electronics-lessons.js','electronics-lessons.css','electronics-basics.js','electronics-beginner.js','electronics-beginner.css','site-route.js','site-route.css'):
                with urlopen(base+'/'+asset) as r:self.assertEqual(r.status,200)
            with urlopen(base+'/assets/divider-load.png') as r:
                self.assertEqual(r.headers['Content-Type'],'image/png')
                self.assertTrue(r.read().startswith(b'\x89PNG'))
            with self.assertRaises(HTTPError) as failure:
                urlopen(base+'/api/journal/review?start=2026-10-08&end=2026-10-07')
            self.assertEqual(failure.exception.code,400)
        finally:
            server.shutdown();server.server_close();thread.join()


if __name__ == '__main__': unittest.main()
