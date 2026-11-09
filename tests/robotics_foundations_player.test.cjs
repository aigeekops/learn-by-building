const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const UI=require('../web/robotics-foundations.js');
const root=path.resolve(__dirname,'..');
const topics=['mechanics','kinematics','control','estimation','ros'];
test('independent answer checks reject missing, malformed and nonfinite values',()=>{
 const v={expected:0,tolerance:.001};for(const x of ['',null,' ','NaN','Infinity','0x0',[],{}])assert.equal(UI.checkAnswer(x,v).correct,false,String(x));
 assert.equal(UI.checkAnswer('0',v).correct,true);assert.equal(UI.checkAnswer('1e-4',v).correct,true);assert.equal(UI.checkAnswer('0.01',v).correct,false);
});
test('step variables stay compact by structural row rather than deep pretty-printing',()=>{
 assert.equal(UI.formatVariable(12),'12');
 assert.equal(UI.formatVariable([1,2,3]),'[1,2,3]');
 assert.equal(UI.formatVariable([['low','lower'],['word']]),'["low","lower"]\n["word"]');
 assert.equal(UI.formatVariable([{id:'a',value:2},{id:'b',value:3}]),'{"id":"a","value":2}\n{"id":"b","value":3}');
 assert.equal(UI.formatVariable({point:[1,2],status:'ok'}),'point: [1,2]\nstatus: "ok"');
});
test('every lesson has all five learning components and standalone runnable code',()=>{
 const ids=new Set();let count=0;
 for(const name of topics){
  const data=JSON.parse(fs.readFileSync(path.join(root,'config','robotics_foundations_'+name+'.json'),'utf8'));
  const models=require('../web/robotics-foundations-'+name+'.js');
  assert.ok(data.lessons.length>=3,name);
  for(const lesson of data.lessons){
   count++;assert.ok(!ids.has(lesson.id));ids.add(lesson.id);
   assert.ok(lesson.explanation.length>=3);assert.ok(lesson.practice.length>=2);assert.ok(lesson.verification.transfer);assert.ok(lesson.sources.length>0);
   const model=models[lesson.modelId];assert.ok(model,lesson.id);
   const params=Object.fromEntries(model.controls.map(c=>[c.key,c.value]));const original=JSON.stringify(params),trace=model.run(params);
   assert.equal(JSON.stringify(params),original,'input unchanged');assert.ok(trace.frames.length>=4);assert.ok(UI.finite(trace));
   assert.ok(trace.boundary);assert.ok(trace.summary);assert.ok(UI.checkAnswer(String(lesson.verification.expected),lesson.verification).correct);
   for(const frame of trace.frames){assert.ok(frame.title&&frame.text&&frame.code);assert.ok(frame.vars&&frame.scene);const svg=model.render(frame);assert.match(svg,/<svg\b/);assert.match(svg,/viewBox=/);assert.match(svg,/aria-label=/);assert.doesNotMatch(svg,/NaN|Infinity/);}
   let executed;vm.runInNewContext(UI.sourceFor(model,params),{console:{log:s=>{executed=JSON.parse(s);}}},{timeout:2000});assert.deepEqual(executed,JSON.parse(JSON.stringify(trace)),lesson.id+' exported code matches browser function');
   const text=UI.exportText(data,lesson,{params,trace},{prediction:'我的独立预测',reason:'计算证据'});assert.match(text,/我的独立预测/);assert.match(text,/计算证据/);assert.ok(!text.includes('undefined'));
  }
 }
 assert.ok(count>=15);
});
test('all public local-file entries point to authored example files',()=>{
 for(const name of topics){const data=JSON.parse(fs.readFileSync(path.join(root,'config','robotics_foundations_'+name+'.json')));for(const l of data.lessons)for(const file of l.localFiles||[]){assert.ok(file.path.startsWith('examples/robotics-foundations/'));assert.ok(fs.statSync(path.join(root,file.path)).isFile());}}
});
test('all advertised parameter endpoints compute finite values and invalid numbers are rejected',()=>{
 for(const name of topics){const models=require('../web/robotics-foundations-'+name+'.js');for(const [id,model] of Object.entries(models)){
  for(const c of model.controls){
   for(const v of c.options?[0,c.options.length-1]:[c.min,c.max]){const trace=model.run({[c.key]:v});assert.ok(UI.finite(trace),id+' '+c.key+' '+v);for(const frame of trace.frames)assert.doesNotMatch(model.render(frame),/NaN|Infinity/);}
   for(const v of [NaN,Infinity,-Infinity,'1'])assert.throws(()=>model.run({[c.key]:v}),undefined,id+' rejects '+String(v));
  }
 }}
});
