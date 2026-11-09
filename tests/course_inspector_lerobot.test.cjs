'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {modelIds,catalog,run,specs}=require('../scripts/check_course_inspectors.cjs');
const P=require('../web/course-inspectors/lerobot.js');
const ids=modelIds('lerobot'),trace=(id,p={})=>run('lerobot',id,p),end=t=>t.steps.at(-1).variables;
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing '+id);return c;};
const close=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

test('LeRobot provider owns exactly the eight actual catalog demos with immutable semantic snapshots',()=>{
  assert.equal(P.courseId,'lerobot');assert.equal(catalog('lerobot').lessons.length,8);assert.equal(ids.length,8);assert.deepEqual(Object.keys(P.models).sort(),ids.slice().sort());
  let frames=0;
  for(const lesson of catalog('lerobot').lessons)for(const demo of lesson.demos){
    const t=trace(demo.modelId),saved=JSON.stringify(t);freeze(t);assert.ok(P.models[t.model].intuition.length>20);
    for(let i=0;i<t.steps.length;i++){const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length);assert.notEqual(c.value,undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));assert.match(c.note,/四位小数/);}
      assert.match(v.summary,/未运行真实 LeRobot 数据解析、训练或机器人/);assert.match(v.summary,/不产生学习完成或用时证据/);frames++;
    }
    assert.deepEqual(view(t,-5),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,-Infinity),view(t,0));assert.deepEqual(view(t,Infinity),view(t,t.steps.length-1));assert.equal(JSON.stringify(t),saved);
  }assert.equal(frames,32);
});

test('16 real control experiments check specific outcomes and reject unchanged or corrupted runs',()=>{
  const key={'lerobot-schema':'accepted','lerobot-time':'causalCount','lerobot-episodes':'episodeIndependent','lerobot-normalization':'normalized','lerobot-bc':'heldOutError','lerobot-chunks':'gap','lerobot-rollout':'allowed','lerobot-evaluation':'percentagePoints'};
  let count=0;
  for(const id of ids)for(const e of P.models[id].experiments){
    assert.ok(e.label&&e.prediction&&e.expectation&&typeof e.verify==='function');const allowed=new Set(specs('lerobot',id).map(s=>s.id));for(const k of [...Object.keys(e.before),...Object.keys(e.after)])assert.ok(allowed.has(k));
    const a=trace(id,e.before),b=trace(id,e.after),saved=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id);assert.equal(e.verify(b,b),false,id+'/'+e.id);
    const broken=JSON.parse(JSON.stringify(b)),s=end(broken),k=key[id];s[k]=typeof s[k]==='boolean'?!s[k]:s[k]+1;assert.equal(e.verify(a,broken),false,id+'/'+e.id+' accepted wrong claimed output');assert.equal(JSON.stringify([a,b]),saved);count++;
  }assert.equal(count,16);
});

test('browser registration has no dependencies and inspection cannot read final, scene, visual or future frames',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/lerobot.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.lerobot.courseId,'lerobot');
  for(const id of ids){const t=trace(id);t.steps.forEach((_,i)=>{
    const steps=t.steps.map(step=>{const s={title:step.title,variables:step.variables};for(const key of ['scene','visual'])Object.defineProperty(s,key,{get(){throw Error('presentation read');}});return s;});
    const limited={model:t.model,params:t.params,steps:new Proxy(steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame read');return Reflect.get(target,key);}})};
    for(const key of ['result','scene','visual'])Object.defineProperty(limited,key,{get(){throw Error('final/presentation read');}});assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
  });}
});

