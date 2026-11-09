const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../web/course-inspectors/cme295.js');
const M=require('../web/ai-course-models.js');require('../web/ai-cme295-2026.js')(M);
const data=require('../config/ai_cme295_2026.json');
const ids=[...new Set(data.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function inspectAt(id,params,line){const t=M.run(id,params),i=t.steps.findIndex(s=>s.line===line);assert.ok(i>=0);return P.models[id].inspect(t,i);}

test('CME295 covers every actual demonstration with immutable frame/cell inspections and real parameter checks',()=>{
  assert.equal(P.courseId,'cme295');assert.equal(ids.length,16);assert.deepEqual(Object.keys(P.models).sort(),ids.sort());
  for(const id of ids){
    const provider=P.models[id],specs=M.specs[id],cases=[undefined];
    assert.ok(provider.intuition.length>12);assert.ok(provider.experiments.length);
    for(const s of specs)cases.push({[s.id]:s.type==='range'?s.min:s.options[0][0]},{[s.id]:s.type==='range'?s.max:s.options.at(-1)[0]});
    for(const params of cases){
      const t=M.run(id,params),before=JSON.stringify(t);freeze(t);
      t.steps.forEach((f,i)=>{
        const r=provider.inspect(t,i);assert.ok(r.title&&r.summary&&r.cells.length,`${id} frame ${i}`);
        assert.equal(new Set(r.cells.map(c=>c.id)).size,r.cells.length);
        r.cells.forEach(c=>{assert.ok(c.label&&c.formula&&c.note&&c.inputs);assert.ok(!/NaN|undefined/.test(c.formula),`${id}: ${c.formula}`);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));});
      });
      assert.equal(JSON.stringify(t),before,id+' changed the source trace');
    }
    for(const e of provider.experiments){const a=M.run(id,e.before),b=M.run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);assert.ok(e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+' experiment '+e.id);assert.equal(JSON.stringify([a,b]),original);}
  }
});

test('Attention inspection gives the masked cell rather than its pre-mask score',()=>{
  const t=M.run('attention',{position:1}),i=t.steps.findIndex(s=>s.visual.attention.stage==='scores'&&s.visual.attention.cell===2);
  const c=P.models.attention.inspect(t,i).cells[0];assert.equal(c.value,'−∞');assert.ok(c.formula.includes('exp(−∞) = 0'));
});

test('BPE counts, embedding coordinates, mean and recurrent states expose concrete calculations',()=>{
  const t=M.run('cme-representations');
  const pair=t.steps.findIndex(s=>s.line===3);assert.equal(P.models['cme-representations'].inspect(t,pair).cells[0].value,3);
  const vectors=t.steps.find(s=>s.line===6).variables.vectors;
  const means=inspectAt('cme-representations',{},7).cells;means.forEach((c,d)=>near(c.value,vectors.reduce((a,v)=>a+v[d],0)/vectors.length));
  let h=0;const cells=inspectAt('cme-representations',{},8).cells;
  cells.forEach((c,j)=>{h=Math.tanh(.5*h+vectors[j][0]);near(c.value,h);assert.ok(c.formula.includes('tanh'));});
});

test('MoE, KV and LoRA cells match independent arithmetic rather than an animation clock',()=>{
  for(const gate of [0,2,4]){const x=2,w=Math.exp(gate)/(Math.exp(gate)+Math.exp(1));if(gate>=1){const cells=inspectAt('cme-moe',{gate,topk:2,x},7).cells;near(cells[0].value,w*x+(1-w)*2*x);}}
  const cache=inspectAt('cme-kv',{prefix:8,tokens:4,kvheads:2},5).cells[0];assert.equal(cache.value,2*4*12*2*8*2);
  const lora=inspectAt('lora',{rank:2,alpha:2},4).cells;assert.deepEqual(lora.map(c=>c.value),[1,2.5,1,0]);
  const zero=inspectAt('parallel',{zero:3,gpus:4},6).cells[0];assert.equal(zero.value,8);
});

test('RoPE geometry checks are numerical coordinate checks, and the probability objectives keep their units',()=>{
  const cells=inspectAt('cme-rope',{qpos:2,theta:.5},2).cells;near(cells[0].value,Math.cos(1));near(cells[1].value,Math.sin(1));
  const ce=inspectAt('cme-training',{objective:'pretrain',p:.6},2).cells[0];near(ce.value,-Math.log(.6*.8)/2);
  const sft=inspectAt('cme-training',{p:.2},3).cells[0];near(sft.value,-Math.log(.8));
  const kl=inspectAt('cme-training',{p:.6,q:.8},6).cells;near(kl[0].value+kl[1].value,kl[2].value);
});

test('online normalization and policy gradient have independent numerical references',()=>{
  const t=M.run('cme-online-softmax',{offset:1000}),v=[2,1,0,3],scores=[1,2,3,4],den=scores.reduce((a,x)=>a+Math.exp(x),0),expected=scores.reduce((a,x,i)=>a+Math.exp(x)*v[i],0)/den;
  const final=P.models['cme-online-softmax'].inspect(t,t.steps.length-1).cells;near(final[0].value,expected);near(final[1].value,0);
  const r=M.run('cme-rl').result,A=r.advantages;
  function objective(theta){const ex=[1,Math.exp(theta),Math.exp(theta)],z=ex.reduce((a,b)=>a+b,0);return A.reduce((a,x,i)=>a+x*Math.log(ex[i]/z)/3,0);}
  const h=1e-5;near(r.gradient,(objective(h)-objective(-h))/(2*h),1e-8);
  const equal=M.run('cme-rl',{rewards:'equal'});for(let i=0;i<equal.steps.length;i++)assert.ok(P.models['cme-rl'].inspect(equal,i).cells.every(c=>typeof c.value!=='number'||Number.isFinite(c.value)));
});

test('tool and budget counterexamples actually fail their success condition',()=>{
  const e=P.models.agent.experiments[0],a=M.run('agent',e.before),b=M.run('agent',e.after);assert.equal(e.verify(a,a),false);assert.equal(e.verify(a,b),true);
  const t=M.run('tools',{mode:'write',version:0}),last=P.models.tools.inspect(t,t.steps.length-1).cells[0];assert.equal(last.value,0);assert.ok(last.note.includes('最终核对'));
  const context=M.run('context',{budget:32,reserve:24}),i=context.steps.findIndex(s=>s.variables.status==='insufficient_capacity');assert.equal(P.models.context.inspect(context,i).cells[0].value,true);
  const memory=M.run('cme-memory',{query:'weather'});assert.equal(memory.result.answer,'资料不足');assert.ok(P.models['cme-memory'].inspect(memory,memory.steps.length-1).cells[0].formula.includes('没有引用来源'));
});
