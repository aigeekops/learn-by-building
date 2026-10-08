import tempfile
import unittest
from pathlib import Path
from radar import core, study

class StudyTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=core.DATA;core.DATA=Path(self.tmp.name);core.init()
        with core.connect() as db:
            self.task=db.execute("INSERT INTO tasks(title,track) VALUES('Test practice','agent')").lastrowid
        self.body=dict(session_key='test-session-12345678',task_id=self.task,minutes=25,complete=True,evidence='Verified result',note='Next: evaluate')
    def tearDown(self):
        core.DATA=self.old;self.tmp.cleanup()
    def test_atomic_completion_and_retry(self):
        study.finish(self.body);study.finish(self.body)
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],1)
            t=db.execute('SELECT * FROM tasks').fetchone()
            self.assertEqual(t['state'],'done');self.assertEqual(t['evidence'],'Verified result');self.assertTrue(t['completed_at'])
        with self.assertRaises(ValueError):study.finish({**self.body,'minutes':30})
    def test_validation_does_not_write(self):
        for changes in ({'evidence':''},{'task_id':999},{'minutes':-1},{'minutes':1441},{'session_key':'bad'},{'minutes':0,'complete':False}):
            with self.assertRaises(ValueError):study.finish({**self.body,**changes})
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT state FROM tasks').fetchone()[0],'todo')
    def test_session_without_completion(self):
        study.finish({**self.body,'complete':False,'evidence':''})
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT state FROM tasks').fetchone()[0],'todo')
            self.assertEqual(db.execute('SELECT minutes FROM sessions').fetchone()[0],25)
    def test_partial_evidence_is_preserved(self):
        study.finish({**self.body,'complete':False})
        with core.connect() as db:
            t=db.execute('SELECT * FROM tasks').fetchone()
            self.assertEqual(t['state'],'todo');self.assertEqual(t['evidence'],'Verified result')
    def test_zero_minutes_completion(self):
        study.finish({**self.body,'minutes':0})
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT state FROM tasks').fetchone()[0],'done')
    def test_transaction_rolls_back(self):
        with core.connect() as db:
            db.execute("CREATE TRIGGER reject_task BEFORE UPDATE ON tasks BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        with self.assertRaises(Exception):study.finish(self.body)
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
