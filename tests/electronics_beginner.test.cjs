const test=require('node:test');
const assert=require('node:assert/strict');
const curriculum=require('../config/electronics_beginner.json');
const C=require('../web/electronics-beginner.js');
const B=require('../web/electronics-basics.js');
const D=require('../web/electronics-lab.js');
const R=require('../web/rc-lab.js');
const M=require('../web/electronics-models.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const basic={voltage:5,resistance:330,closed:true,reversed:false,bypass:false};
test('first LED model conserves series voltage and resistor power',()=>{
 const m=B.solve(basic);near(m.current,3/330);near(m.power,m.current**2*330);
 near(2+m.current*330,5);near(B.solve({...basic,resistance:1000}).current,.003);
 assert.equal(B.solve({...basic,resistance:100}).over,true);
});
test('open, reverse and missing limiting element keep explicit boundaries',()=>{
 assert.equal(B.solve({...basic,closed:false}).status,'open');
 assert.equal(B.solve({...basic,reversed:true}).current,0);
 assert.equal(B.solve({...basic,bypass:true}).current,null);
 assert.equal(B.solve({...basic,voltage:1}).current,0);
 for(const bad of [{voltage:Infinity},{voltage:6},{resistance:0},{resistance:NaN}])assert.throws(()=>B.solve({...basic,...bad}));
});
test('beginner curriculum has reachable prerequisites, explained terms and feedback for every answer',()=>{
 const lessons=curriculum.lessons;
 assert.equal(Object.keys(lessons).length,9);
 const visit=(id,path=[])=>{assert.ok(!path.includes(id),'prerequisite cycle');for(const next of lessons[id].prerequisites){assert.ok(lessons[next]);visit(next,[...path,id]);}};
 for(const [id,l] of Object.entries(lessons)){
  assert.ok(l.title&&l.goal&&l.transfer);assert.ok(l.steps.length>=3);assert.ok(l.mistakes.length>=2);visit(id);
  for(const term of l.terms)assert.ok(curriculum.terms[term]?.body);
  for(const step of l.steps)for(const field of ['title','instruction','expected','why','preset'])assert.ok(step[field]);
  const q=l.checkpoint;assert.ok(q.options[q.answer]);assert.equal(q.options.length,q.explanations.length);
  q.options.forEach((_,i)=>{const answer=C.check(curriculum,id,String(i));assert.equal(answer.correct,i===q.answer);assert.ok(answer.explanation);});
 }
});
test('step navigation clamps inputs without inventing completion',()=>{
 assert.equal(C.step(curriculum,'basics',-2),curriculum.lessons.basics.steps[0]);
 assert.equal(C.step(curriculum,'basics',999),curriculum.lessons.basics.steps.at(-1));
 assert.equal(C.step(curriculum,'basics','2'),curriculum.lessons.basics.steps[0]);
 assert.equal(C.step(curriculum,'unknown',0),null);
 for(const invalid of ['',null,false,{},-1,100,1.2])assert.equal(C.check(curriculum,'basics',invalid),null);
 assert.ok(!('completed' in C.check(curriculum,'basics',0)));
});
test('unit conversion retains milli, kilo and micro scales',()=>{
 near(C.convert(9.09,'current'),.00909);near(C.convert(2000,'resistance'),2);near(C.convert(100,'capacitance'),.0001);
 for(const invalid of [-1,NaN,Infinity,'100'])assert.throws(()=>C.convert(invalid,'current'));
 assert.throws(()=>C.convert(1,'voltage'));
});
test('displayed guided examples agree with their teaching models',()=>{
 const p=id=>curriculum.lessons[id].steps.map(s=>s.preset);
 const led=p('basics').map(s=>B.solve({...basic,closed:false,...s}));near(led[1].current,3/330);near(led[2].current,.003);assert.equal(led[3].current,null);
 near(D.solve(p('dc')[0]).vout,2.5);near(D.solve(p('dc')[1]).vout,5/3);
 const meter=p('measurement');near(M.meter(meter[1]).value,10/3);near(M.meter(meter[2]).value,-10/3);near(M.meter(meter[3]).value,5/3000);assert.equal(M.meter(meter[4]).value,2000);
 const driver=p('switching').map(s=>({on:true,rb:1000,load:100,ground:true,...s}));near(M.driver(driver[2]).base,.0052);near(M.driver(driver[2]).current,.048);assert.equal(M.driver(driver[3]).base,null);
 const rc=p('rc');near(R.solve(5,rc[1].r,rc[1].c,rc[1].t).voltage,5*(1-Math.exp(-1)));
 const logic=p('logic');assert.equal(M.bounce(logic[2].delay).count,4);assert.equal(M.bounce(logic[3].delay).count,1);
 const adc=p('interface').map(s=>({voltage:1.5,reference:3.3,threshold:512,ground:true,input:true,...s}));assert.equal(M.sample(adc[0]).code,465);assert.equal(M.sample(adc[2]).code,930);assert.equal(M.sample(adc[3]).valid,false);
 const magnet=p('exploration').map(s=>({turns:100,polarity:1,...s}));for(const [i,s] of magnet.entries()){const emf=M.induction(s.turns,s.previous,s.position,.1,s.polarity).emf;if(!i)near(emf,0);else near(emf,(i===1?-1:1)*(1-Math.exp(-1)));}
});
