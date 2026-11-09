const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/moveit.js');
const {modelIds,run,specs,catalog}=require('../scripts/check_course_inspectors.cjs');
const ids=modelIds('moveit');
const near=(a,b,tol=1e-10)=>assert.ok(typeof a==='number'&&Math.abs(a-b)<tol,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function view(id,p,index){const trace=run('moveit',id,p);return {trace,cells:P.models[id].inspect(trace,index).cells};}
function cell(cells,id){const c=cells.find(x=>x.id===id);assert.ok(c,'missing '+id);return c;}
const value=(cells,id)=>cell(cells,id).value;

test('eight real lessons inspect 32 default snapshots immutably; 12 control experiments reject unchanged and reversed pairs',()=>{
  assert.equal(P.courseId,'moveit');assert.equal(catalog('moveit').lessons.length,8);assert.equal(ids.length,8);assert.deepEqual(Object.keys(P.models).sort(),ids.slice().sort());
  let frames=0,experiments=0;
  for(const id of ids){const m=P.models[id],t=run('moveit',id),before=JSON.stringify(t);freeze(t);assert.ok(m.intuition.length>20);
    t.steps.forEach((step,i)=>{const v=m.inspect(t,i);assert.equal(v.title,step.title);assert.ok(v.summary);assert.ok(v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN/.test(c.formula));assert.ok(c.note.includes('单位：'));if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}frames++;
    });
    assert.equal(JSON.stringify(t),before);assert.deepEqual(m.inspect(t,-10),m.inspect(t,0));assert.deepEqual(m.inspect(t,NaN),m.inspect(t,0));assert.deepEqual(m.inspect(t,Infinity),m.inspect(t,3));
    const allowed=new Set(specs('moveit',id).map(s=>s.id));
    for(const e of m.experiments){for(const k of [...Object.keys(e.before),...Object.keys(e.after)])assert.ok(allowed.has(k));const a=run('moveit',id,e.before),b=run('moveit',id,e.after);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' unchanged after');assert.equal(e.verify(b,a),false,id+'/'+e.id+' reversed');experiments++;}
  }
  assert.equal(frames,32);assert.equal(experiments,12);
});

test('browser registration needs no dependencies; inspections only read the selected frame and parameters',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/moveit.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.moveit.courseId,'moveit');
  for(const id of ids){const t=run('moveit',id);t.steps.forEach((_,i)=>{
    const steps=t.steps.map(s=>{const f={...s};for(const key of ['scene','visual'])Object.defineProperty(f,key,{get(){throw Error(key+' is not a calculation source');}});return f;});
    const limited={model:t.model,params:t.params,steps:new Proxy(steps,{get(a,k){if(typeof k==='string'&&/^\d+$/.test(k)&&Number(k)!==i)throw Error('non-current frame');return Reflect.get(a,k);}})};
    Object.defineProperty(limited,'result',{get(){throw Error('final result is forbidden');}});assert.doesNotThrow(()=>P.models[id].inspect(limited,i),`${id} frame ${i}`);
  });}
});

test('independent DOF bookkeeping keeps the arm state dimension separate from gripper and full robot',()=>{
  const p={arm:3,gripper:2},whole=view('moveit-model',p,1).cells,group=view('moveit-model',p,2).cells,end=view('moveit-model',p,3).cells;
  assert.equal(value(whole,'robot-dof'),5);assert.equal(value(group,'planning-dof'),3);assert.equal(value(group,'excluded-gripper'),2);assert.equal(value(end,'expected-arm-positions'),3);assert.equal(value(end,'model-check'),'仅自由度记账');
  assert.ok(cell(end,'expected-arm-positions').note.includes('没有收到JointState'));
});

test('position bounds are inclusive, speed uses its own gate, and invalid requests retain the original target lower bound',()=>{
  for(const target of [-1,1]){const checks=view('moveit-limits',{target,velocity:.5},1).cells,end=view('moveit-limits',{target,velocity:.5},3).cells;assert.equal(value(checks,'position-valid'),true);assert.equal(value(checks,'velocity-valid'),true);near(value(end,'lower-bound'),1.25);assert.equal(value(end,'can-reach-requested'),true);}
  const rejected=view('moveit-limits',{target:1.5,velocity:1},3);assert.equal(value(rejected.cells,'can-reach-requested'),false);near(value(rejected.cells,'lower-bound'),1.875);assert.equal(rejected.trace.params.target,1.5);
  const separate=view('moveit-limits',{target:.5,velocity:1},1).cells;assert.equal(value(separate,'position-valid'),true);assert.equal(value(separate,'velocity-valid'),false);
  // The actual velocity control steps by 0.5, so 0.8 is not an invented UI experiment.
  assert.throws(()=>run('moveit','moveit-limits',{velocity:.8}),/步长/);
});

test('DLS matches rational arithmetic, reverses velocity signs, and a zero Jacobian cannot track despite passing the speed limit',()=>{
  const inverse=view('moveit-ik',{},1).cells,mapped=view('moveit-ik',{},2).cells,end=view('moveit-ik',{},3).cells;
  near(value(inverse,'denominator'),13/50);near(value(inverse,'inverse'),25/13);near(value(mapped,'qdot'),5/13);near(value(mapped,'achieved'),5/26);near(value(end,'residual'),-1/130);assert.equal(value(end,'within-limit'),true);
  const negative=view('moveit-ik',{desired:-.2},3);near(negative.trace.steps[2].variables.qdot,-5/13);near(value(negative.cells,'residual'),1/130);
  const singular=view('moveit-ik',{jacobian:0,desired:.5,damping:.1},3);near(singular.trace.steps[1].variables.inverse,0);near(singular.trace.steps[2].variables.qdot,0);near(singular.trace.steps[2].variables.achieved,0);near(value(singular.cells,'residual'),-.5);assert.equal(value(singular.cells,'within-limit'),true);
});

