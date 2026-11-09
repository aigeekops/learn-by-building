'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {modelIds,run,catalog,specs}=require('../scripts/check_course_inspectors.cjs');
const P=require('../web/course-inspectors/underactuated.js');
const trace=(id,p={})=>run('underactuated',id,p);
const end=t=>t.steps.at(-1).variables;
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing '+id);return c;};
const close=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

test('all eight actual catalog demos expose all 32 immutable current snapshots',()=>{
  assert.equal(P.courseId,'underactuated');const ids=modelIds('underactuated');assert.equal(catalog('underactuated').lessons.length,8);assert.equal(ids.length,8);assert.deepEqual(Object.keys(P.models).sort(),ids.slice().sort());
  let frames=0;
  for(const lesson of catalog('underactuated').lessons)for(const demo of lesson.demos){
    const t=trace(demo.modelId),saved=JSON.stringify(t);freeze(t);assert.ok(P.models[t.model].intuition.length>20);
    t.steps.forEach((_,i)=>{const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);assert.match(v.summary,/不产生学习完成、用时或真机证据/);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length);assert.notEqual(c.value,undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula));assert.match(c.note,/四位小数/);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}frames++;
    });
    assert.deepEqual(view(t,-10),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,-Infinity),view(t,0));assert.deepEqual(view(t,Infinity),view(t,3));assert.equal(JSON.stringify(t),saved);
  }assert.equal(frames,32);
});

test('11 real before/after control experiments reject identical and corrupted results',()=>{
  const damage={
    'underactuated-actuation':s=>s.acceleration[0]++,
    'underactuated-pendulum':s=>s.energy++,
    'underactuated-linearization':s=>s.linearAcceleration++,
    'underactuated-lqr':s=>s.nextState++,
    'underactuated-lyapunov':s=>s.strictDomain=!s.strictDomain,
    'underactuated-energy':s=>s.energyError++,
    'underactuated-collocation':s=>s.discreteFeasible=!s.discreteFeasible,
    'underactuated-mpc':s=>s.nextCosts[0]++
  };let count=0;
  for(const id of modelIds('underactuated'))for(const e of P.models[id].experiments){
    const keys=new Set(specs('underactuated',id).map(s=>s.id));assert.ok(e.label&&e.prediction&&e.expectation);for(const k of [...Object.keys(e.before),...Object.keys(e.after)])assert.ok(keys.has(k));
    const a=trace(id,e.before),b=trace(id,e.after),saved=JSON.stringify([a,b]);assert.notDeepEqual(a.params,b.params);freeze(a);freeze(b);
    assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false);assert.equal(e.verify(b,b),false);
    const bad=JSON.parse(JSON.stringify(b));damage[id](end(bad));assert.equal(e.verify(a,bad),false,id+'/'+e.id+' accepted corrupt output');assert.equal(JSON.stringify([a,b]),saved);count++;
  }assert.equal(count,11);
});

test('browser registration and all snapshots avoid final result, scenes and future frames',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/underactuated.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.underactuated.courseId,'underactuated');
  for(const id of modelIds('underactuated')){const t=trace(id);t.steps.forEach((_,i)=>{
    const steps=t.steps.map((s,j)=>{const x={title:s.title,variables:s.variables};for(const field of ['scene','visual'])Object.defineProperty(x,field,{get(){throw Error('read presentation');}});return x;});
    const limited={model:t.model,params:t.params,steps:new Proxy(steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('read future');return Reflect.get(target,key);}})};
    for(const field of ['result','scene'])Object.defineProperty(limited,field,{get(){throw Error('read final or scene');}});
    assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
  });}
});

test('coupled dynamics solve both mass rows and keep structural rank at zero input',()=>{
  const t=trace('underactuated-actuation',{torque:-1.5}),s=end(t);
  // Eliminate qdd1 from 2qdd0+qdd1=0 and qdd0+2qdd1=u.
  const first=-t.params.torque/3,second=-2*first;close(cell(view(t,2),'mass-determinant').value,3);close(cell(view(t,2),'acceleration-0').value,first);close(cell(view(t,2),'acceleration-1').value,second);
  close(2*first+second,0);close(first+2*second,t.params.torque);close(cell(view(t,3),'recovered-force-0').value,0);close(cell(view(t,3),'recovered-force-1').value,-1.5);close(cell(view(t,3),'force-residual-0').value,0);close(cell(view(t,3),'force-residual-1').value,0);
  assert.equal(view(t,0).cells.some(c=>c.id==='acceleration-0'),false);assert.equal(view(t,1).cells.some(c=>c.id==='recovered-force-0'),false);
  const zero=trace('underactuated-actuation',{torque:0});assert.equal(cell(view(zero,0),'actuator-rank').value,1);assert.equal(end(zero).underactuated,true);assert.ok(s.acceleration[0]!==0);
});

