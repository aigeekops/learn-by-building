const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const P=require('../web/course-inspectors/ros.js');
const M=require('../web/robotics-foundations-ros.js');
const catalog=require('../config/robotics_foundations_ros.json');
const ids=catalog.lessons.map(l=>l.modelId);
function run(id,changes={}){const params=Object.fromEntries(M[id].controls.map(c=>[c.key,changes[c.key]??c.value]));return {...M[id].run(params),model:id,params};}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const view=(t,i)=>P.models[t.model].inspect(t,i);
const cell=(v,id)=>{const c=v.cells.find(c=>c.id===id);assert.ok(c,'missing cell '+id);return c;};
const near=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`);

test('ROS provider covers four actual lessons and checks every immutable default frame',()=>{
  assert.equal(P.courseId,'ros');assert.equal(ids.length,4);assert.deepEqual(Object.keys(P.models).sort(),[...ids].sort());
  for(const id of ids){const t=run(id),original=JSON.stringify(t);freeze(t);assert.ok(P.models[id].intuition.length>15);
    t.frames.forEach((_,i)=>{const v=view(t,i);assert.ok(v.title&&v.summary&&v.cells.length,id+'/'+i);assert.equal(new Set(v.cells.map(c=>c.id)).size,v.cells.length);
      for(const c of v.cells){assert.ok(c.label&&c.formula&&c.note&&Object.keys(c.inputs).length,id+'/'+c.id);assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined);assert.ok(!/undefined|NaN|Infinity/.test(c.formula),c.formula);if(typeof c.value==='number')assert.ok(Number.isFinite(c.value));}
      assert.match(v.summary,/离线算术与内存事件/);assert.match(v.summary,/不等同真实 ROS \/ DDS \/ Gazebo 运行/);
    });assert.deepEqual(view(t,-2),view(t,0));assert.deepEqual(view(t,NaN),view(t,0));assert.deepEqual(view(t,Infinity),view(t,t.frames.length-1));assert.equal(JSON.stringify(t),original);
  }
});

test('all ten before/after experiments run actual controls and reject unchanged pairs',()=>{
  let count=0;
  for(const id of ids)for(const e of P.models[id].experiments){const a=run(id,e.before),b=run(id,e.after),original=JSON.stringify([a,b]);freeze(a);freeze(b);
    assert.ok(e.label&&e.prediction&&e.expectation);assert.notDeepEqual(a.params,b.params);assert.equal(e.verify(a,b),true,id+'/'+e.id);assert.equal(e.verify(a,a),false,id+'/'+e.id);assert.equal(e.verify(b,b),false,id+'/'+e.id);assert.equal(JSON.stringify([a,b]),original);count++;
  }assert.equal(count,10);
});

test('standalone browser registration; inspection cannot read any scene, final result or future frame',()=>{
  const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require.resolve('../web/course-inspectors/ros.js'),'utf8'),sandbox);assert.equal(sandbox.CourseInspectorProviders.ros.courseId,'ros');
  for(const id of ids){const t=run(id);
    for(let i=0;i<t.frames.length;i++){
      const frames=t.frames.map(f=>{const limited={...f};Object.defineProperty(limited,'scene',{get(){throw Error('scene may expose future state');}});return limited;});
      const limited={...t,frames:new Proxy(frames,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key)&&Number(key)>i)throw Error('future frame');return Reflect.get(target,key);}})};
      Object.defineProperty(limited,'result',{get(){throw Error('future final result');}});assert.deepEqual(view(limited,i),view(t,i),id+'/'+i);
    }
  }
});

test('queue snapshots independently expose append, eviction, FIFO consumption and all current destinations',()=>{
  const t=run('rf-ros-pubsub'),queues=[[],[1],[1,2],[2,3],[3],[3,4],[4,5],[5,6],[6],[],[]];assert.equal(t.frames.length,11);
  t.frames.forEach((f,i)=>{assert.deepEqual(f.vars.queue,queues[i]);const v=view(t,i);assert.equal(cell(v,'queue-capacity').value,queues[i].length);assert.equal(cell(v,'conservation').value,true);assert.equal(cell(v,'accounted-count').value,f.vars.sent);
    const states=v.cells.filter(c=>/^message-\d+$/.test(c.id));assert.equal(states.length,f.vars.sent);const all=[...f.vars.queue,...f.vars.received,...f.vars.evicted,...f.vars.lost];assert.equal(new Set(all).size,f.vars.sent);assert.equal(all.length,f.vars.sent);
  });
  const append=view(t,3);assert.deepEqual(cell(append,'append-queue').value,[1,2,3]);assert.equal(cell(append,'overflow').value,true);assert.equal(cell(append,'evicted-sequence').value,1);assert.equal(cell(append,'message-1').value,'缓冲覆盖');assert.equal(cell(append,'message-2').value,'排队');assert.equal(append.cells.some(c=>c.id==='consumed-sequence'),false);
  const consume=view(t,4);assert.equal(cell(consume,'consumed-sequence').value,2);assert.equal(cell(consume,'message-2').value,'已处理');assert.equal(cell(consume,'queue-slot-0').value,3);assert.match(cell(consume,'consume-gate').formula,/mod 3\.0000/);
  const drain=view(t,9);assert.equal(cell(drain,'consumed-sequence').value,6);assert.match(cell(drain,'consume-gate').formula,/发布已结束/);assert.match(cell(drain,'consume-gate').note,/四位小数/);
  assert.deepEqual([1,2,3,4,5,6].map(seq=>cell(view(t,10),'message-'+seq).value),['缓冲覆盖','已处理','缓冲覆盖','缓冲覆盖','已处理','已处理']);
});

test('loss never enters the queue and remains separate from capacity eviction, including total link loss',()=>{
  const t=run('rf-ros-pubsub',{count:6,depth:2,consumeEvery:3,dropEvery:2});
  const loss=view(t,2);assert.equal(cell(loss,'link-loss').value,true);assert.deepEqual(cell(loss,'loss-queue-unchanged').value,[1]);assert.equal(cell(loss,'message-2').value,'人为链路丢失');assert.equal(loss.cells.some(c=>c.id==='append-queue'),false);
  const end=view(t,t.frames.length-1);assert.deepEqual([1,2,3,4,5,6].map(seq=>cell(end,'message-'+seq).value),['已处理','人为链路丢失','已处理','人为链路丢失','已处理','人为链路丢失']);assert.equal(cell(end,'accounted-count').value,6);
  const allLost=run('rf-ros-pubsub',{dropEvery:1});assert.equal(allLost.frames.length,8);const last=view(allLost,7);assert.equal(cell(last,'queue-capacity').value,0);assert.equal(cell(last,'conservation').value,true);assert.ok(last.cells.filter(c=>/^message-\d+$/.test(c.id)).every(c=>c.value==='人为链路丢失'));
});

test('TF coordinates and composite matrix independently agree with a homogeneous transform oracle',()=>{
  const t=run('rf-ros-tf',{yaw:30,tx:-1,ty:.5,px:.8}),a=Math.PI/6,c=Math.cos(a),s=Math.sin(a);
  assert.equal(view(t,0).cells.some(x=>x.id==='world-0'||x.id==='accepted'),false);near(cell(view(t,1),'base-0').value,1);near(cell(view(t,1),'base-1').value,0);
  const rotate=view(t,2);near(cell(rotate,'yaw-radians').value,a);near(cell(rotate,'rotation-0-1').value,-s);near(cell(rotate,'rotation-1-0').value,s);near(cell(rotate,'rotated-0').value,c);near(cell(rotate,'rotated-1').value,s);assert.equal(rotate.cells.some(x=>x.id==='world-0'),false);
  const v=view(t,3),expected=[[c,-s,-1+.2*c],[s,c,.5+.2*s],[0,0,1]],source=[.8,0,1];
  expected.forEach((row,r)=>row.forEach((x,j)=>near(cell(v,`composite-${r}-${j}`).value,x)));
  const oracle=expected.map(row=>row.reduce((acc,x,j)=>acc+x*source[j],0));for(let j=0;j<2;j++){near(cell(v,'world-'+j).value,oracle[j]);near(cell(v,'composed-point-'+j).value,oracle[j]);}
  assert.equal(v.cells.some(x=>x.id==='accepted'),false);assert.match(cell(v,'composite-0-2').note,/T_world_sensor = T_world_base_link × T_base_link_sensor/);
});

test('TF expiry uses inclusive application age threshold and keeps unavailable coordinates null',()=>{
  const fresh=run('rf-ros-tf',{ageMs:300,maxAgeMs:300}),old=run('rf-ros-tf',{ageMs:350,maxAgeMs:300});
  const a=view(fresh,4),b=view(old,4);assert.equal(cell(a,'accepted').value,true);assert.equal(cell(a,'age-margin').value,0);near(cell(a,'usable-0').value,1);near(cell(a,'usable-1').value,1.2);assert.equal(cell(b,'accepted').value,false);assert.equal(cell(b,'age-margin').value,-50);assert.equal(cell(b,'usable-0').value,null);assert.equal(cell(b,'usable-1').value,null);
  for(let j=0;j<2;j++)near(cell(view(fresh,3),'world-'+j).value,cell(view(old,3),'world-'+j).value);assert.match(cell(b,'accepted').note,/不是tf2统一过期定义/);assert.match(cell(b,'age-margin').note,/没有绝对查询时间/);
});

test('replay preserves absolute stamps and payload while the ideal relative schedule scales',()=>{
  const t=run('rf-ros-replay',{durationMs:1200,rate:3,originMs:2000}),stamps=[2000,2300,2600,2900,3200],waits=[0,100,200,300,400];
  assert.deepEqual(view(t,0).cells.filter(c=>c.id.startsWith('input-stamp-')).map(c=>c.value),stamps);assert.equal(view(t,0).cells.some(c=>c.id==='elapsed'),false);assert.match(cell(view(t,0),'input-stamp-4').note,/输入，不表示消息已经发布/);
  for(let j=0;j<5;j++){const v=view(t,j+1);assert.equal(cell(v,'source-stamp').value,stamps[j]);assert.equal(cell(v,'relative-time').value,j*300);assert.equal(cell(v,'elapsed').value,waits[j]);assert.equal(cell(v,'published-stamp').value,stamps[j]);near(cell(v,'payload').value,j/5);if(j)assert.equal(cell(v,'between-messages').value,100);}
  const end=view(t,6);assert.equal(cell(end,'original-duration').value,1200);assert.equal(cell(end,'wall-duration').value,400);assert.equal(cell(end,'unchanged-stamps').value,true);
  const shifted=run('rf-ros-replay',{durationMs:1200,rate:3,originMs:4000});for(let j=1;j<=5;j++){assert.equal(cell(view(shifted,j),'elapsed').value,waits[j-1]);assert.equal(cell(view(shifted,j),'published-stamp').value,stamps[j-1]+2000);}
});

test('bridge stages expose accurate type, single direction, scalar-vs-clock and wall-clock conditions',()=>{
  const cases=[
    [{},'gz.msgs.Clock','rosgraph_msgs/msg/Clock',true,true,true,true,2,true],
    [{mismatch:1},'gz.msgs.Clock','rosgraph_msgs/msg/Clock',false,true,false,false,0,false],
    [{direction:1},'gz.msgs.Clock','rosgraph_msgs/msg/Clock',true,false,false,false,0,false],
    [{type:1},'gz.msgs.Double','std_msgs/msg/Float64',true,true,true,false,0,false],
    [{mismatch:1,useSimTime:0},'gz.msgs.Clock','rosgraph_msgs/msg/Clock',false,true,false,false,1002,true]
  ];
  for(const [params,gz,ros,typeOk,directionOk,accepted,clock,now,ready] of cases){const t=run('rf-ros-bridge',params),initial=view(t,0);assert.equal(cell(initial,'source-type').value,gz);assert.equal(cell(initial,'target-type').value,ros);assert.equal(initial.cells.some(c=>c.id==='accepted'||c.id==='node-now'),false);assert.equal(cell(view(t,1),'type-matches').value,typeOk);assert.equal(view(t,1).cells.some(c=>c.id==='accepted'),false);assert.equal(cell(view(t,2),'direction-matches').value,directionOk);assert.equal(cell(view(t,2),'accepted').value,accepted);assert.equal(view(t,2).cells.some(c=>c.id==='clock-available'),false);assert.equal(cell(view(t,3),'clock-available').value,clock);assert.equal(view(t,3).cells.some(c=>c.id==='node-now'),false);assert.equal(cell(view(t,4),'node-now').value,now);assert.equal(cell(view(t,4),'ready').value,ready);}
  const clockZero=run('rf-ros-bridge',{simSeconds:0}),zero=view(clockZero,4);assert.equal(cell(zero,'node-now').value,0);assert.equal(cell(zero,'ready').value,true);assert.match(cell(zero,'ready').note,/不证明仿真在推进/);assert.match(cell(zero,'node-now').note,/已收到值为0的Clock/);
});

test('existing finite steps and events stay unchanged and never claim target-environment execution',()=>{
  const expected={'rf-ros-pubsub':11,'rf-ros-tf':5,'rf-ros-replay':7,'rf-ros-bridge':5};
  for(const [id,count] of Object.entries(expected)){const t=run(id);assert.equal(t.frames.length,count);for(let i=0;i<count;i++){const v=view(t,i);assert.match(v.summary,/不等同真实 ROS \/ DDS \/ Gazebo 运行/);assert.match(v.summary,/不产生实际消息、学习完成或用时证据/);}assert.equal(t.frames.length,count);}
});
