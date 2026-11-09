import json
from pathlib import Path
import unittest

from scripts import integrate_extension_draft as ext

ROOT = Path(__file__).resolve().parent.parent


class ExtensionIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.rows = [{'id': name, 'node': 'plan-' + name, 'units': [{'lesson_id': 'old-' + name}],
                      'study_load': {'core_minutes': 180, 'lesson_minutes': {name + '-return': 321}}}
                     for name in ext.MODULES]
        self.rows.append({'id': 'cs50p', 'units': [{'lesson_id': 'keep'}]})
        self.html = ('<html><head></head><body><script>\n'
                     'const records={seconds:61,receipts:["v1"],tasks:["original"]},courseList='
                     + json.dumps(self.rows) + ';\n'
                     '/* AI_DRAFT_INTEGRATION_START */keepAI();/* AI_DRAFT_INTEGRATION_END */\n'
                     'keepFoundation();keepApplication();keepRobotics();\n  const lessonInfo = {};\n'
                     '</script></body></html>')

    def test_all_ten_stable_courses_feed_new_plan_units_without_rewriting_records(self):
        data = ext.catalog()
        html = ext.transform(self.html, data)
        rows, _ = json.JSONDecoder().raw_decode(html.split(',courseList=', 1)[1])
        self.assertEqual([r['id'] for r in rows], [r['id'] for r in self.rows])
        self.assertEqual(rows[-1], self.rows[-1])
        self.assertEqual(rows[0]['study_load']['lesson_minutes']['cs234-return'], 321)
        for row in rows[:-1]:
            own = [l for l in data['lessons'] if l['course'] == row['id']]
            self.assertEqual([u['lesson_id'] for u in row['units']], [l['id'] for l in own])
            self.assertEqual(set(row['study_load']['lesson_minutes']), {l['id'] for l in own})
            self.assertEqual(len(own), 8)
        for text in ('records={seconds:61,receipts:["v1"],tasks:["original"]}', 'keepAI();',
                     'keepFoundation();', 'keepApplication();', 'keepRobotics();'):
            self.assertIn(text, html)

    def test_repeat_refresh_is_identical_and_has_one_adapter_and_runtime(self):
        first = ext.transform(self.html)
        self.assertEqual(first, ext.transform(first))
        self.assertEqual(first.count(ext.START), 1)
        self.assertEqual(first.count('<!-- EXTENSION_RUNTIME_START -->'), 1)

    def test_missing_existing_identity_is_rejected(self):
        with self.assertRaises(ValueError):
            ext.transform(self.html.replace('"cs234"', '"other"', 1))

    def test_all_original_examples_and_source_versions_are_public_and_recoverable(self):
        data = ext.catalog()
        self.assertEqual(len(data['lessons']), 80)
        self.assertEqual(len(data['courses']), 10)
        for lesson in data['lessons']:
            self.assertGreater(lesson['study_minutes'], 0)
            self.assertTrue(all(data['sources'][s]['checked'] == '2026-11-09' for s in lesson['sources']))
            self.assertTrue((ROOT / 'examples/extension-courses' / (lesson['id'] + '.cjs')).is_file())


if __name__ == '__main__':
    unittest.main()
