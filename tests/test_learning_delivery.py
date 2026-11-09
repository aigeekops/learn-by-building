import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent.parent
def load(name):
 spec=importlib.util.spec_from_file_location('test_delivery_'+name,ROOT/'scripts'/f'{name}.py')
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
D=load('refresh_learning_delivery')
P=load('build_teaching_preview')
A=load('build_learning_app')

class LearningDeliveryTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  # The suite must run on a clean checkout, without desktop design snapshots.
  cls.temporary=tempfile.TemporaryDirectory(prefix='learning-delivery-test-source-')
  cls.source=Path(cls.temporary.name)
  A.assemble_source(cls.source)

 @classmethod
 def tearDownClass(cls):
  cls.temporary.cleanup()

 def test_newer_unintegrated_design_wins_and_old_raw_is_backed_up(self):
  with tempfile.TemporaryDirectory() as t:
   folder=Path(t);raw=folder/'raw';raw.mkdir()
   old='  function renderMap(){old();}\n  const lessonInfo = {};'
   new='  function renderMap(){newLayout();}\n  const lessonInfo = {};'
   (raw/D.DELIVERY_NAME).write_text(old)
   (raw/'learning-data-engine.html').write_text('same public record engine')
   (raw/'source-receipt.json').write_text(json.dumps({'files':[{'name':D.DELIVERY_NAME,'source_mtime_ns':1}]}))
   design=folder/'design.html';design.write_text(new);os.utime(design,ns=(1000,1000))
   integrated=folder/'integrated.html';integrated.write_text('/* FOUNDATION_DRAFT_INTEGRATION_START */\n/* FOUNDATION_DRAFT_START */');os.utime(integrated,ns=(2000,2000))
   result=D.refresh_raw_snapshot(raw,[design,integrated])
   self.assertTrue(result['updated']);self.assertEqual((raw/D.DELIVERY_NAME).read_text(),new)
   self.assertEqual(Path(result['backup']).read_text(),old)
   self.assertEqual((raw/'learning-data-engine.html').read_text(),'same public record engine')
   self.assertFalse(D.refresh_raw_snapshot(raw,[integrated])['updated'])

 def test_integrated_input_uses_saved_raw_instead_of_double_injection(self):
  with tempfile.TemporaryDirectory() as t:
   raw=Path(t)/'raw';raw.mkdir();(raw/D.DELIVERY_NAME).write_text('saved unintegrated raw layout')
   delivered=Path(t)/'delivered';delivered.mkdir();(delivered/D.DELIVERY_NAME).write_text('/* FOUNDATION_DRAFT_START */ integrated')
   with patch.object(P,'RAW_LAYOUT_SOURCE',raw):source,current,text=P.load_layout_source(delivered)
   self.assertEqual(source,raw.resolve());self.assertEqual(current,(raw/D.DELIVERY_NAME).resolve());self.assertEqual(text,'saved unintegrated raw layout')

 def test_complete_stage_keeps_new_layout_and_exactly_one_course_runtime(self):
  with tempfile.TemporaryDirectory() as t:
   stage=Path(t)/'stage';receipt=D.build(stage,self.source)
   html=(stage/D.DELIVERY_NAME).read_text();D.validate(html)
   self.assertEqual((stage/'index.html').read_bytes(),(stage/D.DELIVERY_NAME).read_bytes())
   self.assertIn('renderNodeDetail(previewId=null)',html)
   self.assertIn('atlasController?.dispose({preserveFullscreen:true})',html)
   self.assertIn('headerSearch=root.querySelector',html)
   self.assertIn('rf-inverse-kinematics',html);self.assertIn('cs50p-files',html)
   self.assertIn('aid-course-overview',html)
   self.assertEqual(receipt['saved_learning_records_read_or_rewritten'],False)
   self.assertEqual(receipt['original_blocks'],48);self.assertEqual(receipt['ee_lessons'],24)

 def test_publish_is_allowlisted_backed_up_verified_and_rejects_stale_targets(self):
  with tempfile.TemporaryDirectory() as t:
   folder=Path(t);stage=folder/'stage';D.build(stage,self.source)
   a=folder/'a.html';b=folder/'b.html';a.write_text('old-a');b.write_text('old-b')
   with self.assertRaises(ValueError):D.publish(stage,[a])
   result=D.publish(stage,[a,b],allowed_targets=[a,b])
   self.assertEqual(a.read_bytes(),b.read_bytes());self.assertEqual(a.read_bytes(),(stage/D.DELIVERY_NAME).read_bytes())
   self.assertTrue(result['verified_identical'])
   self.assertEqual([Path(r['backup']).read_text() for r in result['targets']],['old-a','old-b'])
   receipt=json.loads((stage/'delivery-build-receipt.json').read_text());receipt['delivery_targets_at_build']={str(a.resolve()):D.sha(b'expected-old')}
   (stage/'delivery-build-receipt.json').write_text(json.dumps(receipt));a.write_text('concurrent user edit')
   with self.assertRaises(RuntimeError):D.publish(stage,[a],allowed_targets=[a])
   self.assertEqual(a.read_text(),'concurrent user edit')

if __name__=='__main__':unittest.main()
