const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/mit2007.js');
const M=require('../web/robotics-foundations-mechanics.js');
const catalog=require('../config/robotics_foundations_mechanics.json');
const ids=catalog.lessons.map(l=>l.modelId);
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
function run(id,changes={}){const params=Object.fromEntries(M[id].controls.map(c=>[c.key,changes[c.key]??c.value]));return {...M[id].run(params),model:id,params};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing cell '+id);return c;};

test('MIT2.007 covers all six actual lessons, immutable default frames and ten concrete experiments',()=>{
  assert.equal(P.courseId,'mit2007');assert.equal(ids.length,6);assert.deepEqual(Object.keys(P.models).sort(),[...ids].sort());let experiments=0;
  for(const id of ids){const provider=P.models[id],t=run(id),original=JSON.stringify(t);freeze(t);assert.ok(provider.intuition.length>15);
    t.frames.forEach((_,i)=>{const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length,id+'/'+i);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,id+'/'+c.id);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
    });assert.deepEqual(view(t,-10),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,Infinity),view(t,t.frames.length-1));assert.equal(JSON.stringify(t),original);
    for(const e of provider.experiments){const a=run(id,e.before),b=run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);
      assert.ok(e.label&&e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id+' accepts unchanged before');assert.equal(e.verify(b,b),false,id+'/'+e.id+' accepts unchanged after');assert.equal(JSON.stringify([a,b]),original);experiments++;
    }
  }assert.equal(experiments,10);
});

test('browser registration is standalone; no inspector can read a future frame, scene or final result',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/mit2007.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.mit2007.courseId,'mit2007');
  for(const id of ids){const t=run(id);
    for(let i=0;i<t.frames.length;i++){const frames=t.frames.map(f=>{const limited={...f};Object.defineProperty(limited,'scene',{get(){throw Error('scene contains future data');}});return limited;}),limited={...t,frames:new Proxy(frames,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame');return Reflect.get(target,key);}})};
      Object.defineProperty(limited,'result',{get(){throw Error('future result');}});assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
    }
  }
});

test('gear cells independently agree with tooth conservation, torque efficiency and power units',()=>{
  const t=run('rf-gears',{driver:20,driven:80,rpm:600,torque:.25,efficiency:.8});
  near(cell(view(t,0),'ratio').value,4);assert.equal(view(t,0).cells.length,1);
  const speed=view(t,1);near(cell(speed,'output-rpm').value,-150);near(cell(speed,'driver-angle').value,90);near(cell(speed,'driven-angle').value,-22.5);near(20*90+80*cell(speed,'driven-angle').value,0);assert.equal(speed.cells.some(c=>c.id==='output-torque'),false);
  const torque=view(t,2);near(cell(torque,'ideal-torque').value,1);near(cell(torque,'output-torque').value,.8);assert.equal(torque.cells.some(c=>c.id==='output-power'),false);
  const power=view(t,3);near(cell(power,'input-omega').value,20*Math.PI);near(cell(power,'output-omega').value,5*Math.PI);near(cell(power,'input-power').value,5*Math.PI);near(cell(power,'output-power').value,4*Math.PI);near(cell(power,'power-loss').value,Math.PI);near(cell(power,'efficiency-power-check').value,4*Math.PI);
  near(cell(view(t,4),'power-ratio').value,.8);assert.ok(cell(power,'output-power').formula.includes('0.8'));assert.ok(cell(power,'output-power').note.includes('不是负的功率'));
  const overdrive=run('rf-gears',{driver:40,driven:20,rpm:600,efficiency:1});near(cell(view(overdrive,0),'ratio').value,.5);near(cell(view(overdrive,1),'output-rpm').value,-1200);near(cell(view(overdrive,3),'power-loss').value,0);assert.ok(cell(view(overdrive,0),'ratio').note.includes('增速'));
});

test('load cells use metres and the same work point, including exact threshold and legal zero mass',()=>{
  const p={mass:2,lever:.05,safety:2,ratio:5,efficiency:.8,motorTorque:.4905,motorRpm:1000},t=run('rf-motor-load',p);
  near(cell(view(t,0),'gravity-force').value,19.62);near(cell(view(t,1),'load-torque').value,.981);near(cell(view(t,2),'required-torque').value,1.962);
  near(cell(view(t,3),'effective-ratio').value,4);near(cell(view(t,3),'available-torque').value,1.962);near(cell(view(t,3),'minimum-motor-torque').value,.4905);assert.equal(view(t,3).cells.some(c=>c.id==='torque-check'),false);
  near(cell(view(t,4),'output-rpm').value,200);near(cell(view(t,4),'torque-margin').value,0);assert.equal(cell(view(t,4),'torque-check').value,true);assert.equal(cell(view(run('rf-motor-load',{...p,motorTorque:.49}),4),'torque-check').value,false);
  const zero=run('rf-motor-load',{mass:0});for(const [i,id] of [[0,'gravity-force'],[1,'load-torque'],[2,'required-torque'],[3,'minimum-motor-torque']])assert.equal(cell(view(zero,i),id).value,0);assert.equal(cell(view(zero,4),'torque-check').value,true);
});

