/* Curated reading plans create editable drafts, never study evidence. */
const RoboticsCurriculum={
  find(data,id){for(const month of data?.months||[]){const block=month.blocks.find(b=>b.id===id);if(block)return {month,block,source:data.sources[block.source]};}return null;},
  sessionMinutes(value=45){const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=1440?Math.min(n,45):45;},
  task(data,id,dailyMinutes=45){
    const found=this.find(data,id);if(!found)return null;
    const {month:m,block:b,source:s}=found;
    const minutes=this.sessionMinutes(dailyMinutes),reading=b.readings?.map((r,i)=>`${i+1}. ${r.title}${r.optional?'（按需）':''}：${r.url}`).join('\n')||s.url;
    return {title:b.title+' · 第一步',track:data.track||'robotics',stage:m.stage,minutes,state:'todo',evidence:'',source_url:b.readings?.[0]?.url||s.url,
      note:`本次只做：${b.first_step}\n本次预算：${minutes} 分钟；做不完可拆分到下次，验收条件不变。\n首选资料：${s.title}\n阅读顺序：\n${reading}\n学习范围：${b.scope}\n整块练习（可分多次）：${b.exercise}\n整块验收：${b.acceptance}\n本次成果：请完成后自行记录，不代表整块或整月已完成。`};
  }
};
if(typeof module!=='undefined')module.exports=RoboticsCurriculum;
if(typeof document!=='undefined'){
  const data=()=>S[getSiteRoute()+'_curriculum'];
  window.currentCurriculum=data;
  const sessionMinutes=()=>RoboticsCurriculum.sessionMinutes(studyGoal);
  const external=(url,title,cls='')=>`<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;
  const codeExample=(value,language='text')=>`<figure class="walkthrough-code"><figcaption>${esc(language==='python'?'Python 3 示例':language==='cpp'?'Arduino 示例':language==='shell'?'终端命令':'文字示例')}${btn('复制代码','curated-copy-code','','small')}</figcaption><pre tabindex="0"><code>${esc(value)}</code></pre></figure>`;
  function renderWalkthrough(b){
    const l=b.walkthrough;if(!l)return '';
    return `<details class="walkthrough" id="lesson-${b.id}"><summary>开始本站跟练 · ${esc(l.title)}</summary><div class="walkthrough-body"><p class="walkthrough-goal">${esc(l.goal)}</p><h5>开始前准备</h5><ul>${l.setup.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><dl class="walkthrough-terms">${l.terms.map(x=>`<div><dt>${esc(x.term)}</dt><dd>${esc(x.meaning)}</dd></div>`).join('')}</dl>${b.lab?`<div class="actions">${btn('打开交互练习','learning-lab',b.companion+':'+b.lab,'small')}<span class="note">练习页可返回本阶段继续阅读。</span></div>`:''}<ol class="walkthrough-steps">${l.steps.map((s,i)=>`<li><h5>${/^小课 /.test(s.title)?'':(i+1)+'. '}${esc(s.title)}</h5><p>${esc(s.instruction)}</p>${s.code?codeExample(s.code,s.language):''}<details class="walkthrough-answer"><summary>先预测，再核对结果与原因</summary><p><b>预期结果：</b>${esc(s.expected)}</p><p><b>为什么：</b>${esc(s.why)}</p></details></li>`).join('')}</ol><div class="walkthrough-transfer"><h5>自己改一次</h5><p>${esc(l.practice)}</p><details class="walkthrough-answer"><summary>做过以后，查看核对提示</summary><p>${esc(l.answer)}</p></details></div><h5>独立完成的标准</h5><ul>${l.rubric.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="note">${esc(l.attribution)}</p></div></details>`;
  }
  function renderBridge(b){const x=b.bridge;return x?`<details class="walkthrough-bridge"><summary>先补这一小课 · ${esc(x.title)}</summary><p>${esc(x.explanation)}</p>${codeExample(x.example,x.language)}<p><b>试着回答：</b>${esc(x.question)}</p><details class="walkthrough-answer"><summary>核对理解</summary><p>${esc(x.answer)}</p></details><p class="note">${esc(x.before)}</p></details>`:'';}
  function renderDiagnostics(b){return `<details class="curated-remedy"><summary>按现象排查 · 卡住先看这里</summary><dl class="walkthrough-diagnostics">${(b.diagnostics||[]).map(x=>`<div><dt>${esc(x.symptom)}</dt><dd>${esc(x.check)}</dd></div>`).join('')}</dl>${b.remedy?.block?btn('回补：'+esc(RoboticsCurriculum.find(data(),b.remedy.block)?.block.title||''),'curated-block',b.remedy.block,'small'):''}</details>`;}
  function renderCuratedBlock(b){
    const s=data().sources[b.source],readings=b.readings||[],first=readings[0];
    return `<article class="curated-block" id="curated-${b.id}" tabindex="-1">
      <div class="curated-block-top"><span>学习块 ${b.week}</span><span class="badge ${b.optional?'gray':'green'}">${b.optional?'训练选做':b.walkthrough?'有完整跟练':'分步练习'}</span></div>
      <h4>${esc(b.title)}</h4><div class="curated-source"><small>${esc(b.resource_role||'配套资料')}</small>${external(s.url,s.title)}</div>
      <p class="curated-prerequisite"><b>起步自检</b>${esc(b.prerequisite||'')}</p>${b.intuition?`<p class="curated-intuition"><b>先懂一句话</b>${esc(b.intuition)}</p>`:''}
      ${renderBridge(b)}${renderWalkthrough(b)}
      ${b.study_load?`<details class="curated-load"><summary>怎样分配时间 · 核心练习参考 ${b.study_load.core_minutes} 分钟</summary><p>最小体验：先用 15–30 分钟完成第一步。核心练习参考 ${b.study_load.core_minutes} 分钟；含独立修改与深入练习参考 ${b.study_load.deep_minutes} 分钟，均可分多次。</p><p>${esc(b.study_load.note)}</p></details>`:''}
      ${first?`<div class="curated-start"><small>${b.walkthrough?'配套教材 · 按问题补充':'原始教材 · 按范围阅读'}</small>${external(first.url,first.title)}<p>${esc(first.note)}</p>${first.fallback_url?external(first.fallback_url,'本节官方源文件','curated-fallback'):''}</div>`:''}
      <details class="curated-reading"><summary>阅读顺序与范围${readings.length>1?` · 共 ${readings.length} 节`:''}</summary>
        ${readings.length>1?`<ol start="2">${readings.slice(1).map(r=>`<li>${external(r.url,r.title)}${r.optional?'<span class="badge gray">按需再读</span>':''}<p>${esc(r.note)}</p>${r.fallback_url?external(r.fallback_url,'本节官方源文件','curated-fallback'):''}</li>`).join('')}</ol>`:''}
        <p><b>读到哪里就停</b>${esc(b.reading_stop||b.scope)}</p><p>${esc(b.scope)}</p><p class="curated-why"><b>为什么选这份资料</b>${esc(b.why)}</p>
      </details>
      <details class="curated-practice"><summary>三步跟练 · 怎样算学会</summary><ol class="curated-steps">${(b.sessions||[]).map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p><b>动手练习</b>${esc(b.exercise)}</p><p><b>验收条件</b>${esc(b.acceptance)}</p><p><b>今天第一步</b>${esc(b.first_step)}</p></details>
      ${b.extension_exercise?`<details class="curated-practice"><summary>学会后再挑战原路线练习</summary><p>${esc(b.extension_exercise)}</p><p>进一步验收：${esc(b.extension_acceptance)}</p></details>`:''}
      ${renderDiagnostics(b)}
      ${renderBlockCommunity(b)}
      ${b.recall?`<details class="curated-remedy"><summary>回想旧知识 · 先不看答案</summary><p>${esc(b.recall.prompt)}</p>${btn('回看对应学习块','curated-block',b.recall.block,'small')}</details>`:''}
      ${b.optional?'<p class="curated-optional">没有合适 GPU：先完成阅读与数据检查报告，训练可后补。</p>':''}
      <div class="actions curated-actions">${btn('围绕本块安排 7 / 14 天','curated-plan',b.id,'small')}${btn('安排第一步 · '+sessionMinutes()+' 分钟','curated-task',b.id,'small')}${b.lesson?btn('中文原理导学','learning-theory',b.companion+':'+b.lesson,'small'):''}${b.lab?btn('配套交互练习','learning-lab',b.companion+':'+b.lab,'small'):''}</div>
      <details class="curated-access"><summary>${esc(s.format)} · 费用与版本说明</summary><p>${esc(s.access)}</p><p>${esc(s.language)}</p><p>资料核对：${s.checked_on} · ${esc(s.verification)}</p>${s.fallback_url?external(s.fallback_url,'官方源文件备用入口'):''}</details>
    </article>`;
  }
  function renderCuratedMonth(m,road,tasks){
    const stage=road.stages.find(s=>s.id===m.stage),rows=tasks.filter(t=>t.stage===m.stage);
    const selected=studyStore.read('radar-curated-month:'+getSiteRoute(),getSiteRoute()+'-1');
    return `<details class="curated-month panel" id="road-stage-${m.stage}" ${m.stage===selected?'open':''}><summary><span class="curated-number">${String(m.month).padStart(2,'0')}</span><span><small>第 ${m.month} 个月 · 学习块 ${m.blocks[0].week}–${m.blocks.at(-1).week}</small><strong>${esc(m.title)}</strong><span>${esc(m.goal)}</span></span><span class="curated-month-hint">展开 / 收起</span></summary><div class="curated-month-body"><p class="curated-prerequisite"><b>开始前</b> ${esc(m.prerequisite)}</p><p class="curated-main-note">${esc(m.main_note||'')}</p><section class="curated-gate"><span class="study-kicker">本月作品</span><h3>${esc(m.project)}</h3><ul>${m.gate.map(g=>`<li>${esc(g)}</li>`).join('')}</ul><p>按这三条检查作品，再进入下一阶段。</p></section><div class="curated-blocks">${m.blocks.map(renderCuratedBlock).join('')}</div><details class="curated-extra"><summary>学会基础以后，怎样深入</summary><p>${esc(m.deeper||'先独立复现本月作品，再看原路线的进阶项目。')}</p><p class="note">先通过本月三条验收，再选一个问题深入；不需要现在同时完成。</p></details><div class="curated-boundaries"><p><b>条件暂不具备时</b>${esc(m.no_hardware)}</p><p><b>这个月先放一放</b>${esc(m.defer)}</p></div><details class="curated-extra"><summary>配套原理与实验 · 按问题回看</summary>${renderStageLearning(stage)}</details><details class="curated-extra"><summary>原路线项目 · 更多练习选择</summary><div class="practice-grid">${(stage.projects||[]).map(p=>`<article class="practice"><h4>${esc(p.title)}</h4><p>${esc(p.instruction)}</p><p class="note">验收：${esc(p.acceptance)}</p>${btn('安排一次学习','plan-task',p.id,'small')}</article>`).join('')}</div></details>${stageResources(stage)}<section class="curated-my-tasks"><div class="panel-head"><h4>我的本月任务 · ${rows.filter(t=>t.state==='done').length} / ${rows.length}</h4><div class="actions">${btn('自定义实践','stage-task',m.stage,'small')}${btn('写阶段记录','journal-stage',m.stage,'small')}</div></div>${taskRows(rows)||'<p class="note">还没有安排任务。从上面的学习块选择今天的第一步。</p>'}</section></div></details>`;
  }
  function renderRoboticsCurriculum(road,tasks){
    const d=data();
    return heading('LEARN / STEP BY STEP','从零开始，一步步学进去。','先检查起点，再跟练、解释和验收。',btn('＋ 自定义任务','task-new','','primary'))+`<section class="panel curated-hero"><div><span class="study-kicker">${esc(d.title)}</span><h2>${esc(d.hero)}</h2><p>${esc(d.spine)}</p><div class="curated-stats"><span><b>6</b> 个能力阶段</span><span><b>24</b> 个学习块</span><span><b>3</b> 步跟练 / 块</span></div></div><div class="curated-pace"><b>先修会了，再往前走</b><p>${esc(d.pace)}</p><p>${esc(d.rhythm)}</p>${btn('从第一块开始','curated-block',d.months[0].blocks[0].id,'primary')}</div></section>${renderBeginnerStart()}<section class="curated-map" aria-label="六个月学习导航">${d.months.map(m=>`<button type="button" data-action="curated-month" data-id="${m.stage}"><small>STAGE ${String(m.month).padStart(2,'0')}</small><b>${esc(m.title)}</b><span class="curated-map-source">${esc(m.main_label||'主线课程')}：${esc(m.main_label==='项目主线'?m.project:d.sources[m.lead_source]?.title||'本站分步练习')}</span><span>学习块 ${m.blocks[0].week}–${m.blocks.at(-1).week} →</span></button>`).join('')}</section><details class="curated-method"><summary>主教材、练习和参考资料怎样搭配</summary><p>${esc(d.selection)}</p><p>${esc(d.reading_note)}</p><p>${esc(d.language)}</p><p>中文导读、跟练与验收为本站原创编排。课程保留原作者入口；浏览、排期与测验不会自动代表掌握。原始资料目录保留作进阶选读。</p>${external(road.source.url,'六阶段结构参考：Ronin 原文')}</details><div class="curated-months">${d.months.map(m=>renderCuratedMonth(m,road,tasks)).join('')}</div><section class="panel curated-progress"><h2>我的路线进度</h2>${trackCards()}<p class="note">只统计你创建的任务。完成一个小任务不代表整块或整月验收通过。</p>${tasks.some(t=>!t.stage)?`<h3>尚未归入阶段</h3>${taskRows(tasks.filter(t=>!t.stage))}`:''}</section><details class="curated-short-plan"><summary>把当前学习块排成 7 / 14 天</summary><p class="note">新计划与上方学习块使用同一顺序；按难度与每日预算拆分，复杂块可以跨周。旧计划保留，可自行选择起点重新安排。</p>${personalPlanPanel()}</details>`;
  }
  function renderBeginnerStart(){const d=data();if(!d)return '';return `<section class="panel curriculum-start"><span class="study-kicker">零基础入口</span><h2>第一次来，先做这一件事。</h2><p>${esc(d.orientation)}</p><p><b>今天：</b>${esc(d.starter)}</p><ol class="beginner-ladder"><li>看懂现象</li><li>跟做例子</li><li>只改一处</li><li>解释结果</li><li>独立复现</li></ol><div class="actions">${btn('打开第一块','curated-block',d.months[0].blocks[0].id,'primary')}${btn('按我的时间安排','curated-plan',d.months[0].blocks[0].id)}</div><p class="note">卡住先回补；记录不懂的地方也是有效进展。每天时间可以输入，做不完就继续当前块。</p></section>`;}
  function renderCurriculumGuides(){const d=data();return heading('PRACTICE / STEP BY STEP','先跟做，再自己改一次。','与学习路线共用步骤，从第一阶段开始，不需要先完成一个大项目。')+renderBeginnerStart()+d.months.map(m=>`<section class="panel"><span class="study-kicker">阶段 ${m.month}</span><h2>${esc(m.title)}</h2><p>${esc(m.prerequisite)}</p><div class="curated-blocks">${m.blocks.map(b=>`<article class="curated-block"><h3>${esc(b.title)}</h3><p>${esc(b.intuition)}</p><ol class="curated-steps">${b.sessions.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="actions">${btn('打开教材与回补入口','curated-block',b.id,'small')}${btn('安排本块练习','curated-plan',b.id,'small')}</div></article>`).join('')}</div></section>`).join('');}

  function openRoboticsMonth(stage){
    const target=document.getElementById('road-stage-'+stage);if(!target)return;
    if(target.tagName==='DETAILS')target.open=true;
    studyStore.write('radar-curated-month:'+getSiteRoute(),stage);
    const summary=target.querySelector('summary');summary?.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});
  }
  function restoreCurriculumLocation(){
    if(page!=='learn')return;
    const id=new URLSearchParams(location.search).get('block'),found=RoboticsCurriculum.find(data(),id);if(!found)return;
    const target=document.getElementById('curated-'+id),month=document.getElementById('road-stage-'+found.month.stage);
    if(month)month.open=true;const lesson=target?.querySelector('.walkthrough');if(lesson)lesson.open=true;
    requestAnimationFrame(()=>{if(page==='learn'&&new URLSearchParams(location.search).get('block')===id)target?.scrollIntoView({block:'start',behavior:'instant'});});
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action^="curated-"]');if(!b||!data())return;
    if(b.dataset.action==='curated-copy-code'){
      const code=b.closest('.walkthrough-code')?.querySelector('code');if(!code)return;
      const fallback=()=>{const range=document.createRange();range.selectNodeContents(code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);toast('已选中完整代码，请手动复制');};
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code.textContent).then(()=>toast('完整代码已复制'),fallback);else fallback();return;
    }
    if(b.dataset.action==='curated-plan'){planProfileModal(b.dataset.id);return;}
    if(['curated-block','curated-month'].includes(b.dataset.action)&&page!=='learn'){page='learn';history.pushState(null,'','#learn');render();}
    if(b.dataset.action==='curated-month'){const url=new URL(location.href);url.searchParams.delete('block');history.replaceState(null,'',url);openRoboticsMonth(b.dataset.id);}
    if(b.dataset.action==='curated-task'){const draft=RoboticsCurriculum.task(data(),b.dataset.id,sessionMinutes());if(draft)taskModal(draft);}
    if(b.dataset.action==='curated-block'){
      const found=RoboticsCurriculum.find(data(),b.dataset.id);if(!found)return;
      const url=new URL(location.href);url.searchParams.set('block',found.block.id);history.replaceState(null,'',url);
      openRoboticsMonth(found.month.stage);
      const target=document.getElementById('curated-'+found.block.id);const lesson=target?.querySelector('.walkthrough');if(lesson)lesson.open=true;target?.focus({preventScroll:true});target?.scrollIntoView({block:'start',behavior:'instant'});
    }
  });
  document.addEventListener('toggle',e=>{
    if(e.target.matches?.('.curated-month')&&e.target.open)studyStore.write('radar-curated-month:'+getSiteRoute(),e.target.id.replace('road-stage-',''));
  },true);
  Object.assign(window,{renderRoboticsCurriculum,openRoboticsMonth,renderBeginnerStart,renderCurriculumGuides,restoreCurriculumLocation});
}
