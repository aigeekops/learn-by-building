/* MIT 18.05 companion: arithmetic from the current and preceding local snapshots. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const sum=xs=>xs.reduce((a,b)=>a+b,0),near=(a,b)=>Math.abs(a-b)<1e-10;
  const f=x=>typeof x==='number'?x.toFixed(4):String(x);
  const plus=xs=>xs.map(f).join(' + ');
  const C=(id,label,value,formula,inputs,note='原创有限算例；公式显示四位小数，格子与验证保留原始精度。')=>({id,label,value,formula,inputs,note});
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const models={};
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0)),s=t.steps[i],v=Object.assign({},...t.steps.slice(0,i+1).map(x=>x.variables));return {title:s.title,summary:`当前第 ${i+1} 个实际计算快照，第 ${s.line} 行执行后。${s.detail}`,cells:inspect(t,s.line,v)};},experiments};}

  models['probability-binomial']=model('先数恰好k个成功位置的组合数，再乘每个排列的概率；最后逐项加总概率与加权次数。',(t,l,v)=>{
    const note='各次试验相互独立、成功概率相同；0次幂按1处理，允许q=0或1。';
    if(l===1)return [C('trial-count','固定试验次数',v.n,`n = ${v.n}，X 的可能取值为 0 到 ${v.n}`,{n:v.n},note),C('success-probability','每次成功与失败概率',v.q,`q = ${f(v.q)}；1 − q = ${f(1-v.q)}`,{q:v.q},note)];
    if(l===2)return v.counts.map((x,k)=>C('count-'+k,`${k}次成功的位置组合数`,x,`C(${v.n},${k}) = ${v.n}! / (${k}! × ${v.n-k}!) = ${x}`,{n:v.n,k,count:x},'组合数计数成功位置集合；不同排列互斥，才可把概率相加。'));
    if(l===3)return v.masses.map((x,k)=>C('mass-'+k,`P(X=${k})`,x,`${v.counts[k]} × ${f(v.q)}^${k} × ${f(1-v.q)}^${v.n-k} = ${f(x)}`,{n:v.n,k,count:v.counts[k],q:v.q,successFactor:v.q**k,failureFactor:(1-v.q)**(v.n-k)},note));
    if(l===4)return [C('probability-total','全部结果的概率和',v.total,`${plus(v.masses)} = ${f(v.total)}`,{masses:v.masses},'0到n次成功互斥且穷尽；浮点和与1可能有舍入误差。')];
    return [...v.masses.map((x,k)=>C('expectation-part-'+k,`${k}次成功的期望贡献`,k*x,`${k} × ${f(x)} = ${f(k*x)}`,{k,mass:x},'期望贡献的单位为成功次数；单项贡献不是该事件概率。')),C('expectation','期望的加权和',v.expectation,`${plus(v.masses.map((x,k)=>k*x))} = ${f(v.expectation)}`,{masses:v.masses},'最终核对：期望可以不是整数，不保证某一次试验等于期望。'),C('nq-check','nq独立核对',v.formula,`${v.n} × ${f(v.q)} = ${f(v.formula)}`,{n:v.n,q:v.q},'最终核对：在同一二项模型下，加权和应等于nq。')];
  },[
    E('success-rate','只提高每次成功概率','次数保持4时，概率质量怎样向更大的成功次数移动？',{prob:.2},{prob:.8},'期望0.8→3.2；零次成功概率下降，四次成功概率上升；总概率均为1。',(a,b)=>a.result.n===b.result.n&&near(a.result.expectation,.8)&&near(b.result.expectation,3.2)&&b.result.masses[0]<a.result.masses[0]&&b.result.masses[4]>a.result.masses[4]&&near(a.result.total,1)&&near(b.result.total,1)),
    E('trial-count','只增加独立试验次数','成功概率不变，样本空间和期望各怎样变化？',{n:4},{n:8},'q仍为0.5；可能次数由5种变9种，期望2→4，总概率仍为1。',(a,b)=>a.result.q===b.result.q&&a.result.masses.length===5&&b.result.masses.length===9&&near(a.result.expectation,2)&&near(b.result.expectation,4)&&near(a.result.total,1)&&near(b.result.total,1))
  ]);

  models['probability-bayes']=model('把报警拆成次品真报与良品误报两条互斥分支，在报警集合内重新归一化，再明确赔率的无穷边界。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return [C('defective-alarm','次品且报警的联合概率',v.defectiveAlarm,`${f(v.prior)} × ${f(v.sensitivity)} = ${f(v.defectiveAlarm)}`,{prior:v.prior,sensitivity:v.sensitivity},'虚构零件模型；P(D∩A)=P(D)P(A|D)，无需假设D与A独立。')];
    if(l===2)return [C('good-alarm','良品且误报的联合概率',v.goodAlarm,`(1 − ${f(p.prior)}) × ${f(p.falsePositive)} = ${f(v.goodAlarm)}`,{prior:p.prior,falsePositive:p.falsePositive},'良品和次品是互斥且穷尽的分类；误报率是P(A|非D)。')];
    if(l===3)return [C('alarm-total','报警总概率',v.evidence,`${f(v.defectiveAlarm)} + ${f(v.goodAlarm)} = ${f(v.evidence)}`,{defectiveAlarm:v.defectiveAlarm,goodAlarm:v.goodAlarm},'两条分支相加构成P(A)；现有控件保证分母大于0。')];
    if(l===4)return [C('posterior','报警后的次品概率',v.posterior,`${f(v.defectiveAlarm)} / (${f(v.defectiveAlarm)} + ${f(v.goodAlarm)}) = ${f(v.posterior)}`,{defectiveAlarm:v.defectiveAlarm,goodAlarm:v.goodAlarm,evidence:v.evidence},'P(D|A)不是P(A|D)；分母包括良品误报。'),C('good-posterior','报警后的良品概率',v.goodAlarm/v.evidence,`${f(v.goodAlarm)} / ${f(v.evidence)} = ${f(v.goodAlarm/v.evidence)}`,{goodAlarm:v.goodAlarm,evidence:v.evidence},'两个后验类别的概率和为1。')];
    return [C('posterior-odds','报警后的次品赔率',v.odds,v.odds===null?`${f(v.posterior)} / (1 − ${f(v.posterior)})：分母为0 → 无穷；有限数值格保持null`:`${f(v.posterior)} / (1 − ${f(v.posterior)}) = ${f(v.odds)}`,{posterior:v.posterior,goodPosterior:1-v.posterior,oddsStatus:v.oddsStatus},v.odds===null?'最终核对：无误报时后验为1；赔率无穷，null不是0，也不伪造有限值。':'最终核对：赔率为次品后验与良品后验之比，不是另一个概率。')];
  },[
    E('base-rate','只降低次品先验比例','检测性能不变时，报警后的次品概率能保持0.5吗？',{prior:.1},{prior:.01},'后验0.5→1/12；真报联合份额下降，误报联合份额上升。',(a,b)=>near(a.result.posterior,.5)&&near(b.result.posterior,1/12)&&b.result.defectiveAlarm<a.result.defectiveAlarm&&b.result.goodAlarm>a.result.goodAlarm),
    E('sensitivity','只提高次品报警率','误报支路不变时，真报份额和后验如何改变？',{sensitivity:.5},{sensitivity:1},'良品误报仍为0.09；真报0.05→0.1，后验5/14→10/19。',(a,b)=>near(a.result.goodAlarm,.09)&&near(b.result.goodAlarm,.09)&&near(a.result.defectiveAlarm,.05)&&near(b.result.defectiveAlarm,.1)&&near(a.result.posterior,5/14)&&near(b.result.posterior,10/19)),
    E('no-false-alarm','只把良品误报率降为0','没有良品报警时，后验与赔率的边界应怎样表达？',{falsePositive:.1},{falsePositive:0},'后验0.5→1，有限赔率1→null（无穷）；真报份额不变。',(a,b)=>near(a.result.defectiveAlarm,b.result.defectiveAlarm)&&near(a.result.posterior,.5)&&near(a.result.odds,1)&&b.result.goodAlarm===0&&b.result.posterior===1&&b.result.odds===null)
  ]);

  models['probability-moments']=model('每个分支先贡献概率乘结果，再减期望、平方并加权；用二阶原点矩减均值平方独立核对方差。',(t,l,v)=>{
    if(l===1)return v.values.map((x,j)=>C('outcome-'+j,`分支${j}的概率质量`,v.mass[j],`P(分支${j}) = ${f(v.mass[j])}，X = ${f(x)}`,{index:j,outcome:x,mass:v.mass[j]},'三个给定互斥分支，概率和为1；结果数值相同时可以合并对应概率。'));
    if(l===2)return [...v.values.map((x,j)=>C('mean-part-'+j,`分支${j}的期望贡献`,x*v.mass[j],`${f(x)} × ${f(v.mass[j])} = ${f(x*v.mass[j])}`,{outcome:x,mass:v.mass[j]},'期望与原结果同单位。')),C('expectation','期望',v.expectation,`${plus(v.values.map((x,j)=>x*v.mass[j]))} = ${f(v.expectation)}`,{values:v.values,mass:v.mass},'按给定分布计算的总体期望，不是样本均值。')];
    if(l===3)return [...v.deviations.map((x,j)=>C('deviation-'+j,`分支${j}的有符号偏差`,x,`${f(v.values[j])} − ${f(v.expectation)} = ${f(x)}`,{outcome:v.values[j],expectation:v.expectation})),C('deviation-mean','偏差的加权平均',sum(v.deviations.map((x,j)=>x*v.mass[j])),`${v.deviations.map((x,j)=>`${f(v.mass[j])} × (${f(x)})`).join(' + ')} = ${f(sum(v.deviations.map((x,j)=>x*v.mass[j])))}`,{deviations:v.deviations,mass:v.mass},'正负偏差抵消；直接平均偏差不能衡量散布。')];
    if(l===4)return v.contributions.map((x,j)=>C('variance-part-'+j,`分支${j}的方差贡献`,x,`${f(v.mass[j])} × (${f(v.deviations[j])})² = ${f(x)}`,{mass:v.mass[j],deviation:v.deviations[j]},'先平方再按概率加权；贡献非负，单位为原单位的平方。'));
    return [...v.values.map((x,j)=>C('second-moment-part-'+j,`分支${j}的二阶矩贡献`,v.mass[j]*x*x,`${f(v.mass[j])} × ${f(x)}² = ${f(v.mass[j]*x*x)}`,{mass:v.mass[j],outcome:x},'最终核对：这是原点二阶矩，不先减去均值。')),C('second-moment','二阶原点矩',v.secondMoment,`${plus(v.values.map((x,j)=>v.mass[j]*x*x))} = ${f(v.secondMoment)}`,{values:v.values,mass:v.mass},'最终核对：E[X²]。'),C('variance','方差的贡献和',v.variance,`${plus(v.contributions)} = ${f(v.variance)}`,{contributions:v.contributions},'最终核对：总体分布方差，不使用样本无偏估计的n−1分母。'),C('variance-check','二阶矩公式核对',v.check,`${f(v.secondMoment)} − ${f(v.expectation)}² = ${f(v.check)}`,{secondMoment:v.secondMoment,expectation:v.expectation},'最终核对：Var(X)=E[X²]−E[X]²，与偏差平方加权和相同。')];
  },[E('higher-outcome','只提高第三个分支的结果值','概率不变时，均值与方差分别增加多少？',{high:4},{high:8},'概率仍为[0.25,0.5,0.25]；期望2→3，方差2→9，二阶矩6→18。',(a,b)=>a.result.mass.every((x,j)=>x===b.result.mass[j])&&near(a.result.expectation,2)&&near(b.result.expectation,3)&&near(a.result.variance,2)&&near(b.result.variance,9)&&near(a.result.secondMoment,6)&&near(b.result.secondMoment,18))]);

  models['probability-mle']=model('观测序列固定后，候选q逐个代入成功与失败概率乘积；连续最优估计与四点网格最佳分别报告。',(t,l,v)=>{
    if(l===1)return [C('success-count','观测成功数',v.k,`n = ${v.n}，成功 k = ${v.k}，失败 n − k = ${v.n-v.k}`,{n:v.n,k:v.k},'给定独立同分布Bernoulli序列，不生成新样本。')];
    if(l===2)return [C('estimate','连续参数的MLE',v.estimate,`${v.k} / ${v.n} = ${f(v.estimate)}`,{k:v.k,n:v.n},v.k===0||v.k===v.n?'参数范围[0,1]包含边界；全失败估计0，全成功估计1。':'独立同分布Bernoulli序列的MLE为成功频率；点估计不是已知真实参数。')];
    if(l===3)return v.candidates.map((q,j)=>C('candidate-'+j,`候选q[${j}]`,q,`q[${j}] = ${f(q)}，仍用同一 k = ${v.k} 与 n = ${v.n}`,{q,k:v.k,n:v.n},'仅四个预定候选，用于比较似然；网格不覆盖所有连续参数。'));
    if(l===4)return v.likelihood.map((x,j)=>{const q=v.candidates[j];return C('likelihood-'+j,`L(q=${f(q)})`,x,`${f(q)}^${v.k} × ${f(1-q)}^${v.n-v.k} = ${f(x)}`,{q,n:v.n,k:v.k,successProduct:q**v.k,failureProduct:(1-q)**(v.n-v.k)},'指定序列的似然；未乘与q无关的组合数，不要求对候选q归一化。小数显示0.0000可能只是舍入。');});
    return [C('grid-best','四个候选中的最佳q',v.best,`argmax {${v.candidates.map((q,j)=>`${f(q)}: ${f(v.likelihood[j])}`).join('；')}} → ${f(v.best)}`,{candidates:v.candidates,likelihood:v.likelihood},'最终核对：对完整精度的似然取最大值，舍入后的相似显示不影响选择。'),C('estimate-check','连续MLE与网格点的差',v.estimate-v.best,`${f(v.estimate)} − ${f(v.best)} = ${f(v.estimate-v.best)}`,{estimate:v.estimate,best:v.best},'最终核对：有限网格最佳可能不同于连续MLE；两者都不量化估计不确定性。')];
  },[E('all-success','只把十次观测改为全成功','连续MLE为1时，四点网格会选到1吗？',{successes:7},{successes:10},'连续MLE0.7→1；网格不包含1，最佳0.7→0.9，其似然为0.9¹⁰。',(a,b)=>a.result.n===10&&b.result.n===10&&near(a.result.estimate,.7)&&near(b.result.estimate,1)&&near(a.result.best,.7)&&near(b.result.best,.9)&&near(b.result.likelihood[3],.9**10))]);

  models['probability-interval']=model('先明确正态独立样本且总体σ已知，再由σ/√n计算均值标准误，双侧各留2.5%尾概率得到95%区间。',(t,l,v)=>{
    const p=t.params,z=1.959963984540054,note='独立同分布正态样本；总体标准差σ=2已知，使用双侧95%正态z区间。';
    if(l===1)return [C('known-sigma','已知总体标准差',v.sigma,`σ = ${f(v.sigma)}（已知），n = ${v.n}，观测均值 = ${f(v.mean)}`,{sigma:v.sigma,n:v.n,mean:v.mean},note+' 未知σ时不能直接使用本公式。')];
    if(l===2)return [C('standard-error','样本均值标准误',v.standardError,`${f(v.sigma)} / √${p.n} = ${f(v.standardError)}`,{sigma:v.sigma,n:p.n},note+' σ不因n改变；均值标准误按1/√n缩小。')];
    if(l===3)return [C('tail-probability','每侧尾概率',.025,`(1 − 0.9500) / 2 = 0.0250`,{confidence:.95,sides:2},note),C('z-quantile','标准正态上分位数',z,`Φ⁻¹(1 − 0.0250) = Φ⁻¹(0.9750) = ${f(z)}`,{upperCDF:.975,z},note),C('margin','区间半宽',v.margin,`${f(z)} × ${f(v.standardError)} = ${f(v.margin)}`,{z,standardError:v.standardError},note)];
    if(l===4)return [C('lower','区间下端',v.interval[0],`${f(v.mean)} − ${f(v.margin)} = ${f(v.interval[0])}`,{mean:v.mean,margin:v.margin},note),C('upper','区间上端',v.interval[1],`${f(v.mean)} + ${f(v.margin)} = ${f(v.interval[1])}`,{mean:v.mean,margin:v.margin},note+' 95%指重复抽样区间程序的覆盖率，不是固定区间的后验概率。')];
    return [C('width','区间全宽',v.width,`${f(v.interval[1])} − (${f(v.interval[0])}) = 2 × ${f(v.margin)} = ${f(v.width)}`,{lower:v.interval[0],upper:v.interval[1],margin:v.margin},'最终核对：'+note+' 样本量扩大4倍则宽度减半；控件修改不是新实测样本。')];
  },[
    E('four-times-n','只把样本量扩大四倍','σ与观测均值不变时，标准误和区间宽度怎样变化？',{n:16},{n:64},'σ仍为2；标准误0.5→0.25，半宽与全宽均减半，中心不变。',(a,b)=>a.result.sigma===2&&b.result.sigma===2&&near(a.result.standardError,.5)&&near(b.result.standardError,.25)&&near(b.result.margin,a.result.margin/2)&&near(b.result.width,a.result.width/2)&&near(sum(a.result.interval),sum(b.result.interval))),
    E('shift-mean','只把观测样本均值增加1','区间移动是否改变不确定性宽度？',{mean:0},{mean:1},'两端均增加1；σ、标准误、半宽、全宽均不变。',(a,b)=>near(b.result.interval[0]-a.result.interval[0],1)&&near(b.result.interval[1]-a.result.interval[1],1)&&a.result.sigma===b.result.sigma&&a.result.standardError===b.result.standardError&&a.result.margin===b.result.margin&&a.result.width===b.result.width)
  ]);

  models['probability-test']=model('在独立公平抛币的零假设下枚举每个次数概率，以距5的绝对偏离筛选双尾，合计后才与预设α比较。',(t,l,v)=>{
    const n=v.n,p=t.params,note='H₀：10次独立公平抛币，q=0.5；双侧极端性规则为|j−5|≥|观察次数−5|，包含等号。';
    if(l===1)return [C('null-model','零假设下每次正面概率',.5,`n = ${v.n}；H₀: q = 0.5000；观测正面 ${v.observed} 次；预设 α = ${f(v.alpha)}`,{n:v.n,observed:v.observed,alpha:v.alpha,q:.5},note+' 显著性水平应在观察结果前规定。')];
    if(l===2)return v.masses.map((x,j)=>C('null-mass-'+j,`H₀下P(X=${j})`,x,`C(${n},${j}) / 2^${n} = ${Math.round(x*2**n)} / ${2**n} = ${f(x)}`,{n,j,combinations:Math.round(x*2**n),denominator:2**n},note+' 精确二项枚举，不使用正态近似。'));
    if(l===3)return v.extreme.map((x,j)=>C('extreme-'+j,`${j}次正面是否计入`,x,`|${j} − 5| = ${Math.abs(j-5)}；|${v.observed} − 5| = ${Math.abs(v.observed-5)}；${Math.abs(j-5)} ≥ ${Math.abs(v.observed-5)} → ${x?'计入':'不计入'}`,{j,observed:v.observed,distance:Math.abs(j-5),observedDistance:Math.abs(v.observed-5),mass:v.masses[j]},note));
    if(l===4){const selected=v.masses.flatMap((x,j)=>v.extreme[j]?[{j,mass:x}]:[]),left=selected.filter(x=>x.j<5),center=selected.filter(x=>x.j===5),right=selected.filter(x=>x.j>5),part=(id,label,items)=>C(id,label,sum(items.map(x=>x.mass)),items.length?`${items.map(x=>`${Math.round(x.mass*1024)}/1024 (j=${x.j})`).join(' + ')} = ${f(sum(items.map(x=>x.mass)))}`:'无被选中次数 → 0.0000',{selectedCounts:items.map(x=>x.j),masses:items.map(x=>x.mass)},note+' 左边j<5、中心j=5、右边j>5互不重叠，中心观测也不会重复计算。');return [part('left-tail','入选左侧概率',left),part('center','入选中心概率',center),part('right-tail','入选右侧概率',right),C('pvalue','精确双侧p值',v.pvalue,`${selected.map(x=>`${Math.round(x.mass*1024)}/1024`).join(' + ')} = ${Math.round(v.pvalue*1024)}/1024 = ${f(v.pvalue)}`,{selectedCounts:selected.map(x=>x.j),masses:selected.map(x=>x.mass)},'p值是给定H₀后至少同样极端的概率，不是H₀为真的概率；本对称分布使用上述预设双侧规则。')];}
    return [C('reject','与预设阈值比较',v.reject,`${f(v.pvalue)} ≤ ${f(v.alpha)} → ${v.reject?'拒绝H₀':'未拒绝H₀'}`,{pvalue:v.pvalue,alpha:v.alpha},'最终核对：用完整精度比较且包含等号。不拒绝不等于证明公平；拒绝不估计真实偏差大小。')];
  },[
    E('less-extreme','只把正面观测从9改8','同一α下，离公平期望近一步会改变尾概率与判断吗？',{k:9},{k:8},'精确双尾22/1024→112/1024；α=0.05下从拒绝变为未拒绝。',(a,b)=>near(a.result.pvalue,22/1024)&&near(b.result.pvalue,112/1024)&&a.result.reject===true&&b.result.reject===false&&a.params.alpha===b.params.alpha),
    E('threshold-only','只放宽预设显著性水平','观测和尾概率不变时，判断能否改变？',{alpha:.01},{alpha:.05},'观测仍为9；p值仍为22/1024，但从未拒绝变为拒绝，阈值不改变观测概率。',(a,b)=>a.result.observed===9&&b.result.observed===9&&near(a.result.pvalue,22/1024)&&a.result.pvalue===b.result.pvalue&&a.result.reject===false&&b.result.reject===true)
  ]);

  return {courseId:'probability',models};
});
