const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/kalman.js');
const M=require('../web/robotics-foundations-estimation.js');
const catalog=require('../config/robotics_foundations_estimation.json');
const ids=catalog.lessons.map(l=>l.modelId);
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
function matrixNear(A,B){assert.equal(A.length,B.length);A.forEach((row,j)=>row.forEach((x,k)=>near(x,B[j][k])));}
function run(id,changes={}){const params=Object.fromEntries(M[id].controls.map(c=>[c.key,changes[c.key]??c.value]));return {...M[id].run(params),model:id,params};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing cell '+id);return c;};

test('all eight actual Kalman lessons, immutable default snapshots and nine nontrivial experiments',()=>{
  assert.equal(P.courseId,'kalman');assert.equal(ids.length,8);assert.deepEqual(Object.keys(P.models).sort(),[...ids].sort());let count=0;
  for(const id of ids){const t=run(id),original=JSON.stringify(t);freeze(t);assert.ok(P.models[id].intuition.length>15);
    t.frames.forEach((_,i)=>{const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,id+'/'+c.id);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });assert.deepEqual(view(t,-3),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,Infinity),view(t,t.frames.length-1));assert.equal(JSON.stringify(t),original);
    for(const e of P.models[id].experiments){const a=run(id,e.before),b=run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.ok(e.label&&e.prediction&&e.expectation);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepts unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepts unchanged after');assert.equal(JSON.stringify([a,b]),original);count++;}
  }assert.equal(count,9);
});

test('standalone browser registration and strict current/past-vars access without scenes or final result',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/kalman.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.kalman.courseId,'kalman');
  for(const id of ids){const t=run(id);for(let i=0;i<t.frames.length;i++){
    const frames=t.frames.map(f=>{const limited={...f};Object.defineProperty(limited,'scene',{get(){throw Error('scene may contain future values');}});return limited;});
    const limited={params:t.params,model:t.model,frames:new Proxy(frames,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame');return Reflect.get(target,key);}})};
    Object.defineProperty(limited,'result',{get(){throw Error('complete result is not current');}});assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
  }}
});

test('readings, count denominator, individual deviations and theoretical variance have distinct meanings',()=>{
  const t=run('rf-noisy-measurements',{sigma:2,bias:1,n:4}),readings=[9,13,10,12];
  assert.equal(view(t,0).cells.some(c=>c.id==='reading'),false);let sum=0;
  readings.forEach((z,i)=>{sum+=z;const v=view(t,i+1);near(cell(v,'reading').value,z);near(cell(v,'running-sum').value,sum);near(cell(v,'running-mean').value,sum/(i+1));assert.equal(v.cells.some(c=>c.id==='sample-variance'),false);});
  const stats=view(t,5);assert.deepEqual(stats.cells.filter(c=>c.id.startsWith('squared-deviation-')).map(c=>c.value),[4,4,1,1]);near(cell(stats,'sample-variance').value,10/3);near(cell(stats,'assumed-single-variance').value,4);near(cell(stats,'assumed-mean-variance').value,1);near(cell(stats,'assumed-mean-sd').value,1);near(cell(view(t,6),'residual-bias').value,1);
  // R/n uses the stochastic model, whereas this chosen deterministic sample has s²=10/3.
  assert.notEqual(cell(stats,'sample-variance').value,cell(stats,'assumed-single-variance').value);
});

