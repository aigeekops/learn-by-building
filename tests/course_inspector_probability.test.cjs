const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const P=require('../web/course-inspectors/probability.js');
const M=require('../web/ai-course-models.js');require('../web/foundation-math.js')(M);
const catalog=require('../config/foundation_probability.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function at(id,params,line){const t=M.run(id,params),i=t.steps.findIndex(s=>s.line===line);assert.ok(i>=0);return {t,cells:P.models[id].inspect(t,i).cells};}
function get(cells,id){const c=cells.find(x=>x.id===id);assert.ok(c,'missing cell '+id);return c;}

test('all six actual demos cover every default and control-boundary frame without trace mutation; 11 real experiments reject unchanged cases',()=>{
  assert.equal(P.courseId,'probability');assert.equal(catalog.lessons.length,6);assert.equal(ids.length,6);assert.deepEqual(Object.keys(P.models).sort(),ids.sort());
  let experiments=0,frames=0;
  for(const id of ids){const provider=P.models[id],cases=[{}];assert.ok(provider.intuition.length>15);assert.ok(provider.experiments.length);
    for(const s of M.specs[id])cases.push({[s.id]:s.min},{[s.id]:s.max});
    for(const params of cases){const t=M.run(id,params),original=JSON.stringify(t);freeze(t);
      t.steps.forEach((s,i)=>{const r=provider.inspect(t,i);assert.ok(r.title&&r.summary&&r.cells.length,`${id} frame ${i}`);assert.equal(new Set(r.cells.map(c=>c.id)).size,r.cells.length);
        for(const c of r.cells){assert.ok(c.id&&c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,`${id}/${c.id}`);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN/.test(c.formula),`${id}/${c.id}: ${c.formula}`);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}frames++;
      });
      assert.deepEqual(provider.inspect(t,-99),provider.inspect(t,0));assert.deepEqual(provider.inspect(t,Infinity),provider.inspect(t,t.steps.length-1));assert.equal(JSON.stringify(t),original);
    }
    for(const e of provider.experiments){const a=M.run(id,e.before),b=M.run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.ok(e.label&&e.prediction&&e.expectation);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepts unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepts unchanged after');assert.equal(JSON.stringify([a,b]),original);experiments++;}
  }
  assert.equal(experiments,11);assert.equal(frames,140);
});

test('browser registration has no dependency and inspectors cannot read future frames or final results',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/probability.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.probability.courseId,'probability');
  for(const id of ids){const t=M.run(id);for(let i=0;i<t.steps.length;i++){const available={...t,steps:new Proxy(t.steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future snapshot');return Reflect.get(target,key);}})};Object.defineProperty(available,'result',{get(){throw Error('future result');}});assert.doesNotThrow(()=>P.models[id].inspect(available,i),id+' frame '+i);}}
});

test('binomial mass cells match independently enumerated Bernoulli sequences, including endpoint conventions',()=>{
  const q=.3,expected=Array(5).fill(0);
  for(let mask=0;mask<16;mask++){let successes=0,prob=1;for(let bit=0;bit<4;bit++){const success=(mask>>bit)&1;successes+=success;prob*=success?q:1-q;}expected[successes]+=prob;}
  const mass=at('probability-binomial',{prob:q},3).cells,counts=at('probability-binomial',{},2).cells;
  assert.deepEqual(counts.map(c=>c.value),[1,4,6,4,1]);mass.forEach((c,j)=>{near(c.value,expected[j]);near(c.value,c.inputs.count*c.inputs.successFactor*c.inputs.failureFactor);});
  const end=at('probability-binomial',{prob:q},5);end.t.result.masses.forEach((x,j)=>near(get(end.cells,'expectation-part-'+j).value,j*x));near(get(end.cells,'expectation').value,1.2);near(get(end.cells,'nq-check').value,1.2);
  for(const prob of [0,1]){const z=at('probability-binomial',{prob},3);assert.deepEqual(z.cells.map(c=>c.value),prob?[0,0,0,0,1]:[1,0,0,0,0]);assert.ok(z.cells.every(c=>c.note.includes('0次幂')));}
});

test('Bayes branches agree with count tables and infinite posterior odds remain null',()=>{
  const defaultCase=at('probability-bayes',{},4);near(get(defaultCase.cells,'posterior').value,90/(90+90));near(get(defaultCase.cells,'good-posterior').value,.5);
  const rare=at('probability-bayes',{prior:.01},4);near(get(rare.cells,'posterior').value,90/(90+990));
  const odds=at('probability-bayes',{},5).cells[0];near(odds.value,(.1/.9)*(.9/.1));
  const noFalse=at('probability-bayes',{falsePositive:0},5);assert.equal(noFalse.t.result.posterior,1);assert.equal(noFalse.cells[0].value,null);assert.equal(noFalse.cells[0].inputs.oddsStatus,'infinite');assert.ok(noFalse.cells[0].formula.includes('分母为0'));assert.ok(noFalse.cells[0].note.includes('null不是0'));
});

test('moment cells retain branch contributions, weighted deviations and independent second-moment identity',()=>{
  for(const [high,mean,variance,second] of [[2,1.5,.75,3],[4,2,2,6],[8,3,9,18]]){
    const p={high},deviation=at('probability-moments',p,3),parts=at('probability-moments',p,4),final=at('probability-moments',p,5),values=[0,2,high],mass=[.25,.5,.25];
    near(get(deviation.cells,'deviation-mean').value,0);parts.cells.forEach((c,j)=>near(c.value,mass[j]*(values[j]-mean)**2));near(get(final.cells,'variance').value,variance);near(get(final.cells,'second-moment').value,second);near(get(final.cells,'variance-check').value,second-mean**2);near(final.t.result.expectation,mean);
  }
});

test('MLE likelihood cells match an explicit fixed sequence and keep continuous estimates separate from grid argmax',()=>{
  for(const successes of [0,3,7,8,10]){const p={successes},sequence=Array.from({length:10},(_,j)=>j<successes),frame=at('probability-mle',p,4),final=at('probability-mle',p,5);
    frame.cells.forEach((c,j)=>{const q=[.2,.5,.7,.9][j],likelihood=sequence.reduce((prod,success)=>prod*(success?q:1-q),1);near(c.value,likelihood);assert.ok(c.note.includes('不要求'));});near(final.t.result.estimate,successes/10);
    if(successes===0){assert.equal(final.t.result.estimate,0);assert.equal(final.t.result.best,.2);}if(successes===10){assert.equal(final.t.result.estimate,1);assert.equal(final.t.result.best,.9);near(get(final.cells,'estimate-check').value,.1);}if(successes===8){assert.equal(final.t.result.estimate,.8);assert.equal(final.t.result.best,.7);}
  }
  const interior=M.run('probability-mle',{successes:7}).result;near(7/interior.estimate-3/(1-interior.estimate),0);
});

test('known-sigma normal interval shows both 2.5 percent tails, actual endpoints and the sample-size scaling law',()=>{
  const z=1.959963984540054,margin=at('probability-interval',{},3),end=at('probability-interval',{mean:1},4);
  assert.equal(get(margin.cells,'tail-probability').value,.025);assert.equal(get(margin.cells,'z-quantile').inputs.upperCDF,.975);near(get(margin.cells,'margin').value,z/2);near(get(end.cells,'lower').value,1-z/2);near(get(end.cells,'upper').value,1+z/2);assert.ok(end.cells.every(c=>c.note.includes('已知')));
  const a=M.run('probability-interval',{n:4}).result,b=M.run('probability-interval',{n:16}).result;near(a.standardError,1);near(b.standardError,.5);near(b.width,a.width/2);near(b.sigma,a.sigma);
  // Integrate the normal density independently (Simpson's rule), rather than reusing a stored CDF.
  const steps=2000,h=2*z/steps,density=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);let area=density(-z)+density(z);for(let i=1;i<steps;i++)area+=(i%2?4:2)*density(-z+i*h);near(area*h/3,.95,1e-11);
});

test('exact test tails match independent enumeration, preserve symmetry and count the center only once',()=>{
  const histogram=Array(11).fill(0);for(let mask=0;mask<1024;mask++){let k=0;for(let j=0;j<10;j++)k+=(mask>>j)&1;histogram[k]++;}
  assert.deepEqual(histogram,[1,10,45,120,210,252,210,120,45,10,1]);
  for(const k of [0,2,5,8,9,10]){const p={k},frame=at('probability-test',p,4),extreme=at('probability-test',p,3).cells,independent=sum(histogram.filter((_,j)=>Math.abs(j-5)>=Math.abs(k-5)))/1024;near(get(frame.cells,'pvalue').value,independent);near(get(frame.cells,'left-tail').value+get(frame.cells,'center').value+get(frame.cells,'right-tail').value,independent);near(M.run('probability-test',{k:10-k}).result.pvalue,independent);extreme.forEach((c,j)=>assert.equal(c.value,Math.abs(j-5)>=Math.abs(k-5)));}
  const center=at('probability-test',{k:5},4).cells;near(get(center,'center').value,252/1024);near(get(center,'pvalue').value,1);
  const nine=at('probability-test',{k:9},4).cells;near(get(nine,'left-tail').value,11/1024);near(get(nine,'right-tail').value,11/1024);near(get(nine,'center').value,0);assert.equal(M.run('probability-test',{k:9,alpha:.01}).result.reject,false);assert.equal(M.run('probability-test',{k:9,alpha:.05}).result.reject,true);
});
