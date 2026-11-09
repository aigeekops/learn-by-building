'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {modelIds,run,catalog,specs}=require('../scripts/check_course_inspectors.cjs');
const provider=require('../web/course-inspectors/cs231n.js');
const end=t=>t.steps.at(-1).variables;
const close=(a,b,tol=1e-10)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tol,`${a} != ${b}`);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;};
const trace=(id,p)=>run('cs231n','cs231n-'+id,p);
const cell=(t,i,id)=>provider.models[t.model].inspect(t,i).cells.find(c=>c.id===id);

test('all eight actual demos inspect frozen prefix-only frames without result, future or scene reads',()=>{
  const ids=modelIds('cs231n');assert.equal(provider.courseId,'cs231n');assert.equal(ids.length,8);
  assert.deepEqual(Object.keys(provider.models).sort(),ids.slice().sort());assert.equal(catalog('cs231n').lessons.length,8);
  for(const lesson of catalog('cs231n').lessons)for(const demo of lesson.demos){
    const t=freeze(run('cs231n',demo.modelId)),saved=JSON.stringify(t);assert.equal(t.steps.length,4);
    t.steps.forEach((step,index)=>{
      const prefix={params:t.params,model:t.model,steps:t.steps.slice(0,index+1).map(s=>{
        const current={title:s.title,variables:s.variables};
        for(const key of ['scene','visual'])Object.defineProperty(current,key,{get(){throw Error('inspector read '+key);}});
        return current;
      })};
      for(const key of ['result','scene'])Object.defineProperty(prefix,key,{get(){throw Error('inspector read '+key);}});
      freeze(prefix.params);freeze(prefix.steps);
      const v=provider.models[t.model].inspect(prefix,index);assert.equal(v.title,step.title);assert.ok(v.summary&&v.cells.length);
      assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula);assert.ok(['number','boolean','string'].includes(typeof c.value),'semantic cells must have scalar values');if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });
    assert.equal(JSON.stringify(t),saved,'inspector mutated '+t.model);
  }
});

test('each real parameter experiment verifies concrete outputs and rejects corruption or unapplied controls',()=>{
  const damage={linear:s=>s.classId=1-s.classId,softmax:s=>s.loss+=1,backprop:s=>s.gradient+=1,convolution:s=>s.pooled+=1,residual:s=>s.gradientCanceled=!s.gradientCanceled,attention:s=>s.output+=1,detection:s=>s.suppressed=!s.suppressed,transfer:s=>s.independentGroups=!s.independentGroups};
  for(const id of modelIds('cs231n')){
    const model=provider.models[id],allowed=new Set(specs('cs231n',id).map(s=>s.id));assert.ok(model.experiments.length);
    for(const e of model.experiments){
      assert.ok(e.label&&e.prediction&&e.expectation);
      for(const p of [e.before,e.after])for(const key of Object.keys(p))assert.ok(allowed.has(key));
      const a=freeze(run('cs231n',id,e.before)),b=freeze(run('cs231n',id,e.after)),saved=[JSON.stringify(a),JSON.stringify(b)];
      assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id);
      const broken=JSON.parse(JSON.stringify(b));damage[id.slice('cs231n-'.length)](end(broken));
      assert.equal(e.verify(a,broken),false,id+' accepted corrupted output');assert.equal(e.verify(a,a),false,id+' accepted unchanged controls');
      assert.deepEqual([JSON.stringify(a),JSON.stringify(b)],saved);
    }
  }
});

test('linear classifier uses both weighted pixels, class bias, tie rule and input-only perturbation',()=>{
  const t=trace('linear',{pixel:.75,bias:.5}),s=end(t);
  assert.deepEqual(s.scores,[.25,.25]);assert.equal(s.classId,0);
  assert.deepEqual(s.changedImage,[.25,1]);assert.deepEqual(s.changedScores,[-.25,.75]);
  close(cell(t,1,'product-0-0').value,.75);close(cell(t,1,'product-0-1').value,-1);
  close(cell(t,1,'score-0').value,.75-1+.5);assert.match(cell(t,2,'class-id').note,/等分/);
  assert.equal(provider.models[t.model].inspect(t,0).cells.filter(c=>c.id.startsWith('weight-')).length,4);
});

test('temperature softmax and every raw-logit gradient match independent finite differences',()=>{
  const t=trace('softmax',{score:2,temperature:.5}),s=end(t),z=[2,1,0],temperature=.5;
  const loss=xs=>Math.log(xs.reduce((total,x)=>total+Math.exp(x/temperature),0))-xs[0]/temperature;
  const denominator=Math.exp(4)+Math.exp(2)+1;
  s.probabilities.forEach((p,i)=>close(p,[Math.exp(4),Math.exp(2),1][i]/denominator));close(s.loss,loss(z));
  z.forEach((_,i)=>{const hi=z.slice(),lo=z.slice(),h=1e-5;hi[i]+=h;lo[i]-=h;close(s.gradient[i],(loss(hi)-loss(lo))/(2*h),1e-8);close(cell(t,3,'gradient-'+i).value,s.gradient[i]);});
  close(s.gradient.reduce((a,b)=>a+b,0),0);close(cell(t,1,'normalizer').value,1+Math.exp(-2)+Math.exp(-4));
  const tie=end(trace('softmax',{score:1,temperature:2}));close(tie.probabilities[0],tie.probabilities[1]);
});

