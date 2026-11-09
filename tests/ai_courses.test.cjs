const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../web/ai-course-models.js'),data=require('../config/ai_courses.json');
for(const name of ['cme295','cs336','cs146s']){const p='../web/ai-'+name+'-2026.js';try{(typeof require(p)==='function'?require(p):require(p).register)(M)}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}}
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('attention: causal future is zero, invariant to a masked key, and weights normalize',()=>{
 const a=M.run('attention',{position:1,key:0}),b=M.run('attention',{position:1,key:4});
 assert.equal(a.result.weights[2],0);assert.deepEqual(a.result.output,b.result.output);
 for(const causal of ['yes','no'])for(const position of [0,1,2]){const r=M.run('attention',{causal,position}).result;near(r.weights.reduce((a,b)=>a+b,0),1);assert.ok(r.output.every(Number.isFinite));}
 const r=M.run('attention').result;near(r.weights[2],0.5034898433778105);near(r.output[0],1);near(r.output[1],1);
 assert.deepEqual(M.softmax([1001,1001,null]),[.5,.5,0]);
});
test('sampling: temperature, truncation, cumulative boundary and determinism',()=>{
 const r=M.run('sampling').result;near(r.probs[0],0.6439142598879724);assert.equal(r.label,'狗');
 for(const temperature of [.25,1,2])assert.deepEqual(M.run('sampling',{topk:1,temperature,u:.99}).result.probs,[1,0,0,0]);
 assert.ok(M.run('sampling',{temperature:.25}).result.probs[0]>M.run('sampling',{temperature:2}).result.probs[0]);
 assert.deepEqual(M.run('sampling'),M.run('sampling'));
});
test('LoRA: frozen identity, alpha=0 and explicit matrix multiplication',()=>{
 assert.deepEqual(M.run('lora').result.output,[2,2.5,0,-1]);
 assert.deepEqual(M.run('lora',{alpha:0}).result.output,[1,2,0,-1]);
 assert.deepEqual(M.run('lora',{x0:2}).result.output,[4,3,0,-1]);
 const r=M.run('lora',{rank:3,alpha:2}).result;
 const BA=r.B.map(row=>[0,1,2,3].map(j=>row.reduce((s,b,i)=>s+b*r.A[i][j],0)));
 r.output.forEach((y,i)=>near(y,r.x[i]+2/3*BA[i].reduce((s,w,j)=>s+w*r.x[j],0)));
 assert.equal(r.trainable,24);
});
test('compute: dimensional golden values and independent effects of work and throughput',()=>{
 const base=M.run('compute').result;near(base.hours,83.33333333333333);assert.equal(base.flops,120e18);assert.equal(base.stateGB,16);
 near(M.run('compute',{gpus:16}).result.hours,41.666666666666664);
 near(M.run('compute',{mfu:.25}).result.hours,2*base.hours);
 near(M.run('compute',{parameters:2}).result.hours,2*base.hours);
});
test('parallel: DDP does not shard state, ZeRO levels and weighted dimensions match',()=>{
 for(const [zero,gb] of [[0,32],[1,14],[2,11],[3,8]])near(M.run('parallel',{zero}).result.perCardGB,gb);
 near(M.run('parallel',{zero:0,gpus:8}).result.perCardGB,32);
 near(M.run('parallel',{parameters:1,gpus:8,zero:2}).result.perCardGB,3.75);
 const r=M.run('parallel').result;assert.deepEqual(r.mean,[2.5,1.625]);assert.deepEqual(r.updated,[.75,.8375]);
});
test('dedup: stable retention and directed decontamination never delete evaluation',()=>{
 assert.deepEqual(M.run('dedup').result.retained,['train-a','train-d']);
 assert.deepEqual(M.run('dedup',{normalize:'no'}).result.retained,['train-a','train-b','train-d']);
 assert.deepEqual(M.run('dedup',{decontaminate:'no'}).result.retained,['train-a','train-c','train-d']);
 assert.deepEqual(M.run('dedup',{normalize:'no',decontaminate:'no'}).result.retained,['train-a','train-b','train-c','train-d']);
 assert.deepEqual(M.run('dedup').result.evaluation,['eval-e']);
});
test('agent: no unbounded retries, no success without a passing test after edits',()=>{
 for(const scenario of ['success','retry','stall','error'])for(let budget=1;budget<=10;budget++){
  const r=M.run('agent',{scenario,budget}).result;assert.ok(r.calls<=budget);assert.equal(r.context.length,r.calls);assert.equal(r.passed,r.stop==='tests_passed');
  if(r.passed){assert.equal(r.context.at(-1).tool,'test');assert.ok(r.context.at(-1).observation.results.every(t=>t.actual===t.expected));}
 }
 assert.equal(M.run('agent',{scenario:'success',budget:3}).result.stop,'budget_exhausted');
 assert.equal(M.run('agent',{scenario:'retry',budget:5}).result.passed,false);
 assert.equal(M.run('agent',{scenario:'retry',budget:6}).result.passed,true);
 assert.equal(M.run('agent',{scenario:'error'}).result.stop,'tool_error');
});
test('context: capacity, required content, greedy order and refusal are explicit',()=>{
 const r=M.run('context').result;assert.equal(r.used,39);assert.deepEqual(r.selected,['约束','任务','目标函数','相关测试']);
 assert.equal(M.run('context',{budget:32,reserve:24}).result.status,'insufficient_capacity');
 for(const budget of [32,48,64,96])for(const reserve of [8,16,24])for(const strategy of ['priority','file']){
  const r=M.run('context',{budget,reserve,strategy}).result;if(r.status==='packed'){assert.ok(r.used<=budget-reserve);assert.ok(r.selected.includes('约束'));assert.ok(r.selected.includes('任务'));assert.ok(r.remaining>=0);}
 }
 assert.notDeepEqual(M.run('context',{strategy:'file'}).result.selected,r.selected);
});
test('tools: schema constraints, stale versions and idempotent retry',()=>{
 for(const limit of [0,4,5]){const r=M.run('tools',{limit}).result;assert.equal(r.status,'invalid_arguments');assert.equal(r.writes,0);}
 assert.equal(M.run('tools',{limit:3}).result.first.issues.length,3);
 const r=M.run('tools',{mode:'write',version:1}).result;assert.equal(r.writes,1);assert.equal(r.first.version,2);assert.equal(r.retry.version,2);assert.equal(r.retry.replayed,true);
 for(const version of [0,2]){const r=M.run('tools',{mode:'write',version}).result;assert.equal(r.status,'version_conflict');assert.equal(r.writes,0);}
});
test('invalid inputs and empty or nonnumeric answers are rejected honestly',()=>{
 for(const value of ['',null,false,Infinity,'NaN',0])assert.throws(()=>M.run('compute',{gpus:value}));
 assert.throws(()=>M.run('agent',{scenario:'made-up'}));assert.throws(()=>M.run('unknown'));
 for(const text of ['',' ','Infinity','0x10','5 bananas'])assert.equal(M.checkNumeric(text,0).valid,false);
 assert.equal(M.checkNumeric('41.67',41.6666667,.02).correct,true);assert.equal(M.checkNumeric('0',0,0).correct,true);
});
test('2026 lessons have real traces, valid source mappings and cross-course links',()=>{
 assert.equal(data.material_year,2026);assert.ok(data.lessons.length>=9);
 assert.equal(new Set(data.lessons.map(l=>l.id)).size,data.lessons.length);
 for(const l of data.lessons){
  assert.ok(data.courses.some(c=>c.id===l.course));assert.ok(l.explanation.length>=3);assert.ok(l.exercise.transfer);
  l.sources.forEach(id=>assert.ok(data.sources[id]));l.bridges.forEach(b=>assert.ok(data.lessons.some(x=>x.id===b.lesson)));
  const trace=M.run(l.modelId||l.demos?.[0]?.modelId||l.id);assert.ok(trace.steps.length>=5);trace.steps.forEach(s=>{assert.ok(s.line>=1&&s.line<=trace.code.length);assert.ok(s.visual.title);});
  assert.ok(trace.params && typeof trace.params==='object');assert.equal(M.checkNumeric(l.exercise.expected,l.exercise.expected,l.exercise.tolerance).correct,true);
 }
 const html=fs.readFileSync(require.resolve('../web/ai-courses.html'),'utf8');assert.ok(html.includes('./ai-course-models.js'));
 assert.ok(['unavailable','official'].includes(data.sources['cs146s-1-code'].role));assert.equal(data.sources['cs146s-cn'].role,'auxiliary');
});
