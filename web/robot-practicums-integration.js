/* Inside the existing workspace closure; records use its existing journal API. */
  const rpData=globalThis.RobotPracticumData,rpAPI=globalThis.RobotPracticums;
  const rpById=Object.fromEntries(rpData.practicums.map(x=>[x.id,x]));
  const rpDraftKey=id=>personalStoreKey+':robot-practicum:'+id+':'+(activePersonal()?.id||'unassigned');
  const rpSettingsKey=personalStoreKey+':robot-radar-url';
  let rpBusy=false;
  function rpDraft(lab){
    let saved={};try{saved=JSON.parse(localStorage.getItem(rpDraftKey(lab.id))||'{}');}catch{}
    const robot=rpData.robots[0];
    const draft={robotId:robot.id,jointId:robot.defaultJoint,q0:'',q1:'',rows:{},...saved};
    // Read old drafts without discarding their separate observation/explanation.
    if(draft.finding===undefined)draft.finding=[draft.observation,draft.explanation].filter(Boolean).join('\n\n');
    return draft;
  }
  function rpStore(lab,draft){localStorage.setItem(rpDraftKey(lab.id),JSON.stringify(draft));}
  function rpCurrent(){return state.view==='projects'?rpById[state.practicum]:null;}
  function rpBase(){try{return rpAPI.baseUrl(localStorage.getItem(rpSettingsKey)||rpData.radarBaseUrl,rpData.learningBaseUrl);}catch{return '';}}
  function rpStatus(message,error=false){const el=main.querySelector('#rp-status');if(el){el.textContent=message;el.dataset.error=String(error);}}
  function rpInput(label,key,value,help='',type='text'){
    return `<div><label for="rp-${key}">${esc(label)}</label><input id="rp-${key}" data-rp-field="${key}" type="${type}" ${type==='number'?'step="any"':''} maxlength="600" value="${esc(value??'')}">${help?`<p class="rp-help">${esc(help)}</p>`:''}</div>`;
  }
  function rpTextarea(label,key,value,help=''){
    return `<div><label for="rp-${key}">${esc(label)}</label>${help?`<p class="rp-help" id="rp-help-${key}">${esc(help)}</p>`:''}<textarea id="rp-${key}" data-rp-field="${key}" rows="4" maxlength="900" ${help?`aria-describedby="rp-help-${key}"`:''}>${esc(value||'')}</textarea></div>`;
  }
  function rpLinks(lab,draft){
    const base=rpBase();
    const targets=lab.id==='robot-coordinates'?[["打开关节实验",{robot:draft.robotId,mode:'joints',part:rpAPI.robotJoint(rpData,draft.robotId,draft.jointId).joint.child}]]:[["打开 SO-101 装配阅读",{robot:'so101',mode:'assembly'}],["打开 SO-101 制造资料",{robot:'so101',mode:'buildkit'}]];
    return `<div class="row">${targets.map(([title,params])=>base?`<a class="button primary" data-rp-radar href="${esc(rpAPI.radarUrl(base,params))}" target="_blank" rel="noopener noreferrer">${title} ↗</a>`:`<button type="button" class="button" disabled>${title}（先设置实验站地址）</button>`).join('')}</div>`;
  }
  function rpJointFields(draft){
    let pair;try{pair=rpAPI.robotJoint(rpData,draft.robotId,draft.jointId);}catch{const r=rpData.robots[0];draft.robotId=r.id;draft.jointId=r.defaultJoint;pair=rpAPI.robotJoint(rpData,r.id,r.defaultJoint);}
    const {robot,joint}=pair;
    return `<div class="rp-fields"><div><label for="rp-robotId">机型与配置</label><select id="rp-robotId" data-rp-field="robotId">${rpData.robots.map(r=>`<option value="${r.id}" ${r.id===robot.id?'selected':''}>${esc(r.title)}</option>`).join('')}</select></div><div><label for="rp-jointId">独立关节</label><select id="rp-jointId" data-rp-field="jointId">${robot.joints.map(j=>`<option value="${j.id}" ${j.id===joint.id?'selected':''}>${esc(j.id)}</option>`).join('')}</select></div>${rpInput('实际实验初始输入 q0','q0',draft.q0,'旋转单位 rad；请从实验记录填写。','number')}${rpInput('实际实验目标输入 q1','q1',draft.q1,'只改变一个关节，其他初态保持一致。','number')}</div><dl class="rp-meta"><dt>参考坐标系</dt><dd>局部轴在关节坐标系定义；世界观察还取决于父链姿态与 Viewer 的整体展示变换。</dd><dt>父 → 子连杆</dt><dd>${esc(joint.parent)} → ${esc(joint.child)}</dd><dt>局部轴 / 类型 / 源限位</dt><dd>${esc(joint.axis)} · ${esc(joint.type)} · ${esc(joint.limit.lower)} 到 ${esc(joint.limit.upper)} ${joint.type==='prismatic'?'m':'rad'}</dd><dt>源提交</dt><dd><a href="${esc(robot.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(robot.sourceCommit)}</a></dd><dt>源 URDF SHA-256</dt><dd><code>${esc(robot.sourceSha256)}</code></dd></dl>`;
  }
  function rpBomFields(draft){
    const names={piece:'件',pack:'包',set:'套',kit:'套件'};
    return `<p><b>固定配置：</b>${esc(rpData.so101.configuration)}</p><p class="rp-help">数量指单 follower。USB 与夹具沿用“包”单位；不要把一包写成一件。紧固件当前总量未知，应保留缺口。</p><div class="rp-source-list"><a href="${rpData.so101.sourceUrl}" target="_blank" rel="noopener noreferrer">固定版本 BOM ↗</a><a href="${rpData.so101.printUrl}" target="_blank" rel="noopener noreferrer">打印说明 ↗</a><a href="${rpData.so101.assemblyUrl}" target="_blank" rel="noopener noreferrer">装配文字 ↗</a></div><dl class="rp-meta"><dt>硬件资料提交</dt><dd><code>${rpData.so101.sourceCommit}</code></dd><dt>装配文档提交</dt><dd><code>${rpData.so101.assemblyCommit}</code></dd><dt>许可核对范围</dt><dd>${esc(rpData.so101.license)}；请在解释中写明核对依据与适用范围。</dd></dl><details><summary>打印参数的来源语境</summary><ul>${rpData.so101.printSettings.map(p=>`<li>${esc(p.parameter)}：${esc(p.value)} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">依据 ↗</a></li>`).join('')}</ul><p>本地打印 15% 与外包 FDM 20% 来自不同文档语境；不要合并成统一配方。尺寸配合、温度与实体打印结果仍需另行核实。</p></details><div class="rp-table-scroll" tabindex="0" aria-label="BOM 审核表，可横向滚动"><table class="rp-bom"><thead><tr><th scope="col">项目与资料依据</th><th scope="col">类别</th><th scope="col">参考数量</th><th scope="col">核对数量</th><th scope="col">审核判断</th><th scope="col">差异 / 依据 / 影响</th></tr></thead><tbody>${rpData.so101.rows.map(row=>{const r=draft.rows?.[row.id]||{};return `<tr><th scope="row"><a href="${esc(row.source)}" target="_blank" rel="noopener noreferrer">${esc(row.name)} ↗</a><p class="rp-help">${esc(row.note)}</p></th><td>${row.category==='printed'?'打印件':'采购项'}</td><td>${row.quantity===null?'未知':row.quantity} ${names[row.unit]||esc(row.unit)}</td><td><input type="number" min="0" step="1" data-rp-row="${row.id}" data-rp-cell="quantity" value="${esc(r.quantity??'')}" aria-label="${esc(row.name)} 核对数量" ${row.quantity===null?'disabled':''}></td><td><select data-rp-row="${row.id}" data-rp-cell="status" aria-label="${esc(row.name)} 审核判断">${[['','未核对'],['match','一致'],['different','有差异'],['unknown','资料不足']].map(([v,n])=>`<option value="${v}" ${r.status===v?'selected':''}>${n}</option>`).join('')}</select></td><td><input type="text" maxlength="140" data-rp-row="${row.id}" data-rp-cell="note" value="${esc(r.note||'')}" aria-label="${esc(row.name)} 审核依据"></td></tr>`;}).join('')}</tbody></table></div>`;
  }
  function rpLaunch(lab,draft){
    if(lab.id==='so101-bom-audit')return `<a class="button primary" href="${rpData.so101.sourceUrl}" target="_blank" rel="noopener noreferrer">打开官方部件清单 ↗</a>`;
    if(rpBase())return rpLinks(lab,draft);
    return '<button type="button" class="button primary" data-rp-action="show-base">设置实验站地址</button><p class="rp-help">地址只需设置一次。也可先看下方的关节来源资料。</p>';
  }
  function renderRobotPracticum(lab){
    const draft=rpDraft(lab),coordinate=lab.id==='robot-coordinates';
    const course=lab.courses.find(c=>activePersonal()?.courseIds.includes(c));
    const pair=coordinate?rpAPI.robotJoint(rpData,draft.robotId,draft.jointId):null;
    const title=coordinate?'改变一个关节，谁会跟着动？':'这份清单，能直接拿去制作吗？';
    const task=coordinate?'只改变一个关节，观察它后面的连杆，再对照自己的预测。':'先核对电机配置、数量单位和紧固件缺项，记下一个影响制作准备的问题。';
    workspaceHeading('ROBOT PRACTICUM',lab.title,'做一次观察，记下一次发现。',button('返回项目实践','projects')+button('回到原理课程','course',lab.courseId));
    main.innerHTML=`<article class="rp-workbench rp-simple" data-practicum="${lab.id}"><div class="rp-simple-grid"><section class="rp-section rp-task-card"><span class="rp-step-label">01 · 做一次观察</span><h2>${title}</h2><p class="rp-task-context">${coordinate?esc(pair.robot.title)+' · '+esc(pair.joint.id):'SO-101 · 单 follower'}</p><p class="rp-task-description">${task}</p><ol class="rp-short-steps">${(coordinate?['先猜一猜：哪些连杆会跟着动？','复位后，小幅改变这个关节。','对照实际结果，解释原因。']:['先判断：资料里还缺什么？','打开清单和装配说明核对。','记录一项差异、缺口或确认结果。']).map(t=>`<li>${t}</li>`).join('')}</ol><div id="rp-radar-links" class="rp-launch">${rpLaunch(lab,draft)}</div><p class="rp-source-inline">${coordinate?`<a href="${esc(pair.robot.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看关节来源 ↗</a><button type="button" class="rp-text-button" data-rp-action="show-tools">更换机型或关节</button>`:`<a href="${rpData.so101.assemblyUrl}" target="_blank" rel="noopener noreferrer">对照装配说明 ↗</a>`}</p><details class="rp-hints"><summary>需要一点提示？</summary><p>${coordinate?'关节的局部轴随父链改变方向。留意哪些连杆位于它的下游。':'把打印件和采购件分开；“包”不等于“件”。紧固件总数在当前参考资料中仍未确认。'}</p><div class="rp-source-list">${lab.prerequisites.map(([label,course,lesson])=>`<a href="#learn/lesson/${course}/robotics/${lesson}/explain">${esc(label)} →</a>`).join('')}</div><p class="rp-help">想再试一步：${coordinate?'换另一个关节，看看是否仍符合你的解释。':'换成 leader 或另一块板卡，想想哪些项目需要重新核对。'}</p></details></section><section class="rp-section rp-record-card"><span class="rp-step-label">02 · 记下你的发现</span>${rpTextarea('你预计会怎样？','prediction',draft.prediction)}${rpTextarea('实际看到什么？为什么？','finding',draft.finding,'预测错了也没关系，写下你怎样修正。')}<div class="rp-save-row"><button type="button" class="button primary" data-rp-action="record">${course?'保存学习记录':'保存草稿'}</button><span class="rp-help">${course?'归入当前路线的 '+esc(expansionById[course].label):'先保存在本浏览器，之后可以继续。'}</span></div><p id="rp-status" class="rp-status" role="status" aria-live="polite"></p></section></div><p class="rp-simple-scope">${coordinate?'这次记录的是模型运动学观察。':'这次记录的是资料观察；尚未逐项审核时，会标为局部审核。'} 保存不会增加时长或自动完成任务。</p><details class="rp-section rp-tools" id="rp-tools"><summary>更多：资料、日志与导出</summary><div class="rp-tools-content"><h2>${coordinate?'机型、输入与来源':'完整 BOM 审核（选做）'}</h2><p class="rp-help">按需要补充。已有的详细草稿会保留。</p>${coordinate?rpJointFields(draft):rpBomFields(draft)}<h2>实验站地址</h2><label for="rp-radar-base">Robot Radar 地址</label><input id="rp-radar-base" type="url" placeholder="https://example.org/robot-radar/" value="${esc(rpBase())}"><p class="row"><button type="button" class="button" data-rp-action="set-base">保存地址</button></p>${coordinate?'':`<div class="row">${rpLinks(lab,draft)}</div>`}<h2>补充材料（选填）</h2><label for="rp-import">${coordinate?'导入运动学日志 JSON':'导入参考 BOM JSON'}</label><input id="rp-import" type="file" accept=".json,application/json"><p id="rp-import-status" class="rp-status" role="status">${esc(draft.importSummary||'只读取资料，不执行程序，也不自动完成审核。')}</p>${draft.rawImport?'<button type="button" class="button" data-rp-action="clear-import">移除导入资料</button>':''}${rpTextarea('原始文件或资料依据（选填）','evidenceRef',draft.evidenceRef)}${rpTextarea('补充解释（选填）','explanation',draft.explanation)}${rpTextarea('换个条件再试（选填）','transfer',draft.transfer)}${rpTextarea('局限与未验证内容（选填）','limitations',draft.limitations)}<p class="rp-note">${esc(lab.boundary)}</p><div class="row"><button type="button" class="button" data-rp-action="download">导出完整记录 JSON</button><button type="button" class="button" data-rp-action="task">安排为学习任务</button>${button('查看学习记录','records')}</div></div></details></article>`;
  }
  function rpCapture(lab){
    const draft=rpDraft(lab);
    main.querySelectorAll('[data-rp-field]').forEach(el=>{draft[el.dataset.rpField]=el.type==='checkbox'?el.checked:el.value;});
    main.querySelectorAll('[data-rp-row]').forEach(el=>{const id=el.dataset.rpRow;draft.rows[id]||={};draft.rows[id][el.dataset.rpCell]=el.value;});
    rpStore(lab,draft);return draft;
  }
  function rpReport(lab,draft){
    const check=rpAPI.reviewNote(lab,draft,rpData),coordinate=lab.id==='robot-coordinates';
    return {format:'learn-by-building-robot-practicum',schemaVersion:1,practicumId:lab.id,title:lab.title,courseId:lab.courseId,createdAt:new Date().toISOString(),evidenceType:lab.evidenceType,status:check.passed?'observation-note':'draft',scope:check.scope,acceptance:'本次观察笔记；不是实物完成或课程掌握证明。',source:coordinate?rpAPI.robotJoint(rpData,draft.robotId,draft.jointId):rpData.so101,inputs:coordinate?{robotId:draft.robotId,jointId:draft.jointId,q0:draft.q0||null,q1:draft.q1||null,unit:'rad',frame:'joint-local; world view also includes parent chain and viewer presentation transform'}:{configuration:rpData.so101.configuration,rows:draft.rows},prediction:draft.prediction||'',observation:draft.finding||'',legacyObservation:draft.observation||'',explanation:draft.explanation||'',transfer:draft.transfer||'',limitations:draft.limitations||'',evidenceRef:draft.evidenceRef||'',importedFile:draft.importedFile||null,rawImport:draft.rawImport?JSON.parse(draft.rawImport):null,checks:check,boundary:lab.boundary};
  }
  function rpJournalText(lab,draft,report,courseId=lab.courseId){
    const reviewed=rpData.so101.rows.filter(r=>draft.rows?.[r.id]?.status);
    const source=lab.id==='robot-coordinates'?`机型：${draft.robotId}；关节：${draft.jointId}${draft.q0!==''&&draft.q1!==''?`；q0=${draft.q0} rad，q1=${draft.q1} rad`:'；未补充数值日志'}\n源提交：${report.source.robot.sourceCommit}\n源 URDF SHA-256：${report.source.robot.sourceSha256}`:`配置：${rpData.so101.configuration}\nBOM 提交：${rpData.so101.sourceCommit}\n装配文档提交：${rpData.so101.assemblyCommit}\n审核范围：${report.checks.detail.reviewed}/18 行；${report.scope==='partial-audit'?'局部资料观察，完整审核未完成':'已逐行填写审核'}\n参考资料缺口：紧固件总数未知。\n`+reviewed.map(r=>{const a=draft.rows[r.id];return `${r.name} | 参考 ${r.quantity??'未知'} ${r.unit} | 核对 ${a.quantity||'未知'} | ${a.status} | ${a.note||''}`;}).join('\n');
    return `[课程id ${courseId}]\n[实训id ${lab.id}]\n${source}\n\n预测：${draft.prediction}\n\n实际结果与解释：${draft.finding}\n${draft.explanation?'\n补充解释：'+draft.explanation+'\n':''}${draft.transfer?'\n独立迁移：'+draft.transfer+'\n':''}${draft.limitations?'\n局限：'+draft.limitations+'\n':''}${draft.evidenceRef?'\n原始依据：'+draft.evidenceRef+'\n':''}${draft.importedFile?'导入文件：'+JSON.stringify(draft.importedFile)+'\n':''}\n${lab.boundary}`;
  }
  const rpOldCourse=renderCourse,rpOldProjects=renderProjectPage,rpOldGo=go;
  renderCourse=function(){
    rpOldCourse();const labs=rpData.practicums.filter(x=>x.courses.includes(state.course));if(!labs.length)return;
    const html=`<section class="rp-course-links" aria-label="配套机器人实训"><h2>把这一课带到机器人上</h2><p>完成原理学习后，预测、操作并带回证据。</p><div class="row">${labs.map(l=>button(esc(l.title)+' →','rp-open',l.id)).join('')}</div></section>`;
    const anchor=main.querySelector('.rf-course-summary,.aid-course-summary');if(anchor)anchor.insertAdjacentHTML('afterend',html);else main.insertAdjacentHTML('beforeend',html);
  };
  integratedProjects.unshift(...rpData.practicums.map(l=>({id:l.id,title:l.title,subtitle:l.subtitle,courses:l.courses,step:l.steps.join('\n'),outcome:l.acceptance.join('；'),practicum:true})));
  renderProjectPage=function(){const lab=rpCurrent();if(lab){renderRobotPracticum(lab);return;}rpOldProjects();main.querySelectorAll('[data-action="workspace-project-detail"]').forEach(b=>{if(rpById[b.dataset.value]){b.dataset.action='rp-open';if(b.classList.contains('button'))b.textContent='进入实训 →';}});};
  go=function(view,course){state.practicum=view==='projects'&&Object.hasOwn(rpById,course)?course:null;return rpOldGo(view,state.practicum?undefined:course);};
  root.addEventListener('input',e=>{const lab=rpCurrent();if(lab&&e.target.closest('[data-rp-field],[data-rp-row]')){try{rpCapture(lab);}catch(err){rpStatus('草稿未保存：'+err.message,true);}}});
  root.addEventListener('change',async e=>{
    const lab=rpCurrent();if(!lab)return;
    if(e.target.id==='rp-robotId'||e.target.id==='rp-jointId'){
      const draft=rpCapture(lab);if(e.target.id==='rp-robotId'){draft.jointId=rpData.robots.find(r=>r.id===draft.robotId).defaultJoint;draft.q0='';draft.q1='';}rpStore(lab,draft);renderRobotPracticum(lab);syncModuleHeader();
    }
    if(e.target.id!=='rp-import')return;
    const key=rpDraftKey(lab.id),file=e.target.files[0];if(!file)return;
    try{
      if(file.size>100000)throw Error('JSON 超过 100 KB，请保留原文件并手工提交关键观察。');
      const raw=await file.text(),value=JSON.parse(raw),inspection=lab.id==='robot-coordinates'?rpAPI.inspectExperiment(value,rpData):rpAPI.inspectBom(value,rpData);
      if(rpDraftKey(lab.id)!==key||rpCurrent()?.id!==lab.id)return;
      const hash=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join(''):null;
      if(rpDraftKey(lab.id)!==key||rpCurrent()?.id!==lab.id)return;
      const draft=rpCapture(lab);
      draft.rawImport=raw;draft.importedFile={name:file.name,bytes:file.size,sha256:hash};draft.importSummary=inspection.evidence+(inspection.trace?' '+inspection.trace.count+' 个运行采样。':'');rpStore(lab,draft);renderRobotPracticum(lab);syncModuleHeader();
    }catch(err){const status=main.querySelector('#rp-import-status');if(status)status.textContent='未载入：'+err.message;}
  });
  root.addEventListener('click',async e=>{
    const open=e.target.closest('[data-action="rp-open"]');if(open){e.preventDefault();go('projects',open.dataset.value);return;}
    const b=e.target.closest('[data-rp-action]'),lab=rpCurrent();if(!b||!lab||rpBusy)return;
    e.preventDefault();
    try{
      const draft=rpCapture(lab),action=b.dataset.rpAction;
      if(action==='show-base'||action==='show-tools'){const tools=main.querySelector('#rp-tools');tools.open=true;const target=main.querySelector(action==='show-base'?'#rp-radar-base':'#rp-robotId');target?.focus();target?.scrollIntoView({block:'center',behavior:'auto'});return;}
      if(action==='set-base'){const base=rpAPI.baseUrl(main.querySelector('#rp-radar-base').value,rpData.learningBaseUrl);localStorage.setItem(rpSettingsKey,base);renderRobotPracticum(lab);syncModuleHeader();main.scrollTop=0;rpStatus(base?'实验站地址已保存。':'实验站地址已清除。');return;}
      if(action==='clear-import'){delete draft.rawImport;delete draft.importedFile;delete draft.importSummary;rpStore(lab,draft);renderRobotPracticum(lab);syncModuleHeader();return;}
      if(action==='task'){
        const profile=activePersonal(),course=lab.courses.find(c=>profile?.courseIds.includes(c));
        if(!course)throw Error('请先在个人路线中加入 '+lab.courses.map(c=>expansionById[c].label).join(' 或 ')+'，再安排实训。');
        editWorkspaceTask(null,{...lab,practicum:true,step:'先写一句预测，进行一次观察，再记下实际结果与原因。\n实训入口：#learn/projects/'+lab.id,outcome:'一份有预测和实际观察的学习记录。'+(lab.id==='so101-bom-audit'?'局部资料观察不代表完整 BOM 或实物验收。':'可换一个关节继续验证。')});return;
      }
      const profile=activePersonal(),course=lab.courses.find(c=>profile?.courseIds.includes(c));
      if(action==='record'&&!course){rpStatus('草稿已保存在本浏览器，下次打开可以继续。');return;}
      const report=rpReport(lab,draft);
      if(action==='download'){downloadWorkspace(lab.id+'-report.json',report);rpStatus('已下载完整报告。请与原始截图、日志或资料一起保留。');return;}
      if(!report.checks.passed){rpStatus(report.checks.issues.slice(0,12).map(x=>'• '+x).join('\n')+(report.checks.issues.length>12?'\n另有 '+(report.checks.issues.length-12)+' 项待检查。':''),true);return;}
      if(action==='record'){
        const body=rpJournalText(lab,draft,report,course);if(body.length>8700)throw Error('记录摘要过长，请先下载完整报告，再精简文字到 8700 字符内。');
        const key=rpDraftKey(lab.id);draft.entryId||=crypto.randomUUID();rpStore(lab,draft);rpBusy=true;b.disabled=true;rpStatus('正在保存…');
        try{
          await workbenchCall('journal',{profile,id:draft.entryId,expectedUpdatedAt:draft.savedUpdatedAt,values:{title:lab.title,entry_date:routeDay(),kind:'experiment',status:'recorded',evidence_type:lab.evidenceType,body,result:lab.id==='so101-bom-audit'?(report.scope==='partial-audit'?'局部资料观察（'+report.checks.detail.reviewed+'/18 行已审核），完整审核尚未完成。':'逐行资料审核记录；仍有 '+report.checks.detail.gaps.length+' 项差异或资料缺口。'):'关节运动的观察与解释。',next_step:lab.id==='robot-coordinates'?'换另一个关节，再检验一次解释。':'继续核对其他清单项目；保留尚未解决的制作准备缺口。'}});
          const saved=await refreshWorkspace(),entry=saved.entries.find(x=>x.id===draft.entryId);
          const latest=JSON.parse(localStorage.getItem(key)||'{}');latest.entryId=draft.entryId;latest.savedUpdatedAt=entry?.updated_at;
          localStorage.setItem(key,JSON.stringify(latest));if(rpDraftKey(lab.id)===key)rpStatus('已保存到学习记录。');
        }finally{rpBusy=false;b.disabled=false;}
      }
    }catch(err){rpStatus(err.message,true);}
  });
