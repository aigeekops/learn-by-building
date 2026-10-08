const {test}=require('node:test');
const assert=require('node:assert/strict');
const progress=require('../web/learning-paths.js');
const data=require('../config/electronics_paths.json');
test('route references are valid, distinct and full book index covers 1–30',()=>{
 const ids=new Set(data.units.map(u=>u.id));assert.equal(ids.size,data.units.length);
 for(const p of data.paths){const all=[...p.core,...p.elective,...p.extension];assert.equal(new Set(all).size,all.length);assert.ok(all.every(id=>ids.has(id)))}
 assert.deepEqual([...new Set(data.units.flatMap(u=>u.experiments))].sort((a,b)=>a-b),Array.from({length:30},(_,i)=>i+1));
});
test('robotics counts priority outcomes only, sharing evidence across routes',()=>{
 const robot=data.paths.find(p=>p.id==='robotics'),embedded=data.paths.find(p=>p.id==='embedded');
 const tasks=[{electronics_unit:'dc',state:'done',evidence:'我的计算与解释'},{electronics_unit:'logic',state:'done',evidence:'我的状态表'},{electronics_unit:'measurement',state:'done',evidence:''},{electronics_unit:'dc',state:'done',evidence:'重复任务'}];
 assert.deepEqual(progress.summary(robot,tasks),{completed:1,total:4});
 assert.equal(progress.summary(embedded,tasks).completed,2);
 assert.equal(progress.summary(robot,[]).completed,0);
});
test('reopened tasks lose completion and unrelated tasks do not count',()=>{
 const robot=data.paths[0];assert.equal(progress.summary(robot,[{electronics_unit:'dc',state:'doing',evidence:'旧成果'},{state:'done',evidence:'另一个任务'}]).completed,0);
});
