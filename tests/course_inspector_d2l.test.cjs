const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const P=require('../web/course-inspectors/d2l.js');
const M=require('../web/ai-course-models.js');require('../web/foundation-d2l.js')(M);
const catalog=require('../config/foundation_d2l.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const sum=xs=>xs.reduce((a,b)=>a+b,0),mean=xs=>sum(xs)/xs.length;
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function at(id,params,line,occurrence=0){const t=M.run(id,params),indices=t.steps.flatMap((s,i)=>s.line===line?[i]:[]);assert.ok(indices.length>occurrence,`${id} missing line ${line}`);return {t,i:indices[occurrence],cells:P.models[id].inspect(t,indices[occurrence]).cells};}
const get=(cells,id)=>{const cell=cells.find(c=>c.id===id);assert.ok(cell,'missing cell '+id);return cell;};

test('D2L provider covers all 16 actual demos, every default/boundary frame, immutable traces and 17 real experiments',()=>{
  assert.equal(P.courseId,'d2l');assert.equal(catalog.lessons.length,16);assert.equal(ids.length,16);assert.deepEqual(Object.keys(P.models).sort(),ids.sort());
  let experiments=0;
  for(const id of ids){
    const provider=P.models[id],cases=[{}];assert.ok(provider.intuition.length>15);assert.ok(provider.experiments.length);
    for(const spec of M.specs[id])cases.push({[spec.id]:spec.type==='range'?spec.min:spec.options[0][0]},{[spec.id]:spec.type==='range'?spec.max:spec.options.at(-1)[0]});
    for(const params of cases){const t=M.run(id,params),original=JSON.stringify(t);freeze(t);
      t.steps.forEach((f,i)=>{const r=provider.inspect(t,i);assert.ok(r.title&&r.summary&&r.cells.length,`${id} frame ${i}`);assert.equal(new Set(r.cells.map(c=>c.id)).size,r.cells.length);
        for(const c of r.cells){assert.ok(c.id&&c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,`${id}/${c.id} missing semantic fields`);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN/.test(c.formula),`${id}: ${c.formula}`);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
      });
      assert.deepEqual(provider.inspect(t,-100),provider.inspect(t,0));assert.deepEqual(provider.inspect(t,Infinity),provider.inspect(t,t.steps.length-1));
      assert.equal(JSON.stringify(t),original,id+' mutated trace');
    }
    for(const e of provider.experiments){const a=M.run(id,e.before),b=M.run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.ok(e.label&&e.prediction&&e.expectation);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepted unchanged before case');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepted unchanged after case');assert.equal(JSON.stringify([a,b]),original);experiments++;}
  }
  assert.equal(experiments,17);
});

test('browser registration is self-contained and no inspector reads final results or later snapshots',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/d2l.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.d2l.courseId,'d2l');
  for(const id of ids){const t=M.run(id);for(let i=0;i<t.steps.length;i++){
    const available={...t,steps:new Proxy(t.steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future snapshot');return Reflect.get(target,key);}})};
    Object.defineProperty(available,'result',{get(){throw Error('future result');}});assert.doesNotThrow(()=>P.models[id].inspect(available,i),id+' frame '+i);
  }}
});

test('tensor and matrix inspectors expose every output coordinate, probability contribution and rejected shape',()=>{
  const a=at('d2l-tensors',{rows:3,columns:2,offset:3},6);assert.equal(a.cells.length,6);for(const c of a.cells){near(c.value,c.inputs.A+c.inputs.B);assert.ok(c.formula.includes(' + '));}
  const rejected=at('d2l-tensors',{mode:'incompatible'},5);assert.equal(rejected.cells.length,1);assert.equal(rejected.cells[0].value,'shape_error');assert.equal(rejected.t.result.output,null);
  const dot=at('d2l-matrix-probability',{w0:2,p0:4},3);assert.deepEqual(dot.cells.map(c=>c.value),[6,8]);dot.cells.forEach(c=>near(c.value,sum(c.inputs.features.map((x,j)=>x*c.inputs.weights[j]))));
  const expected=at('d2l-matrix-probability',{w0:2,p0:4},6);near(expected.cells[0].value,.8*6);near(expected.cells[1].value,.2*8);near(get(expected.cells,'expectation').value,6.4);
});

test('autograd and MLP gradient cells agree with independent numerical differentiation away from the ReLU kink',()=>{
  const h=1e-5,p={x:1.5,w:.5,b:.5,target:4},t=M.run('d2l-autograd',p),cells=at('d2l-autograd',p,6).cells;
  const loss=q=>.5*(q.w*q.x+q.b-q.target)**2;
  for(const [key,id] of [['w','dw'],['b','db'],['x','dx']]){const numerical=(loss({...p,[key]:p[key]+h})-loss({...p,[key]:p[key]-h}))/(2*h);near(get(cells,id).value,numerical,1e-8);}
  near(t.result.loss,loss(p));
  for(const w of [-1,1]){const q={x:1,w,b:0,v:1.5},c=at('d2l-mlp',q,7).cells;const L=z=>.5*(z.v*Math.max(0,z.w*z.x+z.b)-1)**2;for(const [key,id] of [['w','dw'],['b','db']])near(get(c,id).value,(L({...q,[key]:q[key]+h})-L({...q,[key]:q[key]-h}))/(2*h),1e-8);}
  const kink=at('d2l-mlp',{w:0,b:0},6).cells[0];assert.equal(kink.value,0);assert.ok(kink.note.includes('不可导'));
});

