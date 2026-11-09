const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/manipulation.js');
const {modelIds,run,catalog,specs}=require('../scripts/check_course_inspectors.cjs');
const ids=modelIds('manipulation');
const near=(a,b,tol=1e-10)=>assert.ok(typeof a==='number'&&Math.abs(a-b)<tol,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function view(id,p,index){const trace=run('manipulation',id,p);return {trace,cells:P.models[id].inspect(trace,index).cells};}
function cell(cells,id){const c=cells.find(c=>c.id===id);assert.ok(c,'missing '+id);return c;}
const value=(cells,id)=>cell(cells,id).value;

test('eight actual lessons cover their 32 default frames immutably; ten real-control experiments reject unchanged and reversed pairs',()=>{
  assert.equal(P.courseId,'manipulation');assert.equal(catalog('manipulation').lessons.length,8);assert.equal(ids.length,8);assert.deepEqual(Object.keys(P.models).sort(),ids.slice().sort());
  let frames=0,experiments=0;
  for(const id of ids){const m=P.models[id],t=run('manipulation',id),before=JSON.stringify(t);freeze(t);assert.ok(m.intuition.length>20);
    t.steps.forEach((step,i)=>{const r=m.inspect(t,i);assert.equal(r.title,step.title);assert.ok(r.summary);assert.ok(r.cells.length);assert.equal(new Set(r.cells.map(c=>c.id)).size,r.cells.length);for(const c of r.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN/.test(c.formula));assert.ok(c.note.includes('单位：'));if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}frames++;});
    assert.equal(JSON.stringify(t),before);assert.deepEqual(m.inspect(t,-4),m.inspect(t,0));assert.deepEqual(m.inspect(t,Infinity),m.inspect(t,3));assert.deepEqual(m.inspect(t,NaN),m.inspect(t,0));
    const allowed=new Set(specs('manipulation',id).map(s=>s.id));
    for(const e of m.experiments){for(const key of [...Object.keys(e.before),...Object.keys(e.after)])assert.ok(allowed.has(key));const a=run('manipulation',id,e.before),b=run('manipulation',id,e.after);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' unchanged after');assert.equal(e.verify(b,a),false,id+'/'+e.id+' reversed');experiments++;}
  }
  assert.equal(frames,32);assert.equal(experiments,10);
});

