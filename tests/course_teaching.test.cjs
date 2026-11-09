const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../web/course-teaching-models.js');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'config',name+'.json')));
const blocks=['agent','robotics'].flatMap(route=>read(route+'_curriculum').months.flatMap(m=>m.blocks));
const lessons=[...blocks,...read('ee_textbook').lessons];
test('all retained blocks and EE lessons have mapped, finite interactive teaching',()=>{
 assert.equal(blocks.length,48);assert.equal(lessons.length,72);
 for(const lesson of lessons){
  const t=lesson.teaching;assert.ok(t.map_course_id,lesson.id);assert.ok(M.models[t.model],lesson.id);
  const defaults=M.compute(t);assert.ok(defaults.frames.length>=2,lesson.id);
  for(const control of defaults.controls){
   for(const value of control.options?[0,control.options.length-1]:[control.min,control.max]){
    const result=M.compute(t,{[control.key]:value});
    assert.ok(Number.isFinite(result.exercise.expected),lesson.id);
    assert.ok(M.check(result,String(result.exercise.expected)),lesson.id);
    assert.ok(!M.check(result,''),lesson.id);
    assert.ok(!/NaN|Infinity/.test(JSON.stringify(result)),lesson.id);
   }
  }
 }
});
test('units and physical limits stay explicit',()=>{
 assert.equal(M.compute({model:'circuit',variant:'led'},{voltage:5,resistance:1000}).exercise.expected,3);
 assert.equal(M.compute({model:'circuit',variant:'ohm'},{voltage:5,resistance:1000,closed:1}).exercise.expected,0);
 assert.equal(M.compute({model:'measurement'},{mode:2}).exercise.expected,0);
 assert.equal(M.compute({model:'adc'},{voltage:0}).exercise.expected,0);
 assert.equal(M.compute({model:'adc'},{voltage:3.3,bits:10}).exercise.expected,1023);
 assert.equal(M.compute({model:'rc'},{r:2,c:500}).exercise.expected,1);
 assert.equal(M.compute({model:'opamp'},{input:.5,gain:20}).exercise.expected,3);
});
test('coordinate convention, noise weighting, independent evaluation and loop limits',()=>{
 const transformed=M.compute({model:'transform'},{angle:90,tx:1});assert.equal(transformed.exercise.expected,1);
 const low=M.compute({model:'kalman'},{r:.1}),high=M.compute({model:'kalman'},{r:9});
 assert.ok(low.frames[1].vars.first_gain>high.frames[1].vars.first_gain);
 const imitation=M.compute({model:'imitation'},{bias:2});assert.equal(imitation.frames[1].vars.training_error,0);assert.equal(imitation.frames[2].vars.error,2);
 assert.equal(M.compute({model:'agent'},{budget:1}).exercise.expected,1);
 assert.equal(M.compute({model:'agent'},{budget:5,failure:1}).exercise.expected,2);
 assert.equal(M.compute({model:'dataset'},{frame:4,shift:2}).exercise.expected,0);
});
test('remove unrelated lab associations while keeping stable block IDs',()=>{
 for(const id of ['assembly-review','ros-simulation','ros-replay','state-estimation','dataset-inspection','portfolio'])assert.equal(blocks.find(b=>b.id===id).lab,'',id);
 const resources=JSON.parse(fs.readFileSync(path.join(root,'study-resources/index.json'))).resources;
 assert.equal(resources.length,2);for(const r of resources){assert.ok(r.map_course_ids.length);assert.ok(r.reading_scope);}
});