test('independent scalar update, Gaussian normalizer and zero-variance point mass',()=>{
  const t=run('rf-kalman-update',{mean:2,variance:2,q:1,r:3,measurement:7});
  near(cell(view(t,1),'predicted-mean').value,3);near(cell(view(t,2),'predicted-variance').value,3);near(cell(view(t,3),'innovation').value,4);near(cell(view(t,3),'innovation-variance').value,6);near(cell(view(t,3),'evidence-density').value,Math.exp(-4/3)/Math.sqrt(12*Math.PI));assert.equal(view(t,3).cells.some(c=>c.id==='posterior-mean'),false);
  near(cell(view(t,4),'gain').value,.5);near(cell(view(t,5),'correction').value,2);near(cell(view(t,5),'posterior-mean').value,5);
  const final=view(t,6);near(cell(final,'joseph-model-term').value,.75);near(cell(final,'joseph-noise-term').value,.75);near(cell(final,'posterior-variance').value,1.5);near(cell(final,'posterior-sd').value,Math.sqrt(1.5));near(cell(final,'posterior-normalizer').value,Math.sqrt(3*Math.PI));
  // Independent precision-addition identity for two nondegenerate Gaussian factors.
  near(1/cell(final,'posterior-variance').value,1/3+1/3);
  const zero=run('rf-kalman-update',{variance:0,q:0,r:3});near(cell(view(zero,4),'gain').value,0);near(cell(view(zero,5),'posterior-mean').value,5);near(cell(view(zero,6),'posterior-variance').value,0);assert.equal(cell(view(zero,6),'posterior-point-mass').value,'点质量');assert.equal(view(zero,6).cells.some(c=>c.id==='posterior-normalizer'),false);
});

test('real gate experiment checks rejected covariance and a failure case; near-threshold uses full precision',()=>{
  const a=run('rf-filter-assumptions',{q:.1,r:1,spike:8,gate:0}),b=run('rf-filter-assumptions',{q:.1,r:1,spike:8,gate:1}),k=6;
  const accepted=view(a,k),rejected=view(b,k);near(cell(accepted,'nis').value,61.10976499710357);assert.equal(cell(accepted,'rejected').value,false);assert.equal(cell(rejected,'rejected').value,true);near(cell(rejected,'posterior-mean').value,cell(rejected,'predicted-mean').value);near(cell(rejected,'posterior-variance').value,cell(rejected,'predicted-variance').value);assert.equal(rejected.cells.some(c=>c.id==='filter-mse'),false);
  const final=view(b,9),errors=b.result.samples.map(s=>(s.mean-s.reference)**2),raw=b.result.samples.map(s=>(s.z-s.reference)**2);near(cell(final,'filter-mse').value,errors.reduce((s,x)=>s+x,0)/8);near(cell(final,'measurement-mse').value,raw.reduce((s,x)=>s+x,0)/8);assert.ok(b.result.mse>a.result.mse);near(cell(final,'gate-count').value,1);
  const ordinary=run('rf-filter-assumptions',{q:0,r:1,spike:0,gate:1}).result.samples[5],thresholdSpike=ordinary.predictedMean+3*Math.sqrt(ordinary.innovationVariance)-6.6;
  const low=run('rf-filter-assumptions',{q:0,r:1,spike:thresholdSpike-1e-14,gate:1}),high=run('rf-filter-assumptions',{q:0,r:1,spike:thresholdSpike+1e-14,gate:1});
  assert.ok(low.result.samples[5].nis<9);assert.ok(high.result.samples[5].nis>9);assert.equal(cell(view(low,6),'rejected').value,false);assert.equal(cell(view(high,6),'rejected').value,true);assert.ok(cell(view(high,6),'rejected').formula.includes('9.0000>9'));assert.ok(cell(view(high,6),'rejected').note.includes('完整精度'));
});

