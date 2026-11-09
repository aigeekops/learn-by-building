import json
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

from scripts import build_learning_app as app
from scripts import refresh_learning_delivery as delivery


class LearningAppBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        cls.site = Path(cls.temporary.name) / 'site'
        # A checkout must work even when desktop authoring and delivery files are absent.
        with patch.object(delivery, 'PUBLISH_TARGETS', ()):
            cls.manifest = app.build(cls.site)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_public_build_has_all_courses_and_only_local_runtime_assets(self):
        html = (self.site / 'index.html').read_text()
        self.assertEqual(html, (self.site / 'learning-map-courses-integrated.html').read_text())
        # Retain every original course while allowing new public catalogs to be added.
        core_courses = {'cme295': 6, 'cs336': 18, 'cs146s': 10, 'cs50p': 11,
                        'tools': 9, 'd2l': 8, 'mit2007': 3, 'modern': 3,
                        'pid': 3, 'kalman': 3, 'ros': 4}
        for key, minimum in core_courses.items():
            self.assertGreaterEqual(self.manifest['courses'][key], minimum, key)
        self.assertEqual(self.manifest['courses']['cs50p'], 11)
        self.assertEqual(self.manifest['courses']['tools'], 9)
        self.assertEqual(self.manifest['authored_lessons'], sum(self.manifest['courses'].values()))
        self.assertEqual(self.manifest['courses']['cs336'], 18)
        self.assertGreaterEqual(self.manifest['courses']['ros'], 4)
        self.assertGreaterEqual(self.manifest['courses']['hfagents'], 8)
        self.assertGreaterEqual(self.manifest['courses']['fsdl'], 8)
        self.assertFalse(self.manifest['personal_data_included'])
        self.assertNotIn('<iframe', html)
        self.assertNotRegex(html, r'<(?:script|style)>(?!</)')
        for name in re.findall(r'(?:src|href)="\./([^"?#]+)"', html):
            self.assertTrue((self.site / name).is_file(), name)
        for asset in self.manifest['assets']:
            self.assertEqual(app.digest((self.site / asset['path']).read_bytes()), asset['sha256'])
        self.assertNotRegex(html, r'<script[^>]*src="https?://')
        self.assertFalse(any(p.name in {'data', '.env', 'server.py'} for p in self.site.rglob('*')))

    def test_offline_copy_and_rebuild_preserve_the_complete_page(self):
        html = (self.site / 'standalone.html').read_text()
        for marker in delivery.MARKERS:
            self.assertEqual(html.count('/* ' + marker + ' */'), 1)
        for feature in ('globalThis.LBBLearningEngine=methods;', 'rf-inverse-kinematics', 'cs50p-files', 'preserveFullscreen:true'):
            self.assertIn(feature, html)
        self.assertNotIn('unpkg.com', html)
        original = (self.site / 'index.html').read_bytes()
        rebuilt = app.build(self.site)
        self.assertEqual((self.site / 'index.html').read_bytes(), original)
        self.assertEqual(rebuilt, self.manifest)

    def test_future_plans_keep_authored_lesson_ids_and_independent_estimates(self):
        from scripts.integrate_ai_draft import plan_rows
        html = (self.site / 'standalone.html').read_text()
        rows, _, _ = plan_rows(html)
        authored = [row for row in rows if row['id'] in self.manifest['courses']]
        self.assertEqual(sum(len(row['units']) for row in authored), self.manifest['authored_lessons'])
        for row in authored:
            ids = [unit['lesson_id'] for unit in row['units']]
            self.assertEqual(set(ids), set(row['study_load']['lesson_minutes']))
            self.assertTrue(all(row['study_load']['lesson_minutes'][key] > 0 for key in ids))
        self.assertIn('root.LBBPersonalSchedule={preview,estimate}', html)
        self.assertIn('data:image/jpeg;base64,', html)
        self.assertIn('https://github.com/aigeekops/learn-by-building', html)

    def test_unknown_output_and_symlink_are_rejected_without_changes(self):
        with tempfile.TemporaryDirectory() as temporary:
            unknown = Path(temporary) / 'user-files'
            unknown.mkdir()
            (unknown / 'keep.txt').write_text('user content')
            with self.assertRaises(ValueError):
                app.build(unknown)
            self.assertEqual((unknown / 'keep.txt').read_text(), 'user content')
            link = Path(temporary) / 'link'
            link.symlink_to(self.site, target_is_directory=True)
            with self.assertRaises(ValueError):
                app.build(link)


if __name__ == '__main__':
    unittest.main()
