const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const M=require('../web/ai-course-models.js');require('../web/foundation-missing.js')(M);
const C=require('../web/course-inspectors/tools.js'),catalog=require('../config/foundation_missing.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function finite(value){assert.notEqual(value,undefined);if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finite);}
function inspectAll(t){const before=JSON.stringify(t);for(let i=0;i<t.steps.length;i++){
  const view=C.models[t.model].inspect(t,i);assert.ok(view.title&&view.summary);assert.ok(view.cells.length,t.model+' frame '+i);
  assert.equal(new Set(view.cells.map(c=>c.id)).size,view.cells.length);
  for(const c of view.cells){assert.ok(c.id&&c.label&&c.formula&&c.inputs&&typeof c.note==='string');assert.ok(!c.formula.includes('undefined'),t.model+' '+i+' '+c.id);finite(c);}
}assert.equal(JSON.stringify(t),before,t.model+' mutated trace');}
function variants(id){let all=[{}];for(const s of M.specs[id]){
  const values=s.type==='range'?[...new Set([s.min,s.value,s.max])]:s.options.map(o=>o[0]);
  all=all.flatMap(p=>values.map(value=>({...p,[s.id]:value})));
}return all;}
function trace(id,p={}){return M.run('missing-'+id,p);}
function cells(id,p={},i){const t=trace(id,p);return C.models[t.model].inspect(t,i??t.steps.length-1).cells;}
function get(rows,id){const c=rows.find(c=>c.id===id);assert.ok(c,id+' missing');return c;}

test('all 9 lessons own every actual demo and 25 concrete before/after experiments',()=>{
  assert.equal(C.courseId,'tools');assert.equal(catalog.lessons.length,9);assert.equal(ids.length,9);assert.deepEqual(Object.keys(C.models).sort(),ids.slice().sort());
  let count=0;for(const id of ids){const P=C.models[id];assert.ok(P.intuition.length>20);assert.ok(P.experiments.length>=2);
    for(const e of P.experiments){assert.ok(e.id&&e.label&&e.prediction&&e.expectation);assert.notDeepEqual(e.before,e.after);
      for(const params of [e.before,e.after])for(const key of Object.keys(params))assert.ok(M.specs[id].some(s=>s.id===key),id+' invents a control '+key);
      const a=freeze(M.run(id,e.before)),b=freeze(M.run(id,e.after)),before=JSON.stringify([a,b]);
      assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' must reject unchanged traces');
      inspectAll(a);inspectAll(b);assert.equal(JSON.stringify([a,b]),before);count++;
    }
  }assert.equal(count,25);
});

test('all frames at defaults, every select combination and simultaneous range boundaries are immutable and finite',()=>{
  for(const id of ids)for(const params of [{},...variants(id)]){
    const t=freeze(M.run(id,params));inspectAll(t);
    assert.deepEqual(C.models[id].inspect(t,-1),C.models[id].inspect(t,0));
    assert.deepEqual(C.models[id].inspect(t,9999),C.models[id].inspect(t,t.steps.length-1));
  }
});

test('current inspectors never read final result or future snapshots',()=>{
  for(const id of ids){const t=M.run(id);for(let i=0;i<t.steps.length;i++){
    const poisoned=JSON.parse(JSON.stringify(t));poisoned.result={future:'must not appear'};
    for(let j=i+1;j<poisoned.steps.length;j++)poisoned.steps[j].variables={future:'must not appear'};
    assert.deepEqual(C.models[id].inspect(poisoned,i),C.models[id].inspect(t,i),id+' future leaked at '+i);
  }}
});

