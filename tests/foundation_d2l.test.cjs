const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const data=require('../config/foundation_d2l.json');
const M=require('../web/ai-course-models.js');
require('../web/foundation-d2l.js')(M);
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
const numericTree=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(Array.isArray(value))value.forEach(numericTree);else if(value&&typeof value==='object')Object.values(value).forEach(numericTree);};
const derivative=(fn,x,eps=1e-5)=>(fn(x+eps)-fn(x-eps))/(2*eps);

test('D2L retains its original eight lessons and validates the complete current catalog',()=>{
  assert.equal(data.course.id,'d2l');assert.ok(data.lessons.length>=8);
  assert.equal(new Set(data.lessons.map(l=>l.id)).size,data.lessons.length);
  for(const [i,l] of data.lessons.entries()){
    assert.equal(l.course,'d2l');assert.equal(l.unit,String(i+1));assert.ok(l.id.startsWith('d2l-'));
    assert.ok(l.explanation.length>=3);assert.ok(l.sections.length>=3);assert.ok(l.practice.length>=3);
    assert.ok(l.sections.some(s=>s.code?.includes('import torch')));
    for(const k of ['prompt','hint','solution','transfer'])assert.ok(l.exercise[k]?.length>10);
    assert.ok(Number.isFinite(l.exercise.expected));assert.ok(Number.isFinite(l.exercise.tolerance));
    assert.ok(l.boundary);assert.ok(l.misconception);assert.ok(l.worked);
    l.sources.forEach(s=>assert.ok(data.sources[s]));
    l.bridges.forEach(b=>assert.ok(data.lessons.some(x=>x.id===b.lesson)||b.lesson==='attention'));
    assert.equal(l.modelId,l.id);
  }
});

test('every control option and range value produces finite, ordered code and visual snapshots',()=>{
  for(const l of data.lessons){
    const defaults=M.run(l.modelId);assert.ok(defaults.steps.length>=5);
    for(const c of M.specs[l.modelId]){
      const values=c.type==='select'?c.options.map(x=>x[0]):Array.from({length:Math.round((c.max-c.min)/c.step)+1},(_,i)=>Number((c.min+i*c.step).toFixed(10)));
      for(const value of values){
        const t=M.run(l.modelId,{[c.id]:value});numericTree(t);assert.ok(t.steps.length>=5);
        for(const s of t.steps){assert.ok(s.line>=1&&s.line<=t.code.length);assert.ok(['flow','bars','segments'].includes(s.visual.kind));assert.ok(s.title&&s.detail);}
      }
      assert.throws(()=>M.run(l.modelId,{[c.id]:c.type==='select'?'unknown':c.max+1}));
    }
  }
});

test('tensor arithmetic uses all elements and rejects mismatched shapes before addition',()=>{
  assert.deepEqual(M.run('d2l-tensors').result.output,[[1,3,5],[4,6,8]]);
  near(M.run('d2l-tensors').result.total,27);
  const t=M.run('d2l-tensors',{rows:3,columns:2,offset:2}).result;
  assert.deepEqual(t.output,[[2,4],[4,6],[6,8]]);near(t.total,30);
  const bad=M.run('d2l-tensors',{mode:'incompatible'}).result;
  assert.equal(bad.status,'shape_error');assert.equal(bad.output,null);assert.equal(bad.total,null);
});

test('matrix products preserve feature order and probabilities yield the stated expectation',()=>{
  const t=M.run('d2l-matrix-probability',{w0:2,p0:3}).result;
  assert.deepEqual(t.prediction,[6,8]);assert.deepEqual(t.probabilities,[.75,.25]);near(t.expectation,6.5);
  near(M.run('d2l-matrix-probability',{w0:2,p0:0}).result.expectation,8);
});

test('scalar chain-rule gradients agree with independent central differences',()=>{
  const cases=[{x:2,w:1,b:0,target:3},{x:-1.5,w:2,b:.5,target:-1},{x:0,w:-2,b:1,target:4}];
  for(const p of cases){
    const t=M.run('d2l-autograd',p).result;
    const f=(x,w,b)=>(w*x+b-p.target)**2/2;
    near(t.dW,derivative(w=>f(p.x,w,p.b),p.w));
    near(t.dB,derivative(b=>f(p.x,p.w,b),p.b));
    near(t.dX,derivative(x=>f(x,p.w,p.b),p.x));
  }
  const zero=M.run('d2l-autograd',{x:0,w:1,b:0,target:3}).result;
  near(zero.dW,0);near(zero.loss,4.5);
});

test('training simultaneously applies gradients from the old state with one mean reduction',()=>{
  const one=M.run('d2l-regression',{epochs:1}).result;
  near(one.w,.5);near(one.b,.3);near(one.finalLoss,2.1825);
  const t=M.run('d2l-regression',{initialW:-.5,rate:.2,epochs:5}).result;
  let w=-.5,b=0;
  const f=(a,c)=>((a+c-2)**2+(2*a+c-4)**2)/4;
  for(const row of t.history){
    const dw=derivative(a=>f(a,b),w),db=derivative(c=>f(w,c),b);
    near(row.dw,dw,1e-8);near(row.db,db,1e-8);near(row.before,f(w,b));
    w-=.2*dw;b-=.2*db;
    near(row.w,w,1e-8);near(row.b,b,1e-8);near(row.after,f(w,b),1e-8);
  }
});

