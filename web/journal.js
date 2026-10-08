/* Learning records: local editing recovery, persistent server records, no LLM. */
const journalKinds={activity:'学习动态',note:'阅读笔记',experiment:'实验记录',review:'阶段复盘'};
const journalStatus={draft:'草稿',recorded:'已记录',blocked:'待解决'};
const journalEvidence={activity:'操作记录（非掌握证明）',reading:'阅读理解',calculation:'计算',simulation:'仿真',hardware:'硬件测量',mixed:'多种证据（分别注明）'};
const journalFields={body:'学习收获',question:'想解决的问题',prediction:'预测与依据',procedure:'操作与条件',result:'实际观察',conclusion:'结论与边界',next_step:'下一步'};
let journalTrack='all',journalKind='all',journalQuery='',journalArchive=false;
let draftKey=siteRouteDraftKey();
const entries=()=>S.learning_entries||[];
const activeEntries=()=>entries().filter(e=>!e.archived);
const stageName=e=>S.roadmaps.find(r=>r.id===e.track)?.stages.find(s=>s.id===e.stage)?.name||'未归入阶段';
const safeLink=u=>/^https?:\/\//i.test(u);
const choose=(name,options,value)=>`<select name="${name}">${Object.entries(options).map(([key,label])=>`<option value="${esc(key)}" ${key===value?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
const field=(label,control)=>`<label class="field">${label}</label>${control}`;
function downloadText(filename,text,type='text/markdown;charset=utf-8'){
 const url=URL.createObjectURL(new Blob([text],{type}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function journalMarkdown(e){
 const parts=[`# ${e.title}`,`${e.entry_date} · ${trackName(e.track)} · ${stageName(e)}`,`${journalKinds[e.kind]} · ${journalEvidence[e.evidence_type]} · ${journalStatus[e.status]}`];
 for(const [key,label] of Object.entries(journalFields))if(e[key])parts.push('## '+label,e[key]);
 if(e.links.length)parts.push('## 资料与成果链接',e.links.map(u=>'- '+u).join('\n'));
 return parts.join('\n\n')+'\n';
}
function journalCard(e,compact=false){
 const summary=e.body||e.result||e.question||'还没有填写正文，可以继续完善。';
 return `<article class="journal-card ${e.status==='blocked'?'is-blocked':''}">
 <div class="journal-card-meta"><time>${esc(e.entry_date)}</time><span>${esc(journalKinds[e.kind])}</span>${e.id.startsWith('auto-')?'<span class="badge gray">自动记录</span>':''}<span class="badge ${e.status==='blocked'?'orange':e.status==='recorded'?'green':'gray'}">${esc(journalStatus[e.status])}</span></div>
 <h3><button class="journal-title" data-action="journal-open" data-id="${e.id}">${esc(e.title)}</button></h3>
 <p class="journal-card-summary">${esc(summary.slice(0,compact?100:210))}</p>
 <div class="journal-card-tags"><span>${esc(trackName(e.track))}</span><span>${esc(stageName(e))}</span><span>${esc(journalEvidence[e.evidence_type])}</span></div>
 ${e.next_step?`<div class="journal-next"><b>下次继续</b><span>${esc(e.next_step.slice(0,140))}</span></div>`:''}
 <div class="actions">${btn('查看记录','journal-open',e.id,'small')}${!compact?btn(e.id.startsWith('auto-')?'补充想法':'编辑','journal-edit',e.id,'small'):''}${e.next_step&&!e.archived?btn('安排下一步','journal-plan',e.id,'small'):''}${e.archived?btn('恢复记录','journal-restore',e.id,'small'):''}</div></article>`;
}
function renderJournal(){
 const rows=entries().filter(e=>Boolean(e.archived)===journalArchive&&(journalTrack==='all'||e.track===journalTrack)&&(journalKind==='all'||e.kind===journalKind)&&(!journalQuery||[e.title,...Object.keys(journalFields).map(k=>e[k])].join(' ').toLowerCase().includes(journalQuery.toLowerCase())));
 const all=activeEntries(),draft=studyStore.read(draftKey,null),weekStart=dateShift(day(),-6);
 return heading('LEARNING JOURNAL','让每一次学习，都有迹可循。','专注结束、课程查看与练习操作自动留痕；想法和结论按需补充。',btn('导出周复盘','journal-review')+btn('＋ 补充想法','journal-new'))+
 `<div class="journal-stats"><div><strong>${all.length}</strong><span>篇学习记录</span></div><div><strong>${all.filter(e=>e.kind==='experiment').length}</strong><span>次实验记录</span></div><div><strong>${all.filter(e=>e.status==='blocked').length}</strong><span>个待解决问题</span></div><div><strong>${all.filter(e=>e.entry_date>=weekStart&&e.entry_date<=day()).length}</strong><span>篇近七日记录</span></div></div>
 ${draft?`<section class="journal-recovery"><div><b>有一份未保存的编辑</b><p>${esc(draft.title||'未命名学习记录')} · 保存在当前浏览器</p></div><div class="actions">${btn('继续编辑','journal-resume','','small')}${btn('清除','journal-clear-draft','','small')}</div></section>`:''}
 <section class="panel journal-toolbar"><label>类型<select id="journal-kind"><option value="all">全部类型</option>${Object.entries(journalKinds).map(([id,label])=>`<option value="${id}" ${journalKind===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="journal-search">搜索<input id="journal-search" type="search" value="${esc(journalQuery)}" placeholder="标题、收获或问题…"></label><button class="btn ${journalArchive?'selected':''}" data-action="journal-archive-view">${journalArchive?'返回记录本':'归档箱'}</button></section>
 <div class="journal-results" aria-live="polite">${rows.length} 篇${journalArchive?'归档':'学习'}记录</div>
 <div class="journal-grid">${rows.map(e=>journalCard(e)).join('')||`<section class="panel journal-welcome"><span class="journal-welcome-icon">▤</span><h2>${journalQuery?'没有找到相关记录':'开始学习，记录会自动留下'}</h2><p>结束专注、打开课程、操作模型或检查答案后，这里会自动生成记录。<br>只记录真实操作，不自动推断掌握或实物实验结果。</p><div class="actions">${btn('开始学习','nav','learn','primary')}${btn('补充个人想法','journal-new')}</div></section>`}</div>`;
}
function journalDashboard(){
 const recent=activeEntries().slice(0,2);
 return `<section class="panel journal-dashboard"><div class="panel-head"><div><span class="study-kicker">LEARNING NOTES</span><h2>本次学习已自动留下</h2></div>${btn('全部记录 →','nav','journal','small')}</div>${recent.length?recent.map(e=>journalCard(e,true)).join(''):`<div class="journal-start"><p>学习操作会自动记录课程、参数、结果和实际计时。无需先写笔记，个人想法可以稍后补充。</p><div class="actions">${btn('继续课程','nav','learn','primary small')}${btn('补充想法','journal-new','','small')}</div></div>`}</section>`;
}
function journalModal(initial={},restoring=false){
 const recovery=studyStore.read(draftKey,null);
 if(recovery&&!restoring){
  openModal('先处理未保存的编辑','<p>你还有一份未保存的学习记录。可以继续编辑，或清除后再开始。</p>'+btn('继续编辑','journal-resume','','primary'),async()=>{studyStore.write(draftKey,null);journalPending=initial;});
  $('#form button[type=submit]').textContent='清除并开始';
  return;
 }
 const e={id:crypto.randomUUID(),track:getSiteRoute(),stage:'',kind:'note',status:'draft',evidence_type:'reading',entry_date:day(),links:[],...initial};
 if(e.task_id&&!S.tasks.some(t=>t.id===Number(e.task_id)))e.task_id='';
 const road=S.roadmaps.find(r=>r.id===e.track)||S.roadmaps[0];
 openModal(e.created_at?'编辑学习记录':'写下这次学习',`
 <p class="note">编辑时自动保留在当前浏览器，点击保存后写入学习记录本。</p>
 ${field('标题',`<input name="title" required maxlength="300" value="${esc(e.title||'')}" placeholder="${getSiteRoute()==='agent'?'例如：第一次工具调用的输入与输出':'例如：为什么接上负载后，电压变低了？'}">`)}
 <div class="form-grid"><div>${field('学习日期',`<input type="date" name="entry_date" required value="${e.entry_date}">`)}</div><div>${field('记录类型',choose('kind',journalKinds,e.kind))}</div></div>
 <div class="form-grid"><div>${field('学习方向',choose('track',Object.fromEntries(S.roadmaps.map(r=>[r.id,r.name])),e.track))}</div><div>${field('路线阶段',choose('stage',{'':'暂不归类',...Object.fromEntries(road.stages.map(s=>[s.id,s.name]))},e.stage))}</div></div>
 <div class="form-grid"><div>${field('当前状态',choose('status',journalStatus,e.status))}</div><div>${field('内容依据',choose('evidence_type',journalEvidence,e.evidence_type))}</div></div>
 ${field('关联任务（可选）',choose('task_id',{'':'不关联任务',...Object.fromEntries(S.tasks.filter(t=>t.track===e.track).map(t=>[String(t.id),t.title]))},String(e.task_id||'')))}
 ${field('学习收获',`<textarea name="body" rows="5" maxlength="10000" placeholder="用自己的话说明理解了什么，哪些地方还不能解释。">${esc(e.body||'')}</textarea>`)}
 <details id="experiment-fields" ${e.kind==='experiment'?'open':''}><summary>问题、实验过程与结论</summary><p class="note">计算、仿真和实物观察请分别说明；没有完成的部分可以留空。</p>
 ${['question','prediction','procedure','result','conclusion'].map(k=>field(journalFields[k],`<textarea name="${k}" rows="3" maxlength="10000" placeholder="${{question:'想验证什么？有哪些候选解释？',prediction:'每个解释成立时，预计观察到什么？',procedure:'工具、参数、测量位置；本次改变了什么？',result:'记录实际现象或数值；区分事实与推测。',conclusion:'哪些解释得到支持？哪些被排除？还有什么未知？'}[k]}">${esc(e[k]||'')}</textarea>`)).join('')}</details>
 ${field('下一步',`<textarea name="next_step" rows="2" maxlength="10000" placeholder="下一次优先做哪一项检查？可以一键安排为任务。">${esc(e.next_step||'')}</textarea>`)}
 ${field('资料与成果链接（每行一个，最多20个）',`<textarea name="links" rows="3" placeholder="https://…">${esc(e.links.join('\n'))}</textarea>`)}
 `,async d=>{
  const result=await api('journal',{...d,id:e.id,updated_at:e.updated_at,links:d.links.split('\n').map(x=>x.trim()).filter(Boolean)});
  studyStore.write(draftKey,null);journalPending=null;
  if(result.entry)journalTrack='all';
 });
 $('#form button[type=submit]').textContent='保存学习记录';
 const preserve=()=>{
  const d=Object.fromEntries(new FormData($('#form')));
  const ok=studyStore.write(draftKey,{...e,...d,links:d.links.split('\n').map(x=>x.trim()).filter(Boolean)});
  if(!ok)$('#form-error').textContent='浏览器存储不可用，请及时保存，避免丢失编辑。';
 };
 $('#form').oninput=preserve;
 $('#form').onchange=event=>{
  if(event.target.name==='kind')$('#experiment-fields').open=event.target.value==='experiment';
  if(event.target.name==='track'){
   const r=S.roadmaps.find(r=>r.id===event.target.value);
   $('#form select[name=stage]').innerHTML='<option value="">暂不归类</option>'+r.stages.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
   $('#form select[name=task_id]').innerHTML='<option value="">不关联任务</option>'+S.tasks.filter(t=>t.track===r.id).map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');
  }
  preserve();
 };
}
let journalPending=null;
function journalSwitch(initial,restoring=false){
 if($('#modal').open){$('#modal').addEventListener('close',()=>journalModal(initial,restoring),{once:true});$('#modal').close()}
 else journalModal(initial,restoring);
}
function journalOpen(e){
 if(!e)return;
 const task=S.tasks.find(t=>t.id===e.task_id);
 openModal(e.title,`<div class="journal-detail-meta">${esc(e.entry_date)} · ${esc(trackName(e.track))}<br>${esc(stageName(e))} · ${esc(journalEvidence[e.evidence_type])} · ${esc(journalStatus[e.status])}</div>
 ${Object.entries(journalFields).filter(([k])=>e[k]).map(([k,label])=>`<section class="journal-detail-section"><h3>${label}</h3><p class="long">${esc(e[k])}</p></section>`).join('')}
 ${e.links.length?'<h3>资料与成果</h3><ul class="journal-links">'+e.links.filter(safeLink).map(u=>`<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)} ↗</a></li>`).join('')+'</ul>':''}
 ${task?`<p>关联任务：${esc(task.title)}</p>`:''}<div class="actions">${btn(e.id.startsWith('auto-')?'补充想法':'编辑记录','journal-edit',e.id)}${btn('下载 Markdown','journal-download',e.id)}${btn(e.archived?'恢复记录':'归档记录',e.archived?'journal-restore':'journal-archive',e.id)}</div>`,async()=>{});
 $('#form button[type=submit]').hidden=true;$('#form .actions:last-child [data-action=close]').textContent='关闭';
}
function journalReview(){
 const monday=dateShift(day(),-(new Date(day()+'T12:00:00+08:00').getUTCDay()+6)%7);
 openModal('导出学习复盘',`<p class="note">按所选日期整理已有任务、实际时长与学习记录，不生成新的经历或结论。</p><div class="form-grid"><div>${field('开始日期',`<input type="date" name="start" required value="${monday}">`)}</div><div>${field('结束日期',`<input type="date" name="end" required value="${day()}">`)}</div></div><p>当前路线：${esc(siteRouteName())}</p><input type="hidden" name="track" value="${getSiteRoute()}"><input type="hidden" name="route" value="${getSiteRoute()}">`,async d=>{
  const report=await api('journal/review?'+new URLSearchParams(d));
  downloadText(`学习复盘-${d.start}-${d.end}.md`,report.markdown);
 });
 $('#form button[type=submit]').textContent='下载复盘 Markdown';
}
function renderGuides(){
 if(getSiteRoute()==='agent')return renderAgentGuides();
 return heading('PRACTICAL GUIDES','把基础学透，从一个小问题开始。','改变参数、比较结果、区分解释，再把你的发现留下来。',btn('← 返回学习路线','nav','learn'))+
 `<div class="beginner-start"><div><span class="study-kicker">第一次学电子？</span><p>不需要先买硬件。从闭合回路开始，边操作边理解。</p></div><button class="btn primary" data-concept="basics" data-beginner-start>开始零基础起步课</button></div>`+eeEntry()+renderElectronicsPaths()+
 (S.guides||[]).map(g=>`<section class="guide-intro"><span class="badge green">${esc(trackName(g.track))} · 第一阶段</span><h2>${esc(g.title)}</h2><p>${esc(g.description)}</p><div class="actions">${btn('分压练习记录模板','journal-guide',g.id,'primary')}${btn('查看六个月路线','guide-roadmap',g.track)}</div></section>
 ${g.id==='electronics-first'?renderInteractiveLab():''}
 <div class="guide-resources">${g.resources.map(r=>`<article class="panel"><span class="study-kicker">${esc(r.role)}</span><h3>${esc(r.title)}</h3><p>${esc(r.note)}</p><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">打开学习资源 ↗</a></article>`).join('')}</div>
 <details class="el-divider-reading"><summary>分压练习的延伸阅读</summary><div class="guide-reading">${g.steps.map((s,i)=>`<article class="panel"><span class="study-kicker">0${i+1}</span><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${btn('记下这一节的收获','journal-guide-note',g.id+':'+i,'small')}</article>`).join('')}</div></details>`).join('');
}
function journalBind(){
 if($('#journal-track'))$('#journal-track').onchange=e=>{journalTrack=e.target.value;render()};
 if($('#journal-kind'))$('#journal-kind').onchange=e=>{journalKind=e.target.value;render()};
 if($('#journal-search'))$('#journal-search').oninput=e=>{journalQuery=e.target.value;const pos=e.target.selectionStart;render();$('#journal-search').focus();$('#journal-search').setSelectionRange(pos,pos)};
}
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-action^="journal-"],[data-action^="guide-"]');if(!b||b.disabled)return;
 const {action,id}=b.dataset,e=entries().find(e=>e.id===id);
 try{
  if(action==='journal-new')journalModal();
  if(action==='journal-resume'){const d=studyStore.read(draftKey,null);if(d)journalSwitch(d,true)}
  if(action==='journal-clear-draft'&&confirm('清除当前浏览器中的未保存编辑？已保存的记录不会受影响。')){studyStore.write(draftKey,null);render()}
  if(action==='journal-edit'&&e)journalSwitch(e);
  if(action==='journal-open')journalOpen(e);
  if(action==='journal-download'&&e)downloadText(e.entry_date+'-'+e.title.replace(/[\\/:*?"<>|]/g,'-').slice(0,70)+'.md',journalMarkdown(e));
  if((action==='journal-archive'||action==='journal-restore')&&e){await api('journal/archive',{id,archived:action==='journal-archive'});$('#modal').close();await refresh();toast(action==='journal-archive'?'已归档，可在归档箱恢复':'已恢复记录')}
  if(action==='journal-archive-view'){journalArchive=!journalArchive;render()}
  if(action==='journal-review')journalReview();
  if(action==='journal-plan'&&e)taskModal({title:e.next_step.split('\n')[0].slice(0,300),track:e.track,stage:e.stage,note:'来自学习记录：'+e.title+'\n'+e.next_step,source_url:e.links[0]||''});
  if(action==='journal-task'){
   const t=S.tasks.find(t=>t.id===Number(id));
   if(t)journalModal({title:t.title,track:t.track,stage:t.stage,task_id:t.id,links:safeLink(t.source_url)?[t.source_url]:[]});
  }
  if(action==='journal-stage')journalModal({track,stage:id});
  if(action==='journal-guide'||action==='journal-guide-note'){
   const [guideId,index]=id.split(':'),g=S.guides.find(g=>g.id===guideId);
   if(g)journalModal({track:g.track,stage:g.stage,kind:index===undefined?'experiment':'note',evidence_type:index===undefined?g.exercise.evidence_type:'reading',title:index===undefined?g.exercise.title:g.steps[Number(index)].title,question:index===undefined?g.exercise.question:'',prediction:index===undefined?g.exercise.prediction:'',procedure:index===undefined?g.exercise.procedure:'',links:[g.resources[2].url]});
  }
  if(action==='guide-roadmap'){track=id;location.hash='learn'}
 }catch(err){toast(err.message)}
});
document.addEventListener('close',event=>{
 if(event.target.id==='modal'){
  $('#form').oninput=null;$('#form').onchange=null;
  if(journalPending){const initial=journalPending;journalPending=null;queueMicrotask(()=>journalModal(initial,true))}
 }
},true);
