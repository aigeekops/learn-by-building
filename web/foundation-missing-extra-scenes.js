/* Original snapshot diagrams for the three remaining Missing Semester topics. */
(function(root,factory){const install=factory();if(typeof module!=='undefined'&&module.exports)module.exports=install;else install(root.FoundationCodingScenes);})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const C={ink:'#163849',muted:'#718591',line:'#c8d7dc',pale:'#eef5f5',white:'#ffffff',teal:'#0f766e',mint:'#d2f2e8',red:'#b42348',rose:'#ffe1e7',amber:'#b86a13'};
  const has=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t=(x,y,s,size=13,color=C.ink,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${color}">${esc(s)}</text>`;
  const box=(x,y,w,h,active=false)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${active?C.mint:C.white}" stroke="${active?C.teal:C.line}" stroke-width="${active?2.5:1.5}"/>`;
  const rule=(x,y,w)=>`<path d="M${x} ${y}h${w}" fill="none" stroke="${C.line}"/>`;
  const badge=(x,y,label,value,known,active=false)=>{const color=!known?C.muted:value?C.teal:C.red;return `<g data-missing-check="${esc(label)}" data-missing-known="${known}">`+box(x,y,153,44,active)+`<circle cx="${x+19}" cy="${y+22}" r="11" fill="${!known?C.pale:value?C.mint:C.rose}"/>`+t(x+19,y+27,!known?'?':value?'✓':'×',15,color,'middle')+t(x+36,y+27,label,12,color)+'</g>';};
  function packaging(v,i,frame){
    const files=has(v,'files')?v.files:has(v,'allowlist')?v.allowlist:v.repository||[];
    const title=has(v,'files')?'实际产物清单':has(v,'allowlist')?'允许进入产物':'源目录';
    let s=t(26,26,'源目录 → 明确产物 → 接收方条件',16)+box(24,43,344,183,i<=2)+t(39,67,title,13,C.muted)+t(349,67,files.length+'项',12,C.muted,'end')+rule(37,78,318);
    files.slice(0,6).forEach((file,n)=>{const yy=101+n*20,bad=has(v,'files')&&file==='.env';s+=`<g data-missing-file="${esc(file)}">`+`<rect x="39" y="${yy-12}" width="12" height="14" rx="2" fill="${bad?C.rose:C.pale}" stroke="${bad?C.red:C.line}"/>`+t(60,yy,file,13,bad?C.red:C.ink)+t(350,yy,bad?'越界':title==='源目录'&&['.env','notes.txt'].includes(file)?'不交付':'',11,bad?C.red:C.muted,'end')+'</g>';});
    s+=t(393,62,'独立检查，结果只在执行后出现',13,C.muted);
    const flags=[['entryOK','启动入口',3],['publicOnly','内容范围',4],['contractOK','接口版本',6],['runtimeOK','运行时',7]];
    flags.forEach(([key,label,step],n)=>s+=badge(393+(n%2)*174,78+Math.floor(n/2)*60,label,v[key],has(v,key),i===step));
    const version=has(v,'version')?v.version:'等待版本计算',runtime=has(v,'runtime')?'Python '+v.runtime:'等待接收方检查';
    s+=t(394,205,version+' · '+runtime,12,C.muted);
    s+=box(24,236,716,28,i===9)+t(38,255,has(v,'ready')?(v.ready?'四项模型条件通过；真实运行仍待本地例程':'存在阻塞：'+(v.blockers||[]).join(', ')):'先核对文件与约定，尚未给出交付结论',12,has(v,'ready')&&!v.ready?C.red:C.muted);
    return s;
  }
  function agentic(v,i,frame,trace){
    const actions=['read','test-before','edit','test-after','review'],labels=['读取','原测试','编辑','新测试','评审'];
    const done=new Map(trace.steps.slice(0,i+1).filter(s=>s.variables.action).map(s=>[s.variables.action,s.variables.lastResult]));
    const source=has(v,'source')?v.source:'尚未读取';let s=t(25,25,'预设决策 → 内存工具 → 真实观测',16);
    actions.forEach((action,n)=>{const x=73+n*154,known=done.has(action),result=done.get(action)||{},failed=known&&!!(result.error||(has(result,'passed')&&!result.passed)||(has(result,'review')&&result.review!=='pass')),color=failed?C.red:known?C.teal:C.line,active=v.action===action; if(n)s+=`<path d="M${x-125} 64h96" stroke="${known?color:C.line}" fill="none" stroke-width="${known?3:1.5}"/>`;s+=`<g data-missing-tool="${action}" data-missing-observed="${known}" data-missing-failed="${failed}"><circle cx="${x}" cy="64" r="21" fill="${failed?C.rose:active?C.mint:C.white}" stroke="${color}" stroke-width="${active?3:1.5}"/>`+t(x,69,known?(failed?'×':'✓'):n+1,14,known?color:C.muted,'middle')+t(x,102,labels[n],12,active?color:C.muted,'middle')+'</g>';});
    s+=box(25,120,242,110,v.action==='edit')+t(40,142,'当前内存代码',12,C.muted)+t(145,176,source,23,C.ink,'middle')+t(41,215,'写入 '+(v.writes||0)+' 次',12,C.muted);
    const o=v.observations||{},panels=[['原测试',o.before,281],['修改后',o.after,533]];
    panels.forEach(([label,value,x])=>{s+=box(x,120,237,110,v.action===(label==='原测试'?'test-before':'test-after'))+t(x+14,142,label,12,C.muted);if(!value)s+=t(x+118,182,'未执行 / 未知',14,C.muted,'middle');else value.cases.slice(0,3).forEach((c,n)=>{const xx=x+41+n*77,pass=c.expected===c.actual;s+=`<g data-missing-test="${label}:${c.x}"><rect x="${xx-29}" y="157" width="58" height="47" rx="5" fill="${pass?C.mint:C.rose}"/>`+t(xx,174,'x='+c.x,12,C.ink,'middle')+t(xx,194,pass?'✓':'×',17,pass?C.teal:C.red,'middle')+'</g>';});});
    const status=has(v,'status')?v.status:'running',used=v.calls||0;
    s+=t(26,256,'工具调用 '+used+'/'+trace.params.budget+' · '+status,13,status==='running'?C.muted:status==='checked-example'?C.teal:C.red)+t(773,256,o.review?'评审：'+o.review:'评审尚未执行',12,o.review&&o.review!=='pass'?C.red:C.muted,'end');
    return s;
  }
  function beyond(v,i){
    let s=t(24,25,'复现事实 → 修改原因 → 可接手的协作材料',16);
    s+=box(24,45,270,173,i<3)+t(40,69,'最小输入与可计算差异',12,C.muted);
    (v.readings||[]).forEach((x,n)=>s+=`<rect x="${41+n*79}" y="84" width="63" height="35" rx="6" fill="${C.pale}"/>`+t(72+n*79,107,x,17,C.ink,'middle'));
    s+=t(41,148,'规格 x ≥ 0',13,C.ink)+t(41,177,'预期：'+(has(v,'expected')?v.expected:'未计算')+' 条',14,has(v,'expected')?C.teal:C.muted)+t(174,177,'实际：'+(has(v,'actual')?v.actual:'未计算'),14,has(v,'actual')?C.red:C.muted);
    s+=t(318,66,'四项移交条件，不是个人评分',13,C.muted);
    const flags=[['reproducible','可复查报告',4],['focused','范围聚焦',5],['whyRecorded','原因已写',6],['actionable','评审可行动',7]];
    flags.forEach(([key,label,step],n)=>s+=badge(317+(n%2)*225,82+Math.floor(n/2)*65,label,v[key],has(v,key),i===step));
    const report=v.report;
    s+=t(318,214,report?'环境 '+(report.environment?'已提供':'待补')+' · 步骤 '+(report.steps?'已提供':'待补'):'报告环境与步骤：等待检查',12,report&&(!report.environment||!report.steps)?C.red:C.muted);
    s+=box(24,235,746,29,i>=8)+t(39,255,has(v,'ready')?(v.ready?'本例移交条件齐备；尚未发生外部提交':'下一步补充：'+(v.missing||[]).join(', ')):'逐项检查后再决定下一步；没有外部发送',12,has(v,'ready')&&!v.ready?C.red:C.muted);
    return s;
  }
  const renderers={'missing-packaging':packaging,'missing-agentic':agentic,'missing-beyond':beyond};
  return function install(S){
    if(!S||typeof S.render!=='function')throw Error('Missing extra scenes require FoundationCodingScenes.render');
    if(S.missingExtraScenes)return S;
    const previous=S.render;
    S.render=function(trace,index=0){
      if(!trace||!has(renderers,trace.model)||!Array.isArray(trace.steps)||!trace.steps.length)return previous(trace,index);
      const current=Math.min(trace.steps.length-1,Math.max(0,Number.isFinite(index)?Math.trunc(index):0)),frame=trace.steps[current],v={};
      trace.steps.slice(0,current+1).forEach(step=>Object.assign(v,step.variables||{}));
      return `<svg xmlns="http://www.w3.org/2000/svg" class="fid-coding-scene" viewBox="0 0 800 280" role="img" aria-labelledby="fid-missing-${trace.model}-${current}-title" data-fid-scene="${esc(trace.model)}" data-fid-stage="${current}" font-family="system-ui, sans-serif"><title id="fid-missing-${trace.model}-${current}-title">${esc(trace.model+'：'+frame.title)}</title>${renderers[trace.model](v,current,frame,trace)}${t(774,277,(current+1)+' / '+trace.steps.length+' 步',10,C.muted,'end')}</svg>`;
    };
    S.missingExtraScenes=true;return S;
  };
});
