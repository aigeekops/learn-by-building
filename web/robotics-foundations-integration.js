/* Runs inside the existing map closure. Course IDs and original units stay intact. */
  const rfCourseTopics={mit2007:'mechanics',modern:'kinematics',pid:'control',kalman:'estimation',ros:'ros'};
  const rfAPI=globalThis.RoboticsFoundations;
  rfAPI.configure(globalThis.RoboticsFoundationData);
  for(const [id,topicId] of Object.entries(rfCourseTopics)){
    const topic=rfAPI.topicFor(topicId),course=courses[id];
    if(!topic||!course)continue;
    course.fit='机器人共同基础 · '+topic.lessons.length+' 节原创配套课';
    course.count=topic.lessons.length+' 节基础课，保留原有前置教学';
    course.lessons=topic.lessons.map(l=>[l.title,l.question,l.objectives.join('；')]);
    course.groups=[{title:'逐课动手与独立验证',ids:topic.lessons.map((_,i)=>i+1)}];
    if(expansionById[id])expansionById[id].phase='首批机器人基础 · 可操作教学';
  }
  const rfTopic=()=>rfAPI.topicFor(rfCourseTopics[state.course]);
  const rfLesson=()=>{
    if(state.rfOriginal)return null;
    const item=rfAPI.lessonFor(state.rfLesson),topic=rfTopic();
    if(item&&topic&&item.topic.id===topic.id)return item.lesson;
    return topic?.lessons[Math.max(0,Math.trunc(Number(state.selected)||1)-1)]||topic?.lessons[0]||null;
  };
  function rfOpen(id){const item=rfAPI.lessonFor(id);if(!item)return;const course=Object.keys(rfCourseTopics).find(key=>rfCourseTopics[key]===item.topic.id);state.course=course;state.node=courses[course].node;state.rfLesson=id;state.rfOriginal=false;state.selected=item.topic.lessons.findIndex(l=>l.id===id)+1;go('lesson');}
  async function rfRecord(lesson,snapshot){
    const profile=activePersonal();
    if(!profile||!profile.courseIds.includes(state.course))throw Error('先选择一条包含本课程的个人路线，再保存这次计算观察。');
    await workbenchCall('teachingObservation',{profile,courseId:state.course,lessonId:lesson.id,title:lesson.title,snapshot});
  }
  function rfCourseView(){
    const topic=rfTopic(),units=teachingUnits[state.course]||[];
    const original=`<details class="rf-originals"><summary>原有前置教学与学习块（${units.length} 个）</summary><p>保留此前的课程、任务和记录入口，可按需要回到原有练习。</p><div class="rf-original-grid">${units.map(unit=>teachingButton(unit.title,'teaching-open',unit.id)).join('')}</div></details>`;
    rfAPI.mountCourse(main,topic,{openLesson:rfOpen,extraHTML:original});
  }
  const rfOldCourse=renderCourse,rfOldLesson=renderLesson,rfOldChrome=chrome,rfOldGo=go;
  renderCourse=function(){if(rfCourseTopics[state.course])rfCourseView();else rfOldCourse();};
  renderLesson=function(){const lesson=rfLesson();if(lesson){state.rfLesson=lesson.id;rfAPI.mountLesson(main,rfTopic(),lesson,{openCourse:()=>go('course'),record:rfRecord,hideCourseBack:true});}else rfOldLesson();};
  go=function(view,course){rfAPI.destroy();if(view==='course'||(course&&course!==state.course)){state.rfLesson=null;state.rfOriginal=false;}return rfOldGo(view,course);};
  chrome=function(){
    rfOldChrome();if(!rfCourseTopics[state.course]||!['course','lesson'].includes(state.view))return;
    const topic=rfTopic(),lesson=rfLesson();
    breadcrumbs.innerHTML=button('学习地图','map','')+' / '+button(topic.title,'course',state.course)+(state.view==='lesson'&&lesson?' / <b>'+esc(lesson.title)+'</b>':'');
    contextNav.innerHTML='';
  };
  root.addEventListener('click',event=>{
    const original=event.target.closest('[data-action="teaching-open"]');if(original){state.rfLesson=null;state.rfOriginal=true;return;}
    const sample=event.target.closest('[data-action="sample"]');if(sample&&rfCourseTopics[sample.dataset.value]){state.rfLesson=null;state.rfOriginal=false;return;}
    const b=event.target.closest('[data-action="rf-open"]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();rfOpen(b.dataset.value);
  },true);
