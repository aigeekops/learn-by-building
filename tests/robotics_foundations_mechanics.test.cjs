const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const M=require('../web/robotics-foundations-mechanics.js');
const data=require('../config/robotics_foundations_mechanics.json');
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} vs ${expected}`);
function finiteTree(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')for(const v of Object.values(value))finiteTree(v);}

test('mechanics gear ratio, direction, torque and power agree with a hand-derived case',()=>{
 const r=M['rf-gears'].run({driver:20,driven:80,rpm:600,torque:0.25,efficiency:0.8}).result;
 near(r.ratio,4);near(r.outputRpm,-150);near(r.outputTorque,0.8);
 near(r.inputPower,5*Math.PI);near(r.outputPower,4*Math.PI);near(r.loss,Math.PI);
});
test('mechanics changing gear size trades speed for torque while efficiency affects power',()=>{
 for(const efficiency of [0.5,0.7,1])for(const driven of [20,40,80,120]){
  const r=M['rf-gears'].run({driver:20,driven,efficiency}).result;
  near(r.outputPower/r.inputPower,efficiency);
  assert.ok(r.outputRpm<0);assert.ok(r.loss>=-1e-10);
 }
});
test('load calculation uses metres, includes the design factor, and handles zero mass honestly',()=>{
 const r=M['rf-motor-load'].run({mass:2,lever:0.05,safety:2,ratio:10,efficiency:0.8}).result;
 near(r.gravityForce,19.62);near(r.loadTorque,0.981);near(r.requiredTorque,1.962);near(r.minimumMotorTorque,0.24525);
 assert.equal(M['rf-motor-load'].run({motorTorque:0.24525}).result.passesTorqueCheck,true);
 assert.equal(M['rf-motor-load'].run({motorTorque:0.24}).result.passesTorqueCheck,false);
 const zero=M['rf-motor-load'].run({mass:0}).result;near(zero.requiredTorque,0);near(zero.minimumMotorTorque,0);finiteTree(zero);
});
test('shaft/hole worst-case interval differs from nominal clearance and edge checking is independent',()=>{
 const r=M['rf-fit'].run({hole:10.2,shaft:10,holeTolerance:0.05,shaftTolerance:0.02,width:25}).result;
 near(r.clearanceMin,0.13);near(r.clearanceMax,0.27);near(r.edgeMin,7.375);
 const transition=M['rf-fit'].run({hole:8.1,shaft:8,holeTolerance:0.1,shaftTolerance:0.1}).result;
 near(transition.clearanceMin,-0.1);near(transition.clearanceMax,0.3);assert.match(transition.fit,/可能间隙/);
 const small=M['rf-fit'].run({width:20,minimumEdge:10}).result;
 near(small.clearanceMin,M['rf-fit'].run().result.clearanceMin);assert.equal(small.passesEdgeCheck,false);
});
test('fit distinguishes exact contact from guaranteed positive clearance or interference',()=>{
 assert.equal(M['rf-fit'].run({hole:8,shaft:8,holeTolerance:0,shaftTolerance:0}).result.fit,'理想零间隙');
 assert.equal(M['rf-fit'].run({hole:8.1,shaft:8,holeTolerance:0.1,shaftTolerance:0}).result.fit,'可能恰好接触，其余有间隙');
 assert.equal(M['rf-fit'].run({hole:8,shaft:8.1,holeTolerance:0,shaftTolerance:0.1}).result.fit,'可能恰好接触，其余有过盈');
 assert.equal(M['rf-fit'].run({hole:7.8,shaft:8,holeTolerance:0.01,shaftTolerance:0.01}).result.fit,'总有过盈');
});
test('mechanics module obeys export contract, is pure and standalone at boundary inputs',()=>{
 assert.ok(data.lessons.length>=3);
 for(const lesson of data.lessons){
  const model=M[lesson.modelId];assert.ok(model);assert.ok(lesson.explanation.length>=3);assert.ok(lesson.practice.length>=2);
  const p=Object.freeze(Object.fromEntries(model.controls.map(c=>[c.key,c.value]))),result=model.run(p);
  assert.ok(result.frames.length>=4);finiteTree(result);
  const standalone=vm.runInNewContext('('+model.run.toString()+')');assert.equal(JSON.stringify(standalone(p)),JSON.stringify(result));
  for(const frame of result.frames){assert.ok(frame.title&&frame.text&&frame.code&&frame.vars&&frame.scene);const svg=model.render(frame);assert.match(svg,/viewBox=/);assert.match(svg,/role="img"/);assert.doesNotMatch(svg,/NaN|Infinity/);}
  for(const c of model.controls){for(const value of [c.min,c.max])finiteTree(model.run({[c.key]:value}));for(const value of [NaN,Infinity,-Infinity,c.min-1,c.max+1,'1'])assert.throws(()=>model.run({[c.key]:value}));}
  for(const file of lesson.localFiles)assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',file.path)));
 }
});
