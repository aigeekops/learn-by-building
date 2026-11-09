import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('application_integration', ROOT / 'scripts/integrate_application_draft.py')
APP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(APP)


class ApplicationIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.rows = [{'id': 'hfagents', 'node': 'plan-hfagents', 'units': [{'title': 'original'}]},
                     {'id': 'fsdl', 'node': 'plan-fsdl', 'units': [{'title': 'original'}]},
                     {'id': 'cs50p', 'units': [{'title': 'keep foundation'}]}]
        self.html = ('<html><head></head><body><script>\n'
                     'const records={seconds:61,receipts:["v1"]},courseList=' + json.dumps(self.rows) + ';\n'
                     '/* AI_DRAFT_INTEGRATION_START */keepAI();/* AI_DRAFT_INTEGRATION_END */\n'
                     '/* FOUNDATION_DRAFT_START */keepFoundation();/* FOUNDATION_DRAFT_END */\n'
                     'keepRobotics();\n  const lessonInfo = {};\n  function renderMap(){}\n'
                     '</script></body></html>')

    def test_adds_two_stable_courses_and_future_plan_units_without_rewriting_records(self):
        data = APP.catalog()
        updated = APP.transform(self.html, data)
        start = updated.index(',courseList=') + len(',courseList=')
        rows, _ = json.JSONDecoder().raw_decode(updated[start:])
        self.assertEqual([r['id'] for r in rows], ['hfagents', 'fsdl', 'cs50p'])
        self.assertEqual(rows[2], self.rows[2])
        for row in rows[:2]:
            lessons = [l for l in data['lessons'] if l['course'] == row['id']]
            self.assertGreaterEqual(len(row['units']), 8)
            self.assertEqual(len(row['units']), len(lessons))
            self.assertEqual([u['title'] for u in row['units']], [l['title'] for l in lessons])
            self.assertEqual(row['node'], 'plan-' + row['id'])
        for text in ('const records={seconds:61,receipts:["v1"]}', 'keepAI();', 'keepFoundation();', 'keepRobotics();'):
            self.assertIn(text, updated)

    def test_refresh_is_idempotent_and_has_one_runtime_and_adapter(self):
        first = APP.transform(self.html)
        self.assertEqual(APP.transform(first), first)
        self.assertEqual(first.count(APP.START), 1)
        self.assertEqual(first.count('<!-- APPLICATION_RUNTIME_START -->'), 1)
        self.assertEqual(first.count('/* COURSE_MAP_STATUS_START */'), 1)

    def test_missing_stable_identity_is_rejected(self):
        with self.assertRaises(ValueError):
            APP.transform(self.html.replace('"hfagents"', '"another-course"', 1))


if __name__ == '__main__':
    unittest.main()
