const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');
require('../web/application-hfagents.js')(M);
const C=require('../web/course-inspectors/hfagents.js');
const catalog=require('../config/application_hfagents.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const run=(name,p={})=>M.run('hfagents-'+name,p);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function finite(x){if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(finite);}
function cells(t,line,occurrence=0){const indices=t.steps.flatMap((s,i)=>s.line===line?[i]:[]);assert.ok(indices[occurrence]!==undefined,'missing line '+line);return C.models[t.model].inspect(t,indices[occurrence]).cells;}
function get(rows,id){const x=rows.find(c=>c.id===id);assert.ok(x,'missing cell '+id);return x;}

test('HF Agents inspectors cover the eight real demos and execute all sixteen concrete control experiments',()=>{
  assert.equal(C.courseId,'hfagents');assert.equal(catalog.lessons.length,8);assert.equal(ids.length,8);
  assert.deepEqual(Object.keys(C.models).sort(),ids.slice().sort());
  let experiments=0;
  for(const id of ids){
    const P=C.models[id];assert.ok(P.intuition.length>20,id);assert.equal(P.experiments.length,2,id);
    for(const e of P.experiments){
      assert.ok(e.id&&e.label&&e.prediction&&e.expectation,id);
      const keys=[...new Set([...Object.keys(e.before),...Object.keys(e.after)])];
      assert.equal(keys.filter(k=>e.before[k]!==e.after[k]).length,1,id+' experiment changes one control');
      const a=freeze(M.run(id,e.before)),b=freeze(M.run(id,e.after));
      assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' must reject no change');
      assert.equal(e.verify(b,a),false,id+'/'+e.id+' must check direction');
      experiments++;
    }
  }
  assert.equal(experiments,16);
});

test('default actual frames are immutable, clamp indices and never read the final result',()=>{
  for(const id of ids){
    const t=freeze(M.run(id)),before=JSON.stringify(t);
    const guarded=new Proxy(t,{get(target,key){if(key==='result')throw Error('future final result read');return Reflect.get(target,key);}});
    for(let i=0;i<t.steps.length;i++){
      const view=C.models[id].inspect(guarded,i);assert.ok(view.title&&view.summary&&view.cells.length,id+' '+i);
      assert.equal(new Set(view.cells.map(x=>x.id)).size,view.cells.length,id+' duplicate cell id');
      for(const x of view.cells){assert.ok(x.id&&x.label&&x.formula&&x.inputs&&typeof x.note==='string');assert.ok(!x.formula.includes('undefined'),id+' '+i);assert.notEqual(x.value,undefined);finite(x);}
    }
    assert.deepEqual(C.models[id].inspect(guarded,-1),C.models[id].inspect(guarded,0));
    assert.deepEqual(C.models[id].inspect(guarded,Infinity),C.models[id].inspect(guarded,t.steps.length-1));
    assert.equal(JSON.stringify(t),before,id+' trace changed');
  }
});

test('message roles and observed facts enter state in actual order, with refusal taking precedence',()=>{
  const t=run('state',{turns:2,observation:'yes',tool:'write'});
  assert.deepEqual(cells(t,1).map(c=>c.id),['system-role','system-rule']);
  assert.equal(get(cells(t,3),'history-count').value,4);
  assert.equal(get(cells(t,4),'observation').value,'10 ms');
  assert.equal(get(cells(t,5),'message-count').value,7);
  assert.match(get(cells(t,5),'message-count').formula,/1 \+ 历史 4 \+ 问题 1 \+ 工具 1 = 7/);
  assert.deepEqual(cells(t,5).filter(c=>c.id.startsWith('message-')&&c.id!=='message-count').map(c=>c.value),['system','user','assistant','user','assistant','user','tool']);
  assert.equal(get(cells(t,6),'allowed').value,false);
  assert.equal(get(cells(t,7),'next').value,'refuse');
  const empty=run('state',{turns:0,observation:'no'});
  assert.equal(get(cells(empty,4),'observation').value,null);
  assert.equal(get(cells(empty,5),'message-count').value,2);
});

