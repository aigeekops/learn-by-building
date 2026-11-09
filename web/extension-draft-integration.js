/* Ten original course companions reuse the existing reader, route IDs and drafts. */
  const extData=__EXTENSION_DATA__,extIds=new Set(extData.courses.map(c=>c.id)),extLessonIds=new Set(extData.lessons.map(l=>l.id));
  let extLegacy=false;
  aidData.courses.push(...extData.courses);aidData.lessons.push(...extData.lessons);Object.assign(aidData.sources,extData.sources);
  Object.assign(aidById,Object.fromEntries(extData.lessons.map(l=>[l.id,l])));
  for(const c of extData.courses){
    const p=expansionById[c.id],items=extData.lessons.filter(l=>l.course===c.id);if(!p)throw Error('新增课程缺少原有身份：'+c.id);
    courses[c.id]={...(courses[c.id]||{}),localTeaching:true,extensionTeaching:true,label:c.label,english:c.title,title:c.title,branch:c.position,node:p.node,fit:c.description,intro:c.description,version:c.edition,count:items.length+'讲主题选编',sample:1,prereq:c.prerequisites.join('；'),lessons:items.map(l=>[l.title,l.question,l.outcome]),groups:[{title:'独立配套课件',ids:items.map((_,i)=>i+1)}],sources:p.sources};
    p.course=c.id;p.teaching=true;p.phase='本站独立配套课件';
    nodes[p.node]||={code:c.label,title:c.title,kicker:c.position,desc:c.description,prereq:p.prereq,check:p.check,courses:[],planIds:[]};
    nodes[p.node].courses||=[];if(!nodes[p.node].courses.includes(c.id))nodes[p.node].courses.push(c.id);
    for(const node of Object.values(nodes))if((node.planIds||[]).includes(c.id)){node.courses||=[];if(!node.courses.includes(c.id))node.courses.push(c.id);}
  }
  const extOldCourseReader=aidRenderCourse,extOldLessonReader=aidRenderLesson;
  aidRenderCourse=function(){
    extOldCourseReader();if(!extIds.has(state.course))return;
    main.querySelector('.source-line').textContent=extData.policy+' · 材料核对 '+extData.checked;
    main.querySelector('.aid-course-summary span:nth-child(2)').textContent='讲解 · 步骤图示 · 本地代码 · 独立验证';
    const units=teachingUnits[state.course]||[];
    if(units.length){const prior=document.createElement('details');prior.className='ext-originals';prior.innerHTML='<summary>原有前置练习 · '+units.length+'个</summary><div class="row">'+units.map(b=>button(b.title,'ext-legacy',b.id)).join('')+'</div>'+teachingResources(state.course);main.querySelector('.aid-scope').append(prior);}
  };
  aidRenderLesson=function(){
    extOldLessonReader();if(!extIds.has(state.course))return;const l=aidLesson(),holder=main.querySelector('[data-aid-lesson]');holder.dataset.extensionCourse=l.course;
    main.querySelector('#aid-tab-lab').textContent='步骤与图示';
    main.querySelector('#aid-panel-explain [data-action="aid-tab"]').textContent='带着预测检查步骤 →';
    main.querySelectorAll('.aid-reading-section').forEach((section,index)=>{const source=l.sections[index];
      if(source.execution){const note=document.createElement('p');note.className='ext-execution';note.textContent=source.execution;section.append(note);}
      if(source.code){const pre=document.createElement('pre'),code=document.createElement('code');pre.className='aid-section-code';code.textContent=Array.isArray(source.code)?source.code.join('\n'):source.code;pre.append(code);section.append(pre);}
      if(source.exercise){const note=document.createElement('p');note.className='aid-section-exercise';note.textContent='独立任务：'+source.exercise;section.append(note);}
    });
    main.querySelector('.aid-sources h2').textContent='对照原课章节与材料版本';
    main.querySelector('.aid-sources > p').textContent='核对日：'+extData.checked+'。本站主题选编与原始课程范围分别说明。';
    main.querySelector('.aid-sources .source-line').textContent='官方材料保留原作者权利；本站未复制原课视频、幻灯片或受限内容。';
    main.querySelector('.aid-model-note').textContent=l.boundary;
    main.querySelector('.aid-links > span').textContent='继续连接课程';
    const player=main.querySelector('.aid-player'),play=player.querySelector('[data-action="aid-play"]');play.textContent='连续查看步骤';play.classList.remove('primary');player.querySelector('[data-action="aid-next"]').classList.add('primary');
    const download=document.createElement('button');download.type='button';download.className='button ext-download';download.dataset.action='ext-code';download.textContent='下载完整算例';main.querySelector('.aid-code-caption').append(download);
    aidDraw(false);if(aidSession().tab==='lab')aidFitWorkspace();
  };
  const extOldDraw=aidDraw;
  aidDraw=function(announceStep=true){extOldDraw(announceStep);if(!extIds.has(state.course))return;const s=aidSession(),frame=s.trace.steps[s.index],visual=main.querySelector('#aid-visual');if(!visual)return;
    if(frame.scene)visual.innerHTML=globalThis.ExtensionCourseScenes.render(frame.scene);
    visual.dataset.extensionFrame=s.trace.model+':'+s.index;
    visual.querySelectorAll('*').forEach(el=>el.getAnimations?.().forEach(a=>a.cancel()));
  };
  const extOldOpen=aidOpen,extOldGo=go,extOldLessonView=renderLesson,extOldChrome=chrome;
  aidOpen=function(id){extLegacy=false;extOldOpen(id);};
  renderLesson=function(){if(extLegacy&&extIds.has(state.course))aidOldLesson();else extOldLessonView();};
  go=function(view,course){if(view!=='lesson')extLegacy=false;return extOldGo(view,course);};
  chrome=function(){extOldChrome();if(!extIds.has(state.course)||!['course','lesson'].includes(state.view))return;
    if(extLegacy&&state.view==='lesson'){renderTeachingChrome();return;}
    const c=aidCourse(),l=aidLesson();breadcrumbs.innerHTML=button('学习地图','map')+' / '+button(c.label,'course',c.id)+(state.view==='lesson'?' / <b>'+aidEscape(l.title)+'</b>':'');contextNav.innerHTML='<span class="nav-caption">'+aidEscape(c.label)+' · '+aidLessons(c.id).length+'讲</span>'+button('课程目录','course',c.id);
  };
  root.addEventListener('click',event=>{
    const download=event.target.closest('[data-action="ext-code"]');
    if(download){event.preventDefault();event.stopImmediatePropagation();const l=aidLesson(),code=globalThis.ExtensionCourseModels.example(l.modelId,aidSession().trace.params),url=URL.createObjectURL(new Blob([code],{type:'text/javascript;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=l.id+'.cjs';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    const old=event.target.closest('[data-action="ext-legacy"]');if(!old)return;event.preventDefault();event.stopImmediatePropagation();aidPersist();aidPause();const index=teachingUnits[state.course]?.findIndex(l=>l.id===old.dataset.value);if(index===undefined||index<0)return;extLegacy=true;state.selected=index+1;go('lesson');
  },true);
  queueMicrotask(()=>{const q=new URLSearchParams(location.search),id=q.get('extension'),lesson=q.get('lesson');if(!extIds.has(id))return;state.node=courses[id].node;go('course',id);if(extLessonIds.has(lesson)&&aidById[lesson].course===id){aidOpen(lesson);if(q.get('inspect')==='1')aidSetTab('lab');}});
