/* Nav2 teaching calculations. No ROS, costmap plugin, action server or records are executed. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const f=x=>Number(x).toFixed(4);
  const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=1e-10;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const last=t=>t.steps[t.steps.length-1].variables;
  const cell=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note:note+' 数值显示四位小数，实际核对保留完整精度。'});
  function frame(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index)||0)));return {i,s:t.steps[i].variables,p:t.params,step:t.steps[i]};}
  function view(t,i,cells,assumption){return {title:t.steps[i].title+' · 逐格核对',summary:'当前第'+(i+1)+'个实际计算快照。'+assumption+' 本页仅为离线教学算术/有限规则，不等同真实 Nav2 / ROS / Gazebo 执行，不产生学习完成或用时证据。',cells};}
  const experiment=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const models={};

  models['nav2-lifecycle']={
    intuition:'把配置资源、激活依赖和目标受理分开：节点存在不等于 active，inactive 也不是故障。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[cell('initial-state','初始生命周期状态',s.states[0],`启动 → ${s.states[0]}`,{state:s.states[0]},'模型的初始约定，尚未配置或激活。'),cell('initial-active','初始服务激活标志',s.active,'active := false',{active:s.active},'false 是当前状态，不从后续目标受理反推。')];
      else if(i===1)cells=[cell('configuration-gate','参数有效门控',s.configured,`${p.configured} === yes → ${s.configured}`,{configuredInput:p.configured},'这是人工输入的教学门控；真实配置由服务回执决定。'),cell('configuration-state','配置后的状态',s.states[1],`${s.states[0]} + configure(${p.configured}) → ${s.states[1]}`,{previous:s.states[0],configured:s.configured},'有效进入 inactive；无效保留 unconfigured。'),cell('not-yet-active','配置阶段尚未激活',s.active,'只配置资源；active 保持 false',{active:s.active},'此帧还没有执行依赖门控，不预报激活结果。')];
      else if(i===2)cells=[cell('activation-gate','两个激活条件同时满足',s.active,`${s.configured} AND (${p.sensor} === yes) = ${s.active}`,{configured:s.configured,sensorInput:p.sensor},'只有配置通过且传感器就绪才激活。'),cell('activation-transition','当前状态转换',s.states[2],`${s.states[1]} → (${s.active} ? active : blocked) = ${s.states[2]}`,{previous:s.states[1],active:s.active},'blocked 为本例说明标签，不是新增的 ROS 生命周期主状态。')];
      else cells=[cell('configuration-count','已满足的配置条件',Number(s.configured),`Number(${s.configured}) = ${f(Number(s.configured))}`,{configured:s.configured},'仅统计一个布尔条件。'),cell('sensor-count','已满足的传感器条件',Number(p.sensor==='yes'),`Number(${p.sensor} === yes) = ${f(Number(p.sensor==='yes'))}`,{sensorInput:p.sensor},'这是输入条件计数，不是传感器健康测量。'),cell('ready-count','已满足条件总数',s.readyCount,`${f(Number(s.configured))} + ${f(Number(p.sensor==='yes'))} = ${f(s.readyCount)}`,{configured:s.configured,sensorInput:p.sensor},'readyCount 可为 1，但目标仍可能被拒绝。'),cell('accept-goal','教学目标受理条件',s.acceptGoal,`acceptGoal := active = ${s.active}`,{active:s.active},'没有连接 Lifecycle Manager 或 Action Server；本值不证明真实目标已受理。')];
      return view(t,i,cells,'只解释原模型的配置/传感器门控和已生成状态。');
    },
    experiments:[
      experiment('wait-for-sensor','只把传感器由就绪改为未就绪','配置状态仍为 inactive，但激活、目标受理由 true 变 false，条件数由2变1。',{configured:'yes',sensor:'yes'},{configured:'yes',sensor:'no'},'配置成功不代表依赖就绪；后者阻止激活。',(a,b)=>{const x=last(a),y=last(b);return x.configured===true&&y.configured===true&&same(x.states,['unconfigured','inactive','active'])&&same(y.states,['unconfigured','inactive','blocked'])&&x.active===true&&y.active===false&&x.acceptGoal===true&&y.acceptGoal===false&&x.readyCount===2&&y.readyCount===1;}),
      experiment('reject-invalid-config','只把参数配置改为无效','传感器就绪不变，配置失败使状态保留 unconfigured，随后阻止激活。',{configured:'yes',sensor:'yes'},{configured:'no',sensor:'yes'},'激活要求两个条件同时满足，不能以传感器就绪代替配置成功。',(a,b)=>{const x=last(a),y=last(b);return x.configured===true&&y.configured===false&&same(y.states,['unconfigured','unconfigured','blocked'])&&x.acceptGoal===true&&y.acceptGoal===false&&x.readyCount===2&&y.readyCount===1;})
    ]
  };

  models['nav2-tf']={
    intuition:'相同时间、同一方向的一维平移可相加；坐标算得出和时间上可用是两次独立检查。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[...s.chain.slice(0,-1).map((name,j)=>cell('chain-edge-'+j,'坐标链第'+(j+1)+'段',name+' → '+s.chain[j+1],`${name} → ${s.chain[j+1]}`,{parent:name,child:s.chain[j+1]},'此帧声明链结构，不证明已发布或可查询。')),cell('laser-offset','laser 相对 base_link 的安装平移',s.laserOffset,`x_base←laser := ${f(s.laserOffset)} m`,{laserOffset:s.laserOffset},'假定各坐标轴同向且无旋转。')];
      else if(i===1)cells=[cell('base-map','base_link 在 map 中的中间平移',p.mapOdom+p.odomBase,`${f(p.mapOdom)} + ${f(p.odomBase)} = ${f(p.mapOdom+p.odomBase)} m`,{mapOdom:p.mapOdom,odomBase:p.odomBase},'这是当前复合加法的中间项，尚未加激光安装偏移。'),cell('laser-map','laser 原点在 map 中的位置',s.laserMap,`${f(p.mapOdom)} + ${f(p.odomBase)} + ${f(s.laserOffset)} = ${f(s.laserMap)} m`,{mapOdom:p.mapOdom,odomBase:p.odomBase,laserOffset:s.laserOffset},'仅为一维纯平移切片；旋转需用有序矩阵乘法。')];
      else if(i===2)cells=[cell('endpoint-map','观测端点转换到 map',s.endpointMap,`${f(s.laserMap)} + 2.0000 = ${f(s.endpointMap)} m`,{laserMap:s.laserMap,endpointLaser:2},'端点在 laser 中 x=2m；加法假设坐标链同向且在同一时刻。')];
      else cells=[cell('age-margin','距离教学时效阈值的余量',.3-s.ageSeconds,`0.3000 − ${f(s.ageSeconds)} = ${f(.3-s.ageSeconds)} s`,{ageSeconds:s.ageSeconds,threshold:.3},'这里只给年龄差，没有绝对查询时间戳或缓存区间。'),cell('fresh-gate','是否满足包含等号的阈值',s.fresh,`${f(s.ageSeconds)} ≤ 0.3000 → ${s.fresh}`,{ageSeconds:s.ageSeconds,threshold:.3},'0.3s 是此算例约定，不是 Nav2 或 tf2 统一默认值。'),cell('usable-gate','本例时间条件是否可用',s.usable,`${f(s.ageSeconds)} ≤ 0.3000 → ${s.usable}`,{ageSeconds:s.ageSeconds,endpointMap:s.endpointMap},'原模型保留已算空间候选；usable=false 不会删除坐标，但不能据此声称适合真实控制。')];
      return view(t,i,cells,'一维同向平移链；时间门控直到最后一帧才计算。');
    },
    experiments:[
      experiment('expire-transform','只把 TF 年龄从0.2s改为0.4s','空间位置不变，fresh 与 usable 从允许变为拒绝。',{mapOdom:.5,odomBase:1,age:.2},{mapOdom:.5,odomBase:1,age:.4},'阈值仅检查时效，不改变已经算出的几何位置。',(a,b)=>{const x=last(a),y=last(b);return near(x.laserMap,1.7)&&near(y.laserMap,1.7)&&near(x.endpointMap,3.7)&&near(y.endpointMap,3.7)&&x.fresh===true&&x.usable===true&&y.fresh===false&&y.usable===false&&near(x.ageSeconds,.2)&&near(y.ageSeconds,.4);}),
      experiment('shift-map-origin','只把 map→odom 的平移增加0.5m','laser 与观测端点的 map 坐标都增加0.5m，时效判断不变。',{mapOdom:0,odomBase:1,age:.2},{mapOdom:.5,odomBase:1,age:.2},'平移链中一个加数增加多少，后续同向坐标就增加多少。',(a,b)=>{const x=last(a),y=last(b);return near(x.laserMap,1.2)&&near(y.laserMap,1.7)&&near(x.endpointMap,3.2)&&near(y.endpointMap,3.7)&&x.fresh===true&&y.fresh===true&&near(x.ageSeconds,y.ageSeconds);})
    ]
  };

  models['nav2-localization']={
    intuition:'先用格心而非格角换算地图坐标，再减去同一 map 坐标下的给定位姿；它不运行 AMCL。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[cell('column','读取地图列号',s.column,`i := ${f(p.cell)} = ${f(s.column)}`,{cell:p.cell},'一维列号，原点朝向固定为零。'),cell('resolution','读取每格长度',s.resolution,`r := ${f(p.resolution)} m/cell`,{resolution:p.resolution},'分辨率是每格米数，不是地图宽度。'),cell('origin','读取 map 原点平移',s.origin,`o := ${f(p.origin)} m`,{origin:p.origin},'本例忽略二维行号和地图原点旋转。')];
      else if(i===1)cells=[cell('center-index','格心相对列坐标',s.column+.5,`${f(s.column)} + 0.5000 = ${f(s.column+.5)} cell`,{column:s.column,halfCell:.5},'加半格以选格心，格角则没有此项。'),cell('center-offset','格心相对地图原点的长度',(s.column+.5)*s.resolution,`(${f(s.column)} + 0.5000) × ${f(s.resolution)} = ${f((s.column+.5)*s.resolution)} m`,{column:s.column,resolution:s.resolution},'当前 world 计算的乘法项。'),cell('world','格心的 map 坐标',s.world,`${f(s.origin)} + (${f(s.column)} + 0.5000) × ${f(s.resolution)} = ${f(s.world)} m`,{origin:s.origin,column:s.column,resolution:s.resolution},'这是目标栅格位置，不是机器人定位结果。')];
      else if(i===2)cells=[cell('initial-pose','给定初始机器人位置',s.initialPose,`x_initial := ${f(s.initialPose)} m`,{initialPose:s.initialPose},'固定教学先验，不是在线定位观测。'),cell('correction','给定的独立修正',s.correction,`Δx := ${f(s.correction)} m`,{correction:s.correction},'没有粒子、权重、滤波或传感器处理。'),cell('localized-pose','修正后的教学机器人位置',s.localizedPose,`${f(s.initialPose)} + (${f(s.correction)}) = ${f(s.localizedPose)} m`,{initialPose:s.initialPose,correction:s.correction},'原计算直接给定0.1，等于本例先验与修正之和；不声称 AMCL 已收敛。')];
      else cells=[cell('relative-goal','机器人到格心目标的有符号位移',s.relativeGoal,`${f(s.world)} − ${f(s.localizedPose)} = ${f(s.relativeGoal)} m`,{world:s.world,localizedPose:s.localizedPose},'两个坐标都在 map 中；负值表示目标在机器人左侧。'),cell('round-trip-coordinate','反算连续栅格坐标',(s.world-p.origin)/p.resolution,`(${f(s.world)} − (${f(p.origin)})) / ${f(p.resolution)} = ${f((s.world-p.origin)/p.resolution)} cell`,{world:s.world,origin:p.origin,resolution:p.resolution},'格心对应 i+0.5，不能把连续坐标直接当整数列。'),cell('round-trip-cell','反算所属栅格列',s.cellRoundTrip,`floor((${f(s.world)} − (${f(p.origin)})) / ${f(p.resolution)}) = ${f(s.cellRoundTrip)}`,{world:s.world,origin:p.origin,resolution:p.resolution},'floor 将格心映回原列；不是四舍五入。')];
      return view(t,i,cells,'原点无旋转的一维格心换算，机器人位置修正是固定算例。');
    },
    experiments:[experiment('move-two-cells','只把地图列号从4移到6','分辨率0.1m不变，格心与相对目标都增加0.2m，机器人教学位置不变。',{cell:4,resolution:.1,origin:-1},{cell:6,resolution:.1,origin:-1},'两格乘每格0.1m得到0.2m，反算列号相应为4与6。',(a,b)=>{const x=last(a),y=last(b);return near(x.world,-.55)&&near(y.world,-.35)&&near(x.relativeGoal,-.65)&&near(y.relativeGoal,-.45)&&near(x.localizedPose,.1)&&near(y.localizedPose,.1)&&x.cellRoundTrip===4&&y.cellRoundTrip===6;})]
  };

  models['nav2-costmap']={
    intuition:'比较通道净宽、圆形外轮廓和额外缓冲：几何容得下与满足规划偏好可以给出不同答案。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[cell('corridor-width','两侧障碍之间的通道净宽',s.width,`W := ${f(s.width)} m`,{width:s.width},'固定通道，机器人用圆形 footprint 近似。'),cell('diameter','圆形机器人直径',s.diameter,`2.0000 × ${f(p.radius)} = ${f(s.diameter)} m`,{radius:p.radius},'半径和直径不能混用。')];
      else if(i===1)cells=[cell('physical-margin','扣除机身后的总余量',s.physicalMargin,`${f(s.width)} − 2.0000 × ${f(p.radius)} = ${f(s.physicalMargin)} m`,{width:s.width,radius:p.radius},'这是两边余量之和；居中时每边余量为一半。'),cell('one-side-clearance','居中时单侧物理余量',s.physicalMargin/2,`(${f(s.width)} − 2.0000 × ${f(p.radius)}) / 2.0000 = ${f(s.physicalMargin/2)} m`,{width:s.width,radius:p.radius},'负值意味着圆形轮廓无法放入通道。'),cell('geometric-pass','严格几何通过条件',s.geometricPass,`${f(s.width)} > 2.0000 × ${f(p.radius)} → ${s.geometricPass}`,{width:s.width,radius:p.radius},'使用严格大于；恰好接触不算本例通过。')];
      else if(i===2)cells=[cell('preferred-radius','半径加单侧教学缓冲',p.radius+p.inflation,`${f(p.radius)} + ${f(p.inflation)} = ${f(p.radius+p.inflation)} m`,{radius:p.radius,inflation:p.inflation},'本例把缓冲当硬几何偏好，不是 Nav2 连续膨胀代价。'),cell('preferred-width','两侧缓冲后的需求宽度',s.preferredWidth,`2.0000 × (${f(p.radius)} + ${f(p.inflation)}) = ${f(s.preferredWidth)} m`,{radius:p.radius,inflation:p.inflation},'两侧都需要缓冲，不能只加一次 inflation。'),cell('buffer-margin','加入缓冲后的总余量',s.bufferMargin,`${f(s.width)} − 2.0000 × (${f(p.radius)} + ${f(p.inflation)}) = ${f(s.bufferMargin)} m`,{width:s.width,radius:p.radius,inflation:p.inflation},'此帧算余量，下一帧才作 bufferPass 判断。')];
      else cells=[cell('buffer-pass','是否满足严格缓冲偏好',s.bufferPass,`${f(s.bufferMargin)} > 0.0000 → ${s.bufferPass}`,{bufferMargin:s.bufferMargin},'等于零也不满足本例严格余量要求。'),cell('physical-vs-buffer','此前几何通过条件',s.geometricPass,`${f(s.physicalMargin)} > 0.0000 → ${s.geometricPass}`,{physicalMargin:s.physicalMargin,bufferPass:s.bufferPass},'bufferPass=false 可能仅为偏好受限，不可自动称为碰撞；本例不含未知格、射线或多层代价。')];
      return view(t,i,cells,'固定0.9m通道和圆形 footprint；未生成或更新真实 costmap。');
    },
    experiments:[
      experiment('increase-buffer','只把缓冲从0.2m增至0.3m','机身直径和几何可通过性不变，缓冲余量从0.1m变为−0.1m。',{radius:.2,inflation:.2},{radius:.2,inflation:.3},'物理能通过仍成立，但额外规划偏好无法满足。',(a,b)=>{const x=last(a),y=last(b);return near(x.diameter,.4)&&near(y.diameter,.4)&&near(x.physicalMargin,.5)&&near(y.physicalMargin,.5)&&x.geometricPass===true&&y.geometricPass===true&&near(x.preferredWidth,.8)&&near(y.preferredWidth,1)&&near(x.bufferMargin,.1)&&near(y.bufferMargin,-.1)&&x.bufferPass===true&&y.bufferPass===false;}),
      experiment('wider-robot','只把半径从0.2m增至0.5m','通道不变，直径从0.4m变1m，物理余量转负并阻止几何通过。',{radius:.2,inflation:.2},{radius:.5,inflation:.2},'直径比0.9m通道大0.1m，缓冲更不能挽救物理碰撞。',(a,b)=>{const x=last(a),y=last(b);return near(x.width,.9)&&near(y.width,.9)&&near(x.diameter,.4)&&near(y.diameter,1)&&near(x.physicalMargin,.5)&&near(y.physicalMargin,-.1)&&x.geometricPass===true&&y.geometricPass===false&&near(y.bufferMargin,-.5)&&y.bufferPass===false;})
    ]
  };

  models['nav2-planner']={
    intuition:'把每条已可行候选的长度与邻近障碍代价逐项相加，再按同一成本选择；最短不一定最便宜。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=s.lengths.flatMap((length,j)=>[cell('length-'+j,'候选'+j+'的长度',length,`ℓ[${j}] := ${f(length)} m`,{path:j,length},'两条路径是假定已通过碰撞检查的固定候选。'),cell('proximity-'+j,'候选'+j+'的累计邻近代价',s.proximity[j],`q[${j}] := ${f(s.proximity[j])}`,{path:j,proximity:s.proximity[j]},'教学无量纲量，不是实际插件采样出的代价栅格积分。')]);
      else if(i===1)cells=s.costs.flatMap((cost,j)=>[cell('penalty-term-'+j,'候选'+j+'的加权邻近代价',p.penalty*s.proximity[j],`${f(p.penalty)} × ${f(s.proximity[j])} = ${f(p.penalty*s.proximity[j])}`,{penalty:p.penalty,proximity:s.proximity[j]},'λ 为教学权重，单位按本例成本定义配平。'),cell('cost-'+j,'候选'+j+'的总成本',cost,`${f(s.lengths[j])} + ${f(p.penalty)} × ${f(s.proximity[j])} = ${f(cost)}`,{length:s.lengths[j],penalty:p.penalty,proximity:s.proximity[j]},'此教学成本不等同任意一个 Nav2 规划插件内部公式。')]);
      else if(i===2)cells=[cell('cost-difference','候选0减候选1的成本差',s.costs[0]-s.costs[1],`${f(s.costs[0])} − ${f(s.costs[1])} = ${f(s.costs[0]-s.costs[1])}`,{cost0:s.costs[0],cost1:s.costs[1]},'正值表示候选1成本更低。'),cell('choice','按成本选择的候选编号',s.choice,`${f(s.costs[0])} ≤ ${f(s.costs[1])} ? 0 : 1 = ${s.choice}`,{cost0:s.costs[0],cost1:s.costs[1]},'平分时选择候选0；比较前已经假设两条均可行。')];
      else cells=[cell('selected-length','选中路径长度',s.selectedLength,`lengths[${s.choice}] = ${f(s.selectedLength)} m`,{choice:s.choice,lengths:s.lengths.slice()},'选中路径可能更长，选中不表示成功跟踪。'),cell('selected-cost','选中路径成本',s.selectedCost,`costs[${s.choice}] = ${f(s.selectedCost)}`,{choice:s.choice,costs:s.costs.slice()},'这是已生成候选的查表结果，不是新执行规划。')];
      return view(t,i,cells,'固定两条可行候选；成本公式是明确的原创教学目标。');
    },
    experiments:[experiment('prefer-clearance','只把邻近惩罚λ从0改为2','成本由[3,4]变为[7,4.4]，选择从3m短路转向4m绕行。',{penalty:0},{penalty:2},'λ增大使邻近障碍较少的候选1胜出，长度表和邻近表不变。',(a,b)=>{const x=last(a),y=last(b);return same(x.lengths,[3,4])&&same(y.lengths,[3,4])&&same(x.proximity,[2,.2])&&same(y.proximity,[2,.2])&&near(x.costs[0],3)&&near(x.costs[1],4)&&near(y.costs[0],7)&&near(y.costs[1],4.4)&&x.choice===0&&y.choice===1&&near(x.selectedLength,3)&&near(y.selectedLength,4)&&near(x.selectedCost,3)&&near(y.selectedCost,4.4);})]
  };

  models['nav2-controller']={
    intuition:'在机体系画前视圆：横向偏移决定曲率符号，前视距离平方出现在分母，再由速度得到角速度。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[cell('target-radicand','纵向坐标的平方',p.lookahead*p.lookahead-p.y*p.y,`${f(p.lookahead)}² − (${f(p.y)})² = ${f(p.lookahead*p.lookahead-p.y*p.y)} m²`,{lookahead:p.lookahead,y:p.y},'当前控件始终满足 |y|≤L；等号时纵向坐标为零。'),cell('target-x','前视目标的纵向坐标',s.target[0],`sqrt(${f(p.lookahead)}² − (${f(p.y)})²) = ${f(s.target[0])} m`,{lookahead:p.lookahead,y:p.y},'取前方非负根，坐标位于机体系中。'),cell('target-y','前视目标的横向坐标',s.target[1],`target_y := ${f(p.y)} m`,{y:p.y},'正负偏移区分左右转向。'),cell('target-circle','前视目标到机身原点的距离',Math.hypot(s.target[0],s.target[1]),`sqrt(${f(s.target[0])}² + (${f(s.target[1])})²) = ${f(Math.hypot(s.target[0],s.target[1]))} m`,{targetX:s.target[0],targetY:s.target[1],lookahead:p.lookahead},'对当前目标做圆几何核对，不代表机器人已移动。')];
      else if(i===1)cells=[cell('curvature-numerator','曲率分子',2*p.y,`2.0000 × (${f(p.y)}) = ${f(2*p.y)} m`,{y:p.y},'符号跟随横向偏移。'),cell('lookahead-square','曲率分母',p.lookahead*p.lookahead,`${f(p.lookahead)}² = ${f(p.lookahead*p.lookahead)} m²`,{lookahead:p.lookahead},'L 是距离而非纵向坐标，分母为 L²。'),cell('curvature','pure pursuit 曲率',s.curvature,`2.0000 × (${f(p.y)}) / ${f(p.lookahead)}² = ${f(s.curvature)} m⁻¹`,{y:p.y,lookahead:p.lookahead},'只是 pure pursuit 几何切片，不含 RPP 碰撞预测与减速。')];
      else if(i===2)cells=[cell('omega','由速度和曲率得到角速度',s.omega,`${f(p.speed)} × (${f(s.curvature)}) = ${f(s.omega)} rad/s`,{speed:p.speed,curvature:s.curvature},'仅为本例速度指令，未发送给机器人控制器。')];
      else cells=[cell('control-period','20Hz 控制周期',.05,'1.0000 / 20.0000 = 0.0500 s',{frequencyHz:20},'固定离散周期，没有实测回调延迟。'),cell('heading-step','单周期航向增量',s.headingStep,`${f(s.omega)} × 0.0500 = ${f(s.headingStep)} rad`,{omega:s.omega,dt:.05},'假定周期内角速度恒定；不是整条轨迹积分。'),cell('travel-step','单周期弧长增量',s.travelStep,`${f(p.speed)} × 0.0500 = ${f(s.travelStep)} m`,{speed:p.speed,dt:.05},'这是沿弧线的行驶距离，不是机体系 x 轴位移。')];
      return view(t,i,cells,'机体系前视目标与恒速单周期几何；没有运动仿真或真实跟踪。');
    },
    experiments:[
      experiment('double-lookahead','只把前视距离从1m增至2m','横向偏移和速度不变，曲率、角速度及航向增量都变为原来的1/4，行驶弧长不变。',{lookahead:1,speed:.5,y:.2},{lookahead:2,speed:.5,y:.2},'L²从1变4，κ从0.4变0.1，ω从0.2变0.05rad/s。',(a,b)=>{const x=last(a),y=last(b);return near(x.target[1],.2)&&near(y.target[1],.2)&&near(x.curvature,.4)&&near(y.curvature,.1)&&near(x.omega,.2)&&near(y.omega,.05)&&near(x.headingStep,.01)&&near(y.headingStep,.0025)&&near(x.travelStep,.025)&&near(y.travelStep,.025)&&near(x.target[0],Math.sqrt(.96))&&near(y.target[0],Math.sqrt(3.96));}),
      experiment('reverse-turn','只把横向目标从0.2m改为−0.2m','纵向坐标和弧长不变，曲率、角速度与航向增量变号。',{lookahead:1,speed:.5,y:.2},{lookahead:1,speed:.5,y:-.2},'左右对称目标给出相反转向，而不是反向行驶。',(a,b)=>{const x=last(a),y=last(b);return near(x.target[0],y.target[0])&&near(x.target[1],.2)&&near(y.target[1],-.2)&&near(x.curvature,.4)&&near(y.curvature,-.4)&&near(x.omega,.2)&&near(y.omega,-.2)&&near(x.headingStep,.01)&&near(y.headingStep,-.01)&&near(x.travelStep,.025)&&near(y.travelStep,.025);})
    ]
  };

  models['nav2-behavior']={
    intuition:'把允许的恢复次数与规划尝试次数分开，逐个事件检查何时失败、何时恢复、何时跟踪和退出。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[cell('initial-attempts','初始已执行规划次数',s.attempts,`attempts := ${f(s.attempts)}`,{attempts:s.attempts},'当前还没有循环执行或规划事件。'),cell('initial-events','初始事件数量',s.events.length,`events := []; length = ${f(s.events.length)}`,{eventsLength:s.events.length},'下一帧一次执行完整的有限教学规则，不拆成虚假的运行时帧。')];
      else if(i===1){
        cells=[];let recovery=0;
        s.events.forEach((event,j)=>{
          if(event.startsWith('plan ')){const attempt=Number(event.slice(5)),ok=attempt>=p.failures;cells.push(cell('event-'+j,'事件'+j+'：规划尝试',event,`${f(attempt)} ≤ budget(${f(p.budget)})；${f(attempt)} ≥ failures(${f(p.failures)}) → ${ok?'本次成功':'本次失败'}`,{eventIndex:j,attempt,budget:p.budget,failures:p.failures},'attempt 从0起计；达到 failures 才进入 follow。'));}
          else if(event==='recover'){recovery++;cells.push(cell('event-'+j,'事件'+j+'：恢复',event,`失败且仍有预算 → recover；累计恢复 ${f(recovery)}`,{eventIndex:j,recoveriesSoFar:recovery,budget:p.budget},'一次 recover 只代表教学缓存清理，不保证物理障碍消失。'));}
          else cells.push(cell('event-'+j,'事件'+j+'：进入跟踪',event,`最近一次 plan 已满足 attempt ≥ ${f(p.failures)} → follow`,{eventIndex:j,failures:p.failures},'follow 为教学分支事件，没有执行真实控制。'));
        });
        cells.push(cell('attempts','本帧总规划尝试次数',s.attempts,`min(${f(p.failures)} + 1.0000, ${f(p.budget)} + 1.0000) = ${f(s.attempts)}`,{failures:p.failures,budget:p.budget},'首次规划不消耗恢复预算，所以最多 budget+1 次尝试。'),cell('recoveries','实际恢复次数',s.recoveries,`min(${f(p.failures)}, ${f(p.budget)}) = ${f(s.recoveries)}`,{failures:p.failures,budget:p.budget},'恢复次数不等于规划尝试次数。'),cell('success','有限规则是否走到跟踪分支',s.success,`${f(p.failures)} ≤ ${f(p.budget)} → ${s.success}`,{failures:p.failures,budget:p.budget},'仅为此有限控制流的成功，不代表导航任务实测成功。'));
      }else if(i===2)cells=[cell('status','根据已结束流程给出状态',s.status,`${s.success} ? SUCCESS : FAILURE = ${s.status}`,{success:s.success},'当前流程已经结束；没有捏造 RUNNING 中间帧或真实 BT 返回值。')];
      else cells=[cell('stopped-by','记录结束原因',s.stoppedBy,`${s.success} ? 路径与跟踪分支成功 : 恢复预算耗尽 → ${s.stoppedBy}`,{success:s.success,attempts:s.attempts,recoveries:s.recoveries},'真实行为树还需要节点返回值、取消和超时；本例没有运行 XML 或 BehaviorTree.CPP。')];
      return view(t,i,cells,'只有实际生成的有限事件列表；第2个快照含已完成的整次规则执行。');
    },
    experiments:[experiment('add-one-recovery','只把恢复预算从1改为2','固定连续失败2次；预算1耗尽，预算2允许第三次规划并进入 follow。',{failures:2,budget:1},{failures:2,budget:2},'一次额外恢复带来一次额外规划机会，尝试数从2变3，恢复数从1变2。',(a,b)=>{const x=last(a),y=last(b);return same(x.events,['plan 0','recover','plan 1'])&&same(y.events,['plan 0','recover','plan 1','recover','plan 2','follow'])&&x.attempts===2&&y.attempts===3&&x.recoveries===1&&y.recoveries===2&&x.success===false&&y.success===true&&x.status==='FAILURE'&&y.status==='SUCCESS'&&x.stoppedBy==='恢复预算耗尽'&&y.stoppedBy==='路径与跟踪分支成功';})]
  };

  models['nav2-validation']={
    intuition:'固定10个教学回合先算到达比例与小样本区间，再逐一检查到达、碰撞、超时门槛；它们可以交叉标记。',
    inspect(t,index){const {i,s}=frame(t,index);let cells;
      if(i===0)cells=[cell('episodes','教学回合总数',s.episodes,`n := ${f(s.episodes)}`,{episodes:s.episodes},'同一场景集的固定人工数据，未运行仿真。'),cell('successes','被标记为到达的回合数',s.successes,`k := ${f(s.successes)}`,{successes:s.successes,episodes:s.episodes},'到达、碰撞和超时可交叉，不能把各计数相加当回合数。'),cell('contacts','碰撞计数',s.contacts,`contacts := ${f(s.contacts)}`,{contacts:s.contacts},'人工输入的计数，不是接触传感器日志。'),cell('timeouts','超时计数',s.timeouts,`timeouts := ${f(s.timeouts)}`,{timeouts:s.timeouts},'未提供每回合耗时或超时边界，不能推算真实性能。')];
      else if(i===1){const z=1.96,z2=z*z,n=s.episodes,rate=s.rate,d=1+z2/n,center=(rate+z2/(2*n))/d,variance=rate*(1-rate)/n+z2/(4*n*n),half=z*Math.sqrt(variance)/d;
        cells=[cell('rate','样本到达率',s.rate,`${f(s.successes)} / ${f(n)} = ${f(s.rate)}`,{successes:s.successes,episodes:n},'它是样本比例，不是长期成功概率真值。'),cell('wilson-denominator','Wilson 分母',d,`1.0000 + ${f(z)}² / ${f(n)} = ${f(d)}`,{z,episodes:n},'使用固定 z=1.96 的双侧约95% Wilson 记分区间；假设回合为独立同分布二项样本。'),cell('wilson-center','Wilson 中心',center,`(${f(rate)} + ${f(z)}² / (2.0000 × ${f(n)})) / ${f(d)} = ${f(center)}`,{rate,z,episodes:n,denominator:d},'区间中心与样本比例通常不同。'),cell('wilson-variance','Wilson 根号内项',variance,`${f(rate)} × (1.0000 − ${f(rate)}) / ${f(n)} + ${f(z)}² / (4.0000 × ${f(n)}²) = ${f(variance)}`,{rate,z,episodes:n},'即使0/10或10/10也保留有限样本的不确定性。'),cell('wilson-halfwidth','Wilson 半宽',half,`${f(z)} × sqrt(${f(variance)}) / ${f(d)} = ${f(half)}`,{z,variance,denominator:d},'用完整精度的中间项计算，公式文字的小数仅供显示。'),cell('interval-low','Wilson 下界',s.interval[0],`${f(center)} − ${f(half)} = ${f(s.interval[0])}`,{center,halfWidth:half},'置信区间依赖独立同分布假设，不给单次运行或环境迁移作保证。'),cell('interval-high','Wilson 上界',s.interval[1],`${f(center)} + ${f(half)} = ${f(s.interval[1])}`,{center,halfWidth:half},'门槛使用样本 rate，原模型没有把区间下界作为通过标准。')];
      }else if(i===2)cells=[cell('rate-gate','到达率门槛',s.rate>=.8,`${f(s.rate)} ≥ 0.8000 → ${s.rate>=.8}`,{rate:s.rate,minimum:.8},'包含等号的本站教学门槛。'),cell('contact-gate','零碰撞门槛',s.contacts===0,`${f(s.contacts)} === 0.0000 → ${s.contacts===0}`,{contacts:s.contacts,maximum:0},'到达不抵消碰撞。'),cell('timeout-gate','超时次数门槛',s.timeouts<=1,`${f(s.timeouts)} ≤ 1.0000 → ${s.timeouts<=1}`,{timeouts:s.timeouts,maximum:1},'同样是本站教学规则，不是 Nav2 官方验收规范。'),cell('pass','三项同时满足',s.pass,`(${f(s.rate)} ≥ 0.8000) AND (${f(s.contacts)} === 0.0000) AND (${f(s.timeouts)} ≤ 1.0000) = ${s.pass}`,{rate:s.rate,contacts:s.contacts,timeouts:s.timeouts},'逻辑合取，任何一个门槛不满足就失败。')];
      else cells=[cell('evidence','本次数字的证据类型',s.evidence,`evidence := ${s.evidence}`,{evidence:s.evidence},'所有计数来自人工教学输入；不能转成实际测试证据。'),cell('target-environment','仍需执行的目标环境',s.targetEnvironment,`targetEnvironment := ${s.targetEnvironment}`,{targetEnvironment:s.targetEnvironment},'此字符串是目标，不是已启动、已安装或已通过真实环境验收的回执。'),cell('teaching-verdict','此前教学门槛结论',s.pass,`本例 pass 已计算为 ${s.pass}；证据类型 = ${s.evidence}`,{pass:s.pass,evidence:s.evidence},'不据此创建学习完成、真机验收或学习时长记录。')];
      return view(t,i,cells,'10回合人工二项算例；区间需独立同分布假设，三类标记可交叉。');
    },
    experiments:[
      experiment('collision-veto','只把碰撞数从0改为1','到达率与 Wilson 区间不变，但通过条件由 true 变 false。',{successes:8,contacts:0,timeouts:1},{successes:8,contacts:1,timeouts:1},'零碰撞是独立必要条件，不能由8/10到达率抵消。',(a,b)=>{const x=last(a),y=last(b);return x.successes===8&&y.successes===8&&near(x.rate,.8)&&near(y.rate,.8)&&same(x.interval,y.interval)&&x.contacts===0&&y.contacts===1&&x.timeouts===1&&y.timeouts===1&&x.pass===true&&y.pass===false;}),
      experiment('reach-rate-threshold','只把到达数从7改为8','碰撞0和超时1不变，到达率从0.7变0.8，恰好跨过包含等号的门槛。',{successes:7,contacts:0,timeouts:1},{successes:8,contacts:0,timeouts:1},'通过依据样本比例≥0.8，Wilson 区间仍很宽且下界小于0.8。',(a,b)=>{const x=last(a),y=last(b);return near(x.rate,.7)&&near(y.rate,.8)&&x.contacts===0&&y.contacts===0&&x.timeouts===1&&y.timeouts===1&&x.pass===false&&y.pass===true&&y.interval[0]>x.interval[0]&&y.interval[1]>x.interval[1]&&y.interval[0]<.8;})
    ]
  };
  return {courseId:'nav2',models};
});
