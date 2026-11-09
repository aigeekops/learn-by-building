const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const M=require('../web/ai-course-models.js');
require('../web/foundation-d2l.js')(M);require('../web/application-fsdl.js')(M);
const D=require('../web/foundation-d2l-scenes.js'),S=require('../web/application-fsdl-scenes.js');
const robotics=Object.assign({},...['mechanics','kinematics','control','estimation'].map(x=>require('../web/robotics-foundations-'+x+'.js')));
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const finite=x=>{if(typeof x==='number')assert.ok(Number.isFinite(x));else if(x&&typeof x==='object')Object.values(x).forEach(finite);};
const d2l=['convolution','cnn-pooling','rnn','gru','momentum','adam','data-parallel','ddp'].map(x=>'d2l-'+x);
const fsdl=['foundation-models','ml-teams','ethics','project-train','project-serve'].map(x=>'fsdl-'+x);
const robotIds=['beam-design','manufacturing-datums','design-project','rotation3d','se3-chain','arm-dynamics','joint-trajectory','derivative-filter','pid-tuning','cascade-control','kalman-state','kalman-covariance','kalman-2d','ekf-range','unscented-transform'].map(x=>'rf-'+x);

test('28 new models retain complete source-backed teaching and finite executable snapshots',()=>{
 const wanted=[['foundation_d2l',16],['application_fsdl',13],['robotics_foundations_mechanics',6],['robotics_foundations_kinematics',7],['robotics_foundations_control',6],['robotics_foundations_estimation',8]];
 for(const [name,count] of wanted){const data=require('../config/'+name+'.json');assert.ok(data.lessons.length>=count);for(const l of data.lessons){assert.ok(l.explanation.length>=3);assert.ok(l.practice.length>=3);assert.ok(l.sources.length);}}
 for(const id of [...d2l,...fsdl]){
  const renderer=id.startsWith('d2l')?D:S;
  const cases=[{},...M.specs[id].flatMap(c=>(c.type==='select'?c.options.map(x=>x[0]):[c.min,c.max]).map(v=>({[c.id]:v})))];
  for(const p of cases){const t=M.run(id,p);finite(t);assert.ok(t.steps.length>=5);t.steps.forEach((f,i)=>{assert.ok(f.line>=1&&f.line<=t.code.length);const svg=renderer.render(t,i);assert.match(svg,/<svg /);assert.doesNotMatch(svg,/undefined|NaN|Infinity/);const altered=JSON.parse(JSON.stringify(t));altered.result={forbidden:'future'};for(let j=i+1;j<altered.steps.length;j++)altered.steps[j].variables={forbidden:'future'};assert.equal(renderer.render(altered,i),svg);});}
 }
 for(const id of robotIds){const model=robotics[id];assert.ok(model);const p=Object.freeze(Object.fromEntries(model.controls.map(c=>[c.key,c.value]))),trace=model.run(p);finite(trace);assert.ok(trace.frames.length>=4);const downloaded=vm.runInNewContext('('+model.run.toString()+')');assert.equal(JSON.stringify(downloaded(p)),JSON.stringify(trace));for(const frame of trace.frames){assert.equal(typeof frame.code,'string');assert.equal(typeof frame.vars,'object');assert.match(model.render(frame),/<svg /);assert.doesNotMatch(model.render(frame),/undefined|NaN|Infinity/);}}
});

test('convolution obeys output geometry; pooling and GRU preserve their declared limits',()=>{
 assert.deepEqual(M.run('d2l-convolution').result.output,[[-2,0],[0,-1]]);
 assert.deepEqual(M.run('d2l-convolution',{padding:1,stride:2}).result.shape,[1,1,2,2]);
 near(M.run('d2l-cnn-pooling').result.pooled,1);near(M.run('d2l-cnn-pooling',{pool:'average'}).result.pooled,.25);
 near(M.run('d2l-cnn-pooling').result.loss,.12692801104297263);
 for(const reset of [0,.5,1])near(M.run('d2l-gru',{update:1,reset}).result.hidden,1);
 near(M.run('d2l-rnn',{recurrent:0}).result.memoryDerivative,0);
});

test('gradient aggregation preserves global sample weighting and reveals both scaling failures',()=>{
 const equal=M.run('d2l-data-parallel').result;near(equal.globalGradient,-15);
 const correct=M.run('d2l-data-parallel',{split:1}).result;near(correct.globalGradient,-15);
 const wrong=M.run('d2l-data-parallel',{split:1,reduction:'rank_mean'}).result;near(wrong.globalGradient,-32/3);assert.notEqual(wrong.globalGradient,wrong.reference);
 for(const world of [2,3,4])for(const microbatches of [1,2,4]){near(M.run('d2l-ddp',{world,microbatches}).result.reduced,(world+1)/2);near(M.run('d2l-ddp',{world,microbatches,scaling:'missing'}).result.reduced,microbatches*(world+1)/2);}
 const first=M.run('d2l-adam').result.history[0];near(first.mHat,2);near(first.vHat,4);near(first.theta,2-.2/(2+1e-8));
});

