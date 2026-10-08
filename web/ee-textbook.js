/* Original reading companion. All progress comes from saved task evidence. */
const EETextbook = {
  task(tasks, id) {
    const rows = tasks.filter(t => t.ee_lesson === id);
    return rows.find(t => t.state === 'done' && t.evidence?.trim()) || rows.find(t => t.state === 'doing') || rows[0];
  },
  completed(tasks, id) { const t = this.task(tasks, id); return Boolean(t?.state === 'done' && t.evidence?.trim()); },
  next(lessons, tasks) { return lessons.find(l => !this.completed(tasks, l.id)) || lessons[0]; },
  matches(lesson, query) {
    return !query || [lesson.title, lesson.question, lesson.terms, lesson.formula, ...lesson.concepts].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  },
  taskDraft(lesson, stage='robotics-1') {
    return {title:'电路原理：'+lesson.title,track:'robotics',stage,ee_lesson:lesson.id,minutes:lesson.minutes,state:'todo',evidence:'',source_url:lesson.sources[0].url,
      note:`问题：${lesson.question}\n练习：${lesson.practice}\n完成标准：${lesson.acceptance}\n\n中文导学：学习平台 → 电路原理 → ${lesson.title}\n原文：\n${lesson.sources.map(s=>s.title+' '+s.url).join('\n')}\n结果由学习者填写；阅读与自测不会自动证明掌握。`};
  },
  noteDraft(lesson, task, stage='robotics-1') {
    return {title:'电路原理：'+lesson.title,track:'robotics',stage:task?.stage||stage,kind:'note',status:'draft',evidence_type:'reading',question:lesson.question,procedure:lesson.practice,body:'',result:'',conclusion:'',prediction:'',links:lesson.sources.map(s=>s.url),...(task?{task_id:task.id}:{})};
  }
};
if(typeof module!=='undefined')module.exports=EETextbook;
if(typeof document!=='undefined'){
  let eeSelected=studyStore.read('radar-ee-lesson','units'),eeQuery='',eeStage='all';
  const eeAnswers={};
  const eeLink=s=>safeLink(s.url)?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`:'';
  function eeLessonButton(l,label=l.title){return `<button type="button" class="ee-lesson-link" data-action="ee-select" data-id="${esc(l.id)}" ${l.id===eeSelected?'aria-current="step"':''}>${EETextbook.completed(S.tasks,l.id)?'<span aria-label="已记录成果">✓ </span>':''}${esc(label)}</button>`}
  function renderEETextbook(){
    const d=S.ee_textbook;if(!d)return empty('教材暂不可用','请更新并重启本地服务后刷新页面。');
    const l=d.lessons.find(l=>l.id===eeSelected)||d.lessons[0];eeSelected=l.id;
    const index=d.lessons.indexOf(l),task=EETextbook.task(S.tasks,l.id),done=d.lessons.filter(l=>EETextbook.completed(S.tasks,l.id)).length;
    const answer=eeAnswers[l.id],currentStage=d.stages.find(s=>s.id===l.stage);
    return heading('CIRCUIT FOUNDATIONS',d.title,d.subtitle,btn('从下一节未完成导学开始','ee-resume','','primary'))+
    `<section class="panel ee-intro"><div><span class="badge green">6 卷参考 · 24 节中文导学</span><h2>从看懂回路，到解释一个完整系统</h2><p>${esc(d.study_note)}</p><p class="note">${done} / ${d.lessons.length} 节已记录任务成果。阅读、自测和浏览器位置不计入成果进度。</p></div><details><summary>六个阶段怎样过关</summary><ol>${d.stages.map(s=>`<li><b>${esc(s.title)}</b>：${esc(s.gate)}</li>`).join('')}</ol></details></section>
    <details class="panel ee-questions"><summary>视频讲快了？从 ${d.questions.length} 个常见问题找入口</summary><div class="ee-question-grid">${d.questions.map(q=>eeLessonButton(d.lessons.find(l=>l.id===q.lesson),q.question)).join('')}</div></details>
    <div class="ee-layout"><aside class="panel ee-outline" aria-label="电路导学目录"><h2>由浅入深学</h2><label for="ee-search">搜索知识点<input id="ee-search" type="search" value="${esc(eeQuery)}" placeholder="共地、MOSFET、滤波…"></label><label for="ee-stage">阶段<select id="ee-stage"><option value="all">全部阶段</option>${d.stages.map((s,i)=>`<option value="${s.id}" ${eeStage===s.id?'selected':''}>${i+1} · ${esc(s.title)}</option>`).join('')}</select></label><div id="ee-outline-results">${eeOutlineResults(d,l)}</div></aside>
    <article class="panel ee-reader" aria-labelledby="ee-lesson-title"><span class="study-kicker">${esc(currentStage.title)} · 建议 ${l.minutes} 分钟</span><h2 id="ee-lesson-title" tabindex="-1">${esc(l.title)}</h2><p class="ee-question">${esc(l.question)}</p>${renderLearningContext('theory',l.id)}
    ${l.prerequisites.length?`<p class="note">建议先读：${l.prerequisites.map(id=>eeLessonButton(d.lessons.find(x=>x.id===id))).join('')} 可按已有基础跳读。</p>`:'<p class="note">起点：会四则运算即可。先读解释，遇到公式跟着算一次。</p>'}
    <h3>先把概念说清楚</h3>${l.concepts.map(p=>`<p>${esc(p)}</p>`).join('')}
    <div class="ee-formula"><span>关键关系与适用条件</span><p>${esc(l.formula)}</p></div>
    <h3>跟着算一次</h3><ol class="ee-example">${l.example.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="note">平台原创教学算例；不是你的实验结果。</p>
    <div class="ee-misconception"><b>容易误解的地方</b><p>${esc(l.misconception)}</p></div>
    <h3>现在做一个小练习</h3><p>${esc(l.practice)}</p><p><b>过关标准：</b>${esc(l.acceptance)}</p>${l.lab?btn('打开对应交互练习','ee-lab',l.id,'small'):''}
    <form id="ee-quiz" data-lesson="${l.id}" class="ee-quiz"><fieldset><legend>自测 · ${esc(l.quiz.question)}</legend>${l.quiz.options.map((o,i)=>`<label><input type="radio" name="answer" value="${i}" required ${answer===i?'checked':''}>${esc(o)}</label>`).join('')}</fieldset><button type="submit" class="btn">检查答案与解释</button><p role="status" id="ee-feedback">${answer===undefined?'选一个答案，再看原因。':`${answer===l.quiz.answer?'回答正确。':'再想一想。'} ${esc(l.quiz.explanation)}`}</p><small>自测只帮助检查理解，不自动完成任务或累计学习时长。</small></form>
    <h3>回到教材，读懂推导</h3><p class="note">先读中文导学，再对照英文原文的图、推导与条件；深入范围由下面的原文章节决定。</p><ul>${l.sources.map(s=>`<li>${eeLink(s)}</li>`).join('')}</ul>
    <div class="ee-reader-actions">${btn(task?'查看或更新本节任务':'安排本节学习','ee-task',l.id,'primary')}${btn('补充个人想法','ee-note',l.id)}</div>
    <p class="note">${EETextbook.completed(S.tasks,l.id)?'本节已有任务成果；可回看并继续验证。':task?'本节已有任务安排，完成后请填写真实成果。':'安排学习会先打开可编辑任务；保存后进入今日学习台。'} 自测作答会自动记入学习记录；个人想法可选填。</p>
    <div class="ee-pagination">${index?btn('← 上一节','ee-select',d.lessons[index-1].id):'<span></span>'}${index<d.lessons.length-1?btn('下一节 →','ee-select',d.lessons[index+1].id):btn('回到学习记录','nav','journal')}</div></article></div>
    <section class="panel ee-catalog"><h2>六卷知识地图</h2><p>保留原站 81 个章节入口索引（含贡献者章节）。每章的“相关导学”只是入门连接；进阶内容请打开本卷原目录按章节继续阅读。</p><div class="ee-volume-grid">${d.volumes.map(v=>`<details class="ee-volume"><summary>卷 ${v.number} · ${esc(v.title)} <small>${v.chapters.length} 章</small></summary><p>${esc(v.guide)}</p>${eeLink({title:'打开本卷原目录',url:v.url})}<ol>${v.chapters.map(c=>`<li><b>${esc(c.title)}</b><small>${esc(c.scope)}</small>${c.lessons.map(id=>eeLessonButton(d.lessons.find(l=>l.id===id))).join('')}</li>`).join('')}</ol></details>`).join('')}</div></section>
    <section class="panel ee-attribution"><h2>使用范围与出处</h2><p>${esc(d.safety)}</p><p>${esc(d.source.title)} · ${esc(d.source.author)} · ${esc(d.source.publisher)}</p><p>${esc(d.source.note)}</p><p>${eeLink({title:'教材首页',url:d.source.url})} · ${eeLink({title:d.source.license,url:d.source.license_url})} · 目录核对：${esc(d.source.checked_on)}</p></section>`;
  }
  function eeChoose(id){eeSelected=id;studyStore.write('radar-ee-lesson',id);render();document.getElementById('ee-lesson-title')?.focus();document.getElementById('ee-lesson-title')?.scrollIntoView({block:'start',behavior:'instant'})}
  function eeOutlineResults(d,l){
    const visible=d.lessons.filter(x=>(eeStage==='all'||x.stage===eeStage)&&EETextbook.matches(x,eeQuery));
    return `<p class="note" aria-live="polite">找到 ${visible.length} 节导学</p>${d.stages.map((s,i)=>{const rows=visible.filter(x=>x.stage===s.id);return rows.length?`<details class="ee-stage-group" ${eeQuery||eeStage!=='all'||s.id===l.stage?'open':''}><summary>${i+1} · ${esc(s.title)}</summary>${rows.map(x=>eeLessonButton(x)).join('')}</details>`:''}).join('')}${!visible.length?'<p>没有匹配内容。可清空搜索或在下方六卷索引按章节查找。</p>':''}`;
  }
  function eeFilterOutline(){const d=S.ee_textbook;document.getElementById('ee-outline-results').innerHTML=eeOutlineResults(d,d.lessons.find(l=>l.id===eeSelected)||d.lessons[0])}
  function eeBind(){
    const search=document.getElementById('ee-search');if(search)search.oninput=e=>{eeQuery=e.target.value;eeFilterOutline()};
    const stage=document.getElementById('ee-stage');if(stage)stage.onchange=e=>{eeStage=e.target.value;eeFilterOutline()};
    const quiz=document.getElementById('ee-quiz');if(quiz)quiz.onsubmit=e=>{e.preventDefault();const l=S.ee_textbook.lessons.find(l=>l.id===quiz.dataset.lesson),answer=Number(new FormData(quiz).get('answer')),feedback=(answer===l.quiz.answer?'回答正确。':'再想一想。')+' '+l.quiz.explanation;eeAnswers[l.id]=answer;document.getElementById('ee-feedback').textContent=feedback;saveAutomaticJournal('ee:'+l.id+':quiz',{title:'电路导学自测：'+l.title,track:'robotics',learning_route:'robotics',stage:window.learningContext?.('theory',l.id)?.stage||'robotics-1',kind:'activity',evidence_type:'activity',question:l.quiz.question,result:'所选答案：'+l.quiz.options[answer]+'\n反馈：'+feedback+'\n本次作答不代表已经掌握。',conclusion:'',links:l.sources.map(s=>s.url)});};
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action^="ee-"]');if(!b)return;
    const {action,id}=b.dataset,d=S.ee_textbook;if(!d)return;
    const l=d.lessons.find(l=>l.id===id);
    if(action==='ee-select'&&l)eeChoose(l.id);
    if(action==='ee-resume'){eeQuery='';eeStage='all';eeChoose(EETextbook.next(d.lessons,S.tasks).id)}
    if(action==='ee-task'&&l)taskModal(EETextbook.task(S.tasks,l.id)||EETextbook.taskDraft(l,learningContext('theory',l.id)?.stage));
    if(action==='ee-note'&&l)journalModal(EETextbook.noteDraft(l,EETextbook.task(S.tasks,l.id),learningContext('theory',l.id)?.stage));
    if(action==='ee-lab'&&l?.lab){const m=learningContext('theory',l.id);openLearningLab(m?.labs.includes(l.lab)?l.lab:(m?.labs[0]||l.lab),m?.id||'')}
  });
  window.openEETextbook=id=>{eeSelected=id;eeQuery='';eeStage='all';page='textbook';history.pushState(null,'','#textbook');eeChoose(id)};
  window.renderEETextbook=renderEETextbook;window.eeBind=eeBind;
}

function eeEntry(){return `<section class="ee-entry"><div><b>视频讲快了？来电路原理补课站</b><p>24 节中文导学，从单位与回路到驱动、采样；连接 All About Circuits 六卷教材。</p></div>${btn('开始补课 →','nav','textbook')}</section>`}
