import unittest

from radar import community


class CommunityTests(unittest.TestCase):
    def test_unconnected_defaults_and_strict_boolean(self):
        self.assertEqual(community.clean({}), {
            'repository': '', 'discussions_enabled': False,
        })
        self.assertEqual(community.normalize_repository('  '), '')
        for value in (None, 0, 1, 'true', 'false', [], {}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                community.clean({'repository': 'learner/radar',
                                 'discussions_enabled': value})
        with self.assertRaises(ValueError):
            community.clean({'repository': '', 'discussions_enabled': True})

    def test_normalizes_only_the_repository_form(self):
        for value in ('learner/radar', 'https://github.com/learner/radar',
                      '  learner/radar  '):
            with self.subTest(value=value):
                self.assertEqual(community.normalize_repository(value),
                                 'https://github.com/learner/radar')
        self.assertEqual(community.normalize_repository('A-team/learning_radar.v2'),
                         'https://github.com/A-team/learning_radar.v2')
        self.assertEqual(community.normalize_repository('a/.github'),
                         'https://github.com/a/.github')

    def test_rejects_credentials_domains_ports_and_url_extras(self):
        values = (
            'http://github.com/learner/radar',
            'https://user:password@github.com/learner/radar',
            'https://user@github.com/learner/radar',
            'https://github.com:443/learner/radar',
            'https://github.com.evil.example/learner/radar',
            'https://gitlab.com/learner/radar',
            'https://github.com/learner/radar?tab=readme',
            'https://github.com/learner/radar?',
            'https://github.com/learner/radar#readme',
            'https://github.com/learner/radar#',
            'https://github.com/learner/radar/issues',
            'https://github.com/learner/radar/',
            'https://github.com//radar',
            '//github.com/learner/radar',
            '/learner/radar', 'learner/', 'learner',
            'learner/radar/extra', 'learner/rad ar', 'learner/rad\nar',
            'learner/rad%61r', 'learner/rad\\ar',
        )
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                community.normalize_repository(value)

    def test_invalid_names_and_non_string_values(self):
        values = (None, 0, False, [], {}, '-owner/repo', 'owner-/repo',
                  'two--hyphens/repo', 'owner/..', 'owner/.',
                  '用戶/repo', 'owner/仓库', 'a' * 40 + '/repo',
                  'owner/' + 'a' * 101)
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                community.normalize_repository(value)

    def test_clean_preserves_input_and_rejects_unknown_shape(self):
        body = {'repository': 'learner/radar', 'discussions_enabled': True}
        self.assertEqual(community.clean(body), {
            'repository': 'https://github.com/learner/radar',
            'discussions_enabled': True,
        })
        self.assertEqual(body['repository'], 'learner/radar')
        for value in (None, [], 'learner/radar', {'enabled': True}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                community.clean(value)


if __name__ == '__main__':
    unittest.main()
