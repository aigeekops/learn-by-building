const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const M=require('../web/ai-course-models.js');require('../web/foundation-cs50p.js')(M);
const C=require('../web/course-inspectors/cs50p.js'),catalog=require('../config/foundation_cs50p.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function definedFinite(value){assert.notEqual(value,undefined);if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(definedFinite);}
function inspectAll(t){const before=JSON.stringify(t);for(let i=0;i<t.steps.length;i++){
  const view=C.models[t.model].inspect(t,i);assert.ok(view.title&&view.summary);assert.ok(view.cells.length>0,t.model+' frame '+i);
  assert.equal(new Set(view.cells.map(c=>c.id)).size,view.cells.length);
  for(const c of view.cells){assert.ok(c.id&&c.label&&c.formula&&c.inputs&&typeof c.note==='string');assert.ok(!c.formula.includes('undefined'),t.model+' '+i+' '+c.id);definedFinite(c);}
}assert.equal(JSON.stringify(t),before,t.model+' mutated trace');}
function variants(id){let all=[{}];for(const s of M.specs[id]){
  const values=s.type==='range'?[...new Set([s.min,s.value,s.max])]:s.options.map(o=>o[0]);
  all=all.flatMap(p=>values.map(value=>({...p,[s.id]:value})));
}return all;}
function cells(id,p={},i){const t=M.run('cs50p-'+id,p);return C.models[t.model].inspect(t,i??t.steps.length-1).cells;}
function get(rows,id){const c=rows.find(c=>c.id===id);assert.ok(c,id+' missing');return c;}

test('all 11 lessons and actual demos have owned providers and concrete parameter experiments',()=>{
  assert.equal(C.courseId,'cs50p');assert.equal(catalog.lessons.length,11);assert.equal(ids.length,11);assert.deepEqual(Object.keys(C.models).sort(),ids.slice().sort());
  let count=0;
  for(const id of ids){const P=C.models[id];assert.ok(P.intuition.length>20);assert.ok(P.experiments.length>=2);
    for(const e of P.experiments){assert.ok(e.id&&e.label&&e.prediction&&e.expectation);assert.notDeepEqual(e.before,e.after);
      const a=freeze(M.run(id,e.before)),b=freeze(M.run(id,e.after)),before=JSON.stringify([a,b]);
      assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' must reject unchanged before/after');
      inspectAll(a);inspectAll(b);assert.equal(JSON.stringify([a,b]),before);count++;
    }
  }assert.equal(count,25);
});

test('every frame at all select combinations and simultaneous range extremes is finite and immutable',()=>{
  for(const id of ids)for(const params of [{},...variants(id)]){
    const t=freeze(M.run(id,params));inspectAll(t);
    assert.deepEqual(C.models[id].inspect(t,-1),C.models[id].inspect(t,0));
    assert.deepEqual(C.models[id].inspect(t,9999),C.models[id].inspect(t,t.steps.length-1));
  }
});

test('inspectors depend only on current/past snapshots and never leak final results or future frames',()=>{
  for(const id of ids){const t=M.run(id);for(let i=0;i<t.steps.length;i++){
    const poisoned=JSON.parse(JSON.stringify(t));poisoned.result={future:'must not appear'};
    for(let j=i+1;j<poisoned.steps.length;j++)poisoned.steps[j].variables={future:'must not appear'};
    assert.deepEqual(C.models[id].inspect(poisoned,i),C.models[id].inspect(t,i),id+' future leaked at '+i);
  }}
});

test('function cells distinguish caller, active local scope, return channel and final caller binding',()=>{
  const t=M.run('cs50p-functions',{raw:7,gain:3,offset:-2}),P=C.models[t.model];
  assert.equal(P.inspect(t,0).cells.some(c=>c.id==='scaled'||c.id==='distance'),false);
  assert.equal(get(P.inspect(t,1).cells,'call').value,null);
  assert.equal(get(P.inspect(t,2).cells,'local-value').value,7);
  assert.equal(get(P.inspect(t,3).cells,'scaled').value,21);
  assert.match(get(P.inspect(t,3).cells,'scaled').formula,/7\.0000.*3\.0000.*21\.0000/);
  assert.equal(get(P.inspect(t,4).cells,'corrected').value,19);
  assert.equal(get(P.inspect(t,5).cells,'return').value,19);assert.equal(P.inspect(t,5).cells.some(c=>c.id==='distance'),false);
  const last=P.inspect(t,6).cells;assert.equal(get(last,'distance').value,19);assert.equal(get(last,'caller-raw').value,7);assert.equal(last.some(c=>c.id==='local-value'||c.id==='scaled'||c.id==='corrected'),false);
});

