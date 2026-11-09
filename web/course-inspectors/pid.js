/* Understanding PID companion: inspect the existing arithmetic, never hardware evidence. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const n=x=>typeof x==='number'?Number(x.toFixed(4)).toString():String(x);
  const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
  const clip=(x,l)=>Math.max(-l,Math.min(l,x));
  const C=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note:note+' 算式显示四位小数，值和验证保留完整精度。'});
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const feedbackNote='r、y、e、u均为m/s，τ为s，Kp无量纲；u是折算后的理想速度指令，不是电压、实际电机能力或实测。';
  const pidNote='目标、测量、误差和输出归一化；I为s，D为s⁻¹，Kp无量纲、Ki为s⁻¹、Kd为s。固定记录不会随指令改变，没有闭环对象。';
  const windupNote='归一化一阶PI对象，Kp=1、τ=1s、Δt=0.25s、|u|≤1；I为s、Ki为s⁻¹。两种策略是数值对照，未控制真实执行器。';
  const filterNote='测量为m，时间为s，斜坡速度0.2m/s，Kd为s；−Δy/Δt为m/s，乘Kd后的raw、filtered和reference为m，平方误差为m²。固定交替扰动不是传感器采集。';
  const tuningNote='q为m、v为m/s、a为m/s²、力为N；m=1kg、b=0.4N·s/m、dt=0.05s。给定对象的半隐式Euler数值过程，未辨识真实电机。';
  const cascadeNote='位置为m，速度、速度目标、u和负载为m/s，外环增益为s⁻¹、内环增益无量纲；速度时间常数0.3s。人工串级P对象，未执行硬件控制。';
  function model(intuition,inspect,experiments,kind){
    return {intuition,inspect(t,index){
      const i=Math.max(0,Math.min(t.frames.length-1,Math.trunc(Number(index))||0));
      // Only current/past vars: neither scene nor result is an execution-stage boundary.
      const past=t.frames.slice(0,i+1).map(f=>f.vars),f=t.frames[i];
      return {title:f.title,summary:`实际播放帧 ${i+1}/${t.frames.length}。${f.text} ${kind}`,cells:inspect(t.params,i,past[i],past)};
    },experiments};
  }
  const models={};

  models['rf-p-feedback']=model('先用旧速度算误差和指令，再更新对象；16次有限步响应与解析稳态是两种不同的量。',(p,i,v,h)=>{
    if(i===0)return [
      C('initial-speed','对象初始速度',v.y,`y₀ = ${n(v.y)} m/s`,{initialSpeed:v.y},feedbackNote),
      C('sampling','每次采样的对象时间比例',v.dt/v.tau,`${n(v.dt)} / ${n(v.tau)} = ${n(v.dt/v.tau)}`,{dt:v.dt,tau:v.tau},feedbackNote+' Δt/τ无量纲；未更新速度。'),
      C('recurrence-factor','闭环旧状态系数',1-v.dt*(1+p.kp)/v.tau,`a = 1 − ${n(v.dt)} × (1 + ${n(p.kp)}) / ${n(v.tau)} = ${n(1-v.dt*(1+p.kp)/v.tau)}`,{dt:v.dt,kp:p.kp,tau:v.tau},feedbackNote+' 本控件范围使0≤a≤1，检查离散递推而非真实稳定裕度。')
    ];
    if(i===1)return [
      C('error','初次采样误差',v.error,`${n(h[0].target)} − ${n(h[0].y)} = ${n(v.error)} m/s`,{target:h[0].target,measuredSpeed:h[0].y},feedbackNote),
      C('p-command','初次比例指令',v.u,`${n(p.kp)} × ${n(v.error)} = ${n(v.u)} m/s`,{kp:p.kp,error:v.error},feedbackNote+' 这一帧只算控制器，尚未给出下一速度。')
    ];
    if(Object.hasOwn(v,'after')){const dt=h[0].dt,tau=h[0].tau,a=(v.u-v.before)/tau;return [
      C('sample-time','本次更新结束时间',v.time,`${v.step} × ${n(dt)} = ${n(v.time)} s`,{completedUpdates:v.step,dt},feedbackNote),
      C('error','由更新前速度计算误差',v.error,`${n(p.target)} − ${n(v.before)} = ${n(v.error)} m/s`,{target:p.target,before:v.before},feedbackNote),
      C('p-command','有效比例指令',v.u,`${n(p.kp)} × ${n(v.error)} = ${n(v.u)} m/s`,{kp:p.kp,error:v.error},feedbackNote),
      C('acceleration','本次对象速度变化率',a,`(${n(v.u)} − ${n(v.before)}) / ${n(tau)} = ${n(a)} m/s²`,{command:v.u,before:v.before,tau},feedbackNote),
      C('speed-increment','前向Euler速度增量',dt*a,`${n(dt)} × ${n(a)} = ${n(dt*a)} m/s`,{dt,acceleration:a},feedbackNote),
      C('new-speed','更新后的速度',v.after,`${n(v.before)} + ${n(dt)} × (${n(v.u)} − ${n(v.before)}) / ${n(tau)} = ${n(v.after)} m/s`,{before:v.before,dt,command:v.u,tau},feedbackNote+' 下一采样才使用此新速度。')
    ];}
    const last=h[h.length-2],time=last.time;return [
      C('steady-speed','解析稳态速度',v.steady,`y*=Kp·r/(1+Kp)=${n(p.kp)} × ${n(p.target)} / (1+${n(p.kp)}) = ${n(v.steady)} m/s`,{kp:p.kp,target:p.target},feedbackNote+' 来自稳态条件y*=u*，不是动画末步实测。'),
      C('steady-error','解析稳态误差',v.steadyError,`${n(p.target)} / (1+${n(p.kp)}) = ${n(v.steadyError)} m/s`,{target:p.target,kp:p.kp},feedbackNote),
      C('finite-speed','已执行16步的有限速度',v.finiteStepVelocity,`第${last.step}次更新，t=${n(time)}s；y=${n(last.after)} m/s`,{completedUpdates:last.step,elapsedSeconds:time,lastRecordedSpeed:last.after},feedbackNote+' 末步仍可能在变化。'),
      C('finite-gap','解析稳态减有限步速度',v.steady-v.finiteStepVelocity,`${n(v.steady)} − ${n(v.finiteStepVelocity)} = ${n(v.steady-v.finiteStepVelocity)} m/s`,{analyticalSteady:v.steady,finiteSpeed:v.finiteStepVelocity},feedbackNote)
    ];
  },[
    E('increase-kp','只把Kp从1改为3','第一步、16步末值和解析稳态怎样变化，有限步是否等于稳态？',{kp:1},{kp:3},'第一步0.2→0.6m/s；解析稳态0.5→0.75m/s、稳态误差0.5→0.25m/s，采样时长仍3.2s。',(a,b)=>a.params.kp===1&&b.params.kp===3&&near(a.result.history[1],.2)&&near(b.result.history[1],.6)&&near(a.result.steady,.5)&&near(b.result.steady,.75)&&near(a.result.steadyError,.5)&&near(b.result.steadyError,.25)&&b.result.velocity>a.result.velocity&&near(a.result.dt,b.result.dt)),
    E('change-sampling','只把Δt从0.05s改为0.2s','相同16步是否对应相同物理时长，解析稳态会改变吗？',{dt:.05},{dt:.2},'第一步0.1→0.4m/s；16步时长0.8→3.2s；解析稳态都为2/3m/s，较短时长末值更低。',(a,b)=>a.params.dt===.05&&b.params.dt===.2&&near(a.result.history[1],.1)&&near(b.result.history[1],.4)&&near(16*a.result.dt,.8)&&near(16*b.result.dt,3.2)&&near(a.result.steady,2/3)&&near(b.result.steady,2/3)&&a.result.velocity<b.result.velocity)
  ],'沿用实际16次反馈递推，不把有限响应当稳态。');

  models['rf-discrete-pid']=model('把归一化误差、累计误差面积、对测量的微分以及三项贡献分开，在原有四个计算阶段中核对。',(p,i,v,h)=>{
    if(i===0)return [
      ...v.measurements.map((y,k)=>C('input-'+k,'给定记录 y['+k+']',y,`输入记录[${k}] = ${n(y)}；它是预先给定的测量值`,{sample:k,measurement:y},pidNote+' 完整输入记录不是已执行的控制器输出。')),
      C('initial-integral','初始积分状态',v.integral,`I初始 = ${n(v.integral)} s`,{integral:v.integral},pidNote),
      C('initial-previous','初始上一测量约定',v.previousY,`previousY = 输入记录[0] = ${n(v.previousY)}`,{firstMeasurement:v.measurements[0]},pidNote+' 第一条记录的微分仍显式初始化为0，不能当作未知过去的实测。')
    ];
    const k=Math.floor((i-1)/4),phase=(i-1)%4;
    if(phase===0)return [C('error','采样'+k+'误差',v.error,`${n(v.target)} − ${n(v.y)} = ${n(v.error)}`,{sample:k,target:v.target,measurement:v.y},pidNote+' 本阶段只得到当前误差；尚不展示本采样合成指令。')];
    if(phase===1)return [
      C('area-increment','本次新增误差面积',v.error*v.dt,`${n(v.error)} × ${n(v.dt)} = ${n(v.error*v.dt)} s`,{error:v.error,dt:v.dt},pidNote),
      C('integral-state','更新后的累计积分',v.integral,`${n(v.beforeIntegral)} + ${n(v.error)} × ${n(v.dt)} = ${n(v.integral)} s`,{beforeIntegral:v.beforeIntegral,error:v.error,dt:v.dt},pidNote+' 累计状态没有在每次采样清零。'),
      C('i-term','当前I项贡献',v.integralTerm,`${n(p.ki)} × ${n(v.integral)} = ${n(v.integralTerm)}`,{ki:p.ki,integralSeconds:v.integral},pidNote)
    ];
    if(phase===2)return [
      C('measurement-delta','相邻测量差',v.y-v.previousY,`${n(v.y)} − ${n(v.previousY)} = ${n(v.y-v.previousY)}`,{sample:k,currentMeasurement:v.y,previousMeasurement:v.previousY},pidNote+(k===0?' 这是初始化赋值后的零差，不代表读取了第一条之前的测量。':'')),
      C('measurement-derivative','带负号的测量微分',v.derivative,k===0?'k=0：没有前一采样区间，按模型约定 D₀ = 0 s⁻¹':`−(${n(v.y)} − ${n(v.previousY)}) / ${n(p.dt)} = ${n(v.derivative)} s⁻¹`,{sample:k,y:v.y,previousY:v.previousY,dt:p.dt},pidNote+' 不含目标差分；测量下降时此量为正。'),
      C('d-term','当前D项贡献',v.derivativeTerm,`${n(p.kd)} × ${n(v.derivative)} = ${n(v.derivativeTerm)}`,{kdSeconds:p.kd,derivativePerSecond:v.derivative},pidNote)
    ];
    const err=h[i-3],integ=h[i-2],deriv=h[i-1];return [
      C('p-term','当前P项贡献',v.proportional,`${n(p.kp)} × ${n(err.error)} = ${n(v.proportional)}`,{kp:p.kp,error:err.error},pidNote),
      C('i-term','已更新的I项贡献',v.integralTerm,`${n(p.ki)} × ${n(integ.integral)} = ${n(v.integralTerm)}`,{ki:p.ki,integralSeconds:integ.integral},pidNote),
      C('d-term','对测量的D项贡献',v.derivativeTerm,`${n(p.kd)} × ${n(deriv.derivative)} = ${n(v.derivativeTerm)}`,{kdSeconds:p.kd,derivativePerSecond:deriv.derivative},pidNote),
      C('command','本次合成指令',v.u,`${n(v.proportional)} + ${n(v.integralTerm)} + ${n(v.derivativeTerm)} = ${n(v.u)}`,{pTerm:v.proportional,iTerm:v.integralTerm,dTerm:v.derivativeTerm},pidNote+' 未限幅、未滤波；previousY在本采样计算完后才更新。')
    ];
  },[
    E('change-dt','只把Δt从0.5s改为0.2s','同一相邻记录的I增量和D幅值怎样变，测量记录会变吗？',{dt:.5},{dt:.2},'每次积分增量乘0.4，非首个微分乘2.5；最终I为1.575→0.63s，末指令1.155→0.543，测量和P项保持。',(a,b)=>a.params.dt===.5&&b.params.dt===.2&&near(a.result.integral,1.575)&&near(b.result.integral,.63)&&near(a.result.commands[5],1.155)&&near(b.result.commands[5],.543)&&a.result.terms.every((x,k)=>near(x.y,b.result.terms[k].y)&&near(x.proportional,b.result.terms[k].proportional)&&near(b.result.terms[k].integral,.4*x.integral)&&near(b.result.terms[k].derivative,2.5*x.derivative)))
  ],'固定记录上原有误差→积分→微分→合成的单步过程；不伪造闭环运动。');

  function windupPrefix(p,useAnti,count){let y=0,integral=0;const rows=[];for(let k=0;k<count;k++){const target=k<8?p.target:.3,error=target-y,candidate=integral+.25*error,candidateRaw=error+p.ki*candidate,blocked=useAnti&&((candidateRaw>1&&error>0)||(candidateRaw< -1&&error<0)),before=y,beforeIntegral=integral;if(!blocked)integral=candidate;const raw=error+p.ki*integral,u=clip(raw,1);y+=.25*(u-y);rows.push({target,error,candidate,candidateRaw,blocked,before,beforeIntegral,integral,raw,u,y});}return rows;}
  function windupCells(p,x,preview=false){const high=x.candidateRaw>1&&x.error>0,low=x.candidateRaw< -1&&x.error<0;const cells=[
    C('error','目标减更新前测量',x.error,`${n(x.target)} − ${n(x.before)} = ${n(x.error)}`,{target:x.target,before:x.before},windupNote),
    C('integral-increment','候选积分增量',x.error*.25,`${n(x.error)} × 0.25 = ${n(x.error*.25)} s`,{error:x.error,dt:.25},windupNote),
    C('candidate-integral','候选积分状态',x.candidate,`${n(x.beforeIntegral)} + ${n(x.error)} × 0.25 = ${n(x.candidate)} s`,{beforeIntegral:x.beforeIntegral,error:x.error,dt:.25},windupNote),
    C('candidate-raw','采用候选积分的原始指令',x.candidateRaw,`1 × ${n(x.error)} + ${n(p.ki)} × ${n(x.candidate)} = ${n(x.candidateRaw)}`,{kp:1,error:x.error,ki:p.ki,candidate:x.candidate},windupNote),
    C('positive-block','候选正向超限且误差同向',high,`(${n(x.candidateRaw)} > 1) ∧ (${n(x.error)} > 0) → ${high}`,{candidateRaw:x.candidateRaw,upperLimit:1,error:x.error},windupNote+' 等于限幅值不会触发严格大于判断。'),
    C('negative-block','候选负向超限且误差同向',low,`(${n(x.candidateRaw)} < −1) ∧ (${n(x.error)} < 0) → ${low}`,{candidateRaw:x.candidateRaw,lowerLimit:-1,error:x.error},windupNote),
    C('blocked','本次是否拒绝积分',x.blocked,`启用条件积分=${p.anti===1}；${p.anti===1} ∧ (${high} ∨ ${low}) → ${x.blocked}`,{selectedMode:p.anti,positiveBlock:high,negativeBlock:low},windupNote+' 选择控件用数值索引0/1；误差帮助解除饱和时允许积分。'),
    C('accepted-integral','本次采用的积分状态',x.integral,`${x.blocked?'冻结：I = I旧 = '+n(x.beforeIntegral):'接受：I = I候选 = '+n(x.candidate)} = ${n(x.integral)} s`,{blocked:x.blocked,beforeIntegral:x.beforeIntegral,candidate:x.candidate},windupNote)
  ];
    if(!preview)cells.push(
      C('raw-command','采用积分后的原始指令',x.raw,`1 × ${n(x.error)} + ${n(p.ki)} × ${n(x.integral)} = ${n(x.raw)}`,{error:x.error,ki:p.ki,acceptedIntegral:x.integral},windupNote),
      C('limited-command','对象实际收到的限幅指令',x.u,`max(−1, min(1, ${n(x.raw)})) = ${n(x.u)}`,{raw:x.raw,lowerLimit:-1,upperLimit:1},windupNote),
      C('clipped-away','原始指令减有效指令',x.raw-x.u,`${n(x.raw)} − ${n(x.u)} = ${n(x.raw-x.u)}`,{raw:x.raw,limited:x.u},windupNote+' 限幅不等于清空积分。'),
      C('new-output','对象一步更新',x.y,`${n(x.before)} + 0.25 × (${n(x.u)} − ${n(x.before)}) / 1 = ${n(x.y)}`,{before:x.before,dt:.25,effectiveCommand:x.u,tau:1},windupNote)
    );return cells;
  }
  models['rf-anti-windup']=model('先提出积分候选，再判断它是否把同向饱和推深；输出限幅与积分状态管理分别逐格检查。',(p,i,v,h)=>{
    if(i===0)return [
      C('output-limit','对象的有效指令区间',[-v.limit,v.limit],`−${n(v.limit)} ≤ u ≤ ${n(v.limit)}`,{absoluteLimit:v.limit},windupNote),
      C('target-switch-time','目标下降的采样边界',8*v.dt,`前8次用${n(v.target)}，第9次开始用${n(v.lowTarget)}；8 × ${n(v.dt)} = ${n(8*v.dt)} s`,{highTarget:v.target,lowTarget:v.lowTarget,firstPhaseUpdates:8,dt:v.dt},windupNote+' 此处是输入安排，没有提前给出控制器输出。'),
      C('selected-mode','当前观察的积分策略',p.anti,`控件索引${p.anti} → ${p.anti===1?'条件积分':'仅限制输出，持续积分'}`,{selectedIndex:p.anti,conditionalIndex:1},windupNote+' 模型同时计算两条对照，选择只决定显示哪条逐步状态。')
    ];
    if(i===1){const error=h[0].target;return windupCells(p,{...v,error,target:error,before:0,beforeIntegral:0},true);}
    if(Object.hasOwn(v,'step'))return [C('sample-time','本次结束时间',v.time,`(${v.step} + 1) × 0.25 = ${n(v.time)} s`,{zeroBasedStep:v.step,dt:.25},windupNote),...windupCells(p,v)];
    const naive=windupPrefix(p,false,9),guarded=windupPrefix(p,true,9),areas=naive.slice(0,8).map(x=>.25*x.error);return [
      C('naive-switch-integral','最终核对：仅限幅的切换前积分',v.naiveIntegral,`Σ₀⁷(eₖ·0.25) = ${areas.map(n).join(' + ')} = ${n(v.naiveIntegral)} s`,{dt:.25,firstEightErrorAreas:areas},windupNote+' 该完整对照此时已经执行；按同一输入与递推复算两条已完成分支，不读result。'),
      C('guarded-switch-integral','最终核对：条件积分的切换前状态',v.guardedIntegral,`I₇ = I初始 + Σ已接受增量 = ${n(v.guardedIntegral)} s；前8步拒绝=${guarded.slice(0,8).map(x=>x.blocked).join(',')}`,{initialIntegral:0,firstEightAcceptedAreas:guarded.slice(0,8).map(x=>x.integral-x.beforeIntegral)},windupNote),
      C('stored-integral-gap','两种策略存储的积分差',v.naiveIntegral-v.guardedIntegral,`${n(v.naiveIntegral)} − ${n(v.guardedIntegral)} = ${n(v.naiveIntegral-v.guardedIntegral)} s`,{naive:v.naiveIntegral,guarded:v.guardedIntegral},windupNote),
      C('naive-first-after-drop','最终核对：仅限幅降目标后首指令',v.naiveFirstAfterDrop,`clip(${n(naive[8].error)} + ${n(p.ki)} × ${n(naive[8].integral)}, −1, 1) = ${n(v.naiveFirstAfterDrop)}`,{error:naive[8].error,ki:p.ki,acceptedIntegral:naive[8].integral},windupNote),
      C('guarded-first-after-drop','最终核对：条件积分降目标后首指令',v.guardedFirstAfterDrop,`clip(${n(guarded[8].error)} + ${n(p.ki)} × ${n(guarded[8].integral)}, −1, 1) = ${n(v.guardedFirstAfterDrop)}`,{error:guarded[8].error,ki:p.ki,acceptedIntegral:guarded[8].integral,blocked:guarded[8].blocked},windupNote)
    ];
  },[
    E('enable-integral','只把Ki从0改为0.8/s','没有积分贡献时两种策略的对象轨迹是否重合，打开积分后目标下降的首指令怎样分开？',{ki:0},{ki:.8},'Ki=0时两条对象轨迹与指令相同；Ki=0.8时仅限幅积累更多积分，降目标后的首指令高于条件积分，初次两支都限幅为1。',(a,b)=>a.params.ki===0&&b.params.ki===.8&&a.result.runs[0].every((x,k)=>near(x.y,a.result.runs[1][k].y)&&near(x.u,a.result.runs[1][k].u))&&near(b.result.runs[0][0].u,1)&&near(b.result.runs[1][0].u,1)&&near(b.result.runs[0][0].integral,.5)&&near(b.result.runs[1][0].integral,0)&&b.result.naiveIntegral>b.result.guardedIntegral&&b.result.runs[0][8].u>b.result.runs[1][8].u&&!near(a.result.runs[1][8].u,b.result.runs[1][8].u)),
    E('select-strategy','只把观察索引0改为1','显示的内部积分如何变化，已计算的两条对照是否保持？',{anti:0},{anti:1},'当前观察从持续积分变为条件积分，首个积分0.5→0s；两条已计算的完整对照各自保持，选择不会改变物理对象。',(a,b)=>a.params.anti===0&&b.params.anti===1&&a.result.selected===0&&b.result.selected===1&&near(a.result.runs[a.result.selected][0].integral,.5)&&near(b.result.runs[b.result.selected][0].integral,0)&&a.result.runs.every((r,j)=>r.every((x,k)=>near(x.y,b.result.runs[j][k].y)&&near(x.integral,b.result.runs[j][k].integral))))
  ],'沿用两条真实离散PI数值轨迹；候选检查帧只展开候选，完整比较只在末帧出现。');

  models['rf-derivative-filter']=model('相邻测量相减后除以dt，再由旧滤波状态和本次原始微分加权；把降噪与滞后放在同一固定记录上核对。',(p,i,v,h)=>{
    if(i===0)return [
      C('filter-alpha','旧状态权重α',v.alpha,`${n(v.tau)} / (${n(v.tau)} + ${n(v.dt)}) = ${n(v.alpha)}`,{tau:v.tau,dt:v.dt},filterNote+' 权重无量纲，τ=0时α=0。'),
      C('new-weight','当前微分权重1−α',1-v.alpha,`1 − ${n(v.alpha)} = ${n(1-v.alpha)}`,{alpha:v.alpha},filterNote),
      C('sample-dt','给定采样间隔',v.dt,`Δt = ${n(v.dt)} s；τ/Δt=${n(v.tau/v.dt)}`,{dt:v.dt,tau:v.tau},filterNote+' 此时尚未读取第一条测量。')
    ];
    if(Object.hasOwn(v,'k')){const oldFiltered=v.k===0?0:h[i-1].filtered,delta=v.measurement-v.previousMeasurement,plain=v.k===0?0:-delta/h[0].dt,oldPart=v.alpha*oldFiltered,newPart=(1-v.alpha)*v.raw;return [
      C('truth','本次给定匀速斜坡',v.truth,`0.2 × ${n(v.t)} = ${n(v.truth)} m`,{rampVelocity:.2,time:v.t},filterNote),
      C('noise-sample','本次交替扰动',v.measurement-v.truth,`${n(p.noise)} × ${v.k%2===0?1:-1} = ${n(v.measurement-v.truth)} m`,{noiseAmplitude:p.noise,zeroBasedSample:v.k,sign:v.k%2===0?1:-1},filterNote),
      C('measurement','本次测量输入',v.measurement,`${n(v.truth)} + (${n(v.measurement-v.truth)}) = ${n(v.measurement)} m`,{truth:v.truth,fixedNoise:v.measurement-v.truth},filterNote),
      C('plain-derivative','未乘Kd的负测量差分',plain,v.k===0?'k=0：前一测量区间未知，按约定初始化为0 m/s':`−(${n(v.measurement)} − ${n(v.previousMeasurement)}) / ${n(h[0].dt)} = ${n(plain)} m/s`,{sample:v.k,current:v.measurement,previous:v.previousMeasurement,dt:h[0].dt},filterNote),
      C('raw','原始微分支路指令',v.raw,v.k===0?'k=0：raw = 0 m（初始化，不用假定的前一测量作差分）':`${n(p.kd)} × ${n(plain)} = ${n(v.raw)} m`,{kd:p.kd,negativeMeasurementDerivative:plain},filterNote),
      C('filter-memory','旧滤波状态的贡献',oldPart,`${n(v.alpha)} × ${n(oldFiltered)} = ${n(oldPart)} m`,{alpha:v.alpha,previousFiltered:oldFiltered},filterNote),
      C('filter-new','本次原始微分的贡献',newPart,`(1 − ${n(v.alpha)}) × ${n(v.raw)} = ${n(newPart)} m`,{alpha:v.alpha,raw:v.raw},filterNote),
      C('filtered','本次滤波后指令',v.filtered,v.k===0?'k=0：filtered = 0 m（初始化）':`${n(oldPart)} + ${n(newPart)} = ${n(v.filtered)} m`,{weightedMemory:oldPart,weightedRaw:newPart},filterNote),
      C('reference','无噪声支路参考',v.reference,v.k===0?'k=0：reference = 0 m，与初始化约定一致':`−${n(p.kd)} × 0.2 = ${n(v.reference)} m`,{sample:v.k,kd:p.kd,knownRampVelocity:.2},filterNote),
      C('raw-squared-error','当前原始支路平方误差',(v.raw-v.reference)**2,`(${n(v.raw)} − (${n(v.reference)}))² = ${n((v.raw-v.reference)**2)} m²`,{raw:v.raw,reference:v.reference},filterNote),
      C('filtered-squared-error','当前滤波支路平方误差',(v.filtered-v.reference)**2,`(${n(v.filtered)} − (${n(v.reference)}))² = ${n((v.filtered-v.reference)**2)} m²`,{filtered:v.filtered,reference:v.reference},filterNote+' 当前一格误差不等于整段均方误差。')
    ];}
    const rows=h.filter(x=>Object.hasOwn(x,'k')&&x.k>0),rawSquares=rows.map(x=>(x.raw-x.reference)**2),filteredSquares=rows.map(x=>(x.filtered-x.reference)**2);return [
      ...rows.flatMap((x,j)=>[
        C('raw-square-'+x.k,'已完成采样'+x.k+'原始平方误差',rawSquares[j],`(${n(x.raw)} − (${n(x.reference)}))² = ${n(rawSquares[j])} m²`,{sample:x.k,raw:x.raw,reference:x.reference},filterNote),
        C('filtered-square-'+x.k,'已完成采样'+x.k+'滤波平方误差',filteredSquares[j],`(${n(x.filtered)} − (${n(x.reference)}))² = ${n(filteredSquares[j])} m²`,{sample:x.k,filtered:x.filtered,reference:x.reference},filterNote)
      ]),
      C('raw-mse','完整记录原始均方误差',v.rawError,`(${rawSquares.map(n).join(' + ')}) / ${rows.length} = ${n(v.rawError)} m²`,{squaredErrors:rawSquares,count:rows.length},filterNote+' 排除初始化k=0，只平均k=1…15。'),
      C('filtered-mse','完整记录滤波均方误差',v.filteredError,`(${filteredSquares.map(n).join(' + ')}) / ${rows.length} = ${n(v.filteredError)} m²`,{squaredErrors:filteredSquares,count:rows.length},filterNote+' 只针对这段给定记录，不能外推任意信号和闭环性能。')
    ];
  },[
    E('add-filter','只把τ从0改为0.3s','测量和raw会改变吗，α=0.75后第二条记录的滤波值和整段误差怎样变化？',{tau:0},{tau:.3},'测量、raw与参考保持；α从0变0.75，k=1的滤波1.8→0.45m，这段交替噪声的滤波MSE降低。',(a,b)=>a.params.tau===0&&b.params.tau===.3&&near(a.result.alpha,0)&&near(b.result.alpha,.75)&&near(a.result.samples[1].filtered,1.8)&&near(b.result.samples[1].filtered,.45)&&a.result.samples.every((x,k)=>near(x.measurement,b.result.samples[k].measurement)&&near(x.raw,b.result.samples[k].raw)&&near(x.reference,b.result.samples[k].reference)&&near(x.filtered,x.raw))&&near(a.result.rawError,b.result.rawError)&&b.result.filteredError<b.result.rawError),
    E('remove-noise','τ保持0，只把噪声从0.1m改为0','没有滤波时去掉固定交替噪声，原始微分误差和已知斜坡怎样变化？',{tau:0,noise:.1},{tau:0,noise:0},'斜坡与参考保持；原始MSE从4m²降到数值零；滤波关闭时两条支路仍重合。',(a,b)=>a.params.noise===.1&&b.params.noise===0&&near(a.result.rawError,4)&&near(b.result.rawError,0)&&near(b.result.filteredError,0)&&a.result.samples.every((x,k)=>near(x.truth,b.result.samples[k].truth)&&near(x.reference,b.result.samples[k].reference))&&b.result.samples.every(x=>near(x.filtered,x.raw)))
  ],'逐条使用已取得的固定测量记录和上个滤波状态；整段MSE仅在最终核对帧显示。');

  // The original renderer stores every fourth PD update and every fifth cascade update.
  // Reproduce only updates already executed by this visible frame, from its previous
  // stored state. These are arithmetic cells, never newly invented playback frames.
  function tuningSegment(p,start,count){let position=start.position,velocity=start.velocity;const rows=[];for(let j=0;j<count;j++){const previousPosition=position,previousVelocity=velocity,k=start.k+j,error=1-position,pForce=p.kp*error,dForce=-p.kd*velocity,raw=pForce+dForce,u=clip(raw,p.limit),drag=.4*velocity,acceleration=(u-drag)/1;velocity+=.05*acceleration;position+=.05*velocity;rows.push({k,t:(k+1)*.05,previousPosition,previousVelocity,error,pForce,dForce,raw,u,drag,acceleration,velocity,position,area:.05*Math.abs(error)});}return rows;}
  function tuningCells(x){const prefix='step-'+x.k+'-',label='已执行采样'+(x.k+1)+' · ';return [
    C(prefix+'error',label+'位置误差',x.error,`1 − ${n(x.previousPosition)} = ${n(x.error)} m`,{target:1,previousPosition:x.previousPosition},tuningNote),
    C(prefix+'p-force',label+'比例力',x.pForce,`${n(x.kp)} × ${n(x.error)} = ${n(x.pForce)} N`,{kp:x.kp,error:x.error},tuningNote),
    C(prefix+'d-force',label+'速度反馈力',x.dForce,`−${n(x.kd)} × ${n(x.previousVelocity)} = ${n(x.dForce)} N`,{kd:x.kd,previousVelocity:x.previousVelocity},tuningNote),
    C(prefix+'raw',label+'未限幅合力指令',x.raw,`${n(x.pForce)} + (${n(x.dForce)}) = ${n(x.raw)} N`,{proportionalForce:x.pForce,velocityFeedbackForce:x.dForce},tuningNote),
    C(prefix+'force',label+'限幅后的外力',x.u,`max(−${n(x.limit)}, min(${n(x.limit)}, ${n(x.raw)})) = ${n(x.u)} N`,{raw:x.raw,limit:x.limit},tuningNote),
    C(prefix+'drag',label+'对象黏性阻力项',x.drag,`0.4 × ${n(x.previousVelocity)} = ${n(x.drag)} N`,{damping:.4,previousVelocity:x.previousVelocity},tuningNote+' 该阻力属于对象，与控制器Kd的速度反馈分别计算。'),
    C(prefix+'acceleration',label+'加速度',x.acceleration,`(${n(x.u)} − ${n(x.drag)}) / 1 = ${n(x.acceleration)} m/s²`,{appliedForce:x.u,viscousForce:x.drag,mass:1},tuningNote),
    C(prefix+'velocity',label+'先更新速度',x.velocity,`${n(x.previousVelocity)} + 0.05 × ${n(x.acceleration)} = ${n(x.velocity)} m/s`,{previousVelocity:x.previousVelocity,dt:.05,acceleration:x.acceleration},tuningNote),
    C(prefix+'position',label+'再用新速度更新位置',x.position,`${n(x.previousPosition)} + 0.05 × ${n(x.velocity)} = ${n(x.position)} m`,{previousPosition:x.previousPosition,dt:.05,newVelocity:x.velocity,time:x.t},tuningNote+' 这是半隐式Euler，不能换成旧速度。'),
    C(prefix+'iae-area',label+'绝对误差面积',x.area,`0.05 × |${n(x.error)}| = ${n(x.area)} m·s`,{dt:.05,errorBeforeUpdate:x.error},tuningNote)
  ];}
  models['rf-pid-tuning']=model('把位置误差变成比例力，减去速度反馈，再限幅、扣除对象阻力；先更新速度再更新位置，并用同一轨迹评价指标。',(p,i,v,h)=>{
    if(i===0)return [
      C('mass','给定质量',v.mass,`m = ${n(v.mass)} kg`,{mass:v.mass},tuningNote),
      C('effective-damping','无饱和连续近似的阻尼系数',v.damping+v.kd,`${n(v.damping)} + ${n(v.kd)} = ${n(v.damping+v.kd)} N·s/m`,{plantDamping:v.damping,velocityGain:v.kd},tuningNote+' 仅为无饱和连续线性近似，尚未得到响应指标。'),
      C('force-limit','力的正负限制',[-v.limit,v.limit],`−${n(v.limit)} ≤ u ≤ ${n(v.limit)} N`,{absoluteLimit:v.limit},tuningNote),
      C('sample-dt','积分步长',v.dt,`dt = ${n(v.dt)} s；先v后q`,{dt:v.dt},tuningNote)
    ];
    if(Object.hasOwn(v,'previousPosition')){const previous=i===1?{position:0,velocity:0,t:0}:h[i-1],firstK=Math.round(previous.t/.05),count=Math.round((v.t-previous.t)/.05),rows=tuningSegment(p,{position:previous.position,velocity:previous.velocity,k:firstK},count),last=rows[rows.length-1];return [
      C('executed-updates','本播放帧间已执行的积分次数',count,`(${n(v.t)} − ${n(previous.t)}) / 0.05 = ${count} 次；采样${firstK+1}…${firstK+count}`,{previousDisplayedTime:previous.t,currentTime:v.t,dt:.05},tuningNote+' 原模型每4次才显示一次，中间计算按相同递推从上一已显示状态复算；没有新增播放帧。'),
      ...rows.flatMap(x=>tuningCells({...x,kp:p.kp,kd:p.kd,limit:p.limit})),
      C('recorded-state-check','复算与当前实际快照状态一致',near(last.position,v.position)&&near(last.velocity,v.velocity)&&near(last.previousPosition,v.previousPosition)&&near(last.previousVelocity,v.previousVelocity),`复算q=${n(last.position)}，v=${n(last.velocity)}；实际快照q=${n(v.position)}，v=${n(v.velocity)}`,{recomputedPosition:last.position,recordedPosition:v.position,recomputedVelocity:last.velocity,recordedVelocity:v.velocity,recomputedPreviousPosition:last.previousPosition,recordedPreviousPosition:v.previousPosition},tuningNote+' 当前和以前的vars足够核对，不读取完整result。')
    ];}
    const end=h[h.length-2],rows=tuningSegment(p,{position:0,velocity:0,k:0},Math.round(end.t/.05)),areas=rows.map(x=>x.area),violations=rows.filter(x=>Math.abs(x.position-1)>.02||Math.abs(x.velocity)>.05),lastViolation=violations.at(-1),settling=lastViolation?.k===rows.length-1?null:lastViolation?rows[lastViolation.k+1].t:0,saturated=rows.filter(x=>Math.abs(x.raw)>p.limit).map(x=>x.k+1),peak=rows.reduce((a,b)=>a.position>b.position?a:b);return [
      C('overshoot','完整4s记录的超调',v.overshoot,`max(0, max(qₖ) − 1) = max(0, ${n(peak.position)} − 1) = ${n(v.overshoot)} m`,{maximumRecordedPosition:peak.position,maximumAtTime:peak.t,target:1},tuningNote+' 只评价已运行的80次更新。'),
      C('iae','完整4s记录的绝对误差积分',v.iae,`Σₖ₌₀⁷⁹ 0.05·|eₖ| = ${areas.map(n).join(' + ')} = ${n(v.iae)} m·s`,{errorAreaPerUpdate:areas,count:rows.length},tuningNote+' e使用每次更新之前的位置；不混用更新后的误差。'),
      C('saturated','限幅发生的采样数',v.saturated,`count(|rawₖ| > ${n(p.limit)}) = ${saturated.length} 次；采样号=[${saturated.join(', ')}]`,{forceLimit:p.limit,saturatedOneBasedSamples:saturated,strictComparison:true},tuningNote+' 恰好等于上限不计入饱和次数。'),
      C('damping-ratio','无饱和连续线性近似阻尼比',v.linearDampingRatio,`(0.4 + ${n(p.kd)}) / (2√(1 × ${n(p.kp)})) = ${n(v.linearDampingRatio)}`,{plantDamping:.4,kd:p.kd,mass:1,kp:p.kp},tuningNote+' ζ无量纲；实际轨迹仍含离散积分与限幅。'),
      C('settling-last-violation','最后一次违反收敛条件的采样',lastViolation?lastViolation.k+1:null,lastViolation?`采样${lastViolation.k+1}，t=${n(lastViolation.t)}s：|q−1|=${n(Math.abs(lastViolation.position-1))}m，|v|=${n(Math.abs(lastViolation.velocity))}m/s；要求≤0.02m且≤0.05m/s`:'80次采样都满足 |q−1|≤0.02m 且 |v|≤0.05m/s',lastViolation?{sample:lastViolation.k+1,time:lastViolation.t,position:lastViolation.position,velocity:lastViolation.velocity,positionTolerance:.02,velocityTolerance:.05}:{samples:80,positionTolerance:.02,velocityTolerance:.05},tuningNote),
      C('settling-time','本观察窗口内的稳定时间',v.settlingTime,settling===null?'末次采样仍违反条件 → settlingTime = null（4s窗口内未知）':`最后违规之后首个采样时刻 = ${n(settling)} s，之后所有已记录采样均满足条件`,{lastViolationOneBased:lastViolation?lastViolation.k+1:null,lastRecordedTime:end.t,recomputedSettlingTime:settling},tuningNote+' 不把4s观察结束冒充无限时域稳定，也不把null写成4。')
    ];
  },[
    E('add-velocity-feedback','只把Kd从0改为1.5N·s/m','首步速度为0时控制器D项是否改变，之后超调和阻尼比怎样变化？',{kd:0},{kd:1.5},'初次q都为0.005m、v都为0.1m/s；之后速度反馈增加，4s内超调降低，连续近似ζ由0.4/(2√2)增到1.9/(2√2)。',(a,b)=>a.params.kd===0&&b.params.kd===1.5&&near(a.result.samples[0].position,.005)&&near(b.result.samples[0].position,.005)&&near(a.result.samples[0].velocity,.1)&&near(b.result.samples[0].velocity,.1)&&near(a.result.linearDampingRatio,.4/(2*Math.sqrt(2)))&&near(b.result.linearDampingRatio,1.9/(2*Math.sqrt(2)))&&b.result.overshoot<a.result.overshoot&&!near(a.result.samples[4].position,b.result.samples[4].position)),
    E('raise-force-limit','Kp固定4，只把力上限1N改为3N','原始力相同时限幅如何改变首步，饱和采样数怎样变？',{kp:4,limit:1},{kp:4,limit:3},'首个原始力都为4N，实际力1→3N，首步v为0.05→0.15m/s、q为0.0025→0.0075m；高上限的饱和次数更少。',(a,b)=>a.params.limit===1&&b.params.limit===3&&a.params.kp===4&&b.params.kp===4&&near(a.result.samples[0].raw,4)&&near(b.result.samples[0].raw,4)&&near(a.result.samples[0].u,1)&&near(b.result.samples[0].u,3)&&near(a.result.samples[0].position,.0025)&&near(b.result.samples[0].position,.0075)&&near(a.result.samples[0].velocity,.05)&&near(b.result.samples[0].velocity,.15)&&b.result.saturated<a.result.saturated)
  ],'原有真实数值历史继续播放；稀疏播放帧内展开该时间段已经执行的积分子步，最终指标不提前出现。');

  function cascadeSegment(p,start,count){let position=start.position,velocity=start.velocity,velocityReference=start.velocityReference;const rows=[];for(let j=0;j<count;j++){const k=start.k+j,previousPosition=position,previousVelocity=velocity,previousReference=velocityReference,outerUpdated=k%5===0,positionError=1-position,outerRaw=p.outer*positionError;if(outerUpdated)velocityReference=clip(outerRaw,1);const inputTime=k*.02,load=inputTime>=1?p.disturbance:0,velocityError=velocityReference-velocity,raw=p.inner*velocityError,u=clip(raw,2),acceleration=(u-velocity-load)/.3;velocity+=.02*acceleration;position+=.02*velocity;rows.push({k,t:inputTime+.02,inputTime,previousPosition,previousVelocity,previousReference,outerUpdated,positionError,outerRaw,velocityReference,load,velocityError,raw,u,acceleration,velocity,position});}return rows;}
  function cascadeCells(p,x){const prefix='step-'+x.k+'-',label='已执行内环采样'+(x.k+1)+' · ';return [
    C(prefix+'outer-tick',label+'是否更新外环',x.outerUpdated,`${x.k} mod 5 = ${x.k%5} → 外环更新=${x.outerUpdated}`,{zeroBasedInnerStep:x.k,innerStepsPerOuter:5,inputTime:x.inputTime},cascadeNote),
    ...(x.outerUpdated?[
      C(prefix+'position-error',label+'外环位置误差',x.positionError,`1 − ${n(x.previousPosition)} = ${n(x.positionError)} m`,{target:1,previousPosition:x.previousPosition},cascadeNote),
      C(prefix+'outer-raw',label+'外环原始速度目标',x.outerRaw,`${n(p.outer)} × ${n(x.positionError)} = ${n(x.outerRaw)} m/s`,{outerGain:p.outer,positionError:x.positionError},cascadeNote)
    ]:[]),
    C(prefix+'velocity-reference',label+(x.outerUpdated?'限幅后的新速度目标':'保持上次外环速度目标'),x.velocityReference,x.outerUpdated?`clip(${n(x.outerRaw)}, −1, 1) = ${n(x.velocityReference)} m/s`:`外环本次不采样：v_ref = 上次保持值 ${n(x.previousReference)} m/s`,x.outerUpdated?{outerRaw:x.outerRaw,referenceLimit:1}:{heldReference:x.previousReference,zeroBasedInnerStep:x.k},cascadeNote+' 外环不采样时内环仍更新。'),
    C(prefix+'velocity-error',label+'内环速度误差',x.velocityError,`${n(x.velocityReference)} − ${n(x.previousVelocity)} = ${n(x.velocityError)} m/s`,{reference:x.velocityReference,previousVelocity:x.previousVelocity},cascadeNote),
    C(prefix+'raw',label+'内环原始指令',x.raw,`${n(p.inner)} × ${n(x.velocityError)} = ${n(x.raw)} m/s`,{innerGain:p.inner,velocityError:x.velocityError},cascadeNote),
    C(prefix+'command',label+'限幅后的有效指令',x.u,`clip(${n(x.raw)}, −2, 2) = ${n(x.u)} m/s`,{raw:x.raw,commandLimit:2},cascadeNote+' 外环±1与内环±2限制分别作用在不同量上。'),
    C(prefix+'load',label+'本次对象受到的负载',x.load,`输入时刻${n(x.inputTime)}s ${x.inputTime>=1?'≥':'<'} 1s → load=${n(x.load)} m/s`,{inputTime:x.inputTime,loadStart:1,configuredLoad:p.disturbance},cascadeNote+' 更新时间段起点决定负载；输出快照时间是该起点加0.02s。'),
    C(prefix+'acceleration',label+'速度对象变化率',x.acceleration,`(${n(x.u)} − ${n(x.previousVelocity)} − ${n(x.load)}) / 0.3 = ${n(x.acceleration)} m/s²`,{command:x.u,previousVelocity:x.previousVelocity,load:x.load,tau:.3},cascadeNote),
    C(prefix+'velocity',label+'先更新速度',x.velocity,`${n(x.previousVelocity)} + 0.02 × ${n(x.acceleration)} = ${n(x.velocity)} m/s`,{previousVelocity:x.previousVelocity,dt:.02,acceleration:x.acceleration},cascadeNote),
    C(prefix+'position',label+'再更新位置',x.position,`${n(x.previousPosition)} + 0.02 × ${n(x.velocity)} = ${n(x.position)} m`,{previousPosition:x.previousPosition,dt:.02,newVelocity:x.velocity,outputTime:x.t},cascadeNote)
  ];}
  models['rf-cascade-control']=model('慢位置环只在自己的采样时刻更新速度目标，快速度环在其间继续用保持目标控制；逐个实际内环子步检查两层限幅与负载。',(p,i,v,h)=>{
    if(i===0)return [
      C('inner-dt','内环采样周期',v.innerDt,`Δt内 = ${n(v.innerDt)} s`,{innerDt:v.innerDt},cascadeNote),
      C('outer-dt','外环采样周期',v.outerDt,`Δt外 = 5 × ${n(v.innerDt)} = ${n(v.outerDt)} s`,{innerDt:v.innerDt,innerUpdatesPerOuter:5},cascadeNote),
      C('rate-ratio','每个外环周期的内环次数',v.outerDt/v.innerDt,`${n(v.outerDt)} / ${n(v.innerDt)} = ${n(v.outerDt/v.innerDt)} 次`,{outerDt:v.outerDt,innerDt:v.innerDt},cascadeNote+' 不把外环间隔误当作内环停止。'),
      C('reference-limit','速度目标的限制',[-1,1],'−1 ≤ v_ref ≤ 1 m/s',{referenceLimit:1},cascadeNote),
      C('command-limit','内环有效指令的限制',[-2,2],'−2 ≤ u ≤ 2 m/s',{commandLimit:2},cascadeNote)
    ];
    if(Object.hasOwn(v,'previousPosition')){const previous=i===1?{position:0,velocity:0,velocityReference:0,t:0}:h[i-1],firstK=Math.round(previous.t/.02),count=Math.round((v.t-previous.t)/.02),rows=cascadeSegment(p,{position:previous.position,velocity:previous.velocity,velocityReference:previous.velocityReference,k:firstK},count),last=rows.at(-1);return [
      C('executed-updates','本播放帧间实际内环更新数',count,`(${n(v.t)} − ${n(previous.t)}) / 0.02 = ${count} 次；采样${firstK+1}…${firstK+count}`,{previousDisplayedTime:previous.t,currentTime:v.t,innerDt:.02},cascadeNote+' 原模型通常每5次存一个播放帧；这里展开已执行子步，不增加动画帧。'),
      ...rows.flatMap(x=>cascadeCells(p,x)),
      C('recorded-state-check','复算与当前实际串级状态一致',near(last.position,v.position)&&near(last.velocity,v.velocity)&&near(last.velocityReference,v.velocityReference)&&near(last.previousPosition,v.previousPosition)&&near(last.previousVelocity,v.previousVelocity)&&near(last.u,v.u)&&near(last.load,v.load)&&last.outerUpdated===v.outerUpdated,`复算q=${n(last.position)}，v=${n(last.velocity)}，v_ref=${n(last.velocityReference)}；当前实际快照逐项核对`,{recomputedPosition:last.position,recordedPosition:v.position,recomputedVelocity:last.velocity,recordedVelocity:v.velocity,recomputedReference:last.velocityReference,recordedReference:v.velocityReference,recomputedCommand:last.u,recordedCommand:v.u},cascadeNote)
    ];}
    const last=h[h.length-2],rows=cascadeSegment(p,{position:0,velocity:0,velocityReference:0,k:0},Math.round(last.t/.02)),updates=rows.filter(x=>x.outerUpdated),lastOuter=updates.at(-1);return [
      C('position-error','已完成3s记录的终态位置误差',v.positionError,`1 − ${n(v.position)} = ${n(v.positionError)} m`,{target:1,lastRecordedPosition:v.position,elapsedSeconds:last.t},cascadeNote+' 有限时间末值，不宣称已达到稳态。'),
      C('final-position','最后一次对象位置更新',v.position,`${n(last.previousPosition)} + 0.02 × ${n(last.velocity)} = ${n(v.position)} m`,{previousPosition:last.previousPosition,dt:.02,newVelocity:last.velocity},cascadeNote),
      C('final-velocity','最后一次对象速度更新',v.velocity,`${n(last.previousVelocity)} + 0.02 × (${n(last.u)} − ${n(last.previousVelocity)} − ${n(last.load)}) / 0.3 = ${n(v.velocity)} m/s`,{previousVelocity:last.previousVelocity,dt:.02,command:last.u,load:last.load,tau:.3},cascadeNote),
      C('held-final-reference','终态仍保持的速度目标',v.velocityReference,`最后外环采样k=${lastOuter.k}：clip(${n(p.outer)} × (1 − ${n(lastOuter.previousPosition)}), −1, 1) = ${n(v.velocityReference)} m/s`,{lastOuterInputTime:lastOuter.inputTime,outerGain:p.outer,positionAtLastOuterSample:lastOuter.previousPosition},cascadeNote+' 末个内环采样k=149没有重新采样外环。'),
      C('outer-updates','已执行的外环更新次数',v.outerUpdates,`k ∈ {0, 5, …, 145}，count = ${updates.length} 次`,{zeroBasedOuterUpdateIndices:updates.map(x=>x.k),innerUpdates:rows.length,stepsPerOuter:5},cascadeNote),
      C('inner-updates','已执行的内环更新次数',rows.length,`${n(last.t)} / 0.02 = ${rows.length} 次`,{elapsedSeconds:last.t,innerDt:.02},cascadeNote)
    ];
  },[
    E('apply-load','只把1s后负载从0改为0.4m/s','负载开始前轨迹会改变吗，首次受载时外环目标和内环指令是否立刻改变？',{disturbance:0},{disturbance:.4},'前50次更新相同；第51次起点t=1s，目标和u先保持相同，但负载使该步速度少0.0266667m/s、位置少0.0005333m；3s末误差增大。',(a,b)=>a.params.disturbance===0&&b.params.disturbance===.4&&a.result.samples.slice(0,50).every((x,k)=>near(x.position,b.result.samples[k].position)&&near(x.velocity,b.result.samples[k].velocity)&&near(x.velocityReference,b.result.samples[k].velocityReference))&&near(a.result.samples[50].load,0)&&near(b.result.samples[50].load,.4)&&near(a.result.samples[50].velocityReference,b.result.samples[50].velocityReference)&&near(a.result.samples[50].u,b.result.samples[50].u)&&near(a.result.samples[50].velocity-b.result.samples[50].velocity,.02*.4/.3)&&near(a.result.samples[50].position-b.result.samples[50].position,.02*.02*.4/.3)&&b.result.positionError>a.result.positionError&&a.result.outerUpdates===30&&b.result.outerUpdates===30)
  ],'真实快慢采样历史逐帧继续；每个显示间隔展开已执行内环子步，不伪造外环连续更新或真实电机。');
  return {courseId:'pid',models};
});
