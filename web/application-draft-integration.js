/* Selected application lessons share navigation, records and the bounded reader. */
  const appData=__APPLICATION_DATA__;
  const appIds=new Set(appData.courses.map(c=>c.id));
  const appLessonIds=new Set(appData.lessons.map(l=>l.id));
  let appLegacy=false,appPlayerObserver=null;
  aidData.courses.push(...appData.courses);aidData.lessons.push(...appData.lessons);
  Object.assign(aidData.sources,appData.sources);Object.assign(aidById,Object.fromEntries(appData.lessons.map(l=>[l.id,l])));
  for(const c of appData.courses){
    const p=expansionById[c.id],items=appData.lessons.filter(l=>l.course===c.id);if(!p)throw Error('第二批课程缺少原有身份：'+c.id);
    courses[c.id]={...(courses[c.id]||{}),localTeaching:true,applicationTeaching:true,label:c.label,english:c.title,title:c.title,
      branch:c.position,node:p.node,fit:c.description,intro:c.description,version:c.edition,count:items.length+'讲配套教学',sample:1,
      prereq:c.prerequisites.join('；'),lessons:items.map(l=>[l.title,l.question,l.outcome]),
      groups:[{title:'第二批应用与交付',ids:items.map((_,i)=>i+1)}],sources:p.sources};
    p.course=c.id;p.teaching=true;p.phase='第二批配套教学';
    nodes[p.node] ||= {code:c.label,title:c.title,kicker:c.position,desc:c.description,prereq:p.prereq,check:p.check,courses:[],planIds:[]};
    nodes[p.node].courses ||= [];if(!nodes[p.node].courses.includes(c.id))nodes[p.node].courses.push(c.id);
    for(const node of Object.values(nodes))if((node.planIds||[]).includes(c.id)&&!node.courses.includes(c.id))node.courses.push(c.id);
  }
  const appOldCourseReader=aidRenderCourse,appOldLessonReader=aidRenderLesson;
  aidRenderCourse=function(){
    appOldCourseReader();if(!appIds.has(state.course))return;
    main.querySelector('.source-line').textContent=appData.policy+' · 材料核对 '+appData.checked;
    const units=teachingUnits[state.course]||[];
    if(units.length){
      const prior=document.createElement('details');prior.className='app-originals';
      prior.innerHTML='<summary>原有前置与配套练习 · '+units.length+'个学习块</summary><div class="row">'+units.map(b=>button(b.title,'app-legacy',b.id)).join('')+'</div>'+teachingResources(state.course);
      main.querySelector('.aid-scope').append(prior);
    }
  };
  aidRenderLesson=function(){
    appOldLessonReader();if(!appIds.has(state.course))return;
    const l=aidLesson();aidPrograms(l);
    main.querySelector('[data-aid-lesson]').dataset.applicationCourse=l.course;
    const inspect=main.querySelector('#aid-panel-explain [data-action="aid-tab"][data-value="lab"]');if(inspect)inspect.textContent='带着预测检查步骤 →';
    main.querySelectorAll('.aid-reading-section').forEach((section,index)=>{
      const source=l.sections[index];
      if(source.code){const pre=document.createElement('pre');pre.className='aid-section-code app-local-code';const code=document.createElement('code');code.textContent=Array.isArray(source.code)?source.code.join('\n'):source.code;pre.append(code);section.append(pre);}
      if(source.exercise){const p=document.createElement('p');p.className='aid-section-exercise';p.textContent='动手核对：'+(typeof source.exercise==='string'?source.exercise:source.exercise.prompt);section.append(p);}
    });
    main.querySelector('.aid-sources h2').textContent='对照原课章节与实际材料版本';
    main.querySelector('.aid-sources .source-line').textContent='本讲为本站原创中文配套选编；原课章节、案例重编和计算范围分别说明，第三方材料保留原作者权利。';
    main.querySelector('.aid-model-note').textContent=l.boundary+' 参数变化时重新计算，步骤图、代码和变量共同解释本步发生的变化。';
    const left=main.querySelector('.aid-workspace-left'),right=main.querySelector('.aid-workspace-right'),player=main.querySelector('.aid-player');
    const stage=document.createElement('section');stage.id='app-teaching-stage';stage.className='app-teaching-stage';
    stage.setAttribute('aria-label','按实际计算步骤检查案例');
    stage.innerHTML='<div class="app-scene-heading"><strong id="app-scene-title"></strong><span id="app-scene-state" role="status">逐步检查</span></div><div id="app-teaching-scene"></div><p id="app-observation"></p>';
    player.after(stage);left.classList.add('app-teaching-workspace');
    const original=main.querySelector('#aid-visual'),numbers=document.createElement('details');numbers.className='app-number-check';numbers.innerHTML='<summary>核对本步原始数值</summary>';numbers.append(original);right.append(numbers);
    const observe=document.createElement('p');observe.className='app-observation-prompt';observe.textContent=l.practice[0];stage.after(observe);
    appPlayerObserver?.disconnect();const play=player.querySelector('[data-action="aid-play"]');
    play.setAttribute('aria-pressed','false');
    const sync=()=>{if(!stage.isConnected)return;const playing=play.getAttribute('aria-pressed')==='true';play.textContent=playing?'暂停步骤':'连续查看步骤';stage.querySelector('#app-scene-state').textContent=playing?'按计算顺序推进':'已暂停 · 可前后单步核对';};
    appPlayerObserver=new MutationObserver(sync);appPlayerObserver.observe(play,{attributes:true,attributeFilter:['aria-pressed']});
    play.classList.remove('primary');player.querySelector('[data-action="aid-next"]').classList.add('primary');sync();
    const items=appData.lessons.filter(x=>x.course===l.course),index=items.findIndex(x=>x.id===l.id),nav=document.createElement('nav');nav.className='app-sequence row';nav.setAttribute('aria-label','前后讲次');
    nav.innerHTML=(index?aidButton('← '+items[index-1].title,'open',items[index-1].id):'')+(index<items.length-1?aidButton(items[index+1].title+' →','open',items[index+1].id):button('回到课程目录','course',l.course));main.querySelector('.aid-links').append(nav);
    aidDraw(false);if(aidSession().tab==='lab')aidFitWorkspace();
  };
  const appOldDraw=aidDraw;
  aidDraw=function(announceStep=true){
    appOldDraw(announceStep);if(!appIds.has(state.course))return;
    const scene=main.querySelector('#app-teaching-scene');if(!scene)return;
    const s=aidSession(),frame=s.trace.steps[s.index],renderer=state.course==='hfagents'?globalThis.ApplicationHFAgentsScenes:globalThis.ApplicationFSDLScenes;
    scene.innerHTML=renderer.render(s.trace,s.index);scene.dataset.frame=s.trace.model+':'+s.index;
    main.querySelector('#app-scene-title').textContent=frame.title;main.querySelector('#app-observation').textContent=frame.detail;
    // A frame is evidence for this calculation step; it needs no looping decoration.
    main.querySelectorAll('.app-number-check *').forEach(el=>el.getAnimations?.().forEach(a=>a.cancel()));
  };
  const appOldOpen=aidOpen,appOldGo=go,appOldLessonView=renderLesson,appOldChrome=chrome;
  aidOpen=function(id){appLegacy=false;appOldOpen(id);};
  renderLesson=function(){if(appLegacy&&appIds.has(state.course))aidOldLesson();else appOldLessonView();};
  go=function(view,course){appPlayerObserver?.disconnect();if(view!=='lesson')appLegacy=false;return appOldGo(view,course);};
  chrome=function(){
    if(!appIds.has(state.course)||!['course','lesson'].includes(state.view)){appOldChrome();return;}
    if(appLegacy&&state.view==='lesson'){renderTeachingChrome();return;}
    const c=aidCourse(),l=aidLesson();breadcrumbs.innerHTML=button('学习地图','map')+' / '+button(c.label,'course',c.id)+(state.view==='lesson'?' / <b>'+aidEscape(l.title)+'</b>':'');
    contextNav.innerHTML='<span class="nav-caption">'+aidEscape(c.label)+' · '+aidLessons(c.id).length+'讲</span>'+button('课程目录','course',c.id);
  };
  function appInspectLesson(id){if(!appLessonIds.has(id))return;aidOpen(id);aidSetTab('lab');}
  root.addEventListener('click',event=>{
    const demo=event.target.closest('[data-action="app-demo"]');if(demo){event.preventDefault();event.stopImmediatePropagation();appInspectLesson(demo.dataset.value);return;}
    const old=event.target.closest('[data-action="app-legacy"]');if(!old)return;event.preventDefault();event.stopImmediatePropagation();aidPersist();aidPause();
    const index=teachingUnits[state.course]?.findIndex(l=>l.id===old.dataset.value);if(index===undefined||index<0)return;appLegacy=true;state.selected=index+1;go('lesson');
  },true);
  queueMicrotask(()=>{const q=new URLSearchParams(location.search),id=q.get('application'),lesson=q.get('lesson');if(!appIds.has(id))return;state.node=courses[id].node;go('course',id);if(appLessonIds.has(lesson)&&aidById[lesson].course===id){if(q.get('inspect')==='1')appInspectLesson(lesson);else aidOpen(lesson);}});
