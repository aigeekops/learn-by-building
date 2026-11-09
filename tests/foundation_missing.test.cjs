'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const M=require('../web/ai-course-models.js');require('../web/foundation-missing.js')(M);
const data=require('../config/foundation_missing.json');
const run=(id,p)=>M.run('missing-'+id,p).result;

test('shell resolves relative paths against cwd and distinguishes append, truncation and failed parent',()=>{
 assert.equal(run('shell').path,'/lab/project/report.txt');assert.equal(run('shell').lineCount,2);
 assert.equal(run('shell',{mode:'overwrite',lines:3}).lineCount,3);
 assert.equal(run('shell',{mode:'append',lines:3}).lineCount,4);
 const fresh=run('shell',{target:'report.txt'});assert.equal(fresh.path,'/lab/project/data/report.txt');assert.equal(fresh.lineCount,1);
 assert.equal(run('shell',{cwd:'/lab/project',target:'report.txt'}).lineCount,2);
 const fail=run('shell',{target:'missing/report.txt'});assert.equal(fail.canOpen,false);assert.equal(fail.exitCode,1);assert.equal(fail.lineCount,null);assert.equal(fail.writes,0);assert.equal(fail.commandRan,false);assert.equal(fail.output,'');assert.equal(fail.outputLines,0);assert.deepEqual(fail.files,{'/lab/project/report.txt':'old\n'});
 const a=M.run('missing-shell');a.result.files['/lab/project/report.txt']='mutated';assert.equal(run('shell').lineCount,2);
});


test('failed redirection does not invent command output or show a successful write frame',()=>{
 const tr=M.run('missing-shell',{target:'missing/report.txt',lines:4});
 const output=tr.steps.find(s=>s.line===6),write=tr.steps.find(s=>s.line===7),exit=tr.steps.find(s=>s.line===8);
 assert.equal(output.variables.commandRan,false);assert.equal(output.variables.output,'');assert.equal(output.variables.outputLines,0);assert.ok(output.title.includes('命令未执行'));assert.equal(output.visual.rows[0].value,0);
 assert.equal(write.variables.writes,0);assert.ok(write.title.includes('跳过写入'));assert.equal(Object.hasOwn(write.variables,'exitCode'),false);assert.deepEqual(write.variables.files,{'/lab/project/report.txt':'old\n'});
 assert.equal(exit.variables.exitCode,1);assert.equal(exit.variables.commandRan,false);assert.ok(tr.code[exit.line-1].includes('const exitCode'));
 const success=M.run('missing-shell');assert.equal(success.steps.find(s=>s.line===8).variables.exitCode,0);assert.equal(success.result.outputLines,1);
});

test('pipeline counts actual messages and exposes upstream partial-output failure',()=>{
 const r=run('pipeline');assert.deepEqual(r.groups,[{message:'slow',count:1},{message:'warm',count:2}]);assert.equal(r.count,2);assert.equal(r.selected.length,3);assert.equal(r.complete,true);
 assert.deepEqual(run('pipeline',{filter:'ERROR'}).groups,[{message:'offline',count:2}]);
 assert.equal(run('pipeline',{filter:'ALL'}).count,4);
 const on=run('pipeline',{producer:'fail',pipefail:'on'}),off=run('pipeline',{producer:'fail',pipefail:'off'});assert.equal(on.count,1);assert.equal(off.count,1);assert.equal(on.exitCode,7);assert.equal(off.exitCode,0);assert.equal(on.complete,false);assert.equal(off.complete,false);
 const empty=run('pipeline',{producer:'fail',filter:'ERROR'});assert.equal(empty.count,0);assert.deepEqual(empty.groups,[]);assert.equal(empty.exitCode,7);
});

test('environment intersection, lock compatibility and runtime checks fail independently',()=>{
 const r=run('environment');assert.deepEqual(r.intersection,[2]);assert.equal(r.selected,2);assert.equal(r.ready,true);
 const conflict=run('environment',{extra:'conflict'});assert.deepEqual(conflict.intersection,[]);assert.equal(conflict.dependencyOK,false);assert.equal(conflict.runtimeOK,true);assert.equal(conflict.ready,false);
 assert.equal(run('environment',{lock:'1'}).dependencyOK,false);
 const runtime=run('environment',{runtime:'3.10'});assert.equal(runtime.runtimeOK,false);assert.equal(runtime.dependencyOK,true);assert.equal(runtime.ready,false);
 const unlocked=run('environment',{lock:'none'});assert.equal(unlocked.selected,2);assert.equal(unlocked.ready,true);assert.equal(unlocked.locked,false);
 assert.equal(run('environment',{lock:'none',extra:'conflict'}).selected,null);
});