test('regression separates old-state gradients from simultaneous updates and recomputes every sample loss',()=>{
  const p={epochs:5,rate:.15,initialW:-1},t=M.run('d2l-regression',p);let w=-1,b=0,epoch=0;
  for(let i=0;i<t.steps.length;i++){const s=t.steps[i],c=P.models['d2l-regression'].inspect(t,i).cells;if(s.line===5){const errors=[w+b-2,2*w+b-4];near(get(c,'dw').value,(errors[0]+2*errors[1])/2);near(get(c,'db').value,mean(errors));}
    if(s.line===6){const errors=[w+b-2,2*w+b-4],dw=(errors[0]+2*errors[1])/2,db=mean(errors);w-=p.rate*dw;b-=p.rate*db;near(get(c,'w-update').value,w);near(get(c,'b-update').value,b);near(get(c,'after-mean').value,mean([.5*(w+b-2)**2,.5*(2*w+b-4)**2]));epoch++;}
  }
  assert.equal(epoch,5);near(t.result.w,w);near(t.result.b,b);assert.ok(P.models['d2l-regression'].inspect(t,t.steps.length-1).cells.at(-1).note.includes('最终核对'));
});

test('classification probabilities, target loss and per-logit gradient retain stable arithmetic',()=>{
  for(const target of [0,1,2]){const p={shift:10,gap:2,target},t=M.run('d2l-classification',p),scores=[2,0,-2],z=sum(scores.map(Math.exp)),probabilities=scores.map(x=>Math.exp(x)/z),c=at('d2l-classification',p,6).cells;probabilities.forEach((x,j)=>near(get(c,'logit-gradient-'+j).value,x-(j===target?1:0)));near(t.result.loss,-Math.log(probabilities[target]));}
  const u=at('d2l-classification',{gap:0},4);u.cells.forEach(c=>near(c.value,1/3));
});

test('generalization uses actual split labels and each displayed MSE has explicit sample errors',()=>{
  for(const capacity of ['line','memorize'])for(const split of ['clean','leaked']){const p={capacity,split,noise:1.5},t=M.run('d2l-generalization',p),v=t.steps.find(s=>s.line===8).variables,c=at('d2l-generalization',p,8).cells,ys=split==='clean'?[2,6,10]:[1.5,2.5,9.5];const parts=v.validationPrediction.map((x,j)=>(x-ys[j])**2);parts.forEach((x,j)=>near(get(c,'validation-sample-'+j).value,x));near(get(c,'validation-mse').value,mean(parts));assert.equal(get(c,'independent').value,split==='clean');}
  assert.equal(M.run('d2l-generalization',{capacity:'memorize',split:'leaked'}).result.validationMSE,0);
});

test('Attention gives per-key dot, scaled, masked and normalized cells followed by each Value contribution',()=>{
  for(const visible of ['both','first']){const p={query:2.5,value:6,visible},t=M.run('d2l-attention',p),dot=at('d2l-attention',p,2).cells,scaled=at('d2l-attention',p,3).cells,mask=at('d2l-attention',p,4).cells,weight=at('d2l-attention',p,5).cells,contrib=at('d2l-attention',p,6).cells;assert.deepEqual(dot.map(c=>c.value),[2.5,1]);near(scaled[0].value,2.5/Math.sqrt(2));const alpha=visible==='first'?1:Math.exp(2.5/Math.sqrt(2))/(Math.exp(2.5/Math.sqrt(2))+Math.exp(1/Math.sqrt(2)));near(weight[0].value,alpha);near(weight[1].value,1-alpha);near(contrib[0].value,2*alpha);near(contrib[1].value,6*(1-alpha));near(t.result.output,2*alpha+6*(1-alpha));if(visible==='first'){assert.equal(mask[1].value,'−∞');assert.ok(mask[1].formula.includes('exp(−∞) = 0'));}}
});

