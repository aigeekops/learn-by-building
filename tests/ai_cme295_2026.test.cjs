const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');require('../web/ai-cme295-2026.js')(M);
const data=require('../config/ai_cme295_2026.json');
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('CME BPE uses learned merges, stable token counts and order-sensitive recurrent state',()=>{
 for(const [merges,count] of [[0,8],[1,6],[2,4],[3,3],[4,2]])assert.equal(M.run('cme-representations',{merges}).result.tokenCount,count);
 const a=M.run('cme-representations').result,b=M.run('cme-representations',{order:'reverse'}).result;
 assert.deepEqual(a.merges,[['l','o'],['lo','w']]);assert.deepEqual(a.pooled,b.pooled);assert.notEqual(a.finalState,b.finalState);
});
test('CME MoE distinguishes total and active parameters and renormalizes selected experts',()=>{
 const r=M.run('cme-moe').result;near(r.output,2.5378828427399904);assert.deepEqual(r.chosen,[0,1]);near(r.weights.reduce((a,b)=>a+b,0),1);assert.equal(r.weights[2],0);assert.equal(r.activeParameters,8);assert.equal(r.totalParameters,12);
 assert.equal(M.run('cme-moe',{topk:1}).result.output,2);assert.equal(M.run('cme-moe',{gate:0,topk:1}).result.output,4);
});
test('CME RoPE preserves norms and common-shift dot product',()=>{
 for(const qpos of [0,3,8])for(const kpos of [0,2,8])for(const shift of [0,1,4]){
  const r=M.run('cme-rope',{qpos,kpos,shift}).result;near(Math.hypot(...r.q),1);near(Math.hypot(...r.k),1);near(r.score,Math.cos((qpos-kpos)*.5));near(r.movedScore,r.score);
 }
});
test('CME objectives: prompt masking, KL identity and DPO reference baseline',()=>{
 const a=M.run('cme-training',{p:.2}).result,b=M.run('cme-training',{p:.8}).result;
 near(a.sftLoss,b.sftLoss);near(a.sftLoss,-Math.log(.8));assert.notEqual(a.pretrainLoss,b.pretrainLoss);
 const same=M.run('cme-training',{p:.8,q:.8}).result;near(same.kl,0);near(same.dpoLoss,Math.log(2));
 near(M.run('cme-training').result.kl,.09151622184943575);
});
test('CME RL handles equal rewards, zero update and negative advantage clipping',()=>{
 const equal=M.run('cme-rl',{rewards:'equal',eta:3,theta:.5}).result;assert.deepEqual(equal.advantages,[0,0,0]);assert.equal(equal.gradient,0);assert.deepEqual(equal.old,equal.updated);
 const zero=M.run('cme-rl',{eta:0}).result;assert.deepEqual(zero.old,zero.updated);near(zero.kl,0);
 const r=M.run('cme-rl').result;near(r.mean,2/3);near(r.sd,Math.sqrt(2)/3);near(r.gradient,Math.sqrt(2)/3);near(r.advantages.reduce((a,b)=>a+b,0),0);assert.ok(r.updated[0]<r.old[0]);
 for(let i=0;i<3;i++)near(r.terms[i],Math.min(r.ratios[i]*r.advantages[i],Math.max(.8,Math.min(1.2,r.ratios[i]))*r.advantages[i]));
});
test('CME KV accounting includes a common prefill and keeps KV head count independent',()=>{
 const r=M.run('cme-kv').result;assert.equal(r.prefill,64);assert.equal(r.noCache,510);assert.equal(r.cached,106);assert.equal(r.cacheBytes,3072);
 const mha=M.run('cme-kv',{kvheads:8}).result,mqa=M.run('cme-kv',{kvheads:1}).result;assert.equal(mha.cacheBytes,8*mqa.cacheBytes);assert.equal(mha.cached,mqa.cached);
});
test('CME online softmax matches full stable computation across blocks and large shifts',()=>{
 for(const block of [1,2,3,4])for(const offset of [0,500,1000]){
  const r=M.run('cme-online-softmax',{block,offset}).result;near(r.output,2.0830043049661198);near(r.output,r.reference);assert.ok(Number.isFinite(r.l)&&Number.isFinite(r.z));
 }
});
test('CME speculative accept/reject correction preserves the target marginal analytically',()=>{
 const r=M.run('cme-speculative').result;near(r.acceptance,.625);assert.equal(r.accepted,false);assert.deepEqual(r.residual,[0,1]);assert.equal(r.output,1);
 for(const p0 of [.1,.3,.5,.9])for(const q0 of [.1,.4,.8,.9]){
  const p=[p0,1-p0],q=[q0,1-q0],accept=q.map((v,i)=>Math.min(1,p[i]/v)),reject=1-q.reduce((s,v,i)=>s+v*accept[i],0),positive=p.map((v,i)=>Math.max(v-q[i],0)),z=positive.reduce((a,b)=>a+b,0);
  near(q0*accept[0]+(z>0?reject*positive[0]/z:0),p0);
 }
 const same=M.run('cme-speculative',{p0:.8,q0:.8,acceptU:.9}).result;assert.equal(same.acceptance,1);assert.equal(same.accepted,true);
});
test('CME retrieval preserves source IDs and declines absent evidence at the given threshold',()=>{
 const r=M.run('cme-memory').result;assert.deepEqual(r.selected,['policy-1','invoice-2']);assert.ok(r.answer.includes('[policy-1]'));near(r.scored[0].score,1);
 for(const query of ['unknown','weather']){const r=M.run('cme-memory',{query}).result;assert.equal(r.answer,'资料不足');assert.deepEqual(r.selected,[]);}
});
test('CME has one usable teaching page for every published 2026 lecture and no future lecture',()=>{
 assert.equal(data.course.edition,'Autumn 2026');assert.deepEqual(data.lessons.map(l=>l.unit),['1','2','3','4','5','6']);assert.equal(data.lessons.length,6);
 const base=require('../config/ai_courses.json');
 for(const l of data.lessons){
  assert.ok(l.sections.length>=6,l.id);assert.ok(l.explanation.length>=3);assert.ok(l.demos.length>=2);assert.ok(l.exercise.transfer);assert.ok(l.practice.length>=3);
  l.sections.forEach(s=>{assert.ok(s.explanation.length>55);assert.ok(s.code);assert.ok(s.exercise)});
  l.sources.forEach(id=>assert.ok(data.sources[id]||base.sources[id],id));
  for(const demo of l.demos){const tr=M.run(demo.modelId);assert.ok(tr.steps.length>=5);tr.steps.forEach(s=>assert.ok(s.line>=1&&s.line<=tr.code.length));}
 }
 assert.ok(!data.sources['cme-6-video']);assert.ok(data.course.pending.includes('Coming soon'));
});
