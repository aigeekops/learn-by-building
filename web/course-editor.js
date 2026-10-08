/* Personal course edits stay in the static site's browser database. */
(() => {
 let draft,stageIndex=0,blockIndex=0;
 const stage=()=>draft.months[stageIndex],block=()=>stage().blocks[blockIndex];
 function capture(){
  const form=document.getElementById('form'),data=Object.fromEntries(new FormData(form));
  if(!form.querySelector('[name="course_title"]'))return;
  stage().title=data.stage_title;
  for(const field of ['title','prerequisite','intuition','scope','acceptance'])block()[field]=data['course_'+field];
  block().sessions=[0,1,2].map(i=>data['step_'+i]);
  const priorReadings=block().readings;
  block().readings=data.resources.split('\n').filter(x=>x.trim()).map(line=>{const split=line.indexOf('|');if(split<1)throw Error('资源请按“名称 | https://网址”填写');const url=line.slice(split+1).trim();return {...priorReadings.find(r=>r.url===url),title:line.slice(0,split).trim(),url};});
 }
 function show(){
  const m=stage(),b=block();
  openModal('编辑我的课程路线',`<p>修改仅对当前浏览器生效，随学习记录备份导出。原有学习成果保留，不会自动标记课程完成。</p>${field('选择阶段',choose('course_stage',Object.fromEntries(draft.months.map((m,i)=>[i,(i+1)+' · '+m.title])),String(stageIndex)))}<div class="actions">${btn('阶段前移','course-stage-up','','small')}${btn('阶段后移','course-stage-down','','small')}</div>${field('阶段名称',`<input name="stage_title" required maxlength="300" value="${esc(m.title)}">`)}${field('选择学习块',choose('course_block',Object.fromEntries(m.blocks.map((b,i)=>[i,(i+1)+' · '+b.title])),String(blockIndex)))}<div class="actions">${btn('本块前移','course-block-up','','small')}${btn('本块后移','course-block-down','','small')}</div>${[['title','学习块名称'],['prerequisite','开始前需要什么'],['intuition','先懂一句话'],['scope','阅读和练习范围'],['acceptance','验收条件']].map(([key,label])=>field(label,`<textarea name="course_${key}" required maxlength="3000">${esc(b[key])}</textarea>`)).join('')}${b.sessions.map((step,i)=>field('练习步骤 '+(i+1),`<textarea name="step_${i}" required maxlength="3000">${esc(step)}</textarea>`)).join('')}${field('资源链接（每行：名称 | https://网址）',`<textarea name="resources" rows="4" required>${esc(b.readings.map(r=>r.title+' | '+r.url).join('\n'))}</textarea>`)}<p class="note">固定的课程课例与交互模型保持原样。调整顺序后请自行核对先修条件；已采用的计划保留原安排，新计划使用修改后的路线。</p>`,async()=>{capture();await api('curriculum',{route:getSiteRoute(),curriculum:draft});return '我的课程路线已保存，可随时再次修改'});
  document.querySelector('[name="course_stage"]').onchange=e=>{const next=Number(e.target.value);capture();stageIndex=next;blockIndex=0;show();};
  document.querySelector('[name="course_block"]').onchange=e=>{const next=Number(e.target.value);capture();blockIndex=next;show();};
  document.querySelector('#form button[type="submit"]').textContent='保存整条路线的修改';
 }
 function mount(){
  if(!window.StaticSite||page!=='learn'||document.getElementById('course-edit-tools'))return;
  const tools=document.createElement('section');tools.id='course-edit-tools';tools.className='panel course-edit-tools';
  tools.innerHTML=`<div class="actions">${btn('编辑我的课程路线','course-edit')}${btn('恢复默认路线','course-reset','','small')}</div><p class="note">可调整阶段与课块顺序、讲解和资源，仅影响自己的浏览器。修改个人学习计划，请使用「修改学习计划」。</p>`;
  document.getElementById('content').prepend(tools);
 }
 document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-action^="course-"]');if(!button)return;
  try{
   const action=button.dataset.action;
   if(action==='course-edit'){draft=structuredClone(S[getSiteRoute()+'_curriculum']);stageIndex=0;blockIndex=0;show();}
   if(action==='course-reset'){openModal('恢复默认课程路线','<p>将清除当前路线的个人课程编辑，恢复站点提供的课程。已保存任务、学习计划、笔记和时长不变。</p>',async()=>{await api('curriculum',{route:getSiteRoute(),reset:true});return '已恢复默认课程路线';});}
   if(['course-stage-up','course-stage-down','course-block-up','course-block-down'].includes(action)){
    capture();const isStage=action.startsWith('course-stage'),items=isStage?draft.months:stage().blocks,index=isStage?stageIndex:blockIndex,next=index+(action.endsWith('up')?-1:1);
    if(next<0||next>=items.length)return;[items[index],items[next]]=[items[next],items[index]];if(isStage)stageIndex=next;else blockIndex=next;show();
   }
  }catch(error){toast(error.message);}
 });
 const base=window.render;window.render=function(...args){const result=base.apply(this,args);mount();return result;};
 if(S.roadmaps)mount();
})();
