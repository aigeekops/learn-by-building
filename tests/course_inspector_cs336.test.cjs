const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');require('../web/ai-cs336-2026.js')(M);
const P=require('../web/course-inspectors/cs336.js'),catalog=require('../config/ai_cs336_2026.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const run=id=>M.run(id);
const frame=(t,line)=>t.steps.findIndex(s=>s.line===line);
const cells=(id,line,params)=>{const t=M.run(id,params);return P.models[id].inspect(t,frame(t,line)).cells;};
test('CS336 provider covers all 18 lectures and all 23 actual demo models',()=>{
  const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))].sort();
  assert.equal(catalog.lessons.length,18);assert.equal(ids.length,23);
  assert.deepEqual(Object.keys(P.models).sort(),ids);assert.equal(P.courseId,'cs336');
});
test('every frame and control endpoint has an immutable, meaningful cell inspection',()=>{
  for(const [id,provider] of Object.entries(P.models)){
    const cases=[{}];for(const s of M.specs[id])cases.push({[s.id]:s.type==='range'?s.min:s.options[0][0]},{[s.id]:s.type==='range'?s.max:s.options.at(-1)[0]});
    for(const params of cases){const t=M.run(id,params),snapshot=JSON.stringify(t);
      for(let i=0;i<t.steps.length;i++){
        const inspected=provider.inspect(t,i);assert.ok(inspected.title&&inspected.summary,id);assert.ok(inspected.cells.length,id+' '+i);
        const ids=new Set();for(const c of inspected.cells){assert.ok(c.id&&c.label&&c.formula.length>6&&c.inputs&&c.note,id+' '+i);assert.ok(!ids.has(c.id),id+' duplicate cell '+c.id);ids.add(c.id);}
      }
      assert.equal(JSON.stringify(t),snapshot,id+' mutated its computation');
      assert.deepEqual(provider.inspect(t,-1),provider.inspect(t,0));
      assert.deepEqual(provider.inspect(t,9999),provider.inspect(t,t.steps.length-1));
    }
  }
});
test('each real parameter experiment validates its exact effect and rejects an unchanged run',()=>{
  for(const [id,provider] of Object.entries(P.models))for(const e of provider.experiments){
    assert.ok(e.id&&e.label&&e.prediction&&e.expectation,id);
    const a=M.run(id,e.before),b=M.run(id,e.after);assert.equal(e.verify(a,b),true,id+' '+e.id);assert.equal(e.verify(a,a),false,id+' verify must test an actual effect');
    assert.notDeepEqual(a.params,b.params);
  }
});
test('training and memory cells carry correct units and exact decompositions',()=>{
  near(cells('compute',2)[0].value,6e9*20e9);
  near(cells('compute',5)[0].value,120e18/(8*100e12*.5)/3600);
  assert.equal(cells('cs336-kv',3)[0].value,2*2*64*2*32*2);
  assert.equal(cells('cs336-kv',6)[1].value,2*2*2*32*2);
  assert.equal(cells('parallel',6,{zero:3})[0].value,8);
  assert.equal(cells('cs336-roofline',6)[0].value,16);
});
test('matrix and gate inspectors expose individual arithmetic rather than a variable dump',()=>{
  const rms=run('cs336-rms'),norm=cells('cs336-rms',3).slice(1);
  norm.forEach((c,i)=>near(c.value,rms.result.x[i]/Math.sqrt(2.5+1e-6)));
  const moe=cells('cs336-moe',5);near(moe[0].value+moe[1].value,moe[2].value);
  const tp=cells('cs336-tensorparallel',4,{mode:'input'});
  assert.equal(tp.length,8);near(tp[0].value+tp[4].value,11);
  const clip=cells('cs336-clip',3);assert.equal(clip.length,9);near(clip[0].value,5);near(clip[1].value,0);near(clip[2].value,Math.sqrt(.5)/.2);
  assert.equal(cells('cs336-clip',4).length,9);
  const patch=cells('cs336-patches',5);assert.deepEqual(patch.map(c=>c.value),[2.5,4.5,10.5,12.5]);
});
test('state inspectors use the current token, block and scheduling slot',()=>{
  const linear=run('cs336-linear-attention'),indices=linear.steps.flatMap((s,i)=>s.line===3?[i]:[]);
  const outer=P.models['cs336-linear-attention'].inspect(linear,indices[0]).cells;
  assert.deepEqual(outer.slice(0,4).map(c=>c.value),[2,0,0,0]);
  const tiling=run('cs336-tiling'),block=tiling.steps.findIndex(s=>s.line===5);
  const tileCells=P.models['cs336-tiling'].inspect(tiling,block).cells;
  assert.equal(tileCells.at(-1).value,tileCells.slice(0,-1).reduce((a,c)=>a+c.value,0));
  const pipe=run('cs336-pipeline'),slot=P.models['cs336-pipeline'].inspect(pipe,1).cells;
  assert.deepEqual(slot.map(c=>c.value),[0,null,null,null]);
  const serving=run('cs336-serving'),time=serving.steps.findIndex(s=>s.line===6);
  assert.deepEqual(P.models['cs336-serving'].inspect(serving,time).cells.slice(0,2).map(c=>c.value),[1,4]);
});
test('probability and evaluation inspectors preserve boundaries and averaging scope',()=>{
  const allCorrect=cells('cs336-grpo',5,{group:'allcorrect'});assert.deepEqual(allCorrect.map(c=>c.value),[0,0,0,0]);
  const losses=cells('cs336-posttrain',6,{mode:'dpo',chosen:1,rejected:1});near(losses[0].value,Math.log(2));
  const pass=cells('cs336-evaluation',3,{k:4});assert.deepEqual(pass.map(c=>c.value),[1,0,1,1]);
  near(cells('cs336-bpb',5)[0].value,8/(Math.log(2)*20));
  const j=cells('cs336-jaccard',6,{overlap:0});assert.equal(j[0].value,0);
  const fit=cells('cs336-fit',6);near(fit[1].value,0);
});
test('corpus inspectors retain concrete decisions and provenance without touching data',()=>{
  const normalized=cells('dedup',2);assert.equal(normalized[0].value,normalized[1].value);
  const unique=cells('dedup',3);assert.equal(unique[0].value,true);assert.equal(unique[1].value,false);
  const provenance=cells('cs336-data-sources',5);assert.ok(provenance.some(c=>c.id==='w1'&&c.inputs.license));
  const bpe=run('cs336-bpe'),count=bpe.steps.findIndex(s=>s.line===2),pairs=P.models['cs336-bpe'].inspect(bpe,count).cells;
  assert.equal(pairs.find(c=>c.label==='相邻对 l+o').value,3);
});
