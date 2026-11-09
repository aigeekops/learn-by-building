'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {modelIds,catalog,run}=require('../scripts/check_course_inspectors.cjs');
const P=require('../web/course-inspectors/arduino.js');
const ids=modelIds('arduino');
const trace=(id,p={})=>run('arduino',id,p);
const end=t=>t.steps.at(-1).variables;
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(t,i,id)=>{const c=view(t,i).cells.find(c=>c.id===id);assert.ok(c,'missing '+id);return c;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
function freeze(x){if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

test('all eight catalog demos expose their 32 immutable actual snapshots',()=>{
  assert.equal(P.courseId,'arduino');assert.equal(catalog('arduino').lessons.length,8);
  assert.deepEqual(Object.keys(P.models).sort(),ids.slice().sort());let frames=0;
  for(const lesson of catalog('arduino').lessons)for(const demo of lesson.demos){
    const t=trace(demo.modelId),saved=JSON.stringify(t);freeze(t);
    assert.ok(P.models[t.model].intuition.length>20);
    t.steps.forEach((_,i)=>{const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length);
      assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length);assert.notEqual(c.value,undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);assert.match(c.note,/四位小数/);}
      assert.match(v.summary,/不代表开发板编译、接线、仿真器或实物验收/);frames++;
    });
    assert.deepEqual(view(t,-1),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,Infinity),view(t,3));assert.equal(JSON.stringify(t),saved);
  }assert.equal(frames,32);
});

