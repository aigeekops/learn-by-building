const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../web/electronics-lab.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('loaded divider obeys Ohm and Kirchhoff laws',()=>{
 const p={vin:5,r1:10000,r2:10000,rl:10000,loaded:true},m=model.solve(p);
 near(m.vout,5/3);near(m.input,m.vout/p.r2+m.load);near(p.vin,m.input*p.r1+m.vout);
 near(m.rout,5000);near(m.idle,.00025);
});
test('disconnect removes load current and restores open voltage',()=>{
 const m=model.solve({vin:5,r1:10000,r2:10000,rl:100,loaded:false});
 near(m.vout,2.5);near(m.load,0);near(m.drop,0);
});
test('three initial observations coincide, checks discriminate causes',()=>{
 for(const c of ['load','supply','resistor'])near(model.solve(model.scenario(c)).vout,5/3);
 near(model.solve(model.scenario('load',true)).vout,2.5);
 near(model.solve(model.scenario('supply',true)).vout,5/3);
 near(model.solve(model.scenario('resistor',true)).vout,5/3);
 assert.notEqual(model.scenario('supply').vin,model.scenario('load').vin);
 assert.notEqual(model.scenario('resistor').r1,model.scenario('load').r1);
});
test('100 ohms improves loaded voltage but increases idle current 100 times',()=>{
 const large=model.solve({vin:5,r1:10000,r2:10000,rl:10000}),small=model.solve({vin:5,r1:100,r2:100,rl:10000});
 near(small.vout,500/201);near(small.idle/large.idle,100);assert.ok(small.drop<large.drop);
});
test('finite control limits, zero input and invalid resistance',()=>{
 for(const vin of [0,.1,12])for(const r1 of [100,50000])for(const r2 of [100,50000])for(const rl of [100,100000]){
  const m=model.solve({vin,r1,r2,rl});assert.ok(m.vout>=0&&m.vout<=vin);assert.ok(Number.isFinite(m.drop));
 }
 for(const value of [0,-1,NaN,Infinity])assert.throws(()=>model.solve({vin:5,r1:value,r2:10000,rl:10000}));
});