test('debugging compares an independent arithmetic-series expectation and exact addition counts',()=>{
 for(const n of [2,4,6,8]){
  const bug=run('debug',{n}),fix=run('debug',{n,fix:'fixed'});assert.equal(bug.total,n*(n+1));assert.equal(bug.mean,n);assert.equal(bug.expected,n+1);assert.equal(bug.passed,false);assert.equal(fix.mean,n+1);assert.equal(fix.passed,true);assert.equal(fix.additions,n*n);
  const cached=run('debug',{n,fix:'fixed',algorithm:'cached'});assert.equal(cached.additions,n);assert.deepEqual(fix.reports,cached.reports);
 }
});

test('Git stages a snapshot rather than following later worktree edits',()=>{
 const before=run('git');assert.equal(before.head.value,2);assert.equal(before.index.value,2);assert.equal(before.work.value,7);assert.equal(before.unstagedDelta,5);assert.equal(before.stagedDelta,0);assert.equal(before.dirty,true);assert.equal(before.head.parent,'C0');
 const after=run('git',{stage:'after'});assert.equal(after.head.value,7);assert.equal(after.work.value,7);assert.equal(after.dirty,false);
 const skip=run('git',{stage:'skip'});assert.equal(skip.head.id,'C0');assert.equal(skip.hasStagedChange,false);assert.equal(skip.index.value,1);assert.equal(skip.work.value,7);
 const restored=run('git',{restore:'restore'});assert.equal(restored.work.value,2);assert.equal(restored.head.value,2);assert.equal(restored.dirty,false);
 assert.equal(run('git',{first:5,second:9}).unstagedDelta,4);
});

test('weak green tests can miss a specification boundary; strengthened tests reject the bug',()=>{
 const weak=run('quality');assert.equal(weak.testsGreen,true);assert.equal(weak.gatePass,true);assert.equal(weak.independentBoundaryPass,false);
 const strong=run('quality',{suite:'boundary'});assert.equal(strong.passed,2);assert.equal(strong.total,3);assert.equal(strong.gatePass,false);
 const fixed=run('quality',{suite:'boundary',implementation:'fixed'});assert.equal(fixed.passed,3);assert.equal(fixed.gatePass,true);assert.equal(fixed.independentBoundaryPass,true);
 const noRepro=run('quality',{suite:'boundary',implementation:'fixed',lock:'missing'});assert.equal(noRepro.testsGreen,true);assert.equal(noRepro.gatePass,false);
});

test('nine lessons include executable local Python fixtures whose documented output is real',()=>{
 assert.equal(data.course.id,'tools');assert.equal(data.lessons.length,9);assert.deepEqual(data.lessons.map(l=>l.unit),['1','2','3','4','5','6','7','8','9']);
 for(const l of data.lessons){
  assert.equal(l.course,'tools');assert.ok(l.explanation.length>=3);assert.ok(l.sections.length>=3);assert.ok(l.practice.length>=3);assert.ok(l.exercise.transfer);assert.ok(l.boundary.includes('原创'));
  for(const s of l.sections){assert.ok(s.explanation.length>=70,l.id+' '+s.title);assert.ok(s.code);assert.ok(s.exercise);}
  for(const source of l.sources)assert.ok(data.sources[source],source);
  for(const b of l.bridges)assert.ok(data.lessons.some(x=>x.id===b.lesson));
  assert.ok(M.checkNumeric(String(l.exercise.expected),l.exercise.expected,l.exercise.tolerance).correct);
  const fixture=l.local_example;assert.equal(fixture.language,'python');assert.ok(l.sections.some(s=>s.code===fixture.code));
  const output=execFileSync('python3',['-c',fixture.code],{encoding:'utf8'});assert.equal(output,fixture.expected_stdout,l.id);
 }
});

test('official nine-topic coverage follows source order while preserving all six original lesson ids',()=>{
 const coverage=data.course.coverage;
 assert.equal(coverage.kind,'official-topics');assert.equal(coverage.items.length,9);
 assert.deepEqual(coverage.items.map(x=>x.unit),['1','2','3','4','5','6','7','8','9']);
 assert.deepEqual(coverage.items.map(x=>x.lessons[0]),['missing-shell','missing-pipeline','missing-environment','missing-debug','missing-git','missing-packaging','missing-agentic','missing-beyond','missing-quality']);
 for(const item of coverage.items){assert.equal(item.status,'authored');assert.ok(item.title);for(const id of item.lessons)assert.ok(data.lessons.some(l=>l.id===id));}
 assert.deepEqual(data.course.published.map(x=>x.lessons[0]),data.lessons.map(x=>x.id));
 assert.ok(!data.course.pending.includes('尚未整理'));assert.ok(data.sources['missing-2026-agentic'].url.endsWith('/agentic-coding/'));assert.ok(data.sources['missing-2026-beyond'].url.endsWith('/beyond-code/'));
});