test('fit interval endpoints, half radial values and independent edge requirement match a dimension-chain oracle',()=>{
  const p={hole:10.2,shaft:10,holeTolerance:.05,shaftTolerance:.02,width:25,minimumEdge:7},t=run('rf-fit',p);
  near(cell(view(t,0),'hole-min').value,10.15);near(cell(view(t,0),'hole-max').value,10.25);near(cell(view(t,1),'shaft-min').value,9.98);near(cell(view(t,1),'shaft-max').value,10.02);
  const v=view(t,2);near(cell(v,'clearance-min').value,.13);near(cell(v,'clearance-max').value,.27);near(cell(v,'radial-min').value,.065);near(cell(v,'radial-max').value,.135);assert.equal(cell(v,'fit').value,'总有间隙');assert.equal(v.cells.some(c=>c.id==='edge-check'),false);
  near(cell(view(t,3),'edge-min').value,7.375);near(cell(view(t,3),'edge-margin').value,.375);assert.equal(cell(view(t,4),'edge-check').value,true);
  const changed=run('rf-fit',{...p,width:20});near(cell(view(changed,2),'clearance-min').value,.13);assert.equal(cell(view(changed,2),'fit').value,'总有间隙');assert.equal(cell(view(changed,4),'edge-check').value,false);
  const exact=run('rf-fit',{hole:8,shaft:8,holeTolerance:0,shaftTolerance:0,width:20,minimumEdge:6});assert.equal(cell(view(exact,4),'edge-check').value,true);
});

test('fit distinguishes both contact endpoints, zero interval, positive clearance, interference and transition',()=>{
  const cases=[
    [{hole:8,shaft:8,holeTolerance:0,shaftTolerance:0},'理想零间隙'],
    [{hole:8.1,shaft:8,holeTolerance:.1,shaftTolerance:0},'可能恰好接触，其余有间隙'],
    [{hole:8,shaft:8.1,holeTolerance:0,shaftTolerance:.1},'可能恰好接触，其余有过盈'],
    [{hole:8.2,shaft:8,holeTolerance:.01,shaftTolerance:.01},'总有间隙'],
    [{hole:7.8,shaft:8,holeTolerance:.01,shaftTolerance:.01},'总有过盈'],
    [{hole:8.1,shaft:8,holeTolerance:.1,shaftTolerance:.1},'可能间隙，也可能过盈']
  ];
  for(const [p,expected] of cases){const t=run('rf-fit',p),a=cell(view(t,2),'fit'),b=cell(view(t,4),'fit');assert.equal(a.value,expected);assert.equal(b.value,expected);assert.ok(a.formula.includes(expected));assert.equal(a.inputs.epsilon,1e-10);}
});

test('beam stress and deflection use independent section-modulus and compliance calculations',()=>{
  const p={force:10,length:120,width:30,thickness:4},t=run('rf-beam-design',p),moment=p.force*p.length,I=p.width*p.thickness**3/12,sectionModulus=p.width*p.thickness**2/6,stress=moment/sectionModulus,deflection=p.force*p.length**3/(3*70000*I);
  assert.equal(view(t,0).cells.some(c=>c.id==='moment'),false);near(cell(view(t,1),'moment').value,1200);near(cell(view(t,2),'thickness-cube').value,64);near(cell(view(t,2),'inertia').value,160);near(cell(view(t,3),'outer-fibre').value,2);near(cell(view(t,3),'stress').value,15);near(cell(view(t,3),'stress').value,stress);near(cell(view(t,3),'stress-ratio').value,.25);assert.equal(view(t,3).cells.some(c=>c.id==='deflection'),false);
  near(cell(view(t,4),'deflection-numerator').value,17280000);near(cell(view(t,4),'deflection-denominator').value,33600000);near(cell(view(t,4),'deflection').value,deflection);assert.equal(cell(view(t,5),'pass').value,true);
  const soft=run('rf-beam-design',{thickness:2});assert.equal(cell(view(soft,5),'strength-check').value,true);assert.equal(cell(view(soft,5),'stiffness-check').value,false);assert.equal(cell(view(soft,5),'pass').value,false);
  // Exactly 60 MPa is allowed; stiffness remains a separate failed constraint.
  const boundary=run('rf-beam-design',{force:10,length:120,width:30,thickness:2});near(cell(view(boundary,3),'stress').value,60);assert.equal(cell(view(boundary,5),'strength-check').value,true);assert.equal(cell(view(boundary,5),'stiffness-check').value,false);
});