test('data contract separates action length, per-item finite values, units and final conjunction',()=>{
  const missing=trace('lerobot-schema',{action:'missing'}),degrees=trace('lerobot-schema',{unit:'degree'});
  assert.equal(view(missing,0).cells.some(c=>c.id==='accepted'),false);assert.equal(cell(view(missing,1),'action-length').value,1);assert.equal(cell(view(missing,1),'shape-valid').value,false);assert.equal(cell(view(missing,1),'finite-0').value,true);assert.equal(cell(view(missing,1),'all-finite').value,true);
  assert.equal(view(missing,1).cells.some(c=>c.id==='unit-valid'),false);assert.equal(cell(view(missing,2),'unit-valid').value,true);assert.equal(cell(view(missing,3),'accepted').value,false);
  assert.deepEqual(end(degrees).action,[.2,.3]);assert.equal(end(degrees).shapeValid,true);assert.equal(cell(view(degrees,2),'unit-valid').value,false);assert.equal(cell(view(degrees,3),'accepted').value,false);assert.match(cell(view(degrees,2),'unit-valid').note,/不会在本例自动换算/);
});

test('nearest timestamp pairing exposes all nine distances, earlier-index ties and future information',()=>{
  const t=trace('lerobot-time',{delay:.05,tolerance:.05}),v=view(t,1),s=t.steps[1].variables;
  assert.equal(v.cells.filter(c=>c.id.startsWith('distance-')).length,9);
  for(let j=0;j<3;j++)for(let k=0;k<3;k++)close(cell(v,`distance-${j}-${k}`).value,Math.abs((k-j)*.1+.05));
  assert.deepEqual(s.matches.map(m=>m.index),[0,0,1]);for(let j=0;j<3;j++){assert.equal(cell(v,'match-index-'+j).value,[0,0,1][j]);close(cell(v,'match-error-'+j).value,.05);}
  assert.equal(v.cells.some(c=>c.id==='valid-0'),false);assert.deepEqual(t.steps[2].variables.future,[true,false,false]);assert.equal(cell(view(t,2),'future-0').value,true);assert.equal(cell(view(t,2),'valid-0').value,true);
  assert.equal(cell(view(t,3),'accepted-count').value,3);assert.equal(cell(view(t,3),'causal-count').value,2);assert.deepEqual(view(t,3).cells.filter(c=>c.id.startsWith('causal-term-')).map(c=>c.value),[0,1,1]);
  assert.match(cell(v,'match-index-1').formula,/0\.000000001/);assert.match(cell(v,'match-camera-0').note,/离线配对/);
});

test('a large camera shift with exact zero tolerance preserves rejected pairs rather than relabeling times',()=>{
  const t=trace('lerobot-time',{delay:.2,tolerance:0}),s=end(t);assert.deepEqual(s.matches.map(m=>m.index),[0,0,0]);assert.deepEqual(s.valid,[false,false,true]);assert.deepEqual(s.future,[true,true,false]);assert.equal(s.acceptedCount,1);assert.equal(s.causalCount,1);
  close(cell(view(t,0),'camera-time-0').value,.2);close(cell(view(t,1),'match-error-0').value,.2);assert.equal(cell(view(t,2),'valid-2').value,true);assert.equal(cell(view(t,2),'future-2').value,false);
});

test('episode leakage is an identity intersection, independently of equal partition sizes or local frame numbers',()=>{
  const grouped=trace('lerobot-episodes'),alternating=trace('lerobot-episodes',{split:'frame'});
  assert.equal(cell(view(grouped,0),'record-2').value,'B:0');assert.equal(cell(view(grouped,1),'membership-1').value,'train');assert.equal(cell(view(alternating,1),'membership-1').value,'validation');
  assert.equal(cell(view(grouped,2),'overlap-A').value,false);assert.equal(cell(view(alternating,2),'overlap-A').value,true);assert.equal(cell(view(alternating,2),'overlap-B').value,true);assert.deepEqual(cell(view(alternating,2),'overlap-list').value,['A','B']);
  assert.equal(view(alternating,2).cells.some(c=>c.id==='episode-independent'),false);assert.equal(cell(view(alternating,3),'episode-independent').value,false);assert.equal(end(grouped).trainingFrames,end(alternating).trainingFrames);assert.equal(end(grouped).validationFrames,end(alternating).validationFrames);
});