test('browser registration is self-contained; no inspector reads result, scenes, or future frames',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/manipulation.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.manipulation.courseId,'manipulation');
  for(const id of ids){const t=run('manipulation',id);for(let i=0;i<t.steps.length;i++){
    const steps=t.steps.map(s=>{const f={...s};Object.defineProperty(f,'scene',{get(){throw Error('scene may contain future data');}});Object.defineProperty(f,'visual',{get(){throw Error('visual is not a calculation source');}});return f;});
    const limited={model:t.model,params:t.params,steps:new Proxy(steps,{get(a,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame');return Reflect.get(a,key);}})};Object.defineProperty(limited,'result',{get(){throw Error('final result');}});assert.doesNotThrow(()=>P.models[id].inspect(limited,i),`${id} stage ${i}`);
  }}
});

test('camera rotation matrix and each transformed coordinate match independent geometric checks',()=>{
  const p={angle:30,tx:1.5},rot=view('manipulation-frames',p,1).cells,world=view('manipulation-frames',p,2).cells,end=view('manipulation-frames',p,3).cells;
  near(value(rot,'rotation-0-0'),Math.sqrt(3)/2);near(value(rot,'rotation-0-1'),-.5);near(value(rot,'rotation-1-0'),.5);near(value(rot,'rotation-1-1'),Math.sqrt(3)/2);
  near(value(world,'world-point-0'),1.5+Math.sqrt(3)/2);near(value(world,'world-point-1'),1.5);near(value(end,'recovered-0'),1);near(value(end,'recovered-1'),0);near(value(end,'inverse-error'),0);
  for(let r=0;r<2;r++)for(let k=0;k<2;k++){let dot=0;for(let j=0;j<2;j++)dot+=value(rot,`rotation-${j}-${r}`)*value(rot,`rotation-${j}-${k}`);near(dot,r===k?1:0);}
});

test('IK preserves distinct elbow branches, boundary straightening, and unknown unreachable coordinates',()=>{
  for(const [elbow,q1,q2,ex,ey] of [['up',0,Math.PI/2,1,0],['down',Math.PI/2,-Math.PI/2,0,1]]){const p={x:1,y:1,elbow},q=view('manipulation-ik',p,2),fk=view('manipulation-ik',p,3);near(value(q.cells,'q1'),q1);near(q.trace.steps[1].variables.q2,q2);near(value(fk.cells,'elbow-0'),ex);near(value(fk.cells,'elbow-1'),ey);near(value(fk.cells,'end-0'),1);near(value(fk.cells,'end-1'),1);near(value(fk.cells,'fk-error'),0);}
  const boundary=view('manipulation-ik',{x:2,y:0},3);near(boundary.trace.steps[1].variables.q2,0);near(value(boundary.cells,'end-0'),2);
  const unreachable=view('manipulation-ik',{x:2,y:1},3);assert.equal(value(unreachable.cells,'unknown-end'),null);assert.equal(value(unreachable.cells,'unknown-elbow'),null);assert.equal(unreachable.trace.steps[2].variables.q1,null);assert.equal(unreachable.trace.steps[1].variables.q2,null);
});

test('known correspondences expose each displacement and residual, with independent loss comparisons',()=>{
  const p={offset:-.5,outlier:3},difference=view('manipulation-perception',p,1).cells,fit=view('manipulation-perception',p,2).cells,end=view('manipulation-perception',p,3).cells;
  assert.deepEqual(difference.map(c=>c.value),[-.5,-.5,2.5]);near(value(fit,'least-squares'),.5);near(value(fit,'robust'),-.5);
  for(let j=0;j<3;j++){near(value(end,`ls-residual-${j}`),[-1,-1,2][j]);near(value(end,`robust-residual-${j}`),[0,0,3][j]);}
  near(value(end,'ls-sse'),6);near(value(end,'robust-l1'),3);
  const deltas=[-.5,-.5,2.5],sse=x=>deltas.reduce((z,d)=>z+(d-x)**2,0),l1=x=>deltas.reduce((z,d)=>z+Math.abs(d-x),0);assert.ok(sse(.5)<sse(-.5));assert.ok(l1(-.5)<l1(.5));near(deltas.reduce((z,d)=>z+.5-d,0),0);
});

test('two-finger statics distinguishes normal-force demand from friction capacity across the slip threshold',()=>{
  const p={mu:.5,normal:5,mass:.4},c=view('manipulation-contact',p,3).cells;near(value(c,'required-normal'),3.924);assert.equal(value(c,'feasible'),true);
  const below=view('manipulation-contact',{mu:.1,normal:4,mass:.1},3),above=view('manipulation-contact',{mu:.1,normal:5,mass:.1},3);near(value(below.cells,'required-normal'),4.905);near(value(above.cells,'required-normal'),4.905);assert.equal(value(below.cells,'feasible'),false);assert.equal(value(above.cells,'feasible'),true);
  const insufficient=view('manipulation-contact',{mu:.1,normal:1,mass:1},2).cells;near(value(insufficient,'capacity'),.2);near(value(insufficient,'margin'),-9.61);
});

test('path cells project to segment interiors, sum actual segment lengths, and reject boundary touching',()=>{
  const distance=view('manipulation-path',{},1).cells;near(value(distance,'projection-0-0'),.5);near(value(distance,'closest-0-0-0'),1);near(value(distance,'closest-0-0-1'),0);near(value(distance,'path-distance-0'),0);near(value(distance,'path-distance-1'),1);
  // Direct-path endpoints are both 1m from the center, but its interior passes through the center.
  near(Math.hypot(0-1,0),1);near(Math.hypot(2-1,0),1);assert.equal(value(view('manipulation-path',{},2).cells,'valid-0'),false);
  const check=view('manipulation-path',{},2).cells;near(value(check,'length-0'),2);near(value(check,'length-1'),4);assert.equal(value(check,'valid-1'),true);
  const touching=view('manipulation-path',{radius:.8,clearance:.2},3);assert.equal(touching.trace.steps[2].variables.valid[1],false);assert.equal(value(touching.cells,'selected'),null);
});

test('cubic time scaling derivatives match finite differences in seconds and keep nonzero endpoint acceleration',()=>{
  const duration=3,sigma=.3,t=duration*sigma,h=1e-4,q=time=>3*(time/duration)**2-2*(time/duration)**3,p={duration,position:sigma},c=view('manipulation-trajectory',p,2).cells;
  near(value(c,'velocity'),(q(t+h)-q(t-h))/(2*h),1e-8);near(value(c,'acceleration'),(q(t+h)-2*q(t)+q(t-h))/(h*h),1e-7);
  const start=view('manipulation-trajectory',{duration:2,position:0},2).cells,end=view('manipulation-trajectory',{duration:2,position:1},2).cells;near(value(start,'velocity'),0);near(value(end,'velocity'),0);near(value(start,'acceleration'),1.5);near(value(end,'acceleration'),-1.5);assert.ok(cell(c,'velocity').note.includes('s⁻¹'));
});

test('feedback uses velocity for damping and old velocity for explicit Euler position',()=>{
  const p={stiffness:4,damping:2,velocity:.5},forces=view('manipulation-control',p,1).cells,accel=view('manipulation-control',p,2).cells,next=view('manipulation-control',p,3).cells;
  near(value(forces,'elastic'),2);near(value(forces,'damping-force'),-1);near(value(accel,'force'),1);near(value(accel,'acceleration'),1);near(value(next,'next-position'),.55);near(value(next,'next-velocity'),.6);assert.ok(Math.abs(value(next,'next-position')-(.5+.1*.6))>.001);
  const damped=view('manipulation-control',{stiffness:1,damping:5,velocity:1},2).cells;near(value(damped,'force'),-4.5);near(value(damped,'acceleration'),-4.5);
});

test('task-state cells preserve unknown confirmation and all four sensor-input branches',()=>{
  assert.equal(value(view('manipulation-task',{},0).cells,'held'),null);
  for(const grasp of ['ok','fail'])for(const place of ['clear','blocked']){const v=view('manipulation-task',{grasp,place},2),states=value(v.cells,'place-transition'),release=value(v.cells,'release-gate'),result=view('manipulation-task',{grasp,place},3).cells;assert.equal(release,grasp==='ok'&&place==='clear');assert.equal(states.includes('transport'),grasp==='ok');assert.equal(states.includes('release'),release);assert.equal(states.at(-1),grasp==='fail'?'stop':place==='blocked'?'wait':'release');assert.equal(value(result,'success'),release);assert.equal(value(result,'reason'),grasp==='fail'?'抓取确认失败':place==='blocked'?'放置区域阻塞':'完成本例流程');}
});
