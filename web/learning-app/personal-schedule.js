/* Minute-based personal schedules; estimates never certify learning progress. */
(function(root){
  'use strict';
  const DEFAULT_MINUTES=180;
  function estimate(course,unit){
    const value=unit.study_load?.core_minutes??course.study_load?.lesson_minutes?.[unit.lesson_id]??course.study_load?.core_minutes??DEFAULT_MINUTES;
    if(!Number.isInteger(value)||value<1)throw Error('课程预计学习量无效：'+course.label+' · '+unit.title);
    return value;
  }
  function preview(config,courses,body){
    const minutes=Number(body.minutes),days=Number(body.days),start=body.start,progression=body.progression??'sequential',device=body.device||'browser';
    if(!Number.isInteger(minutes)||minutes<1||minutes>1440||!Number.isInteger(days)||days<1||days>366)throw Error('学习时间设置无效');
    if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||new Date(start).toISOString().slice(0,10)!==start)throw Error('开始日期无效');
    if(!['current','sequential'].includes(progression)||!['browser','windows','macos','linux'].includes(device))throw Error('排期方式或设备无效');
    const byId=Object.fromEntries(courses.map(c=>[c.id,c])),ids=body.courseIds,offset=ids.indexOf(body.startCourseId);
    if(offset<0||ids.some(id=>!byId[id]?.units?.length))throw Error('起点或课程目录无效');
    const stage=config.roadmaps.find(r=>r.id===body.goal)?.stages[0]?.id;
    if(!stage)throw Error('学习方向无效');
    const coverage=ids.map((id,index)=>{
      const course=byId[id];
      return {course_id:id,label:course.label,title:course.title,status:'not-scheduled',reason:index<offset?'位于所选起点之前，本次不安排。':progression==='current'&&index>offset?'已选择只安排当前课程。':'本周期学习时间已用完，尚未排到这门课。',
        lessons:course.units.map((unit,i)=>({unit_id:'curriculum:personal-'+id+'--'+i,lesson_id:unit.lesson_id||'',title:unit.title,estimated_minutes:estimate(course,unit),scheduled_minutes:0,first_date:null,last_date:null})),
        first_date:null,last_date:null,review_minutes:0};
    });
    const active=coverage.slice(offset,progression==='current'?offset+1:undefined);
    const units=active.flatMap(row=>row.lessons.map((lesson,index)=>({row,lesson,unit:byId[row.course_id].units[index],course:byId[row.course_id]})));
    const tasks=[],calendar=[];
    let cursor=0,last=units[0];
    const setup=device==='browser'?'先用浏览器；需要终端或本地软件的练习仍需准备对应环境。':'当前设备：'+({windows:'Windows',macos:'macOS',linux:'Linux'})[device]+'；安装步骤以课程说明为准。';
    function taskFor(entry,day,due,allocated,review=false){
      const {row,lesson,unit,course}=entry,first=lesson.scheduled_minutes,lastMinute=first+allocated;
      const steps=[['understand','看懂与核对例子',unit.goal+' 解释关键概念，核对一个最小例子。'],['practice','跟做与改变条件','跟做一次，再只改一个条件，保留输入、步骤与真实结果。'],['explain','独立复现与验收','脱离示例复现并解释。验收目标：'+unit.output]];
      const selected=review?[]:steps.filter((_,i)=>first<(i+1)*lesson.estimated_minutes/3&&lastMinute>i*lesson.estimated_minutes/3);
      const instruction=review?'回看本周真实记录，指出已会、仍不会和需要补练的部分；对照验收后再决定下一步。':selected.map(s=>s[2]).join('\n');
      return {title:course.label+' · '+(review?'每周复盘与调整':unit.title+' · '+selected.map(s=>s[1]).join(' / ')),
        track:body.goal,learning_route:body.goal,stage,due,minutes:allocated,day_index:day,unit_id:lesson.unit_id,phase:review?'review':selected[0][0],electronics_unit:'',source_url:course.sources[0][1],
        note:(review?'每周复盘 · 预留 '+allocated+' 分钟，不计入新讲学习量。':'本讲预计 '+lesson.estimated_minutes+' 分钟；本次安排 '+allocated+' 分钟，累计预排 '+lastMinute+'/'+lesson.estimated_minutes+' 分钟。')+'\n'+instruction+
          '\n开始前：'+course.prereq+'\n练习条件：'+setup+'\n阅读入口：'+course.sources[0][0]+' '+course.sources[0][1]+'\n验收目标：'+unit.output+
          '\n预计学习量是本站讲解、阅读、跟练与独立核对的编排估计，不是原课官方课时或实测承诺。\n排入计划不代表已完成或已掌握；只记录真实完成部分，按实际验收决定是否继续。'};
    }
    for(let day=1;day<=days;day++){
      const due=new Date(Date.parse(start)+(day-1)*86400000).toISOString().slice(0,10),taskIndexes=[];
      let budget=minutes,studyMinutes=0,reviewMinutes=0;
      if(day%7===0){
        taskIndexes.push(tasks.length);tasks.push(taskFor(last,day,due,minutes,true));
        last.row.review_minutes+=minutes;reviewMinutes=minutes;budget=0;
      }else{
        while(budget>0&&cursor<units.length){
          const entry=units[cursor],lesson=entry.lesson,allocated=Math.min(budget,lesson.estimated_minutes-lesson.scheduled_minutes);
          taskIndexes.push(tasks.length);tasks.push(taskFor(entry,day,due,allocated));
          lesson.scheduled_minutes+=allocated;lesson.first_date??=due;lesson.last_date=due;
          entry.row.first_date??=due;entry.row.last_date=due;
          budget-=allocated;studyMinutes+=allocated;last=entry;
          if(lesson.scheduled_minutes===lesson.estimated_minutes)cursor++;
        }
      }
      calendar.push({day_index:day,due,task_indexes:taskIndexes,study_minutes:studyMinutes,review_minutes:reviewMinutes,free_minutes:budget});
    }
    for(const row of coverage){
      row.total_lessons=row.lessons.length;
      row.estimated_minutes=row.lessons.reduce((n,l)=>n+l.estimated_minutes,0);
      row.scheduled_minutes=row.lessons.reduce((n,l)=>n+l.scheduled_minutes,0);
      row.remaining_minutes=row.estimated_minutes-row.scheduled_minutes;
      row.full_lessons=row.lessons.filter(l=>l.scheduled_minutes===l.estimated_minutes).length;
      row.partial_lessons=row.lessons.filter(l=>l.scheduled_minutes>0&&l.scheduled_minutes<l.estimated_minutes).length;
      if(row.scheduled_minutes){row.status=row.remaining_minutes?'partial':'full';row.reason=row.remaining_minutes?'本周期仅排入部分预计学习量，余下 '+row.remaining_minutes+' 分钟待后续安排。':'';}
    }
    return {profile:{goal:body.goal,level:'zero',minutes,days,start,start_block:'personal-'+body.startCourseId+'--0',progression,device,practice:'simulation'},tasks,calendar,coverage,
      summary:{estimated_minutes:active.reduce((n,c)=>n+c.estimated_minutes,0),study_minutes:calendar.reduce((n,d)=>n+d.study_minutes,0),review_minutes:calendar.reduce((n,d)=>n+d.review_minutes,0),free_minutes:calendar.reduce((n,d)=>n+d.free_minutes,0),review_days:Math.floor(days/7)}};
  }
  if(typeof module!=='undefined')module.exports={preview,estimate};else root.LBBPersonalSchedule={preview,estimate};
})(globalThis);
