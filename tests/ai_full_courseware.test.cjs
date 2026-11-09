const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/ai-course-models.js');
for(const course of ['cme295','cs336','cs146s']){const extension=require(`../web/ai-${course}-2026.js`);(typeof extension==='function'?extension:extension.register)(M);}
const data=require('../config/ai_courses.json');
const ids=new Set(data.lessons.map(l=>l.id));
function finiteTree(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(Array.isArray(value))value.forEach(finiteTree);else if(value&&typeof value==='object')Object.values(value).forEach(finiteTree);}
test('published 2026 lectures have explanations, demos, exercises, sources and stable original IDs',()=>{
 assert.equal(data.material_year,2026);assert.equal(ids.size,data.lessons.length);
 assert.ok(data.lessons.filter(l=>l.course==='cme295').length>=6);
 assert.ok(data.lessons.filter(l=>l.course==='cs336').length>=17);
 assert.ok(data.lessons.filter(l=>l.course==='cs146s').length>=10);
 for(const id of ['attention','sampling','lora','compute','parallel','dedup','agent','context','tools'])assert.ok(ids.has(id));
 for(const l of data.lessons){
  assert.ok(l.sections?.length>=3,`${l.id} lacks substantive lecture sections`);
  for(const s of l.sections){assert.ok(s.title);assert.ok((Array.isArray(s.explanation)?s.explanation.join(''):s.explanation)?.length>=40,`${l.id} ${s.title} too brief`);}
  assert.ok(l.explanation?.length>=3);assert.ok(l.worked?.length>30);assert.ok(l.practice?.length>=3);
  assert.ok(l.exercise?.prompt&&Number.isFinite(l.exercise.expected)&&l.exercise.solution&&l.exercise.transfer);
  assert.ok(l.sources.some(id=>data.sources[id]?.role==='official'),l.id+' lacks official source');
  l.sources.forEach(s=>assert.ok(data.sources[s],`${l.id} missing source ${s}`));
  l.bridges.forEach(b=>assert.ok(ids.has(b.lesson),`${l.id} missing bridge ${b.lesson}`));
 }
});
test('each published lecture model generates finite, explained code frames at default and boundary controls',()=>{
 for(const l of data.lessons)for(const d of l.demos||[{modelId:l.modelId||l.id}]){
  assert.ok(Object.hasOwn(M.specs,d.modelId),`${l.id} missing ${d.modelId}`);
  const controls=M.specs[d.modelId],cases=[undefined,{}];
  for(const s of controls){if(s.type==='range')cases.push({[s.id]:s.min},{[s.id]:s.max});else cases.push({[s.id]:s.options[0][0]},{[s.id]:s.options.at(-1)[0]});}
  for(const params of cases){
   const t=M.run(d.modelId,params);finiteTree(t);assert.ok(t.steps.length >= (params && Object.keys(params).length ? 1 : 3), d.modelId+' too few steps');
   for(const step of t.steps){assert.ok(step.title&&step.detail&&step.visual.title);assert.ok(['flow','bars','segments'].includes(step.visual.kind));assert.ok(step.line<=t.code.length);if(step.visual.kind==='bars')for(const row of step.visual.rows)assert.ok(Number.isFinite(row.value),d.modelId+' nonnumeric bar');if(step.visual.kind==='segments'){assert.ok(step.visual.capacity>0);for(const part of step.visual.segments)assert.ok(Number.isFinite(part.value)&&part.value>=0);}}
  }
 }
});
test('published catalog links reference their actual lecture pages',()=>{
 for(const c of data.courses)for(const unit of c.published)for(const id of unit.lessons||[]){assert.ok(ids.has(id),`${c.id} ${unit.unit}: ${id}`);assert.equal(data.lessons.find(l=>l.id===id).course,c.id);}
});
