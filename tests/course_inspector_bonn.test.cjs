const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const M=require('../web/ai-course-models.js');require('../web/extension-course-models.js').register(M);
const C=require('../web/course-inspectors/bonn.js'),catalog=require('../config/extension_bonn.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const view=(id,t,i=t.steps.length-1)=>C.models[id].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing '+id);return c;};
const finite=x=>{if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(finite);};

test('Bonn owns all eight lessons, registers without dependencies, and inspects frozen current frames only',()=>{
  assert.equal(C.courseId,'bonn');assert.equal(catalog.lessons.length,8);assert.deepEqual(Object.keys(C.models).sort(),ids.slice().sort());
  const sandbox={};vm.runInNewContext(fs.readFileSync(require.resolve('../web/course-inspectors/bonn.js'),'utf8'),sandbox);
  assert.equal(sandbox.CourseInspectorProviders.bonn.courseId,'bonn');
  for(const id of ids){const t=freeze(M.run(id)),before=JSON.stringify(t);assert.equal(t.steps.length,4);assert.ok(C.models[id].intuition.length>20);
    for(let i=0;i<t.steps.length;i++){
      const guarded={model:id,params:t.params,steps:t.steps.map((s,k)=>k<=i?{...s,scene:null}:Object.defineProperty({},'variables',{get(){throw Error('read future frame');}}))};
      Object.defineProperty(guarded,'result',{get(){throw Error('read final result');}});
      Object.defineProperty(guarded.steps[i],'scene',{get(){throw Error('read scene');}});
      const v=view(id,guarded,i);assert.deepEqual(v,view(id,t,i));assert.ok(v.title&&v.summary&&v.cells.length);
      assert.equal(v.cells.length,new Set(v.cells.map(c=>c.id)).size);
      for(const c of v.cells){assert.ok(c.id&&c.label&&c.formula&&c.inputs&&c.note);assert.ok(!c.formula.includes('undefined'));finite(c);}
    }
    assert.deepEqual(view(id,t,-1),view(id,t,0));assert.deepEqual(view(id,t,100),view(id,t,3));
    assert.equal(JSON.stringify(t),before);
  }
});

test('all eight actual control experiments verify concrete results and reject absent changes',()=>{
  let count=0;for(const id of ids)for(const e of C.models[id].experiments){
    const a=freeze(M.run(id,e.before)),b=freeze(M.run(id,e.after));
    assert.ok(e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id);assert.equal(e.verify(a,a),false,id);assert.equal(e.verify(b,b),false,id);count++;
  }assert.equal(count,8);
});

test('motion cells independently reproduce circular integration, mirrored turn, and zero angular speed',()=>{
  const t=M.run('bonn-motion'),v=view('bonn-motion',t,2);
  near(cell(v,'next-x').value,2.75*Math.sin(.2));near(cell(v,'next-y').value,2.75*(1-Math.cos(.2)));near(cell(v,'next-heading').value,.2);
  assert.equal(view('bonn-motion',t,1).cells.some(c=>c.id==='next-x'),false);
  const a=M.run('bonn-motion',{left:.4,right:1.8,dt:.7}),b=M.run('bonn-motion',{left:1.8,right:.4,dt:.7});
  near(a.result.next[0],b.result.next[0]);near(a.result.next[1],-b.result.next[1]);near(a.result.next[2],-b.result.next[2]);
  const straight=view('bonn-motion',M.run('bonn-motion',{left:.7,right:.7,dt:.3}),2);near(cell(straight,'next-x').value,.21);near(cell(straight,'next-y').value,0);assert.match(cell(straight,'next-x').formula,/0.7000 × 0.3000/);
});

test('observation preserves likelihood density units, equal-distance symmetry, and two-candidate normalization',()=>{
  const t=M.run('bonn-observation'),v=view('bonn-observation',t);
  near(cell(v,'likelihood-0').value,Math.exp(-2)/Math.sqrt(Math.PI/2));near(cell(v,'likelihood-1').value,1/Math.sqrt(Math.PI/2));
  near(cell(v,'posterior-1').value,1/(1+Math.exp(-2)));
  const symmetric=view('bonn-observation',M.run('bonn-observation',{range:2.5,sigma:.75}));
  near(cell(symmetric,'posterior-0').value,.5);near(cell(symmetric,'posterior-1').value,.5);
  const highDensity=view('bonn-observation',M.run('bonn-observation',{range:2,sigma:.25}),2);assert.ok(cell(highDensity,'likelihood-1').value>1);assert.match(cell(highDensity,'likelihood-1').note,/密度不是离散位置概率/);
  assert.equal(view('bonn-observation',t,2).cells.some(c=>c.id.startsWith('posterior-')),false);
});

test('Bayes prediction uses both transition contributions before evidence-normalized correction',()=>{
  const t=M.run('bonn-bayes',{sensor:.6}),prediction=view('bonn-bayes',t,1),last=view('bonn-bayes',t);
  near(cell(prediction,'predicted-0').value,.6*.75+.4*.25);near(cell(prediction,'predicted-1').value,.6*.25+.4*.75);
  near(cell(last,'evidence').value,.55*.6+.45*.4);near(cell(last,'posterior-0').value,.33/.51);near(cell(last,'posterior-1').value,.18/.51);
  assert.equal(view('bonn-bayes',t,2).cells.some(c=>c.id==='evidence'),false);
});

