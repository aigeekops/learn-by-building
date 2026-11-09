const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const P=require('../web/learning-app/personal-schedule.js');
const root=path.resolve(__dirname,'..');
const catalog=[['first',[120,240]],['second',[90]],['third',[180]],['fourth',[120]]].map(([id,loads])=>({id,label:id,title:id,prereq:'从最小例子开始',sources:[['课程','https://example.test/'+id]],study_load:{core_minutes:999,lesson_minutes:Object.fromEntries(loads.map((n,i)=>[id+'-'+i,n]))},units:loads.map((_,i)=>({lesson_id:id+'-'+i,title:'第 '+(i+1)+' 讲',goal:'解释原理',output:'独立复现'}))}));
const config={roadmaps:[{id:'agent',stages:[{id:'agent-basics'}]}]};
const profile={id:'schedule-test-route-12345678',name:'测试路线',goal:'agent',courseIds:catalog.map(c=>c.id),startCourseId:'first',minutes:100,days:7,start:'2026-11-09',progression:'sequential',device:'browser'};
const plan=changes=>P.preview(config,catalog,{...profile,...changes});

test('fixed lecture workloads respond to daily time without stretching to fill the horizon',()=>{
  const slow=plan({minutes:30}),medium=plan({minutes:60}),fast=plan({minutes:360});
  assert.equal(slow.summary.study_minutes,180);assert.equal(medium.summary.study_minutes,360);assert.equal(fast.summary.study_minutes,750);
  assert.equal(slow.coverage[0].status,'partial');assert.equal(medium.coverage[0].status,'full');assert.equal(medium.coverage[1].status,'not-scheduled');
  assert(fast.coverage.every(c=>c.status==='full'));assert(fast.summary.free_minutes>0);
  assert.deepEqual(slow.coverage.map(c=>c.estimated_minutes),fast.coverage.map(c=>c.estimated_minutes));
  assert.deepEqual(plan({days:366}).coverage.map(c=>c.estimated_minutes),slow.coverage.map(c=>c.estimated_minutes));
});

test('a day shares its budget between lectures and an unfinished lecture resumes exactly',()=>{
  const result=plan({days:2,minutes:180});
  assert.deepEqual(result.tasks.map(t=>[t.day_index,t.unit_id,t.minutes]),[[1,'curriculum:personal-first--0',120],[1,'curriculum:personal-first--1',60],[2,'curriculum:personal-first--1',180]]);
  assert.equal(result.coverage[0].status,'full');assert.equal(result.coverage[0].full_lessons,2);
  for(const day of result.calendar)assert.equal(day.task_indexes.reduce((n,i)=>n+result.tasks[i].minutes,0)+day.free_minutes,180);
});

test('coverage distinguishes full, partial and untouched lectures and reserves weekly review',()=>{
  const result=plan();
  assert.deepEqual(result.coverage.map(c=>c.status),['full','full','partial','not-scheduled']);
  assert.equal(result.coverage[2].scheduled_minutes,150);assert.equal(result.coverage[2].remaining_minutes,30);
  assert.equal(result.coverage[2].full_lessons,0);assert.equal(result.coverage[2].partial_lessons,1);
  assert.equal(result.tasks.at(-1).phase,'review');assert.equal(result.calendar[6].study_minutes,0);assert.equal(result.calendar[6].review_minutes,100);
  assert.equal(result.summary.study_minutes,600);assert.equal(result.summary.review_minutes,100);
  assert.equal(result.coverage[3].scheduled_minutes,0);
  for(const row of result.coverage)assert.equal(row.scheduled_minutes+row.remaining_minutes,row.estimated_minutes);
});

test('starting course and current-course mode retain excluded courses with an explicit reason',()=>{
  const later=plan({startCourseId:'second',minutes:360});
  assert.equal(later.coverage[0].status,'not-scheduled');assert.match(later.coverage[0].reason,/起点之前/);
  assert.equal(later.tasks[0].unit_id,'curriculum:personal-second--0');
  const current=plan({progression:'current',minutes:360});
  assert.equal(current.coverage[0].full_lessons,2);assert.equal(current.coverage[0].status,'full');
  assert(current.tasks.every(t=>t.unit_id.startsWith('curriculum:personal-first--')));
  assert(current.coverage.slice(1).every(c=>c.status==='not-scheduled'&&c.reason.includes('只安排当前课程')));
});

