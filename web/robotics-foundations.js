/* Shared player for original robotics foundation lessons. No study receipts are inferred. */
(function(global){
  'use strict';
  const storageKey='lbb-robotics-foundations-drafts-v1';
  const tabs=[['explain','① 中文讲解'],['lab','② 逐步动画'],['code','③ 运行代码'],['practice','④ 动手练习'],['verify','⑤ 独立验证']];
  let data=null,active=null,storageOkay=true;
  const sessions=new Map();
  let drafts={};
  try{const saved=JSON.parse(global.localStorage?.getItem(storageKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))drafts=saved;}catch(_){storageOkay=false;}
  function readDraft(id){
    try{const saved=JSON.parse(global.localStorage?.getItem(storageKey+':'+id)||'null');if(saved&&typeof saved==='object'&&!Array.isArray(saved))drafts[id]=saved;}catch(_){storageOkay=false;}
    return drafts[id]||{};
  }
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=value=>typeof value==='number'?(Math.abs(value)>1e7||(value!==0&&Math.abs(value)<1e-5)?value.toExponential(4):String(Number(value.toFixed(5)))):typeof value==='string'?value:JSON.stringify(value);
  function formatVariable(value){
    if(Array.isArray(value))return value.some(item=>item&&typeof item==='object')?value.map(item=>JSON.stringify(item)).join('\n'):JSON.stringify(value);
    if(value&&typeof value==='object')return Object.entries(value).map(([key,item])=>key+': '+JSON.stringify(item)).join('\n');
    return format(value);
  }
  function finite(value){if(typeof value==='number')return Number.isFinite(value);if(value&&typeof value==='object')return Object.values(value).every(finite);return true;}
  function checkAnswer(value,verification){
    const text=String(value??'').trim();
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))return {correct:false,message:'请先填写一个有限数值，再核对单位与题目条件。'};
    const number=Number(text),correct=Number.isFinite(number)&&Math.abs(number-verification.expected)<=verification.tolerance;
    return {correct,message:correct?'数值与这道独立题一致。请继续解释中间过程，再完成换条件验证。':'数值还不一致。检查题目中的新输入、单位和计算步骤，再试一次。'};
  }
  function configure(value){data=value;return data;}
  function topicFor(id){return data.topics.find(t=>t.id===id);}
  function lessonFor(id){for(const topic of data.topics){const lesson=topic.lessons.find(l=>l.id===id);if(lesson)return {topic,lesson};}return null;}
  function modelFor(lesson){const model=global.RoboticsFoundationModels?.[lesson.modelId];if(!model)throw Error('本课计算模型尚未载入：'+lesson.modelId);return model;}
  function compute(model,params){const trace=model.run({...params});if(!trace||!Array.isArray(trace.frames)||trace.frames.length<4||!finite(trace))throw Error('模型没有返回完整的有限数值轨迹。');return trace;}
  function session(lesson){
    if(!sessions.has(lesson.id)){
      const model=modelFor(lesson),draft=readDraft(lesson.id);
      let params=Object.fromEntries(model.controls.map(c=>[c.key,draft.params?.[c.key]??c.value])),trace;
      try{trace=compute(model,params);}catch(_){params=Object.fromEntries(model.controls.map(c=>[c.key,c.value]));trace=compute(model,params);}
      sessions.set(lesson.id,{params,trace,index:0,tab:'explain'});
    }
    return sessions.get(lesson.id);
  }
  function sourceFor(model,params){
    return "'use strict';\n// 原创教学模型；与课件调用同一个纯函数。\nconst simulate = "+model.run.toString()+";\nconst params = "+JSON.stringify(params,null,2)+";\nconst trace = simulate(params);\nconsole.log(JSON.stringify(trace, null, 2));\n";
  }
  function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'#';}catch(_){return '#';}}
  function download(name,text,type='text/plain;charset=utf-8'){
    const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadExamples(){if(!data?.examplesZip)return;const binary=atob(data.examplesZip),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));download('robotics-foundations-code.zip',bytes,'application/zip');}
  function persist(){
    if(!active?.lesson)return;
    const {host,lesson,state}=active,draft={...readDraft(lesson.id),params:{...state.params}};
    for(const field of ['prediction','answer','reason']){const input=host.querySelector('[data-rf-field="'+field+'"]');if(input)draft[field]=input.value.slice(0,12000);}
    drafts[lesson.id]=draft;
    try{global.localStorage?.setItem(storageKey+':'+lesson.id,JSON.stringify(draft));storageOkay=true;}catch(_){storageOkay=false;}
    const status=host.querySelector('.rf-draft-status');if(status)status.textContent=storageOkay?'填写与参数保存在当前浏览器。':'当前浏览器无法保存草稿，请导出练习。';
  }
  function pause(){if(!active)return;clearTimeout(active.timer);active.timer=null;active.playing=false;const b=active.host.querySelector('[data-rf-action="play"]');if(b){b.textContent='播放过程';b.setAttribute('aria-pressed','false');}}
  function destroy(){if(!active)return;pause();persist();active.abort?.abort();active=null;}
  const button=(label,action,value='',primary=false)=>`<button type="button" class="rf-button${primary?' rf-primary':''}" data-rf-action="${action}" data-rf-value="${esc(value)}">${esc(label)}</button>`;
  function mountCourse(host,topic,options={}){
    destroy();const controller=new AbortController();active={host,topic,abort:controller};
    host.innerHTML=`<section class="rf-scope rf-course" data-rf-topic="${esc(topic.id)}">
      <header class="rf-course-header"><div><div class="rf-eyebrow">机器人共同基础 · 本站原创配套课</div><h1>${esc(topic.title)}</h1><p class="rf-lead">${esc(topic.subtitle)}</p></div>${button('开始第 1 课 →','open',topic.lessons[0].id,true)}</header>
      <div class="rf-course-summary"><span>${topic.lessons.length} 节配套基础课</span><span>中文讲解 <i>→</i> 图示与计算 <i>→</i> 运行代码 <i>→</i> 动手练习 <i>→</i> 独立验证</span></div>
      <section class="rf-course-directory" aria-labelledby="rf-directory-title"><div class="rf-directory-heading"><h2 id="rf-directory-title">课程目录</h2><span>按顺序学习，也可以选择一课进入</span></div><ol class="rf-course-grid">${topic.lessons.map((l,i)=>`<li class="rf-card"><span class="rf-course-index">${String(i+1).padStart(2,'0')}</span><div class="rf-course-copy"><h3>${esc(l.title)}</h3><p>${esc(l.question)}</p></div><button type="button" class="rf-button" data-rf-action="open" data-rf-value="${esc(l.id)}" aria-label="进入第 ${i+1} 课：${esc(l.title)}">进入本课 <span aria-hidden="true">→</span></button></li>`).join('')}</ol></section>
      <div class="rf-course-support"><a href="${esc(safeUrl(topic.officialUrl))}" target="_blank" rel="noopener noreferrer">原始课程与材料 ↗</a>${data.examplesZip?button('下载全部可运行代码','examples'):''}</div>
      <details class="rf-course-scope"><summary>课程范围与版本说明</summary><p>${esc(topic.courseLabel)}</p><p>${esc(topic.scope)}</p><p class="rf-note">${esc(topic.boundary)}</p></details>${options.extraHTML||''}</section>`;
    host.addEventListener('click',event=>{const b=event.target.closest('[data-rf-action]');if(!b)return;if(b.dataset.rfAction==='open')options.openLesson?.(b.dataset.rfValue);else if(b.dataset.rfAction==='examples')downloadExamples();},{signal:controller.signal});
  }
  function controlsHTML(model,state){return model.controls.map(c=>`<label class="rf-control"><span>${esc(c.label)} <output data-rf-output="${esc(c.key)}">${c.options?esc(c.options[state.params[c.key]]):esc(format(state.params[c.key])+' '+(c.unit||''))}</output></span>${c.options?`<select data-rf-param="${esc(c.key)}" aria-label="${esc(c.label)}">${c.options.map((label,i)=>`<option value="${i}" ${i===Number(state.params[c.key])?'selected':''}>${esc(label)}</option>`).join('')}</select>`:`<input type="range" data-rf-param="${esc(c.key)}" aria-label="${esc(c.label)}" min="${c.min}" max="${c.max}" step="${c.step}" value="${state.params[c.key]}">`}</label>`).join('');}
  function mountLesson(host,topic,lesson,options={}){
    destroy();const state=session(lesson),model=modelFor(lesson),draft=readDraft(lesson.id),controller=new AbortController();
    active={host,topic,lesson,state,model,options,abort:controller,playing:false,timer:null};
    host.innerHTML=`<section class="rf-scope rf-lesson" data-rf-lesson="${esc(lesson.id)}"><header class="rf-lesson-header"><div><div class="rf-eyebrow">${esc(topic.title)} · 第 ${topic.lessons.findIndex(l=>l.id===lesson.id)+1} / ${topic.lessons.length} 课 · 原创配套课</div><h1>${esc(lesson.title)}</h1><p class="rf-lead">${esc(lesson.question)}</p></div>${options.hideCourseBack?'':button('← 课程目录','course')}</header><details class="rf-lesson-objectives"><summary>这一课的产出</summary><ul>${lesson.objectives.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></details><nav class="rf-tabs" role="tablist" aria-label="本课五个学习环节">${tabs.map(([id,label])=>`<button type="button" id="rf-tab-${id}" role="tab" aria-selected="${state.tab===id}" aria-controls="rf-panel-${id}" tabindex="${state.tab===id?0:-1}" data-rf-action="tab" data-rf-value="${id}">${id==='lab'&&model.presentation==='calculation'?'② 交互计算':label}</button>`).join('')}</nav>
    <section class="rf-panel" id="rf-panel-explain" role="tabpanel" aria-labelledby="rf-tab-explain" ${state.tab!=='explain'?'hidden':''}><div class="rf-reading"><article class="rf-paper"><h2>从一个具体问题开始</h2>${lesson.explanation.map(p=>'<p>'+esc(p)+'</p>').join('')}${button(model.presentation==='calculation'?'改参数，核对计算 →':'带着预测看动画 →','tab','lab',true)}</article><aside class="rf-paper"><h3>开始前</h3><ul>${lesson.prerequisites.map(p=>'<li>'+esc(p)+'</li>').join('')}</ul><h3>演示范围</h3><p>${esc(topic.boundary)}</p></aside></div></section>
    <section class="rf-panel" id="rf-panel-lab" role="tabpanel" aria-labelledby="rf-tab-lab" ${state.tab!=='lab'?'hidden':''}><div class="rf-lab-workspace" role="region" aria-label="${model.presentation==='calculation'?'参数图示与计算步骤左右对照':'机器人动画与代码左右对照'}" tabindex="0"><div class="rf-lab-grid"><div class="rf-lab-left"><div class="rf-toolbar">${model.presentation==='calculation'?'<span class="rf-calculation-label">交互计算 · 改参数比较结果</span>':button('播放过程','play','',true)}${button('← 上一步','previous')}${button('下一步 →','next')}${button('重新计算','run')}<span class="rf-position" aria-live="polite"></span></div><div class="rf-steps" aria-label="计算步骤"></div><div class="rf-visual" aria-label="${model.presentation==='calculation'?'参数与计算结果示意':'当前步骤动画画面'}"></div><details class="rf-lab-settings" ${model.presentation==='calculation'?'open':''}><summary>修改参数，重新计算</summary><div class="rf-parameters">${controlsHTML(model,state)}</div></details><p class="rf-error" role="alert"></p></div><article class="rf-step-copy" tabindex="0" aria-label="当前步骤、代码与变量"><h2 class="rf-step-title"></h2><p class="rf-step-text"></p><div class="rf-caption">当前计算步骤 · 对应代码摘录</div><pre class="rf-step-code" tabindex="0"></pre><dl class="rf-vars"></dl><details class="rf-lab-boundary"><summary>模型范围</summary><p class="rf-model-boundary rf-note"></p></details></article></div></div></section>
    <section class="rf-panel" id="rf-panel-code" role="tabpanel" aria-labelledby="rf-tab-code" ${state.tab!=='code'?'hidden':''}><div class="rf-paper"><h2>运行同一个计算函数</h2><p>下方是当前参数下完整、自包含的 JavaScript。页面运行按钮调用同一个函数；下载后也可用 Node.js 独立运行，完整输出每步变量与最终结果。</p><div class="rf-toolbar">${button('运行当前代码','run','',true)}${button('下载可运行 .cjs','source')}${data.examplesZip?button('下载全部代码包','examples'):''}</div><p class="rf-execution-status" role="status"></p><pre class="rf-full-code" tabindex="0" aria-label="完整可运行JavaScript"></pre><h3>本次执行结果</h3><pre class="rf-result" tabindex="0"></pre>${lesson.localFiles?.length?'<h3>本地实验文件</h3>'+lesson.localFiles.map((f,i)=>`<article class="rf-file"><strong>${esc(f.label)}</strong><code>${esc(f.command||'')}</code>${f.content!==undefined?button('下载文件','file',String(i)):''}<small>${esc(f.path)}</small></article>`).join(''):''}</div></section>
    <section class="rf-panel" id="rf-panel-practice" role="tabpanel" aria-labelledby="rf-tab-practice" ${state.tab!=='practice'?'hidden':''}><article class="rf-paper"><h2>先预测，再改条件，最后解释</h2>${lesson.practice.map((p,i)=>`<section class="rf-practice-step"><h3>${i+1}. ${esc(p.title)}</h3><p>${esc(p.instruction)}</p><details><summary>操作后核对观察</summary><p>${esc(p.expectedObservation)}</p></details></section>`).join('')}<label class="rf-field">我的预测与操作记录<textarea data-rf-field="prediction" maxlength="12000" placeholder="记录输入条件、预测和实际观察。">${esc(draft.prediction||'')}</textarea></label>${button('换一组输入，独立验证 →','tab','verify',true)}</article></section>
    <section class="rf-panel" id="rf-panel-verify" role="tabpanel" aria-labelledby="rf-tab-verify" ${state.tab!=='verify'?'hidden':''}><article class="rf-paper"><h2>用新条件检查一次</h2><p class="rf-verification-prompt">${esc(lesson.verification.prompt)}</p><form class="rf-answer-form"><label class="rf-field">我的数值${lesson.verification.unit?'（'+esc(lesson.verification.unit)+'）':''}<input type="text" inputmode="decimal" autocomplete="off" data-rf-field="answer" value="${esc(draft.answer||'')}" maxlength="100"></label><button class="rf-button rf-primary" type="submit">检查数值</button></form><p class="rf-feedback" role="status">按题目中的新条件计算，再填写答案。</p><details><summary>做完后核对计算与原因</summary><p>${esc(lesson.verification.explanation)}</p><p>参考数值：${esc(format(lesson.verification.expected))} ${esc(lesson.verification.unit)}</p></details><h3>再换一个条件</h3><p>${esc(lesson.verification.transfer)}</p><label class="rf-field">我的解释与独立验证证据<textarea data-rf-field="reason" maxlength="12000" placeholder="写出中间值、复算方法、结果与模型限制。">${esc(draft.reason||'')}</textarea></label><div class="rf-toolbar">${button('导出这次练习','export')}${options.record?button('保存到当前路线记录','record'):''}</div><p class="rf-record-status" role="status"></p><h3>对照原始材料</h3><div class="rf-sources">${lesson.sources.map(s=>`<p><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><small>${esc(s.locator)} · 核对 ${esc(s.accessed)}</small></p>`).join('')}</div></article></section><footer class="rf-lesson-footer"><span class="rf-draft-status"></span><span>数值检查不代表知识掌握；播放与填写不新增学习时长。</span></footer></section>`;
    host.addEventListener('click',click,{signal:controller.signal});
    host.addEventListener('input',input,{signal:controller.signal});
    host.addEventListener('change',event=>{if(event.target.matches('select[data-rf-param]'))recompute();},{signal:controller.signal});
    host.addEventListener('submit',event=>{if(!event.target.matches('.rf-answer-form'))return;event.preventDefault();persist();const result=checkAnswer(host.querySelector('[data-rf-field="answer"]').value,lesson.verification),el=host.querySelector('.rf-feedback');el.textContent=result.message;el.dataset.correct=String(result.correct);},{signal:controller.signal});
    host.addEventListener('keydown',event=>{if(!event.target.matches('.rf-tabs [role="tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const i=tabs.findIndex(([id])=>id===state.tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next][0]);host.querySelector('#rf-tab-'+tabs[next][0]).focus();},{signal:controller.signal});
    global.addEventListener('resize',()=>fitLab(),{signal:controller.signal});
    if(global.ResizeObserver){const observer=new global.ResizeObserver(()=>fitLab());observer.observe(host);controller.signal.addEventListener('abort',()=>observer.disconnect(),{once:true});}
    draw();persist();if(state.tab==='lab')fitLab(true);
  }
  function draw(){
    if(!active?.lesson)return;const {host,model,state}=active,frame=state.trace.frames[state.index];
    host.querySelector('.rf-visual').innerHTML=model.render(frame);
    host.querySelector('.rf-step-title').textContent=frame.title;host.querySelector('.rf-step-text').textContent=frame.text;
    host.querySelector('.rf-step-code').textContent=frame.code;host.querySelector('.rf-vars').innerHTML=Object.entries(frame.vars||{}).map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(formatVariable(value))}</dd></div>`).join('');
    host.querySelector('.rf-position').textContent=`${model.presentation==='calculation'?'核算步骤':'步骤'} ${state.index+1} / ${state.trace.frames.length}`;
    host.querySelector('.rf-steps').innerHTML=state.trace.frames.map((f,i)=>`<button type="button" data-rf-action="step" data-rf-value="${i}" aria-label="步骤 ${i+1}：${esc(f.title)}" aria-current="${i===state.index?'step':'false'}"><span>${i+1}</span></button>`).join('');
    host.querySelector('[data-rf-action="previous"]').disabled=state.index===0;host.querySelector('[data-rf-action="next"]').disabled=state.index===state.trace.frames.length-1;
    host.querySelector('.rf-model-boundary').textContent=state.trace.boundary;
    host.querySelector('.rf-full-code').textContent=sourceFor(model,state.params);host.querySelector('.rf-result').textContent=JSON.stringify(state.trace.result,null,2);
    drawInspector();
  }
  const inspectorCourses={mechanics:'mit2007',kinematics:'modern',control:'pid',estimation:'kalman',ros:'ros'};
  function inspectorSession(){
    const {state,lesson}=active;
    const s=state.inspectorSession||(state.inspectorSession={});
    if(s.raw!==state.trace){s.raw=state.trace;s.trace={...state.trace,model:lesson.modelId,params:{...state.params}};}
    s.index=state.index;return s;
  }
  function drawInspector(){
    const api=global.CourseInspectorWorkbench;if(!api||!active?.lesson)return;
    const {host,topic}=active,course=inspectorCourses[topic.id],s=inspectorSession();
    const stages=host.querySelector('.rf-course-inspector .ci-stages');if(stages&&s.ci)s.ci.stagesOpen=stages.open;
    const previousGrid=host.querySelector('.rf-course-inspector .ci-cells');if(previousGrid&&s.ci)s.ci.gridScroll=previousGrid.scrollTop;
    host.querySelector('.rf-course-inspector')?.remove();
    if(!api.descriptor(course,s.trace))return;
    const slot=document.createElement('div');slot.className='rf-course-inspector';slot.innerHTML=api.render(course,s);host.querySelector('.rf-step-text').after(slot);
    slot.querySelector('.ci-cells').scrollTop=s.ci.gridScroll||0;
  }
  function inspectorClick(event){
    const b=event.target.closest('.rf-course-inspector [data-ci-action]');if(!b||!active?.lesson)return false;
    const {model,state,topic,lesson,host}=active,api=global.CourseInspectorWorkbench;
    event.preventDefault();pause();const s=inspectorSession();
    const run=overrides=>{const params=Object.fromEntries(model.controls.map(c=>[c.key,overrides[c.key]??c.value]));return {...compute(model,params),model:lesson.modelId,params};};
    if(!api.perform(inspectorCourses[topic.id],s,b.dataset.ciAction,b.dataset.ciValue,run))return true;
    state.trace=s.trace;state.params={...s.trace.params};state.index=s.index;s.raw=state.trace;
    for(const c of model.controls){host.querySelector('[data-rf-param="'+c.key+'"]').value=state.params[c.key];host.querySelector('[data-rf-output="'+c.key+'"]').textContent=c.options?c.options[state.params[c.key]]:format(state.params[c.key])+' '+(c.unit||'');}
    draw();persist();
    const selector='[data-ci-action="'+b.dataset.ciAction+'"]'+(b.dataset.ciValue?'[data-ci-value="'+CSS.escape(b.dataset.ciValue)+'"]':'');host.querySelector('.rf-course-inspector '+selector)?.focus({preventScroll:true});return true;
  }
  function fitLab(scroll=false){
    if(!active?.lesson||active.state.tab!=='lab')return;
    const panel=active.host.querySelector('#rf-panel-lab'),workspace=panel.querySelector('.rf-lab-workspace');
    const scrollHost=active.host.closest('#lbb-main'),tabsHeight=active.host.querySelector('.rf-tabs')?.getBoundingClientRect().height||0;
    if(scroll){
      if(scrollHost)scrollHost.scrollTop=Math.max(0,scrollHost.scrollTop+panel.getBoundingClientRect().top-scrollHost.getBoundingClientRect().top-tabsHeight-16);
      else panel.scrollIntoView({block:'start',behavior:'auto'});
    }
    const bounds=scrollHost?.getBoundingClientRect(),top=Math.max(bounds?.top||0,panel.getBoundingClientRect().top),bottom=bounds?.bottom||global.innerHeight;
    workspace.style.setProperty('--rf-workspace-height',Math.max(240,Math.min(760,bottom-top-14))+'px');
  }
  function setTab(id){if(!active?.lesson||!tabs.some(([key])=>key===id))return;persist();if(id!=='lab')pause();active.state.tab=id;for(const [key] of tabs){const tab=active.host.querySelector('#rf-tab-'+key);tab.setAttribute('aria-selected',String(key===id));tab.tabIndex=key===id?0:-1;active.host.querySelector('#rf-panel-'+key).hidden=key!==id;}if(id==='lab')fitLab(true);}
  function recompute(){
    if(!active?.lesson)return;pause();const {host,model,state}=active,params={};
    host.querySelectorAll('[data-rf-param]').forEach(el=>{params[el.dataset.rfParam]=Number(el.value);});
    try{const trace=compute(model,params);state.trace=trace;state.params=params;state.index=Math.min(state.index,trace.frames.length-1);host.querySelector('.rf-error').textContent='';for(const c of model.controls)host.querySelector('[data-rf-output="'+c.key+'"]').textContent=c.options?c.options[params[c.key]]:format(params[c.key])+' '+(c.unit||'');draw();host.querySelector('.rf-execution-status').textContent='已在浏览器执行当前函数。'+trace.summary;persist();}catch(error){host.querySelector('.rf-error').textContent='本次输入未执行：'+error.message;host.querySelector('.rf-execution-status').textContent='本次输入未执行：'+error.message;}
  }
  function input(event){if(event.target.matches('input[data-rf-param]'))recompute();else if(event.target.matches('[data-rf-field]')){persist();if(event.target.dataset.rfField==='answer'){const el=active.host.querySelector('.rf-feedback');el.textContent='答案已改变，请重新检查。';delete el.dataset.correct;}}}
  function exportText(topic,lesson,state,draft={}){return `# ${topic.title} · ${lesson.title}\n\n## 我的预测与操作\n\n${draft.prediction||'未填写'}\n\n## 独立数值题\n\n${lesson.verification.prompt}\n\n我的答案：${draft.answer||'未填写'} ${lesson.verification.unit||''}\n\n## 换条件验证\n\n${lesson.verification.transfer}\n\n${draft.reason||'未填写'}\n\n## 教学模型计算\n\n\`\`\`json\n${JSON.stringify({params:state.params,result:state.trace.result},null,2)}\n\`\`\`\n\n${state.trace.boundary}\n\n计算观察不代表真实硬件或ROS/Gazebo实验；不生成完成状态、学习时长或掌握证明。\n\n## 原始材料\n\n${lesson.sources.map(s=>'- ['+s.title+']('+s.url+') · '+s.locator).join('\n')}\n`;}
  async function click(event){
    if(inspectorClick(event))return;
    const b=event.target.closest('[data-rf-action]');if(!b||!active?.lesson)return;const action=b.dataset.rfAction,{host,state,model,topic,lesson,options}=active;
    if(action==='tab')setTab(b.dataset.rfValue);
    else if(action==='course'){destroy();options.openCourse?.(topic.id);}
    else if(['previous','next','step'].includes(action)){pause();state.index=action==='step'?Number(b.dataset.rfValue):Math.max(0,Math.min(state.trace.frames.length-1,state.index+(action==='next'?1:-1)));draw();}
    else if(action==='run')recompute();
    else if(action==='play'){
      if(active.playing){pause();return;}if(state.index===state.trace.frames.length-1)state.index=0;active.playing=true;b.textContent='暂停';b.setAttribute('aria-pressed','true');draw();
      const tick=()=>{if(!active?.playing||!host.isConnected||document.hidden){pause();return;}if(state.index<state.trace.frames.length-1){state.index++;draw();}if(state.index===state.trace.frames.length-1)pause();else active.timer=setTimeout(tick,1100);};active.timer=setTimeout(tick,1100);
    }
    else if(action==='source')download(lesson.id+'.cjs',sourceFor(model,state.params),'text/javascript;charset=utf-8');
    else if(action==='examples')downloadExamples();
    else if(action==='file'){const file=lesson.localFiles?.[Number(b.dataset.rfValue)];if(file?.content!==undefined)download(file.path.split('/').pop(),file.content);}
    else if(action==='export'){persist();download(lesson.id+'-practice.md',exportText(topic,lesson,state,drafts[lesson.id]),'text/markdown;charset=utf-8');}
    else if(action==='record'&&options.record){persist();b.disabled=true;const status=host.querySelector('.rf-record-status');try{await options.record(lesson,{description:exportText(topic,lesson,state,drafts[lesson.id]),params:{...state.params},result:state.trace.result});status.textContent='已保存到当前路线的学习记录。';}catch(error){status.textContent=error.message;}finally{b.disabled=false;}}
  }
  async function standalone(){
    const shell=document.querySelector('[data-rf-standalone]');if(!shell)return;
    try{
      configure(global.RoboticsFoundationData||await fetch('./robotics-foundations.json').then(r=>{if(!r.ok)throw Error('课程数据暂未载入');return r.json();}));
      const nav=shell.querySelector('.rf-topic-nav'),main=shell.querySelector('main');
      const options={openLesson:id=>{const item=lessonFor(id);if(!item)return;mountLesson(main,item.topic,item.lesson,options);history.replaceState(null,'','#'+id);selectNav(item.topic.id);main.scrollIntoView({block:'start'});},openCourse:id=>{const topic=topicFor(id);if(!topic)return;mountCourse(main,topic,options);history.replaceState(null,'','#'+id);selectNav(id);}};
      const selectNav=id=>nav.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-current',b.dataset.topic===id?'page':'false'));
      nav.innerHTML=data.topics.map(t=>`<button type="button" data-topic="${esc(t.id)}"><span>${esc(t.title)}</span><small>${t.lessons.length} 节配套课</small></button>`).join('');
      nav.addEventListener('click',event=>{const b=event.target.closest('[data-topic]');if(b)options.openCourse(b.dataset.topic);});
      shell.querySelector('[data-rf-all-code]')?.addEventListener('click',downloadExamples);
      const openHash=()=>{const id=location.hash.slice(1);if(lessonFor(id))options.openLesson(id);else options.openCourse(topicFor(id)?id:data.topics[0].id);};
      global.addEventListener('hashchange',openHash);openHash();
    }catch(error){shell.querySelector('main').textContent='课件未打开：'+error.message;}
  }
  const api={configure,mountCourse,mountLesson,destroy,pause,setTab,getTab:()=>active?.state?.tab,checkAnswer,sourceFor,exportText,finite,topicFor,lessonFor,formatVariable};
  global.RoboticsFoundations=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});global.addEventListener('pagehide',destroy);document.addEventListener('DOMContentLoaded',standalone);}
})(globalThis);
