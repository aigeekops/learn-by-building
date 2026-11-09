/* Original bounded CS50P companions. JavaScript computes specified examples, not arbitrary Python. */
(function(root,factory){const register=factory();if(typeof module!=='undefined'&&module.exports)module.exports=register;else register(root.AICourseModels)})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
const select=(id,label,options,value)=>({id,label,type:'select',options,value});
const flow=(title,nodes)=>({kind:'flow',title,nodes:nodes.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
const bars=(title,rows,unit='')=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit});
const clone=x=>JSON.parse(JSON.stringify(x));
function recorder(model,params,code){const steps=[];return{add(line,title,detail,variables,visual){steps.push(clone({line,title,detail,variables,visual}))},end(result){return{model,params,code:code.split('\n'),steps,result:clone(result)}}}}
return function register(M){
if(!M||typeof M.register!=='function')throw Error('CS50P requires AICourseModels.register');
M.register('cs50p-functions',[range('raw','原始读数',0,20,1,8),range('gain','每格对应毫米',1,5,1,2,'mm/格'),range('offset','校准偏移',-5,5,1,1,'mm')],p=>{
const r=recorder('cs50p-functions',p,`const raw = input.raw;
function calibrate(value,gain,offset){
  const scaled = value * gain;
  const corrected = scaled + offset;
  return corrected;
}
const distance = calibrate(raw,gain,offset);`);
r.add(1,'为读数取名字','raw 是原始格数；变量名用来指出当前值的用途。',{raw:p.raw,gain:p.gain,offset:p.offset},flow('输入与单位',[['raw',p.raw+' 格',true],['gain',p.gain+' mm/格',false],['offset',p.offset+' mm',false]]));
r.add(7,'调用函数，准备实参','函数定义本身不会做这次计算；调用才把参数送入函数。',{arguments:[p.raw,p.gain,p.offset],callerRaw:p.raw},flow('调用边界',[['调用处','calibrate(raw,gain,offset)',true],['返回处','distance 尚无结果',false]]));
r.add(2,'形参接收本次值','value 属于这次调用。这个数值例子没有可变对象或引用别名。',{value:p.raw,gain:p.gain,offset:p.offset},flow('局部名字',[['value',p.raw,true],['gain',p.gain,false],['offset',p.offset,false]]));
const scaled=p.raw*p.gain;r.add(3,'先做单位换算','格数乘 mm/格 得到 mm；乘法不会自动检查单位。',{value:p.raw,gain:p.gain,scaled},bars('从原始读数到毫米',[['换算后',scaled]],'mm'));
const distance=scaled+p.offset;r.add(4,'再加校准偏移','同单位的偏移相加；把偏移先乘增益会变成另一条公式。',{scaled,offset:p.offset,corrected:distance},bars('校准前后',[['换算后',scaled],['校准后',distance]],'mm'));
r.add(5,'return 把结果交回调用处','return 与 print 不同。返回值可继续参与计算，打印只负责显示。',{returned:distance},flow('返回值',[['calibrate','return '+distance,true],['调用处','等待接收',false]]));
r.add(7,'接住返回值，原读数仍在','同一次调用没有给 raw 重新赋值；distance 与 raw 含义和单位不同。',{raw:p.raw,distance},flow('调用后的名字',[['raw',p.raw+' 格',false],['distance',distance+' mm',true]]));return r.end({raw:p.raw,scaled,distance});
});
M.register('cs50p-conditions',[range('distance','测得距离',0,100,1,20,'cm'),range('stop','停车边界',10,40,1,20,'cm'),select('valid','这次测量是否有效',[['yes','有效'],['no','无效']],'yes')],p=>{
const r=recorder('cs50p-conditions',p,`const valid = input.valid === 'yes';
const near = distance <= stop;
const mid = distance <= 50;
const branch = !valid ? 'invalid' : near ? 'stop' : mid ? 'slow' : 'forward';
const speed = {invalid:0,stop:0,slow:30,forward:60}[branch];
const command = {branch,speed};`);
const valid=p.valid==='yes',near=p.distance<=p.stop,mid=p.distance<=50;
r.add(1,'先看测量是否有效','无效不是零厘米；用单独的有效性标志，避免把缺测伪装成真实数值。',{valid,distance:p.distance},flow('输入',[['距离',p.distance+' cm',false],['有效性',valid?'有效':'无效',true]]));
r.add(2,'比较停车边界','这里用 <=，恰好等于边界也进入停车条件。',{distance:p.distance,stop:p.stop,near},flow('停车判断',[['distance <= stop',String(near),true]]));
r.add(3,'理解第二个条件','中间区间由前面分支的否定与本条件共同决定；本模型计算布尔值便于对照，不代表 Python elif 会提前执行未到达的分支。',{mid},flow('候选条件',[['distance <= 50',String(mid),true]]));
const branch=!valid?'invalid':near?'stop':mid?'slow':'forward';r.add(4,'按 if / elif / else 顺序只选一支','最早满足的一支决定命令。无效性优先于距离条件，后面不覆盖它。',{branch,valid,near,mid},flow('互斥分支',[['无效停止',0,branch==='invalid'],['近距停车',0,branch==='stop'],['中距慢行',30,branch==='slow'],['远距前行',60,branch==='forward']]));
const speed={invalid:0,stop:0,slow:30,forward:60}[branch];r.add(5,'把分支映射为案例速度','0、30、60 是本课虚拟命令，不是电机控制或真实安全距离。',{branch,speed},bars('速度命令',[['输出',speed]],'教学单位'));
r.add(6,'换边界输入核对','分别检查 stop−1、stop、stop+1，以及无效输入。一次结果不能证明整套控制系统。',{command:{branch,speed}},flow('本次输出',[['分支',branch,false],['速度',speed,true]]));return r.end({valid,near,mid,branch,speed});
});
M.register('cs50p-loops',[range('count','本次读取条数',0,4,1,4,'条'),range('minimum','保留读数下限',0,30,1,15,'cm')],p=>{
const r=recorder('cs50p-loops',p,`const readings = [12,18,26,9].slice(0,count);
let total=0,accepted=[];
for (const value of readings){
  if(value>=minimum){accepted.push(value);total+=value;}
}
const mean = accepted.length ? total/accepted.length : null;`);
const readings=[12,18,26,9].slice(0,p.count);let total=0;const accepted=[];
r.add(1,'按顺序拿到本次列表','count=0 时是空列表。此处截取固定数据，不读取真实传感器。',{readings,count:p.count},flow('本次输入',readings.length?readings.map((x,i)=>['索引 '+i,x+' cm',false]):[['空列表','没有元素',false]]));
r.add(2,'只在循环外初始化一次','total 和 accepted 用来累计。若放进循环体，每轮会抹去前面的成果。',{total,accepted},bars('累计和',[['total',total]],'cm'));
r.add(3,'for 将逐项绑定 value','for 访问元素值；列表索引从0开始，但这里不需要先算索引。',{iterations:readings.length},flow('迭代次数',[['列表长度',readings.length,true]]));
for(let i=0;i<readings.length;i++){const value=readings[i],keep=value>=p.minimum;r.add(4,'检查第 '+(i+1)+' 条','只把满足下限的值加入累计；条件不成立时保留旧累计。',{index:i,value,minimum:p.minimum,keep,before:total},flow('当前元素',[['value',value,true],['value >= minimum',String(keep),false]]));if(keep){accepted.push(value);total+=value}r.add(4,keep?'接受并累加':'跳过这一项','本步骤展示条件执行后的状态，下一轮接着使用它。',{index:i,accepted:[...accepted],total},bars('已经保留的读数',accepted.length?accepted.map((x,j)=>['第 '+(j+1)+' 项',x]):[['尚无保留值',0]],'cm'));}
r.add(5,'所有元素都处理后离开循环','空列表直接到这里。跳过某个元素与退出整个循环不同。',{total,accepted,count:accepted.length},flow('循环后的状态',[['保留条数',accepted.length,false],['总和',total+' cm',true]]));
const mean=accepted.length?total/accepted.length:null;r.add(6,'有值才求均值','没有保留值时输出 null，表示没有均值；不能用0代替，也不能除以0。',{mean,total,acceptedCount:accepted.length},flow('均值',[['结果',mean===null?'无有效样本':mean+' cm',true]]));return r.end({readings,accepted,total,mean});
});
M.register('cs50p-exceptions',[select('text','用户输入文本',[['12','12'],['3.5','3.5'],['oops','oops'],['0','0'],['-2','-2'],[' 7 ','空格 7 空格']],'12')],p=>{
const r=recorder('cs50p-exceptions',p,`const raw = text;
const parsed = restrictedPythonInt(raw); // 仅本页固定输入集合
const parseError = parsed === null ? 'ValueError' : null;
const zeroError = parsed === 0 ? 'ZeroDivisionError' : null;
const result = parseError || zeroError ? null : 100/parsed;
const status = parseError || zeroError || 'ok';`);
const raw=p.text;r.add(1,'输入先是文本','input() 返回 str；"12" 与整数12不是同一种对象。',{raw,type:'str'},flow('输入',[['raw',JSON.stringify(raw),true]]));
const trimmed=raw.trim(),parsed=/^[+-]?\d+$/.test(trimmed)?Number(trimmed):null;r.add(2,'尝试整数转换','只覆盖本页列出的 ASCII 输入。3.5 不是整数字符串，不能用 parseInt 截成3冒充 Python int()。',{raw,parsed},flow('转换',[['int(raw)',parsed===null?'抛出 ValueError':parsed,true]]));
const parseError=parsed===null?'ValueError':null;r.add(3,parseError?'进入 ValueError 分支':'转换通过，继续下一句','异常不是自动修复输入；应给出可理解提示，或由调用方决定是否重试。',{parseError},flow('异常分流',[['转换状态',parseError||'通过',true],['下一步',parseError?'不执行除法':'检查除数',false]]));
const zeroError=parsed===0?'ZeroDivisionError':null;r.add(4,'转换成功也可能遇到另一类异常','字符串0能转为整数0，但不能作为除数。两个异常应分别说明。',{parsed,zeroError,divisionReached:!parseError},flow('除法前提',[['除数',parsed===null?'未产生':parsed,false],['允许除法',String(!parseError&&!zeroError),true]]));
const result=parseError||zeroError?null:100/parsed;r.add(5,'只有成功路径产生数值','失败路径保持结果缺失，不把上次的成功结果当成本次输出。',{result},flow('本次计算',[['100 / n',result===null?'未产生结果':result,true]]));
const status=parseError||zeroError||'ok';r.add(6,'返回状态和结果','本例一次尝试后结束；完整交互重试必须另设退出条件，不能无界循环。',{status,result},flow('可处理的返回',[['status',status,true],['result',result===null?'无':result,false]]));return r.end({raw,parsed,status,result});
});
M.register('cs50p-libraries',[range('last','第四条读数',10,50,2,30,'cm'),select('method','标准库函数',[['mean','statistics.mean'],['median','statistics.median']],'mean')],p=>{
const r=recorder('cs50p-libraries',p,`const values = [10,12,14,last];
const sorted = [...values].sort((a,b)=>a-b);
const total = values.reduce((sum,x)=>sum+x,0);
const mean = total/values.length;
const median = (sorted[1]+sorted[2])/2;
const answer = method === 'mean' ? mean : median;`);
const values=[10,12,14,p.last];r.add(1,'先确定库函数接收什么','Python 例子显式 import statistics；浏览器用对应算术重算四个有限数值，没有装载Python标准库。',{values,pythonModule:'statistics'},flow('调用契约',[['模块','statistics',false],['输入',JSON.stringify(values),true]]));
const sorted=[...values].sort((a,b)=>a-b);r.add(2,'排序查看中间位置','median 根据有序位置计算。复制后排序，原列表 values 保持原顺序。',{values,sorted},flow('有序副本',sorted.map((x,i)=>['位置 '+i,x,i===1||i===2])));
const total=values.reduce((s,x)=>s+x,0);r.add(3,'均值先累计再计数','本例输入不为空，且都是数字；空列表与非法类型应在真实代码中单独处理。',{total,count:values.length},bars('四条读数',values.map((x,i)=>['读数 '+i,x]),'cm'));
const mean=total/values.length;r.add(4,'求算术平均','每条读数等权；最后一项变大时，均值会随之增大。',{mean,total,count:4},bars('均值',[['mean',mean]],'cm'));
const median=(sorted[1]+sorted[2])/2;r.add(5,'偶数个值取中间两项平均','中位数不等于随意取一个中间元素；它对极端值的响应与均值不同。',{middle:[sorted[1],sorted[2]],median},bars('两种汇总',[['mean',mean],['median',median]],'cm'));
const answer=p.method==='mean'?mean:median;r.add(6,'明确选择函数并接收结果','import 不会替你决定问题。报告函数名、输入和单位，才能解释统计值。',{method:p.method,answer},flow('返回',[['函数','statistics.'+p.method,false],['结果',answer+' cm',true]]));return r.end({values,sorted,total,mean,median,answer});
});
M.register('cs50p-tests',[select('implementation','待测实现',[['correct','正确：<=20 停车'],['bug','缺陷：<20 停车']],'bug'),select('suite','测试输入',[['smoke','只测 10、30'],['boundary','边界组 0、19、20、21、100']],'boundary')],p=>{
const r=recorder('cs50p-tests',p,`const cases = suite === 'smoke' ? [10,30] : [0,19,20,21,100];
const expected = distance => distance<=20 ? 0 : 60;
const actual = distance => (implementation==='bug' ? distance<20 : distance<=20) ? 0 : 60;
const outcomes = cases.map(distance=>({distance,expected:expected(distance),actual:actual(distance)}));
const results = outcomes.map(x=>({...x,passed:x.actual===x.expected}));
const failed = results.filter(x=>!x.passed).length;`);
const cases=p.suite==='smoke'?[10,30]:[0,19,20,21,100];r.add(1,'先选输入集合','输入要覆盖行为边界；只测离边界很远的两个值可能漏掉条件符号错误。',{cases},flow('测试输入',cases.map(x=>[x+' cm','尚未运行',false])));
r.add(2,'先写独立期望','规则是距离<=20 时停车，否则60。期望不能从待测函数复制出来，否则同一个错误会相互确认。',{rule:'distance <= 20 → 0; otherwise → 60'},flow('依据',[['规则','等于20也停车',true]]));
r.add(3,'区分规则与待测实现','切换实现会修改被测函数；规则和测试期望保持不变。',{implementation:p.implementation},flow('被测条件',[['实现',p.implementation==='bug'?'distance < 20':'distance <= 20',true]]));
const outcomes=cases.map(distance=>({distance,expected:distance<=20?0:60,actual:(p.implementation==='bug'?distance<20:distance<=20)?0:60}));r.add(4,'逐次调用，不只看最终汇总','记录实际返回值和独立期望，才能指出哪个输入失败。',{outcomes},flow('实际与期望',outcomes.map(x=>[x.distance+' cm','实际 '+x.actual+' / 期望 '+x.expected,false])));
const results=outcomes.map(x=>({...x,passed:x.actual===x.expected}));for(const x of results)r.add(5,x.passed?'该案例通过':'该案例失败','每个断言只校验这一输入的行为；教学回放列出所有结果，独立 Python 片段使用真正 assert。',{...x},flow('断言',[['输入',x.distance,false],['actual == expected',String(x.passed),true]]));
const failed=results.filter(x=>!x.passed).length;r.add(6,'用失败定位边界，再重跑','测试通过只说明这些断言成立。改变输入集合会改变能发现的缺陷，不能据此证明全部正确。',{failed,passed:results.length-failed,total:results.length},bars('断言汇总',[['通过',results.length-failed],['失败',failed]],'条'));return r.end({cases,results,failed,passed:results.length-failed,total:results.length});
});
M.register('cs50p-files',[select('mode','打开文件的方式',[['a','a · 追加'],['w','w · 覆盖']],'a'),range('value','新读数',0,50,1,30,'cm')],p=>{
const r=recorder('cs50p-files',p,`const original = '12\\n20\\n';
let buffer = mode === 'w' ? '' : original;
const line = String(value)+'\\n';
buffer += line;
const values = buffer.trim().split('\\n').map(Number);
const total = values.reduce((sum,x)=>sum+x,0);
const mean = total/values.length;`);
const original='12\n20\n';r.add(1,'先看已有文件内容','这里是内存中的虚拟文本；不会读取或覆盖你的磁盘文件。Python 可运行示例只在临时目录里写入。',{original},flow('已有文本',[['readings.txt',JSON.stringify(original),true]]));
let buffer=p.mode==='w'?'':original;r.add(2,'打开模式决定旧内容是否保留','真实 open(...,"w") 会在成功打开时截断文件，早于写入；"a" 保留已有内容并在末尾追加。',{mode:p.mode,buffer},flow('打开后的内容',[['模式',p.mode,false],['文本',buffer?JSON.stringify(buffer):'空',true]]));
const line=String(p.value)+'\n';r.add(3,'数字先转换为文本行','换行是记录分隔符；没有分隔符的两次写入可能粘成一条记录。',{value:p.value,line},flow('序列化',[['数字',p.value,false],['写入文本',JSON.stringify(line),true]]));
buffer+=line;r.add(4,'写入后关闭，再读取','动画省略实际OS缓冲。Python with 退出上下文后关闭文件，再用独立读取核对。',{buffer},flow('保存后的文本',[['readings.txt',JSON.stringify(buffer),true]]));
const values=buffer.trim().split('\n').map(Number);r.add(5,'按行解析，恢复数值','本例每行都由程序写成整数；处理外部文件时还要检查空行、错误类型和缺失文件。',{values},bars('重新读到的数值',values.map((x,i)=>['第 '+(i+1)+' 行',x]),'cm'));
const total=values.reduce((s,x)=>s+x,0);r.add(6,'核对条数与总和','追加默认有三行，覆盖只剩新的一行。这是文件模式造成的数据差异。',{count:values.length,total},bars('数据核对',[['条数',values.length],['数值总和',total]]));
const mean=total/values.length;r.add(7,'把读取结果交给汇总函数','同一组值应能复算；文件存在并不代表内容正确，还需要格式、范围与条数检查。',{count:values.length,mean},flow('汇总结果',[['条数',values.length,false],['均值',mean+' cm',true]]));return r.end({original,buffer,values,count:values.length,total,mean});
});
M.register('cs50p-regex',[select('text','待解析的记录',[['AB-12cm','AB-12cm'],[' ab-012cm ','带空格的小写记录'],['prefix AB-12cm suffix','夹在其他文字中的记录'],['AB-1234cm','四位数字'],['AB-12cm\n','末尾换行'],['AB-0cm','合法零值'],['AB-xcm','数字位置出现字母']],'AB-12cm'),select('clean','先去掉两端空白',[['yes','strip 后再匹配'],['no','保留原文']],'yes'),select('ignoreCase','字母大小写',[['yes','忽略大小写'],['no','严格大写']],'yes'),select('mode','匹配范围',[['full','整条记录'],['search','寻找子串']],'full')],p=>{
const r=recorder('cs50p-regex',p,`const raw = input.text;
const text = clean === 'yes' ? raw.trim() : raw;
const pattern = /(?<sensor>[A-Z]{2})-(?<value>[0-9]{1,3})cm/;
const regex = new RegExp(pattern.source, ignoreCase==='yes'?'i':'');
const candidate = regex.exec(text);
const matched = candidate && (mode==='search' || (candidate.index===0 && candidate[0].length===text.length));
const sensor = matched ? candidate.groups.sensor.toUpperCase() : null;
const value = matched ? Number(candidate.groups.value) : null;`);
const raw=p.text;r.add(1,'先保留原始输入','原文保留，清理操作另外产生 text；这样可以指出究竟是哪一步改变了输入。',{raw},flow('原始记录',[['raw',JSON.stringify(raw),true]]));
const text=p.clean==='yes'?raw.trim():raw;r.add(2,'按约定处理两端空白','strip 是输入约定，不是正则自动功能。保留末尾换行时，整条匹配会拒绝它。',{text,clean:p.clean},flow('清理前后',[['raw',JSON.stringify(raw),false],['text',JSON.stringify(text),true]]));
const pattern='(?<sensor>[A-Z]{2})-(?<value>[0-9]{1,3})cm';r.add(3,'把格式拆成有名称的片段','两个ASCII字母、连字符、1至3个ASCII数字、字面单位cm。此页不实现任意Python正则或Unicode字符类。',{pattern,groups:['sensor','value']},flow('格式契约',[['sensor','[A-Z]{2}',false],['分隔符','-',false],['value','[0-9]{1,3}',false],['单位','cm',false]]));
const regex=new RegExp(pattern,p.ignoreCase==='yes'?'i':'');r.add(4,'选择大小写规则','i 对应这个ASCII例子里的 re.IGNORECASE；忽略大小写不等于允许缺失单位或无限位数字。',{ignoreCase:p.ignoreCase},flow('匹配规则',[['字母大小写',p.ignoreCase==='yes'?'忽略':'只允许大写',true]]));
const candidate=regex.exec(text);r.add(5,'先检查是否存在格式子串','找到子串只说明某个片段符合模式，不能据此认定整条输入符合约定。',{candidate:candidate?candidate[0]:null,start:candidate?candidate.index:null,end:candidate?candidate.index+candidate[0].length:null},flow('候选匹配',[['片段',candidate?candidate[0]:'未找到',true]]));
const matched=!!candidate&&(p.mode==='search'||(candidate.index===0&&candidate[0].length===text.length));r.add(6,'核对匹配范围','整条模式要求候选从0开始且长度等于全文；寻找子串允许前后还有其他文字。这个差别必须由需求决定。',{mode:p.mode,matched,inputLength:text.length},flow('范围检查',[['匹配方式',p.mode==='full'?'整条记录':'寻找子串',false],['通过',String(matched),true]]));
const sensor=matched?candidate.groups.sensor.toUpperCase():null;r.add(7,'成功才读取命名分组','捕获字符串AB是来源标签，随后明确转为大写。匹配失败时不访问groups，也不沿用旧分组。',{sensor,capturedValue:matched?candidate.groups.value:null},flow('提取来源',[['sensor',sensor===null?'无':sensor,true]]));
const value=matched?Number(candidate.groups.value):null;r.add(8,'最后把数字文本转换为数值','012文本对应整数12；0是合法值，失败则保持缺失。格式正确仍不证明测量真实或物理范围合理。',{value,matched},flow('解析结果',[['状态',matched?'合法格式':'拒绝',false],['value',value===null?'未产生':value+' cm',true]]));return r.end({raw,text,matched,sensor,value});
});
M.register('cs50p-oop',[range('initial','对象 a 的初始读数',0,20,1,8,'cm'),range('update','经 target 写入的新值',-5,25,1,20,'cm'),range('offset','两个对象的校准偏移',-2,2,1,2,'cm'),select('reference','target 指向谁',[['alias','同一个对象a'],['copy','新建独立对象c']],'alias')],p=>{
const r=recorder('cs50p-oop',p,`class Reading {
  constructor(value){ this.value=value; }
  get value(){ return this._value; }
  set value(v){ if(!Number.isFinite(v)||v<0)throw Error('ValueError');this._value=v; }
}
class OffsetReading extends Reading { corrected(){return this.value+offset;} }
const a=new OffsetReading(initial), b=new OffsetReading(12);
const target=reference==='alias'?a:new OffsetReading(a.value);
let status='ok';try{target.value=update;}catch(error){status=error.message;}
const corrected=[a.corrected(),b.corrected()];
const total=corrected[0]+corrected[1];`);
class Reading{constructor(value){this.value=value}get value(){return this._value}set value(value){if(!Number.isFinite(value)||value<0)throw Error('ValueError');this._value=value}}
class OffsetReading extends Reading{corrected(){return this.value+p.offset}}
r.add(1,'类描述对象必须遵守的规则','类不是某一次测量；每个实例分别保存数值，property写入经过同一验证入口。',{className:'Reading',invariant:'有限且非负'},flow('对象契约',[['属性','value',false],['约束','有限且≥0',true]]));
const a=new OffsetReading(p.initial),b=new OffsetReading(12);r.add(7,'构造两个独立实例','a和b都继承验证行为，但分别存储自己的_value；不能把实例属性写成共享类列表。',{objects:{a:a.value,b:b.value},offset:p.offset},flow('独立对象',[['a',a.value,true],['b',b.value,false]]));
const target=p.reference==='alias'?a:new OffsetReading(a.value);r.add(8,'名字绑定到对象，而非复制容器','target=a新增指向同一对象的名字；显式调用构造器才会创建独立对象。',{targetId:p.reference==='alias'?'a':'c',objects:{a:a.value,b:b.value,c:p.reference==='copy'?target.value:null}},flow('名称与对象',[['a','对象a',false],['target',p.reference==='alias'?'对象a':'独立对象c',true],['b','对象b',false]]));
r.add(9,'属性写入先验证，再改变状态','负值引发ValueError；失败前不得先覆盖旧值。异常路径也必须展示保留了哪些状态。',{attempt:p.update,before:target.value,allowed:p.update>=0},flow('写入检查',[['候选值',p.update,false],['允许写入',String(p.update>=0),true]]));
let status='ok';try{target.value=p.update}catch(error){status=error.message}r.add(9,status==='ok'?'写入成功':'写入被拒绝，旧状态保留','只修改target指向的那个对象；b不会跟随变化。校验失败时a、b和c都保留写入前的值。',{status,objects:{a:a.value,b:b.value,c:p.reference==='copy'?target.value:null},targetId:p.reference==='alias'?'a':'c'},flow('本次对象状态',[['a',a.value,p.reference==='alias'],['b',b.value,false],['target',target.value,true]]));
const corrected=[a.corrected(),b.corrected()];r.add(10,'继承验证，扩展校准方法','OffsetReading复用Reading属性规则；调用corrected时，self/this是各自对象。校准后数值可为负，是否允许要另立物理约束。',{corrected,offset:p.offset},bars('两个对象的校准结果',[['a.corrected()',corrected[0]],['b.corrected()',corrected[1]]],'cm'));
const total=corrected[0]+corrected[1];r.add(11,'从对象读取，组合为结果','结果由实际对象状态计算。换成独立对象c后，只改变c不会改变a参与的汇总。',{total,status,a:a.value,b:b.value,target:target.value},flow('可复算结果',[['校准和',total+' cm',true],['写入状态',status,false]]));return r.end({a:a.value,b:b.value,target:target.value,targetId:p.reference==='alias'?'a':'c',status,corrected,total});
});
M.register('cs50p-etcetera',[range('minimum','保留读数下限',0,30,1,10,'cm'),range('take','最多取出的不同读数',0,4,1,3,'条'),select('strategy','结果求值方式',[['lazy','生成器按需拉取'],['eager','先建完整列表']],'lazy')],p=>{
const r=recorder('cs50p-etcetera',p,`const readings=[12,18,12,26];
function* uniqueAbove(values,minimum){
  const seen=new Set();
  for(const [index,value] of values.entries()){
    if(value<minimum||seen.has(value))continue;
    seen.add(value);yield {index,value};
  }
}
const stream=uniqueAbove(readings,minimum);
const selected=takePrefix(stream,take,strategy); // 函数在下方例程给出
const total=selected.reduce((sum,row)=>sum+row.value,0);`);
const readings=[12,18,12,26];let visited=0;const seen=new Set(),produced=[],selected=[];
r.add(1,'枚举输入，保留索引','enumerate把位置与值一起交给循环。位置从0开始；set按相等性去重，本例按首次出现顺序输出。',{readings,minimum:p.minimum,take:p.take},flow('输入记录',readings.map((x,i)=>['索引 '+i,x,false])));
r.add(2,'生成器函数先定义，尚未处理输入','函数体中的循环在next/for请求结果后才推进。定义和创建生成器不等于跑完整个循环。',{visited,selected,produced},flow('尚未消费',[['实际访问',0,true],['已输出',0,false]]));
r.add(9,'创建迭代对象，区分创建与消费','生成器是一次性迭代状态；列表则先存齐全部结果。这里只记录实际访问次数，不把四项小例子的次数当作真实性能测量。',{visited,selected,strategy:p.strategy},flow('求值策略',[['策略',p.strategy==='lazy'?'按需':'先完整生成',true],['请求上限',p.take,false]]));
if(p.strategy==='eager'||p.take>0){for(let index=0;index<readings.length;index++){const value=readings[index];visited++;r.add(4,'拉取索引 '+index+' 的值','只在本次真正访问时增加visited；状态面板不预先泄露后面尚未处理的值。',{index,value,visited,seen:[...seen],selected:[...selected]},flow('当前输入',[['索引',index,false],['值',value,true]]));const keep=value>=p.minimum&&!seen.has(value);r.add(5,keep?'本次是新的合格读数':'本次跳过，不产生输出','阈值筛选与重复判定是两条不同规则。跳过不会清空已经输出的值。',{keep,value,seen:[...seen],visited},flow('过滤与去重',[['满足下限',String(value>=p.minimum),false],['是否见过',String(seen.has(value)),true]]));if(keep){seen.add(value);const row={index,value};produced.push(row);if(p.strategy==='lazy')selected.push(row);r.add(6,'yield一个结果，保留迭代位置','请求下一项时从yield之后继续；本次结果已经形成，剩余输入仍未必处理。',{produced:[...produced],selected:[...selected],seen:[...seen],visited},flow('已产生的结果',produced.map(x=>['索引 '+x.index,x.value,true])));if(p.strategy==='lazy'&&selected.length>=p.take)break;}}}
if(p.strategy==='eager')selected.push(...produced.slice(0,p.take));r.add(10,'停止消费，不假设已经遍历完整输入','take=0时生成器不访问任何项；完整列表策略仍先处理全部输入。两种策略可能返回相同值，却做了不同工作。',{visited,produced:[...produced],selected:[...selected]},flow('实际执行量',[['访问项数',visited,false],['选中条数',selected.length,true]]));
const total=selected.reduce((sum,row)=>sum+row.value,0);r.add(11,'只汇总实际选中的值','类型提示和文档帮助理解契约，但不会自动拒绝错误运行时类型；真实入口另用argparse与显式检查约束输入。',{total,visited,selected:[...selected],uniqueCount:seen.size},bars('本次选中读数',selected.length?selected.map(x=>['索引 '+x.index,x.value]):[['无选中值',0]],'cm'));return r.end({readings,visited,selected,produced,uniqueCount:seen.size,total});
});
M.register('cs50p-project',[select('dataset','本次输入文件',[['mixed','12、坏行、20、12'],['valid','12、20、4'],['invalid','只有坏行'],['empty','空文件']],'mixed'),select('policy','坏行处理策略',[['skip','保留错误清单并跳过坏行'],['strict','遇到坏行就中止报告']],'skip'),range('minimum','进入汇总的读数下限',0,25,1,0,'cm')],p=>{
const r=recorder('cs50p-project',p,`const lines=fixture(dataset);
const records=[],errors=[];let status='ok';
for(const [index,line] of lines.entries()){
  const record=parseRecord(line); // 固定ASCII格式，完整匹配
  if(record===null){errors.push(index+1);if(policy==='strict'){status='aborted';break;}continue;}
  if(record.value>=minimum)records.push({...record,line:index+1});
}
const summary=status==='ok'?summarize(records):null;
const report=summary===null?null:formatReport(summary,errors);
const deliverable={status,summary,errors,report};`);
const sets={mixed:['AB-12cm','bad','CD-20cm','AB-12cm'],valid:['AB-12cm','CD-20cm','EF-4cm'],invalid:['bad','AB-xcm'],empty:[]},lines=sets[p.dataset],records=[],errors=[];let status='ok';
r.add(1,'先明确输入与验收合同','原创项目读取人工记录文件；保留每行位置，不凭文字相同擅自合并两次观测。最低交付是可重复的输入、报告与错误清单。',{lines,policy:p.policy,minimum:p.minimum},flow('项目边界',[['输入',lines.length+' 行',false],['坏行策略',p.policy,true]]));
r.add(2,'分离数据、错误与流程状态','无数据与程序出错不是一回事；初始数组为空，尚未生成报告。',{records,errors,status},flow('初始状态',[['合法记录',0,false],['坏行',0,false],['报告','尚未产生',true]]));
for(const[index,line]of lines.entries()){r.add(3,'读取第 '+(index+1)+' 行','循环保留文件行号，用于把问题追溯到原始输入；没有执行网络读取或硬件采集。',{lineNumber:index+1,current:line,records:[...records],errors:[...errors]},flow('输入位置',[['行号',index+1,false],['原文',line,true]]));const m=/^([A-Z]{2})-([0-9]{1,3})cm$/.exec(line.trim()),record=m?{sensor:m[1],value:Number(m[2])}:null;r.add(4,record?'格式解析成功':'格式解析失败','正则完整匹配只验证文本结构。解析函数产生明确值或失败状态，汇总函数不负责猜测原文。',{record},flow('解析结果',[['状态',record?'合法':'坏行',true],['数值',record?record.value:'无',false]]));if(!record){errors.push(index+1);if(p.policy==='strict')status='aborted';r.add(5,status==='aborted'?'按严格策略中止':'保留行号，继续下一行','中止后不生成半份成功报告；跳过策略则必须显式报告被丢弃的行。',{errors:[...errors],status,records:[...records]},flow('失败分支',[['坏行清单',JSON.stringify(errors),false],['状态',status,true]]));if(status==='aborted')break;continue;}if(record.value>=p.minimum)records.push({...record,line:index+1});r.add(6,record.value>=p.minimum?'纳入本次汇总':'低于下限，保留筛选理由','重复数值来自不同文件行时仍是不同观测；任何去重都应有独立的业务键与理由。',{records:[...records],acceptedCount:records.length},flow('筛选结果',[['记录值',record.value,false],['下限',p.minimum,false],['当前条数',records.length,true]]));}
let summary=null;if(status==='ok'){const count=records.length,total=records.reduce((sum,row)=>sum+row.value,0);summary={count,total,mean:count?total/count:null}}r.add(8,status==='ok'?'由合法记录生成汇总':'中止状态不生成汇总','空输入可以生成count=0、total=0、mean=null；它不等于测得平均值0，也不等于格式错误。',{summary,status},flow('汇总',[['状态',status,false],['summary',summary?JSON.stringify(summary):'未产生',true]]));
const report=summary===null?null:'count='+summary.count+'; total='+summary.total+'; mean='+(summary.mean===null?'NA':summary.mean)+'; errors='+errors.length;r.add(9,'把结果格式化为可检查报告','报告与数值汇总分离。终端例程真正读取临时文件并执行独立测试，网页仅回放有限状态。',{report,errors:[...errors]},flow('报告',[['文本',report===null?'没有成功报告':report,true]]));r.add(10,'交付状态、汇总与错误清单','通过小例子的断言不代表完成官方项目。迁移任务要求学习者自己选题、定义契约、实现、测试与解释。',{status,summary,errors:[...errors],report},flow('本次交付',[['状态',status,true],['错误数',errors.length,false]]));return r.end({status,records,summary,errors,report});
});
};
});
