const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const models = require('../web/robotics-foundations-ros.js');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'config/robotics_foundations_ros.json'), 'utf8'));
const approx = (actual, expected, tolerance=1e-9) => assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} != ${expected}`);

test('bounded queue preserves ordering, accounts for every message, and distinguishes loss types', () => {
  const q = models['rf-ros-pubsub'];
  const independent = q.run({count:4,depth:1,consumeEvery:2});
  assert.deepEqual(independent.result.received, [2,4]);
  assert.deepEqual(independent.result.evicted, [1,3]);
  const slow = q.run().result;
  assert.deepEqual(slow.received, [2,5,6]);
  assert.deepEqual(slow.evicted, [1,3,4]);
  assert.equal(slow.accounted, 6);
  const immediate = q.run({consumeEvery:1}).result;
  assert.deepEqual(immediate.received, [1,2,3,4,5,6]);
  assert.deepEqual(immediate.evicted, []);
  for (const params of [{depth:1,consumeEvery:4,dropEvery:3}, {depth:4,consumeEvery:3,dropEvery:2}, {depth:2,consumeEvery:2,dropEvery:0}]) {
    const output = q.run(params), r = output.result;
    assert.deepEqual([...r.received,...r.evicted,...r.lost].sort((a,b)=>a-b), [1,2,3,4,5,6]);
    assert.equal(new Set([...r.received,...r.evicted,...r.lost]).size, 6);
    assert.ok(r.received.every((n,i,a)=>i===0||n>a[i-1]));
    assert.ok(output.frames.every(frame=>frame.vars.queue.length<=params.depth));
  }
});

test('TF composition matches analytic geometry and independently rejects stale usage', () => {
  const tf = models['rf-ros-tf'];
  assert.deepEqual(tf.run({yaw:0,tx:2,ty:1,px:0.8}).result.worldCandidate, [3,1]);
  const rotated = tf.run().result;
  approx(rotated.worldCandidate[0],1); approx(rotated.worldCandidate[1],1.2);
  const a = tf.run({yaw:30,tx:0,ty:0,px:1.8}).result.worldCandidate;
  approx(Math.hypot(...a), 2);
  const stale = tf.run({ageMs:301,maxAgeMs:300}).result;
  assert.equal(stale.accepted,false); assert.equal(stale.usablePoint,null);
  assert.deepEqual(stale.worldCandidate,rotated.worldCandidate);
  assert.equal(tf.run({ageMs:300,maxAgeMs:300}).result.accepted,true);
});

test('replay schedule scales intervals but retains stamps and ignores absolute origin', () => {
  const replay = models['rf-ros-replay'];
  const a = replay.run({durationMs:1200,rate:3,originMs:100}).result;
  const b = replay.run({durationMs:1200,rate:3,originMs:3000}).result;
  assert.equal(a.wallDurationMs,400);
  assert.deepEqual(a.schedule.map(r=>r.elapsedMs),[0,100,200,300,400]);
  assert.deepEqual(a.schedule.map(r=>r.elapsedMs),b.schedule.map(r=>r.elapsedMs));
  assert.deepEqual(a.schedule.map(r=>r.stampMs),[100,400,700,1000,1300]);
  assert.equal(b.schedule.at(-1).stampMs,4200);
});

test('bridge types, direction and clock source are independent conditions', () => {
  const bridge = models['rf-ros-bridge'];
  assert.equal(bridge.run({simSeconds:7,wallSeconds:1007}).result.nodeNow,7);
  assert.equal(bridge.run({direction:1}).result.accepted,false);
  assert.equal(bridge.run({mismatch:1}).result.accepted,false);
  const scalar = bridge.run({type:1}).result;
  assert.equal(scalar.accepted,true);assert.equal(scalar.clockAvailable,false);assert.equal(scalar.nodeNow,0);
  const wall = bridge.run({mismatch:1,useSimTime:0}).result;
  assert.equal(wall.nodeNow,1002);assert.equal(wall.ready,true);
  assert.equal(bridge.run({direction:1}).result.ready,false);
});

test('all models are self-contained downloadable programs, immutable, finite, and accessible', () => {
  assert.equal(data.lessons.length,4);
  for (const lesson of data.lessons) {
    const m=models[lesson.modelId],params=Object.fromEntries(m.controls.map(c=>[c.key,c.value])),copy=JSON.stringify(params);
    const output=m.run(params);
    assert.equal(JSON.stringify(params),copy);
    assert.ok(output.frames.length>=4);
    const standalone=vm.runInNewContext(`(${m.run.toString()})(${JSON.stringify(params)})`);
    assert.equal(JSON.stringify(standalone),JSON.stringify(output));
    const checkFinite=value=>{
      if(typeof value==='number') assert.ok(Number.isFinite(value));
      else if(Array.isArray(value)) value.forEach(checkFinite);
      else if(value && typeof value==='object') Object.values(value).forEach(checkFinite);
    };
    checkFinite(output);
    for(const frame of output.frames){
      for(const key of ['title','text','code'])assert.ok(frame[key]);
      const svg=m.render(frame);
      assert.match(svg,/<svg[^>]*viewBox=/);assert.match(svg,/role="img"/);assert.match(svg,/aria-label=/);
      assert.doesNotMatch(svg,/NaN|Infinity|undefined|<script/);
    }
    assert.ok(lesson.explanation.length>=3);assert.ok(lesson.practice.length>=2);
    assert.ok(lesson.verification.tolerance>0);assert.ok(Number.isFinite(lesson.verification.expected));
    for(const file of lesson.localFiles)assert.ok(fs.existsSync(path.join(root,file.path)),file.path);
    for(const c of m.controls){
      for(const value of [NaN,Infinity,'2',null,c.options?2:c.min-1]) assert.throws(()=>m.run({...params,[c.key]:value}),RangeError);
    }
  }
});

test('Python standard-library checks pass; ROS package files parse without claiming ROS execution', () => {
  const script=path.join(root,'examples/robotics-foundations/ros/offline_demo.py');
  const python=spawnSync('python3',[script,'--self-test'],{encoding:'utf8'});
  assert.equal(python.status,0,python.stderr);
  const inspect = String.raw`
import ast, pathlib, xml.etree.ElementTree as ET
base=pathlib.Path('examples/robotics-foundations/ros')
files=list(base.rglob('*.py'))
for p in files: ast.parse(p.read_text(), filename=str(p))
package=base/'lbb_robotics_basics'
doc=ET.parse(package/'package.xml').getroot()
assert doc.findtext('name')=='lbb_robotics_basics'
assert doc.findtext('export/build_type')=='ament_python'
assert (package/'resource/lbb_robotics_basics').is_file()
assert ET.parse(package/'worlds/foundations.sdf').getroot().find('world').get('name')=='foundations'
assert 'GZ_TO_ROS' in (package/'config/clock_bridge.yaml').read_text()
print('Parsed', len(files), 'Python files and package/world XML; no ROS execution')
`;
  const syntax=spawnSync('python3',['-c',inspect],{cwd:root,encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
  assert.match(syntax.stdout,/no ROS execution/);
});
