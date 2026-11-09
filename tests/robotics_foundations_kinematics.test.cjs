const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const M=require('../web/robotics-foundations-kinematics.js');
const data=require('../config/robotics_foundations_kinematics.json');
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} vs ${b}`);
function finiteTree(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')for(const v of Object.values(value))finiteTree(v);}

test('coordinate transform uses rotation then world translation and inverts in reverse order',()=>{
 const r=M['rf-transform'].run({x:0,y:2,angle:90,tx:1,ty:-1}).result;
 near(r.world[0],-1);near(r.world[1],-1);near(r.recovered[0],0);near(r.recovered[1],2);
 near(r.translatedFirst[0],-1);near(r.translatedFirst[1],1);
});
test('rotation preserves vector distance across independent directions and inverse returns input',()=>{
 for(const angle of [-180,-90,-25,0,45,90,180])for(const point of [[-1,2],[0,0],[2,-1]]){
  const r=M['rf-transform'].run({x:point[0],y:point[1],angle,tx:1.4,ty:-0.7}).result;
  near(Math.hypot(...r.rotated),Math.hypot(...point));r.recovered.forEach((x,i)=>near(x,point[i]));
 }
});
test('forward kinematics treats elbow angle as relative, not absolute',()=>{
 const r=M['rf-forward-kinematics'].run({l1:1,l2:0.5,theta1:90,theta2:-90}).result;
 near(r.elbow[0],0);near(r.elbow[1],1);near(r.tip[0],0.5);near(r.tip[1],1);near(r.determinant,-0.5);
 assert.equal(r.singular,false);
 const straight=M['rf-forward-kinematics'].run({l1:1,l2:0.5,theta1:0,theta2:0}).result;
 near(straight.tip[0],1.5);near(straight.tip[1],0);assert.equal(straight.singular,true);
});
test('analytical position Jacobian matches independent finite differences, and shoulder rotation preserves radius',()=>{
 const params={l1:1.3,l2:0.7,theta1:20,theta2:75},base=M['rf-forward-kinematics'].run(params).result,h=1e-6;
 for(let col=0;col<2;col++){
  const key=col?'theta2':'theta1',delta=h*180/Math.PI;
  const plus=M['rf-forward-kinematics'].run({...params,[key]:params[key]+delta}).result.tip;
  const minus=M['rf-forward-kinematics'].run({...params,[key]:params[key]-delta}).result.tip;
  for(let row=0;row<2;row++)near((plus[row]-minus[row])/(2*h),base.jacobian[row][col],1e-7);
 }
 const turned=M['rf-forward-kinematics'].run({...params,theta1:110}).result;
 near(Math.hypot(...base.tip),Math.hypot(...turned.tip));
});
test('inverse kinematics retains both branches and validates them by forward reconstruction',()=>{
 const model=M['rf-inverse-kinematics'];
 const a=model.run({l1:1,l2:1,x:0,y:1}).result,b=model.run({l1:1,l2:1,x:0,y:1,branch:1}).result;
 assert.equal(a.solutionCount,2);near(a.selected.theta2Degrees,120);near(a.selected.theta1Degrees,30);near(b.selected.theta2Degrees,-120);near(b.selected.theta1Degrees,150);
 for(const point of [[0,1],[1,1],[-1,1],[-1,-1],[1,-1],[0,-1]]){
  const r=model.run({x:point[0],y:point[1]}).result;
  for(const s of r.solutions){near(s.tip[0],point[0]);near(s.tip[1],point[1]);assert.ok(s.residual<1e-9);}
 }
});
test('inverse kinematics does not manufacture a solution outside the annulus',()=>{
 for(const p of [{l1:1,l2:1,x:3,y:0},{l1:2,l2:0.5,x:0.5,y:0}]){
  const r=M['rf-inverse-kinematics'].run(p);assert.equal(r.result.reachable,false);assert.equal(r.result.solutionCount,0);assert.equal(r.result.selected,null);assert.deepEqual(r.result.solutions,[]);
  for(const frame of r.frames)assert.equal(frame.scene.joints,null);
 }
});
test('workspace boundary collapses branches while equal-link origin has infinitely many shoulder angles',()=>{
 const outer=M['rf-inverse-kinematics'].run({x:2,y:0}).result;
 assert.equal(outer.solutionCount,1);assert.equal(outer.singular,true);near(outer.selected.theta2Degrees,0);
 const inner=M['rf-inverse-kinematics'].run({l1:2,l2:1,x:1,y:0}).result;
 assert.equal(inner.solutionCount,1);assert.equal(inner.singular,true);near(Math.abs(inner.selected.theta2Degrees),180);near(inner.selected.residual,0);
 const origin=M['rf-inverse-kinematics'].run({x:0,y:0}).result;
 assert.equal(origin.solutionCount,'无穷多');assert.equal(origin.infiniteSolutions,true);assert.equal(origin.singular,true);near(origin.selected.residual,0);
 // Distinct shoulder angles, with elbow fixed to 180°, both reach the origin.
 for(const theta1 of [0,30,90,170]){const tip=M['rf-forward-kinematics'].run({l1:1,l2:1,theta1,theta2:180}).result.tip;near(tip[0],0);near(tip[1],0);}
});
test('kinematics frames are finite, independently executable, and reject non-finite/out-of-range values',()=>{
 assert.ok(data.lessons.length>=3);
 for(const lesson of data.lessons){
  const model=M[lesson.modelId];assert.ok(lesson.explanation.length>=3);assert.ok(lesson.practice.length>=2);
  const p=Object.freeze(Object.fromEntries(model.controls.map(c=>[c.key,c.value]))),r=model.run(p);
  const standalone=vm.runInNewContext('('+model.run.toString()+')');assert.equal(JSON.stringify(standalone(p)),JSON.stringify(r));
  assert.ok(r.frames.length>=4);finiteTree(r);
  for(const frame of r.frames){assert.ok(frame.title&&frame.text&&frame.code&&frame.vars&&frame.scene);const image=model.render(frame);assert.match(image,/viewBox=/);assert.match(image,/aria-label=/);assert.doesNotMatch(image,/NaN|Infinity/);}
  for(const c of model.controls){const bounds=c.options?[0,c.options.length-1]:[c.min,c.max];for(const value of bounds)finiteTree(model.run({[c.key]:value}));for(const value of [NaN,Infinity,-Infinity,bounds[0]-1,bounds[1]+1,'1'])assert.throws(()=>model.run({[c.key]:value}));}
 }
});
