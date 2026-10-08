/* Shared learning units; route priority does not duplicate saved task evidence. */
const ElectronicsProgress={
  task(tasks,id){const rows=tasks.filter(t=>t.electronics_unit===id);return rows.find(t=>t.state==='done'&&t.evidence?.trim())||rows.find(t=>t.state==='doing')||rows[0]},
  summary(path,tasks){const completed=path.core.filter(id=>this.task(tasks,id)?.state==='done'&&this.task(tasks,id)?.evidence?.trim()).length;return {completed,total:path.core.length}}
};
if(typeof module!=='undefined')module.exports=ElectronicsProgress;
if(typeof document!=='undefined'){
 let electronicsPath=studyStore.read('radar-electronics-path','robotics');
 function renderElectronicsPaths(){
  const data=S.electronics_paths;if(!data)return '';
  const path=data.paths.find(p=>p.id===electronicsPath)||data.paths[0];electronicsPath=path.id;
  const summary=ElectronicsProgress.summary(path,S.tasks);
  const labels={core:path.id==='book'?'系统探索':'优先掌握',elective:'按需补充',extension:'后续拓展'};
  return `<section class="electronics-paths" aria-labelledby="paths-title"><div class="panel-head"><div><span class="study-kicker">机器人工程 · 电子学模块</span><h2 id="paths-title">选择电子学的学习重点</h2></div></div>
  <div class="path-options" role="group" aria-label="电子学学习模式">${data.paths.map(p=>`<button type="button" class="path-option" data-electronics-path="${p.id}" aria-pressed="${path.id===p.id}"><span>${esc(p.tag)}</span><strong>${esc(p.name)}</strong><p>${esc(p.description)}</p></button>`).join('')}</div>
  <details class="panel path-plan"><summary>查看本路线的学习优先级与任务</summary><div class="panel-head"><div><h3>${esc(path.name)} · 学习安排</h3><p>${esc(path.outcome)}</p></div><span class="badge green">${summary.completed} / ${summary.total} 个${path.id==='book'?'系统':'优先'}单元已记录成果</span></div>
  <p class="note">${path.id==='robotics'?'先完成四个优先单元，遇到项目需要再补充。无需完成全书实验，也不必把整组参考实验都做完。':path.id==='embedded'?'以制作目标检验理解，选读对应实验，不以书本页数判断进步。':'按八个知识单元组织全书索引；单元进度按任务成果记录，不代表实验1–30均已实物复现。'}${path.id!=='book'?' 按需补充和后续拓展不计入优先单元进度。':''}</p>
  ${Object.entries(labels).map(([key,label])=>path[key].length?`<details class="path-group" ${key==='core'?'open':''}><summary>${label} · ${path[key].length} 个单元</summary><div class="path-unit-grid">${path[key].map(id=>{
   const u=data.units.find(u=>u.id===id),task=ElectronicsProgress.task(S.tasks,id);
   return `<article class="path-unit"><div class="path-unit-top"><h4>${esc(u.title)}</h4><span class="badge ${task?.state==='done'?'green':'gray'}">${task?({done:'已记录成果',doing:'进行中',todo:'已安排'}[task.state]):'未安排'}</span></div><p>${esc(u.goal)}</p>${learningUnitLinks(u.id)}<details><summary>学习完成标准与参考实验</summary><p>${esc(u.acceptance)}</p><p class="note">第三版参考实验 ${u.experiments.join('、')}。${path.id==='book'?'逐项对照原书探索。':'按目标选读，不要求全部完成。'}</p></details><div class="actions">${btn(task?'查看学习任务':'安排学习','electronics-task',u.id,'small')}${btn('打开交互练习','electronics-lab',u.id,'small')}</div></article>`;
  }).join('')}</div></details>`:'').join('')}
  <p class="note">${esc(data.note)} <a href="${esc(data.source_url)}" target="_blank" rel="noopener noreferrer">查看原书目录 ↗</a></p><p class="note">八个单元均提供原创主题练习。网页模型、预设检查与实物实验分别记录；实验编号索引不等于逐项交互复现。</p></details></section>`;
 }
 document.addEventListener('click',event=>{
  const b=event.target.closest('[data-electronics-path],[data-action^="electronics-"]');if(!b)return;
  if(b.dataset.electronicsPath){electronicsPath=b.dataset.electronicsPath;studyStore.write('radar-electronics-path',electronicsPath);render();document.querySelector(`[data-electronics-path="${electronicsPath}"]`)?.focus({preventScroll:true});return}
  if(b.dataset.action==='electronics-lab'){setElectronicsConcept(b.dataset.id==='capacitors'?'rc':b.dataset.id);document.getElementById('interactive-lessons')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return}
  const u=S.electronics_paths.units.find(u=>u.id===b.dataset.id);if(!u)return;
  const old=ElectronicsProgress.task(S.tasks,u.id);
  taskModal(old||{title:'电子基础：'+u.title,track:'robotics',stage:'robotics-1',electronics_unit:u.id,note:u.goal+'\n\n完成标准：'+u.acceptance+'\n\n参考实验：'+u.experiments.join('、')+'（按目标选读）',source_url:S.electronics_paths.source_url});
 });
 window.renderElectronicsPaths=renderElectronicsPaths;
}