test('tool contract errors and executed timeouts remain distinct and never expose response rows early',()=>{
  const normal=run('tools',{limit:2});
  assert.equal(get(cells(normal,4),'response').value,null);
  assert.ok(!cells(normal,4).some(c=>c.id.startsWith('returned-')));
  assert.deepEqual(cells(normal,6).filter(c=>c.id.startsWith('returned-')).map(c=>c.value),['sampling-v1','power-v1']);
  assert.equal(get(cells(normal,7),'row-count').value,2);
  for(const p of [{limit:0},{limit:4},{name:'delete',limit:2}]){
    const t=run('tools',p);assert.equal(get(cells(t,5),'executed').value,false);assert.equal(get(cells(t,5),'error-kind').value,'contract');assert.equal(get(cells(t,7),'row-count').value,0);
  }
  const timeout=run('tools',{fault:'timeout'});
  assert.equal(get(cells(timeout,6),'executed').value,true);assert.equal(get(cells(timeout,6),'error-kind').value,'timeout');assert.equal(get(cells(timeout,8),'usable').value,false);
});

test('loop separates successful observation, final decision and the three stopping reasons',()=>{
  const short=run('loop',{scenario:'retry',budget:2});
  assert.equal(get(cells(short,5,0),'feedback-document').value,null);
  assert.equal(get(cells(short,7,0),'observation').value,null);
  assert.equal(get(cells(short,5,1),'feedback-document').value,'10 ms');
  assert.equal(get(cells(short,7,1),'observation').value,'10 ms');
  assert.equal(get(cells(short,9),'stop-status').value,'budget_exhausted');
  assert.equal(get(cells(short,9),'stop-answer').value,null);
  const done=run('loop',{scenario:'retry',budget:3});
  assert.equal(get(cells(done,3,2),'action').value,'final');
  assert.equal(get(cells(done,3,2),'calls-before-action').value,2);
  assert.equal(get(cells(done,4),'answer').value,'10 ms');
  assert.equal(get(cells(done,9),'stop-resources').value,1);
  const fatal=run('loop',{scenario:'fatal',budget:6});
  assert.equal(get(cells(fatal,6),'fatal-stop').value,'tool_error');
  assert.equal(get(cells(fatal,6),'fatal-answer').value,null);
});

test('context cells expose actual component sums and optional selection only after its own step',()=>{
  const t=run('context',{window:70,reserve:20,memory:'summary'});
  assert.equal(get(cells(t,1),'input-budget').value,50);
  assert.equal(get(cells(t,3),'memory-source').value,'sampling-v1');
  assert.equal(get(cells(t,5),'required-cost').value,36);
  assert.equal(get(cells(t,5),'required-cost').formula,'12 + 8 + 6 + 10 = 36');
  assert.equal(get(cells(t,7),'required-selected').value,4);
  assert.ok(!cells(t,7).some(c=>c.label.includes('optional')));
  assert.equal(get(cells(t,8),'optional').value,true);
  assert.equal(get(cells(t,9),'used').value,48);assert.equal(get(cells(t,9),'remaining').value,2);
  const refused=run('context',{window:65,reserve:20,memory:'full'});
  assert.equal(get(cells(refused,5),'required-cost').value,50);
  assert.equal(get(cells(refused,6),'fits').value,false);
  assert.equal(get(cells(refused,7),'required-selected').value,0);
  assert.equal(get(cells(refused,9),'used').value,0);
  assert.equal(get(cells(refused,10),'status').value,'refuse_missing_required');
});

test('controlled CodeAgent illustration waits for tool observation and multiplies the actual count',()=>{
  const t=run('smolagents',{quantity:3,unitPrice:12});
  assert.deepEqual(cells(t,1).map(c=>c.id),['fixed-program']);
  assert.equal(get(cells(t,5),'tool-count').value,3);
  assert.ok(!cells(t,5).some(c=>c.id==='amount'));
  assert.equal(get(cells(t,7),'amount').formula,'3 × 12 = 36');
  assert.deepEqual(get(cells(t,7),'amount').inputs,{n:3,unitPrice:12});
  assert.equal(get(cells(t,8),'answer-source').value,'inventory-fixture');
  const denied=run('smolagents',{allow:'no'});
  for(const [line,id] of [[5,'tool-count'],[6,'observation-count'],[7,'amount'],[8,'answer-amount']])assert.equal(get(cells(denied,line),id).value,null);
});