test('packaging separates artifact contents, version compatibility and receiver requirements',()=>{
 const good=run('packaging');assert.equal(good.files.length,4);assert.deepEqual(good.blockers,[]);assert.equal(good.ready,true);assert.equal(good.execution,'not-run');
 const entry=run('packaging',{artifact:'missing-entry'});assert.equal(entry.files.length,3);assert.deepEqual(entry.blockers,['entryOK']);assert.equal(entry.ready,false);
 const secret=run('packaging',{artifact:'includes-secret'});assert.deepEqual(secret.blockers,['publicOnly']);assert.ok(secret.files.includes('.env'));
 assert.equal(run('packaging',{change:'breaking',bump:'patch'}).contractOK,false);
 assert.equal(run('packaging',{change:'breaking',bump:'minor'}).ready,false);
 assert.equal(run('packaging',{change:'breaking',bump:'major'}).ready,true);
 const runtime=run('packaging',{runtime:'3.10'});assert.deepEqual(runtime.blockers,['runtimeOK']);assert.equal(runtime.execution,'not-run');
 assert.deepEqual(run('packaging',{artifact:'missing-entry',change:'breaking',bump:'minor',runtime:'3.10'}).blockers,['entryOK','contractOK','runtimeOK']);
});

test('agent loop never fabricates post-edit observations after budget exhaustion or denied edit',()=>{
 const good=run('agentic');assert.equal(good.status,'checked-example');assert.equal(good.calls,5);assert.equal(good.writes,1);assert.equal(good.llmCalled,false);assert.equal(good.observations.before.passed,false);assert.equal(good.observations.after.passed,true);
 for(const budget of [1,2,3,4]){const out=run('agentic',{budget});assert.equal(out.calls,budget);assert.equal(out.status,'budget-exhausted');assert.equal(out.events.length,budget);if(budget<4)assert.equal(out.observations.after,null);if(budget<5)assert.equal(out.observations.review,null);}
 const refused=run('agentic',{permission:'deny'});assert.equal(refused.status,'permission-denied');assert.equal(refused.calls,3);assert.equal(refused.writes,0);assert.equal(refused.source,'x > 0');assert.equal(refused.observations.after,null);assert.equal(refused.events.at(-1).result.error,'permission-denied');
 const deniedTrace=M.run('missing-agentic',{permission:'deny'}),deniedStep=deniedTrace.steps.find(s=>s.variables.lastResult?.error);assert.equal(deniedStep.line,9);assert.ok(deniedTrace.code[deniedStep.line-1].includes('result.error'));assert.equal(deniedStep.variables.writes,0);
 const weak=run('agentic',{candidate:'unchanged',suite:'normal'});assert.equal(weak.observations.before.passed,true);assert.equal(weak.observations.after.passed,true);assert.equal(weak.status,'boundary-failed');
 assert.equal(run('agentic',{candidate:'unchanged',suite:'boundary'}).status,'tests-failed');assert.equal(run('agentic',{specification:'ambiguous'}).status,'needs-spec');
});

test('communication packet uses a real counterexample and reports concrete missing materials',()=>{
 const good=run('beyond');assert.equal(good.expected,2);assert.equal(good.actual,1);assert.equal(good.ready,true);assert.equal(good.externalMessages,0);
 for(const report of ['no-steps','no-environment'])assert.deepEqual(run('beyond',{report}).missing,['reproducible']);
 const incomplete=run('beyond',{report:'no-steps',scope:'mixed',rationale:'what',feedback:'vague'});assert.deepEqual(incomplete.missing,['reproducible','focused','whyRecorded','actionable']);assert.equal(incomplete.ready,false);assert.equal(incomplete.externalMessages,0);
});

