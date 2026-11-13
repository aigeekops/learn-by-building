/* Installed last inside the workspace closure. Only public catalog locations go
 * in the URL; drafts, route identities, activity and focus data never do. */
  const navigationViews=new Set(['map','course','lesson','projects','personal','today','routes','records','resources']);
  const navigationInitialHash=location.hash;
  let navigationReady=false,navigationRestoring=false,navigationQueued=false,navigationKey='';
  function navigationLocation(){
    const p={view:state.view};
    if(p.view==='projects'&&state.practicum)p.practicum=state.practicum;
    if(['course','lesson'].includes(p.view))p.course=state.course;
    if(p.view==='lesson'){
      if((fidIds.has(state.course)&&fidLegacy)||(appIds.has(state.course)&&appLegacy)||(extIds.has(state.course)&&extLegacy)||state.rfOriginal||!aidActive()&&!rfCourseTopics[state.course]){
        p.kind='legacy';p.lesson=teachingUnits[state.course]?.[state.selected-1]?.id;
      }else if(rfCourseTopics[state.course]){p.kind='robotics';p.lesson=rfLesson()?.id;p.tab=rfAPI.getTab();}
      else {p.kind='authored';p.lesson=aidLesson()?.id;p.tab=aidSession().tab;}
    }
    return p;
  }
  function navigationHash(p){return '#learn/'+(p.view==='projects'?[p.view,p.practicum]:[p.view,p.course,p.kind,p.lesson,p.tab]).filter(v=>v!==undefined).map(encodeURIComponent).join('/');}
  function navigationParse(hash){
    if(!hash.startsWith('#learn/'))return null;
    let parts;try{parts=hash.slice(7).split('/').map(decodeURIComponent);}catch{return {view:'map'};}
    const [view,course,kind,lesson,tab]=parts,p={view};
    if(!navigationViews.has(view)||parts.length>5)return {view:'map'};
    if(view==='projects'&&parts.length===2&&Object.hasOwn(rpById,course))return {view,practicum:course};
    if(!['course','lesson'].includes(view))return parts.length===1?p:{view:'map'};
    if(!Object.hasOwn(courses,course))return {view:'map'};p.course=course;
    if(view==='course')return parts.length===2?p:{view:'map'};
    const legacy=teachingUnits[course]?.find(l=>l.id===lesson);
    if(kind==='legacy'&&legacy&&(!tab))return {...p,kind,lesson};
    if(kind==='authored'&&aidById[lesson]?.course===course&&aidTabs.some(([id])=>id===tab))return {...p,kind,lesson,tab};
    if(kind==='robotics'&&rfAPI.lessonFor(lesson)?.topic.id===rfCourseTopics[course]&&['explain','lab','code','practice','verify'].includes(tab))return {...p,kind,lesson,tab};
    return {view:'course',course};
  }
  function navigationTransient(){return {node:Object.hasOwn(nodes,state.node)?state.node:'a3',nodeOpen:!!state.nodeOpen,mapMode:state.mapMode==='courses'?'courses':'overview'};}
  function navigationCommit(replace=false){
    if(!navigationReady||navigationRestoring)return;
    const hash=navigationHash(navigationLocation()),entry={...(history.state&&typeof history.state==='object'?history.state:{}),lbbNavigation:{version:1,...navigationTransient()}};
    // Preserve unrelated query links and embedding history state. No new entry
    // for rendering, map expansion, or repeatedly selecting the same location.
    if(hash===navigationKey){
      if(JSON.stringify(history.state?.lbbNavigation)!==JSON.stringify(entry.lbbNavigation))history.replaceState(entry,'',location.href);
      return;
    }
    root.querySelector('#lbb-workspace-dialog[open]')?.close();
    const url=new URL(location.href);url.hash=hash;
    history[replace?'replaceState':'pushState'](entry,'',url);navigationKey=hash;
  }
  function navigationSchedule(){
    if(!navigationReady||navigationRestoring||navigationQueued)return;
    navigationQueued=true;queueMicrotask(()=>{navigationQueued=false;navigationCommit();});
  }
  function navigationRestore(p,entry){
    navigationRestoring=true;
    try{
      // Persist before replacing state, so lesson inputs stay attributed to the
      // page being left. Do not invoke go/open/click handlers that log activity.
      aidPersist();aidPause();rfAPI.destroy();stop();
      fidPlayerObserver?.disconnect();appPlayerObserver?.disconnect();
      root.querySelector('#lbb-workspace-dialog[open]')?.close();
      state.view=p.view;fidLegacy=false;appLegacy=false;extLegacy=false;state.rfOriginal=false;state.rfLesson=null;state.aiLesson=null;
      state.practicum=p.practicum||null;
      if(p.course){state.course=p.course;state.node=courses[p.course].node;state.selected=1;}
      const transient=entry?.lbbNavigation;
      if(p.view==='map'&&transient?.version===1){
        if(Object.hasOwn(nodes,transient.node))state.node=transient.node;
        state.nodeOpen=transient.nodeOpen===true;state.mapMode=transient.mapMode==='courses'?'courses':'overview';
      }
      if(p.view==='lesson'){
        if(p.kind==='legacy'){
          state.selected=teachingUnits[p.course].findIndex(l=>l.id===p.lesson)+1;
          fidLegacy=fidIds.has(p.course);appLegacy=appIds.has(p.course);extLegacy=extIds.has(p.course);state.rfOriginal=!!rfCourseTopics[p.course];
        }else if(p.kind==='authored'){
          state.aiLesson=p.lesson;state.selected=aidIndex(aidById[p.lesson]);aidSession(aidById[p.lesson]).tab=p.tab;
        }else{
          state.rfLesson=p.lesson;state.selected=rfAPI.topicFor(rfCourseTopics[p.course]).lessons.findIndex(l=>l.id===p.lesson)+1;
        }
      }
      render();
      if(p.kind==='robotics')rfAPI.setTab(p.tab);
      main.scrollTop=0;navigationKey=navigationHash(navigationLocation());
    }finally{navigationRestoring=false;}
    if(navigationReady&&location.hash!==navigationKey){navigationKey='';navigationCommit(true);}
  }
  const navigationOldGo=go,navigationOldTab=aidSetTab;
  go=function(view,course){const result=navigationOldGo(view,course);navigationSchedule();return result;};
  aidSetTab=function(tab){navigationOldTab(tab);navigationSchedule();};
  // Capture at the document, ahead of course handlers that stop propagation.
  // The microtask observes the final tab/view, including keyboard tab changes.
  document.addEventListener('click',event=>{if(root.contains(event.target))navigationSchedule();},true);
  document.addEventListener('keydown',event=>{if(root.contains(event.target))navigationSchedule();},true);
  addEventListener('popstate',()=>{
    const p=navigationParse(location.hash)||{view:'map'};navigationRestore(p,history.state);
  });
  addEventListener('hashchange',()=>{
    if(location.hash===navigationKey)return;
    const p=navigationParse(location.hash);if(p)navigationRestore(p,history.state);
  });
  // Existing application/foundation query readers run first. A canonical hash
  // takes precedence on reload, so stale query links cannot reopen an old page.
  queueMicrotask(()=>{
    const p=navigationParse(navigationInitialHash);
    if(p)navigationRestore(p,history.state);
    navigationReady=true;navigationKey='';navigationCommit(true);
  });