test('minute boundaries, one-day and 366-day calendars keep budgets and dates honest',()=>{
  const tiny=plan({minutes:1,days:1});assert.equal(tiny.tasks[0].minutes,1);assert.equal(tiny.coverage[0].partial_lessons,1);
  const leap=plan({minutes:1440,days:366,start:'2027-11-09'});
  assert.equal(leap.calendar.length,366);assert.equal(leap.calendar.at(-1).due,'2028-11-08');
  assert.deepEqual(leap.tasks.filter(t=>t.phase==='review').map(t=>t.day_index),Array.from({length:52},(_,i)=>(i+1)*7));
  assert.equal(leap.summary.study_minutes+leap.summary.review_minutes+leap.summary.free_minutes,366*1440);
  assert.equal(new Set(leap.tasks.filter(t=>t.phase!=='review').map(t=>t.unit_id)).size,5);
  for(const change of [{days:0},{days:367},{minutes:0},{minutes:1.5},{start:'2026-02-30'},{progression:'unknown'},{device:'unknown'}])assert.throws(()=>plan(change));
});

test('the preview lists all course states and the actual calendar day count',()=>{
  const source=fs.readFileSync(path.join(root,'web/learning-app/workspace.js'),'utf8');
  const start=source.indexOf('  function personalPreviewMarkup('),end=source.indexOf('  function renderPersonalRoutes(',start);
  const context={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')};
  vm.createContext(context);vm.runInContext(source.slice(start,end)+'\nglobalThis.render=personalPreviewMarkup;',context);
  const html=context.render(plan(),profile);
  assert.match(html,/完整排入 2 门 · 部分排入 1 门 · 未排入 1 门/);
  assert.match(html,/完整排入 0 \/ 1 讲，另 1 讲只排入一部分/);assert.match(html,/余下 30 分钟/);
  assert.match(html,/查看全部 7 天的逐日安排/);assert.match(html,/每讲预计学习量/);
  assert.match(html,/data-course="fourth" data-coverage="not-scheduled"/);
});

test('preview is read-only and adoption keeps the same minute allocations and idempotent tasks',async()=>{
  const {execFileSync}=require('node:child_process'),R=require('../web/static-records.js');
  const publicConfig=JSON.parse(execFileSync('python3',['-c','import json; from scripts.build_static import public_configuration; print(json.dumps(public_configuration()))'],{cwd:root,maxBuffer:8*1024*1024}));
  const store={value:R.empty(),async read(){return structuredClone(this.value);},async commit(value,revision){if(this.value.revision!==revision)return false;this.value=structuredClone({...value,revision:revision+1});return true;}};
  const api=new R.Records(publicConfig,store,()=>{});
  const source=fs.readFileSync(path.join(root,'web/learning-app/data-engine.js'),'utf8').replace('__LEARNING_APP_PUBLIC_CONFIG__',JSON.stringify(publicConfig)).replace('__LEARNING_APP_COURSE_LIST__',JSON.stringify(catalog)).replace("  addEventListener('message',async event=>{","  globalThis.methods=methods;\n  addEventListener('message',async event=>{");
  const context={LBBPersonalSchedule:P,StaticPlan:{},StaticRecords:{Records:function(){return api;},IndexedRecords:function(){return store;}},URL,URLSearchParams,location:{search:'?integration-qa=schedule-test',href:'https://example.test/learning/'},navigator:{},addEventListener(){}};
  vm.createContext(context);vm.runInContext(source,context);
  const before=structuredClone(store.value),preview=await context.methods.preview(profile);assert.deepEqual(store.value,before);
  const first=await context.methods.adopt(profile),snapshot=await context.methods.snapshot();
  assert.equal(snapshot.tasks.length,preview.tasks.length);assert.equal(snapshot.sessions.length,0);assert.equal(snapshot.entries.length,0);
  for(const [i,t] of preview.tasks.entries()){
    const saved=snapshot.tasks.find(x=>x.id===first.taskIds[i]);
    assert.equal(saved.due,t.due);assert.equal(saved.minutes,t.minutes);assert.equal(saved.title,t.title);assert.equal(saved.state,'todo');assert.equal(saved.evidence,'');
  }
  const retry=await context.methods.adopt(profile);assert.deepEqual(retry.taskIds,first.taskIds);assert.equal((await context.methods.snapshot()).tasks.length,preview.tasks.length);
});
