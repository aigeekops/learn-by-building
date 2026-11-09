
(() => {
  'use strict';
  const config=__LEARNING_APP_PUBLIC_CONFIG__
,courseList=__LEARNING_APP_COURSE_LIST__,byId=Object.fromEntries(courseList.map(p=>[p.id,p]));
  const qa=new URLSearchParams(location.search).get('integration-qa');
  const namespace=qa?'learn-by-building-integration-qa:'+qa:'learn-by-building-static:'+new URL('.',location.href).pathname;
  const records=new StaticRecords.Records(config,new StaticRecords.IndexedRecords(namespace),StaticPlan.preview);
  const api=(path,body)=>records.request(path,body);
  const markerFor=id=>'[个人路线 '+id;
  const courseOf=t=>t.note?.match(/^\[课程id ([a-z0-9-]+)\]$/m)?.[1]||null;
  function routeOf(t){return t.note?.match(/^\[个人路线 ([A-Za-z0-9-]{16,80})(?: \/ [^\n\]]+)?\]$/m)?.[1]||null;}
  async function snapshot(){const s=await api('state');return {tasks:s.tasks,sessions:s.sessions,entries:s.learning_entries};}
  const StaticSite={adoptTasks:async tasks=>{
    for(let attempt=0;attempt<8;attempt++){
      const data=await records.store.read(),revision=data.revision,ids=[];
      for(const body of tasks){const marker=body.note.split('\n')[0],old=data.tables.tasks.find(t=>t.note.startsWith(marker+'\n'));if(old){if(old.learning_route!==body.learning_route)throw Error('已有任务的所属路线不同');ids.push(old.id);}else ids.push((await records.task(data,body)).id);}
      if(await records.store.commit(data,revision))return ids;
    }
    throw Error('其他页面正在保存，请重试。');
  }};
    function clean(body){
    if(!body||!['agent','robotics'].includes(body.goal)||!Array.isArray(body.courseIds)||!body.courseIds.length||body.courseIds.length>40||new Set(body.courseIds).size!==body.courseIds.length||body.courseIds.some(id=>!byId[id]))throw Error('请选择有效的个人课程路线');
    if(!body.courseIds.includes(body.startCourseId))throw Error('起点必须属于当前路线');
    if(body.id&&!/^[a-zA-Z0-9-]{16,80}$/.test(body.id))throw Error('路线标识无效');
    if(!Number.isInteger(Number(body.days))||Number(body.days)<1||Number(body.days)>366)throw Error('学习周期请填写 1–366 天');
    if(!Number.isInteger(Number(body.minutes))||Number(body.minutes)<1||Number(body.minutes)>1440)throw Error('每日时间请填写 1–1440 分钟');
    if(typeof body.name!=='string'||!body.name.trim()||body.name.length>120)throw Error('路线名称无效');
    return body;
  }
  async function preview(body){
    body=clean(body);
    return LBBPersonalSchedule.preview(config,courseList,body);
  }
  async function adopt(body){
    clean(body);
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(body.id||''))throw Error('路线标识无效');
    const commit=async()=>{
      const planned=await preview(body),tasks=[];
      for(let i=0;i<planned.tasks.length;i++){
        const marker=`[个人路线 ${body.id} / ${i+1}]`,task=planned.tasks[i];
        const courseId=task.unit_id.replace('curriculum:personal-','').split('--')[0];
        const configuration=i===0?'[个人路线配置 '+JSON.stringify({...body,currentCourseId:body.startCourseId,status:'active'})+']\n':'';
        const note=(marker+'\n[课程id '+courseId+']\n'+configuration+task.note).slice(0,5000);
        tasks.push({...task,note,evidence:'',state:'todo'});
      }
      const ids=await StaticSite.adoptTasks(tasks);

      return {taskIds:ids,profile:planned.profile};
    };
    return navigator.locks?navigator.locks.request('lbb-personal-route-'+body.id,commit):commit();
  }

  async function routeIndex(){
    const s=await snapshot(),items=[];
    for(const t of s.tasks){const m=t.note?.match(/^\[个人路线配置 (.+)\]$/m);if(!m)continue;try{const p=JSON.parse(m[1]);clean(p);if(p.goal!==t.learning_route)continue;p.taskIds=s.tasks.filter(t=>routeOf(t)===p.id).map(t=>t.id);items.push(p);}catch{}}
    return items;
  }
  async function requireTask(id,routeId){const s=await snapshot(),t=s.tasks.find(t=>t.id===Number(id));if(!t)throw Error('任务不存在');if(routeId&&routeOf(t)!==routeId)throw Error('任务不属于当前个人路线');return t;}
  async function createTask(body){
    const p=clean(body.profile),id=body.requestId;
    if(!/^[A-Za-z0-9-]{16,80}$/.test(id||''))throw Error('任务标识无效');
    const courseId=p.courseIds.includes(body.courseId)?body.courseId:p.currentCourseId||p.startCourseId;
    const stage=config.roadmaps.find(r=>r.id===p.goal).stages[0].id;
    const task={title:body.title,track:p.goal,learning_route:p.goal,stage,due:body.due,minutes:body.minutes,state:'todo',evidence:'',source_url:byId[courseId].sources[0][1],note:`[个人路线 ${p.id} / ${id}]\n[课程id ${courseId}]\n${body.note||''}`};
    const ids=await StaticSite.adoptTasks([task]);return {id:ids[0]};
  }
  async function mutateTask(body,change){
    for(let attempt=0;attempt<8;attempt++){
      const data=await records.store.read(),revision=data.revision,t=data.tables.tasks.find(t=>t.id===Number(body.id));
      if(!t||routeOf(t)!==body.routeId)throw Error('任务不属于当前个人路线');
      await records.task(data,{...t,...change(t)});
      if(await records.store.commit(data,revision))return {ok:true};
    }
    throw Error('其他页面正在保存，请重试。');
  }
  async function updateTask(body){
    return mutateTask(body,t=>{const metadata=t.note.split('\n').filter(x=>/^\[(个人路线|课程id)/.test(x)).join('\n');return {title:body.title,due:body.due,minutes:body.minutes,note:metadata+'\n'+(body.note||'')};});
  }
  async function checkpoint(body){
    const s=await snapshot(),t=s.tasks.find(t=>routeOf(t)===body.routeId&&t.note.includes('[个人路线配置 '));
    if(!t)throw Error('路线配置尚未保存');
    const m=t.note.match(/^\[个人路线配置 (.+)\]$/m),p=JSON.parse(m[1]);
    if(!p.courseIds.includes(body.courseId))throw Error('课程不属于这条路线');
    return mutateTask({id:t.id,routeId:body.routeId},current=>{const profile=JSON.parse(current.note.match(/^\[个人路线配置 (.+)\]$/m)[1]);profile.currentCourseId=body.courseId;return {note:current.note.replace(/^\[个人路线配置 (.+)\]$/m,'[个人路线配置 '+JSON.stringify(profile)+']')};});
  }
  async function journal(body){
    const p=clean(body.profile),s=await snapshot(),old=body.id?s.entries.find(e=>e.id===body.id):null;
    if(old&&body.expectedUpdatedAt!==old.updated_at)throw Error('记录已在其他页面更新；请保留本次编辑内容，刷新后再合并。');
    if(body.task_id)await requireTask(body.task_id,p.id);
    if(old&&old.task_id)await requireTask(old.task_id,p.id);
    if(old&&!old.task_id&&!old.body?.includes(markerFor(p.id)))throw Error('记录不属于当前个人路线');
    const values={...old,...body.values,id:old?.id||body.id,updated_at:old?.updated_at,track:p.goal,learning_route:p.goal,stage:old?.stage||'',entry_date:body.values.entry_date,task_id:body.task_id||old?.task_id||'',links:old?.links||[]};
    values.body='[个人路线 '+p.id+']\n'+body.values.body;
    return api('journal',values);
  }
  async function activity(body){
    const p=clean(body.profile);if(!p.courseIds.includes(body.courseId))return {ok:true};
    const task=(await snapshot()).tasks.find(t=>routeOf(t)===p.id&&courseOf(t)===body.courseId),c=byId[body.courseId];
    return api('journal/automatic',{source_key:'curriculum:'+p.id+':'+body.courseId+':'+body.kind+':'+body.day,entry:{title:'学习活动：'+c.label,track:p.goal,learning_route:p.goal,stage:task?.stage||'',task_id:task?.id||'',entry_date:body.day,kind:'activity',status:'recorded',evidence_type:'activity',body:'[个人路线 '+p.id+']\n'+body.text,links:[c.sources[0][1]]}});
  }
  async function focusStatus(body){
    if(!/^[A-Za-z0-9-]{16,80}$/.test(body.session_key||''))throw Error('记录标识无效');
    const data=await records.store.read();
    if(!data.tables.study_receipts.some(r=>r.key===body.session_key))return {saved:false};
    // Existing receipts make this a read-only validation, including deleted tasks.
    try{await records.finish(data,body);return {saved:true,matches:true};}catch{return {saved:true,matches:false};}
  }
  async function finish(body){
    const {routeId,...payload}=body,status=await focusStatus(payload);
    if(status.saved)return {ok:true,alreadySaved:true,matches:status.matches};
    await requireTask(body.task_id,routeId);await api('study/finish',payload);return {ok:true};
  }
  const methods={
    ping:async()=>({ok:true}),snapshot,preview,adopt,routeIndex,createTask,updateTask,checkpoint,journal,activity,
    finish,focusStatus,
    backup:async()=>api('backup'),
    backupPreview:async body=>api('backup/preview',{backup:body.backup}),
    backupRestore:async body=>api('backup/restore',body),
    safetyBackup:async()=>api('backup/safety'),
    resumeFocus:async()=>{try{const focus=JSON.parse(localStorage.getItem(namespace+':study-focus')||'null');return focus&&(await focusStatus({session_key:focus.key})).saved?null:focus;}catch{return null;}},
    releaseFocus:async body=>{const key=namespace+':study-focus';try{if(JSON.parse(localStorage.getItem(key)||'null')?.key===body.key)localStorage.removeItem(key);}catch{}}
  };
  addEventListener('message',async event=>{
    if(event.source!==parent||event.origin!==(location.protocol==='file:'?'null':location.origin)||event.data?.type!=='lbb-workbench-call')return;
    const {id,method,args}=event.data;if(typeof id!=='string'||id.length>80||!Object.hasOwn(methods,method))return;
    try{parent.postMessage({type:'lbb-workbench-result',id,value:await methods[method](args||{})},location.protocol==='file:'?'*':location.origin);}
    catch(e){parent.postMessage({type:'lbb-workbench-result',id,error:e.message||'保存未完成，请重试。'},location.protocol==='file:'?'*':location.origin);}
  });
})();