test('conditional cells preserve equal boundaries and invalid precedence over true candidates',()=>{
  for(const [distance,branch,speed] of [[19,'stop',0],[20,'stop',0],[21,'slow',30],[50,'slow',30],[51,'forward',60]]){
    const c=cells('conditions',{distance});assert.equal(get(c,'branch').value,branch);assert.equal(get(c,'speed').value,speed);
  }
  const c=cells('conditions',{distance:0,valid:'no'});assert.equal(get(c,'near').value,true);assert.equal(get(c,'mid').value,true);assert.equal(get(c,'branch').value,'invalid');
});

test('loop cells show old sum, accepted additions, skipped items and an absent empty mean',()=>{
  const t=M.run('cs50p-loops'),P=C.models[t.model],checks=t.steps.map((s,i)=>({s,i})).filter(x=>Object.hasOwn(x.s.variables,'keep'));
  const expected=[[12,false,0,0],[18,true,0,18],[26,true,18,44],[9,false,44,44]];
  checks.forEach(({i},j)=>{const [value,keep,before,after]=expected[j],current=P.inspect(t,i).cells,next=P.inspect(t,i+1).cells;
    assert.equal(get(current,'condition').value,keep);assert.equal(get(current,'total').value,before);
    assert.deepEqual(get(next,'update').inputs,{before,value,keep,after});assert.equal(get(next,'total').value,after);
  });
  assert.equal(get(cells('loops',{count:0}),'mean').value,null);assert.equal(get(cells('loops',{minimum:30}),'mean').value,null);
  assert.equal(get(cells('loops'),'mean').value,22);
});

test('exception cells keep conversion and division errors separate, preserve zero and negative arithmetic',()=>{
  for(const [text,parsed,status,result] of [['3.5',null,'ValueError',null],['0',0,'ZeroDivisionError',null],['-2',-2,'ok',-50],[' 7 ',7,'ok',100/7]]){
    const c=cells('exceptions',{text});assert.equal(get(c,'parse').value,parsed);assert.equal(get(c,'status').value,status);assert.equal(get(c,'result').value,result);
  }
  assert.equal(get(cells('exceptions',{text:'oops'},3),'division-gate').value,false);
  assert.equal(cells('exceptions',{},0).some(c=>c.id==='result'),false);
});

test('statistics cells unfold each sorted location and both middle values without sorting original input',()=>{
  const c=cells('libraries',{last:10});assert.deepEqual(c.filter(c=>c.id.startsWith('input-')).map(c=>c.value),[10,12,14,10]);
  assert.deepEqual(c.filter(c=>c.id.startsWith('sorted-')).map(c=>c.value),[10,10,12,14]);
  assert.equal(get(c,'total').value,46);assert.equal(get(c,'mean').value,11.5);assert.equal(get(c,'median').value,11);
  assert.deepEqual(get(c,'median').inputs.middle,[10,12]);
});

test('unit-test cells expose actual boundary failure and do not call all future assertions passed',()=>{
  const t=M.run('cs50p-tests'),P=C.models[t.model];assert.equal(P.inspect(t,0).cells.some(c=>c.id.startsWith('outcome-')||c.id==='assert'),false);
  const fails=t.steps.map((s,i)=>({s,i})).filter(x=>x.s.line===5&&x.s.variables.passed===false);assert.equal(fails.length,1);
  const c=P.inspect(t,fails[0].i).cells;assert.equal(get(c,'assert').value,false);assert.deepEqual(get(c,'assert').inputs,{distance:20,actual:60,expected:0});
  assert.equal(get(cells('tests'),'summary').value,1);assert.equal(get(cells('tests',{suite:'smoke'}),'summary').value,0);
});

test('file cells show truncation at open, explicit newline serialization and legitimate zero-valued line',()=>{
  const t=M.run('cs50p-files',{mode:'w',value:0}),P=C.models[t.model];
  assert.equal(get(P.inspect(t,1).cells,'opened').value,'');assert.equal(P.inspect(t,1).cells.some(c=>c.id==='written'),false);
  assert.equal(get(P.inspect(t,2).cells,'line').value,'0\n');assert.equal(get(P.inspect(t,3).cells,'written').value,'0\n');
  const last=P.inspect(t,6).cells;assert.equal(get(last,'parsed-0').value,0);assert.equal(get(last,'mean').value,0);
  assert.equal(get(cells('files'),'total').value,62);assert.equal(get(cells('files'),'mean').value,62/3);
});

