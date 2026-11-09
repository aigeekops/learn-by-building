const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const models=require('../web/robotics-foundations-estimation.js');
const course=require('../config/robotics_foundations_estimation.json');
const close=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('paired measurement noise cancels but fixed bias remains; theoretical SE uses variance assumptions',()=>{
  const r=models['rf-noisy-measurements'].run({sigma:2,bias:1,n:4}).result;
  close(r.mean,11);close(r.assumedMeanSd,1);close(r.sampleVariance,10/3);
  const shifted=models['rf-noisy-measurements'].run({bias:-1}).result;
  close(shifted.mean,9);
  assert.throws(()=>models['rf-noisy-measurements'].run({n:3}),/必须/);
});
test('Kalman fuses precision, scales gain with R, and preserves covariance limits',()=>{
  const m=models['rf-kalman-update'];
  const r=m.run({mean:2,variance:2,q:1,measurement:7,r:3}).result;
  close(r.predictedMean,3);close(r.predictedVariance,3);close(r.gain,0.5);close(r.posteriorMean,5);close(r.posteriorVariance,1.5);
  const a=m.run({r:1}).result,b=m.run({r:9}).result;assert.ok(a.gain>b.gain);
  const certain=m.run({variance:0,q:0}).result;close(certain.gain,0);close(certain.posteriorVariance,0);close(certain.posteriorMean,certain.predictedMean);
  for(const q of [0,1,4])for(const p of [0,4,16])for(const r of [0.25,4,16]){
    const result=m.run({q,variance:p,r}).result;
    assert.ok(result.gain>=0&&result.gain<1);assert.ok(result.posteriorVariance>=0);assert.ok(result.posteriorVariance<=result.predictedVariance+1e-12);
    close(result.posteriorVariance,(1-result.gain)*result.predictedVariance);
  }
});
test('mismatched model is checked against independent truth and gating propagates prediction',()=>{
  const m=models['rf-filter-assumptions'],r=m.run({q:0,r:9,spike:0}).result;
  assert.ok(r.mse>r.measurementMSE,'smoothing is not an unconditional accuracy improvement');
  const g=m.run({spike:8,gate:1}).result;
  assert.ok(g.gateCount>0);
  for(const s of g.samples){if(s.rejected){close(s.mean,s.predictedMean);close(s.variance,s.predictedVariance);assert.ok(s.nis>9);}else assert.ok(s.nis<=9);}
  assert.ok(m.run({q:4}).result.samples[0].gain>m.run({q:0}).result.samples[0].gain);
  close(r.mse,r.samples.reduce((sum,s)=>sum+s.error**2,0)/r.samples.length);
});
test('estimation model functions are standalone, deterministic and finite at all control edges',()=>{
  assert.ok(course.lessons.length>=3);
  for(const lesson of course.lessons){
    const m=models[lesson.modelId],isolated=vm.runInNewContext('('+m.run.toString()+')');
    assert.equal(JSON.stringify(isolated()),JSON.stringify(m.run()));
    const p=Object.fromEntries(m.controls.map(c=>[c.key,c.value])),before=JSON.stringify(p);m.run(p);assert.equal(JSON.stringify(p),before);
    for(const c of m.controls){
      for(const value of c.options?[0,c.options.length-1]:[c.min,c.max]){
        const r=m.run({[c.key]:value});assert.ok(r.frames.length>=4);assert.ok(!/NaN|Infinity/.test(JSON.stringify(r)));
        for(const frame of r.frames){const svg=m.render(frame);assert.match(svg,/viewBox=/);assert.match(svg,/aria-label=/);assert.ok(!/NaN|Infinity/.test(svg));}
      }
      assert.throws(()=>m.run({[c.key]:NaN}),/范围/);assert.throws(()=>m.run({[c.key]:Infinity}),/范围/);
      assert.throws(()=>m.run({[c.key]:'1'}),/范围/);assert.throws(()=>m.run({[c.key]:c.options?c.options.length:c.max+1}),/范围/);
    }
  }
});