test('shell unfolds actual lexical components, truncation, newline counts and failed-open absence',()=>{
  assert.equal(cells('shell',{},0).some(c=>c.id==='path'||c.id==='exit'),false);
  for(const cwd of ['/lab/project/data','/lab/project'])for(const target of ['../report.txt','report.txt','missing/report.txt']){
    const c=cells('shell',{cwd,target},1),actual=get(c,'path').value;assert.equal(actual,path.posix.resolve(cwd,target));
    const components=c.filter(c=>c.id.startsWith('component-'));assert.equal(components.at(-1).value,actual);
    const parent=cells('shell',{cwd,target},2);assert.equal(get(parent,'parent').value,path.posix.dirname(actual));
  }
  assert.equal(get(cells('shell',{mode:'overwrite'},4),'before-write').value,'');
  assert.equal(cells('shell',{mode:'overwrite'},4).some(c=>c.id==='output'||c.id==='writes'),false);
  const write=cells('shell',{mode:'append',lines:4},6);assert.equal(get(write,'file-/lab/project/report.txt').value,'old\nnew-1\nnew-2\nnew-3\nnew-4\n');
  assert.equal(get(cells('shell',{lines:4}),'line-count').value,5);
  const failed=cells('shell',{target:'missing/report.txt',lines:4});
  assert.equal(get(failed,'open').value,false);assert.equal(get(failed,'output').value,'');assert.equal(get(failed,'output-lines').value,0);
  assert.equal(get(failed,'writes').value,0);assert.equal(get(failed,'line-count').value,null);assert.equal(get(failed,'exit').value,1);
  assert.equal(get(failed,'file-/lab/project/report.txt').value,'old\n');
});

test('pipeline cells preserve row provenance, exact sorting and group count distinct from frequency',()=>{
  const early=cells('pipeline',{},1);assert.equal(get(early,'producer-exit').value,0);assert.equal(early.some(c=>c.id.startsWith('keep-')||c.id==='pipeline-exit'),false);
  const c=cells('pipeline');assert.deepEqual(c.filter(c=>c.id.startsWith('keep-')).map(c=>c.value),[true,false,true,false,true,false]);
  assert.deepEqual(c.filter(c=>c.id.startsWith('sorted-')).map(c=>c.value),['slow','warm','warm']);
  assert.equal(get(c,'group-0').value,1);assert.equal(get(c,'group-1').value,2);assert.equal(get(c,'group-count').value,2);
  assert.match(get(c,'group-1').formula,/"warm" === "warm" \? 1 : 0/);
  for(const pipefail of ['off','on']){const r=cells('pipeline',{producer:'fail',filter:'ERROR',pipefail});
    assert.equal(get(r,'selected-count').value,0);assert.equal(get(r,'empty-groups').value,0);assert.equal(get(r,'group-count').value,0);
    assert.equal(get(r,'producer-exit').value,7);assert.equal(get(r,'pipeline-exit').value,pipefail==='on'?7:0);
  }
});

test('environment shows per-version intersection and rejects incompatible locks independently of interpreter',()=>{
  assert.equal(cells('environment',{},0).some(c=>c.id==='selected'||c.id==='dependency'),false);
  const c=cells('environment',{},4);assert.deepEqual(c.filter(c=>c.id.startsWith('app-')).map(c=>c.value),[true,true,false]);
  assert.deepEqual(c.filter(c=>c.id.startsWith('extra-')).map(c=>c.value),[false,true,true]);
  assert.deepEqual(c.filter(c=>c.id.startsWith('intersection-')).map(c=>c.value),[false,true,false]);
  const conflict=cells('environment',{extra:'conflict',lock:'none'});assert.equal(get(conflict,'selected').value,null);assert.equal(get(conflict,'dependency').value,false);
  const badLock=cells('environment',{runtime:'3.12',lock:'1'});assert.equal(get(badLock,'runtime').value,true);assert.equal(get(badLock,'selected').value,1);assert.equal(get(badLock,'dependency').value,false);assert.equal(get(badLock,'ready').value,false);
  assert.equal(get(cells('environment',{lock:'none'}),'reproducible-choice').value,false);
});

test('debugging cells expose independent expected value, real denominator error and operation counts',()=>{
  const c=cells('debug');assert.deepEqual(c.filter(c=>c.id.startsWith('sample-')).map(c=>c.value),[2,4,6,8]);
  assert.equal(get(c,'expected').value,5);assert.equal(get(c,'total').value,20);assert.equal(get(c,'denominator').value,5);
  assert.equal(get(c,'mean').value,4);assert.equal(get(c,'error').value,-1);assert.equal(get(c,'assertion').value,false);
  assert.match(get(c,'mean').formula,/20\.0000 \/ 5\.0000 = 4\.0000/);
  const fixed=cells('debug',{n:8,fix:'fixed',algorithm:'cached'});assert.equal(get(fixed,'expected').value,9);assert.equal(get(fixed,'total').value,72);assert.equal(get(fixed,'mean').value,9);assert.equal(get(fixed,'additions').value,8);
  assert.equal(cells('debug',{},2).some(c=>c.id==='mean'||c.id==='additions'),false);
});

