'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {modelIds,catalog,run,checkCourse}=require('../scripts/check_course_inspectors.cjs');
const P=require('../web/course-inspectors/nav2.js');
const ids=modelIds('nav2');
const trace=(id,p={})=>run('nav2',id,p);
const end=t=>t.steps.at(-1).variables;
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing cell '+id);return c;};
const close=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

test('Nav2 provider checks all eight actual catalog demos and default/control-boundary frames',()=>{
  assert.equal(P.courseId,'nav2');assert.equal(catalog('nav2').lessons.length,8);assert.equal(ids.length,8);
  assert.deepEqual(Object.keys(P.models).sort(),ids.slice().sort());
  const report=checkCourse('nav2');
  assert.equal(report.course,'nav2');assert.equal(report.models,8);assert.equal(report.lessons,8);assert.equal(report.experiments,13);
  // The shared checker may add joint control cases; never require fewer than
  // the original individual-boundary coverage.
  assert.ok(report.framesChecked>=184);assert.ok(report.cellsChecked>=549);
});

test('all 32 immutable default snapshots expose semantic cells, inputs and safe index clamping',()=>{
  let frames=0;
  for(const lesson of catalog('nav2').lessons)for(const demo of lesson.demos){
    const t=trace(demo.modelId),saved=JSON.stringify(t);freeze(t);assert.ok(P.models[t.model].intuition.length>20);
    t.steps.forEach((_,i)=>{const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length);assert.notEqual(c.value,undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));assert.match(c.note,/四位小数/);}
      assert.match(v.summary,/不等同真实 Nav2 \/ ROS \/ Gazebo 执行/);assert.match(v.summary,/不产生学习完成或用时证据/);frames++;
    });
    assert.deepEqual(view(t,-2),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,Infinity),view(t,3));assert.deepEqual(view(t,-Infinity),view(t,0));assert.equal(JSON.stringify(t),saved);
  }assert.equal(frames,32);
});

test('13 real before/after experiments reject unchanged pairs and corrupted claimed results',()=>{
  const key={'nav2-lifecycle':'acceptGoal','nav2-tf':'endpointMap','nav2-localization':'world','nav2-costmap':'bufferPass','nav2-planner':'choice','nav2-controller':'omega','nav2-behavior':'status','nav2-validation':'pass'};
  let count=0;
  for(const id of ids)for(const e of P.models[id].experiments){
    const a=trace(id,e.before),b=trace(id,e.after),saved=JSON.stringify([a,b]);freeze(a);freeze(b);
    assert.ok(e.label&&e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id);assert.equal(e.verify(b,b),false,id+'/'+e.id);
    const damaged=JSON.parse(JSON.stringify(b)),s=end(damaged),k=key[id];s[k]=typeof s[k]==='number'?s[k]+1:typeof s[k]==='boolean'?!s[k]:'wrong';assert.equal(e.verify(a,damaged),false,id+'/'+e.id+' accepted incorrect output');assert.equal(JSON.stringify([a,b]),saved);count++;
  }assert.equal(count,13);
});

test('dependency-free browser registration and every inspector reject scene/final/future dependencies',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/nav2.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.nav2.courseId,'nav2');
  for(const id of ids){const t=trace(id);t.steps.forEach((_,i)=>{
    const steps=t.steps.map(step=>{const s={title:step.title,variables:step.variables};for(const field of ['scene','visual'])Object.defineProperty(s,field,{get(){throw Error('presentation must not supply values');}});return s;});
    const limited={model:t.model,params:t.params,steps:new Proxy(steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame read');return Reflect.get(target,key);}})};
    Object.defineProperty(limited,'result',{get(){throw Error('final result read');}});Object.defineProperty(limited,'scene',{get(){throw Error('scene read');}});
    assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
  });}
});

test('lifecycle separates configuration, dependency activation and goal acceptance at the actual stages',()=>{
  const a=trace('nav2-lifecycle'),b=trace('nav2-lifecycle',{sensor:'no'}),c=trace('nav2-lifecycle',{configured:'no'});
  assert.equal(cell(view(a,0),'initial-active').value,false);assert.equal(view(a,0).cells.some(c=>c.id==='accept-goal'),false);
  assert.equal(cell(view(a,1),'configuration-state').value,'inactive');assert.equal(cell(view(a,1),'not-yet-active').value,false);assert.equal(view(a,1).cells.some(c=>c.id==='activation-gate'),false);
  assert.equal(cell(view(b,2),'activation-gate').value,false);assert.equal(cell(view(b,2),'activation-transition').value,'blocked');
  assert.deepEqual(end(c).states,['unconfigured','unconfigured','blocked']);assert.equal(end(b).readyCount,1);assert.equal(end(c).readyCount,1);assert.equal(end(b).acceptGoal,false);assert.equal(end(c).acceptGoal,false);
  assert.match(cell(view(b,2),'activation-transition').note,/不是新增的 ROS 生命周期主状态/);
});

