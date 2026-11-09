'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {modelIds,run,catalog}=require('../scripts/check_course_inspectors.cjs');
const provider=require('../web/course-inspectors/cs234.js');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const end=t=>t.steps.at(-1).variables;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const inspect=(id,p,i)=>{const t=run('cs234',id,p);return provider.models[id].inspect(t,i);};

test('all eight actual lesson demos inspect every current frame without mutation or future access',()=>{
  assert.equal(provider.courseId,'cs234');
  const ids=modelIds('cs234');assert.equal(ids.length,8);
  assert.deepEqual(Object.keys(provider.models).sort(),ids.slice().sort());
  for(const lesson of catalog('cs234').lessons)for(const demo of lesson.demos){
    const t=freeze(run('cs234',demo.modelId)),saved=JSON.stringify(t),m=provider.models[demo.modelId];
    t.steps.forEach((step,i)=>{
      // A prefix contains no future frame; final result / scene must never supply a current cell.
      const prefix={params:t.params,steps:t.steps.slice(0,i+1),model:t.model};
      Object.defineProperty(prefix,'result',{get(){throw Error('read future result');}});
      Object.defineProperty(prefix,'scene',{get(){throw Error('read future scene');}});
      const v=m.inspect(prefix,i);assert.equal(v.title,step.title);assert.ok(v.summary&&v.cells.length);
      assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula);assert.notEqual(c.value,undefined);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });
    assert.equal(JSON.stringify(t),saved);
    for(const e of m.experiments){
      const a=run('cs234',demo.modelId,e.before),b=run('cs234',demo.modelId,e.after);
      assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true);
      // Changing a claimed result must defeat the actual-value verification.
      const damaged=JSON.parse(JSON.stringify(b)),s=end(damaged);
      if('return' in s)s.return+=1;else if('fixedPoint' in s)s.fixedPoint+=1;else if('action' in s)s.action='unexpected';else if('newPrediction' in s)s.newPrediction+=1;else if('newProbability' in s)s.newProbability+=1;else s.updated+=1;
      assert.equal(e.verify(a,damaged),false,demo.modelId+' verification accepted incorrect output');
    }
  }
});

test('discounted rewards and Bellman branch expectation match independent arithmetic',()=>{
  const r=end(run('cs234','cs234-return',{gamma:0.5}));close(r.return,1.5);assert.deepEqual(r.discounted,[1,0,0.5]);
  const b=end(run('cs234','cs234-bellman',{success:0.5,gamma:0.8}));close(b.contributions[0],1);close(b.contributions[1],0.4);close(b.nextValue,1.4);close(b.fixedPoint,5/3);close(b.residual,0.4);
  const c=inspect('cs234-bellman',{success:0.5,gamma:0.8},3).cells.find(x=>x.id==='backup-change');close(c.value,0.4);assert.match(c.note,/不是/);
});

test('synchronous planning expands history while one sweep policy uses the updated next-state value',()=>{
  const id='cs234-planning',t=run('cs234',id,{gamma:0.9,sweeps:2});assert.deepEqual(end(t).history,[[0,0],[1,2],[1.8,2]]);
  const cells=provider.models[id].inspect(t,1).cells;assert.equal(cells.length,4);close(cells[0].value,1);close(cells[2].value,1.8);assert.match(cells[0].formula,/0\.0000/);
  const one=end(run('cs234',id,{gamma:0.9,sweeps:1}));assert.deepEqual(one.values,[1,2]);close(one.actionValues[1],1.8);assert.equal(one.action,'前进');
  const tie=end(run('cs234',id,{gamma:0.5,sweeps:2}));assert.equal(tie.action,'退出');
});

test('terminal TD and on/off-policy Q targets are sample updates with correct masks',()=>{
  const td=end(run('cs234','cs234-td',{terminal:'yes',alpha:0.5,gamma:1}));close(td.target,0);close(td.delta,-1);close(td.updated,0.5);
  const q=end(run('cs234','cs234-qlearning',{method:'q',alpha:0.5,gamma:0.9}));const sa=end(run('cs234','cs234-qlearning',{method:'sarsa',alpha:0.5,gamma:0.9}));
  close(q.bootstrap,4);close(sa.bootstrap,2);close(q.target,4.6);close(sa.target,2.8);close(q.updated,2.3);close(sa.updated,1.4);assert.deepEqual(q.nextQ,sa.nextQ);
});

test('epsilon-greedy assigns exploration mass to greedy action and honors CDF equality',()=>{
  const s=end(run('cs234','cs234-exploration',{epsilon:0.3,draw:0.1}));close(s.probabilities[0],0.1);close(s.probabilities[1],0.8);close(s.total,1);assert.equal(s.action,1);
  const right=end(run('cs234','cs234-exploration',{epsilon:0.3,draw:0.95}));assert.equal(right.action,2);
});

test('half-gradient weight cells and shared-feature probe use the current updated weights',()=>{
  const t=run('cs234','cs234-approximation',{alpha:0.1,target:3}),s=end(t);close(s.prediction,1.5);assert.deepEqual(s.gradient,[-1.5,-3]);close(s.updated[0],0.65);close(s.updated[1],0.8);close(s.newPrediction,2.25);
  const v=provider.models[t.model].inspect(t,3);close(v.cells.find(c=>c.id==='shared-probe').value,1.3);
  const large=end(run('cs234',t.model,{alpha:0.5,target:3}));close(large.newPrediction,5.25);
});

test('sample policy gradient matches an independent log-probability finite difference',()=>{
  const theta=0.5,eps=1e-5,logP=x=>-Math.log1p(Math.exp(-x));const t=run('cs234','cs234-policy-gradient',{logit:theta,advantage:-1.5,alpha:0.2}),s=end(t);
  assert.ok(Math.abs(s.score-(logP(theta+eps)-logP(theta-eps))/(2*eps))<1e-9);
  close(s.gradient,-1.5*s.score);close(s.updatedLogit,theta+0.2*s.gradient);close(s.newProbability,1/(1+Math.exp(-s.updatedLogit)));assert.ok(s.newProbability<s.probabilities[1]);
});
