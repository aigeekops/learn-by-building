"""Run the platform's own beginner examples, not external course code."""
import subprocess
import sys
import csv
import tempfile
from pathlib import Path
import xml.etree.ElementTree as ET
import unittest
from radar import core

class LessonExamples(unittest.TestCase):
    def test_original_python_examples_match_the_shown_outputs(self):
        count=0
        for m in core.config('agent_curriculum')['months']+core.config('robotics_curriculum')['months']:
            for b in m['blocks']:
                for s in b.get('walkthrough',{}).get('steps',[]):
                    if 'stdout' not in s:continue
                    with self.subTest(block=b['id'],step=s['title']),tempfile.TemporaryDirectory() as folder:
                        result=subprocess.run([sys.executable,'-I','-c',s['code']],input=s.get('stdin',''),text=True,capture_output=True,timeout=5,cwd=folder)
                        self.assertEqual(result.returncode,0,result.stderr)
                        self.assertEqual(result.stdout,s['stdout'])
                        count+=1
        self.assertGreaterEqual(count,23)

    def block(self, identifier):
        return next(b for m in core.config('robotics_curriculum')['months'] for b in m['blocks'] if b['id']==identifier)

    def test_time_curve_matches_csv_and_independent_resistor_change(self):
        code=self.block('python-data')['walkthrough']['steps'][-1]['code']
        for resistance,expected in [(330,9.09),(500,6.0)]:
            with self.subTest(resistance=resistance),tempfile.TemporaryDirectory() as folder:
                result=subprocess.run([sys.executable,'-I','-c',code.replace('[1, 330]',f'[1, {resistance}]')],cwd=folder,text=True,capture_output=True,timeout=5)
                self.assertEqual(result.returncode,0,result.stderr)
                with open(Path(folder)/'timed.csv') as file:rows=list(csv.DictReader(file))
                self.assertEqual([float(r['time_s']) for r in rows],[0,1,2])
                self.assertEqual([float(r['current_ma']) for r in rows],[3,expected,3])
                svg=ET.parse(Path(folder)/'curve.svg')
                points=svg.find('.//{http://www.w3.org/2000/svg}polyline').attrib['points'].split()
                self.assertEqual(len(points),3)
                for row,point in zip(rows,points):
                    x,y=map(float,point.split(','))
                    self.assertAlmostEqual(x,40+float(row['time_s'])*120)
                    self.assertAlmostEqual(y,140-float(row['current_ma'])*10)

    def test_virtual_controller_stops_for_obstacle_invalid_input_and_button(self):
        code=self.block('nonblocking-control')['walkthrough']['steps'][3]['code']
        baseline=['idle','forward','stop','idle','forward','stop','stop']
        variants=[(code,baseline),
                  (code.replace('[100, 0, 0, 0, 15]','[100, 0, 0, 0, None]'),baseline),
                  (code.replace('[100, 0, 0, 0, 15]','[100, 0, 0, 0, 20]'),baseline),
                  (code.replace('[250, 0, 1, 0, 50]','[250, 0, 0, 0, 50]'),baseline[:5]+['forward','forward']),
                  (code.replace('[150, 0, 0, 1, 50]','[150, 0, 0, 0, 50]'),['idle','forward']+['stop']*5)]
        for index,(source,states) in enumerate(variants):
            with self.subTest(variant=index),tempfile.TemporaryDirectory() as folder:
                result=subprocess.run([sys.executable,'-I','-c',source],cwd=folder,text=True,capture_output=True,timeout=5)
                self.assertEqual(result.returncode,0,result.stderr)
                with open(Path(folder)/'control_log.csv') as file:rows=list(csv.DictReader(file))
                self.assertEqual([r['state'] for r in rows],states)
                self.assertEqual([int(r['time_ms']) for r in rows],[0,50,100,150,200,250,300])
                for row in rows:
                    self.assertEqual(row['command'],'FORWARD' if row['state']=='forward' else 'STOP')
                    self.assertEqual(int(row['request_percent']),50 if row['state']=='forward' else 0)

    def test_conditional_example_checks_both_sides_and_the_boundary(self):
        b=next(b for m in core.config('agent_curriculum')['months'] for b in m['blocks'] if b['id']=='python-branches')
        code=b['walkthrough']['steps'][1]['code']
        for value,expected in [('59','继续练习'),('60','达到目标'),('61','达到目标')]:
            with self.subTest(value=value):
                result=subprocess.run([sys.executable,'-I','-c',code],input=value+'\n',text=True,capture_output=True,timeout=5)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertEqual(result.stdout,'分数：'+expected+'\n')