test('TF uses signed same-direction translations and inclusive application age threshold independently',()=>{
  const a=trace('nav2-tf',{mapOdom:-1,odomBase:3,age:.3}),b=trace('nav2-tf',{mapOdom:-1,odomBase:3,age:.4});
  assert.equal(view(a,0).cells.some(c=>c.id==='laser-map'),false);close(cell(view(a,1),'base-map').value,2);close(cell(view(a,1),'laser-map').value,2.2);assert.equal(view(a,1).cells.some(c=>c.id==='endpoint-map'),false);
  close(cell(view(a,2),'endpoint-map').value,4.2);assert.equal(view(a,2).cells.some(c=>c.id==='fresh-gate'),false);
  assert.equal(cell(view(a,3),'fresh-gate').value,true);close(cell(view(a,3),'age-margin').value,0);assert.equal(cell(view(b,3),'usable-gate').value,false);close(cell(view(b,3),'age-margin').value,-.1);close(end(a).endpointMap,end(b).endpointMap);
  assert.match(cell(view(b,3),'usable-gate').note,/保留已算空间候选/);assert.match(cell(view(a,3),'fresh-gate').note,/不是 Nav2 或 tf2 统一默认值/);
});

test('map cells use a half-cell offset, fixed pose correction and floor round trip',()=>{
  const t=trace('nav2-localization',{cell:10,resolution:.25,origin:-2});
  close(cell(view(t,1),'center-index').value,10.5);close(cell(view(t,1),'center-offset').value,2.625);close(cell(view(t,1),'world').value,.625);assert.equal(view(t,1).cells.some(c=>c.id==='localized-pose'),false);
  close(cell(view(t,2),'initial-pose').value+cell(view(t,2),'correction').value,cell(view(t,2),'localized-pose').value);
  close(cell(view(t,3),'relative-goal').value,.525);close(cell(view(t,3),'round-trip-coordinate').value,10.5);assert.equal(cell(view(t,3),'round-trip-cell').value,10);
  const zero=trace('nav2-localization',{cell:0,resolution:.05,origin:0});close(end(zero).world,.025);assert.equal(end(zero).cellRoundTrip,0);assert.match(cell(view(t,1),'world').note,/不是机器人定位结果/);
});

test('costmap arithmetic separates physical collision from additional two-sided buffer preference',()=>{
  const a=trace('nav2-costmap',{radius:.2,inflation:.3}),b=trace('nav2-costmap',{radius:.5,inflation:0});
  close(cell(view(a,0),'diameter').value,.4);close(cell(view(a,1),'physical-margin').value,.5);close(cell(view(a,1),'one-side-clearance').value,.25);assert.equal(cell(view(a,1),'geometric-pass').value,true);
  close(cell(view(a,2),'preferred-radius').value,.5);close(cell(view(a,2),'preferred-width').value,1);close(cell(view(a,2),'buffer-margin').value,-.1);assert.equal(view(a,2).cells.some(c=>c.id==='buffer-pass'),false);
  assert.equal(cell(view(a,3),'buffer-pass').value,false);assert.equal(cell(view(a,3),'physical-vs-buffer').value,true);assert.equal(end(b).geometricPass,false);close(end(b).physicalMargin,-.1);close(end(b).bufferMargin,end(b).physicalMargin);
  assert.match(cell(view(a,2),'preferred-width').note,/两侧都需要缓冲/);assert.match(cell(view(a,3),'physical-vs-buffer').note,/不可自动称为碰撞/);
});

test('planner exposes both weighted terms and actual selection rather than claiming algorithm execution',()=>{
  const t=trace('nav2-planner',{penalty:3}),v=view(t,1);close(cell(v,'penalty-term-0').value,6);close(cell(v,'penalty-term-1').value,.6);close(cell(v,'cost-0').value,9);close(cell(v,'cost-1').value,4.6);
  assert.equal(v.cells.some(c=>c.id==='choice'),false);close(cell(view(t,2),'cost-difference').value,4.4);assert.equal(cell(view(t,2),'choice').value,1);close(cell(view(t,3),'selected-length').value,4);close(cell(view(t,3),'selected-cost').value,4.6);
  const short=trace('nav2-planner',{penalty:0});assert.equal(end(short).choice,0);close(end(short).selectedLength,3);assert.match(cell(v,'cost-0').note,/不等同任意一个 Nav2 规划插件内部公式/);
});