test('ReLU zero adopts derivative zero and refuses to certify a central difference across the kink',()=>{
  const t=trace('backprop',{weight:.5,x:1}),s=end(t);
  close(s.preactivation,0);close(s.activation,0);close(s.loss,.5);close(s.gradient,0);assert.equal(s.smooth,false);
  close(s.numerical,-.4999975,1e-8);assert.match(cell(t,3,'smooth-check').note,/不.*证明/);
  const active=end(trace('backprop',{weight:1,x:2}));close(active.gradient,(1.5-1)*1*2);close(active.numerical,1,1e-8);assert.equal(active.smooth,true);
  const zeroInput=end(trace('backprop',{weight:2,x:0}));close(zeroInput.loss,.5);close(zeroInput.gradient,0);close(zeroInput.numerical,0);assert.equal(zeroInput.smooth,true);
});

test('all four unflipped correlation windows, ReLU cells and whole-window max pool are exact',()=>{
  const t=trace('convolution',{center:3}),s=end(t);
  assert.deepEqual(s.output,[[1-3,2-2],[0-0,3-1]]);assert.deepEqual(s.activated,[[0,0],[0,2]]);close(s.pooled,2);
  const cells=provider.models[t.model].inspect(t,1).cells;assert.equal(cells.filter(c=>c.id.includes('-product-')).length,16);
  close(cell(t,1,'window-1-1-product-0-0').value,3);close(cell(t,1,'window-1-1-product-1-1').value,-1);
  close(cell(t,1,'output-1-1').value,2);close(cell(t,2,'activated-0-0').value,0);
  assert.equal(s.outputWidth,2);assert.equal(s.sharedParameters,4);close(cell(t,3,'pooled').value,2);
});

test('residual input derivative follows independent perturbation and zero output does not imply zero gradient',()=>{
  const t=trace('residual',{x:-1.5,scale:.5}),s=end(t),h=1e-5,map=x=>x+.5*x;
  close(s.output,-2.25);close(s.residualGradient,(map(-1.5+h)-map(-1.5-h))/(2*h),1e-8);close(s.plainGradient,.5);
  const zeroInput=end(trace('residual',{x:0,scale:.5}));close(zeroInput.output,0);close(zeroInput.residualGradient,1.5);assert.equal(zeroInput.gradientCanceled,false);
  const cancel=end(trace('residual',{x:2,scale:-1}));close(cancel.output,0);close(cancel.residualGradient,0);assert.equal(cancel.gradientCanceled,true);
  close(cell(t,2,'identity-gradient').value,1);
});

test('attention uses all patches with normalized weights and preserves the value convex bound',()=>{
  const uniform=end(trace('attention',{query:0}));uniform.weights.forEach(w=>close(w,1/3));close(uniform.output,4);
  const t=trace('attention',{query:1.5}),s=end(t),exps=[Math.exp(1.5),1,Math.exp(-1.5)],z=exps.reduce((a,b)=>a+b,0);
  const expected=(2*exps[0]+4*exps[1]+6*exps[2])/z;
  s.weights.forEach((w,j)=>close(w,exps[j]/z));close(s.output,expected);assert.ok(s.output>=2&&s.output<=6);
  s.values.forEach((v,j)=>close(cell(t,3,'value-contribution-'+j).value,s.weights[j]*v));assert.equal(cell(t,3,'convex-bound').value,true);
});

test('continuous IoU omits coordinate plus-one and strict NMS preserves threshold equality',()=>{
  const t=trace('detection',{offset:.5,threshold:.6}),s=end(t);
  close(s.intersection,1.5*2);close(s.union,4+4-3);close(s.iou,3/5);assert.deepEqual(s.kept,[0,1]);assert.equal(s.suppressed,false);
  const lower=end(trace('detection',{offset:.5,threshold:.5}));assert.deepEqual(lower.kept,[0]);assert.equal(lower.suppressed,true);
  close(cell(t,1,'intersection-width').value,1.5);close(cell(t,2,'area-0').value,4);assert.match(cell(t,3,'suppressed').note,/等于阈值/);
});

test('object-group independence and held-out error are separate from unchanged sample predictions',()=>{
  const t=trace('transfer',{head:.5,split:'group'}),group=end(t),row=end(trace('transfer',{head:.5,split:'row'}));
  assert.deepEqual(group.predictions,[0,0,0,0]);assert.deepEqual(row.predictions,group.predictions);
  close(group.validationAccuracy,0);close(row.validationAccuracy,.5);assert.equal(group.independentGroups,true);assert.equal(row.independentGroups,false);
  const overlap=s=>[...new Set(s.train.map(i=>s.groups[i]))].filter(g=>s.validation.some(i=>s.groups[i]===g));
  assert.deepEqual(overlap(group),[]);assert.deepEqual(overlap(row),['A','B']);
  assert.equal(cell(t,2,'overlap-group-A').value,false);assert.equal(cell(t,3,'validation-correct-2').value,0);
  const equality=end(trace('transfer',{head:1.5,split:'group'}));assert.deepEqual(equality.predictions,[0,1,1,1]);
});
