const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../web/robotics-curriculum.js');
const roads=require('../config/roadmaps.json');
for(const route of ['robotics','agent'])test(`${route}: each block has beginner steps and a route-correct blank draft`,()=>{
 const data=require(`../config/${route}_curriculum.json`),blocks=data.months.flatMap(m=>m.blocks);
 assert.equal(blocks.length,24);assert.equal(new Set(blocks.map(b=>b.id)).size,24);
 assert.deepEqual(data.months.map(m=>m.stage),roads.find(r=>r.id===route).stages.map(s=>s.id));
 assert(data.orientation&&data.starter);
 for(const m of data.months){assert(data.sources[m.lead_source]);assert(m.prerequisite&&m.main_note);assert.equal(m.gate.length,3);
  for(const b of m.blocks){assert(b.prerequisite&&b.intuition&&b.remedy.text);assert.equal(b.sessions.length,3);assert.equal(b.first_step,b.sessions[0]);
   if(b.remedy.block)assert(C.find(data,b.remedy.block).block.week<b.week);
   for(const r of b.readings)assert.equal(new URL(r.url).protocol,'https:');
   const t=C.task(data,b.id,15);assert.equal(t.track,route);assert.equal(t.stage,m.stage);assert.equal(t.evidence,'');assert.equal(t.state,'todo');assert.equal(t.minutes,15);
  }
 }
});
test('walkthrough expectations agree with the actual teaching models',()=>{
 const led=require('../web/electronics-basics.js'),models=require('../web/electronics-models.js');
 const data=require('../config/robotics_curriculum.json');let checked=0;
 for(const m of data.months)for(const b of m.blocks)for(const s of b.walkthrough?.steps||[]){
  const c=s.model_case;if(!c)continue;
  if(c.kind==='led')assert(Math.abs(led.solve(c.input).current-c.current)<1e-10);
  else if(c.kind==='meter'){const out=models.meter(c.input);assert(out.valid);assert(Math.abs(out.value-c.value)<1e-10);}
  else {
   const out=c.kind==='gate'?models.gate(c.input.kind,c.input.a,c.input.b):c.kind==='bounce'?models.bounce(c.input.delay,c.input.end):models[c.kind](c.input);
   if(typeof c.output!=='object')assert.equal(out,c.output);
   else for(const [key,value] of Object.entries(c.output))typeof value==='number'?assert(Math.abs(out[key]-value)<1e-10):assert.deepEqual(out[key],value);
  }
  checked++;
 }
 assert.equal(checked,14);
});
test('new lessons include feedback, distinct remediation and valid spaced recall',()=>{
 for(const route of ['robotics','agent']){
  const d=require(`../config/${route}_curriculum.json`),blocks=d.months.flatMap(m=>m.blocks);
  for(const b of blocks){assert(b.study_load.core_minutes>0);assert(b.diagnostics.length);
   if(b.recall)assert(C.find(d,b.recall.block).block.week<b.week);
   if(b.walkthrough){const l=b.walkthrough;assert(l.setup.length&&l.terms.length&&l.steps.length&&l.rubric.length);assert(l.practice&&l.answer);for(const step of l.steps)assert(step.instruction&&step.expected&&step.why);}
  }
  assert(blocks[0].walkthrough&&blocks[1].walkthrough);
  if(route==='robotics')assert(blocks.slice(0,8).every(b=>b.walkthrough));
  if(route==='agent')assert.equal(new Set(blocks.map(b=>b.remedy.text)).size,24);
 }
});
