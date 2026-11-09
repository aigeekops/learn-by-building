/* Original deterministic estimation exercises; no external data or physical sensor reads. */
(function(global){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Number(n.toFixed(3)).toString();
  function renderSeries(frame){
    const s=frame.scene,colors=['#267d78','#7961d4','#ce9535'],values=s.series.flatMap(x=>x.values);
    const lo=Math.min(0,...values),hi=Math.max(1,...values),span=hi-lo||1,count=Math.max(2,...s.series.map(x=>x.values.length));
    const lines=s.series.map((line,j)=>`<path d="${line.values.map((v,i)=>`${i?'L':'M'}${65+i/(count-1)*500},${218-(v-lo)/span*169}`).join(' ')}" fill="none" stroke="${colors[j]}" stroke-width="3"/>${line.values.map((v,i)=>`<circle cx="${65+i/(count-1)*500}" cy="${218-(v-lo)/span*169}" r="3" fill="${colors[j]}"/>`).join('')}<rect x="${65+j*165}" y="257" width="13" height="4" fill="${colors[j]}"/><text x="${83+j*165}" y="264">${esc(line.label)}</text>`).join('');
    return `<svg viewBox="0 0 640 340" role="img" aria-label="${esc(s.label)}"><rect width="640" height="340" rx="16" fill="#f8faf9"/><text x="24" y="27">${esc(s.label)}</text><path d="M65 43V218H578" fill="none" stroke="#bfcfc9"/><text x="11" y="57">${fmt(hi)}</text><text x="11" y="222">${fmt(lo)}</text><text x="66" y="42">${esc(s.unitY)}</text><text x="505" y="241">采样步</text>${lines}${(s.cards||[]).map((c,i)=>`<text x="${24+(i%3)*205}" y="${299+Math.floor(i/3)*22}" font-size="12">${esc(c.label)}：${esc(typeof c.value==='number'?fmt(c.value):c.value)}</text>`).join('')}</svg>`;
  }
  function renderBeliefs(frame){
    const s=frame.scene,colors=['#267d78','#7961d4','#ce9535'];
    const bounds=s.beliefs.flatMap(b=>[b.mean-3*Math.sqrt(b.variance),b.mean+3*Math.sqrt(b.variance)]);
    if(s.measurement!==null)bounds.push(s.measurement);
    let lo=Math.min(...bounds)-1,hi=Math.max(...bounds)+1;if(hi-lo<1)hi=lo+1;
    const x=n=>65+(n-lo)/(hi-lo)*500;
    const densities=s.beliefs.map(b=>b.variance>0?1/Math.sqrt(2*Math.PI*b.variance):1),maxDensity=Math.max(...densities);
    const lines=s.beliefs.map((b,j)=>{
      const path=b.variance===0?`M${x(b.mean)} 217V50`:Array.from({length:100},(_,i)=>{const v=lo+(hi-lo)*i/99,d=Math.exp(-0.5*(v-b.mean)**2/b.variance)/Math.sqrt(2*Math.PI*b.variance);return `${i?'L':'M'}${x(v)},${217-d/maxDensity*166}`;}).join(' ');
      return `<path d="${path}" fill="none" stroke="${colors[j]}" stroke-width="3"/><rect x="${65+j*165}" y="258" width="13" height="4" fill="${colors[j]}"/><text x="${83+j*165}" y="264">${esc(b.label)}</text><text x="${30+j*202}" y="296" font-size="12">μ=${fmt(b.mean)} m；P=${fmt(b.variance)} m²</text>`;
    }).join('');
    return `<svg viewBox="0 0 640 340" role="img" aria-label="一维高斯信念的均值和方差"><rect width="640" height="340" rx="16" fill="#f8faf9"/><text x="24" y="27">${esc(s.label)}</text><text x="66" y="46" font-size="12">密度曲线；P=0时画点质量位置</text><path d="M65 50V217H578" stroke="#bfcfc9" fill="none"/>${lines}${s.measurement===null?'':`<path d="M${x(s.measurement)} 55V217" stroke="#b95464" stroke-width="2" stroke-dasharray="5 4"/><text x="${Math.min(500,x(s.measurement)+6)}" y="75" fill="#a44b5a">观测 ${fmt(s.measurement)}m</text>`}<text x="65" y="239">${fmt(lo)}</text><text x="513" y="239">${fmt(hi)} m</text><text x="24" y="325" font-size="12">曲线高度随方差改变；颜色表示当前已计算到的信念。</text></svg>`;
  }
  const models={
    'rf-noisy-measurements':{
      controls:[{key:'sigma',label:'单次读数假定标准差 σ',min:0.2,max:2,step:0.2,value:1,unit:'cm'},{key:'bias',label:'固定偏差',min:-2,max:2,step:0.25,value:0.5,unit:'cm'},{key:'n',label:'读数个数',min:2,max:8,step:2,value:6,unit:'个'}],
      run:(p={})=>{
        const sigma=p.sigma??1,bias=p.bias??0.5,n=p.n??6;
        for(const [name,v,min,max] of [['sigma',sigma,0.2,2],['bias',bias,-2,2],['n',n,2,8]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' 超出本课模型范围');
        if(!Number.isInteger(n)||n%2!==0)throw new RangeError('n 必须是2、4、6或8');
        const reference=10,pattern=[-1,1,-0.5,0.5,-0.8,0.8,-0.2,0.2],readings=pattern.slice(0,n).map(z=>reference+bias+sigma*z),frames=[],means=[];
        const frame=(count,title,text,code,vars)=>({title,text,code,vars,scene:{label:'随机波动的直觉与固定偏差',unitY:'cm',series:[{label:'已知参考',values:Array(count).fill(reference)},{label:'固定示例读数',values:readings.slice(0,count)},{label:'累计均值',values:means.slice(0,count)}],cards:[{label:'固定偏差',value:bias+' cm'},{label:'假定单次σ',value:sigma+' cm'},{label:'数据类型',value:'确定性原创示例'}]}});
        frames.push(frame(0,'先区分波动与偏差','参考物体位置为10cm；本课使用成对的固定扰动，便于手算。σ只是生成幅度和理论方差假设，不是从这几次读数估计得到的。','const z = reference + bias + sigma * pattern[k];',{reference,bias,sigma,pattern:pattern.slice(0,n)}));
        let sum=0;
        readings.forEach((z,i)=>{sum+=z;means.push(sum/(i+1));frames.push(frame(i+1,'读入第 '+(i+1)+' 个读数','保存原始读数，再更新均值。不同读数暂时相互抵消，不代表系统偏差会被消除。','sum += z;\nconst mean = sum / count;',{count:i+1,z,sum,mean:means[i]}));});
        const mean=means[n-1],sampleVariance=readings.reduce((sum,z)=>sum+(z-mean)**2,0)/(n-1),assumedMeanSd=sigma/Math.sqrt(n);
        frames.push(frame(n,'统计理论有明确前提','若读数独立、无偏、同方差R，则均值方差为R/n，标准差σ/√n。固定示例并不是随机抽样，不能用一次抵消证明这个统计规律。','const assumedMeanSd = sigma / Math.sqrt(n);\nconst sampleVariance = squaredDeviations / (n - 1);',{mean,sampleVariance,assumedR:sigma*sigma,assumedMeanSd,errorFromReference:mean-reference}));
        frames.push(frame(n,'看清均值没有清除的部分','本例扰动成对抵消，所以最终均值正好为10+bias。要处理偏差，需要参考、标定或更完整模型。','const errorFromReference = mean - reference;',{mean,reference,errorFromReference:mean-reference,bias}));
        return {frames,result:{readings,mean,means,sampleVariance,assumedMeanSd,reference,bias,sigma,n},summary:'均值能降低特定假设下的随机波动；它不会自动修复固定偏差。',boundary:'固定扰动的确定性计算，不是传感器采集或蒙特卡洛实验。σ/√n依赖独立、无偏、同方差假设，相关噪声和偏差会改变结论。'};
      },render:renderSeries
    },
    'rf-kalman-update':{
      controls:[{key:'mean',label:'上一步均值 x',min:0,max:10,step:0.5,value:4,unit:'m'},{key:'variance',label:'上一步方差 P',min:0,max:16,step:0.5,value:4,unit:'m²'},{key:'q',label:'过程方差 Q',min:0,max:4,step:0.25,value:1,unit:'m²'},{key:'r',label:'观测方差 R',min:0.25,max:16,step:0.25,value:4,unit:'m²'},{key:'measurement',label:'本次观测 z',min:0,max:15,step:0.5,value:7,unit:'m'}],
      run:(p={})=>{
        const mean=p.mean??4,variance=p.variance??4,q=p.q??1,r=p.r??4,measurement=p.measurement??7;
        for(const [name,v,min,max] of [['mean',mean,0,10],['variance',variance,0,16],['q',q,0,4],['r',r,0.25,16],['measurement',measurement,0,15]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' 超出本课模型范围');
        const motion=1,predictedMean=mean+motion,predictedVariance=variance+q,innovation=measurement-predictedMean,innovationVariance=predictedVariance+r,gain=predictedVariance/innovationVariance,posteriorMean=predictedMean+gain*innovation;
        const posteriorVariance=(1-gain)**2*predictedVariance+gain*gain*r,frames=[];
        const prior={label:'上一步信念',mean,variance},predicted={label:'本步预测',mean:predictedMean,variance:predictedVariance},posterior={label:'观测后信念',mean:posteriorMean,variance:posteriorVariance};
        const add=(title,text,code,vars,beliefs,z=null)=>frames.push({title,text,code,vars,scene:{label:'一维位置：先预测，再用观测修正',beliefs,measurement:z}});
        add('把位置和不确定性一起保存','x是位置均值，单位m；P是位置误差的方差，单位m²。方差不是标准差，也不是误差本身。','const prior = { mean, variance };',{mean,variance},[prior]);
        add('预测位置向前1m','本例已知每步位移为1m。这里只估计一个位置变量，未同时估计速度。','const predictedMean = mean + motion;',{mean,motion,predictedMean},[prior,{label:'只平移均值',mean:predictedMean,variance}]);
        add('把运动的不确定性加进来','独立过程扰动的方差Q增加预测方差。只有均值移动、没有方差更新，会对模型过分自信。','const predictedVariance = variance + q;',{variance,q,predictedVariance},[prior,predicted]);
        add('比较观测和预测','创新是观测减预测；它可能来自模型误差，也可能来自测量噪声，不能仅凭一项创新断定哪方有错。','const innovation = measurement - predictedMean;\nconst innovationVariance = predictedVariance + r;',{measurement,innovation,innovationVariance},[predicted],measurement);
        add('用方差决定权重','K=P⁻/(P⁻+R)。R更大时，观测权重更小；P⁻更大时，更愿意用观测修正。','const gain = predictedVariance / (predictedVariance + r);',{predictedVariance,r,gain},[predicted],measurement);
        add('更新位置均值','后验均值从预测向观测移动K倍创新。K在0到1之间；P⁻=0时，模型认为位置完全确定，K为0。','const posteriorMean = predictedMean + gain * innovation;',{predictedMean,gain,innovation,posteriorMean},[predicted,{label:'已更新均值',mean:posteriorMean,variance:predictedVariance}],measurement);
        add('更新并检查方差','本例用标量Joseph形式计算方差，避免减法造成负方差。它与理想精度下的(1−K)P⁻相同。','const posteriorVariance = (1-gain)**2 * predictedVariance + gain*gain*r;',{posteriorMean,posteriorVariance,standardDeviation:Math.sqrt(posteriorVariance)},[predicted,posterior],measurement);
        return {frames,result:{mean,variance,q,r,measurement,motion,predictedMean,predictedVariance,innovation,innovationVariance,gain,posteriorMean,posteriorVariance},summary:'一维Kalman更新把模型预测与观测按不确定性融合；均值和方差一起推进。',boundary:'标量线性、独立零均值扰动的教学计算。高斯曲线表示假设中的信念，不是实测频率；P=0是退化点质量。未运行定位硬件。'};
      },render:renderBeliefs
    },
    'rf-filter-assumptions':{
      controls:[{key:'q',label:'滤波器假定 Q',min:0,max:4,step:0.05,value:0.1,unit:'m²'},{key:'r',label:'滤波器假定 R',min:0.1,max:9,step:0.1,value:1,unit:'m²'},{key:'spike',label:'第6次观测额外偏移',min:0,max:8,step:1,value:4,unit:'m'},{key:'gate',label:'创新处理',options:['接收全部观测','超过3σ时跳过本次更新'],value:0}],
      run:(p={})=>{
        const q=p.q??0.1,r=p.r??1,spike=p.spike??4,gate=p.gate??0;
        for(const [name,v,min,max] of [['q',q,0,4],['r',r,0.1,9],['spike',spike,0,8],['gate',gate,0,1]])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(name+' 超出本课模型范围');
        if(!Number.isInteger(gate))throw new RangeError('gate 必须为0或1');
        const truth=[0,1,2,3,5,7,9,11],noise=[0.4,-0.6,0.3,-0.2,0.5,-0.4,0.2,-0.3],observations=truth.map((x,i)=>x+noise[i]+(i===5?spike:0)),frames=[],samples=[],estimates=[];
        let mean=-1,variance=1,gateCount=0;
        const frame=(count,title,text,code,vars)=>({title,text,code,vars,scene:{label:'独立参考轨迹检查：平滑不等于准确',unitY:'m',series:[{label:'构造的参考真值',values:truth.slice(0,count)},{label:'带扰动观测',values:observations.slice(0,count)},{label:'滤波器估计',values:estimates.slice(0,count)}],cards:[{label:'模型位移',value:'每步固定1m'},{label:'第5步起真位移',value:'每步2m'},{label:'创新门限',value:gate?'NIS > 9时跳过':'未启用'}]}});
        frames.push(frame(0,'先留出模型之外的检查标准','滤波器仍假定位移为每步1m；参考轨迹中途改为每步2m。真值只供本例评价，不作为滤波输入。','const predictedMean = mean + 1;\nconst predictedVariance = variance + q;',{initialMean:mean,initialVariance:variance,q,r,spike}));
        for(let k=0;k<truth.length;k++){
          const predictedMean=mean+1,predictedVariance=variance+q,z=observations[k],innovation=z-predictedMean,innovationVariance=predictedVariance+r,nis=innovation**2/innovationVariance,gain=predictedVariance/innovationVariance,rejected=!!gate&&nis>9;
          if(rejected){mean=predictedMean;variance=predictedVariance;gateCount++;}
          else{mean=predictedMean+gain*innovation;variance=(1-gain)**2*predictedVariance+gain*gain*r;}
          estimates.push(mean);const error=mean-truth[k];
          samples.push({step:k,predictedMean,predictedVariance,z,innovation,innovationVariance,nis,gain,rejected,mean,variance,reference:truth[k],error});
          frames.push(frame(k+1,'第 '+(k+1)+' 次：'+(rejected?'跳过观测更新':'融合观测'),rejected?'超过门限后保留预测，并继续传播方差。大创新也可能是真实机动；门限不能证明观测一定坏了。':'先预测，再检查创新与其方差。没有触发跳过时执行普通标量更新。','const nis = innovation ** 2 / (predictedVariance + r);\nconst rejected = gate === 1 && nis > 9;\nmean = rejected ? predictedMean : predictedMean + gain * innovation;',samples[k]));
        }
        const mse=estimates.reduce((s,x,i)=>s+(x-truth[i])**2,0)/truth.length,measurementMSE=observations.reduce((s,x,i)=>s+(x-truth[i])**2,0)/truth.length;
        frames.push(frame(truth.length,'用参考误差检验，而不是只看曲线顺不顺','报告滤波均方误差与原始观测均方误差。某些Q/R与门限组合会在机动后持续落后；本例不承诺滤波总是更准。','const mse = estimates.reduce((sum, x, i) =>\n  sum + (x - truth[i]) ** 2, 0) / truth.length;',{mse,measurementMSE,gateCount,lastError:estimates.at(-1)-truth.at(-1)}));
        return {frames,result:{truth,observations,estimates,samples,mse,measurementMSE,gateCount,lastError:estimates.at(-1)-truth.at(-1)},summary:'Q/R描述的是假设；创新、独立参考误差与失败案例用来检查这些假设。',boundary:'固定原创轨迹与噪声，含刻意的模型失配和单点偏移；3σ门限是本站教学扩展。没有实测噪声标定、随机性能保证或真实定位系统。'};
      },render:renderSeries
    }
  };
  models['rf-kalman-state']={
    controls:[{key:'dt',label:'预测间隔',min:.5,max:2,step:.5,value:1,unit:'s'},{key:'q',label:'每步随机加速度方差',min:0,max:1,step:.2,value:.2,unit:'m²/s⁴'},{key:'r',label:'位置观测方差',min:.2,max:2,step:.2,value:.4,unit:'m²'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const dt=pick('dt',.5,2,1),q=pick('q',0,1,.2),r=pick('r',.2,2,.4),prior=[0,1],P=[[1,0],[0,1]],F=[[1,dt],[0,1]],Q=[[q*dt**4/4,q*dt**3/2],[q*dt**3/2,q*dt**2]],frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'state',...vars}});
      add('状态里同时放位置和速度','位置单位m，速度m/s。协方差的各元素也有不同单位；不能把所有元素当成位置误差。','const state=[0,1],F=[[1,dt],[0,1]];',{state:prior,P,F,Q});
      const predicted=[prior[0]+dt*prior[1],prior[1]];add('状态预测是一条明确运动假设','本例先按恒速预测，随机加速度只通过过程噪声描述未知扰动。','const predicted=[state[0]+dt*state[1],state[1]];',{predicted});
      const predictedP=[[1+dt**2+Q[0][0],dt+Q[0][1]],[dt+Q[1][0],1+Q[1][1]]];add('协方差也要经过F传播','P⁻=F P Fᵀ+Q。Q使用每步恒定随机加速度离散模型，不能与连续白噪声谱密度公式混用。','const predictedP=add(multiply(F,multiply(P,transpose(F))),Q);',{predicted,predictedP});
      const z=1.2,innovation=z-predicted[0],S=predictedP[0][0]+r;add('观测只量到位置','H=[1,0]，并不直接观测速度。创新方差S包含预测位置不确定性与测量方差。','const innovation=1.2-predicted[0],S=predictedP[0][0]+r;',{z,innovation,S});
      const K=[predictedP[0][0]/S,predictedP[1][0]/S],state=predicted.map((x,i)=>x+K[i]*innovation);add('位置观测也能更新速度','位置与速度的预测协方差非零，因而速度增益K₁通常非零。','const K=[predictedP[0][0]/S,predictedP[1][0]/S];',{predicted,K,state});
      const A=[[1-K[0],0],[-K[1],1]],AP=A.map(row=>predictedP[0].map((_,j)=>row.reduce((s,x,k)=>s+x*predictedP[k][j],0))),covariance=AP.map((row,i)=>A.map((a,j)=>row.reduce((s,x,k)=>s+x*a[k],0)+K[i]*r*K[j]));
      add('Joseph形式维护协方差对称性','P=(I−KH)P⁻(I−KH)ᵀ+KRKᵀ。对角非负、对称和行列式提供独立检查。','const covariance=add(multiply(A,multiply(predictedP,transpose(A))),outer(K,K).map(row=>row.map(x=>x*r)));',{state,K,covariance,determinant:covariance[0][0]*covariance[1][1]-covariance[0][1]**2});
      return {frames,result:{F,Q,predicted,predictedP,innovation,S,K,state,covariance},summary:'以位置观测联合修正位置和速度。',boundary:'两维线性高斯教学模型与单次人工观测；没有真实传感器或运动辨识。'};
    },render:renderEstimationExpansion
  };

  models['rf-kalman-covariance']={
    presentation:'calculation',
    controls:[{key:'rho',label:'位置与速度相关系数',min:-.8,max:.8,step:.2,value:.6,unit:''},{key:'z',label:'位置观测',min:-2,max:2,step:.5,value:2,unit:'m'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};const rho=pick('rho',-.8,.8,.6),z=pick('z',-2,2,2),P=[[4,2*rho],[2*rho,1]],r=1,S=5,frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'covariance',P,...vars}});
      add('非对角项描述一起偏离的方向','方差是4与1，交叉协方差为ρ√(4×1)=2ρ。|ρ|<1保证本例P正定。','const P=[[4,2*rho],[2*rho,1]];',{rho,P,determinant:4-4*rho**2});
      const K=[P[0][0]/S,P[1][0]/S];add('同一个位置观测产生两项增益','K=[0.8,0.4ρ]。相关符号改变速度修正方向；ρ=0时速度不被位置观测直接修正。','const K=[P[0][0]/5,P[1][0]/5];',{K});
      const state=K.map(x=>x*z);add('先检查均值修正','先验均值固定为[0,0]，所以创新就是z；观测大于预测不必总让速度增加。','const state=K.map(x=>x*z);',{K,state,z});
      const covariance=P.map((row,i)=>row.map((x,j)=>x-K[i]*P[0][j]));add('再检查不确定性变化','协方差更新不依赖本次观测数值z，而依赖H、P与R。相关性让未直接观测的速度方差也减小。','const covariance=P.map((row,i)=>row.map((x,j)=>x-K[i]*P[0][j]));',{state,covariance});
      add('协方差椭圆的轴带不同物理单位','图的横轴为位置m，纵轴为速度m/s；它不是二维平面中的小车位置轨迹。','const velocityVariance=1-(2*rho)**2/5;',{state,covariance,positionVariance:covariance[0][0],velocityVariance:covariance[1][1]});
      return {frames,result:{P,K,state,covariance,S},summary:'由相关性解释间接观测与协方差缩减。',boundary:'人工位置—速度联合分布；椭圆是状态空间示意，不是机器人世界坐标或实测置信区间。'};
    },render:renderEstimationExpansion
  };

  models['rf-kalman-2d']={
    controls:[{key:'r',label:'两轴位置观测方差',min:.2,max:2,step:.2,value:.4,unit:'m²'},{key:'bias',label:'y观测固定偏差',min:0,max:1,step:.2,value:0,unit:'m'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};const r=pick('r',.2,2,.4),bias=pick('bias',0,1,0),dt=1,F=[[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]],H=[[1,0,0,0],[0,1,0,0]],Q=[[.0125,0,.025,0],[0,.0125,0,.025],[.025,0,.05,0],[0,.025,0,.05]],R=[[r,0],[0,r]],I=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>Number(i===j)));
      const tr=A=>A[0].map((_,j)=>A.map(row=>row[j])),mm=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((s,x,k)=>s+x*B[k][j],0))),plus=(A,B)=>A.map((row,i)=>row.map((x,j)=>x+B[i][j])),mv=(A,x)=>A.map(row=>row.reduce((s,v,i)=>s+v*x[i],0));
      let state=[0,0,1,.5],P=[[1,.3,0,0],[.3,1,0,0],[0,0,1,0],[0,0,0,1]];const frames=[],samples=[],observations=[[1.2,.4],[1.9,1.2],[3.1,1.3],[3.8,2.2]];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'tracking',samples:samples.map(x=>({...x,state:[...x.state]})),...vars}});
      add('四维状态与二维观测各有自己的轴','状态为[x,y,vx,vy]；H只取前两维。已知固定偏差没有被纳入状态，因此普通Kalman不会自动把它校准掉。','const state=[0,0,1,0.5],H=[[1,0,0,0],[0,1,0,0]];',{state:[...state],P,F,H,Q,R});
      for(let k=0;k<observations.length;k++){
        const predicted=mv(F,state),predictedP=plus(mm(F,mm(P,tr(F))),Q),z=[observations[k][0],observations[k][1]+bias],innovation=z.map((v,i)=>v-predicted[i]),S=plus(mm(H,mm(predictedP,tr(H))),R),det=S[0][0]*S[1][1]-S[0][1]*S[1][0],inverse=[[S[1][1]/det,-S[0][1]/det],[-S[1][0]/det,S[0][0]/det]],K=mm(mm(predictedP,tr(H)),inverse);
        state=predicted.map((v,i)=>v+K[i][0]*innovation[0]+K[i][1]*innovation[1]);const KH=mm(K,H),A=I.map((row,i)=>row.map((x,j)=>x-KH[i][j]));P=plus(mm(A,mm(predictedP,tr(A))),mm(K,mm(R,tr(K))));samples.push({t:k+1,z,state:[...state],positionCovariance:P.slice(0,2).map(row=>row.slice(0,2)),truth:[k+1,(k+1)*.5]});
        add('第'+(k+1)+'次二维预测与观测融合','同一个2×2创新协方差需要整体求解，不能在存在相关项时只除对角元素。Joseph形式更新完整4×4协方差。','const K=multiply(Pminus,multiply(transpose(H),inverse(S)));\nstate=addVectors(predicted,multiplyVector(K,innovation));',{predicted,z,innovation,S,K,state:[...state],P:P.map(row=>[...row])});
      }
      const positionError=Math.hypot(state[0]-4,state[1]-2);add('用已知参考检查末状态','真实系统没有随手可得的真值；本例真值仅用于解释偏差如何残留。滤波曲线平滑不等于更准确。','const positionError=Math.hypot(state[0]-4,state[1]-2);',{state:[...state],P,positionError,bias});
      return {frames,result:{state,P,samples,positionError,F,H,Q,R},summary:'四维运动状态融合两轴位置观测。',boundary:'固定原创二维轨迹，无真实GPS/里程计、噪声标定、时间同步或随机性能保证。'};
    },render:renderEstimationExpansion
  };

  models['rf-ekf-range']={
    controls:[{key:'x',label:'先验x',min:.5,max:3,step:.5,value:2,unit:'m'},{key:'y',label:'先验y',min:.5,max:3,step:.5,value:1,unit:'m'},{key:'measurement',label:'到原点的距离观测',min:1,max:4,step:.5,value:3,unit:'m'},{key:'r',label:'距离观测方差',min:.1,max:.5,step:.1,value:.2,unit:'m²'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};const x=pick('x',.5,3,2),y=pick('y',.5,3,1),z=pick('measurement',1,4,3),r=pick('r',.1,.5,.2),P=[[1,0],[0,1]],frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'range',prior:[x,y],measurement:z,...vars}});
      add('距离是非线性观测','h(x,y)=√(x²+y²)。一个距离观测只限定一个圆，不能唯一确定二维位置；先验提供其余信息。','const predictedRange=Math.hypot(x,y);',{prior:[x,y],P,z,r});
      const predictedRange=Math.hypot(x,y),H=[x/predictedRange,y/predictedRange];add('在先验位置求观测Jacobian','原点处Jacobian不定义，本控件限制先验远离原点。H是1×2行向量，不是观测函数本身。','const H=[x/predictedRange,y/predictedRange];',{predictedRange,H});
      const innovation=z-predictedRange,S=H[0]**2+H[1]**2+r,K=H.map(v=>v/S);add('线性化只用于增益与协方差','创新仍使用非线性函数h(先验)，不能拿H乘状态代替任意观测函数。','const innovation=z-predictedRange,S=dot(H,H)+r,K=H.map(v=>v/S);',{innovation,S,K});
      const state=[x+K[0]*innovation,y+K[1]*innovation];add('沿测距敏感的径向修正','在本例各向同性先验下，均值沿径向移动。切向的不确定性不被这一个观测消除。','const state=[x+K[0]*innovation,y+K[1]*innovation];',{state,K,innovation});
      const A=[[1-K[0]*H[0],-K[0]*H[1]],[-K[1]*H[0],1-K[1]*H[1]]],covariance=A.map((row,i)=>A.map((other,j)=>row.reduce((s,v,k)=>s+v*other[k],0)+K[i]*r*K[j])),radialVariance=H.reduce((sum,v,i)=>sum+v*covariance[i].reduce((s,a,j)=>s+a*H[j],0),0),tangent=[-H[1],H[0]],tangentialVariance=tangent.reduce((sum,v,i)=>sum+v*covariance[i].reduce((s,a,j)=>s+a*tangent[j],0),0);
      add('分别检查径向与切向方差','此处径向方差为R/(1+R)，切向仍为1。EKF是局部近似，误差大时不能保证后验真为高斯。','const covariance=add(multiply(A,transpose(A)),scale(outer(K,K),r));',{state,covariance,radialVariance,tangentialVariance,rangeAfter:Math.hypot(...state)});
      return {frames,result:{predictedRange,H,innovation,S,K,state,covariance,radialVariance,tangentialVariance},summary:'由非线性测距与Jacobian理解EKF的一次更新。',boundary:'单次距离更新的局部高斯近似；不解决全局多解、错误关联、原点奇异或真实定位。'};
    },render:renderEstimationExpansion
  };

  models['rf-unscented-transform']={
    presentation:'calculation',
    controls:[{key:'mean',label:'先验均值 μ',min:-2,max:2,step:.5,value:1,unit:''},{key:'variance',label:'先验方差 P',min:.2,max:2,step:.2,value:.4,unit:''}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};const mean=pick('mean',-2,2,1),variance=pick('variance',.2,2,.4),alpha=1,beta=2,kappa=0,lambda=0,frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'sigma',mean,variance,...vars}});
      add('先做UKF中的无迹变换','一维高斯经过y=x²，不是完整跟踪器。固定α=1、β=2、κ=0，λ=0，权重不能随意省略。','const points=[mean,mean+Math.sqrt(variance),mean-Math.sqrt(variance)];',{mean,variance,alpha,beta,kappa,lambda});
      const points=[mean,mean+Math.sqrt(variance),mean-Math.sqrt(variance)],meanWeights=[0,.5,.5],covarianceWeights=[2,.5,.5];add('三个sigma点与两套权重','中心点的均值权重为0，协方差权重为2；漏掉β修正会低估平方映射的方差。','const meanWeights=[0,0.5,0.5],covarianceWeights=[2,0.5,0.5];',{points,meanWeights,covarianceWeights});
      const transformed=points.map(x=>x*x);add('每个点经过真实非线性函数','没有在这一阶段使用Jacobian。', 'const transformed=points.map(x=>x*x);',{points,transformed});
      const outputMean=transformed.reduce((s,x,i)=>s+meanWeights[i]*x,0);add('用均值权重重组','结果μ²+P反映了分布曲率；只算h(μ)=μ²会遗漏P。','const outputMean=transformed.reduce((s,x,i)=>s+meanWeights[i]*x,0);',{transformed,outputMean,ekfMean:mean**2});
      const outputVariance=transformed.reduce((s,x,i)=>s+covarianceWeights[i]*(x-outputMean)**2,0),exactMean=mean**2+variance,exactVariance=2*variance**2+4*mean**2*variance;add('与高斯平方的解析矩对照','此特殊多项式下无迹变换精确匹配均值与方差，但输出分布本身并非高斯；不能推广成任意非线性都精确。','const outputVariance=sum(transformed.map((x,i)=>covarianceWeights[i]*(x-outputMean)**2));',{points,transformed,outputMean,outputVariance,exactMean,exactVariance,ekfMean:mean**2,ekfVariance:4*mean**2*variance});
      return {frames,result:{points,meanWeights,covarianceWeights,transformed,outputMean,outputVariance,exactMean,exactVariance,ekfMean:mean**2,ekfVariance:4*mean**2*variance},summary:'比较EKF一阶近似与sigma点对非线性矩的传播。',boundary:'UKF中的一维无迹变换组件，并非完整UKF状态估计器；平方后的分布不等于高斯。'};
    },render:renderEstimationExpansion
  };

  function renderEstimationExpansion(frame){
    const s=frame.scene,v=frame.vars,escx=x=>esc(x),txt=(x,y,value)=>`<text x="${x}" y="${y}" font-size="13" fill="#18384c">${escx(value)}</text>`;let body='';
    if(s.kind==='tracking'){
      const p=x=>[65+95*x[0],245-65*x[1]],xs=s.samples||[];body='<path d="M40 35V260H520" fill="none" stroke="#c6d3dd"/>';
      for(const [key,color] of [['truth','#9cacbb'],['z','#c88742'],['state','#277e78']]){body+=`<polyline points="${xs.map(x=>p(x[key]).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;for(const x of xs){const q=p(x[key]);body+=`<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="${color}"/>`;}}body+=txt(30,25,'世界平面 x/y：灰=参考，橙=观测，绿=估计');
    }else if(s.kind==='range'){
      const project=x=>[60+90*x[0],255-55*x[1]],a=project(s.prior),b=v.state?project(v.state):a;body=`<path d="M60 25V255H520" fill="none" stroke="#cad7df"/><ellipse cx="60" cy="255" rx="${s.measurement*90}" ry="${s.measurement*55}" fill="none" stroke="#c9a66d" stroke-dasharray="5 5"/><circle cx="${a[0]}" cy="${a[1]}" r="6" fill="#879eaf"/><path d="M${a}L${b}" stroke="#278379" stroke-width="3"/><circle cx="${b[0]}" cy="${b[1]}" r="6" fill="#278379"/>${txt(20,25,'原点测距圆；灰=先验，绿=更新后均值')}`;
    }else if(s.kind==='sigma'){
      const points=v.points||[],ys=v.transformed||[];body=txt(20,30,'sigma点 → y=x² → 重组矩');points.forEach((x,i)=>{const y=ys[i];body+=`<circle cx="${100+150*i}" cy="95" r="8" fill="#6784b8"/>${txt(70+150*i,70,'x='+fmt(x))}${y===undefined?'':`<path d="M${100+150*i} 110v60" stroke="#8badb7"/>${txt(70+150*i,210,'y='+fmt(y))}`}`;});if(v.outputMean!==undefined)body+=txt(30,250,'均值 '+fmt(v.outputMean)+(v.outputVariance===undefined?'':'；方差 '+fmt(v.outputVariance)));
    }else{
      const state=v.state||v.predicted||[0,0],P=v.covariance||v.predictedP||s.P||[[1,0],[0,1]],a=P[0][0],b=P[0][1],d=P[1][1],angle=.5*Math.atan2(2*b,a-d),root=Math.sqrt((a-d)**2+4*b*b),l1=Math.max(0,(a+d+root)/2),l2=Math.max(0,(a+d-root)/2),cx=270,cy=150;body=`<path d="M45 ${cy}H520M${cx} 35V265" stroke="#ccd9e2"/><ellipse cx="${cx}" cy="${cy}" rx="${50*Math.sqrt(l1)}" ry="${50*Math.sqrt(l2)}" transform="rotate(${-angle*180/Math.PI} ${cx} ${cy})" fill="#e0efed" stroke="#278379" stroke-width="2"/>${txt(30,25,'状态协方差形状；横轴位置，纵轴速度')}${txt(35,285,'均值 ['+state.map(x=>fmt(x)).join(', ')+']；P='+JSON.stringify(P.map(row=>row.map(x=>Number(x.toFixed(3))))))}`;
    }return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 320" role="img" aria-label="${esc(frame.title)}"><rect width="560" height="320" rx="16" fill="#f5f8fb"/>${body}${txt(15,310,frame.title)}</svg>`;
  }

  if(typeof module!=='undefined'&&module.exports)module.exports=models;
  global.RoboticsFoundationModels=Object.assign(global.RoboticsFoundationModels||{},models);
})(globalThis);
