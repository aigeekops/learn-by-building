/* Original finite estimation calculations; no sensor, hardware or learning evidence. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const n=x=>typeof x==='number'?x.toFixed(4):String(x);
  const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9;
  const equal=(a,b)=>Array.isArray(a)?Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>equal(x,b[i])):close(a,b);
  const C=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note:note+' 算式显示四位小数，数值与验证保留完整精度。'});
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const gaussian='位置m、方差m²；线性模型、独立零均值过程/观测噪声，高斯信念为建模假设，不是实测频率。';
  const joint='状态[x,v]的单位为[m,m/s]；P₀₀:m²，P₀₁/P₁₀:m²/s，P₁₁:m²/s²。人工先验与观测，不是传感器验收。';
  const tracking='状态[x,y,vx,vy]单位[m,m,m/s,m/s]；位置/速度协方差单位按对应两轴相乘。固定人工观测、dt=1s，没有真实GPS或噪声标定。';
  const range='位置与距离用m、方差m²；各向同性P=I、单次测距、局部线性化，不能由一个距离唯一确定全局二维位置。';
  const sigma='本例变量无量纲；高斯先验经过y=x²，只演示UKF的无迹变换组件。输出不是高斯，也不是完整UKF跟踪器。';
  const mm=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((s,v,k)=>s+v*B[k][j],0)));
  const tr=A=>A[0].map((_,j)=>A.map(row=>row[j]));
  const plus=(A,B)=>A.map((row,i)=>row.map((v,j)=>v+B[i][j]));
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const sumText=a=>a.map(n).join(' + ');
  const dotText=(a,b)=>a.map((x,k)=>`(${n(x)} × ${n(b[k])})`).join(' + ');
  function matrix(id,label,M,formula,note,inputs={}){return M.flatMap((row,i)=>row.map((value,j)=>C(`${id}-${i}-${j}`,`${label}[${i},${j}]`,value,formula(i,j)+` = ${n(value)}`,{row:i,column:j,...inputs},note)));}
  function heldMatrix(id,label,M,note){return matrix(id,label,M,(i,j)=>`${label}[${i},${j}] = ${n(M[i][j])}`,note,{matrix:M});}
  function varianceCells(value,mean,note){
    const sd=Math.sqrt(value),cells=[C('posterior-sd','后验标准差',sd,`√${n(value)} = ${n(sd)} m`,{variance:value},note)];
    cells.push(value>0?C('posterior-normalizer','高斯密度的归一化分母',Math.sqrt(2*Math.PI*value),`√(2π × ${n(value)}) = ${n(Math.sqrt(2*Math.PI*value))} m`,{mean,variance:value},note+' 后验密度exp[−(x−μ)²/(2P)]/√(2πP)积分为1；密度不是区间概率。'):C('posterior-point-mass','零方差的边界分布','点质量',`P = ${n(value)} → 全部概率质量位于 ${n(mean)} m`,{mean,variance:value},note+' P=0时不能把普通高斯密度分母写成0后继续相除。'));
    return cells;
  }
  function josephCells(Pminus,K,H,R,P,note){
    const size=P.length,KH=mm(K,H),A=KH.map((row,i)=>row.map((x,j)=>Number(i===j)-x)),AP=mm(A,Pminus),KR=mm(K,R);
    return [
      ...matrix('joseph-ap','AP⁻',AP,(i,j)=>dotText(A[i],Pminus.map(row=>row[j])),note+' A=I−KH。',{A,Pminus}),
      ...matrix('posterior-p','Joseph后验P',P,(i,j)=>`${dotText(AP[i],A[j])} + ${dotText(KR[i],K[j])}`,note+' P⁺=AP⁻Aᵀ+KRKᵀ，每格为两组逐项乘积之和。',{A,AP,K,R,KR}),
      C('covariance-symmetry','协方差最大非对称残差',Math.max(...P.flatMap((row,i)=>row.map((x,j)=>Math.abs(x-P[j][i])))),`max |Pᵢⱼ−Pⱼᵢ|（${size}×${size}全部元素） = ${n(Math.max(...P.flatMap((row,i)=>row.map((x,j)=>Math.abs(x-P[j][i])))))}`,{covariance:P},note+' 对称残差检查不等于真实误差或模型已校准。')
    ];
  }
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){
    const i=Math.max(0,Math.min(t.frames.length-1,Math.trunc(Number(index))||0)),frame=t.frames[i];
    // Only the current and previous vars are visible: never consume scene or result.
    const history=t.frames.slice(0,i+1).map(f=>f.vars),v=Object.assign({},...history);
    return {title:frame.title,summary:`当前第${i+1}个实际计算快照。${frame.text} ${t.model==='rf-kalman-covariance'||t.model==='rf-unscented-transform'?'静态计算保持有限快照，不增加时间演化。':'沿用原模型的实际计算顺序。'}`,cells:inspect(t.params,i,v,history)};
  },experiments};}
  const models={};

  models['rf-noisy-measurements']=model('逐个保存固定读数、累加和与均值；把数据算出的样本方差和假设给出的均值标准差分开，保留固定偏差。',(p,i,v,h)=>{
    const note='长度cm、方差cm²；参考10cm和成对固定扰动为原创确定性数据。σ是输入假设，非设备标定。';
    if(i===0)return [
      C('reference','人工已知参考位置',v.reference,`reference = ${n(v.reference)} cm`,{reference:v.reference},note),
      C('bias','生成公式中的固定偏差',v.bias,`zₖ = ${n(v.reference)} + ${n(v.bias)} + ${n(v.sigma)}·eₖ`,{reference:v.reference,bias:v.bias,sigma:v.sigma},note+' 尚未取得任何本例读数。'),
      ...v.pattern.map((x,k)=>C(`pattern-${k}`,'预先给定扰动e'+k,x,`e[${k}] = ${n(x)}`,{index:k,patternValue:x},note+' 该数组是固定生成条件，不是假装已采集的测量。'))
    ];
    if(i<=p.n){const previous=i===1?0:h[i-1].sum;return [
      C('reading','本次固定示例读数z',v.z,`${n(v.reference)} + ${n(v.bias)} + ${n(v.sigma)} × (${n(v.pattern[i-1])}) = ${n(v.z)} cm`,{reference:v.reference,bias:v.bias,sigma:v.sigma,disturbance:v.pattern[i-1]},note),
      C('running-sum','已取得读数的累计和',v.sum,`${n(previous)} + ${n(v.z)} = ${n(v.sum)} cm`,{previousSum:previous,z:v.z,count:v.count},note+' 不包含尚未读入的值。'),
      C('running-mean','当前累计均值',v.mean,`${n(v.sum)} / ${v.count} = ${n(v.mean)} cm`,{sum:v.sum,count:v.count},note)
    ];}
    if(i===p.n+1){const readings=h.slice(1,p.n+1).map(x=>x.z),squares=readings.map(x=>(x-v.mean)**2);return [
      ...readings.map((z,k)=>C(`squared-deviation-${k}`,`第${k+1}次读数的离差平方`,squares[k],`(${n(z)} − ${n(v.mean)})² = ${n(squares[k])} cm²`,{z,mean:v.mean},note)),
      C('sample-variance','本段固定数据的样本方差s²',v.sampleVariance,`(${sumText(squares)}) / (${p.n}−1) = ${n(v.sampleVariance)} cm²`,{squaredDeviations:squares,count:p.n},note+' n−1分母；一次固定小样本不证明概率规律。'),
      C('assumed-single-variance','假定单次方差R',v.assumedR,`${n(p.sigma)}² = ${n(v.assumedR)} cm²`,{sigma:p.sigma},note),
      C('assumed-mean-variance','独立无偏同方差假设下R/n',v.assumedR/p.n,`${n(v.assumedR)} / ${p.n} = ${n(v.assumedR/p.n)} cm²`,{R:v.assumedR,count:p.n},note+' 读数若相关或带偏差，不能照搬这个均值误差结论。'),
      C('assumed-mean-sd','假设下均值标准差',v.assumedMeanSd,`${n(p.sigma)} / √${p.n} = ${n(v.assumedMeanSd)} cm`,{sigma:p.sigma,count:p.n},note)
    ];}
    return [C('residual-bias','最终核对：均值误差',v.errorFromReference,`${n(v.mean)} − ${n(v.reference)} = ${n(v.errorFromReference)} cm = bias ${n(v.bias)}`,{mean:v.mean,reference:v.reference,bias:v.bias},note+' 固定扰动成对抵消，偏差仍在；不是独立真实测量结果。')];
  },[E('shift-bias','只把固定偏差0.5改为1cm','每个读数与均值是否一起移动？样本方差和假设标准差是否保持？',{bias:.5},{bias:1},'每个固定读数及均值都增加0.5cm；样本方差和σ/√n不变。',(a,b)=>a.params.bias===.5&&b.params.bias===1&&close(a.result.mean,10.5)&&close(b.result.mean,11)&&a.result.readings.every((z,k)=>close(b.result.readings[k]-z,.5))&&close(a.result.sampleVariance,b.result.sampleVariance)&&close(a.result.assumedMeanSd,b.result.assumedMeanSd))]);

  models['rf-kalman-update']=model('先分别预测均值与方差，再从创新及其方差算权重；在真实更新帧展开Joseph形式与高斯归一化。',(p,i,v)=>{
    if(i===0)return [C('prior-mean','先验位置均值',v.mean,`x = ${n(v.mean)} m`,{mean:v.mean},gaussian),C('prior-variance','先验方差',v.variance,`P = ${n(v.variance)} m²；σ = √P = ${n(Math.sqrt(v.variance))} m`,{variance:v.variance},gaussian+' 零方差只是完全确定的模型信念。')];
    if(i===1)return [C('predicted-mean','预测位置',v.predictedMean,`${n(v.mean)} + ${n(v.motion)} = ${n(v.predictedMean)} m`,{mean:v.mean,motion:v.motion},gaussian+' 已知每步位移1m，未估计速度。')];
    if(i===2)return [C('predicted-variance','预测方差',v.predictedVariance,`${n(v.variance)} + ${n(v.q)} = ${n(v.predictedVariance)} m²`,{variance:v.variance,q:v.q},gaussian)];
    if(i===3){const evidence=Math.exp(-(v.innovation**2)/(2*v.innovationVariance))/Math.sqrt(2*Math.PI*v.innovationVariance);return [
      C('innovation','创新ν',v.innovation,`${n(v.measurement)} − ${n(v.predictedMean)} = ${n(v.innovation)} m`,{measurement:v.measurement,predictedMean:v.predictedMean},gaussian),
      C('innovation-variance','创新方差S',v.innovationVariance,`${n(v.predictedVariance)} + ${n(p.r)} = ${n(v.innovationVariance)} m²`,{predictedVariance:v.predictedVariance,r:p.r},gaussian),
      C('evidence-density','贝叶斯归一化：本次观测的预测密度p(z)',evidence,`exp[−(${n(v.innovation)})²/(2 × ${n(v.innovationVariance)})] / √(2π × ${n(v.innovationVariance)}) = ${n(evidence)} m⁻¹`,{innovation:v.innovation,S:v.innovationVariance},gaussian+' 由当前创新推导的密度；p(x|z)=p(z|x)p(x)/p(z)。密度不是观测的离散概率，也没有观测关联选择。')
    ];}
    if(i===4)return [C('gain','Kalman增益K',v.gain,`${n(v.predictedVariance)} / (${n(v.predictedVariance)} + ${n(v.r)}) = ${n(v.gain)}`,{predictedVariance:v.predictedVariance,r:v.r},gaussian+' 无量纲，R>0保证分母正；P⁻=0时K=0。')];
    if(i===5)return [C('correction','本次位置修正Kν',v.gain*v.innovation,`${n(v.gain)} × (${n(v.innovation)}) = ${n(v.gain*v.innovation)} m`,{gain:v.gain,innovation:v.innovation},gaussian),C('posterior-mean','后验位置均值',v.posteriorMean,`${n(v.predictedMean)} + ${n(v.gain)} × (${n(v.innovation)}) = ${n(v.posteriorMean)} m`,{predictedMean:v.predictedMean,gain:v.gain,innovation:v.innovation},gaussian)];
    const modelTerm=(1-v.gain)**2*v.predictedVariance,noiseTerm=v.gain**2*p.r;return [
      C('joseph-model-term','Joseph第一项',modelTerm,`(1−${n(v.gain)})² × ${n(v.predictedVariance)} = ${n(modelTerm)} m²`,{gain:v.gain,predictedVariance:v.predictedVariance},gaussian),
      C('joseph-noise-term','Joseph第二项',noiseTerm,`${n(v.gain)}² × ${n(p.r)} = ${n(noiseTerm)} m²`,{gain:v.gain,r:p.r},gaussian),
      C('posterior-variance','Joseph后验方差',v.posteriorVariance,`${n(modelTerm)} + ${n(noiseTerm)} = ${n(v.posteriorVariance)} m²`,{modelTerm,noiseTerm},gaussian),...varianceCells(v.posteriorVariance,v.posteriorMean,gaussian)
    ];
  },[E('raise-r','只把观测方差R从1改为9m²','同一个预测与创新下，K及均值修正怎样变？后验方差会怎样变？',{r:1},{r:9},'K从5/6降至5/14；后验从20/3变为40/7m，更接近预测5m，方差从5/6增加为45/14m²。',(a,b)=>a.params.r===1&&b.params.r===9&&close(a.result.gain,5/6)&&close(b.result.gain,5/14)&&close(a.result.posteriorMean,20/3)&&close(b.result.posteriorMean,40/7)&&close(a.result.posteriorVariance,5/6)&&close(b.result.posteriorVariance,45/14)&&close(a.result.innovation,b.result.innovation))]);

  models['rf-filter-assumptions']=model('同一固定序列逐次保留预测、创新、严格NIS门限和接受/拒绝分支；只在最终帧用独立参考计算完整MSE。',(p,i,v,h)=>{
    const note=gaussian+' 参考轨迹只用于评价；滤波器始终假定每步移动1m，门限不能判定传感器损坏。';
    if(i===0)return [C('initial-mean','初始均值',v.initialMean,`x₀ = ${n(v.initialMean)} m`,{initialMean:v.initialMean},note),C('initial-variance','初始方差',v.initialVariance,`P₀ = ${n(v.initialVariance)} m²；Q=${n(v.q)}，R=${n(v.r)}`,{initialVariance:v.initialVariance,q:v.q,r:v.r},note),C('gate-policy','本次运行的门限策略',p.gate===1?'NIS>9跳过':'接收全部',`gate = ${p.gate}；rejected = (gate===1) && (NIS>9)`,{gate:p.gate,threshold:9},note+' options以数值索引0/1传入，等于9仍接受。')];
    if(i===h.length-1&&Object.hasOwn(h[i],'mse')){const samples=h.slice(1,-1),errors=samples.map(x=>x.error**2),rawErrors=samples.map(x=>(x.z-x.reference)**2);return [
      ...samples.map((x,k)=>C(`squared-error-${k}`,`最终核对：第${k+1}次滤波平方误差`,errors[k],`(${n(x.mean)} − ${n(x.reference)})² = ${n(errors[k])} m²`,{estimate:x.mean,reference:x.reference},note)),
      ...samples.map((x,k)=>C(`raw-squared-error-${k}`,`最终核对：第${k+1}次观测平方误差`,rawErrors[k],`(${n(x.z)} − ${n(x.reference)})² = ${n(rawErrors[k])} m²`,{measurement:x.z,reference:x.reference},note)),
      C('filter-mse','最终核对：滤波MSE',v.mse,`(${sumText(errors)}) / ${samples.length} = ${n(v.mse)} m²`,{squaredErrors:errors,count:samples.length},note),
      C('measurement-mse','最终核对：原始观测MSE',v.measurementMSE,`(${sumText(rawErrors)}) / ${samples.length} = ${n(v.measurementMSE)} m²`,{squaredErrors:rawErrors,count:samples.length},note),
      C('gate-count','最终核对：跳过次数',v.gateCount,`${samples.map(x=>Number(x.rejected)).join(' + ')} = ${v.gateCount}`,{rejected:samples.map(x=>x.rejected)},note+' 曲线更平滑不代表MSE更小；本段参考不是硬件性能证据。')
    ];}
    const prior=i===1?{mean:h[0].initialMean,variance:h[0].initialVariance}:h[i-1],gain=v.gain,modelTerm=(1-gain)**2*v.predictedVariance,noiseTerm=gain**2*p.r;
    return [
      C('predicted-mean','本步预测均值',v.predictedMean,`${n(prior.mean)} + 1 = ${n(v.predictedMean)} m`,{previousMean:prior.mean,motion:1},note),
      C('predicted-variance','本步预测方差',v.predictedVariance,`${n(prior.variance)} + ${n(p.q)} = ${n(v.predictedVariance)} m²`,{previousVariance:prior.variance,q:p.q},note),
      C('innovation','当前创新',v.innovation,`${n(v.z)} − ${n(v.predictedMean)} = ${n(v.innovation)} m`,{measurement:v.z,predictedMean:v.predictedMean},note),
      C('innovation-variance','当前创新方差',v.innovationVariance,`${n(v.predictedVariance)} + ${n(p.r)} = ${n(v.innovationVariance)} m²`,{predictedVariance:v.predictedVariance,r:p.r},note),
      C('nis','归一化创新平方NIS',v.nis,`(${n(v.innovation)})² / ${n(v.innovationVariance)} = ${n(v.nis)}`,{innovation:v.innovation,S:v.innovationVariance},note+' 无量纲。'),
      C('rejected','本次实际门限分支',v.rejected,`(${p.gate}===1) && (${n(v.nis)}>9) → ${v.rejected}`,{gate:p.gate,nis:v.nis,threshold:9},note+' 比较使用完整精度，严格大于9才拒绝。'),
      C('gain','候选增益K',gain,`${n(v.predictedVariance)} / ${n(v.innovationVariance)} = ${n(gain)}`,{predictedVariance:v.predictedVariance,S:v.innovationVariance},note+' 拒绝时不把此候选增益用于实际均值或方差更新。'),
      C('posterior-mean','本步保留的均值',v.mean,v.rejected?`拒绝 → x⁺ = x⁻ = ${n(v.predictedMean)} m`:`${n(v.predictedMean)} + ${n(gain)} × (${n(v.innovation)}) = ${n(v.mean)} m`,{predictedMean:v.predictedMean,gain,innovation:v.innovation,rejected:v.rejected},note),
      C('posterior-variance','本步保留的方差',v.variance,v.rejected?`拒绝 → P⁺ = P⁻ = ${n(v.predictedVariance)} m²`:`(1−${n(gain)})² × ${n(v.predictedVariance)} + ${n(gain)}² × ${n(p.r)} = ${n(modelTerm)} + ${n(noiseTerm)} = ${n(v.variance)} m²`,{predictedVariance:v.predictedVariance,gain,r:p.r,rejected:v.rejected},note),
      C('reference-error','当前独立参考误差',v.error,`${n(v.mean)} − ${n(v.reference)} = ${n(v.error)} m`,{estimate:v.mean,reference:v.reference},note+' 此处只评价已经算完的当前样本，不读取后续参考或最终MSE。')
    ];
  },[E('enable-gate','只把门限由0切换为1','保持第6次额外偏移8m，预测会触发哪次跳过，跳过是否保留预测方差？',{spike:8,gate:0},{spike:8,gate:1},'两次运行前5步相同，第6步NIS约61.1098；启用门限时仅此步跳过，均值与方差等于该步预测。这个例子门限后的MSE反而较大。',(a,b)=>a.params.gate===0&&b.params.gate===1&&a.params.spike===8&&b.params.spike===8&&a.result.samples.slice(0,5).every((x,k)=>close(x.mean,b.result.samples[k].mean))&&a.result.samples[5].nis>9&&!a.result.samples[5].rejected&&b.result.samples[5].rejected&&close(b.result.samples[5].mean,b.result.samples[5].predictedMean)&&close(b.result.samples[5].variance,b.result.samples[5].predictedVariance)&&a.result.gateCount===0&&b.result.gateCount===1&&b.result.mse>a.result.mse&&close(a.result.measurementMSE,b.result.measurementMSE))]);

  models['rf-kalman-state']=model('逐格传播位置/速度协方差，用位置创新的两项增益解释间接速度修正，再展开Joseph各格。',(p,i,v)=>{
    if(i===0)return [
      ...v.state.map((x,k)=>C(`prior-state-${k}`,`先验${k===0?'位置':'速度'}`,x,`state[${k}] = ${n(x)} ${k===0?'m':'m/s'}`,{index:k,value:x},joint)),
      ...matrix('transition','F',v.F,(j,k)=>j===0&&k===1?`dt = ${n(p.dt)} s`:`F[${j},${k}] = ${n(v.F[j][k])}`,joint,{dt:p.dt}),
      ...matrix('process-q','Q',v.Q,(j,k)=>`${n(p.q)} × ${n(p.dt)}^${4-j-k} / ${j===0&&k===0?4:j===1&&k===1?1:2}`,joint+' q单位m²/s⁴，采用每步恒定随机加速度方差，不是连续谱密度。',{q:p.q,dt:p.dt}),...heldMatrix('prior-p','P',v.P,joint)
    ];
    if(i===1)return [C('predicted-position','预测位置',v.predicted[0],`${n(v.state[0])} + ${n(p.dt)} × ${n(v.state[1])} = ${n(v.predicted[0])} m`,{state:v.state,dt:p.dt},joint),C('predicted-velocity','预测速度',v.predicted[1],`0 × ${n(v.state[0])} + 1 × ${n(v.state[1])} = ${n(v.predicted[1])} m/s`,{state:v.state},joint)];
    if(i===2){const FP=mm(v.F,v.P);return matrix('predicted-p','预测P⁻',v.predictedP,(j,k)=>`${dotText(FP[j],v.F[k])} + ${n(v.Q[j][k])}`,joint+' P⁻=FPFᵀ+Q。',{F:v.F,P:v.P,Q:v.Q,FP});}
    if(i===3)return [C('innovation','位置创新ν',v.innovation,`${n(v.z)} − ${n(v.predicted[0])} = ${n(v.innovation)} m`,{z:v.z,predictedPosition:v.predicted[0]},joint),C('innovation-variance','创新方差S',v.S,`${n(v.predictedP[0][0])} + ${n(p.r)} = ${n(v.S)} m²`,{positionVariance:v.predictedP[0][0],r:p.r},joint)];
    if(i===4)return v.K.flatMap((k,j)=>[C(`gain-${j}`,`${j===0?'位置':'速度'}增益`,k,`${n(v.predictedP[j][0])} / ${n(v.S)} = ${n(k)} ${j===0?'(无量纲)':'s⁻¹'}`,{crossCovariance:v.predictedP[j][0],S:v.S},joint),C(`posterior-state-${j}`,`更新后${j===0?'位置':'速度'}`,v.state[j],`${n(v.predicted[j])} + ${n(k)} × (${n(v.innovation)}) = ${n(v.state[j])} ${j===0?'m':'m/s'}`,{predicted:v.predicted[j],gain:k,innovation:v.innovation},joint)]);
    return [...josephCells(v.predictedP,v.K.map(x=>[x]),[[1,0]],[[p.r]],v.covariance,joint),C('determinant','后验协方差行列式',v.determinant,`${n(v.covariance[0][0])} × ${n(v.covariance[1][1])} − (${n(v.covariance[0][1])})² = ${n(v.determinant)}`,{covariance:v.covariance},joint+' 单位m⁴/s²；本例正对角及正行列式检查正定性。')];
  },[E('increase-dt','只把dt从0.5改为2s，q固定为0','没有直接速度观测时，交叉协方差和两项增益会怎样变？',{dt:.5,q:0,r:.4},{dt:2,q:0,r:.4},'P⁻₀₁由0.5变2m²/s；速度增益从0.5/1.65变2/5.4s⁻¹。第二次预测位置2m超过z=1.2m，速度从向上修正转为向下修正。',(a,b)=>a.params.dt===.5&&b.params.dt===2&&a.params.q===0&&b.params.q===0&&close(a.result.predictedP[0][1],.5)&&close(b.result.predictedP[0][1],2)&&close(a.result.K[1],.5/1.65)&&close(b.result.K[1],2/5.4)&&a.result.state[1]>1&&b.result.state[1]<1)]);

  models['rf-kalman-covariance']=model('相关系数决定交叉协方差符号；逐格计算同一位置观测对两维均值及四格协方差的影响。',(p,i,v)=>{
    if(i===0)return [...matrix('prior-p','先验P',v.P,(j,k)=>j===k?`${j===0?4:1}`:`ρ√(4×1) = ${n(v.rho)} × 2`,joint,{rho:v.rho}),C('prior-determinant','先验行列式',v.determinant,`4 × 1 − (2 × ${n(v.rho)})² = ${n(v.determinant)}`,{rho:v.rho},joint+' 控件|ρ|≤0.8<1，P正定。')];
    if(i===1)return [C('innovation-variance','位置创新方差S',5,'4.0000 + 1.0000 = 5.0000 m²',{priorPositionVariance:4,r:1},joint),...v.K.map((k,j)=>C(`gain-${j}`,`${j===0?'位置':'速度'}增益`,k,`${n(v.P[j][0])} / 5 = ${n(k)} ${j===0?'(无量纲)':'s⁻¹'}`,{priorCrossCovariance:v.P[j][0],S:5},joint))];
    if(i===2)return [C('innovation','位置创新',v.z,`${n(v.z)} − 0 = ${n(v.z)} m`,{z:v.z,priorPosition:0},joint),...v.state.map((x,j)=>C(`posterior-state-${j}`,`更新后${j===0?'位置':'速度'}`,x,`0 + ${n(v.K[j])} × (${n(v.z)}) = ${n(x)} ${j===0?'m':'m/s'}`,{priorMean:0,gain:v.K[j],innovation:v.z},joint+' 正创新不保证速度向正方向变化。'))];
    if(i===3)return matrix('posterior-p','后验P',v.covariance,(j,k)=>`${n(v.P[j][k])} − ${n(v.K[j])} × ${n(v.P[0][k])}`,joint+' P⁺=P−KHP，与本次z无关。',{priorP:v.P,K:v.K,H:[1,0]});
    return [C('position-variance','最终核对：位置方差',v.positionVariance,`4 − (4/5) × 4 = ${n(v.positionVariance)} m²`,{priorPositionVariance:4,S:5},joint),C('velocity-variance','最终核对：速度方差',v.velocityVariance,`1 − (2 × ${n(p.rho)})² / 5 = ${n(v.velocityVariance)} m²/s²`,{rho:p.rho,S:5},joint+' ρ符号不改变缩减量；这是位置/速度状态空间椭圆，不是世界平面位置。')];
  },[
    E('reverse-correlation','只把ρ由−0.6改为+0.6','z=2m不变，位置均值、速度均值和两项方差会如何变？',{rho:-.6},{rho:.6},'位置均值均1.6m；速度−0.48→+0.48m/s。方差保持P₀₀=0.8、P₁₁=0.712，交叉项反号。',(a,b)=>a.params.rho===-.6&&b.params.rho===.6&&close(a.result.state[0],1.6)&&close(b.result.state[0],1.6)&&close(a.result.state[1],-.48)&&close(b.result.state[1],.48)&&close(a.result.covariance[0][0],.8)&&close(b.result.covariance[0][0],.8)&&close(a.result.covariance[1][1],.712)&&close(b.result.covariance[1][1],.712)&&close(a.result.covariance[0][1],-b.result.covariance[0][1])),
    E('change-observation','只把位置观测z由−2改为2m','均值修正反向后，后验协方差也会反向或改变大小吗？',{z:-2},{z:2},'两项后验均值均反号，全部后验协方差和K保持不变。',(a,b)=>a.params.z===-2&&b.params.z===2&&a.result.state.every((x,j)=>close(x,-b.result.state[j]))&&equal(a.result.K,b.result.K)&&equal(a.result.covariance,b.result.covariance))
  ]);

  models['rf-kalman-2d']=model('四维运动先验融合两轴位置观测，逐格展开P传播、完整2×2创新协方差逆、八项增益和双轴修正。',(p,i,v,h)=>{
    if(i===0)return [
      ...v.state.map((x,j)=>C(`initial-state-${j}`,`初始${['x','y','vx','vy'][j]}`,x,`state[${j}] = ${n(x)} ${j<2?'m':'m/s'}`,{index:j,value:x},tracking)),
      ...heldMatrix('initial-p','初始P',v.P,tracking),...heldMatrix('measurement-h','H',v.H,tracking+' H只选择x和y，观测对应轴预先给定，不执行数据关联。'),...heldMatrix('measurement-r','R',v.R,tracking+' 两轴观测噪声独立，但状态可以相关。')
    ];
    if(Object.hasOwn(h[i],'positionError'))return [
      C('final-x-error','最终核对：x误差',v.state[0]-4,`${n(v.state[0])} − 4 = ${n(v.state[0]-4)} m`,{x:v.state[0],reference:4},tracking),C('final-y-error','最终核对：y误差',v.state[1]-2,`${n(v.state[1])} − 2 = ${n(v.state[1]-2)} m`,{y:v.state[1],reference:2,bias:v.bias},tracking),C('position-error','最终核对：位置误差范数',v.positionError,`√[(${n(v.state[0])}−4)² + (${n(v.state[1])}−2)²] = ${n(v.positionError)} m`,{state:v.state,reference:[4,2]},tracking+' 真值仅用于例内评价，不保证真实定位性能。'),...matrix('final-position-p','最终位置协方差',v.P.slice(0,2).map(row=>row.slice(0,2)),(j,k)=>`P[${j},${k}] = ${n(v.P[j][k])}`,tracking+' 小协方差不自动消除观测bias。',{P:v.P})
    ];
    const previous=h[i-1],Pminus=plus(mm(v.F,mm(previous.P,tr(v.F))),v.Q),FP=mm(v.F,previous.P),S=v.S,det=S[0][0]*S[1][1]-S[0][1]*S[1][0],inverse=[[S[1][1]/det,-S[0][1]/det],[-S[1][0]/det,S[0][0]/det]];
    return [
      ...v.predicted.map((x,j)=>C(`predicted-state-${j}`,`预测${['x','y','vx','vy'][j]}`,x,`${dotText(v.F[j],previous.state)} = ${n(x)} ${j<2?'m':'m/s'}`,{transitionRow:v.F[j],previousState:previous.state},tracking)),
      ...matrix('predicted-p','预测P⁻',Pminus,(j,k)=>`${dotText(FP[j],v.F[k])} + ${n(v.Q[j][k])}`,tracking+' P⁻=FPFᵀ+Q，使用上一实际帧P。',{F:v.F,previousP:previous.P,Q:v.Q,FP}),
      ...v.innovation.map((x,j)=>C(`innovation-${j}`,`${j===0?'x':'y'}创新`,x,`${n(v.z[j])} − ${n(v.predicted[j])} = ${n(x)} m`,{z:v.z[j],prediction:v.predicted[j]},tracking)),
      ...matrix('innovation-s','创新S',S,(j,k)=>`${n(Pminus[j][k])} + ${n(v.R[j][k])}`,tracking+' S=HP⁻Hᵀ+R；H选取左上2×2块。',{predictedP:Pminus,R:v.R}),
      C('innovation-determinant','创新S的行列式',det,`${n(S[0][0])} × ${n(S[1][1])} − ${n(S[0][1])} × ${n(S[1][0])} = ${n(det)} m⁴`,{S},tracking+' 非对角项不为0，不能逐轴只除对角。'),
      ...matrix('innovation-inverse','S⁻¹',inverse,(j,k)=>`${j!==k?'−':''}${n(j===k?S[1-j][1-k]:S[j][k])} / ${n(det)}`,tracking+' 2×2逆=[[d,−b],[−c,a]]/det，单位m⁻²。',{S,determinant:det}),
      ...matrix('gain','K',v.K,(j,k)=>dotText(Pminus[j].slice(0,2),inverse.map(row=>row[k])),tracking+' K=P⁻HᵀS⁻¹；前两行无量纲，后两行s⁻¹。',{predictedP:Pminus,inverseS:inverse}),
      ...v.state.map((x,j)=>C(`posterior-state-${j}`,`后验${['x','y','vx','vy'][j]}`,x,`${n(v.predicted[j])} + ${dotText(v.K[j],v.innovation)} = ${n(x)} ${j<2?'m':'m/s'}`,{prediction:v.predicted[j],gainRow:v.K[j],innovation:v.innovation},tracking+' 两个位置创新都可能影响每个状态分量。')),
      ...josephCells(Pminus,v.K,v.H,v.R,v.P,tracking)
    ];
  },[E('add-y-bias','只把y观测固定偏差由0改为0.8m','固定偏差是否被普通四维Kalman自动标定？P会随观测数值改变吗？',{bias:0},{bias:.8},'四次y观测全部增加0.8m，后验P逐次不变；末y估计增加超过0.8m且位置误差增大，模型没有偏差状态。',(a,b)=>a.params.bias===0&&b.params.bias===.8&&a.result.samples.every((s,j)=>close(b.result.samples[j].z[1]-s.z[1],.8)&&close(s.z[0],b.result.samples[j].z[0])&&equal(s.positionCovariance,b.result.samples[j].positionCovariance))&&equal(a.result.P,b.result.P)&&b.result.state[1]-a.result.state[1]>.8&&b.result.positionError>a.result.positionError)]);

  models['rf-ekf-range']=model('先在当前先验求非线性测距和Jacobian，再展开一次增益、径向均值修正及径向/切向不确定性。',(p,i,v)=>{
    if(i===0)return [C('prior-x','先验x',v.prior[0],`x = ${n(v.prior[0])} m`,{x:v.prior[0]},range),C('prior-y','先验y',v.prior[1],`y = ${n(v.prior[1])} m`,{y:v.prior[1]},range),C('range-observation','人工测距观测',v.z,`z = ${n(v.z)} m，R = ${n(v.r)} m²`,{z:v.z,r:v.r},range+' 当前只声明输入，尚未给出更新位置。'),...heldMatrix('prior-p','先验P',v.P,range)];
    if(i===1)return [C('predicted-range','非线性预测距离h(x,y)',v.predictedRange,`√(${n(v.prior[0])}² + ${n(v.prior[1])}²) = ${n(v.predictedRange)} m`,{prior:v.prior},range),...v.H.map((x,j)=>C(`jacobian-${j}`,`测距偏导H[${j}]`,x,`${n(v.prior[j])} / ${n(v.predictedRange)} = ${n(x)}`,{coordinate:v.prior[j],predictedRange:v.predictedRange},range+' H无量纲；原点不定义，当前控件先验远离原点。'))];
    if(i===2)return [C('innovation','非线性创新ν',v.innovation,`${n(v.z)} − √(${n(v.prior[0])}² + ${n(v.prior[1])}²) = ${n(v.innovation)} m`,{z:v.z,prior:v.prior},range+' 创新使用z−h(x)，而不是把Jacobian当成观测函数。'),C('innovation-variance','局部创新方差S',v.S,`${n(v.H[0])}² + ${n(v.H[1])}² + ${n(v.r)} = ${n(v.S)} m²`,{H:v.H,P:v.P,r:v.r},range+' P=I且H单位长度，故S=1+R。'),...v.K.map((k,j)=>C(`gain-${j}`,`位置增益K[${j}]`,k,`${n(v.H[j])} / ${n(v.S)} = ${n(k)}`,{jacobian:v.H[j],S:v.S},range))];
    if(i===3)return v.state.map((x,j)=>C(`posterior-state-${j}`,`后验${j===0?'x':'y'}`,x,`${n(v.prior[j])} + ${n(v.K[j])} × (${n(v.innovation)}) = ${n(x)} m`,{prior:v.prior[j],gain:v.K[j],innovation:v.innovation},range+' 本例各向同性先验使修正沿径向。'));
    const tangent=[-v.H[1],v.H[0]],quadratic=(x)=>x.flatMap((a,j)=>x.map((b,k)=>({a,b,p:v.covariance[j][k]}))),radialTerms=quadratic(v.H),tangentTerms=quadratic(tangent),form=terms=>terms.map(x=>`(${n(x.a)} × ${n(x.p)} × ${n(x.b)})`).join(' + ');
    return [...josephCells(v.P,v.K.map(x=>[x]),[v.H],[[v.r]],v.covariance,range),C('radial-variance','径向方差H P⁺ Hᵀ',v.radialVariance,`${form(radialTerms)} = ${n(v.radialVariance)} m² = ${n(v.r)}/(1+${n(v.r)})`,{direction:v.H,covariance:v.covariance,r:v.r},range),C('tangential-variance','切向方差t P⁺ tᵀ',v.tangentialVariance,`${form(tangentTerms)} = ${n(v.tangentialVariance)} m²`,{direction:tangent,covariance:v.covariance},range+' t=[−Hy,Hx]，与H正交；一个径向观测没有消除切向不确定性。'),C('range-after','当前后验均值到原点距离',v.rangeAfter,`√(${n(v.state[0])}² + ${n(v.state[1])}²) = ${n(v.rangeAfter)} m`,{state:v.state},range+' 后验均值距离不必等于测量z；局部近似不解决全局多解或观测错误关联。')];
  },[E('raise-range-noise','只把测距方差R从0.1改为0.5m²','先验与观测不变，修正幅度、径向和切向方差怎样变化？',{r:.1},{r:.5},'S从1.1变1.5，两个K都缩小；径向方差1/11→1/3m²，切向方差均1m²，均值修正幅度按1.1/1.5缩小。',(a,b)=>a.params.r===.1&&b.params.r===.5&&close(a.result.S,1.1)&&close(b.result.S,1.5)&&a.result.K.every((k,j)=>close(b.result.K[j],k*1.1/1.5))&&close(a.result.radialVariance,1/11)&&close(b.result.radialVariance,1/3)&&close(a.result.tangentialVariance,1)&&close(b.result.tangentialVariance,1)&&equal(a.result.H,b.result.H)&&close(a.result.innovation,b.result.innovation))]);

  models['rf-unscented-transform']=model('逐个构造并平方三个sigma点，再分别使用均值/协方差权重重组；在末帧与高斯平方解析矩独立核对。',(p,i,v)=>{
    if(i===0)return [C('prior-mean','高斯先验均值μ',v.mean,`μ = ${n(v.mean)}`,{mean:v.mean},sigma),C('prior-variance','高斯先验方差P',v.variance,`P = ${n(v.variance)}`,{variance:v.variance},sigma),C('lambda','无迹变换尺度λ',v.lambda,`${n(v.alpha)}² × (1+${n(v.kappa)}) − 1 = ${n(v.lambda)}`,{dimension:1,alpha:v.alpha,kappa:v.kappa},sigma+' α=1、β=2、κ=0为当前固定设计。')];
    if(i===1)return [
      ...v.points.map((x,j)=>C(`sigma-point-${j}`,`sigma点χ[${j}]`,x,j===0?`μ = ${n(x)}`:`${n(v.mean)} ${j===1?'+':'−'} √[(1+${n(v.lambda)}) × ${n(v.variance)}] = ${n(x)}`,{mean:v.mean,variance:v.variance,lambda:v.lambda,index:j},sigma)),
      ...v.meanWeights.map((x,j)=>C(`mean-weight-${j}`,`均值权重Wm[${j}]`,x,j===0?`${n(v.lambda)} / (1+${n(v.lambda)}) = ${n(x)}`:`1/[2 × (1+${n(v.lambda)})] = ${n(x)}`,{dimension:1,lambda:v.lambda,index:j},sigma)),
      ...v.covarianceWeights.map((x,j)=>C(`covariance-weight-${j}`,`协方差权重Wc[${j}]`,x,j===0?`${n(v.meanWeights[0])} + (1−${n(v.alpha)}²+${n(v.beta)}) = ${n(x)}`:`Wm[${j}] = ${n(v.meanWeights[j])}`,{meanWeight:v.meanWeights[j],alpha:v.alpha,beta:v.beta,index:j},sigma+' 中心协方差权重2不能当成均值权重0。')),
      C('mean-weight-sum','均值权重归一化',v.meanWeights.reduce((s,x)=>s+x,0),`${sumText(v.meanWeights)} = 1.0000`,{weights:v.meanWeights},sigma+' 均值权重和为1；协方差权重含β修正，不要求和为1。')
    ];
    if(i===2)return v.transformed.map((x,j)=>C(`transformed-${j}`,`非线性映射y[${j}]`,x,`(${n(v.points[j])})² = ${n(x)}`,{point:v.points[j],index:j},sigma+' 真实平方映射，没有使用Jacobian。'));
    if(i===3)return [...v.transformed.map((x,j)=>C(`mean-term-${j}`,`均值第${j}项`,v.meanWeights[j]*x,`${n(v.meanWeights[j])} × ${n(x)} = ${n(v.meanWeights[j]*x)}`,{weight:v.meanWeights[j],transformed:x},sigma)),C('output-mean','无迹变换输出均值',v.outputMean,`${dotText(v.meanWeights,v.transformed)} = ${n(v.outputMean)}`,{weights:v.meanWeights,transformed:v.transformed},sigma),C('ekf-mean','一阶近似均值h(μ)',v.ekfMean,`(${n(v.mean)})² = ${n(v.ekfMean)}`,{mean:v.mean},sigma+' 只变换均值会遗漏P。')];
    const terms=v.transformed.map((x,j)=>v.covarianceWeights[j]*(x-v.outputMean)**2);return [
      ...v.transformed.map((x,j)=>C(`variance-term-${j}`,`协方差第${j}项`,terms[j],`${n(v.covarianceWeights[j])} × (${n(x)} − ${n(v.outputMean)})² = ${n(terms[j])}`,{weight:v.covarianceWeights[j],transformed:x,outputMean:v.outputMean},sigma)),
      C('output-variance','无迹变换输出方差',v.outputVariance,`${sumText(terms)} = ${n(v.outputVariance)}`,{terms},sigma),
      C('exact-mean','最终核对：高斯平方解析均值',v.exactMean,`${n(v.mean)}² + ${n(v.variance)} = ${n(v.exactMean)}`,{mean:v.mean,variance:v.variance},sigma),
      C('exact-variance','最终核对：高斯平方解析方差',v.exactVariance,`2 × ${n(v.variance)}² + 4 × ${n(v.mean)}² × ${n(v.variance)} = ${n(v.exactVariance)}`,{mean:v.mean,variance:v.variance},sigma+' 此特殊平方映射矩匹配精确，不能推广到任意非线性函数。'),
      C('ekf-variance','最终核对：一阶近似方差',v.ekfVariance,`(2 × ${n(v.mean)})² × ${n(v.variance)} = ${n(v.ekfVariance)}`,{mean:v.mean,variance:v.variance},sigma)
    ];
  },[E('increase-zero-mean-variance','只把零均值先验P由0.2改为0.8','μ=0处一阶导数为0；UT的输出均值和方差是否仍随P增长？',{mean:0,variance:.2},{mean:0,variance:.8},'UT均值0.2→0.8，方差0.08→1.28；一阶近似均值和方差仍均0，不能捕捉此处曲率。',(a,b)=>a.params.mean===0&&b.params.mean===0&&a.params.variance===.2&&b.params.variance===.8&&close(a.result.outputMean,.2)&&close(b.result.outputMean,.8)&&close(a.result.outputVariance,.08)&&close(b.result.outputVariance,1.28)&&close(a.result.ekfMean,0)&&close(b.result.ekfMean,0)&&close(a.result.ekfVariance,0)&&close(b.result.ekfVariance,0)&&close(a.result.outputVariance,a.result.exactVariance)&&close(b.result.outputVariance,b.result.exactVariance))]);

  return {courseId:'kalman',models};
});
