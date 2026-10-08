import json
import tempfile
import unittest
from pathlib import Path
from radar import core, plans, routes, journal, study

class RouteTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=core.DATA;core.DATA=Path(self.tmp.name);core.init()
        self.profile=dict(level='zero',minutes=15,days=7,start='2026-10-07')
    def tearDown(self):core.DATA=self.old;self.tmp.cleanup()
    def plan(self,goal,key):plans.create(dict(self.profile,goal=goal,id=key))
    def test_two_current_plans_and_route_specific_postpone(self):
        self.plan('robotics','route-robot-123456789');self.plan('agent','route-agent-123456789')
        robot=plans.state('robotics');agent=plans.state('agent')
        self.assertEqual(robot['profile']['goal'],'robotics');self.assertEqual(agent['profile']['goal'],'agent')
        plans.postpone('agent');self.assertEqual(plans.state('robotics')['tasks'][0]['due'],'2026-10-07');self.assertEqual(plans.state('agent')['tasks'][0]['due'],'2026-10-08')
        self.plan('embedded','route-embedded-123456789')
        self.assertEqual(plans.state('robotics')['profile']['goal'],'embedded');self.assertEqual(plans.state('agent')['id'],agent['id'])
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_plans WHERE active=1').fetchone()[0],2)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],21)
    def test_saved_session_keeps_route_after_task_deletion_and_review_is_scoped(self):
        self.plan('robotics','route-robot-123456789');self.plan('agent','route-agent-123456789')
        r=plans.state('robotics')['tasks'][0];a=plans.state('agent')['tasks'][0]
        study.finish(dict(session_key='robot-study-123456789',task_id=r['id'],minutes=11,complete=True,evidence='机器人计算记录'))
        study.finish(dict(session_key='agent-study-123456789',task_id=a['id'],minutes=17,complete=True,evidence='程序运行记录'))
        today=journal.local_day(core.now())
        for t in [r,a]:journal.save(dict(id='route-note-'+str(t['id']).zfill(8),title=t['title'],track=t['track'],task_id=t['id'],entry_date=today,body='真实记录',status='recorded'))
        report=journal.review(today,today,route='agent');self.assertEqual((report['minutes'],report['entries'],report['completed']),(17,2,1));self.assertNotIn('机器人计算记录',report['markdown'])
        with core.connect() as db:db.execute('DELETE FROM tasks WHERE id=?',(a['id'],))
        self.assertEqual(journal.review(today,today,track='agent',route='agent')['minutes'],17)
    def test_legacy_migration_restores_each_route_without_changing_evidence(self):
        self.plan('robotics','legacy-robot-123456789');self.plan('agent','legacy-agent-123456789')
        first=plans.state('robotics')['tasks'][0]['id']
        with core.connect() as db:
            db.execute("UPDATE tasks SET state='done',evidence='原始证据' WHERE id=?",(first,))
            db.execute("UPDATE learning_plans SET active=0 WHERE learning_route='robotics'")
            for index in ['tasks_route','entries_route']:db.execute('DROP INDEX '+index)
            for table in ['tasks','sessions','learning_entries','learning_plans']:db.execute('ALTER TABLE '+table+' DROP COLUMN learning_route')
        core.init();self.assertIsNotNone(plans.state('robotics'));self.assertIsNotNone(plans.state('agent'))
        self.assertEqual(plans.state('robotics')['tasks'][0]['evidence'],'原始证据')
        core.init()
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],14)
    def test_invalid_attribution_and_cross_route_link_are_rejected(self):
        self.assertRaises(ValueError,routes.resolve,{'learning_route':'agent'},'robotics')
        self.plan('agent','route-agent-123456789');task=plans.state('agent')['tasks'][0]
        with self.assertRaises(ValueError):journal.save(dict(title='错误关联',track='robotics',learning_route='robotics',task_id=task['id'],entry_date='2026-10-07'))
        self.assertRaises(ValueError,plans.state,'embedded')
