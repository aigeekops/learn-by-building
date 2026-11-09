/* Original course companions. Pure finite arithmetic; no network, hardware or records. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else{root.ExtensionCourseModels=api;api.register(root.AICourseModels);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const H={
    sum:xs=>xs.reduce((a,b)=>a+b,0),
    mean:xs=>xs.reduce((a,b)=>a+b,0)/xs.length,
    clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
    norm:xs=>{const z=xs.reduce((a,b)=>a+b,0);if(!(z>0))throw Error('归一化总量必须为正');return xs.map(x=>x/z);},
    softmax:xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z);},
    dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),
    dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),
    segmentDistance:(a,b,c)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((c[0]-a[0])*dx+(c[1]-a[1])*dy)/den)):0;return Math.hypot(a[0]+t*dx-c[0],a[1]+t*dy-c[1]);},
    wilson:(success,n)=>{const z=1.96,p=success/n,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h];}
  };
  const defs={};
  const R=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
  const S=(id,label,options,value)=>({id,label,type:'select',options,value});
  const step=(title,detail,compute)=>({title,detail,compute});
  function add(id,params,stages,view){if(defs[id])throw Error('重复模型 '+id);defs[id]={params,stages,view};}
  const clone=x=>JSON.parse(JSON.stringify(x));
  function bars(state,patch,title){
    const rows=[];
    for(const [key,value] of Object.entries(patch)){
      if(typeof value==='number'&&Number.isFinite(value))rows.push({label:key,value});
      else if(Array.isArray(value)&&value.length<=10&&value.every(x=>typeof x==='number'&&Number.isFinite(x)))value.forEach((v,i)=>rows.push({label:key+'['+i+']',value:v}));
    }
    if(rows.length)return {kind:'bars',title,rows:rows.slice(0,12),unit:''};
    return {kind:'flow',title,nodes:Object.entries(patch).slice(0,5).map(([label,v])=>({label,detail:JSON.stringify(v),active:true}))};
  }
  function source(def){
    const lines=['// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。'];const positions=[];
    for(const stage of def.stages){lines.push('// '+stage.title);const body=stage.compute.toString();lines.push('Object.assign(s, ('+body+')(s, p));');positions.push(lines.length);}
    return {lines,positions};
  }
  function run(id,p){const d=defs[id],src=source(d),s={},frames=[];if(!d)throw Error('未知课件模型');
    d.stages.forEach((stage,i)=>{const patch=stage.compute(s,p);Object.assign(s,patch);const visual=bars(s,patch,stage.title);frames.push(clone({line:src.positions[i],title:stage.title,detail:stage.detail,variables:s,visual,scene:d.view?.(s,p)||null}));});
    return {model:id,params:clone(p),code:src.lines,steps:frames,result:clone(s)};
  }
  function example(id,p){const d=defs[id];if(!d)throw Error('未知课件模型');p=p||Object.fromEntries(d.params.map(x=>[x.id,x.value]));
    const code=source(d).lines.join('\n'),used=new Set(Array.from(code.matchAll(/H\.(\w+)/g),m=>m[1]));
    return "'use strict';\nconst H={"+Object.entries(H).filter(([k])=>used.has(k)).map(([k,f])=>k+':'+f.toString()).join(',\n')+'};\nconst p='+JSON.stringify(p)+';\nconst s={};\n'+code+'\nconsole.log(JSON.stringify(s,null,2));\n';}
  const xy=(title,paths,points=[],circles=[])=>({kind:'xy',title,paths,points,circles});
  const matrix=(title,values)=>({kind:'matrix',title,values});
  // CS234: formulate, plan, learn from samples, explore, and evaluate a policy.
  add('cs234-return',[R('gamma','折扣 γ',0,1,.1,.9)], [
    step('固定交互顺序','动作之后收到的奖励列为 [1, 0, 2]，最后一步终止。',(s,p)=>({rewards:[1,0,2]})),
    step('把未来奖励折回起点','终止以后的价值为零。有限回合允许 γ=1。',(s,p)=>({discounted:s.rewards.map((r,t)=>r*p.gamma**t)})),
    step('合成一次回报','一条轨迹的回报是样本，不是策略期望。',(s,p)=>({return:H.sum(s.discounted)})),
    step('比较即时和未来收益','奖励定义影响目标；相同动作在另一个奖励函数下可能排序不同。',(s,p)=>({immediate:s.rewards[0],future:s.return-s.rewards[0]}))
  ]);
  add('cs234-bellman',[R('gamma','折扣 γ',0,.9,.1,.9),R('success','到达目标概率',.1,1,.1,.8)], [
    step('列出转移的所有结果','一次行动成功得2分并终止；失败留在原地得0分。',(s,p)=>({probabilities:[p.success,1-p.success],oldValue:1})),
    step('对转移结果求期望','不能只取成功分支，也不能把终止状态再次 bootstrap。',(s,p)=>({contributions:[p.success*2,(1-p.success)*p.gamma*s.oldValue]})),
    step('进行一次 Bellman 更新','这是从 V_old=1 出发的一次备份，还不是收敛结果。',(s,p)=>({nextValue:H.sum(s.contributions)})),
    step('独立解固定点','此自环问题可直接解线性方程，用于核对迭代目标。',(s,p)=>({fixedPoint:2*p.success/(1-(1-p.success)*p.gamma),residual:Math.abs(s.nextValue-s.oldValue)}))
  ]);
  add('cs234-planning',[R('gamma','折扣 γ',0,.9,.1,.9),R('sweeps','同步扫描次数',1,6,1,3)], [
    step('定义两状态和终点','状态1向终点得2；状态0可立即退出得1，或前进到状态1得0。',(s,p)=>({values:[0,0]})),
    step('同步执行价值迭代','一轮内全部使用上一轮V，保留每轮记录。',(s,p)=>{let v=s.values.slice(),history=[v.slice()];for(let k=0;k<p.sweeps;k++){v=[Math.max(1,p.gamma*v[1]),2];history.push(v.slice());}return {values:v,history};}),
    step('用更新后的价值选择动作','比较两种行动的Q，不把状态值当动作编号。',(s,p)=>({actionValues:[1,p.gamma*s.values[1]]})),
    step('给出贪心策略','平分时固定选择退出，保证例子可重复。',(s,p)=>({action:s.actionValues[0]>=s.actionValues[1]?'退出':'前进',value:Math.max(...s.actionValues)}))
  ]);
  add('cs234-td',[R('alpha','学习率 α',.1,1,.1,.5),R('gamma','折扣 γ',0,1,.1,.9),S('terminal','本次是否终止',[['yes','真正终止'],['no','非终止转移']],'no')], [
    step('取出一条经验','旧估计V(s)=1；下一状态估计V(s′)=2；本次奖励为0。',(s,p)=>({value:1,nextValue:2,reward:0})),
    step('构造单步目标','真正终止时去掉下一状态价值；时间截断需另行判断。',(s,p)=>({target:s.reward+(p.terminal==='yes'?0:p.gamma*s.nextValue)})),
    step('计算 TD 误差','目标减去旧估计，正负号决定更新方向。',(s,p)=>({delta:s.target-s.value})),
    step('只走一步更新','α决定靠近样本目标的比例，不是折扣。',(s,p)=>({updated:s.value+p.alpha*s.delta}))
  ]);
  add('cs234-qlearning',[R('alpha','学习率 α',.1,1,.1,.5),R('gamma','折扣 γ',0,1,.1,.9),S('method','更新目标',[['q','Q-learning 最大值'],['sarsa','SARSA 实际下一动作']],'q')], [
    step('记录行为策略的一次转移','本次Q=0，奖励1，下一状态两动作值为[2,4]，行为实际选了动作0。',(s,p)=>({q:0,reward:1,nextQ:[2,4],nextAction:0})),
    step('区分目标策略','Q-learning使用max；SARSA使用实际选中动作。两者都不是重新采一次奖励。',(s,p)=>({bootstrap:p.method==='q'?Math.max(...s.nextQ):s.nextQ[s.nextAction]})),
    step('形成样本目标','本例转移非终止；终止时应置bootstrap为0。',(s,p)=>({target:s.reward+p.gamma*s.bootstrap})),
    step('更新被访问的Q','未访问的状态动作值保持原值。',(s,p)=>({updated:s.q+p.alpha*(s.target-s.q)}))
  ]);
  add('cs234-exploration',[R('epsilon','均匀探索概率 ε',0,1,.1,.2),R('draw','固定采样点 u',0,.99,.01,.7)], [
    step('先声明贪心动作和平分规则','三个动作估计值[1,3,2]，唯一贪心动作1。',(s,p)=>({q:[1,3,2],greedy:1})),
    step('分配 ε-greedy 概率','探索时对所有动作均匀抽样，贪心动作也在其中。',(s,p)=>({probabilities:s.q.map((_,i)=>p.epsilon/3+(i===s.greedy?1-p.epsilon:0))})),
    step('构造累计区间','区间使用左闭右开；u来自教学滑块，不是随机实验。',(s,p)=>({cdf:s.probabilities.map((_,i)=>H.sum(s.probabilities.slice(0,i+1)))})),
    step('选出本次动作','一次抽到贪心动作不证明没有探索。',(s,p)=>({action:s.cdf.findIndex(x=>p.draw<x),total:H.sum(s.probabilities)}))
  ]);
  add('cs234-approximation',[R('alpha','学习率',.05,.5,.05,.1),R('target','固定 TD 目标',0,4,.5,3)], [
    step('用特征共享参数','φ(s)=[1,2]，w=[0.5,0.5]；多个状态可共享同一组w。',(s,p)=>({features:[1,2],weights:[.5,.5]})),
    step('前向估计','线性价值函数V=wᵀφ，不是查表。',(s,p)=>({prediction:H.dot(s.features,s.weights)})),
    step('冻结目标后取半梯度','只对当前预测求导；本课目标由滑块固定，不反传到目标。',(s,p)=>({delta:p.target-s.prediction,gradient:s.features.map(x=>(s.prediction-p.target)*x)})),
    step('更新共享权重','一次样本会同时改变其他有相似特征的状态估计。',(s,p)=>({updated:s.weights.map((w,i)=>w-p.alpha*s.gradient[i]),newPrediction:H.dot(s.weights.map((w,i)=>w-p.alpha*s.gradient[i]),s.features)}))
  ]);
  add('cs234-policy-gradient',[R('logit','动作1的 logit',-2,2,.5,0),R('advantage','动作1优势估计',-2,2,.5,1),R('alpha','步长',.1,1,.1,.2)], [
    step('把logit变成随机策略','两个动作的logit为[0,θ]，使用稳定softmax。',(s,p)=>({probabilities:H.softmax([0,p.logit])})),
    step('对已采到的动作1取对数梯度','二元softmax的 d log π(1)/dθ=1−π(1)。',(s,p)=>({score:1-s.probabilities[1]})),
    step('用优势加权','正优势增加该动作概率；负优势会降低。基线不得依赖当前采样动作。',(s,p)=>({gradient:p.advantage*s.score})),
    step('执行梯度上升并重新计算','这是一个已采样项的更新，不是完整策略期望或机器人训练。',(s,p)=>({updatedLogit:p.logit+p.alpha*s.gradient,newProbability:H.softmax([0,p.logit+p.alpha*s.gradient])[1]}))
  ]);
  // Bonn: probabilistic mobile robotics with geometry and explicit uncertainty.
  add('bonn-motion',[R('left','左轮速度',0,2,.1,1),R('right','右轮速度',0,2,.1,1.2),R('dt','时间步长',.1,1,.1,.5)], [
    step('写清差速模型和单位','轮距0.5m，初始位姿(0,0,0)，轮速单位m/s。',(s,p)=>({track:.5,pose:[0,0,0]})),
    step('由轮速求机体速度','向前速度是轮速平均；角速度按右减左计算。',(s,p)=>({v:(p.left+p.right)/2,omega:(p.right-p.left)/s.track})),
    step('积分一段恒定速度运动','近零角速度走直线；其他情况使用圆弧精确积分。',(s,p)=>{const a=s.omega*p.dt;return {next:Math.abs(s.omega)<1e-9?[s.v*p.dt,0,a]:[s.v/s.omega*Math.sin(a),s.v/s.omega*(1-Math.cos(a)),a]};}),
    step('报告里程计的假设','没有打滑和编码器误差的理想计算；真机必须测量漂移。',(s,p)=>({distance:s.v*p.dt,heading:s.next[2]}))
  ],s=>s.next?xy('机体中心位移',[[[0,0],s.next.slice(0,2)]],[{xy:s.next.slice(0,2),label:'新位姿'}]):null);
  add('bonn-observation',[R('range','测距 z',0,5,.5,2),R('sigma','测量标准差',.25,1,.25,.5)], [
    step('为两个位置预测测距','已知一维地标在x=5，两个候选机器人位置是2和3。',(s,p)=>({positions:[2,3],predicted:[3,2]})),
    step('计算残差','同一坐标系下观测减预测，正负残差都要保留。',(s,p)=>({residuals:s.predicted.map(z=>p.range-z)})),
    step('计算高斯似然','这只是p(z|x)的密度，不能直接叫后验概率。',(s,p)=>({likelihoods:s.residuals.map(e=>Math.exp(-.5*(e/p.sigma)**2)/(p.sigma*Math.sqrt(2*Math.PI)))})),
    step('合并均匀先验','在这两个离散候选上归一化；完整连续位置空间另算。',(s,p)=>({posterior:H.norm(s.likelihoods)}))
  ]);
  add('bonn-bayes',[R('sensor','左侧观测正确率',.5,1,.1,.8)], [
    step('先保存上一步信念','左右两格先验[0.6,0.4]，动作使左右互换概率为0.25。',(s,p)=>({prior:[.6,.4]})),
    step('先预测再观测','预测需要对所有旧位置求和，不选一个最可能位置代替分布。',(s,p)=>({predicted:[.75*s.prior[0]+.25*s.prior[1],.25*s.prior[0]+.75*s.prior[1]]})),
    step('乘入左侧观测似然','观测模型是[正确率,1−正确率]。',(s,p)=>({unnormalized:[s.predicted[0]*p.sensor,s.predicted[1]*(1-p.sensor)]})),
    step('归一化得到后验','归一化常数是这次观测的边缘概率。',(s,p)=>({evidence:H.sum(s.unnormalized),posterior:H.norm(s.unnormalized)}))
  ]);
  add('bonn-ekf',[R('x','预测位置',1,3,.5,2),R('variance','预测方差 P',.1,1,.1,.5),R('noise','观测方差 R',.1,1,.1,.5)], [
    step('定义非线性传感器','教学观测z=x²，本次z=5；在正区间讨论局部近似。',(s,p)=>({predicted:p.x*p.x,jacobian:2*p.x,measurement:5})),
    step('传播观测不确定性','H是观测函数对x的导数，S=H²P+R。',(s,p)=>({innovation:s.measurement-s.predicted,innovationVariance:s.jacobian*s.jacobian*p.variance+p.noise})),
    step('计算Kalman增益','这里是标量EKF，不包含移动机器人的完整姿态与关联模型。',(s,p)=>({gain:p.variance*s.jacobian/s.innovationVariance})),
    step('修正均值与方差','用Joseph形式核对方差非负；EKF只是一阶近似。',(s,p)=>({updated:p.x+s.gain*s.innovation,posteriorVariance:(1-s.gain*s.jacobian)**2*p.variance+s.gain*s.gain*p.noise}))
  ]);
  add('bonn-particles',[R('measurement','观测位置',0,2,.5,1),R('sigma','标准差',.25,1,.25,.5),R('offset','系统重采样偏移',0,.24,.01,.1)], [
    step('准备四个等权粒子','位置[0,0.5,1,2]，本例省略运动采样以隔离观测更新。',(s,p)=>({particles:[0,.5,1,2]})),
    step('按似然更新权重','等先验使权重正比于似然；常数项可在归一化中约去。',(s,p)=>({weights:H.norm(s.particles.map(x=>Math.exp(-.5*((p.measurement-x)/p.sigma)**2)))})),
    step('检查有效样本数','ESS=1/Σw²，低ESS提示退化但不是定位精度。',(s,p)=>({ess:1/H.sum(s.weights.map(x=>x*x)),cdf:s.weights.map((_,i)=>H.sum(s.weights.slice(0,i+1)))})),
    step('系统重采样','取u+k/N的四个固定位置，复制粒子后应重置等权。',(s,p)=>({draws:[0,1,2,3].map(k=>p.offset+k/4),resampled:[0,1,2,3].map(k=>s.particles[s.cdf.findIndex(x=>p.offset+k/4<x)]),newWeights:[.25,.25,.25,.25]}))
  ]);
  add('bonn-grid',[R('occupied','单次占用后验',.55,.95,.1,.75),R('hits','重复独立观测数',1,5,1,2)], [
    step('从未知开始','一格先验0.5，对数几率为0；未知不是空闲。',(s,p)=>({prior:.5,priorLogOdds:0})),
    step('把逆传感器概率转成对数几率','本例固定先验0.5，更新项无需额外减去非零先验logit。',(s,p)=>({increment:Math.log(p.occupied/(1-p.occupied))})),
    step('累积条件独立的命中','重复同一帧会虚增信心；此处明确假设各次观测独立。',(s,p)=>({history:Array.from({length:p.hits+1},(_,k)=>k*s.increment),logOdds:p.hits*s.increment})),
    step('还原概率','只更新一格，没有实现完整射线清空或地图系统。',(s,p)=>({probability:1/(1+Math.exp(-s.logOdds))}))
  ]);
  add('bonn-slam',[R('odom','第二段里程计位移',.5,1.5,.1,1.2),R('loop','首尾闭环测量',1.5,2.5,.1,2)], [
    step('固定第一帧消除自由漂移','三个一维位姿，x0=0；约束为x1=1、x2−x1=d、x2=l，等权。',(s,p)=>({raw:[0,1,1+p.odom]})),
    step('列出正规方程','目标是三个约束残差的平方和；固定x0避免规范自由度。',(s,p)=>({rhs:[1-p.odom,p.odom+p.loop]})),
    step('解出最小二乘位姿','系数矩阵[[2,−1],[−1,2]]，解析逆可独立检查。',(s,p)=>({poses:[0,(2*s.rhs[0]+s.rhs[1])/3,(s.rhs[0]+2*s.rhs[1])/3]})),
    step('回算全部残差','闭环不是强行把误差塞给最后一帧；异常闭环需另作鲁棒处理。',(s,p)=>({residuals:[s.poses[1]-1,s.poses[2]-s.poses[1]-p.odom,s.poses[2]-p.loop]}))
  ],s=>s.poses?xy('闭环校正前后', [s.raw.map((x,i)=>[x,i]),s.poses.map((x,i)=>[x,i])]):null);
  add('bonn-astar',[R('weight','启发式权重',0,2,.5,1)], [
    step('定义一个有限图','S连A代价1、B代价2；A连G代价4，B连G代价1。h=[3,1,1,0]。',(s,p)=>({names:['S','A','B','G'],edges:[[[1,1],[2,2]],[[3,4]],[[3,1]],[]],heuristic:[3,1,1,0]})),
    step('从起点执行带重新打开的A*','按f最小取点；相同f按插入顺序。w>1不再保证最优。',(s,p)=>{const g=[0,Infinity,Infinity,Infinity],parent=[-1,-1,-1,-1],open=[0],expanded=[];while(open.length&&expanded.length<20){open.sort((a,b)=>(g[a]+p.weight*s.heuristic[a])-(g[b]+p.weight*s.heuristic[b]));const n=open.shift();expanded.push(n);if(n===3)break;for(const [to,c] of s.edges[n])if(g[n]+c<g[to]){g[to]=g[n]+c;parent[to]=n;if(!open.includes(to))open.push(to);}}return {costs:g.map(x=>Number.isFinite(x)?x:null),parent,expanded};}),
    step('回溯到起点','只有在终点实际出队时报告成功。',(s,p)=>{const path=[];if(s.expanded.includes(3)){for(let n=3;n!==-1;n=s.parent[n])path.unshift(s.names[n]);}return {path};}),
    step('记录搜索代价和路径长度','展开数与最短路径代价是不同指标；这个图不能代表大型地图性能。',(s,p)=>({cost:s.costs[3],expandedCount:s.expanded.length}))
  ]);
  // MIT Robotic Manipulation: geometry, contact, planning and feedback.
  add('manipulation-frames',[R('angle','相机绕世界旋转角',-90,90,30,90,'度'),R('tx','相机世界x',0,2,.5,1)], [
    step('明确坐标的上下标','相机坐标里的点p_C=[1,0]，相机原点在世界[tx,1]。',(s,p)=>({pointCamera:[1,0],translation:[p.tx,1],theta:p.angle*Math.PI/180})),
    step('先旋转点向量','旋转只改变表达方向；此处是二维刚体变换的教学切片。',(s,p)=>({rotated:[Math.cos(s.theta),Math.sin(s.theta)]})),
    step('再加原点平移','p_W=R_WC p_C+t_WC，矩阵乘法的顺序不能交换。',(s,p)=>({pointWorld:s.rotated.map((x,i)=>x+s.translation[i])})),
    step('用逆变换回到相机系','先减平移，再乘旋转转置，核对结果回到[1,0]。',(s,p)=>{const d=s.pointWorld.map((x,i)=>x-s.translation[i]);return {recovered:[Math.cos(s.theta)*d[0]+Math.sin(s.theta)*d[1],-Math.sin(s.theta)*d[0]+Math.cos(s.theta)*d[1]]};})
  ],s=>s.pointWorld?xy('世界坐标中的相机和目标',[[[0,0],s.translation,s.pointWorld]],[{xy:s.pointWorld,label:'目标 W'}]):null);
  add('manipulation-ik',[R('x','目标x',.5,2,.5,1),R('y','目标y',0,2,.5,1),S('elbow','肘部分支',[['up','正肘角'],['down','负肘角']],'up')], [
    step('先检查目标是否可达','平面两连杆长度均为1；距离必须在[0,2]内。',(s,p)=>({radius:Math.hypot(p.x,p.y),reachable:Math.hypot(p.x,p.y)<=2})),
    step('用余弦定理解肘角','不可达时保持null，不把越界余弦截到一个虚假可行解。',(s,p)=>({q2:s.reachable?(p.elbow==='up'?1:-1)*Math.acos(H.clamp((s.radius*s.radius-2)/2,-1,1)):null})),
    step('补回肩角','atan2保留象限，正负肘角给出不同构形。',(s,p)=>({q1:s.reachable?Math.atan2(p.y,p.x)-Math.atan2(Math.sin(s.q2),1+Math.cos(s.q2)):null})),
    step('用正运动学独立回代','可达不等于满足关节限制、碰撞或抓取约束。',(s,p)=>({end:s.reachable?[Math.cos(s.q1)+Math.cos(s.q1+s.q2),Math.sin(s.q1)+Math.sin(s.q1+s.q2)]:null,elbow:s.reachable?[Math.cos(s.q1),Math.sin(s.q1)]:null}))
  ],s=>s.end?xy('两种IK构形',[[[0,0],s.elbow,s.end]],[{xy:s.end,label:'末端'}]):null);
  add('manipulation-perception',[R('offset','目标点云x平移',-1,2,.5,1),R('outlier','最后一个配对的附加误差',0,4,1,0)], [
    step('显式给定点对应关系','源点[0,1,2]只沿x平移；完整3D配准还需旋转和对应估计。',(s,p)=>({source:[0,1,2],target:[p.offset,1+p.offset,2+p.offset+p.outlier]})),
    step('每对点提供一个位移候选','对应关系错一条会影响最小二乘；本例故意可加一个离群误差。',(s,p)=>({differences:s.target.map((v,i)=>v-s.source[i])})),
    step('比较均值与中位数平移','均值最小化平方误差；中位数最小化绝对误差，不等于通用ICP。',(s,p)=>({leastSquares:H.mean(s.differences),robust:s.differences.slice().sort((a,b)=>a-b)[1]})),
    step('回算配准残差','对齐数值好看不能证明几何无碰撞或抓取可行。',(s,p)=>({residuals:s.target.map((v,i)=>v-(s.source[i]+s.leastSquares)),robustResiduals:s.target.map((v,i)=>v-(s.source[i]+s.robust))}))
  ]);
  add('manipulation-contact',[R('mu','摩擦系数 μ',.1,1,.1,.5),R('normal','每侧法向力 N',1,10,1,5,'N'),R('mass','物体质量',.1,1,.1,.4,'kg')], [
    step('画出对称双指夹持的受力','物体静止、重力g=9.81，两侧法向力大小相同。',(s,p)=>({weight:p.mass*9.81})),
    step('计算单侧摩擦锥边界','每侧切向力上限μN；这是库仑摩擦的理想模型。',(s,p)=>({perFinger:p.mu*p.normal})),
    step('两侧共同抵抗重力','这里仅讨论竖直滑落，没有证明完整扳手空间力闭合。',(s,p)=>({capacity:2*s.perFinger,margin:2*s.perFinger-s.weight})),
    step('保留模型假设和裕量','边界相等在理想静态模型中可平衡；真实接触还需不确定性裕量。',(s,p)=>({staticFeasible:s.margin>=0,requiredPerFinger:s.weight/(2*p.mu)}))
  ]);
  add('manipulation-path',[R('radius','圆形障碍半径',.1,.8,.1,.4),R('clearance','要求的间隙',0,.4,.1,.1)], [
    step('给出起终点和两条候选路径','点机器人从(0,0)到(2,0)，圆障碍中心(1,0)。',(s,p)=>({paths:[[[0,0],[2,0]],[[0,0],[0,1],[2,1],[2,0]]],center:[1,0]})),
    step('检查整段距离','只检查离散路径点会漏掉直线中间穿过的障碍。',(s,p)=>({distances:s.paths.map(path=>Math.min(...path.slice(1).map((b,i)=>H.segmentDistance(path[i],b,s.center))))})),
    step('同时计算可行性和长度','障碍边界接触按无效处理，间隙用于模型约束。',(s,p)=>({valid:s.distances.map(d=>d>p.radius+p.clearance),lengths:s.paths.map(path=>H.sum(path.slice(1).map((b,i)=>H.dist(path[i],b))))})),
    step('只在可行路径里选择最短','候选集固定，不能宣称全局最短或完整运动规划器。',(s,p)=>({selected:s.valid.map((ok,i)=>ok?i:-1).filter(i=>i>=0).sort((a,b)=>s.lengths[a]-s.lengths[b])[0]??null}))
  ],(s,p)=>s.paths?xy('路径整段碰撞检查',s.paths,[],[{xy:[1,0],r:p.radius}]):null);
  add('manipulation-trajectory',[R('duration','轨迹时长 T',1,5,1,2),R('position','归一化时刻 t/T',0,1,.1,.5)], [
    step('选一个零端点速度的时间标度','起点q=0，终点q=1；σ=t/T。',(s,p)=>({sigma:p.position,t:p.position*p.duration})),
    step('计算三次位置曲线','q=3σ²−2σ³，沿同一几何路径改变时间。',(s,p)=>({q:3*s.sigma*s.sigma-2*s.sigma**3})),
    step('求速度与加速度','对真实时间求导，分别带1/T和1/T²。',(s,p)=>({velocity:(6*s.sigma-6*s.sigma*s.sigma)/p.duration,acceleration:(6-12*s.sigma)/(p.duration*p.duration)})),
    step('检查峰值速度','三次曲线峰值速度在σ=0.5，为1.5/T；端点加速度非零。',(s,p)=>({peakVelocity:1.5/p.duration,withinLimit:1.5/p.duration<=1}))
  ]);
  add('manipulation-control',[R('stiffness','刚度 K',1,10,1,4),R('damping','阻尼 D',0,5,1,2),R('velocity','当前速度',-1,1,.5,.5)], [
    step('从一维末端质量开始','位置x=0.5，目标1，质量1kg；不含接触和重力项。',(s,p)=>({position:.5,goal:1,mass:1})),
    step('分别计算弹性与阻尼反馈','阻尼项反对当前速度，不是反对位置误差。',(s,p)=>({elastic:p.stiffness*(s.goal-s.position),dampingForce:-p.damping*p.velocity})),
    step('合力决定加速度','把目标位姿换成力命令需要动力学和执行器能力。',(s,p)=>({force:s.elastic+s.dampingForce,acceleration:(s.elastic+s.dampingForce)/s.mass})),
    step('显式Euler走0.1秒','使用旧速度更新位置；数值积分误差与控制误差分别观察。',(s,p)=>({nextPosition:s.position+.1*p.velocity,nextVelocity:p.velocity+.1*s.acceleration}))
  ]);
  add('manipulation-task',[S('grasp','抓取传感器结果',[['ok','确认抓住'],['fail','未抓住']],'ok'),S('place','放置区域状态',[['clear','允许放置'],['blocked','区域被占']],'clear')], [
    step('定义有限任务状态','依次靠近、合拢、确认、搬运、释放；传感结果由滑块固定提供。',(s,p)=>({states:['approach','close'],held:null})),
    step('先确认抓取再搬运','合拢命令发出不等于物体已经被抓住。',(s,p)=>({held:p.grasp==='ok',states:s.states.concat(p.grasp==='ok'?['verify','transport']:['verify','stop'])})),
    step('在放置前检查环境','抓取失败不进入释放；区域阻塞时保留物体并停止。',(s,p)=>({states:s.states.concat(s.held?(p.place==='clear'?['release']:['wait']):[]),released:s.held&&p.place==='clear'})),
    step('报告任务结果与失败条件','这是明确规则的状态机，没有感知网络或真实机器人执行。',(s,p)=>({success:s.released,reason:!s.held?'抓取确认失败':p.place==='blocked'?'放置区域阻塞':'完成本例流程'}))
  ]);
  // Nav2: arithmetic and contracts target Jazzy; never pretend to execute ROS.
  add('nav2-lifecycle',[S('configured','参数配置',[['yes','有效'],['no','无效']],'yes'),S('sensor','传感器就绪',[['yes','已就绪'],['no','未就绪']],'yes')], [
    step('启动时处于未配置状态','生命周期状态机将资源建立和对外服务分开。',(s,p)=>({states:['unconfigured'],active:false})),
    step('配置资源并检查参数','教学门控为显式规则；真实节点转移由服务回执决定。',(s,p)=>({states:s.states.concat(p.configured==='yes'?'inactive':'unconfigured'),configured:p.configured==='yes'})),
    step('满足依赖后激活','inactive不是故障，也不代表可以接收导航目标。',(s,p)=>({active:s.configured&&p.sensor==='yes',states:s.states.concat(s.configured&&p.sensor==='yes'?'active':'blocked')})),
    step('为目标受理给出条件','此处ready仅代表本地规则；没有连接Lifecycle Manager或Action Server。',(s,p)=>({acceptGoal:s.active,readyCount:Number(s.configured)+Number(p.sensor==='yes')}))
  ]);
  add('nav2-tf',[R('mapOdom','map到odom的x平移',-1,1,.5,.5),R('odomBase','odom到base的x平移',0,3,.5,1),R('age','最近TF的年龄',0,1,.1,.2,'s')], [
    step('先检查坐标链','一维平移切片：map→odom→base_link→laser，laser相对base偏移0.2m。',(s,p)=>({chain:['map','odom','base_link','laser'],laserOffset:.2})),
    step('复合相同时间的变换','同一方向的纯平移相加；三维旋转时必须按矩阵顺序复合。',(s,p)=>({laserMap:p.mapOdom+p.odomBase+s.laserOffset})),
    step('把观测从laser变到map','激光端点在laser坐标x=2，计算结果不等于已证明TF时序正确。',(s,p)=>({endpointMap:s.laserMap+2})),
    step('用教学阈值检查时效','0.3s是本例约定，不是Nav2全局默认值；真实查询要看时间戳和缓存。',(s,p)=>({fresh:p.age<=.3,usable:p.age<=.3,ageSeconds:p.age}))
  ]);
  add('nav2-localization',[R('cell','地图列号',0,10,1,4),R('resolution','地图分辨率',.05,.25,.05,.1),R('origin','地图原点x',-2,0,.5,-1)], [
    step('读取地图元数据','此例原点朝向0，只讨论一维格心；地图栅格不是机器人位姿。',(s,p)=>({column:p.cell,resolution:p.resolution,origin:p.origin})),
    step('将栅格中心换到世界坐标','使用(i+0.5)×resolution，避免把格心和格角混用。',(s,p)=>({world:p.origin+(p.cell+.5)*p.resolution})),
    step('区分先验位姿和定位结果','给定初始机器人估计x=0.2，独立测距修正−0.1；只是算例，不运行AMCL。',(s,p)=>({initialPose:.2,correction:-.1,localizedPose:.1})),
    step('写出目标相对位移','同为map坐标才能相减；初始化并不代表粒子已收敛。',(s,p)=>({relativeGoal:s.world-s.localizedPose,cellRoundTrip:Math.floor((s.world-p.origin)/p.resolution)}))
  ]);
  add('nav2-costmap',[R('radius','圆形机器人半径',.1,.5,.1,.2),R('inflation','教学缓冲距离',0,.5,.1,.2)], [
    step('给出通道净宽','两侧障碍之间净宽0.9m；以圆形footprint近似。',(s,p)=>({width:.9,diameter:2*p.radius})),
    step('先检查几何可通过性','机器人外轮廓与障碍的距离决定碰撞，中心点空闲还不够。',(s,p)=>({physicalMargin:s.width-2*p.radius,geometricPass:s.width>2*p.radius})),
    step('加入规划缓冲要求','本例硬缓冲用于解释几何，不复刻Nav2连续膨胀代价值。',(s,p)=>({preferredWidth:2*(p.radius+p.inflation),bufferMargin:s.width-2*(p.radius+p.inflation)})),
    step('区分碰撞与偏好','真实costmap还包括未知值、传感器射线和多层合成。',(s,p)=>({bufferPass:s.bufferMargin>0,geometricPass:s.geometricPass}))
  ]);
  add('nav2-planner',[R('penalty','接近障碍的惩罚系数',0,5,1,2)], [
    step('定义同一地图上的两条候选路径','短路3m但累计障碍邻近代价2；绕行4m且邻近代价0.2。',(s,p)=>({lengths:[3,4],proximity:[2,.2]})),
    step('把路径成本写明','教学成本=长度+λ×邻近代价；不等同任一Nav2插件内部公式。',(s,p)=>({costs:s.lengths.map((x,i)=>x+p.penalty*s.proximity[i])})),
    step('按同一个目标选择','先假设两条已通过碰撞检查；不可行候选不应参与此比较。',(s,p)=>({choice:s.costs[0]<=s.costs[1]?0:1})),
    step('保存选择依据','可行、最短、跟踪平滑是不同要求，规划成功也不代表执行成功。',(s,p)=>({selectedLength:s.lengths[s.choice],selectedCost:s.costs[s.choice]}))
  ]);
  add('nav2-controller',[R('lookahead','前视距离 L',.5,2,.5,1),R('speed','前进速度 v',.1,1,.1,.5),R('y','目标横向偏移 y',-.5,.5,.1,.2)], [
    step('把前视目标放到机体系','目标距离L，横向坐标y；本例|y|≤L。',(s,p)=>({target:[Math.sqrt(p.lookahead*p.lookahead-p.y*p.y),p.y]})),
    step('由圆弧几何求曲率','κ=2y/L²；这是pure pursuit几何切片，不含RPP的完整减速机制。',(s,p)=>({curvature:2*p.y/(p.lookahead*p.lookahead)})),
    step('速度乘曲率得到角速度','角速度符号跟随横向目标方向，单位rad/s。',(s,p)=>({omega:p.speed*s.curvature})),
    step('检查离散控制周期','20Hz周期0.05s，本周期航向变化ωdt，不是整条轨迹保证。',(s,p)=>({headingStep:s.omega*.05,travelStep:p.speed*.05}))
  ],s=>s.target?xy('机体系中的前视目标',[[[0,0],s.target]],[{xy:s.target,label:'lookahead'}]):null);
  add('nav2-behavior',[R('failures','规划连续失败次数',0,4,1,1),R('budget','允许恢复次数',0,3,1,2)], [
    step('先初始化一个有界恢复流程','规划→跟踪；失败时清理一次教学缓存再试，达到预算就退出。',(s,p)=>({events:[],attempts:0})),
    step('执行明确的有限规则','这里是简化控制流，不是Nav2 XML或BehaviorTree.CPP执行器。',(s,p)=>{const events=[];let success=false,recoveries=0;for(let attempt=0;attempt<=p.budget;attempt++){events.push('plan '+attempt);if(attempt>=p.failures){events.push('follow');success=true;break;}if(attempt<p.budget){recoveries++;events.push('recover');}}return {events,success,recoveries,attempts:Math.min(p.failures+1,p.budget+1)};}),
    step('区分运行、成功和失败','重试次数不等于尝试总数；恢复也不是必然能消除物理障碍。',(s,p)=>({status:s.success?'SUCCESS':'FAILURE'})),
    step('记录结束原因','有限预算避免无限转圈；真实行为树还需处理取消和恢复节点返回值。',(s,p)=>({stoppedBy:s.success?'路径与跟踪分支成功':'恢复预算耗尽'}))
  ]);
  add('nav2-validation',[R('successes','固定10次中的到达次数',0,10,1,8),R('contacts','碰撞次数',0,3,1,0),R('timeouts','超时次数',0,3,1,1)], [
    step('在同一场景集上比较','10次为独立回合的教学数据，到达、碰撞、超时可有交叉标记。',(s,p)=>({episodes:10,successes:p.successes,contacts:p.contacts,timeouts:p.timeouts})),
    step('计算成功率和区间','Wilson区间体现小样本不确定性，不能把8/10当长期精确成功率。',(s,p)=>({rate:s.successes/s.episodes,interval:H.wilson(s.successes,s.episodes)})),
    step('按预先写下的门槛核对','本例要求到达率≥0.8、零碰撞、超时≤1，不是Nav2官方验收规范。',(s,p)=>({pass:s.rate>=.8&&s.contacts===0&&s.timeouts<=1})),
    step('为下一步保留证据类型','所有数字都是人工输入，未执行Gazebo或真机，也没有生成学习完成记录。',(s,p)=>({evidence:'人工教学数据',targetEnvironment:'ROS 2 Jazzy + Gazebo Harmonic'}))
  ]);
  // MoveIt 2: model/scene/trajectory/execution are independent contracts.
  add('moveit-model',[R('arm','活动关节数',1,7,1,6),R('gripper','独立夹爪关节数',0,2,1,1)], [
    step('区分几何描述和语义分组','URDF描述树与惯性；SRDF定义规划组等语义，本例仅数独立自由度。',(s,p)=>({arm:p.arm,gripper:p.gripper})),
    step('计算整个机器人自由度','固定关节、mimic关节不自动算作独立自由度。',(s,p)=>({robotDof:s.arm+s.gripper})),
    step('按规划组选择状态空间','arm组只含机械臂独立关节；夹爪另组控制。',(s,p)=>({planningDof:s.arm,excludedGripper:s.gripper})),
    step('核对状态消息长度','此长度检查不能证明URDF/SRDF可解析或控制器配置正确。',(s,p)=>({expectedArmPositions:s.planningDof,modelCheck:'仅自由度记账'}))
  ]);
  add('moveit-limits',[R('target','关节目标',-2,2,.5,1.5),R('velocity','请求速度',0,2,.5,1)], [
    step('固定关节与约束','位置范围[−1,1]rad，速度上限0.8rad/s；连续关节另有环绕语义。',(s,p)=>({lower:-1,upper:1,vmax:.8})),
    step('分别检查位置和速度','超界目标应该拒绝或重新规划；不能悄悄裁剪后仍声称到达原目标。',(s,p)=>({positionValid:p.target>=s.lower&&p.target<=s.upper,velocityValid:p.velocity<=s.vmax})),
    step('给出明确的请求状态','可行性是在模型约束下判断，尚未检查碰撞。',(s,p)=>({requestValid:s.positionValid&&s.velocityValid})),
    step('计算速度上限下的时间下界','从0到目标的|Δq|/vmax忽略加减速，只是时间下界。',(s,p)=>({lowerBound:Math.abs(p.target)/s.vmax,canReachRequested:s.requestValid}))
  ]);
  add('moveit-ik',[R('desired','期望末端速度',-.5,.5,.1,.2),R('jacobian','标量Jacobian J',0,1,.1,.5),R('damping','阻尼 λ',.1,.5,.1,.1)], [
    step('把任务速度映射到关节空间','用一维切片解释阻尼最小二乘，完整机械臂J通常为矩阵。',(s,p)=>({jacobian:p.jacobian,desired:p.desired})),
    step('构造阻尼逆','qdot=J/(J²+λ²)×xdot，λ避免近奇异时直接除以J。',(s,p)=>({inverse:p.jacobian/(p.jacobian*p.jacobian+p.damping*p.damping)})),
    step('求关节速度与实际任务速度','阻尼带来跟踪偏差；不是所有末端速度都能实现。',(s,p)=>({qdot:s.inverse*p.desired,achieved:p.jacobian*s.inverse*p.desired})),
    step('回算残差并检查限速','本例速度上限1rad/s，超过时只标记，不能直接认定IK有效。',(s,p)=>({residual:s.achieved-p.desired,withinLimit:Math.abs(s.qdot)<=1}))
  ]);
  add('moveit-scene',[R('obstacle','障碍中心x',.5,1.5,.5,1),R('radius','障碍半径',.1,.5,.1,.2)], [
    step('给出一段机器人路径','点机器人从(0,0)到(2,0)，障碍中心(x,0.2)。',(s,p)=>({start:[0,0],goal:[2,0],center:[p.obstacle,.2]})),
    step('比较端点和整段距离','端点都无碰撞仍可能穿过障碍；场景要先同步到规划器。',(s,p)=>({endpointDistances:[H.dist(s.start,s.center),H.dist(s.goal,s.center)],segmentDistance:H.segmentDistance(s.start,s.goal,s.center)})),
    step('按接触也算碰撞判定','这是一段与圆的精确几何检查，没有运行FCL或MoveIt PlanningScene。',(s,p)=>({endpointClear:s.endpointDistances.every(x=>x>p.radius),edgeClear:s.segmentDistance>p.radius})),
    step('保留场景版本的概念','实际工程保存场景、附着物体、状态时间戳，避免用旧场景执行新轨迹。',(s,p)=>({collisionFree:s.edgeClear,minimumClearance:s.segmentDistance-p.radius}))
  ],(s,p)=>s.start?xy('端点检查与整段检查',[[s.start,s.goal]],[],[{xy:[p.obstacle,.2],r:p.radius}]):null);
  add('moveit-planning',[R('step','离散碰撞检查间隔',.25,1,.25,1)], [
    step('定义一维配置空间的窄障碍','q从0到2，闭区间[0.9,1.1]无效；本例用于检查采样分辨率。',(s,p)=>({invalidInterval:[.9,1.1],start:0,goal:2})),
    step('生成离散检查点','仅沿一条固定边采样，不是运行RRT/OMPL。',(s,p)=>({samples:Array.from({length:Math.ceil(2/p.step)+1},(_,i)=>Math.min(2,i*p.step))})),
    step('分别做离散和连续检查','本例采样可能恰好命中；另一个窄障碍可落在采样间隔中。',(s,p)=>({discreteClear:!s.samples.some(x=>x>=.9&&x<=1.1),continuousClear:false})),
    step('用移位障碍展示漏检反例','障碍[0.4,0.6]：步长1只看0、1、2会漏掉整段碰撞。',(s,p)=>({shiftedDiscreteClear:!s.samples.some(x=>x>=.4&&x<=.6),shiftedContinuousClear:false}))
  ]);
  add('moveit-cartesian',[R('completed','连续完成的段数',0,4,1,3),R('required','要求的路径覆盖比例',.5,1,.1,1)], [
    step('给出四段笛卡尔路径','段长分别[1,1,2,2]，求解器遇到失败后停止。',(s,p)=>({lengths:[1,1,2,2]})),
    step('分别计段数和弧长覆盖','本例自定义两个覆盖统计；不把其中任何一个冒充MoveIt API fraction精确定义。',(s,p)=>({segmentFraction:p.completed/4,lengthFraction:H.sum(s.lengths.slice(0,p.completed))/H.sum(s.lengths)})),
    step('按本例弧长规则核对完整性','部分路径不是完整任务成功，返回值必须连同约束和错误码检查。',(s,p)=>({accepted:s.lengthFraction>=p.required})),
    step('给出缺失路径长度','完成百分比不能替代关节跳变、碰撞和时间参数化检查。',(s,p)=>({remainingLength:H.sum(s.lengths.slice(p.completed)),fullPath:p.completed===4}))
  ]);
  add('moveit-timing',[R('distance','单关节位移',.2,2,.2,1),R('vmax','速度上限',.5,2,.5,1),R('amax','加速度上限',.5,2,.5,1)], [
    step('先固定单关节运动边界','起终速度为0；连续时间的对称加减速，不含jerk限制。',(s,p)=>({rampDistance:p.vmax*p.vmax/p.amax})),
    step('决定三角形还是梯形速度曲线','位移小于vmax²/amax时来不及达到速度上限。',(s,p)=>({triangular:p.distance<=s.rampDistance})),
    step('计算加速段和匀速段时间','每个加速段距离为v_peak²/(2amax)，两段相加。',(s,p)=>({rampTime:s.triangular?Math.sqrt(p.distance/p.amax):p.vmax/p.amax,cruiseTime:s.triangular?0:(p.distance-s.rampDistance)/p.vmax})),
    step('合成总时长和峰值速度','这是解析单关节模型，不是TOTG/Ruckig实现或整机最优时长证明。',(s,p)=>({duration:2*s.rampTime+s.cruiseTime,peakVelocity:p.amax*s.rampTime}))
  ]);
  add('moveit-execution',[R('startError','实际起点与轨迹起点偏差',0,.2,.02,.02),S('scene','场景版本',[['same','未变'],['changed','已变化']],'same'),S('result','执行返回',[['success','成功'],['aborted','中止']],'success')], [
    step('规划结果先作为候选','轨迹与场景版本v1绑定，执行前需要新状态。',(s,p)=>({planned:true,sceneVersion:'v1'})),
    step('核对起点和场景','0.04rad为本例阈值，并非MoveIt通用默认值；版本变化后要重新验证。',(s,p)=>({startCompatible:p.startError<=.04,sceneCurrent:p.scene==='same'})),
    step('只在条件满足时请求执行','本例没有调用FollowJointTrajectory，也不向硬件发送命令。',(s,p)=>({requested:s.startCompatible&&s.sceneCurrent})),
    step('区分已请求与已成功','接收目标不等于到达；必须检查终态回执和实际末端偏差。',(s,p)=>({success:s.requested&&p.result==='success',outcome:!s.requested?'未提交':p.result==='success'?'本例返回成功':'本例返回中止'}))
  ]);
  // CS224R: sample-based objectives, distribution shift, and data limits.
  add('cs224r-bc',[R('weight','线性策略参数 w',0,2,.5,1),R('rate','学习率',.05,.3,.05,.1)], [
    step('以示范的观测动作对为监督数据','观测[1,2]，专家动作[2,4]，策略a=wo；本例是标量行为克隆。',(s,p)=>({observations:[1,2],actions:[2,4]})),
    step('计算预测和均方误差','按示范分布拟合，并没有在环境里探索。',(s,p)=>({predicted:s.observations.map(o=>p.weight*o),errors:s.observations.map((o,i)=>p.weight*o-s.actions[i])})),
    step('明确损失归约后求导','使用平均半平方误差，梯度是mean(o×error)。',(s,p)=>({loss:H.mean(s.errors.map(e=>e*e))/2,gradient:H.mean(s.errors.map((e,i)=>e*s.observations[i]))})),
    step('更新并检查新的观测','示范误差下降不保证闭环稳定，另看未见观测o=3。',(s,p)=>({updatedWeight:p.weight-p.rate*s.gradient,heldOutAction:(p.weight-p.rate*s.gradient)*3}))
  ]);
  add('cs224r-dagger',[R('expert','训练时专家混合概率 β',0,1,.1,.5),R('draw','固定采样点',0,.9,.1,.6)], [
    step('先保留已有示范','线性策略初始w=1.5，已有样本(o=1,a=2)。',(s,p)=>({dataset:[[1,2]],learnerAction:3,expertAction:4,visitedObservation:2})),
    step('在当前策略访问状态上请求专家标签','DAgger标签对应访问到的观测，不是把策略自己的动作当真值。',(s,p)=>({label:s.expertAction,executed:p.draw<p.expert?s.expertAction:s.learnerAction})),
    step('聚合数据再拟合','混合策略只决定本次执行动作；被查询的专家标签仍是4。',(s,p)=>({aggregated:s.dataset.concat([[s.visitedObservation,s.label]])})),
    step('在聚合样本上做闭式线性拟合','这里只重拟合一个线性参数，没有实际收集机器人在线数据。',(s,p)=>({weight:H.sum(s.aggregated.map(([o,a])=>o*a))/H.sum(s.aggregated.map(([o])=>o*o)),sampleCount:s.aggregated.length}))
  ]);
  add('cs224r-actor-critic',[R('gamma','折扣 γ',0,1,.1,.9),R('lambda','GAE λ',0,1,.1,.9)], [
    step('把一条终止轨迹的奖励和值对齐','奖励[0,1]，V=[0.2,0.4,0]；末端真正终止。',(s,p)=>({rewards:[0,1],values:[.2,.4,0]})),
    step('先计算两个TD残差','最后一个δ不从终止状态bootstrap。',(s,p)=>({deltas:[p.gamma*s.values[1]-s.values[0],1-s.values[1]]})),
    step('向前累计衰减残差','两步GAE：A0=δ0+γλδ1，A1=δ1；λ调节估计口径。',(s,p)=>({advantages:[s.deltas[0]+p.gamma*p.lambda*s.deltas[1],s.deltas[1]]})),
    step('构造价值回归目标','target=advantage+old value；该目标在此次拟合中冻结。',(s,p)=>({targets:s.advantages.map((a,i)=>a+s.values[i])}))
  ]);
  add('cs224r-ppo',[R('ratio','新旧动作概率比 r',.5,1.5,.1,1.3),R('advantage','优势 A',-2,2,.5,1),R('clip','裁剪 ε',.1,.3,.1,.2)], [
    step('固定采样数据与旧策略','r是已采到动作的π_new/π_old，旧概率必须正。',(s,p)=>({ratio:p.ratio,advantage:p.advantage})),
    step('计算未裁剪代理项','目标按最大化方向写为rA；训练损失通常取其负。',(s,p)=>({unclipped:s.ratio*s.advantage})),
    step('裁剪比值并保留保守项','负优势时min仍必须保留，不能先按符号更换max。',(s,p)=>({clippedRatio:H.clamp(s.ratio,1-p.clip,1+p.clip),clipped:H.clamp(s.ratio,1-p.clip,1+p.clip)*s.advantage})),
    step('求单样本PPO目标','裁剪不是硬KL约束，也不保证每次真实回报上升。',(s,p)=>({objective:Math.min(s.unclipped,s.clipped),loss:-Math.min(s.unclipped,s.clipped)}))
  ]);
  add('cs224r-entropy',[R('probability','动作1概率',.1,.9,.1,.5),R('temperature','熵系数 α',0,1,.1,.2)], [
    step('用离散动作切片解释熵正则','动作价值Q=[1,2]，策略[1−p,p]，使用自然对数。',(s,p)=>({probabilities:[1-p.probability,p.probability],q:[1,2]})),
    step('计算期望价值','没有取max，策略保留完整概率分布。',(s,p)=>({expectedQ:H.dot(s.probabilities,s.q)})),
    step('计算策略熵','熵奖励鼓励分散，无法替代奖励定义或安全约束。',(s,p)=>({entropy:-H.sum(s.probabilities.map(x=>x*Math.log(x)))})),
    step('合成最大熵目标','这是离散熵目标切片，不是连续SAC完整更新；不包含双Q、tanh修正和目标网络。',(s,p)=>({objective:s.expectedQ+p.temperature*s.entropy}))
  ]);
  add('cs224r-model',[R('bias','学习模型每步偏差',-.2,.2,.1,.1),R('horizon','预测步数',1,5,1,3)], [
    step('定义真实系统与学习模型','真实x′=x+u，模型x′=x+u+b，x0=0，固定u=0.5。',(s,p)=>({initial:0,action:.5})),
    step('先预测不执行','模型展开并不产生真实观测；偏差会随展开长度累积。',(s,p)=>({truePath:Array.from({length:p.horizon+1},(_,k)=>k*s.action),modelPath:Array.from({length:p.horizon+1},(_,k)=>k*(s.action+p.bias))})),
    step('逐步比较预测误差','这个确定性例子误差线性增长；一般非线性系统可能放大得更快。',(s,p)=>({errors:s.modelPath.map((x,i)=>x-s.truePath[i])})),
    step('分别报告一步与多步质量','模型一步MSE好不等于长程策略可靠；真实闭环需要新观测修正。',(s,p)=>({oneStepError:p.bias,terminalError:s.errors[s.errors.length-1]}))
  ],s=>s.modelPath?xy('学习模型的多步误差',[s.truePath.map((v,i)=>[i,v]),s.modelPath.map((v,i)=>[i,v])]):null);
  add('cs224r-offline',[R('unseenQ','未覆盖动作的Q估计',0,10,1,8),R('penalty','未覆盖动作惩罚',0,10,1,5)], [
    step('把离线数据支持范围写出','动作A有数据且估值2；B无数据，估计由滑块给出。',(s,p)=>({counts:[20,0],q:[2,p.unseenQ]})),
    step('观察无约束贪心的外推','没有在线交互纠正B的估计，最大化可放大误差。',(s,p)=>({naiveChoice:s.q[0]>=s.q[1]?0:1})),
    step('用显式支持惩罚作教学对照','本例减去未覆盖惩罚，不是CQL或IQL原论文的损失实现。',(s,p)=>({adjusted:s.q.map((q,i)=>q-(s.counts[i]===0?p.penalty:0))})),
    step('保留选择与不可识别范围','选A也没有证明上线安全；需要独立离线评价、支持检查和真实任务约束。',(s,p)=>({choice:s.adjusted[0]>=s.adjusted[1]?0:1,unseenActionCovered:false}))
  ]);
  add('cs224r-goals',[R('achieved','最终达到的位置',0,4,1,2),R('desired','原始目标位置',0,4,1,3)], [
    step('保存原始目标条件轨迹','轨迹终点与期望目标分开记录，不能事后改写原任务成功率。',(s,p)=>({achieved:p.achieved,desired:p.desired})),
    step('按原任务计算稀疏奖励','本例到达目标给0，否则−1；终点相同才算到达。',(s,p)=>({originalReward:s.achieved===s.desired?0:-1,originalSuccess:s.achieved===s.desired})),
    step('生成一个事后目标样本','HER式重标记把已达到位置作为另一个训练目标；只在可重算奖励设定中适用。',(s,p)=>({relabeledGoal:s.achieved,relabeledReward:0})),
    step('把训练增广和评测分开','增广样本成功不应提高原目标上的成功率。',(s,p)=>({evaluationSuccess:s.originalSuccess,augmentedTrainingPairs:2}))
  ]);
  // Underactuated Robotics: exact model assumptions before controller claims.
  add('underactuated-actuation',[R('torque','单个执行器力矩',-2,2,.5,1)], [
    step('写出两自由度单输入系统','教学质量矩阵M=[[2,1],[1,2]]，B=[0,1]；暂忽略重力和速度项。',(s,p)=>({mass:[[2,1],[1,2]],input:[0,p.torque],configurationDof:2,actuatorRank:1})),
    step('用输入矩阵判断欠驱动','rank(B)=1<2，因此不能独立指定任意两关节广义力。',(s,p)=>({underactuated:s.actuatorRank<s.configurationDof})),
    step('耦合质量矩阵使未驱动关节也加速','M逆为1/3[[2,−1],[−1,2]]，没有电机不等于不能运动。',(s,p)=>({acceleration:[-p.torque/3,2*p.torque/3]})),
    step('回代动力学核对','欠驱动不自动等于不可控；可控性还取决于动力学和工作点。',(s,p)=>({recoveredForce:[2*s.acceleration[0]+s.acceleration[1],s.acceleration[0]+2*s.acceleration[1]]}))
  ]);
  add('underactuated-pendulum',[R('angle','相对向下的摆角',-180,180,30,60,'度'),R('velocity','角速度',-2,2,.5,0),R('torque','力矩',-2,2,.5,0)], [
    step('先确定角度零点','m=l=1，g=9.81，θ=0向下，阻尼0.1；状态为[θ,ω]。',(s,p)=>({theta:p.angle*Math.PI/180,omega:p.velocity})),
    step('由力矩平衡求加速度','θddot=(u−bω−mgl sinθ)/(ml²)。非线性来自sinθ。',(s,p)=>({acceleration:p.torque-.1*s.omega-9.81*Math.sin(s.theta)})),
    step('计算相空间中的速度向量','相图箭头是(θdot,ωdot)，不同于摆球的空间速度。',(s,p)=>({stateDerivative:[s.omega,s.acceleration]})),
    step('算机械能并保留势能零点','向下势能为0，向上静止的能量是2mgl。',(s,p)=>({energy:.5*s.omega*s.omega+9.81*(1-Math.cos(s.theta))}))
  ]);
  add('underactuated-linearization',[R('deviation','相对向上偏角 δ',-.4,.4,.1,.1),R('gain','位置反馈增益 k',0,20,2,12)], [
    step('围绕向上平衡点定义小量','θ=π+δ，真实无阻尼摆的δddot=g sinδ+u。',(s,p)=>({delta:p.deviation,gravity:9.81})),
    step('比较非线性与线性重力项','sinδ≈δ仅在局部成立，向上平衡点的线性重力是正反馈。',(s,p)=>({nonlinear:s.gravity*Math.sin(s.delta),linear:s.gravity*s.delta})),
    step('加入位置负反馈','u=−kδ时线性位置系数为g−k，尚未加入速度阻尼。',(s,p)=>({control:-p.gain*s.delta,positionCoefficient:s.gravity-p.gain})),
    step('区分恢复力与渐近稳定','k>g产生恢复方向，但无阻尼不能据此宣称渐近稳定。',(s,p)=>({linearAcceleration:s.positionCoefficient*s.delta,restoring:p.gain>s.gravity,approximationError:s.nonlinear-s.linear}))
  ]);
  add('underactuated-lqr',[R('a','离散系统系数 a',.5,1.5,.1,1.1),R('r','输入代价 R',.5,2,.5,1)], [
    step('固定有限时域标量系统','x′=ax+u，状态代价Q=1，终端P_N=1，三步时域。',(s,p)=>({q:1,terminal:1,horizon:3})),
    step('反向Riccati递推','K=aP/(R+P)，P=Q+a²P−a²P²/(R+P)。',(s,p)=>{let P=s.terminal;const backwards=[];for(let k=2;k>=0;k--){const K=p.a*P/(p.r+P),next=1+p.a*p.a*P-p.a*p.a*P*P/(p.r+P);backwards.push({k,Pnext:P,K,P:next});P=next;}return {backwards,initialP:P};}),
    step('提取最初一步反馈','有限时域K随时间变化，不能取递推数组第一项当K0。',(s,p)=>({gain:s.backwards[s.backwards.length-1].K})),
    step('从x=1执行第一步','u=−Kx，闭环下一状态a−K；未加入输入饱和。',(s,p)=>({control:-s.gain,nextState:p.a-s.gain}))
  ]);
  add('underactuated-lyapunov',[R('x','当前状态 x',-2,2,.5,1),R('limit','状态域半径',.5,2,.5,1)], [
    step('给出非线性一维系统','xdot=−x+x³，候选V=x²/2，只在明确区域检查。',(s,p)=>({state:p.x,derivative:-p.x+p.x**3})),
    step('沿动力学求Vdot','Vdot=x×xdot=−x²+x⁴，V正不够，还要看导数。',(s,p)=>({value:p.x*p.x/2,valueDerivative:p.x*s.derivative})),
    step('比较单点检查与区域符号','0<|x|<1时Vdot<0；边界|x|=1导数0。',(s,p)=>({pointDecreasing:s.valueDerivative<0,strictDomain:p.limit<1})),
    step('陈述可支持的结论','本例可用代数在开区间(−1,1)论证收敛；有限点采样不是一般Lyapunov证明。',(s,p)=>({insideCertifiedRegion:Math.abs(p.x)<1,atTargetEquilibrium:p.x===0,atEquilibrium:Math.abs(s.derivative)<1e-12}))
  ]);
  add('underactuated-energy',[R('angle','向下为零的摆角',-180,180,30,90,'度'),R('velocity','角速度',-2,2,.5,1),R('limit','力矩上限',.5,3,.5,2)], [
    step('计算当前能量和向上目标能量','无阻尼，m=l=1，E*=2g；能量只有标量，不能决定完整相位。',(s,p)=>({theta:p.angle*Math.PI/180,energy:.5*p.velocity*p.velocity+9.81*(1-Math.cos(p.angle*Math.PI/180)),desired:19.62})),
    step('用能量差决定注入方向','选择u=k(E*−E)ω，k=0.5；下方比较饱和前后。',(s,p)=>({rawTorque:.5*(s.desired-s.energy)*p.velocity})),
    step('施加执行器饱和','只裁剪控制输入，真实系统能量变化仍由uω决定。',(s,p)=>({torque:H.clamp(s.rawTorque,-p.limit,p.limit)})),
    step('检查能量变化率和静止盲点','ω=0时此规则力矩为0，精确向下静止不会自己启动；接近向上通常需切换稳定器。',(s,p)=>({energyRate:s.torque*p.velocity,energyError:s.desired-s.energy,stalled:p.velocity===0}))
  ]);
  add('underactuated-collocation',[R('middle','中间状态 x1',0,1,.1,.5),R('control','恒定控制 u',0,2,.2,1)], [
    step('把连续问题变成节点与约束','xdot=u，节点时刻[0,0.5,1]，状态[0,x1,1]。',(s,p)=>({states:[0,p.middle,1],dt:.5,controls:[p.control,p.control,p.control]})),
    step('计算梯形离散的动力学缺陷','每段d=x_next−x−dt(u+u_next)/2；非零意味着轨迹不满足离散动力学。',(s,p)=>({defects:[p.middle-.5*p.control,1-p.middle-.5*p.control]})),
    step('积分控制代价','恒定输入时∫u²dt=u²；本例只是给定候选的评价，没有优化求解。',(s,p)=>({cost:p.control*p.control})),
    step('同时核对边界与缺陷','低代价但非零缺陷不可接受；网格可行也需要独立积分检查连续误差。',(s,p)=>({maxDefect:Math.max(...s.defects.map(Math.abs)),discreteFeasible:s.defects.every(x=>Math.abs(x)<1e-9)}))
  ]);
  add('underactuated-mpc',[R('state','测得状态 x',-2,2,.5,1),R('disturbance','首步外扰',-.5,.5,.25,.25)], [
    step('给出候选输入和预测模型','x′=x+u，单步成本(x+u)²+0.1u²，候选u∈[−1,0,1]。',(s,p)=>({actions:[-1,0,1]})),
    step('只用模型选择当前动作','穷举有限输入，是MPC思路的最小切片，不是连续求解器。',(s,p)=>({costs:s.actions.map(u=>(p.state+u)**2+.1*u*u)})),
    step('执行第一动作并测量新状态','真实新状态包含滑块外扰，不把预测值当测量。',(s,p)=>{const best=s.costs.indexOf(Math.min(...s.costs)),u=s.actions[best];return {action:u,predicted:p.state+u,measured:p.state+u+p.disturbance};}),
    step('基于新测量重新规划','每轮只执行当前控制，接着滚动；需另查约束可行性和求解时限。',(s,p)=>({nextCosts:s.actions.map(u=>(s.measured+u)**2+.1*u*u),predictionError:s.measured-s.predicted}))
  ]);
  // CS231n 2025: small tensors let every number be checked independently.
  add('cs231n-linear',[R('pixel','第一个归一化像素',0,1,.25,.5),R('bias','类别0偏置',-1,1,.5,0)], [
    step('先写清输入和权重的形状','两像素输入x=[p,1]，W为2类×2特征；示例不是可用图像识别器。',(s,p)=>({image:[p.pixel,1],weights:[[1,-1],[-1,1]],bias:[p.bias,0]})),
    step('矩阵乘法产生分数','类别分数可正可负，没有概率归一化。',(s,p)=>({scores:s.weights.map((w,i)=>H.dot(w,s.image)+s.bias[i])})),
    step('选分数最大的类别','平分时选类别0，输出类别索引从0开始。',(s,p)=>({classId:s.scores[0]>=s.scores[1]?0:1})),
    step('做一个独立输入扰动','翻转第一个像素，只改输入，不修改已训练权重。',(s,p)=>({changedImage:[1-p.pixel,1],changedScores:s.weights.map((w,i)=>H.dot(w,[1-p.pixel,1])+s.bias[i])}))
  ],s=>s.weights?matrix('两类线性分类器权重',s.weights):null);
  add('cs231n-softmax',[R('score','正确类别logit',-2,4,1,2),R('temperature','温度 T',.5,2,.5,1)], [
    step('固定标签并缩放logit','三类分数[score,1,0]，正确类别0；T只用于本例概率变换。',(s,p)=>({logits:[p.score,1,0],label:0})),
    step('稳定计算softmax','减最大值不改变概率，防止指数溢出。',(s,p)=>({probabilities:H.softmax(s.logits.map(x=>x/p.temperature))})),
    step('交叉熵只读取真类概率','单样本损失L=−log p_y，不能把最大概率都当作正确标签。',(s,p)=>({loss:-Math.log(s.probabilities[s.label])})),
    step('回传到原始logit','温度存在时梯度为(p−onehot)/T；忘记1/T会导致口径不一致。',(s,p)=>({gradient:s.probabilities.map((x,i)=>(x-Number(i===s.label))/p.temperature)}))
  ]);
  add('cs231n-backprop',[R('weight','权重 w',-1,2,.5,1),R('x','输入 x',-1,2,.5,2)], [
    step('展开一个带ReLU的计算图','z=wx−0.5，a=max(0,z)，标签1，损失(a−1)²/2。',(s,p)=>({preactivation:p.weight*p.x-.5})),
    step('先完成前向损失','激活为0时仍有损失，不能据此认为梯度必非零。',(s,p)=>({activation:Math.max(0,s.preactivation),loss:(Math.max(0,s.preactivation)-1)**2/2})),
    step('按链式法则反向求导','ReLU在0不可导，本例采用导数0的约定。',(s,p)=>({gradient:(s.activation-1)*(s.preactivation>0?1:0)*p.x})),
    step('用独立差分检查光滑点','若正好z=0，中心差分不应当成所选次梯度的正确性判据。',(s,p)=>{const f=w=>(Math.max(0,w*p.x-.5)-1)**2/2,h=1e-5;return {numerical:(f(p.weight+h)-f(p.weight-h))/(2*h),smooth:Math.abs(s.preactivation)>Math.abs(p.x*h)};})
  ]);
  add('cs231n-convolution',[R('center','中心像素',0,4,1,1)], [
    step('固定图像、卷积核与边界','3×3单通道，2×2核[[1,0],[0,−1]]，stride1且无padding。',(s,p)=>({image:[[1,2,3],[0,p.center,2],[1,0,1]],kernel:[[1,0],[0,-1]]})),
    step('滑动做互相关','深度学习常称卷积的运算不翻转核，本例明确使用互相关。',(s,p)=>({output:[0,1].map(i=>[0,1].map(j=>H.sum([0,1].flatMap(a=>[0,1].map(b=>s.image[i+a][j+b]*s.kernel[a][b])))))})),
    step('对每个输出应用ReLU','通道数与空间尺寸不同；加一个滤波器会增加输出通道。',(s,p)=>({activated:s.output.map(row=>row.map(x=>Math.max(0,x)))})),
    step('进行2×2最大池化','此池化覆盖整个2×2输出；池化没有本例可学习权重。',(s,p)=>({pooled:Math.max(...s.activated.flat()),outputWidth:2,sharedParameters:4}))
  ],s=>matrix(s.output?'互相关输出':'输入图像',s.output||s.image));
  add('cs231n-residual',[R('x','输入激活 x',-2,2,.5,1),R('scale','残差分支系数 w',-1,1,.5,.5)], [
    step('区分直接映射与残差映射','标量分支F(x)=wx，输出y=x+F(x)，两项必须形状一致。',(s,p)=>({input:p.x,residual:p.scale*p.x})),
    step('合并快捷连接','输出的变化由实际输入和分支决定，没有增加装饰流动。',(s,p)=>({output:s.input+s.residual})),
    step('比较输入梯度路径','直接分支dy/dx=w；加快捷连接后是1+w。',(s,p)=>({plainGradient:p.scale,residualGradient:1+p.scale})),
    step('检查抵消反例','w=−1时1+w=0，快捷连接不是任意参数下梯度永不消失的保证。',(s,p)=>({gradientCanceled:Math.abs(s.residualGradient)<1e-9}))
  ]);
  add('cs231n-attention',[R('query','第一个patch的query',0,2,.5,1)], [
    step('把三个patch特征列出','标量Key=[1,0,−1]、Value=[2,4,6]，只计算一个query。',(s,p)=>({keys:[1,0,-1],values:[2,4,6]})),
    step('计算全局匹配分数','特征维度d=1，不再额外除√d；此例无位置编码。',(s,p)=>({scores:s.keys.map(k=>p.query*k)})),
    step('对所有patch归一化','图像分类自注意力通常可双向查看；这里没有因果遮罩。',(s,p)=>({weights:H.softmax(s.scores)})),
    step('加权汇总不同位置的信息','注意力可跨远距离，但权重并不是像素因果解释。',(s,p)=>({output:H.dot(s.weights,s.values)}))
  ]);
  add('cs231n-detection',[R('offset','第二框水平位移',0,2,.5,1),R('threshold','NMS IoU阈值',.1,.9,.1,.5)], [
    step('声明同类别的两个检测框','A=[0,0,2,2]、B=[d,0,d+2,2]，分数分别0.9和0.8。',(s,p)=>({a:[0,0,2,2],b:[p.offset,0,p.offset+2,2],scores:[.9,.8]})),
    step('先求交集再求并集','坐标为连续边界，面积公式没有像素整数坐标中的+1。',(s,p)=>({intersection:Math.max(0,2-p.offset)*2})),
    step('计算IoU','交并比衡量框重叠，不等于分类置信度。',(s,p)=>({union:8-s.intersection,iou:s.intersection/(8-s.intersection)})),
    step('执行一次同类硬NMS','先保留A，仅在IoU大于阈值时抑制B；跨类策略需另说明。',(s,p)=>({kept:s.iou>p.threshold?[0]:[0,1],suppressed:s.iou>p.threshold}))
  ],s=>s.a?xy('检测框位置',[[[0,0],[2,0],[2,2],[0,2],[0,0]],[[s.b[0],0],[s.b[2],0],[s.b[2],2],[s.b[0],2],[s.b[0],0]]]):null);
  add('cs231n-transfer',[R('head','分类头特征权重',0,2,.5,1),S('split','验证划分',[['group','按对象分组'],['row','同对象跨集合']],'group')], [
    step('固定特征提取器，训练新任务头','特征[1,2,3,4]由人工给出；这里没有加载预训练网络。',(s,p)=>({features:[1,2,3,4],groups:['A','A','B','B'],labels:[0,0,1,1]})),
    step('用新的线性头做分类','阈值2.5固定，预测feature×head≥2.5为类1。',(s,p)=>({predictions:s.features.map(x=>Number(x*p.head>=2.5))})),
    step('核对验证是否覆盖未见对象','按行交替让A/B均跨集合，会污染面向新对象的评价。',(s,p)=>({train:p.split==='group'?[0,1]:[0,2],validation:p.split==='group'?[2,3]:[1,3],groupLeak:p.split==='row'})),
    step('同时报告误差和划分限制','小数据准确率只是核对流程；不证明迁移学习效果或泛化。',(s,p)=>({validationAccuracy:H.mean(s.validation.map(i=>Number(s.predictions[i]===s.labels[i]))),independentGroups:!s.groupLeak}))
  ]);
  // Arduino Uno R3 teaching values. No GPIO operations occur in these models.
  add('arduino-led',[R('resistance','串联电阻',220,1000,20,220,'Ω'),R('drop','LED正向压降（教学值）',1.8,3.2,.2,2)], [
    step('把板卡和电路条件写清','仅以Uno R3的5V理想电源、串联LED和电阻为例；真实引脚压降、额定值另核对。',(s,p)=>({supply:5,ledDrop:p.drop,resistance:p.resistance})),
    step('求电阻两端电压','电阻与LED串联，不能把5V全部算在电阻上。',(s,p)=>({resistorVoltage:s.supply-s.ledDrop})),
    step('由欧姆定律求电流','显示mA时将A乘1000，不能混用单位。',(s,p)=>({currentAmp:s.resistorVoltage/s.resistance,currentMilliamp:1000*s.resistorVoltage/s.resistance})),
    step('算电阻消耗功率','估算功耗并核对元件与板卡规格；模型计算不是实物测量。',(s,p)=>({resistorWatt:s.currentAmp*s.currentAmp*s.resistance}))
  ]);
  add('arduino-input',[S('pressed','按键状态',[['yes','按下'],['no','松开']],'no'),S('pullup','上拉电阻',[['yes','使用INPUT_PULLUP'],['no','未设置且无外部偏置']],'yes')], [
    step('明确按钮接地和上拉电路','按钮闭合连接GND；松开时由上拉保持高电平。',(s,p)=>({pressed:p.pressed==='yes',pullup:p.pullup==='yes'})),
    step('保持浮空输入未知','无上拉且按钮松开时电平不确定，不能伪造为LOW。',(s,p)=>({raw:s.pressed?0:s.pullup?1:null})),
    step('将低有效电平转成语义','pressed=(raw==LOW)，未知电平继续保持null。',(s,p)=>({logicalPressed:s.raw===null?null:s.raw===0})),
    step('列出可核对的真值行','此处没有消抖，真实机械按钮可能产生多次边沿。',(s,p)=>({known:s.raw!==null,led:s.logicalPressed===null?'未知':s.logicalPressed?'开':'关'}))
  ]);
  add('arduino-adc',[R('raw','10位ADC读数',0,1023,1,512),R('reference','参考电压（实测或设定）',3,5,.5,5)], [
    step('固定ADC分辨率与板卡','Uno R3以10位代码0–1023为例；ESP32的位宽、参考和衰减另按板卡核对。',(s,p)=>({raw:p.raw,maxCode:1023,reference:p.reference})),
    step('计算端点线性标定值','本例使用V=code×Vref/1023的端点映射；不能等同精确ADC传输函数。',(s,p)=>({voltage:s.raw*s.reference/s.maxCode})),
    step('给出量化步距','理想10位ADC的区间步距为Vref/1024，跟端点映射分母区分。',(s,p)=>({lsb:s.reference/1024})),
    step('按分压比还原外部值','假设已核对的等阻分压比1/2；此算例不授权把超限电压接到引脚。',(s,p)=>({sourceVoltage:2*s.voltage,quantizationOnly:2*s.lsb}))
  ]);
  add('arduino-pwm',[R('code','analogWrite代码',0,255,1,128),R('frequency','教学PWM频率',100,1000,100,500,'Hz')], [
    step('区分开关输出和模拟电压','Uno R3的8位PWM代码0–255；所选频率是教学输入，不是特定引脚默认值。',(s,p)=>({code:p.code,supply:5})),
    step('换算占空比','用code/255作端点占空比模型，0关、255持续开。',(s,p)=>({duty:s.code/255,period:1/p.frequency})),
    step('计算高低电平时长','改变占空比不自动改变电源幅值；高电平仍为板卡逻辑电平。',(s,p)=>({onTime:s.duty*s.period,offTime:(1-s.duty)*s.period})),
    step('区分理想平均值和负载响应','5×duty是理想时间平均，电机转速、LED亮度和滤波电压并非都与之线性对应。',(s,p)=>({idealAverage:5*s.duty}))
  ]);
  add('arduino-timing',[R('interval','任务间隔',100,500,100,200,'ms'),R('elapsed','距离上次运行的时间',0,600,100,300,'ms')], [
    step('让计时跨越32位回绕','last=2³²−100，now由last+elapsed模2³²得到。Arduino侧使用unsigned long。',(s,p)=>({last:4294967196,now:(4294967196+p.elapsed)>>>0})),
    step('使用无符号时间差','(now−last)模2³²；条件要求实际间隔未跨越整个计数周期。',(s,p)=>({difference:(s.now-s.last)>>>0})),
    step('达到间隔才运行一次任务','没有delay，其他传感器或通信步骤可继续执行；本例不补跑所有漏掉周期。',(s,p)=>({due:s.difference>=p.interval})),
    step('更新时间基准','last=now避免积压补跑；last+=interval是另一种节拍策略，必须明确区别。',(s,p)=>({nextLast:s.due?s.now:s.last,executions:s.due?1:0}))
  ]);
  add('arduino-debounce',[R('quiet','稳定时间门槛',10,50,10,20,'ms')], [
    step('提供一次有抖动的按键采样','低有效原始序列，采样时刻[0,5,10,15,40,70]ms，电平[1,0,1,0,0,0]。',(s,p)=>({times:[0,5,10,15,40,70],raw:[1,0,1,0,0,0]})),
    step('跟踪候选电平的持续时间','每次原始电平变动重置候选起点；只在当前采样时判断稳定时间。',(s,p)=>{let candidate=1,since=0,stable=1;const history=[],presses=[];s.times.forEach((t,i)=>{if(s.raw[i]!==candidate){candidate=s.raw[i];since=t;}if(candidate!==stable&&t-since>=p.quiet){stable=candidate;if(stable===0)presses.push(t);}history.push({t,candidate,stable,since});});return {history,presses};}),
    step('只把稳定下降沿算成一次按下','长按持续LOW不重复触发切换。',(s,p)=>({pressCount:s.presses.length})),
    step('比较原始边沿与稳定事件','滤波门槛增加响应延迟；采样稀疏还可能漏掉短按。',(s,p)=>({rawFallingEdges:s.raw.filter((v,i)=>i>0&&s.raw[i-1]===1&&v===0).length,firstConfirmed:s.presses[0]??null}))
  ]);
  add('arduino-actuator',[R('angle','舵机目标角（教学）',0,180,30,90),R('current','负载电流（教学）',.1,1,.1,.5),R('resistance','驱动等效电阻',.2,1,.2,.4)], [
    step('把控制信号和供电分开','舵机使用周期脉冲信号，电机经合适驱动和独立供电；共地与器件规格需实物核对。',(s,p)=>({angle:p.angle,current:p.current})),
    step('用教学标定映射脉宽','本例0–180°映射1000–2000μs，实际舵机范围必须重新标定。',(s,p)=>({pulseMicroseconds:1000+s.angle/180*1000})),
    step('估算驱动导通损耗','I²R只包含等效导通损耗，不含启动、堵转、开关和热阻模型。',(s,p)=>({voltageDrop:p.current*p.resistance,conductionWatt:p.current*p.current*p.resistance})),
    step('报告控制和功率的不同单位','PWM代码、舵机脉宽、驱动功耗不得互换；本页没有驱动实际设备。',(s,p)=>({signal:'脉宽 μs',power:'外部驱动与供电核对'}))
  ]);
  add('arduino-project',[R('distance','测得距离',5,50,5,20,'cm'),S('sensor','传感器状态',[['valid','有效'],['timeout','超时']],'valid'),S('enable','人工使能',[['yes','允许'],['no','关闭']],'yes')], [
    step('先定义输入有效性和目标','教学桌面小项目：距离小于15cm停止；大于等于15cm且使能才允许运动。',(s,p)=>({distance:p.sensor==='valid'?p.distance:null,enabled:p.enable==='yes'})),
    step('无效观测不当作0或远处','超时没有可用距离，应独立进入停止分支。',(s,p)=>({known:s.distance!==null})),
    step('按显式规则决定输出','只是逻辑演练，不代替独立急停、驱动限流或硬件验证。',(s,p)=>({run:s.known&&s.enabled&&s.distance>=15})),
    step('保留导致输出的原因','区分传感器失效、未使能、过近和满足条件，以便串口排错。',(s,p)=>({pwm:s.run?100:0,reason:!s.known?'传感器超时':!s.enabled?'人工关闭':s.distance<15?'障碍过近':'允许本例运行'}))
  ]);
  // HF Robotics onboarding + public LeRobot documentation, not unpublished units.
  add('lerobot-schema',[S('action','动作字段',[['valid','维度与单位齐全'],['missing','缺少一个关节']],'valid'),S('unit','动作单位',[['rad','弧度'],['degree','角度但未转换']],'rad')], [
    step('把观测和动作契约写清','本站迷你记录：state与action均应含两个关节，单位rad；不是LeRobotDataset完整文件格式。',(s,p)=>({state:[.1,.2],action:p.action==='valid'?[.2,.3]:[.2],requiredDof:2,unit:p.unit})),
    step('检查维度和有限值','字段存在还不够，NaN、顺序、名称和单位也要一致。',(s,p)=>({shapeValid:s.action.length===s.requiredDof,finite:s.action.every(Number.isFinite)})),
    step('把单位校验独立列出','数字很小不能证明是弧度，必须来自元数据和采集约定。',(s,p)=>({unitValid:s.unit==='rad'})),
    step('报告输入是否允许进入训练','仅校验本例字段，不声称已通过官方数据集解析器。',(s,p)=>({accepted:s.shapeValid&&s.finite&&s.unitValid}))
  ]);
  add('lerobot-time',[R('delay','相机相对状态时间偏移',0,.2,.05,.05),R('tolerance','允许配对时间差',0,.1,.025,.05)], [
    step('各传感器保留原时间戳','关节状态时刻[0,0.1,0.2]，相机时刻加偏移；单一时钟且单位秒。',(s,p)=>({stateTimes:[0,.1,.2],cameraTimes:[p.delay,.1+p.delay,.2+p.delay]})),
    step('对每个状态选择最近相机帧','平分时选较早索引；离线最近邻可用到未来帧，不能直接当在线因果对齐。',(s,p)=>({matches:s.stateTimes.map(t=>{const ds=s.cameraTimes.map(c=>Math.abs(c-t));let i=0;for(let j=1;j<ds.length;j++)if(ds[j]<ds[i]-1e-9)i=j;return {state:t,camera:s.cameraTimes[i],index:i,error:ds[i]};})})),
    step('检查时间容差与未来帧','保留误差并标记未来信息，拒绝静默配错。',(s,p)=>({valid:s.matches.map(m=>m.error<=p.tolerance+1e-9),future:s.matches.map(m=>m.camera>m.state+1e-9)})),
    step('分别报告可配对和在线可用','通过离线时间容差不自动满足在线因果约束。',(s,p)=>({acceptedCount:s.valid.filter(Boolean).length,causalCount:s.matches.filter((m,i)=>s.valid[i]&&!s.future[i]).length}))
  ]);
  add('lerobot-episodes',[S('split','划分单位',[['episode','按episode'],['frame','按frame交替']],'episode')], [
    step('保留回合和时间身份','四帧来自episode A与B，每回合两帧。相邻帧高度相关。',(s,p)=>({episodes:['A','A','B','B'],frameIndex:[0,1,0,1]})),
    step('先划分再拟合统计量','只在训练回合估计动作/状态标准化统计，不读取保留集。',(s,p)=>({train:p.split==='episode'?[0,1]:[0,2],validation:p.split==='episode'?[2,3]:[1,3]})),
    step('检查回合是否跨边界','按帧随机切分可能把同一次演示泄漏到两侧。',(s,p)=>({overlap:[...new Set(s.train.map(i=>s.episodes[i]))].filter(e=>s.validation.some(i=>s.episodes[i]===e))})),
    step('保留进一步独立性的要求','按episode只是第一步，任务、场景、物体和操作者也可能需要分组。',(s,p)=>({episodeIndependent:s.overlap.length===0,trainingFrames:s.train.length,validationFrames:s.validation.length}))
  ]);
  add('lerobot-normalization',[R('validation','保留样本的动作',4,10,2,8),S('fit','统计量使用范围',[['train','仅训练'],['all','错误地合并保留样本']],'train')], [
    step('先固定训练和保留样本','训练动作[0,2,4]，保留动作由滑块给出；本例使用总体标准差ddof=0。',(s,p)=>({train:[0,2,4],validation:p.validation})),
    step('只从允许的数据拟合中心和尺度','all模式故意展示泄漏反例，不是建议。',(s,p)=>{const fit=p.fit==='train'?s.train:s.train.concat([s.validation]),center=H.mean(fit),scale=Math.sqrt(H.mean(fit.map(x=>(x-center)**2)));return {center,scale};}),
    step('同一变换应用到保留样本','验证分布不同可以产生较大z值，不应重新拟合来掩盖差异。',(s,p)=>({normalized:(s.validation-s.center)/s.scale})),
    step('用逆变换核对单位恢复','输出策略动作必须用同一版本统计量反归一化；此处不加载官方processor。',(s,p)=>({recovered:s.normalized*s.scale+s.center,leaked:p.fit==='all'}))
  ]);
  add('lerobot-bc',[R('weight','策略参数 w',0,2,.5,1),R('rate','步长',.05,.2,.05,.1)], [
    step('声明训练样本和回合级保留集','训练观测[0,1,2]，动作[0,2,4]；保留观测3，动作6。',(s,p)=>({observations:[0,1,2],actions:[0,2,4],heldOut:[3,6]})),
    step('拟合一个线性行为策略','采用平均半平方误差；这不是ACT或视觉策略网络。',(s,p)=>({errors:s.observations.map((o,i)=>p.weight*o-s.actions[i])})),
    step('只用训练数据更新','保持保留动作6不参与梯度。',(s,p)=>({gradient:H.mean(s.errors.map((e,i)=>e*s.observations[i])),trainingLoss:H.mean(s.errors.map(e=>e*e))/2})),
    step('更新后独立评价一次','离线动作误差不能代替闭环任务成功率，也不证明真实LeRobot训练环境可运行。',(s,p)=>({weight:p.weight-p.rate*s.gradient,heldOutError:(p.weight-p.rate*s.gradient)*s.heldOut[0]-s.heldOut[1]}))
  ]);
  add('lerobot-chunks',[R('execute','每次执行的动作数',1,4,1,2),R('latency','策略计算耗时',20,100,20,60,'ms')], [
    step('区分预测长度和执行长度','策略一次预测4个动作[0.1,0.2,0.3,0.4]，控制周期20ms。',(s,p)=>({chunk:[.1,.2,.3,.4],controlPeriod:20})),
    step('每次只提交前k个动作','剩余动作可能被下一次重规划替代；并非预测多少就全部执行。',(s,p)=>({executed:s.chunk.slice(0,p.execute),coverage:p.execute*s.controlPeriod})),
    step('比较覆盖时间和计算延迟','本例同步预算，覆盖不足会产生空档；真实ACT时序和异步系统另查实现。',(s,p)=>({gap:Math.max(0,p.latency-s.coverage),slack:s.coverage-p.latency})),
    step('陈述时序与任务表现的不同','无空档不保证动作正确；长执行块会降低反馈更新频率。',(s,p)=>({noGap:s.gap===0,feedbackInterval:s.coverage}))
  ]);
  add('lerobot-rollout',[R('command','策略关节目标',-2,2,.5,1),R('current','当前关节位置',-1,1,.5,0),S('fresh','观测是否新鲜',[['yes','新鲜'],['no','已过期']],'yes')], [
    step('先检查动作契约和当前状态','教学关节范围[−1,1]，单周期最大变化0.2；不调用机器人接口。',(s,p)=>({command:p.command,current:p.current,fresh:p.fresh==='yes'})),
    step('分开检查位置和变化率','策略直接输出与可执行动作不同；超界只报告，不悄悄当作原动作成功。',(s,p)=>({positionValid:s.command>=-1&&s.command<=1,delta:s.command-s.current})),
    step('决定是否允许提交','迟到观测拒绝提交；真实系统还需急停、驱动保护和回执。',(s,p)=>({allowed:s.fresh&&s.positionValid&&Math.abs(s.delta)<=.2+1e-9})),
    step('保留失败原因','模型门控用于讲解接口条件，没有证明任何真实设备控制策略安全。',(s,p)=>({submitted:false,reason:!s.fresh?'观测过期':!s.positionValid?'位置超界':Math.abs(s.delta)>.2+1e-9?'单周期变化过大':'通过教学检查，未实际提交'}))
  ]);
  add('lerobot-evaluation',[R('successes','20回合中的成功数',0,20,1,14),R('baseline','同条件基线成功数',0,20,1,10)], [
    step('先固定回合级任务成功定义','独立场景共20回合；成功不是低训练损失，也不是一帧动作接近示范。',(s,p)=>({episodes:20,successes:p.successes,baseline:p.baseline})),
    step('比较相同条件的成功率','输入为教学计数，未执行仿真或真机；统计比较要求场景条件一致。',(s,p)=>({rate:s.successes/s.episodes,baselineRate:s.baseline/s.episodes})),
    step('给成功率附上不确定性','Wilson95%区间用于说明有限样本；两区间重叠与否不是正式差异检验。',(s,p)=>({interval:H.wilson(s.successes,s.episodes),baselineInterval:H.wilson(s.baseline,s.episodes)})),
    step('按预先约定报告效果差异','本例仅报告百分点差，不宣称统计显著、现实可靠或用户已经完成训练。',(s,p)=>({difference:s.rate-s.baselineRate,percentagePoints:100*(s.rate-s.baselineRate)}))
  ]);
  function register(M){if(!M||typeof M.register!=='function')throw Error('需要共享教学模型API');for(const [id,d] of Object.entries(defs))M.register(id,d.params,p=>run(id,p));return M;}
  return {register,example,definitions:defs,helpers:H};
});
