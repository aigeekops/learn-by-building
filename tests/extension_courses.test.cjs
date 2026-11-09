const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const M=require('../web/ai-course-models.js'),E=require('../web/extension-course-models.js'),Scenes=require('../web/extension-course-scenes.js');E.register(M);
const modules=require('../scripts/integrate-extension-qa-data.cjs'),run=(id,p)=>M.run(id,p).result;
const close=(a,b,tol=1e-9)=>{if(Array.isArray(b)){assert.equal(a.length,b.length);b.forEach((v,i)=>close(a[i],v,tol));}else if(typeof b==='number')assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);else assert.deepEqual(a,b);};
// Analytic checks use hand-derived constants and independent limiting cases.
const cases={
 'cs234-return':['return',2.62], 'cs234-bellman':['fixedPoint',80/41], 'cs234-planning':['values',[1.8,2]], 'cs234-td':['updated',1.4],
 'cs234-qlearning':['updated',2.3], 'cs234-exploration':['probabilities',[1/15,13/15,1/15]], 'cs234-approximation':['updated',[.65,.8]], 'cs234-policy-gradient':['gradient',.5],
 'bonn-motion':['heading',.2], 'bonn-observation':['posterior',[1/(1+Math.exp(2)),1/(1+Math.exp(-2))]], 'bonn-bayes':['posterior',[44/53,9/53]], 'bonn-ekf':['posteriorVariance',1/34],
 'bonn-particles':['resampled',[.5,.5,1,1]], 'bonn-grid':['probability',.9], 'bonn-slam':['poses',[0,14/15,31/15]], 'bonn-astar':['cost',3],
 'manipulation-frames':['pointWorld',[1,2]], 'manipulation-ik':['end',[1,1]], 'manipulation-perception':['residuals',[0,0,0]], 'manipulation-contact':['margin',1.076],
 'manipulation-path':['valid',[false,true]], 'manipulation-trajectory':['velocity',.75], 'manipulation-control':['nextVelocity',.6], 'manipulation-task':['success',true],
 'nav2-lifecycle':['acceptGoal',true], 'nav2-tf':['endpointMap',3.7], 'nav2-localization':['relativeGoal',-.65], 'nav2-costmap':['physicalMargin',.5],
 'nav2-planner':['costs',[7,4.4]], 'nav2-controller':['omega',.2], 'nav2-behavior':['attempts',2], 'nav2-validation':['rate',.8],
 'moveit-model':['robotDof',7], 'moveit-limits':['requestValid',false], 'moveit-ik':['qdot',5/13], 'moveit-scene':['edgeClear',false],
 'moveit-planning':['shiftedDiscreteClear',true], 'moveit-cartesian':['lengthFraction',2/3], 'moveit-timing':['duration',2], 'moveit-execution':['success',true],
 'cs224r-bc':['gradient',-2.5], 'cs224r-dagger':['weight',2], 'cs224r-actor-critic':['advantages',[.646,.6]], 'cs224r-ppo':['objective',1.2],
 'cs224r-entropy':['entropy',Math.log(2)], 'cs224r-model':['terminalError',.3], 'cs224r-offline':['adjusted',[2,3]], 'cs224r-goals':['evaluationSuccess',false],
 'underactuated-actuation':['acceleration',[-1/3,2/3]], 'underactuated-pendulum':['energy',4.905], 'underactuated-linearization':['linearAcceleration',-.219], 'underactuated-lqr':['gain',.6993456421585419],
 'underactuated-lyapunov':['atEquilibrium',true], 'underactuated-energy':['energyRate',2], 'underactuated-collocation':['defects',[0,0]], 'underactuated-mpc':['nextCosts',[.6625,.0625,1.6625]],
 'cs231n-linear':['scores',[-.5,.5]], 'cs231n-softmax':['loss',.4076059644443804], 'cs231n-backprop':['gradient',1], 'cs231n-convolution':['output',[[0,0],[0,0]]],
 'cs231n-residual':['residualGradient',1.5], 'cs231n-attention':['output',2.849579234791117], 'cs231n-detection':['iou',1/3], 'cs231n-transfer':['validationAccuracy',1],
 'arduino-led':['currentMilliamp',150/11], 'arduino-input':['known',true], 'arduino-adc':['lsb',5/1024], 'arduino-pwm':['onTime',128/255/500],
 'arduino-timing':['difference',300], 'arduino-debounce':['presses',[40]], 'arduino-actuator':['conductionWatt',.1], 'arduino-project':['pwm',100],
 'lerobot-schema':['accepted',true], 'lerobot-time':['causalCount',2], 'lerobot-episodes':['overlap',[]], 'lerobot-normalization':['normalized',Math.sqrt(13.5)],
 'lerobot-bc':['heldOutError',-2.5], 'lerobot-chunks':['gap',20], 'lerobot-rollout':['submitted',false], 'lerobot-evaluation':['percentagePoints',20]
};
for(const [id,[field,expected]]of Object.entries(cases))test(id+' analytic result',()=>close(run(id)[field],expected));
test('all parameter combinations stay finite; frames and code use the same computations',()=>{
 const finite=value=>{if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')Object.values(value).forEach(finite);};
 for(const [id,d]of Object.entries(E.definitions)){
  const choices=d.params.map(s=>[s.id,s.type==='range'?[s.min,s.max,s.value]:s.options.map(x=>x[0])]);let combinations=[{}];for(const [name,values]of choices)combinations=combinations.flatMap(c=>values.map(value=>({...c,[name]:value})));
  for(const p of combinations){const trace=M.run(id,p);finite(trace);for(const [i,f]of trace.steps.entries()){assert.ok(f.line>0&&f.line<=trace.code.length);assert.match(trace.code[f.line-1],/Object.assign/);if(f.scene){const svg=Scenes.render(f.scene);assert.ok(!/NaN|undefined|Infinity/.test(svg),id+' '+i);}}}
 }
});
test('standalone code executes from disk and is identical to displayed code',()=>{
 for(const m of modules)for(const l of m.lessons){const code=fs.readFileSync(path.join(__dirname,'../examples/extension-courses',l.id+'.cjs'),'utf8');assert.equal(code,E.example(l.id));assert.ok(l.sections.some(s=>s.code===code));let printed;vm.runInNewContext(code,{console:{log:v=>printed=v}},{timeout:1000});assert.deepEqual(JSON.parse(printed),run(l.id));}
});
test('failure paths do not turn unknown, partial or rejected operations into success',()=>{
 assert.equal(run('cs234-td',{terminal:'yes'}).target,0);
 close(run('cs234-qlearning',{method:'sarsa'}).updated,1.4);
 assert.equal(run('manipulation-ik',{x:2,y:2}).end,null);
 assert.equal(run('manipulation-task',{grasp:'fail'}).states.includes('release'),false);
 assert.equal(run('nav2-lifecycle',{sensor:'no'}).acceptGoal,false);
 const tf=run('nav2-tf',{age:1});assert.equal(tf.usable,false);close(tf.endpointMap,3.7);
 const cost=run('nav2-costmap',{radius:.3,inflation:.2});assert.equal(cost.geometricPass,true);assert.equal(cost.bufferPass,false);
 const bt=run('nav2-behavior',{failures:4,budget:2});assert.equal(bt.attempts,3);assert.equal(bt.status,'FAILURE');
 assert.equal(run('moveit-ik',{jacobian:0}).qdot,0);
 assert.equal(run('moveit-cartesian',{completed:3}).accepted,false);
 assert.equal(run('moveit-execution',{scene:'changed',result:'success'}).success,false);
 const unknown=run('arduino-input',{pullup:'no',pressed:'no'});assert.equal(unknown.raw,null);assert.equal(unknown.logicalPressed,null);
 const timeout=run('arduino-project',{sensor:'timeout'});assert.equal(timeout.distance,null);assert.equal(timeout.pwm,0);
 assert.equal(run('lerobot-schema',{unit:'degree'}).accepted,false);
 assert.equal(run('lerobot-rollout',{fresh:'no',command:0}).allowed,false);
 assert.equal(run('cs224r-goals',{achieved:2,desired:3}).originalSuccess,false);
});
test('gradient, probability and dynamical invariants have independent checks',()=>{
 for(const epsilon of [0,.2,1])close(run('cs234-exploration',{epsilon}).total,1);
 close(run('cs224r-ppo',{advantage:-1}).objective,-1.3);
 close(run('cs224r-dagger',{expert:0}).label,4);close(run('cs224r-dagger',{expert:1}).executed,4);
 close(run('cs231n-backprop').gradient,run('cs231n-backprop').numerical,1e-8);
 close(run('cs231n-softmax',{score:0,temperature:2}).gradient.reduce((a,b)=>a+b,0),0);
 assert.deepEqual(run('cs231n-convolution',{center:0}).output,[[1,0],[0,-1]]);
 close(run('cs231n-attention',{query:0}).output,4);
 close(run('bonn-motion',{left:1,right:1}).next,[.5,0,0]);
 close(run('bonn-slam',{loop:2.2}).residuals,[0,0,0]);
 close(run('underactuated-actuation').recoveredForce,[0,1]);
 const stationary=run('underactuated-energy',{velocity:0});assert.equal(stationary.torque,0);assert.equal(stationary.stalled,true);
 assert.equal(run('underactuated-lyapunov',{x:-1}).atEquilibrium,true);assert.equal(run('underactuated-lyapunov',{x:-1}).atTargetEquilibrium,false);
 assert.equal(run('underactuated-collocation',{control:0}).discreteFeasible,false);
 close(run('moveit-timing',{distance:2}).duration,3);
 assert.equal(run('arduino-debounce',{quiet:50}).firstConfirmed,70);
 const tied=run('lerobot-time',{delay:.15});assert.equal(tied.matches[2].index,0,'floating point tie picks earlier frame');
 for(const validation of [4,8,10])close(run('lerobot-normalization',{validation}).center,2);
 const interval=run('lerobot-evaluation',{successes:0}).interval;close(interval[0],0);assert.ok(interval[1]>0&&interval[1]<1);
});
test('all lessons have versioned official attribution, original content and stable unique IDs',()=>{
 const ids=modules.flatMap(m=>m.lessons.map(l=>l.id));assert.equal(new Set(ids).size,80);assert.equal(Object.keys(cases).length,80);
 for(const m of modules){assert.equal(m.lessons.length,8);assert.ok(m.course.pending.length>30);for(const l of m.lessons){assert.equal(l.course,m.course.id);assert.ok(l.explanation.length>=3&&l.sections.length>=5);assert.ok(l.exercise.transfer.length>20);for(const source of l.sources){assert.equal(m.sources[source].role,'official');assert.ok(m.sources[source].url.startsWith('https://'));}for(const b of l.bridges)assert.ok(ids.includes(b.lesson));}}
});