test('controller target geometry, signed turn and 20Hz increments match an independent circular-motion oracle',()=>{
  const t=trace('nav2-controller',{lookahead:.5,speed:.8,y:-.5});
  close(cell(view(t,0),'target-radicand').value,0);close(cell(view(t,0),'target-x').value,0);close(cell(view(t,0),'target-y').value,-.5);close(cell(view(t,0),'target-circle').value,.5);
  const radius=-.25,k=1/radius,omega=.8/radius;close(cell(view(t,1),'curvature').value,k);close(cell(view(t,2),'omega').value,omega);close(cell(view(t,3),'heading-step').value,omega/20);close(cell(view(t,3),'travel-step').value,.8/20);
  assert.equal(view(t,0).cells.some(c=>c.id==='curvature'),false);assert.equal(view(t,1).cells.some(c=>c.id==='omega'),false);assert.match(cell(view(t,3),'travel-step').note,/不是机体系 x 轴位移/);
  const straight=trace('nav2-controller',{y:0});close(end(straight).curvature,0);close(end(straight).omega,0);close(end(straight).headingStep,0);
});

test('behavior inspector uses actual finite event order, zero-recovery success and exhausted budget failure',()=>{
  const fail=trace('nav2-behavior',{failures:4,budget:2}),v=view(fail,1);
  assert.deepEqual(end(fail).events,['plan 0','recover','plan 1','recover','plan 2']);assert.equal(end(fail).attempts,3);assert.equal(end(fail).recoveries,2);assert.equal(end(fail).status,'FAILURE');
  assert.deepEqual(v.cells.filter(c=>c.id.startsWith('event-')).map(c=>c.value),end(fail).events);assert.match(cell(v,'event-4').formula,/2\.0000 ≥ failures\(4\.0000\)/);assert.equal(cell(v,'success').value,false);assert.equal(v.cells.some(c=>c.id==='status'),false);
  const first=trace('nav2-behavior',{failures:0,budget:0});assert.deepEqual(end(first).events,['plan 0','follow']);assert.equal(cell(view(first,1),'attempts').value,1);assert.equal(cell(view(first,1),'recoveries').value,0);assert.equal(cell(view(first,2),'status').value,'SUCCESS');
  assert.match(view(fail,1).summary,/整次规则执行/);assert.match(cell(view(first,2),'status').note,/没有捏造 RUNNING/);
});

test('Wilson bounds independently solve the score-test quadratic including all-failure and all-success data',()=>{
  for(const k of [0,8,10]){const t=trace('nav2-validation',{successes:k}),v=view(t,1),n=10,z2=1.96**2;
    // Score test: n(p-hat - p)^2 <= z^2 p(1-p); solve its quadratic roots.
    const a=n+z2,b=-(2*k+z2),c=k*k/n,disc=b*b-4*a*c,low=(-b-Math.sqrt(disc))/(2*a),high=(-b+Math.sqrt(disc))/(2*a);
    close(cell(v,'rate').value,k/n);close(cell(v,'interval-low').value,low);close(cell(v,'interval-high').value,high);close(cell(v,'wilson-center').value,(low+high)/2);close(cell(v,'wilson-halfwidth').value,(high-low)/2);
    assert.equal(v.cells.some(c=>c.id==='pass'),false);assert.match(cell(v,'wilson-denominator').note,/独立同分布二项样本/);
  }
  assert.ok(end(trace('nav2-validation',{successes:8})).interval[0]<.8);
});

test('acceptance gates treat overlapping episode marks independently and preserve manual evidence type',()=>{
  const collision=trace('nav2-validation',{successes:10,contacts:1,timeouts:0}),late=trace('nav2-validation',{successes:10,contacts:0,timeouts:2}),edge=trace('nav2-validation',{successes:8,contacts:0,timeouts:1});
  assert.equal(cell(view(collision,2),'rate-gate').value,true);assert.equal(cell(view(collision,2),'contact-gate').value,false);assert.equal(end(collision).pass,false);assert.equal(end(late).pass,false);assert.equal(end(edge).pass,true);
  assert.equal(cell(view(edge,3),'evidence').value,'人工教学数据');assert.equal(cell(view(edge,3),'target-environment').value,'ROS 2 Jazzy + Gazebo Harmonic');assert.match(cell(view(collision,0),'successes').note,/可交叉/);assert.match(cell(view(edge,3),'target-environment').note,/不是已启动/);
});
