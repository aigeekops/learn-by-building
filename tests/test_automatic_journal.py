"""Automatic records must preserve real events, idempotency, and private backups."""
import copy
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from radar import backup, core, journal, study


class AutomaticJournalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old_data = core.DATA
        core.DATA = Path(self.tmp.name)
        core.init()
        self.tasks = {}
        with core.connect() as db:
            for route in ('robotics', 'agent'):
                self.tasks[route] = db.execute(
                    '''INSERT INTO tasks(title,track,stage,learning_route,source_url)
                       VALUES(?,?,?,?,?)''',
                    ('测试学习任务', route, route+'-1', route, 'https://example.org/lesson'),
                ).lastrowid
        self.finish_body = dict(session_key='automatic-study-12345678',
                                task_id=self.tasks['robotics'], minutes=2,
                                timer_seconds=125, complete=True,
                                evidence='测试成果：独立验证输出', note='下次比较另一组条件')
        self.event = dict(source_key='basic:led:change', entry=dict(
            title='LED 模型观察', track='robotics', learning_route='robotics',
            stage='robotics-1', task_id=self.tasks['robotics'], entry_date='2026-10-07',
            kind='experiment', evidence_type='calculation',
            procedure='网页理想模型：5 V，330 Ω。', result='模型电流 9.09 mA。',
            prediction='', conclusion='', links=['https://example.org/lesson']))

    def tearDown(self):
        core.DATA = self.old_data
        self.tmp.cleanup()

    def tables(self):
        return backup.export()['tables']

    def entries(self):
        with core.connect() as db:
            return [journal.decode(row) for row in db.execute('SELECT * FROM learning_entries ORDER BY id')]

    def test_finish_writes_one_record_and_session_with_task_completion(self):
        study.finish(self.finish_body)
        data = self.tables()
        self.assertEqual(len(data['learning_entries']), 1)
        self.assertEqual(len(data['sessions']), 1)
        self.assertEqual(len(data['study_receipts']), 1)
        entry = self.entries()[0]
        task = next(t for t in data['tasks'] if t['id'] == self.tasks['robotics'])
        self.assertTrue(entry['id'].startswith('auto-'))
        self.assertEqual((entry['kind'], entry['evidence_type'], entry['status']),
                         ('activity', 'activity', 'recorded'))
        self.assertIn('2 分 5 秒', entry['body'])
        self.assertEqual(entry['result'], self.finish_body['evidence'])
        self.assertEqual(entry['procedure'], self.finish_body['note'])
        self.assertEqual(entry['task_id'], task['id'])
        self.assertEqual(entry['links'], ['https://example.org/lesson'])
        self.assertEqual((task['state'], task['evidence']), ('done', self.finish_body['evidence']))
        self.assertTrue(task['completed_at'])
        self.assertEqual(data['sessions'][0]['minutes'], 2)
        self.assertFalse(entry['conclusion'])

    def test_same_finish_receipt_never_duplicates_or_overwrites(self):
        study.finish(self.finish_body)
        original = self.entries()[0]
        journal.save({**original, 'body': '个人补充：仍需进一步练习'})
        journal.archive(dict(id=original['id'], archived=True))
        before = self.tables()
        study.finish(self.finish_body)
        self.assertEqual(self.tables(), before)
        with self.assertRaises(ValueError):
            study.finish({**self.finish_body, 'note': '改变已提交内容'})
        self.assertEqual(self.tables(), before)

    def test_subminute_timer_records_seconds_without_adding_minutes_or_completion(self):
        study.finish({**self.finish_body, 'minutes': 0, 'timer_seconds': 25,
                      'complete': False, 'evidence': '', 'note': ''})
        data = self.tables()
        entry = self.entries()[0]
        self.assertIn('0 分 25 秒', entry['body'])
        self.assertIn('计入 0 分钟', entry['body'])
        self.assertEqual(data['sessions'], [])
        self.assertEqual(len(data['study_receipts']), 1)
        task = next(t for t in data['tasks'] if t['id'] == self.tasks['robotics'])
        self.assertEqual(task['state'], 'todo')
        self.assertFalse(task['completed_at'])
        self.assertFalse(task['evidence'])

    def test_invalid_timer_and_minutes_leave_records_unchanged(self):
        before = self.tables()
        for values in ({'minutes': 1}, {'minutes': 0, 'timer_seconds': 60},
                       {'timer_seconds': -1}, {'timer_seconds': True},
                       {'timer_seconds': 25.5}, {'timer_seconds': 86401}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                study.finish({**self.finish_body, **values})
            self.assertEqual(self.tables(), before)

    def test_journal_insert_failure_rolls_back_task_session_and_receipt(self):
        before = self.tables()
        with core.connect() as db:
            db.execute('''CREATE TRIGGER reject_automatic_entry BEFORE INSERT ON learning_entries
                          BEGIN SELECT RAISE(ABORT,'journal insertion failed'); END''')
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'journal insertion failed'):
            study.finish(self.finish_body)
        self.assertEqual(self.tables(), before)

    def test_same_source_and_objective_snapshot_are_deduplicated(self):
        first = journal.automatic(self.event)
        replay = journal.automatic(copy.deepcopy(self.event))
        self.assertEqual(replay, first)
        self.assertEqual(len(self.entries()), 1)

    def test_changed_objective_result_or_day_creates_separate_observation(self):
        original = journal.automatic(self.event)
        changed = copy.deepcopy(self.event)
        changed['entry']['result'] = '模型电流 3.03 mA。'
        second = journal.automatic(changed)
        another_day = copy.deepcopy(self.event)
        another_day['entry']['entry_date'] = '2026-10-08'
        third = journal.automatic(another_day)
        self.assertEqual(len({original['id'], second['id'], third['id']}), 3)
        self.assertEqual(len(self.entries()), 3)

    def test_server_date_uses_shanghai_and_retries_same_day(self):
        event = copy.deepcopy(self.event)
        event['entry'].pop('entry_date')
        with patch.object(core, 'now', return_value='2026-10-06T16:30:00+00:00'):
            first = journal.automatic(event)
            second = journal.automatic(event)
        self.assertEqual(first['entry_date'], '2026-10-07')
        self.assertEqual(first['id'], second['id'])

    def test_auto_retry_preserves_manual_edits_and_archiving(self):
        original = journal.automatic(self.event)
        edited = journal.save({**original, 'body': '我的疑问：真实元件误差有多大？',
                               'conclusion': '个人补充，不是平台推断。'})
        journal.archive(dict(id=edited['id'], archived=True))
        before = self.tables()
        replay = journal.automatic(self.event)
        self.assertEqual(replay['body'], edited['body'])
        self.assertEqual(replay['conclusion'], edited['conclusion'])
        self.assertEqual(replay['archived'], 1)
        self.assertEqual(self.tables(), before)

    def test_automatic_event_never_adds_time_or_completes_task(self):
        before = self.tables()
        entry = journal.automatic(self.event)
        after = self.tables()
        self.assertEqual(entry['status'], 'recorded')
        for table in ('tasks', 'sessions', 'study_receipts', 'learning_plans', 'plan_tasks'):
            self.assertEqual(after[table], before[table], table)

    def test_cross_route_history_follows_the_originating_task_and_event(self):
        study.finish({**self.finish_body, 'task_id': self.tasks['agent'], 'route': 'robotics'})
        event = copy.deepcopy(self.event)
        event['source_key'] = 'curriculum:python-first:open'
        event['entry'].update(track='agent', learning_route='agent', stage='agent-1',
                              task_id=self.tasks['agent'], kind='activity', evidence_type='activity')
        journal.automatic(event)
        data = self.tables()
        self.assertTrue(all(e['learning_route'] == e['track'] == 'agent' for e in self.entries()))
        self.assertEqual(data['sessions'][0]['learning_route'], 'agent')
        wrong = copy.deepcopy(self.event)
        wrong['entry']['task_id'] = self.tasks['agent']
        with self.assertRaises(ValueError):
            journal.automatic(wrong)
        self.assertEqual(self.tables(), data)

    def test_replays_remain_harmless_after_task_deletion(self):
        study.finish(self.finish_body)
        entry = journal.automatic(self.event)
        with core.connect() as db:
            db.execute('DELETE FROM tasks WHERE id=?', (self.tasks['robotics'],))
        before = self.tables()
        study.finish(self.finish_body)
        self.assertEqual(journal.automatic(self.event)['id'], entry['id'])
        self.assertEqual(self.tables(), before)

    def test_v1_backup_roundtrip_preserves_automatic_records_and_deduplication(self):
        study.finish(self.finish_body)
        original = journal.automatic(self.event)
        journal.archive(dict(id=original['id'], archived=True))
        exported = backup.export()
        self.assertEqual(exported['version'], 1)
        with core.connect() as db:
            db.execute("UPDATE learning_entries SET body='恢复前临时修改'")
        preview = backup.preview(exported)
        result = backup.restore(dict(backup=exported, checksum=preview['checksum'],
                                     revision=preview['revision'], confirmation='replace-learning-records'))
        self.assertTrue(result['ok'])
        self.assertEqual(self.tables(), exported['tables'])
        study.finish(self.finish_body)
        self.assertEqual(journal.automatic(self.event)['id'], original['id'])
        self.assertEqual(self.tables(), exported['tables'])

    def test_auto_events_reject_fabricated_hardware_or_personal_conclusions(self):
        before = self.tables()
        for changes in ({'evidence_type': 'hardware'}, {'kind': 'review'},
                        {'conclusion': '已经掌握'}, {'prediction': '我早就预计到了'}):
            event = copy.deepcopy(self.event)
            event['entry'].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                journal.automatic(event)
        self.assertEqual(self.tables(), before)
