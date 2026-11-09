const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');require('../web/ai-cs146s-2026.js')(M);
const C=require('../web/course-inspectors/cs146s.js');
const catalog=require('../config/ai_cs146s_2026.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function finite(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finite);}
test('CS146S inspector covers every existing lecture demonstration with actual verifiable experiments',()=>{
  assert.equal(C.courseId,'cs146s');assert.equal(ids.length,11);assert.deepEqual(Object.keys(C.models).sort(),ids.slice().sort());
  for(const id of ids){
    const provider=C.models[id];assert.ok(provider.intuition.length>20,id);assert.ok(provider.experiments.length>=2,id);
    for(const e of provider.experiments){
      assert.ok(e.id&&e.label&&e.prediction&&e.expectation,id);
      const a=freeze(M.run(id,e.before)),b=freeze(M.run(id,e.after));
      assert.equal(e.verify(a,b),true,id+' '+e.id);assert.equal(e.verify(a,a),false,id+' '+e.id+' must check a concrete change');
      const before=JSON.stringify(a),after=JSON.stringify(b);
      for(const t of [a,b])for(let i=0;i<t.steps.length;i++){
        const view=provider.inspect(t,i);assert.ok(view.title&&view.summary);assert.ok(view.cells.length>0,id);
        assert.equal(new Set(view.cells.map(c=>c.id)).size,view.cells.length,id+' duplicate ids');
        for(const c of view.cells){assert.ok(c.id&&c.label&&c.formula&&c.inputs&&typeof c.note==='string');assert.ok(!c.formula.includes('undefined'),id+' '+i+' '+c.id);finite(c);}
      }
      assert.equal(JSON.stringify(a),before);assert.equal(JSON.stringify(b),after);
    }
  }
});
test('all frames and advertised control extremes remain safe, finite and immutable',()=>{
  for(const id of ids){
    const cases=[{}];
    for(const s of M.specs[id])for(const value of s.type==='range'?[s.min,s.max]:s.options.map(o=>o[0]))cases.push({[s.id]:value});
    for(const p of cases){const t=freeze(M.run(id,p)),before=JSON.stringify(t);
      for(let i=0;i<t.steps.length;i++){const v=C.models[id].inspect(t,i);assert.ok(v.cells.length,id);finite(v);}
      assert.deepEqual(C.models[id].inspect(t,-1),C.models[id].inspect(t,0));
      assert.deepEqual(C.models[id].inspect(t,9999),C.models[id].inspect(t,t.steps.length-1));
      assert.equal(JSON.stringify(t),before);
    }
  }
});
test('Agent test cells show actual arithmetic; no future observations appear before the call',()=>{
  const t=M.run('agent',{scenario:'retry',budget:6}),P=C.models.agent;
  assert.equal(P.inspect(t,0).cells.some(c=>c.id.startsWith('case-')),false);
  const firstTest=t.steps.findIndex(s=>s.variables.observation?.results);
  const rows=P.inspect(t,firstTest).cells.filter(c=>c.id.startsWith('case-'));
  assert.deepEqual(rows.map(c=>c.value),[-1,-1,-4]);assert.ok(rows[0].formula.includes('1 − 2 = -1'));
  assert.deepEqual(P.inspect(t,t.steps.length-1).cells.filter(c=>c.id.startsWith('case-')).map(c=>c.value),[3,5,4]);
});
test('capacity and provenance cells preserve unknown, failure and concrete budget quantities',()=>{
  const harness=M.run('cs146s-harness');const hc=C.models['cs146s-harness'].inspect(harness,5).cells;
  assert.equal(hc.find(c=>c.id==='used').value,46);assert.equal(hc.find(c=>c.id==='remaining').value,18);
  const skills=M.run('cs146s-skills',{verify:'no'});assert.equal(C.models['cs146s-skills'].inspect(skills,5).cells.find(c=>c.id==='verified').value,null);
  const config=M.run('cs146s-config',{code:'logic',hook:'lint'});assert.equal(C.models['cs146s-config'].inspect(config,5).cells.find(c=>c.id==='test').value,null);
  const review=M.run('cs146s-review',{spec:'no'}),last=C.models['cs146s-review'].inspect(review,5).cells;
  assert.equal(last.find(c=>c.id==='aggregation').value,0);assert.equal(last.find(c=>c.id==='verdict').value,'needs_spec');
});
test('durable recovery keeps the captured resume point distinct from the final checkpoint',()=>{
  const t=M.run('cs146s-durable'),cells=C.models['cs146s-durable'].inspect(t,5).cells;
  assert.equal(cells.find(c=>c.id==='checkpoint').value,4);assert.equal(cells.find(c=>c.id==='resume').value,2);
  assert.ok(cells.find(c=>c.id==='resume').formula.includes('恢复下标 2'));
  assert.equal(cells.find(c=>c.id==='receipt').value,1);
});