test('Git cells retain three distinct snapshots, staging source, commit parent and restore source',()=>{
  let c=cells('git',{},1);assert.equal(get(c,'head').value,1);assert.equal(get(c,'index').value,2);assert.equal(get(c,'work').value,2);
  c=cells('git',{},2);assert.equal(get(c,'head').value,1);assert.equal(get(c,'index').value,2);assert.equal(get(c,'work').value,7);
  c=cells('git',{},5);assert.equal(get(c,'head').value,2);assert.equal(get(c,'index').value,2);assert.equal(get(c,'work').value,7);assert.equal(get(c,'parent').value,'C0');assert.equal(get(c,'has-staged-change').value,true);
  assert.match(get(c,'head').formula,/C0\(1\.0000\).*C1\(2\.0000\)/);
  const restored=cells('git',{restore:'restore'},6);assert.equal(get(restored,'head').value,2);assert.equal(get(restored,'work').value,2);assert.match(get(restored,'work').formula,/7\.0000 → 2\.0000.*index=2\.0000/);
  c=cells('git');assert.equal(get(c,'unstaged-delta').value,5);assert.equal(get(c,'staged-delta').value,0);assert.equal(get(c,'dirty').value,true);
  const skipped=cells('git',{stage:'skip'});assert.equal(get(skipped,'head').value,1);assert.equal(get(skipped,'index').value,1);assert.equal(get(skipped,'has-staged-change').value,false);assert.equal(skipped.some(c=>c.id==='parent'),false);
});

test('quality checks separate independent expected values, chosen test green and hidden zero boundary',()=>{
  const early=cells('quality',{},1);assert.equal(early.some(c=>c.id.startsWith('actual-')||c.id==='gate'),false);
  const weak=cells('quality');assert.equal(get(weak,'gate').value,true);assert.equal(get(weak,'independent-zero').value,false);
  const boundary=cells('quality',{suite:'boundary'});assert.equal(get(boundary,'expected-0').value,true);assert.equal(get(boundary,'actual-0').value,false);assert.equal(get(boundary,'check-0').value,false);
  assert.equal(get(boundary,'passed').value,2);assert.equal(get(boundary,'gate').value,false);
  const fixed=cells('quality',{suite:'boundary',implementation:'fixed'});assert.deepEqual(fixed.filter(c=>c.id.startsWith('check-')).map(c=>c.value),[true,true,true]);assert.equal(get(fixed,'gate').value,true);
});

test('packaging cells inspect each filename, entry, major-version requirement and actual not-run state',()=>{
  assert.equal(cells('packaging',{},1).some(c=>c.id.startsWith('included-')||c.id==='entry'),false);
  const secret=cells('packaging',{artifact:'includes-secret'});assert.equal(get(secret,'included-4').value,true);assert.equal(get(secret,'allowed-4').value,false);assert.equal(get(secret,'public-only').value,false);assert.equal(get(secret,'entry').value,true);
  const missing=cells('packaging',{artifact:'missing-entry'});assert.equal(get(missing,'included-0').value,false);assert.equal(get(missing,'entry').value,false);assert.equal(get(missing,'blocker-entryOK').value,true);
  for(const bump of ['patch','minor','major']){const c=cells('packaging',{change:'breaking',bump});assert.equal(get(c,'contract').value,bump==='major');assert.equal(get(c,'ready').value,bump==='major');assert.equal(get(c,'execution').value,'not-run');}
  const old=cells('packaging',{runtime:'3.10'});assert.equal(get(old,'runtime').value,false);assert.equal(get(old,'blocker-runtimeOK').value,true);
});

