'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {modelIds,run,catalog,specs}=require('../scripts/check_course_inspectors.cjs');
const provider=require('../web/course-inspectors/cs224r.js');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const end=t=>t.steps.at(-1).variables;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const inspect=(id,p,i)=>{const t=run('cs224r',id,p);return provider.models[id].inspect(t,i);};
const damagedKeys={
  'cs224r-bc':s=>{s.heldOutAction+=1;},
  'cs224r-dagger':s=>{s.weight+=1;},
  'cs224r-actor-critic':s=>{s.targets[0]+=1;},
  'cs224r-ppo':s=>{s.objective+=1;},
  'cs224r-entropy':s=>{s.objective+=1;},
  'cs224r-model':s=>{s.terminalError+=1;},
  'cs224r-offline':s=>{s.choice=1-s.choice;},
  'cs224r-goals':s=>{s.evaluationSuccess=!s.evaluationSuccess;}
};

test('all eight current demos inspect every frozen frame without future result or scene access',()=>{
  assert.equal(provider.courseId,'cs224r');
  const ids=modelIds('cs224r');assert.equal(ids.length,8);
  assert.deepEqual(Object.keys(provider.models).sort(),ids.slice().sort());
  assert.equal(catalog('cs224r').lessons.length,8);
  for(const lesson of catalog('cs224r').lessons)for(const demo of lesson.demos){
    const t=freeze(run('cs224r',demo.modelId)),saved=JSON.stringify(t),m=provider.models[demo.modelId];
    assert.equal(t.steps.length,4);
    t.steps.forEach((step,i)=>{
      const prefix={params:t.params,model:t.model,steps:t.steps.slice(0,i+1).map(s=>{
        const current={title:s.title,variables:s.variables};
        for(const key of ['scene','visual'])Object.defineProperty(current,key,{get(){throw Error('read scene/visual');}});
        return current;
      })};
      for(const key of ['result','scene'])Object.defineProperty(prefix,key,{get(){throw Error('read future '+key);}});
      const v=m.inspect(prefix,i);assert.equal(v.title,step.title);assert.ok(v.summary&&v.cells.length);
      assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula);assert.notEqual(c.value,undefined);assert.ok(['number','boolean','string'].includes(typeof c.value),'cells must be semantic scalar values');if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });
    assert.equal(JSON.stringify(t),saved);
  }
});

test('every actual parameter experiment verifies expected outcomes and rejects damaged output',()=>{
  for(const id of modelIds('cs224r')){
    const m=provider.models[id],allowed=new Set(specs('cs224r',id).map(s=>s.id));
    assert.ok(m.experiments.length);
    for(const e of m.experiments){
      assert.ok(e.label&&e.prediction&&e.expectation);
      for(const p of [e.before,e.after])for(const key of Object.keys(p))assert.ok(allowed.has(key));
      const a=freeze(run('cs224r',id,e.before)),b=freeze(run('cs224r',id,e.after)),saved=[JSON.stringify(a),JSON.stringify(b)];
      assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id);
      assert.deepEqual([JSON.stringify(a),JSON.stringify(b)],saved);
      const damaged=JSON.parse(JSON.stringify(b));damagedKeys[id](end(damaged));
      assert.equal(e.verify(a,damaged),false,id+' accepted an incorrect claimed output');
      assert.equal(e.verify(a,a),false,id+' accepted an unapplied experiment');
    }
  }
});

test('behavior-cloning loss gradient matches an independent finite difference and held-out point stays unlabeled',()=>{
  const weight=.5,epsilon=1e-5,loss=w=>((w-2)**2+(2*w-4)**2)/4;
  const t=run('cs224r','cs224r-bc',{weight,rate:.3}),s=end(t);
  close(s.loss,2.8125);close(s.gradient,(loss(weight+epsilon)-loss(weight-epsilon))/(2*epsilon));
  close(s.gradient,-3.75);close(s.updatedWeight,1.625);close(s.heldOutAction,4.875);
  assert.ok(loss(s.updatedWeight)<loss(weight));
  const g=provider.models[t.model].inspect(t,2).cells;
  close(g.find(c=>c.id==='gradient-term-0').value,-1.5);close(g.find(c=>c.id==='gradient-term-1').value,-6);
  assert.match(g.find(c=>c.id==='loss').formula,/2\.8125/);
  assert.match(provider.models[t.model].inspect(t,3).cells.find(c=>c.id==='held-out').note,/无专家标签/);
});

test('DAgger threshold equality executes learner but aggregates expert labels and fits both samples',()=>{
  const equal=end(run('cs224r','cs224r-dagger',{expert:.5,draw:.5}));
  assert.equal(equal.executed,3);assert.equal(equal.label,4);assert.deepEqual(equal.aggregated,[[1,2],[2,4]]);
  close(equal.weight,(1*2+2*4)/(1*1+2*2));assert.equal(equal.sampleCount,2);
  const expert=end(run('cs224r','cs224r-dagger',{expert:1,draw:0}));assert.equal(expert.executed,4);
  assert.deepEqual(expert.aggregated,equal.aggregated);close(expert.weight,equal.weight);
  const c=inspect('cs224r-dagger',{expert:.5,draw:.5},1).cells;
  assert.equal(c.find(x=>x.id==='expert-selected').value,false);assert.equal(c.find(x=>x.id==='expert-label').value,4);
});

