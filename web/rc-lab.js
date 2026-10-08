/* Ideal RC charging from an initially uncharged capacitor. Time is in seconds. */
const RCModel={solve(vin,r,c,t){
 if(![vin,r,c,t].every(Number.isFinite)||vin<=0||r<=0||c<=0||t<0)throw Error('RC参数无效');
 const tau=r*c,decay=Math.exp(-t/tau);
 return {tau,voltage:vin*(1-decay),current:vin/r*decay,charge:c*vin*(1-decay),energy:.5*c*(vin*(1-decay))**2};
}};
if(typeof module!=='undefined')module.exports=RCModel;
if(typeof document!=='undefined'){
 const concepts={basics:'从零点亮 LED',dc:'分压与负载',measurement:'接线与测量',switching:'开关与驱动',rc:'电容与时间',logic:'逻辑与按键',interface:'程序输入输出',soldering:'连接质量检查',exploration:'电磁感应'};
 let concept=new URLSearchParams(location.search).get('lesson')||studyStore.read('radar-electronics-concept','basics');if(!concepts[concept])concept='basics';
 let rc={vin:5,r:10000,c:100e-6,t:0,running:false},frame=0,previous=0;
 function setElectronicsConcept(id){stopElectronicsLesson();concept=concepts[id]?id:'dc';rc.running=false;cancelAnimationFrame(frame);studyStore.write('radar-electronics-concept',concept);const url=new URL(location.href);url.searchParams.set('lesson',concept);history.replaceState(null,'',url);render()}
 function renderInteractiveLab(){const route=S.electronics_paths?.paths.find(p=>p.id===studyStore.read('radar-electronics-path','robotics'))||S.electronics_paths?.paths[0];const priority=route?.core.map(id=>concepts[id==='capacitors'?'rc':id]).join(' → ');return `<div id="interactive-lessons"><div class="el-library-heading"><span class="study-kicker">爱上电子学 · 主题练习</span><h2>选一个问题，动手验证。</h2><p>先点亮一盏灯，再按目标选学八个知识单元。教材中的具体实验请对照原书，网页不代表逐项实物复现。</p></div>${concept!=='basics'?'<div class="beginner-start"><p><b>第一次接触电路？</b> 先认识回路、电阻与 LED，再进入当前主题。</p><button class="btn" data-concept="basics">从零点亮第一盏灯</button></div>':''}<p class="el-route-hint">${esc(route?.name||'机器人入门')} · ${route?.id==='book'?'按兴趣探索各主题。':'建议先学：'+esc(priority||'')+'；其他主题按需补充。'}</p><div class="concept-picker" role="group" aria-label="电子学交互练习">${Object.entries(concepts).map(([id,name])=>`<button type="button" class="btn ${concept===id?'primary':''}" data-concept="${id}" aria-pressed="${concept===id}">${name}</button>`).join('')}</div>${renderLearningContext('lab',concept)}${renderBeginnerGuide(concept)}${concept==='basics'?renderBasicCircuit():concept==='dc'?renderCircuitLab():concept==='rc'?renderRCLab():renderElectronicsLesson(concept)}${renderBeginnerNavigation()}${renderBeginnerToolkit()}</div>`}

 function renderRCLab(){return `<section class="panel circuit-lab rc-lab" aria-labelledby="rc-title"><div class="lab-heading"><div><span class="study-kicker">先预测，再播放，再解释</span><h2 id="rc-title">电容为什么不会瞬间充满？</h2></div><span class="badge">理想 RC 充电 · 初始电压为零</span></div>
 <div class="rc-live" id="rc-live" role="group" aria-label="当前计算结果"></div>
 <div class="lab-workspace"><div class="lab-controls">
 <label class="lab-control" for="rc-r"><span>电阻 R<output id="rc-r-value"></output></span><input id="rc-r" data-rc-input="r" type="range" min="1" max="50" step="1" value="${rc.r/1000}"></label>
 <label class="lab-control" for="rc-c"><span>电容 C<output id="rc-c-value"></output></span><input id="rc-c" data-rc-input="c" type="range" min="10" max="500" step="10" value="${rc.c*1e6}"></label>
 <label class="lab-control" for="rc-time"><span>观察到的时间<output id="rc-time-value"></output></span><input id="rc-time" data-rc-input="time" type="range" min="0" max="5" step="0.01" value="${rc.t/(rc.r*rc.c)}"></label>
 <div class="actions"><button class="btn primary" data-rc-action="play" id="rc-play">播放充电</button><button class="btn" data-rc-action="restart">从零开始</button><button class="btn" data-rc-action="step">前进 0.5τ</button></div><p>先猜：电阻或电容增大后，充到相同电压会更快还是更慢？</p><p>τ = R × C，表示时间尺度。拖动时间可检查任意时刻；播放按实际模型时间推进，较慢时可拖动观察。</p></div>
 <div class="rc-visual"><div id="rc-diagram"></div><div id="rc-curve"></div></div></div>
 <p class="lab-insight" id="rc-insight"></p><div class="lab-bottom"><p>操作后的模型观察会自动保存到学习记录。板边色条表示极板电荷的相对量，电荷不会直接穿过电容介质；移动点表示常规电流方向，速度是视觉示意。曲线来自理想模型，未包含漏电、内阻及误差。</p><button class="btn primary" data-rc-action="record">保存当前观察</button></div></section>`}
 function rcUpdate(){
 const root=document.querySelector('.rc-lab');if(!root)return;
 const m=RCModel.solve(rc.vin,rc.r,rc.c,rc.t),fraction=m.voltage/rc.vin;
 document.getElementById('rc-r-value').textContent=rc.r/1000+' kΩ';document.getElementById('rc-c-value').textContent=(rc.c*1e6).toFixed(0)+' μF';document.getElementById('rc-time-value').textContent=rc.t.toFixed(2)+' s';
 document.getElementById('rc-time').value=rc.t/m.tau;
 document.getElementById('rc-live').innerHTML=`<span>电容电压 <b>${m.voltage.toFixed(2)} V</b></span><span>电流 <b>${(m.current*1000).toFixed(3)} mA</b></span><span>τ <b>${m.tau.toFixed(2)} s</b></span>`;
 const points=Array.from({length:9},(_,i)=>{const d=(rc.t*70+i*32)%245;return d<160?{x:80+d,y:55}:{x:240,y:55+d-160}});
 document.getElementById('rc-diagram').innerHTML=`<svg class="rc-svg" viewBox="0 0 460 245" role="img" aria-label="RC充电电路，电容电压${m.voltage.toFixed(2)}伏"><path d="M80 55H130M180 55H240V150M240 172V215H80V155M80 105V55" class="rc-wire"/><circle cx="80" cy="130" r="25" class="rc-component"/><text x="74" y="122">+</text><text x="74" y="147">−</text><rect x="130" y="44" width="50" height="22" class="rc-component"/><path d="M208 150H272M208 172H272" class="rc-plate"/><rect x="208" y="143" width="${64*fraction}" height="5" class="rc-charge"/><rect x="208" y="175" width="${64*fraction}" height="5" class="rc-charge"/><text x="25" y="132">5 V</text><text x="125" y="30">R ${rc.r/1000} kΩ</text><text x="290" y="145">C ${(rc.c*1e6).toFixed(0)} μF</text><text x="290" y="174">${m.voltage.toFixed(2)} V</text><text x="120" y="240">从 0 V 开始充电</text>${rc.running&&!matchMedia('(prefers-reduced-motion: reduce)').matches?points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" class="rc-particle"/>`).join(''):''}</svg>`;
 const x=q=>55+q*72,y=v=>170-v/rc.vin*135;
 const curve=Array.from({length:101},(_,i)=>{const t=i/20*m.tau;return `${i?'L':'M'}${x(i/20)},${y(RCModel.solve(rc.vin,rc.r,rc.c,t).voltage)}`}).join(' ');
 document.getElementById('rc-curve').innerHTML=`<svg class="rc-svg rc-plot" viewBox="0 0 460 215" role="img" aria-label="电容电压随时间上升曲线，当前时间${rc.t.toFixed(2)}秒"><path d="M55 35V170H415" class="rc-wire"/><path d="M55 35H415" class="rc-reference"/><text x="13" y="40">5 V</text><text x="13" y="175">0 V</text><text x="55" y="197">0 s</text><text x="130" y="197">τ ${(m.tau).toFixed(2)} s</text><text x="310" y="197">5τ ${(5*m.tau).toFixed(2)} s</text><path d="${curve}" class="rc-line"/><path d="M${x(rc.t/m.tau)} 35V170" class="rc-cursor"/><circle cx="${x(rc.t/m.tau)}" cy="${y(m.voltage)}" r="6" class="rc-particle"/></svg>`;
 document.getElementById('rc-play').textContent=rc.running?'暂停':rc.t>=5*m.tau?'重新播放':'播放充电';
 document.getElementById('rc-insight').textContent=`t = ${(rc.t/m.tau).toFixed(2)}τ：电容电压达到电源电压的 ${(fraction*100).toFixed(1)}%。电压差缩小，电流随之减小；5τ 时约为 99.3%，并非数学上的完全充满。`;
 }
 function rcTick(now){if(!rc.running||!document.querySelector('.rc-lab')){rc.running=false;return}if(previous)rc.t=Math.min(5*rc.r*rc.c,rc.t+Math.min(.1,(now-previous)/1000));previous=now;if(rc.t>=5*rc.r*rc.c)rc.running=false;rcUpdate();if(rc.running)frame=requestAnimationFrame(rcTick)}
 function recordRC(action,quiet=true){const m=RCModel.solve(rc.vin,rc.r,rc.c,rc.t);return saveAutomaticJournal('rc:'+action,{track:'robotics',learning_route:'robotics',stage:window.learningContext?.('lab','rc')?.stage||'robotics-1',kind:'experiment',evidence_type:'calculation',title:'RC充电：电容与时间',question:'改变 R 或 C，达到相同电压需要的时间怎样变化？',procedure:`理想模型：输入5V，初始电容电压0V；R=${rc.r/1000}kΩ，C=${(rc.c*1e6).toFixed(0)}μF，t=${rc.t.toFixed(2)}s。`,result:`计算电容电压 ${m.voltage.toFixed(2)}V，电流 ${(m.current*1000).toFixed(3)}mA，τ=${m.tau.toFixed(2)}s；不是实物测量。`,conclusion:'',links:[]},quiet);}
 function rcBind(){rcUpdate();electronicsBind();basicBind();beginnerBind()}
 function adjustRC(el){const k=el.dataset.rcInput;if(!k)return;rc.running=false;cancelAnimationFrame(frame);if(k==='time')rc.t=Number(el.value)*rc.r*rc.c;else{rc[k]=Number(el.value)*(k==='r'?1000:1e-6);rc.t=0}rcUpdate();}
 document.addEventListener('input',event=>adjustRC(event.target));
 document.addEventListener('change',event=>{if(!event.target.dataset.rcInput)return;adjustRC(event.target);recordRC('change');});
 document.addEventListener('click',event=>{
  const conceptButton=event.target.closest('[data-concept]');if(conceptButton){setElectronicsConcept(conceptButton.dataset.concept);if(conceptButton.hasAttribute('data-beginner-start'))document.getElementById('beginner-title')?.scrollIntoView({block:'start'});return}
  const b=event.target.closest('[data-rc-action]');if(!b)return;const a=b.dataset.rcAction;
  if(a==='record'){rc.running=false;cancelAnimationFrame(frame);rcUpdate();recordRC('snapshot',false);return}
  cancelAnimationFrame(frame);
  if(a==='restart'){rc.running=false;rc.t=0}
  if(a==='step'){rc.running=false;rc.t=Math.min(5*rc.r*rc.c,rc.t+.5*rc.r*rc.c)}
  if(a==='play'){
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){rc.running=false;rc.t=Math.min(5*rc.r*rc.c,rc.t+.5*rc.r*rc.c)}
   else{rc.running=!rc.running;if(rc.running){if(rc.t>=5*rc.r*rc.c)rc.t=0;previous=0;frame=requestAnimationFrame(rcTick)}}
  }
  rcUpdate();recordRC(a==='play'?(rc.running?'play':'pause'):a);
 });
 window.setRCPreset=values=>{const next={vin:5,r:10000,c:100e-6,t:0,running:false,...values};RCModel.solve(next.vin,next.r,next.c,next.t);if(next.vin!==5||next.r<1000||next.r>50000||next.c<10e-6||next.c>500e-6||next.t>5*next.r*next.c)throw Error('RC示例范围无效');cancelAnimationFrame(frame);rc={vin:next.vin,r:next.r,c:next.c,t:next.t,running:false};render();};
 window.renderInteractiveLab=renderInteractiveLab;window.setElectronicsConcept=setElectronicsConcept;window.rcBind=rcBind;
}
