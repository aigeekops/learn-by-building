const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../web/ee-textbook.js');
const data=require('../config/ee_textbook.json');
test('curriculum has ordered prerequisites, complete six-volume index and valid references',()=>{
 assert.equal(data.volumes.length,6);assert.equal(data.lessons.length,24);
 assert.deepEqual(data.volumes.map(v=>v.chapters.length),[17,15,12,17,11,9]);
 const ids=new Set();
 for(const l of data.lessons){assert(!ids.has(l.id));for(const p of l.prerequisites)assert(ids.has(p));ids.add(l.id);assert(data.stages.some(s=>s.id===l.stage));assert(l.quiz.answer>=0&&l.quiz.answer<l.quiz.options.length);assert(l.sources.length>=2);for(const s of l.sources)assert.equal(new URL(s.url).hostname,'www.allaboutcircuits.com');}
 for(const v of data.volumes)for(const c of v.chapters)for(const id of c.lessons)assert(ids.has(id));
 for(const q of data.questions)assert(ids.has(q.lesson));
});
test('progress counts saved evidence only and does not borrow existing electronics progress',()=>{
 const rows=[{ee_lesson:'units',state:'done',evidence:' '},{electronics_unit:'dc',state:'done',evidence:'旧路线成果'},{ee_lesson:'units',state:'doing'}];
 assert.equal(E.completed(rows,'units'),false);assert.equal(E.next(data.lessons,rows).id,'units');
 rows.push({id:5,ee_lesson:'units',state:'done',evidence:'手算换算结果'});
 assert.equal(E.task(rows,'units').id,5);assert.equal(E.next(data.lessons,rows).id,'circuit');
});
test('task and note templates preserve source association without invented results or minutes',()=>{
 const lesson=data.lessons.find(l=>l.id==='divider'),draft=E.taskDraft(lesson),note=E.noteDraft(lesson,{id:42});
 assert.equal(draft.ee_lesson,'divider');assert.equal(draft.state,'todo');assert.equal(draft.evidence,'');assert(!('electronics_unit' in draft));
 assert.equal(note.task_id,42);assert.equal(note.status,'draft');assert.equal(note.evidence_type,'reading');assert(!('minutes' in note));
 for(const field of ['body','prediction','result','conclusion'])assert.equal(note[field],'');
 assert.equal(note.links[0],draft.source_url);assert(E.matches(lesson,'负载'));assert(E.matches(data.lessons.find(l=>l.id==='switch'),'mosfet'));assert(!E.matches(lesson,'不存在的词'));
});