test('EKF independently checks Jacobian, signed innovation, gain units, and both Joseph contributions',()=>{
  const t=M.run('bonn-ekf',{x:2.5,variance:.3,noise:.7}),s=25*.3+.7,gain=1.5/s,v=view('bonn-ekf',t);
  near(cell(view('bonn-ekf',t,0),'jacobian').value,5);near(cell(view('bonn-ekf',t,1),'innovation').value,-1.25);
  near(cell(view('bonn-ekf',t,2),'gain').value,gain);near(cell(v,'updated').value,2.5-1.25*gain);
  near(cell(v,'joseph-prior').value,(1-5*gain)**2*.3);near(cell(v,'joseph-noise').value,gain**2*.7);
  near(cell(v,'posterior-variance').value,.3*.7/s);assert.ok(cell(v,'posterior-variance').value>=0);assert.match(cell(v,'updated').note,/K单位m⁻¹/);
  assert.equal(view('bonn-ekf',t,2).cells.some(c=>c.id==='updated'),false);
});

test('particle cells expose relative likelihoods, ESS, prefix sums and half-open resampling intervals',()=>{
  const t=M.run('bonn-particles'),raw=[Math.exp(-2),Math.exp(-.5),1,Math.exp(-2)],z=raw.reduce((a,b)=>a+b,0),weights=raw.map(x=>x/z);
  for(let j=0;j<4;j++){near(cell(view('bonn-particles',t,1),'weight-'+j).value,weights[j]);near(cell(view('bonn-particles',t,2),'cdf-'+j).value,weights.slice(0,j+1).reduce((a,b)=>a+b,0));}
  near(cell(view('bonn-particles',t,2),'ess').value,1/weights.reduce((a,b)=>a+b*b,0));
  const v=view('bonn-particles',t);for(let k=0;k<4;k++){
    const c=cell(v,'resampled-'+k);assert.ok(c.inputs.lower<=c.inputs.draw&&c.inputs.draw<c.inputs.upper);near(cell(v,'draw-'+k).value,.1+k/4);near(cell(v,'new-weight-'+k).value,.25);
  }assert.deepEqual(t.result.resampled,[.5,.5,1,1]);
  assert.equal(view('bonn-particles',t,2).cells.some(c=>c.id.startsWith('resampled-')),false);
  const zero=view('bonn-particles',M.run('bonn-particles',{offset:0}));near(cell(zero,'resampled-0').inputs.lower,0);near(cell(zero,'resampled-0').inputs.draw,0);near(cell(zero,'resampled-0').value,0);
});

test('occupancy log-odds history matches repeated odds multiplication without inventing motion',()=>{
  const t=M.run('bonn-grid',{occupied:.65,hits:4}),history=view('bonn-grid',t,2),odds=(.65/.35)**4;
  for(let k=0;k<=4;k++)near(cell(history,'history-'+k).value,k*Math.log(13/7));
  const final=view('bonn-grid',t);near(cell(final,'odds').value,odds);near(cell(final,'probability').value,odds/(1+odds));
  assert.match(cell(history,'history-2').note,/本帧内部累计记录/);assert.equal(history.cells.some(c=>c.id==='probability'),false);
});

test('anchored pose graph cells satisfy independent normal equations and residual gradient balance',()=>{
  const t=M.run('bonn-slam'),normal=view('bonn-slam',t,1),poses=view('bonn-slam',t,2),v=view('bonn-slam',t);
  for(const [r,row] of [[2,-1],[-1,2]].entries())for(const [c,x] of row.entries())near(cell(normal,`normal-${r}-${c}`).value,x);
  const x1=cell(poses,'pose-1').value,x2=cell(poses,'pose-2').value;near(2*x1-x2,-.2);near(-x1+2*x2,3.2);
  near(cell(v,'residual-0').value,-1/15);near(cell(v,'residual-1').value,-1/15);near(cell(v,'residual-2').value,1/15);near(cell(v,'squared-error').value,1/75);
  near(cell(v,'normal-balance-0').value,0);near(cell(v,'normal-balance-1').value,0);
  assert.equal(normal.cells.some(c=>c.id==='pose-1'),false);assert.equal(poses.cells.some(c=>c.id==='residual-0'),false);
});

test('A* internal arithmetic respects snapshot timing, stable ties, cheaper goal update and actual path cost',()=>{
  const t=M.run('bonn-astar'),initial=view('bonn-astar',t,0),search=view('bonn-astar',t,1),path=view('bonn-astar',t,2),last=view('bonn-astar',t);
  assert.equal(initial.cells.some(c=>c.id==='cost-3'),false);assert.equal(search.cells.some(c=>c.id==='path-0'),false);assert.equal(path.cells.some(c=>c.id==='path-cost'),false);
  assert.deepEqual([0,1,2,3].map(k=>cell(search,'expand-'+k).value),['S','A','B','G']);
  assert.deepEqual(cell(search,'expand-1').inputs.queue,['A','B']);assert.deepEqual(cell(search,'expand-2').inputs.queue,['B','G']);
  near(cell(search,'relax-1-3').inputs.candidate,5);near(cell(search,'relax-2-3').inputs.oldCost,5);near(cell(search,'relax-2-3').inputs.candidate,3);
  assert.equal(cell(path,'goal-popped').value,true);assert.deepEqual(path.cells.filter(c=>c.id.startsWith('path-')).map(c=>c.value),['S','B','G']);
  near(cell(last,'path-cost').value,2+1);near(cell(last,'expanded-count').value,4);near(cell(last,'path-length').value,3);assert.match(cell(last,'path-cost').note,/不证明加权A\*/);
  const dijkstra=view('bonn-astar',M.run('bonn-astar',{weight:0}));near(cell(dijkstra,'initial-priority').value,0);near(cell(last,'initial-priority').value,3);
});