test('pendulum torque balance, phase derivative and energy use one signed instantaneous state',()=>{
  const t=trace('underactuated-pendulum',{angle:-90,velocity:-.5,torque:1}),s=end(t);
  close(cell(view(t,0),'theta').value,-Math.PI/2);close(cell(view(t,1),'damping-torque').value,-.05);close(cell(view(t,1),'gravity-torque').value,-9.81);close(s.acceleration,10.86);
  close(cell(view(t,2),'state-derivative-0').value,-.5);close(cell(view(t,2),'state-derivative-1').value,10.86);close(cell(view(t,3),'kinetic-energy').value,.125);close(cell(view(t,3),'potential-energy').value,9.81);close(s.energy,9.935);
  assert.equal(view(t,1).cells.some(c=>c.id==='energy'),false);assert.equal(view(t,2).cells.some(c=>c.id==='energy'),false);
  const upper=trace('underactuated-pendulum',{angle:180,velocity:0,torque:0});close(end(upper).energy,19.62);close(end(upper).acceleration,0);
});

test('upright linearization preserves signed local error and states the no-damping limit',()=>{
  for(const delta of [-.4,0,.4]){const t=trace('underactuated-linearization',{deviation:delta,gain:12}),s=end(t);close(cell(view(t,0),'theta').value,Math.PI+delta);close(cell(view(t,1),'nonlinear-gravity').value,9.81*Math.sin(delta));close(cell(view(t,1),'linear-gravity').value,9.81*delta);close(cell(view(t,2),'control').value,-12*delta);close(cell(view(t,3),'linear-acceleration').value,-2.19*delta);close(cell(view(t,3),'approximation-error').value,9.81*(Math.sin(delta)-delta));assert.equal(s.restoring,true);assert.match(cell(view(t,3),'restoring').note,/无阻尼.*不能宣称渐近稳定/);}
  const a=trace('underactuated-linearization',{deviation:.1,gain:0});close(end(a).linearAcceleration,.981);assert.equal(end(a).restoring,false);assert.equal(view(a,2).cells.some(c=>c.id==='approximation-error'),false);
});

function solve(A,b){const m=A.map((r,i)=>[...r,b[i]]),n=b.length;for(let k=0;k<n;k++){let pivot=k;for(let j=k+1;j<n;j++)if(Math.abs(m[j][k])>Math.abs(m[pivot][k]))pivot=j;[m[k],m[pivot]]=[m[pivot],m[k]];const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const x=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=x*m[k][j];}}return m.map(r=>r[n]);}
test('LQR matches an independent three-control batch quadratic minimization',()=>{
  const t=trace('underactuated-lqr',{a:1.1,r:1.5}),a=t.params.a,R=t.params.r;
  // Stack x1,x2,x3 = c+L[u0,u1,u2]; solve (R I+LᵀL)u = -Lᵀc.
  const L=[[1,0,0],[a,1,0],[a*a,a,1]],c=[a,a*a,a*a*a];
  const H=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>L.reduce((z,row)=>z+row[i]*row[j],0)+(i===j?R:0))),rhs=Array.from({length:3},(_,i)=>-L.reduce((z,row,k)=>z+row[i]*c[k],0));
  const u=solve(H,rhs),xs=L.map((row,k)=>c[k]+row.reduce((z,x,j)=>z+x*u[j],0)),cost=1+xs.reduce((z,x)=>z+x*x,0)+R*u.reduce((z,x)=>z+x*x,0);
  close(cell(view(t,2),'gain').value,-u[0]);close(cell(view(t,3),'control').value,u[0]);close(cell(view(t,3),'next-state').value,xs[0]);close(cell(view(t,1),'initial-P').value,cost);assert.deepEqual(end(t).backwards.map(z=>z.k),[2,1,0]);
  for(const row of end(t).backwards){const v=view(t,1);close(cell(v,`riccati-${row.k}-denominator`).value,R+row.Pnext);close(cell(v,`riccati-${row.k}-open`).value-cell(v,`riccati-${row.k}-rebate`).value+1,row.P);}
  assert.equal(cell(view(t,2),'gain-index').value,2);assert.notEqual(end(t).gain,end(t).backwards[0].K);assert.equal(view(t,0).cells.some(c=>c.id==='gain'),false);
});

