const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');require('../web/foundation-math.js')(M);
const Scenes=require('../web/foundation-math-scenes.js');
const modules=['linear','probability','cs229'].map(n=>require('../config/foundation_'+n+'.json'));
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
for(const module of modules)for(const l of module.lessons){
  test(l.id+' computes deterministic finite frames across every control boundary',()=>{
    const cases=[{},...M.specs[l.id].flatMap(s=>(s.type==='range'?[s.min,s.max]:s.options.map(x=>x[0])).map(x=>({[s.id]:x})))];
    for(const p of cases){
      const t=M.run(l.id,p);assert.deepEqual(t,M.run(l.id,p));
      const visit=x=>{if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(visit);};visit(t);
      for(let i=0;i<t.steps.length;i++){
        const svg=Scenes.render(t,i);assert.match(svg,new RegExp(`data-fid-stage="${i}"`));
        assert.doesNotMatch(svg,/NaN|Infinity|<animate|<script|onload=|transition:|animation:/);
        assert.ok(t.steps[i].line>0&&t.steps[i].line<=t.code.length);
      }
    }
  });
}
test('linear algebra results satisfy independent geometric and equation constraints',()=>{
  assert.deepEqual(M.run('linear-vectors').result.output,[3,1]);
  for(const kind of ['unique','many','none'])assert.equal(M.run('linear-elimination',{kind}).result.status,kind);
  assert.deepEqual(M.run('linear-elimination').result.solution,[1,1]);
  const p=M.run('linear-projection',{x:3,y:1}).result;
  assert.deepEqual(p.projection,[2,2]);assert.deepEqual(p.residual,[1,-1]);near(p.orthogonality,0);
  assert.equal(M.run('linear-projection',{basis:'zero'}).result.projection,null);
  const fit=M.run('linear-least-squares').result;near(fit.slope,.5);near(fit.intercept,7/6);near(fit.sse,1/6);
  fit.normalResidual.forEach(x=>near(x,0));
  const c=M.run('linear-composition').result;assert.deepEqual(c.rotateAfterScale,[-1,2]);assert.deepEqual(c.scaleAfterRotate,[-2,1]);
  assert.deepEqual(M.run('linear-eigen').result.vector,[8,.125]);
});
test('probability models retain normalization, finite boundaries and exact discrete tails',()=>{
  for(const prob of [0,.2,.5,1]){const b=M.run('probability-binomial',{prob,n:10}).result;near(b.total,1);near(b.expectation,10*prob);}
  near(M.run('probability-binomial',{prob:.2,n:3}).result.masses[1],.384);
  near(M.run('probability-bayes').result.posterior,.5);
  const perfect=M.run('probability-bayes',{falsePositive:0}).result;near(perfect.posterior,1);assert.equal(perfect.odds,null);
  near(M.run('probability-moments').result.variance,2);
  for(const successes of [0,7,10])near(M.run('probability-mle',{successes}).result.estimate,successes/10);
  const a=M.run('probability-interval',{n:16}).result,b=M.run('probability-interval',{n:64}).result;near(a.standardError,.5);near(a.width/2,b.width);
  for(const [k,expected] of [[0,2/1024],[5,1],[8,112/1024],[9,22/1024],[10,2/1024]])near(M.run('probability-test',{k}).result.pvalue,expected);
});
test('learning updates, regularization and held-out selection have independently checked values',()=>{
  near(M.run('cs229-gradient').result.weight,1.875);near(M.run('cs229-gradient',{rate:.4,iterations:1}).result.finalLoss,0);
  assert.ok(M.run('cs229-gradient',{rate:1,iterations:8}).result.finalLoss>5);
  const loss=z=>Math.max(z,0)-z+Math.log1p(Math.exp(-Math.abs(z))),h=1e-5;
  near(M.run('cs229-logistic',{score:2,label:1}).result.gradient,(loss(2+h)-loss(2-h))/(2*h),1e-7);
  near(M.run('cs229-logistic',{score:0,label:1}).result.gradient,-.5);
  const ridge=M.run('cs229-ridge',{lambda:5}).result;near(ridge.weight,1);near(ridge.gradient,0);
  assert.equal(M.run('cs229-validation').result.selected,'constant');assert.equal(M.run('cs229-validation',{selection:'training'}).result.selected,'curve');
  assert.equal(M.run('cs229-validation').result.testScore,null);
  const k=M.run('cs229-kmeans').result;assert.deepEqual(k.centers,[.5,9.5]);near(k.history.at(-1).sse,1);
  assert.deepEqual(M.run('cs229-kmeans',{initial:'same',iterations:1}).result.centers,[5,0]);
  const a=M.run('cs229-pca').result,b=M.run('cs229-pca',{offset:5}).result;assert.deepEqual(a.centered,b.centered);near(a.ratio,1);near(M.run('cs229-pca',{angle:0}).result.ratio,.5);
});
test('all authored local examples actually execute with independent assertions',()=>{
  const {execFileSync}=require('node:child_process'),path=require('node:path');
  for(const m of modules)for(const l of m.lessons){
    const file=path.resolve(__dirname,'../examples/foundation-math/'+l.id+'.py');
    execFileSync('python3',[file],{timeout:10000});
    assert.equal(l.sections.at(-1).code.trim(),require('node:fs').readFileSync(file,'utf8').trim());
  }
});
test('scene rendering cannot peek at future answers or rerun computations',()=>{
  for(const module of modules)for(const l of module.lessons){
    const trace=M.run(l.id),first=Scenes.render(trace,0);
    const altered=structuredClone(trace);altered.result={unknown:'FUTURE_ONLY'};
    for(const step of altered.steps.slice(1))step.variables={unknown:'FUTURE_ONLY'};
    assert.equal(Scenes.render(altered,0),first,l.id);assert.doesNotMatch(first,/FUTURE_ONLY/);
  }
});
