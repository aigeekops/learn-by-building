const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const models=require('../web/robotics-foundations-control.js');
const course=require('../config/robotics_foundations_control.json');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('P feedback has analytic first step, steady error, and monotone bounded response',()=>{
  const r=models['rf-p-feedback'].run({target:2,kp:3,dt:0.1}).result;
  close(r.history[1],0.6);close(r.steady,1.5);close(r.steadyError,0.5);
  for(let i=1;i<r.history.length;i++){assert.ok(r.history[i]>=r.history[i-1]);assert.ok(r.history[i]<=r.steady+1e-12);}
  close(models['rf-p-feedback'].run({kp:0}).result.velocity,0);
  const a=models['rf-p-feedback'].run({target:1}).result.history;
  const b=models['rf-p-feedback'].run({target:2}).result.history;
  a.forEach((y,i)=>close(2*y,b[i]));
});
test('PID explicitly updates integral with dt and differentiates measurements',()=>{
  const r=models['rf-discrete-pid'].run().result;
  close(r.terms[0].integral,0.5);close(r.terms[0].derivative,0);close(r.terms[0].u,1.5);
  close(r.terms[1].derivative,-0.4);assert.ok(r.terms[4].derivative>0);
  const pureP=models['rf-discrete-pid'].run({kp:2,ki:0,kd:0}).result;
  pureP.terms.forEach(x=>close(x.u,2*(1-x.y)));
  const halfDt=models['rf-discrete-pid'].run({dt:0.25}).result;
  close(halfDt.terms.at(-1).integral,r.terms.at(-1).integral/2);
  close(halfDt.terms[1].derivative,2*r.terms[1].derivative);
});
test('PI saturation bounds actuator command while conditional integration freezes deeper windup',()=>{
  const r=models['rf-anti-windup'].run().result;
  for(const run of r.runs)for(const x of run){assert.ok(x.u>=-1&&x.u<=1);assert.ok(x.y>=-1&&x.y<=1);}
  assert.ok(r.naiveIntegral>1);close(r.guardedIntegral,0);
  assert.ok(r.runs[0][8].u>r.runs[1][8].u);
  assert.ok(r.runs[1][8].integral<0,'negative error may unwind positive saturation');
  const noI=models['rf-anti-windup'].run({ki:0}).result;
  noI.runs[0].forEach((x,i)=>close(x.y,noI.runs[1][i].y));
});
test('models export standalone pure functions, reject invalid inputs, and render meaningful SVG',()=>{
  assert.ok(course.lessons.length>=3);
  for(const lesson of course.lessons){
    const m=models[lesson.modelId],source=m.run.toString(),isolated=vm.runInNewContext('('+source+')');
    assert.equal(JSON.stringify(isolated()),JSON.stringify(m.run()));
    const p=Object.fromEntries(m.controls.map(c=>[c.key,c.value])),before=JSON.stringify(p);m.run(p);assert.equal(JSON.stringify(p),before);
    for(const c of m.controls){
      for(const value of c.options?[0,c.options.length-1]:[c.min,c.max]){
        const r=m.run({[c.key]:value});assert.ok(r.frames.length>=4);assert.ok(!/NaN|Infinity/.test(JSON.stringify(r)));
        for(const frame of r.frames){const svg=m.render(frame);assert.match(svg,/viewBox=/);assert.match(svg,/aria-label=/);assert.ok(!/NaN|Infinity/.test(svg));}
      }
      assert.throws(()=>m.run({[c.key]:NaN}),/范围/);
      assert.throws(()=>m.run({[c.key]:Infinity}),/范围/);
      assert.throws(()=>m.run({[c.key]:'1'}),/范围/);
      assert.throws(()=>m.run({[c.key]:c.options?c.options.length:c.max+1}),/范围/);
    }
  }
});