test('Lyapunov checks 0 and both non-target equilibria, strict region and a point outside selected domain',()=>{
  for(const x of [-1,0,1]){const t=trace('underactuated-lyapunov',{x,limit:1}),s=end(t);close(cell(view(t,1),'value-derivative').value,0);assert.equal(s.atEquilibrium,true);assert.equal(s.atTargetEquilibrium,x===0);assert.equal(s.insideCertifiedRegion,x===0);assert.equal(s.pointDecreasing,false);assert.equal(s.strictDomain,false);}
  const t=trace('underactuated-lyapunov',{x:.5,limit:.5});close(cell(view(t,0),'linear-term').value,-.5);close(cell(view(t,0),'cubic-term').value,.125);close(cell(view(t,1),'value').value,.125);close(cell(view(t,1),'value-derivative').value,-.1875);close(cell(view(t,2),'domain-factor-bound').value,-.75);
  const outside=trace('underactuated-lyapunov',{x:1.5,limit:.5});assert.equal(end(outside).strictDomain,true);assert.equal(end(outside).insideCertifiedRegion,false);close(end(outside).valueDerivative,2.25*(2.25-1));assert.match(cell(view(outside,3),'inside-certified-region').note,/不等于.*用户选择/);
});

test('energy shaping uses clipped signed torque and distinguishes zero-rule output from motion',()=>{
  const t=trace('underactuated-energy',{angle:90,velocity:-1,limit:1}),s=end(t);close(cell(view(t,0),'kinetic-energy').value,.5);close(cell(view(t,0),'potential-energy').value,9.81);close(s.rawTorque,-4.655);close(cell(view(t,2),'torque').value,-1);close(cell(view(t,3),'energy-rate').value,1);close(s.energyError,9.31);
  const above=trace('underactuated-energy',{angle:180,velocity:2,limit:3});close(end(above).energy,21.62);close(end(above).energyError,-2);close(end(above).rawTorque,-2);close(end(above).torque,-2);close(end(above).energyRate,-4);
  const zero=trace('underactuated-energy',{angle:90,velocity:0,limit:2});assert.equal(end(zero).stalled,true);close(end(zero).torque,0);close(end(zero).energyRate,0);assert.match(cell(view(zero,3),'stalled').note,/非平衡姿态仍可能因重力自行加速/);assert.equal(view(t,1).cells.some(c=>c.id==='torque'),false);
});

test('collocation independently integrates constant input and rejects cancellation of defects',()=>{
  const t=trace('underactuated-collocation',{middle:.7,control:1}),s=end(t),v=view(t,1);
  // Exact continuous solution x(t)=u*t from x(0)=0 at both nonzero nodes.
  const exactMid=.5*t.params.control,exactEnd=t.params.control;close(cell(v,'integrated-control-0').value,exactMid);close(cell(v,'integrated-control-1').value,exactEnd-exactMid);close(cell(v,'defect-0').value,.7-exactMid);close(cell(v,'defect-1').value,(1-.7)-(exactEnd-exactMid));close(s.defects[0]+s.defects[1],0);close(cell(view(t,3),'max-defect').value,.2);assert.equal(s.discreteFeasible,false);close(cell(view(t,2),'cost').value,1);
  close(cell(view(t,3),'boundary-start').value,0);close(cell(view(t,3),'boundary-end').value,0);assert.equal(view(t,2).cells.some(c=>c.id==='discrete-feasible'),false);
  const valid=trace('underactuated-collocation',{middle:.5,control:1});assert.equal(end(valid).discreteFeasible,true);close(end(valid).maxDefect,0);
});

test('MPC separates current prediction from disturbed measurement and recomputes every candidate cost',()=>{
  const t=trace('underactuated-mpc',{state:-1,disturbance:.5}),s=end(t);assert.deepEqual(s.costs,[4.1,1,.1]);assert.equal(s.action,1);close(s.predicted,0);close(s.measured,.5);close(s.predictionError,.5);
  const a=view(t,1),b=view(t,3);[-1,0,1].forEach((u,j)=>{close(cell(a,`predicted-candidate-${j}`).value,-1+u);close(cell(a,`state-cost-${j}`).value,(-1+u)**2);close(cell(a,`input-cost-${j}`).value,.1*u*u);close(cell(a,`cost-${j}`).value,(-1+u)**2+.1*u*u);close(cell(b,`replanned-state-${j}`).value,.5+u);close(cell(b,`next-cost-${j}`).value,(.5+u)**2+.1*u*u);});
  assert.deepEqual(s.nextCosts,[.35,.25,2.35]);assert.equal(cell(view(t,2),'best-index').value,2);assert.equal(view(t,1).cells.some(c=>c.id==='measured'),false);assert.equal(view(t,2).cells.some(c=>c.id==='next-cost-0'),false);assert.match(cell(b,'next-cost-0').note,/没有选择或执行下一轮动作/);
});
