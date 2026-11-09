/* Shared lesson player for both the original workbench and the integrated map. */
(function(global){
 'use strict';
 const definitions=new Map(),states=new Map(),players=new Map();let serial=0;
 const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>typeof v==='number'?Number(v.toFixed(3)).toString():Array.isArray(v)?JSON.stringify(v):String(v);
 function variableText(value){
  const compact=v=>JSON.stringify(v)??String(v);
  if(Array.isArray(value))return value.some(v=>v!==null&&typeof v==='object')?'[\n'+value.map(v=>'  '+compact(v)).join(',\n')+'\n]':compact(value);
  if(value!==null&&typeof value==='object')return '{\n'+Object.entries(value).map(([key,v])=>'  '+JSON.stringify(key)+': '+compact(v)).join(',\n')+'\n}';
  return compact(value);
 }
 function render(teaching,title='',options={}){
  if(!teaching||!TeachingModels.models[teaching.model])return '';
  const token='teaching-'+(++serial);definitions.set(token,{...teaching,title});
  const state=states.get(teaching.id)||{params:{},index:0};states.set(teaching.id,state);
  return `<section class="teaching-player" data-teaching="${token}" aria-label="${e(title)}分步教学"><header class="teaching-heading"><span>可操作教学 · ${e(options.label||'先预测，再验证')}</span><h3>${e(teaching.question)}</h3></header>
  <div class="teaching-workspace" tabindex="0" aria-label="左侧动画与控制，右侧代码与变量；窄屏可横向查看"><div class="teaching-grid"><div class="teaching-visual">
  <div class="teaching-controls"><button type="button" data-teach="previous" aria-label="上一步">← 上一步</button><button type="button" data-teach="play">播放演示</button><button type="button" data-teach="next">下一步 →</button><button type="button" data-teach="reset">重置</button><span class="teaching-position" aria-live="polite"></span></div><div class="teaching-progress" aria-label="教学步骤"></div>
  <div class="teaching-scene" aria-label="模型画面"></div><details class="teaching-settings"><summary>修改输入参数</summary><div class="teaching-parameters"></div></details></div>
  <div class="teaching-explanation" tabindex="0" role="region" aria-label="当前步骤、代码与变量"><div class="teaching-step-summary"><div class="teaching-step-title"></div><p class="teaching-step-text"></p></div><pre class="teaching-code" tabindex="0" aria-label="当前步骤的示例代码"></pre><dl class="teaching-variables" tabindex="0" aria-label="当前步骤变量"></dl></div></div></div>
  <details class="teaching-practice"><summary>独立练习与验证</summary><form class="teaching-exercise"><label></label><div><input type="number" step="any" required aria-label="独立验证答案"><button type="submit">验证预测</button><button type="button" data-teach="answer">查看解析</button></div><p class="teaching-feedback" role="status">先改一个参数，再填写你的预测。</p></form></details><div class="teaching-footer"><small class="teaching-boundary"></small><button type="button" data-teach="record">保存这次观察</button></div></section>`;
 }
 function svg(scene){
  const base=(body,label)=>`<svg viewBox="0 0 520 240" role="img" aria-label="${e(label)}">${body}</svg>`;
  if(scene.kind==='chart'){
   const nums=scene.series.flat().filter(v=>v!==null&&Number.isFinite(v)),lo=Math.min(0,...nums),hi=Math.max(1,...nums),span=hi-lo,colors=['#7961d4','#2f9c95','#d18b30'];
   const count=Math.max(...scene.series.map(s=>s.length));
   const path=scene.series.map((s,j)=>{
    let line='';s.forEach((n,i)=>{if(n===null){line+=' ';return;}const x=56+(count===1?190:i/(count-1)*420),y=193-(n-lo)/span*150;line+=(i===0||s[i-1]===null?'M':'L')+x.toFixed(2)+','+y.toFixed(2)+' ';});
    return `<path d="${line}" fill="none" stroke="${colors[j%3]}" stroke-width="3"/>`+(count<=10?s.map((n,i)=>n===null?'':`<circle cx="${56+(count===1?190:i/(count-1)*420)}" cy="${193-(n-lo)/span*150}" r="5" fill="${colors[j%3]}"/>`).join(''):'');
   }).join('');
   return base(`<path d="M55 30V194H490" fill="none" stroke="#cecbd9"/><text x="7" y="40">${e(fmt(hi))}</text><text x="7" y="196">${e(fmt(lo))}</text>${path}${scene.labels.map((s,i)=>`<rect x="${56+i*145}" y="216" width="12" height="4" fill="${colors[i%3]}"/><text x="${74+i*145}" y="223">${e(s)}</text>`).join('')}`,scene.labels.join('与'));
  }
  if(scene.kind==='circuit'){
   const color=scene.current?'#7961d4':'#b9b5c5';
   return base(`<path d="M90 80H155m60 0H400V185H90V80" stroke="${color}" stroke-width="3" fill="none"/><path d="M155 80l8 -10 12 20 12 -20 12 20 12 -10h4" stroke="#776686" stroke-width="3" fill="none"/><circle cx="90" cy="135" r="23" fill="#faf9fd" stroke="#9a8dad"/><text x="76" y="140">${e(scene.voltage)}V</text><text x="148" y="48">R = ${e(scene.resistance)} Ω</text><text x="190" y="220">I = ${e(fmt(scene.current*1000))} mA</text>${!scene.closed?'<path d="M310 80h40" stroke="#faf9fd" stroke-width="9"/><path d="M310 80l35 -23" stroke="#b65c5c" stroke-width="3"/>':`<circle cx="400" cy="130" r="${scene.led?15:5}" fill="${scene.current?'#d4ba65':'#cecbd9'}"/>`}${scene.divider?'<path d="M285 80V185" stroke="#9b8faf" stroke-width="3"/><text x="300" y="125">下支路与负载</text>':''}`, '电源、电阻与闭合路径');
  }
  if(scene.kind==='cad'){
   const w=scene.width*4,h=100,x=260-w/2,r=scene.hole*2;
   return base(`${scene.solid?`<path d="M${x} 70l18 -16h${w}v100l-18 16" fill="#d7ceec" stroke="#9681ba"/>`:''}<rect x="${x}" y="70" width="${w}" height="${h}" rx="5" fill="#e7e0f3" stroke="#9784b9" stroke-width="2"/><circle cx="260" cy="120" r="${r}" fill="#faf9fd" stroke="#9784b9" stroke-width="2"/><path d="M${x} 190H${x+w}" stroke="#998bab"/><text x="220" y="212">宽 ${e(scene.width)} mm</text><text x="200" y="35">孔径 ${e(scene.hole)} mm · 轴径 ${e(fmt(scene.shaft))} mm</text>`,'带尺寸约束与中心孔的零件');
  }
  if(scene.kind==='transform'){
   const point=scene.result,x=260+point[0]*55,y=145-point[1]*55,rx=260+scene.rotated[0]*55,ry=145-scene.rotated[1]*55;
   return base(`<path d="M55 145H475M260 25V220" stroke="#d4cedd"/><path d="M260 145L${rx} ${ry}L${x} ${y}" stroke="#7961d4" stroke-width="3" fill="none"/><circle cx="${rx}" cy="${ry}" r="5" fill="#2f9c95"/><circle cx="${x}" cy="${y}" r="7" fill="#7961d4"/><text x="${Math.min(x+12,400)}" y="${Math.max(ry-12,20)}">(${e(fmt(point[0]))}, ${e(fmt(point[1]))})</text><text x="445" y="166">x</text><text x="272" y="30">y</text><text x="35" y="230">旋转 ${e(scene.angle)}° → 世界坐标平移 x ${e(scene.tx)}</text>`,'旋转和平移后的二维点');
  }
  if(scene.kind==='camera')return base(`<path d="M80 120L450 45M80 120L450 195M300 30V210" stroke="#b8b0c7" fill="none"/><circle cx="80" cy="120" r="8" fill="#7961d4"/><circle cx="${Math.min(490,80+scene.u*.5)}" cy="85" r="8" fill="#2f9c95"/><text x="40" y="155">光心</text><text x="270" y="230">投影 u = ${e(fmt(scene.u))} px</text>`,'针孔相机与像素投影');
  const labels=scene.labels||[],cols=Math.min(4,labels.length),w=460/cols;
  return base(labels.map((label,i)=>{const col=i%cols,row=Math.floor(i/cols),x=30+col*w,y=38+row*83;return `${col?`<path d="M${x-12} ${y+25}h10" stroke="#b4a7cd" stroke-width="2"/>`:''}<rect x="${x}" y="${y}" width="${w-14}" height="54" rx="10" fill="${i===scene.current?'#e7dff6':'#f1eef6'}" stroke="${i===scene.current?'#7961d4':'#d7d0e2'}" stroke-width="${i===scene.current?2:1}"/><text x="${x+(w-14)/2}" y="${y+31}" text-anchor="middle">${e(label)}</text>`;}).join('')+`<text x="260" y="222" text-anchor="middle">${e(scene.status||'沿着当前步骤，观察数据怎样改变')}</text>`,'数据流程：'+labels.join('，'));
 }
 function stop(el){const p=players.get(el);if(p){clearTimeout(p.timer);p.playing=false;const button=el.querySelector('[data-teach=play]');if(button)button.textContent='播放演示';}}
 function parameters(el,model,state){
  el.querySelector('.teaching-parameters').innerHTML=model.controls.map(c=>`<label><span>${e(c.label)} <output>${c.options?'':e(fmt(state.params[c.key]??c.value))+' '+e(c.unit)}</output></span>${c.options?`<select data-param="${c.key}">${c.options.map((s,i)=>`<option value="${i}" ${(state.params[c.key]??c.value)===i?'selected':''}>${e(s)}</option>`).join('')}</select>`:`<input type="range" data-param="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${state.params[c.key]??c.value}" aria-label="${e(c.label)}">`}</label>`).join('');
 }
 function paint(el,full=false){
  const p=players.get(el);if(!p)return;const {definition:d,state:s}=p,result=TeachingModels.compute(d,s.params);s.params=result.params;s.index=Math.min(s.index,result.frames.length-1);p.result=result;
  const frame=result.frames[s.index];
  el.querySelector('.teaching-scene').innerHTML=svg(frame.scene);
  el.querySelector('.teaching-step-title').textContent=frame.title;
  el.querySelector('.teaching-step-text').textContent=frame.text;
  el.querySelector('.teaching-code').textContent=frame.code;
  el.querySelector('.teaching-variables').innerHTML=Object.entries(frame.vars).map(([key,value])=>`<div><dt>${e(key)}</dt><dd>${e(variableText(value))}</dd></div>`).join('');
  el.querySelector('.teaching-position').textContent=`${s.index+1} / ${result.frames.length}`;
  el.querySelector('[data-teach=previous]').disabled=s.index===0;
  el.querySelector('[data-teach=next]').disabled=s.index===result.frames.length-1;
  el.querySelector('.teaching-progress').innerHTML=result.frames.map((frame,i)=>`<button type="button" data-teach="step" data-index="${i}" aria-label="步骤 ${i+1}：${e(frame.title)}" aria-current="${s.index===i?'step':'false'}"></button>`).join('');
  el.querySelector('.teaching-exercise label').textContent=result.exercise.question+(result.exercise.unit?'（'+result.exercise.unit+'）':'');
  el.querySelector('.teaching-boundary').textContent=result.boundary;
  if(full)parameters(el,TeachingModels.models[d.model],s);
 }
 function bind(scope=document){
  for(const [el] of players)if(!el.isConnected){stop(el);players.delete(el);}
  for(const el of scope.querySelectorAll('.teaching-player[data-teaching]')){
   if(players.has(el))continue;
   const definition=definitions.get(el.dataset.teaching);if(!definition)continue;definitions.delete(el.dataset.teaching);
   const state=states.get(definition.id);players.set(el,{definition,state,playing:false});paint(el,true);
   el.addEventListener('input',event=>{
    const input=event.target.closest('[data-param]');if(!input)return;stop(el);state.params[input.dataset.param]=Number(input.value);state.index=0;paint(el);const label=input.closest('label'),control=TeachingModels.models[definition.model].controls.find(c=>c.key===input.dataset.param);if(!control.options)label.querySelector('output').textContent=fmt(input.value)+' '+control.unit;
    el.querySelector('.teaching-feedback').textContent='参数已改变，请重新预测。';el.querySelector('.teaching-exercise input').value='';
   });
   el.addEventListener('click',async event=>{
    const button=event.target.closest('[data-teach]');if(!button)return;const action=button.dataset.teach,p=players.get(el);
    if(action==='play'){
     if(p.playing){stop(el);return;}p.playing=true;if(state.index>=p.result.frames.length-1)state.index=0;paint(el);button.textContent='暂停演示';
     const next=()=>{if(!el.isConnected||document.hidden||!p.playing){stop(el);return;}if(state.index>=p.result.frames.length-1){stop(el);return;}state.index++;paint(el);p.timer=setTimeout(next,1400);};p.timer=setTimeout(next,1400);return;
    }
    if(['previous','next','reset','step'].includes(action)){stop(el);state.index=action==='reset'?0:action==='step'?Number(button.dataset.index):Math.min(p.result.frames.length-1,Math.max(0,state.index+(action==='next'?1:-1)));if(action==='reset'){state.params={};paint(el,true);}else paint(el);return;}
    if(action==='answer'){el.querySelector('.teaching-feedback').textContent='按当前参数计算：'+fmt(p.result.exercise.expected)+' '+p.result.exercise.unit+'。请对照上方代码，再换一组参数独立验证。';return;}
    if(action==='record'){
     const parameters=Object.fromEntries(p.result.controls.map(c=>[c.label,c.options?c.options[state.params[c.key]]:fmt(state.params[c.key])+(c.unit?' '+c.unit:'')]));
     const snapshot={lesson:definition.title,parameters,step:p.result.frames[state.index].title,variables:JSON.parse(JSON.stringify(p.result.frames[state.index].vars))};
     snapshot.description='课程：'+snapshot.lesson+'\n当前步骤：'+snapshot.step+'\n\n本次参数：\n'+Object.entries(parameters).map(([k,v])=>k+'：'+v).join('\n')+'\n\n教学模型观察：\n'+Object.entries(snapshot.variables).map(([k,v])=>k+'：'+fmt(v)).join('\n');
     const body=snapshot.description;
     try{
      if(global.api){const response=await api('journal/automatic',{source_key:'lesson:teaching:'+definition.id+':snapshot',entry:{title:'教学观察：'+definition.title,track:definition.route,learning_route:definition.route,stage:definition.stage,kind:'experiment',evidence_type:'calculation',body,links:[]}});if(global.mergeAutomaticEntry)mergeAutomaticEntry(response.entry);}
      else if(global.LBBTeachingRecord){await global.LBBTeachingRecord(definition,snapshot);}
      else{el.dispatchEvent(new CustomEvent('teaching-record',{bubbles:true,detail:{definition,snapshot}}));el.querySelector('.teaching-feedback').textContent='观察已准备好，请在学习记录中保存。';return;}
      el.querySelector('.teaching-feedback').textContent='已保存当前参数与观察；可在学习记录补充解释。';
     }catch(error){el.querySelector('.teaching-feedback').textContent='保存未完成：'+error.message;}
    }
   });
   el.querySelector('.teaching-exercise').addEventListener('submit',event=>{event.preventDefault();const p=players.get(el),correct=TeachingModels.check(p.result,el.querySelector('.teaching-exercise input').value);el.querySelector('.teaching-feedback').textContent=correct?'数值与当前模型一致。再解释结果为什么变化，并换一组输入复现。':'与当前模型不一致。检查单位、当前参数和上方计算步骤后再试。';});
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const [el] of players)stop(el);});
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;bind();});});
 document.addEventListener('DOMContentLoaded',()=>{bind();observer.observe(document.body,{childList:true,subtree:true});});
 global.CourseTeaching={render,bind,models:TeachingModels,definitions,states};
})(globalThis);