test('regex cells explain candidate spans, full range failure, leading zeros and legitimate zero',()=>{
  const t=M.run('cs50p-regex',{text:'prefix AB-12cm suffix'}),P=C.models[t.model];
  assert.equal(P.inspect(t,3).cells.some(c=>c.id==='candidate'||c.id==='value'),false);
  assert.deepEqual(get(P.inspect(t,4).cells,'candidate').inputs,{start:7,end:14,text:'prefix AB-12cm suffix'});
  assert.equal(get(P.inspect(t,5).cells,'range').value,false);assert.equal(get(P.inspect(t,7).cells,'value').value,null);
  assert.equal(get(cells('regex',{text:'AB-0cm'}),'value').value,0);
  assert.equal(get(cells('regex',{text:' ab-012cm '}),'value').value,12);
  assert.equal(get(cells('regex',{text:'AB-1234cm'}),'candidate').value,null);
});

test('object cells tie setters to object identity and preserve old values when writes fail',()=>{
  const t=M.run('cs50p-oop',{reference:'copy',update:20}),P=C.models[t.model];
  assert.equal(get(P.inspect(t,2).cells,'identity').value,'c');assert.equal(get(P.inspect(t,3).cells,'setter-gate').value,true);
  assert.deepEqual(get(P.inspect(t,4).cells,'write').inputs,{before:8,attempt:20,after:20,status:'ok'});
  const copy=P.inspect(t,6).cells;assert.equal(get(copy,'object-a').value,8);assert.equal(get(copy,'object-c').value,20);assert.equal(get(copy,'total').value,24);
  const reject=cells('oop',{update:-5});assert.deepEqual(get(reject,'write').inputs,{before:8,attempt:-5,after:8,status:'ValueError'});
  assert.equal(get(reject,'object-b').value,12);assert.equal(get(reject,'corrected-a').value,10);
});

test('generator cells count actual pulls, compare pre-add seen state and show real unvisited remainder',()=>{
  const t=M.run('cs50p-etcetera',{take:3}),P=C.models[t.model];
  assert.equal(get(P.inspect(t,2).cells,'visited').value,0);assert.equal(P.inspect(t,2).cells.some(c=>c.id==='yield'),false);
  const duplicate=t.steps.findIndex(s=>s.line===5&&s.variables.value===12&&s.variables.keep===false);
  assert.ok(duplicate>0);const c=P.inspect(t,duplicate).cells;assert.equal(get(c,'keep').value,false);assert.deepEqual(get(c,'keep').inputs.seen,[12,18]);
  const last=cells('etcetera',{take:1});assert.equal(get(last,'visited').value,1);assert.equal(get(last,'stop').value,3);assert.equal(get(last,'total').value,12);
  assert.equal(get(cells('etcetera',{take:0}),'stop').value,4);assert.equal(get(cells('etcetera',{take:0,strategy:'eager'}),'stop').value,0);
});

test('project cells keep row provenance, parse/filter transitions, abort and empty summary distinct',()=>{
  const t=M.run('cs50p-project'),P=C.models[t.model];assert.equal(P.inspect(t,1).cells.some(c=>c.id==='sum'||c.id==='report'),false);
  const error=t.steps.findIndex(s=>s.line===5);assert.equal(get(P.inspect(t,error).cells,'error-branch').value,'ok');
  const last=P.inspect(t,t.steps.length-1).cells;assert.equal(get(last,'record-count').value,3);assert.deepEqual(get(last,'record-count').inputs.records.map(r=>r.line),[1,3,4]);
  assert.equal(get(last,'sum').value,44);assert.equal(get(last,'mean').value,44/3);
  const strict=cells('project',{policy:'strict'});assert.equal(get(strict,'summary').value,null);assert.equal(get(strict,'report').value,null);assert.equal(strict.some(c=>c.id==='sum'),false);
  const empty=cells('project',{dataset:'empty'});assert.equal(get(empty,'sum').value,0);assert.equal(get(empty,'mean').value,null);assert.match(get(empty,'report').value,/mean=NA/);
});

test('browser and Node entrypoints register the same isolated course API',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(require.resolve('../web/course-inspectors/cs50p.js'),'utf8'),context);
  assert.equal(context.CourseInspectorProviders.cs50p.courseId,'cs50p');assert.deepEqual(Object.keys(context.CourseInspectorProviders.cs50p.models).sort(),ids.slice().sort());
});
