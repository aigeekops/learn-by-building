const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const M=require('../web/ai-course-models.js');require('../web/application-hfagents.js')(M);
const data=require('../config/application_hfagents.json'),Scenes=require('../web/application-hfagents-scenes.js');
const run=(id,p)=>M.run('hfagents-'+id,p),result=(id,p)=>run(id,p).result;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const root=path.resolve(__dirname,'..');

test('eight connected original lessons include concrete explanations, examples, exercises and official locators',()=>{
 assert.equal(data.course.id,'hfagents');assert.equal(data.lessons.length,8);
 for(const [i,l] of data.lessons.entries()){
  assert.equal(l.course,'hfagents');assert.equal(l.unit,String(i+1));assert.ok(l.explanation.length>=3);
  assert.ok(l.explanation.every(x=>x.length>60));assert.ok(l.sections.length>=4);
  assert.ok(l.sections.every(s=>s.explanation.length>50&&s.code&&s.exercise));assert.ok(l.practice.length>=3);
  assert.ok(Number.isFinite(l.exercise.expected));assert.ok(l.exercise.transfer.length>30);
  assert.equal(l.modelId,l.id);for(const id of l.sources){const s=data.sources[id];assert.ok(s);assert.match(s.url,/^https:\/\/huggingface.co\//);assert.ok(s.locator);assert.match(s.status,/2026-11-08/);}
  for(const b of l.bridges)assert.ok(data.lessons.some(x=>x.id===b.lesson)||['cs50p-files','context','missing-quality'].includes(b.lesson));
 }
});
test('all parameter choices and every numeric control value give deterministic finite bounded traces',()=>{
 for(const l of data.lessons){
  const id=l.modelId,baseline=M.run(id);assert.deepEqual(M.run(id),baseline);assert.ok(baseline.steps.length>=6);
  for(const s of M.specs[id]){
   const values=s.type==='select'?s.options.map(o=>o[0]):Array.from({length:Math.round((s.max-s.min)/s.step)+1},(_,i)=>Number((s.min+i*s.step).toFixed(8)));
   for(const value of values){const t=M.run(id,{[s.id]:value});assert.ok(t.steps.length>=6);assert.ok(t.steps.length<50);assert.doesNotMatch(JSON.stringify(t),/NaN|Infinity/);for(const f of t.steps){assert.ok(f.line>=1&&f.line<=t.code.length);assert.ok(f.title&&f.detail&&f.variables);assert.ok(['bars','flow','segments'].includes(f.visual.kind));}}
  }
 }
});
test('message counts follow actual supplied history and tool registration independently',()=>{
 for(let turns=0;turns<=3;turns++)for(const observation of ['yes','no']){
  const r=result('state',{turns,observation});assert.equal(r.messageCount,2+2*turns+(observation==='yes'?1:0));assert.equal(r.next,observation==='yes'?'answer_with_source':'lookup');
  assert.equal(result('state',{turns,observation,tool:'write'}).next,'refuse');
 }
 const t=run('state',{turns:0});assert.match(t.code[2],/turns===0\?\[\]/);assert.match(t.code.at(-1),/messageCount:messages.length/);
 const snapshots=t.steps.filter(s=>s.variables.state);assert.equal(snapshots[0].variables.state.messageCount,2);
 const nine=run('state',{turns:3,observation:'yes'}),svg=Scenes.render(nine,nine.steps.length-1);assert.equal((svg.match(/data-message-role=/g)||[]).length,9);assert.match(svg,/data-message-role="tool"/);
});
test('tool failures never invent execution or consume an error as valid rows',()=>{
 assert.deepEqual(result('tools'),{executed:true,usable:true,count:2,error:null});
 for(const limit of [0,4])assert.deepEqual(result('tools',{limit}),{executed:false,usable:false,count:0,error:'contract'});
 assert.equal(result('tools',{name:'delete'}).executed,false);
 assert.deepEqual(result('tools',{fault:'timeout'}),{executed:true,usable:false,count:0,error:'timeout'});
 const invalid=run('tools',{limit:0});assert.ok(invalid.steps.every(s=>s.variables.executed!==true));
});
test('loop counts final decisions, preserves missing answers, and stops on fatal feedback',()=>{
 for(let budget=1;budget<=6;budget++){
  const success=result('loop',{budget,scenario:'success'});assert.equal(success.calls,1);assert.equal(success.status,budget>=2?'completed':'budget_exhausted');
  const retry=result('loop',{budget,scenario:'retry'});assert.equal(retry.status,budget>=3?'completed':'budget_exhausted');assert.equal(retry.calls,Math.min(budget,2));
  const stalled=result('loop',{budget,scenario:'stall'});assert.equal(stalled.calls,budget);assert.equal(stalled.answer,null);assert.equal(stalled.status,'budget_exhausted');
  const fatal=result('loop',{budget,scenario:'fatal'});assert.equal(fatal.calls,1);assert.equal(fatal.status,'tool_error');assert.equal(fatal.answer,null);
 }
});
test('context packing reserves output and refuses a partial required input',()=>{
 assert.deepEqual(result('context'),{inputBudget:45,requiredCost:36,used:36,remaining:9,selected:[['system',12],['task',8],['constraint',6],['memory',10]],status:'ready'});
 assert.equal(result('context',{memory:'full'}).status,'refuse_missing_required');
 const insufficient=result('context',{window:50,reserve:20});assert.equal(insufficient.used,0);assert.deepEqual(insufficient.selected,[]);
 const spacious=result('context',{window:80,reserve:20});assert.equal(spacious.used,48);assert.equal(spacious.remaining,12);
 const t=run('context',{window:80,reserve:20}),added=t.steps.findIndex(s=>s.line===8);assert.doesNotMatch(Scenes.render(t,added-1),/data-budget-piece="optional"/);assert.match(Scenes.render(t,added),/width="105"[^>]+data-budget-piece="optional" data-cost="12"/);
});
test('controlled framework model preserves null on rejected execution, not zero in fallback visuals',()=>{
 assert.equal(result('smolagents').amount,36);assert.equal(result('smolagents',{quantity:4,unitPrice:7}).amount,28);
 const t=run('smolagents',{allow:'no'});assert.deepEqual(t.result,{allowed:false,toolCount:null,amount:null,answer:null});
 for(const step of t.steps.filter(s=>[5,7].includes(s.line)))assert.deepEqual(step.visual.rows,[]);
 assert.ok(!Scenes.render(t,0).includes('data-number="36"'));
 const final=Scenes.render(run('smolagents'),7);assert.match(final,/data-number="36"/);
});
test('RAG exposes query rewriting, exact score geometry, strict zero-match rejection and source provenance',()=>{
 assert.equal(result('rag').calls,2);assert.equal(result('rag').answer[0].source,'sampling-v1');
 assert.equal(result('rag',{budget:1}).evidenceCount,0);assert.equal(result('rag',{threshold:.5}).calls,1);
 for(const threshold of [0,.25,.5,.75,1])for(const topk of [1,2,3]){
  const r=result('rag',{question:'unknown',threshold,topk});assert.equal(r.evidenceCount,0);assert.deepEqual(r.answer,[{source:null,value:'资料不足'}]);
 }
 const t=run('rag');assert.equal(t.code[3].trim(),'calls++;');
 for(const s of t.steps.filter(x=>x.variables.terms))assert.equal(s.line,4);
 const scored=t.steps.findIndex(s=>s.variables.ranked);const svg=Scenes.render(t,scored);assert.match(svg,/width="90"[^>]+data-score="0.5"/);
 assert.doesNotMatch(Scenes.render(t,0),/回答与来源[^]*sampling-v1: 10 ms/);
});
test('evaluation keeps timeout in the denominator and uses declared normalization',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(result('evaluation')).filter(([k])=>k!=='results')),{correct:2,total:4,accuracy:.5,gate:false});
 near(result('evaluation',{normalize:'strict'}).accuracy,.25);near(result('evaluation',{version:'repaired'}).accuracy,1);
 assert.equal(result('evaluation',{threshold:.5}).gate,true);
 const t=run('evaluation');assert.doesNotMatch(Scenes.render(t,0),/>✓</);assert.match(Scenes.render(t,t.steps.length-1),/accuracy 0.5/);
});
test('project retries are bounded, known-absence is an observation, replay is idempotent and conflicts reject old answers',()=>{
 const base=result('project');assert.equal(base.calls,2);assert.equal(base.replayedAnswer,'10 ms');assert.equal(base.replayStatus,'replayed');
 const conflict=result('project',{replay:'conflict'});assert.equal(conflict.replayStatus,'conflict');assert.equal(conflict.replayedAnswer,null);
 for(const question of ['sampling','power','unknown']){
  const failed=result('project',{question,fault:'permanent',budget:3});assert.equal(failed.completed,false);assert.equal(failed.calls,3);assert.equal(failed.answer,null);assert.equal(failed.replayStatus,'not_committed');
 }
 assert.equal(result('project',{question:'unknown',fault:'none'}).answer,'资料不足');
 const t=run('project',{question:'unknown',fault:'permanent'});assert.doesNotMatch(t.code.join('\n'),/else if\(question==='unknown'\)/);
});
test('all SVG scenes follow existing frame snapshots, retain geometry, and avoid decorative perpetual-motion markers',()=>{
 for(const l of data.lessons){
  const t=M.run(l.modelId);let prior='';let changed=0;
  for(let i=0;i<t.steps.length;i++){
   const svg=Scenes.render(t,i);assert.match(svg,/<svg[^>]+viewBox="0 0 800 300"/);assert.match(svg,new RegExp('data-fid-stage="'+i+'"'));assert.doesNotMatch(svg,/NaN|Infinity|undefined|<script|onload=|data-fid-motion=/);
   if(svg!==prior)changed++;prior=svg;
   const altered={...t,result:{uncomputedSecret:'do-not-read-final-result'}};assert.equal(Scenes.render(altered,i),svg,'scene must not read trace.result');
  }
  assert.ok(changed>=2);
 }
 const packed=run('context',{memory:'full'}),svg=Scenes.render(packed,4);assert.match(svg,/data-input-budget="45"/);assert.match(svg,/x1="447" x2="447"/);
});
test('eight complete stdlib examples run real assertions, and all displayed Python programs parse',()=>{
 for(const l of data.lessons){const section=l.sections.at(-1);const p=spawnSync('python3',['-c',section.code],{encoding:'utf8',timeout:10000});assert.equal(p.status,0,l.id+'\n'+p.stderr);assert.ok(p.stdout.trim());}
 const programs=data.lessons.flatMap(l=>l.sections.filter(s=>s.title.includes('完整smolagents')).map(s=>s.code));
 for(const code of programs){const p=spawnSync('python3',['-c','import ast,sys;ast.parse(sys.stdin.read());print("parsed")'],{input:code,encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
});
test('Python independently recomputes loop budgets, RAG, evaluation, context and durable temporary project receipts',()=>{
 const script=`import sys,json,tempfile\nfrom pathlib import Path\nsys.path.insert(0,sys.argv[1])\nimport loop,rag,evaluation,context,project\no={}\no['loop']=[loop.run(b,s) for b in range(1,7) for s in ['success','retry','stall','fatal']]\no['rag']=[rag.retrieve(q,b,2,.75) for q in ['sampling','power','unknown'] for b in [1,2]]\no['eval']=[evaluation.evaluate(v,n) for v in ['baseline','repaired'] for n in ['strict','units']]\no['context']=[context.pack(w,r,m) for w,r,m in [(65,20,'summary'),(65,20,'full'),(80,20,'summary')]]\no['project']=[]\nfor q in ['sampling','unknown']:\n for f in ['none','once','permanent']:\n  for replay in ['same','conflict']:\n   with tempfile.TemporaryDirectory() as directory:o['project'].append(project.project(directory,q,f,2,replay))\nprint(json.dumps(o))`;
 const py=spawnSync('python3',['-c',script,path.join(root,'examples/application-hfagents')],{encoding:'utf8',timeout:15000});assert.equal(py.status,0,py.stderr);const x=JSON.parse(py.stdout);
 const loops=[];for(let budget=1;budget<=6;budget++)for(const scenario of ['success','retry','stall','fatal']){const {events,...r}=result('loop',{budget,scenario});loops.push(r)}assert.deepEqual(loops,x.loop);
 const rags=[];for(const question of ['sampling','power','unknown'])for(const budget of [1,2]){const {attempts,...r}=result('rag',{question,budget});rags.push(r)}assert.deepEqual(rags,x.rag);
 const evals=[];for(const version of ['baseline','repaired'])for(const normalize of ['strict','units']){const {results,...r}=result('evaluation',{version,normalize});evals.push(r)}assert.deepEqual(evals,x.eval);
 const contexts=[[65,20,'summary'],[65,20,'full'],[80,20,'summary']].map(([window,reserve,memory])=>result('context',{window,reserve,memory}));assert.deepEqual(contexts,x.context);
 const projects=[];for(const question of ['sampling','unknown'])for(const fault of ['none','once','permanent'])for(const replay of ['same','conflict'])projects.push(result('project',{question,fault,replay}));assert.deepEqual(projects,x.project);
});
test('real smolagents CodeAgent executes the trusted offline model/tool fixture when the tested environment is supplied',{skip:!process.env.HFAGENTS_FRAMEWORK_PYTHON},()=>{
 const p=spawnSync(process.env.HFAGENTS_FRAMEWORK_PYTHON,[path.join(root,'examples/application-hfagents/smolagents_offline.py')],{env:{...process.env,HF_HUB_OFFLINE:'1'},encoding:'utf8',timeout:20000});assert.equal(p.status,0,p.stderr);const r=JSON.parse(p.stdout.trim().split('\n').at(-1));assert.equal(r.smolagents,'1.26.0');assert.equal(r.answer,36);assert.equal(r.model_calls,1);assert.equal(r.real_model_inference,false);
});