test('position/velocity covariance propagation and Joseph cells match an independent closed-form case',()=>{
  const t=run('rf-kalman-state',{dt:1,q:0,r:1});
  near(cell(view(t,1),'predicted-position').value,1);near(cell(view(t,1),'predicted-velocity').value,1);assert.equal(view(t,1).cells.some(c=>c.id==='gain-0'),false);
  const before=[[2,1],[1,1]],after=[[2/3,1/3],[1/3,2/3]];
  before.forEach((row,j)=>row.forEach((x,k)=>near(cell(view(t,2),`predicted-p-${j}-${k}`).value,x)));
  near(cell(view(t,3),'innovation').value,.2);near(cell(view(t,3),'innovation-variance').value,3);near(cell(view(t,4),'gain-0').value,2/3);near(cell(view(t,4),'gain-1').value,1/3);near(cell(view(t,4),'posterior-state-0').value,17/15);near(cell(view(t,4),'posterior-state-1').value,16/15);
  after.forEach((row,j)=>row.forEach((x,k)=>near(cell(view(t,5),`posterior-p-${j}-${k}`).value,x)));near(cell(view(t,5),'determinant').value,1/3);near(cell(view(t,5),'covariance-symmetry').value,0);
  const noisy=run('rf-kalman-state',{dt:2,q:1,r:1}),Q=[[4,4],[4,4]];Q.forEach((row,j)=>row.forEach((x,k)=>near(cell(view(noisy,0),`process-q-${j}-${k}`).value,x)));matrixNear(noisy.result.predictedP,[[9,6],[6,5]]);
});

test('correlation signs, zero correlation and observation-independent covariance are explicit',()=>{
  const t=run('rf-kalman-covariance',{rho:-.8,z:2}),expected=[[.8,-.32],[-.32,.488]];
  near(cell(view(t,0),'prior-determinant').value,1.44);near(cell(view(t,1),'gain-0').value,.8);near(cell(view(t,1),'gain-1').value,-.32);near(cell(view(t,2),'posterior-state-0').value,1.6);near(cell(view(t,2),'posterior-state-1').value,-.64);expected.forEach((row,j)=>row.forEach((x,k)=>near(cell(view(t,3),`posterior-p-${j}-${k}`).value,x)));near(cell(view(t,4),'velocity-variance').value,.488);
  const zero=run('rf-kalman-covariance',{rho:0,z:2});near(cell(view(zero,1),'gain-1').value,0);near(cell(view(zero,2),'posterior-state-1').value,0);near(cell(view(zero,4),'velocity-variance').value,1);
  matrixNear(run('rf-kalman-covariance',{rho:-.8,z:-2}).result.covariance,expected);assert.ok(view(t,4).summary.includes('静态计算'));
});

test('four full 2D updates agree with an independent sequential Gaussian-conditioning oracle',()=>{
  const t=run('rf-kalman-2d',{r:.6,bias:.4}),Q=[[.0125,0,.025,0],[0,.0125,0,.025],[.025,0,.05,0],[0,.025,0,.05]],source=[[0,2],[1,3],[2],[3]];
  let state=[0,0,1,.5],covariance=[[1,.3,0,0],[.3,1,0,0],[0,0,1,0],[0,0,0,1]];
  for(let i=1;i<=4;i++){
    const f=t.frames[i].vars,v=view(t,i),predicted=[state[0]+state[2],state[1]+state[3],state[2],state[3]],predictedP=source.map((row,j)=>source.map((col,k)=>row.reduce((s,a)=>s+col.reduce((z,b)=>z+covariance[a][b],0),0)+Q[j][k]));
    predicted.forEach((x,j)=>near(cell(v,`predicted-state-${j}`).value,x));predictedP.forEach((row,j)=>row.forEach((x,k)=>near(cell(v,`predicted-p-${j}-${k}`).value,x)));
    const S=[[predictedP[0][0]+.6,predictedP[0][1]],[predictedP[1][0],predictedP[1][1]+.6]];
    // Verify the shown inverse as an inverse, rather than copying its adjugate formula.
    for(let j=0;j<2;j++)for(let k=0;k<2;k++)near(S[j][0]*cell(v,`innovation-inverse-0-${k}`).value+S[j][1]*cell(v,`innovation-inverse-1-${k}`).value,Number(j===k));
    for(let j=0;j<4;j++)for(let k=0;k<2;k++)near(f.K[j][0]*S[0][k]+f.K[j][1]*S[1][k],predictedP[j][k]);
    state=predicted;covariance=predictedP;
    // R is diagonal, so scalar conditionals in x-then-y order equal the simultaneous update.
    for(let axis=0;axis<2;axis++){
      const old=covariance,residual=f.z[axis]-state[axis],s=old[axis][axis]+.6,gain=old.map(row=>row[axis]/s);
      state=state.map((x,j)=>x+gain[j]*residual);covariance=old.map((row,j)=>row.map((x,k)=>x-gain[j]*old[axis][k]));
    }
    f.state.forEach((x,j)=>{near(x,state[j]);near(cell(v,`posterior-state-${j}`).value,state[j]);});matrixNear(f.P,covariance);covariance.forEach((row,j)=>row.forEach((x,k)=>near(cell(v,`posterior-p-${j}-${k}`).value,x)));near(cell(v,'covariance-symmetry').value,0);
  }
  near(cell(view(t,5),'position-error').value,Math.hypot(state[0]-4,state[1]-2));
  const biased=run('rf-kalman-2d',{r:.6,bias:.8});matrixNear(biased.result.P,t.result.P);assert.ok(cell(view(t,0),'measurement-h-0-0').note.includes('不执行数据关联'));
});