test('stable classification is invariant under shift and gradients match finite differences',()=>{
  for(const target of [0,1,2]){
    const t=M.run('d2l-classification',{gap:2,target}).result;
    const shifted=M.run('d2l-classification',{gap:2,target,shift:10}).result;
    t.probabilities.forEach((v,i)=>near(v,shifted.probabilities[i],1e-14));near(t.loss,shifted.loss,1e-14);
    const f=zs=>Math.log(zs.reduce((s,z)=>s+Math.exp(z),0))-zs[target];
    t.logits.forEach((z,i)=>near(t.gradient[i],derivative(v=>f(t.logits.map((x,j)=>j===i?v:x)),z),1e-8));
    near(t.gradient.reduce((a,b)=>a+b,0),0);
  }
  near(M.run('d2l-classification',{gap:0}).result.loss,Math.log(3));
});

test('MLP gradients are checked away from ReLU kinks and zero uses explicit convention',()=>{
  for(const p of [{x:1,w:1,b:.5,v:2},{x:-1,w:1,b:0,v:1},{x:2,w:-.5,b:0,v:.5}]){
    const t=M.run('d2l-mlp',p).result;
    const f=(w,b,v)=>(v*Math.max(0,w*p.x+b)-1)**2/2;
    near(t.dW,derivative(w=>f(w,p.b,p.v),p.w),1e-8);
    near(t.dB,derivative(b=>f(p.w,b,p.v),p.b),1e-8);
    near(t.dV,derivative(v=>f(p.w,p.b,v),p.v),1e-8);
  }
  const zero=M.run('d2l-mlp',{w:0,b:0}).result;assert.equal(zero.gate,0);near(zero.dW,0);
});

test('memorizing training data does not pass independent validation, while leaked scores are marked',()=>{
  const line=M.run('d2l-generalization').result;near(line.w,2);near(line.b,1/3);near(line.trainMSE,8/9);near(line.validationMSE,1/9);
  const memorized=M.run('d2l-generalization',{capacity:'memorize'}).result;
  near(memorized.trainMSE,0);near(memorized.validationMSE,140/3);assert.equal(memorized.independent,true);
  assert.deepEqual(memorized.trainX.filter(x=>memorized.validationX.includes(x)),[]);
  const leaked=M.run('d2l-generalization',{capacity:'memorize',split:'leaked'}).result;
  near(leaked.validationMSE,0);assert.equal(leaked.independent,false);
  const noiseFree=M.run('d2l-generalization',{noise:0}).result;near(noiseFree.trainMSE,0);near(noiseFree.validationMSE,0);
});

test('attention excludes masked keys and values and separates matching from content',()=>{
  const base=M.run('d2l-attention').result;assert.deepEqual(base.weights,[.5,.5]);near(base.output,3);
  const changed=M.run('d2l-attention',{value:6}).result;assert.deepEqual(base.weights,changed.weights);near(changed.output,4);
  for(const query of [0,1,3])for(const value of [0,2,6]){
    const masked=M.run('d2l-attention',{visible:'first',query,value}).result;
    assert.deepEqual(masked.weights,[1,0]);near(masked.output,2);
  }
  assert.ok(M.run('d2l-attention',{query:3}).result.weights[0]>.5);
});

test('all supplied Python examples parse; standard-library examples and independent numerical checks run',()=>{
  const script=`import ast,json,math\nfrom pathlib import Path\nd=json.loads(Path('config/foundation_d2l.json').read_text())\ncompiled=0\nexecuted=0\nfor l in d['lessons']:\n for s in l['sections']:\n  code=s.get('code')\n  if not code: continue\n  ast.parse(code)\n  compiled+=1\n  if 'import torch' not in code:\n   exec(compile(code,'<d2l-example>','exec'),{})\n   executed+=1\n# Cross-language independent numerical fixtures.\nA=[[0,1,2],[3,4,5]];B=[1,2,3]\nassert sum(A[i][j]+B[j] for i in range(2) for j in range(3))==27\nx,w,b,y=2.,1.,0.,3.\ne=w*x+b-y\nassert (e*x,e,e*w)==(-2.,-1.,-1.)\nw,b=0.,0.\nfor _ in range(3):\n e=[w*x+b-y for x,y in [(1.,2.),(2.,4.)]]\n dw=sum(a*x for a,x in zip(e,[1.,2.]))/2\n db=sum(e)/2\n w,b=w-.1*dw,b-.1*db\nassert abs(w-1.04825)<1e-12 and abs(b-.621)<1e-12\nprint(json.dumps({'compiled':compiled,'stdlib_executed':executed,'torch_executed':False}))`;
  const output=execFileSync('python3',['-c',script],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
  const receipt=JSON.parse(output.trim().split('\n').at(-1));
  assert.equal(receipt.compiled,data.lessons.flatMap(l=>l.sections).filter(s=>s.code).length);
  assert.equal(receipt.stdlib_executed,data.lessons.flatMap(l=>l.sections).filter(s=>s.code&&!s.code.includes('import torch')).length);
  assert.equal(receipt.torch_executed,false);
});
