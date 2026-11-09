import importlib.util
from http.server import ThreadingHTTPServer
import io
import json
from pathlib import Path
import threading
from urllib.request import urlopen
import unittest
import zipfile

ROOT=Path(__file__).resolve().parent.parent
SPEC=importlib.util.spec_from_file_location('robotics_foundation_builder',ROOT/'scripts/build_robotics_foundations.py')
BUILD=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(BUILD)

class RoboticsBuildTests(unittest.TestCase):
    def test_native_integration_is_idempotent_and_retains_unrelated_content(self):
        source='<html><head><title>KEEP TITLE</title></head><body id="lbb-course-prototype"><script>\n  const lessonInfo = {};\n/* KEEP AI AND RECORDS */\n</script></body></html>'
        data={'topics':[]}
        first=BUILD.integrate_html(source,data)
        second=BUILD.integrate_html(first,data)
        self.assertEqual(first,second)
        self.assertIn('KEEP TITLE',second);self.assertIn('KEEP AI AND RECORDS',second)
        self.assertEqual(second.count('id="rf-foundation-runtime"'),1)
        self.assertEqual(second.count('/* ROBOTICS_FOUNDATIONS_ADAPTER_START */'),1)
        self.assertNotIn('<iframe',second)

    def test_unknown_page_is_not_modified(self):
        with self.assertRaises(ValueError):BUILD.integrate_html('<html><body>other artifact</body></html>',{'topics':[]})

    def test_download_archive_has_executable_tests_and_no_runtime_records(self):
        with zipfile.ZipFile(io.BytesIO(BUILD.code_archive())) as archive:
            names=archive.namelist()
            inspector_assets={'web/course-inspector.js','web/course-inspector.css'}|{
                f'web/course-inspectors/{course}.js' for course in ('mit2007','modern','pid','kalman','ros')}
            for name in names:
                self.assertTrue(name=='README.txt' or name in inspector_assets or name.startswith(('web/robotics-foundations','config/robotics_foundations_','tests/robotics_foundations_','examples/robotics-foundations/')))
                self.assertNotIn('__pycache__',name)
                self.assertNotIn(Path(name).suffix,('.sqlite','.sqlite3','.db','.pyc'))
            self.assertIn('web/robotics-foundations.js',names)
            self.assertTrue(inspector_assets.issubset(names))
            self.assertIn('tests/robotics_foundations_player.test.cjs',names)
            self.assertIn('examples/robotics-foundations/ros/lbb_robotics_basics/package.xml',names)

    def test_local_server_serves_course_assets_and_public_catalog(self):
        from server import Handler
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            base=f'http://127.0.0.1:{server.server_port}'
            with urlopen(base+'/robotics-foundations.json') as response:
                data=json.load(response)
                self.assertEqual(len(data['topics']),5)
                self.assertGreaterEqual(sum(len(t['lessons']) for t in data['topics']),16)
                self.assertEqual({t['id']: len(t['lessons']) for t in data['topics']},
                                 {t['id']: len(t['lessons']) for t in BUILD.lesson_data()['topics']})
                self.assertNotIn('unsafe-inline',response.headers['Content-Security-Policy'])
            for asset in BUILD.ASSETS:
                with urlopen(base+'/'+asset) as response:
                    self.assertEqual(response.status,200)
                    self.assertGreater(len(response.read()),100)
        finally:
            server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
