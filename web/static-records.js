/* Browser-only records. Pure domain operations plus optimistic atomic IndexedDB commits. */
(function(root){
'use strict';
const TABLES=['tasks','sessions','learning_entries','learning_plans','plan_tasks','study_receipts'];
const LABELS={body:'学习收获',question:'想解决的问题',prediction:'预测与依据',procedure:'操作与条件',result:'实际观察',conclusion:'结论与边界',next_step:'下一步'};
const KINDS={activity:'学习动态',note:'阅读笔记',experiment:'实验记录',review:'阶段复盘'};
const STATUS={draft:'草稿',recorded:'已记录',blocked:'待解决'};
const EVIDENCE={reading:'阅读理解',calculation:'计算',simulation:'仿真',hardware:'硬件测量',mixed:'多种证据（分别注明）',activity:'操作记录（非掌握证明）'};
const FIELDS=['title','track','stage','entry_date','kind','status','evidence_type','task_id',...Object.keys(LABELS),'links','learning_route'];
const clone=x=>structuredClone(x),check=(ok,msg)=>{if(!ok)throw Error(msg);};
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
// Python-compatible spacing is retained for legacy automatic IDs and study receipts.
function pyJSON(x,sort=false){return Array.isArray(x)?'['+x.map(v=>pyJSON(v,sort)).join(', ')+']':x&&typeof x==='object'?'{'+(sort?Object.keys(x).sort():Object.keys(x)).map(k=>JSON.stringify(k)+': '+pyJSON(x[k],sort)).join(', ')+'}':JSON.stringify(x);}
async function sha(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
const digest=x=>sha(canonical(x));
const now=old=>new Date(Math.max(Date.now(),old?Date.parse(old)+1:0)).toISOString();
const localDay=x=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x));
function date(value){check(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'日期无效');return value;}
function integer(value,min,max){check((typeof value==='number'||typeof value==='string')&&/^\d+$/.test(String(value).trim()),'请填写有效的整数');const n=Number(value);check(Number.isSafeInteger(n)&&n>=min&&n<=max,'数值超出范围');return n;}
function text(body,name,limit=10000){const s=body[name]??'';check(typeof s==='string'&&s.length<=limit,name+' 内容过长或格式无效');return s.trim();}
function safeURL(value){try{const u=new URL(value);return typeof value==='string'&&['http:','https:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password&&!/\s/.test(value);}catch{return false;}}
function identifier(value){check(typeof value==='string'&&/^[A-Za-z0-9-]{16,80}$/.test(value),'记录标识无效');return value;}
function empty(){return {revision:0,nextTask:1,nextSession:1,tables:Object.fromEntries(TABLES.map(k=>[k,[]]))};}
function snapshot(data){return Object.fromEntries(TABLES.map(k=>[k,clone(data.tables[k]).sort((a,b)=>{const key=k==='plan_tasks'?'task_id':k==='study_receipts'?'key':'id';return typeof a[key]==='number'?a[key]-b[key]:String(a[key]).localeCompare(String(b[key]));})]));}
const exported=data=>({format:'learning-radar-records',version:1,created_at:now(),tables:snapshot(data),curricula:clone(data.curricula||{}),scope:'本浏览器保存的任务、时长、笔记、计划与防重复记录；不含浏览器草稿和未结束计时。'});
class Records{
 constructor(config,store,preview){this.config=config;this.store=store;this.preview=preview;}
 route(body,old){const track=body.track??'robotics',route=body.learning_route??(old?.track===track?old.learning_route:track);check(['robotics','agent'].includes(track)&&route===track,'学习路线与方向不匹配');const road=this.config.roadmaps.find(r=>r.id===track),stage=body.stage??'';check(road&&(!stage||road.stages.some(s=>s.id===stage)),'学习方向或阶段无效');return {track,learning_route:route,stage};}
 plan(data,route){const p=data.tables.learning_plans.filter(p=>p.active&&(!route||p.learning_route===route)).at(-1);if(!p)return null;return {id:p.id,profile:JSON.parse(p.profile),tasks:data.tables.plan_tasks.filter(t=>t.plan_id===p.id).sort((a,b)=>a.day_index-b.day_index).flatMap(pt=>{const t=data.tables.tasks.find(t=>t.id===pt.task_id);return t?[{...t,day_index:pt.day_index,unit_id:pt.unit_id,phase:pt.phase}]:[];})};}
 effective(data){const curricula=data.curricula||{};return {...this.config,roadmaps:this.config.roadmaps.map(road=>curricula[road.id]?{...road,stages:curricula[road.id].months.map(m=>({...road.stages.find(s=>s.id===m.stage),name:m.title,month:m.month}))}:road),...Object.fromEntries(Object.entries(curricula).map(([route,c])=>[route+'_curriculum',c]))};}
 state(data){return {...this.effective(data),tasks:clone(data.tables.tasks),sessions:clone(data.tables.sessions),learning_entries:data.tables.learning_entries.map(e=>({...e,links:JSON.parse(e.links)})).sort((a,b)=>b.entry_date.localeCompare(a.entry_date)||b.updated_at.localeCompare(a.updated_at)),learning_plan:this.plan(data),learning_plans:{robotics:this.plan(data,'robotics'),agent:this.plan(data,'agent')}};}
 async saveJournal(data,body,automatic=false){
  const id=identifier(body.id||crypto.randomUUID()),old=data.tables.learning_entries.find(e=>e.id===id);
  if(old&&automatic)return {...old,links:JSON.parse(old.links)};
  check(!id.startsWith('auto-')||automatic||old,'自动记录标识仅由学习操作生成');
  const title=text(body,'title',300);check(title,'请给这次学习起一个标题');
  const kind=body.kind??'note',status=body.status??'draft',evidence_type=body.evidence_type??'reading';
  check(Object.hasOwn(KINDS,kind)&&Object.hasOwn(STATUS,status)&&Object.hasOwn(EVIDENCE,evidence_type),'记录类型、状态或证据类型无效');
  const task_id=body.task_id?integer(body.task_id,1,Number.MAX_SAFE_INTEGER):null,task=data.tables.tasks.find(t=>t.id===task_id);
  const route=this.route(body,old||task),texts=Object.fromEntries(Object.keys(LABELS).map(k=>[k,text(body,k)]));
  check(status!=='recorded'||Object.values(texts).some(Boolean),'保存为已记录前，请填写学习收获或实验内容');
  check(!task_id||task&&task.learning_route===route.learning_route,'关联任务不存在或不属于当前学习路线');
  const links=body.links??[];check(Array.isArray(links)&&links.length<=20&&links.every(u=>safeURL(u)&&u.length<=2000),'资料链接仅支持不含凭证的 HTTP / HTTPS 地址');
  const values={title,...route,entry_date:date(body.entry_date),kind,status,evidence_type,task_id,...texts,links:JSON.stringify([...new Set(links)])};
  if(old&&FIELDS.every(k=>k==='links'?canonical(JSON.parse(old.links))===canonical(JSON.parse(values.links)):old[k]===values[k]))return {...old,links:JSON.parse(old.links)};
  if(old)check(body.updated_at===old.updated_at,'记录已在其他页面更新，请刷新后重新编辑；本次编辑已保留在浏览器');
  const timestamp=now(old?.updated_at),entry={...values,id,archived:old?.archived??0,created_at:old?.created_at??timestamp,updated_at:timestamp};
  if(old)data.tables.learning_entries.splice(data.tables.learning_entries.indexOf(old),1,entry);else data.tables.learning_entries.push(entry);
  return {...entry,links:JSON.parse(entry.links)};
 }
 async recordTask(data,task,event,minutes=0,{evidence='',note='',timer_seconds,complete=false}={}){
  const timing=timer_seconds!==undefined?`本次专注计时 ${Math.floor(timer_seconds/60)} 分 ${timer_seconds%60} 秒；计入 ${minutes} 分钟。`:`本次登记学习时长 ${minutes} 分钟。`;
  return this.saveJournal(data,{id:'auto-'+await sha(event),title:(complete?'完成任务：':'学习记录：')+task.title.slice(0,290),track:task.track,learning_route:task.learning_route,stage:task.stage||'',entry_date:localDay(now()),kind:'activity',status:'recorded',evidence_type:'activity',task_id:task.id,body:timing+'\n'+(complete?'已提交成果并标记任务完成。':'已结束并保存本次学习，任务仍可继续。')+'\n自动记录操作，不代表知识验收通过。',result:evidence,procedure:note,links:task.source_url?[task.source_url]:[]},true);
 }
 async task(data,body){
  const old=body.id?data.tables.tasks.find(t=>t.id===Number(body.id)):null;if(body.id)check(old,'任务不存在');
  const title=text(body,'title',300);check(title,'请填写任务名称');
  const route=this.route(body,old),state=body.state??'todo',evidence=text(body,'evidence',5000),due=body.due??'';if(due)date(due);
  check(['todo','doing','done'].includes(state),'状态无效');check(state!=='done'||evidence,'完成任务前，请记录学习成果或验证证据');
  const source_url=body.source_url??'';check(!source_url||safeURL(source_url),'资料链接无效');
  const electronics_unit=body.electronics_unit??(route.track==='robotics'?old?.electronics_unit??'':''),ee_lesson=body.ee_lesson??(route.track==='robotics'?old?.ee_lesson??'':'');
  check(typeof electronics_unit==='string'&&(!electronics_unit||route.track==='robotics'&&this.config.electronics_paths.units.some(x=>x.id===electronics_unit)),'电子学习单元无效');
  check(typeof ee_lesson==='string'&&(!ee_lesson||route.track==='robotics'&&this.config.ee_textbook.lessons.some(x=>x.id===ee_lesson)),'电路导学单元无效');
  const t={id:old?.id??data.nextTask++,title,...route,due,minutes:integer(body.minutes??30,1,1440),state,evidence,note:text(body,'note',5000),source_url,created_at:old?.created_at??now(),completed_at:state==='done'?old?.completed_at??now():null,electronics_unit,ee_lesson};
  if(old)data.tables.tasks.splice(data.tables.tasks.indexOf(old),1,t);else data.tables.tasks.push(t);
  if(state==='done'&&old?.state!=='done')await this.recordTask(data,t,'task-done:'+t.id+':'+now(),0,{evidence,complete:true});
  return t;
 }
 async finish(data,body){
  const key=identifier(body.session_key),task_id=integer(body.task_id,1,Number.MAX_SAFE_INTEGER),minutes=integer(body.minutes||0,0,1440),complete=body.complete===true,evidence=text(body,'evidence',5000),note=text(body,'note',1000),seconds=body.timer_seconds;
  if(seconds!==undefined)check(Number.isInteger(seconds)&&seconds>=0&&seconds<=86400&&minutes===Math.floor(seconds/60),'计时秒数与记录分钟不一致');
  check(!complete||evidence,'完成任务前，请填写成果或验证证据');check(complete||minutes||seconds!==undefined,'请填写学习时长，或记录成果并完成任务');
  const fields=[task_id,minutes,complete,evidence,note];if(seconds!==undefined)fields.push(seconds);
  const payload_hash=await sha(pyJSON(fields)),previous=data.tables.study_receipts.find(r=>r.key===key);
  if(previous){check(previous.payload_hash===payload_hash,'此记录已保存，请刷新后再修改');return;}
  const task=data.tables.tasks.find(t=>t.id===task_id);check(task,'任务已删除，请刷新列表');
  if(minutes)data.tables.sessions.push({id:data.nextSession++,task_id,minutes,note,created_at:now(),learning_route:task.learning_route});
  if(complete)Object.assign(task,{state:'done',evidence,completed_at:task.completed_at||now()});else if(evidence)task.evidence=evidence;
  await this.recordTask(data,task,'study:'+key,minutes,{evidence,note,timer_seconds:seconds,complete});data.tables.study_receipts.push({key,payload_hash});
 }
 cleanCurriculum(route,value){
  check(['robotics','agent'].includes(route),'学习路线无效');const base=this.config[route+'_curriculum'];
  check(value&&Array.isArray(value.months)&&value.months.length===base.months.length,'课程阶段不完整');
  const seenStages=new Set();
  const months=value.months.map((month,index)=>{
   const original=base.months.find(m=>m.stage===month.stage);check(original&&!seenStages.has(month.stage),'课程阶段标识无效');seenStages.add(month.stage);
   check(Array.isArray(month.blocks)&&month.blocks.length===original.blocks.length,'学习块不完整');const seenBlocks=new Set();
   const blocks=month.blocks.map((block,i)=>{
    const initial=original.blocks.find(b=>b.id===block.id);check(initial&&!seenBlocks.has(block.id),'学习块标识无效');seenBlocks.add(block.id);
    const edited={...clone(initial)};
    for(const field of ['title','prerequisite','intuition','scope','acceptance']){edited[field]=text(block,field,3000);check(edited[field],'课程内容不能为空');}
    check(Array.isArray(block.sessions)&&block.sessions.length===3&&block.sessions.every(x=>typeof x==='string'&&x.trim()&&x.length<=3000),'每个学习块需要三个练习步骤');edited.sessions=block.sessions.map(x=>x.trim());
    check(Array.isArray(block.readings)&&block.readings.length>=1&&block.readings.length<=20,'每个学习块需有 1–20 个资源');
    edited.readings=block.readings.map(r=>{const title=text(r,'title',300);check(title&&safeURL(r.url)&&r.url.length<=2000,'资源名称或链接无效');return {...clone(initial.readings.find(old=>old.url===r.url)||{}),title,url:r.url,...(r.note?{note:text(r,'note',3000)}:{})};});
    edited.week=index*original.blocks.length+i+1;return edited;
   });
   const title=text(month,'title',300);check(title,'阶段名称不能为空');return {...clone(original),title,month:index+1,blocks};
  });
  return {...clone(base),months};
 }
 validateBackup(backup){
  check(backup?.format==='learning-radar-records'&&backup.version===1,'仅支持动手学学习记录备份 v1');
  check(new TextEncoder().encode(JSON.stringify(backup)).length<=12*1024*1024,'备份超过 12 MB');
  check(backup.curricula===undefined||backup.curricula&&typeof backup.curricula==='object'&&!Array.isArray(backup.curricula),'课程编辑格式无效');
  for(const [r,c] of Object.entries(backup.curricula||{}))this.cleanCurriculum(r,c);
  const tables=backup.tables;check(tables&&canonical(Object.keys(tables).sort())===canonical([...TABLES].sort()),'备份数据表不完整或含未知表');
  for(const name of TABLES){
   const rows=tables[name],cols=this.config.record_schemas[name],pk=cols.find(c=>c.pk).name,seen=new Set();
   check(Array.isArray(rows)&&rows.length<=100000,'备份记录数量或格式无效');
   for(const row of rows){
    check(row&&canonical(Object.keys(row).sort())===canonical(cols.map(c=>c.name).sort()),'备份字段与当前版本不兼容：'+name);
    for(const col of cols){const v=row[col.name];check(v===null?!col.notnull&&!col.pk:col.type==='INTEGER'?Number.isSafeInteger(v):typeof v==='string'&&v.length<=100000,'备份字段格式无效：'+name);}
    check(!seen.has(row[pk]),'备份存在重复标识：'+name);seen.add(row[pk]);
   }
  }
  const tasks=new Map(tables.tasks.map(t=>[t.id,t])),plans=new Map(tables.learning_plans.map(p=>[p.id,p]));
  for(const t of tasks.values()){check(t.id>0&&t.title.trim()&&['robotics','agent'].includes(t.track)&&t.learning_route===t.track&&['todo','doing','done'].includes(t.state)&&t.minutes>=1&&t.minutes<=1440,'任务内容或路线无效');check(t.state!=='done'||t.evidence?.trim(),'已完成任务缺少成果');check(!t.source_url||safeURL(t.source_url),'任务链接无效');if(t.due)date(t.due);}
  for(const s of tables.sessions){check(s.id>0&&s.minutes>=1&&s.minutes<=1440&&['robotics','agent'].includes(s.learning_route),'学习时长记录无效');check(!tasks.has(s.task_id)||tasks.get(s.task_id).learning_route===s.learning_route,'学习时长跨路线关联');}
  for(const e of tables.learning_entries){check(e.title.trim()&&['robotics','agent'].includes(e.track)&&e.learning_route===e.track&&Object.hasOwn(KINDS,e.kind)&&Object.hasOwn(STATUS,e.status)&&Object.hasOwn(EVIDENCE,e.evidence_type)&&[0,1].includes(e.archived),'学习笔记内容无效');date(e.entry_date);const links=JSON.parse(e.links);check(Array.isArray(links)&&links.length<=20&&links.every(safeURL),'笔记链接无效');check(!tasks.has(e.task_id)||tasks.get(e.task_id).learning_route===e.learning_route,'笔记跨路线关联');}
  const active=new Set();
  for(const p of plans.values()){const profile=JSON.parse(p.profile);check(profile&&['robotics','embedded','agent'].includes(profile.goal)&&[0,1].includes(p.active)&&p.learning_route===(profile.goal==='agent'?'agent':'robotics'),'计划配置无效');check(Number.isInteger(profile.minutes)&&profile.minutes>=1&&profile.minutes<=1440&&[7,14].includes(profile.days)&&['zero','basic','project'].includes(profile.level),'计划时间或基础设置无效');date(profile.start);if(p.active){check(!active.has(p.learning_route),'同一路线存在多个当前计划');active.add(p.learning_route);}}
  for(const pt of tables.plan_tasks){check(pt.task_id>0&&plans.has(pt.plan_id)&&pt.day_index>=1&&pt.day_index<=14&&['understand','practice','explain','review'].includes(pt.phase),'计划任务关联无效');check(!tasks.has(pt.task_id)||tasks.get(pt.task_id).learning_route===plans.get(pt.plan_id).learning_route,'计划任务跨路线关联');}
  for(const r of tables.study_receipts){identifier(r.key);check(/^[a-f0-9]{64}$/.test(r.payload_hash),'防重复记录无效');}
  return clone(tables);
 }
 review(data,query){
  const start=date(query.get('start')),end=date(query.get('end')),track=query.get('track')||'all',route=query.get('route');
  check(Date.parse(end)>=Date.parse(start)&&Date.parse(end)-Date.parse(start)<=30*86400000,'复盘时间范围应为1到31天');check(['all','robotics','agent'].includes(track)&&(!route||['robotics','agent'].includes(route)),'学习路线无效');
  const match=r=>(!route||r.learning_route===route)&&(track==='all'||(r.track||r.learning_route)===track),within=d=>d>=start&&d<=end;
  const entries=data.tables.learning_entries.filter(e=>!e.archived&&match(e)&&within(e.entry_date)).sort((a,b)=>a.entry_date.localeCompare(b.entry_date)||a.created_at.localeCompare(b.created_at));
  const tasks=data.tables.tasks.filter(t=>match(t)&&t.completed_at&&within(localDay(t.completed_at))),sessions=data.tables.sessions.filter(s=>match(s)&&within(localDay(s.created_at))),minutes=sessions.reduce((n,s)=>n+s.minutes,0);
  const name=this.config.learning_routes[route||track]?.name||'全部方向';
  const parts=[`# 学习复盘 ${start} 至 ${end}`,name,`实际记录 ${minutes} 分钟 · 完成任务 ${tasks.length} 项 · 学习记录 ${entries.length} 篇`,'以下按已有记录整理，未自动生成经历或学习结论。','## 完成的任务',tasks.map(t=>'- '+t.title+'\n  '+t.evidence.replaceAll('\n','\n  ')).join('\n')||'本期没有标记完成的任务。','## 学习记录'];
  for(const e of entries){parts.push(`### ${e.entry_date} ${e.title}`,`${KINDS[e.kind]} · ${EVIDENCE[e.evidence_type]} · 状态：${STATUS[e.status]}`);for(const [k,l] of Object.entries(LABELS))if(e[k])parts.push('**'+l+'**\n\n'+e[k]);const links=JSON.parse(e.links);if(links.length)parts.push(links.map(u=>'- '+u).join('\n'));}
  if(!entries.length)parts.push('本期尚未保存学习记录。');parts.push('## 下阶段想继续的问题','结合上述记录，补充自己的判断与安排。');return {markdown:parts.join('\n\n')+'\n',minutes,entries:entries.length,completed:tasks.length};
 }
 async apply(data,path,body){
  const [route,qs='']=path.split('?'),t=data.tables;
  if(route==='curriculum'){check(['robotics','agent'].includes(body.route),'学习路线无效');data.curricula??={};if(body.reset===true)delete data.curricula[body.route];else data.curricula[body.route]=this.cleanCurriculum(body.route,body.curriculum);return {ok:true};}
  if(route==='state'||route==='export')return this.state(data);
  if(route==='backup')return exported(data);
  if(route==='journal/review')return this.review(data,new URLSearchParams(qs));
  if(route==='plan/preview')return this.preview(this.effective(data),body);
  if(route==='backup/preview'){const tables=this.validateBackup(body.backup);return {counts:Object.fromEntries(TABLES.map(k=>[k,tables[k].length])),current:Object.fromEntries(TABLES.map(k=>[k,t[k].length])),checksum:await digest(body.backup),revision:await digest({tables:snapshot(data),curricula:data.curricula||{}}),created_at:body.backup.created_at};}
  if(route==='backup/restore'){
   check(body.confirmation==='replace-learning-records','请先预览并确认替换学习记录');const tables=this.validateBackup(body.backup);
   check(body.checksum===await digest(body.backup)&&body.revision===await digest({tables:snapshot(data),curricula:data.curricula||{}}),'文件或当前记录已变化，请重新预览后恢复');
   data.safetyBackup=exported(data);data.tables=tables;data.curricula=Object.fromEntries(Object.entries(body.backup.curricula||{}).map(([r,c])=>[r,this.cleanCurriculum(r,c)]));
   data.nextTask=[...tables.tasks.map(x=>x.id),...tables.sessions.map(x=>x.task_id||0),...tables.plan_tasks.map(x=>x.task_id),...tables.learning_entries.map(x=>x.task_id||0)].reduce((a,b)=>Math.max(a,b),0)+1;data.nextSession=tables.sessions.reduce((a,b)=>Math.max(a,b.id),0)+1;
   return {ok:true,safety_backup:'browser-before-restore'};
  }
  if(route==='tasks')await this.task(data,body);
  else if(route==='tasks/delete')t.tasks=t.tasks.filter(x=>x.id!==Number(body.id));
  else if(route==='study/finish')await this.finish(data,body);
  else if(route==='sessions'){
   const task=t.tasks.find(x=>x.id===Number(body.task_id));check(task,'任务不存在');const minutes=integer(body.minutes,1,1440),note=text(body,'note',1000),id=data.nextSession++;
   t.sessions.push({id,task_id:task.id,minutes,note,created_at:now(),learning_route:task.learning_route});await this.recordTask(data,task,'session:'+id,minutes,{note});
  }else if(route==='journal')return {ok:true,entry:await this.saveJournal(data,body)};
  else if(route==='journal/archive'){
   const entry=t.learning_entries.find(x=>x.id===body.id);check(entry&&typeof body.archived==='boolean','记录或归档状态无效');entry.archived=Number(body.archived);entry.updated_at=now(entry.updated_at);
  }else if(route==='journal/automatic'){
   check(typeof body.source_key==='string'&&/^(basic|divider|lesson|rc|ee|curriculum):[A-Za-z0-9:_-]{1,120}$/.test(body.source_key)&&body.entry&&typeof body.entry==='object','自动学习记录来源无效');
   const payload=Object.fromEntries(FIELDS.filter(k=>Object.hasOwn(body.entry,k)).map(k=>[k,body.entry[k]]));Object.assign(payload,{status:'recorded',entry_date:payload.entry_date||localDay(now())});
   check(['activity','experiment','note'].includes(payload.kind)&&['activity','calculation','reading','simulation'].includes(payload.evidence_type)&&!payload.conclusion&&!payload.prediction,'网页操作不能自动生成硬件测量、个人预测或结论');
   const id='auto-'+await sha(pyJSON([body.source_key,payload],true));return {ok:true,entry:await this.saveJournal(data,{...payload,id},true)};
  }else if(route==='plan'){
   const id=identifier(body.id),result=this.preview(this.effective(data),body),previous=t.learning_plans.find(x=>x.id===id),profile=JSON.stringify(result.profile);
   if(previous){check(canonical(JSON.parse(previous.profile))===canonical(result.profile),'此计划已保存，请重新预览后再创建');return {ok:true};}
   const learning_route=result.profile.goal==='agent'?'agent':'robotics';t.learning_plans.filter(x=>x.learning_route===learning_route).forEach(x=>x.active=0);
   t.learning_plans.push({id,profile,payload_hash:await digest(result),active:1,created_at:now(),learning_route});
   for(const task of result.tasks){const saved=await this.task(data,task);t.plan_tasks.push({plan_id:id,task_id:saved.id,day_index:task.day_index,unit_id:task.unit_id,phase:task.phase});}
  }else if(route==='plan/checkin'){
   const id=Number(body.task_id),task=t.tasks.find(x=>x.id===id);check(task&&t.plan_tasks.some(x=>x.task_id===id),'计划任务不存在');
   const key='plan-checkin-'+id+'-v1';if(task.state!=='done'||t.study_receipts.some(x=>x.key===key))await this.finish(data,{session_key:key,task_id:id,minutes:body.minutes??0,complete:true,evidence:body.evidence??'',note:body.evidence??''});
  }else if(route==='plan/postpone'){
   check(body.goal===undefined||['robotics','agent'].includes(body.goal),'学习路线无效');const plan=this.plan(data,body.goal);check(plan,'还没有学习计划');const ids=new Set(plan.tasks.filter(t=>t.state!=='done').map(t=>t.id));t.tasks.filter(x=>ids.has(x.id)&&x.due).forEach(x=>x.due=new Date(Date.parse(date(x.due))+86400000).toISOString().slice(0,10));
  }else throw Error('此功能不属于公开静态站点');
  return {ok:true};
 }
 async request(path,body){
  if(path==='backup/safety'){const saved=await this.store.read();check(saved.safetyBackup,'还没有恢复前安全备份');return clone(saved.safetyBackup);}
  const readOnly=['state','export','backup','journal/review','plan/preview','backup/preview'].includes(path.split('?')[0]);
  if(body!==undefined)check(body&&typeof body==='object'&&!Array.isArray(body),'请求应为对象');
  for(let attempt=0;attempt<8;attempt++){
   const data=await this.store.read(),revision=data.revision,response=await this.apply(data,path,clone(body??{}));
   if(readOnly)return clone(response);
   if(await this.store.commit(data,revision))return clone(response);
  }
  throw Error('其他页面正在更新记录，请稍后重试');
 }
}
class IndexedRecords{
 constructor(name){this.db=new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('records');request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};request.onerror=()=>reject(Error('浏览器存储不可用，请允许网站保存数据'));request.onblocked=()=>reject(Error('请关闭旧版页面后重新打开'));});}
 async read(){const db=await this.db;return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),req=tx.objectStore('records').get('workspace');req.onsuccess=()=>resolve(req.result??empty());req.onerror=()=>reject(req.error);});}
 async commit(data,revision){const db=await this.db;return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),req=store.get('workspace');let committed=false;req.onsuccess=()=>{if((req.result?.revision??0)!==revision)return;data.revision=revision+1;store.put(data,'workspace');committed=true;};tx.oncomplete=()=>resolve(committed);tx.onabort=()=>reject(Error('记录未保存：浏览器存储空间不足或写入被中断，请先导出备份'));tx.onerror=()=>{};});}
}
const api={Records,IndexedRecords,empty,canonical,pyJSON,sha,exported};
if(typeof module!=='undefined')module.exports=api;else root.StaticRecords=api;
})(globalThis);
