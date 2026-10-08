const {test}=require('node:test'),assert=require('node:assert/strict'),model=require('../web/rc-lab.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10);
test('uncharged capacitor starts at zero voltage and maximum current',()=>{const m=model.solve(5,10000,100e-6,0);near(m.voltage,0);near(m.current,.0005);near(m.tau,1)});
test('one and five time constants match exponential charging',()=>{near(model.solve(5,10000,100e-6,1).voltage/5,1-Math.exp(-1));near(model.solve(5,10000,100e-6,5).voltage/5,1-Math.exp(-5))});
test('doubling R or C doubles time for the same fractional voltage',()=>{const v=model.solve(5,10000,100e-6,.7).voltage;near(model.solve(5,20000,100e-6,1.4).voltage,v);near(model.solve(5,10000,200e-6,1.4).voltage,v)});
test('instantaneous circuit satisfies Kirchhoff law and charge definition',()=>{for(const t of [0,.1,1,5,25]){const m=model.solve(5,10000,100e-6,t);near(m.voltage+m.current*10000,5);near(m.charge,100e-6*m.voltage);assert.ok(m.voltage>=0&&m.voltage<=5)}});