test('normalization expands population moments and makes the held-out-data boundary observable',()=>{
  const t=trace('lerobot-normalization',{validation:8,fit:'train'}),leak=trace('lerobot-normalization',{validation:8,fit:'all'}),v=view(t,1),w=view(leak,1);
  // Independent E[X²]−E[X]² calculation, rather than the model deviation average.
  const variance=(0+4+16)/3-2**2,leakVariance=(0+4+16+64)/4-3.5**2;
  close(cell(v,'fit-sum').value,6);close(cell(v,'center').value,2);assert.equal(cell(v,'fit-count').value,3);close(cell(v,'variance').value,variance);close(cell(v,'scale').value,Math.sqrt(variance));
  assert.deepEqual(v.cells.filter(c=>c.id.startsWith('deviation-')).map(c=>c.value),[-2,0,2]);assert.deepEqual(v.cells.filter(c=>c.id.startsWith('square-')).map(c=>c.value),[4,0,4]);
  assert.equal(cell(w,'fit-count').value,4);close(cell(w,'fit-sum').value,14);close(cell(w,'variance').value,leakVariance);close(cell(w,'square-3').value,20.25);
  assert.equal(v.cells.some(c=>c.id==='normalized'),false);close(cell(view(t,2),'normalized').value,6/Math.sqrt(variance));close(cell(view(leak,2),'normalized').value,4.5/Math.sqrt(leakVariance));
  close(cell(view(t,3),'recovered').value,8);close(cell(view(leak,3),'recovered').value,8);assert.equal(cell(view(t,3),'leaked').value,false);assert.equal(cell(view(leak,3),'leaked').value,true);assert.match(cell(v,'variance').note,/除以N而非N−1/);
});

test('linear BC matches the independent quadratic loss, its derivative and one held-out evaluation',()=>{
  const t=trace('lerobot-bc',{weight:.5,rate:.15}),v=view(t,2),s=end(t),w=.5,r=.15;
  // Since targets equal 2o and sum(o²)=5, L(w)=5(w−2)²/6 and L′=5(w−2)/3.
  const loss=5*(w-2)**2/6,gradient=5*(w-2)/3,updated=w-r*gradient;
  assert.deepEqual(t.steps[1].variables.errors,[0,-1.5,-3]);assert.deepEqual(v.cells.filter(c=>c.id.startsWith('gradient-term-')).map(c=>c.value),[0,-1.5,-6]);
  close(cell(v,'gradient').value,gradient);close(cell(v,'training-loss').value,loss);close(cell(v,'loss-term-2').value,4.5);assert.equal(v.cells.some(c=>c.id==='updated-weight'),false);
  close(cell(view(t,3),'weight-step').value,-.375);close(cell(view(t,3),'updated-weight').value,.875);close(s.weight,updated);close(cell(view(t,3),'heldout-prediction').value,2.625);close(s.heldOutError,3*updated-6);close(s.heldOutError,-3.375);
  const perfect=trace('lerobot-bc',{weight:2,rate:.2});close(end(perfect).weight,2);close(end(perfect).gradient,0);close(end(perfect).heldOutError,0);assert.match(cell(v,'training-loss').note,/更新前损失/);
});

test('action prefix length changes coverage and feedback but does not change prediction length or control period',()=>{
  const t=trace('lerobot-chunks',{execute:3,latency:60}),late=trace('lerobot-chunks',{execute:3,latency:100}),s=end(t);
  assert.deepEqual(s.chunk,[.1,.2,.3,.4]);assert.deepEqual(s.executed,[.1,.2,.3]);assert.deepEqual(view(t,1).cells.filter(c=>c.id.startsWith('prefix-member-')).map(c=>c.value),[true,true,true,false]);
  assert.equal(cell(view(t,0),'control-period').value,20);assert.equal(cell(view(t,1),'coverage').value,60);assert.equal(view(t,1).cells.some(c=>c.id==='gap'),false);assert.equal(cell(view(t,2),'slack').value,0);assert.equal(cell(view(t,2),'gap').value,0);assert.equal(cell(view(t,3),'no-gap').value,true);assert.equal(s.feedbackInterval,60);
  assert.equal(cell(view(late,2),'unclamped-gap').value,40);assert.equal(cell(view(late,2),'slack').value,-40);assert.equal(end(late).noGap,false);assert.equal(end(late).feedbackInterval,60);
  const surplus=trace('lerobot-chunks',{execute:4,latency:20});assert.equal(cell(view(surplus,2),'unclamped-gap').value,-60);assert.equal(end(surplus).gap,0);assert.equal(end(surplus).slack,60);assert.match(cell(view(t,3),'feedback-interval').note,/并非20ms/);
});

