const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../web/learning-links.js'),E=require('../web/ee-textbook.js');
const map=require('../config/learning_links.json'),book=require('../config/ee_textbook.json'),roads=require('../config/roadmaps.json'),paths=require('../config/electronics_paths.json');
test('every guide, lab and electronics unit has a valid roadmap connection',()=>{
 const stages=new Set(roads.find(r=>r.id==='robotics').stages.map(s=>s.id)),lessons=new Set(book.lessons.map(l=>l.id));
 assert.equal(new Set(map.modules.map(m=>m.id)).size,map.modules.length);
 for(const m of map.modules){assert(stages.has(m.stage));assert(m.lessons.length&&m.labs.length);for(const id of m.lessons)assert(lessons.has(id));for(const id of m.labs)assert(map.labs[id]);}
 assert.deepEqual(new Set(map.modules.flatMap(m=>m.lessons)),lessons);
 for(const u of paths.units){const link=map.units[u.id];assert(link);assert(stages.has(link.stage));for(const id of link.modules)assert(map.modules.some(m=>m.id===id));for(const id of link.lessons)assert(lessons.has(id));assert(map.labs[link.lab]);}
});
test('shared lessons return to their originating stage while unrelated context is rejected',()=>{
 assert.equal(M.context(map,'theory','debug','ros-hardware').stage,'robotics-4');
 assert.equal(M.context(map,'theory','debug','assembly-check').stage,'robotics-3');
 assert.equal(M.context(map,'theory','units','ros-hardware').stage,'robotics-1');
 assert.equal(M.context(map,'lab','interface','system-project').stage,'robotics-6');
 assert.equal(M.context(map,'theory','unknown','system-project'),undefined);
});
test('daily plan links follow the actual task unit; agent plans stay independent',()=>{
 assert.equal(M.support(map,{track:'robotics',unit_id:'dc',day_index:1}).lab,'basics');
 assert.equal(M.support(map,{track:'robotics',unit_id:'capacitors',day_index:4}).lab,'rc');
 assert.equal(M.support(map,{track:'agent',unit_id:'interface'}),null);
 assert.equal(M.support(null,{track:'robotics',unit_id:'dc'}),null);
});
test('contextual drafts use the matching stage and never fabricate completion across modules',()=>{
 const m=map.modules.find(m=>m.id==='signal-chain'),task=M.task(m,book.lessons),note=M.note(m);
 assert.equal(task.stage,'robotics-5');assert.equal(task.evidence,'');assert(!task.ee_lesson);assert(!task.electronics_unit);
 assert.equal(note.stage,'robotics-5');for(const f of ['body','prediction','result','conclusion'])assert.equal(note[f],'');
 const l=book.lessons.find(l=>l.id==='filter');assert.equal(E.taskDraft(l,m.stage).stage,'robotics-5');
 assert.equal(E.noteDraft(l,undefined,m.stage).stage,'robotics-5');
 assert.equal(E.noteDraft(l,{id:7,stage:'robotics-1'},m.stage).stage,'robotics-1');
});
