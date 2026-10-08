/* Original interactive DC model; observed interactions save locally without an LLM. */
const CircuitModel = {
  solve({vin, r1, r2, rl, loaded = true}) {
    if (![vin, r1, r2, rl].every(Number.isFinite) || vin < 0 || [r1,r2,rl].some(v=>v<=0)) throw Error('电压不能为负，电阻必须为正数');
    const lower = loaded ? 1/(1/r2+1/rl) : r2;
    const vout = vin*lower/(r1+lower), idle = vin/(r1+r2);
    return {vout, idle, input:vin/(r1+lower), load:loaded?vout/rl:0,
      open:vin*r2/(r1+r2), rout:1/(1/r1+1/r2), drop:vin?1-vout/(vin*r2/(r1+r2)):0};
  },
  scenario(cause, removed=false) {
    return {vin:cause==='supply'?10/3:5,r1:cause==='resistor'?20000:10000,
      r2:10000,rl:10000,loaded:cause==='load'&&!removed};
  }
};
if (typeof module !== 'undefined') module.exports=CircuitModel;

if (typeof document !== 'undefined') {
  const labKey='radar-circuit-lab-v1';
  let lab={mode:'load',vin:5,r1:10000,r2:10000,rl:10000,loaded:true,scale:4,cause:'load',measured:false,removed:false,resistance:false};
  const saved=studyStore.read(labKey,null);
  if(saved&&['load','diagnosis','tradeoff'].includes(saved.mode)) {
    for(const k of ['vin','r1','r2','rl','scale']) if(Number.isFinite(saved[k])&&saved[k]>=({vin:.1,r1:100,r2:100,rl:100,scale:2}[k])&&saved[k]<=({vin:12,r1:50000,r2:50000,rl:100000,scale:4}[k])) lab[k]=saved[k];
    lab.mode=saved.mode;lab.loaded=saved.loaded!==false;
    if(['load','supply','resistor'].includes(saved.cause)) lab.cause=saved.cause;
  }
  const labLabels={load:'负载影响',diagnosis:'故障排查',tradeoff:'改善代价'};
  const volts=v=>v.toFixed(2)+' V';
  const current=a=>(a*1000).toFixed(3)+' mA';
  const ohms=r=>r>=1000?(r/1000).toFixed(1)+' kΩ':r.toFixed(0)+' Ω';
  function labParams(){
    if(lab.mode==='diagnosis')return CircuitModel.scenario(lab.cause,lab.removed);
    if(lab.mode==='tradeoff'){const r=10**lab.scale;return {vin:5,r1:r,r2:r,rl:10000,loaded:true}}
    return {vin:lab.vin,r1:lab.r1,r2:lab.r2,rl:lab.rl,loaded:lab.loaded};
  }
  function range(name,label,min,max,step,value,unit){
    return `<label class="lab-control" for="lab-${name}"><span>${label}<output id="lab-${name}-value">${value} ${unit}</output></span><input id="lab-${name}" data-lab-input="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  }
  function renderCircuitLab(){
    return `<section id="circuit-lab" class="panel circuit-lab" aria-labelledby="lab-title">
      <div class="lab-heading"><div><span class="study-kicker">动手改变，观察结果</span><h2 id="lab-title">一个电路，三个值得问的问题</h2></div><span class="badge">理想直流模型 · 计算演示</span></div>
      <div class="lab-tabs" role="group" aria-label="演示场景">${Object.entries(labLabels).map(([id,label])=>`<button type="button" class="btn" data-lab-mode="${id}" aria-pressed="${lab.mode===id}">${label}</button>`).join('')}</div>
      <div class="lab-readout" id="lab-readout" aria-hidden="true"></div><div class="lab-workspace"><div class="lab-controls" id="lab-controls">${labControls()}</div><div class="lab-visual"><div id="lab-diagram"></div><div class="lab-metrics" id="lab-metrics"></div></div></div>
      <p id="lab-insight" class="lab-insight" role="status"></p>
      <div class="lab-bottom"><p>操作后的模型观察会自动保存到学习记录。仅计算理想电阻的稳态结果，不含元件误差、动态过程或硬件测量。</p><button type="button" class="btn primary" data-lab-action="record">保存当前观察</button></div>
    </section>`;
  }
  function labControls(){
    if(lab.mode==='diagnosis') return `<h3>为什么都读到 1.67 V？</h3><label class="field" for="lab-cause">选择待比较的工况</label><select id="lab-cause" data-lab-input="cause"><option value="load" ${lab.cause==='load'?'selected':''}>A · 有额外负载</option><option value="supply" ${lab.cause==='supply'?'selected':''}>B · 输入电压下降</option><option value="resistor" ${lab.cause==='resistor'?'selected':''}>C · 上方电阻装错</option></select><p>先只看输出，再选择一次检查。比较哪项检查能排除候选原因。</p><div class="lab-checks"><button class="btn" type="button" data-lab-action="measure" ${lab.measured?'disabled':''}>① 测量实际输入</button><button class="btn" type="button" data-lab-action="remove" ${lab.removed?'disabled':''}>② 移除额外负载</button><button class="btn" type="button" data-lab-action="resistance" ${lab.resistance?'disabled':''}>③ 检查 R1 阻值</button></div><p class="note">只有 A 接有额外负载；B、C 中移除负载不会改变电路。三个候选工况不涵盖所有故障。</p>`;
    if(lab.mode==='tradeoff')return `<h3>相同比例，不同代价</h3><p>输入固定为 5 V，R1 = R2，负载固定为 10 kΩ。</p>${range('scale','同时改变 R1 / R2',2,4,.05,lab.scale,'（对数刻度）')}<p>往左减小电阻，比较接负载的输出与空载时的电流。电源与元件的承受能力需要另外检查。</p><button class="btn" type="button" data-lab-preset="efficient">10 kΩ · 低空载电流</button><button class="btn" type="button" data-lab-preset="stiff">100 Ω · 较小输出下降</button>`;
    return `<h3>先预测，再改变一个条件</h3>${range('vin','输入电压',.1,12,.1,lab.vin,'V')}${range('r1','上方电阻 R1',.1,50,.1,lab.r1/1000,'kΩ')}${range('r2','下方电阻 R2',.1,50,.1,lab.r2/1000,'kΩ')}<label class="lab-toggle"><input type="checkbox" id="lab-loaded" data-lab-input="loaded" ${lab.loaded?'checked':''}>接入额外负载</label>${range('rl','负载电阻 RL',.1,100,.1,lab.rl/1000,'kΩ')}<p>只调整一个条件，先想输出会怎样变化，再看计算结果。</p>`;
  }
  function circuitSvg(p,m){
    const diagnosis=lab.mode==='diagnosis', input=diagnosis&&!lab.measured?'待测输入':volts(p.vin);
    const upper=diagnosis&&!lab.resistance?'R1 待检查':'R1 '+ohms(p.r1);
    return `<svg class="lab-svg" viewBox="0 0 460 360" role="img" aria-labelledby="circuit-title circuit-desc"><title id="circuit-title">实时分压电路</title><desc id="circuit-desc">${esc(input)}，上方电阻与下方电阻串联，负载与下方电阻并联。输出 ${volts(m.vout)}。</desc>
      <g class="lab-wires"><path d="M130 45V75M130 125V175M130 175V215M130 265V310M130 175H330V195M330 265V310H130"/><path d="M130 310V325M110 325H150M117 333H143M124 341H136"/></g>
      <path d="${p.loaded?'M330 195V215':'M330 195L344 206'}" class="lab-switch"/>
      <circle cx="130" cy="45" r="5" class="lab-node"/><rect x="119" y="75" width="22" height="50" class="lab-resistor"/><rect x="119" y="215" width="22" height="50" class="lab-resistor"/>
      <g class="${p.loaded?'':'lab-disconnected'}"><rect x="319" y="215" width="22" height="50" class="lab-resistor"/><text x="355" y="237">RL</text><text x="355" y="258">${ohms(p.rl)}</text></g>
      
      <circle cx="130" cy="175" r="6" class="lab-node"/><path d="M130 175H70" class="lab-output-wire"/>
      <text x="158" y="49">${input}</text><text x="158" y="106">${upper}</text><text x="158" y="243">R2 ${ohms(p.r2)}</text>
      <text x="18" y="158" class="lab-value">${volts(m.vout)}</text><text x="18" y="199">输出</text><text x="158" y="337">共同参考地</text><text x="285" y="302">${p.loaded?'负载已接入':'负载已断开'}</text>
    </svg>`;
  }
  function labUpdate(){
    const root=document.getElementById('circuit-lab');if(!root)return;
    const p=labParams(),m=CircuitModel.solve(p);
    root.querySelector('#lab-diagram').innerHTML=circuitSvg(p,m);
    const metrics=lab.mode==='tradeoff'?[['接负载输出',volts(m.vout)],['空载支路电流',current(m.idle)],['等效输出电阻',ohms(m.rout)]]:lab.mode==='diagnosis'?[['输出电压',volts(m.vout)],['实际输入',lab.measured?volts(p.vin):'待测'],['R1 实际阻值',lab.resistance?ohms(p.r1):'待检查']]:[['输出电压',volts(m.vout)],['相对空载下降',(m.drop*100).toFixed(1)+'%'],[p.loaded?'接负载输入电流':'空载支路电流',current(m.input)]];
    root.querySelector('#lab-readout').innerHTML=metrics.slice(0,2).map(([label,value])=>`<span>${label}<strong>${value}</strong></span>`).join('');
    root.querySelector('#lab-metrics').innerHTML=metrics.map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    const insight=lab.mode==='diagnosis'?(!lab.measured&&!lab.removed&&!lab.resistance?'三个工况的初始输出相同；单凭输出电压，不能确定原因。':`已检查：${[lab.measured?'输入 '+volts(p.vin):'',lab.removed?'移除负载后输出 '+volts(m.vout):'',lab.resistance?'R1 为 '+ohms(p.r1):''].filter(Boolean).join('；')}。`):lab.mode==='tradeoff'?`R1 = R2 = ${ohms(p.r1)}：输出相对空载下降 ${(m.drop*100).toFixed(2)}%；空载电流为 ${current(m.idle)}。`:`空载输出 ${volts(m.open)} → 当前输出 ${volts(m.vout)}；${p.loaded?'负载与 R2 并联，改变了下方等效电阻。':'负载断开，恢复原来的分压比例。'}`;
    root.querySelector('#lab-insight').textContent=insight;
    for(const k of ['vin','r1','r2','rl','scale']){
      const out=root.querySelector('#lab-'+k+'-value');if(out)out.textContent=k==='vin'?volts(lab.vin):k==='scale'?ohms(p.r1):ohms(lab[k]);
    }
    const loadControl=root.querySelector('#lab-rl');if(loadControl)loadControl.disabled=!lab.loaded;
  }
  function labBind(){labUpdate()}
  function labRecord(action,quiet=true){
    const p=labParams(),m=CircuitModel.solve(p),diagnosis=lab.mode==='diagnosis';
    // Unmeasured diagnosis values are intentionally not copied into the record.
    const conditions=diagnosis?`候选工况：${{load:'A · 有额外负载',supply:'B · 输入电压下降',resistor:'C · 上方电阻装错'}[lab.cause]}；已进行检查：${[lab.measured?'测量输入':'',lab.removed?'移除额外负载':'',lab.resistance?'检查 R1':''].filter(Boolean).join('、')||'仅观察输出'}`:`Vin=${volts(p.vin)}；R1=${ohms(p.r1)}；R2=${ohms(p.r2)}；RL=${ohms(p.rl)}；负载${p.loaded?'接入':'断开'}`;
    const result=diagnosis?document.getElementById('lab-insight').textContent+' 输出：'+volts(m.vout):`理想模型输出 ${volts(m.vout)}，${p.loaded?'接负载输入电流':'空载输入电流'} ${current(m.input)}，空载支路电流 ${current(m.idle)}，等效输出电阻 ${ohms(m.rout)}。`;
    return saveAutomaticJournal('divider:'+lab.mode+':'+action,{track:'robotics',learning_route:'robotics',stage:window.learningContext?.('lab','dc')?.stage||'robotics-1',kind:'experiment',evidence_type:'calculation',title:'分压电路 · '+labLabels[lab.mode],question:'改变哪个条件影响了输出？哪些观察能支持或排除我的解释？',procedure:'学习台理想直流模型计算；'+conditions,result,conclusion:'',next_step:'',links:[]},quiet);
  }
  document.addEventListener('input',event=>{
    const el=event.target,k=el.dataset.labInput;if(!k||k==='cause')return;
    lab[k]=k==='loaded'?el.checked:Number(el.value)*(['r1','r2','rl'].includes(k)?1000:1);
    studyStore.write(labKey,lab);labUpdate();
  });
  document.addEventListener('change',event=>{
    const el=event.target,k=el.dataset.labInput;if(!k)return;
    if(k==='cause'){lab.cause=el.value;lab.measured=false;lab.removed=false;lab.resistance=false;document.getElementById('lab-controls').innerHTML=labControls();}
    else lab[k]=k==='loaded'?el.checked:Number(el.value)*(['r1','r2','rl'].includes(k)?1000:1);
    studyStore.write(labKey,lab);labUpdate();labRecord('change');
  });
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-lab-mode],[data-lab-action],[data-lab-preset]');if(!el||el.disabled)return;
    if(el.dataset.labAction==='record'){labRecord('snapshot',false);return}
    if(el.dataset.labMode){lab.mode=el.dataset.labMode;lab.measured=false;lab.removed=false;lab.resistance=false}
    if(el.dataset.labPreset)lab.scale=el.dataset.labPreset==='stiff'?2:4;
    if(el.dataset.labAction==='measure')lab.measured=true;
    if(el.dataset.labAction==='remove')lab.removed=true;
    if(el.dataset.labAction==='resistance')lab.resistance=true;
    studyStore.write(labKey,lab);
    document.querySelectorAll('[data-lab-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.labMode===lab.mode));
    document.getElementById('lab-controls').innerHTML=labControls();labUpdate();
    labRecord(el.dataset.labAction|| (el.dataset.labPreset?'preset':'mode'));
  });
  window.setCircuitPreset=values=>{const next={mode:'load',vin:5,r1:10000,r2:10000,rl:10000,loaded:true,scale:4,cause:'load',measured:false,removed:false,resistance:false,...values};if(!['load','diagnosis','tradeoff'].includes(next.mode)||!['load','supply','resistor'].includes(next.cause))throw Error('分压示例模式无效');for(const k of ['vin','r1','r2','rl','scale'])if(!Number.isFinite(next[k])||next[k]<({vin:.1,r1:100,r2:100,rl:100,scale:2}[k])||next[k]>({vin:12,r1:50000,r2:50000,rl:100000,scale:4}[k]))throw Error('分压示例范围无效');for(const k of ['loaded','measured','removed','resistance'])if(typeof next[k]!=='boolean')throw Error('分压示例格式无效');lab=next;render();};
  window.renderCircuitLab=renderCircuitLab;window.labBind=labBind;
}
