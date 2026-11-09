const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/linear.js');
const M=require('../web/ai-course-models.js');require('../web/foundation-math.js')(M);
const catalog=require('../config/foundation_linear.json');
const ids=[...new Set(catalog.lessons.flatMap(l=>l.demos.map(d=>d.modelId)))];
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const sum=a=>a.reduce((x,y)=>x+y,0),dot=(a,b)=>sum(a.map((x,i)=>x*b[i]));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function view(t,line,occurrence=0){const indices=t.steps.flatMap((s,i)=>s.line===line?[i]:[]);assert.ok(indices.length>occurrence,'missing line '+line);return P.models[t.model].inspect(t,indices[occurrence]);}
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing cell '+id);return c;};

test('linear provider covers six real lessons, all default snapshots and eight actual parameter experiments',()=>{
  assert.equal(P.courseId,'linear');assert.equal(catalog.lessons.length,6);assert.deepEqual(Object.keys(P.models).sort(),ids.sort());let experiments=0;
  for(const id of ids){const m=P.models[id],t=M.run(id),original=JSON.stringify(t);freeze(t);assert.ok(m.intuition.length>15);
    t.steps.forEach((_,i)=>{const v=m.inspect(t,i);assert.ok(v.title&&v.summary&&v.cells.length);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,id+'/'+c.id);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/NaN|undefined/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });assert.deepEqual(m.inspect(t,-10),m.inspect(t,0));assert.deepEqual(m.inspect(t,Infinity),m.inspect(t,t.steps.length-1));assert.equal(JSON.stringify(t),original);
    for(const e of m.experiments){const a=M.run(id,e.before),b=M.run(id,e.after),before=JSON.stringify([a,b]);freeze(a);freeze(b);assert.notDeepEqual(a.params,b.params);assert.ok(e.label&&e.prediction&&e.expectation);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepts unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepts unchanged after');assert.equal(JSON.stringify([a,b]),before);experiments++;}
  }assert.equal(experiments,8);
});

