const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/pid.js');
const M=require('../web/robotics-foundations-control.js');
const catalog=require('../config/robotics_foundations_control.json');
const ids=catalog.lessons.map(x=>x.modelId);
const near=(a,b,tolerance=1e-9)=>assert.ok(typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function run(id,changes={}){const params=Object.fromEntries(M[id].controls.map(c=>[c.key,changes[c.key]??c.value]));return {...M[id].run(params),model:id,params};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(x=>x.id===id);assert.ok(c,'missing cell '+id);return c;};
const final=t=>view(t,t.frames.length-1);

test('PID covers six actual lessons and immutable default frames; ten real experiments reject unchanged runs',()=>{
  assert.equal(P.courseId,'pid');assert.equal(ids.length,6);assert.deepEqual(Object.keys(P.models).sort(),[...ids].sort());let frames=0,experiments=0;
  for(const id of ids){const provider=P.models[id],t=run(id),snapshot=JSON.stringify(t);freeze(t);assert.ok(provider.intuition.length>15);
    for(let i=0;i<t.frames.length;i++){const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length,id+'/'+i);assert.equal(new Set(v.cells.map(x=>x.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,id+'/'+c.id);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}frames++;
    }
    assert.deepEqual(view(t,-1),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,Infinity),final(t));assert.equal(JSON.stringify(t),snapshot,id+' mutated trace');
    for(const e of provider.experiments){const a=run(id,e.before),b=run(id,e.after),saved=JSON.stringify([a,b]);freeze(a);freeze(b);assert.ok(e.label&&e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepted unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepted unchanged after');assert.equal(JSON.stringify([a,b]),saved);experiments++;}
  }
  assert.equal(frames,141);assert.equal(experiments,10);
});

test('standalone browser registration and every frame refuse future vars, scene and full result reads',()=>{
  const context={};vm.runInNewContext(fs.readFileSync(require.resolve('../web/course-inspectors/pid.js'),'utf8'),context);assert.equal(context.CourseInspectorProviders.pid.courseId,'pid');
  for(const id of ids){const t=run(id);for(let i=0;i<t.frames.length;i++){
    const frames=t.frames.map((f,j)=>{const safe={title:f.title,text:f.text,code:f.code};Object.defineProperty(safe,'vars',{get(){assert.ok(j<=i,id+' read future vars at '+j+' from '+i);return f.vars;}});Object.defineProperty(safe,'scene',{get(){throw Error(id+' read scene');}});return safe;});
    const guarded={model:t.model,params:t.params,frames};Object.defineProperty(guarded,'result',{get(){throw Error(id+' read complete result');}});
    assert.deepEqual(view(guarded,i),view(t,i),id+'/'+i);
  }}
});

test('P feedback cells agree with the closed-form discrete response and distinguish finite horizon from steady state',()=>{
  const t=run('rf-p-feedback',{target:2,kp:3,dt:.1}),steady=1.5,a=.6;
  near(cell(view(t,0),'recurrence-factor').value,a);assert.equal(view(t,0).cells.some(c=>c.id==='new-speed'),false);
  near(cell(view(t,1),'error').value,2);near(cell(view(t,1),'p-command').value,6);assert.equal(view(t,1).cells.some(c=>c.id==='new-speed'),false);
  for(let k=1;k<=16;k++){const v=view(t,k+1),before=steady*(1-a**(k-1)),after=steady*(1-a**k);near(cell(v,'error').value,2-before);near(cell(v,'p-command').value,3*(2-before));near(cell(v,'new-speed').value,after);near(cell(v,'sample-time').value,k*.1);near(cell(v,'speed-increment').value,after-before);}
  const v=final(t);near(cell(v,'steady-speed').value,1.5);near(cell(v,'steady-error').value,.5);near(cell(v,'finite-speed').value,1.5*(1-.6**16));near(cell(v,'finite-gap').value,1.5*.6**16);assert.ok(cell(v,'finite-gap').value>0);
  const zero=run('rf-p-feedback',{kp:0});near(cell(final(zero),'steady-speed').value,0);near(cell(final(zero),'finite-speed').value,0);near(cell(final(zero),'steady-error').value,1);
});

test('discrete PID exposes only the current atomic phase, preserves integral memory and uses negative measurement derivative',()=>{
  const t=run('rf-discrete-pid',{kp:2,ki:.5,kd:.1,dt:.2}),measurements=[0,.2,.5,.7,.65,.8];let integral=0;
  assert.deepEqual(view(t,0).cells.filter(c=>c.id.startsWith('input-')).map(c=>c.value),measurements);
  for(let k=0;k<6;k++){const error=1-measurements[k],old=integral;integral+=error*.2;const derivative=k===0?0:-(measurements[k]-measurements[k-1])/.2;
    const e=view(t,1+4*k),i=view(t,2+4*k),d=view(t,3+4*k),sum=view(t,4+4*k);assert.deepEqual(e.cells.map(c=>c.id),['error']);near(cell(e,'error').value,error);
    near(cell(i,'area-increment').value,.2*error);near(cell(i,'integral-state').value,old+.2*error);near(cell(i,'i-term').value,.5*integral);assert.equal(i.cells.some(c=>c.id==='command'),false);
    near(cell(d,'measurement-derivative').value,derivative);near(cell(d,'d-term').value,.1*derivative);assert.equal(d.cells.some(c=>c.id==='command'),false);
    near(cell(sum,'p-term').value,2*error);near(cell(sum,'i-term').value,.5*integral);near(cell(sum,'d-term').value,.1*derivative);near(cell(sum,'command').value,2*error+.5*integral+.1*derivative);
  }
  near(cell(view(t,12),'command').value,1.08);near(cell(view(t,19),'measurement-derivative').value,.25);near(cell(view(t,20),'command').value,1.02);assert.match(cell(view(t,3),'measurement-derivative').formula,/没有前一采样区间/);
});

test('anti-windup separates candidate, acceptance, actuator clipping and object update using numeric option indices',()=>{
  const naive=run('rf-anti-windup',{anti:0}),guarded=run('rf-anti-windup',{anti:1});assert.equal(cell(view(naive,0),'selected-mode').value,0);assert.equal(cell(view(guarded,0),'selected-mode').value,1);
  for(const t of [naive,guarded]){const preview=view(t,1),first=view(t,2);near(cell(preview,'candidate-integral').value,.5);near(cell(preview,'candidate-raw').value,2.4);assert.equal(preview.cells.some(c=>c.id==='new-output'),false);assert.equal(preview.cells.some(c=>c.id==='limited-command'),false);
    near(cell(first,'error').value,2);near(cell(first,'limited-command').value,1);near(cell(first,'new-output').value,.25);assert.equal(cell(first,'positive-block').value,true);assert.equal(cell(first,'negative-block').value,false);
  }
  const n=view(naive,2),g=view(guarded,2);assert.equal(cell(n,'blocked').value,false);assert.equal(cell(g,'blocked').value,true);near(cell(n,'accepted-integral').value,.5);near(cell(g,'accepted-integral').value,0);near(cell(n,'raw-command').value,2.4);near(cell(g,'raw-command').value,2);
  near(cell(view(naive,3),'candidate-integral').value,.9375);near(cell(view(naive,3),'new-output').value,.4375);
});

test('anti-windup switch state matches geometric-series accumulation and permits negative unwinding error',()=>{
  const n=run('rf-anti-windup',{anti:0}),g=run('rf-anti-windup',{anti:1}),before=1-.75**8,error=.3-before,stored=2+before,ng=view(n,10),gg=view(g,10);
  near(cell(ng,'error').value,error);near(cell(gg,'error').value,error);assert.equal(cell(gg,'blocked').value,false);near(cell(gg,'accepted-integral').value,error*.25);near(cell(gg,'limited-command').value,1.2*error);near(cell(ng,'limited-command').value,1);
  near(cell(final(n),'naive-switch-integral').value,stored);near(cell(final(g),'guarded-switch-integral').value,0);near(cell(final(g),'stored-integral-gap').value,stored);near(cell(final(g),'guarded-first-after-drop').value,1.2*error);
  assert.equal(view(n,9).cells.some(c=>c.id==='naive-switch-integral'),false);
  const noI=run('rf-anti-windup',{ki:0});for(let k=0;k<20;k++)near(noI.result.runs[0][k].y,noI.result.runs[1][k].y);
});

test('derivative filter uses units m/s before Kd and m after Kd; initialization does not invent a previous reading',()=>{
  const t=run('rf-derivative-filter',{tau:.3,kd:1,noise:.1});near(cell(view(t,0),'filter-alpha').value,.75);near(cell(view(t,0),'new-weight').value,.25);
  const first=view(t,1);near(cell(first,'truth').value,0);near(cell(first,'measurement').value,.1);near(cell(first,'plain-derivative').value,0);near(cell(first,'raw').value,0);near(cell(first,'filtered').value,0);assert.match(cell(first,'raw').formula,/不用假定的前一测量/);
  const second=view(t,2);near(cell(second,'truth').value,.02);near(cell(second,'noise-sample').value,-.1);near(cell(second,'measurement').value,-.08);near(cell(second,'plain-derivative').value,1.8);near(cell(second,'raw').value,1.8);near(cell(second,'filter-new').value,.45);near(cell(second,'filtered').value,.45);near(cell(second,'reference').value,-.2);near(cell(second,'filtered-squared-error').value,.65**2);
  const third=view(t,3);near(cell(third,'raw').value,-2.2);near(cell(third,'filter-memory').value,.3375);near(cell(third,'filter-new').value,-.55);near(cell(third,'filtered').value,-.2125);
  const doubled=run('rf-derivative-filter',{tau:.3,kd:2,noise:.1});near(cell(view(doubled,2),'plain-derivative').value,1.8);near(cell(view(doubled,2),'raw').value,3.6);near(cell(view(doubled,2),'filtered').value,.9);
  assert.match(cell(second,'raw').note,/乘Kd后的raw、filtered和reference为m/);
});

test('filter final MSE averages the fifteen completed non-initial samples and retains the no-noise lag counterexample',()=>{
  const t=run('rf-derivative-filter',{tau:.3}),v=final(t);assert.equal(v.cells.filter(c=>c.id.startsWith('raw-square-')).length,15);assert.equal(v.cells.filter(c=>c.id.startsWith('filtered-square-')).length,15);near(cell(v,'raw-mse').value,4);
  let memory=0,sum=0;for(let k=1;k<16;k++){const raw=k%2===0?-2.2:1.8;memory=.75*memory+.25*raw;const e=(memory+.2)**2;near(cell(v,'filtered-square-'+k).value,e);sum+=e;}near(cell(v,'filtered-mse').value,sum/15);assert.equal(view(t,16).cells.some(c=>c.id==='filtered-mse'),false);
  const clean=run('rf-derivative-filter',{tau:.3,noise:0});near(cell(final(clean),'raw-mse').value,0);assert.ok(cell(final(clean),'filtered-mse').value>0);near(cell(view(clean,2),'filtered').value,-.05);
  const unfiltered=run('rf-derivative-filter',{tau:0});for(let i=1;i<=16;i++)near(cell(view(unfiltered,i),'filtered').value,cell(view(unfiltered,i),'raw').value);
});

test('PD sparse frames unfold all eighty already executed updates and agree with an independent linear state recurrence',()=>{
  const t=run('rf-pid-tuning');let q=0,v=0;const expected=[];for(let k=0;k<80;k++){
    const oldQ=q,oldV=v;v=-.1*oldQ+.905*oldV+.1;q=.995*oldQ+.04525*oldV+.005;expected.push({q,v,error:1-oldQ,oldQ,oldV});
  }
  const seen=new Set();for(let i=1;i<t.frames.length-1;i++){const inspected=view(t,i);assert.equal(cell(inspected,'recorded-state-check').value,true);for(const c of inspected.cells){const m=c.id.match(/^step-(\d+)-position$/);if(!m)continue;const k=Number(m[1]),e=expected[k];assert.equal(seen.has(k),false);seen.add(k);near(c.value,e.q);near(cell(inspected,'step-'+k+'-velocity').value,e.v);near(cell(inspected,'step-'+k+'-error').value,e.error);near(cell(inspected,'step-'+k+'-iae-area').value,.05*Math.abs(e.error));}
  }
  assert.equal(seen.size,80);near(cell(view(t,1),'step-0-position').value,.005);near(cell(view(t,2),'step-1-position').value,.0145);assert.equal(cell(view(t,1),'executed-updates').value,1);assert.equal(cell(view(t,2),'executed-updates').value,4);assert.equal(cell(view(t,t.frames.length-2),'executed-updates').value,3);
  near(cell(final(t),'iae').value,expected.reduce((s,e)=>s+.05*Math.abs(e.error),0));near(cell(final(t),'overshoot').value,Math.max(0,...expected.map(e=>e.q-1)));near(cell(final(t),'damping-ratio').value,1.9/(2*Math.sqrt(2)));assert.equal(cell(final(t),'saturated').value,0);
});

test('PD clipping, order of integration and finite settling-time logic retain their physical and numerical meanings',()=>{
  const limited=run('rf-pid-tuning',{kp:4,limit:1}),f=view(limited,1);near(cell(f,'step-0-p-force').value,4);near(cell(f,'step-0-d-force').value,0);near(cell(f,'step-0-raw').value,4);near(cell(f,'step-0-force').value,1);near(cell(f,'step-0-acceleration').value,1);near(cell(f,'step-0-velocity').value,.05);near(cell(f,'step-0-position').value,.0025);assert.notEqual(cell(f,'step-0-position').value,0);
  const unsettled=run('rf-pid-tuning');assert.equal(cell(final(unsettled),'settling-time').value,null);assert.equal(cell(final(unsettled),'settling-last-violation').value,80);assert.match(cell(final(unsettled),'settling-time').formula,/未知/);assert.equal(view(unsettled,10).cells.some(c=>c.id==='iae'),false);
  const settled=run('rf-pid-tuning',{kp:4,kd:3}),fv=final(settled);near(cell(fv,'settling-time').value,2.35);assert.equal(cell(fv,'settling-last-violation').value,46);const samples=settled.result.samples;assert.equal(Math.abs(samples[45].position-1)>.02||Math.abs(samples[45].velocity)>.05,true);assert.equal(samples.slice(46).every(x=>Math.abs(x.position-1)<=.02&&Math.abs(x.velocity)<=.05),true);
});

test('cascade sparse frames unfold all 150 real inner samples, holding the outer target across four intervening updates',()=>{
  const t=run('rf-cascade-control'),seen=new Set();let q=0,v=0,ref=0;const expected=[];
  for(let k=0;k<150;k++){const outer=k%5===0,oldQ=q,oldV=v;if(outer)ref=Math.min(1,Math.max(-1,1.5*(1-q)));const u=Math.min(2,Math.max(-2,3*(ref-v))),load=k<50?0:.4;v=oldV+(u-oldV-load)/15;q=oldQ+.02*v;expected.push({q,v,ref,u,load,outer});}
  for(let i=1;i<t.frames.length-1;i++){const inspected=view(t,i);assert.equal(cell(inspected,'recorded-state-check').value,true);for(const c of inspected.cells){const m=c.id.match(/^step-(\d+)-position$/);if(!m)continue;const k=Number(m[1]),e=expected[k];assert.equal(seen.has(k),false);seen.add(k);near(c.value,e.q);near(cell(inspected,'step-'+k+'-velocity').value,e.v);near(cell(inspected,'step-'+k+'-velocity-reference').value,e.ref);near(cell(inspected,'step-'+k+'-command').value,e.u);assert.equal(cell(inspected,'step-'+k+'-outer-tick').value,e.outer);}}
  assert.equal(seen.size,150);const initial=view(t,0);near(cell(initial,'rate-ratio').value,5);const first=view(t,1);near(cell(first,'step-0-outer-raw').value,1.5);near(cell(first,'step-0-velocity-reference').value,1);near(cell(first,'step-0-raw').value,3);near(cell(first,'step-0-command').value,2);near(cell(first,'step-0-velocity').value,2/15);near(cell(first,'step-0-position').value,.04/15);
  const interval=view(t,2);for(let k=1;k<=4;k++){assert.equal(cell(interval,'step-'+k+'-outer-tick').value,false);near(cell(interval,'step-'+k+'-velocity-reference').value,1);assert.equal(interval.cells.some(c=>c.id==='step-'+k+'-outer-raw'),false);}assert.equal(cell(interval,'step-5-outer-tick').value,true);
  near(cell(final(t),'position-error').value,1-expected.at(-1).q);near(cell(final(t),'final-position').value,expected.at(-1).q);near(cell(final(t),'final-velocity').value,expected.at(-1).v);assert.equal(cell(final(t),'outer-updates').value,30);assert.equal(cell(final(t),'inner-updates').value,150);
});

test('cascade load begins at the update input time 1s; finite output is 1.02s and final reference remains held',()=>{
  const t=run('rf-cascade-control'),f=t.frames.findIndex(x=>x.vars.t===1.02),v=view(t,f);assert.ok(f>0);near(cell(v,'step-49-load').value,0);near(cell(v,'step-50-load').value,.4);near(cell(v,'step-50-load').inputs.inputTime,1);near(cell(v,'step-50-position').inputs.outputTime,1.02);assert.match(cell(v,'step-50-load').note,/起点加0.02s/);
  const last=view(t,t.frames.length-2);assert.equal(cell(last,'step-149-outer-tick').value,false);assert.equal(cell(last,'executed-updates').value,4);assert.equal(last.cells.some(c=>c.id==='position-error'),false);const fv=final(t);near(cell(fv,'held-final-reference').inputs.lastOuterInputTime,2.9);assert.match(cell(fv,'held-final-reference').note,/k=149没有重新采样外环/);
});

test('inspectors preserve original frame counts and distinguish fixed record playback from actual simulated time',()=>{
  const counts={'rf-p-feedback':19,'rf-discrete-pid':25,'rf-anti-windup':23,'rf-derivative-filter':18,'rf-pid-tuning':23,'rf-cascade-control':33};for(const id of ids){const t=run(id);assert.equal(t.frames.length,counts[id]);for(let i=0;i<t.frames.length;i++)view(t,i);assert.equal(t.frames.length,counts[id]);}
  assert.match(final(run('rf-discrete-pid')).summary,/不伪造闭环运动/);assert.match(view(run('rf-pid-tuning'),2).summary,/已经执行的积分子步/);assert.match(view(run('rf-cascade-control'),2).summary,/不伪造外环连续更新/);
});
