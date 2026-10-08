/* Objective learning events. No model calls, inferred mastery or background study time. */
const automaticJournalKey='radar-automatic-journal-pending-v1';
let automaticJournalQueue=studyStore.read(automaticJournalKey,[]),automaticJournalBusy=false;
if(!Array.isArray(automaticJournalQueue))automaticJournalQueue=[];
function automaticJournalStatus(message,error=false){
 let el=document.getElementById('auto-journal-status');
 if(!el){el=document.createElement('div');el.id='auto-journal-status';el.setAttribute('role','status');document.getElementById('content').before(el)}
 el.hidden=!message;el.className='automatic-journal-status'+(error?' has-error':'');
 el.textContent=message;
 if(error){const b=document.createElement('button');b.type='button';b.className='btn small';b.textContent='重试保存';b.onclick=()=>flushAutomaticJournal();el.append(b)}
}
function mergeAutomaticEntry(entry){
 if(!RAW.learning_entries)return;
 RAW.learning_entries=[entry,...RAW.learning_entries.filter(e=>e.id!==entry.id)].sort((a,b)=>b.entry_date.localeCompare(a.entry_date)||b.updated_at.localeCompare(a.updated_at));
 S.learning_entries=SiteRoute.project(RAW,getSiteRoute()).learning_entries;
 if(page==='journal'&&!document.getElementById('modal').open)render();
}
async function flushAutomaticJournal(){
 if(automaticJournalBusy||!automaticJournalQueue.length||!RAW.learning_entries)return;
 automaticJournalBusy=true;
 try{
  while(automaticJournalQueue.length){
   const item=automaticJournalQueue[0],response=await api('journal/automatic',item.payload);
   automaticJournalQueue.shift();studyStore.write(automaticJournalKey,automaticJournalQueue);
   mergeAutomaticEntry(response.entry);
   if(!item.quiet)toast('当前观察已自动保存，可到学习记录补充想法');
  }
  automaticJournalStatus('');
 }catch(err){
  const saved=studyStore.write(automaticJournalKey,automaticJournalQueue);
  automaticJournalStatus(saved?'自动记录暂未保存，已留在本机等待重试。':'自动记录尚未保存，浏览器也无法保留，请保持页面打开并重试。',true);
 }finally{automaticJournalBusy=false}
}
async function saveAutomaticJournal(sourceKey,entry,quiet=true){
 try{
  // Capture route, date and values now, before asynchronous navigation or model updates.
  const payload=JSON.parse(JSON.stringify({source_key:sourceKey,entry:{...entry,entry_date:entry.entry_date||day()}}));
  const key=JSON.stringify(payload);
  if(!automaticJournalQueue.some(item=>JSON.stringify(item.payload)===key)){
   automaticJournalQueue.push({payload,quiet});studyStore.write(automaticJournalKey,automaticJournalQueue);
  }
  await flushAutomaticJournal();
 }catch(err){automaticJournalStatus('自动记录未保存：'+err.message,true)}
}
function recordCurriculumVisit(id){
 const route=getSiteRoute(),data=RAW[route+'_curriculum'];if(!data)return;
 const found=RoboticsCurriculum.find(data,id);if(!found)return;
 const {month,block}=found;
 saveAutomaticJournal('curriculum:'+id+':view',{title:'查看课程：'+block.title,track:route,learning_route:route,stage:month.stage,
  kind:'activity',evidence_type:'activity',body:'已打开本学习块的讲解与练习。仅记录查看操作，不代表读完、学会或完成实践。',links:block.readings.map(r=>r.url)});
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');
 if(e.target.closest('[data-page]')?.dataset.page==='learn')requestAnimationFrame(()=>{const id=window.ImmersiveLearning?.currentBlock();if(page==='learn'&&document.querySelector('.immersive-reading')&&id)recordCurriculumVisit(id)});
 if(b?.dataset.action==='curated-block')recordCurriculumVisit(b.dataset.id);
 const summary=e.target.closest('.walkthrough > summary');
 if(summary){const block=summary.closest('.curated-block');queueMicrotask(()=>{if(summary.parentElement.open&&block)recordCurriculumVisit(block.id.replace('curated-',''))})}
 const id=b?.dataset.action==='ee-select'?b.dataset.id:b?.dataset.action==='learning-theory'?b.dataset.id.split(':').at(-1):null;
 const lesson=id&&RAW.ee_textbook?.lessons.find(l=>l.id===id);
 if(lesson)saveAutomaticJournal('ee:'+id+':view',{title:'查看原理：'+lesson.title,track:'robotics',learning_route:'robotics',stage:window.learningContext?.('theory',id)?.stage||'robotics-1',kind:'activity',evidence_type:'activity',body:'已打开原理导学。仅记录查看操作，不代表已读完或掌握。',links:lesson.sources.map(s=>s.url)});
});
window.addEventListener('online',()=>flushAutomaticJournal());
document.addEventListener('DOMContentLoaded',()=>{if(automaticJournalQueue.length)flushAutomaticJournal()});