test('segment collision exposes the actual interior projection, tangent rejection, and signed clearance',()=>{
  const p={obstacle:.5,radius:.2},distance=view('moveit-scene',p,1).cells,check=view('moveit-scene',p,2).cells,end=view('moveit-scene',p,3).cells;
  near(value(distance,'projection'),.25);near(value(distance,'closest-0'),.5);near(value(distance,'closest-1'),0);near(value(distance,'endpoint-distance-0'),Math.sqrt(.29));near(value(distance,'endpoint-distance-1'),Math.sqrt(2.29));near(value(distance,'segment-distance'),.2);
  assert.equal(value(check,'endpoint-clear'),true);assert.equal(value(check,'edge-clear'),false);near(value(end,'minimum-clearance'),0);assert.equal(value(end,'collision-free'),false);
  const penetrates=view('moveit-scene',{obstacle:1.5,radius:.5},3).cells;near(value(penetrates,'minimum-clearance'),-.3);assert.equal(value(penetrates,'collision-free'),false);
});

test('non-dividing sample spacing clips the endpoint and can miss both known closed obstacle intervals',()=>{
  const p={step:.75},samples=view('moveit-planning',p,1).cells,original=view('moveit-planning',p,2).cells,shifted=view('moveit-planning',p,3).cells;
  assert.equal(value(samples,'sample-count'),4);assert.deepEqual([0,1,2,3].map(j=>value(samples,'sample-'+j)),[0,.75,1.5,2]);
  for(let j=0;j<4;j++){assert.equal(value(original,'original-hit-'+j),false);assert.equal(value(shifted,'shifted-hit-'+j),false);}
  assert.equal(value(original,'discrete-clear'),true);assert.equal(value(original,'continuous-clear'),false);assert.equal(value(shifted,'shifted-discrete-clear'),true);assert.equal(value(shifted,'shifted-continuous-clear'),false);
  const fine=view('moveit-planning',{step:.25},3).cells;assert.equal(value(fine,'shifted-hit-2'),true);assert.equal(value(fine,'shifted-discrete-clear'),false);
});

test('unequal segment lengths produce distinct fractions and accepting a partial path does not make it full',()=>{
  const first=view('moveit-cartesian',{completed:1},1).cells;near(value(first,'completed-length'),1);near(value(first,'segment-fraction'),.25);near(value(first,'length-fraction'),1/6);
  const p={completed:3,required:.6},coverage=view('moveit-cartesian',p,1).cells,accepted=view('moveit-cartesian',p,2).cells,end=view('moveit-cartesian',p,3).cells;
  near(value(coverage,'completed-length'),4);near(value(coverage,'segment-fraction'),.75);near(value(coverage,'length-fraction'),2/3);assert.equal(value(accepted,'accepted'),true);near(value(accepted,'coverage-margin'),1/15);near(value(end,'remaining-length'),2);assert.equal(value(end,'full-path'),false);
  assert.ok(cell(coverage,'length-fraction').note.includes('不冒充MoveIt API fraction'));
});

test('triangular, boundary and trapezoidal timings match independent curve areas and peak limits',()=>{
  for(const [distance,expectedTime,expectedPeak,triangular] of [[.2,2/Math.sqrt(5),1/Math.sqrt(5),true],[1,2,1,true],[2,3,1,false]]){
    const p={distance,vmax:1,amax:1},t=view('moveit-timing',p,3),s=t.trace.steps[3].variables,c=t.cells;
    assert.equal(s.triangular,triangular);near(value(c,'duration'),expectedTime);near(value(c,'peak-velocity'),expectedPeak);
    // Independently integrate the triangular acceleration/deceleration and rectangular cruise areas.
    near(.5*expectedPeak*s.rampTime+expectedPeak*s.cruiseTime+.5*expectedPeak*s.rampTime,distance);near(value(c,'area-distance'),distance);assert.ok(expectedPeak<=p.vmax);
    near(value(c,'accel-distance'),expectedPeak*s.rampTime/2);near(value(c,'cruise-distance'),expectedPeak*s.cruiseTime);
  }
});

test('execution threshold and scene gate dominate the selected terminal label; abort remains distinct from no request',()=>{
  const boundary=view('moveit-execution',{startError:.04},3);assert.equal(boundary.trace.steps[1].variables.startCompatible,true);assert.equal(boundary.trace.steps[2].variables.requested,true);assert.equal(value(boundary.cells,'success'),true);
  const stale=view('moveit-execution',{startError:.02,scene:'changed',result:'success'},3);assert.equal(stale.trace.steps[1].variables.startCompatible,true);assert.equal(stale.trace.steps[2].variables.requested,false);assert.equal(value(stale.cells,'success'),false);assert.equal(value(stale.cells,'outcome'),'未提交');
  const abort=view('moveit-execution',{startError:.02,scene:'same',result:'aborted'},3);assert.equal(abort.trace.steps[2].variables.requested,true);assert.equal(value(abort.cells,'success'),false);assert.equal(value(abort.cells,'outcome'),'本例返回中止');
  assert.ok(cell(abort.cells,'success').note.includes('人工选择的教学标签'));
});
