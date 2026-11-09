import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parent.parent
SPEC=importlib.util.spec_from_file_location('sync_course_map',ROOT/'scripts/sync_course_map.py')
SYNC=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(SYNC)

class CourseMapSyncTests(unittest.TestCase):
    def test_repeated_sync_keeps_course_and_record_code(self):
        original='<html><head><title>KEEP MAP</title></head><body><script>\n  function renderMap(){}\n/* KEEP COURSEWARE */\n  const lessonInfo = {};\n/* KEEP RECORD ENGINE */\n</script></body></html>'
        first=SYNC.transform(original);second=SYNC.transform(first)
        self.assertEqual(first,second)
        self.assertEqual(second.count(SYNC.START),1)
        self.assertEqual(second.count('id="course-map-status-style"'),1)
        for content in ['KEEP MAP','KEEP COURSEWARE','KEEP RECORD ENGINE']:self.assertIn(content,second)

    def test_unrecognized_page_is_rejected(self):
        with self.assertRaises(ValueError):SYNC.transform('<html><body>other page</body></html>')

if __name__=='__main__':unittest.main()
