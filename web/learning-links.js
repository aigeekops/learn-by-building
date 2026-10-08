/* One content map connects the roadmap, reading companion, labs and daily plans. */
const LearningLinks={
  context(data,kind,id,preferred=''){
    const key=kind==='theory'?'lessons':'labs';
    return data.modules.find(m=>m.id===preferred&&m[key].includes(id))||data.modules.find(m=>m[key].includes(id));
  },
  support(data,task){
    if(!data||task.track!=='robotics'||!task.unit_id||!data.units[task.unit_id])return null;
    const u=data.units[task.unit_id];
    return {...u,lab:task.day_index===1&&task.unit_id==='dc'? 'basics':u.lab};
  },
  note(module){return {title:'路线实践：'+module.title,track:'robotics',stage:module.stage,kind:'note',status:'draft',evidence_type:'reading',question:module.why,procedure:module.exercise,body:'',prediction:'',result:'',conclusion:'',next_step:'',links:[]}},
  task(module,lessons){return {title:'路线实践：'+module.title,track:'robotics',stage:module.stage,minutes:30,state:'todo',evidence:'',source_url:lessons.find(l=>l.id===module.lessons[0]).sources[0].url,note:`学习目的：${module.why}\n先学原理：${module.lessons.map(id=>lessons.find(l=>l.id===id).title).join('；')}\n本次练习：${module.exercise}\n完成标准：${module.acceptance}\n按今天的时间选一个小步骤，不要求一次做完整组。`}}
};
if(typeof module!=='undefined')module.exports=LearningLinks;
if(typeof document!=='undefined'){
  const learningData=()=>S.learning_links;
  function learningContext(kind,id){const d=learningData();return d?LearningLinks.context(d,kind,id,studyStore.read('radar-learning-context','')):null}
  function learningTheoryButton(id,module,label){const l=S.ee_textbook?.lessons.find(l=>l.id===id);return l?btn(esc(label||l.title),'learning-theory',module+':'+id,'small'):''}
  function learningLabButton(id,module){return btn('练习：'+esc(learningData().labs[id]),'learning-lab',module+':'+id,'small')}
  function renderStageLearning(stage){
    const d=learningData();if(!d)return '';const rows=d.modules.filter(m=>m.stage===stage.id);if(!rows.length)return '';
    return `<section class="stage-learning" aria-label="本阶段配套学习"><h4>本阶段怎么学：原理 → 练习 → 成果</h4><p class="note">选择与你当前项目有关的一组。先读指定导学，再操作模型，最后留下自己的解释或观察。</p><div class="learning-module-grid">${rows.map(m=>`<details class="learning-module" ${m.id==='first-circuit'||studyStore.read('radar-learning-context','')===m.id?'open':''}><summary>${esc(m.title)} <span>${m.optional?'按需回看':'阶段配套'}</span></summary><p>${esc(m.why)}</p><div class="learning-step"><b>1 · 先学原理</b><div class="actions">${m.lessons.map(id=>learningTheoryButton(id,m.id)).join('')}</div></div><div class="learning-step"><b>2 · 再做交互练习</b><p>${esc(m.exercise)}</p><div class="actions">${m.labs.map(id=>learningLabButton(id,m.id)).join('')}</div></div><div class="learning-step"><b>3 · 留下阶段成果</b><p>${esc(m.acceptance)}</p><div class="actions">${btn('安排一次学习','learning-task',m.id,'small')}${btn('写本阶段记录','learning-note',m.id,'small')}</div></div></details>`).join('')}</div></section>`;
  }
  function renderLearningContext(kind,id){
    const m=learningContext(kind,id);if(!m)return '';
    const stage=S.roadmaps.find(r=>r.id==='robotics')?.stages.find(s=>s.id===m.stage);
    return `<aside class="learning-context"><span class="study-kicker">配套学习路线 · ${esc(stage?.name||'机器人')}</span><b>${esc(m.title)}</b><p>${esc(m.why)}</p><div class="actions">${btn('← 回到对应路线阶段','learning-stage',m.id,'small')}${kind==='theory'?m.labs.map(id=>learningLabButton(id,m.id)).join(''):m.lessons.map(id=>learningTheoryButton(id,m.id,'补原理：'+S.ee_textbook.lessons.find(l=>l.id===id).title)).join('')}${btn('记录本阶段实践','learning-note',m.id,'small')}</div></aside>`;
  }
  function learningUnitLinks(id){const u=learningData()?.units[id];if(!u)return '';return `<div class="learning-unit-links"><b>搭配原理导学</b><div class="actions">${u.lessons.map(l=>learningTheoryButton(l,LearningLinks.context(learningData(),'theory',l,u.modules[0])?.id||u.modules[0])).join('')}</div></div>`}
  function learningPlanLinks(task){
    if(task.unit_id?.startsWith('curriculum:'))return btn('回到本块教材与跟练','curated-block',task.unit_id.slice(11))+btn('查看本次任务','task-edit',task.id,'small');
    const u=LearningLinks.support(learningData(),task);if(!u)return btn('查看任务','task-edit',task.id);
    if(task.phase==='review')return btn('回看学习记录','nav','journal')+btn('查看复盘任务','task-edit',task.id);
    const m=LearningLinks.context(learningData(),'lab',u.lab,u.modules[0]);
    const theory=u.lessons.map(id=>learningTheoryButton(id,LearningLinks.context(learningData(),'theory',id,u.modules[0]).id));
    const lab=learningLabButton(u.lab,m.id);
    return (task.phase==='understand'?theory.join('')+lab:lab+`<details class="plan-reading"><summary>回看配套原理</summary><div class="actions">${theory.join('')}</div></details>`)+btn('查看本次任务','task-edit',task.id,'small');
  }
  function learningPlanHint(task){if(task.unit_id?.startsWith('curriculum:'))return '<small class="plan-support-hint">跟随当前学习块；完成一小步后再核对整块验收。</small>';const u=LearningLinks.support(learningData(),task);if(!u||task.phase==='review')return '';return `<small class="plan-support-hint">原理：${esc(u.lessons.map(id=>S.ee_textbook.lessons.find(l=>l.id===id).title).join(' / '))} · 练习：${esc(learningData().labs[u.lab])}</small>`}
  function learningNavigate(target,focus){
    page=target;history.pushState(null,'','#'+target);render();
    requestAnimationFrame(()=>{const el=document.querySelector(focus);el?.scrollIntoView({block:'start',behavior:'instant'});el?.focus({preventScroll:true})});
  }
  function openLearningLab(id,module){studyStore.write('radar-learning-context',module);page='guides';history.pushState(null,'','#guides');setElectronicsConcept(id);requestAnimationFrame(()=>document.getElementById('interactive-lessons')?.scrollIntoView({block:'start',behavior:'instant'}))}
  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-action^="learning-"]');if(!b||!learningData())return;
    const [mid,item]=b.dataset.id.split(':'),m=learningData().modules.find(m=>m.id===mid);if(!m)return;
    if(b.dataset.action==='learning-theory'&&m.lessons.includes(item)){studyStore.write('radar-learning-context',m.id);openEETextbook(item)}
    if(b.dataset.action==='learning-lab'&&m.labs.includes(item))openLearningLab(item,m.id);
    if(b.dataset.action==='learning-stage'){
      track='robotics';studyStore.write('radar-curated-month:robotics',m.stage);
      const blockId=new URLSearchParams(location.search).get('block'),found=RoboticsCurriculum.find(S.robotics_curriculum,blockId);
      if(found?.month.stage===m.stage)learningNavigate('learn','#curated-'+blockId);
      else {const url=new URL(location.href);url.searchParams.delete('block');history.replaceState(null,'',url);learningNavigate('learn','#road-stage-'+m.stage);if(window.openRoboticsMonth)openRoboticsMonth(m.stage);}
    }
    if(b.dataset.action==='learning-note')journalModal({...LearningLinks.note(m),links:m.lessons.map(id=>S.ee_textbook.lessons.find(l=>l.id===id).sources[0].url)});
    if(b.dataset.action==='learning-task')taskModal(LearningLinks.task(m,S.ee_textbook.lessons));
  });
  Object.assign(window,{learningContext,renderStageLearning,renderLearningContext,learningUnitLinks,learningPlanLinks,learningPlanHint,openLearningLab});
}
