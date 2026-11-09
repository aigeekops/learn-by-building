/* Derive map content availability from authored lessons, never from learning progress. */
  const cmsRobotics={mit2007:['mechanics','机械'],modern:['kinematics','运动学'],pid:['control','PID'],kalman:['estimation','状态估计'],ros:['ros','ROS 2']};
  const cmsSummaries={mechanics:'齿轮传动 · 电机负载 · 孔轴配合',kinematics:'坐标变换 · 两连杆正逆运动学',control:'比例反馈 · 离散 PID · 条件积分',estimation:'测量噪声 · Kalman 更新 · 假设检查',ros:'消息 · TF · 回放 · 仿真时钟'};
  let cmsCatalog={};
  function cmsCourse(id){
    const c=courses[id];
    const robotic=cmsRobotics[id],topic=robotic&&globalThis.RoboticsFoundationData?.topics.find(t=>t.id===robotic[0]);
    if(topic&&c)return {id,kind:'authored',family:'robotics',count:topic.lessons.length,label:topic.lessons.length+' 课已整理',titles:topic.lessons.map(l=>l.title),summary:cmsSummaries[topic.id],first:topic.lessons[0]?.id,action:'rf-open'};
    const items=typeof aidData!=='undefined'?aidData.lessons.filter(l=>l.course===id):[];
    if(items.length&&c){
      const definition=aidData.courses.find(x=>x.id===id),scheduled=definition?.scheduled?.length?aidDirectory(definition).filter(l=>!l.available):[],pendingCount=scheduled.length;
      return {id,kind:'authored',family:c.extensionTeaching?'extension':c.applicationTeaching?'application':c.foundationTeaching?'foundation':'ai',count:items.length,pendingCount,pendingTitles:scheduled.map(l=>l.title),label:pendingCount?items.length+'讲已更新 · '+pendingCount+'讲待更新':items.length+'讲已整理',titles:items.map(l=>l.title),summary:expansionById[id]?.summary||c.title,first:items[0].id,action:'aid-open'};
    }
    const original=typeof teachingUnits!=='undefined'?teachingUnits[id]:[];
    if(c?.localTeaching&&original?.length)return {id,kind:'prerequisite',count:original.length,label:original.length+' 个前置练习',titles:original.map(l=>l.title),summary:expansionById[id]?.summary||c.title};
    return {id,kind:'planned',count:0,label:'待整理',titles:[],summary:expansionById[id]?.summary||''};
  }
  function cmsSyncCatalog(){
    cmsCatalog=Object.fromEntries(expansionCourses.map(p=>[p.id,cmsCourse(p.id)]));
    for(const p of expansionCourses){
      const info=cmsCatalog[p.id],n=nodes[p.node];if(!n)continue;
      n.cmsBaseDescription??=n.desc||'';
      n.desc=n.cmsBaseDescription+(info.kind==='authored'?' 已整理 '+info.count+' 节本站配套课：'+info.summary+'；'+info.titles.join('；')+'。'+(info.pendingCount?' 待更新 '+info.pendingCount+' 讲：'+info.pendingTitles.join('；')+'。':''):'');
      if(info.kind==='planned')continue;
      p.course=p.id;p.teaching=true;
      n.courses||=[];if(!n.courses.includes(p.id))n.courses.push(p.id);
      if(info.kind==='authored')p.phase='本站配套课件 · '+info.label;
    }
  }
  function cmsRobotNote(){
    const items=Object.keys(cmsRobotics).map(id=>cmsCatalog[id]).filter(x=>x?.kind==='authored');
    if(!items.length)return '';
    const total=items.reduce((n,x)=>n+x.count,0);
    return `<strong class="cms-robot-title">机器人共同基础 · ${items.length} 专题 ${total} 课</strong><span class="cms-robot-links">${items.map(x=>`<button type="button" data-action="course" data-value="${x.id}" class="cms-robot-chip" aria-label="进入${esc(cmsRobotics[x.id][1])}基础课，${x.count}课已整理">${esc(cmsRobotics[x.id][1])}<small>${x.count}课</small></button>`).join('')}</span>`;
  }
  function cmsFoundationNote(){
    const items=['cs50p','tools','d2l'].map(id=>cmsCatalog[id]).filter(x=>x?.family==='foundation');
    if(!items.length)return '';
    const math=['linear','probability','cs229'].map(id=>cmsCatalog[id]).filter(x=>x?.family==='foundation');
    const group=(label,rows)=>`<strong class="cms-robot-title">${label} · ${rows.reduce((n,x)=>n+x.count,0)}讲</strong><span class="cms-robot-links">${rows.map(x=>`<button type="button" data-action="course" data-value="${x.id}" data-map-foundation="${x.id}" class="cms-robot-chip" aria-label="进入${esc(courses[x.id].label)}，${x.count}讲含图示、代码和练习">${esc(courses[x.id].label)}<small>${x.count}讲</small></button>`).join('')}</span>`;
    return group('基础课',items)+(math.length?group('第二批 · 数学与机器学习',math):'');
  }
  function cmsApplicationNote(){
    const items=['hfagents','fsdl'].map(id=>cmsCatalog[id]).filter(x=>x?.family==='application');
    if(!items.length)return '';
    return `<strong class="cms-robot-title">第二批应用与交付 · ${items.reduce((n,x)=>n+x.count,0)}讲</strong><span class="cms-robot-links">${items.map(x=>`<button type="button" data-action="course" data-value="${x.id}" data-map-application="${x.id}" class="cms-robot-chip">${esc(courses[x.id].label)}<small>${x.count}讲</small></button>`).join('')}</span>`;
  }
  function cmsLabel(info){return info.pendingCount?`<span>${info.count}讲已更新</span> · <span class="cms-pending-count">${info.pendingCount}讲待更新</span>`:esc(info.label);}
  function cmsPaintCoursePoint(el,info){
    el.dataset.contentStatus=info.kind;el.dataset.lessonCount=String(info.count);el.dataset.cmsCourse=info.id;
    el.dataset.pendingCount=String(info.pendingCount||0);
    el.classList.toggle('is-authored-course',info.kind==='authored');
    el.title=courses[info.id].label+' · '+info.label;
    const phase=el.querySelector('.atlas-course-phase > span');
    if(phase)phase.innerHTML=cmsLabel(info);
    else if(el.closest('.origin-topics')){
      el.querySelector('span').textContent=info.pendingCount?info.label+' ↗':info.count+'讲 · 动画、代码与练习 ↗';
      let count=el.querySelector('.cms-origin-count');if(!count){count=document.createElement('small');count.className='cms-origin-count';el.querySelector('b').append(count);}
      count.textContent=' · '+info.count+'讲';
    }
    else{
      let badge=el.querySelector('.cms-node-status');if(!badge){badge=document.createElement('span');badge.className='cms-node-status';el.append(badge);}
      badge.innerHTML=cmsLabel(info);
    }
  }
  function cmsPaintMap(){
    for(const p of expansionCourses){
      const info=cmsCatalog[p.id],el=main.querySelector('.atlas-course-node[data-map-key="'+p.id+'"]');if(!el)continue;
      el.dataset.contentStatus=info.kind;el.dataset.lessonCount=String(info.count);
      el.dataset.pendingCount=String(info.pendingCount||0);
      el.classList.toggle('is-authored-course',info.kind==='authored');
      const phase=el.querySelector('.atlas-course-phase > span');if(phase)phase.innerHTML=cmsLabel(info);
      const caption=el.querySelector('.atlas-node-caption');if(caption&&info.family==='robotics')caption.textContent=info.summary;
      el.setAttribute('aria-label',p.label+'，'+p.title+'，'+info.label);
    }
    for(const p of expansionCourses){
      const info=cmsCatalog[p.id];if(info.family!=='foundation')continue;
      main.querySelectorAll(`.learning-atlas [data-action="node"][data-value="${p.node}"]`).forEach(el=>cmsPaintCoursePoint(el,info));
    }
    for(const [node,id] of [['a1','cs229'],['a2','d2l'],['a3','cme295'],['b4','cs146s']]){
      const info=cmsCatalog[id];if(info?.kind==='authored')main.querySelectorAll(`.learning-atlas [data-action="node"][data-value="${node}"]`).forEach(el=>cmsPaintCoursePoint(el,info));
    }
    for(const [node,id] of [['b1','hfagents'],['b2','hfagents'],['b3','hfagents'],['b5','fsdl']]){
      const info=cmsCatalog[id];if(info?.family!=='application')continue;
      main.querySelectorAll(`.learning-atlas:not(.atlas-full) [data-action="node"][data-value="${node}"]`).forEach(el=>{
        cmsPaintCoursePoint(el,info);const badge=el.querySelector('.cms-node-status');if(badge)badge.textContent=(id==='hfagents'?'HF Agents':'FSDL')+' · '+info.count+'讲配套';
      });
    }
    for(const [node,ids] of [['c3',['mit2007','modern','pid','kalman']],['c4',['ros']]]){
      const items=ids.map(id=>cmsCatalog[id]).filter(x=>x?.kind==='authored');if(!items.length)continue;
      const count=items.reduce((n,x)=>n+x.count,0);
      main.querySelectorAll(`.learning-atlas:not(.atlas-full) [data-action="node"][data-value="${node}"]`).forEach(el=>{
        el.dataset.roboticsLessonCount=String(count);
        let badge=el.querySelector('.cms-node-status');if(!badge){badge=document.createElement('span');badge.className='cms-node-status';el.append(badge);}
        badge.textContent=node==='c3'?'共同基础 · '+items.length+' 专题 '+count+' 课已整理':'ROS 2 基础 · '+count+' 课已整理';
      });
    }
    for(const [nodeId,node] of Object.entries(nodes)){
      const ids=node.planIds||[];if(!ids.some(id=>cmsCatalog[id]?.family==='extension'))continue;
      const items=ids.map(id=>cmsCatalog[id]).filter(x=>x?.kind==='authored'),total=items.reduce((n,x)=>n+x.count,0);
      main.querySelectorAll(`.learning-atlas:not(.atlas-full) [data-action="node"][data-value="${nodeId}"]`).forEach(el=>{
        el.dataset.contentStatus='authored';el.dataset.lessonCount=String(total);
        let badge=el.querySelector('.cms-node-status');if(!badge){badge=document.createElement('span');badge.className='cms-node-status';el.append(badge);}
        badge.textContent=items.length+' 门配套课件 · '+total+'讲';
      });
    }
    const cs336=cmsCatalog.cs336,bottom=main.querySelector('.learning-atlas [data-map-key="cs336"] .atlas-course-bottom');
    if(cs336?.kind==='authored'&&bottom){bottom.innerHTML=cs336.count+'讲配套课件 <span>进入课程 ↗</span>';const el=bottom.closest('[data-action="node"]');el.dataset.lessonCount=String(cs336.count);el.dataset.cmsCourse='cs336';}
    const authored=Object.values(cmsCatalog).filter(x=>x.kind==='authored'),count=authored.reduce((n,x)=>n+x.count,0);
    const pending=authored.reduce((n,x)=>n+(x.pendingCount||0),0),unmade=Object.values(cmsCatalog).filter(x=>x.kind==='planned').length,prerequisite=Object.values(cmsCatalog).filter(x=>x.kind==='prerequisite').length;
    const subtitle=main.querySelector('.map-tools p');if(subtitle)subtitle.textContent=(state.mapMode==='courses'?expansionCourses.length+' 组课程与材料':'路线总览')+' · '+authored.length+' 组配套课件 '+count+' 课已整理 · '+unmade+' 门待整理 · '+prerequisite+' 门仅前置练习'+(pending?' · '+pending+'讲待更新':'');
    const toolbar=main.querySelector('.atlas-view-toolbar');
    if(toolbar){
      let audit=toolbar.querySelector('.cms-map-audit');
      if(!audit){audit=document.createElement('details');audit.className='cms-map-audit';toolbar.querySelector('.atlas-expand-control')?.after(audit);}
      const rows=kind=>Object.values(cmsCatalog).filter(x=>x.kind===kind).map(x=>`<button type="button" data-action="node" data-value="${expansionById[x.id].node}">${esc(expansionById[x.id].label)}${kind==='prerequisite'?' · '+x.count+'个前置练习':''}</button>`).join('');
      audit.innerHTML=`<summary>${authored.length} 门已整理 · ${unmade} 门待整理</summary><div class="cms-map-audit-panel"><p>${count}讲配套课件 · ${prerequisite}门仅有前置练习${pending?' · '+pending+'讲材料待更新':''}</p>${unmade?'<strong>完全待整理 · '+unmade+'门</strong><div>'+rows('planned')+'</div>':''}${prerequisite?'<strong>已有前置练习 · 尚无独立课件</strong><div>'+rows('prerequisite')+'</div>':''}<small>已整理表示本站内容已制作，不代表学完原课或已经掌握。</small></div>`;
    }
    const note=main.querySelector('.atlas-plan-note');if(note){
      note.classList.add('cms-availability');const foundation=cmsFoundationNote(),application=cmsApplicationNote(),robotics=cmsRobotNote();
      note.innerHTML=(foundation?'<span class="cms-foundation-group">'+foundation+'</span>':'')+(application?'<span class="cms-application-group">'+application+'</span>':'')+(robotics?'<span class="cms-robot-group">'+robotics+'</span>':'')||'从地图进入已有前置练习，后续课程按计划补充。';
    }
  }
  function cmsPaintDetail(){
    const detail=main.querySelector('#lbb-node-detail');if(!detail||detail.hidden)return;
    for(const row of detail.querySelectorAll('.course-row')){
      const entry=row.querySelector('[data-action="course"]');if(!entry)continue;
      const info=cmsCatalog[entry.dataset.value];if(!info)continue;
      const badge=row.querySelector('.atlas-detail-status');
      if(badge)badge.innerHTML=info.kind==='authored'?'本站配套课件 · '+cmsLabel(info):esc(info.label);
      row.dataset.contentStatus=info.kind;
      row.dataset.cmsCourse=info.id;row.dataset.lessonCount=String(info.count);
      row.dataset.pendingCount=String(info.pendingCount||0);
      if(info.family==='foundation'&&!row.querySelector('[data-action="fid-motion"]')){
        const actions=entry.closest('.row');if(actions){const motion=document.createElement('span');motion.innerHTML=button(['cs50p','tools'].includes(info.id)?'逐步查看执行过程':'查看图示与计算','fid-motion',info.first);actions.insertBefore(motion.firstElementChild,entry.nextSibling);}
      }
      if(info.family==='application'&&!row.querySelector('[data-action="app-demo"]')){
        const actions=entry.closest('.row');if(actions){const demo=document.createElement('span');demo.innerHTML=button('逐步检查案例','app-demo',info.first);actions.insertBefore(demo.firstElementChild,entry.nextSibling);}
      }
      if(info.kind!=='authored'||!info.first||row.querySelector('[data-cms-first]'))continue;
      const actions=entry.closest('.row');if(!actions)continue;
      const first=document.createElement('button');first.type='button';first.className='button cms-first-lesson';first.dataset.action=info.action;first.dataset.value=info.first;first.dataset.cmsFirst=info.id;first.textContent='开始第一课 →';actions.append(first);
    }
  }
  const cmsOldMap=renderMap,cmsOldDetail=renderNodeDetail,cmsOldFilter=filterMap;
  renderMap=function(){cmsSyncCatalog();cmsOldMap();cmsPaintMap();cmsPaintDetail();};
  renderNodeDetail=function(...args){cmsSyncCatalog();cmsOldDetail(...args);cmsPaintDetail();};
  filterMap=function(){cmsOldFilter();if(!state.search.trim()){const el=main.querySelector('#lbb-map-results');if(el)el.textContent='实线表示建议路线，虚线表示按需回补。课程状态来自当前课件目录；每门课的原始材料版本、本站选编范围与目标环境实验分别见课程说明。';}};
  globalThis.CourseMapStatus={snapshot:()=>Object.values(cmsCatalog).map(({id,kind,family,count,pendingCount,first})=>({id,kind,family,count,pendingCount:pendingCount||0,first}))};
