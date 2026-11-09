const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');
const W=require('../web/attention-workbench.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} != ${b}`);

// Independent full QK^T reference: normalize raw exponentials for these bounded
// inputs, rather than reuse the teaching recorder or its stable-softmax helper.
function reference(p){
  const Q=[[1,0],[0,1],[1,1]],K=[[1,0],[0,1],[p.key,1]],V=[[2,0],[0,2],[p.value,1]];
  const scores=Q.map(q=>K.map(k=>(q[0]*k[0]+q[1]*k[1])/Math.sqrt(2)));
  const exps=scores.map((row,i)=>row.map((x,j)=>p.causal==='yes'&&j>i?0:Math.exp(x)));
  const weights=exps.map(row=>row.map(x=>x/row.reduce((a,b)=>a+b,0)));
  const outputs=weights.map(row=>[0,1].map(d=>row.reduce((sum,w,j)=>sum+w*V[j][d],0)));
  return {weights:weights[p.position],output:outputs[p.position]};
}
test('cell-level Attention agrees with an independent full-matrix reference across controls',()=>{
  for(const position of [0,1,2])for(const causal of ['yes','no'])for(const key of [0,.5,1,4])for(const value of [0,1,3,4]){
    const t=M.run('attention',{position,causal,key,value}),r=reference(t.params);
    t.result.weights.forEach((w,i)=>near(w,r.weights[i]));
    t.result.output.forEach((y,i)=>near(y,r.output[i]));
    near(t.result.exps.reduce((a,b)=>a+b,0),t.result.denominator);
    t.result.contributions.forEach((xs,d)=>near(xs.reduce((a,b)=>a+b,0),r.output[d]));
  }
});
test('parameter experiments distinguish matching, content, and causal independence',()=>{
  const run=id=>{const e=W.experiments[id];return [M.run('attention',e.before),M.run('attention',e.after)];};
  const [kb,ka]=run('key');assert.notDeepEqual(ka.result.weights,kb.result.weights);
  ka.result.output.forEach((x,i)=>near(x,kb.result.output[i]));
  const [vb,va]=run('value');assert.deepEqual(va.result.weights,vb.result.weights);
  near(va.result.output[0],2.006979686969108);near(va.result.output[1],1);
  const [mb,ma]=run('mask');assert.deepEqual(ma.result.weights,mb.result.weights);assert.deepEqual(ma.result.output,mb.result.output);assert.equal(ma.result.weights[2],0);
  assert.notDeepEqual(M.run('attention',{...ma.params,causal:'no'}).result.output,ma.result.output);
});
test('old Attention drafts retain defaults and three-position masks remain exact',()=>{
  const t=M.run('attention',{position:2,key:1,causal:'yes'});
  assert.equal(t.params.value,1);assert.deepEqual(t.result.output,[1,1]);
  for(const position of [0,1])for(const value of [0,4]){
    const r=M.run('attention',{position,value,key:4}).result;
    for(let j=position+1;j<3;j++){assert.equal(r.scores[j],null);assert.equal(r.exps[j],0);assert.equal(r.weights[j],0);assert.ok(r.contributions.every(xs=>xs[j]===0));}
  }
});
test('every result cell has a unique reachable frame with its own calculation and source line',()=>{
  const t=M.run('attention'),seen=new Set();
  assert.equal(t.steps.length,15);
  for(const [i,step] of t.steps.entries()){
    const c=step.visual.attention,key=c.stage+':'+c.cell;
    assert.ok(!seen.has(key));seen.add(key);assert.equal(W.stepFor(t,c.stage,c.cell),i);
    assert.ok(c.expression.length>10);assert.ok(step.line>=1&&step.line<=t.code.length);
    const html=W.render(t,i);assert.ok(html.includes('当前这一格怎么算'));assert.ok(html.includes(`data-attn-step="${i}"`));
  }
  for(const stage of ['dots','scaled','scores','weights'])for(let j=0;j<3;j++)assert.ok(seen.has(stage+':'+j));
  assert.ok(seen.has('output:0')&&seen.has('output:1'));
});
test('the cell inspector exposes masks, reveals cells progressively, and compares actual numbers',()=>{
  const t=M.run('attention',{position:1}),start=W.stepFor(t,'dots');
  const first=W.render(t,start);
  assert.ok(first.includes('尚未展开'));assert.ok(first.includes('is-source'));assert.ok(first.includes('is-current'));
  const mask=W.render(t,W.stepFor(t,'scores',2));assert.ok(mask.includes('−∞'));assert.ok(mask.includes('is-masked'));
  const e=W.experiments.value,b=M.run('attention',e.before),a=M.run('attention',e.after);
  assert.ok(W.render(a,14,b).includes('权重保持不变 · 输出发生变化'));
  assert.equal(W.render(null), '');assert.equal(W.render(M.run('sampling')),'');
  assert.equal(W.render(t,-1),W.render(t,0));assert.equal(W.render(t,100),W.render(t,14));
  assert.ok(!W.render(t,14).includes('data-action='));
});
