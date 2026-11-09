const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');require('../web/ai-cs146s-2026.js')(M);
const catalog=require('../config/ai_cs146s_2026.json');
const near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);

test('CS146S has ten dated 2026 material-backed sessions with all teaching components',()=>{
 assert.equal(catalog.lessons.length,10);assert.deepEqual(catalog.lessons.map(l=>l.unit),['9/22','9/24','9/29','10/1','10/6','10/8','10/13','10/20','10/22','10/27']);
 for(const l of catalog.lessons){
  assert.ok(l.explanation.length>=3);assert.ok(l.sections.length>=4);assert.ok(l.sections.every(s=>s.title&&s.explanation.length>45));
  assert.ok(l.practice.length>=3&&l.exercise.transfer);assert.ok(l.demos.length>=1);assert.ok(l.sources.some(s=>s.includes('slides')));
  for(const demo of l.demos){const t=M.run(demo.modelId);assert.ok(t.steps.length>=5);assert.ok(t.code.length>=5);}
 }
 assert.equal(catalog.course.published.length,10);assert.ok(catalog.course.pending.includes('11/3'));
 assert.ok(catalog.lessons.some(l=>l.id==='agent')&&catalog.lessons.some(l=>l.id==='context')&&catalog.lessons.some(l=>l.id==='tools'));
});
test('harness accounting preserves fixed rule and tool-name costs across loading strategies',()=>{
 const a=M.run('cs146s-harness').result,b=M.run('cs146s-harness',{lazy:'no'}).result;
 assert.equal(a.used,46);assert.equal(b.used,70);assert.equal(b.used-a.used,24);
 assert.equal(M.run('cs146s-harness',{compact:'no'}).result.used,70);
 assert.equal(M.run('cs146s-harness',{compact:'no',lazy:'no'}).result.used,94);
 assert.equal(M.run('cs146s-harness',{budget:48,lazy:'no'}).result.status,'needs_reorganization');
});
test('RePPIT exposes a missing boundary test rather than certifying a faulty proposal',()=>{
 assert.equal(M.run('cs146s-reppit',{proposal:'floor',edge:'no'}).result.passed,true);
 const bad=M.run('cs146s-reppit',{proposal:'floor',edge:'yes'}).result;
 assert.equal(bad.passed,false);assert.deepEqual(bad.results[1],{actual:0,want:1});
 assert.equal(M.run('cs146s-reppit',{proposal:'round',edge:'yes'}).result.passed,true);
});
test('skill routing leaves unrelated work and skipped checks unverified',()=>{
 const a=M.run('cs146s-skills').result;assert.equal(a.verified,true);assert.equal(a.totalTokens,42);assert.deepEqual(a.transformed,[2,4,6]);
 assert.equal(M.run('cs146s-skills',{implementation:'identity'}).result.verified,false);
 assert.equal(M.run('cs146s-skills',{verify:'no'}).result.verified,null);
 const none=M.run('cs146s-skills',{request:'none'}).result;assert.equal(none.selected,null);assert.equal(none.totalTokens,12);assert.equal(none.verified,null);assert.deepEqual(none.transformed,[]);
 const browse=M.run('cs146s-skills',{request:'browse'}).result;assert.equal(browse.verified,null);assert.deepEqual(browse.transformed,[]);
});
test('configuration hooks distinguish syntax, unrun tests and real arithmetic failure',()=>{
 assert.equal(M.run('cs146s-config').result.outcome,'checks_passed');
 assert.equal(M.run('cs146s-config',{code:'lint'}).result.outcome,'lint_failed');
 assert.equal(M.run('cs146s-config',{code:'logic',hook:'all'}).result.outcome,'tests_failed');
 const r=M.run('cs146s-config',{code:'logic',hook:'lint'}).result;assert.equal(r.outcome,'tests_unknown');assert.equal(r.testPassed,null);
});
test('readiness keeps individual evidence and runtime isolation separate from worktrees',()=>{
 assert.deepEqual(M.run('cs146s-readiness').result.blockers,['当前文档']);
 const all=M.run('cs146s-readiness',{docs:'yes'}).result;assert.equal(all.status,'ready_for_this_task');assert.equal(all.blockers.length,0);
 const conflict=M.run('cs146s-readiness',{docs:'yes',isolation:'no'}).result;assert.equal(conflict.status,'blocked');assert.deepEqual(conflict.blockers,['共享资源隔离']);
});
test('durable checkpoints alone do not prevent duplicate external effects',()=>{
 const r=M.run('cs146s-durable').result;assert.equal(r.checkpoint,4);assert.equal(r.writeAttempts,2);assert.equal(r.writes,1);assert.equal(r.counts.read,1);assert.deepEqual(r.uniqueEvents,['event-a','event-b']);
 const duplicate=M.run('cs146s-durable',{idempotent:'no'}).result;assert.equal(duplicate.writes,2);
 const queue=M.run('cs146s-durable',{workflow:'queue'}).result;assert.equal(queue.counts.read,2);assert.equal(queue.writes,1);
 const clean=M.run('cs146s-durable',{crash:'none'}).result;assert.equal(clean.writes,1);assert.equal(clean.writeAttempts,1);assert.equal(clean.checkpoint,4);
});
test('verification probabilities reproduce the lecture example and its counterassumption',()=>{
 const r=M.run('cs146s-verification').result;near(r.finalOnly,0.12157665459056935);near(r.checked,0.9801888648295347);assert.equal(r.maxChecks,60);assert.equal(r.checksPerHour,720);
 const correlated=M.run('cs146s-verification',{independent:'no'}).result;near(correlated.checked,correlated.finalOnly);
 const small=M.run('cs146s-verification',{p:.5,steps:2,attempts:2}).result;near(small.checked,.5625);
 assert.equal(M.run('cs146s-verification',{seconds:600}).result.checksPerHour,6);
});
test('review uses independent expected values and de-duplicates root causes',()=>{
 const r=M.run('cs146s-review').result;assert.equal(r.failed.length,1);assert.equal(r.findings.length,1);assert.equal(r.verdict,'request_changes');
 assert.deepEqual(r.failed[0],{c:1,d:50,want:1,actual:0});
 assert.equal(M.run('cs146s-review',{suite:'smoke'}).result.findings.length,0);
 assert.equal(M.run('cs146s-review',{patch:'round'}).result.verdict,'eligible_for_human_review');
 const noSpec=M.run('cs146s-review',{spec:'no'}).result;assert.equal(noSpec.verdict,'needs_spec');assert.deepEqual(noSpec.findings,[]);
 const bug=M.run('cs146s-review',{patch:'bug'}).result;assert.ok(bug.failed.length>1);assert.equal(bug.findings.length,1);
});
test('all new model snapshots are finite and independent across parameter extremes',()=>{
 const ids=Object.keys(M.specs).filter(k=>k.startsWith('cs146s-'));
 assert.equal(ids.length,8);
 for(const id of ids){
  const defaults=M.run(id);const snapshot=JSON.stringify(defaults);
  for(const spec of M.specs[id]){
   const values=spec.type==='range'?[spec.min,spec.max]:spec.options.map(x=>x[0]);
   for(const value of values){const t=M.run(id,{[spec.id]:value});
    function visit(x){if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(visit)}visit(t);
    t.steps.forEach(s=>{assert.ok(s.line>=1&&s.line<=t.code.length);assert.ok(['flow','bars','segments'].includes(s.visual.kind));});
   }
  }
  assert.equal(JSON.stringify(defaults),snapshot);
 }
});
