/* Injected inside the map shell. Original lessons share its navigation and personal route. */
  const mappedTeaching = __MAPPED_TEACHING__;
  const mappedResources = __MAPPED_RESOURCES__;
  const teachingCourseIds = [...new Set(mappedTeaching.map(x=>x.teaching.map_course_id))];
  const teachingUnits = Object.fromEntries(teachingCourseIds.map(id=>[id,mappedTeaching.filter(b=>b.teaching.map_course_id===id)]));
  for(const id of teachingCourseIds){
    const p=expansionById[id],units=teachingUnits[id];
    if(!p)continue;
    courses[id]={localTeaching:true,label:p.label,english:p.title,branch:p.lane==='c'?'C · 机器人与具身实践':p.lane==='a'?'A · 大模型原理与研发':'共同基础与工程实践',node:p.node,title:p.title,
      fit:'本站前置与配套教学 · '+units.length+' 个可操作小课',count:units.length+' 个教学单元',sample:1,
      prereq:p.prereq,version:'本站原创教学 · 配套原始资料',lessons:units.map(b=>[b.title,b.intuition||b.teaching.question,b.acceptance||b.practice]),
      groups:[{title:'围绕当前目标学习',ids:units.map((_,i)=>i+1)}],sources:p.sources};
    p.course=id;p.teaching=true;
    nodes[p.node] ||= {code:p.label,title:p.title,kicker:p.phase,desc:p.summary,prereq:p.prereq,check:p.check,courses:[],planIds:[]};
    nodes[p.node].courses ||= [];if(!nodes[p.node].courses.includes(id))nodes[p.node].courses.push(id);
  }
  for(const n of Object.values(nodes))for(const id of n.planIds||[]){if(teachingCourseIds.includes(id)&&!n.courses.includes(id))n.courses.push(id);}
  if(nodes.b2&&!nodes.b2.courses.includes('hfagents'))nodes.b2.courses.push('hfagents');
  const teachingNames=mappedTeaching.filter(b=>b.kind==='block'&&b.id.includes('-')).sort((a,b)=>b.id.length-a.id.length);
  function teachingProse(value){let text=String(value||'');for(const b of teachingNames)text=text.split(b.id).join('「'+b.title+'」');return text;}
  function teachingButton(text,action,value,primary=false){return `<button type="button" class="button ${primary?'primary':''}" data-action="${action}" data-value="${esc(value)}">${esc(text)}</button>`;}
  function renderTeachingChrome(){
    const id=state.course,c=courses[id],units=teachingUnits[id],current=units[Math.max(0,Math.min(units.length-1,state.selected-1))];
    root.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.action==='map'));
    breadcrumbs.innerHTML=teachingButton('学习地图','map','')+' / '+teachingButton(c.label,'course',id)+(state.view==='lesson'?' / <b>'+esc(current.title)+'</b>':'');
    contextNav.innerHTML='<div class="context-label">'+esc(c.label)+' · 本站配套教学</div>'+teachingButton('课程目录','course',id)+units.map((b,i)=>`<button class="context-item" data-action="teaching-open" data-value="${b.id}" ${state.view==='lesson'&&b.id===current.id?'aria-current="page"':''}>${String(i+1).padStart(2,'0')}　${esc(b.title)}</button>`).join('');
  }
  function teachingResources(id){
    const items=mappedResources.filter(r=>r.map_course_ids?.includes(id));
    return items.length?'<section class="teaching-source-note"><h3>已有资料，按当前问题选读</h3>'+items.map(r=>`<details><summary>${esc(r.title)} · ${esc(r.role||'配套参考')}</summary><p>${esc(r.reading_scope)}</p><pre style="white-space:pre-wrap;font:13px/1.85 system-ui;max-height:460px;overflow:auto">${esc(r.content)}</pre></details>`).join('')+'</section>':'';
  }
  function renderTeachingCourse(){
    const id=state.course,c=courses[id],units=teachingUnits[id];
    main.innerHTML=`<section class="teaching-legacy-course"><div class="teaching-course-intro"><div><div class="eyebrow">${esc(c.branch)} · 本站配套教学</div><h1>${esc(expansionById[id].title)}</h1><p class="lead">先用具体问题建立直觉，再动手复现。${units.length} 个原有学习单元已收进这个地图节点。</p><p class="small muted">本页是本站原创前置与配套练习；原始课程、书籍和工具文档分别保留来源。</p></div><div class="teaching-course-actions">${teachingButton('开始第一课 →','teaching-open',units[0].id,true)}${teachingButton('加入我的路线','personal-add',id)}</div></div><div class="teaching-map-strip">讲解 → 改参数看动画 → 对照代码 → 独立验证 → 保存观察</div><div class="syllabus-heading"><h2>课程目录</h2><span class="small muted">${units.length} 个教学单元</span></div><div class="teaching-course-units">${units.map((b,i)=>`<article class="teaching-unit-card"><small>${String(i+1).padStart(2,'0')} · ${b.kind==='ee'?'电路原理补课':'主线学习块'}</small><h3>${esc(b.title)}</h3><p>${esc(b.teaching.question)}</p>${teachingButton('开始这一课 →','teaching-open',b.id)}</article>`).join('')}</div>${teachingResources(id)}<p class="teaching-source-note">配套原始入口：${c.sources.map(x=>link(esc(x[0]),x[1])).join('')}</p></section>`;
  }
  function renderTeachingLesson(){
    const id=state.course,units=teachingUnits[id],index=Math.min(units.length-1,Math.max(0,state.selected-1)),b=units[index];
    const reading=b.readings||b.sources||[],steps=b.walkthrough?.steps||[],sessions=b.sessions||[],concepts=b.concepts||[];
    main.innerHTML=`<section class="teaching-legacy-course"><div class="teaching-lesson-header"><div class="eyebrow">${esc(courses[id].label)} · ${index+1} / ${units.length} · 本站原创练习</div><h1>${esc(b.title)}</h1><p class="lead">${esc(b.intuition||b.question||b.teaching.question)}</p></div><div class="teaching-reading"><article><h3>先带着问题想一想</h3><p>${esc(b.teaching.question)}</p><p>${esc(b.walkthrough?.goal||b.first_step||b.concepts?.[0]||'改变一个条件，先写下预测，再用下面的模型验证。')}</p></article><aside class="teaching-reading-side"><b>开始前</b><p>${esc(teachingProse(b.prerequisite||expansionById[id].prereq))}</p></aside></div>${CourseTeaching.render(b.teaching,b.title)}<div class="teaching-reading"><article><h3>跟着做，再自己改一次</h3>${b.kind==='ee'?concepts.map(p=>'<p>'+esc(p)+'</p>').join(''):''}${steps.length?steps.map((s,i)=>`<details ${i===0?'open':''}><summary>${esc(s.title)}</summary><p>${esc(s.instruction)}</p>${s.code?'<pre class="teaching-code">'+esc(s.code)+'</pre>':''}<details><summary>做过以后核对结果与原因</summary><p>${esc(s.expected)}</p><p>${esc(s.why)}</p></details></details>`).join(''):'<ol>'+sessions.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'}<h3>独立练习</h3><p>${esc(b.walkthrough?.practice||b.practice||b.exercise)}</p><details><summary>做完后核对</summary><p>${esc(b.walkthrough?.answer||b.acceptance)}</p></details></article><aside class="teaching-reading-side"><h3>留下什么成果</h3><p>${esc(b.acceptance||b.walkthrough?.rubric?.join('；'))}</p><p class="small muted">完成实际练习后，把输入、结果和解释记到当前个人路线。</p><div class="row">${teachingButton('今日学习台','workspace','')}${teachingButton('学习记录','records','')}</div><h3>按问题回到资料</h3>${reading.map(r=>`<p>${link(esc(r.title),r.url)}${r.note?'<br>'+esc(r.note):''}</p>`).join('')}${b.kind==='ee'?'<p>'+esc(b.formula)+'</p>':''}</aside></div><nav class="teaching-lesson-nav" aria-label="本课程前后课">${index?teachingButton('← '+units[index-1].title,'teaching-open',units[index-1].id):'<span></span>'}${index<units.length-1?teachingButton(units[index+1].title+' →','teaching-open',units[index+1].id):teachingButton('返回地图','map','')}</nav><p class="teaching-source-note">${esc(b.teaching.attribution)}</p></section>`;
    CourseTeaching.bind(main);
  }
  root.addEventListener('click',event=>{
    const b=event.target.closest('[data-action="teaching-open"]');if(!b)return;
    const index=teachingUnits[state.course]?.findIndex(x=>x.id===b.dataset.value);if(index===undefined||index<0)return;
    state.selected=index+1;go('lesson');
  });
  globalThis.LBBTeachingRecord=async (definition,snapshot)=>{
    const personal=activePersonal();
    if(!personal)throw Error('先采用一条包含本课的个人路线，再保存到学习记录。');
    if(!personal.courseIds.includes(definition.map_course_id))throw Error('当前个人路线未包含本课，请先将课程加入路线。');
    await workbenchCall('teachingObservation',{profile:personal,courseId:definition.map_course_id,lessonId:definition.id,title:definition.title,snapshot});
    if(typeof refreshWorkspace==='function')await refreshWorkspace();
  };
