/* Personal study plans and check-ins; all recommendations use local rules. */
const planGoals={robotics:'机器人入门',embedded:'电子制作与嵌入式',agent:'AI / Agent 工程'};
const planLevels={zero:'从零开始',basic:'有基础，补关键环节',project:'围绕项目实践'};
let pendingPlanPreview=null,lastPlanPreviewProfile=null,pendingPlanEdit=null;
function personalPlanPanel(){
 const p=S.learning_plan;
 if(!p)return renderBeginnerStart();
 const done=p.tasks.filter(t=>t.state==='done'),next=p.tasks.find(t=>t.state!=='done'&&t.due<=day())||p.tasks.find(t=>t.state!=='done');
 const dates=new Set(done.filter(t=>t.completed_at).map(t=>day(t.completed_at))),todayDone=dates.has(day()),week=[...dates].filter(d=>d>=dateShift(day(),-6)&&d<=day()).length;
 return `<section class="panel personal-plan"><div class="panel-head"><div><span class="study-kicker">属于你的学习节奏</span><h2>${esc(planGoals[p.profile.goal])} · ${p.profile.days}天计划</h2><p>${esc(planLevels[p.profile.level])} · 每天计划 ${p.profile.minutes} 分钟 · 完成后按实际投入记录</p></div>${btn('修改学习计划','personal-plan-new','','small')}</div>
 <div class="plan-checkin-stats"><span><b>${done.length}/${p.profile.days}</b> 已完成小任务</span><span><b>${week}</b> 近7天打卡天数</span><span>${todayDone?'✓ 今天已有学习记录':'今天的一小步，完成后再打卡'}</span></div>
 ${next?`<div class="plan-next"><div><span class="study-kicker">${next.due>day()?'下次学习':'接下来的一小步'} · 第 ${next.day_index} 天 · ${esc(next.due)}</span><h3>${esc(next.title)}</h3><p>${esc(next.note.split('\n')[0])}</p></div><div class="actions">${learningPlanLinks(next)}${btn(next.due>day()?'提前完成并打卡':'完成并打卡','personal-plan-checkin',next.id,'primary')}</div></div>`:`<div class="plan-next"><div><h3>${done.length===p.profile.days?'这段计划完成了，看看自己积累了什么。':'当前没有待办任务，可以重新安排下一段。'}</h3><p>从真实记录中选一个收获、一个问题，决定下一步。</p></div>${btn('写阶段复盘','journal-new','','primary')}</div>`}
 <details class="personal-plan-calendar"><summary>查看每天的安排与成果</summary><div class="plan-days">${p.tasks.map(t=>`<button type="button" class="plan-day ${t.state==='done'?'is-done':''}" data-action="task-edit" data-id="${t.id}"><span>第 ${t.day_index} 天 · ${esc(t.due)}</span><b>${esc(t.title)}</b><small>${t.state==='done'?'✓ 已完成并留下成果':'待完成 · 可调整日期和任务'}</small></button>`).join('')}</div></details><div class="actions">${btn('剩余计划顺延一天','personal-plan-postpone','','small')}${btn('查看学习记录','nav','journal','small')}</div><p class="note">错过一天可以继续或顺延。打卡按实际完成日期计算，不补造学习时长，也不会自动判定知识已掌握。</p></section>`;
}
function planProfileModal(startBlock,profileOverride){
 const p=profileOverride||S.learning_plan?.profile||{goal:getSiteRoute(),level:'zero',minutes:30,days:7,start:day()};
 const curriculum=currentCurriculum(),blocks=curriculum.months.flatMap(m=>m.blocks.map(b=>({...b,stage:m.stage})));
 const selected=blocks.find(b=>b.id===(startBlock||p.start_block))||blocks[0];
 openModal('制定属于自己的学习计划',`<p class="note">选择适合自己的起点。系统给出建议，你可以在预览后采用，也可以创建后调整每天的任务。</p>${field('学习目标',choose('goal',Object.fromEntries(Object.entries(planGoals).filter(([id])=>getSiteRoute()==='agent'?id==='agent':id!=='agent')),p.goal))}${field('自评基础（仅记录，不自动跳课）',choose('level',planLevels,p.level))}${field('从哪个学习块开始',choose('start_block',Object.fromEntries(blocks.map(b=>[b.id,`第 ${b.week} 块 · ${b.title}`])),selected.id))}<p class="note" id="plan-prerequisite">${esc(selected.prerequisite)}</p><div class="form-grid"><div>${field('每日可投入时间（分钟）',`<input name="minutes" type="number" inputmode="numeric" min="1" max="1440" step="1" value="${esc(p.minutes)}" required aria-describedby="plan-minutes-help"><small id="plan-minutes-help" class="note">输入 1–1440 的整数，例如 45、90 或 480（8 小时）。</small>`)}</div><div>${field('先安排多久',choose('days',{'7':'7天','14':'14天'},String(p.days)))}</div></div>${field('学习推进方式',choose('progression',{current:'先练当前块，通过验收后再安排下一块',sequential:'按参考用时预排后续（未通过需手动回补）'},p.progression||'current'))}${field('主要设备',choose('device',{browser:'先只用浏览器',windows:'Windows 电脑',macos:'macOS 电脑',linux:'Linux 电脑'},p.device||'browser'))}${getSiteRoute()==='robotics'?field('练习条件',choose('practice',{simulation:'暂无硬件，先用模型和样例',hardware:'已有硬件，先模型后实物'},p.practice||'simulation')):''}${field('开始日期',`<input name="start" type="date" value="${esc(p.start||day())}" required>`)}<p class="note">默认从第一块开始；“有基础”不会自动跳课。选择后面的学习块前，请先核对上方先修要求。</p>`,async d=>{pendingPlanPreview=await api('plan/preview',d);return false});
 $('#form button[type=submit]').textContent='预览我的计划';
 $('#form [name=start_block]').onchange=e=>{$('#plan-prerequisite').textContent=blocks.find(b=>b.id===e.target.value).prerequisite};
}
function planPreviewModal(preview){
 const p=preview.profile,key=crypto.randomUUID();lastPlanPreviewProfile=p;
 openModal('看看这份安排是否适合你',`<p>${esc(planGoals[p.goal])} · ${esc(planLevels[p.level])} · ${p.days}天 · 每天计划${p.minutes}分钟</p><p class="note">${p.progression==='current'?'这份计划只安排当前学习块；参考练习次数之后继续独立复现、核对与补练，每第 7 天复盘。通过验收后，再由你安排下一块。':'按每块参考用时与每日预算预排后续学习块，复杂块可以跨周；每第 7 天复盘。当前块未通过时，需要手动回补或重排。'}日期和任务完成都不代表已经掌握。</p><p class="note">${esc(workspaceEnvironment(p))}</p><ol class="plan-preview">${preview.tasks.map(t=>`<li><small>${esc(t.due)}</small><b>${esc(t.title)}</b><p>${esc(t.note.split('\n')[0])}</p>${learningPlanHint(t)}</li>`).join('')}</ol><p class="note">${S.learning_plan?'采用新计划会切换当前计划，原有任务、成果和时长保留。':'采用后会加入今日学习台；不会自动完成任务或生成学习经历。'}</p>`,async()=>{await api('plan',{...p,id:key});studyGoal=p.minutes;studyStore.write('study-goal:'+getSiteRoute(),studyGoal);return '学习计划已安排，从第一小步开始'});
 $('#form button[type=submit]').textContent='采用这份计划';
 $('#form .actions:last-child').insertAdjacentHTML('afterbegin',btn('返回修改','personal-plan-edit-preview'));
 $('#form .actions:last-child [data-action=close]').textContent='暂不采用';
}
function planCheckinModal(task){
 openModal('留下收获，完成这次打卡',`<h3>${esc(task.title)}</h3><p class="note">${esc(task.note)}</p>${field('今天完成了什么，或发现了什么？',`<textarea name="evidence" rows="4" required maxlength="5000" placeholder="写下一句真实收获、观察结果或遇到的问题。"></textarea>`)}${field('实际投入（分钟，可填0）','<input name="minutes" type="number" min="0" max="1440" value="0" required>')}<p class="note">填0只完成任务，不新增时长；已经通过专注计时记录的时间不要再次填写。</p>`,async d=>{await api('plan/checkin',{task_id:task.id,...d});return '打卡已记录，今天又向前走了一步'});
 $('#form button[type=submit]').textContent='保存收获并打卡';
}
document.addEventListener('close',event=>{if(event.target.id==='modal'&&pendingPlanPreview){const p=pendingPlanPreview;pendingPlanPreview=null;queueMicrotask(()=>{const route=p.profile.goal==='agent'?'agent':'robotics';if(getSiteRoute()!==route)switchSiteRoute(route);planPreviewModal(p)})}},true);
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-action^="personal-plan-"]');if(!b||b.disabled)return;
 try{
  if(b.dataset.action==='personal-plan-edit-preview'){pendingPlanEdit=lastPlanPreviewProfile;$('#modal').close();}
  if(b.dataset.action==='personal-plan-new')planProfileModal();
  if(b.dataset.action==='personal-plan-checkin'){const t=S.learning_plan?.tasks.find(t=>t.id===Number(b.dataset.id));if(t&&t.state!=='done')planCheckinModal(t)}
  if(b.dataset.action==='personal-plan-demo'){setElectronicsConcept(b.dataset.id==='capacitors'?'rc':b.dataset.id);location.hash='guides';requestAnimationFrame(()=>document.getElementById('interactive-lessons')?.scrollIntoView({block:'start'}))}
  if(b.dataset.action==='personal-plan-postpone'){b.disabled=true;await api('plan/postpone',{goal:getSiteRoute()});await refresh();toast('未完成任务已顺延一天，按自己的节奏继续')}
 }catch(err){toast(err.message);b.disabled=false}
});

document.addEventListener('close',event=>{if(event.target.id==='modal'&&pendingPlanEdit){const p=pendingPlanEdit;pendingPlanEdit=null;queueMicrotask(()=>planProfileModal(undefined,p));}},true);