test('datum coordinates, opposite errors and per-hole radius use distinct worst-case quantities',()=>{
  const p={spacing:50,datumTolerance:.2,hole:4.6,bolt:4},t=run('rf-manufacturing-datums',p),centres=view(t,0);
  assert.deepEqual(centres.cells.slice(0,4).map(c=>c.value),[10,15,60,15]);assert.equal(centres.cells.some(c=>c.id==='guaranteed'),false);
  near(cell(view(t,1),'spacing-error-max').value,.4);near(cell(view(t,1),'spacing-min').value,49.6);near(cell(view(t,1),'spacing-max').value,50.4);
  // Enumerate the four extreme location errors, rather than using the model's 2t expression.
  const gaps=[-.2,.2].flatMap(e1=>[-.2,.2].map(e2=>(60+e2)-(10+e1)));near(Math.min(...gaps),cell(view(t,1),'spacing-min').value);near(Math.max(...gaps),cell(view(t,1),'spacing-max').value);
  near(cell(view(t,2),'hole-lower').value,4.5);near(cell(view(t,2),'diametral-clearance').value,.5);near(cell(view(t,2),'radial-clearance').value,.25);near(cell(view(t,3),'per-hole-margin').value,.05);assert.equal(cell(view(t,3),'guaranteed').value,true);
  near(cell(view(t,4),'outline-width').value,70);near(cell(view(t,4),'outline-height').value,30);assert.deepEqual(view(t,4).cells.filter(c=>c.id.startsWith('center-')).map(c=>c.value),[10,15,60,15]);
  const contact=run('rf-manufacturing-datums',{datumTolerance:.25,hole:4.6});near(cell(view(contact,3),'per-hole-margin').value,0);assert.equal(cell(view(contact,3),'guaranteed').value,true);
  const noGuarantee=run('rf-manufacturing-datums',{datumTolerance:.3,hole:4.6});assert.equal(cell(view(noGuarantee,3),'guaranteed').value,false);assert.ok(cell(view(noGuarantee,3),'guaranteed').note.includes('不代表所有实际零件都装不上'));
});

test('design project has independently derived per-wheel demand, drive speed, beam terms and four checks',()=>{
  const p={mass:3,acceleration:.6,radius:.04,ratio:6,thickness:4},t=run('rf-design-project',p),acc=p.mass*p.acceleration,roll=.03*p.mass*9.81,force=acc+roll,required=force*p.radius/2,available=.03*p.ratio*.8,speed=(600/60)*(2*Math.PI*p.radius)/p.ratio,F=p.mass*9.81/2,I=30*p.thickness**3/12,stress=(F*60)/(30*p.thickness**2/6),deflection=(F*60**3)/(3*70000*I);
  const demand=view(t,1);near(cell(demand,'acceleration-force').value,acc);near(cell(demand,'rolling-force').value,roll);near(cell(demand,'drive-force').value,force);near(cell(demand,'required-torque').value,required);assert.equal(demand.cells.some(c=>c.id==='available-torque'),false);
  const drive=view(t,2);near(cell(drive,'available-torque').value,available);near(cell(drive,'wheel-rpm').value,100);near(cell(drive,'wheel-omega').value,10*Math.PI/3);near(cell(drive,'speed').value,speed);assert.equal(drive.cells.some(c=>c.id==='speed-check'),false);
  const beam=view(t,3);near(cell(beam,'bracket-force').value,F);near(cell(beam,'bracket-moment').value,F*60);near(cell(beam,'inertia').value,I);near(cell(beam,'stress').value,stress);near(cell(beam,'deflection').value,deflection);
  const checks=view(t,4),expected=[available>=required,speed>=.5,stress<=60,deflection<=1];assert.deepEqual(['torque-check','speed-check','strength-check','stiffness-check'].map(id=>cell(checks,id).value),expected);near(cell(checks,'torque-margin').value,available-required);near(cell(checks,'speed-margin').value,speed-.5);near(cell(checks,'strength-margin').value,60-stress);near(cell(checks,'stiffness-margin').value,1-deflection);assert.equal(checks.cells.some(c=>c.id==='pass'),false);
  const final=view(t,5);assert.equal(cell(final,'pass').value,expected.every(Boolean));assert.deepEqual(final.cells.filter(c=>c.id.startsWith('package-file-')).map(c=>c.value),['bracket.dxf','drawing.svg','bom.csv','acceptance.json']);assert.ok(cell(final,'package-file-3').note.includes('没有执行文件写入'));assert.ok(cell(final,'package-file-3').note.includes('实测应留空'));
});

test('static mechanics models keep their finite arithmetic snapshots without invented playback',()=>{
  const counts={'rf-gears':5,'rf-motor-load':5,'rf-fit':5,'rf-beam-design':6,'rf-manufacturing-datums':5,'rf-design-project':6};
  for(const [id,count] of Object.entries(counts)){const t=run(id);assert.equal(t.frames.length,count);for(let i=0;i<count;i++)assert.ok(view(t,i).summary.includes(id==='rf-gears'?'运动学示意角':'静态几何'));assert.equal(t.frames.length,count);}
});
