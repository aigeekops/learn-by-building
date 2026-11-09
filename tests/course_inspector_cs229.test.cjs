const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/cs229.js');
const M=require('../web/ai-course-models.js');require('../web/foundation-math.js')(M);
const catalog=require('../config/foundation_cs229.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const cell=(cells,id)=>{const found=cells.find(c=>c.id===id);assert.ok(found,'missing cell '+id);return found;};
function at(id,params,line,occurrence=0){const t=M.run(id,params),indices=t.steps.flatMap((s,i)=>s.line===line?[i]:[]);assert.ok(indices.length>occurrence);const i=indices[occurrence];return {t,i,cells:P.models[id].inspect(t,i).cells};}

test('CS229 covers all six real lessons, immutable default/boundary frames and ten real parameter experiments',()=>{
  assert.equal(P.courseId,'cs229');assert.equal(catalog.lessons.length,6);assert.deepEqual(Object.keys(P.models).sort(),ids.sort());
  let experiments=0;
  for(const id of ids){const provider=P.models[id],cases=[{}];assert.ok(provider.intuition.length>20);
    for(const spec of M.specs[id])cases.push({[spec.id]:spec.type==='range'?spec.min:spec.options[0][0]},{[spec.id]:spec.type==='range'?spec.max:spec.options.at(-1)[0]});
    for(const params of cases){const t=M.run(id,params),original=JSON.stringify(t);freeze(t);
      t.steps.forEach((s,i)=>{const view=provider.inspect(t,i);assert.equal(view.title,s.title);assert.ok(view.summary&&view.cells.length);assert.equal(new Set(view.cells.map(c=>c.id)).size,view.cells.length);
        for(const c of view.cells){assert.ok(c.id&&c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,`${id}/${c.id}`);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
      });assert.deepEqual(provider.inspect(t,-20),provider.inspect(t,0));assert.deepEqual(provider.inspect(t,Infinity),provider.inspect(t,t.steps.length-1));assert.equal(JSON.stringify(t),original);
    }
    for(const e of provider.experiments){const a=M.run(id,e.before),b=M.run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.ok(e.label&&e.prediction&&e.expectation);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepted unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepted unchanged after');assert.equal(JSON.stringify([a,b]),original);experiments++;}
  }
  assert.equal(experiments,10);
});

test('browser registration works and inspectors cannot read result or a future snapshot',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/cs229.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.cs229.courseId,'cs229');
  for(const id of ids)for(const params of [{},...P.models[id].experiments.flatMap(e=>[e.before,e.after])]){const t=M.run(id,params);for(let i=0;i<t.steps.length;i++){
    const available={...t,steps:new Proxy(t.steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future snapshot');return Reflect.get(target,key);}})};
    Object.defineProperty(available,'result',{get(){throw Error('future result');}});assert.doesNotThrow(()=>P.models[id].inspect(available,i),id+' frame '+i);
  }}
});

test('gradient cells agree with finite differences and keep old losses distinct from updated weights',()=>{
  const J=w=>((w-2)**2+(2*w-4)**2)/4,h=1e-5;
  for(const rate of [0,.2,.7,1]){const t=M.run('cs229-gradient',{rate,iterations:5});let previous=0,updates=0;
    for(let i=0;i<t.steps.length;i++){const f=t.steps[i],c=P.models['cs229-gradient'].inspect(t,i).cells,v=f.variables;
      if(f.line===4){near(v.weight,previous);near(cell(c,'before-loss').value,J(previous));near(cell(c,'before-square-0').value,(previous-2)**2);near(cell(c,'before-square-1').value,(2*previous-4)**2);}
      if(f.line===5){const numerical=(J(previous+h)-J(previous-h))/(2*h);near(cell(c,'gradient').value,numerical,1e-7);near(cell(c,'gradient-part-0').value,previous-2);near(cell(c,'gradient-part-1').value,2*(2*previous-4));}
      if(f.line===6){near(cell(c,'weight-update').value,previous-rate*(2.5*previous-5));assert.ok(cell(c,'weight-update').note.includes('旧权重'));assert.ok(!c.some(x=>x.id==='after-loss'));}
      if(f.line===7){near(cell(c,'recorded-old-loss').value,J(previous));previous=cell(c,'recorded-update').value;near(v.weight,previous);updates++;}
      if(f.line===9){near(cell(c,'final-loss').value,J(previous));assert.equal(cell(c,'updates').value,5);}
    }assert.equal(updates,5);near(t.result.weight,previous);near(t.result.finalLoss,J(previous));
  }
  const zero=M.run('cs229-gradient',{rate:0,iterations:3});assert.equal(zero.result.weight,0);assert.equal(zero.result.finalLoss,5);assert.equal(zero.result.history.length,3);
  const unstable=M.run('cs229-gradient',{rate:1,iterations:4});assert.deepEqual(unstable.result.history.map(h=>h.next),[5,-2.5,8.75,-8.125]);near(unstable.result.finalLoss,128.14453125);
});

test('logistic loss and score derivative agree with independent negative log likelihood',()=>{
  const sigmoid=z=>1/(1+Math.exp(-z)),L=(z,y)=>-y*Math.log(sigmoid(z))-(1-y)*Math.log1p(-sigmoid(z)),h=1e-5;
  for(const score of [-6,-2,0,2,6])for(const label of [0,1]){const p={score,label},a=at('cs229-logistic',p,1),loss=at('cs229-logistic',p,3),grad=at('cs229-logistic',p,4),final=at('cs229-logistic',p,5);
    near(cell(a.cells,'probability-one').value,sigmoid(score));near(cell(a.cells,'probability-zero').value,1-sigmoid(score));near(cell(loss.cells,'cross-entropy').value,L(score,label));near(cell(grad.cells,'score-gradient').value,(L(score+h,label)-L(score-h,label))/(2*h),1e-7);assert.equal(cell(final.cells,'threshold').value,score>=0?1:0);
    near(sum(loss.cells.filter(c=>c.id!=='cross-entropy').map(c=>c.value)),a.t.result.loss);assert.ok(!grad.cells.some(c=>c.id.includes('weight-update')));
  }
});

test('ridge separates fit and penalty and solves the stationary point of the stated sum-scaled objective',()=>{
  const h=1e-5;
  for(const lambda of [0,1,3,8]){const p={lambda},t=M.run('cs229-ridge',p),w=t.result.weight,L=q=>((q-2)**2+(2*q-4)**2+lambda*q*q)/2,fit=at('cs229-ridge',p,5).cells,gradient=at('cs229-ridge',p,6).cells;
    near(w,10/(5+lambda));near(cell(fit,'fit-loss').value,((w-2)**2+(2*w-4)**2)/2);near(cell(fit,'penalty').value,lambda*w*w/2);near(cell(fit,'objective').value,L(w));near(cell(gradient,'stationary-gradient').value,(L(w+h)-L(w-h))/(2*h),1e-8);near(cell(gradient,'curvature').value,5+lambda);assert.ok(L(w+.01)>L(w));assert.ok(L(w-.01)>L(w));
    near(cell(gradient,'fit-gradient-part-0').value,w-2);near(cell(gradient,'fit-gradient-part-1').value,2*(2*w-4));near(cell(gradient,'regularizer-gradient').value,lambda*w);
  }
  const statistics=at('cs229-ridge',{},2).cells;assert.deepEqual(statistics.map(c=>c.value),[1,4,2,8,5,10]);
});

test('model selection shows every real sample error and retains the unrun final test as null',()=>{
  const predictions={constant:{training:[1/3,1/3,1/3],validation:[1/3,1/3]},curve:{training:[0,1,0],validation:[.75,.75]}},targets={training:[0,1,0],validation:[.4,.4]};
  for(const selection of ['validation','training']){const t=M.run('cs229-validation',{selection}),c=at('cs229-validation',{selection},4).cells;
    for(const name of ['constant','curve'])for(const split of ['training','validation']){const values=predictions[name][split],parts=values.map((x,j)=>(x-targets[split][j])**2);values.forEach((x,j)=>near(cell(c,name+'-'+split+'-prediction-'+j).value,x));parts.forEach((x,j)=>near(cell(c,name+'-'+split+'-error-'+j).value,x));near(cell(c,name+'-'+split+'-mse').value,sum(parts)/parts.length);}
    const final=P.models['cs229-validation'].inspect(t,t.steps.length-1).cells;assert.equal(cell(final,'selected').value,selection==='validation'?'constant':'curve');assert.equal(cell(final,'test-score').value,null);assert.equal(t.result.testScore,null);
    const metric=at('cs229-validation',{selection},3).cells;assert.equal(cell(metric,'training-count').value,3);assert.equal(cell(metric,'validation-count').value,2);assert.ok(!metric.some(c=>c.id.includes('-mse')));
  }
});

test('kmeans checks old-center assignments, null empty means, fixed-assignment SSE and final reassignment separately',()=>{
  const empty=at('cs229-kmeans',{initial:'same',iterations:1},5).cells;assert.equal(cell(empty,'cluster-count-1').value,0);assert.equal(cell(empty,'cluster-mean-1').value,null);assert.equal(cell(empty,'center-update-1').value,0);assert.equal(cell(empty,'cluster-mean-0').value,5);
  const fixed=at('cs229-kmeans',{initial:'same',iterations:1},6).cells;near(cell(fixed,'sse-before').value,182);near(cell(fixed,'sse').value,82);assert.equal(cell(fixed,'nonincrease').value,true);
  const end=at('cs229-kmeans',{initial:'same',iterations:1},9);assert.deepEqual(end.t.result.assignments,[1,1,0,0]);near(cell(end.cells,'final-sse').value,42);assert.notEqual(cell(end.cells,'final-sse').value,end.t.result.history[0].sse);
  for(const initial of ['apart','same'])for(const iterations of [1,2,5]){const t=M.run('cs229-kmeans',{initial,iterations});
    for(let i=0;i<t.steps.length;i++){const f=t.steps[i],c=P.models['cs229-kmeans'].inspect(t,i).cells,v=f.variables;
      if(f.line===4)for(let j=0;j<4;j++){const d0=Math.abs(v.points[j]-v.centers[0]),d1=Math.abs(v.points[j]-v.centers[1]);near(cell(c,'old-distance-'+j+'-0').value,d0);near(cell(c,'old-distance-'+j+'-1').value,d1);assert.equal(cell(c,'old-assignment-'+j).value,d0<=d1?0:1);}
      if(f.line===5)for(let j=0;j<2;j++){const members=v.points.filter((_,k)=>v.assignments[k]===j);assert.equal(cell(c,'cluster-count-'+j).value,members.length);if(members.length)near(cell(c,'center-update-'+j).value,sum(members)/members.length);else assert.equal(cell(c,'cluster-mean-'+j).value,null);}
      if(f.line===6){const objective=v.points.reduce((total,x,j)=>total+(x-v.centers[v.assignments[j]])**2,0);near(cell(c,'sse').value,objective);assert.equal(cell(c,'nonincrease').value,true);}
    }
    if(iterations>=2){const ordered=[...t.result.centers].sort((a,b)=>a-b);assert.deepEqual(ordered,[.5,9.5]);near(t.result.history.at(-1).sse,1);}
  }
});

test('PCA matrix cells, analytic variance and independent reconstruction errors agree across angles and translations',()=>{
  for(const offset of [0,2,5])for(const angle of [0,15,45,90]){const p={offset,angle},t=M.run('cs229-pca',p),rad=angle*Math.PI/180,d=[Math.cos(rad),Math.sin(rad)],base=[-2,-1,1,2],expectedVariance=2.5*(d[0]+d[1])**2,cov=at('cs229-pca',p,4).cells,projection=at('cs229-pca',p,6).cells,last=at('cs229-pca',p,7).cells;
    assert.deepEqual(t.result.mean,[offset,offset]);assert.deepEqual(t.result.centered,base.map(x=>[x,x]));
    for(let i=0;i<2;i++)for(let j=0;j<2;j++){near(cell(cov,'covariance-'+i+'-'+j).value,2.5);base.forEach((x,k)=>near(cell(cov,'covariance-product-'+i+'-'+j+'-'+k).value,x*x));}
    base.forEach((x,i)=>{near(cell(projection,'projection-part-'+i+'-0').value,x*d[0]);near(cell(projection,'projection-part-'+i+'-1').value,x*d[1]);near(cell(projection,'score-'+i).value,x*(d[0]+d[1]));});near(cell(projection,'explained').value,expectedVariance);near(cell(last,'variance-ratio').value,(1+Math.sin(2*rad))/2);
    let error=0;for(const x of base){const projected=x*d[0]+x*d[1];error+=(x-projected*d[0])**2+(x-projected*d[1])**2;}near(cell(last,'discarded-variance').value,error/4);near(cell(last,'total-variance').value,5);
  }
});
