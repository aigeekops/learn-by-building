/* CS234: inspect only the arithmetic available in the selected real frame. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const f=x=>Number(x).toFixed(4);
  const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-10;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const last=t=>t.steps[t.steps.length-1].variables;
  const cell=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note});
  const view=(t,i,cells,summary)=>({title:t.steps[i].title,summary,cells});
  const experiment=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const models={};

  models['cs234-return']={
    intuition:'逐项折扣同一条有限奖励轨迹；一次轨迹回报是样本，策略价值还需对轨迹分布求期望。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells;
      if(i===0)cells=s.rewards.map((r,j)=>cell('reward-'+j,'第 '+(j+1)+' 次收到的奖励',r,`r${j+1} = ${f(r)}（给定轨迹第 ${j+1} 项）`,{time:j+1,reward:r},'第三次奖励之后真正终止，不再附加终点价值。'));
      else if(i===1)cells=s.discounted.map((x,j)=>cell('discount-'+j,'折回起点的奖励 '+(j+1),x,`${f(s.rewards[j])} × ${f(p.gamma)}^${j} = ${f(x)}`,{reward:s.rewards[j],gamma:p.gamma,power:j},'指数从0开始；首个奖励不折扣。'));
      else if(i===2)cells=[cell('return','本条轨迹的 G₀',s.return,`${s.discounted.map(f).join(' + ')} = ${f(s.return)}`,{discounted:s.discounted},'这是给定轨迹的有限样本回报，不是 Eπ[G₀]。')];
      else cells=[cell('immediate','即时奖励',s.immediate,`r1 = ${f(s.rewards[0])} = ${f(s.immediate)}`,{reward:s.rewards[0]}),cell('future','已折扣的后续奖励',s.future,`${f(s.return)} − ${f(s.immediate)} = ${f(s.future)}`,{return:s.return,immediate:s.immediate},'后续项已折回起点，不能再乘一次 γ。')];
      return view(t,i,cells,'只核对当前步骤已经产生的奖励项；固定轨迹不代表策略的平均表现。');
    },
    experiments:[experiment('discount-horizon','只把 γ 从0改成1','奖励序列保持不变；远期的2分从完全忽略变成完整计入，G₀应从1变成3。',{gamma:0},{gamma:1},'同一轨迹：γ=0 时 G₀=1，γ=1 时 G₀=3；即时奖励都为1。',(a,b)=>{const x=last(a),y=last(b);return a.params.gamma===0&&b.params.gamma===1&&eq(x.rewards,y.rewards)&&near(x.return,1)&&near(y.return,3)&&near(x.immediate,y.immediate)&&near(x.future,0)&&near(y.future,2);})]
  };

  models['cs234-bellman']={
    intuition:'将成功终止与失败自环分开加权，一次期望备份和解析固定点是两个不同对象。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells;
      if(i===0)cells=[cell('success-prob','成功终止概率',s.probabilities[0],`P(终止) = p = ${f(p.success)}`,{success:p.success}),cell('failure-prob','失败自环概率',s.probabilities[1],`1 − ${f(p.success)} = ${f(s.probabilities[1])}`,{success:p.success}),cell('old-value','备份前 V_old',s.oldValue,`V_old = ${f(s.oldValue)}（初始化估计）`,{oldValue:s.oldValue})];
      else if(i===1)cells=[cell('success-contribution','成功分支的加权贡献',s.contributions[0],`${f(s.probabilities[0])} × (2.0000 + ${f(p.gamma)} × 0.0000) = ${f(s.contributions[0])}`,{probability:s.probabilities[0],reward:2,terminalValue:0},'成功后终止，bootstrap 项为0。'),cell('failure-contribution','失败分支的加权贡献',s.contributions[1],`${f(s.probabilities[1])} × (0.0000 + ${f(p.gamma)} × ${f(s.oldValue)}) = ${f(s.contributions[1])}`,{probability:s.probabilities[1],gamma:p.gamma,oldValue:s.oldValue},'失败得0分并留在同一状态；这是对模型分支求期望，不是抽一个样本。')];
      else if(i===2)cells=[cell('next-value','一次 Bellman 期望备份',s.nextValue,`${f(s.contributions[0])} + ${f(s.contributions[1])} = ${f(s.nextValue)}`,{successContribution:s.contributions[0],failureContribution:s.contributions[1]},'只完成一次从旧估计出发的备份，尚不能称为收敛。')];
      else cells=[cell('fixed-point','自环方程的解析固定点 V*',s.fixedPoint,`V* = 2 × ${f(p.success)} + (1 − ${f(p.success)}) × ${f(p.gamma)} × V*\nV* = (2 × ${f(p.success)}) / [1 − (1 − ${f(p.success)}) × ${f(p.gamma)}] = ${f(s.fixedPoint)}`,{success:p.success,gamma:p.gamma},'当前帧才解出固定点；控件保证分母为正。'),cell('backup-change','本次备份变化量',s.residual,`|${f(s.nextValue)} − ${f(s.oldValue)}| = ${f(s.residual)}`,{nextValue:s.nextValue,oldValue:s.oldValue},'模型字段名 residual 指 |V_new−V_old|，不是 |V*−V_new|。')];
      return view(t,i,cells,'两分支的概率都要计入；终止分支不重复估计未来价值。');
    },
    experiments:[experiment('success-branches','只把成功概率0.5改成1','固定 γ=0.8；失败分支应消失，一次备份从1.4变成2，固定点从5/3变成2。',{gamma:0.8,success:0.5},{gamma:0.8,success:1},'成功概率提高到1时，失败加权贡献为0，备份值与固定点都为2。',(a,b)=>{const x=last(a),y=last(b);return a.params.gamma===b.params.gamma&&near(x.nextValue,1.4)&&near(x.fixedPoint,5/3)&&near(y.contributions[1],0)&&near(y.nextValue,2)&&near(y.fixedPoint,2)&&near(x.oldValue,y.oldValue);})]
  };

  models['cs234-planning']={
    intuition:'把同步价值迭代的一轮两格逐个展开：所有状态只读上一轮，然后才提取贪心动作。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells=[];
      if(i===0)cells=s.values.map((v,j)=>cell('initial-'+j,'V₀('+j+')',v,`V₀(${j}) = ${f(v)}（初始化）`,{state:j,value:v},'两个非终止状态的初始估计都为0。'));
      else if(i===1){
        for(let k=1;k<s.history.length;k++){
          const old=s.history[k-1],now=s.history[k];
          cells.push(cell('sweep-'+k+'-state-0','第'+k+'轮 · V('+0+')',now[0],`退出 Q = 1.0000 + ${f(p.gamma)} × 0.0000 = 1.0000\n前进 Q = 0.0000 + ${f(p.gamma)} × ${f(old[1])} = ${f(p.gamma*old[1])}\nV${k}(0) = max(1.0000, ${f(p.gamma*old[1])}) = ${f(now[0])}`,{previousState1:old[1],gamma:p.gamma},'只使用第'+(k-1)+'轮的 V(1)，不是本轮刚算出的2。'));
          cells.push(cell('sweep-'+k+'-state-1','第'+k+'轮 · V(1)',now[1],`V${k}(1) = 2.0000 + ${f(p.gamma)} × 0.0000 = ${f(now[1])}`,{terminalReward:2,gamma:p.gamma},'状态1的唯一行动得2分并终止。'));
        }
      }else if(i===2)cells=[cell('exit-q','退出动作的 Q',s.actionValues[0],`Q(0,退出) = 1.0000 + ${f(p.gamma)} × 0.0000 = ${f(s.actionValues[0])}`,{gamma:p.gamma}),cell('forward-q','前进动作的 Q',s.actionValues[1],`Q(0,前进) = 0.0000 + ${f(p.gamma)} × ${f(s.values[1])} = ${f(s.actionValues[1])}`,{gamma:p.gamma,state1Value:s.values[1]},'用扫描结束后的价值再评估动作；扫描一次时这一步也可得到比所存 V(0) 更新的备份。')];
      else cells=[cell('greedy-action','状态0的贪心动作',s.action,`${f(s.actionValues[0])} ≥ ${f(s.actionValues[1])} 为 ${s.actionValues[0]>=s.actionValues[1]} → ${s.action}`,{exit:s.actionValues[0],forward:s.actionValues[1]},'平分时明确选择退出。'),cell('greedy-value','本次动作比较的最大值',s.value,`max(${f(s.actionValues[0])}, ${f(s.actionValues[1])}) = ${f(s.value)}`,{actionValues:s.actionValues},'这是当前动作评估值；不把它当成动作编号。')];
      return view(t,i,cells,i===1?'该真实帧一次执行完整循环；下面按模型实际 history 展开每轮两状态，没有新增动画帧。':'已知确定性转移上的规划，无须抽样；只有当前帧实际完成的运算可见。');
    },
    experiments:[experiment('discount-policy','只把 γ 从0.4改成0.9','扫描两轮；状态1保持2，状态0从1变成1.8，贪心动作应从退出变成前进。',{gamma:0.4,sweeps:2},{gamma:0.9,sweeps:2},'同步轨迹分别为 [0,0]→[1,2]→[1,2] 和 [0,0]→[1,2]→[1.8,2]；动作发生切换。',(a,b)=>{const x=last(a),y=last(b);return a.params.sweeps===2&&b.params.sweeps===2&&eq(x.history,[[0,0],[1,2],[1,2]])&&eq(y.history,[[0,0],[1,2],[1.8,2]])&&x.action==='退出'&&y.action==='前进'&&near(x.actionValues[1],0.8)&&near(y.actionValues[1],1.8);})]
  };

  models['cs234-td']={
    intuition:'从一条经验构造单步样本目标，用真正终止标记遮掉 bootstrap，然后只更新当前状态。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params,mask=p.terminal==='yes'?0:1;let cells;
      if(i===0)cells=[cell('old-value','旧 V(s)',s.value,`V(s) = ${f(s.value)}（更新前估计）`,{value:s.value}),cell('next-value','旧 V(s′)',s.nextValue,`V(s′) = ${f(s.nextValue)}（下一状态估计）`,{nextValue:s.nextValue},'终止时仍可读到这个估计，但后续目标必须遮掉它。'),cell('sample-reward','本次收到的奖励',s.reward,`r = ${f(s.reward)}（一条经验中的奖励）`,{reward:s.reward})];
      else if(i===1)cells=[cell('target','本次 TD(0) 样本目标',s.target,`y = ${f(s.reward)} + ${f(p.gamma)} × ${f(mask)} × ${f(s.nextValue)} = ${f(s.target)}`,{reward:s.reward,gamma:p.gamma,nonterminalMask:mask,nextValue:s.nextValue},p.terminal==='yes'?'真正终止：掩码为0，目标只含奖励。':'非终止：掩码为1；这是单条转移的样本目标，不是完整 Bellman 期望。')];
      else if(i===2)cells=[cell('delta','TD 误差 δ',s.delta,`${f(s.target)} − ${f(s.value)} = ${f(s.delta)}`,{target:s.target,oldValue:s.value},'正误差向上调，负误差向下调。')];
      else cells=[cell('updated','更新后的 V(s)',s.updated,`${f(s.value)} + ${f(p.alpha)} × ${f(s.delta)} = ${f(s.updated)}`,{oldValue:s.value,alpha:p.alpha,delta:s.delta},'α 是靠近本次目标的比例；γ 是目标中的未来权重。'),cell('update-size','本次变化量',s.updated-s.value,`${f(s.updated)} − ${f(s.value)} = ${f(s.updated-s.value)}`,{updated:s.updated,oldValue:s.value})];
      return view(t,i,cells,'本模型只执行一次 TD(0) 更新；没有运行 Monte Carlo 回合平均，也没有重新采样。');
    },
    experiments:[experiment('terminal-mask','只把非终止改成真正终止','固定 α=0.5、γ=0.9；下一状态估计仍是2，但目标应从1.8降到0，更新值从1.4降到0.5。',{alpha:0.5,gamma:0.9,terminal:'no'},{alpha:0.5,gamma:0.9,terminal:'yes'},'真正终止去掉 bootstrap：y=0、δ=−1、V_new=0.5。',(a,b)=>{const x=last(a),y=last(b);return a.params.terminal==='no'&&b.params.terminal==='yes'&&near(x.nextValue,y.nextValue)&&near(x.reward,y.reward)&&near(x.target,1.8)&&near(y.target,0)&&near(x.updated,1.4)&&near(y.delta,-1)&&near(y.updated,0.5);})]
  };

  models['cs234-qlearning']={
    intuition:'同一条行为转移和同一组下一状态 Q，Q-learning 取最大值，SARSA 取已经选择的下一动作。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells;
      if(i===0)cells=[cell('visited-q','当前被访问的 Q',s.q,`Q(s,a) = ${f(s.q)}（更新前）`,{q:s.q}),cell('sample-reward','经验中的奖励',s.reward,`r = ${f(s.reward)}`,{reward:s.reward}),...s.nextQ.map((x,j)=>cell('next-q-'+j,'Q(s′,动作'+j+')',x,`Q(s′,${j}) = ${f(x)}（已有估计）`,{action:j,q:x})),cell('next-action','行为实际选择的下一动作',s.nextAction,`a′ = ${s.nextAction}（已记录的行为动作）`,{nextAction:s.nextAction},'这不是重新运行目标策略得到的动作。')];
      else if(i===1)cells=[cell('bootstrap','目标使用的下一状态估计',s.bootstrap,p.method==='q'?`max(${s.nextQ.map(f).join(', ')}) = ${f(s.bootstrap)}`:`Q(s′,a′=${s.nextAction}) = nextQ[${s.nextAction}] = ${f(s.bootstrap)}`,{method:p.method,nextQ:s.nextQ,behaviorAction:s.nextAction},p.method==='q'?'Q-learning：目标取最大动作价值，行为记录仍是动作0。':'SARSA：目标跟随行为实际选中的动作0。')];
      else if(i===2)cells=[cell('target','单条非终止转移的样本目标',s.target,`${f(s.reward)} + ${f(p.gamma)} × ${f(s.bootstrap)} = ${f(s.target)}`,{reward:s.reward,gamma:p.gamma,bootstrap:s.bootstrap},'两种方法共用同一奖励；本例非终止，若真正终止应去掉 bootstrap。')];
      else cells=[cell('updated','只更新已访问 Q(s,a)',s.updated,`${f(s.q)} + ${f(p.alpha)} × (${f(s.target)} − ${f(s.q)}) = ${f(s.updated)}`,{q:s.q,alpha:p.alpha,target:s.target},'下一状态的两个 Q 不在这次赋值中改变；单个样本更新不等于已学会最优策略。')];
      return view(t,i,cells,'逐格核对相同经验下两种 bootstrap 目标的差异，保持行为动作与目标动作的角色明确。');
    },
    experiments:[experiment('q-versus-sarsa','只把 Q-learning 改成 SARSA','固定奖励1、下一动作0、α=0.5、γ=0.9；bootstrap 从4变2，目标从4.6变2.8，更新值从2.3变1.4。',{alpha:0.5,gamma:0.9,method:'q'},{alpha:0.5,gamma:0.9,method:'sarsa'},'相同经验的 SARSA 跟随动作0，不使用较大的动作1估计。',(a,b)=>{const x=last(a),y=last(b);return a.params.method==='q'&&b.params.method==='sarsa'&&eq(x.nextQ,y.nextQ)&&x.nextAction===y.nextAction&&near(x.reward,y.reward)&&near(x.bootstrap,4)&&near(y.bootstrap,2)&&near(x.target,4.6)&&near(y.target,2.8)&&near(x.updated,2.3)&&near(y.updated,1.4);})]
  };

  models['cs234-exploration']={
    intuition:'逐个动作分配 ε-greedy 概率，再用左闭右开的累计区间解释一次固定采样点选择。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells;
      if(i===0)cells=[...s.q.map((q,j)=>cell('action-q-'+j,'动作'+j+'的当前估计',q,`Q(${j}) = ${f(q)}${j===s.greedy?'，为唯一最大值':''}`,{action:j,q})),cell('greedy','唯一贪心动作',s.greedy,`argmax([${s.q.map(f).join(', ')}]) = ${s.greedy}`,{q:s.q},'固定案例没有平分；不会从一次选择反推是否探索。')];
      else if(i===1)cells=s.probabilities.map((x,j)=>cell('probability-'+j,'π(动作'+j+')',x,`${f(p.epsilon)} / 3 + ${j===s.greedy?`(1 − ${f(p.epsilon)})`:'0.0000'} = ${f(x)}`,{epsilon:p.epsilon,actions:3,isGreedy:j===s.greedy},'均匀探索也包括贪心动作，不能漏掉它的 ε/3。'));
      else if(i===2)cells=s.cdf.map((x,j)=>cell('cdf-'+j,'动作'+j+'区间右端点',x,`${s.probabilities.slice(0,j+1).map(f).join(' + ')} = ${f(x)}`,{probabilities:s.probabilities.slice(0,j+1)},`动作${j}区间 [${f(j===0?0:s.cdf[j-1])}, ${f(x)})；u等于右端点时归下一段。`));
      else cells=[cell('sample-action','固定 u 落入的动作区间',s.action,`u = ${f(p.draw)}\n${s.cdf.map((right,j)=>`${f(j===0?0:s.cdf[j-1])} ≤ u < ${f(right)} → 动作${j}`).join('\n')}\n首个满足 u < cdf[i] 的 i = ${s.action}`,{draw:p.draw,cdf:s.cdf},'u 是可重放的教学输入，不是大量独立随机试验。'),cell('probability-total','概率总和',s.total,`${s.probabilities.map(f).join(' + ')} = ${f(s.total)}`,{probabilities:s.probabilities},'显示为四位小数，内部仍用完整精度判定区间。')];
      return view(t,i,cells,'概率分配是策略分布；动作是给定 u 的单次选择，两者不能互相替代。');
    },
    experiments:[experiment('uniform-exploration','只把 ε 从0改成1','固定 u=0.05；从完全利用变为三动作均匀分配，动作从1切到0，Q和贪心动作保持不变。',{epsilon:0,draw:0.05},{epsilon:1,draw:0.05},'ε=0 得[0,1,0]并选动作1；ε=1 得[1/3,1/3,1/3]并选动作0。',(a,b)=>{const x=last(a),y=last(b);return a.params.draw===b.params.draw&&eq(x.q,y.q)&&x.greedy===y.greedy&&eq(x.probabilities,[0,1,0])&&y.probabilities.every(v=>near(v,1/3))&&x.action===1&&y.action===0&&near(x.total,1)&&near(y.total,1);})]
  };

  models['cs234-approximation']={
    intuition:'对线性价值函数逐项内积、逐个权重取半梯度并更新；此次目标冻结，共享权重会影响别的特征状态。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells;
      if(i===0)cells=s.weights.flatMap((w,j)=>[cell('feature-'+j,'特征 φ['+j+']',s.features[j],`φ[${j}] = ${f(s.features[j])}（给定状态特征）`,{feature:s.features[j]}),cell('weight-'+j,'共享权重 w['+j+']',w,`w[${j}] = ${f(w)}（更新前）`,{weight:w})]);
      else if(i===1)cells=[...s.features.map((x,j)=>cell('product-'+j,'内积第'+j+'项',x*s.weights[j],`${f(s.weights[j])} × ${f(x)} = ${f(x*s.weights[j])}`,{weight:s.weights[j],feature:x})),cell('prediction','当前线性预测',s.prediction,`${s.features.map((x,j)=>f(x*s.weights[j])).join(' + ')} = ${f(s.prediction)}`,{weights:s.weights,features:s.features},'V=wᵀφ；这不是状态价值表中的独立单元。')];
      else if(i===2)cells=[cell('delta','固定目标减预测',s.delta,`${f(p.target)} − ${f(s.prediction)} = ${f(s.delta)}`,{target:p.target,prediction:s.prediction},'目标由输入固定，本次不对目标求导。'),...s.gradient.map((g,j)=>cell('gradient-'+j,'半平方误差对 w['+j+'] 的梯度',g,`∂[½(V−y)²]/∂w[${j}] = (${f(s.prediction)} − ${f(p.target)}) × ${f(s.features[j])} = ${f(g)}`,{prediction:s.prediction,target:p.target,feature:s.features[j]},'下降损失时减去此梯度；等价于沿 δφ 更新。'))];
      else cells=[...s.updated.map((w,j)=>cell('updated-weight-'+j,'更新后的 w['+j+']',w,`${f(s.weights[j])} − ${f(p.alpha)} × (${f(s.gradient[j])}) = ${f(w)}`,{oldWeight:s.weights[j],alpha:p.alpha,gradient:s.gradient[j]})),cell('new-prediction','更新后同一状态的预测',s.newPrediction,`${s.updated.map((w,j)=>`${f(w)} × ${f(s.features[j])}`).join(' + ')} = ${f(s.newPrediction)}`,{updated:s.updated,features:s.features},'较大步长可以越过固定目标，单样本改善不保证所有状态改善。'),cell('shared-probe','独立特征 [2,0] 的共享参数核对',2*s.updated[0],`更新前: 2 × ${f(s.weights[0])} + 0 × ${f(s.weights[1])} = ${f(2*s.weights[0])}\n更新后: 2 × ${f(s.updated[0])} + 0 × ${f(s.updated[1])} = ${f(2*s.updated[0])}`,{probeFeatures:[2,0],oldWeights:s.weights,newWeights:s.updated},'当前帧权重的派生核对，不是另一条被模型采样的训练经验，也没有给出该状态的正确目标。')];
      return view(t,i,cells,'只使用当前帧已有的特征、预测、梯度和权重；共享状态核对明确标为派生计算。');
    },
    experiments:[experiment('overshoot-step','只把 α 从0.1改成0.5','固定目标3；旧预测和梯度不变，较大步长令新预测从2.25升到5.25并越过目标，其他特征状态也受影响。',{alpha:0.1,target:3},{alpha:0.5,target:3},'权重分别为[0.65,0.8]与[1.25,2]；新预测2.25与5.25，后者越过固定目标3。',(a,b)=>{const x=last(a),y=last(b);return a.params.target===b.params.target&&near(x.prediction,y.prediction)&&eq(x.gradient,y.gradient)&&near(x.updated[0],0.65)&&near(x.updated[1],0.8)&&near(y.updated[0],1.25)&&near(y.updated[1],2)&&near(x.newPrediction,2.25)&&near(y.newPrediction,5.25)&&y.newPrediction>b.params.target;})]
  };

  models['cs234-policy-gradient']={
    intuition:'从二元 softmax 概率到已采动作1的对数梯度，再用优势决定一次梯度上升的方向。',
    inspect(t,i){
      const s=t.steps[i].variables,p=t.params;let cells;
      if(i===0)cells=s.probabilities.map((x,j)=>cell('probability-'+j,'π(动作'+j+')',x,`exp(${f(j===0?0:p.logit)}) / [exp(0.0000) + exp(${f(p.logit)})] = ${f(x)}`,{action:j,logits:[0,p.logit]},'实际模型使用减去最大 logit 的稳定 softmax；概率与此式相同。'));
      else if(i===1)cells=[cell('score','已采动作1的对数概率梯度',s.score,`∂ log π(1)/∂θ = 1.0000 − ${f(s.probabilities[1])} = ${f(s.score)}`,{sampledAction:1,probability:s.probabilities[1]},'条件是已经采到动作1；没有对两个动作求完整期望。')];
      else if(i===2)cells=[cell('gradient','优势加权的样本梯度',s.gradient,`${f(p.advantage)} × ${f(s.score)} = ${f(s.gradient)}`,{advantage:p.advantage,score:s.score},'正优势增加动作1的 logit；负优势反向。这是一个已采项。')];
      else cells=[cell('updated-logit','梯度上升后的 θ',s.updatedLogit,`${f(p.logit)} + ${f(p.alpha)} × (${f(s.gradient)}) = ${f(s.updatedLogit)}`,{oldLogit:p.logit,alpha:p.alpha,gradient:s.gradient},'最大化代理目标用加号；若最小化负代理损失则减去其梯度。'),cell('new-probability','重新归一化后的 π(1)',s.newProbability,`exp(${f(s.updatedLogit)}) / [exp(0.0000) + exp(${f(s.updatedLogit)})] = ${f(s.newProbability)}`,{updatedLogit:s.updatedLogit,oldProbability:s.probabilities[1]},'这是一次单样本更新后的概率，不表示已完成策略训练或获得期望收益改善。')];
      return view(t,i,cells,'动作1已采样；优势视为给定常数。只核对本项更新，不伪造完整策略期望或训练轨迹。');
    },
    experiments:[experiment('advantage-sign','只把优势从1改成−1','固定 θ=0、α=0.2；原概率和 score 不变，梯度变号，新动作1概率应从大于0.5变成小于0.5。',{logit:0,advantage:1,alpha:0.2},{logit:0,advantage:-1,alpha:0.2},'θ_new 为±0.1，π_new(1)约0.5250与0.4750；正负优势使概率向相反方向移动。',(a,b)=>{const x=last(a),y=last(b);return eq(x.probabilities,y.probabilities)&&near(x.score,0.5)&&near(y.score,0.5)&&near(x.gradient,0.5)&&near(y.gradient,-0.5)&&near(x.updatedLogit,0.1)&&near(y.updatedLogit,-0.1)&&near(x.newProbability,1/(1+Math.exp(-0.1)))&&near(y.newProbability,1/(1+Math.exp(0.1)))&&x.newProbability>0.5&&y.newProbability<0.5;})]
  };
  return {courseId:'cs234',models};
});
