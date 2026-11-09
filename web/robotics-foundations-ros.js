/* Original deterministic ROS concepts; these calculations do not run ROS or DDS. */
(function (global) {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fmt = value => typeof value === 'number' ? Number(value.toFixed(3)).toString() : String(value);
  const render = frame => {
    const s = frame.scene;
    const box = (x, y, title, detail, active = false) => `<rect x="${x}" y="${y}" width="142" height="68" rx="12" fill="${active?'#d5f0e8':'#edf1f8'}" stroke="${active?'#318c72':'#a6b4ca'}"/><text x="${x+71}" y="${y+27}" text-anchor="middle" font-size="16">${esc(title)}</text><text x="${x+71}" y="${y+50}" text-anchor="middle" font-size="13">${esc(detail)}</text>`;
    let body = '';
    if (s.kind === 'queue') {
      body = box(18, 28, '发布者', `发送 ${s.sent} 条`, s.current === 0) + box(209, 28, '单订阅者缓冲', `深度 ${s.depth}`, s.current === 1) + box(400, 28, '消费者', `已处理 ${s.received.length} 条`, s.current === 2);
      body += '<path d="M162 62H203m150 0h40" stroke="#6e87ac" stroke-width="3"/>';
      body += `<text x="22" y="132" font-size="15">缓冲内序号：${esc(s.queue.join(' → ') || '空')}</text><text x="22" y="163" font-size="15">处理顺序：${esc(s.received.join(' → ') || '等待')}</text><text x="22" y="194" font-size="14">覆盖 ${esc(s.evicted.join(', ') || '无')}；人为链路丢失 ${esc(s.lost.join(', ') || '无')}</text>`;
    } else if (s.kind === 'tf') {
      const scale = Math.min(32,85/Math.max(1,Math.abs(s.point[0]),Math.abs(s.point[1]))), cx = 280, cy = 145;
      const px = cx+s.point[0]*scale, py = cy-s.point[1]*scale;
      body = `<path d="M70 145H525M280 20V235" stroke="#bac5d5"/><path d="M280 145L${px} ${py}" stroke="#358b75" stroke-width="3"/><circle cx="${px}" cy="${py}" r="7" fill="${s.accepted?'#358b75':'#c97955'}"/><text x="20" y="28" font-size="16">${esc(s.label)}</text><text x="20" y="56" font-size="14">候选坐标 (${esc(fmt(s.point[0]))}, ${esc(fmt(s.point[1]))}) m</text><text x="20" y="218" font-size="14">${esc(s.status)}</text><text x="520" y="165">x</text><text x="292" y="23">y</text>`;
    } else if (s.kind === 'replay') {
      body = `<text x="20" y="28" font-size="16">记录时间戳：${esc(s.stampMs)} ms</text><text x="20" y="58" font-size="16">回放已用墙钟时间：${esc(fmt(s.elapsedMs))} ms</text><path d="M45 115H525" stroke="#b1bed2" stroke-width="3"/>`;
      body += s.stamps.map((stamp, i) => `<circle cx="${45+i*120}" cy="115" r="${i===s.index?9:6}" fill="${i<=s.index?'#358b75':'#c7d0df'}"/><text x="${45+i*120}" y="148" text-anchor="middle" font-size="12">${esc(stamp)}</text>`).join('');
      body += `<text x="20" y="200" font-size="14">速率 ${esc(s.rate)}×；消息字段未改写；间隔 = 原间隔 ÷ 速率</text>`;
    } else {
      body = box(18, 34, 'Gazebo Transport', s.gzType, s.step === 0) + box(209, 34, '单向桥接', s.route, s.step === 1) + box(400, 34, 'ROS 2', s.rosType, s.step === 2);
      body += `<path d="M162 68H203m150 0h40" stroke="${s.accepted?'#358b75':'#c97955'}" stroke-width="3"/><text x="20" y="145" font-size="15">${esc(s.status)}</text><text x="20" y="180" font-size="15">节点时间：${esc(fmt(s.now))} s；${esc(s.ready?'本例时钟条件满足':'等待有效 /clock')}</text><text x="20" y="215" font-size="13">这是类型、方向和时钟选择的计算；未启动桥接进程。</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 250" role="img" aria-label="${esc(frame.title)}"><g fill="#263c58" font-family="sans-serif">${body}</g></svg>`;
  };
  const models = {
    'rf-ros-pubsub': {
      controls: [
        {key:'count',label:'发布消息数',min:3,max:8,step:1,value:6,unit:'条'},
        {key:'depth',label:'缓冲深度',min:1,max:4,step:1,value:2,unit:'条'},
        {key:'consumeEvery',label:'每几次发布后处理一条',min:1,max:4,step:1,value:3,unit:'次'},
        {key:'dropEvery',label:'人为丢失每第几条（0为无）',min:0,max:4,step:1,value:0,unit:''}
      ],
      run: (p = {}) => {
        const defaults = {count:6,depth:2,consumeEvery:3,dropEvery:0};
        const bounds = {count:[3,8],depth:[1,4],consumeEvery:[1,4],dropEvery:[0,4]};
        const q = {};
        for (const key of Object.keys(defaults)) {
          const value = p[key] === undefined ? defaults[key] : p[key];
          if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < bounds[key][0] || value > bounds[key][1]) throw new RangeError(key+' 必须是范围内整数');
          q[key] = value;
        }
        const frames = [], queue = [], received = [], evicted = [], lost = [];
        let sent = 0, maxQueue = 0;
        const push = (title, text, code, current) => frames.push({title,text,code,vars:{sent,queue:queue.slice(),received:received.slice(),evicted:evicted.slice(),lost:lost.slice(),depth:q.depth},scene:{kind:'queue',sent,queue:queue.slice(),received:received.slice(),evicted:evicted.slice(),lost:lost.slice(),depth:q.depth,current}});
        push('先约定一个可复算的调度', '每次先发布，再按固定周期处理一条；最后排空缓冲。这里的数组代表教学缓冲，不是DDS内部结构。', 'const queue = [], received = [], evicted = [], lost = [];', 0);
        for (let seq = 1; seq <= q.count; seq++) {
          sent = seq;
          if (q.dropEvery > 0 && seq % q.dropEvery === 0) {
            lost.push(seq);
            push('链路人为丢失第 '+seq+' 条', '这条消息没有进入缓冲；它与缓冲满造成的覆盖分别记账。', 'if (dropEvery > 0 && seq % dropEvery === 0) lost.push(seq);', 0);
          } else {
            queue.push(seq);
            if (queue.length > q.depth) evicted.push(queue.shift());
            maxQueue = Math.max(maxQueue, queue.length);
            push('第 '+seq+' 条进入缓冲', '超过深度就移除最旧的未处理样本，保持新近样本。', 'queue.push(seq);\nif (queue.length > depth) evicted.push(queue.shift());', 1);
          }
          if (seq % q.consumeEvery === 0 && queue.length) {
            received.push(queue.shift());
            push('消费者处理当前最旧一条', '本例消费者每隔固定发布次数才运行；处理顺序保持FIFO。', 'if (seq % consumeEvery === 0 && queue.length) received.push(queue.shift());', 2);
          }
        }
        while (queue.length) {
          received.push(queue.shift());
          push('发布结束后继续排空', '发布结束不代表缓冲已空；排空后再核对每条消息去向。', 'while (queue.length) received.push(queue.shift());', 2);
        }
        push('核对消息守恒', '发布数等于已处理、被覆盖和人为丢失的数量之和。真实ROS还要检查QoS兼容、连接发现和运行时条件。', 'count === received.length + evicted.length + lost.length', 2);
        return {frames,result:{published:q.count,received,evicted,lost,maxQueue,accounted:received.length+evicted.length+lost.length},summary:`处理 ${received.length} 条，缓冲覆盖 ${evicted.length} 条，人为链路丢失 ${lost.length} 条。`,boundary:'确定性单订阅者缓冲演练，不模拟DDS、执行器、发现协议或可靠传输重试；不能从本例推断真实ROS的投递保证。'};
      },
      render
    },
    'rf-ros-tf': {
      controls: [
        {key:'yaw',label:'世界到车体朝向',min:-180,max:180,step:15,value:90,unit:'°'},
        {key:'tx',label:'车体原点世界x',min:-2,max:2,step:0.1,value:1,unit:'m'},
        {key:'ty',label:'车体原点世界y',min:-2,max:2,step:0.1,value:0,unit:'m'},
        {key:'px',label:'传感器坐标中的点x',min:0,max:2,step:0.1,value:1,unit:'m'},
        {key:'ageMs',label:'查询时变换已过去多久',min:0,max:1000,step:50,value:100,unit:'ms'},
        {key:'maxAgeMs',label:'本应用允许最大年龄',min:50,max:1000,step:50,value:300,unit:'ms'}
      ],
      run: (p = {}) => {
        const defaults = {yaw:90,tx:1,ty:0,px:1,ageMs:100,maxAgeMs:300};
        const bounds = {yaw:[-180,180],tx:[-2,2],ty:[-2,2],px:[0,2],ageMs:[0,1000],maxAgeMs:[50,1000]};
        const q = {};
        for (const key of Object.keys(defaults)) {
          const value = p[key] === undefined ? defaults[key] : p[key];
          if (typeof value !== 'number' || !Number.isFinite(value) || value < bounds[key][0] || value > bounds[key][1]) throw new RangeError(key+' 必须是范围内有限数值');
          q[key] = value;
        }
        const angle = q.yaw*Math.PI/180, sensorOffset = 0.2;
        const sensorPoint = [q.px,0], basePoint = [q.px+sensorOffset,0];
        const rotated = [Math.cos(angle)*basePoint[0],Math.sin(angle)*basePoint[0]];
        const worldPoint = [rotated[0]+q.tx,rotated[1]+q.ty];
        const accepted = q.ageMs <= q.maxAgeMs;
        const make = (title,text,code,vars,point,label,status) => ({title,text,code,vars,scene:{kind:'tf',point,label,status,accepted}});
        const frames = [
          make('先给坐标注明参考系', '同一个物理点在sensor和world中有不同坐标。变换记作把子坐标中的点映射到父坐标。', 'const sensorPoint = [px, 0];', {frame:'sensor',sensorPoint},sensorPoint,'sensor 中的点','二维、米、逆时针正角度'),
          make('沿sensor→base_link变换', '传感器安装在车体前方0.2米，两个坐标轴在本例中同向。', 'const basePoint = [px + 0.2, 0];', {sensorOffset,basePoint},basePoint,'base_link 中的点','先处理传感器安装偏移'),
          make('先旋转车体坐标', '车体朝向为yaw。旋转作用于车体坐标中的点，平移量还没有加入。', 'const rotated = [Math.cos(angle)*basePoint[0], Math.sin(angle)*basePoint[0]];', {yaw:q.yaw,angle,rotated},rotated,'旋转到world轴方向','角度先从度转换为弧度'),
          make('再加world中的平移', '不能把平移先加到点上再旋转，否则就改变了平移所在的参考系。', 'const worldPoint = [rotated[0] + tx, rotated[1] + ty];', {translation:[q.tx,q.ty],worldPoint},worldPoint,'world 中的候选坐标','world ← base_link ← sensor'),
          make('最后检查时间有效性', accepted?'变换年龄未超过本应用阈值，可以使用候选坐标。':'变换过期：候选数值仍能算出，但本应用拒绝把它用于控制。', 'const accepted = ageMs <= maxAgeMs;', {ageMs:q.ageMs,maxAgeMs:q.maxAgeMs,accepted},worldPoint,'空间正确还要时间有效',accepted?'应用检查通过':'过期，拒绝使用')
        ];
        return {frames,result:{sensorPoint,basePoint,worldCandidate:worldPoint,accepted,usablePoint:accepted?worldPoint:null},summary:accepted?`点的world坐标为 (${worldPoint[0].toFixed(3)}, ${worldPoint[1].toFixed(3)}) m。`:'候选坐标已计算，但变换年龄超过阈值，拒绝使用。',boundary:'二维刚体与单个变换时间戳的教学计算；年龄阈值是本站应用规则。真实tf2按查询时间维护变换缓存，可插值并报告查找或外推错误，不能用本例替代tf2。'};
      },
      render
    },
    'rf-ros-replay': {
      controls: [
        {key:'durationMs',label:'原日志首末间隔',min:100,max:2000,step:100,value:1000,unit:'ms'},
        {key:'rate',label:'回放速率',min:0.25,max:4,step:0.25,value:2,unit:'倍'},
        {key:'originMs',label:'首条原始时间戳',min:0,max:5000,step:100,value:1000,unit:'ms'}
      ],
      run: (p = {}) => {
        const defaults = {durationMs:1000,rate:2,originMs:1000};
        const bounds = {durationMs:[100,2000],rate:[0.25,4],originMs:[0,5000]};
        const q = {};
        for (const key of Object.keys(defaults)) {
          const value = p[key] === undefined ? defaults[key] : p[key];
          if (typeof value !== 'number' || !Number.isFinite(value) || value < bounds[key][0] || value > bounds[key][1]) throw new RangeError(key+' 必须是范围内有限数值');
          q[key] = value;
        }
        const stamps = Array.from({length:5},(_,i)=>q.originMs+i*q.durationMs/4);
        const schedule = stamps.map((stampMs,i)=>({sequence:i+1,stampMs,elapsedMs:(stampMs-stamps[0])/q.rate,value:i*0.2}));
        const frames = [{title:'区分记录时间和回放等待',text:'日志保存消息的原时间戳；回放器按相对间隔安排发布时间，二者不是同一个数值。',code:'elapsedMs = (stampMs - firstStampMs) / rate;',vars:{stamps,rate:q.rate},scene:{kind:'replay',stamps,index:-1,stampMs:q.originMs,elapsedMs:0,rate:q.rate}}];
        for (const row of schedule) frames.push({title:'安排第 '+row.sequence+' 条消息',text:row.sequence===1?'第一条在回放起点发布。':'原时间差除以速率，得到从回放起点起的墙钟等待；不改写消息字段。',code:'const elapsedMs = (stampMs - stamps[0]) / rate;\nconst publishedStampMs = stampMs;',vars:{...row,rate:q.rate},scene:{kind:'replay',stamps,index:row.sequence-1,stampMs:row.stampMs,elapsedMs:row.elapsedMs,rate:q.rate}});
        const wallDurationMs = q.durationMs/q.rate;
        frames.push({title:'核对首末间隔',text:'2倍速把理想等待时间减半，但不会把原时间戳也减半。真实进程还会受到调度和处理速度影响。',code:'const wallDurationMs = durationMs / rate;',vars:{originalDurationMs:q.durationMs,wallDurationMs,unchangedStamps:true},scene:{kind:'replay',stamps,index:4,stampMs:stamps[4],elapsedMs:wallDurationMs,rate:q.rate}});
        return {frames,result:{schedule,wallDurationMs,originalDurationMs:q.durationMs,rate:q.rate},summary:`理想回放首末间隔为 ${wallDurationMs.toFixed(3)} ms，五条消息的时间戳保持原值。`,boundary:'原创五条日志的理想时间调度计算，不读取或运行rosbag2。真实bag记录时刻与消息header.stamp可能不同；按实际录制元数据、/clock和use_sim_time配置分别检查。'};
      },
      render
    },
    'rf-ros-bridge': {
      controls: [
        {key:'type',label:'Gazebo样本类型',options:['Clock / 仿真时钟','Double / 标量'],value:0},
        {key:'direction',label:'桥接方向',options:['Gazebo → ROS','ROS → Gazebo'],value:0},
        {key:'mismatch',label:'映射配置',options:['类型匹配','错配为StringMsg'],value:0},
        {key:'useSimTime',label:'节点时间来源',options:['墙钟','仿真时钟'],value:1},
        {key:'simSeconds',label:'Gazebo样本时间',min:0,max:10,step:0.5,value:2,unit:'s'},
        {key:'wallSeconds',label:'本例墙钟时间',min:1000,max:1010,step:0.5,value:1002,unit:'s'}
      ],
      run: (p = {}) => {
        const defaults = {type:0,direction:0,mismatch:0,useSimTime:1,simSeconds:2,wallSeconds:1002};
        const bounds = {type:[0,1],direction:[0,1],mismatch:[0,1],useSimTime:[0,1],simSeconds:[0,10],wallSeconds:[1000,1010]};
        const q = {};
        for (const key of Object.keys(defaults)) {
          const value = p[key] === undefined ? defaults[key] : p[key];
          if (typeof value !== 'number' || !Number.isFinite(value) || value < bounds[key][0] || value > bounds[key][1] || (['type','direction','mismatch','useSimTime'].includes(key) && !Number.isInteger(value))) throw new RangeError(key+' 必须是范围内有效数值');
          q[key] = value;
        }
        const sourceGzType = q.type===0?'gz.msgs.Clock':'gz.msgs.Double';
        const expectedRosType = q.type===0?'rosgraph_msgs/msg/Clock':'std_msgs/msg/Float64';
        const configuredGzType = q.mismatch?'gz.msgs.StringMsg':sourceGzType;
        const typeMatches = sourceGzType===configuredGzType;
        const directionMatches = q.direction===0;
        const accepted = typeMatches && directionMatches;
        const clockAvailable = accepted && q.type===0;
        const nodeNow = q.useSimTime ? (clockAvailable?q.simSeconds:0) : q.wallSeconds;
        const ready = !q.useSimTime || clockAvailable;
        const status = !typeMatches?'类型不匹配：本例不转发':!directionMatches?'只有Gazebo样本，当前方向不能送入ROS':q.type===1?'标量可转发，但它不是 /clock':'时钟样本可从Gazebo送入ROS';
        const frame = (title,text,code,vars,step) => ({title,text,code,vars,scene:{kind:'bridge',gzType:sourceGzType.replace('gz.msgs.',''),rosType:expectedRosType.split('/').pop(),route:q.direction?'ROS → GZ':'GZ → ROS',accepted,status,now:nodeNow,ready,step}});
        const frames = [
          frame('先辨认两侧消息类型', '名称相近不代表二进制格式相同；桥接器需要支持一对准确的消息类型。', "const sourceGzType = type === 0 ? 'gz.msgs.Clock' : 'gz.msgs.Double';", {sourceGzType,expectedRosType,configuredGzType},0),
          frame('校对类型映射', typeMatches?'本例配置与样本类型相符。':'配置声明StringMsg，实际样本为另一类型，因此本例拒绝转发。', 'const typeMatches = sourceGzType === configuredGzType;', {typeMatches},1),
          frame('校对单向数据流', directionMatches?'数据源位于Gazebo，GZ_TO_ROS方向能送入ROS。':'本例只有Gazebo源；ROS_TO_GZ配置不能把它送入ROS。', 'const accepted = typeMatches && direction === 0;', {directionMatches,accepted},1),
          frame('标量不能冒充时钟', clockAvailable?'Clock样本可用于更新本例ROS时间。':'当前路径没有送达Clock；转发了普通标量也不能更新仿真时钟。', 'const clockAvailable = accepted && type === 0;', {clockAvailable},2),
          frame('节点再选择自己的时间源', ready?'按use_sim_time选择仿真时间或墙钟。':'use_sim_time已开但没有收到时钟，本例节点时间保持0，应用继续等待。', 'const nodeNow = useSimTime ? (clockAvailable ? simSeconds : 0) : wallSeconds;', {useSimTime:Boolean(q.useSimTime),nodeNow,ready},2)
        ];
        return {frames,result:{sourceGzType,configuredGzType,expectedRosType,typeMatches,directionMatches,accepted,clockAvailable,nodeNow,ready},summary:`${status}；本例节点时间 ${nodeNow.toFixed(3)} s。`,boundary:'仅检查给定类型、单向配置与时钟选择；未启动Gazebo Transport、ros_gz_bridge或ROS节点。真实系统还须检查topic名称、支持类型、QoS、发现与时钟暂停/回跳。'};
      },
      render
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  global.RoboticsFoundationModels = Object.assign(global.RoboticsFoundationModels || {}, models);
})(globalThis);
