"""Persistence and request validation for the reading companion; no network calls."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from radar import core
from server import Handler

class TextbookTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=core.DATA;core.DATA=Path(self.temp.name);core.init()
    def tearDown(self):
        core.DATA=self.old;self.temp.cleanup()
    def request(self,body):
        h=Handler.__new__(Handler);raw=json.dumps(body).encode();h.path='/api/tasks';h.server=SimpleNamespace(server_port=8999)
        h.headers={'Host':'127.0.0.1:8999','Content-Type':'application/json','Content-Length':str(len(raw))};h.rfile=io.BytesIO(raw)
        out=[];h.send=lambda data,status=200,**kw:out.append((data,status));h.do_POST();return out[0]
    def test_association_survives_edit_and_requires_valid_course(self):
        body=dict(title='学习单位',track='robotics',stage='robotics-1',ee_lesson='units')
        self.assertEqual(self.request(body)[1],200)
        with core.connect() as db:
            row=dict(db.execute('SELECT * FROM tasks').fetchone());self.assertEqual(row['ee_lesson'],'units')
        self.assertEqual(self.request(dict(id=row['id'],title='改名后保留关联',track='robotics'))[1],200)
        with core.connect() as db:self.assertEqual(db.execute('SELECT ee_lesson FROM tasks').fetchone()[0],'units')
        self.assertEqual(self.request({**body,'ee_lesson':'unknown'})[1],400)
        self.assertEqual(self.request({**body,'ee_lesson':[]})[1],400)
        self.assertEqual(self.request({**body,'track':'agent','stage':'agent-1'})[1],400)
        self.assertEqual(self.request({**body,'state':'done','evidence':''})[1],400)
        self.assertEqual(self.request(dict(id=row['id'],title='改为其他方向',track='agent'))[1],200)
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT ee_lesson FROM tasks').fetchone()[0],'')
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],1)
    def test_schema_upgrade_keeps_existing_tasks(self):
        with core.connect() as db:
            db.execute('ALTER TABLE tasks DROP COLUMN ee_lesson')
            db.execute("INSERT INTO tasks(title,track,evidence,state) VALUES('既有成果','robotics','真实证据','done')")
        core.init();core.init()
        with core.connect() as db:
            row=dict(db.execute('SELECT * FROM tasks').fetchone())
            self.assertEqual((row['title'],row['evidence'],row['state'],row['ee_lesson']),('既有成果','真实证据','done',''))
