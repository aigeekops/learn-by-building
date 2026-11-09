/* Original robotics teaching calculations. No network, robot command, or record writes. */
(function(global){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n.toFixed(3)).toString();
  function renderSeries(frame){
    const s=frame.scene,colors=['#267d78','#7961d4','#d19b39','#b95464'];
    const values=s.series.flatMap(x=>x.values),low=Math.min(0,...values),high=Math.max(1,...values),span=high-low||1;
    const count=Math.max(2,...s.series.map(x=>x.values.length));
    const paths=s.series.map((line,j)=>{
      const d=line.values.map((v,i)=>`${i?'L':'M'}${64+i/(count-1)*500},${217-(v-low)/span*168}`).join(' ');
      const points=line.values.length<15?line.values.map((v,i)=>`<circle cx="${64+i/(count-1)*500}" cy="${217-(v-low)/span*168}" r="3" fill="${colors[j]}"/>`).join(''):'';
      return `<path d="${d}" fill="none" stroke="${colors[j]}" stroke-width="3"/>${points}<rect x="${64+j*137}" y="260" width="13" height="4" fill="${colors[j]}"/><text x="${82+j*137}" y="266">${esc(line.label)}</text>`;
    }).join('');
    return `<svg viewBox="0 0 640 340" role="img" aria-label="${esc(s.label)}"><rect width="640" height="340" rx="16" fill="#f8faf9"/><text x="28" y="27" fill="#34413e">${esc(s.label)}</text><path d="M64 42V217H576" fill="none" stroke="#bfcfc9"/><text x="13" y="56">${fmt(high)}</text><text x="13" y="220">${fmt(low)}</text><text x="494" y="241">${esc(s.unitX||'采样步')}</text><text x="66" y="42">${esc(s.unitY||'归一化量')}</text>${paths}${(s.cards||[]).map((c,i)=>`<text x="${24+(i%3)*205}" y="${300+Math.floor(i/3)*22}" font-size="12">${esc(c.label)}：${esc(typeof c.value==='number'?fmt(c.value):c.value)}</text>`).join('')}</svg>`;
  }
  const models={
    'rf-p-feedback':{
      controls:[{key:'target',label:'目标速度',min:0.5,max:3,step:0.5,value:1,unit:'m/s'},{key:'kp',label:'比例增益 Kp',min:0,max:4,step:0.25,value:2,unit:''},{key:'dt',label:'采样间隔 Δt',min:0.05,max:0.2,step:0.05,value:0.2,unit:'s'}],
      run:(p={})=>{
        const target=p.target??1,kp=p.kp??2,dt=p.dt??0.2;
        for(const [name,v,min,max] of [['target',target,0.5,3],['kp',kp,0,4],['dt',dt,0.05,0.2]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' 超出本课模型范围');
        const tau=1,steps=16,frames=[],history=[0],commands=[0],targets=[target];
        const frame=(title,text,code,vars)=>({title,text,code,vars,scene:{label:'理想一阶速度对象的比例反馈',unitY:'m/s',series:[{label:'目标速度',values:targets.slice()},{label:'实际速度',values:history.slice()},{label:'有效速度指令',values:commands.slice()}],cards:[{label:'采样间隔',value:dt+' s'},{label:'时间常数',value:tau+' s'},{label:'比例增益',value:kp}]}});
        frames.push(frame('先明确对象和单位','目标与实际速度都用 m/s。u 是本例折算后的有效速度指令；未加入真实电机限流、摩擦或延迟。','let y = 0;\nconst tau = 1;', {target,y:0,tau,dt}));
        frames.push(frame('误差是目标减测量','误差为正，表示需要加速；反馈在每次采样重新计算，不是只算一次。','const error = target - y;\nconst u = kp * error;', {error:target,u:kp*target}));
        let y=0;
        for(let k=1;k<=steps;k++){
          const before=y,error=target-before,u=kp*error;
          y=before+dt*(u-before)/tau;
          history.push(y);commands.push(u);targets.push(target);
          frames.push(frame('第 '+k+' 次反馈更新','先算误差和指令，再用前向 Euler 更新对象。这里 Δt(1+Kp)/τ≤1，轨迹不会因步长过大来回跳动。','const error = target - y;\nconst u = kp * error;\ny = y + dt * (u - y) / tau;', {step:k,time:k*dt,before,error,u,after:y}));
        }
        const steady=target*kp/(1+kp),steadyError=target/(1+kp);
        frames.push(frame('把有限步结果与稳态分开','在这个无积分的一阶模型里，稳态满足 y=u=Kp(r−y)，所以比例增益有限时仍有误差。动画末步不等于已经达到稳态。','const steady = target * kp / (1 + kp);\nconst steadyError = target / (1 + kp);',{finiteStepVelocity:y,steady,steadyError}));
        return {frames,result:{velocity:y,history,commands,steady,steadyError,dt,tau,target,kp},summary:'比例反馈使速度接近目标；本模型的比例控制存在可解析的稳态误差。',boundary:'一阶理想计算模型，前向 Euler；u按速度折算。没有真实电机、传感器、限流、通信延迟或硬件验收。'};
      },render:renderSeries
    },
    'rf-discrete-pid':{
      controls:[{key:'kp',label:'Kp',min:0,max:3,step:0.1,value:1.2,unit:''},{key:'ki',label:'Ki',min:0,max:2,step:0.1,value:0.6,unit:'s⁻¹'},{key:'kd',label:'Kd',min:0,max:1,step:0.05,value:0.1,unit:'s'},{key:'dt',label:'采样间隔 Δt',min:0.1,max:1,step:0.1,value:0.5,unit:'s'}],
      run:(p={})=>{
        const kp=p.kp??1.2,ki=p.ki??0.6,kd=p.kd??0.1,dt=p.dt??0.5;
        for(const [name,v,min,max] of [['kp',kp,0,3],['ki',ki,0,2],['kd',kd,0,1],['dt',dt,0.1,1]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' 超出本课模型范围');
        const measurements=[0,0.2,0.5,0.7,0.65,0.8],target=1,frames=[],terms=[],uHistory=[],iHistory=[];
        let integral=0,previousY=measurements[0];
        const frame=(title,text,code,vars)=>({title,text,code,vars,scene:{label:'同一段记录上的离散 PID 算术',unitY:'归一化指令',series:[{label:'测量记录',values:measurements.slice(0,terms.length)},{label:'输出指令',values:uHistory.slice()},{label:'积分贡献 Ki·I',values:iHistory.slice()}],cards:[{label:'Δt',value:dt+' s'},{label:'微分方式',value:'对测量微分'},{label:'对象状态',value:'没有闭环对象'}]}});
        frames.push(frame('记录输入和初始状态','目标与测量都归一化；I保存误差随时间的面积。这里固定回放六个测量值，便于逐项复算控制器。','let integral = 0;\nlet previousY = measurements[0];',{target,measurements,integral,previousY}));
        for(let k=0;k<measurements.length;k++){
          const y=measurements[k],error=target-y,beforeIntegral=integral;
          integral+=error*dt;
          const derivative=k===0?0:-(y-previousY)/dt;
          const proportional=kp*error,integralTerm=ki*integral,derivativeTerm=kd*derivative,u=proportional+integralTerm+derivativeTerm;
          terms.push({step:k,y,error,beforeIntegral,integral,derivative,proportional,integralTerm,derivativeTerm,u});
          frames.push(frame('采样 '+k+'：计算误差','先比较目标与当前测量。当前记录在第4步略微下降，可以观察微分贡献的符号怎样改变。','const error = target - y;',{step:k,y,target,error}));
          iHistory.push(integralTerm);
          frames.push(frame('采样 '+k+'：累加误差面积','离散积分必须乘 Δt。Ki带 1/s 的单位，把误差面积转换为归一化指令。','integral += error * dt;\nconst integralTerm = ki * integral;',{beforeIntegral,error,dt,integral,integralTerm}));
          frames.push(frame('采样 '+k+'：计算测量变化','使用 −Δy/Δt，避免仅由目标跳变产生微分冲击。首帧没有上一段变化，约定微分项为0。','const derivative = k === 0 ? 0 : -(y - previousY) / dt;\nconst derivativeTerm = kd * derivative;',{previousY,y,derivative,derivativeTerm}));
          uHistory.push(u);
          frames.push(frame('采样 '+k+'：合成指令','P响应现在的误差，I保留过去的面积，D响应测量变化。改变参数不会改变这段预设测量记录；这里只检验控制器算术。','const u = kp * error + ki * integral + kd * derivative;\npreviousY = y;',{proportional,integralTerm,derivativeTerm,u}));
          previousY=y;
        }
        return {frames,result:{terms,commands:uHistory,integral,measurementSource:'固定原创记录，没有闭环对象'},summary:'离散PID需要明确采样时间、积分状态与微分约定。',boundary:'固定测量记录上的控制器计算；未闭环驱动对象，未限幅，未加入微分滤波。参数不能据此直接用于真机。'};
      },render:renderSeries
    },
    'rf-anti-windup':{
      controls:[{key:'target',label:'前半段目标',min:1.5,max:3,step:0.5,value:2,unit:''},{key:'ki',label:'Ki',min:0,max:2,step:0.1,value:0.8,unit:'s⁻¹'},{key:'anti',label:'当前观察',options:['仅限制输出','限幅并条件积分'],value:1}],
      run:(p={})=>{
        const target=p.target??2,ki=p.ki??0.8,anti=p.anti??1;
        for(const [name,v,min,max] of [['target',target,1.5,3],['ki',ki,0,2],['anti',anti,0,1]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' 超出本课模型范围');
        if(!Number.isInteger(anti))throw new RangeError('anti 必须是0或1');
        const dt=0.25,kp=1,limit=1,lowTarget=0.3,frames=[],runs=[];
        for(const useAnti of [false,true]){
          let y=0,integral=0;const samples=[];
          for(let k=0;k<20;k++){
            const r=k<8?target:lowTarget,error=r-y,candidate=integral+error*dt,candidateRaw=kp*error+ki*candidate;
            const blocked=useAnti&&((candidateRaw>limit&&error>0)||(candidateRaw< -limit&&error<0));
            const beforeIntegral=integral;if(!blocked)integral=candidate;
            const raw=kp*error+ki*integral,u=Math.max(-limit,Math.min(limit,raw)),before=y;
            y+=dt*(u-y);
            samples.push({step:k,time:(k+1)*dt,target:r,before,error,beforeIntegral,candidate,candidateRaw,blocked,integral,raw,u,y});
          }
          runs.push(samples);
        }
        const frame=(n,title,text,code,vars)=>({title,text,code,vars,scene:{label:'输出限幅与条件积分的对照',unitY:'归一化量',series:[{label:'目标',values:[0,...runs[anti].slice(0,n).map(x=>x.target)]},{label:'仅限幅速度',values:[0,...runs[0].slice(0,n).map(x=>x.y)]},{label:'条件积分速度',values:[0,...runs[1].slice(0,n).map(x=>x.y)]},{label:'当前输出',values:[0,...runs[anti].slice(0,n).map(x=>x.u)]}],cards:[{label:'输出范围',value:'−1 ≤ u ≤ 1'},{label:'采样间隔',value:'0.25 s'},{label:'积分策略',value:anti?'条件积分':'持续积分'}]}});
        frames.push(frame(0,'目标先超过能力，再回到能力内','前8次目标大于最大有效指令；之后目标降为0.3。两个控制器具有相同对象、采样与限幅，仅积分策略不同。','const u = Math.max(-1, Math.min(1, raw));\ny += 0.25 * (u - y);',{target,lowTarget,kp,ki,limit,dt}));
        const first=runs[anti][0];
        frames.push(frame(0,'先检查候选积分是否把饱和推得更深','若输出已将饱和且误差还推动同一方向，本课暂停这一步积分；向解除饱和方向变化时允许积分。','const blocked = useAnti && ((candidateRaw > limit && error > 0) ||\n  (candidateRaw < -limit && error < 0));\nif (!blocked) integral = candidate;',{candidate:first.candidate,candidateRaw:first.candidateRaw,blocked:first.blocked,integral:first.integral}));
        runs[anti].forEach((x,k)=>frames.push(frame(k+1,'第 '+(k+1)+' 次：'+(k<8?'能力外目标':'目标已降到0.3'),x.blocked?'条件积分冻结本步积分；输出仍按范围限幅。':'本步接受积分更新，再执行限幅与对象更新。','const candidate = integral + error * dt;\nif (!blocked) integral = candidate;\nconst u = Math.max(-limit, Math.min(limit, kp * error + ki * integral));\ny += dt * (u - y);',x)));
        const naiveIntegral=runs[0][7].integral,guardedIntegral=runs[1][7].integral;
        frames.push(frame(20,'比较切换后的恢复过程','限幅只约束执行量，不会自行清除控制器内部积累。条件积分是一种具体抗饱和方法，不能保证所有对象都没有超调。','const storedAtSwitch = samples[7].integral;\nconst firstCommandAfterDrop = samples[8].u;', {naiveIntegral,guardedIntegral,naiveFirstAfterDrop:runs[0][8].u,guardedFirstAfterDrop:runs[1][8].u}));
        return {frames,result:{runs,selected:anti,naiveIntegral,guardedIntegral,dt,limit,lowTarget},summary:'把输出夹到范围内与管理积分状态是两件事；用同一目标切换检验恢复过程。',boundary:'理想一阶对象上的离散PI对照，固定步长0.25s；本课未加入微分，未验证真实执行器。条件积分不是所有工业抗饱和方法的统一实现。'};
      },render:renderSeries
    }
  };
  models['rf-derivative-filter']={
    controls:[{key:'noise',label:'固定交替噪声幅度',min:0,max:.2,step:.05,value:.1,unit:'m'},{key:'tau',label:'微分滤波时间常数',min:0,max:.5,step:.05,value:.2,unit:'s'},{key:'kd',label:'微分增益',min:.5,max:3,step:.5,value:1,unit:'s'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const noise=pick('noise',0,.2,.1),tau=pick('tau',0,.5,.2),kd=pick('kd',.5,3,1),dt=.1,alpha=tau/(tau+dt),samples=[],frames=[];let previous=0,filtered=0;
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{label:title,unitY:"本课各曲线单位见讲解",series:[{label:'原始微分',values:samples.map(x=>x.raw)},{label:'滤波微分',values:samples.map(x=>x.filtered)},{label:'无噪声参考',values:samples.map(x=>x.reference)}]}});
      add('微分作用在测量，避免目标阶跃直接冲击','使用−Kd·dy/dt，目标不进入微分支路。固定噪声只是原创反例，不是传感器采集。','const alpha = tau / (tau + dt);',{noise,tau,kd,dt,alpha});
      for(let k=0;k<16;k++){const previousMeasurement=previous,t=k*dt,truth=.2*t,measurement=truth+noise*(k%2===0?1:-1),raw=k===0?0:-kd*(measurement-previousMeasurement)/dt;filtered=k===0?0:alpha*filtered+(1-alpha)*raw;const reference=k===0?0:-kd*.2;previous=measurement;samples.push({t,truth,measurement,raw,filtered,reference});add(k===0?'首帧没有前一测量，微分初始化为0':'采样 '+k+'：有限差分后低通','低通减弱快速变化，也会滞后。τ=0时α=0，结果退化为未滤波微分。','const raw = k===0 ? 0 : -kd*(measurement-previousMeasurement)/dt;\nfiltered = k===0 ? 0 : alpha*filtered+(1-alpha)*raw;',{k,t,truth,measurement,previousMeasurement,raw,filtered,reference,alpha});}
      const rawError=samples.slice(1).reduce((s,x)=>s+(x.raw-x.reference)**2,0)/15,filteredError=samples.slice(1).reduce((s,x)=>s+(x.filtered-x.reference)**2,0)/15;add('用参考误差解释取舍','本段数据中比较均方误差；滤波并不保证任意信号或所有时间段都更准。','const mse = errors.reduce((s,e)=>s+e*e,0)/errors.length;',{rawError,filteredError});
      return {frames,result:{samples,alpha,rawError,filteredError},summary:'用同一测量序列比较原始微分与低通微分。',boundary:'固定标量噪声与离散低通；没有完整工业PID、硬件噪声标定或闭环稳定性保证。'};
    },render:renderSeries
  };

  models['rf-pid-tuning']={
    controls:[{key:'kp',label:'位置比例增益',min:.5,max:4,step:.5,value:2,unit:'N/m'},{key:'kd',label:'速度反馈增益',min:0,max:3,step:.5,value:1.5,unit:'N·s/m'},{key:'limit',label:'力的绝对上限',min:1,max:5,step:1,value:3,unit:'N'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const kp=pick('kp',.5,4,2),kd=pick('kd',0,3,1.5),limit=pick('limit',1,5,3),dt=.05,mass=1,damping=.4,frames=[],samples=[];let position=0,velocity=0,iae=0;
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{label:title,unitY:"本课各曲线单位见讲解",series:[{label:'位置',values:samples.map(x=>x.position)},{label:'目标',values:samples.map(()=>1)},{label:'速度',values:samples.map(x=>x.velocity)}]}});
      add('先明确对象与调参目标','质量1kg、黏性阻尼0.4N·s/m，目标位置1m。PD用于区分Kp与阻尼效果；积分抗饱和由前一课单独讲。','const u = clamp(kp*(1-position)-kd*velocity,-limit,limit);',{kp,kd,limit,dt,mass,damping});
      for(let k=0;k<80;k++){const previousPosition=position,previousVelocity=velocity,error=1-position,raw=kp*error-kd*velocity,u=Math.max(-limit,Math.min(limit,raw)),acceleration=(u-damping*velocity)/mass;velocity+=dt*acceleration;position+=dt*velocity;iae+=dt*Math.abs(error);samples.push({t:(k+1)*dt,position,velocity,error,raw,u,acceleration});if(k%4===0||k===79)add('t='+((k+1)*dt).toFixed(2)+'s：由当前误差产生力','采用半隐式Euler：先更新速度，再更新位置；与连续解析系统的指标仍可能存在离散误差。','const acceleration=(u-damping*previousVelocity)/mass;\nvelocity=previousVelocity+dt*acceleration; position=previousPosition+dt*velocity;',{t:(k+1)*dt,previousPosition,previousVelocity,position,velocity,error,raw,u,acceleration});}
      const overshoot=Math.max(0,...samples.map(x=>x.position-1)),lastViolation=samples.reduce((j,x,i)=>Math.abs(x.position-1)>.02||Math.abs(x.velocity)>.05?i:j,-1),settlingTime=lastViolation===samples.length-1?null:(lastViolation<0?0:samples[lastViolation+1].t),saturated=samples.filter(x=>Math.abs(x.raw)>limit).length;
      add('比较超调、误差与观察窗口','若最后一帧仍超出2%位置与0.05m/s速度条件，稳定时间保持未知；不把4秒窗口当无限时间结论。','const settlingTime = lastViolation===samples.length-1 ? null : samples[lastViolation+1]?.t ?? 0;',{overshoot,iae,settlingTime,saturated,linearDampingRatio:(damping+kd)/(2*Math.sqrt(mass*kp))});
      return {frames,result:{samples,overshoot,iae,settlingTime,saturated,linearDampingRatio:(damping+kd)/(2*Math.sqrt(mass*kp))},summary:'每次只改一个增益，记录多个可解释指标。',boundary:'给定二阶质量阻尼对象的离散PD实验；未加入延迟、弹性、积分或真实电机参数辨识。'};
    },render:renderSeries
  };

  models['rf-cascade-control']={
    controls:[{key:'outer',label:'外环位置比例增益',min:.5,max:3,step:.5,value:1.5,unit:'1/s'},{key:'inner',label:'内环速度比例增益',min:1,max:5,step:1,value:3,unit:''},{key:'disturbance',label:'1秒后负载扰动',min:0,max:.6,step:.2,value:.4,unit:'m/s'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const outer=pick('outer',.5,3,1.5),inner=pick('inner',1,5,3),disturbance=pick('disturbance',0,.6,.4),dt=.02,frames=[],samples=[];let position=0,velocity=0,velocityReference=0;
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{label:title,unitY:"本课各曲线单位见讲解",series:[{label:'位置',values:samples.map(x=>x.position)},{label:'速度',values:samples.map(x=>x.velocity)},{label:'速度目标',values:samples.map(x=>x.velocityReference)}]}});
      add('外环位置给内环速度目标','外环每0.1秒更新，内环每0.02秒更新；这里只是明确的两层P控制，不能把串级结构本身当作更优保证。','if(k%5===0) velocityReference=clamp(outer*(1-position),-1,1);',{outer,inner,disturbance,innerDt:dt,outerDt:5*dt});
      for(let k=0;k<150;k++){
        const outerUpdated=k%5===0;if(outerUpdated)velocityReference=Math.max(-1,Math.min(1,outer*(1-position)));
        const previousPosition=position,previousVelocity=velocity,t=k*dt,load=t>=1?disturbance:0,raw=inner*(velocityReference-velocity),u=Math.max(-2,Math.min(2,raw)),acceleration=(u-velocity-load)/.3;velocity+=dt*acceleration;position+=dt*velocity;samples.push({t:t+dt,position,velocity,velocityReference,load,u,outerUpdated});
        if(outerUpdated||k===149)add('t='+(t+dt).toFixed(2)+'s：'+(outerUpdated?'外环采样，随后内环更新':'内环更新'),'1秒后引入负载；外环采样之间保持速度目标，内环继续使用最新速度测量。','const u=clamp(inner*(velocityReference-previousVelocity),-2,2);\nvelocity=previousVelocity+dt*(u-previousVelocity-load)/0.3; position=previousPosition+dt*velocity;',{t:t+dt,previousPosition,previousVelocity,position,velocity,velocityReference,load,u,outerUpdated});
      }
      const positionError=1-position;add('分开检查两个环及其限制','速度环没有积分，恒定负载会造成速度偏差；位置环可以继续改变速度目标，但仍受目标限幅和执行限幅约束。','const positionError=1-position;',{position,velocity,velocityReference,positionError,outerUpdates:samples.filter(x=>x.outerUpdated).length});
      return {frames,result:{samples,position,velocity,velocityReference,positionError,outerUpdates:samples.filter(x=>x.outerUpdated).length},summary:'观察快内环、慢外环与扰动经过的实际路径。',boundary:'人工一阶速度对象与串级P控制；无真实采样抖动、总线延迟、编码器或电机电流环。'};
    },render:renderSeries
  };

  function renderExpandedControl(frame){
    const s=frame.scene,rows=s.series,derivative=rows[0].label==='原始微分',cascade=rows[2]?.label==='速度目标';
    const text=(x,y,value,size=12)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#17394c">${esc(value)}</text>`;
    const chart=(series,left,width,label)=>{
      const values=series.flatMap(row=>row.values),low=Math.min(0,...values),high=Math.max(1,...values),span=high-low,count=Math.max(2,...series.map(row=>row.values.length)),colors=['#258279','#6883bf','#bf8241'];
      return `<path d="M${left} 65V240H${left+width}" fill="none" stroke="#c4d6df"/>${text(left,48,label)}${text(left-5,65,fmt(high),10)}${text(left-5,253,fmt(low),10)}`+series.map((row,j)=>`<polyline points="${row.values.map((v,i)=>(left+i/(count-1)*width)+','+(235-(v-low)/span*155)).join(' ')}" fill="none" stroke="${colors[j]}" stroke-width="2.5"/>${text(left,276+j*17,row.label)}`).join('');
    };
    let body;
    if(derivative)body=chart(rows,55,525,'微分支路有效指令（m）；时间采样步');
    else if(cascade)body=chart([rows[0],{label:'位置目标',values:rows[0].values.map(()=>1)}],45,245,'位置（m）')+chart([rows[1],rows[2]],350,245,'速度（m/s）');
    else body=chart(rows.slice(0,2),45,245,'位置（m）')+chart([rows[2]],350,245,'速度（m/s）');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 340" role="img" aria-label="${esc(frame.title)}"><rect width="640" height="340" rx="15" fill="#f6f9fb"/>${text(20,25,frame.title,14)}${body}</svg>`;
  }
  for(const key of ['rf-derivative-filter','rf-pid-tuning','rf-cascade-control'])models[key].render=renderExpandedControl;
  if(typeof module!=='undefined'&&module.exports)module.exports=models;
  global.RoboticsFoundationModels=Object.assign(global.RoboticsFoundationModels||{},models);
})(globalThis);
