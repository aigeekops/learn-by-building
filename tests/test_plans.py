import tempfile
import unittest
from pathlib import Path
from radar import core, plans

class PlanTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=core.DATA;core.DATA=Path(self.tmp.name);core.init()
        self.body=dict(id='plan-test-123456789',goal='robotics',level='zero',minutes=15,days=7,start='2026-10-07')
    def tearDown(self):core.DATA=self.old;self.tmp.cleanup()
    def test_preview_is_read_only_and_experience_does_not_skip_prerequisites(self):
        beginner=plans.preview(self.body);advanced=plans.preview({**self.body,'level':'project'})
        self.assertEqual(len(beginner['tasks']),7);self.assertEqual(beginner['tasks'][0]['unit_id'],'curriculum:circuit-foundation')
        self.assertEqual(advanced['tasks'][0]['unit_id'],'curriculum:circuit-foundation')
        self.assertEqual(beginner['tasks'][6]['phase'],'review')
        self.assertEqual(beginner['tasks'][0]['electronics_unit'],'');self.assertEqual(beginner['tasks'][2]['electronics_unit'],'')
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],0)
    def test_create_retry_switch_preserves_old_tasks_and_evidence(self):
        plans.create(self.body);plans.create(self.body)
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],7)
        first=plans.state()['tasks'][0]['id'];plans.checkin(dict(task_id=first,minutes=0,evidence='我的预测与计算记录'))
        plans.create({**self.body,'id':'new-plan-123456789','goal':'agent','level':'basic','days':14})
        self.assertEqual(plans.state()['profile']['goal'],'agent')
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],21)
            self.assertEqual(db.execute('SELECT state FROM tasks WHERE id=?',(first,)).fetchone()[0],'done')
    def test_checkin_retry_no_double_time_and_postpone_skips_completed(self):
        plans.create(self.body);tasks=plans.state()['tasks'];body=dict(task_id=tasks[0]['id'],minutes=12,evidence='记录电流路径，待验证实际读数')
        plans.checkin(body);plans.checkin(body);plans.postpone();rows=plans.state()['tasks']
        self.assertEqual(rows[0]['due'],'2026-10-07');self.assertEqual(rows[1]['due'],'2026-10-09')
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT minutes FROM sessions').fetchone()[0],12)
        with self.assertRaises(ValueError):plans.checkin({**body,'minutes':13})
    def test_invalid_settings_and_checkin_cannot_write(self):
        for change in ({'goal':'bad'},{'level':'bad'},{'minutes':0},{'days':30},{'start':'2026-02-30'}):
            with self.assertRaises(ValueError):plans.create({**self.body,**change})
        plans.create(self.body)
        with self.assertRaises(ValueError):plans.checkin(dict(task_id=plans.state()['tasks'][0]['id'],minutes=0,evidence=''))
        with core.connect() as db:self.assertEqual(db.execute("SELECT COUNT(*) FROM tasks WHERE state='done'").fetchone()[0],0)

    def test_custom_daily_minutes_are_preserved_in_plan_and_tasks(self):
        for value in (1,45,'90',480,1440):
            preview=plans.preview({**self.body,'minutes':value})
            self.assertEqual(preview['profile']['minutes'],int(value))
            self.assertTrue(all(t['minutes']==int(value) for t in preview['tasks']))
        plans.create({**self.body,'minutes':'90'})
        self.assertEqual(plans.state()['profile']['minutes'],90)
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT DISTINCT minutes FROM tasks').fetchall()[0][0],90)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)

    def test_daily_minutes_reject_invalid_input_without_truncating(self):
        for value in (0,-1,1441,'',None,True,45.5,'45.5','text',[],{}):
            with self.subTest(value=value),self.assertRaisesRegex(ValueError,'1–1440'):
                plans.create({**self.body,'minutes':value})
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],0)

    def test_companion_content_matches_stage_without_completing_reading_lessons(self):
        preview=plans.preview({**self.body,'level':'project','start_block':'sensor-input'})
        first=preview['tasks'][0]
        self.assertEqual(first['unit_id'],'curriculum:sensor-input')
        self.assertEqual(first['stage'],'robotics-2')
        self.assertIn('开始前：',first['note'])
        self.assertIn('ADC',first['note'])
        data=core.config('robotics_curriculum')
        block=next(b for m in data['months'] for b in m['blocks'] if b['id']=='sensor-input')
        self.assertEqual(first['source_url'],block['readings'][0]['url'])
        plans.create({**self.body,'level':'project','start_block':'sensor-input'})
        with core.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM tasks WHERE ee_lesson!=''").fetchone()[0],0)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM tasks WHERE state='done'").fetchone()[0],0)
        agent=plans.preview({**self.body,'goal':'agent'})
        self.assertNotIn('配套原理：',agent['tasks'][0]['note'])
        self.assertEqual(agent['tasks'][0]['unit_id'],'curriculum:python-first')
        self.assertIn('print',agent['tasks'][0]['note'])

    def test_fifteen_minute_intro_pace_and_no_cross_route_or_wraparound(self):
        for goal in ('robotics','agent'):
            data=core.config(goal+'_curriculum')
            blocks=[b for m in data['months'] for b in m['blocks']]
            p=plans.preview({**self.body,'goal':goal,'days':14})
            self.assertEqual({t['unit_id'] for t in p['tasks'][:7]}, {'curriculum:'+blocks[0]['id']})
            self.assertEqual({t['unit_id'] for t in p['tasks'][7:]}, {'curriculum:'+blocks[1]['id']})
            self.assertEqual(p['tasks'][13]['phase'],'review')
            end=plans.preview({**self.body,'goal':goal,'days':14,'start_block':blocks[-1]['id']})
            self.assertEqual(len({t['unit_id'] for t in end['tasks']}),1)
            with self.assertRaises(ValueError):plans.preview({**self.body,'goal':goal,'start_block':'unknown'})
        with self.assertRaises(ValueError):plans.preview({**self.body,'start_block':'python-first'})

    def test_legacy_task_metadata_and_history_are_not_rewritten(self):
        plans.create(self.body)
        first=plans.state()['tasks'][0]['id']
        with core.connect() as db:
            db.execute("UPDATE plan_tasks SET unit_id='dc',phase='explain' WHERE task_id=?",(first,))
            db.execute("UPDATE tasks SET electronics_unit='dc',evidence='原始计算',state='done' WHERE id=?",(first,))
        plans.create({**self.body,'id':'new-beginner-123456789','start_block':'gpio'})
        with core.connect() as db:
            row=db.execute('SELECT t.electronics_unit,t.evidence,p.unit_id FROM tasks t JOIN plan_tasks p ON t.id=p.task_id WHERE t.id=?',(first,)).fetchone()
            self.assertEqual(tuple(row),('dc','原始计算','dc'))

    def test_pace_depends_on_difficulty_and_daily_budget_without_completing_tasks(self):
        slow=plans.preview({**self.body,'goal':'agent','days':14,'minutes':5})
        fast=plans.preview({**self.body,'goal':'agent','days':14,'minutes':60})
        self.assertEqual(len({t['unit_id'] for t in slow['tasks']}),1)
        self.assertGreater(len({t['unit_id'] for t in fast['tasks']}),1)
        ros=plans.preview({**self.body,'start_block':'ros-messages','days':14,'minutes':30})
        self.assertEqual({t['unit_id'] for t in ros['tasks']},{'curriculum:ros-messages'})
        self.assertIn('不是实测承诺',ros['tasks'][0]['note'])
        self.assertTrue(all(t['electronics_unit']=='' for t in slow['tasks']+fast['tasks']))
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],0)

    def test_review_retrieves_an_earlier_topic_and_lessons_have_navigation(self):
        p=plans.preview({**self.body,'goal':'agent','start_block':'python-branches'})
        self.assertIn('间隔回想',p['tasks'][6]['note'])
        self.assertIn('第一行程序与变量',p['tasks'][6]['note'])
        self.assertIn('打开本站课例',p['tasks'][0]['note'])
        bridge=plans.preview({**self.body,'start_block':'ros-frames'})
        self.assertIn('先修小课',bridge['tasks'][0]['note'])

    def test_current_block_mode_keeps_fourteen_days_on_the_selected_block(self):
        for goal,block in (('robotics','sensor-input'),('agent','python-branches')):
            body={**self.body,'goal':goal,'start_block':block,'minutes':60,'days':14,
                  'progression':'current','device':'linux','practice':'hardware'}
            with self.subTest(goal=goal):
                result=plans.preview(body)
                self.assertEqual({t['unit_id'] for t in result['tasks']},{'curriculum:'+block})
                self.assertEqual(result['profile']['progression'],'current')
                self.assertEqual(result['profile']['device'],'linux')
                self.assertEqual(result['profile']['practice'],'hardware')
                self.assertTrue(all(t['minutes']==60 for t in result['tasks']))
                self.assertEqual([t['day_index'] for t in result['tasks'] if t['phase']=='review'],[7,14])
                self.assertTrue(any('独立复现当前块' in t['title'] for t in result['tasks']))
                self.assertTrue(any('核对并补练当前块' in t['title'] for t in result['tasks']))
                self.assertIn('由你再安排下一块',result['tasks'][11]['note'])
                self.assertNotIn('12/3',result['tasks'][11]['note'])
        with core.connect() as db:
            for table in ('tasks','sessions','learning_plans','plan_tasks'):
                self.assertEqual(db.execute('SELECT COUNT(*) FROM '+table).fetchone()[0],0)

    def test_sequential_progression_and_legacy_default_have_identical_tasks(self):
        body={**self.body,'minutes':60,'days':14}
        legacy=plans.preview(body)
        sequential=plans.preview({**body,'progression':'sequential'})
        self.assertGreater(len({t['unit_id'] for t in sequential['tasks']}),1)
        self.assertEqual(legacy['tasks'],sequential['tasks'])
        self.assertNotIn('progression',legacy['profile'])
        self.assertEqual(sequential['profile'],{**legacy['profile'],'progression':'sequential'})
        plans.create(body)
        # A stored plan from an older renderer can have a different digest.
        # A retry with the same legacy profile must preserve it and its tasks.
        with core.connect() as db:db.execute("UPDATE learning_plans SET payload_hash='older-renderer'")
        plans.create(body)
        self.assertNotIn('progression',plans.state()['profile'])
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],14)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_plans').fetchone()[0],1)

    def test_current_plan_create_is_idempotent_and_does_not_certify_mastery(self):
        body={**self.body,'progression':'current','minutes':60,'days':14}
        plans.create(body);plans.create(body)
        saved=plans.state()
        self.assertEqual(saved['profile']['progression'],'current')
        self.assertEqual(len(saved['tasks']),14)
        self.assertEqual({t['unit_id'] for t in saved['tasks']},{'curriculum:circuit-foundation'})
        self.assertTrue(all(t['state']=='todo' and t['evidence']=='' for t in saved['tasks']))
        with core.connect() as db:self.assertEqual(db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)

    def test_invalid_progression_cannot_write(self):
        for value in ('','automatic','CURRENT',None,True,0,[],{}):
            with self.subTest(value=value),self.assertRaisesRegex(ValueError,'排期方式'):
                plans.create({**self.body,'progression':value})
        with core.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM tasks').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT COUNT(*) FROM learning_plans').fetchone()[0],0)
