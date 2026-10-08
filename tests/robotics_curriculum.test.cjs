const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../web/robotics-curriculum.js'),data=require('../config/robotics_curriculum.json');
const roads=require('../config/roadmaps.json'),links=require('../config/learning_links.json');
test('24 curated blocks follow existing stages and link to valid companions',()=>{
 assert.deepEqual(data.months.map(m=>m.stage),roads.find(r=>r.id==='robotics').stages.map(s=>s.id));
 const blocks=data.months.flatMap(m=>m.blocks);
 assert.equal(new Set(blocks.map(b=>b.id)).size,24);
 assert.deepEqual(blocks.map(b=>b.week),Array.from({length:24},(_,i)=>i+1));
 for(const m of data.months){assert.equal(m.blocks.length,4);assert.equal(m.gate.length,3);
  for(const b of m.blocks){const source=data.sources[b.source];assert(source);assert.equal(new URL(source.url).protocol,'https:');
   for(const key of ['scope','why','exercise','acceptance','first_step'])assert(b[key]);
   if(b.companion){const link=links.modules.find(x=>x.id===b.companion);assert.equal(link.stage,m.stage);assert(link.lessons.includes(b.lesson));assert(link.labs.includes(b.lab));}
  }
 }
});
test('each first-step task retains its month and source without claiming a course completion',()=>{
 for(const m of data.months)for(const b of m.blocks){const t=C.task(data,b.id);assert.equal(t.stage,m.stage);assert.equal(t.track,'robotics');assert.equal(t.state,'todo');assert.equal(t.evidence,'');assert.equal(t.minutes,45);assert.equal(t.source_url,b.readings[0].url);assert(t.note.includes(b.first_step));assert(t.note.includes(b.readings[0].title));assert(!t.ee_lesson);assert(!t.electronics_unit);}
 assert.equal(C.task(data,'unknown'),null);
});
test('readings and remediation form a usable forward learning path without dead internal links',()=>{
 for(const m of data.months){assert(data.sources[m.lead_source]);
  for(const b of m.blocks){assert(b.intuition&&b.remedy.text);assert(b.readings.length>=1);
   for(const r of b.readings){assert(r.title&&r.note);assert.equal(new URL(r.url).protocol,'https:');if(r.fallback_url)assert.equal(new URL(r.fallback_url).hostname,'github.com');}
   if(b.remedy.block){const prior=C.find(data,b.remedy.block);assert(prior);assert(prior.block.week<b.week);}
  }
 }
 assert(C.find(data,'imitation-experiment').block.optional);
});
test('a first-step task respects a shorter daily budget and keeps its acceptance criteria',()=>{
 for(const [daily,expected] of [[1,1],['15',15],[30,30],[90,45],[480,45],[0,45],[null,45],[NaN,45]]){
  const task=C.task(data,'ros-replay',daily);assert.equal(task.minutes,expected);assert(task.note.includes(C.find(data,'ros-replay').block.acceptance));assert.equal(task.evidence,'');
 }
});
