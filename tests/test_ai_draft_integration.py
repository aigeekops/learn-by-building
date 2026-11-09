import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('ai_draft', ROOT / 'scripts/integrate_ai_draft.py')
draft = importlib.util.module_from_spec(spec)
spec.loader.exec_module(draft)


class AIDraftIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'config/ai_courses.json').read_text())
        self.rows = [{'id': c, 'label': c, 'node': 'stable-' + c, 'phase': 'old',
                      'units': [{'title': 'original topic'}]} for c in sorted(draft.COURSES)]
        self.rows.append({'id': 'cs50p', 'units': [{'title': 'existing foundation'}], 'node': 'keep'})
        self.html = ('<html><head><style>body{color:black}</style>'
                     '<style>\n#lbb-course-prototype .aid-scope {color:red}</style>'
                     '<script>\n/* Original, bounded teaching computations. No eval, network, clock or records. */\noldCore();</script>\n'
                     '<!-- FOUNDATION_RUNTIME_START --><script>foundation();</script><!-- FOUNDATION_RUNTIME_END -->'
                     '<script>robotics();</script></head><body><main>Keep map content</main><script>\n'
                     'const records={receipts:["stable-task-v1"],seconds:61},courseList=' + draft.encoded(self.rows) + ';\n'
                     '/* AI_DRAFT_INTEGRATION_START */\noldAdapter();\n/* AI_DRAFT_INTEGRATION_END */\n'
                     '/* FOUNDATION_DRAFT_START */\nkeepFoundation();\n/* FOUNDATION_DRAFT_END */\n'
                     'keepMapAndRecords();\n</script></body></html>')

    def test_updates_published_units_without_changing_other_content(self):
        updated = draft.transform(self.html, self.data)
        rows, _, _ = draft.plan_rows(updated)
        for course in draft.COURSES:
            row = next(r for r in rows if r['id'] == course)
            lessons = [l for l in self.data['lessons'] if l['course'] == course]
            self.assertEqual([u['title'] for u in row['units']], [l['title'] for l in lessons])
            self.assertEqual(row['node'], 'stable-' + course)
        self.assertEqual(rows[-1], self.rows[-1])
        self.assertIn('const records={receipts:["stable-task-v1"],seconds:61}', updated)
        self.assertIn('keepMapAndRecords();', updated)
        self.assertEqual(draft.retained_fingerprint(updated), draft.retained_fingerprint(self.html))
        self.assertLess(updated.index('/* Original, bounded teaching computations.'), updated.index('foundation();'))
        self.assertIn('Original CS146S Fall 2026 experiments.', updated)

    def test_refresh_is_idempotent(self):
        updated = draft.transform(self.html, self.data)
        self.assertEqual(draft.transform(updated, self.data), updated)
        self.assertEqual(updated.count('<!-- AI_COURSE_RUNTIME_START -->'), 1)
        self.assertEqual(updated.count('/* AI_DRAFT_INTEGRATION_START */'), 1)

    def test_refuses_ambiguous_drafts_and_other_editions(self):
        with self.assertRaises(ValueError):
            draft.transform(self.html + self.html, self.data)
        with self.assertRaises(ValueError):
            draft.transform(self.html.replace('/* AI_DRAFT_INTEGRATION_START */', ''), self.data)
        with self.assertRaises(ValueError):
            draft.transform(self.html, {**self.data, 'material_year': 2025})


if __name__ == '__main__':
    unittest.main()