test('three new dedicated scenes preserve prior rendering and expose only executed state',()=>{
 const scenes=require('../web/foundation-coding-scenes.js');const before=scenes.render(M.run('missing-shell'),0),execution=scenes.renderExecution;
 require('../web/foundation-missing-extra-scenes.js')(scenes);
 assert.equal(scenes.render(M.run('missing-shell'),0),before);assert.equal(scenes.renderExecution,execution);
 const geometry=s=>s.replace(/<text[\s\S]*?<\/text>/g,'').replace(/<title[\s\S]*?<\/title>/g,'').replace(/data-fid-stage="\d+"/g,'');
 for(const id of ['missing-packaging','missing-agentic','missing-beyond']){
  const trace=M.run(id),copy=JSON.stringify(trace),frames=trace.steps.map((_,i)=>scenes.render(trace,i));
  assert.equal(new Set(frames).size,frames.length);assert.ok(new Set(frames.map(geometry)).size>=2,id+' must show state geometry/highlights');
  for(const [i,svg] of frames.entries()){assert.ok(svg.startsWith('<svg'));assert.ok(svg.includes('viewBox="0 0 800 280"'));assert.ok(svg.includes('role="img"'));assert.ok(svg.includes('<title'));assert.ok(svg.includes('data-fid-scene="'+id+'"'));assert.ok(svg.includes('data-fid-stage="'+i+'"'));assert.ok(!/NaN|undefined|<script|<animate/.test(svg));}
  assert.equal(JSON.stringify(trace),copy);
  for(const spec of M.specs[id]){const choices=spec.type==='select'?spec.options.map(x=>x[0]):[spec.min,spec.max];assert.ok(choices.some(value=>{const changed=M.run(id,{[spec.id]:value});return scenes.render(changed,changed.steps.length-1)!==frames.at(-1);}),id+' '+spec.id+' must alter real scene');}
 }
 const early=scenes.render(M.run('missing-agentic'),0);assert.ok(early.includes('修改后'));assert.ok(early.includes('未执行 / 未知'));assert.ok(!early.includes('checked-example'));
 const short=M.run('missing-agentic',{budget:3}),last=scenes.render(short,short.steps.length-1);assert.ok(last.includes('budget-exhausted'));assert.ok(last.includes('data-missing-tool="test-after" data-missing-observed="false"'));assert.ok(last.includes('未执行 / 未知'));
 const denied=M.run('missing-agentic',{permission:'deny'});assert.ok(scenes.render(denied,denied.steps.length-1).includes('data-missing-tool="edit" data-missing-observed="true" data-missing-failed="true"'));
 const pkg=scenes.render(M.run('missing-packaging'),0);assert.ok(pkg.includes('data-missing-check="运行时" data-missing-known="false"'));assert.ok(!pkg.includes('四项模型条件通过'));
});

test('new standard-library examples run packaging receiver, agent error paths and local review packets',()=>{
 for(const file of ['shipping.py','agentic.py','beyond.py']){const output=execFileSync('python3',[path.join(__dirname,'../examples/foundation-missing',file),'--self-test'],{encoding:'utf8',timeout:15000});assert.ok(output.includes('passed'));}
});

test('all controls produce finite, bounded traces and supported visuals at their choices/extremes',()=>{
 const finite=x=>{if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(finite)};
 for(const l of data.lessons){
  const id=l.modelId,specs=M.specs[id];const variants=[{}];
  for(const s of specs){const values=s.type==='select'?s.options.map(x=>x[0]):[s.min,s.max];for(const v of values)variants.push({[s.id]:v});}
  for(const p of variants){const tr=M.run(id,p);assert.ok(tr.steps.length>=5);assert.ok(tr.steps.length<=12);finite(tr);for(const frame of tr.steps){assert.ok(frame.line>=1&&frame.line<=tr.code.length);assert.ok(['bars','flow','segments'].includes(frame.visual.kind));assert.ok(Object.keys(frame.variables).length);}}
 }
});

test('real Bash confirms pipefail distinction without accessing any user files',()=>{
 const off=spawnSync('bash',['-c','(printf "partial\\n"; exit 7) | wc -l'],{encoding:'utf8'});
 const on=spawnSync('bash',['-o','pipefail','-c','(printf "partial\\n"; exit 7) | wc -l'],{encoding:'utf8'});
 assert.equal(off.status,0);assert.equal(on.status,7);assert.equal(Number(off.stdout.trim()),1);assert.equal(Number(on.stdout.trim()),1);
});

test('real Git in a temporary repository confirms the staged snapshot and restore behavior',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'lbb-missing-git-'));
 try{
  const git=(...args)=>execFileSync('git',['-c','user.name=Course QA','-c','user.email=course-qa@example.invalid','-c','commit.gpgsign=false',...args],{cwd:folder,encoding:'utf8'});
  git('init','-q');const file=path.join(folder,'report.txt');fs.writeFileSync(file,'1\n');git('add','report.txt');git('commit','-qm','initial');
  fs.writeFileSync(file,'2\n');git('add','report.txt');fs.writeFileSync(file,'7\n');git('commit','-qm','staged snapshot');
  assert.equal(git('show','HEAD:report.txt'),'2\n');assert.equal(fs.readFileSync(file,'utf8'),'7\n');assert.ok(git('diff','--','report.txt').includes('+7'));assert.equal(git('diff','--cached','--','report.txt'),'');
  git('restore','--','report.txt');assert.equal(fs.readFileSync(file,'utf8'),'2\n');
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
