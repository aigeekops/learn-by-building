/* Course reader: computations and drafts are local; playback never certifies study. */
(function () {
  'use strict';
  const M = window.AICourseModels, main = document.getElementById('aic-main');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
  const fmt = value => typeof value !== 'number' ? String(value) : value === 0 ? '0' : Math.abs(value) >= 1e7 || Math.abs(value) < 0.0001 ? value.toExponential(3) : Number(value.toFixed(4)).toLocaleString('en-US');
  const json = value => JSON.stringify(value, null, 2);
  const storageKey = 'lbb-ai-courseware-2026-drafts-v1';
  let data, lesson, course, trace, step = 0, timer = null, activeTab = 'read', drafts = {}, storageOkay = true, attentionBaseline = null;
  const panels = [['read', '01 通俗讲解'], ['watch', '02 动画与代码'], ['practice', '03 动手练习'], ['sources', '04 对照原课']];
  let inspectionSession=null;
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) drafts = saved; } catch (_) { storageOkay = false; }
  function pause() { if (timer !== null) clearInterval(timer); timer = null; const b = document.getElementById('aic-play'); if (b) { b.textContent = '播放过程'; b.setAttribute('aria-pressed', 'false'); } }
  function storageStatus() { const el = document.getElementById('aic-storage'); if (el) { el.textContent = storageOkay ? '草稿仅保存在当前浏览器 · 不累计学习时长' : '浏览器无法保存草稿，请导出当前练习'; el.classList.toggle('aic-storage-error', !storageOkay); } }
  function persist() {
    if (!lesson) return;
    const draft = drafts[lesson.id] || {};
    for (const [field, id] of [['prediction', 'aic-prediction'], ['answer', 'aic-answer'], ['reason', 'aic-reason']]) {
      const el = document.getElementById(id); if (el) draft[field] = el.value.slice(0, 12000);
    }
    draft.params = trace.params; draft.modelId = trace.model;
    if (!draft.demonstrations || typeof draft.demonstrations !== 'object') draft.demonstrations = {};
    draft.demonstrations[trace.model] = trace.params; drafts[lesson.id] = draft;
    try { localStorage.setItem(storageKey, JSON.stringify(drafts)); storageOkay = true; } catch (_) { storageOkay = false; }
    storageStatus();
  }
  function safeHref(url) { if (/^\.\/ai-(?:course-models|cme295-2026|cs336-2026|cs146s-2026)\.js$/.test(url)) return url; try { const u = new URL(url); return u.protocol === 'https:' ? u.href : '#'; } catch (_) { return '#'; } }
  function sourceRow(id) {
    const source = data.sources[id];
    return `<div class="aic-source"><span class="aic-source-kind">${esc(source.kind)}</span><div><a href="${esc(safeHref(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.label)} ↗</a>${source.locator ? `<p>${esc(source.locator)}</p>` : ''}<p>${esc(source.status)}</p></div></div>`;
  }
  function controls() {
    return M.specs[trace.model].map(s => `<div class="aic-control"><label for="aic-param-${s.id}">${esc(s.label)}${s.type === 'range' ? ` <output id="aic-value-${s.id}" for="aic-param-${s.id}">${fmt(trace.params[s.id])} ${esc(s.unit)}</output>` : ''}</label>${s.type === 'select' ? `<select id="aic-param-${s.id}" data-param="${s.id}">${s.options.map(([id, title]) => `<option value="${esc(id)}" ${String(trace.params[s.id]) === String(id) ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select>` : `<input type="range" id="aic-param-${s.id}" data-param="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${trace.params[s.id]}">`}</div>`).join('');
  }
  function demonstrations(l = lesson) { return l.demos?.length ? l.demos : [{modelId:l.modelId || l.id,title:l.summary}]; }
  function directoryItems(c=course){
    const available=data.lessons.filter(l=>l.course===c.id).map(l=>({...l,available:true}));
    const ready=new Set(available.map(l=>String(l.unit)));
    const pending=(c.scheduled||[]).filter(l=>!ready.has(String(l.unit))).map(l=>({...l,available:false}));
    const order=unit=>String(unit).split('/').reduce((n,v)=>n*100+Number(v),0);
    return [...available,...pending].sort((a,b)=>order(a.unit)-order(b.unit));
  }
  function selectedModel(l, draft) { const demos=demonstrations(l); return demos.some(d=>d.modelId===draft?.modelId) ? draft.modelId : l.modelId || demos[0].modelId; }
  function sectionsHTML() {
    return (lesson.sections || []).map((section,i)=>{
      const paragraphs = Array.isArray(section.explanation) ? section.explanation : [section.explanation || ''];
      const code = Array.isArray(section.code) ? section.code.join('\n') : section.code;
      const demo = section.modelId || section.demo;
      return `<section class="aic-subsection"><div class="aic-kicker">${String(i+1).padStart(2,'0')} / 本讲知识展开</div><h3>${esc(section.title)}</h3>${paragraphs.map(x=>`<p>${esc(x)}</p>`).join('')}${code ? `<pre class="aic-section-code"><code>${esc(code)}</code></pre>` : ''}${section.exercise ? `<p class="aic-section-exercise">动手：${esc(typeof section.exercise==='string'?section.exercise:section.exercise.prompt || json(section.exercise))}</p>` : ''}${demo && demonstrations().some(x=>x.modelId===demo) ? `<button type="button" data-demo="${esc(demo)}">演示这一小节 →</button>` : ''}</section>`;
    }).join('');
  }
  function render() {
    const draft = drafts[lesson.id] || {}, courseLessons = data.lessons.filter(x => x.course === course.id), directory = directoryItems();
    main.innerHTML = `<section class="aic-intro"><div class="aic-kicker">Understand · Build · Verify</div><h1>原理看得见，过程算得清。</h1><p>共同模型原理 → 模型研发 / AI 软件工程。用 2026 已公开材料配套的 ${data.lessons.length} 讲课件，连接讲解、计算与独立验证。</p></section>
      <nav class="aic-course-nav" aria-label="三门课程">${data.courses.map(c => `<button type="button" data-course="${c.id}" aria-pressed="${c.id === course.id}"><strong>${esc(c.label)} <small>· ${esc(c.edition)}</small></strong><span>${esc(c.title)}</span><small>${esc(c.position)} · ${data.lessons.filter(l => l.course === c.id).length} 讲已更新${directoryItems(c).some(l=>!l.available)?` · ${directoryItems(c).filter(l=>!l.available).length} 讲待更新`:''}</small></button>`).join('')}</nav>
      <div class="aic-layout"><aside class="aic-sidebar" aria-label="专题目录"><h2>${esc(course.label)} · 讲次目录</h2><p>先修：${esc(course.prerequisites.join('；'))}</p><label class="aic-lecture-picker">当前讲次<select id="aic-lecture-picker">${directory.map(l=>l.available?`<option value="${l.id}" ${l.id===lesson.id?'selected':''}>${esc(l.unit)} · ${esc(l.title)}</option>`:`<option disabled>${esc(l.unit)} · ${esc(l.title)} · 待更新</option>`).join('')}</select></label><details class="aic-directory" ${matchMedia('(min-width:701px)').matches?'open':''}><summary>完整讲次目录 · ${courseLessons.length} 讲已更新${directory.length>courseLessons.length?` · ${directory.length-courseLessons.length} 讲待更新`:''}</summary><nav class="aic-outline" aria-label="本专题课件">${directory.map((l, i) => l.available?`<button type="button" data-lesson="${l.id}" ${l.id === lesson.id ? 'aria-current="page"' : ''}><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(l.title)}<small> · ${esc(l.unit)}</small></span></button>`:`<button type="button" class="aic-lesson-pending" disabled aria-disabled="true"><span>${String(i+1).padStart(2,'0')}</span><span>${esc(l.title)}<small>${esc(l.date.replaceAll('-','/'))} · 待更新</small></span></button>`).join('')}</nav></details><details><summary>2026 原课材料目录</summary><ol class="aic-material-list">${course.published.map(u => `<li><strong>${esc(u.unit)} · ${esc(u.title)}</strong><small>${esc(u.material)}</small></li>`).join('')}</ol><p class="aic-pending">${esc(course.pending)}</p></details><p class="aic-pending">${courseLessons.length} 讲配套课件，${courseLessons.reduce((n,l)=>n+demonstrations(l).length,0)} 个可操作演示。材料覆盖与个人学习进度分开记录。</p></aside>
      <article class="aic-article"><header class="aic-lesson-head"><div class="aic-kicker">${esc(course.label)} / ${esc(course.edition)} / ${esc(lesson.unit)}</div><h2>${esc(lesson.title)}</h2><p>${esc(lesson.question)}</p><div class="aic-goal">本章产出：${esc(lesson.outcome)}</div></header>
      <div class="aic-tabs" role="tablist" aria-label="本讲学习环节">${panels.map(([id, title]) => `<button type="button" role="tab" id="aic-tab-${id}" data-tab="${id}" aria-controls="aic-panel-${id}" aria-selected="${id === activeTab}">${title}</button>`).join('')}</div>
      <section class="aic-panel aic-prose" role="tabpanel" id="aic-panel-read" aria-labelledby="aic-tab-read" ${activeTab !== 'read' ? 'hidden' : ''}><h3>先建立直觉</h3>${lesson.explanation.map(p => `<p>${esc(p)}</p>`).join('')}<div class="aic-prereq">${lesson.prerequisites.map(x => `<span>${esc(x)}</span>`).join('')}</div><div class="aic-formula">${esc(lesson.formula)}</div>${sectionsHTML()}<div class="aic-subsection"><h3>把一个例子算到底</h3><p>${esc(lesson.worked)}</p></div><div class="aic-subsection"><h3>一个容易误解的地方</h3><p>${esc(lesson.misconception)}</p></div><p class="aic-boundary">演示范围：${esc(lesson.boundary)}</p><div class="aic-actions"><button class="aic-primary" type="button" data-go-tab="watch">打开逐步动画 →</button><button type="button" data-go-tab="sources">对照课件与字幕</button></div></section>
      <section class="aic-panel aic-watch-panel" role="tabpanel" id="aic-panel-watch" aria-labelledby="aic-tab-watch" ${activeTab !== 'watch' ? 'hidden' : ''}><div class="aic-workspace-scroll" aria-label="左右对照动画工作区"><div class="aic-workspace"><section class="aic-motion-column" aria-label="动画与播放控制"><div class="aic-player"><button type="button" id="aic-play" class="aic-primary" aria-pressed="false">播放过程</button><button type="button" id="aic-prev">← 上一步</button><button type="button" id="aic-next">下一步 →</button><button type="button" id="aic-recompute">重新计算</button><span class="aic-step-count" id="aic-count"></span></div><div id="aic-step-track" class="aic-step-track" aria-hidden="true"></div><div id="aic-visual" class="aic-visual"></div><details class="aic-parameter-panel"><summary>演示选择与输入参数</summary><label class="aic-demo-picker">本讲演示<select id="aic-demo-picker">${demonstrations().map(d=>`<option value="${esc(d.modelId)}" ${d.modelId===trace.model?'selected':''}>${esc(d.title)}</option>`).join('')}</select></label><div class="aic-controls">${controls()}</div></details></section><section class="aic-inspection-column" aria-label="同步代码、变量与当前步骤"><div class="aic-step-explanation"><div class="aic-step-heading"><h2 id="aic-step-title"></h2></div><p class="aic-step-detail" id="aic-step-detail"></p><div id="aic-announcement" class="aic-note" role="status" aria-live="polite"></div></div><div class="aic-code-grid"><div class="aic-code-block"><div class="aic-code-header">JavaScript 核心摘录 · 本次计算轨迹回放</div><ol class="aic-code-lines">${trace.code.map((line, i) => `<li data-code-line="${i + 1}"><code>${esc(line)}</code></li>`).join('')}</ol></div><div class="aic-vars"><h3>当前步骤的变量快照</h3><dl id="aic-variables"></dl></div></div></section></div></div><p class="aic-note aic-runtime-note">参数改变时重新运行本地教学模型，播放时回放已计算的中间状态。完整源码包含辅助函数；本区不执行任意代码。Agent 决策使用预设策略。</p><div class="aic-actions"><button type="button" data-go-tab="read">← 返回讲解</button><button type="button" data-go-tab="practice">用新输入独立验证 →</button></div></section>
      <section class="aic-panel" role="tabpanel" id="aic-panel-practice" aria-labelledby="aic-tab-practice" ${activeTab !== 'practice' ? 'hidden' : ''}><h3>先预测，再操作，最后解释</h3><ol class="aic-practice-list">${lesson.practice.map(x => `<li>${esc(x)}</li>`).join('')}</ol><label class="aic-field" for="aic-prediction">我的预测（可选）<textarea id="aic-prediction" maxlength="12000" placeholder="先写下预计变化，再打开动画核对。">${esc(draft.prediction || '')}</textarea></label><div class="aic-subsection"><h3>换一组输入，检查计算</h3><p>${esc(lesson.exercise.prompt)}</p><label class="aic-field" for="aic-answer">你的数值结果${lesson.exercise.unit ? `（${esc(lesson.exercise.unit)}）` : ''}</label><div class="aic-exercise-row"><input type="text" inputmode="decimal" id="aic-answer" value="${esc(draft.answer || '')}" maxlength="100" autocomplete="off"><button type="button" id="aic-check" class="aic-primary">检查数值</button></div><p id="aic-feedback" class="aic-feedback" role="status" aria-live="polite">这道检查不会自动标记掌握或增加学习时长。</p><details><summary>需要一个提示</summary><p>${esc(lesson.exercise.hint)}</p></details><details><summary>查看复算方法</summary><p>${esc(lesson.exercise.solution)}</p></details></div><div class="aic-subsection"><h3>独立验证任务</h3><p>${esc(lesson.exercise.transfer)}</p><label class="aic-field" for="aic-reason">解释与验证证据（可选）<textarea id="aic-reason" maxlength="12000" placeholder="写下输入、关键中间值、你的推理与实际核对结果。">${esc(draft.reason || '')}</textarea></label><div class="aic-actions"><button type="button" id="aic-export">导出当前练习</button><button type="button" id="aic-print">打印当前讲义</button></div><p class="aic-note">导出包含你的填写和模型计算快照；不会生成学习分钟、完成证明或真实训练日志。此处草稿与主站学习记录备份分开保存。</p></div></section>
      <section class="aic-panel" role="tabpanel" id="aic-panel-sources" aria-labelledby="aic-tab-sources" ${activeTab !== 'sources' ? 'hidden' : ''}><h3>从原课到本讲课件</h3><p class="aic-note">先对照指定课件页与字幕段落，再复算本站例子。来源核对日：${esc(data.checked)}；统一使用 2026 版。第三方课件、代码与转录的权利仍归原作者。</p>${lesson.sources.map(sourceRow).join('')}<div class="aic-subsection"><h3>本站增加了什么</h3><p>中文讲解、最小算例、各讲的本地计算模型、步骤与变量回放、独立练习与验证条件均为本站原创配套。官方课件和字幕以链接定位，不整份嵌入公开站点。</p><p class="aic-boundary">${esc(lesson.boundary)}</p></div></section>
      <footer class="aic-bottom"><span>把同一个知识点连接到另一门课</span><nav class="aic-bridges" aria-label="跨课程连接">${lesson.bridges.map(b => `<a href="#${esc(b.lesson)}">${esc(b.label)} ↗</a>`).join('')}</nav></footer></article></div><footer class="aic-footer"><span>${esc(data.policy)}</span><span id="aic-storage" role="status"></span></footer>`;
    storageStatus(); showStep(false); if(activeTab==='watch')fitWorkspace(true);
  }
  function visualHTML(v) {
    const title = `<h3>${esc(v.title)}</h3>`;
    if (v.kind === 'flow') return title + `<div class="aic-flow" role="group" aria-label="${esc(v.title)}">${v.nodes.map((n, i) => `${i ? '<span class="aic-flow-arrow" aria-hidden="true">→</span>' : ''}<div class="aic-node ${n.active ? 'aic-node-active' : ''}"><strong>${esc(n.label)}</strong><span>${esc(n.detail)}</span></div>`).join('')}</div>`;
    if (v.kind === 'bars') {
      const negative = v.rows.some(x=>x.value<0), min = negative ? Math.min(0,...v.rows.map(x=>x.value)) : 0;
      const max = negative ? Math.max(0,...v.rows.map(x=>x.value)) : v.max || Math.max(...v.rows.map(x=>x.value),0.000001);
      const span = Math.max(max-min,0.000001), zero = -min/span*100;
      return title + v.rows.map(row => {const width=Math.min(100,Math.abs(row.value)/span*100),left=row.value<0?zero-width:zero;return `<div class="aic-bar-row"><span>${esc(row.label)}</span><div class="aic-bar-track" aria-hidden="true">${negative?`<b class="aic-zero-marker" data-aic-left="${zero}"></b>`:''}<i class="${row.value<0?'aic-bar-negative':''}" data-aic-width="${width}" data-aic-left="${left}"></i></div><output>${fmt(row.value)} ${esc(v.unit||'')}</output></div>`;}).join('');
    }
    if (v.kind === 'segments') {
      const capacity = Math.max(v.capacity, 0.000001), sum = v.segments.reduce((s, x) => s + x.value, 0);
      return title + `<div class="aic-segments" role="img" aria-label="${esc(v.segments.map(x => x.label + ' ' + fmt(x.value) + ' ' + v.unit).join('；'))}">${v.segments.map(s => `<span class="aic-segment" data-aic-width="${s.value / capacity * 100}"><span>${s.value / capacity > 0.12 ? esc(s.label) : ''}</span></span>`).join('')}${v.marker !== undefined ? `<i class="aic-marker" data-aic-left="${v.marker * 100}" aria-hidden="true"></i>` : ''}</div><div class="aic-segment-legend">${v.segments.map(s => `<span>${esc(s.label)} ${fmt(s.value)} ${esc(v.unit)}</span>`).join('')}${sum < capacity - 1e-7 ? `<span>剩余 ${fmt(capacity - sum)} ${esc(v.unit)}</span>` : ''}${v.marker !== undefined ? `<span>抽样点 u = ${fmt(v.marker)}</span>` : ''}</div>`;
    }
    return '';
  }
  function showStep(announce = true) {
    const current = trace.steps[step];
    document.querySelector('.aic-code-lines').innerHTML = trace.code.map((line,i)=>`<li data-code-line="${i+1}"><code>${esc(line)}</code></li>`).join('');
    document.getElementById('aic-count').textContent = `${step + 1} / ${trace.steps.length} 步 · 对应第 ${current.line} 行`;
    document.getElementById('aic-step-title').textContent = current.title;
    document.getElementById('aic-step-detail').textContent = current.detail;
    document.getElementById('aic-step-track').innerHTML = trace.steps.map((_, i) => `<i class="${i < step ? 'aic-past' : i === step ? 'aic-now' : ''}"></i>`).join('');
    const previousWidths = Array.from(document.querySelectorAll('[data-aic-width]')).map(el=>el.dataset.aicWidth);
    const scene=document.getElementById('aic-visual');scene.classList.toggle('attn-active',trace.model==='attention');
    scene.innerHTML=(trace.model==='attention'?window.AttentionWorkbench?.render(trace,step,attentionBaseline):'')||visualHTML(current.visual);
    const oldStages=document.querySelector('#aic-course-inspector .ci-stages');if(oldStages&&inspectionSession?.ci)inspectionSession.ci.stagesOpen=oldStages.open;
    const oldGrid=document.querySelector('#aic-course-inspector .ci-cells');if(oldGrid&&inspectionSession?.ci)inspectionSession.ci.gridScroll=oldGrid.scrollTop;
    document.getElementById('aic-course-inspector')?.remove();
    if(trace.model!=='attention'&&window.CourseInspectorWorkbench?.descriptor(course.id,trace)){
      inspectionSession ||= {};inspectionSession.trace=trace;inspectionSession.index=step;
      const panel=document.createElement('div');panel.id='aic-course-inspector';panel.innerHTML=window.CourseInspectorWorkbench.render(course.id,inspectionSession);document.getElementById('aic-step-detail').after(panel);
      panel.querySelector('.ci-cells').scrollTop=inspectionSession.ci.gridScroll||0;
    }
    if(trace.model==='attention'){scene.scrollTop=0;if(announce)main.querySelector('.aic-inspection-column')?.scrollTo({top:0});}
    let attentionAnchor=document.getElementById('aic-step-detail');
    for(const [part,name] of [['calculation','formula'],['comparison','comparison']]){
      document.getElementById('aic-attention-'+name)?.remove();const block=scene.querySelector('.attn-'+part);
      if(block){block.id='aic-attention-'+name;attentionAnchor.after(block);attentionAnchor=block;}
    }
    document.querySelectorAll('[data-aic-width]').forEach((el,i) => { el.style.width = el.dataset.aicWidth + '%'; if (!matchMedia('(prefers-reduced-motion: reduce)').matches && el.animate) el.animate([{width:(previousWidths[i] || 0)+'%'},{width:el.dataset.aicWidth+'%'}],{duration:400,easing:'ease-out'}); });
    document.querySelectorAll('[data-aic-left]').forEach(el => { el.style.left = el.dataset.aicLeft + '%'; });
    document.getElementById('aic-variables').innerHTML = Object.entries(current.variables).map(([name, value]) => `<dt>${esc(name)}</dt><dd>${esc(formatVariable(value))}</dd>`).join('');
    document.querySelectorAll('[data-code-line]').forEach(el => { const active = Number(el.dataset.codeLine) === current.line; el.classList.toggle('aic-code-active', active); if (active) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
    document.getElementById('aic-prev').disabled = step === 0;
    document.getElementById('aic-next').disabled = step === trace.steps.length - 1;
    keepActiveCodeVisible();
    if (announce) document.getElementById('aic-announcement').textContent = `步骤 ${step + 1}：${current.title}`;
  }
  function formatVariable(value) {
    if(typeof value==='number')return fmt(value);
    if(typeof value==='string')return value;
    if(Array.isArray(value))return value.every(x=>x===null||typeof x!=='object')?JSON.stringify(value):value.map((x,i)=>'['+i+'] '+JSON.stringify(x)).join('\n');
    if(value&&typeof value==='object')return Object.entries(value).map(([key,x])=>key+': '+JSON.stringify(x)).join('\n');
    return String(value);
  }
  function keepActiveCodeVisible(){
    const list=document.querySelector('.aic-code-lines'),active=list?.querySelector('.aic-code-active');if(!active||activeTab!=='watch')return;
    const a=active.getBoundingClientRect(),r=list.getBoundingClientRect();
    if(a.top<r.top)list.scrollTop-=r.top-a.top;
    else if(a.bottom>r.bottom)list.scrollTop+=a.bottom-r.bottom;
  }
  function fitWorkspace(scroll=false){
    const panel=document.getElementById('aic-panel-watch'),workspace=panel?.querySelector('.aic-workspace');if(!workspace||activeTab!=='watch')return;
    if(scroll)panel.scrollIntoView({block:'start',behavior:'auto'});
    const top=Math.max(0,workspace.getBoundingClientRect().top),height=Math.max(280,Math.min(760,innerHeight-top-22));
    workspace.style.setProperty('--aic-workspace-height',height+'px');
  }
  function setTab(id) {
    if (!panels.some(([key]) => id === key)) return;
    if (id !== 'watch') pause(); activeTab = id;
    for (const [key] of panels) { document.getElementById('aic-panel-' + key).hidden = key !== id; document.getElementById('aic-tab-' + key).setAttribute('aria-selected', String(key === id)); }
    if(id==='watch'){fitWorkspace(true);keepActiveCodeVisible();}
  }
  function choose(id, remember = true) {
    inspectionSession=null;
    attentionBaseline=null;
    const found = data.lessons.find(x => x.id === id) || data.lessons[0];
    if (remember && lesson) persist(); pause(); lesson = found; course = data.courses.find(c => c.id === lesson.course); step = 0; activeTab = 'read';
    const draft = drafts[lesson.id], model = selectedModel(lesson,draft);
    try { trace = M.run(model, draft?.demonstrations?.[model] || (draft?.modelId===model || !draft?.modelId ? draft?.params : undefined)); } catch (_) { trace = M.run(model); }
    document.title = `${lesson.title} · ${course.label} 2026 · 动手学`;
    render();
  }
  function navigate(id) { if (location.hash.slice(1) === id) { choose(id); return; } location.hash = id; }
  function recompute() {
    pause(); const supplied = {};
    document.querySelectorAll('[data-param]').forEach(el => { supplied[el.dataset.param] = el.value; });
    const attention=trace.model==='attention',index=step;
    if(attention&&!attentionBaseline)attentionBaseline=trace;
    trace = M.run(trace.model, supplied); step = Math.min(index,trace.steps.length-1);
    for (const s of M.specs[trace.model]) if (s.type === 'range') document.getElementById('aic-value-' + s.id).textContent = fmt(trace.params[s.id]) + ' ' + s.unit;
    showStep(); persist();
  }
  function changeDemo(id) {
    if (!demonstrations().some(d=>d.modelId===id)) return;
    persist(); pause(); attentionBaseline=null; const draft=drafts[lesson.id];
    try { trace=M.run(id,draft?.demonstrations?.[id]); } catch (_) { trace=M.run(id); }
    step=0; activeTab='watch'; render(); persist();
  }
  function attentionAction(target){
    const workbench=window.AttentionWorkbench;if(trace.model!=='attention'||!workbench)return;
    pause();
    if(target.hasAttribute('data-attn-step')){
      const index=Number(target.dataset.attnStep);if(!Number.isInteger(index)||index<0||index>=trace.steps.length)return;
      const selector=target.classList.contains('attn-cell')?'.attn-cell':target.classList.contains('attn-stage')?'.attn-stage':'.attn-tools button';
      step=index;showStep();main.querySelector(selector+'[data-attn-step="'+index+'"]')?.focus({preventScroll:true});return;
    }
    if(target.hasAttribute('data-attn-pin'))attentionBaseline=trace;
    else if(target.hasAttribute('data-attn-reset')){attentionBaseline=null;trace=M.run('attention');step=0;}
    else{const experiment=workbench.experiments[target.dataset.attnExperiment];if(!experiment)return;attentionBaseline=M.run('attention',experiment.before);trace=M.run('attention',experiment.after);step=trace.steps.length-1;}
    M.specs.attention.forEach(control=>{document.getElementById('aic-param-'+control.id).value=trace.params[control.id];if(control.type==='range')document.getElementById('aic-value-'+control.id).textContent=fmt(trace.params[control.id])+' '+(control.unit||'');});
    showStep();persist();
    const selector=target.hasAttribute('data-attn-experiment')?'[data-attn-experiment="'+target.dataset.attnExperiment+'"]':target.hasAttribute('data-attn-pin')?'[data-attn-pin]':'[data-attn-reset]';main.querySelector(selector)?.focus({preventScroll:true});
  }
  function exportExercise() {
    persist(); const draft = drafts[lesson.id], check = M.checkNumeric(draft.answer, lesson.exercise.expected, lesson.exercise.tolerance);
    const text = `# ${course.label} · ${lesson.title}\n\n材料版本：${course.edition}；来源核对日：${data.checked}\n\n## 我的预测\n\n${draft.prediction || '未填写'}\n\n## 本次数值检查\n\n题目：${lesson.exercise.prompt}\n\n我的答案：${draft.answer || '未填写'}\n\n反馈：${draft.answer?.trim() ? check.message : '尚未提交数值'}\n\n## 我的解释与独立验证\n\n${draft.reason || '未填写'}\n\n独立任务：${lesson.exercise.transfer}\n\n## 教学模型快照\n\n演示模型：${trace.model}\n\n输入参数：\n\n\`\`\`json\n${json(trace.params)}\n\`\`\`\n\n模型计算结果：\n\n\`\`\`json\n${json(trace.result)}\n\`\`\`\n\n范围：${lesson.boundary}\n\n此文档包含模型计算与本人填写，不是实际训练日志、知识掌握证明或学习时长记录。\n\n## 来源\n\n${lesson.sources.map(id => data.sources[id]).map(s => `- [${s.label}](${s.url})：${s.status}`).join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = `${course.id}-2026-${lesson.id}-practice.md`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  main.addEventListener('click', event => {
    const b = event.target.closest('button'); if (!b || !data) return;
    if (b.disabled) return;
    if(b.dataset.ciAction&&inspectionSession){
      pause();const api=window.CourseInspectorWorkbench;
      if(api.perform(course.id,inspectionSession,b.dataset.ciAction,b.dataset.ciValue,p=>M.run(trace.model,p))){
        trace=inspectionSession.trace;step=inspectionSession.index;
        for(const s of M.specs[trace.model]){document.getElementById('aic-param-'+s.id).value=trace.params[s.id];if(s.type==='range')document.getElementById('aic-value-'+s.id).textContent=fmt(trace.params[s.id])+' '+s.unit;}
        showStep(false);persist();
        const selector='[data-ci-action="'+b.dataset.ciAction+'"]'+(b.dataset.ciValue?'[data-ci-value="'+CSS.escape(b.dataset.ciValue)+'"]':'');main.querySelector('#aic-course-inspector '+selector)?.focus({preventScroll:true});
      }return;
    }
    if(b.closest('.attn-workbench')){attentionAction(b);return;}
    if (b.dataset.demo) { changeDemo(b.dataset.demo); return; }
    if (b.dataset.course) { navigate(data.lessons.find(l => l.course === b.dataset.course).id); return; }
    if (b.dataset.lesson) { navigate(b.dataset.lesson); return; }
    if (b.dataset.tab || b.dataset.goTab) { setTab(b.dataset.tab || b.dataset.goTab); return; }
    if (b.id === 'aic-play') {
      if (timer !== null) { pause(); return; }
      if (step === trace.steps.length - 1) step = 0;
      showStep(); b.textContent = '暂停'; b.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { if (step >= trace.steps.length - 1) { pause(); return; } step += 1; showStep(false); if (step === trace.steps.length - 1) { pause(); document.getElementById('aic-announcement').textContent = '本次计算过程播放结束。'; } }, 1500);
    } else if (b.id === 'aic-prev' || b.id === 'aic-next') { pause(); step = Math.max(0, Math.min(trace.steps.length - 1, step + (b.id === 'aic-next' ? 1 : -1))); showStep(); }
    else if (b.id === 'aic-recompute') recompute();
    else if (b.id === 'aic-check') { persist(); const result = M.checkNumeric(document.getElementById('aic-answer').value, lesson.exercise.expected, lesson.exercise.tolerance), el = document.getElementById('aic-feedback'); el.textContent = result.message; el.dataset.correct = String(result.correct); }
    else if (b.id === 'aic-export') exportExercise();
    else if (b.id === 'aic-print') { pause(); window.print(); }
  });
  main.addEventListener('input', e => { if (e.target.matches('[data-param]')) recompute(); else if (e.target.matches('#aic-prediction,#aic-answer,#aic-reason')) { persist(); if (e.target.id === 'aic-answer') { const el = document.getElementById('aic-feedback'); delete el.dataset.correct; el.textContent = '答案已改变，请重新检查。'; } } });
  main.addEventListener('change', e => { if (e.target.id==='aic-demo-picker') changeDemo(e.target.value); else if (e.target.id==='aic-lecture-picker') navigate(e.target.value); else if (e.target.matches('select[data-param]')) recompute(); });
  main.addEventListener('keydown', e => {
    if (e.target.matches('[role=tab]') && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const i = panels.findIndex(([key]) => key === activeTab), next = e.key === 'Home' ? 0 : e.key === 'End' ? panels.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + panels.length) % panels.length;
      setTab(panels[next][0]); document.getElementById('aic-tab-' + activeTab).focus();
    }
  });
  window.addEventListener('hashchange', () => { if (data && location.hash !== '#aic-main') { choose(location.hash.slice(1)); window.scrollTo(0, 0); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', pause);
  window.addEventListener('resize',()=>{fitWorkspace(false);keepActiveCodeVisible();});
  const embedded = document.getElementById('aic-embedded-data');
  const ready = embedded ? Promise.resolve(JSON.parse(embedded.textContent)) : fetch('./ai-courses.json').then(r => { if (!r.ok) throw Error('课程内容加载失败'); return r.json(); });
  ready.then(value => { if (value.material_year !== 2026 || !Array.isArray(value.lessons) || !M) throw Error('课程版本或教学模型无效'); data = value; choose(location.hash.slice(1), false); }).catch(error => { main.innerHTML = `<p class="aic-error" role="alert">${esc(error.message)}。离线阅读请使用打包后的单文件课件。</p>`; });
})();