test('convolution windows and CNN pooling match independent coordinate calculations without invented frames',()=>{
  const image=[[1,2,0],[0,1,3],[2,1,0]];
  for(const padding of [0,1])for(const stride of [1,2])for(const edge of [-2,1]){const t=M.run('d2l-convolution',{padding,stride,edge}),size=Math.floor((3+2*padding-2)/stride)+1;let windows=0;
    t.steps.forEach((s,i)=>{const c=P.models['d2l-convolution'].inspect(t,i).cells;if(s.line===5){assert.equal(c.length,size*size);assert.ok(c.every(x=>x.value===null&&x.formula.includes('不是0')));}if(s.line===8){const [row,column]=s.variables.position;let total=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++){const y=row*stride+a-padding,x=column*stride+b-padding,pixel=image[y]?.[x]||0,product=pixel*(b?edge:1);near(get(c,`window-product-${a}-${b}`).value,product);total+=product;}near(get(c,'window-sum').value,total);windows++;}});assert.equal(windows,size*size);assert.equal(t.steps.length,5+size*size);
  }
  for(const bias of [-2,0,2])for(const pool of ['max','average']){const p={bias,pool},t=M.run('d2l-cnn-pooling',p),a=image.slice(0,2).map((row,i)=>row.slice(0,2).map((x,j)=>Math.max(0,x-image[i+1][j+1]+bias))),pooled=pool==='max'?Math.max(...a.flat()):mean(a.flat());near(t.result.pooled,pooled);near(at('d2l-cnn-pooling',p,4).cells[0].value,pooled);near(t.result.loss,Math.log(1+Math.exp(-2*pooled)));}
});

test('RNN time-chain derivative and GRU extreme gates reflect their actual recurrence convention',()=>{
  const p={recurrent:.7,input:.5},t=M.run('d2l-rnn',p),h=1e-5;const forward=initial=>t.result.inputs.reduce((old,x)=>Math.tanh(x+p.recurrent*old),initial),c=at('d2l-rnn',p,9).cells;near(get(c,'time-chain').value,(forward(h)-forward(-h))/(2*h),1e-8);
  for(const s of t.steps.filter(x=>x.line===7)){const row=s.variables.history.at(-1);near(row.hidden,Math.tanh(row.x+p.recurrent*row.previous));near(row.localDerivative,(1-row.hidden**2)*p.recurrent);}
  for(const reset of [0,1])for(const update of [0,1]){const q={reset,update,initial:-1},r=M.run('d2l-gru',q).result;near(r.hidden,update*(-1)+(1-update)*Math.tanh(.5-reset));near(at('d2l-gru',q,6).cells[0].value,r.hidden);}
});

test('momentum and Adam inspectors recompute optimizer states and parameter updates at full precision',()=>{
  const m={rate:.2,momentum:.6},t=M.run('d2l-momentum',m);let theta=2,velocity=0;for(const s of t.steps.filter(s=>s.line===7)){velocity=m.momentum*velocity+theta;theta-=m.rate*velocity;near(s.variables.velocity,velocity);near(s.variables.theta,theta);const c=P.models['d2l-momentum'].inspect(t,t.steps.indexOf(s)).cells;near(get(c,'velocity').value,velocity);near(get(c,'updated-loss').value,.5*theta**2);}
  const p={rate:.15,beta1:.4,beta2:.5},a=M.run('d2l-adam',p);theta=2;let first=0,second=0,step=0;for(let i=0;i<a.steps.length;i++)if(a.steps[i].line===8){step++;const g=theta;first=p.beta1*first+(1-p.beta1)*g;second=p.beta2*second+(1-p.beta2)*g*g;const mh=first/(1-p.beta1**step),vh=second/(1-p.beta2**step);theta-=p.rate*mh/(Math.sqrt(vh)+1e-8);const c=P.models['d2l-adam'].inspect(a,i).cells;near(get(c,'first-moment').value,first);near(get(c,'second-moment').value,second);near(get(c,'corrected-m').value,mh);near(get(c,'corrected-v').value,vh);near(get(c,'theta-update').value,theta);}
});

test('unequal data shards and missing DDP accumulation scaling preserve their observable counterexamples',()=>{
  for(const split of [1,2,3]){const good=M.run('d2l-data-parallel',{split,reduction:'weighted'}),bad=M.run('d2l-data-parallel',{split,reduction:'rank_mean'});near(good.result.globalGradient,-15);near(at('d2l-data-parallel',{split},8).cells.find(c=>c.id==='gradient-error').value,0);if(split===2)near(bad.result.error,0);else assert.notEqual(bad.result.error,0);}
  for(const world of [2,4])for(const microbatches of [1,4])for(const scaling of ['correct','missing']){const p={world,microbatches,scaling},t=M.run('d2l-ddp',p),factor=scaling==='correct'?1:microbatches;near(t.result.reduced,(world+1)/2*factor);near(t.result.nextWeight,-.1*(world+1)/2*factor);for(let i=0;i<t.steps.length;i++)if(t.steps[i].line===5){const c=P.models['d2l-ddp'].inspect(t,i).cells,micro=t.steps[i].variables.micro;for(let rank=0;rank<world;rank++)near(get(c,'accumulated-'+rank).value,(rank+1)*micro*(scaling==='correct'?1/microbatches:1));}}
});
