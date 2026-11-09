/* Bonn Mobile Robotics: arithmetic for the current original calculation snapshot. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const sum=xs=>xs.reduce((a,b)=>a+b,0),near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-10;
  const f=x=>typeof x==='number'?x.toFixed(4):String(x),plus=xs=>xs.map(f).join(' + ');
  const C=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note});
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const models={};
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){
    const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0)),s=t.steps[i];
    return {title:s.title,summary:`当前第 ${i+1} 个实际计算快照，第 ${s.line} 行执行后。${s.detail} 仅展开本帧已经计算的量；公式显示四位小数，验证保留完整精度。`,cells:inspect(t.params,s.variables,i)};
  },experiments};}

  models['bonn-motion']=model('把轮缘线速度先合成为机体速度，再按当前恒速段精确积分；轮速、角速度、航向变化分别有不同单位。',(p,v,i)=>{
    const note='理想差速车，无打滑；轮速m/s，轮距m，时间s，正角速度为逆时针。';
    if(i===0)return [C('track','固定轮距',v.track,`b = ${f(v.track)} m`,{track:v.track},note),...v.pose.map((x,j)=>C('initial-'+j,['初始x','初始y','初始航向'][j],x,`${['x₀','y₀','θ₀'][j]} = ${f(x)} ${j===2?'rad':'m'}`,{component:j,pose:v.pose},note))];
    if(i===1)return [C('linear-speed','机体线速度',v.v,`(${f(p.left)} + ${f(p.right)}) / 2 = ${f(v.v)} m/s`,{left:p.left,right:p.right},note),C('angular-speed','机体角速度',v.omega,`(${f(p.right)} − ${f(p.left)}) / ${f(v.track)} = ${f(v.omega)} rad/s`,{left:p.left,right:p.right,track:v.track},note)];
    const a=v.omega*p.dt,straight=Math.abs(v.omega)<1e-9;
    const pose=[C('next-x','恒速段末x',v.next[0],straight?`${f(v.v)} × ${f(p.dt)} = ${f(v.next[0])} m`:`${f(v.v)} / (${f(v.omega)}) × sin(${f(a)}) = ${f(v.next[0])} m`,{speed:v.v,omega:v.omega,dt:p.dt,angle:a},note+' |ω|<10⁻⁹时用直线分支，避免除零。'),C('next-y','恒速段末y',v.next[1],straight?`|${f(v.omega)}| < 10⁻⁹ → y = ${f(v.next[1])} m`:`${f(v.v)} / (${f(v.omega)}) × (1 − cos(${f(a)})) = ${f(v.next[1])} m`,{speed:v.v,omega:v.omega,dt:p.dt,angle:a},note),C('next-heading','恒速段末航向',v.next[2],`${f(v.omega)} × ${f(p.dt)} = ${f(v.next[2])} rad`,{omega:v.omega,dt:p.dt},note)];
    if(i===2)return pose;
    return [...pose,C('distance','行驶弧长',v.distance,`${f(v.v)} × ${f(p.dt)} = ${f(v.distance)} m`,{speed:v.v,dt:p.dt},note+' 最终核对：弧长通常不同于原点到末位姿的直线距离。'),C('heading-check','报告航向',v.heading,`heading = next[2] = ${f(v.next[2])} rad`,{heading:v.next[2]},'最终核对：计算里程计，不是真机漂移测量。')];
  },[
    E('equal-wheels','只把右轮调到与左轮相同','轮速相等时，圆弧半径的除法该怎样处理？',{left:1,right:1.2,dt:.5},{left:1,right:1,dt:.5},'角速度0.4→0 rad/s；末位姿变为[0.5,0,0]，使用直线分支。',(a,b)=>near(a.result.omega,.4)&&near(a.result.next[2],.2)&&near(b.result.omega,0)&&near(b.result.next[0],.5)&&near(b.result.next[1],0)&&near(b.result.next[2],0)&&near(b.result.distance,.5))
  ]);

  models['bonn-observation']=model('同一测量先与两个地标距离作差，再逐格求似然密度，最后只在这两个等先验候选中归一化。',(p,v,i)=>{
    const note='一维已知地标x=5m；候选位置2m和3m，独立高斯测距噪声σ>0；密度单位m⁻¹。';
    if(i===0)return v.predicted.map((x,j)=>C('range-'+j,`候选x=${f(v.positions[j])}m的预测距离`,x,`|5.0000 − ${f(v.positions[j])}| = ${f(x)} m`,{landmark:5,position:v.positions[j]},note));
    if(i===1)return v.residuals.map((x,j)=>C('residual-'+j,`候选${j}的有符号残差`,x,`${f(p.range)} − ${f(v.predicted[j])} = ${f(x)} m`,{measurement:p.range,predicted:v.predicted[j]},note));
    const likelihoods=v.likelihoods.map((x,j)=>C('likelihood-'+j,`候选${j}的测量似然密度`,x,`exp(−0.5 × (${f(v.residuals[j])} / ${f(p.sigma)})²) / (${f(p.sigma)} × √(2π)) = ${f(x)} m⁻¹`,{residual:v.residuals[j],sigma:p.sigma},note+' 密度不是离散位置概率，不能直接把密度叫后验。'));
    if(i===2)return likelihoods;
    const z=sum(v.likelihoods);
    return [...likelihoods,C('likelihood-total','似然密度之和',z,`${plus(v.likelihoods)} = ${f(z)} m⁻¹`,{likelihoods:v.likelihoods},'两个候选的先验均为0.5，公共先验因子在归一化时抵消；此和本身不是观测边缘密度。'),...v.posterior.map((x,j)=>C('posterior-'+j,`候选${j}的离散后验`,x,`${f(v.likelihoods[j])} / (${plus(v.likelihoods)}) = ${f(x)}`,{likelihood:v.likelihoods[j],normalizer:z,prior:.5},'最终核对：仅在这两个候选上归一化，后验无单位；未实现连续空间定位。四位小数显示0.0000可能只是舍入，实际分母严格大于0。'))];
  },[
    E('midpoint-measurement','只把测距改为两预测的中点','两候选等先验时，残差符号相反会不会导致不同后验？',{range:2,sigma:.5},{range:2.5,sigma:.5},'残差[-1,0]→[-0.5,0.5]；位置3后验0.880797→0.5，两似然相等。',(a,b)=>near(a.result.posterior[1],1/(1+Math.exp(-2)))&&near(b.result.residuals[0],-.5)&&near(b.result.residuals[1],.5)&&near(b.result.likelihoods[0],b.result.likelihoods[1])&&b.result.posterior.every(x=>near(x,.5)))
  ]);

  models['bonn-bayes']=model('运动预测必须把两种旧位置的贡献求和；观测只重加权预测，最后除以同一次观测的边缘概率。',(p,v,i)=>{
    const note='两格离散概率，无单位；运动保持概率0.75、交换概率0.25，观测为“在左侧”。';
    if(i===0)return [...v.prior.map((x,j)=>C('prior-'+j,`${j===0?'左':'右'}格先验`,x,`bel(${j===0?'左':'右'}) = ${f(x)}`,{state:j,prior:x},note)),C('prior-total','先验概率和',sum(v.prior),`${plus(v.prior)} = ${f(sum(v.prior))}`,{prior:v.prior},note)];
    if(i===1)return v.predicted.map((x,j)=>{const transition=j===0?[.75,.25]:[.25,.75],parts=v.prior.map((b,k)=>b*transition[k]);return C('predicted-'+j,`${j===0?'左':'右'}格预测`,x,`${f(transition[0])} × ${f(v.prior[0])} + ${f(transition[1])} × ${f(v.prior[1])} = ${f(x)}`,{transition,prior:v.prior,contributions:parts},note+' 对所有旧位置求和，不只移动最大概率格。');});
    if(i===2)return v.unnormalized.map((x,j)=>C('unnormalized-'+j,`${j===0?'左':'右'}格未归一化质量`,x,`${f(v.predicted[j])} × ${j===0?f(p.sensor):`(1 − ${f(p.sensor)})`} = ${f(x)}`,{predicted:v.predicted[j],likelihood:j===0?p.sensor:1-p.sensor},note+' 此时概率和尚未归一。'));
    return [C('evidence','本次观测的边缘概率',v.evidence,`${plus(v.unnormalized)} = ${f(v.evidence)}`,{unnormalized:v.unnormalized},note+' 现有控件保证分母为正。'),...v.posterior.map((x,j)=>C('posterior-'+j,`${j===0?'左':'右'}格后验`,x,`${f(v.unnormalized[j])} / ${f(v.evidence)} = ${f(x)}`,{unnormalized:v.unnormalized[j],evidence:v.evidence},'最终核对：乘观测前使用运动预测；两格后验和为1。'))];
  },[
    E('uninformative-sensor','只把观测正确率调为0.5','不提供位置区分信息的观测会撤销运动预测吗？',{sensor:.8},{sensor:.5},'预测均为[0.55,0.45]；左侧后验44/53→0.55，观测不改变预测。',(a,b)=>near(a.result.evidence,.53)&&near(a.result.posterior[0],44/53)&&near(b.result.evidence,.5)&&b.result.posterior.every((x,j)=>near(x,b.result.predicted[j]))&&a.result.predicted.every((x,j)=>near(x,b.result.predicted[j])))
  ]);

  models['bonn-ekf']=model('平方观测在当前预测点线性化；观测残差要经过带单位的Kalman增益映射，方差用Joseph的两个非负项核对。',(p,v,i)=>{
    const note='标量教学EKF：x以m计，z=x²以m²计；P单位m²，R与S单位m⁴，H单位m，K单位m⁻¹。只在正位置附近作一阶近似。';
    if(i===0)return [C('predicted-measurement','非线性预测观测',v.predicted,`${f(p.x)}² = ${f(v.predicted)} m²`,{x:p.x},note),C('jacobian','当前观测Jacobian',v.jacobian,`d(x²)/dx | x=${f(p.x)} = 2 × ${f(p.x)} = ${f(v.jacobian)} m`,{x:p.x},note),C('measurement','给定观测',v.measurement,`z = ${f(v.measurement)} m²`,{measurement:v.measurement},note)];
    if(i===1)return [C('innovation','有符号创新',v.innovation,`${f(v.measurement)} − ${f(v.predicted)} = ${f(v.innovation)} m²`,{measurement:v.measurement,predicted:v.predicted},note),C('propagated-variance','预测观测方差贡献',v.jacobian**2*p.variance,`${f(v.jacobian)}² × ${f(p.variance)} = ${f(v.jacobian**2*p.variance)} m⁴`,{jacobian:v.jacobian,variance:p.variance},note),C('innovation-variance','创新方差S',v.innovationVariance,`${f(v.jacobian)}² × ${f(p.variance)} + ${f(p.noise)} = ${f(v.innovationVariance)} m⁴`,{jacobian:v.jacobian,variance:p.variance,noise:p.noise},note+' 预测和观测误差不相关，R>0。')];
    if(i===2)return [C('gain','Kalman增益',v.gain,`${f(p.variance)} × ${f(v.jacobian)} / ${f(v.innovationVariance)} = ${f(v.gain)} m⁻¹`,{variance:p.variance,jacobian:v.jacobian,innovationVariance:v.innovationVariance},note)];
    const contraction=1-v.gain*v.jacobian,priorTerm=contraction**2*p.variance,noiseTerm=v.gain**2*p.noise;
    return [C('state-correction','均值校正量',v.gain*v.innovation,`${f(v.gain)} × (${f(v.innovation)}) = ${f(v.gain*v.innovation)} m`,{gain:v.gain,innovation:v.innovation},note),C('updated','校正后位置',v.updated,`${f(p.x)} + ${f(v.gain)} × (${f(v.innovation)}) = ${f(v.updated)} m`,{x:p.x,gain:v.gain,innovation:v.innovation},note),C('joseph-prior','Joseph先验贡献',priorTerm,`(1 − ${f(v.gain)} × ${f(v.jacobian)})² × ${f(p.variance)} = ${f(priorTerm)} m²`,{gain:v.gain,jacobian:v.jacobian,variance:p.variance},note),C('joseph-noise','Joseph噪声贡献',noiseTerm,`${f(v.gain)}² × ${f(p.noise)} = ${f(noiseTerm)} m²`,{gain:v.gain,noise:p.noise},note),C('posterior-variance','Joseph后验方差',v.posteriorVariance,`${f(priorTerm)} + ${f(noiseTerm)} = ${f(v.posteriorVariance)} m²`,{priorTerm,noiseTerm},'最终核对：两个非负项之和；方差小不证明真实误差小，单峰高斯不能表达平方观测的全局正负歧义。')];
  },[
    E('larger-measurement-noise','只提高观测方差R','相同预测点与残差下，增益、校正量和后验方差怎样变？',{x:2,variance:.5,noise:.5},{x:2,variance:.5,noise:1},'S:8.5→9，K:4/17→2/9；校正减小，后验方差1/34→1/18。',(a,b)=>near(a.result.innovation,b.result.innovation)&&near(a.result.gain,4/17)&&near(b.result.gain,2/9)&&near(a.result.posteriorVariance,1/34)&&near(b.result.posteriorVariance,1/18)&&b.result.updated<a.result.updated)
  ]);

  models['bonn-particles']=model('先把每粒子的观测残差转成归一化权重，再分别检查ESS、累计区间和固定系统采样点；复制粒子后重置等权。',(p,v,i)=>{
    const note='一维粒子位置和观测单位m，σ单位m；初始四粒子等权。固定滑块采样点，不是随机定位实验。';
    if(i===0)return v.particles.map((x,j)=>C('particle-'+j,`初始粒子${j}`,x,`x[${j}] = ${f(x)} m，w₀[${j}] = 1 / 4 = 0.2500`,{position:x,priorWeight:.25},note+' 本例省略运动采样，仅隔离观测更新。'));
    const raw=v.particles.map(x=>Math.exp(-.5*((p.measurement-x)/p.sigma)**2)),z=sum(raw);
    if(i===1)return [...raw.map((x,j)=>C('raw-weight-'+j,`粒子${j}的相对似然`,x,`exp(−0.5 × ((${f(p.measurement)} − ${f(v.particles[j])}) / ${f(p.sigma)})²) = ${f(x)}`,{measurement:p.measurement,particle:v.particles[j],sigma:p.sigma},note+' 公共高斯常数及等先验因子可约去，所示相对似然无单位。')),...v.weights.map((x,j)=>C('weight-'+j,`粒子${j}的归一化权重`,x,`${f(raw[j])} / (${plus(raw)}) = ${f(x)}`,{rawWeight:raw[j],normalizer:z},note+' 权重不是粒子位置，也不直接等于定位精度。'))];
    if(i===2)return [...v.weights.map((x,j)=>C('squared-weight-'+j,`粒子${j}的平方权重`,x*x,`${f(x)}² = ${f(x*x)}`,{weight:x},note)),C('ess','有效样本数',v.ess,`1 / (${v.weights.map(x=>`${f(x)}²`).join(' + ')}) = ${f(v.ess)}`,{weights:v.weights,sumSquares:sum(v.weights.map(x=>x*x))},note+' ESS∈[1,4]；仅度量权重退化。'),...v.cdf.map((x,j)=>C('cdf-'+j,`到粒子${j}的累计权重`,x,`${plus(v.weights.slice(0,j+1))} = ${f(x)}`,{weights:v.weights.slice(0,j+1)},note+' 后续采样使用首个u<CDF的下标，等于边界时进入下一区间。'))];
    return v.draws.flatMap((u,k)=>{const j=v.cdf.findIndex(x=>u<x),lower=j===0?0:v.cdf[j-1];return [C('draw-'+k,`系统采样点${k}`,u,`${f(p.offset)} + ${k} / 4 = ${f(u)}`,{offset:p.offset,k,count:4},note+' offset∈[0,0.24]，四点均在[0,1)。'),C('resampled-'+k,`复制后粒子${k}`,v.resampled[k],`${f(lower)} ≤ ${f(u)} < ${f(v.cdf[j])} → 索引${j} → x[${j}] = ${f(v.resampled[k])} m`,{draw:u,selectedIndex:j,lower,upper:v.cdf[j],particle:v.particles[j]},note+' 使用严格u<CDF，与原模型的findIndex一致。'),C('new-weight-'+k,`重采样后权重${k}`,v.newWeights[k],`1 / 4 = ${f(v.newWeights[k])}`,{count:4},'最终核对：新粒子等权，允许重复位置；复制后不能继续携带旧非均匀权重。')];});
  },[
    E('systematic-offset','只改变系统重采样偏移','观测与旧权重不变，固定采样点平移会复制哪些粒子？',{measurement:1,sigma:.5,offset:0},{measurement:1,sigma:.5,offset:.24},'权重、ESS与CDF不变；重采样[0,0.5,1,1]→[0.5,1,1,2]，新权重仍为1/4。',(a,b)=>a.result.weights.every((x,j)=>near(x,b.result.weights[j]))&&near(a.result.ess,b.result.ess)&&a.result.resampled.every((x,j)=>near(x,[0,.5,1,1][j]))&&b.result.resampled.every((x,j)=>near(x,[.5,1,1,2][j]))&&b.result.newWeights.every(x=>near(x,.25)))
  ]);

  models['bonn-grid']=model('未知先验为0.5时，把每次逆传感器后验变成log-odds增量；按独立观测数逐项累加，最后用sigmoid还原占用概率。',(p,v,i)=>{
    const note='单格占用概率与log-odds均无单位；固定先验0.5，各次观测条件独立，没有实现射线清空。';
    if(i===0)return [C('prior','未知格子的先验',v.prior,`P(occupied) = ${f(v.prior)}`,{prior:v.prior},note+' 未知不是空闲，也不表示确定有半个障碍物。'),C('prior-log-odds','先验对数几率',v.priorLogOdds,`ln(${f(v.prior)} / (1 − ${f(v.prior)})) = ${f(v.priorLogOdds)}`,{prior:v.prior},note)];
    if(i===1)return [C('increment','一次独立观测的增量',v.increment,`ln(${f(p.occupied)} / (1 − ${f(p.occupied)})) − 0.0000 = ${f(v.increment)}`,{occupied:p.occupied,priorLogOdds:v.priorLogOdds},note+' 一般先验需减去其log-odds；本例该项为0。')];
    if(i===2)return [...v.history.map((x,k)=>C('history-'+k,`${k}次观测后log-odds`,x,`${k} × ${f(v.increment)} = ${f(x)}`,{hits:k,increment:v.increment},note+' 本帧一次生成完整history；这些是本帧内部累计记录，不是新增动画时刻。')),C('log-odds','最终累计log-odds',v.logOdds,`${p.hits} × ${f(v.increment)} = ${f(v.logOdds)}`,{hits:p.hits,increment:v.increment},note+' 重复同一帧不符合独立性，不能当新证据。')];
    return [C('odds','累计占用几率',Math.exp(v.logOdds),`exp(${f(v.logOdds)}) = ${f(Math.exp(v.logOdds))}`,{logOdds:v.logOdds},note+' 几率p/(1−p)，不是概率。'),C('probability','还原占用概率',v.probability,`1 / (1 + exp(−${f(v.logOdds)})) = ${f(v.probability)}`,{logOdds:v.logOdds},'最终核对：置信度累计来自独立性假设，不是真机障碍物测量。')];
  },[
    E('third-independent-hit','只增加一次独立相同观测','单次占用后验不变时，总几率是相加还是相乘？',{occupied:.75,hits:2},{occupied:.75,hits:3},'log-odds:2ln3→3ln3；几率9→27，占用概率0.9→27/28。',(a,b)=>near(a.result.increment,Math.log(3))&&near(b.result.increment,a.result.increment)&&near(a.result.probability,.9)&&near(b.result.probability,27/28)&&b.result.history.length===a.result.history.length+1)
  ]);

  models['bonn-slam']=model('先锚定x₀消除整体平移，再把三条等权一维约束组成正规方程；解出两格位置后逐条回算残差和梯度平衡。',(p,v,i)=>{
    const note='一维位姿单位m，三条约束等权、误差平方单位m²；固定x₀=0，不含旋转、关联估计或鲁棒核。';
    if(i===0)return v.raw.map((x,j)=>C('raw-'+j,`未闭环校正的x${j}`,x,j===2?`1.0000 + ${f(p.odom)} = ${f(x)} m`:`x${j} = ${f(x)} m`,{anchor:0,firstOdom:1,secondOdom:p.odom,index:j},note));
    if(i===1)return [C('rhs-0','正规方程右端第0格',v.rhs[0],`1.0000 − ${f(p.odom)} = ${f(v.rhs[0])}`,{firstOdom:1,secondOdom:p.odom},note),C('rhs-1','正规方程右端第1格',v.rhs[1],`${f(p.odom)} + ${f(p.loop)} = ${f(v.rhs[1])}`,{secondOdom:p.odom,loop:p.loop},note),...[[2,-1],[-1,2]].flatMap((row,r)=>row.map((x,c)=>C(`normal-${r}-${c}`,`AᵀA[${r},${c}]`,x,r===0&&c===0?'1² + (−1)² + 0² = 2.0000':r===1&&c===1?'0² + 1² + 1² = 2.0000':'1 × 0 + (−1) × 1 + 0 × 1 = −1.0000',{design:[[1,0],[-1,1],[0,1]],row:r,column:c},'锚定位姿后，A行分别对应x₁、x₂−x₁、x₂；系数矩阵无单位。')))];
    if(i===2)return [C('anchor','固定锚点',v.poses[0],`x₀ = ${f(v.poses[0])} m`,{anchor:v.poses[0]},note),C('pose-1','最小二乘x₁',v.poses[1],`(2 × ${f(v.rhs[0])} + ${f(v.rhs[1])}) / (2 × 2 − (−1) × (−1)) = ${f(v.poses[1])} m`,{rhs:v.rhs,determinant:3},note),C('pose-2','最小二乘x₂',v.poses[2],`(${f(v.rhs[0])} + 2 × ${f(v.rhs[1])}) / 3 = ${f(v.poses[2])} m`,{rhs:v.rhs,determinant:3},note)];
    return [C('residual-0','第一段里程计残差',v.residuals[0],`${f(v.poses[1])} − 1.0000 = ${f(v.residuals[0])} m`,{x1:v.poses[1],measurement:1},note),C('residual-1','第二段里程计残差',v.residuals[1],`${f(v.poses[2])} − ${f(v.poses[1])} − ${f(p.odom)} = ${f(v.residuals[1])} m`,{x1:v.poses[1],x2:v.poses[2],odom:p.odom},note),C('residual-2','首尾闭环残差',v.residuals[2],`${f(v.poses[2])} − ${f(p.loop)} = ${f(v.residuals[2])} m`,{x2:v.poses[2],loop:p.loop},note),C('squared-error','三约束误差平方和',sum(v.residuals.map(x=>x*x)),`${v.residuals.map(x=>`(${f(x)})²`).join(' + ')} = ${f(sum(v.residuals.map(x=>x*x)))} m²`,{residuals:v.residuals},'最终核对：最小二乘分配误差，不强制最后一帧恰好等于闭环。'),C('normal-balance-0','x₁梯度的一半',v.residuals[0]-v.residuals[1],`${f(v.residuals[0])} − (${f(v.residuals[1])}) = ${f(v.residuals[0]-v.residuals[1])}`,{residuals:v.residuals},'最终核对：Aᵀr两格应在浮点容差内为0。'),C('normal-balance-1','x₂梯度的一半',v.residuals[1]+v.residuals[2],`${f(v.residuals[1])} + (${f(v.residuals[2])}) = ${f(v.residuals[1]+v.residuals[2])}`,{residuals:v.residuals},'最终核对：Aᵀr两格应在浮点容差内为0。')];
  },[
    E('consistent-loop','只把闭环改为与里程计一致','闭环不再与两段里程计冲突时，哪几帧需要校正？',{odom:1.2,loop:2},{odom:1.2,loop:2.2},'默认位姿[0,14/15,31/15]→[0,1,2.2]；三条残差均变为0。',(a,b)=>near(a.result.poses[1],14/15)&&near(a.result.poses[2],31/15)&&b.result.poses.every((x,j)=>near(x,b.result.raw[j]))&&b.result.residuals.every(x=>near(x,0))&&sum(a.result.residuals.map(x=>x*x))>0)
  ]);

  // Original stage 2 performs its whole search before emitting a snapshot. Recompute its
  // bounded inner-loop arithmetic for inspection; never append playback frames.
  function searchCells(p,v){
    const g=[0,Infinity,Infinity,Infinity],open=[0],cells=[];let k=0;
    while(open.length&&k<20){
      open.sort((a,b)=>(g[a]+p.weight*v.heuristic[a])-(g[b]+p.weight*v.heuristic[b]));
      const queue=open.slice(),n=open.shift(),priority=g[n]+p.weight*v.heuristic[n];
      cells.push(C('expand-'+k,`内部展开${k}：${v.names[n]}`,v.names[n],`${queue.map(j=>`${v.names[j]}: ${f(g[j])} + ${f(p.weight)} × ${f(v.heuristic[j])} = ${f(g[j]+p.weight*v.heuristic[j])}`).join('；')} → 取 ${v.names[n]}`,{queue:queue.map(j=>v.names[j]),g:g.map(x=>Number.isFinite(x)?x:null),heuristic:v.heuristic,weight:p.weight,priority},'本帧已执行完整有界搜索；这是本帧内部循环复算。相同f按插入顺序；g与h为抽象代价，w无单位。'));
      if(n===3)break;
      for(const [to,cost] of v.edges[n]){const old=g[to],candidate=g[n]+cost,improve=candidate<old;
        cells.push(C(`relax-${k}-${to}`,`${v.names[n]}→${v.names[to]}的代价松弛`,improve,`${f(g[n])} + ${f(cost)} = ${f(candidate)} < ${Number.isFinite(old)?f(old):'∞'} → ${improve?'更新g及父节点':'保留原g'}`,{from:v.names[n],to:v.names[to],sourceCost:g[n],edgeCost:cost,oldCost:Number.isFinite(old)?old:null,candidate},'同一已完成搜索中的逐条边检查；只有严格改善才更新并入队，null表示当时尚未发现的无穷代价。'));
        if(improve){g[to]=candidate;if(!open.includes(to))open.push(to);}
      }k++;
    }return cells;
  }
  models['bonn-astar']=model('图区分边的代价、已经走过的g与剩余估计h；展开按g+wh排序，完整搜索算完后才回溯路径和汇总代价。',(p,v,i)=>{
    const note='有限四节点有向图，非负抽象代价；w∈[0,2]。w≤1时这里的启发式可采纳；w>1无一般最优性保证。';
    if(i===0)return [...v.edges.flatMap((edges,from)=>edges.map(([to,cost])=>C(`edge-${from}-${to}`,`边${v.names[from]}→${v.names[to]}`,cost,`c(${v.names[from]},${v.names[to]}) = ${f(cost)}`,{from:v.names[from],to:v.names[to],cost},note))),...v.heuristic.map((x,j)=>C('heuristic-'+j,`${v.names[j]}的剩余估计`,x,`h(${v.names[j]}) = ${f(x)}；加权项 ${f(p.weight)} × ${f(x)} = ${f(p.weight*x)}`,{node:v.names[j],heuristic:x,weight:p.weight},note+' 本帧只定义图，搜索尚未执行。'))];
    if(i===1)return [...searchCells(p,v),...v.costs.map((x,j)=>C('cost-'+j,`搜索结束时g(${v.names[j]})`,x,x===null?'尚未发现 → null':`g(${v.names[j]}) = ${f(x)}；父节点 ${v.parent[j]===-1?'无（起点）':v.names[v.parent[j]]}`,{node:v.names[j],cost:x,parent:v.parent[j],expanded:v.expanded.map(j=>v.names[j])},note+' 本帧整个搜索已结束，但下一帧才构造path数组。')),C('expanded-order','真实展开顺序',v.expanded.map(j=>v.names[j]).join(' → '),`expanded = [${v.expanded.join(', ')}] → ${v.expanded.map(j=>v.names[j]).join(' → ')}`,{expanded:v.expanded,names:v.names},note)];
    if(i===2)return [C('goal-popped','终点已实际出队',v.expanded.includes(3),`expanded=[${v.expanded.join(', ')}] 包含 G的索引3 → ${v.expanded.includes(3)}`,{expanded:v.expanded,goal:3},note+' 不是仅发现终点邻居就报告成功。'),...v.path.map((name,k)=>{const j=v.names.indexOf(name),parent=v.parent[j];return C('path-'+k,`路径位置${k}`,name,`${name}的父索引 = ${parent}${parent===-1?' → 回溯终止':` → ${v.names[parent]}`}；倒转回溯后 path[${k}] = ${name}`,{node:name,index:j,parent,path:v.path},note+' 这是搜索后的父指针回溯，不是机器人已经走过的物理轨迹。');})];
    const edges=v.path.slice(1).map((name,k)=>{const from=v.names.indexOf(v.path[k]),to=v.names.indexOf(name);return v.edges[from].find(x=>x[0]===to)[1];});
    return [C('path-cost','返回路径的边代价和',v.cost,`${plus(edges)} = ${f(v.cost)}`,{path:v.path,edgeCosts:edges,goalCost:v.costs[3]},'最终核对：此图两路线S-A-G=5、S-B-G=3；当前权重范围得到3，不证明加权A*在其他图上最优。'),C('expanded-count','实际出队次数',v.expandedCount,`length([${v.expanded.map(j=>v.names[j]).join(', ')}]) = ${v.expandedCount}`,{expanded:v.expanded},'最终核对：出队次数和路径代价是不同指标；不代表大型地图性能。'),C('path-length','返回路径节点数',v.path.length,`length([${v.path.join(', ')}]) = ${v.path.length}，边数 = ${Math.max(0,v.path.length-1)}`,{path:v.path},'最终核对：节点数不是总代价，也不是米制长度。'),C('initial-priority','已执行搜索的起点优先级',p.weight*v.heuristic[0],`0.0000 + ${f(p.weight)} × ${f(v.heuristic[0])} = ${f(p.weight*v.heuristic[0])}`,{startCost:0,weight:p.weight,heuristic:v.heuristic[0]},'最终核对：回看本次搜索已使用的初始优先级；权重改变此数，即使这个小图最终路径恰好相同。')];
  },[
    E('zero-heuristic-weight','只把启发式权重调为0','w=0会移除h还是改变图的边代价？',{weight:1},{weight:0},'排序退化为g（Dijkstra）；这张图仍按S,A,B,G展开，路径S-B-G和代价3不变，S的初始优先级3→0。',(a,b)=>near(a.params.weight,1)&&near(b.params.weight,0)&&a.result.expanded.join(',')==='0,1,2,3'&&b.result.expanded.join(',')===a.result.expanded.join(',')&&a.result.path.join(',')==='S,B,G'&&b.result.path.join(',')===a.result.path.join(',')&&near(a.result.cost,3)&&near(b.result.cost,3)&&near(a.params.weight*a.result.heuristic[0],3)&&near(b.params.weight*b.result.heuristic[0],0))
  ]);

  return {courseId:'bonn',models};
});
