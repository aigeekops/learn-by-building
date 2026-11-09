/* Shared inspection UI. Course providers own the actual equations and checks. */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CourseInspectorWorkbench=api;})(globalThis,function(root){
  'use strict';
  const providers=()=>root.CourseInspectorProviders||{};
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=x=>x===undefined?'未给出':typeof x==='number'?(Number.isFinite(x)?Math.abs(x)>1e7||x!==0&&Math.abs(x)<.0001?x.toExponential(3):String(Number(x.toFixed(4))):String(x)):typeof x==='string'?x:JSON.stringify(x);
  const frames=t=>t.steps||t.frames||[];
  const sameValue=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-10:JSON.stringify(a)===JSON.stringify(b);
  function descriptor(course,trace){return providers()[course]?.models?.[trace.model];}
  function inspect(course,trace,index){
    const model=descriptor(course,trace);if(!model)return null;
    const result=model.inspect(trace,Math.max(0,Math.min(frames(trace).length-1,index)));
    if(!result||!Array.isArray(result.cells)||!result.cells.length)throw Error(course+'/'+trace.model+' 缺少计算格子');
    return result;
  }
  function memory(session){return session.ci||(session.ci={});}
  function observe(session){
    const c=memory(session);
    if(c.lastTrace&&c.lastTrace!==session.trace){
      if(c.lastTrace.model!==session.trace.model){session.ci={};return observe(session);}
      if(!c.baseline)c.baseline=c.lastTrace;
      c.experiment=null;c.applied=false;
    }
    c.lastTrace=session.trace;return c;
  }
  function perform(course,session,action,value,run){
    const c=memory(session),model=descriptor(course,session.trace);if(!model)return false;
    if(action==='cell'){c.cell=value;return true;}
    if(action==='step'){const n=Number(value);if(!Number.isInteger(n)||n<0||n>=frames(session.trace).length)return false;session.index=n;return true;}
    if(action==='pin'){c.baseline=session.trace;c.experiment=null;c.applied=false;}
    else if(action==='reset'){session.trace=run({});session.index=0;session.ci={lastTrace:session.trace};return true;}
    else if(action==='prepare'){
      const e=model.experiments?.find(x=>x.id===value);if(!e)return false;
      session.trace=run(e.before);session.index=frames(session.trace).length-1;c.baseline=session.trace;c.experiment=e.id;c.applied=false;
    }else if(action==='apply'){
      const e=model.experiments?.find(x=>x.id===c.experiment);if(!e||!c.baseline)return false;
      session.trace=run(e.after);session.index=frames(session.trace).length-1;c.applied=true;
      const before=inspect(course,c.baseline,frames(c.baseline).length-1),after=inspect(course,session.trace,session.index);
      const changed=after.cells.find(cell=>{const old=before.cells.find(x=>x.id===cell.id);return old&&!sameValue(old.value,cell.value);});if(changed)c.cell=changed.id;
    }else if(action!=='pin')return false;
    memory(session).lastTrace=session.trace;return true;
  }
  const button=(text,action,value='',active=false)=>`<button type="button" data-ci-action="${action}" data-ci-value="${esc(value)}" ${active?'aria-current="step"':''}>${esc(text)}</button>`;
  function render(course,session){
    const t=session.trace,m=descriptor(course,t);if(!m)return '';
    const c=observe(session),view=inspect(course,t,session.index),selected=view.cells.find(x=>x.id===c.cell)||view.cells[0];
    const experiment=m.experiments?.find(x=>x.id===c.experiment);
    let comparison='';
    if(c.baseline&&c.baseline.model===t.model){
      const before=inspect(course,c.baseline,frames(c.baseline).length-1),after=inspect(course,t,frames(t).length-1);
      comparison=`<details class="ci-comparison" ${c.applied?'open':''}><summary>修改前后 · 最终结果核对</summary><div class="ci-compare-head"><span>对照参数 ${esc(JSON.stringify(c.baseline.params))}</span><span>当前参数 ${esc(JSON.stringify(t.params))}</span></div>${after.cells.slice(0,10).map(cell=>{const old=before.cells.find(x=>x.id===cell.id);return `<div class="ci-compare-row"><span>${esc(cell.label)}</span><code>${esc(old?fmt(old.value):'该格未出现在对照中')}</code><code>${esc(fmt(cell.value))}</code></div>`;}).join('')}</details>`;
    }
    let verdict='';
    if(experiment&&c.applied){
      const verified=experiment.verify(c.baseline,t);
      verdict=`<p class="ci-verdict" role="status" data-ci-verified="${verified===true}">${verified===true?'本次计算符合预期':'本次计算与预期不一致，请检查条件'}：${esc(experiment.expectation)}</p>`;
    }
    return `<section class="ci-panel" aria-label="逐格计算与参数验证" data-ci-course="${esc(course)}"><div class="ci-kicker">逐格核对 · ${session.index+1} / ${frames(t).length}</div><h3>${esc(view.title)}</h3><p class="ci-summary">${esc(view.summary||m.intuition)}</p><div class="ci-cells" aria-label="本步可检查的结果格">${view.cells.map(cell=>`<button type="button" data-ci-action="cell" data-ci-value="${esc(cell.id)}" ${cell.id===selected.id?'aria-current="step"':''}><span>${esc(cell.label)}</span><code>${esc(fmt(cell.value))}</code></button>`).join('')}</div><div class="ci-formula"><strong>${esc(selected.label)} · 怎样得到</strong><pre>${esc(selected.formula)}</pre>${selected.inputs?`<dl>${Object.entries(selected.inputs).map(([key,val])=>`<dt>${esc(key)}</dt><dd>${esc(fmt(val))}</dd>`).join('')}</dl>`:''}${selected.note?`<p>${esc(selected.note)}</p>`:''}</div><details class="ci-stages" ${c.stagesOpen?'open':''}><summary>直接查看其他计算步骤</summary><div>${frames(t).map((f,i)=>button((i+1)+' '+f.title,'step',i,i===session.index)).join('')}</div></details><div class="ci-experiments"><strong>先预测，再改条件核对</strong><div>${(m.experiments||[]).map(e=>button(e.label,'prepare',e.id)).join('')}</div>${experiment?`<div class="ci-prediction"><p>${esc(experiment.prediction)}</p><p>准备修改：${esc(JSON.stringify(experiment.before))} → ${esc(JSON.stringify(experiment.after))}</p>${button('应用变化并核对','apply')}</div>`:''}${verdict}${comparison}<div class="ci-tools">${button('将当前输入设为对照','pin')}${button('恢复默认输入','reset')}</div></div></section>`;
  }
  return {inspect,render,perform,descriptor,frames,format:fmt};
});
