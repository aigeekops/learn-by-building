/* Arduino finite teaching arithmetic. No GPIO, board compilation or physical measurement. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const f=x=>Number(x).toFixed(4);
  const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<1e-10;
  const last=t=>t.steps[t.steps.length-1].variables;
  const cell=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note:note+' 数值显示四位小数，核对保留完整精度。'});
  function frame(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index)||0)));return {i,s:t.steps[i].variables,p:t.params};}
  function view(t,i,cells,boundary){return {title:t.steps[i].title+' · 逐格核对',summary:'当前第'+(i+1)+'个实际计算快照。'+boundary+' 仅为离线理想计算/有限逻辑，不代表开发板编译、接线、仿真器或实物验收，不产生学习完成或用时证据。',cells};}
  const experiment=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const models={};

  models['arduino-led']={
    intuition:'串联电阻只承担电源与LED压降之差；电流先用安培计算，再换成毫安，功耗由相同电流得到。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('supply','理想供电',s.supply,`Vs := ${f(s.supply)} V`,{supply:s.supply},'固定5V教学电源，未建模GPIO压降或输出限流。'),
        cell('led-drop','教学LED压降',s.ledDrop,`Vf := ${f(p.drop)} = ${f(s.ledDrop)} V`,{drop:p.drop},'固定压降近似，不是LED完整I–V曲线。'),
        cell('resistance','串联电阻',s.resistance,`R := ${f(p.resistance)} = ${f(s.resistance)} Ω`,{resistance:p.resistance},'理想电阻；不包含容差和温升。')];
      else if(i===1)cells=[cell('resistor-voltage','电阻承担的电压',s.resistorVoltage,`${f(s.supply)} − ${f(s.ledDrop)} = ${f(s.resistorVoltage)} V`,{supply:s.supply,ledDrop:s.ledDrop},'串联电压相加为电源电压，不能把5V全部施加到电阻公式。')];
      else if(i===2)cells=[
        cell('current-amp','串联电流',s.currentAmp,`${f(s.resistorVoltage)} V / ${f(s.resistance)} Ω = ${f(s.currentAmp)} A`,{voltage:s.resistorVoltage,resistance:s.resistance},'欧姆定律；串联LED与电阻电流相同。'),
        cell('current-milliamp','换算为毫安',s.currentMilliamp,`1000.0000 × ${f(s.currentAmp)} = ${f(s.currentMilliamp)} mA`,{currentAmp:s.currentAmp,ampToMilliamp:1000},'公式输入使用未舍入电流，显示四位不改变计算。')];
      else cells=[
        cell('current-square','电流平方',s.currentAmp*s.currentAmp,`${f(s.currentAmp)}² = ${f(s.currentAmp*s.currentAmp)} A²`,{currentAmp:s.currentAmp},'这是当前I²R功率计算的乘法项；小数显示可能四舍五入。'),
        cell('resistor-power','电阻消耗功率',s.resistorWatt,`${f(s.currentAmp)}² × ${f(s.resistance)} = ${f(s.resistorWatt)} W`,{currentAmp:s.currentAmp,resistance:s.resistance},'只计算电阻功耗；额定功率、GPIO电流与接线须另行核对。'),
        cell('power-crosscheck','同一功率的电压表达式',s.resistorVoltage*s.resistorVoltage/s.resistance,`${f(s.resistorVoltage)}² / ${f(s.resistance)} = ${f(s.resistorVoltage*s.resistorVoltage/s.resistance)} W`,{voltage:s.resistorVoltage,resistance:s.resistance},'V²/R与I²R来自同一理想串联模型，不是独立测量。')];
      return view(t,i,cells,'Uno R3的5V串联LED固定压降模型。');
    },
    experiments:[experiment('double-resistance','只把电阻从220Ω改为440Ω','电阻电压仍为3V，电流和电阻功耗均减半。',{resistance:220,drop:2},{resistance:440,drop:2},'固定电压下I=V/R，P=V²/R。',(a,b)=>{const x=last(a),y=last(b);return near(x.resistorVoltage,3)&&near(y.resistorVoltage,3)&&near(x.currentAmp,3/220)&&near(y.currentAmp,3/440)&&near(x.currentMilliamp,3000/220)&&near(y.currentMilliamp,3000/440)&&near(x.resistorWatt,9/220)&&near(y.resistorWatt,9/440);})]
  };

  models['arduino-input']={
    intuition:'接地按钮是低有效输入：按下读LOW；松开有上拉才读HIGH，没有偏置的浮空输入保持未知。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('pressed-input','物理按钮输入',s.pressed,`${p.pressed} === yes → ${s.pressed}`,{pressed:p.pressed},'布尔值表示按钮是否接通GND；本模型没有机械抖动。'),
        cell('pullup-input','是否配置上拉',s.pullup,`${p.pullup} === yes → ${s.pullup}`,{pullup:p.pullup},'是电路条件输入，不是已经检查真实pinMode或外部电阻。')];
      else if(i===1)cells=[cell('raw-level','当前理想原始电平',s.raw,`${s.pressed} ? LOW(0) : (${s.pullup} ? HIGH(1) : null) → ${s.raw===null?'未知(null)':s.raw}`,{pressed:s.pressed,pullup:s.pullup},'0/1是逻辑状态而非电压测量；按钮按下可接地，松开无偏置则不可知。')];
      else if(i===2)cells=[cell('logical-pressed','低有效语义转换',s.logicalPressed,`${s.raw===null?'null':s.raw} === null ? null : (${s.raw===null?'null':s.raw} === LOW(0)) → ${s.logicalPressed===null?'未知(null)':s.logicalPressed}`,{raw:s.raw,low:0},'必须先保留null，不能把未知当作false或释放状态。')];
      else cells=[
        cell('known','电平是否确定',s.known,`${s.raw===null?'null':s.raw} !== null → ${s.known}`,{raw:s.raw},'known只表示本理想电路是否有确定逻辑，不表示真实信号无噪声。'),
        cell('led-output','本真值行的LED语义',s.led,`${s.logicalPressed===null?'null':s.logicalPressed} === null ? 未知 : (pressed ? 开 : 关) → ${s.led}`,{logicalPressed:s.logicalPressed},'未知仍显示未知；没有执行GPIO，也未消抖。')];
      return view(t,i,cells,'按钮闭合接地、上拉可选的三值逻辑。');
    },
    experiments:[
      experiment('press-grounded-button','只把按钮由松开改为按下','上拉保持启用，raw由1变0，低有效pressed由false变true。',{pressed:'no',pullup:'yes'},{pressed:'yes',pullup:'yes'},'接地按钮按下得到LOW，语义按下与raw取反。',(a,b)=>{const x=last(a),y=last(b);return x.raw===1&&y.raw===0&&x.logicalPressed===false&&y.logicalPressed===true&&x.known===true&&y.known===true&&x.led==='关'&&y.led==='开';}),
      experiment('remove-released-pullup','只关闭松开按钮的上拉','raw、logicalPressed变null，known变false，LED语义变未知。',{pressed:'no',pullup:'yes'},{pressed:'no',pullup:'no'},'松开按钮不再有任何偏置，不能推断HIGH或LOW。',(a,b)=>{const x=last(a),y=last(b);return x.raw===1&&x.logicalPressed===false&&x.known===true&&x.led==='关'&&y.raw===null&&y.logicalPressed===null&&y.known===false&&y.led==='未知';})
    ]
  };

  models['arduino-adc']={
    intuition:'先区分10位代码的端点1023和量化区间数1024，再由已知分压比恢复外部电压；转换值不是精确测量。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('raw-code','本次ADC代码',s.raw,`code := ${f(p.raw)} = ${f(s.raw)}`,{raw:p.raw},'无量纲整数，Uno R3教学范围0–1023，未采集模拟信号。'),
        cell('max-code','10位最大代码',s.maxCode,`2^10 − 1 = ${f(s.maxCode)}`,{bits:10},'1024个代码的最大索引为1023。'),
        cell('reference','给定参考电压',s.reference,`Vref := ${f(p.reference)} = ${f(s.reference)} V`,{reference:p.reference},'本例输入值，不表示板卡参考源已经测准。')];
      else if(i===1)cells=[
        cell('voltage-numerator','端点换算乘积',s.raw*s.reference,`${f(s.raw)} × ${f(s.reference)} = ${f(s.raw*s.reference)} code·V`,{raw:s.raw,reference:s.reference},'先乘参考电压，再除最大代码。'),
        cell('voltage','端点线性标定电压',s.voltage,`${f(s.raw)} × ${f(s.reference)} / ${f(s.maxCode)} = ${f(s.voltage)} V`,{raw:s.raw,reference:s.reference,maxCode:s.maxCode},'端点映射保证代码1023映到Vref，不是ADC精确传输函数。')];
      else if(i===2)cells=[
        cell('lsb','理想量化区间步距',s.lsb,`${f(s.reference)} / 1024.0000 = ${f(s.lsb)} V/code`,{reference:s.reference,intervals:1024},'理想10位量化区间步距，分母1024不同于端点映射的1023。'),
        cell('endpoint-step','端点映射相邻代码间距',s.reference/s.maxCode,`${f(s.reference)} / ${f(s.maxCode)} = ${f(s.reference/s.maxCode)} V/code`,{reference:s.reference,maxCode:s.maxCode},'用于比较两种分母；不把端点插值间距冒充量化LSB。')];
      else cells=[
        cell('source-voltage','分压前的外部电压估计',s.sourceVoltage,`2.0000 × ${f(s.voltage)} = ${f(s.sourceVoltage)} V`,{pinVoltage:s.voltage,inverseDivider:2},'假设已核对的等阻分压比1/2；不授权把超限电压接到引脚。'),
        cell('source-step','外部电压的量化步距',s.quantizationOnly,`2.0000 × ${f(s.lsb)} = ${f(s.quantizationOnly)} V/code`,{lsb:s.lsb,inverseDivider:2},'仅把一个量化区间放大两倍，不是总误差或正负误差界；忽略参考误差、噪声和电阻容差。')];
      return view(t,i,cells,'10位ADC端点插值、理想量化步距与等阻分压换算。');
    },
    experiments:[experiment('change-reference','只把参考电压从5V改为4V','代码512不变，端点电压、LSB和分压前估计都乘0.8。',{raw:512,reference:5},{raw:512,reference:4},'相同代码在不同参考电压下代表不同电压。',(a,b)=>{const x=last(a),y=last(b);return x.raw===512&&y.raw===512&&near(x.voltage,2560/1023)&&near(y.voltage,2048/1023)&&near(x.lsb,5/1024)&&near(y.lsb,4/1024)&&near(x.sourceVoltage,5120/1023)&&near(y.sourceVoltage,4096/1023)&&near(x.quantizationOnly,10/1024)&&near(y.quantizationOnly,8/1024);})]
  };

  models['arduino-pwm']={
    intuition:'PWM改变开关时间比例，高电平仍是5V；频率决定周期，占空比决定其中高低时长，理想平均值不能直接当负载响应。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('pwm-code','8位PWM输入代码',s.code,`code := ${f(p.code)} = ${f(s.code)}`,{code:p.code},'无量纲代码0–255；未执行analogWrite。'),
        cell('high-voltage','理想高电平幅值',s.supply,`Vhigh := ${f(s.supply)} V`,{supply:s.supply},'高电平幅值固定，不随占空比变成较低直流电压。')];
      else if(i===1)cells=[
        cell('duty','端点占空比模型',s.duty,`${f(s.code)} / 255.0000 = ${f(s.duty)}`,{code:s.code,maxCode:255},'无量纲时间比例；0为持续关，255为持续开。'),
        cell('period','PWM周期',s.period,`1.0000 / ${f(p.frequency)} = ${f(s.period)} s`,{frequency:p.frequency},'频率单位Hz；教学输入不代表特定Uno引脚默认频率。'),
        cell('period-ms','周期换算毫秒',1000*s.period,`1000.0000 × ${f(s.period)} = ${f(1000*s.period)} ms`,{periodSeconds:s.period},'同一周期的单位转换。')];
      else if(i===2)cells=[
        cell('on-time','每周期高电平时长',s.onTime,`${f(s.duty)} × ${f(s.period)} = ${f(s.onTime)} s`,{duty:s.duty,period:s.period},'当前帧计算高电平时长，完整精度保留于value。'),
        cell('off-time','每周期低电平时长',s.offTime,`(1.0000 − ${f(s.duty)}) × ${f(s.period)} = ${f(s.offTime)} s`,{duty:s.duty,period:s.period},'端点代码255时低电平时长为0。'),
        cell('period-check','高低时长之和',s.onTime+s.offTime,`${f(s.onTime)} + ${f(s.offTime)} = ${f(s.onTime+s.offTime)} s`,{onTime:s.onTime,offTime:s.offTime},'在同一理想周期内，高低时长之和应等于周期。')];
      else cells=[
        cell('high-average','高电平的平均贡献',s.supply*s.duty,`${f(s.supply)} × ${f(s.duty)} = ${f(s.supply*s.duty)} V`,{high:s.supply,duty:s.duty},'理想低电平为0V，所以低电平平均贡献为0。'),
        cell('ideal-average','理想时间平均电压',s.idealAverage,`${f(s.supply)} × ${f(s.duty)} + 0.0000 × (1.0000 − ${f(s.duty)}) = ${f(s.idealAverage)} V`,{high:s.supply,low:0,duty:s.duty},'时间平均值不是恒定输出电压；亮度、转速与滤波响应需各自负载模型。')];
      return view(t,i,cells,'5V理想开关输出与code/255端点占空比模型。');
    },
    experiments:[
      experiment('double-frequency','只把频率从500Hz改为1000Hz','占空比与理想平均电压不变，周期及高低时长减半。',{code:128,frequency:500},{code:128,frequency:1000},'周期是频率倒数，占空比不因频率单独改变。',(a,b)=>{const x=last(a),y=last(b);return near(x.duty,128/255)&&near(y.duty,128/255)&&near(x.period,.002)&&near(y.period,.001)&&near(x.onTime,128/255/500)&&near(y.onTime,128/255/1000)&&near(x.offTime,127/255/500)&&near(y.offTime,127/255/1000)&&near(x.idealAverage,640/255)&&near(y.idealAverage,640/255);}),
      experiment('continuous-high','只把代码128改为255','周期仍2ms，占空比达到1，高电平占满周期，低电平时长为0，平均5V。',{code:128,frequency:500},{code:255,frequency:500},'端点代码代表持续高电平，不能继续解释为有低脉冲。',(a,b)=>{const x=last(a),y=last(b);return near(x.duty,128/255)&&near(y.duty,1)&&near(x.period,.002)&&near(y.period,.002)&&near(x.onTime,128/255/500)&&near(y.onTime,.002)&&near(x.offTime,127/255/500)&&near(y.offTime,0)&&near(x.idealAverage,640/255)&&near(y.idealAverage,5);})
    ]
  };

  models['arduino-timing']={
    intuition:'32位毫秒计数器回绕后仍用无符号差求间隔；达到门槛只运行一次，再把基准更新为当前时间。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('last','上次运行的32位时刻',s.last,`2^32 − 100.0000 = ${f(s.last)} ms`,{counterPeriod:4294967296,offset:100},'固定在回绕前100ms；不是当前机器的实际millis读数。'),
        cell('unwrapped-now','加法的未取模值',s.last+p.elapsed,`${f(s.last)} + ${f(p.elapsed)} = ${f(s.last+p.elapsed)} ms`,{last:s.last,elapsed:p.elapsed},'当前now计算的中间项，可大于32位最大值。'),
        cell('now','回绕后的当前时刻',s.now,`(${f(s.last)} + ${f(p.elapsed)}) mod 4294967296.0000 = ${f(s.now)} ms`,{last:s.last,elapsed:p.elapsed,modulus:4294967296},'JS的>>>0在本教学范围实现无符号32位取模。')];
      else if(i===1)cells=[
        cell('signed-difference','取模前的有符号差',s.now-s.last,`${f(s.now)} − ${f(s.last)} = ${f(s.now-s.last)} ms`,{now:s.now,last:s.last},'回绕后此中间值可为负，不能直接拿它判断任务到期。'),
        cell('unsigned-difference','无符号经过时间',s.difference,`(${f(s.now)} − ${f(s.last)}) mod 4294967296.0000 = ${f(s.difference)} ms`,{now:s.now,last:s.last,modulus:4294967296},'要求实际经过时间小于整个2^32ms计数周期；多次整周期不能恢复。')];
      else if(i===2)cells=[
        cell('due-margin','距离任务门槛的余量',s.difference-p.interval,`${f(s.difference)} − ${f(p.interval)} = ${f(s.difference-p.interval)} ms`,{difference:s.difference,interval:p.interval},'非负表示已达到门槛；门槛包含等号。'),
        cell('due','本次是否运行任务',s.due,`${f(s.difference)} ≥ ${f(p.interval)} → ${s.due}`,{difference:s.difference,interval:p.interval},'本例非阻塞判断，不调用delay，也不补跑所有漏掉的周期。')];
      else cells=[
        cell('executions','本轮执行次数',s.executions,`${s.due} ? 1.0000 : 0.0000 → ${f(s.executions)}`,{due:s.due},'是本次逻辑调用的0或1次，不是累计运行次数。'),
        cell('next-last','下一轮计时基准',s.nextLast,`${s.due} ? now(${f(s.now)}) : last(${f(s.last)}) → ${f(s.nextLast)} ms`,{due:s.due,now:s.now,last:s.last},'采用last=now策略；不同于last+=interval的固定节拍策略。')];
      return view(t,i,cells,'32位无符号毫秒差；实际间隔须小于一个计数周期。');
    },
    experiments:[experiment('reach-interval','只把经过时间从100ms增到200ms','回绕后的now由0变100，差值由100变200，到期由false变true，执行次数0变1。',{interval:200,elapsed:100},{interval:200,elapsed:200},'等于间隔时允许运行，回绕不会把200ms变成负间隔。',(a,b)=>{const x=last(a),y=last(b);return x.last===4294967196&&y.last===4294967196&&x.now===0&&y.now===100&&x.difference===100&&y.difference===200&&x.due===false&&y.due===true&&x.executions===0&&y.executions===1&&x.nextLast===4294967196&&y.nextLast===100;})]
  };

  models['arduino-debounce']={
    intuition:'候选电平每次变化都重置起点；只在采样时确认已稳定足够久的下降沿，长按不产生第二次按下。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=s.times.map((time,j)=>cell('sample-'+j,'采样'+j+'的原始电平',s.raw[j],`t[${j}] = ${f(time)} ms → raw[${j}] = ${f(s.raw[j])}`,{time,raw:s.raw[j]},'0为低有效按下候选，1为释放；本帧仅给定采样，不计算确认事件。'));
      else if(i===1){cells=[];s.history.forEach((h,j)=>{const previous=j?s.history[j-1]:{candidate:1,stable:1,since:0},changed=s.raw[j]!==previous.candidate,age=h.t-h.since,eligible=h.candidate!==previous.stable&&age>=p.quiet;
        cells.push(cell('candidate-'+j,'采样'+j+'候选与起点',{candidate:h.candidate,since:h.since,age},`raw(${s.raw[j]}) ≠ previousCandidate(${previous.candidate}) → ${changed}; since = ${f(h.since)} ms; age = ${f(h.t)} − ${f(h.since)} = ${f(age)} ms`,{time:h.t,raw:s.raw[j],previousCandidate:previous.candidate,previousSince:previous.since},'候选改变时从当前采样重计时；未改变时保留原起点。'));
        cells.push(cell('stable-'+j,'采样'+j+'稳定状态转换',h.stable,`candidate(${h.candidate}) ≠ stableBefore(${previous.stable}) AND ${f(age)} ≥ ${f(p.quiet)} → ${eligible}; stable ${previous.stable} → ${h.stable}`,{candidate:h.candidate,stableBefore:previous.stable,age,quiet:p.quiet},eligible&&h.stable===0?'此采样确认稳定下降沿，记录一次按下。':'门槛未通过或稳定值未变，当前采样不产生按下事件。'));
      });}
      else if(i===2)cells=[
        ...s.presses.map((time,j)=>cell('press-'+j,'稳定按下事件'+j,time,`presses[${j}] := ${f(time)} ms`,{confirmedAt:time},'来自上一快照已计算的稳定下降沿；持续LOW不重复记录。')),
        cell('press-count','稳定按下事件总数',s.pressCount,`length([${s.presses.map(f).join(', ')}]) = ${f(s.pressCount)}`,{presses:s.presses},'单位次；这是当前有限采样序列的事件数。')];
      else cells=[
        ...s.raw.slice(1).map((raw,j)=>{const edge=s.raw[j]===1&&raw===0;return cell('raw-edge-'+(j+1),'原始采样边沿'+j+'→'+(j+1),Number(edge),`raw[${j}](${s.raw[j]}) === 1 AND raw[${j+1}](${raw}) === 0 → ${edge} → ${Number(edge)}`,{previous:s.raw[j],current:raw},'布尔贡献0或1；原始下降沿可能是机械抖动。');}),
        cell('raw-falling-edges','原始下降沿总数',s.rawFallingEdges,`${s.raw.slice(1).map((raw,j)=>Number(s.raw[j]===1&&raw===0)).join(' + ')} = ${f(s.rawFallingEdges)}`,{raw:s.raw},'单位次；本例原始2次下降沿只确认一次按下。'),
        cell('first-confirmed','首次稳定按下时间',s.firstConfirmed,s.firstConfirmed===null?'presses为空 → null':`presses[0] = ${f(s.firstConfirmed)} ms`,{presses:s.presses},'在当前采样点才可确认；不是按钮真实接触开始时刻。')];
      return view(t,i,cells,'当前第二快照一次处理完整6个采样；逐样本算格是该批计算展开，不伪造实时帧。采样稀疏可能漏掉短按。');
    },
    experiments:[experiment('longer-quiet-window','只把稳定门槛从20ms增至30ms','原始序列仍2个下降沿，稳定按下仍1次，但首次确认从40ms推迟到70ms。',{quiet:20},{quiet:30},'最后一次候选变化在15ms；40−15=25ms满足20但不足30，只能等70ms采样确认。',(a,b)=>{const x=last(a),y=last(b);return x.rawFallingEdges===2&&y.rawFallingEdges===2&&x.pressCount===1&&y.pressCount===1&&x.firstConfirmed===40&&y.firstConfirmed===70&&x.presses.length===1&&x.presses[0]===40&&y.presses.length===1&&y.presses[0]===70&&x.history[4].stable===0&&y.history[4].stable===1&&y.history[5].stable===0;})]
  };

  models['arduino-actuator']={
    intuition:'舵机控制脉宽的微秒与驱动功耗的瓦特是不同量；电流翻倍使等效导通损耗变为四倍，角度命令不能证明实际转角。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('target-angle','教学目标角度',s.angle,`angle := ${f(p.angle)} = ${f(s.angle)} °`,{angle:p.angle},'只是给定命令，不是编码器测得角度。'),
        cell('load-current','教学负载电流',s.current,`I := ${f(p.current)} = ${f(s.current)} A`,{current:p.current},'是损耗估算输入，不是由角度或PWM推导的电流。')];
      else if(i===1)cells=[
        cell('angle-fraction','角度占教学量程比例',s.angle/180,`${f(s.angle)} / 180.0000 = ${f(s.angle/180)}`,{angle:s.angle,fullScale:180},'无量纲线性标定比例，真实舵机须重新标定范围。'),
        cell('pulse','舵机命令脉宽',s.pulseMicroseconds,`1000.0000 + ${f(s.angle)} / 180.0000 × 1000.0000 = ${f(s.pulseMicroseconds)} μs`,{angle:s.angle,minimumPulse:1000,pulseSpan:1000},'本例将0–180°映射1000–2000μs；不是PWM代码，也未包含脉冲周期。')];
      else if(i===2)cells=[
        cell('voltage-drop','驱动等效电阻压降',s.voltageDrop,`${f(p.current)} × ${f(p.resistance)} = ${f(s.voltageDrop)} V`,{current:p.current,resistance:p.resistance},'只估算导通电阻上的I×R压降。'),
        cell('current-square','负载电流平方',p.current*p.current,`${f(p.current)}² = ${f(p.current*p.current)} A²`,{current:p.current},'导通功耗对电流是平方关系。'),
        cell('conduction-power','驱动导通损耗',s.conductionWatt,`${f(p.current)}² × ${f(p.resistance)} = ${f(s.conductionWatt)} W`,{current:p.current,resistance:p.resistance},'仅I²R导通损耗；不含启动、堵转、开关损耗或热阻，不能据此证明驱动额定值满足。')];
      else cells=[
        cell('signal-unit','控制信号的量与单位',s.signal,`signal := ${s.signal}; 当前命令 ${f(s.pulseMicroseconds)} μs`,{pulseMicroseconds:s.pulseMicroseconds},'脉宽是时间，不与8位PWM代码或驱动功率互换。'),
        cell('power-boundary','驱动与供电要求',s.power,`power := ${s.power}; 当前导通估算 ${f(s.conductionWatt)} W`,{conductionWatt:s.conductionWatt,voltageDrop:s.voltageDrop},'必须另核对外部驱动、供电、共地和器件规格；本页未驱动设备。')];
      return view(t,i,cells,'舵机线性命令标定与独立I²R等效导通损耗。');
    },
    experiments:[
      experiment('double-load-current','只把电流从0.5A增到1A','脉宽保持1500μs，电阻压降从0.2V增到0.4V，导通损耗从0.1W增到0.4W。',{angle:90,current:.5,resistance:.4},{angle:90,current:1,resistance:.4},'信号命令不决定功率电流，固定R下电流翻倍使I²R变四倍。',(a,b)=>{const x=last(a),y=last(b);return near(x.pulseMicroseconds,1500)&&near(y.pulseMicroseconds,1500)&&near(x.voltageDrop,.2)&&near(y.voltageDrop,.4)&&near(x.conductionWatt,.1)&&near(y.conductionWatt,.4);}),
      experiment('change-angle-command','只把目标角90°改为180°','脉宽从1500μs改为2000μs，给定电流与导通损耗保持0.5A、0.1W。',{angle:90,current:.5,resistance:.4},{angle:180,current:.5,resistance:.4},'角度只进入教学脉宽映射；电流独立给定，不借此声称真实负载电流不变。',(a,b)=>{const x=last(a),y=last(b);return near(x.pulseMicroseconds,1500)&&near(y.pulseMicroseconds,2000)&&near(x.current,.5)&&near(y.current,.5)&&near(x.voltageDrop,.2)&&near(y.voltageDrop,.2)&&near(x.conductionWatt,.1)&&near(y.conductionWatt,.1);})
    ]
  };

  models['arduino-project']={
    intuition:'只有观测有效、人工使能且距离不少于15cm才输出PWM100；超时保留未知距离，并保存停止原因。',
    inspect(t,index){const {i,s,p}=frame(t,index);let cells;
      if(i===0)cells=[
        cell('distance','带有效性的距离',s.distance,`${p.sensor} === valid ? ${f(p.distance)} cm : null → ${s.distance===null?'未知(null)':f(s.distance)+' cm'}`,{sensor:p.sensor,distanceInput:p.distance},'超时不是0cm或无限远；无效时保留null，原始距离控件仍可能有数值。'),
        cell('enabled','人工使能条件',s.enabled,`${p.enable} === yes → ${s.enabled}`,{enable:p.enable},'人工教学开关，不代表独立硬件急停的状态。')];
      else if(i===1)cells=[cell('known','距离是否可用',s.known,`${s.distance===null?'null':f(s.distance)+' cm'} !== null → ${s.known}`,{distance:s.distance},'先判有效性，再使用距离；不把null强制转换成数值。')];
      else if(i===2)cells=[
        cell('clearance','距离条件',s.known?s.distance>=15:null,s.known?`${f(s.distance)} ≥ 15.0000 cm → ${s.distance>=15}`:'distance = null → 不作数值距离比较',{known:s.known,distance:s.distance,threshold:15},'包含15cm等号；无效输入的此格显示null，实际run通过known短路为false。'),
        cell('run','教学运行门控',s.run,`${s.known} AND ${s.enabled} AND ${s.known?'('+f(s.distance)+' ≥ 15.0000)':'未求值(距离未知)'} → ${s.run}`,{known:s.known,enabled:s.enabled,distance:s.distance,threshold:15},'显式合取只表达本例规则，不替代驱动保护或真实安全系统。')];
      else cells=[
        cell('pwm','教学输出代码',s.pwm,`${s.run} ? 100.0000 : 0.0000 → ${f(s.pwm)}`,{run:s.run,runCode:100,stopCode:0},'无量纲PWM代码；不是电压、转速，也没有发送到GPIO。'),
        cell('reason','本次输出的具体原因',s.reason,`!known(${!s.known}) ? 超时 : !enabled(${!s.enabled}) ? 关闭 : distance<15(${s.known?s.distance<15:'未求值'}) ? 过近 : 允许 → ${s.reason}`,{known:s.known,enabled:s.enabled,distance:s.distance},'按超时、人工关闭、过近、允许的顺序选择原因；原因是教学逻辑输出。')];
      return view(t,i,cells,'有限距离门控与失效停止逻辑，未模拟运动或传感器时序。');
    },
    experiments:[
      experiment('sensor-timeout','只把传感器状态从有效改为超时','距离控件仍20cm，但有效距离变null，known与run变false，PWM100变0且原因是传感器超时。',{distance:20,sensor:'valid',enable:'yes'},{distance:20,sensor:'timeout',enable:'yes'},'未知观测必须独立进入停止分支，不能用控件残留距离放行。',(a,b)=>{const x=last(a),y=last(b);return x.distance===20&&y.distance===null&&x.known===true&&y.known===false&&x.enabled===true&&y.enabled===true&&x.run===true&&y.run===false&&x.pwm===100&&y.pwm===0&&x.reason==='允许本例运行'&&y.reason==='传感器超时';}),
      experiment('reach-distance-threshold','只把有效距离从10cm改为15cm','有效且已使能保持不变，跨过包含等号的门槛，输出由停止0变为允许100。',{distance:10,sensor:'valid',enable:'yes'},{distance:15,sensor:'valid',enable:'yes'},'距离条件使用≥15而非>15；15cm刚好满足本例。',(a,b)=>{const x=last(a),y=last(b);return x.distance===10&&y.distance===15&&x.known===true&&y.known===true&&x.enabled===true&&y.enabled===true&&x.run===false&&y.run===true&&x.pwm===0&&y.pwm===100&&x.reason==='障碍过近'&&y.reason==='允许本例运行';})
    ]
  };

  return {courseId:'arduino',models};
});
