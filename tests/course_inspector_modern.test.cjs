const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/modern.js');
const M=require('../web/robotics-foundations-kinematics.js');
const catalog=require('../config/robotics_foundations_kinematics.json');
const ids=catalog.lessons.map(l=>l.modelId);
function run(id,params={}){const model=M[id],p=Object.fromEntries(model.controls.map(c=>[c.key,params[c.key]??c.value]));return {...model.run(p),model:id,params:p};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const inspect=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(t,i,id)=>{const c=inspect(t,i).cells.find(c=>c.id===id);assert.ok(c,'missing '+t.model+'/'+id);return c;};
const values=(t,i,prefix)=>inspect(t,i).cells.filter(c=>c.id.startsWith(prefix+'-')&&/^\d+(?:-\d+)?$/.test(c.id.slice(prefix.length+1))).map(c=>c.value);
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const nearVector=(a,b,tol=1e-9)=>{assert.equal(a.length,b.length);a.forEach((x,i)=>near(x,b[i],tol));};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),mv=(A,v)=>A.map(row=>dot(row,v));
const transpose=A=>A[0].map((_,j)=>A.map(row=>row[j]));

test('modern covers all seven actual lessons, frozen default frames and nine concrete parameter experiments',()=>{
  assert.equal(P.courseId,'modern');assert.equal(ids.length,7);assert.deepEqual(Object.keys(P.models).sort(),[...ids].sort());let experiments=0;
  for(const id of ids){const t=run(id),snapshot=JSON.stringify(t),model=P.models[id];freeze(t);assert.ok(model.intuition.length>20);
    t.frames.forEach((_,i)=>{const v=inspect(t,i);assert.ok(v.title&&v.summary&&v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,id+'/'+c.id);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.doesNotMatch(c.formula,/NaN|undefined/);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });assert.deepEqual(inspect(t,-1),inspect(t,0));assert.deepEqual(inspect(t,Infinity),inspect(t,t.frames.length-1));assert.equal(JSON.stringify(t),snapshot);
    for(const e of model.experiments){const a=run(id,e.before),b=run(id,e.after),before=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.ok(e.label&&e.prediction&&e.expectation);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepted unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepted unchanged after');assert.equal(JSON.stringify([a,b]),before);experiments++;}
  }assert.equal(experiments,9);
});

test('browser registration has no dependencies; no inspect reads future vars, scenes or final result',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/modern.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.modern.courseId,'modern');
  for(const id of ids){const cases=[{},...(id==='rf-inverse-kinematics'?[{x:3,y:0},{x:0,y:0},{l1:2,l2:1,x:1,y:0}]:[]),...(id==='rf-joint-trajectory'?[{quintic:0}]:[])];
    for(const params of cases){const t=run(id,params);
      for(let i=0;i<t.frames.length;i++){const frames=t.frames.map(f=>{const current={...f};Object.defineProperty(current,'scene',{get(){throw Error('scene may contain future geometry');}});return current;});const limited={...t,frames:new Proxy(frames,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame');return Reflect.get(target,key);}})};Object.defineProperty(limited,'result',{get(){throw Error('future result');}});assert.doesNotThrow(()=>inspect(limited,i),id+'/'+i);}
    }
  }
});

test('planar transform exposes all homogeneous cells, correct order and inverse row products',()=>{
  const t=run('rf-transform',{x:0,y:2,angle:90,tx:1,ty:-1});
  const H=[[0,-1,1],[1,0,-1],[0,0,1]],point=[0,2,1],expected=mv(H,point);
  nearVector(values(t,2,'homogeneous'),H.flat());nearVector(values(t,1,'rotated'),[-2,0]);nearVector(values(t,2,'world'),expected.slice(0,2));
  nearVector(values(t,3,'centered'),[-2,0]);nearVector(values(t,3,'recovered'),point.slice(0,2));near(cell(t,3,'inverse-error').value,0);
  nearVector(values(t,4,'wrong-input'),[1,1]);nearVector(values(t,4,'wrong-order'),[-1,1]);near(cell(t,4,'order-error').value,2);
  assert.ok(cell(t,2,'homogeneous-0-2').note.includes('m'));assert.ok(cell(t,2,'homogeneous-2-2').note.includes('无量纲'));
  assert.equal(inspect(t,0).cells.some(c=>c.id.startsWith('world-')),false);
  const rounded=cell(run('rf-transform',{angle:25}),1,'rotation-0-0');near(rounded.value,Math.cos(25*Math.PI/180));assert.ok(rounded.formula.includes('0.9063'));assert.notEqual(rounded.value,.9063);
});

test('FK relative angles and all four Jacobian cells agree with independent central differences per radian',()=>{
  const p={l1:1.3,l2:.7,theta1:20,theta2:75},t=run('rf-forward-kinematics',p),h=1e-6,degreeStep=h*180/Math.PI;
  const tip=params=>{const a=params.theta1*Math.PI/180,b=(params.theta1+params.theta2)*Math.PI/180;return [params.l1*Math.cos(a)+params.l2*Math.cos(b),params.l1*Math.sin(a)+params.l2*Math.sin(b)];};
  const J=[[],[]];for(let j=0;j<2;j++){const key=j?'theta2':'theta1',plus=tip({...p,[key]:p[key]+degreeStep}),minus=tip({...p,[key]:p[key]-degreeStep});for(let r=0;r<2;r++){J[r][j]=(plus[r]-minus[r])/(2*h);near(cell(t,4,`jacobian-${r}-${j}`).value,J[r][j],1e-7);assert.ok(cell(t,4,`jacobian-${r}-${j}`).note.includes('m/rad'));}}
  nearVector(values(t,3,'tip'),tip(p));near(cell(t,4,'determinant').value,J[0][0]*J[1][1]-J[0][1]*J[1][0],1e-7);
  const relative=run('rf-forward-kinematics',{l1:1,l2:.5,theta1:90,theta2:-90});nearVector(values(relative,1,'elbow'),[0,1]);nearVector(values(relative,2,'second'),[.5,0]);nearVector(values(relative,3,'tip'),[.5,1]);assert.equal(cell(relative,4,'singular').value,false);
  const straight=run('rf-forward-kinematics',{theta2:0});assert.equal(cell(straight,4,'singular').value,true);assert.ok(Number.isFinite(cell(straight,3,'tip-0').value));
});

test('IK branch angles reconstruct their target; unreachable, boundary and infinite cases keep their real status',()=>{
  for(const [branch,angles] of [[0,[30,120]],[1,[150,-120]]]){const t=run('rf-inverse-kinematics',{x:0,y:1,branch});near(cell(t,2,'theta1').value,angles[0]*Math.PI/180);near(cell(t,2,'theta2').value,angles[1]*Math.PI/180);nearVector(values(t,3,'reconstructed'),[0,1]);near(cell(t,3,'residual').value,0);assert.equal(cell(t,2,'count').value,2);}
  for(const p of [{x:3,y:0},{l1:2,l2:.5,x:.5,y:0}]){const t=run('rf-inverse-kinematics',p);assert.equal(cell(t,0,'reachable').value,false);assert.equal(cell(t,1,'acos-allowed').value,false);assert.equal(cell(t,2,'count').value,0);assert.equal(cell(t,2,'unknown-angles').value,null);assert.equal(cell(t,3,'unknown-tip').value,null);assert.equal(cell(t,3,'unknown-residual').value,null);assert.equal(cell(t,4,'singular').value,null);assert.equal(cell(t,4,'determinant').value,null);}
  for(const p of [{x:2,y:0},{l1:2,l2:1,x:1,y:0}]){const t=run('rf-inverse-kinematics',p);assert.equal(cell(t,0,'reachable').value,true);assert.equal(cell(t,2,'count').value,1);assert.equal(cell(t,4,'singular').value,true);near(cell(t,3,'residual').value,0);}
  const origin=run('rf-inverse-kinematics',{x:0,y:0,branch:1});assert.equal(cell(origin,2,'count').value,'无穷多');near(cell(origin,2,'theta1').value,0);near(cell(origin,2,'theta2').value,Math.PI);assert.equal(cell(origin,4,'infinite').value,true);assert.ok(cell(origin,2,'theta1').note.includes('代表'));
  for(const angle of [-1,0,.7,2]){const independent=[Math.cos(angle)+Math.cos(angle+Math.PI),Math.sin(angle)+Math.sin(angle+Math.PI)];nearVector(independent,[0,0]);}
});

test('SO3 sequential row products and all composed/orthogonality matrix entries agree',()=>{
  const t=run('rf-rotation3d',{roll:30,pitch:-45,yaw:60}),rad=x=>x*Math.PI/180,a=rad(30),b=rad(-45),c=rad(60),Rx=[[1,0,0],[0,Math.cos(a),-Math.sin(a)],[0,Math.sin(a),Math.cos(a)]],Ry=[[Math.cos(b),0,Math.sin(b)],[0,1,0],[-Math.sin(b),0,Math.cos(b)]],Rz=[[Math.cos(c),-Math.sin(c),0],[Math.sin(c),Math.cos(c),0],[0,0,1]];
  nearVector(values(t,0,'Rx'),Rx.flat());nearVector(values(t,0,'Ry'),Ry.flat());nearVector(values(t,0,'Rz'),Rz.flat());
  const afterX=mv(Rx,[1,2,1]),afterY=mv(Ry,afterX),out=mv(Rz,afterY);nearVector(values(t,1,'after-x'),afterX);nearVector(values(t,2,'after-y'),afterY);nearVector(values(t,3,'output'),out);nearVector(values(t,3,'sequential'),out);
  // Transform each basis vector independently to obtain the columns, rather than reusing model matrix multiplication.
  const columns=[[1,0,0],[0,1,0],[0,0,1]].map(e=>mv(Rz,mv(Ry,mv(Rx,e)))),R=transpose(columns);nearVector(values(t,3,'rotation'),R.flat());nearVector(values(t,4,'orthogonal'),[1,0,0,0,1,0,0,0,1]);nearVector(values(t,4,'restored'),[1,2,1]);near(cell(t,4,'input-norm').value,Math.sqrt(6));near(cell(t,4,'output-norm').value,Math.sqrt(6));near(cell(t,4,'determinant').value,1);
  assert.ok(inspect(t,0).cells.every(c=>!c.id.startsWith('output-')));
});

test('SE3 chain multiplies all 16 entries and rotates camera offset before world translation',()=>{
  const t=run('rf-se3-chain',{yaw:90,tx:1,ty:-1,tz:.5}),A=[[0,-1,0,1],[1,0,0,-1],[0,0,1,.5],[0,0,0,1]],B=[[1,0,0,.2],[0,1,0,0],[0,0,1,.5],[0,0,0,1]];
  nearVector(values(t,0,'T_WB'),A.flat());nearVector(values(t,0,'T_BC'),B.flat());nearVector(values(t,1,'body'),[1.2,0,.5]);nearVector(values(t,2,'rotated'),[0,1.2,.5]);nearVector(values(t,3,'world'),[1,.2,1]);nearVector(values(t,3,'camera-world'),[1,-.8,1]);
  const chain=values(t,3,'chain');assert.equal(chain.length,16);for(let r=0;r<4;r++)for(let j=0;j<4;j++)near(chain[4*r+j],dot(A[r],B.map(row=>row[j])));
  nearVector(values(t,4,'centered'),[0,1.2,.5]);nearVector(values(t,4,'inverse-rotation'),[1.2,0,.5]);nearVector(values(t,4,'restored'),[1,0,0]);near(cell(t,4,'inverse-error').value,0);near(cell(t,4,'order-error').value,Math.sqrt(.08));
  assert.ok(cell(t,3,'chain-0-3').note.includes('m'));assert.ok(cell(t,3,'chain-3-3').note.includes('无量纲'));
});

test('two-link inertia agrees with kinetic energy; G matches potential gradient and inverse solve restores acceleration',()=>{
  const p={q1:30,q2:45,acceleration:-1.5,velocity:.7},t=run('rf-arm-dynamics',p),a=p.q1*Math.PI/180,b=p.q2*Math.PI/180,h=1e-6;
  // Kinetic energy from independently differentiated centres of mass plus each rod rotation.
  const energy=(d1,d2)=>{const first=[-.5*Math.sin(a)*d1,.5*Math.cos(a)*d1],second=[-Math.sin(a)*d1-.5*Math.sin(a+b)*(d1+d2),Math.cos(a)*d1+.5*Math.cos(a+b)*(d1+d2)];return .5*dot(first,first)+.5*dot(second,second)+(d1*d1+(d1+d2)**2)/24;};
  const M00=2*energy(1,0),M11=2*energy(0,1),M01=energy(1,1)-energy(1,0)-energy(0,1);nearVector(values(t,1,'mass'),[M00,M01,M01,M11]);near(cell(t,1,'mass-det').value,M00*M11-M01*M01);assert.equal(cell(t,1,'positive-definite').value,true);
  const potential=(q1,q2)=>9.81*(1.5*Math.sin(q1)+.5*Math.sin(q1+q2)),G=[(potential(a+h,b)-potential(a-h,b))/(2*h),(potential(a,b+h)-potential(a,b-h))/(2*h)];nearVector(values(t,3,'gravity'),G,1e-7);
  const inertial=[M00*p.acceleration,M01*p.acceleration],C=[-1.5*Math.sin(b)*p.velocity**2,.5*Math.sin(b)*p.velocity**2];nearVector(values(t,4,'inertial'),inertial);nearVector(values(t,2,'velocity-torque'),C);nearVector(values(t,4,'torque'),inertial.map((x,j)=>x+C[j]+G[j]),1e-7);nearVector(values(t,5,'recovered'),[p.acceleration,0]);near(cell(t,5,'kinetic').value,energy(p.velocity,p.velocity));
  assert.equal(inspect(t,1).cells.some(c=>c.id.startsWith('torque-')),false);
});

test('trajectory samples retain actual time; analytic derivatives agree with finite differences and endpoints',()=>{
  for(const quintic of [0,1]){const p={duration:3,target:120,quintic},t=run('rf-joint-trajectory',p),q=time=>{const u=time/p.duration;return p.target*(quintic?u*u*u*(10+u*(-15+6*u)):u*u*(3-2*u));},step=1e-4;
    assert.equal(t.frames.length,14);
    for(let i=0;i<=12;i++){const time=i*p.duration/12;near(cell(t,i,'sample-time').value,time);near(cell(t,i,'normalized-time').value,i/12);near(cell(t,i,'position').value,q(time));
      if(i>0){near(cell(t,i,'time-delta').value,p.duration/12);near(cell(t,i,'position-delta').value,q(time)-q(time-p.duration/12));}
      if(i>0&&i<12){near(cell(t,i,'velocity').value,(q(time+step)-q(time-step))/(2*step),2e-6);near(cell(t,i,'acceleration').value,(q(time+step)-2*q(time)+q(time-step))/(step*step),2e-5);}
      assert.equal(inspect(t,i).cells.some(c=>c.id.startsWith('peak-')),false);
    }
    near(cell(t,0,'velocity').value,0);near(cell(t,12,'velocity').value,0);near(cell(t,0,'acceleration').value,quintic?0:80);near(cell(t,12,'acceleration').value,quintic?0:-80);near(cell(t,13,'peak-velocity').value,quintic?75:60);near(cell(t,13,'peak-acceleration').value,quintic?1200/(9*Math.sqrt(3)):80);
    if(quintic){const u=(3-Math.sqrt(3))/6,time=3*u,analytic=120*(60*u-180*u*u+120*u*u*u)/9;near(cell(t,13,'peak-acceleration').value,analytic);assert.ok(t.result.samples.every(s=>Math.abs(s.acceleration)<analytic));assert.ok(time>0&&time<3);}
  }
});

test('static geometry and dynamics inspections add no movement or time samples',()=>{
  const frameCounts={'rf-transform':5,'rf-forward-kinematics':5,'rf-inverse-kinematics':5,'rf-rotation3d':5,'rf-se3-chain':5,'rf-arm-dynamics':6};
  for(const [id,count] of Object.entries(frameCounts)){const t=run(id);assert.equal(t.frames.length,count);for(let i=0;i<count;i++)assert.ok(inspect(t,i).summary.includes('静态'));assert.equal(t.frames.length,count);}
});
