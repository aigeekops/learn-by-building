/* Original, deterministic teaching examples. No requests, code execution or mastery inference. */
(function(global){
 'use strict';
 const clip=(v,a,b)=>Math.min(b,Math.max(a,Number(v))), round=(v,n=3)=>Number(v.toFixed(n));
 const range=(key,label,min,max,value,step=1,unit='')=>({key,label,min,max,value,step,unit});
 const choose=(key,label,options,value=0)=>({key,label,options,value});
 const f=(title,text,code,vars,scene)=>({title,text,code,vars,scene});
 const flow=(labels,current=0,status='')=>({kind:'flow',labels,current,status});
 const chart=(series,labels=['输入','结果'])=>({kind:'chart',series,labels});
 const output=(controls,frames,question,expected,unit='',boundary='教学小例子；改变输入后，先预测再验证。')=>({controls,frames,exercise:{question,expected:round(expected),unit,tolerance:Math.max(.001,Math.abs(expected)*.005)},boundary});
 const models={};
 models.python={controls:[range('x','输入数值',1,10,4)],run(t,p){
  const x=p.x,variant=t.variant;let frames,result;
  if(variant==='branches'){
   const values=Array.from({length:x},(_,i)=>i+1),evens=values.filter(n=>n%2===0);result=evens.length;
   frames=[f('准备数据','range 的终点不包含在结果中。',`values = list(range(1, ${x+1}))`,{values},flow(['输入','循环','判断','输出'])),...values.slice(0,8).map((n,i)=>f('检查第 '+(i+1)+' 个数',n%2?'余数为 1，跳过。':'余数为 0，进入结果列表。','if n % 2 == 0:\n    result.append(n)',{n,remainder:n%2,result:evens.filter(v=>v<=n)},flow(['输入','循环','判断','输出'],2))),f('汇总结果','循环只改变满足条件的项目。','print(len(result))',{result:evens,count:result},flow(['输入','循环','判断','输出'],3))];
  }else if(variant==='functions'){
   result=x*2;frames=[f('传入参数','调用时把值交给局部参数。',`def double(value):\n    return value * 2\nanswer = double(${x})`,{argument:x},flow(['调用','局部参数','返回','接收'])),f('计算返回值','return 把结果交给调用者。','return value * 2',{value:x,returned:result},flow(['调用','局部参数','返回','接收'],2)),f('接收结果','函数内部的值经返回值流回主程序。','answer = double(value)\nprint(answer)',{answer:result},flow(['调用','局部参数','返回','接收'],3))];
  }else if(variant==='files'){
   result=x*2;frames=[f('序列化','文件存的是字符。',`text = "${x}\\n${x}"`,{text:`${x}\n${x}`,type:'str'},flow(['保存','读取','转换','求和'])),f('逐行读取','读取后仍需明确转换为数字。','values = [int(line) for line in text.splitlines()]',{values:[x,x]},flow(['保存','读取','转换','求和'],2)),f('计算','完成转换再求和。','print(sum(values))',{sum:result},flow(['保存','读取','转换','求和'],3))];
  }else if(variant==='data'){
   const readings=[x,x+1,x+2];result=x+1;frames=[f('收集读数','先保留原始列表，再计算统计量。',`readings = [${readings.join(', ')}]`,{readings},flow(['列表','累加','计数','平均'])),f('累加','平均值的分子与分母来自同一组有效读数。','total = sum(readings)\ncount = len(readings)',{total:3*x+3,count:3},flow(['列表','累加','计数','平均'],1)),f('得到平均值','平均并不自动消除系统偏差。','average = total / count',{average:result},chart([readings,[result,result,result]],['原读数','平均']))];
  }else{result=x+5;frames=[f('给变量命名','变量保存当前值。',`minutes = ${x}`,{minutes:x},flow(['赋值','计算','更新','输出'])),f('计算表达式','先算右边，再给左边赋值。','minutes = minutes + 5',{before:x,added:5,after:result},flow(['赋值','计算','更新','输出'],2)),f('观察输出','打印的是更新后的值。','print(minutes)',{stdout:result},flow(['赋值','计算','更新','输出'],3))];}
  return output(this.controls,frames,variant==='branches'?'结果列表里有几个偶数？':variant==='files'?'文件两行转成整数后，和是多少？':variant==='data'?'这三个读数的平均值是多少？':variant==='functions'?'函数返回值是多少？':'最后打印的值是多少？',result);
 }};
 models.contract={controls:[range('value','示例 minutes 字段',0,150,30),choose('missing','请求是否缺字段',['字段齐全','缺少 minutes'])],run(t,p){
  const valid=!p.missing&&p.value>=1&&p.value<=120,body=p.missing?{}:{minutes:p.value},response=valid?200:422;
  return output(this.controls,[f('明确约定','先约定输入类型、范围与结果。','required = ["minutes"]\n1 <= minutes <= 120',{required:'minutes',min:1,max:120},flow(['输入','校验','执行','响应'])),f('解析输入','JSON 是数据表示；字段齐全不代表值一定合格。','body = parse_json(request)',body,flow(['输入','校验','执行','响应'],0)),f('检查边界',valid?'必需字段和范围均通过。':'校验失败，业务函数不执行。','if "minutes" not in body or not 1 <= body["minutes"] <= 120:\n    return 422',{valid,executed:valid},flow(['输入','校验','执行','响应'],1,valid?'通过':'拒绝')),f('给出结果',valid?'本例返回成功响应。':'返回明确的输入错误。','return response(status_code)',{status:response},flow(['输入','校验','执行','响应'],3))], '本例应该返回哪个 HTTP 状态码？',response,'','本地确定性请求示例；演示输入约定，不发送实际模型或接口请求。');
 }};
 models.retrieval={controls:[choose('query','查询关键词',['电池','电机','月球']),range('k','最多选取片段',1,4,2)],run(t,p){
  const q=['电池','电机','月球'][p.query],docs=['电池容量决定储能，续航还取决于负载功率。','电机需要驱动器，控制输入和电机供电分开。','电池电压下降时应核对电机驱动器供电范围。','笔记记录了按钮和 LED 的连接过程。'];
  const hits=docs.map((text,i)=>({id:i+1,text,hit:text.includes(q)})),ranked=hits.filter(d=>d.hit).slice(0,p.k),total=hits.filter(d=>d.hit).length,recall=total?ranked.length/total:0;
  return output(this.controls,[f('保留来源','每个片段都带原始编号。','chunks = [{"id": i, "text": text} for i, text in enumerate(docs)]',{documents:4},flow(docs.map((_,i)=>'片段 '+(i+1)),0)),f('确定性匹配','本例只做精确关键词匹配；不模拟语义理解。','hits = [d for d in chunks if query in d["text"]]',{query:q,hits:hits.filter(d=>d.hit).map(d=>d.id)},flow(hits.map(d=>'#'+d.id+(d.hit?' 命中':' 未命中')),1)),f('选取证据','限制返回数量时，检查有没有漏掉相关片段。','selected = hits[:k]',{k:p.k,selected:ranked.map(d=>d.id),recall:round(recall)},chart([hits.map(d=>Number(d.hit)),hits.map(d=>Number(ranked.includes(d)))],['相关标注','已选'])),f('回答或拒答',ranked.length?ranked.map(d=>'[#'+d.id+'] '+d.text).join('\n'):'没有检索到支持材料，返回“资料不足”。','answer = cite(selected) if selected else "资料不足"',{citations:ranked.map(d=>d.id),unsupported:ranked.length===0},flow(['查询','检索','证据','引用 / 拒答'],3))], '当前选入回答的证据片段有几个？',ranked.length,'个','关键词检索与证据组织教学；检索命中不等于事实已经被独立核实。');
 }};
 models.agent={controls:[range('budget','最多工具调用次数',1,5,3),choose('failure','工具结果',['成功','第二次调用失败'])],run(t,p){
  const tools=t.variant==='workflow'?['读取','检查','输出']:['读取','测试','修正'],frames=[f('初始化边界','工具清单和调用上限在行动前确定。','allowed = {"read", "test", "edit"}\nremaining = budget',{budget:p.budget,allowed:tools},flow(['目标','行动','观察','停止']))];
  let calls=0,failed=false;
  for(let i=0;i<Math.min(3,p.budget);i++){
   calls++;failed=Boolean(p.failure&&i===1);
   frames.push(f('调用 '+tools[i],failed?'收到工具错误，保留失败信息并停止。':'执行预先定义的教学动作，保存输入与观察。','if remaining <= 0: break\nobservation = call(allowed_tool)\nremaining -= 1',{call:calls,remaining:p.budget-calls,status:failed?'error':'ok'},flow(tools,i,failed?'失败':'通过')));
   if(failed)break;
  }
  const completed=calls===3&&!failed;
  frames.push(f('结束循环',failed?'因工具错误停止。':completed?'本例预设动作已完成。':'预算耗尽，保留未完成状态。','if error or remaining == 0 or finished:\n    stop()', {calls,finished:completed,reason:failed?'tool_error':completed?'finished':'budget'},flow(['目标','行动','观察','停止'],3)));
  return output(this.controls,frames,'停止前实际调用了几次工具？',calls,'次','固定工具轨迹回放；不调用真实 Agent，演示停止条件与错误传播。');
 }};
 models.delivery={controls:[choose('missing','复现环境',['全部就绪','缺输入数据','缺环境说明','缺独立检查'])],run(t,p){
  const labels=t.variant==='scope'?['问题','输入','最小实现','验收']:t.variant==='robot'?['计算示例','仿真结果','实物记录','复现说明']:['输入文件','环境说明','程序运行','独立检查'];
  const missing=[-1,0,1,3][p.missing],frames=labels.map((label,i)=>f(label,missing===i?'本项缺失：记录阻塞，不能宣称全部复现。':'检查本项的材料是否存在且能独立核对。',`checks[${i}] = ${missing===i?'False':'True'}`,{item:label,present:missing!==i,passed_so_far:Math.max(0,i+1-(missing<=i&&missing>=0?1:0))},flow(labels,i,missing===i?'缺失':'已有材料')));
  const result=missing<0?4:3;frames.push(f('形成交付结论','结论只覆盖已经检查的项目；材料缺失时列出下一步。','ready = all(checks)',{checks_passed:result,total:4,ready:result===4},flow(labels,3,result===4?'检查齐全':'有缺项')));
  return output(this.controls,frames,'四项中有几项具备检查材料？',result,'项','流程检查教学示例；勾选材料不代替运行程序或真机验收。');
 }};
 models.circuit={controls:[range('voltage','电源电压',1,12,5,.5,'V'),range('resistance','上支路电阻',100,10000,1000,100,'Ω'),choose('closed','回路',['接通','断开'])],run(t,p){
  const v=p.voltage,r=p.resistance,led=t.variant==='led',divider=['divider','thevenin'].includes(t.variant),parallel=t.variant==='parallel';
  const r2=1000,rl=1000,bottom=divider?1/(1/r2+1/rl):r2,req=parallel?1/(1/r+1/r2):divider?r+bottom:r;
  const current=p.closed?0:Math.max(0,v-(led?2:0))/req,vo=p.closed?0:divider?current*bottom:parallel?v:current*r;
  const frames=[f('标出回路','先确认电源、参考地和闭合路径。','closed = not open_switch',{supply:v,closed:!p.closed}, {kind:'circuit',voltage:v,resistance:r,current:0,closed:!p.closed,led,divider}),f('列出模型',divider?'下支路和负载先并联，再与上支路串联。':parallel?'并联支路的电压相同，电流相加。':led?'本例 LED 固定压降为 2 V。':'纯电阻使用欧姆定律。',divider?'Rb = 1 / (1/R2 + 1/Rload)\nI = Vs / (R1 + Rb)':parallel?'Req = 1 / (1/R1 + 1/R2)\nI = Vs / Req':led?'I = max(0, Vs - 2) / R':'I = Vs / R',{equivalent_ohms:round(req)}, {kind:'circuit',voltage:v,resistance:r,current,closed:!p.closed,led,divider}),f('计算并检查','电流从安培换成毫安要乘 1000。','milliamps = current * 1000',{current_mA:round(current*1000),output_V:round(vo),power_W:round(current*current*r)},chart([[current*1000],[v]],['电流 mA','电源 V']))];
  return output(this.controls,frames,'按当前模型，总电流是多少 mA？',current*1000,'mA',led?'理想电阻 + 固定 2 V LED 示例；实际元件压降、额定功率与接线需另查。':'理想直流电阻模型；负载、量程与额定功率需按真实器件核对。');
 }};
 models.measurement={controls:[choose('mode','测量方式',['电压并联','电流串联','带电测电阻']),choose('fault','线路状态',['正常','线路断开'])],run(t,p){
  const refused=p.mode===2,value=refused?0:p.mode===0?(p.fault?0:5):(p.fault?0:5);
  return output(this.controls,[f('先选测量对象','电压表并联，电流表串联；电阻测量先断电。','mode = selected_mode',{mode:['voltage','current','resistance'][p.mode]},flow(['对象','接法','条件','读数'])),f('检查条件',refused?'本例电源仍接通，拒绝给出电阻读数。':'在指定教学接法下计算读数。','if powered and mode == "resistance":\n    reject_measurement()', {powered:true,allowed:!refused},flow(['对象','接法','条件','读数'],2,refused?'拒绝':'允许')),f('读数与结论',refused?'先断电，再核对元件与量程。':p.fault?'断路位置与测量参考点需要继续检查。':'本例为 5 V 电源与 1 kΩ 负载。','reading = model_value if allowed else None',{reading:refused?'未知':value,unit:p.mode===0?'V':'mA'}, {kind:'circuit',voltage:5,resistance:1000,current:p.fault?0:.005,closed:!p.fault})], '本例允许输出有效数值吗？允许填 1，拒绝填 0。',refused?0:1,'','测量接法教学，不展示危险接法的伪读数。');
 }};
 models.digital={controls:[range('debounce','稳定窗口',1,6,3,1,'个采样'),choose('input','按键轨迹',['有抖动','稳定按下'])],run(t,p){
  const raw=p.input?[0,0,1,1,1,1,1,1]:[0,1,0,1,1,0,1,1,1,1],filtered=[];let stable=0,last=raw[0],run=0;
  for(const n of raw){if(n===last)run++;else{run=1;last=n;}if(run>=p.debounce)stable=n;filtered.push(stable);}
  const edges=filtered.reduce((n,v,i)=>n+Number(i>0&&v===1&&filtered[i-1]===0),0),frames=[f('记录输入','这里的横轴是固定采样序号。','raw = samples',{raw},chart([raw],['按键输入'])),f('等待稳定','连续相同读数达到窗口后，才更新稳定值。','if same_count >= window:\n    stable = raw',{window:p.debounce},chart([raw,filtered],['原输入','稳定输入'])),f('检测变化','只统计稳定输入从 0 到 1 的变化。','pressed = stable == 1 and previous == 0',{presses:edges,stable:filtered.at(-1)},chart([raw,filtered],['原输入','稳定输入']))];
  if(t.variant==='scheduler')frames.splice(1,0,f('非阻塞检查','每轮比较经过时间；等待期间仍能检查输入。','if now - previous >= interval:\n    update_output()\ncheck_button()', {blocking:false,window:p.debounce},flow(['读输入','检查时钟','更新输出','下一轮'],1)));
  return output(this.controls,frames,'稳定输入一共产生几次上升沿？',edges,'次','离散输入教学；采样周期与器件抖动须实测。');
 }};
 models.adc={controls:[range('voltage','输入电压',0,3.3,1.65,.05,'V'),range('bits','ADC 位数',3,12,10)],run(t,p){
  const max=2**p.bits-1,code=Math.round(p.voltage/3.3*max),back=code/max*3.3;
  return output(this.controls,[f('设定参考','参考电压决定输入范围。','Vref = 3.3\nmax_code = 2**bits - 1',{Vref:3.3,max_code:max},flow(['电压','缩放','量化','读数'])),f('缩放并量化','本例使用四舍五入的端点映射；实际芯片传递函数需查手册。','code = round(Vin / Vref * max_code)',{Vin:p.voltage,code},chart([[p.voltage],[back]],['输入 V','反算 V'])),f('反算','数字只能区分有限个电平，反算存在量化差。','estimated_V = code / max_code * Vref',{code,estimated_V:round(back),error_V:round(back-p.voltage)},flow(['电压','缩放','量化','读数'],3))], '当前数字码是多少？',code,'','理想 ADC 端点映射示例，未包含偏置、增益误差与采样保持过程。');
 }};
 models.cad={controls:[range('width','板宽',24,80,40,2,'mm'),range('hole','孔径',3,12,6,.5,'mm'),range('clearance','孔与轴的直径间隙',-.5,1,.3,.1,'mm')],run(t,p){
  const shaft=p.hole-p.clearance,wall=(p.width-p.hole)/2;
  return output(this.controls,[f('约束草图','孔保持在中心；尺寸变化不应靠目测拖动。','center = (width / 2, height / 2)',{width:p.width,hole:p.hole}, {kind:'cad',...p,shaft,solid:false}),f('形成零件','拉伸给草图厚度，圆孔通过去除材料形成。','plate = extrude(sketch, 6)\nplate = cut(plate, hole)',{thickness_mm:6,edge_wall_mm:round(wall)}, {kind:'cad',...p,shaft,solid:true}),f('检查装配','这里的间隙定义为孔径减轴径；负数表示干涉。','diametral_clearance = hole_diameter - shaft_diameter',{hole_mm:p.hole,shaft_mm:round(shaft),clearance_mm:round(p.clearance),fit:p.clearance<0?'名义干涉':'名义间隙'}, {kind:'cad',...p,shaft,solid:true})], '中心孔到外边缘的单侧材料宽度是多少 mm？',wall,'mm','几何与名义间隙示例；加工公差、材料收缩与打印方向仍需实际验证。');
 }};
 models.ros={controls:[range('rate','教学发布频率',1,10,5,1,'Hz'),choose('drop','人为丢弃消息',['不丢弃','丢弃第 3 条'])],run(t,p){
  const times=Array.from({length:5},(_,i)=>round(i/p.rate)),received=times.filter((_,i)=>!p.drop||i!==2);
  return output(this.controls,[f('约定消息','发布者与订阅者约定话题和消息类型。','publisher = create_publisher(Twist, "/cmd_vel")',{topic:'/cmd_vel',rate_Hz:p.rate},flow(['控制节点','/cmd_vel','模型','/odom'],0)),f('按时发送','每条教学消息带序号和时间戳。','publish(message, stamp=clock.now())',{timestamps_s:times},chart([times],['消息时间 s'])),f('接收或回放',p.drop?'人为漏掉第 3 条，序号出现空洞。':'接收序号与记录一致，可按时间戳重放。','record(topic, stamp, payload)\nreplay_in_timestamp_order()', {sent:5,received:received.length,interval_s:round(1/p.rate)},flow(['控制节点','/cmd_vel','模型','/odom'],3,p.drop?'示例丢包':'收到消息'))], '当前教学接收端收到几条消息？',received.length,'条','消息链路与时间戳示意；不运行 ROS / DDS，也不替代物理仿真。');
 }};
 models.transform={controls:[range('angle','旋转角',-180,180,90,15,'°'),range('tx','平移 x',-2,2,1,.25)],run(t,p){
  const a=p.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),point=[1,0],rot=[c,s],result=[c+p.tx,s],other=[(1+p.tx)*c,(1+p.tx)*s];
  return output(this.controls,[f('局部点','点相对局部坐标系为 (1, 0)。','p_local = [1, 0]',{p_local:point},{kind:'transform',point,rotated:point,result:point,angle:0,tx:0}),f('旋转','旋转矩阵改变方向，保持向量长度。','R = [[cos(a), -sin(a)], [sin(a), cos(a)]]\np_rot = R @ p_local',{R:[[round(c),round(-s)],[round(s),round(c)]],p_rot:rot.map(v=>round(v))},{kind:'transform',point,rotated:rot,result:rot,angle:p.angle,tx:0}),f('平移','先旋转再加世界坐标中的平移。','p_world = R @ p_local + [tx, 0]',{p_world:result.map(v=>round(v)),translate_then_rotate:other.map(v=>round(v))},{kind:'transform',point,rotated:rot,result,angle:p.angle,tx:p.tx})], '先旋转再平移后，世界坐标 x 是多少？',result[0],'','二维刚体变换示例；坐标顺序与参考系必须明确。');
 }};
 models.pid={controls:[range('kp','P 增益',.2,5,1.2,.2),range('ki','I 增益',0,2,.4,.1),range('kd','D 增益',0,.8,.1,.1)],run(t,p){
  let y=0,integral=0,lastError=1;const values=[y],actions=[],dt=.05;
  for(let i=0;i<120;i++){const e=1-y;integral+=e*dt;const derivative=(e-lastError)/dt,u=clip(p.kp*e+p.ki*integral+p.kd*derivative,-2,2);y+=dt*(-y+u);values.push(y);actions.push(u);lastError=e;}
  return output(this.controls,[f('定义误差','目标值为 1；本例对象是 y′ = −y + u。','error = target - y',{target:1,initial_y:0},chart([values.map(()=>1),values.map(()=>0)],['目标','输出'])),f('计算控制量','P 看当前误差，I 累积误差，D 看变化。','integral += error * dt\nu = Kp*error + Ki*integral + Kd*(error-last_error)/dt\nu = clamp(u, -2, 2)',{Kp:p.kp,Ki:p.ki,Kd:p.kd,dt},chart([actions],['控制量 u'])),f('更新对象','数值积分绘出 6 秒响应；更大增益并不保证所有对象都更好。','y += dt * (-y + u)',{final_y:round(y),final_error:round(1-y)},chart([values.map(()=>1),values],['目标','输出']))], '6 秒末输出 y 约为多少？',y,'','一阶理想对象的离散 PID 示例，包含输出限幅；并非电机参数或实物调参建议。');
 }};
 models.kalman={controls:[range('r','测量噪声方差 R',.1,9,1,.1),range('q','过程噪声方差 Q',.01,1,.1,.01)],run(t,p){
  const readings=[9.8,10.4,9.7,10.3,9.9,10.1];let x=8,P=2;const estimates=[],gains=[];
  for(const z of readings){P+=p.q;const K=P/(P+p.r);x+=K*(z-x);P=(1-K)*P;estimates.push(x);gains.push(K);}
  return output(this.controls,[f('预测','随机游走模型保持均值，并增加预测不确定性。','P_prior = P + Q',{x_initial:8,P_initial:2,Q:p.q},chart([readings],['观测'])),f('计算权重','R 越大，通常越少相信这次测量。','K = P_prior / (P_prior + R)',{R:p.r,first_gain:round(gains[0])},chart([gains],['Kalman 增益'])),f('校正','用创新量校正预测，再减小后验方差。','x = x_prior + K * (z - x_prior)\nP = (1 - K) * P_prior',{estimate:round(x),variance:round(P)},chart([readings,estimates],['观测','估计']))], '最后一次更新后的状态估计约为多少？',x,'','一维随机游走 Kalman 示例；方差、模型与独立验证决定适用范围。');
 }};
 models.camera={controls:[range('focal','焦距',100,800,400,50,'px'),range('depth','点的深度 Z',1,5,2,.5,'m')],run(t,p){
  const X=.5,cx=320,u=p.focal*X/p.depth+cx;
  return output(this.controls,[f('确定坐标','固定空间点 X = 0.5 m，使用针孔模型。','X = 0.5\nZ = depth\ncx = 320',{X,Z:p.depth,cx},flow(['空间点','相机坐标','投影','像素'])),f('归一化','越远的同一横向偏移，成像偏移越小。','x_normalized = X / Z',{normalized:round(X/p.depth)},flow(['空间点','相机坐标','投影','像素'],2)),f('投影到像素','本例不含畸变；真实标定还要独立图像检验。','u = fx * X / Z + cx',{fx:p.focal,u_px:round(u)}, {kind:'camera',u})], '该点的像素横坐标 u 是多少？',u,'px','针孔投影原理示例；没有根据棋盘图像求解真实相机参数。');
 }};
 models.dataset={controls:[range('shift','动作错开帧数',0,2,0),range('frame','查看第几帧',0,4,2)],run(t,p){
  const obs=[0,1,2,3,4],actions=[1,2,3,4,5],i=p.frame,j=i+p.shift,action=actions[j];
  return output(this.controls,[f('按时间取样','同一 episode 的观测、动作与时间戳一起检查。','sample = episode[frame]',{frame:i,observation:obs[i]},chart([obs,actions],['观测 x','动作目标'])),f('检查时间对齐','人为错位用于展示数据问题；越过边界的帧不能使用。','action_index = frame + shift',{action_index:j,valid:j<5},flow(obs.map((_,i)=>'t'+i),i)),f('构成训练对',action===undefined?'这一帧没有可配对的动作，不能用空值冒充标签。':'本例正确关系是 action = observation + 1。','pair = (observation, action) if valid else None',{observation:obs[i],action:action??'缺失',aligned:p.shift===0},chart([obs,obs.map((_,k)=>actions[k+p.shift]??null)],['观测','配对动作']))], '当前查看帧是否有动作标签？有填 1，没有填 0。',action===undefined?0:1,'','五帧原创教学数据；用于检查时间对齐，不代表真实机器人 episode。');
 }};
 models.imitation={controls:[range('bias','示范标签偏移',-2,2,0,.5),range('input','独立测试输入',0,6,5,.5)],run(t,p){
  const xs=[0,1,2,3],ys=xs.map(x=>2*x+1+p.bias),pred=2*p.input+1+p.bias,truth=2*p.input+1;
  return output(this.controls,[f('检查示范','本例示范关系是 a = 2x + 1，再人为加入标签偏移。','actions = [2*x + 1 + bias for x in observations]',{observations:xs,actions:ys},chart([ys],['示范动作'])),f('拟合最小策略','用一元直线建立可复算的模仿学习直觉。','policy = fit_line(observations, actions)',{slope:2,intercept:1+p.bias,training_error:0},flow(['示范','拟合','测试','误差'],1)),f('独立检查','训练误差为零，仍可能带着系统偏差。','predicted = policy(test_x)\nerror = predicted - expected',{input:p.input,predicted:pred,expected:truth,error:p.bias},chart([[truth],[pred]],['测试期望','策略输出']))], '当前独立测试输入的策略输出是多少？',pred,'','线性模仿学习小模型；不执行 ACT、深度网络训练或硬件控制。');
 }};
 models.power={controls:[range('capacity','容量',500,5000,2000,100,'mAh'),range('watts','恒定负载',1,10,5,.5,'W')],run(t,p){const wh=p.capacity/1000*3.7,hours=wh/p.watts;return output(this.controls,[f('换成能量','同一电压假设下，从 Ah 换算 Wh。','energy_Wh = capacity_mAh / 1000 * 3.7',{energy_Wh:round(wh)},flow(['容量','能量','功率','时间'])),f('估计时间','理想恒功率模型忽略转换损耗和放电曲线。','hours = energy_Wh / load_W',{hours:round(hours)},chart([[wh],[p.watts]],['能量 Wh','负载 W']))],'理想续航是多少小时？',hours,'h','3.7 V 理想恒功率估算；真实续航须考虑效率、放电与保护阈值。');}};
 models.rc={controls:[range('r','电阻',1,10,2,1,'kΩ'),range('c','电容',100,1000,500,100,'µF')],run(t,p){const tau=p.r*1000*p.c/1e6,values=Array.from({length:61},(_,i)=>5*(1-Math.exp(-i/12)));return output(this.controls,[f('计算时间常数','先把 kΩ、µF 换回 Ω、F。','tau = R_ohm * C_farad',{tau_s:round(tau)},flow(['电源','电阻','电容','电压'])),f('观察充电','横轴覆盖 0–5τ；经过一个 τ，约达最终值 63.2%。','Vc = 5 * (1 - exp(-t/tau))',{at_tau_V:round(5*(1-Math.exp(-1))),duration_s:round(5*tau)},chart([values],['电容电压 V']))],'本例时间常数是多少秒？',tau,'s','理想 RC 充电；未包含漏电、ESR 与测量负载。');}};
 models.wave={controls:[range('amplitude','峰值电压',1,10,5,.5,'V'),range('frequency','频率',1,5,2,1,'Hz')],run(t,p){const values=Array.from({length:81},(_,i)=>p.amplitude*Math.sin(2*Math.PI*p.frequency*i/80)),rms=p.amplitude/Math.sqrt(2);return output(this.controls,[f('生成正弦波','横轴为 1 秒；频率决定重复次数。','v = A * sin(2*pi*f*t)',{peak_V:p.amplitude,frequency_Hz:p.frequency},chart([values],['电压 V'])),f('比较有效值','纯正弦的有效值为峰值除以 √2。','Vrms = A / sqrt(2)',{rms_V:round(rms)},chart([[p.amplitude],[rms]],['峰值','有效值']))],'当前纯正弦的有效值是多少 V？',rms,'V','有效值关系仅对应本例纯正弦。');}};
 models.filter={controls:[range('ratio','输入频率 / 截止频率',.1,5,1,.1)],run(t,p){const gain=1/Math.sqrt(1+p.ratio**2);return output(this.controls,[f('比较时间尺度','一阶 RC 低通的截止频率为 1/(2πRC)。','fc = 1 / (2*pi*R*C)',{frequency_ratio:p.ratio},flow(['输入','阻抗','分压','输出'])),f('计算幅度比','频率越高，本例输出幅度越小。','gain = 1 / sqrt(1 + (f/fc)**2)',{gain:round(gain)},chart([[1],[gain]],['输入幅度','输出幅度']))],'当前输出 / 输入幅度比约为多少？',gain,'','一阶理想 RC 低通幅频示例，不包含谐振网络。');}};
 models.pwm={controls:[range('duty','占空比',0,100,40,5,'%')],run(t,p){const d=p.duty/100,values=Array.from({length:100},(_,i)=>i%20<20*d?3.3:0);return output(this.controls,[f('在高低电平间切换','瞬时电压仍是 0 或 3.3 V。','high = phase < duty',{duty_percent:p.duty},chart([values],['瞬时电压'])),f('计算周期平均','平均值不等于模拟输出已变成恒定电压。','average = 3.3 * duty',{average_V:round(3.3*d)},chart([[3.3*d],[3.3]],['周期平均','高电平']))],'当前周期平均电压是多少 V？',3.3*d,'V','理想 PWM；驱动负载的响应、滤波与通信协议分别验证。');}};
 models.switch={controls:[range('duty','控制占空比',0,100,50,10,'%'),range('supply','独立负载电源',3,12,6,1,'V')],run(t,p){const average=p.supply*p.duty/100;return output(this.controls,[f('分清两条路径','GPIO 给控制信号，负载电流由驱动级与独立电源提供。','driver_input = gpio\nload_supply = external_supply',{logic:'3.3 V 教学信号',load_supply:p.supply},flow(['GPIO','驱动级','负载电源','电机'],1)),f('切换能量路径','本例只显示理想开关的平均负载电压。','average_load_voltage = supply * duty',{duty:p.duty,average_V:round(average)},chart([[3.3],[p.supply],[average]],['逻辑电平','负载电源','周期平均']))],'理想负载周期平均电压是多少 V？',average,'V','理想驱动开关示意；未计算电机电流、反电动势、续流与热限制。');}};
 models.inductor={controls:[range('l','电感',1,20,10,1,'mH'),range('current','断开前电流',.1,2,1,.1,'A')],run(t,p){const energy=.5*p.l/1000*p.current**2;return output(this.controls,[f('存储磁场能量','电感中的电流不能在零时间内突变。','energy = 0.5 * L * I**2',{L_mH:p.l,current_A:p.current},flow(['电源','电感电流','磁场','能量'])),f('考虑断开过程','断开时需要为能量释放提供路径；此处不虚构尖峰数值。','voltage = L * di_dt',{stored_mJ:round(energy*1000),spike:'需释放路径与寄生参数'},chart([[energy*1000]],['储能 mJ']))],'断开前磁场储能是多少 mJ？',energy*1000,'mJ','理想储能计算；尖峰电压取决于回路与开关过程，不能由电感和电流单独确定。');}};
 models.opamp={controls:[range('input','输入电压',-.5,.5,.2,.05,'V'),range('gain','闭环理想增益',2,20,10,1)],run(t,p){const ideal=p.input*p.gain,actual=clip(ideal,-3,3);return output(this.controls,[f('计算理想线性输出','先用闭环增益计算目标输出。','ideal = input * gain',{ideal_V:round(ideal)},flow(['输入','反馈','增益','输出'])),f('检查输出限制','本例以 ±3 V 限幅来展示饱和。','output = clamp(ideal, -3, 3)',{output_V:round(actual),saturated:Math.abs(ideal)>3},chart([[ideal],[actual]],['理想输出','限幅输出']))],'当前限幅后的输出是多少 V？',actual,'V','理想增益加硬限幅；真实运放需核对电源、共模范围、输出摆幅与带宽。');}};

 models.chunks={controls:[range('size','每片最多字符',8,32,16,2),choose('query','查询词',['电池','电机'])],run(t,p){
  const docs=['电池容量决定储能，续航还取决于平均负载功率。','电机的控制信号与独立供电分开，采集数据时保留时间。'],chunks=[];
  docs.forEach((text,i)=>{for(let offset=0;offset<text.length;offset+=p.size)chunks.push({source:'文档'+(i+1),offset,text:text.slice(offset,offset+p.size)});});
  const query=['电池','电机'][p.query],hits=chunks.filter(c=>c.text.includes(query));
  return output(this.controls,[f('选择切分范围','固定字符切分只用于建立直觉，可能把词拆开。','for offset in range(0, len(text), size):\n    chunk = text[offset:offset+size]',{size:p.size,original_documents:2},flow(['原文','切分','保留来源','检索'])),f('保留出处','每片带文档编号与原文偏移，不能只保留文本。','chunk = {"source": doc_id, "offset": offset, "text": text}',{chunks:chunks.length,sources:chunks.map(c=>c.source+'@'+c.offset)},flow(chunks.map(c=>c.source+'@'+c.offset),1)),f('回到命中原文','片段的来源用于定位上下文；需要时调整切分策略。','hits = [c for c in chunks if query in c["text"]]',{query,hits:hits.map(c=>c.source+'@'+c.offset),text:hits.map(c=>c.text)},flow(['原文','切分','保留来源','检索'],3))],'当前两个文档共被切成几个片段？',chunks.length,'片','固定字符切分与来源定位示例；实际检索应按结构选择切分、重叠与上下文。');
 }};
 models.logic={controls:[choose('a','输入 A',['0','1'],1),choose('b','输入 B',['0','1']),choose('gate','逻辑门',['AND 与','OR 或','XOR 异或'])],run(t,p){const result=p.gate===0?Number(Boolean(p.a&&p.b)):p.gate===1?Number(Boolean(p.a||p.b)):Number(p.a!==p.b);return output(this.controls,[f('列出输入','输入是已经确认的二值逻辑，不把未知电平当成 0。','A, B = inputs',{A:p.a,B:p.b},flow(['输入 A = '+p.a,'输入 B = '+p.b,['AND','OR','XOR'][p.gate],'输出'],1)),f('应用真值规则','与要求同时为 1；或要求至少一个为 1；异或要求不同。','Y = (A and B) if gate == "AND" else (A or B) if gate == "OR" else (A != B)',{Y:result},flow(['输入 A = '+p.a,'输入 B = '+p.b,['AND','OR','XOR'][p.gate],'输出 '+result],3))],'当前输出 Y 是多少？',result,'','理想二值逻辑门；真实引脚电压必须先满足有效电平范围。');}};
 models.levels={controls:[range('v','输入电压',0,3.3,1.5,.1,'V')],run(t,p){const low=.3*3.3,high=.7*3.3,value=p.v<=low?0:p.v>=high?1:2;return output(this.controls,[f('先看阈值','本教学例指定 VIL = 0.3Vdd、VIH = 0.7Vdd。','VIL = 0.3 * Vdd\nVIH = 0.7 * Vdd',{Vdd:3.3,VIL:round(low),VIH:round(high)},chart([[low],[p.v],[high]],['低阈值','输入','高阈值'])),f('区分三种状态','阈值之间没有保证，保留未知状态。','level = 0 if V <= VIL else 1 if V >= VIH else None',{input_V:p.v,level:value===2?'未知':value},flow(['低电平','不确定区','高电平'],value===2?1:value===0?0:2))],'低电平填 0，高电平填 1，不确定填 2。',value,'','本例阈值只用于解释概念；真实器件的 VIL、VIH 与绝对最大值查其数据手册。');}};
 function compute(teaching,params={}){
  const model=models[teaching.model];if(!model)throw Error('未知教学模型：'+teaching.model);
  const clean={};for(const c of model.controls){const input=Number(params[c.key]??c.value);clean[c.key]=Number.isFinite(input)?clip(input,c.min??0,c.max??(c.options.length-1)):c.value;}
  const result=model.run(teaching,clean);return {...result,params:clean};
 }
 function check(result,value){const n=typeof value==='string'&&!value.trim()?NaN:Number(value);return Number.isFinite(n)&&Math.abs(n-result.exercise.expected)<=result.exercise.tolerance;}
 const api={models,compute,check};
 if(typeof module!=='undefined')module.exports=api;
 global.TeachingModels=api;
})(typeof globalThis!=='undefined'?globalThis:this);
