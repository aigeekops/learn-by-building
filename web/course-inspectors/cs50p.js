/* CS50P: inspect recorded execution snapshots; never execute arbitrary Python or invent frames. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const has=(v,k)=>Object.hasOwn(v,k),n=x=>typeof x==='number'?x.toFixed(4):String(x),q=x=>JSON.stringify(x);
  const cell=(id,label,value,formula,inputs={},note='')=>({id,label,value,formula,inputs,note});
  const exp=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const near=(a,b)=>Math.abs(a-b)<1e-10;
  function frame(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0)),history=t.steps.slice(0,i+1);return {i,f:t.steps[i],v:Object.assign({},...history.map(s=>s.variables)),history};}
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const s=frame(t,index);return {title:s.f.title,summary:'检查当前及此前执行快照；播放不会重跑代码。'+s.f.detail,cells:inspect(t,s)};},experiments};}
  const models={};

  models['cs50p-functions']=model('跟踪调用处、局部形参、局部赋值、return 与调用处接收；原始格数与毫米结果属于不同名字。',(t,{i,v})=>{
    const p=t.params,c=[cell('caller-raw','调用处 raw',p.raw,`raw ← ${n(p.raw)} 格；本次函数没有给 raw 重新赋值`,{raw:p.raw},'这是有限数值传参案例，不演示可变对象别名。')];
    if(i===1)c.push(cell('call','准备实参，尚未接收返回值',null,`calibrate(${n(p.raw)}, ${n(p.gain)}, ${n(p.offset)})；distance 尚未绑定`,{arguments:v.arguments},'函数定义不等于本次调用已执行。'));
    if(i>=2&&i<=5)c.push(cell('local-value','本次调用的局部 value',p.raw,`形参 value ← 调用处 raw 的值 ${n(p.raw)}`,{argument:p.raw,localValue:p.raw},'局部作用域只在本次调用中使用；返回后不当作调用处变量。'));
    if(i>=3&&i<=5)c.push(cell('scaled','局部 scaled 赋值',v.scaled,`${n(p.raw)} 格 × ${n(p.gain)} mm/格 = ${n(v.scaled)} mm`,{value:p.raw,gain:p.gain}));
    if(i>=4&&i<=5)c.push(cell('corrected','局部 corrected 赋值',v.corrected,`${n(v.scaled)} + ${n(p.offset)} = ${n(v.corrected)} mm`,{scaled:v.scaled,offset:p.offset}));
    if(i===5)c.push(cell('return','返回通道',v.returned,`return corrected → ${n(v.returned)}；调用处尚未接收`,{returned:v.returned},'return 把数值交回；没有打印副作用。'));
    if(i===6)c.push(cell('distance','调用处接收 distance',v.distance,`distance ← 返回的 ${n(v.distance)} mm；raw 仍为 ${n(v.raw)} 格`,{returned:v.returned,raw:v.raw},'调用已结束，局部 value/scaled/corrected 不再显示为活动局部变量。'));
    return c;
  },[
    exp('offset','只修改校准偏移','raw、scaled 与 distance 中，哪些会改变？',{offset:0},{offset:1},'raw=8、scaled=16 不变，返回距离16变17。',(a,b)=>a.result.raw===8&&b.result.raw===8&&a.result.scaled===16&&b.result.scaled===16&&a.result.distance===16&&b.result.distance===17),
    exp('zero','只修改原始读数','零格数是否意味着校准距离也必为零？',{raw:0,gain:2,offset:-5},{raw:1,gain:2,offset:-5},'偏移仍参与运算，距离-5变-3；允许显示负的算术结果。',(a,b)=>a.result.scaled===0&&a.result.distance===-5&&b.result.scaled===2&&b.result.distance===-3)
  ]);

  models['cs50p-conditions']=model('先判有效性，再按互斥条件的顺序选唯一分支；等号边界与缺测状态各有明确结果。',(t,{v})=>{
    const p=t.params,c=[cell('valid','有效性赋值',v.valid,`${q(p.valid)} === 'yes' → ${v.valid}`,{validInput:p.valid},'无效是独立状态，不能伪装成测量值0。')];
    if(has(v,'near'))c.push(cell('near','停车候选条件',v.near,`${n(p.distance)} ≤ ${n(p.stop)} → ${v.near}`,{distance:p.distance,stop:p.stop}));
    if(has(v,'mid'))c.push(cell('mid','慢行候选条件',v.mid,`${n(p.distance)} ≤ 50.0000 → ${v.mid}`,{distance:p.distance},'当前模型显式记录两个布尔值；Python elif 不会执行未到达的分支。'));
    if(has(v,'branch'))c.push(cell('branch','第一个满足的分支',v.branch,`!valid=${!v.valid}；near=${v.near}；mid=${v.mid} → ${v.branch}`,{valid:v.valid,near:v.near,mid:v.mid},'invalid 优先，其次 stop，其次 slow，最后 forward；候选条件为真不代表该分支最终被选。'));
    if(has(v,'speed'))c.push(cell('speed','分支映射返回值',v.speed,`{invalid:0, stop:0, slow:30, forward:60}[${q(v.branch)}] = ${n(v.speed)}`,{branch:v.branch},'虚拟速度命令，不代表真实电机安全验证。'));
    return c;
  },[
    exp('equal','只让距离跨过停车边界','等于20和21会选同一支吗？',{distance:20,stop:20},{distance:21,stop:20},'20进入stop返回0；21进入slow返回30。',(a,b)=>a.result.near&&a.result.branch==='stop'&&a.result.speed===0&&!b.result.near&&b.result.branch==='slow'&&b.result.speed===30),
    exp('invalid','只改变测量有效性','远距离在无效时能否继续前进？',{distance:100,valid:'yes'},{distance:100,valid:'no'},'相同距离100，forward/60变invalid/0。',(a,b)=>a.result.branch==='forward'&&a.result.speed===60&&b.result.branch==='invalid'&&b.result.speed===0)
  ]);

  models['cs50p-loops']=model('逐轮绑定元素并比较阈值；接受时把本项加到旧累计，跳过时保持累计，空样本均值保留缺失。',(t,{f,v,history})=>{
    const c=[],p=t.params;
    v.readings.forEach((x,j)=>c.push(cell('input-'+j,`输入 readings[${j}]`,x,`固定列表取前 ${p.count} 项；索引 ${j} → ${n(x)}`,{count:p.count,index:j},'列表已建立；这不表示所有元素都已执行过滤。')));
    if(!v.readings.length)c.push(cell('empty','循环入口',0,'readings.length = 0 → 不绑定 value，不执行循环体',{length:0}));
    if(has(v,'total'))c.push(cell('total','当前累计 total',v.total,`${(v.accepted||[]).map(n).join(' + ')||'0.0000'} = ${n(v.total)}`,{accepted:v.accepted||[]},'只含已经通过条件的项。'));
    if(has(f.variables,'value'))c.push(cell('condition','本轮条件',f.variables.keep,`value ← readings[${v.index}] = ${n(v.value)}；${n(v.value)} ≥ ${n(p.minimum)} → ${v.keep}`,{index:v.index,value:v.value,minimum:p.minimum,before:v.before},'本帧先判断，累计尚未改变。'));
    if(has(f.variables,'index')&&has(f.variables,'accepted')){
      const previous=history.at(-2).variables,before=previous.before,value=previous.value;
      c.push(cell('update','本轮累计状态转换',v.total,`${n(before)} ${previous.keep?'+ '+n(value):'+ 0.0000（跳过）'} = ${n(v.total)}`,{before,value,keep:previous.keep,after:v.total}));
      c.push(cell('accepted','本轮保留条数',v.accepted.length,`${previous.keep?'追加当前值':'不追加当前值'} → accepted.length = ${v.accepted.length}`,{accepted:v.accepted}));
    }
    if(has(v,'mean'))c.push(cell('mean','循环后均值赋值',v.mean,v.acceptedCount?`${n(v.total)} / ${v.acceptedCount} = ${n(v.mean)}`:'accepted.length = 0 → mean = null；不执行除以0',{total:v.total,count:v.acceptedCount},'null 表示没有均值，不能替换为测得均值0。'));
    return c;
  },[
    exp('threshold','只提高接收下限','下限18提高到19会移除哪一项？',{minimum:18},{minimum:19},'18和26合计44、均值22；只留26后总和/均值均26。',(a,b)=>a.result.accepted.join(',')==='18,26'&&a.result.total===44&&a.result.mean===22&&b.result.accepted.join(',')==='26'&&b.result.total===26&&b.result.mean===26),
    exp('empty','只增加读取条数','第一条仍低于下限时，空输入与全部拒绝的均值如何？',{count:0,minimum:15},{count:1,minimum:15},'循环体0次变1次，但保留数都为0、total=0、mean=null。',(a,b)=>a.result.readings.length===0&&b.result.readings.length===1&&a.result.mean===null&&b.result.mean===null&&a.result.total===0&&b.result.total===0)
  ]);

  models['cs50p-exceptions']=model('把原文、受限整数转换、不同异常与成功结果分开；失败路径不产生数值，也不保留上次成功输出。',(t,{v})=>{
    const c=[cell('raw','输入绑定为文本',v.raw,`raw ← ${q(v.raw)}；类型 str`,{raw:v.raw})];
    if(has(v,'parsed'))c.push(cell('parse','整数转换结果',v.parsed,`strip(${q(v.raw)}) = ${q(v.raw.trim())}；整数格式${v.parsed===null?'不通过 → null':'通过 → '+n(v.parsed)}`,{raw:v.raw,parsed:v.parsed},'仅对应本页列出的ASCII输入，不是完整 Python int 实现。'));
    if(has(v,'parseError'))c.push(cell('parse-error','转换异常分支',v.parseError,`parsed === null → ${v.parseError===null?'false，继续':'true，ValueError'}`,{parsed:v.parsed}));
    if(has(v,'divisionReached'))c.push(cell('division-gate','除法路径是否到达',v.divisionReached,`转换异常 ${q(v.parseError)} → divisionReached = ${v.divisionReached}；除数为0 → ${q(v.zeroError)}`,{parsed:v.parsed,parseError:v.parseError,zeroError:v.zeroError},'转换失败时不应把未到达的除法解释成成功。'));
    if(has(v,'result'))c.push(cell('result','本次返回数值',v.result,v.result===null?'转换失败或除数为0 → result = null':`100.0000 / ${n(v.parsed)} = ${n(v.result)}`,{parsed:v.parsed,parseError:v.parseError??null,zeroError:v.zeroError??null}));
    if(has(v,'status'))c.push(cell('status','状态返回',v.status,`${q(v.parseError)} || ${q(v.zeroError)} || 'ok' → ${q(v.status)}`,{parseError:v.parseError,zeroError:v.zeroError}));
    return c;
  },[
    exp('conversion','只改变输入文本','小数字符串会不会被截成整数？',{text:'12'},{text:'3.5'},'12得到100/12；3.5为ValueError且parsed/result均null。',(a,b)=>a.result.status==='ok'&&near(a.result.result,100/12)&&b.result.status==='ValueError'&&b.result.parsed===null&&b.result.result===null),
    exp('zero','只改变输入文本','零与无法转换的文本会触发同一种异常吗？',{text:'oops'},{text:'0'},'oops为ValueError；0转换成功后为ZeroDivisionError，两者均没有数值结果。',(a,b)=>a.result.status==='ValueError'&&a.result.parsed===null&&b.result.status==='ZeroDivisionError'&&b.result.parsed===0&&a.result.result===null&&b.result.result===null)
  ]);

  models['cs50p-libraries']=model('展开四个输入、排序位置、累计和以及偶数中位数；明确选择库函数后才接收该函数结果。',(t,{v})=>{
    const p=t.params,c=v.values.map((x,j)=>cell('input-'+j,`values[${j}]`,x,`四项输入的索引 ${j} → ${n(x)}`,{index:j,value:x},'浏览器按对应公式计算，不加载Python statistics。'));
    if(v.sorted)v.sorted.forEach((x,j)=>c.push(cell('sorted-'+j,`有序副本[${j}]`,x,`sort(copy(values))[${j}] = ${n(x)}`,{original:v.values,index:j},'原始 values 的顺序没有被修改。')));
    if(has(v,'total'))c.push(cell('total','累计和赋值',v.total,`${v.values.map(n).join(' + ')} = ${n(v.total)}`,{values:v.values,count:v.count}));
    if(has(v,'mean'))c.push(cell('mean','平均数格',v.mean,`${n(v.total)} / ${v.count} = ${n(v.mean)}`,{total:v.total,count:v.count},'四个非空有限数值，等权平均。'));
    if(has(v,'median'))c.push(cell('median','中位数格',v.median,`(sorted[1] ${n(v.middle[0])} + sorted[2] ${n(v.middle[1])}) / 2 = ${n(v.median)}`,{middle:v.middle},'偶数项取中间两项的平均，不取其中一项冒充。'));
    if(has(v,'answer'))c.push(cell('answer','按函数选择接收',v.answer,`method = ${q(p.method)} → answer ← ${p.method} = ${n(v.answer)}`,{method:p.method,mean:v.mean,median:v.median}));
    return c;
  },[
    exp('outlier','只增大第四项读数','极端值会同时改变均值与中位数吗？',{last:30},{last:50},'均值16.5变21.5，中位数均为13。',(a,b)=>a.result.mean===16.5&&b.result.mean===21.5&&a.result.median===13&&b.result.median===13),
    exp('method','只切换返回函数','同一输入中哪个数值被交回？',{method:'mean'},{method:'median'},'中间计算相同，answer由16.5变13。',(a,b)=>a.result.total===b.result.total&&a.result.answer===16.5&&b.result.answer===13)
  ]);

  models['cs50p-tests']=model('独立规则先给预期，再逐项比较真实返回值；测试范围决定边界缺陷是否能被发现。',(t,{f,v})=>{
    const p=t.params,c=v.cases.map((distance,j)=>cell('case-'+j,`测试输入 cases[${j}]`,distance,`cases[${j}] = ${n(distance)} cm；当前用例集合 ${q(p.suite)}`,{index:j,distance},'输入已选定不表示断言已经运行。'));
    if(has(v,'rule'))c.push(cell('rule','独立预期的边界规则',0,'预期：distance ≤ 20.0000 → 0.0000，否则60.0000；distance=20 应停车',{boundary:20,expectedAtBoundary:0}));
    if(has(v,'implementation'))c.push(cell('implementation','待测函数分支符号',v.implementation,`actual 使用 distance ${p.implementation==='bug'?'<':'≤'} 20；预期仍使用 ≤20`,{implementation:p.implementation},'预期不会从错误实现复制。'));
    if(v.outcomes)v.outcomes.forEach((r,j)=>c.push(cell('outcome-'+j,`已调用输入 ${r.distance} 的返回`,r.actual,`${n(r.distance)} ${p.implementation==='bug'?'<':'≤'} 20 → 返回 ${n(r.actual)}；独立预期 ${n(r.expected)}`,{distance:r.distance,actual:r.actual,expected:r.expected},'这里只记录调用结果；断言帧会逐项判断。')));
    if(f.line===5)c.push(cell('assert','当前断言',f.variables.passed,`${n(f.variables.actual)} === ${n(f.variables.expected)} → ${f.variables.passed}`,{distance:f.variables.distance,actual:f.variables.actual,expected:f.variables.expected},'仅对当前具体输入下结论。'));
    if(has(v,'failed'))c.push(cell('summary','断言汇总',v.failed,`${v.total} 条 − ${v.passed} 条通过 = ${v.failed} 条失败`,{total:v.total,passed:v.passed,failed:v.failed},'有限用例全通过不等于所有输入正确。'));
    return c;
  },[
    exp('suite','只扩大测试集合','错误的<20能否通过远离边界的测试？',{implementation:'bug',suite:'smoke'},{implementation:'bug',suite:'boundary'},'10和30均通过；边界组在20发现返回60而非0的一项失败。',(a,b)=>a.result.failed===0&&b.result.failed===1&&b.result.results.find(x=>x.distance===20).actual===60),
    exp('fix','只修正条件符号','测试不变时，修复等号会改变哪个断言？',{implementation:'bug',suite:'boundary'},{implementation:'correct',suite:'boundary'},'失败数1变0，20的实际返回60变0，其余4项不变。',(a,b)=>a.result.failed===1&&b.result.failed===0&&a.result.results.filter((x,i)=>x.actual!==b.result.results[i].actual).map(x=>x.distance).join(',')==='20')
  ]);

  models['cs50p-files']=model('按打开、序列化、写入、读取、汇总的顺序检查文本状态；覆盖在写入之前已截断旧内容。',(t,{v,i})=>{
    const p=t.params,c=[cell('original','打开前已有文本',v.original,`original ← ${q(v.original)}；两行读数12、20`,{original:v.original},'只操作内存字符串，不读写用户磁盘。')];
    if(i>=1)c.push(cell('opened','打开动作对旧内容的影响',p.mode==='w'?'':v.original,`mode = ${q(p.mode)} → ${p.mode==='w'?'buffer ← 空文本（先截断）':'buffer ← original（保留两行）'}`,{mode:p.mode,original:v.original},'这是打开时快照；当前完整 buffer 见写入格。'));
    if(has(v,'line'))c.push(cell('line','写入行序列化',v.line,`String(${n(v.value)}) + '\\n' = ${q(v.line)}`,{value:v.value},'换行分隔记录，数字不能不经转换直接拼接。'));
    if(i>=3)c.push(cell('written','写入后文本状态',v.buffer,`${q(p.mode==='w'?'':v.original)} + ${q(v.line)} = ${q(v.buffer)}`,{mode:p.mode,line:v.line},'回放对应一次已发生写入；不把播放当成追加。'));
    if(v.values)v.values.forEach((x,j)=>c.push(cell('parsed-'+j,`读取第 ${j+1} 行`,x,`Number(${q(v.buffer.trim().split('\n')[j])}) = ${n(x)}`,{line:j+1,text:v.buffer.trim().split('\n')[j]},'本例每行均为本程序生成的整数。')));
    if(has(v,'total'))c.push(cell('total','读取后累计和',v.total,`${v.values.map(n).join(' + ')} = ${n(v.total)}`,{values:v.values,count:v.count}));
    if(has(v,'mean'))c.push(cell('mean','读取后均值返回',v.mean,`${n(v.total)} / ${v.count} = ${n(v.mean)}`,{total:v.total,count:v.count}));
    return c;
  },[
    exp('mode','只改变打开模式','新值相同，旧两行会在哪一步丢失？',{mode:'a',value:30},{mode:'w',value:30},'追加3行总和62；覆盖1行总和30，打开时即截断。',(a,b)=>a.result.buffer==='12\n20\n30\n'&&a.result.count===3&&a.result.total===62&&b.result.buffer==='30\n'&&b.result.count===1&&b.result.total===30),
    exp('zero','只修改写入数值','写入0是否会被当成没有记录？',{mode:'w',value:0},{mode:'w',value:1},'两者都是一行有效记录，均值0变1。',(a,b)=>a.result.count===1&&b.result.count===1&&a.result.mean===0&&b.result.mean===1&&a.result.buffer==='0\n')
  ]);

  models['cs50p-regex']=model('清理输入后检查候选的起止位置与全文长度；只有范围通过才读取命名分组，合法零值保持为0。',(t,{v})=>{
    const p=t.params,c=[cell('raw','保留原始输入',v.raw,`raw ← ${q(v.raw)}`,{raw:v.raw})];
    if(has(v,'text'))c.push(cell('text','清理后文本赋值',v.text,`${p.clean==='yes'?'strip(raw)':'raw 原样保留'} → ${q(v.text)}`,{raw:v.raw,clean:p.clean},'清理产生新文本，不覆盖原文。'));
    if(v.pattern)c.push(cell('pattern','命名字段的格式约束',v.pattern,'sensor=[A-Z]{2}；连字符；value=[0-9]{1,3}；字面单位cm',{groups:v.groups},'仅本页ASCII契约，不实现任意Python正则。'));
    if(has(v,'ignoreCase'))c.push(cell('case-rule','大小写规则',v.ignoreCase,`ignoreCase = ${q(v.ignoreCase)} → ${v.ignoreCase==='yes'?'启用ASCII忽略大小写':'字母必须大写'}`,{ignoreCase:v.ignoreCase}));
    if(has(v,'candidate'))c.push(cell('candidate','已找到的格式子串',v.candidate,v.candidate===null?'regex.exec(text) → null；没有候选':`text[${v.start}:${v.end}] = ${q(v.candidate)}；长度 ${v.end-v.start}`,{start:v.start,end:v.end,text:v.text},'找到子串尚未证明整条输入合格。'));
    if(has(v,'matched'))c.push(cell('range','范围判断结果',v.matched,v.candidate===null?'无候选 → matched=false':p.mode==='search'?`search：候选 [${v.start}, ${v.end}) 存在 → true`:`full：start ${v.start} === 0 且 end ${v.end} === 全长 ${v.inputLength} → ${v.matched}`,{mode:p.mode,start:v.start,end:v.end,inputLength:v.inputLength},'末尾换行或前后文字也计入全文长度。'));
    if(has(v,'sensor'))c.push(cell('sensor','来源标签返回',v.sensor,v.sensor===null?'匹配未通过 → sensor=null；不读取groups':`候选中的 sensor.toUpperCase() → ${q(v.sensor)}`,{matched:v.matched,candidate:v.candidate}));
    if(has(v,'value'))c.push(cell('value','数字字段转换返回',v.value,v.value===null?'匹配未通过 → value=null':`Number(${q(v.capturedValue)}) = ${n(v.value)}`,{capturedValue:v.capturedValue,matched:v.matched},'0是合法数值；null才表示没有结果。'));
    return c;
  },[
    exp('scope','只修改匹配范围','嵌入其他文字的合法子串能否代表整条记录？',{text:'prefix AB-12cm suffix',mode:'full'},{text:'prefix AB-12cm suffix',mode:'search'},'full拒绝并保留null，search提取AB和12。',(a,b)=>!a.result.matched&&a.result.value===null&&b.result.matched&&b.result.sensor==='AB'&&b.result.value===12),
    exp('newline','只启用两端清理','保留末尾换行的整条匹配会如何？',{text:'AB-12cm\n',clean:'no',mode:'full'},{text:'AB-12cm\n',clean:'yes',mode:'full'},'不清理拒绝；清理后长度吻合并返回12。',(a,b)=>a.result.text==='AB-12cm\n'&&!a.result.matched&&b.result.text==='AB-12cm'&&b.result.matched&&b.result.value===12),
    exp('case','只改变大小写规则','清理空白后的小写标签是否满足严格大写？',{text:' ab-012cm ',ignoreCase:'no'},{text:' ab-012cm ',ignoreCase:'yes'},'严格模式拒绝；忽略大小写后来源归一化AB，012转换12。',(a,b)=>!a.result.matched&&b.result.sensor==='AB'&&b.result.value===12)
  ]);

  models['cs50p-oop']=model('对象身份、property校验与继承方法分开检查；别名共享同一实例，独立构造的c不改变a的状态。',(t,{v,i})=>{
    const p=t.params,c=[cell('contract','实例写入契约',true,'Reading.value：有限数字且 ≥ 0，校验通过后才给 _value 赋值',{minimum:0},'当前控件只给有限数；校准后的结果可为负，属于另一项约束。')];
    if(v.objects)Object.entries(v.objects).forEach(([id,value])=>{if(value!==null)c.push(cell('object-'+id,`对象 ${id} 的实例槽 _value`,value,`${id}._value = ${n(value)}${id==='b'?'；本次从未写 b':'；由构造或本次通过的property写入产生'}`,{objectId:id,value},'每个对象独立存储；名字别名不创建第二份槽。'));});
    if(v.targetId)c.push(cell('identity','target 的绑定对象',v.targetId,`reference = ${q(p.reference)} → target → 对象 ${v.targetId}`,{reference:p.reference,targetId:v.targetId},v.targetId==='a'?'target 与 a 指向同一实例。':'c由构造器创建，与a是不同实例。'));
    if(has(v,'attempt'))c.push(cell('setter-gate','写入前property判断',v.allowed,`${n(v.attempt)} ≥ 0 → ${v.allowed}；目标旧值 ${n(v.before)}`,{attempt:v.attempt,before:v.before},'本帧仅校验，还未改变槽。'));
    if(i>=4)c.push(cell('write','property写入状态转换',v.status,`${v.targetId}._value：${n(v.before)} → ${n(v.objects[v.targetId])}；${v.allowed?'接收 '+n(p.update):'拒绝 '+n(p.update)+' 并保留旧值'}`,{before:v.before,attempt:p.update,after:v.objects[v.targetId],status:v.status},'b 保持12；失败路径不先覆盖旧值。'));
    if(v.corrected)v.corrected.forEach((x,j)=>{const id=j===0?'a':'b';c.push(cell('corrected-'+id,`${id}.corrected() 返回`,x,`this → ${id}：${n(v.objects[id])} + ${n(p.offset)} = ${n(x)}`,{objectId:id,value:v.objects[id],offset:p.offset},'继承复用property规则，调用方法时this仍是各自实例。'));});
    if(has(v,'total'))c.push(cell('total','调用处组合返回值',v.total,`${n(v.corrected[0])} + ${n(v.corrected[1])} = ${n(v.total)}`,{corrected:v.corrected,target:v.target},'只汇总a与b；独立对象c的写入不进入这个和。'));
    return c;
  },[
    exp('identity','只改变target指向方式','把写入目标改为独立副本，a的汇总还会改变吗？',{reference:'alias',update:20},{reference:'copy',update:20},'别名修改a到20，总和36；副本只改c到20，a仍8，总和24。',(a,b)=>a.result.a===20&&a.result.total===36&&b.result.a===8&&b.result.target===20&&b.result.total===24&&a.result.b===12&&b.result.b===12),
    exp('rejection','只让写入越过零边界','-1被拒绝时是否保留原实例数值？',{reference:'alias',update:0},{reference:'alias',update:-1},'0合法写入，总和16；-1为ValueError，a保留8，总和24。',(a,b)=>a.result.status==='ok'&&a.result.a===0&&a.result.total===16&&b.result.status==='ValueError'&&b.result.a===8&&b.result.total===24)
  ]);

  models['cs50p-etcetera']=model('按实际next请求记录访问、阈值比较、seen去重、yield与停止；相同选中值可能需要不同访问次数。',(t,{v,f,i,history})=>{
    const p=t.params,c=[cell('request','本次消费上限',p.take,`take = ${p.take}；策略 ${p.strategy}；阈值 ${n(p.minimum)}`,{take:p.take,strategy:p.strategy,minimum:p.minimum},'输入列表是已知案例；未访问位置不算已执行过滤。')];
    if(has(v,'visited'))c.push(cell('visited','已经访问的输入数',v.visited,`已出现 ${history.filter(s=>s.line===4).length} 次实际拉取帧 → visited = ${v.visited}`,{visited:v.visited},i<3?'定义/创建生成器不执行循环体。':'只计算已发生访问；不是性能测量。'));
    if(has(f.variables,'index'))c.push(cell('binding','本轮枚举绑定',f.variables.value,`[index,value] ← [${v.index}, ${n(v.value)}]；visited 增至 ${v.visited}`,{index:v.index,value:v.value,visited:v.visited}));
    if(f.line===5)c.push(cell('keep','本轮过滤与去重分支',v.keep,`${n(v.value)} ≥ ${n(p.minimum)} → ${v.value>=p.minimum}；seen=${q(v.seen)} 不含当前值 → ${!v.seen.includes(v.value)}；合取 → ${v.keep}`,{value:v.value,minimum:p.minimum,seen:v.seen},'seen快照来自添加之前；失败分支continue，不yield。'));
    if(f.line===6)c.push(cell('yield','本次yield的结果',v.produced.at(-1).value,`seen.add(${n(v.produced.at(-1).value)})；yield {index:${v.produced.at(-1).index}, value:${n(v.produced.at(-1).value)}}`,{row:v.produced.at(-1),seen:v.seen},p.strategy==='lazy'?'当前请求已经收到该值；达到take后停止拉取。':'本项先加入完整列表，前缀选择留到列表生成后。'));
    if(v.selected)v.selected.forEach((row,j)=>c.push(cell('selected-'+j,`实际选中第 ${j+1} 项`,row.value,`selected[${j}] ← 输入索引 ${row.index} 的 ${n(row.value)}`,{selectedIndex:j,inputIndex:row.index,value:row.value},'只展示当前快照已选中项。')));
    if(f.line>=10)c.push(cell('stop','消费结束时的剩余输入数',v.readings.length-v.visited,`${v.readings.length} 项输入 − 已访问 ${v.visited} = ${v.readings.length-v.visited} 项未访问`,{length:v.readings.length,visited:v.visited},'停止消费不等于遍历完毕；take=0的lazy不访问任何输入。'));
    if(has(v,'total'))c.push(cell('total','实际选中项累计和',v.total,`${v.selected.map(row=>n(row.value)).join(' + ')||'0.0000'} = ${n(v.total)}`,{selected:v.selected,uniqueCount:v.uniqueCount},'没有选中的输入不会进入返回值。'));
    return c;
  },[
    exp('strategy','只改变求值策略','只取1项时，选中值相同是否表示访问次数相同？',{take:1,strategy:'lazy'},{take:1,strategy:'eager'},'都选12，总和12；lazy访问1项，eager访问4项。',(a,b)=>a.result.total===12&&b.result.total===12&&a.result.visited===1&&b.result.visited===4&&a.result.selected[0].index===0&&b.result.selected[0].index===0),
    exp('zero','只增加按需消费上限','take=0创建生成器后是否访问第一项？',{take:0,strategy:'lazy'},{take:1,strategy:'lazy'},'0时visited=0且total=0；1时访问首项并返回12。',(a,b)=>a.result.visited===0&&a.result.selected.length===0&&a.result.total===0&&b.result.visited===1&&b.result.total===12),
    exp('dedup','只改变不同值的取出上限','重复的12会不会成为第三个输出？',{take:2},{take:3},'前两项12、18合计30；第三个输出是索引3的26，访问4项合计56。',(a,b)=>a.result.visited===2&&a.result.total===30&&b.result.visited===4&&b.result.total===56&&b.result.selected.map(x=>x.index).join(',')==='0,1,3')
  ]);

  models['cs50p-project']=model('逐行保留来源、解析、失败策略与阈值筛选，再从已接收记录汇总；中止、空数据和合法零均值各自明确。',(t,{v,f,history})=>{
    const p=t.params,c=[cell('policy','输入合同',p.policy,`${v.lines.length} 行；坏行策略 ${q(p.policy)}；筛选下限 ${n(p.minimum)}`,{lineCount:v.lines.length,policy:p.policy,minimum:p.minimum},'固定内存文件案例；不进行网络或硬件采集。')];
    if(has(v,'records'))c.push(cell('record-count','已纳入的观测数',v.records.length,`records.length = ${v.records.length}；保留原文件行号 ${q(v.records.map(r=>r.line))}`,{records:v.records},'文本和值相同的不同文件行仍为独立观测。'));
    if(f.line===3)c.push(cell('current','当前循环绑定',v.current,`[index,line] → 文件第 ${v.lineNumber} 行 ${q(v.current)}`,{lineNumber:v.lineNumber,current:v.current},'后面的行尚未按业务规则处理。'));
    if(f.line===4)c.push(cell('parse','本行解析返回',v.record===null?null:v.record.value,v.record===null?`完整格式匹配 ${q(v.current.trim())} 失败 → record=null`:`完整匹配 ${q(v.current.trim())} → sensor=${q(v.record.sensor)}，Number(数字字段)=${n(v.record.value)}`,{lineNumber:v.lineNumber,current:v.current,record:v.record},'格式通过不证明真实测量可靠。'));
    if(f.line===5)c.push(cell('error-branch','坏行处理状态转换',v.status,`errors.push(${v.lineNumber}) → ${q(v.errors)}；${p.policy==='strict'?'status ← aborted，break':'status 保持 ok，continue'}`,{lineNumber:v.lineNumber,errors:v.errors,status:v.status},'strict中止后不能发半份成功报告。'));
    if(f.line===6){const previous=history.at(-2).variables.record,keep=previous.value>=p.minimum;c.push(cell('filter','合法行的筛选判断',keep,`${n(previous.value)} ≥ ${n(p.minimum)} → ${keep}；${keep?'追加带行号的记录':'不追加记录'}`,{value:previous.value,minimum:p.minimum,lineNumber:v.lineNumber,acceptedCount:v.acceptedCount}));}
    if(has(v,'summary')){
      if(v.summary===null)c.push(cell('summary','汇总返回状态',null,`status = ${q(v.status)} → summary = null，不生成成功统计`,{status:v.status},'null表示流程中止，不等于count=0的合法空汇总。'));
      else{
        c.push(cell('sum','汇总总和格',v.summary.total,`${v.records.map(r=>n(r.value)).join(' + ')||'0.0000'} = ${n(v.summary.total)}`,{records:v.records,count:v.summary.count}));
        c.push(cell('mean','汇总均值格',v.summary.mean,v.summary.count?`${n(v.summary.total)} / ${v.summary.count} = ${n(v.summary.mean)}`:'count = 0 → mean = null；不是测得均值0',{total:v.summary.total,count:v.summary.count}));
      }
    }
    if(has(v,'report'))c.push(cell('report','格式化交付返回',v.report,v.report===null?'summary=null → report=null':`count=${v.summary.count}; total=${n(v.summary.total)}; mean=${v.summary.mean===null?'NA':n(v.summary.mean)}; errors=${v.errors.length}`,{summary:v.summary,errors:v.errors},'报告来自当前已生成汇总，不预先展示未来行的结果。'));
    return c;
  },[
    exp('policy','只改变坏行策略','遇到第2行错误，后面的合法观测是否还处理？',{dataset:'mixed',policy:'skip'},{dataset:'mixed',policy:'strict'},'skip得到3条、总和44且错误[2]；strict在第2行中止，summary/report均null。',(a,b)=>a.result.status==='ok'&&a.result.summary.count===3&&a.result.summary.total===44&&a.result.errors.join(',')==='2'&&b.result.status==='aborted'&&b.result.records.length===1&&b.result.summary===null&&b.result.report===null),
    exp('threshold','只提高汇总下限','12与20中，阈值13会留下哪些文件行？',{dataset:'mixed',minimum:0},{dataset:'mixed',minimum:13},'重复的12仍各是一条观测；提高下限后只留第3行20，错误行号不变。',(a,b)=>a.result.summary.count===3&&a.result.summary.total===44&&b.result.summary.count===1&&b.result.summary.total===20&&b.result.records[0].line===3&&a.result.errors.join(',')===b.result.errors.join(',')),
    exp('empty','只改变输入文件','空文件与仅有坏行的文件在汇总上有什么相同和不同？',{dataset:'empty',policy:'skip'},{dataset:'invalid',policy:'skip'},'均为count0、total0、mean null；错误清单从空变[1,2]。',(a,b)=>a.result.summary.count===0&&a.result.summary.mean===null&&a.result.errors.length===0&&b.result.summary.count===0&&b.result.summary.total===0&&b.result.summary.mean===null&&b.result.errors.join(',')==='1,2')
  ]);
  return {courseId:'cs50p',models};
});