test('RAG inspects each real term overlap and does not carry earlier ranking into a new query',()=>{
  const t=run('rag',{question:'sampling',budget:2,threshold:.75,topk:2});
  const rank1=cells(t,5,0),rank2=cells(t,5,1);
  assert.equal(get(rank1,'score-sampling-v1').value,.5);assert.equal(get(rank2,'score-sampling-v1').value,1);
  assert.deepEqual(get(rank1,'score-sampling-v1').inputs,{terms:['采样','频率'],tokens:['采样','周期'],matches:1,queryLength:2});
  assert.equal(get(cells(t,6,0),'topk-count').value,0);
  assert.equal(get(cells(t,7,0),'evidence-count').value,0);
  const nextQuery=cells(t,4,1);assert.equal(get(nextQuery,'terms').value,'采样 周期');
  assert.ok(!nextQuery.some(c=>c.id.startsWith('score-')||c.id.startsWith('evidence-')||c.id.startsWith('answer-')));
  assert.equal(get(cells(t,7,1),'supports-sampling-v1').value,true);
  assert.equal(get(cells(t,10),'answer-0').value,'10 ms');
  const unknown=run('rag',{question:'unknown',threshold:0,topk:3,budget:2});
  assert.equal(get(cells(unknown,6),'topk-count').value,0);
  assert.equal(get(cells(unknown,6),'threshold-log-v1').value,false);
  assert.equal(get(cells(unknown,10),'answer-0').value,'资料不足');
});

test('evaluation cells retain the timeout in denominator and only report completed case judgments',()=>{
  const t=run('evaluation',{version:'baseline',normalize:'units'});
  assert.ok(!cells(t,1).some(c=>c.id.startsWith('result-')));
  assert.deepEqual(cells(t,6,0).filter(c=>c.id.startsWith('result-')).map(c=>c.id),['result-q1']);
  assert.equal(get(cells(t,4,0),'equal-q1').value,true);
  assert.equal(get(cells(t,5,2),'grounded-q3').value,false);
  assert.equal(get(cells(t,6,3),'timeout-q4').value,true);
  assert.equal(get(cells(t,8),'correct').value,2);
  assert.equal(get(cells(t,8),'total').value,4);
  assert.equal(get(cells(t,9),'accuracy').formula,'2 / 4 = 0.5');
  assert.equal(get(cells(t,10),'gate').value,false);
  const strict=run('evaluation',{normalize:'strict'});
  assert.equal(get(cells(strict,4,0),'equal-q1').value,false);
  assert.equal(get(cells(strict,8),'correct').value,1);
});

test('project cells keep transient errors, missing facts and id conflicts separate with no replay reads',()=>{
  const t=run('project',{question:'sampling',fault:'once',budget:2,replay:'conflict'});
  assert.equal(get(cells(t,3,0),'lookup-status').value,'temporary_error');
  assert.equal(get(cells(t,3,0),'evidence-value').value,null);
  assert.equal(get(cells(t,3,1),'evidence-value').value,'10 ms');
  assert.equal(get(cells(t,6),'committed').value,1);
  assert.equal(get(cells(t,8),'calls-after-cache').value,2);
  assert.deepEqual(get(cells(t,8),'calls-after-cache').inputs,{callsBefore:2,extraReads:0});
  assert.equal(get(cells(t,9),'replay-status').value,'conflict');
  assert.equal(get(cells(t,9),'replayed-answer').value,null);
  const broken=run('project',{fault:'permanent',budget:3});
  assert.equal(get(cells(broken,5),'completed').value,false);
  assert.equal(get(cells(broken,6),'committed').value,0);
  assert.equal(get(cells(broken,6),'receipt').value,null);
  assert.equal(get(cells(broken,9),'replay-status').value,'not_committed');
  const unknown=run('project',{question:'unknown',fault:'none'});
  assert.equal(get(cells(unknown,3),'lookup-status').value,'not_found');
  assert.equal(get(cells(unknown,5),'completed').value,true);
  assert.equal(get(cells(unknown,6),'receipt-source').value,null);
  assert.equal(get(cells(unknown,4),'answer').value,'资料不足');
});