test('GAE lambda one recovers the finite terminal return and lambda zero uses only one-step residuals',()=>{
  const t=run('cs224r','cs224r-actor-critic',{gamma:.5,lambda:1}),s=end(t);
  close(s.deltas[0],0);close(s.deltas[1],.6);close(s.advantages[0],.3);close(s.advantages[1],.6);
  // Independent discounted rewards: r0+gamma*r1 = 0+0.5*1, r1=1.
  close(s.targets[0],.5);close(s.targets[1],1);
  const td=end(run('cs224r','cs224r-actor-critic',{gamma:.5,lambda:0}));close(td.advantages[0],0);close(td.targets[0],.2);close(td.targets[1],1);
  const noDiscount=end(run('cs224r','cs224r-actor-critic',{gamma:0,lambda:1}));close(noDiscount.targets[0],0);close(noDiscount.targets[1],1);
  assert.match(provider.models[t.model].inspect(t,1).cells.find(c=>c.id==='delta-1').note,/真正终止/);
});

test('PPO min branch is correct for both advantage signs, both ratio boundaries, and zero advantage',()=>{
  const cases=[
    {ratio:1.5,advantage:2,clip:.2,objective:2.4},
    {ratio:1.5,advantage:-2,clip:.2,objective:-3},
    {ratio:.5,advantage:2,clip:.2,objective:1},
    {ratio:.5,advantage:-2,clip:.2,objective:-1.6},
    {ratio:1.3,advantage:0,clip:.2,objective:0}
  ];
  for(const {objective,...p} of cases){const s=end(run('cs224r','cs224r-ppo',p));close(s.objective,objective);close(s.loss,-objective);}
  const v=inspect('cs224r-ppo',{ratio:.5,advantage:-2,clip:.2},2);
  close(v.cells.find(c=>c.id==='clipped-ratio').value,.8);close(v.cells.find(c=>c.id==='clipped-term').value,-1.6);
});

test('entropy is full-distribution expectation with natural logs and temperature does not optimize the policy',()=>{
  const t=run('cs224r','cs224r-entropy',{probability:.8,temperature:.3}),s=end(t);
  const entropy=-.2*Math.log(.2)-.8*Math.log(.8);
  close(s.expectedQ,1.8);close(s.entropy,entropy);close(s.objective,1.8+.3*entropy);
  const mirror=end(run('cs224r','cs224r-entropy',{probability:.2,temperature:.3}));close(mirror.entropy,entropy);close(mirror.expectedQ,1.2);
  const uniform=end(run('cs224r','cs224r-entropy',{probability:.5,temperature:0}));close(uniform.entropy,Math.log(2));assert.ok(uniform.entropy>s.entropy);
  const c=provider.models[t.model].inspect(t,2).cells;close(c.find(x=>x.id==='entropy-term-0').value,-.2*Math.log(.2));
  const hot=end(run('cs224r','cs224r-entropy',{probability:.8,temperature:1}));assert.deepEqual(hot.probabilities,s.probabilities);close(hot.entropy,s.entropy);
});

test('model rollout exposes every prediction cell, signed bias accumulation, and exact-zero bias',()=>{
  const t=run('cs224r','cs224r-model',{bias:-.2,horizon:5}),s=end(t);
  assert.equal(s.truePath.length,6);assert.equal(s.modelPath.length,6);
  s.truePath.forEach((x,k)=>{close(x,k/2);close(s.modelPath[k],k*.3);close(s.errors[k],-.2*k);});
  close(s.oneStepError,-.2);close(s.terminalError,-1);
  const cells=provider.models[t.model].inspect(t,1).cells;assert.equal(cells.length,12);close(cells.find(c=>c.id==='model-path-5').value,1.5);
  const exact=end(run('cs224r','cs224r-model',{bias:0,horizon:5}));assert.deepEqual(exact.truePath,exact.modelPath);close(exact.terminalError,0);
  assert.match(provider.models[t.model].inspect(t,3).cells.find(c=>c.id==='one-step-error').note,/非MSE/);
});

test('offline support penalty changes choices without creating data and ties choose action zero',()=>{
  const tie=end(run('cs224r','cs224r-offline',{unseenQ:8,penalty:6}));assert.deepEqual(tie.adjusted,[2,2]);assert.equal(tie.choice,0);assert.equal(tie.naiveChoice,1);
  assert.equal(tie.unseenActionCovered,false);assert.deepEqual(tie.counts,[20,0]);
  const negative=end(run('cs224r','cs224r-offline',{unseenQ:0,penalty:10}));assert.deepEqual(negative.adjusted,[2,-10]);assert.equal(negative.choice,0);assert.equal(negative.naiveChoice,0);
  const c=inspect('cs224r-offline',{unseenQ:8,penalty:6},2).cells;close(c.find(x=>x.id==='penalty-0').value,0);close(c.find(x=>x.id==='penalty-1').value,6);
});

test('HER keeps original task failure after successful relabel and counts duplicate-goal entries honestly',()=>{
  const fail=end(run('cs224r','cs224r-goals',{achieved:0,desired:4}));assert.equal(fail.originalReward,-1);assert.equal(fail.originalSuccess,false);
  assert.equal(fail.relabeledGoal,0);assert.equal(fail.relabeledReward,0);assert.equal(fail.evaluationSuccess,false);assert.equal(fail.augmentedTrainingPairs,2);
  const identical=end(run('cs224r','cs224r-goals',{achieved:4,desired:4}));assert.equal(identical.evaluationSuccess,true);assert.equal(identical.originalReward,0);assert.equal(identical.relabeledGoal,4);assert.equal(identical.augmentedTrainingPairs,2);
  const c=inspect('cs224r-goals',{achieved:4,desired:4},3).cells.find(x=>x.id==='training-pairs');assert.match(c.note,/两条目标可相同/);
});
