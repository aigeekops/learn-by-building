const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');
const modules=['cs50p','missing','d2l'].map(name=>{
  require('../web/foundation-'+name+'.js')(M);
  return require('../config/foundation_'+name+'.json');
});
const lessons=modules.flatMap(x=>x.lessons),sources=Object.assign({},...modules.map(x=>x.sources));
test('foundation courses preserve map identities and complete both programming syllabi',()=>{
  assert.deepEqual(modules.map(x=>x.course.id),['cs50p','tools','d2l']);
  assert.deepEqual(modules.slice(0,2).map(x=>x.lessons.length),[11,9]);
  assert.ok(modules[2].lessons.length>=8,'retain all existing D2L lessons');
  assert.equal(new Set(lessons.map(x=>x.id)).size,lessons.length);
  for(const module of modules){
    assert.equal(new Set(module.lessons.map(x=>x.unit)).size,module.lessons.length);
    for(const l of module.lessons){
      assert.equal(l.course,module.course.id);assert.ok(l.explanation.length>=3);
      assert.ok(l.sections.length>=3);assert.ok(l.practice.length>=3);
      assert.ok(Number.isFinite(l.exercise.expected));assert.ok(l.exercise.transfer.length>15);
      for(const id of l.sources)assert.ok(sources[id],id);
    }
  }
});
test('official topic coverage resolves locally and keeps all historical lesson positions',()=>{
  const histories={cs50p:['functions','conditions','loops','exceptions','libraries','tests','files'].map(x=>'cs50p-'+x),
    tools:['shell','pipeline','environment','debug','git','quality'].map(x=>'missing-'+x)};
  for(const [index,count] of [[0,11],[1,9]]){
    const module=modules[index],own=new Set(module.lessons.map(x=>x.id));
    assert.deepEqual(module.lessons.slice(0,histories[module.course.id].length).map(x=>x.id),histories[module.course.id]);
    assert.equal(module.course.coverage.items.length,count);
    const covered=new Set();
    for(const item of module.course.coverage.items){
      assert.ok(item.title.length>2);assert.ok(item.lessons.length);
      for(const id of item.lessons){assert.ok(own.has(id),id+' belongs to the same course');covered.add(id);}
    }
    assert.deepEqual(covered,own,'every authored lesson has an official-topic or original-project position');
  }
});
test('every animated model has finite, reproducible snapshots at all control boundaries',()=>{
  for(const l of lessons){
    const id=l.modelId||l.id,specs=M.specs[id];assert.ok(specs,id);
    const cases=[{},...specs.flatMap(s=>(s.type==='range'?[s.min,s.max]:s.options.map(o=>o[0])).map(value=>({[s.id]:value})))];
    for(const params of cases){
      const a=M.run(id,params),b=M.run(id,params);
      assert.deepEqual(a,b,id);assert.ok(a.steps.length>=5,id);
      const visit=v=>{if(typeof v==='number')assert.ok(Number.isFinite(v),id);else if(v&&typeof v==='object')for(const x of Object.values(v))visit(x);};
      visit(a);
      for(const s of a.steps){assert.ok(['flow','bars','segments'].includes(s.visual.kind),id);assert.ok(s.line>=1&&s.line<=a.code.length,id);}
      assert.equal(M.checkNumeric(l.exercise.expected,l.exercise.expected,l.exercise.tolerance).correct,true);
    }
  }
});
