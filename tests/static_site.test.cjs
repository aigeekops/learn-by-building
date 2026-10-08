const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const R=require('../web/static-records.js'),P=require('../web/static-plan.js');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'static-radar-test-'));
execFileSync(process.env.PYTHON||'python3',['scripts/build_static.py','--output',path.join(tmp,'site')],{cwd:root});
const config=JSON.parse(fs.readFileSync(path.join(tmp,'site/public-config.json')));
process.on('exit',()=>fs.rmSync(tmp,{recursive:true,force:true}));
class Store{
 constructor(){this.value=R.empty();}
 async read(){return structuredClone(this.value);}
 async commit(value,revision){await Promise.resolve();if(this.value.revision!==revision)return false;this.value=structuredClone({...value,revision:revision+1});return true;}
}
function setup(){const store=new Store();return {store,api:new R.Records(config,store,P.preview)};}
const plan={id:'test-plan-123456789',goal:'robotics',level:'zero',minutes:30,days:7,start:'2026-10-07',progression:'current'};
const note={id:'journal-test-123456',title:'测试记录',track:'robotics',entry_date:'2026-10-07',kind:'note',status:'recorded',evidence_type:'reading',body:'真实观察',links:[]};

test('build works without private files and supports GitHub project subpaths',()=>{
 const files=fs.readdirSync(path.join(tmp,'site'));for(const name of ['server.py','data','config','internal-pages.js'])assert.ok(!files.includes(name));
 for(const name of ['sources','settings','items','runs','ai_usage'])assert.ok(!(name in config));
 const html=fs.readFileSync(path.join(tmp,'site/index.html'),'utf8'),app=fs.readFileSync(path.join(tmp,'site/app.js'),'utf8');
 assert.ok(!/(src|href)="\//.test(html));assert.ok(!html.includes('internal-pages'));
 assert.ok(!/function (feed|sources|settings|sourceModal)\(/.test(app));
 assert.ok(html.includes('./static-bootstrap.js'));assert.ok(html.includes('./course-editor.js'));
 for(const link of html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g))assert.ok(fs.existsSync(path.join(tmp,'site',link[1])),link[1]);
});
test('plan output matches existing Python pacing including current-block and edge budgets',()=>{
 const bodies=[];for(const goal of ['robotics','agent'])for(const minutes of [1,15,45,1440])for(const progression of ['current','sequential'])bodies.push({...plan,goal,minutes,days:14,progression});
 const output=execFileSync(process.env.PYTHON||'python3',['-c','import json,sys; from radar.plans import preview; print(json.dumps([preview(b) for b in json.load(sys.stdin)],ensure_ascii=False))'],{cwd:root,input:JSON.stringify(bodies),maxBuffer:8*1024*1024});
 JSON.parse(output).forEach((result,i)=>assert.deepEqual(P.preview(config,bodies[i]),result));
});
test('separate browser stores and concurrent requests preserve records without shared data',async()=>{
 const {api,store}=setup(),other=setup().api;
 await Promise.all(Array.from({length:5},(_,i)=>api.request('tasks',{title:'任务'+i,track:i%2?'agent':'robotics'})));
 assert.equal((await api.request('state')).tasks.length,5);assert.equal((await other.request('state')).tasks.length,0);
 assert.equal(new Set(store.value.tables.tasks.map(t=>t.id)).size,5);
 await assert.rejects(api.request('settings',{}),/公开静态/);
});
test('timed completion is atomic and idempotent, sub-minute evidence stays in seconds',async()=>{
 const {api,store}=setup();await api.request('tasks',{title:'电路观察',track:'robotics'});
 const body={session_key:'test-session-12345678',task_id:1,minutes:0,timer_seconds:32,complete:false};
 await api.request('study/finish',body);await api.request('study/finish',body);
 assert.equal(store.value.tables.sessions.length,0);assert.equal(store.value.tables.learning_entries.length,1);assert.match(store.value.tables.learning_entries[0].body,/32 秒/);
 await assert.rejects(api.request('study/finish',{...body,minutes:1,timer_seconds:60}),/已保存/);
 const before=structuredClone(store.value);
 await assert.rejects(api.request('study/finish',{session_key:'other-session-123456',task_id:1,minutes:2,complete:true}),/成果/);
 assert.deepEqual(store.value,before);
});
test('notes reject stale edits and automatic retries never undo edits or archiving',async()=>{
 const {api}=setup();const {entry}=await api.request('journal',note);
 const edited=await api.request('journal',{...entry,body:'已更新'});
 await assert.rejects(api.request('journal',{...entry,body:'旧页面内容'}),/其他页面/);
 const event={source_key:'curriculum:test:view',entry:{...note,id:undefined,kind:'activity',evidence_type:'activity'}};
 const auto=(await api.request('journal/automatic',event)).entry;
 await api.request('journal',{...auto,body:'用户补充'});await api.request('journal/archive',{id:auto.id,archived:true});
 const retried=(await api.request('journal/automatic',event)).entry;assert.equal(retried.body,'用户补充');assert.equal(retried.archived,1);
 assert.equal(edited.entry.body,'已更新');
});
test('plan edits and course edits preserve completed history and persist through backup',async()=>{
 const {api,store}=setup();await api.request('plan',plan);const active=(await api.request('state')).learning_plan;
 await api.request('plan/checkin',{task_id:active.tasks[0].id,minutes:3,evidence:'第一次成果'});
 const course=structuredClone(config.robotics_curriculum);course.months[0].title='我的电子阶段';course.months[0].blocks.reverse();course.months[0].blocks[0].title='修改后的课程';
 await api.request('curriculum',{route:'robotics',curriculum:course});
 const preview=await api.request('plan/preview',{...plan,start_block:course.months[0].blocks[0].id});assert.match(preview.tasks[0].title,/修改后的课程/);
 await api.request('plan',{...preview.profile,id:'second-plan-12345678'});
 const state=await api.request('state');assert.equal(state.tasks.find(t=>t.id===active.tasks[0].id).evidence,'第一次成果');assert.equal(state.sessions.length,1);assert.equal(state.robotics_curriculum.months[0].title,'我的电子阶段');
 const saved=await api.request('backup'),check=await api.request('backup/preview',{backup:saved});
 await api.request('backup/restore',{backup:saved,...check,confirmation:'replace-learning-records'});
 assert.equal((await api.request('backup/safety')).tables.sessions.length,1);
 assert.equal((await api.request('state')).robotics_curriculum.months[0].title,'我的电子阶段');
 await api.request('curriculum',{route:'robotics',reset:true});assert.equal((await api.request('state')).robotics_curriculum.months[0].title,config.robotics_curriculum.months[0].title);assert.equal(store.value.tables.sessions.length,1);
});
test('backup restore fails on stale previews, invalid routes or links without changing data',async()=>{
 const {api,store}=setup();await api.request('journal',note);const saved=await api.request('backup'),preview=await api.request('backup/preview',{backup:saved});
 await api.request('tasks',{title:'预览后的任务',track:'agent'});const before=structuredClone(store.value);
 await assert.rejects(api.request('backup/restore',{backup:saved,...preview,confirmation:'replace-learning-records'}),/已变化/);assert.deepEqual(store.value,before);
 const invalid=structuredClone(saved);invalid.tables.learning_entries[0].links='["javascript:alert(1)"]';await assert.rejects(api.request('backup/preview',{backup:invalid}),/链接无效/);
 assert.deepEqual(store.value,before);
});
test('legacy Python backups preserve receipts when imported into browser storage',async()=>{
 const source=`import json,tempfile\nfrom pathlib import Path\nfrom radar import core,plans,study,backup\nwith tempfile.TemporaryDirectory() as tmp:\n core.DATA=Path(tmp);core.init()\n plans.create(dict(id='legacy-plan-12345678',goal='robotics',level='zero',minutes=30,days=7,start='2026-10-07'))\n study.finish(dict(session_key='legacy-session-12345678',task_id=1,minutes=2,complete=True,evidence='实测',note=''))\n print(json.dumps(backup.export(),ensure_ascii=False))`;
 const backup=JSON.parse(execFileSync(process.env.PYTHON||'python3',['-c',source],{cwd:root,maxBuffer:2*1024*1024}));
 const {api}=setup(),preview=await api.request('backup/preview',{backup});await api.request('backup/restore',{backup,...preview,confirmation:'replace-learning-records'});
 await api.request('study/finish',{session_key:'legacy-session-12345678',task_id:1,minutes:2,complete:true,evidence:'实测',note:''});assert.equal((await api.request('state')).sessions.length,1);
});
