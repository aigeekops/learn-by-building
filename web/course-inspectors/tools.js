/* Missing Semester: inspect only the finite, recorded in-memory operations. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const has=(v,k)=>Object.hasOwn(v,k),n=x=>typeof x==='number'?x.toFixed(4):String(x),q=x=>JSON.stringify(x);
  const cell=(id,label,value,formula,inputs={},note='')=>({id,label,value,formula,inputs,note});
  const exp=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const eq=(a,b)=>q(a)===q(b),changed=(a,b,k)=>!eq(a.params[k],b.params[k]);
  function frame(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0)),history=t.steps.slice(0,i+1);return {i,f:t.steps[i],v:Object.assign({},...history.map(s=>s.variables)),previous:Object.assign({},...history.slice(0,-1).map(s=>s.variables))};}
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const s=frame(t,index);return {title:s.f.title,summary:'当前及此前实际快照；'+s.f.detail,cells:inspect(t,s)};},experiments};}
  function rows(values,prefix,label,formula){return values.map((value,i)=>cell(prefix+'-'+i,label+' ['+i+']',value,formula(value,i),{index:i,value}));}
  const models={};

  models['missing-shell']=model('把工作目录、路径分量、重定向打开、截断、实际输出和退出状态拆开；父目录不存在时没有命令输出，也没有写入。',(t,{i,v})=>{
    const p=t.params,c=[cell('cwd','工作目录',p.cwd,`相对路径从 ${q(p.cwd)} 开始解析`,{cwd:p.cwd},'虚拟目录；不访问本机文件。')];
    if(i===0)for(const [path,text] of Object.entries(v.files))c.push(cell('initial-report','初始报告',text,`files[${q(path)}] ← ${q(text)}`,{path,text}));
    if(has(v,'path')){
      const raw=p.target.startsWith('/')?p.target:p.cwd+'/'+p.target,stack=[];
      raw.split('/').forEach((part,j)=>{if(!part)return;const before='/'+stack.join('/');if(part==='..')stack.pop();else if(part!=='.')stack.push(part);const after='/'+stack.join('/');c.push(cell('component-'+j,'路径分量 '+part,after,`${q(before)} + ${q(part)} → ${q(after)}`,{before,part,after},'词法归一化；不处理符号链接。'));});
      c.push(cell('path','解析后的目标',v.path,`resolve(${q(p.cwd)}, ${q(p.target)}) = ${q(v.path)}`,{cwd:p.cwd,target:p.target}));
    }
    if(has(v,'parent'))c.push(cell('parent','目标父目录',v.parent,`${q(v.path)}.slice(0, lastIndexOf('/')) = ${q(v.parent)}`,{path:v.path}));
    if(has(v,'canOpen'))c.push(cell('open','能否打开重定向',v.canOpen,`${q(v.directories)} 包含 ${q(v.parent)} → ${v.canOpen}`,{parent:v.parent,directories:v.directories},'这里只检查父目录存在。'));
    if(has(v,'beforeWrite'))c.push(cell('before-write','打开后的目标内容',v.beforeWrite,!v.canOpen?'打开失败 → 不创建、不截断':p.mode==='overwrite'?`> 打开成功：原内容 → ""`:`>> 保留原内容：${q(v.beforeWrite)}`,{mode:p.mode,canOpen:v.canOpen,beforeWrite:v.beforeWrite},v.beforeWrite===null?'目标尚不存在或未打开；不是已有空文件。':''));
    if(has(v,'output')){
      c.push(cell('output','本次标准输出',v.output,v.commandRan?`输出 ${n(p.lines)} 行，每行带换行 → ${q(v.output)}`:'重定向失败 → commandRan=false → output=""',{requestedLines:p.lines,commandRan:v.commandRan}));
      c.push(cell('output-lines','实际输出行数',v.outputLines,`${v.commandRan} ? ${n(p.lines)} : 0 = ${n(v.outputLines)}`,{commandRan:v.commandRan,requestedLines:p.lines}));
    }
    if(has(v,'writes')){
      c.push(cell('writes','本次实际内存写入次数',v.writes,`canOpen=${v.canOpen} → writes=${n(v.writes)}`,{canOpen:v.canOpen}));
      for(const [path,text] of Object.entries(v.files))c.push(cell('file-'+path,'当前虚拟文件 '+path,text,path===v.path&&v.canOpen?`${q(v.beforeWrite??'')} + ${q(v.output)} = ${q(text)}`:`未写入该文件 → ${q(text)} 保留`,{path,beforeWrite:v.beforeWrite,output:v.output},'内存字符串；不构成磁盘写入证据。'));
    }
    if(has(v,'exitCode'))c.push(cell('exit','退出状态',v.exitCode,`canOpen=${v.canOpen} ? 0 : 1 = ${n(v.exitCode)}`,{canOpen:v.canOpen,commandRan:v.commandRan},'非零来自重定向失败；并非输出程序已经执行后失败。'));
    if(has(v,'lineCount'))c.push(cell('line-count','目标换行符个数',v.lineCount,v.canOpen?`${q(v.files[v.path])}.split('\\n').length − 1 = ${n(v.lineCount)}`:'打开失败 → lineCount=null（没有结果）',{canOpen:v.canOpen,text:v.files[v.path]??null},'null 不冒充成功生成0行。'));
    return c;
  },[
    exp('redirect-mode','只把追加改为覆盖','新输出相同；旧行是否保留决定最终行数。',{mode:'append'},{mode:'overwrite'},'追加2行，覆盖1行；两次都成功且只写一次。',(a,b)=>changed(a,b,'mode')&&a.result.lineCount===2&&b.result.lineCount===1&&a.result.files[a.result.path]==='old\nnew-1\n'&&b.result.files[b.result.path]==='new-1\n'&&a.result.writes===1&&b.result.writes===1),
    exp('missing-parent','只把目标改到不存在的子目录','预测命令是否运行、是否创建文件和退出码。',{target:'../report.txt'},{target:'missing/report.txt'},'父目录不存在：无输出、无写入、行数null、退出1，旧报告保留。',(a,b)=>changed(a,b,'target')&&a.result.exitCode===0&&!b.result.canOpen&&!b.result.commandRan&&b.result.output===''&&b.result.outputLines===0&&b.result.writes===0&&b.result.lineCount===null&&b.result.exitCode===1&&eq(b.result.files,{'/lab/project/report.txt':'old\n'}))
  ]);

  models['missing-pipeline']=model('逐条保留日志的级别与消息，检查筛选、排序、相邻分组和组数；数字结果与上游退出状态分别验证。',(t,{v})=>{
    const p=t.params,c=[];
    v.input.forEach((row,j)=>{
      c.push(cell('input-'+j,'上游记录 ['+j+']',row.message,`input[${j}] = (${q(row.level)}, ${q(row.message)})`,{index:j,level:row.level,message:row.message}));
      if(has(v,'selected'))c.push(cell('keep-'+j,'记录 ['+j+'] 筛选',p.filter==='ALL'||row.level===p.filter,`${q(p.filter)} === "ALL" || ${q(row.level)} === ${q(p.filter)} → ${p.filter==='ALL'||row.level===p.filter}`,{level:row.level,filter:p.filter}));
    });
    if(has(v,'producerExit'))c.push(cell('producer-exit','上游退出状态',v.producerExit,`${q(p.producer)} === "fail" ? 7 : 0 = ${n(v.producerExit)}`,{producer:p.producer,outputRows:v.input.length},'失败仍可能已产生部分输出。'));
    if(has(v,'selected'))c.push(cell('selected-count','保留行数',v.selected.length,`满足级别谓词的记录共 ${n(v.selected.length)} 行`,{filter:p.filter,selected:v.selected}));
    if(has(v,'sorted'))c.push(...rows(v.sorted,'sorted','排序位置',(x,j)=>`sort(${q(v.selected.map(r=>r.message))})[${j}] = ${q(x)}`));
    if(has(v,'groups')){
      v.groups.forEach((g,j)=>c.push(cell('group-'+j,'相邻消息组 '+g.message,g.count,`${v.sorted.map(x=>`${q(x)} === ${q(g.message)} ? 1 : 0`).join(' + ')} = ${n(g.count)}`,{message:g.message,sorted:v.sorted},'先排序后相邻分组；同一组计数不等于总组数。')));
      if(!v.groups.length)c.push(cell('empty-groups','分组结果',0,'sorted=[] → groups=[]，没有消息组',{sorted:v.sorted}));
    }
    if(has(v,'count'))c.push(cell('group-count','不同消息数',v.count,`groups.length = ${n(v.groups.length)} = ${n(v.count)}`,{groups:v.groups,selectedRows:v.selectedRows}));
    if(has(v,'exitCode'))c.push(cell('pipeline-exit','管道退出状态',v.exitCode,`${q(p.pipefail)} === "on" ? ${n(v.producerExit)} : ${n(v.lastExit)} = ${n(v.exitCode)}`,{producerExit:v.producerExit,lastExit:v.lastExit,pipefail:p.pipefail},'本例下游均返回0；一般pipefail取最右侧非零状态。数字结果不证明上游完整。'));
    return c;
  },[
    exp('pipefail','仅切换失败管道的状态规则','数字结果保持；退出码会不会揭示上游失败？',{producer:'fail',pipefail:'off'},{producer:'fail',pipefail:'on'},'同为1组，但退出状态从0变7；两者输入均只有2行。',(a,b)=>changed(a,b,'pipefail')&&a.result.count===1&&b.result.count===1&&eq(a.result.selected,b.result.selected)&&a.result.exitCode===0&&b.result.exitCode===7&&a.result.input.length===2&&b.result.input.length===2&&!a.result.complete&&!b.result.complete),
    exp('filter','只把WARN筛选改成ERROR','预测保留行、消息组与每组频数。',{filter:'WARN'},{filter:'ERROR'},'WARN有3行2组；ERROR有2行且offline一组出现2次。',(a,b)=>changed(a,b,'filter')&&a.result.selected.length===3&&a.result.count===2&&b.result.selected.length===2&&b.result.count===1&&eq(b.result.groups,[{message:'offline',count:2}])&&a.result.exitCode===b.result.exitCode)
  ]);

  models['missing-environment']=model('把解释器门槛与虚构core依赖的离散版本交集分开计算；锁定值必须落在交集中，不能让冲突自动消失。',(t,{v})=>{
    const p=t.params,c=[cell('runtime','解释器约束',v.runtimeOK,`${q(p.runtime)} 的次版本 ${n(Number(p.runtime.split('.')[1]))} >= 11 → ${v.runtimeOK}`,{runtime:p.runtime,required:'>=3.11'},'仅列出的3.x版本；不探测实际环境。')];
    if(has(v,'available'))v.available.forEach((version,j)=>{
      c.push(cell('available-'+j,'候选 core '+version,version,`available[${j}] = ${n(version)}`,{version},'虚构包的离散整数版本；不是完整PEP 440求解。'));
      if(has(v,'appAllowed'))c.push(cell('app-'+j,'core '+version+' 主项目约束',v.appAllowed.includes(version),`${n(version)} >= 1 && ${n(version)} < 3 → ${v.appAllowed.includes(version)}`,{version}));
      if(has(v,'extraAllowed'))c.push(cell('extra-'+j,'core '+version+' 传递约束',v.extraAllowed.includes(version),`${n(version)} >= ${p.extra==='compatible'?'2':'3'} → ${v.extraAllowed.includes(version)}`,{version,extra:p.extra}));
      if(has(v,'intersection'))c.push(cell('intersection-'+j,'core '+version+' 同时满足',v.intersection.includes(version),`${v.appAllowed.includes(version)} && ${v.extraAllowed.includes(version)} → ${v.intersection.includes(version)}`,{version,appAllowed:v.appAllowed,extraAllowed:v.extraAllowed}));
    });
    if(has(v,'selected'))c.push(cell('selected','本次选择的core',v.selected,p.lock==='none'?`max(${q(v.intersection)})；空集返回null → ${q(v.selected)}`:`锁定 ${q(p.lock)} → Number(lock) = ${n(v.selected)}`,{lock:p.lock,intersection:v.intersection},'选择值尚需检查交集；被锁定不等于兼容。'));
    if(has(v,'dependencyOK')){
      c.push(cell('dependency','依赖检查',v.dependencyOK,`${q(v.selected)} !== null && ${q(v.intersection)}.includes(${q(v.selected)}) → ${v.dependencyOK}`,{selected:v.selected,intersection:v.intersection}));
      c.push(cell('ready','本例启动条件',v.ready,`runtimeOK=${v.runtimeOK} && dependencyOK=${v.dependencyOK} → ${v.ready}`,{runtimeOK:v.runtimeOK,dependencyOK:v.dependencyOK},'模型条件通过；尚未执行实际程序。'));
      c.push(cell('reproducible-choice','锁定且依赖满足',v.reproducibleChoice,`${q(p.lock)} !== "none" && ${v.dependencyOK} → ${v.reproducibleChoice}`,{lock:p.lock,dependencyOK:v.dependencyOK}));
    }return c;
  },[
    exp('runtime','只把解释器3.10改为3.11','core选择是否保持？启动条件是否改变？',{runtime:'3.10'},{runtime:'3.11'},'core仍为2；解释器检查false→true，ready false→true。',(a,b)=>changed(a,b,'runtime')&&!a.result.runtimeOK&&b.result.runtimeOK&&a.result.selected===2&&b.result.selected===2&&!a.result.ready&&b.result.ready),
    exp('intersection','只改传递依赖约束','core<3和core>=3是否存在共同候选？',{extra:'conflict',lock:'none'},{extra:'compatible',lock:'none'},'冲突时交集空且未选择；兼容时交集[2]，选择2。',(a,b)=>changed(a,b,'extra')&&eq(a.result.intersection,[])&&a.result.selected===null&&!a.result.ready&&eq(b.result.intersection,[2])&&b.result.selected===2&&b.result.ready),
    exp('locked-version','只把锁定1改为锁定2','锁文件能否绕过>=2的传递约束？',{lock:'1'},{lock:'2'},'相同交集[2]；锁1不兼容，锁2兼容。',(a,b)=>changed(a,b,'lock')&&eq(a.result.intersection,[2])&&eq(b.result.intersection,[2])&&a.result.selected===1&&!a.result.dependencyOK&&b.result.selected===2&&b.result.dependencyOK)
  ]);

  models['missing-debug']=model('用同一非空等差输入独立求预期，再定位总和、分母和误差；真实算术结果与理论加法计数分别核对。',(t,{v})=>{
    const p=t.params,c=rows(v.values,'sample','输入样本',(x,j)=>`2 × (${n(j)} + 1) = ${n(x)}`);
    if(has(v,'expected'))c.push(cell('expected','独立预期平均',v.expected,`(${n(v.first)} + ${n(v.last)}) / 2 = ${n(v.expected)}`,{first:v.first,last:v.last},'仅本例非空等差数列。'));
    if(has(v,'total'))c.push(cell('total','实际累计总和',v.total,`${v.values.map(n).join(' + ')} = ${n(v.total)}`,{values:v.values}));
    if(has(v,'denominator'))c.push(cell('denominator','程序分母',v.denominator,p.fix==='fixed'?`n=${n(v.values.length)} → ${n(v.denominator)}`:`n + 1 = ${n(v.values.length)} + 1 = ${n(v.denominator)}`,{n:v.values.length,fix:p.fix,expectedDenominator:v.expectedDenominator}));
    if(has(v,'mean')){
      c.push(cell('mean','程序平均',v.mean,`${n(v.total)} / ${n(v.denominator)} = ${n(v.mean)}`,{total:v.total,denominator:v.denominator}));
      c.push(cell('error','实际减预期',v.error,`${n(v.mean)} − ${n(v.expected)} = ${n(v.error)}`,{mean:v.mean,expected:v.expected}));
    }
    if(has(v,'passed'))c.push(cell('assertion','本次数值断言',v.passed,`abs(${n(v.mean)} − ${n(v.expected)}) < 1e-12 → ${v.passed}`,{mean:v.mean,expected:v.expected,tolerance:1e-12}));
    if(has(v,'additions'))c.push(cell('additions','理论加法次数',v.additions,p.algorithm==='repeat'?`${n(p.n)} 份报告 × ${n(p.n)} 次加法 = ${n(v.additions)}`:`先求和 ${n(p.n)} 次，再复用 → ${n(v.additions)}`,{reports:p.n,algorithm:p.algorithm},'操作计数；不代表实际CPU耗时或实测加速比。'));
    if(Array.isArray(v.reports))c.push(...rows(v.reports,'report','报告平均',(x,j)=>`reports[${j}] ← 已算 mean=${n(x)}`));
    return c;
  },[
    exp('denominator','只修正分母','相同输入、总和和操作计数下，平均和断言如何变化？',{fix:'bug'},{fix:'fixed'},'总和20不变，分母5→4，均值4→5，断言false→true。',(a,b)=>changed(a,b,'fix')&&a.result.total===20&&b.result.total===20&&a.result.denominator===5&&b.result.denominator===4&&a.result.mean===4&&b.result.mean===5&&!a.result.passed&&b.result.passed&&a.result.additions===b.result.additions),
    exp('cache','只缓存总和','均值是否保持？预测4份报告的理论加法次数。',{fix:'fixed',algorithm:'repeat'},{fix:'fixed',algorithm:'cached'},'报告均值全为5；理论加法16→4。',(a,b)=>changed(a,b,'algorithm')&&a.result.additions===16&&b.result.additions===4&&eq(a.result.reports,[5,5,5,5])&&eq(a.result.reports,b.result.reports)&&a.result.passed&&b.result.passed)
  ]);

  models['missing-git']=model('把HEAD、暂存区和工作区分成三个值；add捕获当时内容，commit只读取暂存区，restore从暂存区恢复工作区。',(t,{f,v,previous})=>{
    const p=t.params,c=[],line=f.line;
    const h=previous.head??v.head,ix=previous.index??{value:1},w=previous.work??{value:p.first};
    c.push(cell('head','HEAD提交内容',v.head.value,line===6&&v.hasStagedChange?`commit(index=${n(v.index.value)})：${h.id}(${n(h.value)}) → ${v.head.id}(${n(v.head.value)})`:`HEAD=${v.head.id}，内容保持 ${n(v.head.value)}`,{head:v.head,previous:h},'C0/C1是教学标签；不创建真实提交。'));
    c.push(cell('index','暂存区内容',v.index.value,line===2||line===4?`stage=${q(p.stage)}：index ${n(ix.value)} → ${n(v.index.value)}；工作区 ${n(v.work.value)}`:`index 保持 ${n(v.index.value)}`,{previous:ix.value,index:v.index.value,work:v.work.value},'暂存快照不会跟随之后的编辑自动改变。'));
    c.push(cell('work','工作区内容',v.work.value,line===3?`第二次编辑：${n(w.value)} → ${n(v.work.value)}`:line===7?`restore=${q(p.restore)}：work ${n(w.value)} → ${n(v.work.value)}，来源 index=${n(v.index.value)}`:`当前 work=${n(v.work.value)}`,{previous:w.value,work:v.work.value,index:v.index.value}));
    if(has(v,'hasStagedChange'))c.push(cell('has-staged-change','提交前是否存在暂存差异',v.hasStagedChange,`提交前 index=${n(v.index.value)} !== C0.value=1 → ${v.hasStagedChange}`,{index:v.index.value,base:1},'保留提交前判定；提交后待提交差异另由stagedDelta给出。'));
    if(v.head.parent)c.push(cell('parent','提交父节点',v.head.parent,`${v.head.id}.parent = ${q(v.head.parent)}`,{id:v.head.id,parent:v.head.parent}));
    if(has(v,'dirty')){
      c.push(cell('unstaged-delta','工作区减暂存区',v.unstagedDelta,`${n(v.work.value)} − ${n(v.index.value)} = ${n(v.unstagedDelta)}`,{work:v.work.value,index:v.index.value}));
      c.push(cell('staged-delta','暂存区减HEAD',v.stagedDelta,`${n(v.index.value)} − ${n(v.head.value)} = ${n(v.stagedDelta)}`,{index:v.index.value,head:v.head.value}));
      c.push(cell('dirty','是否有未暂存变化',v.dirty,`${n(v.work.value)} !== ${n(v.index.value)} → ${v.dirty}`,{work:v.work.value,index:v.index.value}));
    }return c;
  },[
    exp('stage-time','只将add移到第二次编辑后','工作区同为7，预测提交的是2还是7。',{stage:'before'},{stage:'after'},'HEAD从2变7；工作区保持7，未暂存差异5→0。',(a,b)=>changed(a,b,'stage')&&a.result.head.value===2&&b.result.head.value===7&&a.result.work.value===7&&b.result.work.value===7&&a.result.unstagedDelta===5&&b.result.unstagedDelta===0&&a.result.dirty&&!b.result.dirty),
    exp('restore','只改变提交后的工作区恢复选项','预测工作区变化，并检查HEAD是否回退。',{restore:'keep'},{restore:'restore'},'工作区7→2，HEAD和暂存区仍为2；HEAD没有回退。',(a,b)=>changed(a,b,'restore')&&a.result.work.value===7&&b.result.work.value===2&&eq(a.result.head,b.result.head)&&a.result.head.id==='C1'&&b.result.index.value===2&&a.result.dirty&&!b.result.dirty),
    exp('skip-add','只从不add改为第一次编辑后add','预测是否生成C1，以及第二次编辑是否被提交。',{stage:'skip'},{stage:'before'},'skip仍是C0=1；before生成C1=2，两者工作区均7。',(a,b)=>changed(a,b,'stage')&&!a.result.hasStagedChange&&a.result.head.id==='C0'&&b.result.hasStagedChange&&b.result.head.id==='C1'&&b.result.head.value===2&&a.result.work.value===b.result.work.value)
  ]);

  models['missing-quality']=model('每个测试分别计算规格预期、实现返回值与相等判定；弱测试放行和独立零边界失败可以同时存在。',(t,{v})=>{
    const p=t.params,c=[cell('implementation','实现谓词',p.implementation==='fixed'?'x >= 0':'x > 0',`规格 x >= 0；当前实现 ${p.implementation==='fixed'?'x >= 0':'x > 0'}`,{implementation:p.implementation})];
    if(has(v,'cases'))c.push(...rows(v.cases,'case','选定测试输入',(x,j)=>`suite=${q(p.suite)} → cases[${j}]=${n(x)}`));
    if(has(v,'checks'))v.checks.forEach((r,j)=>{
      c.push(cell('expected-'+j,'用例 '+j+' 规格预期',r.expected,`${n(r.x)} >= 0 → ${r.expected}`,{x:r.x}));
      c.push(cell('actual-'+j,'用例 '+j+' 实现返回',r.actual,`${n(r.x)} ${p.implementation==='fixed'?'>=':'>'} 0 → ${r.actual}`,{x:r.x,implementation:p.implementation}));
      c.push(cell('check-'+j,'用例 '+j+' 是否通过',r.actual===r.expected,`${r.actual} === ${r.expected} → ${r.actual===r.expected}`,r));
    });
    if(has(v,'passed'))c.push(cell('passed','通过数量',v.passed,`${v.checks.map(r=>r.actual===r.expected?'1':'0').join(' + ')} = ${n(v.passed)} / ${n(v.total)}`,{checks:v.checks,total:v.total}));
    if(has(v,'testsGreen'))c.push(cell('tests-green','当前测试集合',v.testsGreen,`${n(v.passed)} === ${n(v.total)} → ${v.testsGreen}`,{passed:v.passed,total:v.total},'仅针对所选集合。'));
    if(has(v,'reproducible'))c.push(cell('reproducible','复现说明条件',v.reproducible,`${q(p.lock)} === "locked" → ${v.reproducible}`,{lock:p.lock},'教学清单开关；未实际构建安装。'));
    if(has(v,'gatePass'))c.push(cell('gate','当前门禁',v.gatePass,`testsGreen=${v.testsGreen} && reproducible=${v.reproducible} → ${v.gatePass}`,{testsGreen:v.testsGreen,reproducible:v.reproducible}));
    if(has(v,'independentBoundaryPass'))c.push(cell('independent-zero','独立核对输入0',v.independentBoundaryPass,`accept(0) = (0 ${p.implementation==='fixed'?'>=':'>'} 0) = ${v.independentBoundaryPass}`,{x:0,implementation:p.implementation},'门禁放行不能代替边界验证。'));
    return c;
  },[
    exp('boundary-suite','只把正常用例换成边界用例','实现不变，测试门禁和独立0核对是否同向？',{suite:'normal'},{suite:'boundary'},'错误实现正常2题全过；边界只过2/3，0在两次独立核对中都失败。',(a,b)=>changed(a,b,'suite')&&a.result.passed===2&&a.result.total===2&&a.result.gatePass&&b.result.passed===2&&b.result.total===3&&!b.result.gatePass&&!a.result.independentBoundaryPass&&!b.result.independentBoundaryPass),
    exp('fix-zero','只修正非负整数谓词','预测边界0对应的实际值与通过数量。',{suite:'boundary',implementation:'bug'},{suite:'boundary',implementation:'fixed'},'0由false变true；通过数量2→3，门禁通过。',(a,b)=>changed(a,b,'implementation')&&a.result.checks[0].x===0&&!a.result.checks[0].actual&&b.result.checks[0].actual&&a.result.passed===2&&b.result.passed===3&&!a.result.gatePass&&b.result.gatePass&&b.result.independentBoundaryPass),
    exp('delivery-record','只补充复现说明','测试结果保持；当前门禁是否放行？',{implementation:'fixed',suite:'boundary',lock:'missing'},{implementation:'fixed',suite:'boundary',lock:'locked'},'相同3题全过；复现条件false→true使门禁false→true。',(a,b)=>changed(a,b,'lock')&&eq(a.result.checks,b.result.checks)&&a.result.testsGreen&&b.result.testsGreen&&!a.result.reproducible&&b.result.reproducible&&!a.result.gatePass&&b.result.gatePass)
  ]);

  models['missing-packaging']=model('分别检查zipapp逐文件清单、启动入口、允许范围、破坏性改动的主版本和接收方解释器；模型通过保留实际未运行状态。',(t,{v})=>{
    const p=t.params,c=rows(v.repository,'repository','仓库文件',(x,j)=>`repository[${j}] = ${q(x)}（仅文件名）`);
    if(has(v,'allowlist'))c.push(...rows(v.allowlist,'allow','允许交付文件',(x,j)=>`allowlist[${j}] = ${q(x)}`));
    if(has(v,'files')){
      v.repository.forEach((file,j)=>c.push(cell('included-'+j,'产物是否包含 '+file,v.files.includes(file),`${q(v.files)}.includes(${q(file)}) → ${v.files.includes(file)}`,{file,files:v.files},v.allowlist.includes(file)?'允许的文件名。':'未在本例允许清单中。')));
      v.files.forEach((file,j)=>c.push(cell('allowed-'+j,'产物项 '+file+' 是否允许',v.allowlist.includes(file),`${q(v.allowlist)}.includes(${q(file)}) → ${v.allowlist.includes(file)}`,{file,allowlist:v.allowlist})));
    }
    if(has(v,'entryOK'))c.push(cell('entry','zipapp入口',v.entryOK,`${q(v.files)}.includes("__main__.py") → ${v.entryOK}`,{files:v.files},'入口存在为必要条件；尚未执行zipapp。'));
    if(has(v,'publicOnly'))c.push(cell('public-only','所有文件是否允许',v.publicOnly,`${v.files.map(x=>String(v.allowlist.includes(x))).join(' && ')} → ${v.publicOnly}`,{unexpected:v.unexpected}));
    if(has(v,'version'))c.push(cell('version','声明的新版本',v.version,`${q(v.oldVersion)} → bump=${q(p.bump)} → ${q(v.version)}`,{oldVersion:v.oldVersion,bump:p.bump,change:p.change}));
    if(has(v,'contractOK'))c.push(cell('contract','接口与版本规则',v.contractOK,`${q(p.change)} !== "breaking" || ${q(p.bump)} === "major" → ${v.contractOK}`,{change:p.change,bump:p.bump},'稳定1.2.3起点的有限规则；不自动推断接口兼容性。'));
    if(has(v,'runtimeOK'))c.push(cell('runtime','接收方Python',v.runtimeOK,`${q(p.runtime)} 的次版本 ${n(Number(p.runtime.split('.')[1]))} >= 11 → ${v.runtimeOK}`,{runtime:p.runtime,required:v.requiredRuntime},'zipapp不自带Python。'));
    if(has(v,'checks')){
      for(const [key,value] of Object.entries(v.checks))c.push(cell('blocker-'+key,'阻塞项 '+key,!value,`${key}=${value} → !${key}=${!value}`,{check:key,passed:value}));
      c.push(cell('blockers','具体阻塞数量',v.blockers.length,`未通过项 ${q(v.blockers)} → length=${n(v.blockers.length)}`,{blockers:v.blockers},'通过项不能抵消失败项。'));
    }
    if(has(v,'ready')){
      c.push(cell('ready','模型交付条件',v.ready,`blockers.length=${n(v.blockers.length)} === 0 → ${v.ready}`,{blockers:v.blockers}));
      c.push(cell('execution','实际执行证据',v.execution,`execution ← ${q(v.execution)}`,{execution:v.execution},'浏览器没有构建、安装或运行产物。'));
    }return c;
  },[
    exp('entry','只把缺入口产物换为完整清单','其余条件都满足时，缺哪个文件会阻塞？',{artifact:'missing-entry'},{artifact:'complete'},'只有entryOK从false变true，阻塞项消失；实际执行仍not-run。',(a,b)=>changed(a,b,'artifact')&&!a.result.entryOK&&b.result.entryOK&&eq(a.result.blockers,['entryOK'])&&b.result.ready&&a.result.execution==='not-run'&&b.result.execution==='not-run'),
    exp('major-version','只将破坏性改动从minor升至major','文件和运行时不变，预测版本约定结果。',{change:'breaking',bump:'minor'},{change:'breaking',bump:'major'},'1.3.0不满足，2.0.0满足；清单不变。',(a,b)=>changed(a,b,'bump')&&a.result.version==='1.3.0'&&b.result.version==='2.0.0'&&!a.result.contractOK&&b.result.contractOK&&eq(a.result.files,b.result.files)&&!a.result.ready&&b.result.ready),
    exp('allowlist','只移除误入产物的.env','入口不变，预测内容范围与阻塞项。',{artifact:'includes-secret'},{artifact:'complete'},'仅publicOnly失败；移除.env后通过，未展示任何文件内容。',(a,b)=>changed(a,b,'artifact')&&a.result.files.includes('.env')&&!b.result.files.includes('.env')&&!a.result.publicOnly&&b.result.publicOnly&&a.result.entryOK&&b.result.entryOK&&eq(a.result.blockers,['publicOnly'])&&b.result.ready)
  ]);

  function observedTests(observation,prefix,label,source){
    if(observation===null)return [cell(prefix+'-pending',label+'尚未执行',null,`${label} = null → 没有测试证据`,{},'null不是测试通过或失败。')];
    const c=[];
    observation.cases.forEach((r,j)=>{
      c.push(cell(prefix+'-expected-'+j,label+'规格 ['+j+']',r.expected,`${n(r.x)} >= 0 → ${r.expected}`,{x:r.x}));
      c.push(cell(prefix+'-actual-'+j,label+'实现 ['+j+']',r.actual,`${n(r.x)} ${source==='x >= 0'?'>=':'>'} 0 → ${r.actual}`,{x:r.x,source}));
      c.push(cell(prefix+'-check-'+j,label+'判定 ['+j+']',r.actual===r.expected,`${r.actual} === ${r.expected} → ${r.actual===r.expected}`,r));
    });
    c.push(cell(prefix+'-passed',label+'集合通过',observation.passed,`${observation.cases.map(r=>String(r.actual===r.expected)).join(' && ')} → ${observation.passed}`,{cases:observation.cases},'仅已执行的选定用例。'));
    return c;
  }
  models['missing-agentic']=model('固定教学动作按预算调用真实内存工具；逐次跟踪调用数、写入数、实际测试与独立零边界，保留未执行、权限拒绝和停止原因。',(t,{f,v,previous})=>{
    const p=t.params,c=[cell('task','需求是否明确',p.specification==='explicit',`${q(p.specification)} === "explicit" → ${p.specification==='explicit'}；任务 ${q(v.task)}`,{task:v.task,specification:p.specification},'固定策略与预设补丁；本页不调用LLM。'),cell('budget','调用上限',p.budget,`最多允许 ${n(p.budget)} 次内存工具调用`,{budget:p.budget}),cell('permission','编辑能力',p.permission==='allow',`${q(p.permission)} === "allow" → ${p.permission==='allow'}`,{permission:p.permission})];
    if(has(v,'source'))c.push(cell('source','当前内存函数',v.source,has(f.variables,'action')&&v.action==='edit'?`${q(previous.source)} → ${q(v.source)}${v.lastResult.error?'（请求被拒绝，保持原值）':''}`:`source = ${q(v.source)}`,{source:v.source,previous:previous.source??v.source},'不读取仓库或修改本机文件。'));
    if(has(v,'calls')){
      c.push(cell('calls','已执行调用次数',v.calls,has(f.variables,'action')?`${n(previous.calls??0)} + 1（${v.action}） = ${n(v.calls)}`:`已执行 ${n(v.calls)}，预算 ${n(p.budget)}，不增加未执行调用`,{calls:v.calls,budget:p.budget,action:has(f.variables,'action')?v.action:null}));
      c.push(cell('writes','实际内存写入次数',v.writes,has(f.variables,'action')&&v.action==='edit'?`${n(previous.writes??0)} + ${v.lastResult.error?'0（拒绝）':'1（允许编辑）'} = ${n(v.writes)}`:`writes 保持 ${n(v.writes)}`,{writes:v.writes,permission:p.permission},'拒绝编辑不计写入；未改进的预设补丁也可能执行了一次写入。'));
    }
    if(has(f.variables,'action'))c.push(cell('action','刚执行的工具动作',v.action,`${n(v.calls)} 次调用 → ${q(v.action)} → ${v.lastResult.error?q(v.lastResult.error):v.action==='edit'?q(v.lastResult.source):v.action==='review'?q(v.lastResult.review):'已返回实际观测'}`,{action:v.action,result:v.lastResult}));
    if(has(v,'observations')){
      c.push(...observedTests(v.observations.before,'before','修改前测试','x > 0'));
      c.push(...observedTests(v.observations.after,'after','修改后测试',v.source));
      if(v.observations.review===null)c.push(cell('review','独立评审尚未执行',null,'review = null → 还没有规格与零边界复查结果',{}));
      else {
        const specified=p.specification==='explicit',boundary=v.source==='x >= 0';
        c.push(cell('zero','独立输入0的核对',specified?boundary:null,specified?`0 ${boundary?'>=':'>'} 0 → ${boundary}`:'需求不明确 → independentZero=null，先补规格',{specified,source:v.source,x:0}));
        c.push(cell('review','独立评审结论',v.observations.review,`specified=${specified}；after.passed=${v.observations.after?.passed??null}；accept(0)=${boundary} → ${q(v.observations.review)}`,{specified,afterPassed:v.observations.after?.passed??null,boundary}));
      }
    }
    if(has(v,'status'))c.push(cell('status','当前状态/停止原因',v.status,f.line===6?`${n(v.calls)} >= budget ${n(p.budget)} → "budget-exhausted"`:f.line===12?`依据已执行动作与 review=${q(v.observations.review)} → ${q(v.status)}`:v.lastResult?.error?`工具返回 ${q(v.lastResult.error)} → 立即停止`:`尚在固定动作序列中 → ${q(v.status)}`,{calls:v.calls,budget:p.budget,status:v.status},'checked-example仅证明本例条件；预算耗尽不冒充修改后测试已执行。'));
    return c;
  },[
    exp('budget','只增加允许的工具调用数','预算3时已编辑，是否已运行修改后测试？',{budget:3},{budget:5},'3次后停止且after=null；5次执行完评审并通过，写入次数都为1。',(a,b)=>changed(a,b,'budget')&&a.result.status==='budget-exhausted'&&a.result.calls===3&&a.result.observations.after===null&&b.result.status==='checked-example'&&b.result.calls===5&&b.result.observations.after.passed&&a.result.writes===1&&b.result.writes===1),
    exp('patch','只把无效补丁改为修复0的补丁','同样5次调用与1次写入，测试和结论会否不同？',{candidate:'unchanged'},{candidate:'fixed'},'原谓词边界测试失败；修复后全过且checked-example。',(a,b)=>changed(a,b,'candidate')&&a.result.status==='tests-failed'&&b.result.status==='checked-example'&&!a.result.observations.after.passed&&b.result.observations.after.passed&&a.result.calls===5&&b.result.calls===5&&a.result.writes===1&&b.result.writes===1),
    exp('permission','只授予本例内存编辑能力','被拒绝的编辑是否产生写入或修改后测试？',{permission:'deny'},{permission:'allow'},'拒绝时第3次调用停止、0次写入、after=null；允许时完成1次写入与测试。',(a,b)=>changed(a,b,'permission')&&a.result.status==='permission-denied'&&a.result.calls===3&&a.result.writes===0&&a.result.source==='x > 0'&&a.result.observations.after===null&&b.result.status==='checked-example'&&b.result.writes===1),
    exp('specification','只把模糊需求改为明确要求接受0','测试可以全绿，模糊规格是否仍会阻止完成结论？',{specification:'ambiguous'},{specification:'explicit'},'两次修改后测试均通过；needs-spec→checked-example。',(a,b)=>changed(a,b,'specification')&&a.result.observations.after.passed&&b.result.observations.after.passed&&a.result.status==='needs-spec'&&b.result.status==='checked-example'&&eq(a.result.observations.after,b.result.observations.after))
  ]);

  models['missing-beyond']=model('用0、2、−1独立复现非负读数漏计，逐项检查环境、步骤、修改目的、原因说明和可执行反馈；材料齐备不等于真实提交或接受。',(t,{v})=>{
    const p=t.params,c=rows(v.readings,'reading','最小复现输入',(x,j)=>`readings[${j}] = ${n(x)}`);
    if(has(v,'expected')){
      v.readings.forEach((x,j)=>c.push(cell('expected-keep-'+j,'规格保留 ['+j+']',x>=0,`${n(x)} >= 0 → ${x>=0}`,{x})));
      c.push(cell('expected','按规格计数',v.expected,`${v.readings.map(x=>x>=0?'1':'0').join(' + ')} = ${n(v.expected)}`,{readings:v.readings}));
    }
    if(has(v,'actual')){
      v.readings.forEach((x,j)=>c.push(cell('actual-keep-'+j,'错误实现保留 ['+j+']',x>0,`${n(x)} > 0 → ${x>0}`,{x})));
      c.push(cell('actual','错误实现计数',v.actual,`${v.readings.map(x=>x>0?'1':'0').join(' + ')} = ${n(v.actual)}`,{readings:v.readings}));
      c.push(cell('difference','预期减实际',v.difference,`${n(v.expected)} − ${n(v.actual)} = ${n(v.difference)}`,{expected:v.expected,actual:v.actual}));
    }
    if(has(v,'report')){
      c.push(cell('environment','报告环境信息',v.report.environment,`${q(p.report)} !== "no-environment" → ${v.report.environment}`,{report:p.report}));
      c.push(cell('steps','报告复现步骤',v.report.steps,`${q(p.report)} !== "no-steps" → ${v.report.steps}`,{report:p.report}));
    }
    if(has(v,'reproducible'))c.push(cell('reproducible','本例可复查材料',v.reproducible,`${v.report.environment} && ${v.report.steps} && (${n(v.expected)} !== ${n(v.actual)}) → ${v.reproducible}`,{report:v.report}));
    if(has(v,'focused')){
      c.push(cell('focused','修改是否围绕同一原因',v.focused,`${q(p.scope)} === "focused" → ${v.focused}`,{scope:p.scope,changedFiles:v.changedFiles}));
      c.push(...rows(v.changedFiles,'changed-file','本次修改文件',(x,j)=>`changedFiles[${j}] = ${q(x)}；${x==='layout.css'||x==='navigation.js'?'与计数边界无关':'与计数/回归相关'}`));
    }
    if(has(v,'whyRecorded'))c.push(cell('why','是否记录原因',v.whyRecorded,`${q(p.rationale)} === "why" → ${v.whyRecorded}；${q(v.rationale)}`,{rationale:p.rationale,text:v.rationale}));
    if(has(v,'actionable'))c.push(cell('actionable','反馈是否可执行',v.actionable,`${q(p.feedback)} === "actionable" → ${v.actionable}；${q(v.feedback)}`,{feedback:p.feedback,text:v.feedback}));
    if(has(v,'checks')){
      for(const [key,ok] of Object.entries(v.checks))c.push(cell('missing-'+key,'待补条件 '+key,!ok,`checks.${key}=${ok} → 需补充=${!ok}`,{condition:key,ok}));
      c.push(cell('missing-count','缺项数',v.missing.length,`${q(v.missing)}.length = ${n(v.missing.length)}`,{missing:v.missing}));
    }
    if(has(v,'ready')){
      c.push(cell('ready','本例移交材料齐备',v.ready,`missing.length=${n(v.missing.length)} === 0 → ${v.ready}`,{missing:v.missing},'没有创建Issue、PR或取得接受。'));
      c.push(cell('external-messages','外部消息数',v.externalMessages,`externalMessages = ${n(v.externalMessages)}`,{externalMessages:v.externalMessages},'只计算当前页面材料；不发送消息。'));
    }return c;
  },[
    exp('report-steps','只补齐复现步骤','已经有环境和差异时，预测可复查条件与缺项。',{report:'no-steps'},{report:'complete'},'reproducible false→true，缺项reproducible消失；实际差异仍为1。',(a,b)=>changed(a,b,'report')&&!a.result.reproducible&&b.result.reproducible&&eq(a.result.missing,['reproducible'])&&b.result.ready&&a.result.expected===2&&b.result.expected===2&&a.result.actual===1&&b.result.actual===1),
    exp('scope','只拆出无关界面重构','计数差异是否保持？修改目的条件是否改变？',{scope:'mixed'},{scope:'focused'},'同一差异2对1；focused false→true，材料条件齐备。',(a,b)=>changed(a,b,'scope')&&!a.result.focused&&b.result.focused&&eq(a.result.missing,['focused'])&&b.result.ready&&a.result.actual===b.result.actual&&a.result.externalMessages===0&&b.result.externalMessages===0),
    exp('feedback','只把模糊评价改成可执行反馈','不改代码和测试，能改变哪一个移交条件？',{feedback:'vague'},{feedback:'actionable'},'只补齐actionable；模型ready false→true，外部消息仍为0。',(a,b)=>changed(a,b,'feedback')&&!a.result.actionable&&b.result.actionable&&eq(a.result.missing,['actionable'])&&b.result.ready&&eq(a.result.readings,b.result.readings)&&a.result.externalMessages===0&&b.result.externalMessages===0)
  ]);

  return {courseId:'tools',models};
});
