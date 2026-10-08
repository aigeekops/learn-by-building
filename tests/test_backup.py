import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from radar import backup, core, journal, plans


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=core.DATA
        core.DATA=Path(self.tmp.name);core.init()

    def tearDown(self):
        core.DATA=self.old;self.tmp.cleanup()

    def seed(self):
        for goal in ('robotics','agent'):
            plans.create(dict(id='backup-plan-'+goal+'-123456',goal=goal,minutes=30,
                              level='zero',days=7,start='2026-10-07'))
            task=plans.state(goal)['tasks'][0]
            plans.checkin(dict(task_id=task['id'],minutes=12,evidence='测试夹具：解释结果'))
            journal.save(dict(id='backup-note-'+goal+'-123456',title='测试笔记',track=goal,
                              task_id=task['id'],entry_date='2026-10-07',kind='note',status='recorded',
                              evidence_type='reading',body='测试夹具：复习记录',links=['https://example.org/']))

    def confirmed(self,data):
        p=backup.preview(data)
        return dict(backup=data,checksum=p['checksum'],revision=p['revision'],confirmation='replace-learning-records')

    def test_empty_export_and_preview_are_read_only(self):
        data=backup.export();p=backup.preview(data)
        self.assertTrue(all(n==0 for n in p['counts'].values()))
        with core.connect() as db:
            self.assertIsNone(db.execute("SELECT name FROM sqlite_master WHERE name='study_receipts'").fetchone())
        self.assertFalse((core.DATA/'backups').exists())
        self.assertEqual(set(data['tables']),set(backup.TABLES))

    def test_roundtrip_preserves_both_routes_evidence_time_and_idempotency(self):
        self.seed();data=backup.export()
        with core.connect() as db:
            db.execute("UPDATE tasks SET note='后来修改的内容'")
            db.execute("CREATE TABLE IF NOT EXISTS outside_scope(id TEXT PRIMARY KEY,message TEXT)")
            db.execute("INSERT OR REPLACE INTO outside_scope(id,message) VALUES('outside-scope','保持原值')")
        before=backup.export()
        result=backup.restore(self.confirmed(data))
        self.assertEqual(backup.export()['tables'],data['tables'])
        safety=core.DATA/'backups'/result['safety_backup']
        self.assertEqual(json.loads(safety.read_text())['tables'],before['tables'])
        self.assertEqual(safety.stat().st_mode&0o777,0o600)
        for goal in ('robotics','agent'):
            first=plans.state(goal)['tasks'][0]
            plans.checkin(dict(task_id=first['id'],minutes=12,evidence='测试夹具：解释结果'))
        self.assertEqual(len(backup.export()['tables']['sessions']),2)
        with core.connect() as db:
            self.assertEqual(db.execute("SELECT message FROM outside_scope WHERE id='outside-scope'").fetchone()[0],'保持原值')

    def test_stale_preview_and_changed_file_cannot_overwrite(self):
        self.seed();data=backup.export();body=self.confirmed(data)
        with core.connect() as db:db.execute("UPDATE tasks SET note='预览之后的修改'")
        current=backup.export()['tables']
        with self.assertRaisesRegex(ValueError,'重新预览'):backup.restore(body)
        self.assertEqual(backup.export()['tables'],current)
        body=self.confirmed(data);body['backup']['tables']['tasks'][0]['title']='改过的文件'
        with self.assertRaisesRegex(ValueError,'重新预览'):backup.restore(body)
        self.assertFalse((core.DATA/'backups').exists())

    def test_invalid_content_and_route_links_rejected(self):
        self.seed();data=backup.export()
        changes=[lambda d:d.update(version=True),
                 lambda d:d['tables'].update(unknown_table=[]),
                 lambda d:d['tables']['tasks'][0].update(extra='SQL'),
                 lambda d:d['tables']['tasks'][0].update(minutes=None),
                 lambda d:d['tables']['tasks'][0].update(minutes=True),
                 lambda d:d['tables']['tasks'][0].update(evidence=''),
                 lambda d:d['tables']['tasks'][0].update(source_url='javascript:alert(1)'),
                 lambda d:d['tables']['tasks'].append(d['tables']['tasks'][0]),
                 lambda d:d['tables']['sessions'][0].update(learning_route='agent'),
                 lambda d:d['tables']['learning_entries'][0].update(links='["file:///tmp/private"]'),
                 lambda d:d['tables']['plan_tasks'][0].update(plan_id='missing')]
        for change in changes:
            with self.subTest(change=changes.index(change)):
                bad=copy.deepcopy(data);change(bad)
                with self.assertRaises(ValueError):backup.preview(bad)
        self.assertEqual(backup.export()['tables'],data['tables'])

    def test_deleted_tasks_keep_historical_sessions_notes_and_plan_links(self):
        self.seed()
        with core.connect() as db:db.execute('DELETE FROM tasks WHERE id=1')
        data=backup.export();backup.restore(self.confirmed(data))
        self.assertEqual(backup.export()['tables'],data['tables'])

    def test_insert_failure_rolls_back_every_table(self):
        self.seed();data=backup.export()
        with core.connect() as db:
            db.execute("UPDATE tasks SET note='恢复前内容'")
            db.execute("CREATE TRIGGER reject_backup BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT,'test rollback'); END")
        before=backup.export()['tables']
        with self.assertRaisesRegex(ValueError,'现有记录未替换'):backup.restore(self.confirmed(data))
        self.assertEqual(backup.export()['tables'],before)

    def test_failed_safety_backup_or_missing_confirmation_cannot_delete_records(self):
        self.seed();data=backup.export();body=self.confirmed(data)
        with self.assertRaises(ValueError):backup.restore({**body,'confirmation':''})
        with patch('radar.backup.open',side_effect=OSError('disk full')):
            with self.assertRaises(OSError):backup.restore(body)
        self.assertEqual(backup.export()['tables'],data['tables'])

    def test_backup_size_limit(self):
        with patch.object(backup,'LIMIT',20):
            with self.assertRaisesRegex(ValueError,'12 MB'):backup.preview(backup.export())

    def test_onboarding_conditions_persist_and_invalid_values_do_not_write(self):
        body=dict(id='onboarding-conditions-12345',goal='robotics',level='zero',minutes=17,
                  days=7,start='2026-10-07',device='macos',practice='hardware')
        plans.create(body);p=plans.state('robotics')
        self.assertEqual(p['profile']['device'],'macos');self.assertEqual(p['profile']['practice'],'hardware')
        self.assertTrue(all(t['minutes']==17 and '额定值' in t['note'] for t in p['tasks']))
        for values in ({'device':'other'},{'practice':'other'}):
            with self.assertRaises(ValueError):plans.create({**body,**values})
        self.assertEqual(len(backup.export()['tables']['tasks']),7)

    def test_http_backup_preview_restore_and_body_limits(self):
        import threading
        from http.server import ThreadingHTTPServer
        from urllib.request import Request, urlopen
        from urllib.error import HTTPError
        from server import Handler
        self.seed()
        with core.connect() as db:db.execute("UPDATE tasks SET note=?",('足够长的测试笔记'*1500,))
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base='http://127.0.0.1:'+str(server.server_port)
        def request(path,data=None,origin=None):
            headers={'Content-Type':'application/json'}
            if origin:headers['Origin']=origin
            req=Request(base+path,None if data is None else json.dumps(data).encode(),headers)
            with urlopen(req,timeout=5) as response:return json.load(response)
        try:
            data=request('/api/backup')
            self.assertGreater(len(json.dumps(data)),100000)
            p=request('/api/backup/preview',{'backup':data},base)
            self.assertEqual(p['counts']['tasks'],14)
            restored=request('/api/backup/restore',dict(backup=data,checksum=p['checksum'],revision=p['revision'],confirmation='replace-learning-records'),base)
            self.assertTrue(restored['ok'])
            for path,body,origin,status in [('/api/backup/preview',{'backup':{}},base,400),
                                            ('/api/backup/restore',{'backup':data},base,400),
                                            ('/api/backup/preview',{'backup':{}},'https://example.org',403),
                                            ('/api/tasks',{'note':'x'*100001},base,400)]:
                with self.subTest(path=path,origin=origin):
                    with self.assertRaises(HTTPError) as caught:request(path,body,origin)
                    self.assertEqual(caught.exception.code,status);caught.exception.close()
            with urlopen(base+'/') as response:
                self.assertIn('动手学',response.read().decode())
        finally:
            server.shutdown();server.server_close();thread.join()
