const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../web/robot-practicums.js'),data=require('../config/robot_practicums.json');
const experiment=()=>({schemaVersion:1,robotId:'g1',sourceCommit:data.robots[0].sourceCommit,program:JSON.stringify({frames:[{time:0,joints:{left_elbow_joint:0}},{time:1,joints:{left_elbow_joint:.08}}]}),trace:[{time:0,values:{left_elbow_joint:0}},{time:1,values:{left_elbow_joint:.08}}]});
const draft=()=>({robotId:'g1',jointId:'left_elbow_joint',q0:'0',q1:'.08',prediction:'局部轴旋转，子链跟随',observation:'q0=0，q1=0.08，记录了手腕跟随',explanation:'父链与关节原点共同确定世界朝向',transfer:'右肘独立复做并对比了轴向',limitations:'运动学计算；未测力或接触',evidenceRef:'original.json / 观察截图',selfReview:true});
test('site links preserve repository subpaths and refuse a learning-site loop',()=>{
 const base=api.baseUrl('https://example.org/robot-radar',data.learningBaseUrl),u=new URL(api.radarUrl(base,{robot:'g1',mode:'joints',part:'left_elbow_link'}));
 assert.equal(u.pathname,'/robot-radar/');assert.equal(u.searchParams.get('robot'),'g1');assert.equal(u.searchParams.get('part'),'left_elbow_link');
 for(const s of ['javascript:alert(1)','https://x.test/?token=private','https://u:p@x.test/'])assert.throws(()=>api.baseUrl(s,data.learningBaseUrl));
 assert.throws(()=>api.baseUrl(data.learningBaseUrl,data.learningBaseUrl));
});
test('actual source-matched kinematic traces are checked while templates remain templates',()=>{
 const x=experiment(),checked=api.inspectExperiment(x,data);assert.equal(checked.trace.count,2);
 x.trace=[];assert.equal(api.inspectExperiment(x,data).trace,null);
 const d=draft();d.rawImport=JSON.stringify(x);assert(!api.review(data.practicums[0],d,data).passed);
});
test('wrong versions, joint names, nonfinite values, ranges and duplicate time are rejected',()=>{
 for(const mutate of [x=>x.sourceCommit='wrong',x=>x.trace[1].values={fake_joint:0},x=>x.trace[1].values.left_elbow_joint=Infinity,x=>x.trace[1].values.left_elbow_joint=100,x=>x.trace[1].time=0]){
  const x=experiment();mutate(x);assert.throws(()=>api.inspectExperiment(x,data));
 }
});
test('selected joint and robot must match imported evidence',()=>{
 const d=draft();d.rawImport=JSON.stringify(experiment());assert(api.review(data.practicums[0],d,data).passed);
 d.jointId='right_elbow_joint';assert(!api.review(data.practicums[0],d,data).passed);
});
test('manual evidence requires prediction, observation, transfer and explicit self-review',()=>{
 assert(api.review(data.practicums[0],draft(),data).passed);
 for(const key of ['prediction','observation','transfer','evidenceRef','selfReview']){const d=draft();d[key]='';assert(!api.review(data.practicums[0],d,data).passed,key);}
 const d=draft();d.q0='';assert(!api.review(data.practicums[0],d,data).passed);
});
test('BOM imports retain pack units, configuration and unknown quantity without filling audits',()=>{
 const reference={configuration:data.so101.configuration,commit:data.so101.sourceCommit,rows:structuredClone(data.so101.rows)};
 assert.deepEqual(api.inspectBom(reference,data).unknown,['fasteners']);
 reference.rows.find(r=>r.id==='usb').unit='piece';assert.throws(()=>api.inspectBom(reference,data));
});
test('BOM audits allow documented gaps, but reject guessed fastener totals and false matches',()=>{
 const rows=Object.fromEntries(data.so101.rows.map(r=>[r.id,{status:r.quantity===null?'unknown':'match',quantity:r.quantity===null?'':String(r.quantity),note:r.quantity===null?'当前文档未核定总数；需逐步核对，采购仍有缺口':''}]));
 assert.equal(api.auditRows(rows,data).issues.length,0);assert.deepEqual(api.auditRows(rows,data).gaps,['Screws / horns / servo cables']);
 rows.fasteners.quantity='20';assert(api.auditRows(rows,data).issues.length);rows.fasteners.quantity='';
 rows.servo.quantity='5';assert(api.auditRows(rows,data).issues.length);rows.servo.status='different';rows.servo.note='另一配置只有五件，需重新锁定配置，不能用于当前 follower';assert.equal(api.auditRows(rows,data).issues.length,0);
});
test('a short observation needs only prediction and finding; extra evidence stays optional',()=>{
 const d={robotId:'g1',jointId:'left_elbow_joint',q0:'',q1:'',prediction:'手腕可能跟着动',finding:'手腕跟随；因为在该关节下游',rows:{}};
 assert(api.reviewNote(data.practicums[0],d,data).passed);
 d.finding='';assert(!api.reviewNote(data.practicums[0],d,data).passed);
 d.finding='观察与解释';d.q1='100';assert(!api.reviewNote(data.practicums[0],d,data).passed);
});
test('partial BOM observations never become a complete audit or fill missing rows',()=>{
 const d={prediction:'可能还缺紧固件总数',finding:'装配文字有分步数量，完整总数仍未核定',rows:{}};
 const checked=api.reviewNote(data.practicums[1],d,data);
 assert(checked.passed);assert.equal(checked.scope,'partial-audit');assert.equal(checked.detail.reviewed,0);assert.deepEqual(d.rows,{});
 d.rows.fasteners={status:'match',quantity:'20',note:'猜测'};assert(!api.reviewNote(data.practicums[1],d,data).passed);
});
test('source-file URLs point to canonical pinned repository paths',()=>{
 for(const robot of data.robots){const u=new URL(robot.sourceUrl);assert.equal(u.origin,'https://github.com');assert(u.pathname.startsWith('/unitreerobotics/unitree_ros/blob/'+robot.sourceCommit+'/robots/'));assert(!u.pathname.includes('/tree/'));}
});