test('EKF radial and tangent eigenvalues agree with a separately derived rank-one update',()=>{
  const t=run('rf-ekf-range',{x:3,y:2,measurement:4,r:.5}),distance=Math.sqrt(13),H=[3/distance,2/distance],expected=H.map((x,j)=>H.map((y,k)=>Number(j===k)-x*y/1.5));
  near(cell(view(t,1),'predicted-range').value,distance);H.forEach((x,j)=>near(cell(view(t,1),`jacobian-${j}`).value,x));near(cell(view(t,2),'innovation').value,4-distance);near(cell(view(t,2),'innovation-variance').value,1.5);assert.equal(view(t,2).cells.some(c=>c.id==='posterior-state-0'),false);
  H.forEach((x,j)=>near(cell(view(t,3),`posterior-state-${j}`).value,[3,2][j]+x*(4-distance)/1.5));
  expected.forEach((row,j)=>row.forEach((x,k)=>near(cell(view(t,4),`posterior-p-${j}-${k}`).value,x)));near(cell(view(t,4),'radial-variance').value,1/3);near(cell(view(t,4),'tangential-variance').value,1);matrixNear(t.result.covariance,expected);
  const tangent=[-H[1],H[0]];expected.forEach((row,j)=>{near(row[0]*H[0]+row[1]*H[1],H[j]/3);near(row[0]*tangent[0]+row[1]*tangent[1],tangent[j]);});
});

test('sigma points recover prior moments and retain the central beta contribution to square-map variance',()=>{
  const t=run('rf-unscented-transform',{mean:-1.5,variance:2}),r=t.result;
  near(r.points.reduce((s,x,j)=>s+r.meanWeights[j]*x,0),-1.5);near(r.points.reduce((s,x,j)=>s+r.covarianceWeights[j]*(x+1.5)**2,0),2);near(cell(view(t,1),'mean-weight-sum').value,1);near(cell(view(t,1),'covariance-weight-0').value,2);assert.equal(view(t,2).cells.some(c=>c.id==='output-mean'),false);
  r.transformed.forEach((x,j)=>near(cell(view(t,2),`transformed-${j}`).value,r.points[j]**2));near(cell(view(t,3),'output-mean').value,4.25);near(cell(view(t,3),'ekf-mean').value,2.25);
  const final=view(t,4);near(cell(final,'variance-term-0').value,8);near(cell(final,'output-variance').value,26);near(cell(final,'exact-mean').value,4.25);near(cell(final,'exact-variance').value,26);near(cell(final,'ekf-variance').value,18);
  // Removing the beta correction loses exactly 2P², the part missed by first-order propagation.
  near(r.outputVariance-(cell(final,'variance-term-1').value+cell(final,'variance-term-2').value),8);assert.ok(view(t,4).summary.includes('静态计算'));
});
