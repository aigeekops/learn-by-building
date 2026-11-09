const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const M=require('../web/ai-course-models.js');require('../web/application-fsdl.js')(M);
const S=require('../web/application-fsdl-scenes.js'),data=require('../config/application_fsdl.json');
const root=path.resolve(__dirname,'..'),run=(id,p={})=>M.run('fsdl-'+id,p),close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} vs ${b}`);
const choices=s=>s.type==='select'?s.options.map(x=>x[0]):Array.from({length:Math.round((s.max-s.min)/s.step)+1},(_,i)=>Number((s.min+i*s.step).toFixed(10)));
test('FSDL preserves its original lessons and validates every current authored lesson',()=>{
  assert.equal(data.course.id,'fsdl');assert.match(data.course.edition,/2022/);assert.ok(data.lessons.length>=8);
  assert.deepEqual(data.lessons.slice(0,8).map(x=>x.unit),['1','2','3','4','5','6','7','8']);
  assert.equal(new Set(data.lessons.map(x=>x.id)).size,data.lessons.length);
  for(const l of data.lessons){assert.equal(l.course,'fsdl');assert.ok(l.explanation.length>=3);assert.ok(l.sections.length>=3);assert.ok(l.sections.some(s=>s.code&&s.execution));assert.ok(l.practice.length>=3);assert.ok(l.exercise.transfer.length>20);assert.ok(Number.isFinite(l.exercise.expected));for(const key of l.sources)assert.ok(data.sources[key]);}
});
test('all control choices have finite bounded snapshots, aligned lines and valid deterministic SVG',()=>{
  const finite=v=>{if(typeof v==='number')assert.ok(Number.isFinite(v));else if(v&&typeof v==='object')Object.values(v).forEach(finite);};
  for(const l of data.lessons){const id=l.modelId,cases=[{},...M.specs[id].flatMap(s=>choices(s).map(value=>({[s.id]:value})))];
    for(const p of cases){const trace=M.run(id,p);finite(trace);assert.ok(trace.steps.length>=5);assert.deepEqual(M.run(id,p),trace);
      trace.steps.forEach((f,i)=>{assert.ok(f.line>=1&&f.line<=trace.code.length);assert.ok(['bars','flow','segments'].includes(f.visual.kind));const svg=S.render(trace,i);assert.match(svg,/^<svg/);assert.match(svg,/viewBox="0 0 800 340"/);assert.doesNotMatch(svg,/NaN|undefined|Infinity|<script/);assert.equal(svg,S.render(trace,i));});
    }
  }
});
test('threshold metrics distinguish penalties and preserve undefined precision with no positive predictions',()=>{
  const d=run('metrics').result;assert.deepEqual([d.tp,d.fp,d.fn,d.tn],[2,1,1,2]);close(d.accuracy,2/3);assert.equal(d.penalty,7);
  const high=run('metrics',{threshold:.8}).result;close(high.accuracy,d.accuracy);assert.equal(high.penalty,10);
  const none=run('metrics',{threshold:1}).result;assert.equal(none.precision,null);assert.equal(none.recall,0);assert.equal(none.penalty,15);
  const equal=run('metrics',{threshold:.6}).result;assert.equal(equal.checked.find(x=>x.score===.6).predicted,1);
});
test('group overlap and preprocessing leakage vary independently and version changes alter the manifest',()=>{
  const d=run('data').result;assert.equal(d.center,3);assert.deepEqual(d.validationX,[5,7]);assert.deepEqual(d.overlap,[]);assert.equal(d.preprocessingLeak,false);
  const rows=run('data',{split:'row'}).result;assert.equal(rows.center,4);assert.deepEqual(rows.overlap,['A','B','C']);assert.equal(rows.preprocessingLeak,false);
  const all=run('data',{fit:'all'}).result;assert.equal(all.center,5);assert.deepEqual(all.overlap,[]);assert.equal(all.preprocessingLeak,true);
  assert.notEqual(run('data',{revision:1}).result.signature,d.signature);
});
test('independent closed-form training matches trajectories; incomparable validation versions never choose a winner',()=>{
  for(const rate of [.05,.1,.4])for(const epochs of [1,3,6]){
    const d=run('experiments',{rate,epochs}).result;
    d.weights.forEach((w,i)=>close(w,2*(1-(1-2*rate*(i+1))**epochs)));
    d.training.forEach((loss,i)=>close(loss,(d.weights[i]-2)**2));d.validation.forEach((loss,i)=>close(loss,(d.weights[i]-1.5)**2));
  }
  assert.equal(run('experiments').result.winner,'B');assert.equal(run('experiments',{epochs:6}).result.winner,'A');assert.equal(run('experiments',{evaluation:'changed'}).result.winner,null);
  const t=run('experiments');for(const s of t.steps.filter(s=>s.line===3))assert.equal(s.variables.history[0].length,s.variables.epoch);
});
test('gradient reduction is independently checked using a different derivative route',()=>{
  for(const weight of [0,1,2,3.5])for(const reduction of ['mean','sum']){
    const d=run('debugging',{weight,reduction}).result,g=2.5*(weight-2);close(d.numerical,g,1e-7);close(d.gradient,g*(reduction==='mean'?1:2));close(d.nextWeight,weight-.1*d.gradient);close(d.nextLoss,1.25*(d.nextWeight-2)**2);
  }
  const d=run('debugging').result;assert.equal(d.gradient,-5);assert.equal(d.nextWeight,.5);assert.equal(d.nextLoss,2.8125);
});
test('green smoke tests cannot bypass an independent boundary, input contract or artifact mismatch',()=>{
  const smoke=run('testing',{suite:'smoke'}).result;assert.equal(smoke.selectedTestsPass,true);assert.equal(smoke.independentBoundaryPass,false);assert.equal(smoke.releaseReady,false);
  const boundary=run('testing').result;assert.equal(boundary.checks.filter(c=>c.actual!==c.expected).length,1);
  assert.equal(run('testing',{bug:'fixed'}).result.releaseReady,true);
  for(const p of [{bug:'fixed',schema:'missing'},{bug:'fixed',artifact:'mismatch'}])assert.equal(run('testing',p).result.releaseReady,false);
});
test('request scheduling independently accounts for arrival waits, workers and a real smaller tail batch',()=>{
  const d=run('serving').result;assert.deepEqual(d.latencies,[12,10,18,16,24,22]);assert.equal(d.p95,24);assert.equal(d.throughput,187.5);
  const two=run('serving',{workers:2}).result;assert.equal(two.makespan,22);assert.equal(two.p95,14);close(two.throughput,6000/22);
  const tail=run('serving',{batch:4}).result;assert.deepEqual(tail.jobs.map(j=>j.group.length),[4,2]);assert.deepEqual(tail.jobs.map(j=>j.finish-j.start),[16,10]);
  for(const batch of [1,2,3,4])for(const workers of [1,2]){
    const x=run('serving',{batch,workers}).result;assert.equal(x.latencies.length,6);
    for(const j of x.jobs){assert.ok(j.start>=Math.max(...j.group));assert.equal(j.finish-j.start,4+3*j.group.length);}
    for(const worker of [0,1]){const jobs=x.jobs.filter(j=>j.worker===worker);for(let i=1;i<jobs.length;i++)assert.ok(jobs[i].start>=jobs[i-1].finish);}
  }
});
test('distribution signals and delayed task labels stay separate, including equal-threshold alerts',()=>{
  const d=run('monitoring').result;assert.equal(d.totalVariation,.3);assert.equal(d.driftAlert,true);assert.equal(d.errorRate,null);assert.equal(d.feedback,null);
  assert.equal(run('monitoring',{shift:10,threshold:.1}).result.driftAlert,true);assert.equal(run('monitoring',{shift:0}).result.driftAlert,false);
  assert.equal(run('monitoring',{labels:'ready'}).result.errorRate,.5);assert.equal(run('monitoring',{labels:'ready',window:4}).result.errorRate,.25);
});
test('release states preserve old traffic on a blocked candidate and never invent unobserved canary data',()=>{
  const promoted=run('release').result;assert.equal(promoted.state,'promoted');assert.equal(promoted.active,'v2');assert.deepEqual(promoted.events,['prepared','canary','promoted']);
  const rollback=run('release',{canaryErrors:3}).result;assert.equal(rollback.state,'rolled_back');assert.equal(rollback.active,'v1');assert.equal(rollback.canaryRate,.15);
  assert.equal(run('release',{canaryErrors:2,score:.88,latency:120}).result.state,'promoted');
  for(const p of [{score:.86},{latency:130},{manifest:'missing'}]){
    const trace=run('release',p),d=trace.result;assert.equal(d.state,'blocked');assert.equal(d.canaryRate,null);assert.equal(d.active,'v1');assert.deepEqual(d.events,['prepared','blocked']);
    for(const step of trace.steps)if(step.variables.traffic)assert.deepEqual(step.variables.traffic,{v1:1,v2:0});
  }
});
test('SVGs never depend on future snapshots or final results, and output annotations appear only after computation',()=>{
  for(const l of data.lessons){const trace=M.run(l.modelId);trace.steps.forEach((_,i)=>{
    const expected=S.render(trace,i),poison=JSON.parse(JSON.stringify(trace));poison.result={future:'DO_NOT_RENDER'};
    for(let j=i+1;j<poison.steps.length;j++)poison.steps[j].variables={future:'DO_NOT_RENDER'};
    assert.equal(S.render(poison,i),expected,l.id+' frame '+i);
  });}
  const dataTrace=run('data');for(const i of [0,1])assert.doesNotMatch(S.render(dataTrace,i),/>训练集<|>验证集</);
  const metric=run('metrics');for(let i=0;i<metric.steps.length-1;i++)assert.doesNotMatch(S.render(metric,i),/data-fsdl-output="penalty"/);
  const monitoring=run('monitoring');for(let i=0;i<5;i++)assert.doesNotMatch(S.render(monitoring,i),/data-fsdl-output="errorRate"/);
  const release=run('release');for(let i=0;i<release.steps.length-1;i++)assert.doesNotMatch(S.render(release,i),/data-fsdl-output="active"/);
});
test('displayed Python examples run without third-party dependencies and independently reproduce default outputs',()=>{
  const outputs={};
  for(const l of data.lessons){const slug=l.id.slice(5),source=l.sections.find(s=>s.code)?.code,file=path.join(root,'examples/application-fsdl',slug+'.py');
    assert.equal(fs.readFileSync(file,'utf8'),source);const r=spawnSync('python3',[file],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,l.id+': '+r.stderr);outputs[slug]=JSON.parse(r.stdout);
  }
  for(const key of ['tp','fp','fn','tn','penalty'])assert.equal(outputs.metrics[key],run('metrics').result[key]);
  assert.equal(outputs.data.center,run('data').result.center);assert.deepEqual(outputs.data.validationX,run('data').result.validationX);
  close(outputs.experiments.runs[0].w,run('experiments').result.weights[0]);
  close(outputs.debugging.numerical,run('debugging').result.numerical);assert.equal(outputs.debugging.nextLoss,run('debugging').result.nextLoss);
  assert.deepEqual(outputs.testing.checks,run('testing').result.checks);
  assert.deepEqual(outputs.serving.latencies,run('serving').result.latencies);assert.equal(outputs.serving.throughput,run('serving').result.throughput);
  assert.equal(outputs.monitoring.errorRate,null);assert.equal(outputs.monitoring.totalVariation,run('monitoring').result.totalVariation);
  assert.equal(outputs.release.active,run('release').result.active);
});
