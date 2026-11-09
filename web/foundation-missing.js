/* Original, finite in-memory companions to Missing Semester 2026. No shell execution. */
(function(root,factory){
  const register=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=register;
  else register(root.AICourseModels);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
  const choice=(id,label,options,value)=>({id,label,type:'select',options,value});
  const clone=x=>JSON.parse(JSON.stringify(x));
  const flow=(title,nodes)=>({kind:'flow',title,nodes:nodes.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
  const bars=(title,rows,unit='')=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit});
  function record(model,params,code){const steps=[];return{add(line,title,detail,variables,visual){steps.push(clone({line,title,detail,variables,visual}))},finish(result){return{model,params,code:code.split('\n'),steps,result:clone(result)}}}}
  function resolve(cwd,target){const out=[];for(const part of (target.startsWith('/')?target:cwd+'/'+target).split('/')){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part)}return '/'+out.join('/')}
  return function register(M){
    if(!M||typeof M.register!=='function')throw Error('Missing Semester requires AICourseModels.register');
    M.register('missing-shell',[
      choice('cwd','工作目录',[['/lab/project/data','/lab/project/data'],['/lab/project','/lab/project']],'/lab/project/data'),
      choice('target','输出的相对路径',[['../report.txt','../report.txt'],['report.txt','report.txt'],['missing/report.txt','missing/report.txt']],'../report.txt'),
      choice('mode','重定向方式',[['append','>> 追加'],['overwrite','> 覆盖']],'append'),
      range('lines','本次输出行数',1,4,1,1,'行')
    ],p=>{
      const r=record('missing-shell',p,`const files={'/lab/project/report.txt':'old\\n'};
const path=resolve(cwd,target);
const parent=path.slice(0,path.lastIndexOf('/'));
const canOpen=directories.includes(parent);
if(canOpen&&mode==='overwrite')files[path]='';
const output=canOpen?Array.from({length:lines},(_,i)=>'new-'+(i+1)+'\\n').join(''):'';
if(canOpen)files[path]=(files[path]||'')+output;
const exitCode=canOpen?0:1;
const lineCount=canOpen?files[path].split('\\n').length-1:null;`);
      const files={'/lab/project/report.txt':'old\n'},directories=['/lab','/lab/project','/lab/project/data'];
      r.add(1,'先看当前位置与已有文件','内存里只放一份旧报告和三个目录。选择路径不会接触电脑文件；同一个相对路径必须结合工作目录解释。',{cwd:p.cwd,files},flow('虚拟目录',[['当前目录',p.cwd,true],['旧报告','/lab/project/report.txt：old',false]]));
      const path=resolve(p.cwd,p.target);r.add(2,'按路径分量逐个定位','.. 表示父目录，. 表示当前目录；这里仅做词法归一化，不处理符号链接、权限或真实挂载点。',{cwd:p.cwd,target:p.target,path},flow('路径解析',[['起点',p.cwd,false],['相对路径',p.target,true],['目标文件',path,false]]));
      const parent=path.slice(0,path.lastIndexOf('/'));r.add(3,'打开文件前需要存在父目录','重定向可以创建文件，但不会自动递归创建父目录。',{parent,directories},flow('父目录',[['目标的父目录',parent,true]]));
      const canOpen=directories.includes(parent);r.add(4,'先检查是否能够打开重定向目标','在真实shell中，重定向打开失败时本命令不会正常启动。页面只计算本例的目录存在条件。',{canOpen},flow('打开结果',[[canOpen?'可打开':'打开失败',canOpen?'继续准备输出':'父目录不存在',true]]));
      if(canOpen&&p.mode==='overwrite')files[path]='';r.add(5,'区分覆盖与追加的起点','> 在打开成功时截断旧内容；>> 保留旧内容并在末尾写入。程序之后是否成功是另一件事，本例输出程序始终成功。',{mode:p.mode,beforeWrite:files[path]??null},flow('写入前的目标',[['内容',canOpen?(files[path]||'空文件'):'未打开',true]]));
      const output=canOpen?Array.from({length:p.lines},(_,i)=>'new-'+(i+1)+'\n').join(''):'';const outputLines=canOpen?p.lines:0;r.add(6,canOpen?'程序产生标准输出':'命令未执行，没有标准输出',canOpen?'每行明确包含换行符，方便和 wc -l 对照。输出行数与文件已有行数分开统计。':'重定向目标未能打开，Shell不启动这条输出命令。本例没有程序输出，也不能拿请求的输出行数冒充实际输出。',{commandRan:canOpen,output,outputLines},bars('本次实际输出行数',[['新行',outputLines]],'行'));
      if(canOpen)files[path]=(files[path]||'')+output;r.add(7,canOpen?'将标准输出写到目标文件':'跳过写入，所有文件保持原样',canOpen?'只是修改本次计算的新内存对象。每次改变参数重新从同一初态计算，不累积上次播放的写入。':'没有打开的目标文件，也没有运行输出命令，因此本步不写入、不创建文件，已有报告保持原样。',{files,writes:canOpen?1:0},flow(canOpen?'写入后的虚拟文件':'未改动的虚拟文件',Object.entries(files).map(([name,text])=>[name,text,canOpen&&name===path])));
      const exitCode=canOpen?0:1;r.add(8,'报告命令执行或重定向失败状态',canOpen?'本例的固定输出程序已运行成功，退出状态为0。':'本例重定向打开失败，Shell返回非零状态1；它不是输出程序已经运行再失败。',{commandRan:canOpen,exitCode},flow('退出状态',[[canOpen?'输出命令成功':'重定向失败',exitCode,true]]));
      const lineCount=canOpen?files[path].split('\n').length-1:null;r.add(9,'核对行数与失败状态','默认追加得到2行；失败时结果未知，不能用0行冒充成功生成了空报告。',{path,lineCount,exitCode,writes:canOpen?1:0},flow('本次结果',[['退出状态',exitCode,true],['目标行数',lineCount===null?'无结果':lineCount,false]]));
      return r.finish({path,parent,canOpen,commandRan:canOpen,output,outputLines,files,lineCount,exitCode,writes:canOpen?1:0});
    });

    M.register('missing-pipeline',[
      choice('filter','保留的级别',[['WARN','WARN'],['ERROR','ERROR'],['ALL','全部']],'WARN'),
      choice('producer','上游程序状态',[['ok','完整输出并成功'],['fail','输出两行后以7失败']],'ok'),
      choice('pipefail','管道状态规则',[['on','启用 pipefail'],['off','使用最后命令状态']],'on')
    ],p=>{
      const r=record('missing-pipeline',p,`const input=producer==='fail'?all.slice(0,2):all;
const producerExit=producer==='fail'?7:0;
const selected=input.filter(x=>filter==='ALL'||x.level===filter);
const sorted=selected.map(x=>x.message).sort();
const groups=countAdjacent(sorted);
const count=groups.length;
const exitCode=pipefail==='on'?producerExit:0;`);
      const all=[{level:'WARN',message:'warm'},{level:'INFO',message:'ready'},{level:'WARN',message:'warm'},{level:'ERROR',message:'offline'},{level:'WARN',message:'slow'},{level:'ERROR',message:'offline'}],input=p.producer==='fail'?all.slice(0,2):all;
      r.add(1,'读入固定的原创日志','六条日志只有级别和消息两个字段。本模型使用数组模拟有限管道，不解析任意命令、也不读取真实日志。',{input},flow('上游输出',input.map((x,i)=>[String(i+1),x.level+' '+x.message,false])));
      const producerExit=p.producer==='fail'?7:0;r.add(2,'输出存在不等于上游成功','失败程序也可能先输出几行再退出。两行部分输出依然会被后续命令读取。',{producerExit,lines:input.length},flow('上游状态',[['已输出',input.length+'行',false],['退出状态',producerExit,true]]));
      const selected=input.filter(x=>p.filter==='ALL'||x.level===p.filter);r.add(3,'按级别筛选完整记录','本步对应 awk 一类按字段处理的程序。没有匹配行也视为成功处理空输入，避免把 grep 的退出状态差异混入这个例子。',{filter:p.filter,selected},flow('筛选结果',selected.length?selected.map(x=>[x.level,x.message,true]):[['空输入','后续仍可成功处理',true]]));
      const sorted=selected.map(x=>x.message).sort();r.add(4,'先排序再合并相邻重复项','uniq 只看相邻项。先排序让相同消息靠在一起；只直接去掉相邻重复可能漏掉隔开的相同消息。',{sorted},flow('排序后的消息',sorted.length?sorted.map((x,i)=>[String(i+1),x,false]):[['空列表','0项',false]]));
      const groups=[];for(const message of sorted){const last=groups[groups.length-1];if(last&&last.message===message)last.count++;else groups.push({message,count:1})}r.add(5,'逐组计数','每组保留消息与出现次数；这是有限数组上的真实计数。',{groups},bars('消息次数',groups.map(x=>[x.message,x.count]),'次'));
      const count=groups.length;r.add(6,'末端程序只知道收到的数据','wc 一类计数程序可以成功处理上游留下的部分结果。因此一个正常数字还不够证明采集完整。',{count,selectedRows:selected.length,lastExit:0},bars('行与组',[['筛选行数',selected.length],['不同消息数',count]],'个'));
      const exitCode=p.pipefail==='on'?producerExit:0;r.add(7,'显式检查整个管道的状态','在本管道里后续程序都返回0；默认取最后命令状态，启用 pipefail 时保留上游的7。一般规则是最右侧非零状态，并非所有命令状态的和。',{pipefail:p.pipefail,producerExit,lastExit:0,exitCode},flow('完整性判断',[['数字结果',count,false],['管道退出状态',exitCode,true],['可当完整结果使用',exitCode===0?'本例通过':'拒绝：上游失败',false]]));
      return r.finish({input,selected,sorted,groups,count,producerExit,exitCode,complete:p.producer==='ok'});
    });

    M.register('missing-environment',[
      choice('runtime','选择的解释器',[['3.10','系统 Python 3.10'],['3.11','项目 Python 3.11'],['3.12','项目 Python 3.12']],'3.11'),
      choice('extra','第二个依赖的约束',[['compatible','core >= 2'],['conflict','core >= 3']],'compatible'),
      choice('lock','锁定文件中的core版本',[['none','未锁定'],['1','锁定 core 1'],['2','锁定 core 2']],'2')
    ],p=>{
      const r=record('missing-environment',p,`const runtimeOK=Number(runtime.split('.')[1])>=11;
const available=[1,2,3];
const appAllowed=available.filter(v=>v>=1&&v<3);
const extraAllowed=available.filter(v=>v>=(extra==='compatible'?2:3));
const intersection=appAllowed.filter(v=>extraAllowed.includes(v));
const selected=lock==='none'?(intersection.at(-1)??null):Number(lock);
const dependencyOK=selected!==null&&intersection.includes(selected);
const ready=runtimeOK&&dependencyOK;`);
      const runtimeOK=Number(p.runtime.split('.')[1])>=11;r.add(1,'先确认实际运行哪个解释器','本原创项目要求Python 3.11及以上；版本是教学选项，不探测电脑环境，也不宣称3.11是当前最新版本。',{runtime:p.runtime,runtimeOK,required:'>=3.11'},flow('解释器选择',[['实际版本',p.runtime,true],['项目约束','>=3.11',false]]));
      const available=[1,2,3];r.add(2,'列出虚构依赖的可用版本','core是原创占位包，不对应真实PyPI项目；这里只检查离散整数版本，不实现PEP 440完整求解。',{available},bars('候选版本',available.map(v=>['core '+v,v])));
      const appAllowed=available.filter(v=>v>=1&&v<3);r.add(3,'主项目先限定兼容范围','应用允许core>=1且<3。写成范围仍不说明本次究竟安装哪一个版本。',{appAllowed},flow('主项目允许',appAllowed.map(v=>['core '+v,'允许',true])));
      const extraAllowed=available.filter(v=>v>=(p.extra==='compatible'?2:3));r.add(4,'传递依赖也提出要求','所有同时使用的约束必须一起满足。两个依赖分别能安装，不代表能在同一环境中共存。',{extra:p.extra,extraAllowed},flow('第二依赖允许',extraAllowed.map(v=>['core '+v,'允许',true])));
      const intersection=appAllowed.filter(v=>extraAllowed.includes(v));r.add(5,'求交集再决定能否安装','交集为空时改解释器路径不会消除core版本冲突，需要调整依赖版本或设计边界。',{intersection},flow('共同候选',intersection.length?intersection.map(v=>['core '+v,'同时满足',true]):[['无共同版本','约束冲突',true]]));
      const selected=p.lock==='none'?(intersection.at(-1)??null):Number(p.lock);r.add(6,'锁定版本也必须满足当前约束','无锁定时本教学求解器选最大候选；真实求解器还检查平台和传递依赖。锁文件不能使不兼容的版本变兼容。',{lock:p.lock,selected},flow('本次选择',[['core版本',selected===null?'无法选择':selected,true],['是否锁定',p.lock==='none'?'否':'是',false]]));
      const dependencyOK=selected!==null&&intersection.includes(selected),ready=runtimeOK&&dependencyOK;r.add(8,'把失败原因分开报告','环境隔离、版本记录与可运行验证各有作用。即使本例兼容，仍需在对应环境真正运行程序和测试。',{runtimeOK,dependencyOK,ready,reproducibleChoice:p.lock!=='none'&&dependencyOK},flow('启动前检查',[['解释器',runtimeOK?'满足':'不满足',runtimeOK],['依赖',dependencyOK?'满足':'冲突',dependencyOK],['启动条件',ready?'本模型通过':'本模型拒绝',ready]]));
      return r.finish({runtimeOK,available,appAllowed,extraAllowed,intersection,selected,dependencyOK,ready,locked:p.lock!=='none'});
    });

    M.register('missing-debug',[
      range('n','测量样本个数',2,8,1,4,'个'),
      choice('fix','平均值分母',[['bug','错误：n + 1'],['fixed','修复：n']],'bug'),
      choice('algorithm','重复报告的计算方式',[['repeat','每份报告重新求和'],['cached','先求和再复用']],'repeat')
    ],p=>{
      const r=record('missing-debug',p,`const values=Array.from({length:n},(_,i)=>2*(i+1));
const expected=(values[0]+values.at(-1))/2;
const total=values.reduce((s,x)=>s+x,0);
const denominator=fix==='fixed'?values.length:values.length+1;
const mean=total/denominator;
const passed=Math.abs(mean-expected)<1e-12;
const additions=algorithm==='repeat'?n*n:n;
const reports=Array(n).fill(mean);`);
      const values=Array.from({length:p.n},(_,i)=>2*(i+1));r.add(1,'固定一组能手算的输入','样本为2、4、…、2n；固定输入先复现错误，不用随机数据把失败藏起来。',{values},bars('原始样本',values.map((v,i)=>['样本 '+i,v])));
      const expected=(values[0]+values.at(-1))/2;r.add(2,'先独立写出预期','等差序列平均值为首尾平均。这个独立推导作为对照，避免把同一个错误公式复制到测试中。',{first:values[0],last:values.at(-1),expected},bars('独立预期',[['期望平均',expected]]));
      const total=values.reduce((s,x)=>s+x,0);r.add(3,'在中间位置检查累计值','如果求和正确而平均错误，继续缩小到分母或除法；一次观察只能排除与该输入有关的候选原因。',{total,n:p.n},bars('累计值',[['总和',total]]));
      const denominator=p.fix==='fixed'?values.length:values.length+1;r.add(4,'检查分母是否多加了一次','n个样本应除以n。单步变量快照明确显示分母，不靠最终数字猜测是哪一行出错。',{denominator,expectedDenominator:values.length},bars('分母对照',[['程序分母',denominator],['样本个数',values.length]],'个'));
      const mean=total/denominator;r.add(5,'重新运行同一输入','只改一个原因再复测，才能把行为改变与这次修复联系起来。',{mean,expected,error:mean-expected},bars('实际与预期',[['实际平均',mean],['预期平均',expected]]));
      const passed=Math.abs(mean-expected)<1e-12;r.add(6,'修复要有回归检查','此断言验证当前非空等差输入；空输入、异常值等还需单独定义。变快但算错不是修复。',{passed},flow('数值断言',[[passed?'通过':'失败','|实际−预期| < 1e-12',true]]));
      const additions=p.algorithm==='repeat'?p.n*p.n:p.n;r.add(7,'性能先看工作量，再测真实耗时','假设生成n份相同报告。重复求和做n²次加法，缓存总和做n次；这是操作计数模型，不是CPU计时或真实加速比。',{algorithm:p.algorithm,reports:p.n,additions},bars('理论加法次数',[['当前方案',additions],['缓存方案',p.n]],'次'));
      const reports=Array(p.n).fill(mean);r.add(8,'同时保留正确性与性能证据','真实实验应在同一环境重复计时，并记录波动。本页面只保留确定性结果与理论计数。',{reports,passed,additions},flow('验证记录',[['数值正确',passed?'是':'否',passed],['加法次数',additions,false]]));
      return r.finish({values,total,denominator,mean,expected,passed,additions,reports});
    });

    M.register('missing-git',[
      choice('stage','何时暂存文件',[['before','第二次编辑前 add'],['after','第二次编辑后 add'],['skip','不 add']],'before'),
      range('first','第一次编辑后的值',2,5,1,2),
      range('second','第二次编辑后的值',6,9,1,7),
      choice('restore','提交后如何处理工作区',[['keep','保留第二次编辑'],['restore','restore 为暂存区内容']],'keep')
    ],p=>{
      const r=record('missing-git',p,`let head={id:'C0',value:1},index={value:1},work={value:first};
if(stage==='before')index={...work};
work.value=second;
if(stage==='after')index={...work};
const hasStagedChange=index.value!==head.value;
if(hasStagedChange)head={id:'C1',parent:'C0',...index};
if(restore==='restore')work={...index};
const dirty=work.value!==index.value;`);
      let head={id:'C0',value:1},index={value:1},work={value:p.first};r.add(1,'分开看三个位置','HEAD指向当前提交，暂存区准备下一次快照，工作区是正在编辑的文件。C0/C1是教学标签，不是Git真实哈希。',{head,index,work},flow('第一次编辑后',[['HEAD',head.value,false],['暂存区',index.value,false],['工作区',work.value,true]]));
      if(p.stage==='before')index={...work};r.add(2,'add 保存当时的文件内容','暂存不是给文件打一个永久跟随标签。复制的是当时的内容，后面再编辑不会自动更新这份快照。',{stage:p.stage,index,work},flow('第一次可能暂存',[['暂存区',index.value,p.stage==='before'],['工作区',work.value,false]]));
      work.value=p.second;r.add(3,'工作区继续修改','此时再次编辑只改工作区。若已在上一步add，暂存内容仍是第一次编辑的值。',{index,work},flow('第二次编辑后',[['暂存区',index.value,false],['工作区',work.value,true]]));
      if(p.stage==='after')index={...work};r.add(4,'决定是否重新add','第二次编辑后add才会把新内容纳入下一次提交；跳过add则保留原来的暂存区。',{index,work},flow('提交候选',[['下一次快照',index.value,true],['尚在工作区',work.value,false]]));
      const hasStagedChange=index.value!==head.value;r.add(5,'先判断暂存区是否与HEAD不同','本例只有一个已跟踪文件。未暂存新内容时没有可提交差异；不模拟提交钩子、冲突或未跟踪文件。',{hasStagedChange,head,index},flow('能否创建新快照',[[hasStagedChange?'有暂存变更':'无暂存变更','比较HEAD与暂存区',true]]));
      if(hasStagedChange)head={id:'C1',parent:'C0',...index};r.add(6,'commit 取暂存区，不取最新工作区','新提交记录父提交与这次快照，提交后仍可能有未暂存编辑。真实仓库提交需作者配置，本页不执行git命令。',{head,index,work},flow('提交关系',[['C0','value=1',false],[head.id,'value='+head.value,hasStagedChange]]));
      if(p.restore==='restore')work={...index};r.add(7,'恢复操作必须说明来源与对象','本例的git restore文件使用暂存区作为来源，只恢复工作区。它会丢弃该文件尚未暂存的编辑，不能当作提交历史回退。',{restore:p.restore,work,index},flow('恢复后的三个位置',[['HEAD',head.value,false],['暂存区',index.value,false],['工作区',work.value,true]]));
      const dirty=work.value!==index.value;r.add(8,'用diff范围解释剩余变化','工作区对暂存区的差异对应未暂存变更；暂存区对HEAD对应待提交变更。这两个比较不要混成“文件有没有变”。',{dirty,unstagedDelta:work.value-index.value,stagedDelta:index.value-head.value},bars('三处内容',[['HEAD',head.value],['暂存区',index.value],['工作区',work.value]]));
      return r.finish({head,index,work,hasStagedChange,dirty,unstagedDelta:work.value-index.value,stagedDelta:index.value-head.value});
    });

    M.register('missing-quality',[
      choice('implementation','输入校验实现',[['bug','错误：仅允许正数'],['fixed','修复：允许0和正数']],'bug'),
      choice('suite','当前测试集合',[['normal','仅正常正数'],['boundary','加入0和负数边界']],'normal'),
      choice('lock','交付的依赖说明',[['locked','记录确切环境与启动命令'],['missing','缺少可复现环境说明']],'locked')
    ],p=>{
      const r=record('missing-quality',p,`const accept=x=>implementation==='fixed'?x>=0:x>0;
const cases=suite==='normal'?[1,5]:[0,-1,3];
const checks=cases.map(x=>({x,expected:x>=0,actual:accept(x)}));
const passed=checks.filter(t=>t.expected===t.actual).length;
const testsGreen=passed===checks.length;
const reproducible=lock==='locked';
const gatePass=testsGreen&&reproducible;
const independentBoundaryPass=accept(0)===true;`);
      const accept=x=>p.implementation==='fixed'?x>=0:x>0;r.add(1,'先把需求写成可检查的边界','规格是允许非负整数，本例测试输入均为整数。页面只比较这两个明确的实现，不运行任意提交或真实CI。',{specification:'x >= 0',implementation:p.implementation},flow('规格与实现',[['需求','0和正数允许',false],['实现',p.implementation==='fixed'?'x >= 0':'x > 0',true]]));
      const cases=p.suite==='normal'?[1,5]:[0,-1,3];r.add(2,'选择测试输入会影响你能发现的问题','正常正数在两种实现下结果相同，单看这些例子发现不了0被拒绝的问题。',{cases},bars('测试输入',cases.map((x,i)=>['输入 '+i,x])));
      const checks=cases.map(x=>({x,expected:x>=0,actual:accept(x)}));r.add(3,'预期来自需求，实际来自待测实现','测试不能把实现的同一个条件直接抄成预期；这里逐行展示规格要求和返回值。',{checks},flow('逐项结果',checks.map(t=>['x='+t.x,'预期 '+t.expected+' / 实际 '+t.actual,t.expected!==t.actual])));
      const passed=checks.filter(t=>t.expected===t.actual).length;r.add(4,'区分通过多少题与证明了什么','通过数量只针对当前用例。格式化、静态检查和测试各查不同问题，格式整齐不能证明行为符合需求。',{passed,total:checks.length},bars('测试数量',[['通过',passed],['失败',checks.length-passed]],'题'));
      const testsGreen=passed===checks.length;r.add(5,'失败要阻止当前流水线继续','发现回归后先修复并重新运行原用例与边界用例，不把一次失败手工改为绿色。',{testsGreen},flow('测试关卡',[[testsGreen?'通过':'拒绝','当前选定测试集合',true]]));
      const reproducible=p.lock==='locked';r.add(6,'交付还需要环境和启动方法','锁定信息只是复现条件之一；还需输入数据、平台和配置。本开关表示教学清单是否记录了这些必要条件，不构建真实包。',{reproducible},flow('交付说明',[['环境和启动记录',reproducible?'已记录':'缺少',true]]));
      const gatePass=testsGreen&&reproducible;r.add(7,'展示当前规则是否放行','这个简化门禁只检查所选测试和交付说明。弱测试可能让有bug的实现放行，因此不能将放行解释为软件正确或已部署。',{testsGreen,reproducible,gatePass},flow('本地门禁',[['测试',testsGreen?'绿':'红',false],['复现说明',reproducible?'有':'缺',false],['本规则',gatePass?'放行':'阻止',true]]));
      const independentBoundaryPass=accept(0)===true;r.add(8,'再用未必包含在测试中的条件检查','把x=0当作独立检验；弱用例全部通过时仍可能在这里失败。应把已发现的边界加入回归集合。',{gatePass,independentBoundaryPass},flow('独立核对',[['门禁是否放行',gatePass?'是':'否',false],['0是否满足规格',independentBoundaryPass?'是':'否',true]]));
      return r.finish({checks,passed,total:checks.length,testsGreen,reproducible,gatePass,independentBoundaryPass});
    });
    M.register('missing-packaging',[
      choice('artifact','产物清单',[['complete','明确允许的四个文件'],['missing-entry','漏掉启动入口'],['includes-secret','错误加入私有配置']],'complete'),
      choice('change','接口改动',[['compatible','保留旧调用方式'],['breaking','移除旧参数']],'compatible'),
      choice('bump','从1.2.3发布到',[['patch','1.2.4'],['minor','1.3.0'],['major','2.0.0']],'minor'),
      choice('runtime','接收方Python',[['3.10','Python 3.10'],['3.11','Python 3.11'],['3.12','Python 3.12']],'3.11')
    ],p=>{
      const r=record('missing-packaging',p,`const repository=['__main__.py','sensorlib.py','README.md','VERSION','.env','notes.txt'];
const allowlist=['__main__.py','sensorlib.py','README.md','VERSION'];
const files=artifact==='missing-entry'?allowlist.filter(x=>x!=='__main__.py'):artifact==='includes-secret'?[...allowlist,'.env']:[...allowlist];
const entryOK=files.includes('__main__.py');
const publicOnly=files.every(x=>allowlist.includes(x));
const version={patch:'1.2.4',minor:'1.3.0',major:'2.0.0'}[bump];
const contractOK=change!=='breaking'||bump==='major';
const runtimeOK=Number(runtime.split('.')[1])>=11;
const checks={entryOK,publicOnly,contractOK,runtimeOK};
const blockers=Object.keys(checks).filter(k=>!checks[k]);
const ready=blockers.length===0;
const execution='not-run';`);
      const repository=['__main__.py','sensorlib.py','README.md','VERSION','.env','notes.txt'];
      r.add(1,'先定义交给别人的产物','仓库包含开发笔记和私有配置，交付物不应简单等于整个工作目录。这里的.env只有文件名，没有读取或展示凭据。',{repository,artifactKind:'Python zipapp'},flow('源目录',repository.map(x=>[x,x==='.env'?'私有配置':x==='notes.txt'?'开发笔记':'候选交付文件',false])));
      const allowlist=['__main__.py','sensorlib.py','README.md','VERSION'];
      r.add(2,'先列允许的文件，再打包','本例无外部依赖；接收方仍需Python解释器。真实wheel、原生二进制和容器是不同产物，不能把pyz称为适用于所有平台的独立可执行文件。',{allowlist},flow('交付约定',allowlist.map(x=>[x,'允许',true])));
      const files=p.artifact==='missing-entry'?allowlist.filter(x=>x!=='__main__.py'):p.artifact==='includes-secret'?[...allowlist,'.env']:[...allowlist];
      r.add(3,'查看实际进入包里的清单','缺入口和多放文件都是产物内容错误；“成功生成一个压缩包”并不能排除它们。',{files,excluded:repository.filter(x=>!files.includes(x))},flow('实际产物清单',files.map(x=>[x,allowlist.includes(x)?'公开交付':'越出允许范围',true])));
      const entryOK=files.includes('__main__.py');
      r.add(4,'检查Python能否找到约定入口','Python执行zipapp时寻找__main__.py。入口文件存在只是必要条件；本页没有真的启动这个包。',{entryOK},flow('入口检查',[['__main__.py',entryOK?'存在':'缺失',true]]));
      const publicOnly=files.every(x=>allowlist.includes(x));
      r.add(5,'核对内容范围','此处按明确允许清单检查，不靠文件名后缀猜测是否可公开。页面只演算固定文件名；真实产物还应检查内容、许可证和第三方依赖。',{publicOnly,unexpected:files.filter(x=>!allowlist.includes(x))},flow('产物范围',[['允许清单',publicOnly?'满足':'不满足',true]]));
      const version={patch:'1.2.4',minor:'1.3.0',major:'2.0.0'}[p.bump];
      r.add(6,'版本号表达对调用者的承诺','本例从已稳定的1.2.3开始，保留旧接口可采用兼容版本；移除原参数是破坏性改动，应提高主版本。版本号本身不执行兼容性测试。',{oldVersion:'1.2.3',version,change:p.change},flow('版本选择',[['旧版','1.2.3',false],['候选版本',version,true]]));
      const contractOK=p.change!=='breaking'||p.bump==='major';
      r.add(7,'将接口改动与版本规则对照','这里只检查明确给定的破坏性标记与主版本。没有从任意代码中自动推断语义，也不覆盖0.x和预发布版本的全部规则。',{contractOK},flow('版本约定',[['接口与版本',contractOK?'一致':'破坏性改动却未升主版本',true]]));
      const runtimeOK=Number(p.runtime.split('.')[1])>=11;
      r.add(8,'接收方环境也是交付条件','教学应用约定Python>=3.11。zipapp不自带Python；容器也不是不依赖宿主平台的万能快照。应把解释器、平台和启动命令写入交付说明。',{runtime:p.runtime,requiredRuntime:'>=3.11',runtimeOK},flow('接收方条件',[['Python',p.runtime,false],['约定',runtimeOK?'满足':'不满足',true]]));
      const checks={entryOK,publicOnly,contractOK,runtimeOK},blockers=Object.keys(checks).filter(k=>!checks[k]);
      r.add(10,'保留具体阻塞原因','把入口、内容、版本与运行时分开记录，便于决定改包还是改环境。通过项不能抵消失败项，检查数量也不是软件质量分数。',{checks,blockers},flow('明确的检查项',Object.entries(checks).map(([k,v])=>[k,v?'通过':'阻塞',!v])));
      const ready=blockers.length===0,execution='not-run';
      r.add(12,'产物检查通过后仍需实际运行','这里的ready只表示这四个模型条件满足。下方本地例程会真的构建pyz、从另一个临时工作目录执行并检查输出；浏览器回放不生成部署或安装成功证据。',{ready,execution},flow('证据边界',[['清单与约定',ready?'模型通过':'存在阻塞',true],['实际执行','本页未运行',false]]));
      return r.finish({repository,allowlist,files,entryOK,publicOnly,version,contractOK,runtimeOK,checks,blockers,ready,execution});
    });

    M.register('missing-agentic',[
      range('budget','最多执行的内存工具调用',1,5,1,5,'次'),
      choice('specification','需求说明',[['explicit','明确要求接受0与正数'],['ambiguous','只说修好校验函数']],'explicit'),
      choice('permission','编辑能力',[['allow','允许改本例函数'],['deny','只读，拒绝编辑']],'allow'),
      choice('candidate','预设补丁',[['fixed','改为x >= 0'],['unchanged','仍用x > 0']],'fixed'),
      choice('suite','回归用例',[['boundary','0、-1、3'],['normal','仅1、5']],'boundary')
    ],p=>{
      const r=record('missing-agentic',p,`const task=specification==='explicit'?'accept zero and positive':'fix validation';
let source='x > 0',calls=0,writes=0,status='running';
const schedule=['read','test-before','edit','test-after','review'];
const events=[],observations={before:null,after:null,review:null};
for(const action of schedule){
  if(calls>=budget){status='budget-exhausted';break;}
  calls++; const result=memoryTool(action,source,task);
  events.push({action,result});
  if(result.error){status=result.error;break;}
  if(action==='edit'){source=result.source;writes++;}
}
if(status==='running')status=observations.review==='pass'?'checked-example':observations.review||'needs-review';`);
      const task=p.specification==='explicit'?'accept zero and positive':'fix validation';
      let source='x > 0',calls=0,writes=0,status='running';
      const schedule=['read','test-before','edit','test-after','review'],events=[],observations={before:null,after:null,review:null};
      r.add(1,'先把需求与允许范围写成任务卡','明确0是否有效，再分别给出调用预算、测试集合与编辑能力。任务卡只是行动前条件，还没有测试结果或补丁证据；默认步骤选择是预设教学策略。',{task,budget:p.budget,permission:p.permission,suite:p.suite},flow('行动前约定',[['需求',task,true],['工具预算',p.budget,false],['编辑能力',p.permission==='allow'?'允许本例修改':'仅只读',false]]));
      r.add(2,'把任务、代码和权限分开','原函数拒绝0；需求是否接受0必须说清。后续动作按固定顺序选择，内存工具执行真实布尔运算；本页不调用LLM、不读取仓库、不改本机文件。',{task,source,calls,writes,observations},flow('最小Coding Agent案例',[['任务',task,false],['当前代码',source,true],['证据','尚未运行检查',false]]));
      const check=current=>{const inputs=p.suite==='boundary'?[0,-1,3]:[1,5];return inputs.map(x=>({x,expected:x>=0,actual:current==='x >= 0'?x>=0:x>0}))};
      function memoryTool(action,currentSource,currentTask){
        if(action==='read')return{source:currentSource,task:currentTask,permission:p.permission};
        if(action==='test-before'||action==='test-after'){
          const cases=check(currentSource),value={cases,passed:cases.every(c=>c.expected===c.actual)};
          observations[action==='test-before'?'before':'after']=value;return value;
        }
        if(action==='edit')return p.permission==='deny'?{error:'permission-denied'}:{source:p.candidate==='fixed'?'x >= 0':'x > 0',writes:writes+1};
        const specified=p.specification==='explicit',boundary=currentSource==='x >= 0';
        observations.review=!specified?'needs-spec':!observations.after?.passed?'tests-failed':!boundary?'boundary-failed':'pass';
        return{specified,independentZero:specified?boundary:null,review:observations.review};
      }
      for(const action of schedule){
        if(calls>=p.budget){status='budget-exhausted';r.add(6,'预算耗尽，保留当前证据后停止','未执行的测试保持null。停止是预算约束的结果，不能把“已经改了代码”当成“检查通过”。',{calls,writes,status,source,observations},flow('显式停止',[['已用调用',calls,true],['停止原因',status,false]]));break;}
        calls++;const result=memoryTool(action,source,task);
        events.push({action,result});
        if(result.error)status=result.error;
        else if(action==='edit'){source=result.source;writes++;}
        const labels={read:'读取允许范围内的任务与函数','test-before':'先复现原始失败','edit':result.error?'编辑被拒绝，立即停止':'接收一个预设补丁','test-after':'把真实检查结果反馈回来','review':'对照需求与独立边界再检查'};
        const details={read:'读到的代码、需求和权限回到调用方；工具结果会成为下一步的依据。这里只返回固定内存对象，没有远程服务。','test-before':'测试预期来自非负整数规格。仅正常正数的弱测试可能全绿，但不能回答边界0；页面会保留每项输入与结果。',edit:result.error?'只读能力没有授予写权限。被拒绝的请求不增加写入次数，不继续伪造修改后的测试。':'补丁由控件预先选择，不是模型自动生成。工具将改后的函数状态返回，后续必须针对这份状态重新验证。','test-after':'用内存中当前代码实际重新计算所有测试。补丁文字看起来合理与行为检查通过是两种证据。',review:'明确需求后再检查0。弱测试可以漏错；模糊需求即使测试全绿也需要补充规格。这个评审只覆盖本例条件。'};
        const known=action==='test-before'?observations.before:action==='test-after'?observations.after:null;
        const visual=known?flow('逐项工具观测',known.cases.map(c=>[String(c.x),'预期 '+c.expected+' / 实际 '+c.actual,c.expected!==c.actual])):flow('已执行的动作',[['动作',action,true],['代码',source,false],['结果',result.error||result.review||'已返回',false]]);
        r.add(result.error?9:action==='edit'?10:8,labels[action],details[action],{action,calls,writes,status,source,observations,lastResult:result},visual);
        if(result.error)break;
      }
      if(status==='running')status=observations.review==='pass'?'checked-example':observations.review||'needs-review';
      r.add(12,'用停止原因说明结果，而不是只给一句完成','checked-example只表示原函数在选定用例和独立边界0下通过。预算耗尽、权限拒绝、缺少规格和真实失败分别保留；没有完成任意用户任务或生成学习时长。',{status,calls,writes,source,observations},flow('最后的可核对状态',[['停止原因',status,true],['已执行调用',calls,false],['实际内存写入',writes,false],['修改后测试',observations.after===null?'未执行':observations.after.passed?'所选用例通过':'存在失败',false]]));
      return r.finish({status,calls,writes,source,events,observations,llmCalled:false,policy:'fixed teaching actions',scope:'in-memory example only'});
    });

    M.register('missing-beyond',[
      choice('report','问题报告',[['complete','环境、预期实际、复现步骤齐全'],['no-steps','缺少复现步骤'],['no-environment','缺少环境信息']],'complete'),
      choice('scope','修改范围',[['focused','只改计数边界与测试'],['mixed','同时混入界面重构']],'focused'),
      choice('rationale','修改说明',[['why','说明为何保留零读数'],['what','只写修改了判断符']],'why'),
      choice('feedback','评审意见',[['actionable','指出输入、差异及验证命令'],['vague','只写这里写得不好']],'actionable')
    ],p=>{
      const r=record('missing-beyond',p,`const readings=[0,2,-1];
const expected=readings.filter(x=>x>=0).length;
const actual=readings.filter(x=>x>0).length;
const report={environment:p.report!=='no-environment',steps:p.report!=='no-steps',expected,actual};
const reproducible=report.environment&&report.steps&&expected!==actual;
const focused=scope==='focused';
const whyRecorded=rationale==='why';
const actionable=feedback==='actionable';
const checks={reproducible,focused,whyRecorded,actionable};
const missing=Object.keys(checks).filter(k=>!checks[k]);
const ready=missing.length===0;`);
      const readings=[0,2,-1];r.add(1,'先准备一份别人能读的最小材料','原创问题：统计非负传感器读数时遗漏0。材料只用三个公开虚构整数，避免把整份私有日志作为问题报告附件。',{readings},flow('最小复现输入',readings.map((x,i)=>['输入 '+(i+1),x,false])));
      const expected=readings.filter(x=>x>=0).length;r.add(2,'预期来自需求而非待测代码','已知规格是保留0与正数，因此有效读数是0、2，共2条。先写清预期，维护者才知道你认为哪里发生了偏差。',{expected,specification:'x >= 0'},bars('按规格计算',[['有效读数',expected]],'条'));
      const actual=readings.filter(x=>x>0).length;r.add(3,'用最小输入真的复现差异','错误条件x>0只保留2，共1条。这个具体差异比“统计似乎不对”更容易检查；结果是当前内存代码的实际计算。',{actual,expected,difference:expected-actual},bars('独立预期与实际',[['预期',expected],['实际',actual]],'条'));
      const report={environment:p.report!=='no-environment',steps:p.report!=='no-steps',expected,actual};r.add(4,'把环境与复现步骤交给下一位读者','报告还需说明在什么解释器、输入和命令下得到差异。选项缺少信息时，它是待补材料，不是证明程序正确或错误的另一票。',{report},flow('问题报告',[['环境',report.environment?'Python与运行命令已写':'未提供',!report.environment],['步骤',report.steps?'最小输入与命令已写':'未提供',!report.steps],['差异','预期2 / 实际1',false]]));
      const reproducible=report.environment&&report.steps&&expected!==actual;r.add(5,'判断读者是否具备复查条件','本例将环境、步骤与可计算差异作为移交条件。真实项目还可能需要版本、配置和数据；这不是通用的Issue评分器。',{reproducible},flow('复现条件',[['可复查',reproducible?'本例材料满足':'继续补充材料',true]]));
      const focused=p.scope==='focused';r.add(6,'把一个原因对应到一组相关修改','修复计数边界与补回归用例属于同一目的；同时改布局会使因果解释与评审变难。先拆出可独立解释的变化，而不是只限制文件数量。',{scope:p.scope,focused,changedFiles:focused?['counter.py','test_counter.py']:['counter.py','test_counter.py','layout.css','navigation.js']},flow('修改目的',[['边界与回归','与报告直接相关',false],['界面重构',focused?'本次未包含':'混入无关目的',!focused]]));
      const whyRecorded=p.rationale==='why';r.add(7,'记录为什么值得这样改','“把>改成>=”能从diff读到；“0是传感器合法值，过滤它会低估样本数”才解释设计依据。TODO也应留下触发条件、后续行动和验证方法。',{whyRecorded,rationale:whyRecorded?'0是合法读数；保留它才能按规格统计':'修改判断符'},flow('给未来读者的说明',[['原因',whyRecorded?'已记录':'仍待解释',true]]));
      const actionable=p.feedback==='actionable';r.add(8,'让评审意见能转化为一个动作','有效意见指出输入0的预期、实际和检查方法，并区分必须修复的缺陷与可选建议。评审讨论针对代码和证据；这里不向任何人发送消息。',{actionable,feedback:actionable?'输入0应计入；请补回归用例并运行测试':'这里写得不好'},flow('评审反馈',[['下一步',actionable?'补0用例后重跑':'没有明确动作',true]]));
      const checks={reproducible,focused,whyRecorded,actionable},missing=Object.keys(checks).filter(k=>!checks[k]);r.add(10,'将缺的材料变成下一步','没有用已写字段抵消缺失字段，也不计算贡献者能力分数。按具体缺项决定补步骤、拆修改、解释原因或改评审措辞。',{checks,missing},flow('待补项',missing.length?missing.map(k=>[k,'需要补充',true]):[['四项条件','本例均具备',true]]));
      const ready=missing.length===0;r.add(11,'完成本例材料，保留真实协作边界','ready仅表示本例四项移交条件齐备；没有创建Issue、发布PR、取得维护者接受或证明别人一定能运行。真实贡献前还需阅读项目约定与许可，并由读者独立复现。',{ready,externalMessages:0},flow('协作材料状态',[['本例移交条件',ready?'齐备':'待补',true],['真实外部提交','未进行',false]]));
      return r.finish({readings,expected,actual,report,reproducible,focused,whyRecorded,actionable,checks,missing,ready,externalMessages:0});
    });
  };
});