test('strength/stiffness, manufacturing clearance and speed/torque tradeoffs remain separate',()=>{
 const beam=robotics['rf-beam-design'];const thin=beam.run().result,thick=beam.run({thickness:6}).result;near(thick.stress*4,thin.stress);near(thick.deflection*8,thin.deflection);
 near(beam.run({length:120,thickness:4}).result.stress,15);
 const bad=robotics['rf-manufacturing-datums'].run({hole:4.2,datumTolerance:.3}).result;assert.equal(bad.guaranteed,false);
 const slow=robotics['rf-design-project'].run({ratio:8}).result;assert.equal(slow.checks.speed,false);assert.equal(slow.checks.torque,true);assert.equal(slow.pass,false);
});

test('SO3/SE3 preserve lengths and inverses; dynamics and trajectories satisfy independent invariants',()=>{
 for(const roll of [-90,0,90])for(const pitch of [-90,45,90]){const t=robotics['rf-rotation3d'].run({roll,pitch}).result;near(t.determinant,1);near(t.inverseError,0);t.orthogonal.forEach((row,i)=>row.forEach((v,j)=>near(v,Number(i===j))));}
 for(const yaw of [-90,0,90])near(robotics['rf-se3-chain'].run({yaw}).result.inverseError,0);
 const stationary=robotics['rf-arm-dynamics'].run({q1:0,q2:0,velocity:0,acceleration:0}).result;near(stationary.torque[1],4.905);near(stationary.kinetic,0);assert.ok(stationary.determinant>0);
 for(const q2 of [-90,0,90]){const t=robotics['rf-arm-dynamics'].run({q2,acceleration:1.5}).result;near(t.recovered[0],1.5);near(t.recovered[1],0);assert.ok(t.kinetic>=0);}
 const a=robotics['rf-joint-trajectory'].run({duration:2}).result,b=robotics['rf-joint-trajectory'].run({duration:4}).result;near(a.start.velocity,0);near(a.end.velocity,0);near(a.end.acceleration,0);near(a.peakVelocity,2*b.peakVelocity);near(a.peakAcceleration,4*b.peakAcceleration);
});

test('filtering and multi-rate controls obey initialization, actuator limits and declared sampling',()=>{
 const raw=robotics['rf-derivative-filter'].run({tau:0}).result;raw.samples.forEach(x=>near(x.raw,x.filtered));near(raw.samples[0].raw,0);
 const t=robotics['rf-pid-tuning'].run().result;near(t.samples[0].position,.005);assert.ok(t.samples.every(x=>Math.abs(x.u)<=3));
 const cascade=robotics['rf-cascade-control'].run().result;assert.equal(cascade.outerUpdates,30);assert.ok(cascade.samples.every(x=>Math.abs(x.u)<=2&&Math.abs(x.velocityReference)<=1));
});

test('multivariate covariance, EKF unobservability and unscented moments retain mathematical meaning',()=>{
 const a=robotics['rf-kalman-state'].run({q:0,r:1}).result;near(a.K[1],1/3);
 const c=robotics['rf-kalman-covariance'].run({rho:-.4}).result;near(c.state[1],-.32);near(c.covariance[1][1],1-.8**2/5);
 for(const r of [.2,1,2]){const t=robotics['rf-kalman-2d'].run({r}).result;assert.equal(t.P.length,4);t.P.forEach((row,i)=>row.forEach((x,j)=>near(x,t.P[j][i])));assert.ok(t.P.every((row,i)=>row[i]>0));}
 const ekf=robotics['rf-ekf-range'].run().result;near(ekf.tangentialVariance,1);near(ekf.radialVariance,.2/1.2);
 for(const mean of [-2,0,2])for(const variance of [.2,1,2]){const u=robotics['rf-unscented-transform'].run({mean,variance}).result;near(u.outputMean,u.exactMean);near(u.outputVariance,u.exactVariance);if(mean===0){near(u.ekfVariance,0);assert.ok(u.outputVariance>0);}}
});

test('FSDL responsibility gaps, audit omissions and release checks preserve unknown states',()=>{
 const head=M.run('fsdl-foundation-models').result;assert.deepEqual(head.newEncoder,[[1,0],[0,.5]]);near(head.after,.2);
 const full=M.run('fsdl-foundation-models',{strategy:'full'}).result;assert.notDeepEqual(full.newEncoder,head.newEncoder);
 near(M.run('fsdl-ml-teams').result.plannedDays,7);const blocked=M.run('fsdl-ml-teams',{missing:'data'}).result;assert.equal(blocked.plannedDays,null);assert.equal(blocked.blocked.length,4);
 near(M.run('fsdl-ethics').result.fprGap,.5);assert.equal(M.run('fsdl-ethics',{coverage:'omit'}).result.fprGap,null);
 const bad=M.run('fsdl-project-serve',{candidate:'hash'}).result;assert.equal(bad.canaryRate,null);assert.equal(bad.active,'baseline');
 assert.equal(M.run('fsdl-project-serve',{canaryErrors:1}).result.rollback,false);assert.equal(M.run('fsdl-project-serve',{canaryErrors:2}).result.rollback,true);
});
