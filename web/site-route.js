/* Two site-wide learning workspaces; projection only, no history mutation or LLM. */
const SiteRoute={
 definitions:{robotics:{name:'机器人工程',caption:'从电子基础到机器人实践',category:'robotics'},agent:{name:'AI / Agent 工程',caption:'从编程基础到 AI 应用实践',category:'ai-agent'}},
 selection(requested,electronics,saved){return this.valid(requested)?requested:electronics?'robotics':this.valid(saved)?saved:'robotics';},
 valid(id){return Object.hasOwn(this.definitions,id);},
 owner(row){return this.valid(row?.learning_route)?row.learning_route:row?.track==='agent'?'agent':'robotics';},
 categories(id){return [this.definitions[id].category,'learning-roadmaps'];},
 draftKey(id){return 'radar-journal-edit-v2-'+id;},
 project(raw,id){
  if(!this.valid(id))throw Error('学习路线无效');
  const categories=this.categories(id),tasks=(raw.tasks||[]).filter(t=>this.owner(t)===id),byId=new Map((raw.tasks||[]).map(t=>[t.id,t]));
  const sessions=(raw.sessions||[]).filter(s=>this.valid(s.learning_route)?s.learning_route===id:byId.has(s.task_id)&&this.owner(byId.get(s.task_id))===id);
  const plans=raw.learning_plans;
  const plan=plans?plans[id]:raw.learning_plan&&((raw.learning_plan.profile.goal==='agent'?'agent':'robotics')===id)?raw.learning_plan:null;
  return {...raw,active_route:id,tasks,sessions,learning_entries:(raw.learning_entries||[]).filter(e=>this.owner(e)===id),items:(raw.items||[]).filter(i=>categories.includes(i.category)),roadmaps:(raw.roadmaps||[]).filter(r=>r.id===id),learning_plan:plan||null};
 }
};
if(typeof module!=='undefined')module.exports=SiteRoute;
if(typeof document!=='undefined'){
 const requestedRoute=new URLSearchParams(location.search).get('route');
 let activeSiteRoute=SiteRoute.selection(requestedRoute,new URLSearchParams(location.search).has('lesson')||location.hash==='#textbook',studyStore.read('radar-site-route','robotics'));
 if(!SiteRoute.valid(activeSiteRoute))activeSiteRoute='robotics';
 window.getSiteRoute=()=>activeSiteRoute;
 window.siteRouteName=()=>SiteRoute.definitions[activeSiteRoute].name;
 window.siteRouteDraftKey=()=>SiteRoute.draftKey(activeSiteRoute);
 const viewState={};
 function rememberView(){viewState[activeSiteRoute]={filter,query,studyDraft,studyView,studyDate,journalKind,journalQuery,journalArchive};}
 window.applySiteRoute=()=>{studyStore.write('radar-site-route',activeSiteRoute);S=SiteRoute.project(RAW,activeSiteRoute);track=activeSiteRoute;studyTrack='all';journalTrack='all';draftKey=siteRouteDraftKey();studyGoal=Number(studyStore.read('study-goal:'+activeSiteRoute,S.learning_plan?.profile.minutes||studyStore.read('study-goal',45)))||45;
  const old=studyStore.read('radar-journal-edit-v1',null);if(old&&SiteRoute.owner(old)===activeSiteRoute&&!studyStore.read('radar-journal-migrated-v2',false)){if(studyStore.read(draftKey,null)||studyStore.write(draftKey,old))studyStore.write('radar-journal-migrated-v2',true);}
 };
 window.renderSiteShell=()=>{
  document.title=siteRouteName()+' · 动手学 · Learn by Building';document.body.dataset.route=activeSiteRoute;document.querySelector('.breadcrumb').firstChild.nodeValue=siteRouteName()+' ';const select=document.getElementById('site-route');if(select)select.value=activeSiteRoute;
  const label=activeSiteRoute==='agent'?'实践指南':'电子学交互';names.guides=label;
  document.querySelector('.brand small').textContent=SiteRoute.definitions[activeSiteRoute].caption;
  document.querySelector('.sidebar-bottom p').textContent=siteRouteName();
  if(activeSiteRoute==='agent'&&page==='textbook'){page='learn';const u=new URL(location.href);u.hash=page;history.replaceState(null,'',u);}
  const url=new URL(location.href);if(activeSiteRoute==='agent')url.searchParams.delete('lesson');url.searchParams.set('route',activeSiteRoute);if(url.href!==location.href)history.replaceState(null,'',url);
 };
 window.switchSiteRoute=id=>{
  if(!SiteRoute.valid(id)||id===activeSiteRoute)return;
  if(document.getElementById('modal').open){document.getElementById('site-route').value=activeSiteRoute;toast('先保存或关闭正在编辑的内容，再切换路线');return;}
  rememberView();activeSiteRoute=id;studyStore.write('radar-site-route',id);applySiteRoute();
  const saved=viewState[id]||{};filter=saved.filter||'all';query=saved.query||'';studyDraft=saved.studyDraft||'';studyView=saved.studyView||'day';studyDate=saved.studyDate||day();journalKind=saved.journalKind||'all';journalQuery=saved.journalQuery||'';journalArchive=saved.journalArchive||false;
  stopElectronicsLesson();
  const url=new URL(location.href);url.searchParams.delete('block');url.searchParams.set('route',id);if(id==='agent')url.searchParams.delete('lesson');else if(page==='guides')url.searchParams.set('lesson',studyStore.read('radar-electronics-concept','basics'));history.replaceState(null,'',url);
  render();document.getElementById('route-status').textContent='已切换到'+siteRouteName()+'，各页面已同步';toast('已切换到'+siteRouteName());
 };
 document.addEventListener('change',e=>{if(e.target.id==='site-route')switchSiteRoute(e.target.value);});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-site-route]');if(b)switchSiteRoute(b.dataset.siteRoute);});
 window.renderAgentGuides=()=>renderCurriculumGuides();
}