test('rollout independently checks closed position bounds, coarse control steps, freshness and reason priority',()=>{
  const allowed=trace('lerobot-rollout',{command:-1,current:-1,fresh:'yes'}),jump=trace('lerobot-rollout',{command:.5,current:0,fresh:'yes'}),outside=trace('lerobot-rollout',{command:1.5,current:1,fresh:'yes'}),stale=trace('lerobot-rollout',{command:1.5,current:1,fresh:'no'});
  assert.equal(cell(view(allowed,1),'lower-bound').value,true);assert.equal(cell(view(allowed,1),'position-valid').value,true);assert.equal(cell(view(allowed,2),'allowed').value,true);assert.equal(cell(view(allowed,3),'submitted').value,false);
  assert.equal(end(jump).positionValid,true);close(cell(view(jump,1),'delta').value,.5);assert.equal(cell(view(jump,2),'step-valid').value,false);assert.equal(end(jump).allowed,false);assert.equal(end(jump).reason,'单周期变化过大');
  assert.equal(end(outside).positionValid,false);assert.equal(end(outside).reason,'位置超界');assert.equal(end(stale).reason,'观测过期');assert.equal(end(stale).submitted,false);assert.match(cell(view(jump,2),'step-valid').note,/步长0\.5u/);assert.match(cell(view(jump,1),'delta').note,/不是速度/);
});

test('Wilson intervals independently solve the score-test quadratic for 0, 14 and 20 successes',()=>{
  for(const k of [0,14,20]){const t=trace('lerobot-evaluation',{successes:k,baseline:10}),v=view(t,2),n=20,z2=1.96**2;
    // Solve n(p−k/n)² <= z²p(1−p) using quadratic roots, independently of the center/half-width form.
    const a=n+z2,b=-(2*k+z2),c=k*k/n,disc=b*b-4*a*c,low=(-b-Math.sqrt(disc))/(2*a),high=(-b+Math.sqrt(disc))/(2*a);
    close(cell(v,'policy-low').value,low);close(cell(v,'policy-high').value,high);close(cell(v,'policy-center').value,(low+high)/2);close(cell(v,'policy-halfwidth').value,(high-low)/2);close(cell(v,'policy-radicand').value,cell(v,'policy-binomial-term').value+cell(v,'policy-correction').value);
    close(cell(v,'baseline-low').value,.2992949144298199);close(cell(v,'baseline-high').value,.7007050855701801);assert.equal(v.cells.some(c=>c.id==='difference'),false);assert.match(cell(v,'policy-denominator').note,/独立同分布二项/);assert.match(cell(v,'baseline-high').note,/不是正式/);
  }
});

test('evaluation reports percentage points for zero baseline and negative differences without relative-rate claims',()=>{
  const zero=trace('lerobot-evaluation',{successes:14,baseline:0}),negative=trace('lerobot-evaluation',{successes:0,baseline:20});
  assert.equal(view(zero,0).cells.some(c=>c.id==='policy-rate'),false);close(cell(view(zero,1),'policy-rate').value,.7);close(cell(view(zero,1),'baseline-rate').value,0);close(cell(view(zero,3),'difference').value,.7);close(cell(view(zero,3),'percentage-points').value,70);
  close(cell(view(negative,3),'success-count-difference').value,-20);close(end(negative).difference,-1);close(end(negative).percentagePoints,-100);assert.match(cell(view(zero,3),'percentage-points').note,/不同于相对百分比/);assert.match(cell(view(zero,3),'difference').note,/未计算差异置信区间/);
});