test('browser registration and current-frame inspection require no final result, scene or future',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/arduino.js'),'utf8'),sandbox);
  assert.equal(sandbox.CourseInspectorProviders.arduino.courseId,'arduino');
  for(const id of ids){const t=trace(id);t.steps.forEach((_,i)=>{
    const steps=t.steps.map(step=>{const s={title:step.title,variables:step.variables};for(const key of ['scene','visual'])Object.defineProperty(s,key,{get(){throw Error('scene/visual read');}});return s;});
    const limited={model:t.model,params:t.params,steps:new Proxy(steps,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame read');return Reflect.get(target,key);}})};
    for(const key of ['result','scene'])Object.defineProperty(limited,key,{get(){throw Error('final/scene read');}});
    assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
  });}
});

test('12 actual experiments check concrete outcomes and reject unchanged or corrupted results',()=>{
  const key={'arduino-led':'resistorWatt','arduino-input':'raw','arduino-adc':'voltage','arduino-pwm':'idealAverage','arduino-timing':'executions','arduino-debounce':'firstConfirmed','arduino-actuator':'pulseMicroseconds','arduino-project':'pwm'};
  let count=0;
  for(const id of ids)for(const e of P.models[id].experiments){
    const a=trace(id,e.before),b=trace(id,e.after),saved=JSON.stringify([a,b]);freeze(a);freeze(b);
    assert.ok(e.label&&e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);
    assert.equal(e.verify(a,a),false,id+'/'+e.id);assert.equal(e.verify(b,b),false,id+'/'+e.id);
    const damaged=JSON.parse(JSON.stringify(b)),s=end(damaged),k=key[id];s[k]=s[k]===null?1:s[k]+1;
    assert.equal(e.verify(a,damaged),false,id+'/'+e.id+' accepted corruption');assert.equal(JSON.stringify([a,b]),saved);count++;
  }assert.equal(count,12);
});

test('LED current and resistor power follow the remaining 3V with explicit A/mA units',()=>{
  const t=trace('arduino-led'),i=(5-2)/220;
  close(cell(t,1,'resistor-voltage').value,3);close(cell(t,2,'current-amp').value,i);close(cell(t,2,'current-milliamp').value,i*1000);
  close(cell(t,3,'resistor-power').value,3*i);close(cell(t,3,'power-crosscheck').value,9/220);
  assert.equal(view(t,0).cells.some(c=>c.id==='current-amp'),false);
});

test('released unbiassed input remains null while a closed button still connects ground',()=>{
  const floating=trace('arduino-input',{pressed:'no',pullup:'no'}),closed=trace('arduino-input',{pressed:'yes',pullup:'no'});
  assert.equal(cell(floating,1,'raw-level').value,null);assert.equal(cell(floating,2,'logical-pressed').value,null);
  assert.equal(cell(floating,3,'known').value,false);assert.equal(cell(floating,3,'led-output').value,'未知');
  assert.equal(end(closed).raw,0);assert.equal(end(closed).logicalPressed,true);assert.equal(end(closed).known,true);
});

test('ADC endpoint interpolation uses 1023 while ideal quantization uses 1024',()=>{
  const endpoint=trace('arduino-adc',{raw:1023,reference:5}),middle=trace('arduino-adc',{raw:512,reference:5});
  close(cell(endpoint,1,'voltage').value,5);close(cell(endpoint,2,'lsb').value,5/(2**10));
  close(cell(endpoint,2,'endpoint-step').value,5/(2**10-1));assert.notEqual(end(endpoint).lsb,5/1023);
  close(cell(endpoint,3,'source-voltage').value,10);close(cell(endpoint,3,'source-step').value,10/1024);
  close(cell(middle,1,'voltage').value,2560/1023);assert.match(cell(endpoint,3,'source-step').note,/不是总误差/);
});

test('PWM time fractions add to a period and time average is independent of frequency',()=>{
  const t=trace('arduino-pwm',{code:128,frequency:500}),fast=trace('arduino-pwm',{code:128,frequency:1000}),full=trace('arduino-pwm',{code:255});
  close(cell(t,1,'duty').value,128/255);close(cell(t,2,'on-time').value,128/(255*500));
  close(cell(t,2,'off-time').value,127/(255*500));close(cell(t,2,'period-check').value,1/500);
  close(cell(t,3,'ideal-average').value,640/255);close(end(fast).idealAverage,end(t).idealAverage);
  close(end(fast).onTime,end(t).onTime/2);close(end(full).offTime,0);close(end(full).idealAverage,5);
});

test('millis difference survives one wrap and only executes once without backlog catchup',()=>{
  const modulus=2**32,last=modulus-100;
  for(const [elapsed,due] of [[100,false],[200,true],[600,true]]){
    const t=trace('arduino-timing',{interval:200,elapsed}),now=(last+elapsed)%modulus;
    close(cell(t,0,'now').value,now);close(cell(t,1,'unsigned-difference').value,(now-last+modulus)%modulus);
    assert.equal(cell(t,2,'due').value,due);assert.equal(cell(t,3,'executions').value,due?1:0);
    assert.equal(cell(t,3,'next-last').value,due?now:last);
  }
  assert.match(cell(trace('arduino-timing'),1,'unsigned-difference').note,/小于整个/);
});

test('debounce confirms a single event only at sampled times after the final candidate change',()=>{
  const short=trace('arduino-debounce',{quiet:20}),long=trace('arduino-debounce',{quiet:30});
  assert.deepEqual(end(short).history.map(h=>h.stable),[1,1,1,1,0,0]);assert.deepEqual(end(long).history.map(h=>h.stable),[1,1,1,1,1,0]);
  assert.deepEqual(cell(short,1,'candidate-4').value,{candidate:0,since:15,age:40-15});
  assert.equal(cell(short,1,'stable-4').value,0);assert.equal(cell(long,1,'stable-4').value,1);
  assert.equal(cell(short,3,'raw-falling-edges').value,2);assert.equal(cell(short,2,'press-count').value,1);
  assert.equal(cell(short,3,'first-confirmed').value,40);assert.equal(cell(long,3,'first-confirmed').value,70);
  assert.match(view(short,1).summary,/一次处理完整6个采样/);
});

test('actuator pulse mapping is separate from quadratic driver conduction loss',()=>{
  const t=trace('arduino-actuator'),loaded=trace('arduino-actuator',{current:1}),turned=trace('arduino-actuator',{angle:180});
  close(cell(t,1,'pulse').value,1500);close(cell(t,2,'voltage-drop').value,.2);close(cell(t,2,'conduction-power').value,.1);
  close(end(loaded).pulseMicroseconds,1500);close(end(loaded).conductionWatt,.4);close(end(turned).pulseMicroseconds,2000);close(end(turned).conductionWatt,.1);
  assert.match(cell(t,2,'conduction-power').note,/不含启动、堵转/);
});

test('project rejects invalid, disabled and too-close observations with inclusive 15cm threshold',()=>{
  const rows=[
    [{sensor:'timeout',enable:'no'},null,false,0,'传感器超时'],
    [{distance:20,enable:'no'},20,false,0,'人工关闭'],
    [{distance:10},10,false,0,'障碍过近'],
    [{distance:15},15,true,100,'允许本例运行']
  ];
  for(const [p,distance,allowed,pwm,reason] of rows){const t=trace('arduino-project',p);assert.equal(cell(t,0,'distance').value,distance);assert.equal(cell(t,2,'run').value,allowed);assert.equal(cell(t,3,'pwm').value,pwm);assert.equal(cell(t,3,'reason').value,reason);}
  assert.equal(cell(trace('arduino-project',{sensor:'timeout'}),2,'clearance').value,null);
});
