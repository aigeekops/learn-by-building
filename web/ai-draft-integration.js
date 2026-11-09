/* Loaded inside the retained draft's closure. Keep map, records and route IDs intact. */
  const aidData = __AI_COURSE_DATA__;
  const aidOriginalCourseIds = new Set(aidData.courses.map(course=>course.id));
  const aidM = globalThis.AICourseModels;
  const aidById = Object.fromEntries(aidData.lessons.map(l => [l.id,l]));
  const aidTabs = [['explain','① 通俗讲解'],['lab','② 动画与代码'],['exercise','③ 动手练习'],['sources','④ 对照原课']];
  const aidSessions = new Map();
  const aidDraftKey = 'lbb-ai-courseware-2026-drafts-v1';
  let aidTimer = null, aidDrafts = {}, aidStorageOkay = true, aidWorkspaceObserver = null;
  try {const value=JSON.parse(localStorage.getItem(aidDraftKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))aidDrafts=value;}catch(_){aidStorageOkay=false;}
  const aidEscape = v => esc(v??'');
  const aidNumber = value => !Number.isFinite(value)?String(value):value===0?'0':Math.abs(value)>1e7||Math.abs(value)<.0001?value.toExponential(3):Number(value.toFixed(4)).toLocaleString('en-US');
  const aidButton=(text,action,value='',primary=false)=>button(text,'aid-'+action,value,primary);
  const aidActive=()=>aidData.courses.some(c=>c.id===state.course);
  const aidCourse=()=>aidData.courses.find(c=>c.id===state.course);
  const aidLessons = courseId => aidData.lessons.filter(l=>l.course===courseId);
  function aidDirectory(c){
    const items=aidLessons(c.id).map(l=>({...l,available:true}));
    const ready=new Set(items.map(l=>String(l.unit))),published=new Set(c.published.map(u=>String(u.unit)));
    const pending=(c.scheduled||[]).filter(l=>!ready.has(String(l.unit))).map(l=>({...l,available:false,materialPending:!published.has(String(l.unit))}));
    const order=unit=>String(unit).split('/').reduce((n,v)=>n*100+Number(v),0);
    return [...items,...pending].sort((a,b)=>order(a.unit)-order(b.unit));
  }
  function aidDirectoryCard(l,i,c){
    const index=`<span class="aid-course-unit-index">${String(i+1).padStart(2,'0')}</span>`;
    if(l.available)return `<article class="aid-course-unit">${index}<div class="aid-course-unit-content"><small>${aidEscape(c.label)} · ${aidEscape(l.unit)}</small><h3>${aidEscape(l.title)}</h3><p>${aidEscape(l.summary||l.question)}</p></div>${aidButton('进入本讲 →','open',l.id)}</article>`;
    return `<article class="aid-course-unit is-pending" aria-disabled="true" data-aid-pending="${aidEscape(l.unit)}">${index}<div class="aid-course-unit-content"><small>${aidEscape(c.label)} · 官方排期 ${aidEscape(l.date.replaceAll('-','/'))}</small><h3>${aidEscape(l.title)}</h3><p>${aidEscape(l.summary)} · ${l.materialPending?'原课材料待公开':'本站课件待整理'}</p></div><button type="button" class="button aid-pending-button" disabled aria-disabled="true">待更新</button></article>`;
  }
  const aidIndex = l => aidLessons(l.course).findIndex(x=>x.id===l.id)+1;
  const aidDemos = l => l.demos?.length?l.demos:[{modelId:l.modelId||l.id,title:l.summary||l.title}];
  function aidLesson(){
    const items=aidLessons(state.course),previous=aidById[state.aiLesson];
    if(previous?.course===state.course&&aidIndex(previous)===state.selected)return previous;
    return items[state.selected-1]||items[0];
  }
  function aidModel(l){return aidSessions.get(l.id)?.trace.model||l.modelId||aidDemos(l)[0].modelId;}
  function aidSession(l=aidLesson()){
    if(!aidSessions.has(l.id)){
      const draft=aidDrafts[l.id],fallback=l.modelId||aidDemos(l)[0].modelId;
      const legacy=draft?.params&&!draft.modelId&&aidDemos(l).some(d=>d.modelId===l.id)?l.id:null;
      const model=aidDemos(l).some(d=>d.modelId===draft?.modelId)?draft.modelId:legacy||fallback;
      const params=draft?.demonstrations?.[model]||(!draft?.modelId||draft.modelId===model?draft?.params:undefined);
      let trace;try{trace=aidM.run(model,params);}catch(_){trace=aidM.run(model);}
      aidSessions.set(l.id,{trace,index:0,tab:'explain'});
    }
    return aidSessions.get(l.id);
  }
  // Public course definitions feed new plans; saved plans and records are untouched.
  aidData.courses.forEach(c=>{if(courses[c.id]){const items=aidLessons(c.id);courses[c.id].lessons=items.map(l=>[l.title,l.question,l.outcome]);courses[c.id].localTeaching=true;courses[c.id].count=items.length+' 讲已发布配套课件';courses[c.id].groups=[{title:'2026 已公开材料',ids:items.map((_,i)=>i+1)}];}});
  function aidPause(){clearInterval(aidTimer);aidTimer=null;const el=main.querySelector('[data-action="aid-play"]');if(el){el.textContent='播放过程';el.setAttribute('aria-pressed','false');}}
  function aidDraftStatus(){const el=main.querySelector('#aid-draft-status');if(el)el.textContent=aidStorageOkay?'参数与填写保留在当前浏览器；播放不计学习时长。':'浏览器暂不能保存草稿，请导出练习。';}
  function aidPersist(){
    const holder=main.querySelector('[data-aid-lesson]');if(!holder)return;
    const l=aidById[holder.dataset.aidLesson];if(!l)return;const old=aidDrafts[l.id]||{};
    for(const [field,id] of [['prediction','aid-prediction'],['answer','aid-answer'],['reason','aid-reason']]){const el=main.querySelector('#'+id);if(el)old[field]=el.value.slice(0,12000);}
    const trace=aidSession(l).trace;old.params=trace.params;old.modelId=trace.model;if(!old.demonstrations||typeof old.demonstrations!=='object')old.demonstrations={};old.demonstrations[trace.model]=trace.params;aidDrafts[l.id]=old;
    try{localStorage.setItem(aidDraftKey,JSON.stringify(aidDrafts));aidStorageOkay=true;}catch(_){aidStorageOkay=false;}
    aidDraftStatus();
  }
  function aidPrograms(lesson){
    if(!lesson.programs?.length&&!lesson.executionStatus)return;
    const panel=main.querySelector('#aid-panel-explain');if(!panel)return;
    const block=document.createElement('aside');block.className='reading-paper aid-programs';
    const heading=document.createElement('h2');heading.textContent='运行与验证';block.append(heading);
    if(lesson.executionStatus){const status=document.createElement('p');status.textContent=lesson.executionStatus;block.append(status);}
    for(const program of lesson.programs||[]){
      const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent=program.label;
      button.addEventListener('click',()=>{
        const url=URL.createObjectURL(new Blob([program.content],{type:'text/x-python;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download=program.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      });
      const command=document.createElement('pre');command.className='aid-section-code';command.textContent=program.command;
      block.append(button,command);
    }
    panel.append(block);
  }
  function aidSource(id){
    const s=aidData.sources[id];let url='#';try{const u=new URL(s.url);if(u.protocol==='https:')url=u.href;}catch(_){}
    if(s.role==='original')return '<div class="aid-source"><span>本站原创代码</span><div>下方动画使用本地教学模型，完整源码与离线课件同源。<small>'+aidEscape(s.status)+'</small></div></div>';
    return `<div class="aid-source"><span>${aidEscape(s.kind)}</span><div><a href="${aidEscape(url)}" target="_blank" rel="noopener noreferrer">${aidEscape(s.label)} ↗</a>${s.locator?'<small>'+aidEscape(s.locator)+'</small>':''}<small>${aidEscape(s.status)}</small></div></div>`;
  }
  function aidRenderCourse(){
    aidPause();const c=aidCourse(),items=aidLessons(c.id),directory=aidDirectory(c),pending=directory.filter(l=>!l.available).length;
    main.innerHTML=`<section class="aid-scope aid-course-overview" data-aid-course="${c.id}"><div class="aid-course-topline"><span>${aidEscape(c.edition)}</span></div><header class="aid-course-header"><div><span class="aid-course-label">${aidEscape(c.label)}</span><h1>${aidEscape(c.title)}</h1><p>${aidEscape(c.position)}</p></div><div class="aid-course-start">${aidButton('开始第 1 讲 →','open',items[0].id,true)}</div></header><div class="aid-course-summary"><span>${items.length} 讲已更新${pending?` · ${pending} 讲待更新`:""}</span><span>讲解 · 动画 · 代码 · 独立练习</span></div><div class="syllabus-heading"><h2>课程目录</h2><span>${pending?"灰色讲次待更新，暂不可进入":"选择一讲开始学习"}</span></div><div class="aid-course-grid">${directory.map((l,i)=>aidDirectoryCard(l,i,c)).join('')}</div><div class="aid-course-support"><details class="prereq"><summary class="cursor-interaction">先修基础</summary><p>${aidEscape(c.prerequisites.join('；'))}</p></details>${button('加入我的路线','personal-add',c.id)}</div><details class="aid-published"><summary>课程范围、原始材料与版本说明</summary><p>${aidEscape(c.description)}</p><ul>${c.published.map(u=>`<li><strong>${aidEscape(u.unit)} · ${aidEscape(u.title)}</strong><p>${aidEscape(u.material)}</p></li>`).join('')}</ul><p>${aidEscape(c.pending)}</p><p class="source-line">${aidEscape(aidData.policy)} · 材料核对 ${aidEscape(aidData.checked)}</p></details></section>`;
    icons();
  }
  function aidControls(session,l){return aidM.specs[aidModel(l)].map(s=>`<label class="aid-control" for="aid-param-${s.id}"><span>${aidEscape(s.label)}${s.type==='range'?` <output id="aid-value-${s.id}">${aidNumber(session.trace.params[s.id])} ${aidEscape(s.unit)}</output>`:''}</span>${s.type==='select'?`<select id="aid-param-${s.id}" data-aid-param="${s.id}">${s.options.map(([key,title])=>`<option value="${aidEscape(key)}" ${String(key)===String(session.trace.params[s.id])?'selected':''}>${aidEscape(title)}</option>`).join('')}</select>`:`<input type="range" id="aid-param-${s.id}" data-aid-param="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${session.trace.params[s.id]}">`}</label>`).join('');}
  function aidRenderLesson(){
    aidPause();const l=aidLesson(),c=aidCourse(),s=aidSession(l),draft=aidDrafts[l.id]||{};state.aiLesson=l.id;
    const aiSection=['cme295','cs336','cs146s'].includes(l.course);
    const deeper=l.sections?.map(x=>`<section class="aid-reading-section"><h3>${aidEscape(x.title)}</h3>${(Array.isArray(x.explanation)?x.explanation:[x.explanation]).map(p=>'<p>'+aidEscape(p)+'</p>').join('')}${aiSection&&x.code?'<pre class="aid-section-code"><code>'+aidEscape(Array.isArray(x.code)?x.code.join('\n'):x.code)+'</code></pre>':''}${aiSection&&x.exercise?'<p class="aid-section-exercise">动手：'+aidEscape(typeof x.exercise==='string'?x.exercise:x.exercise.prompt||JSON.stringify(x.exercise))+'</p>':''}</section>`).join('')||'';
    main.innerHTML=`<section class="aid-scope" data-aid-lesson="${l.id}"><div class="lesson-title"><div><div class="eyebrow">${aidEscape(c.label)} · ${aidEscape(c.edition)} · ${aidEscape(l.unit)}</div><h1>${aidEscape(l.title)}</h1><p class="lead">${aidEscape(l.question)}</p></div><aside class="lesson-output">这一章的产出<b>${aidEscape(l.outcome)}</b></aside></div><div class="lesson-tabs aid-tabs" role="tablist" aria-label="课程教学环节">${aidTabs.map(([id,label])=>`<button type="button" class="cursor-interaction" id="aid-tab-${id}" role="tab" aria-controls="aid-panel-${id}" aria-selected="${s.tab===id}" data-action="aid-tab" data-value="${id}">${label}</button>`).join('')}</div>
    <section id="aid-panel-explain" class="aid-panel" role="tabpanel" aria-labelledby="aid-tab-explain" ${s.tab!=='explain'?'hidden':''}><div class="reading-layout"><article class="reading-paper"><h2>先建立直觉</h2>${l.explanation.map(p=>'<p>'+aidEscape(p)+'</p>').join('')}<div class="analogy aid-formula">${aidEscape(l.formula)}</div><h3>把一个例子算到底</h3><p>${aidEscape(l.worked)}</p>${deeper}<h3>容易混淆的地方</h3><p>${aidEscape(l.misconception)}</p><div class="row">${aidButton('带着预测看动画 →','tab','lab',true)}</div></article><aside class="reading-side"><h3>开始前</h3>${l.prerequisites.map(p=>'<p>'+aidEscape(p)+'</p>').join('')}<h3>演示范围</h3><p>${aidEscape(l.boundary)}</p></aside></div></section>
    <section id="aid-panel-lab" class="aid-panel" role="tabpanel" aria-labelledby="aid-tab-lab" ${s.tab!=='lab'?'hidden':''}><label class="aid-demo-selector" for="aid-demo">本讲演示<select id="aid-demo">${aidDemos(l).map(d=>`<option value="${aidEscape(d.modelId)}" ${d.modelId===s.trace.model?'selected':''}>${aidEscape(d.title)}</option>`).join('')}</select></label><div class="aid-parameters">${aidControls(s,l)}</div><div class="aid-player"><div class="row">${aidButton('播放过程','play','',true)}${aidButton('← 上一步','prev')}${aidButton('下一步 →','next')}${aidButton('重新计算','recompute')}</div><span id="aid-count" class="small muted"></span></div><div id="aid-step-track" class="aid-step-track" aria-hidden="true"></div><h2 id="aid-step-title"></h2><p id="aid-step-detail" class="aid-step-detail"></p><div id="aid-visual" class="aid-visual"></div><div class="aid-code-grid"><div class="aid-code"><div class="aid-code-caption">JavaScript 核心摘录 · 本次计算轨迹</div><ol>${s.trace.code.map((line,i)=>`<li data-aid-line="${i+1}"><code>${aidEscape(line)}</code></li>`).join('')}</ol></div><div class="aid-variables"><h3>当前步骤变量</h3><dl id="aid-vars"></dl></div></div><p class="aid-model-note">参数变化时在本地重新计算；播放只回放已计算的步骤。Agent 决策是预设策略，工具和测试使用内存案例，不调用外部模型。</p><div class="row">${aidButton('换一组输入，自己验证 →','tab','exercise')}</div></section>
    <section id="aid-panel-exercise" class="aid-panel" role="tabpanel" aria-labelledby="aid-tab-exercise" ${s.tab!=='exercise'?'hidden':''}><div class="reading-paper aid-practice"><h2>先预测，再操作，最后解释</h2><ol>${l.practice.map(p=>'<li>'+aidEscape(p)+'</li>').join('')}</ol><label for="aid-prediction">我的预测（可选）</label><textarea id="aid-prediction" maxlength="12000" placeholder="先写下预计变化，再对照动画。">${aidEscape(draft.prediction||'')}</textarea><h3>用新输入检查计算</h3><p>${aidEscape(l.exercise.prompt)}</p><label for="aid-answer">你的数值${l.exercise.unit?'（'+aidEscape(l.exercise.unit)+'）':''}</label><div class="row"><input type="text" inputmode="decimal" id="aid-answer" maxlength="100" value="${aidEscape(draft.answer||'')}" autocomplete="off">${aidButton('检查数值','check','',true)}</div><p id="aid-feedback" class="aid-feedback" role="status" aria-live="polite">数值检查不自动代表掌握，也不增加学习时长。</p><details><summary>需要一个提示</summary><p>${aidEscape(l.exercise.hint)}</p></details><details><summary>查看复算方法</summary><p>${aidEscape(l.exercise.solution)}</p></details><h3>独立验证任务</h3><p>${aidEscape(l.exercise.transfer)}</p><label for="aid-reason">解释与验证证据（可选）</label><textarea id="aid-reason" maxlength="12000" placeholder="写下输入、关键中间值和你的核对结果。">${aidEscape(draft.reason||'')}</textarea><div class="row">${aidButton('导出当前练习','export')}${aidButton('保存到当前路线记录','record')}</div><p id="aid-record-status" role="status" class="small muted"></p></div></section>
    <section id="aid-panel-sources" class="aid-panel" role="tabpanel" aria-labelledby="aid-tab-sources" ${s.tab!=='sources'?'hidden':''}><div class="reading-paper aid-sources"><h2>逐项对照 2026 原课材料</h2><p>核对日：${aidEscape(aidData.checked)}。原课内容与本站讲解、算例、代码和练习分别标注。</p>${l.sources.map(aidSource).join('')}<p class="source-line">第三方材料保留原作者权利；课堂转录与 YouTube 字幕分别标明。官方文件未取得时如实注明。</p></div></section>
    <footer class="aid-links"><span>在 AI 学习路线中继续连接</span><div class="row">${l.bridges.map(b=>aidButton(b.label+' ↗','open',b.lesson)).join('')}</div><p id="aid-draft-status" role="status"></p></footer></section>`;
    if(!courses[l.course]?.foundationTeaching)aidMountWorkspace();
    aidDraw(false);aidDraftStatus();icons();
    if(s.tab==='lab')aidFitWorkspace();
  }
  function aidValueHTML(value){
    const compact=v=>typeof v==='string'?v:JSON.stringify(v);
    if(Array.isArray(value)&&value.length&&value.some(x=>x&&typeof x==='object'))
      return '<div class="aid-value-rows">'+value.map((v,i)=>'<div><small>['+i+']</small><code>'+aidEscape(JSON.stringify(v))+'</code></div>').join('')+'</div>';
    if(value&&typeof value==='object'&&!Array.isArray(value))
      return '<div class="aid-value-rows">'+Object.entries(value).map(([key,v])=>'<div><small>'+aidEscape(key)+'</small><code>'+aidEscape(compact(v))+'</code></div>').join('')+'</div>';
    return '<code>'+aidEscape(typeof value==='number'?aidNumber(value):compact(value))+'</code>';
  }
  function aidMountWorkspace(){
    const panel=main.querySelector('#aid-panel-lab');if(!panel||panel.querySelector('.aid-workspace'))return;
    const scroll=document.createElement('div');scroll.className='aid-workspace-scroll';scroll.setAttribute('aria-label',['cs50p','tools'].includes(state.course)?'执行过程与代码左右对照':'动画与代码左右对照');
    const grid=document.createElement('div');grid.className='aid-workspace';
    const left=document.createElement('section'),right=document.createElement('section');left.className='aid-workspace-left';right.className='aid-workspace-right';
    left.setAttribute('aria-label',['cs50p','tools'].includes(state.course)?'执行快照与单步控制':'动画与播放控制');right.setAttribute('aria-label','步骤、代码与变量');
    grid.append(left,right);scroll.append(grid);
    let settings=panel.querySelector('.fid-motion-settings');
    if(!settings){settings=document.createElement('details');settings.className='aid-parameter-settings';settings.innerHTML='<summary>修改演示与输入参数</summary>';for(const selector of ['.aid-demo-selector','.aid-parameters']){const el=panel.querySelector(selector);if(el)settings.append(el);}}
    for(const selector of ['.aid-player','#fid-motion-stage','.aid-step-track']){const el=panel.querySelector(selector);if(el)left.append(el);}
    if(!left.querySelector('#fid-motion-stage')){const visual=panel.querySelector('#aid-visual');if(visual)left.append(visual);}
    left.append(settings);
    for(const selector of ['#aid-step-title','#aid-step-detail','.aid-code-grid','.fid-motion-values','.aid-model-note']){const el=panel.querySelector(selector);if(el)right.append(el);}
    for(const el of Array.from(panel.children))right.append(el);
    panel.append(scroll);
    aidWorkspaceObserver?.disconnect();
    if(globalThis.ResizeObserver){aidWorkspaceObserver=new ResizeObserver(()=>aidFitWorkspace());aidWorkspaceObserver.observe(main);}
  }
  function aidFitWorkspace(){
    const workspace=main.querySelector('.aid-workspace'),scroll=main.querySelector('.aid-workspace-scroll');
    if(!workspace||main.querySelector('#aid-panel-lab')?.hidden)return;
    const style=getComputedStyle(main),panel=main.querySelector('#aid-panel-lab');
    const offset=panel.getBoundingClientRect().top-main.getBoundingClientRect().top+main.scrollTop;
    const available=main.clientHeight-offset-parseFloat(getComputedStyle(panel).paddingTop)-parseFloat(style.paddingBottom);
    workspace.style.setProperty('--aid-workspace-height',Math.max(260,available-2)+'px');
    main.scrollTop=0;
  }
  function aidVisual(v){
    const title='<h3>'+aidEscape(v.title)+'</h3>';
    if(v.kind==='flow')return title+`<div class="aid-flow" role="group" aria-label="${aidEscape(v.title)}">${v.nodes.map((n,i)=>(i?'<span class="aid-arrow" aria-hidden="true">→</span>':'')+`<div class="aid-node ${n.active?'is-active':''}"><strong>${aidEscape(n.label)}</strong><span>${aidEscape(n.detail)}</span></div>`).join('')}</div>`;
    if(v.kind==='bars'){const signed=v.rows.some(r=>r.value<0),min=signed?Math.min(0,...v.rows.map(r=>r.value)):0,max=signed?Math.max(0,...v.rows.map(r=>r.value)):v.max||Math.max(...v.rows.map(r=>r.value),.000001),span=Math.max(max-min,.000001),zero=-min/span*100;return title+v.rows.map(r=>{const width=Math.min(100,Math.abs(r.value)/span*100),left=r.value<0?zero-width:zero;return `<div class="aid-bar"><span>${aidEscape(r.label)}</span><div>${signed?`<b class="aid-zero" data-aid-left="${zero}"></b>`:''}<i class="${r.value<0?'aid-negative':''}" data-aid-left="${left}" data-aid-width="${width}"></i></div><output>${aidNumber(r.value)} ${aidEscape(v.unit)}</output></div>`}).join('');}
    const cap=Math.max(v.capacity,.000001),sum=v.segments.reduce((s,x)=>s+x.value,0);
    return title+`<div class="aid-segments" role="img" aria-label="${aidEscape(v.segments.map(x=>x.label+' '+aidNumber(x.value)+' '+v.unit).join('；'))}">${v.segments.map(x=>`<span data-aid-width="${x.value/cap*100}">${x.value/cap>.13?aidEscape(x.label):''}</span>`).join('')}${v.marker!==undefined?`<i data-aid-left="${v.marker*100}"></i>`:''}</div><div class="aid-legend">${v.segments.map(x=>`<span>${aidEscape(x.label)} ${aidNumber(x.value)} ${aidEscape(v.unit)}</span>`).join('')}${sum<cap-.000001?`<span>剩余 ${aidNumber(cap-sum)} ${aidEscape(v.unit)}</span>`:''}${v.marker!==undefined?'<span>抽样点 u = '+aidNumber(v.marker)+'</span>':''}</div>`;
  }
  function aidDraw(announceStep=true){
    const s=aidSession(),f=s.trace.steps[s.index],scene=main.querySelector('#aid-visual');if(!scene)return;
    main.querySelector('#aid-count').textContent=`${s.index+1} / ${s.trace.steps.length} 步 · 对应第 ${f.line} 行`;
    main.querySelector('#aid-step-title').textContent=f.title;main.querySelector('#aid-step-detail').textContent=f.detail;
    main.querySelector('#aid-step-track').innerHTML=s.trace.steps.map((_,i)=>`<i class="${i<=s.index?'is-past':''}"></i>`).join('');
    const previousWidths=Array.from(scene.querySelectorAll('[data-aid-width]')).map(el=>el.dataset.aidWidth);
    scene.classList.toggle('attn-active',s.trace.model==='attention');
    scene.innerHTML=(s.trace.model==='attention'?globalThis.AttentionWorkbench?.render(s.trace,s.index,s.attentionBaseline):'')||aidVisual(f.visual);
    if(s.trace.model==='attention'){scene.scrollTop=0;if(announceStep)main.querySelector('.aid-workspace-right')?.scrollTo({top:0});}
    let attentionAnchor=main.querySelector('#aid-step-detail');
    for(const [part,name] of [['calculation','formula'],['comparison','comparison']]){
      main.querySelector('#aid-attention-'+name)?.remove();const block=scene.querySelector('.attn-'+part);
      if(block){block.id='aid-attention-'+name;attentionAnchor.after(block);attentionAnchor=block;}
    }
    const attentionSettings=main.querySelector('.aid-parameter-settings');
    if(attentionSettings&&s.trace.model==='attention'){
      attentionSettings.classList.add('attn-parameters');attentionAnchor.after(attentionSettings);
    }else if(attentionSettings?.classList.contains('attn-parameters')){
      attentionSettings.classList.remove('attn-parameters');main.querySelector('.aid-workspace-left')?.append(attentionSettings);
    }
    const modelNote=main.querySelector('.aid-model-note');
    if(modelNote&&aidOriginalCourseIds.has(state.course))modelNote.textContent=s.trace.model==='attention'?'本例从给定的 Q / K / V 开始，展开单头的一个位置。修改输入后在本机重新计算；播放只查看计算过程。':'参数变化时在本地重新计算；播放只回放已计算的步骤。Agent 决策是预设策略，工具和测试使用内存案例，不调用外部模型。';
    scene.querySelectorAll('[data-aid-width]').forEach((el,i)=>{el.style.width=el.dataset.aidWidth+'%';if(!matchMedia('(prefers-reduced-motion:reduce)').matches&&el.animate)el.animate([{width:(previousWidths[i]||0)+'%'},{width:el.dataset.aidWidth+'%'}],{duration:400,easing:'ease-out'});});
    scene.querySelectorAll('[data-aid-left]').forEach(el=>{el.style.left=el.dataset.aidLeft+'%';});
    main.querySelector('#aid-vars').innerHTML=Object.entries(f.variables).map(([name,value])=>`<dt>${aidEscape(name)}</dt><dd>${aidValueHTML(value)}</dd>`).join('');
    main.querySelector('.aid-code ol').innerHTML=s.trace.code.map((line,i)=>`<li data-aid-line="${i+1}"><code>${aidEscape(line)}</code></li>`).join('');
    main.querySelectorAll('[data-aid-line]').forEach(el=>{const active=Number(el.dataset.aidLine)===f.line;el.classList.toggle('is-active',active);if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    const currentLine=main.querySelector('[data-aid-line].is-active'),listing=main.querySelector('.aid-code ol');
    if(currentLine&&listing){const a=currentLine.getBoundingClientRect(),b=listing.getBoundingClientRect();if(a.top<b.top||a.bottom>b.bottom)listing.scrollTop+=a.top-b.top-listing.clientHeight/3;}
    main.querySelector('[data-action="aid-prev"]').disabled=s.index===0;main.querySelector('[data-action="aid-next"]').disabled=s.index===s.trace.steps.length-1;
    if(announceStep)announce.textContent=`步骤 ${s.index+1}：${f.title}`;
  }
  function aidSetTab(id){if(!aidTabs.some(([key])=>key===id))return;if(id!=='lab')aidPause();const s=aidSession();s.tab=id;aidTabs.forEach(([key])=>{root.querySelector('#aid-tab-'+key).setAttribute('aria-selected',String(id===key));main.querySelector('#aid-panel-'+key).hidden=id!==key;});if(id==='lab'){aidDraw(false);aidFitWorkspace();}}
  addEventListener('resize',()=>{if(main.querySelector('.aid-workspace'))aidFitWorkspace();});
  function aidOpen(id){const l=aidById[id];if(!l)return;aidPersist();aidPause();state.aiLesson=id;state.course=l.course;state.node=courses[l.course].node;state.selected=aidIndex(l);go('lesson');}
  function aidRecompute(){
    aidPause();const l=aidLesson(),s=aidSession(l),params={};main.querySelectorAll('[data-aid-param]').forEach(el=>{params[el.dataset.aidParam]=el.value;});
    const attention=s.trace.model==='attention',index=s.index;
    if(attention&&!s.attentionBaseline)s.attentionBaseline=s.trace;
    s.trace=aidM.run(aidModel(l),params);s.index=Math.min(index,s.trace.steps.length-1);
    aidM.specs[aidModel(l)].forEach(c=>{if(c.type==='range')main.querySelector('#aid-value-'+c.id).textContent=aidNumber(s.trace.params[c.id])+' '+(c.unit||'');});aidDraw();aidPersist();
  }
  function aidAttentionAction(target){
    const s=aidSession(),workbench=globalThis.AttentionWorkbench;
    if(s.trace.model!=='attention'||!workbench)return;
    aidPause();
    if(target.hasAttribute('data-attn-step')){
      const index=Number(target.dataset.attnStep);
      if(!Number.isInteger(index)||index<0||index>=s.trace.steps.length)return;
      const selector=target.classList.contains('attn-cell')?'.attn-cell':target.classList.contains('attn-stage')?'.attn-stage':'.attn-tools button';
      s.index=index;aidDraw();main.querySelector(selector+'[data-attn-step="'+index+'"]')?.focus({preventScroll:true});return;
    }
    if(target.hasAttribute('data-attn-pin'))s.attentionBaseline=s.trace;
    else if(target.hasAttribute('data-attn-reset')){s.attentionBaseline=null;s.trace=aidM.run('attention');s.index=0;}
    else {
      const experiment=workbench.experiments[target.dataset.attnExperiment];if(!experiment)return;
      s.attentionBaseline=aidM.run('attention',experiment.before);s.trace=aidM.run('attention',experiment.after);s.index=s.trace.steps.length-1;
    }
    aidM.specs.attention.forEach(control=>{const el=main.querySelector('#aid-param-'+control.id);if(el)el.value=s.trace.params[control.id];if(control.type==='range')main.querySelector('#aid-value-'+control.id).textContent=aidNumber(s.trace.params[control.id])+' '+(control.unit||'');});
    aidDraw();aidPersist();
    const selector=target.hasAttribute('data-attn-experiment')?'[data-attn-experiment="'+target.dataset.attnExperiment+'"]':target.hasAttribute('data-attn-pin')?'[data-attn-pin]':'[data-attn-reset]';
    main.querySelector(selector)?.focus({preventScroll:true});
  }
  function aidExport(){
    aidPersist();const l=aidLesson(),c=aidCourse(),d=aidDrafts[l.id],s=aidSession(l),check=aidM.checkNumeric(d.answer,l.exercise.expected,l.exercise.tolerance);
    const text=`# ${c.label} · ${l.title}\n\n材料版本：${c.edition}\n\n## 我的预测\n\n${d.prediction||'未填写'}\n\n## 数值练习\n\n${l.exercise.prompt}\n\n我的答案：${d.answer||'未填写'}\n\n反馈：${String(d.answer||'').trim()?check.message:'尚未提交'}\n\n## 我的解释与验证\n\n${d.reason||'未填写'}\n\n## 本地教学模型计算\n\n\`\`\`json\n${JSON.stringify({model:s.trace.model,parameters:s.trace.params,result:s.trace.result},null,2)}\n\`\`\`\n\n演示范围：${l.boundary}\n\n此文档不生成学习时长、任务完成状态或知识掌握证明。\n\n## 原课来源\n\n${l.sources.map(id=>aidData.sources[id]).map(x=>'- ['+x.label+']('+x.url+')：'+x.status).join('\n')}\n`;
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));a.href=url;a.download=c.id+'-2026-'+l.id+'-practice.md';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function aidRecord(b){
    const target=main.querySelector('#aid-record-status');b.disabled=true;
    try{aidPersist();const p=activePersonal(),l=aidLesson(),s=aidSession(l);if(!p||!p.courseIds.includes(l.course))throw Error('先选择一条包含本课程的个人路线，再保存这次计算观察。');
      const d=aidDrafts[l.id],description=`[2026 教学模型计算]\n${l.title}\n输入：${JSON.stringify(s.trace.params)}\n结果：${JSON.stringify(s.trace.result)}\n我的预测：${d.prediction||'未填写'}\n我的解释：${d.reason||'未填写'}\n范围：${l.boundary}\n此观察不代表任务完成，不新增学习时间。`;
      await workbenchCall('teachingObservation',{profile:p,courseId:l.course,lessonId:'ai-2026-'+l.id,title:l.title,snapshot:{description}});target.textContent='这次计算观察已保存到当前路线的学习记录。';
    }catch(error){target.textContent=error.message;}finally{b.disabled=false;}
  }
  const aidOldCourse=renderCourse,aidOldLesson=renderLesson,aidOldChrome=chrome,aidOldGo=go;
  renderCourse=function(){if(aidActive())aidRenderCourse();else aidOldCourse();};
  renderLesson=function(){if(aidActive())aidRenderLesson();else aidOldLesson();};
  go=function(view,course){aidPersist();aidPause();root.dataset.view=view;root.classList.toggle('is-map-view',view==='map');return aidOldGo(view,course);};
  chrome=function(){
    if(!aidActive()||!['course','lesson'].includes(state.view)){aidOldChrome();return;}
    root.querySelectorAll('.nav-item').forEach(el=>{const active=el.dataset.action==='map';el.classList.toggle('is-active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    const c=aidCourse(),l=aidLesson();breadcrumbs.innerHTML=`<button data-action="map">学习地图</button><span>/</span><button data-action="course" data-value="${c.id}">${aidEscape(c.label)}</button>${state.view==='lesson'?'<span>/</span><b>'+aidEscape(l.title)+'</b>':''}`;
    contextNav.innerHTML=`<span class="nav-caption">${aidEscape(c.label)} · ${aidLessons(c.id).length} 讲</span><div class="context-list"><button data-action="course" data-value="${c.id}" class="${state.view==='course'?'is-active':''}">课程目录</button>${state.view==='lesson'?aidData.lessons.filter(x=>x.course===c.id).map((x,i)=>`<button data-action="aid-open" data-value="${x.id}" title="${aidEscape(x.title)}" class="${x.id===l.id?'is-active':''}"><span class="aid-nav-number">${String(i+1).padStart(2,'0')}</span><span>${aidEscape(x.title)}</span></button>`).join(''):''}</div>`;
  };
  root.addEventListener('click',event=>{
    const attention=event.target.closest('.attn-workbench button');
    if(attention){event.preventDefault();event.stopImmediatePropagation();aidAttentionAction(attention);return;}
    const b=event.target.closest('[data-action^="aid-"]');if(!b||b.disabled)return;event.preventDefault();event.stopImmediatePropagation();
    const action=b.dataset.action.slice(4),s=aidActive()?aidSession():null;
    if(action==='open')aidOpen(b.dataset.value);else if(action==='tab')aidSetTab(b.dataset.value);
    else if(action==='play'){if(aidTimer){aidPause();return;}if(s.index>=s.trace.steps.length-1)s.index=0;aidDraw();b.textContent='暂停';b.setAttribute('aria-pressed','true');aidTimer=setInterval(()=>{if(s.index<s.trace.steps.length-1){s.index++;aidDraw(false);}if(s.index===s.trace.steps.length-1){aidPause();announce.textContent='本次计算过程播放结束。';}},1500);}
    else if(action==='next'||action==='prev'){aidPause();s.index=Math.max(0,Math.min(s.trace.steps.length-1,s.index+(action==='next'?1:-1)));aidDraw();}
    else if(action==='recompute')aidRecompute();
    else if(action==='check'){aidPersist();const l=aidLesson(),r=aidM.checkNumeric(main.querySelector('#aid-answer').value,l.exercise.expected,l.exercise.tolerance),el=main.querySelector('#aid-feedback');el.textContent=r.message;el.dataset.correct=String(r.correct);}
    else if(action==='export')aidExport();else if(action==='record')void aidRecord(b);
  },true);
  root.addEventListener('input',event=>{if(event.target.matches('[data-aid-param]'))aidRecompute();else if(event.target.matches('#aid-prediction,#aid-answer,#aid-reason')){aidPersist();if(event.target.id==='aid-answer'){const el=main.querySelector('#aid-feedback');el.textContent='答案已改变，请重新检查。';delete el.dataset.correct;}}});
  root.addEventListener('change',event=>{if(event.target.id==='aid-demo'){const expanded=main.querySelector('.aid-parameter-settings,.fid-motion-settings')?.open;aidPersist();aidPause();const l=aidLesson(),id=event.target.value,s=aidSession(l);if(!aidDemos(l).some(d=>d.modelId===id))return;try{s.trace=aidM.run(id,aidDrafts[l.id]?.demonstrations?.[id]);}catch(_){s.trace=aidM.run(id);}s.index=0;s.tab='lab';aidRenderLesson();const settings=main.querySelector('.aid-parameter-settings,.fid-motion-settings');if(settings&&expanded)settings.open=true;aidFitWorkspace();aidPersist();}else if(event.target.matches('select[data-aid-param]'))aidRecompute();});
  root.addEventListener('keydown',event=>{if(!event.target.matches('.aid-tabs button')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();const i=aidTabs.findIndex(([id])=>id===aidSession().tab),next=event.key==='Home'?0:event.key==='End'?aidTabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+aidTabs.length)%aidTabs.length;aidSetTab(aidTabs[next][0]);root.querySelector('#aid-tab-'+aidTabs[next][0]).focus();},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)aidPause();});addEventListener('pagehide',aidPause);