test('browser registration needs no dependencies and inspectors cannot read future snapshots or final result',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/linear.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.linear.courseId,'linear');
  for(const id of ids)for(const params of [{},...(id==='linear-projection'?[{basis:'zero'}]:[])]){const t=M.run(id,params);
    for(let i=0;i<t.steps.length;i++){const limited={...t,steps:new Proxy(t.steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future snapshot');return Reflect.get(target,key);}})};Object.defineProperty(limited,'result',{get(){throw Error('future result');}});assert.doesNotThrow(()=>P.models[id].inspect(limited,i),id+' frame '+i);}
  }
});

test('column contributions and row checks agree coordinate by coordinate for signed inputs',()=>{
  const t=M.run('linear-vectors',{x:-3,y:2}),A=[[1,1],[1,-1]],x=[-3,2];
  assert.deepEqual(view(t,1).cells.slice(0,4).map(c=>c.value),A.flat());
  for(let j=0;j<2;j++){const first=cell(view(t,2),'first-'+j),second=cell(view(t,3),'second-'+j),output=cell(view(t,4),'output-'+j),check=cell(view(t,5),'row-dot-'+j);near(first.value,A[j][0]*x[0]);near(second.value,A[j][1]*x[1]);near(output.value,first.value+second.value);near(check.value,dot(A[j],x));}
  near(cell(view(t,5),'squared-norm').value,26);assert.equal(view(t,2).cells.some(c=>c.id.startsWith('output')),false);
});

test('elimination updates every augmented entry and distinguishes free variables from contradiction',()=>{
  const expected={unique:{row:[0,-2,-2],rankA:2,rankB:2,status:'unique'},many:{row:[0,0,0],rankA:1,rankB:1,status:'many'},none:{row:[0,0,1],rankA:1,rankB:2,status:'none'}};
  for(const [kind,e] of Object.entries(expected)){const t=M.run('linear-elimination',{kind}),r=view(t,4),type=view(t,5);assert.deepEqual(r.cells.map(c=>c.value),e.row);
    for(let j=0;j<3;j++){const c=cell(r,'eliminated-row-'+j);near(c.value,c.inputs.oldEntry-c.inputs.factor*c.inputs.pivotEntry);}
    assert.equal(cell(type,'status').value,e.status);assert.equal(cell(type,'rank-a').value,e.rankA);assert.equal(cell(type,'rank-augmented').value,e.rankB);
    if(kind==='unique'){const solved=view(t,6);near(cell(solved,'solution-x').value,1);near(cell(solved,'solution-y').value,1);near(cell(solved,'equation-check-0').value,2);near(cell(solved,'equation-check-1').value,0);}
    else {const c=cell(view(t,6),'no-unique-vector');assert.equal(c.value,null);assert.ok(c.note.includes(kind==='many'?'自由变量':'矛盾行'));}
  }
});

test('composition starts both paths at the same input and exposes actual noncommutativity',()=>{
  for(const scale of [0,1,2]){const t=M.run('linear-composition',{scale}),x=[1,1],S=[[scale,0],[0,1]],R=[[0,-1],[1,0]],mv=(A,b)=>A.map(row=>dot(row,b)),rs=mv(R,mv(S,x)),sr=mv(S,mv(R,x));
    assert.deepEqual(view(t,3).cells.map(c=>c.value),rs);assert.deepEqual(view(t,4).cells.map(c=>c.value),mv(R,x));const final=view(t,5);assert.deepEqual(final.cells.slice(0,2).map(c=>c.value),sr);assert.deepEqual(final.cells.slice(2).map(c=>c.value),rs.map((v,i)=>v-sr[i]));
  }
});

test('projection cells give the actual closest point and zero direction remains unknown',()=>{
  const t=M.run('linear-projection',{x:-3,y:4}),b=[-3,4],a=[1,1],expected=dot(a,b)/dot(a,a),coefficient=cell(view(t,4),'coefficient');near(coefficient.value,expected);assert.equal(coefficient.inputs.denominator,2);
  const projected=view(t,5).cells.map(c=>c.value),residual=view(t,6).cells.map(c=>c.value);assert.deepEqual(projected,[.5,.5]);assert.deepEqual(residual,[-3.5,3.5]);near(cell(view(t,7),'orthogonality').value,dot(a,residual));
  const dist=q=>sum(b.map((x,i)=>(x-q*a[i])**2));for(const q of [expected-1,expected+1])assert.ok(dist(expected)<dist(q));
  const invalid=M.run('linear-projection',{basis:'zero'}),v=view(invalid,3);assert.equal(invalid.steps.length,3);assert.equal(cell(v,'invalid-direction').value,'invalid_direction');assert.equal(cell(v,'unknown-projection').value,null);assert.ok(v.cells.every(c=>!c.id.startsWith('coefficient')));
});

test('least squares agrees with an independent 2x2 normal-equation solve and exposes all residual terms',()=>{
  const x=[0,1,2],count=3,sx=sum(x),sxx=dot(x,x),det=count*sxx-sx*sx;
  for(const last of [0,2,3]){const t=M.run('linear-least-squares',{last}),y=[1,2,last],sy=sum(y),sxy=dot(x,y),b=(sxx*sy-sx*sxy)/det,w=(count*sxy-sx*sy)/det,predictions=x.map(v=>b+w*v),residual=y.map((v,i)=>v-predictions[i]),final=view(t,6);
    near(cell(view(t,4),'slope').value,w);near(cell(view(t,4),'intercept').value,b);assert.equal(view(t,3).cells.length,8);
    for(let j=0;j<3;j++){near(cell(view(t,5),'prediction-'+j).value,predictions[j]);near(cell(view(t,5),'residual-'+j).value,residual[j]);near(cell(final,'sse-part-'+j).value,residual[j]**2);near(cell(final,'normal-x-part-'+j).value,x[j]*residual[j]);}
    near(cell(final,'sse').value,dot(residual,residual));near(cell(final,'normal-constant').value,0);near(cell(final,'normal-x').value,0);
    const loss=(offset,slope)=>sum(x.map((v,i)=>(y[i]-offset-slope*v)**2));assert.ok(loss(b+.1,w)>loss(b,w));assert.ok(loss(b,w+.1)>loss(b,w));
  }
  const b=cell(view(M.run('linear-least-squares'),4),'intercept');assert.equal(b.value,7/6);assert.ok(b.formula.includes('1.1667'));assert.notEqual(b.value,1.1667);
});

test('eigen iteration reads each actual old vector, then normalizes only at the final recorded step',()=>{
  const t=M.run('linear-eigen',{initial:-2,iterations:4}),steps=t.steps.filter(s=>s.line===3);assert.equal(steps.length,4);
  steps.forEach((s,k)=>{const i=t.steps.indexOf(s),v=P.models['linear-eigen'].inspect(t,i),old=[2**k,-2*.5**k],next=[2**(k+1),-2*.5**(k+1)];assert.deepEqual(v.cells.slice(0,2).map(c=>c.value),next);assert.deepEqual(cell(v,'iteration-0').inputs.previous,old);near(cell(v,'relative-component').value,next[1]/next[0]);assert.equal(v.cells.some(c=>c.id.startsWith('direction')),false);});
  const eigen=view(t,4);assert.deepEqual(eigen.cells.map(c=>c.value),[2,0]);assert.ok(eigen.cells.every(c=>c.note.includes('固定案例')));
  const final=view(t,5),length=Math.hypot(16,-.125);near(cell(final,'length').value,length);near(cell(final,'direction-0').value,16/length);near(cell(final,'direction-1').value,-.125/length);near(cell(final,'unit-length').value,1);
});

test('static geometry inspection keeps existing finite arithmetic snapshots and never invents animation frames',()=>{
  for(const [id,frames] of [['linear-vectors',5],['linear-elimination',6],['linear-composition',5],['linear-projection',6],['linear-least-squares',6]]){const t=M.run(id);assert.equal(t.steps.length,frames);for(let i=0;i<frames;i++)assert.ok(P.models[id].inspect(t,i).summary.includes('静态几何'));assert.equal(t.steps.length,frames);}
});
