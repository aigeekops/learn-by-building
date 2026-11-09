/* CS224R: arithmetic from the current computation frame, never future result/scene. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const f=x=>typeof x==='number'?x.toFixed(4):String(x);
  const sum=a=>a.reduce((s,x)=>s+x,0);
  const close=(a,b)=>typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-10;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const end=t=>t.steps[t.steps.length-1].variables;
  const cell=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note});
  const view=(step,cells,summary)=>({title:step.title,summary,cells});
  const models={};

  models['cs224r-bc']={
    intuition:'两条固定专家示范作为监督样本，逐样本算误差、平均半平方损失和梯度，再做一次参数更新；这不是在线RL采样。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.observations.forEach((o,i)=>c.push(cell('demo-'+i,'示范 '+i+'：观测 → 专家动作',v.actions[i],`固定示范 ${i}：o=${f(o)} → a*=${f(v.actions[i])}`,{observation:o,expertAction:v.actions[i]},'这两对是输入数据，尚未预测，也不代表环境回报。')));
      }else if(index===1){
        v.observations.forEach((o,i)=>{
          c.push(cell('prediction-'+i,'预测动作 â'+i,v.predicted[i],`â${i} = w×o${i} = ${f(p.weight)}×${f(o)} = ${f(v.predicted[i])}`,{weight:p.weight,observation:o}));
          c.push(cell('error-'+i,'有符号误差 e'+i,v.errors[i],`e${i} = â${i}−a*${i} = ${f(v.predicted[i])}−${f(v.actions[i])} = ${f(v.errors[i])}`,{prediction:v.predicted[i],expertAction:v.actions[i]},'误差是预测减专家动作；负数表示预测偏小。'));
        });
      }else if(index===2){
        v.errors.forEach((e,i)=>{
          c.push(cell('loss-term-'+i,'样本 '+i+' 半平方损失',e*e/2,`ℓ${i} = e${i}²/2 = (${f(e)})²/2 = ${f(e*e/2)}`,{error:e}));
          c.push(cell('gradient-term-'+i,'样本 '+i+' 梯度项',e*v.observations[i],`∂ℓ${i}/∂w = e${i}×o${i} = ${f(e)}×${f(v.observations[i])} = ${f(e*v.observations[i])}`,{error:e,observation:v.observations[i]}));
        });
        c.push(cell('loss','平均半平方损失',v.loss,`L = (${v.errors.map(e=>f(e*e/2)).join(' + ')})/${v.errors.length} = ${f(v.loss)}`,{samples:v.errors.length},'是两条示范的经验平均，不是未知状态分布上的期望。'));
        c.push(cell('gradient','平均梯度',v.gradient,`g = (${v.errors.map((e,i)=>f(e*v.observations[i])).join(' + ')})/${v.errors.length} = ${f(v.gradient)}`,{samples:v.errors.length}));
      }else{
        c.push(cell('weight-update','一次梯度下降后的 w',v.updatedWeight,`w′ = w−ηg = ${f(p.weight)}−${f(p.rate)}×(${f(v.gradient)}) = ${f(v.updatedWeight)}`,{oldWeight:p.weight,rate:p.rate,gradient:v.gradient}));
        c.push(cell('held-out','未见观测 o=3 的预测',v.heldOutAction,`â(3) = w′×3 = ${f(v.updatedWeight)}×3.0000 = ${f(v.heldOutAction)}`,{updatedWeight:v.updatedWeight,heldOutObservation:3},'o=3 无专家标签；该预测不能当成已验证的正确动作或闭环稳定性。'));
      }
      return view(step,c,'固定两条示范，只进行一次监督梯度更新。当前格只使用本帧已计算的数据；未见观测只有预测，没有验收真值。');
    },
    experiments:[{id:'learning-rate',label:'只把学习率从 0.1 改为 0.2',before:{weight:1,rate:.1},after:{weight:1,rate:.2},prediction:'两条预测、误差和梯度保持不变；更新幅度加倍，w′ 与 o=3 的动作预测增大。',expectation:'L=1.25、g=−2.5 保持；w′ 从1.25变1.5，未见观测预测从3.75变4.5。',verify(a,b){const x=end(a),y=end(b);return close(a.params.rate,.1)&&close(b.params.rate,.2)&&close(a.params.weight,1)&&close(b.params.weight,1)&&same(x.observations,y.observations)&&same(x.actions,y.actions)&&same(x.predicted,y.predicted)&&close(x.loss,1.25)&&close(y.loss,1.25)&&close(x.gradient,-2.5)&&close(y.gradient,-2.5)&&close(x.updatedWeight,1.25)&&close(y.updatedWeight,1.5)&&close(x.heldOutAction,3.75)&&close(y.heldOutAction,4.5);}}]
  };

  models['cs224r-dagger']={
    intuition:'执行动作由固定采样点和专家混合概率比较决定；训练标签仍来自专家，再将新样本并入旧数据拟合一个线性参数。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.dataset.forEach(([o,a],i)=>c.push(cell('old-sample-'+i,'保留示范 '+i+' 的专家动作',a,`已有固定样本：o=${f(o)} → a*=${f(a)}`,{observation:o,expertAction:a})));
        c.push(cell('visited-observation','本例固定访问观测',v.visitedObservation,`固定访问观测 o=${f(v.visitedObservation)}；初始线性策略 w=1.5000`,{observation:v.visitedObservation},'访问状态被固定，控件不会重新运行环境轨迹。'));
        c.push(cell('learner-action','学习者建议动作',v.learnerAction,`a_learner = 1.5000×${f(v.visitedObservation)} = ${f(v.learnerAction)}`,{initialWeight:1.5,observation:v.visitedObservation}));
        c.push(cell('expert-action','该观测的专家动作',v.expertAction,`专家在 o=${f(v.visitedObservation)} 给定标签 a*=${f(v.expertAction)}`,{observation:v.visitedObservation},'给定专家标签，不是策略自己的伪标签。'));
      }else if(index===1){
        c.push(cell('expert-selected','是否执行专家动作',p.draw<p.expert,`u<β：${f(p.draw)} < ${f(p.expert)} → ${p.draw<p.expert}`,{fixedDraw:p.draw,expertMix:p.expert},'固定采样点的一次分支；等于阈值时执行学习者动作，不是概率期望。'));
        c.push(cell('executed','本次实际选中的动作',v.executed,`a_exec = (${f(p.draw)} < ${f(p.expert)}) ? ${f(v.expertAction)} : ${f(v.learnerAction)} = ${f(v.executed)}`,{expert:v.expertAction,learner:v.learnerAction}));
        c.push(cell('expert-label','用于训练的专家标签',v.label,`label = a_expert(o=${f(v.visitedObservation)}) = ${f(v.expertAction)} = ${f(v.label)}`,{visitedObservation:v.visitedObservation,executed:v.executed},'执行学习者动作也必须保留专家标签。'));
      }else if(index===2){
        v.aggregated.forEach(([o,a],i)=>{
          const source=i<v.dataset.length?'保留旧示范':'追加当前访问状态及专家标签';
          c.push(cell('aggregate-observation-'+i,'聚合样本 '+i+' 的观测',o,`${source}：o_${i}=${f(o)}`,{observation:o},'原数据与新标签共同用于后续拟合。'));
          c.push(cell('aggregate-label-'+i,'聚合样本 '+i+' 的专家动作',a,`${source}：a*_${i}=${f(a)}`,{observation:o,expertAction:a},'标签来源是专家，不能改成已执行动作。'));
        });
      }else{
        v.aggregated.forEach(([o,a],i)=>{
          c.push(cell('numerator-'+i,'样本 '+i+' 的 o×a*',o*a,`${f(o)}×${f(a)} = ${f(o*a)}`,{observation:o,expertAction:a}));
          c.push(cell('denominator-'+i,'样本 '+i+' 的 o²',o*o,`(${f(o)})² = ${f(o*o)}`,{observation:o}));
        });
        const numerator=sum(v.aggregated.map(([o,a])=>o*a)),denominator=sum(v.aggregated.map(([o])=>o*o));
        c.push(cell('fitted-weight','聚合数据闭式最小二乘 w',v.weight,`w = Σ(o×a*)/Σo² = ${f(numerator)}/${f(denominator)} = ${f(v.weight)}`,{numerator,denominator},'仅拟合无截距的标量策略；不是神经网络训练或真实机器人在线DAgger。'));
        c.push(cell('sample-count','聚合样本数',v.sampleCount,`N = 旧样本 ${v.dataset.length} + 新专家标签 1 = ${v.sampleCount}`,{oldSamples:v.dataset.length}));
        c.push(cell('executed','本次选中的执行动作',v.executed,`u=${f(p.draw)}，β=${f(p.expert)}；执行 ${f(v.executed)}，训练标签仍为 ${f(v.label)}`,{expertLabel:v.label},'该对照显示混合概率可以改变执行动作而不改变本例固定数据上的拟合。'));
      }
      return view(step,c,'固定访问观测和专家响应的一次数据聚合；比较实际分支，不把专家混合概率当平均动作，也不声称已采集在线数据。');
    },
    experiments:[{id:'mix-threshold',label:'只提高专家混合概率跨过采样点',before:{expert:.5,draw:.6},after:{expert:.7,draw:.6},prediction:'执行动作由学习者3变为专家4；被查询的标签4、聚合样本和拟合w保持不变。',expectation:'0.6<0.5为假、0.6<0.7为真；执行3→4，label=4、N=2、w=2均保持。',verify(a,b){const x=end(a),y=end(b);return close(a.params.expert,.5)&&close(b.params.expert,.7)&&close(a.params.draw,.6)&&close(b.params.draw,.6)&&x.executed===3&&y.executed===4&&x.label===4&&y.label===4&&same(x.aggregated,[[1,2],[2,4]])&&same(x.aggregated,y.aggregated)&&x.sampleCount===2&&y.sampleCount===2&&close(x.weight,2)&&close(y.weight,2);}}]
  };

  models['cs224r-actor-critic']={
    intuition:'一条已终止的两步样本轨迹先形成TD残差，再用γλ折衰得到GAE，最后将旧价值加回成为冻结的价值回归目标。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.rewards.forEach((r,i)=>c.push(cell('reward-'+i,'轨迹样本奖励 r'+i,r,`固定已观测奖励 r_${i}=${f(r)}`,{time:i},'这是一条样本轨迹，不是对环境转移概率求期望。')));
        v.values.forEach((q,i)=>c.push(cell('old-value-'+i,i===v.values.length-1?'终止边界 V2':'冻结旧价值 V'+i,q,`V_old(s_${i})=${f(q)}${i===v.values.length-1?'；真正终止，bootstrap=0.0000':''}`,{time:i},'价值估计在本次目标计算中固定。')));
      }else if(index===1){
        v.deltas.forEach((d,i)=>c.push(cell('delta-'+i,'TD残差 δ'+i,d,`δ${i} = r${i}+γV${i+1}−V${i} = ${f(v.rewards[i])}+${f(p.gamma)}×${f(v.values[i+1])}−${f(v.values[i])} = ${f(d)}`,{reward:v.rewards[i],gamma:p.gamma,nextValue:v.values[i+1],oldValue:v.values[i]},i===1?'s2真正终止，末端价值为0；时间截断不可自动套用这个边界。':'这是该样本转移的残差，不是精确Bellman期望。')));
      }else if(index===2){
        c.push(cell('gae-future','未来残差对 A0 的贡献',p.gamma*p.lambda*v.deltas[1],`γλδ1 = ${f(p.gamma)}×${f(p.lambda)}×${f(v.deltas[1])} = ${f(p.gamma*p.lambda*v.deltas[1])}`,{gamma:p.gamma,lambda:p.lambda,delta1:v.deltas[1]}));
        c.push(cell('advantage-0','两步 GAE A0',v.advantages[0],`A0 = δ0+γλδ1 = ${f(v.deltas[0])}+${f(p.gamma)}×${f(p.lambda)}×${f(v.deltas[1])} = ${f(v.advantages[0])}`,{delta0:v.deltas[0],delta1:v.deltas[1]},'λ改变残差混合口径；没有在此更新Actor或Critic参数。'));
        c.push(cell('advantage-1','末步 GAE A1',v.advantages[1],`A1 = δ1 = ${f(v.deltas[1])}`,{delta1:v.deltas[1]},'终止后无更多残差。'));
      }else{
        v.targets.forEach((target,i)=>c.push(cell('target-'+i,'冻结价值回归目标 y'+i,target,`y${i} = A${i}+V_old(s${i}) = ${f(v.advantages[i])}+${f(v.values[i])} = ${f(target)}`,{advantage:v.advantages[i],oldValue:v.values[i]},'当前目标是已计算的监督信号，不等于新的已训练价值。')));
        v.advantages.forEach((a,i)=>c.push(cell('advantage-'+i,'本样本优势 A'+i,a,i===0?`A0 = ${f(v.deltas[0])}+${f(p.gamma)}×${f(p.lambda)}×${f(v.deltas[1])} = ${f(a)}`:`A1 = δ1 = ${f(a)}`,{gamma:p.gamma,lambda:p.lambda},'GAE依赖旧价值和已采轨迹；不能作为真实优势已知的证明。')));
      }
      return view(step,c,'奖励和值来自固定两步终止样本；当前帧按真实计算顺序展示残差、GAE或回归目标，没有虚构策略训练。');
    },
    experiments:[{id:'lambda-mix',label:'只把 GAE λ 从0改为1',before:{gamma:.9,lambda:0},after:{gamma:.9,lambda:1},prediction:'TD残差与末步优势不变；A0加入全部γδ1，首步回归目标随之改变。',expectation:'δ=[0.16,0.6]保持；A0从0.16变0.7、y0从0.36变0.9；A1=0.6、y1=1保持。',verify(a,b){const x=end(a),y=end(b);return close(a.params.lambda,0)&&close(b.params.lambda,1)&&close(a.params.gamma,.9)&&close(b.params.gamma,.9)&&same(x.rewards,y.rewards)&&same(x.values,y.values)&&x.deltas.every((d,i)=>close(d,[.16,.6][i])&&close(y.deltas[i],d))&&close(x.advantages[0],.16)&&close(y.advantages[0],.7)&&close(x.advantages[1],.6)&&close(y.advantages[1],.6)&&close(x.targets[0],.36)&&close(y.targets[0],.9)&&close(x.targets[1],1)&&close(y.targets[1],1);}}]
  };

  models['cs224r-ppo']={
    intuition:'对同一个已采动作的概率比和优势逐项计算PPO代理目标；两个乘积取min，即使优势为负也不更换规则。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        c.push(cell('ratio','单个已采动作的概率比 r',v.ratio,`r=π_new(a|s)/π_old(a|s)=${f(v.ratio)}（控件直接给定比值）`,{ratio:v.ratio},'未给出新旧概率各自的数值；不能反推它们。旧动作概率必须为正。'));
        c.push(cell('advantage','该样本冻结优势 A',v.advantage,`A_hat(s,a)=${f(v.advantage)}（本次优化固定的输入）`,{advantage:v.advantage},'一个样本优势，不是在本模型重新评估的新策略回报。'));
      }else if(index===1){
        c.push(cell('unclipped','未裁剪代理项 rA',v.unclipped,`rA = ${f(v.ratio)}×(${f(v.advantage)}) = ${f(v.unclipped)}`,{ratio:v.ratio,advantage:v.advantage},'按最大化目标写；训练损失在最终步骤取负。'));
      }else if(index===2){
        c.push(cell('clip-lower','概率比裁剪下界',1-p.clip,`1−ε = 1.0000−${f(p.clip)} = ${f(1-p.clip)}`,{epsilon:p.clip}));
        c.push(cell('clip-upper','概率比裁剪上界',1+p.clip,`1+ε = 1.0000+${f(p.clip)} = ${f(1+p.clip)}`,{epsilon:p.clip}));
        c.push(cell('clipped-ratio','裁剪后的概率比',v.clippedRatio,`clip(r) = min(max(${f(v.ratio)},${f(1-p.clip)}),${f(1+p.clip)}) = ${f(v.clippedRatio)}`,{ratio:v.ratio,epsilon:p.clip},'裁剪代理项用的比值；没有在这里修改策略概率。'));
        c.push(cell('clipped-term','裁剪代理项 clip(r)A',v.clipped,`${f(v.clippedRatio)}×(${f(v.advantage)}) = ${f(v.clipped)}`,{clippedRatio:v.clippedRatio,advantage:v.advantage}));
      }else{
        c.push(cell('objective','单样本保守最大化目标',v.objective,`L_clip = min(rA,clip(r)A) = min(${f(v.unclipped)},${f(v.clipped)}) = ${f(v.objective)}`,{unclipped:v.unclipped,clipped:v.clipped},'负优势仍取min；不是把所有r都强制限制在区间，也不是KL硬约束。'));
        c.push(cell('loss','用于最小化的损失',v.loss,`loss = −L_clip = −(${f(v.objective)}) = ${f(v.loss)}`,{objective:v.objective},'这是一个样本的代理目标，没有实现批次平均、梯度更新或真实回报评估。'));
        c.push(cell('unclipped','未裁剪代理项',v.unclipped,`rA = ${f(v.ratio)}×(${f(v.advantage)}) = ${f(v.unclipped)}`,{ratio:v.ratio,advantage:v.advantage}));
        c.push(cell('clipped-term','裁剪代理项',v.clipped,`clip(r)A = ${f(v.clippedRatio)}×(${f(v.advantage)}) = ${f(v.clipped)}`,{clippedRatio:v.clippedRatio,advantage:v.advantage}));
      }
      return view(step,c,'单个已采动作的代理损失计算；r与A直接作为输入，不虚构动作概率、策略梯度或新策略回报。');
    },
    experiments:[{id:'advantage-sign',label:'只把优势从 +1 改为 −1',before:{ratio:1.3,advantage:1,clip:.2},after:{ratio:1.3,advantage:-1,clip:.2},prediction:'裁剪比值保持1.2；正优势选裁剪项，负优势改选更小的未裁剪项。',expectation:'目标由min(1.3,1.2)=1.2变为min(−1.3,−1.2)=−1.3，损失−1.2→1.3。',verify(a,b){const x=end(a),y=end(b);return close(a.params.ratio,1.3)&&close(b.params.ratio,1.3)&&close(a.params.clip,.2)&&close(b.params.clip,.2)&&close(x.advantage,1)&&close(y.advantage,-1)&&close(x.clippedRatio,1.2)&&close(y.clippedRatio,1.2)&&close(x.unclipped,1.3)&&close(y.unclipped,-1.3)&&close(x.clipped,1.2)&&close(y.clipped,-1.2)&&close(x.objective,1.2)&&close(y.objective,-1.3)&&close(x.loss,-1.2)&&close(y.loss,1.3);}}]
  };

  models['cs224r-entropy']={
    intuition:'固定两个动作价值，在完整离散动作分布上算精确期望价值和自然对数熵，再叠加熵奖励；没有实际采样或执行SAC训练。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.probabilities.forEach((prob,i)=>{
          c.push(cell('probability-'+i,'动作 '+i+' 概率',prob,i===0?`π0=1−p=1.0000−${f(p.probability)}=${f(prob)}`:`π1=p=${f(prob)}`,{probabilityControl:p.probability},'两动作概率完整列举，不是抽样频数。'));
          c.push(cell('q-'+i,'固定动作价值 Q'+i,v.q[i],`给定 Q(a${i})=${f(v.q[i])}`,{action:i},'Q在本例中固定，没有Bellman更新或从环境验证。'));
        });
      }else if(index===1){
        v.probabilities.forEach((prob,i)=>c.push(cell('q-contribution-'+i,'动作 '+i+' 价值期望贡献',prob*v.q[i],`π${i}Q${i}=${f(prob)}×${f(v.q[i])}=${f(prob*v.q[i])}`,{probability:prob,q:v.q[i]})));
        c.push(cell('expected-q','完整动作分布的期望价值',v.expectedQ,`Eπ[Q] = ${v.probabilities.map((prob,i)=>f(prob*v.q[i])).join(' + ')} = ${f(v.expectedQ)}`,{actions:v.q.length},'精确枚举两个动作求和，没有取max，也不是单个采样动作的Q。'));
      }else if(index===2){
        v.probabilities.forEach((prob,i)=>c.push(cell('entropy-term-'+i,'动作 '+i+' 熵贡献',-prob*Math.log(prob),`−π${i} ln π${i} = −${f(prob)}×ln(${f(prob)}) = ${f(-prob*Math.log(prob))}`,{probability:prob},'自然对数，单位为nat；当前控件概率范围0.1至0.9，避免ln(0)。')));
        c.push(cell('entropy','离散策略熵 H(π)',v.entropy,`H = ${v.probabilities.map(prob=>f(-prob*Math.log(prob))).join(' + ')} = ${f(v.entropy)}`,{actions:v.probabilities.length},'熵衡量策略分散，不代表任务成功率。'));
      }else{
        c.push(cell('expected-q','固定Q下的精确期望',v.expectedQ,`Eπ[Q] = ${v.probabilities.map((prob,i)=>`${f(prob)}×${f(v.q[i])}`).join(' + ')} = ${f(v.expectedQ)}`,{actions:v.q.length}));
        c.push(cell('entropy','精确离散熵',v.entropy,`H = −Σ π ln π = ${v.probabilities.map(prob=>f(-prob*Math.log(prob))).join(' + ')} = ${f(v.entropy)}`,{naturalLog:true}));
        c.push(cell('entropy-bonus','熵奖励 αH',p.temperature*v.entropy,`αH = ${f(p.temperature)}×${f(v.entropy)} = ${f(p.temperature*v.entropy)}`,{temperature:p.temperature,entropy:v.entropy}));
        c.push(cell('objective','最大化目标 E[Q]+αH',v.objective,`J = ${f(v.expectedQ)}+${f(p.temperature)}×${f(v.entropy)} = ${f(v.objective)}`,{expectedQ:v.expectedQ,alpha:p.temperature,entropy:v.entropy},'离散熵正则目标切片；没有连续SAC双Q、tanh修正、温度学习或目标网络。'));
      }
      return view(step,c,'固定动作价值的完整离散分布期望；概率和温度仅改变这次算式，没有执行策略优化或环境探索。');
    },
    experiments:[{id:'temperature',label:'只把熵系数从0改为0.5',before:{probability:.5,temperature:0},after:{probability:.5,temperature:.5},prediction:'固定策略的概率、期望Q和熵保持不变，目标只增加0.5ln2。',expectation:'E[Q]=1.5、H=ln2保持；J从1.5变为1.5+0.5ln2≈1.8466；策略本身不会自动变得更分散。',verify(a,b){const x=end(a),y=end(b);return close(a.params.temperature,0)&&close(b.params.temperature,.5)&&close(a.params.probability,.5)&&close(b.params.probability,.5)&&same(x.probabilities,[.5,.5])&&same(x.probabilities,y.probabilities)&&same(x.q,y.q)&&close(x.expectedQ,1.5)&&close(y.expectedQ,1.5)&&close(x.entropy,Math.log(2))&&close(y.entropy,Math.log(2))&&close(x.objective,1.5)&&close(y.objective,1.5+.5*Math.log(2));}}]
  };

  models['cs224r-model']={
    intuition:'在固定动作和已知常数偏差下对比真实方程与模型方程的多步展开，逐时刻看线性误差；并未从数据估计模型。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        c.push(cell('initial','共同初始状态',v.initial,`x0 = x̂0 = ${f(v.initial)}`,{initial:v.initial},'两个展开都从相同给定状态开始。'));
        c.push(cell('true-increment','真实方程每步增量',v.action,`真实 x′=x+u；Δx=u=${f(v.action)}`,{action:v.action}));
        c.push(cell('model-increment','模型方程每步增量',v.action+p.bias,`模型 x̂′=x̂+u+b；Δx̂=${f(v.action)}+(${f(p.bias)})=${f(v.action+p.bias)}`,{action:v.action,bias:p.bias},'模型偏差b是控件给定值，没有真实模型拟合或控制器。'));
      }else if(index===1){
        v.truePath.forEach((x,k)=>{
          c.push(cell('true-path-'+k,'真实方程展开 x'+k,x,`x${k} = ${k}×u = ${k}×${f(v.action)} = ${f(x)}`,{time:k,action:v.action},'由教学真值方程计算的对照，不是传感器观测。'));
          c.push(cell('model-path-'+k,'模型预测 x̂'+k,v.modelPath[k],`x̂${k} = ${k}×(u+b) = ${k}×(${f(v.action)}+${f(p.bias)}) = ${f(v.modelPath[k])}`,{time:k,action:v.action,bias:p.bias},'本帧一次性计算整个预测数组；数组位置是预测时刻，不是新增播放帧。'));
        });
      }else if(index===2){
        v.errors.forEach((e,k)=>c.push(cell('error-'+k,'时刻 '+k+' 模型误差',e,`e${k} = x̂${k}−x${k} = ${f(v.modelPath[k])}−${f(v.truePath[k])} = ${f(e)}`,{predicted:v.modelPath[k],reference:v.truePath[k],time:k},`该确定性常偏差例子满足 e${k}=${k}×b；没有加入随机噪声。`)));
      }else{
        c.push(cell('one-step-error','一步有符号误差',v.oneStepError,`e1 = b = ${f(p.bias)} = ${f(v.oneStepError)}`,{bias:p.bias},'有符号误差，既非绝对误差，也非MSE。'));
        c.push(cell('terminal-error','预测末端有符号误差',v.terminalError,`eH = x̂H−xH = ${f(v.modelPath.at(-1))}−${f(v.truePath.at(-1))} = ${f(v.terminalError)} ≈ H×b = ${p.horizon}×${f(p.bias)}`,{horizon:p.horizon,bias:p.bias},'本例线性积累；非线性系统可有不同放大规律。'));
        c.push(cell('terminal-reference','末端真实方程对照',v.truePath.at(-1),`xH = ${p.horizon}×${f(v.action)} = ${f(v.truePath.at(-1))}`,{horizon:p.horizon,action:v.action}));
        c.push(cell('terminal-prediction','末端模型预测',v.modelPath.at(-1),`x̂H = ${p.horizon}×(${f(v.action)}+${f(p.bias)}) = ${f(v.modelPath.at(-1))}`,{horizon:p.horizon,action:v.action,bias:p.bias},'预测路径未在物理环境执行，不能代替真实闭环验收。'));
      }
      return view(step,c,'固定 u=0.5、x0=0 的两条方程展开；仅比较已算预测和教学真值，既不是模型训练，也不是实测机器人轨迹。');
    },
    experiments:[{id:'longer-rollout',label:'只把预测步数从1增加到5',before:{bias:.1,horizon:1},after:{bias:.1,horizon:5},prediction:'一步误差保持0.1，末端误差随预测长度从0.1增至0.5，公共路径前缀不变。',expectation:'b与动作固定；末端参考0.5→2.5、预测0.6→3、末端误差0.1→0.5，一步误差不变。',verify(a,b){const x=end(a),y=end(b);return a.params.horizon===1&&b.params.horizon===5&&close(a.params.bias,.1)&&close(b.params.bias,.1)&&close(x.oneStepError,.1)&&close(y.oneStepError,.1)&&close(x.terminalError,.1)&&close(y.terminalError,.5)&&close(x.truePath.at(-1),.5)&&close(y.truePath.at(-1),2.5)&&close(x.modelPath.at(-1),.6)&&close(y.modelPath.at(-1),3)&&same(x.truePath,y.truePath.slice(0,2))&&same(x.modelPath,y.modelPath.slice(0,2));}}]
  };

  models['cs224r-offline']={
    intuition:'将固定离线动作计数与Q估计分开；对没有支持的动作施加显式惩罚，再比较选择，惩罚不会创造未见动作的证据。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.counts.forEach((n,i)=>{
          c.push(cell('count-'+i,'动作 '+i+' 的固定数据计数',n,`离线记录 count(a${i})=${n}；支持检查 ${n}>0 → ${n>0}`,{action:i,count:n},'计数是固定输入；滑动Q或惩罚不会采集新数据。'));
          c.push(cell('q-'+i,'动作 '+i+' 的Q估计',v.q[i],i===0?`固定教学估计 Q0=${f(v.q[i])}`:`未覆盖估计 Q1=控件 unseenQ=${f(p.unseenQ)}`,{count:n},i===0?'覆盖并不等于估计无误。':'count=0，Q只是给定估计，真值无法由本数据识别。'));
        });
      }else if(index===1){
        c.push(cell('naive-choice','未惩罚时的贪心动作',v.naiveChoice,`Q0≥Q1 ? 0 : 1；${f(v.q[0])}≥${f(v.q[1])} → ${v.naiveChoice}`,{q0:v.q[0],q1:v.q[1]},'相等时选动作0；选择未覆盖动作不代表它真实更好。'));
        c.push(cell('naive-support','贪心动作是否有数据',v.counts[v.naiveChoice]>0,`count(a${v.naiveChoice})=${v.counts[v.naiveChoice]} > 0 → ${v.counts[v.naiveChoice]>0}`,{chosenAction:v.naiveChoice},'这是支持判断，不是安全性或离线评估结论。'));
      }else if(index===2){
        v.adjusted.forEach((q,i)=>{
          const penalty=v.counts[i]===0?p.penalty:0;
          c.push(cell('penalty-'+i,'动作 '+i+' 的支持惩罚',penalty,`penalty${i} = (count=${v.counts[i]}===0) ? ${f(p.penalty)} : 0.0000 = ${f(penalty)}`,{count:v.counts[i],penaltyControl:p.penalty}));
          c.push(cell('adjusted-'+i,'动作 '+i+' 的惩罚后估计',q,`Q̃${i} = ${f(v.q[i])}−${f(penalty)} = ${f(q)}`,{q:v.q[i],supportPenalty:penalty},'显式支持惩罚教学对照，未实现CQL或IQL原论文损失。'));
        });
      }else{
        c.push(cell('choice','惩罚后贪心动作',v.choice,`Q̃0≥Q̃1 ? 0 : 1；${f(v.adjusted[0])}≥${f(v.adjusted[1])} → ${v.choice}`,{adjusted0:v.adjusted[0],adjusted1:v.adjusted[1]},'相等时选0；更保守的选择也不构成上线安全证明。'));
        c.push(cell('unseen-covered','动作1是否已被数据覆盖',v.unseenActionCovered,`count(a1)=${v.counts[1]}；${v.counts[1]}>0 → ${v.unseenActionCovered}`,{unseenCount:v.counts[1]},'惩罚改变估计和选择，不增加数据支持或真实交互证据。'));
        v.adjusted.forEach((q,i)=>c.push(cell('adjusted-'+i,'动作 '+i+' 的惩罚后估计',q,`Q̃${i} = ${f(v.q[i])}−(${v.counts[i]}===0 ? ${f(p.penalty)} : 0.0000) = ${f(q)}`,{count:v.counts[i],q:v.q[i],penalty:p.penalty})));
      }
      return view(step,c,'离线固定数据下的两动作支持检查和显式惩罚示例；没有在线纠错、真实Q标签或CQL/IQL训练。');
    },
    experiments:[{id:'support-penalty',label:'只把未覆盖动作惩罚从5增加到7',before:{unseenQ:8,penalty:5},after:{unseenQ:8,penalty:7},prediction:'原始Q、计数和未惩罚选择保持；惩罚后动作1的估计由3降到1，选择从1改为0，覆盖仍为假。',expectation:'Q̃=[2,3]→[2,1]，choice=1→0；count=[20,0]、Q=[2,8]、naiveChoice=1与未覆盖状态保持。',verify(a,b){const x=end(a),y=end(b);return close(a.params.penalty,5)&&close(b.params.penalty,7)&&close(a.params.unseenQ,8)&&close(b.params.unseenQ,8)&&same(x.counts,[20,0])&&same(x.counts,y.counts)&&same(x.q,[2,8])&&same(x.q,y.q)&&x.naiveChoice===1&&y.naiveChoice===1&&same(x.adjusted,[2,3])&&same(y.adjusted,[2,1])&&x.choice===1&&y.choice===0&&x.unseenActionCovered===false&&y.unseenActionCovered===false;}}]
  };

  models['cs224r-goals']={
    intuition:'保留原目标上的结果，再以同一终点重算一个事后目标训练样本；训练数据增广不能改写原任务评测成功率。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,c=[];
      if(index===0){
        c.push(cell('achieved','轨迹已达到位置',v.achieved,`固定本次轨迹终点 achieved=${f(v.achieved)}`,{achieved:v.achieved},'控件直接给出终点；没有真实轨迹采集。'));
        c.push(cell('desired','原始任务目标',v.desired,`原始目标 desired=${f(v.desired)}`,{desired:v.desired},'后续训练重标记不修改这个目标。'));
      }else if(index===1){
        c.push(cell('original-success','原目标上的成功判断',v.originalSuccess,`achieved===desired：${f(v.achieved)}===${f(v.desired)} → ${v.originalSuccess}`,{achieved:v.achieved,desired:v.desired},'固定样本终点的等值判断，不是多轨迹成功率估计。'));
        c.push(cell('original-reward','原目标稀疏奖励',v.originalReward,`r = (${f(v.achieved)}===${f(v.desired)}) ? 0.0000 : −1.0000 = ${f(v.originalReward)}`,{achieved:v.achieved,desired:v.desired},'本例到达给0，否则−1；不是成功给1的奖励定义。'));
      }else if(index===2){
        c.push(cell('relabeled-goal','新增训练样本的事后目标',v.relabeledGoal,`g′ = achieved = ${f(v.achieved)} = ${f(v.relabeledGoal)}`,{achieved:v.achieved,originalDesired:v.desired},'新增训练目标，不替换原始评测目标。'));
        c.push(cell('relabeled-reward','重算的事后目标奖励',v.relabeledReward,`r′ = (${f(v.achieved)}===${f(v.relabeledGoal)}) ? 0.0000 : −1.0000 = ${f(v.relabeledReward)}`,{achieved:v.achieved,relabeledGoal:v.relabeledGoal},'只有目标条件奖励可重算时才可进行这种HER式重标记；未执行策略训练。'));
        c.push(cell('preserved-original','仍保留的原目标结果',v.originalSuccess,`原目标仍是 ${f(v.desired)}；${f(v.achieved)}===${f(v.desired)} → ${v.originalSuccess}`,{originalReward:v.originalReward},'事后训练样本成功不能改变原任务成败。'));
      }else{
        c.push(cell('evaluation-success','原目标评测结果',v.evaluationSuccess,`evaluationSuccess = originalSuccess = (${f(v.achieved)}===${f(v.desired)}) = ${v.evaluationSuccess}`,{achieved:v.achieved,desired:v.desired},'复用原目标判断，不能改成检查事后目标。'));
        c.push(cell('training-pairs','训练样本条目数',v.augmentedTrainingPairs,`训练条目 = 1条原目标样本 + 1条事后目标样本 = ${v.augmentedTrainingPairs}`,{originalGoal:v.desired,relabeledGoal:v.relabeledGoal},'这是条目计数；若原目标等于终点，两条目标可相同，不代表独立新轨迹。'));
        c.push(cell('original-reward','保留的原目标奖励',v.originalReward,`r_original = (${f(v.achieved)}===${f(v.desired)}) ? 0.0000 : −1.0000 = ${f(v.originalReward)}`,{originalGoal:v.desired}));
        c.push(cell('relabeled-reward','新增训练样本奖励',v.relabeledReward,`r_relabel = (${f(v.achieved)}===${f(v.relabeledGoal)}) ? 0.0000 : −1.0000 = ${f(v.relabeledReward)}`,{trainingGoal:v.relabeledGoal},'训练增广的奖励与原目标评测分别记录。'));
      }
      return view(step,c,'单条固定终点样本的目标条件奖励与HER式训练增广；只展示计算结果，不推断策略学会到达目标或任务成功率提高。');
    },
    experiments:[{id:'original-goal',label:'只把原目标从3改为已达终点2',before:{achieved:2,desired:3},after:{achieved:2,desired:2},prediction:'原目标结果从失败变成功；终点和事后目标、事后奖励及训练条目数不变。',expectation:'原奖励−1→0、原评测false→true；事后目标2、重算奖励0、条目数2保持。改变评测源于原任务本身改变。',verify(a,b){const x=end(a),y=end(b);return a.params.desired===3&&b.params.desired===2&&x.achieved===2&&y.achieved===2&&x.originalReward===-1&&y.originalReward===0&&x.originalSuccess===false&&y.originalSuccess===true&&x.evaluationSuccess===false&&y.evaluationSuccess===true&&x.relabeledGoal===2&&y.relabeledGoal===2&&x.relabeledReward===0&&y.relabeledReward===0&&x.augmentedTrainingPairs===2&&y.augmentedTrainingPairs===2;}}]
  };
  return {courseId:'cs224r',models};
});
