/* Extend the existing reader; map IDs, records and Stanford courseware stay shared. */
  const fidData = __FOUNDATION_DATA__;
  const fidIds = new Set(fidData.courses.map(c=>c.id));
  const fidLessons = new Set(fidData.lessons.map(l=>l.id));
  let fidLegacy = false;
  let fidPlayerObserver = null;
  Object.assign(aidData.sources,fidData.sources);
  aidData.courses.push(...fidData.courses);
  aidData.lessons.push(...fidData.lessons);
  Object.assign(aidById,Object.fromEntries(fidData.lessons.map(l=>[l.id,l])));
  for(const c of fidData.courses){
    const p=expansionById[c.id],items=fidData.lessons.filter(l=>l.course===c.id);
    if(!p)throw Error('基础课缺少地图身份：'+c.id);
    const previous=courses[c.id]||{};
    courses[c.id]={...previous,localTeaching:true,foundationTeaching:true,label:c.label,english:c.title,title:c.title,
      branch:c.position,node:p.node,fit:c.description,intro:c.description,version:c.edition,count:items.length+' 讲配套教学',sample:1,
      prereq:c.prerequisites.join('；'),lessons:items.map(l=>[l.title,l.question,l.outcome]),
      groups:[{title:c.batch||'基础课',ids:items.map((_,i)=>i+1)}],sources:p.sources};
    p.course=c.id;p.teaching=true;p.phase=(c.batch||'基础课')+' · 已整理';
    nodes[p.node] ||= {code:c.label,title:c.title,kicker:'共同基础',desc:c.description,prereq:p.prereq,check:p.check,courses:[],planIds:[]};
    nodes[p.node].courses ||= [];if(!nodes[p.node].courses.includes(c.id))nodes[p.node].courses.push(c.id);
    for(const n of Object.values(nodes))if((n.planIds||[]).includes(c.id)&&!n.courses.includes(c.id))n.courses.push(c.id);
  }
  const fidOldCourseReader=aidRenderCourse,fidOldLessonReader=aidRenderLesson;
  aidRenderCourse=function(){
    fidOldCourseReader();if(!fidIds.has(state.course))return;
    const c=aidCourse(),items=fidData.lessons.filter(l=>l.course===c.id);
    if(['cs50p','tools'].includes(c.id))main.querySelector('.aid-course-summary>span:last-child').textContent='讲解 · 执行快照 · 代码 · 独立练习';
    main.querySelectorAll('.aid-course-unit small').forEach((el,i)=>{
      const topics=c.coverage?.items.filter(topic=>topic.lessons.includes(items[i].id))||[];
      el.textContent=c.label+' · '+(topics.length?topics.map(topic=>(c.id==='tools'?'原课主题 ':'')+topic.unit).join(' / '):'本站第'+items[i].unit+'讲');
    });
    const scope=main.querySelector('.aid-published');
    scope.querySelector('summary').textContent=c.coverage?'官方主题对应与课程范围':'选读范围、材料版本与后续内容';
    if(c.coverage){
      const list=document.createElement('ol');list.className='fid-coverage';list.setAttribute('aria-label','原课主题与本站课件对应');
      for(const topic of c.coverage.items){
        const row=document.createElement('li');row.dataset.fidTopic=topic.unit;
        row.innerHTML='<div><small>'+aidEscape(topic.unit)+'</small><strong>'+aidEscape(topic.title)+'</strong></div><span class="fid-coverage-state">已有配套</span><div class="fid-coverage-links">'+topic.lessons.map(id=>aidButton(aidById[id].title.replace(/^第\d+讲\s*/,''),'open',id)).join('')+'</div>';
        list.append(row);
      }
      scope.querySelector('ul').replaceWith(list);
      const note=document.createElement('p');note.className='fid-coverage-note';
      note.textContent=c.coverage.label+'。按官方主题对应本站原创讲解、执行快照与练习；覆盖主题表示课件已制作，学习结果由自己的实践核验。';
      scope.querySelector('summary').after(note);
    }
    main.querySelector('.source-line').textContent=fidData.policy+' · 材料核对 '+fidData.checked;
    const units=teachingUnits[c.id]||[];
    if(units.length){
      const prior=document.createElement('details');prior.className='fid-legacy';
      prior.innerHTML='<summary>继续使用原有配套练习 · '+units.length+' 个学习单元</summary><p>原有学习块与练习保留，新增课件按知识点进一步展开。</p><div class="row">'+units.map(b=>button(b.title,'fid-legacy',b.id)).join('')+'</div>'+teachingResources(c.id);
      main.querySelector('.aid-scope').append(prior);
    }
  };
  aidRenderLesson=function(){
    fidOldLessonReader();if(!fidIds.has(state.course))return;
    const l=aidLesson();aidPrograms(l);
    const coding=['cs50p','tools'].includes(l.course),math=['linear','probability','cs229'].includes(l.course);
    if(math){main.querySelector('#aid-tab-lab').textContent='② 图示与计算';main.querySelector('#aid-panel-explain [data-action="aid-tab"][data-value="lab"]').textContent='对照图示逐步复算 →';}
    if(coding){main.querySelector('#aid-tab-lab').textContent=l.course==='cs50p'?'② 代码执行':'② 命令与状态';main.querySelector('#aid-panel-explain [data-action="aid-tab"][data-value="lab"]').textContent='逐步核对执行结果 →';}
    main.querySelector('.aid-model-note').textContent='参数变化时重新计算本地教学模型；播放回放已计算的步骤。浏览器不执行 Python、Shell 或 PyTorch，实际运行请使用讲解中的代码与对应环境。';
    main.querySelector('.aid-sources h2').textContent='逐项对照原始教学材料';
    main.querySelector('.aid-sources>p').textContent='基础课材料核对：'+fidData.checked+'。各原始来源另列实际版本、章节及读取状态。';
    main.querySelector('.aid-sources .source-line').textContent='第三方材料保留原作者权利。本讲按列出的公开版本与章节选编，中文讲解、算例和动画为本站原创配套。';
    main.querySelector('.aid-links>span').textContent='连接下一步与相关基础';
    main.querySelectorAll('.aid-reading-section').forEach((section,index)=>{
      const source=l.sections[index];
      if(source.code){
        const caption=document.createElement('p');caption.className='fid-code-caption';caption.textContent='代码示例 · 在相应本地环境核对';
        const pre=document.createElement('pre');pre.className='fid-local-code';const code=document.createElement('code');code.textContent=Array.isArray(source.code)?source.code.join('\n'):source.code;pre.append(code);section.append(caption,pre);
      }
      if(source.exercise){const p=document.createElement('p');p.className='fid-section-task';p.textContent='自己试一次：'+(typeof source.exercise==='string'?source.exercise:source.exercise.prompt);section.append(p);}
    });
    const items=fidData.lessons.filter(x=>x.course===l.course),i=items.findIndex(x=>x.id===l.id),nav=document.createElement('nav');
    nav.className='fid-sequence row';nav.setAttribute('aria-label','本课程前后讲');
    nav.innerHTML=(i?aidButton('← '+items[i-1].title,'open',items[i-1].id):'')+(i<items.length-1?aidButton(items[i+1].title+' →','open',items[i+1].id):button('回到课程目录','course',l.course));
    main.querySelector('.aid-links').append(nav);
    // Keep playback and its scene together, ahead of the many adjustable inputs.
    const panel=main.querySelector('#aid-panel-lab'),player=panel.querySelector('.aid-player');
    panel.prepend(player);
    const stage=document.createElement('section');stage.id='fid-motion-stage';stage.className='fid-motion-stage';stage.setAttribute('aria-label','本讲动态图示');
    stage.innerHTML='<div class="fid-motion-caption"><strong>跟着数据看过程</strong><span id="fid-motion-state" role="status">点击播放，或逐步查看</span></div><div id="fid-motion-scene"></div><p id="fid-motion-detail"></p>';
    player.after(stage);
    const controls=document.createElement('details');controls.className='fid-motion-settings';controls.innerHTML='<summary>修改输入参数，重新计算</summary>';
    const selector=panel.querySelector('.aid-demo-selector'),parameters=panel.querySelector('.aid-parameters');
    if(selector)controls.append(selector);controls.append(parameters);stage.after(controls);
    const original=panel.querySelector('#aid-visual'),numbers=document.createElement('details');numbers.className='fid-motion-values';numbers.innerHTML='<summary>展开本步数值对照</summary>';original.before(numbers);numbers.append(original);
    fidPlayerObserver?.disconnect();const play=player.querySelector('[data-action="aid-play"]');
    const sync=()=>{if(!stage.isConnected)return;const playing=play.getAttribute('aria-pressed')==='true';stage.dataset.playing=String(playing);stage.querySelector('#fid-motion-state').textContent=coding?(playing?'连续查看执行步骤':'单步查看 · 对照代码与变量'):(playing?'正在播放 · 数据与代码同步推进':'已暂停 · 可前后单步查看');if(coding)play.textContent=playing?'暂停执行':'连续执行';};
    fidPlayerObserver=new MutationObserver(sync);fidPlayerObserver.observe(play,{attributes:true,attributeFilter:['aria-pressed']});
    if(coding){play.classList.remove('primary');player.querySelector('[data-action="aid-next"]').classList.add('primary');stage.setAttribute('aria-label','代码执行与状态变化');}
    aidMountWorkspace();aidDraw(false);sync();if(aidSession().tab==='lab')aidFitWorkspace();
  };
  // Signed quantities keep their direction: gradients and logits can be negative.
  const fidOldVisual=aidVisual;
  aidVisual=function(v){
    if(!fidIds.has(state.course)||v.kind!=='bars'||!v.rows.some(r=>r.value<0))return fidOldVisual(v);
    const lo=Math.min(0,...v.rows.map(r=>r.value)),hi=Math.max(0,...v.rows.map(r=>r.value)),span=hi-lo||1,zero=-lo/span*100;
    return '<h3>'+aidEscape(v.title)+'</h3>'+v.rows.map(r=>{
      const width=Math.abs(r.value)/span*100,left=r.value<0?zero-width:zero;
      return `<div class="aid-bar fid-signed"><span>${aidEscape(r.label)}</span><div><b data-aid-left="${zero}" class="fid-zero"></b><i data-aid-left="${left}" data-aid-width="${width}" class="${r.value<0?'fid-negative':''}"></i></div><output>${aidNumber(r.value)} ${aidEscape(v.unit||'')}</output></div>`;
    }).join('');
  };
  const fidOldDraw=aidDraw;
  aidDraw=function(announceStep=true){
    fidOldDraw(announceStep);if(!fidIds.has(state.course))return;
    const scene=main.querySelector('#fid-motion-scene');if(!scene)return;const s=aidSession();
    const execution=s.trace.model==='cs50p-functions';
    main.querySelector('#fid-motion-stage').classList.toggle('fid-execution-stage',execution);
    main.querySelector('.fid-motion-caption strong').textContent=execution?'执行快照':s.trace.steps[s.index].title;
    main.querySelector('#fid-motion-detail').textContent=s.trace.steps[s.index].detail;
    const renderer=['linear','probability','cs229'].includes(state.course)?globalThis.FoundationMathScenes:s.trace.model.startsWith('d2l-')?globalThis.FoundationD2LScenes:globalThis.FoundationCodingScenes;
    scene.innerHTML=(execution?renderer?.renderExecution(s.trace,s.index):renderer?.render(s.trace,s.index))||aidVisual(s.trace.steps[s.index].visual);
    scene.dataset.frame=s.trace.model+':'+s.index;
  };
  const fidOldSetTab=aidSetTab;
  aidSetTab=function(id){
    fidOldSetTab(id);if(id!=='lab'||!fidIds.has(state.course))return;
    aidDraw(false);
    aidFitWorkspace();
  };
  function fidStartMotion(id){
    if(!fidLessons.has(id))return;aidOpen(id);aidSetTab('lab');
    if(['cs50p','tools','linear','probability','cs229'].includes(aidLesson().course))return;
    const play=main.querySelector('[data-action="aid-play"]');if(play.getAttribute('aria-pressed')!=='true')play.click();
  }
  const fidOldOpen=aidOpen,fidOldGo=go,fidOldLessonView=renderLesson,fidOldChrome=chrome;
  aidOpen=function(id){fidLegacy=false;fidOldOpen(id);};
  renderLesson=function(){if(fidLegacy&&fidIds.has(state.course))aidOldLesson();else fidOldLessonView();};
  chrome=function(){
    if(!fidIds.has(state.course)||!['course','lesson'].includes(state.view)){fidOldChrome();return;}
    if(fidLegacy&&state.view==='lesson'){renderTeachingChrome();return;}
    const c=aidCourse(),l=aidLesson();
    root.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.action==='map'));
    breadcrumbs.innerHTML=button('学习地图','map')+' / '+button(c.label,'course',c.id)+(state.view==='lesson'?' / <b>'+aidEscape(l.title)+'</b>':'');
    contextNav.innerHTML='<span class="nav-caption">'+aidEscape(c.label)+' · '+fidData.lessons.filter(x=>x.course===c.id).length+' 讲</span><div class="context-list">'+button('课程目录','course',c.id)+(state.view==='lesson'?fidData.lessons.filter(x=>x.course===c.id).map((x,i)=>`<button data-action="aid-open" data-value="${x.id}" title="${aidEscape(x.title)}" class="${x.id===l.id?'is-active':''}"><span class="aid-nav-number">${String(i+1).padStart(2,'0')}</span><span>${aidEscape(x.title.replace(/^第\d+讲\s*/,''))}</span></button>`).join(''):'')+'</div>';
  };
  go=function(view,course){fidPlayerObserver?.disconnect();if(view!=='lesson')fidLegacy=false;return fidOldGo(view,course);};
  root.addEventListener('click',event=>{
    const motion=event.target.closest('[data-action="fid-motion"]');
    if(motion){event.preventDefault();event.stopImmediatePropagation();fidStartMotion(motion.dataset.value);return;}
    const b=event.target.closest('[data-action="fid-legacy"]');if(!b)return;
    event.preventDefault();event.stopImmediatePropagation();aidPersist();aidPause();
    const index=teachingUnits[state.course]?.findIndex(l=>l.id===b.dataset.value);if(index===undefined||index<0)return;
    fidLegacy=true;state.selected=index+1;go('lesson');
  },true);
  // An optional URL opens a foundation course while retaining the full map shell.
  queueMicrotask(()=>{
    const query=new URLSearchParams(location.search),course=query.get('foundation'),lesson=query.get('lesson');
    if(!fidIds.has(course))return;state.node=courses[course].node;go('course',course);
    if(fidLessons.has(lesson)&&aidById[lesson].course===course){if(query.get('play')==='1')fidStartMotion(lesson);else aidOpen(lesson);}
  });