test('agent tool frames count actual calls and writes while preserving null and explicit stopping causes',()=>{
  const t=trace('agentic'),P=C.models[t.model];assert.equal(P.inspect(t,0).cells.some(c=>c.id==='source'||c.id==='calls'||c.id==='before-passed'),false);
  assert.equal(get(P.inspect(t,1).cells,'calls').value,0);assert.equal(get(P.inspect(t,1).cells,'before-pending').value,null);
  const before=t.steps.findIndex(s=>s.variables.action==='test-before'),edit=t.steps.findIndex(s=>s.variables.action==='edit'),after=t.steps.findIndex(s=>s.variables.action==='test-after'),review=t.steps.findIndex(s=>s.variables.action==='review');
  assert.equal(get(P.inspect(t,before).cells,'before-actual-0').value,false);assert.equal(get(P.inspect(t,before).cells,'before-passed').value,false);assert.equal(get(P.inspect(t,before).cells,'after-pending').value,null);
  assert.equal(get(P.inspect(t,edit).cells,'calls').value,3);assert.equal(get(P.inspect(t,edit).cells,'writes').value,1);assert.equal(get(P.inspect(t,edit).cells,'source').value,'x >= 0');assert.equal(get(P.inspect(t,edit).cells,'after-pending').value,null);
  assert.equal(get(P.inspect(t,after).cells,'before-actual-0').value,false);assert.equal(get(P.inspect(t,after).cells,'after-actual-0').value,true);assert.equal(get(P.inspect(t,after).cells,'after-passed').value,true);
  assert.equal(get(P.inspect(t,review).cells,'status').value,'running');assert.equal(get(P.inspect(t,review).cells,'zero').value,true);assert.equal(get(cells('agentic'),'status').value,'checked-example');
  const limited=cells('agentic',{budget:3});assert.equal(get(limited,'status').value,'budget-exhausted');assert.equal(get(limited,'calls').value,3);assert.equal(get(limited,'after-pending').value,null);
  const denied=cells('agentic',{permission:'deny'});assert.equal(get(denied,'status').value,'permission-denied');assert.equal(get(denied,'calls').value,3);assert.equal(get(denied,'writes').value,0);assert.equal(get(denied,'source').value,'x > 0');assert.equal(get(denied,'after-pending').value,null);
});

test('agent independent review rejects a weak green unchanged patch or missing specification',()=>{
  const weak=cells('agentic',{candidate:'unchanged',suite:'normal'});assert.equal(get(weak,'after-passed').value,true);assert.equal(get(weak,'zero').value,false);assert.equal(get(weak,'status').value,'boundary-failed');
  const ambiguous=cells('agentic',{specification:'ambiguous'});assert.equal(get(ambiguous,'after-passed').value,true);assert.equal(get(ambiguous,'zero').value,null);assert.equal(get(ambiguous,'review').value,'needs-spec');assert.equal(get(ambiguous,'status').value,'needs-spec');
});

test('collaboration materials show exact zero-count difference and each independent missing condition',()=>{
  const c=cells('beyond');assert.deepEqual(c.filter(c=>c.id.startsWith('expected-keep-')).map(c=>c.value),[true,true,false]);assert.deepEqual(c.filter(c=>c.id.startsWith('actual-keep-')).map(c=>c.value),[false,true,false]);
  assert.equal(get(c,'expected').value,2);assert.equal(get(c,'actual').value,1);assert.equal(get(c,'difference').value,1);assert.equal(get(c,'ready').value,true);assert.equal(get(c,'external-messages').value,0);
  const incomplete=cells('beyond',{report:'no-environment',scope:'mixed',rationale:'what',feedback:'vague'});
  assert.equal(get(incomplete,'environment').value,false);assert.equal(get(incomplete,'steps').value,true);assert.equal(get(incomplete,'missing-count').value,4);assert.equal(get(incomplete,'ready').value,false);
  assert.equal(incomplete.filter(c=>c.id.startsWith('changed-file-')).length,4);assert.equal(get(incomplete,'external-messages').value,0);
  assert.equal(cells('beyond',{},0).some(c=>c.id==='expected'||c.id==='ready'),false);
});

test('browser registration matches the isolated Node course provider',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(require.resolve('../web/course-inspectors/tools.js'),'utf8'),context);
  assert.equal(context.CourseInspectorProviders.tools.courseId,'tools');assert.deepEqual(Object.keys(context.CourseInspectorProviders.tools.models).sort(),ids.slice().sort());
});
