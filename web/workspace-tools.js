function staticRecordsNotice(){return `<section class="panel"><p>学习记录仅保存在当前浏览器，不上传。清除网站数据或更换设备前，请下载备份。</p>${btn('备份与恢复','workspace-data','','small')}</section>`;}
/* Local onboarding and portable learning records. No models, subscriptions or uploads. */
function workspaceEnvironment(p){return ({browser:'先使用浏览器；需要终端时再准备环境。',windows:'使用 Windows，按课程版本配置环境。',macos:'使用 macOS，按课程版本配置环境。',linux:'使用 Linux，按课程版本配置环境。'}[p.device]||'')+(p.goal==='agent'?' AI 起步可用固定响应，不需要先购买模型额度。':p.practice==='hardware'?' 先用模型理解，再核对实物接线与额定值。':' 没有硬件也可先用模型、纸上计算与样例；实物成果另行验证。');}
function onboardingModal(){
 openModal('从你的第一步开始',`<p>选择方向和条件，先预览一周的小练习。无需配置资讯订阅或付费模型。</p>${field('想学的方向',choose('goal',{robotics:'机器人：从电路与程序开始',agent:'AI / Agent：从第一行 Python 开始'},getSiteRoute()))}${field('现在的基础',choose('level',planLevels,'zero'))}${field('每天可投入多少分钟','<input name="minutes" type="number" min="1" max="1440" step="1" value="30" required>')}${field('主要设备',choose('device',{browser:'先只用浏览器',windows:'Windows 电脑',macos:'macOS 电脑',linux:'Linux 电脑'},'browser'))}${field('机器人硬件条件（AI 路线忽略此项）',choose('practice',{simulation:'暂无硬件，先用模型和样例',hardware:'已有硬件，先模型后实物'},'simulation'))}<p class="note">从第一块开始；已有基础也先检查先修要求，可稍后修改起点。</p>`,async d=>{pendingPlanPreview=await api('plan/preview',{...d,days:7,start:day(),progression:'current'});return false});
 $('#form button[type=submit]').textContent='预览我的第一周';
}
function renderDailyLearning(next,focusTitle,minutes,progress,completed){
 const d=currentCurriculum(),first=d.months[0].blocks[0],task=focusTitle?S.tasks.find(t=>t.id===focusSession.taskId):next,planTask=S.learning_plan?.tasks.find(t=>t.id===task?.id);
 const fresh=!S.tasks.length&&!S.learning_plan;
 if(fresh)return `<section class="panel daily-entry"><span class="study-kicker">第一次来，从这里开始</span><h2>${esc(d.hero)}</h2><p>${esc(d.orientation)}</p><p><b>第一件事：</b>${esc(first.first_step)}</p><p class="note">先看懂 → 跟做 → 改一个条件 → 解释结果。按你的时间推进。</p><div class="actions">${btn('设置我的第一周','workspace-onboarding','','primary')}${btn('先看看第一块','curated-block',first.id)}</div></section>`;
 return `<section class="study-hero"><div><span class="study-kicker">${focusTitle?'继续你的专注':task?.due&&task.due!==day()?'安排于 · '+esc(task.due):'今天只推进这一小步'}</span><h2>${esc(task?.title||'回顾成果，再决定下一步。')}</h2><p>${esc(task?.note?.split('\n')[0]||'看看已完成的记录；还有没弄懂的地方就继续当前块。')}</p>${task?`<p class="note">计划 ${task.minutes} 分钟；完成多少就记录多少，整块验收另行核对。</p>`:''}<div class="actions">${task?btn(focusTitle?'回到专注':'开始这次学习','study-start',task.id,'primary'):btn('安排下一段学习','personal-plan-new','','primary')}${planTask?learningPlanLinks(planTask):task?btn('查看步骤与资料','task-edit',task.id):btn('回看学习记录','nav','journal')}</div></div><div class="study-goal"><span>当日已投入</span><div><strong>${minutes}</strong><span> / ${studyGoal} 分钟</span></div><progress max="100" value="${progress}" aria-label="当日学习目标完成 ${progress}%"></progress><div class="study-goal-bottom"><span>${completed} 个成果</span>${btn('调整目标','study-goal','','small')}</div></div></section>${S.learning_plan?`<details class="daily-plan-details"><summary>查看整周安排、调整与打卡</summary>${personalPlanPanel()}</details>`:''}`;
}
function workspaceDataPanel(){return `<section class="panel workspace-data"><h2>学习记录备份与恢复</h2><p>保存两条路线的任务、笔记、实际学习时长和计划，方便换电脑或升级。</p><div class="actions">${btn('下载学习记录备份','workspace-backup','','primary')}${btn('从备份恢复','workspace-restore')}${window.StaticSite?btn('下载恢复前安全备份','workspace-safety','','small'):''}${btn('重新设置学习起点','workspace-onboarding')}</div><p class="note">不含资讯、密钥、订阅配置、浏览器未保存草稿和未结束计时。文件包含个人笔记，请自行保存。恢复前会显示数量，并自动保存一份恢复前备份。</p></section>`;}
function downloadWorkspaceFile(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='learn-by-building-records-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function restoreWorkspaceModal(){
 if(typeof automaticJournalQueue!=='undefined'&&(automaticJournalQueue.length||automaticJournalBusy)){toast('请先重试保存待同步的学习记录，再恢复备份');return;}
 if(focusSession){toast('请先结束或放弃当前专注计时，再恢复记录');return;}
 openModal('选择学习记录备份',`<p>支持动手学学习记录备份 v1，包括更名前导出的 v1 备份；旧版全量导出暂不能直接导入。</p>${field('备份文件','<input name="backup-file" type="file" accept=".json,application/json" required>')}<p class="note">下一步只校验并预览，不会修改现有记录。最大 12 MB。</p>`,async(_d,f)=>{
  const file=f.querySelector('[name="backup-file"]').files[0];if(!file||file.size>12*1024*1024)throw Error('请选择不超过 12 MB 的 JSON 备份');
  let backup;try{backup=JSON.parse(await file.text())}catch{throw Error('备份不是有效的 JSON 文件')}
  const preview=await api('backup/preview',{backup});pendingRestore={backup,preview};return false;
 });$('#form button[type=submit]').textContent='校验并预览';
}
let pendingRestore=null;
document.addEventListener('close',e=>{if(e.target.id==='modal'&&pendingRestore){const {backup,preview}=pendingRestore;pendingRestore=null;queueMicrotask(()=>{
 const labels={tasks:'任务',sessions:'学习时长记录',learning_entries:'笔记',learning_plans:'计划'};
 openModal('确认恢复的范围',`<p>将替换当前两条路线的学习记录，采用备份内的内容。${window.StaticSite?'恢复前会在当前浏览器保留一份安全备份。':'恢复前的记录会自动备份到本机 data/backups。'}</p><table class="workspace-restore-table"><thead><tr><th>内容</th><th>现在</th><th>备份中</th></tr></thead><tbody>${Object.entries(labels).map(([key,label])=>`<tr><td>${label}</td><td>${preview.current[key]}</td><td>${preview.counts[key]}</td></tr>`).join('')}</tbody></table><p class="note">备份时间：${esc(preview.created_at)}。未保存的草稿不在备份内，请先自行保留；结束所有计时，并关闭其他学习台页面后再恢复。</p><label class="toggle-line"><input type="checkbox" name="confirmation" value="replace-learning-records" required> 我确认替换上述学习记录</label>`,async d=>{
 const result=await api('backup/restore',{backup,checksum:preview.checksum,revision:preview.revision,confirmation:d.confirmation});return window.StaticSite?'恢复完成，恢复前的记录已保存在浏览器，可下载安全备份':'恢复完成；恢复前备份：data/backups/'+result.safety_backup;
 });$('#form button[type=submit]').textContent='确认恢复记录';
 });}},true);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action^="workspace-"]');if(!b)return;try{
 if(b.dataset.action==='workspace-data'){openModal('我的学习记录',workspaceDataPanel(),async()=>false);$('#form button[type=submit]').textContent='完成';}
 if(b.dataset.action==='workspace-onboarding')onboardingModal();
 if(b.dataset.action==='workspace-backup'){b.disabled=true;downloadWorkspaceFile(await api('backup'));toast('备份已生成，请保存下载文件');}
 if(b.dataset.action==='workspace-safety')downloadWorkspaceFile(await api('backup/safety'));
 if(b.dataset.action==='workspace-restore')restoreWorkspaceModal();
}catch(err){toast(err.message)}finally{b.disabled=false}});
