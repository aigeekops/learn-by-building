const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');require('../web/application-fsdl.js')(M);
const C=require('../web/course-inspectors/fsdl.js');
const catalog=require('../config/application_fsdl.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const at=(id,t,i=t.steps.length-1)=>C.models[id].inspect(t,i).cells;
const get=(cells,id)=>{const c=cells.find(c=>c.id===id);assert.ok(c,'missing '+id);return c;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
function finite(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finite);}

test('FSDL covers all 13 existing lessons and every recorded frame without reading the future',()=>{
  assert.equal(C.courseId,'fsdl');assert.equal(catalog.lessons.length,13);assert.equal(ids.length,13);
  assert.deepEqual(Object.keys(C.models).sort(),ids.slice().sort());
  for(const id of ids){
    const t=freeze(M.run(id)),before=JSON.stringify(t),provider=C.models[id];assert.ok(provider.intuition.length>20,id);
    for(let i=0;i<t.steps.length;i++){
      const guarded={model:t.model,params:t.params,steps:t.steps.map((s,k)=>k<=i?s:Object.defineProperty({},'variables',{get(){throw Error('future frame '+k);}}))};
      Object.defineProperty(guarded,'result',{get(){throw Error('future final result');}});
      const view=provider.inspect(guarded,i);assert.ok(view.title&&view.summary&&view.cells.length,id);
      assert.deepEqual(view,provider.inspect(t,i));
      assert.equal(new Set(view.cells.map(c=>c.id)).size,view.cells.length,id);
      for(const c of view.cells){assert.ok(c.id&&c.label&&c.formula&&c.inputs&&c.note,id);assert.ok(!c.formula.includes('undefined'),id);finite(c);}
    }
    assert.deepEqual(provider.inspect(t,-1),provider.inspect(t,0));
    assert.deepEqual(provider.inspect(t,9999),provider.inspect(t,t.steps.length-1));
    assert.equal(JSON.stringify(t),before,id+' mutated trace');
  }
});

test('all 30 FSDL experiments run the original models and verify concrete before/after behavior',()=>{
  let count=0;
  for(const id of ids)for(const e of C.models[id].experiments){
    assert.ok(e.id&&e.label&&e.prediction&&e.expectation);
    assert.notDeepEqual(e.before,e.after,id+'/'+e.id);
    const a=freeze(M.run(id,e.before)),b=freeze(M.run(id,e.after)),before=JSON.stringify(a),after=JSON.stringify(b);
    assert.equal(e.verify(a,b),true,id+'/'+e.id);
    assert.equal(e.verify(a,a),false,id+'/'+e.id+' must reject absent change');
    assert.equal(JSON.stringify(a),before);assert.equal(JSON.stringify(b),after);count++;
  }
  assert.equal(count,30);
});

test('confusion counts and independent test expectations preserve their real observation time',()=>{
  const id='fsdl-metrics',t=M.run(id);
  assert.equal(at(id,t,0).some(c=>c.id==='prediction'),false);
  assert.equal(get(at(id,t,2),'prediction').value,1);
  assert.equal(get(at(id,t,2),'count-tp').value,0,'decision not counted before insertion');
  assert.equal(get(at(id,t,3),'count-tp').value,1);
  const last=at(id,t);assert.equal(get(last,'penalty').formula,'1 × 2 + 1 × 5 = 7');
  near(get(last,'precision').value,2/3);
  const none=M.run(id,{threshold:1});assert.equal(get(at(id,none),'precision').value,null);
  assert.ok(get(at(id,none),'precision').formula.includes('分母0'));
  const testing=M.run('fsdl-testing',{suite:'smoke'});
  assert.equal(at('fsdl-testing',testing,1).some(c=>c.id.startsWith('check-')),false);
  const checks=at('fsdl-testing',testing);assert.equal(get(checks,'suite').value,true);
  assert.equal(get(checks,'boundary').value,false);assert.equal(get(checks,'release-ready').value,false);
});

test('data center, per-example gradients, queue timing and matrix cells expose actual substituted arithmetic',()=>{
  const data=at('fsdl-data',M.run('fsdl-data'));
  assert.equal(get(data,'center').formula,'(0 + 2 + 4 + 6) / 4 = 3');
  assert.equal(get(data,'validation-r4').formula,'8 − 3 = 5');
  const debug=at('fsdl-debugging',M.run('fsdl-debugging',{reduction:'sum'}));
  assert.equal(get(debug,'contribution-1').value,-8);assert.equal(get(debug,'gradient').value,-10);
  assert.ok(get(debug,'gradient').formula.includes('/ 1 = -10'));
  assert.ok(get(debug,'gradient-error').value>4.9);
  const queue=at('fsdl-serving',M.run('fsdl-serving'));
  assert.equal(get(queue,'job-1-start').formula,'max(槽空闲 12, 组末到达 6) = 12 ms');
  assert.equal(get(queue,'latency-4').formula,'32 − 8 = 24 ms');assert.equal(get(queue,'p95').value,24);
  const tail=at('fsdl-serving',M.run('fsdl-serving',{batch:4}));
  assert.equal(get(tail,'job-1-finish').inputs.actualBatch,2,'tail uses actual batch size');
  assert.equal(get(tail,'job-1-finish').value,32);
  const head=at('fsdl-foundation-models',M.run('fsdl-foundation-models'));
  assert.equal(get(head,'feature-1').formula,'0 × 1 + 0.5 × 2 = 1');
  assert.equal(get(head,'encoder-gradient-1-1').formula,'-1 × -0.5 × 2 = 1');
  assert.equal(get(head,'new-encoder-1-1').value,.5);
  const full=at('fsdl-foundation-models',M.run('fsdl-foundation-models',{strategy:'full'}));
  assert.equal(get(full,'new-encoder-1-1').value,.4);near(get(full,'after').value,.45);
});

test('training gradients use recorded old parameters and never relabel a future update as saved',()=>{
  const id='fsdl-project-train',t=M.run(id);
  const first=at(id,t,3);assert.equal(get(first,'gradient-0').value,-.5);assert.equal(get(first,'gradient-1').value,-.375);
  assert.equal(get(first,'probability-0').value,.5);
  assert.equal(first.some(c=>c.id==='saved-loss'),false);
  const update=at(id,t,4);near(get(update,'saved-weight-0').value,.15);
  assert.equal(get(update,'saved-weight-0').inputs.oldWeight,0);
  const secondGradient=at(id,t,5);
  assert.deepEqual(get(secondGradient,'probability-0').inputs.oldWeight,[.15,.11249999999999999]);
  near(get(secondGradient,'saved-weight-0').value,.15,'the second gradient has not yet updated the saved weight');
  assert.equal(get(secondGradient,'saved-weight-0').inputs.oldWeight,0,'saved first update keeps its own old state');
  assert.equal(secondGradient.some(c=>c.id==='validation-0'),false);
  near(get(at(id,t),'saved-loss').value,t.result.history.at(-1).loss);
  near(get(at(id,t),'validation-1').value,t.result.validation[1]);
});

test('missing labels, omitted groups, blocked dependencies and unexecuted release observations stay unknown',()=>{
  const monitoring=M.run('fsdl-monitoring');assert.equal(at('fsdl-monitoring',monitoring,3).some(c=>c.id==='error-rate'),false);
  assert.equal(get(at('fsdl-monitoring',monitoring),'error-rate').value,null);
  const ethics=M.run('fsdl-ethics',{coverage:'omit'});
  assert.equal(at('fsdl-ethics',ethics,2).some(c=>c.id.startsWith('decision-')),false);
  assert.equal(get(at('fsdl-ethics',ethics),'fprGap').value,null);assert.equal(get(at('fsdl-ethics',ethics),'missing').value,1);
  const teams=at('fsdl-ml-teams',M.run('fsdl-ml-teams',{missing:'data'}));
  assert.equal(get(teams,'finish-specification').value,1);assert.equal(get(teams,'start-labels').value,null);
  assert.equal(get(teams,'finish-release').value,null);assert.equal(get(teams,'planned-days').value,null);
  const release=M.run('fsdl-release',{manifest:'missing'});
  assert.equal(at('fsdl-release',release,4).some(c=>c.id==='canary-rate'),false);
  assert.equal(get(at('fsdl-release',release),'canary-rate').value,null);assert.equal(get(at('fsdl-release',release),'active').value,'v1');
  const serving=M.run('fsdl-project-serve',{candidate:'hash'});
  assert.equal(at('fsdl-project-serve',serving,3).some(c=>c.id==='canary-rate'),false);
  assert.equal(get(at('fsdl-project-serve',serving),'requests').value,null);
  assert.equal(get(at('fsdl-project-serve',serving),'canary-rate').value,null);
});
