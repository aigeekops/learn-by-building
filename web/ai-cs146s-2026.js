/* Original CS146S Fall 2026 experiments. All tool actions stay in memory. */
(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory();else factory()(root.AICourseModels);})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
  const select=(id,label,options,value)=>({id,label,type:'select',options,value});
  const flow=(title,nodes)=>({kind:'flow',title,nodes:nodes.map(([label,detail,active])=>({label,detail,active:!!active}))});
  const bars=(title,rows,unit='',max=null)=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit,max});
  function trace(model,p,code){const steps=[];return {add(line,title,detail,variables,visual){steps.push(JSON.parse(JSON.stringify({line,title,detail,variables,visual})));},end(result){return {model,params:p,code:code.split('\n'),steps,result};}};}
  return function register(M){
    M.register('cs146s-harness',[
      range('tools','可用工具数',1,6,1,4),select('lazy','工具描述加载',[['yes','只加载所选工具详细定义'],['no','预先加载全部详细定义']],'yes'),select('compact','历史记录',[['yes','使用给定的结构化摘要'],['no','保留本例完整历史']],'yes'),range('budget','输入预算（人工教学值）',48,128,8,64,'token')
    ],p=>{
      const r=trace('cs146s-harness',p,`const fixed = {system:12, repository:10};
const names = tools;
const definitions = lazy === 'yes' ? 8 : tools*8;
const history = compact === 'yes' ? 12 : 36;
const used = fixed.system + fixed.repository + names + definitions + history;
const status = used <= budget ? 'fits' : 'needs_reorganization';`);
      const fixed={system:12,repository:10};
      r.add(1,'先识别模型之外的壳','系统说明、仓库说明、工具与历史共同组成模型每次看到的输入。数字仅为人工教学费用，不是实际分词结果。',{fixed},flow('最小循环与外围输入',[['系统说明','运行规则',true],['仓库说明','如何构建和测试',true],['模型','选择动作',false],['工具','返回观察',false]]));
      const names=p.tools;r.add(2,'保留工具发现入口','轻量元信息让模型知道工具存在；完整定义是否懒加载取决于具体 harness，不是所有 MCP 客户端的默认行为。',{toolNames:names},bars('工具名字的教学费用',[['工具名字',names]],'token'));
      const definitions=p.lazy==='yes'?8:p.tools*8;r.add(3,'按需加入完整签名','每份完整工具定义设为 8 token。描述、字段和错误约定本身也占上下文；懒加载应确保调用前获得完整契约。',{definitions,lazy:p.lazy},bars('详细定义费用',[['本次载入',definitions],['全部预载',p.tools*8]],'token'));
      const history=p.compact==='yes'?12:36;r.add(4,'把历史整理成可恢复摘要','摘要在本例预先给定：保留目标、已选方案和停止条件。没有调用模型压缩，也不声称真实摘要无损。',{history,retained:['goal','accepted_plan','stop_condition']},flow('摘要保留的信息',[['目标','修复舍入',true],['已选方案','整数分币与半分向上',true],['下一步','运行边界测试',true]]));
      const used=22+names+definitions+history;r.add(5,'按组成核算输入','超预算时不偷偷删掉任务约束；应重新组织历史或工具细节，并能解释删减了什么。',{fixed,names,definitions,history,used,budget:p.budget},bars('本次输入组成',[['固定规则',22],['工具名字',names],['工具详细定义',definitions],['历史/摘要',history]],'token'));
      const status=used<=p.budget?'fits':'needs_reorganization';r.add(6,'检查容量与恢复条件','容量足够只是必要条件。工具可发现、执行可观察、历史可恢复仍需分别验证。',{used,status,remaining:p.budget-used},flow('容量检查',[['已用',`${used} token`,used<=p.budget],['预算',`${p.budget} token`,false],['结论',status,status==='fits']]));
      return r.end({used,definitions,history,status});
    });

    M.register('cs146s-reppit',[
      select('proposal','研究后选择的实现',[['round','整数分币 + 四舍五入'],['floor','直接向下取整']],'round'),select('edge','测试范围',[['yes','包括半分边界'],['no','仅整数折扣']],'yes')
    ],p=>{
      const r=trace('cs146s-reppit',p,`const research = {unit:'cents', rounding:'half_up', percentRange:[0,100]};
const proposals = ['floor','round'];
const plan = ['implement','run_existing_tests','add_boundary_test'];
const price = proposal === 'round' ? Math.round : Math.floor;
const cases = edge === 'yes' ? [[1000,20,800],[1,50,1]] : [[1000,20,800]];
const results = cases.map(([c,d,want])=>({actual:price(c*(100-d)/100),want}));
const passed = results.every(x=>x.actual===x.want);`);
      const research={unit:'cents',rounding:'half_up',percentRange:[0,100]};r.add(1,'Research：先查清契约','虚构项目明确使用整数分币，非负价格，折扣范围 0–100，半分向上。先观察接口和已有测试，再写实现。',{research},flow('研究产物',[['接口','金额单位：分',true],['规则','半分向上',true],['已有测试','1000 分打八折',false]]));
      const proposals=['floor','round'];r.add(2,'Propose：比较不同方案','向下取整简单但不满足半分规则；四舍五入符合本案例约定。选择是学习者操作，预设算法不替代工程判断。',{proposals,selected:p.proposal},flow('两种候选方案',[['floor','会把半分抹掉',p.proposal==='floor'],['round','符合非负金额半分向上',p.proposal==='round']]));
      const plan=['implement','run_existing_tests','add_boundary_test'];r.add(3,'Plan：把方案变成可检查步骤','计划写出改哪里、跑什么以及边界用例；尚未执行的计划不算完成证据。',{plan},flow('执行顺序',plan.map(x=>[x,'待执行',false])));
      const price=p.proposal==='round'?Math.round:Math.floor;r.add(4,'Implement：实现选定计算','只选择本地预先定义的算术函数；页面不执行用户输入代码，也不修改真实仓库。',{selected:p.proposal,example:price(1000*(100-20)/100)},bars('普通整数用例',[['实际值',price(1000*.8)],['预期值',800]],'分'));
      const cases=p.edge==='yes'?[[1000,20,800],[1,50,1]]:[[1000,20,800]];r.add(5,'Test：确定本次检查覆盖什么','只跑旧的整数用例，两种实现都会通过。边界用例才揭露 floor 违反约定的情况。',{cases},flow('测试输入',cases.map(([c,d,w])=>[`${c} 分，减 ${d}%`,`预期 ${w} 分`,false])));
      const results=cases.map(([c,d,want])=>({actual:price(c*(100-d)/100),want}));r.add(6,'运行真实算术检查','预期值在用例中独立给定；不能把待测函数自己的结果当标准答案。',{results},flow('测试结果',results.map((x,i)=>[`用例 ${i+1}`,`实际 ${x.actual} / 预期 ${x.want}`,x.actual===x.want])));
      const passed=results.every(x=>x.actual===x.want);r.add(7,'记录结论与未覆盖条件','通过当前测试只对应这些输入；仍需验证百分比边界、输入类型及浮点/大整数的工程取舍。',{passed,covered:cases.length,selected:p.proposal},flow('本次验证结论',[[passed?'当前用例通过':'需要修正',`${cases.length} 个用例`,passed]]));
      return r.end({research,plan,results,passed});
    });

    M.register('cs146s-skills',[
      select('request','当前请求',[['verify','验证数值转换'],['browse','读取网页标题'],['none','讨论周末安排']],'verify'),select('implementation','转换实现',[['double','每项乘 2'],['identity','原样返回（缺陷）']],'double'),select('verify','是否执行验证步骤',[['yes','执行检查'],['no','跳过检查']],'yes')
    ],p=>{
      const r=trace('cs146s-skills',p,`const catalog = ['verify-transform','read-page','format-code'];
const selected = request === 'verify' ? catalog[0] : request === 'browse' ? catalog[1] : null;
const loaded = selected ? {metadata:12,body:18,references:12} : {metadata:12};
const transformed = input.map(x => implementation === 'double' ? x*2 : x);
const checks = transformed.map((x,i)=>x === expected[i]);
const verified = selected === 'verify-transform' && verify === 'yes' ? checks.every(Boolean) : null;`);
      const catalog=['verify-transform','read-page','format-code'];r.add(1,'先加载可发现的元信息','每个技能先暴露名字与适用描述；这里三个技能的元信息总费用人工设为 12 token。',{catalog},flow('技能目录',catalog.map(x=>[x,'名字与触发范围',false])));
      const selected=p.request==='verify'?catalog[0]:p.request==='browse'?catalog[1]:null;r.add(2,'判断请求是否落在范围内','使用显式、确定性的教学路由，不模拟模型意图识别。无关请求不加载任何技能正文。',{request:p.request,selected},flow('触发检查',[[p.request,selected||'未触发',!!selected]]));
      const loaded=selected?{metadata:12,body:18,references:12}:{metadata:12};r.add(3,'按需展开流程与参考','正文规定做事顺序，参考文件只为当前任务加载。一个技能应围绕一个清晰任务，而不是把所有知识写进常驻提示。',{loaded,total:Object.values(loaded).reduce((a,b)=>a+b,0)},bars('本次加载的教学费用',Object.entries(loaded),'token'));
      const input=[1,2,3],expected=[2,4,6],transformed=input.map(x=>p.implementation==='double'?x*2:x);r.add(4,'执行技能里的具体工作','本地转换函数会实际计算。网页请求在本案例仅演示技能选择，未抓取网页；转换任务才执行以下数值流程。',{executed:selected==='verify-transform',input,transformed:selected==='verify-transform'?transformed:[]},bars('转换结果（只在验证任务中生效）',(selected==='verify-transform'?transformed:[]).map((x,i)=>[`项 ${i+1}`,x])));
      const checks=transformed.map((x,i)=>x===expected[i]);const verified=selected==='verify-transform'&&p.verify==='yes'?checks.every(Boolean):null;r.add(5,'运行流程中定义的验证','检查不是可有可无的装饰：原样返回会与独立预期 [2,4,6] 不一致。跳过检查时结论保留未知。',{expected,checks:verified===null?[]:checks,verified},flow('验证结果',[[verified===null?'未验证':verified?'用例通过':'检查失败',verified===null?'不生成成功结论':checks.map(x=>x?'通过':'失败').join(' / '),verified===true]]));
      r.add(6,'留下可复用的过程','技能把反复纠正的步骤整理成可发现、可执行、可验证的流程。一次示例通过不证明其他请求都能正确路由。',{selected,verified,totalTokens:Object.values(loaded).reduce((a,b)=>a+b,0)},flow('流程边界',[['描述','何时用',false],['正文','怎样做',false],['检查','如何核对',true]]));
      return r.end({selected,loaded,totalTokens:Object.values(loaded).reduce((a,b)=>a+b,0),transformed:selected==='verify-transform'?transformed:[],verified});
    });

    M.register('cs146s-config',[
      select('area','当前修改目录',[['api','src/api'],['ui','src/ui']],'api'),select('code','生成片段',[['valid','格式正确，逻辑正确'],['lint','缺少本例要求的分号'],['logic','格式正确，逻辑错误']],'valid'),select('hook','检查配置',[['all','运行格式和测试 Hook'],['lint','只运行格式 Hook']],'all')
    ],p=>{
      const r=trace('cs146s-config',p,`const root = {test:'node --test',style:'semicolon'};
const local = area === 'api' ? {scope:'API'} : {scope:'UI'};
const source = code === 'lint' ? 'return a + b' : code === 'logic' ? 'return a - b;' : 'return a + b;';
const lintPassed = source.endsWith(';');
const testPassed = code !== 'logic';
const outcome = !lintPassed ? 'lint_failed' : hook === 'all' && !testPassed ? 'tests_failed' : hook !== 'all' ? 'tests_unknown' : 'checks_passed';`);
      const root={test:'node --test',style:'semicolon'},local={scope:p.area==='api'?'API':'UI'};r.add(1,'把仓库约定变成可查信息','README 面向项目使用者；AGENTS.md 可明确项目地图、构建测试与局部约定。少写易过时的大段代码。',{root},flow('根目录说明',[['项目地图','src / tests / docs',true],['检查入口',root.test,true],['约定',root.style,true]]));
      r.add(2,'读取当前目录对应的局部说明','本例明确采用根目录通用约定加子目录补充；不同产品的配置优先级要查各自文档，不能把这张图当统一协议。',{root,local},flow('按路径定位说明',[['根 AGENTS.md','全项目共用',false],[`src/${p.area}/AGENTS.md`,local.scope,true]]));
      const source=p.code==='lint'?'return a + b':p.code==='logic'?'return a - b;':'return a + b;';r.add(3,'把流程要求绑定到事件','Hook 是在预定事件点运行的确定性程序。提示里说“记得测试”不等于测试已经被强制执行。',{event:'PostToolUse:edit',source},flow('修改后的检查事件',[['编辑完成',source,true],['格式 Hook','下一步运行',false],['测试 Hook','视配置执行',false]]));
      const lintPassed=source.endsWith(';');r.add(4,'先运行具体格式检查','本例格式规则仅为行尾分号，用来说明事件与退出状态；不是通用 JavaScript linter。',{lintPassed},flow('格式结果',[[lintPassed?'通过':'失败','行尾分号检查',lintPassed]]));
      const fn=p.code==='logic'?(a,b)=>a-b:(a,b)=>a+b,testActual=fn(1,2),testPassed=testActual===3;r.add(5,'分别核对逻辑与格式','测试实际运行本地加法/减法函数。只开启格式 Hook 时，不把逻辑测试结果记作已执行。',{executed:p.hook==='all'&&lintPassed,testActual:p.hook==='all'&&lintPassed?testActual:null,expected:3,testPassed:p.hook==='all'&&lintPassed?testPassed:null},flow('逻辑检查',[[p.hook==='all'&&lintPassed?(testPassed?'通过':'失败'):'未运行','1 与 2 的期望和为 3',p.hook==='all'&&lintPassed&&testPassed]]));
      const outcome=!lintPassed?'lint_failed':p.hook==='all'&&!testPassed?'tests_failed':p.hook!=='all'?'tests_unknown':'checks_passed';r.add(6,'记录独立的检查状态','配置文件、技能、Hook 与子代理有不同职责；自动检查通过仍需评审变更范围与未覆盖条件。',{outcome,scope:local.scope},flow('本次检查结论',[[outcome,'仅对应此内存片段',outcome==='checks_passed']]));
      return r.end({root,local,source,lintPassed,testPassed:p.hook==='all'&&lintPassed?testPassed:null,outcome});
    });

    M.register('cs146s-readiness',[
      select('setup','环境可复现',[['yes','锁定依赖与示例配置齐全'],['no','依赖靠口头说明']],'yes'),select('tests','可执行验证',[['yes','有明确测试命令'],['no','只能手动试一试']],'yes'),select('docs','仓库说明',[['yes','文档与代码一致'],['no','文档已过时']],'no'),select('isolation','并行任务资源',[['yes','独立端口与数据库'],['no','共享测试端口与数据库']],'yes')
    ],p=>{
      const r=trace('cs146s-readiness',p,`const setupOK = setup === 'yes';
const docsOK = docs === 'yes';
const testsOK = tests === 'yes';
const isolationOK = isolation === 'yes';
const blockers = checks.filter(x=>!x.ok).map(x=>x.name);
const status = blockers.length ? 'blocked' : 'ready_for_this_task';`);
      const checks=[];const add=(name,ok)=>checks.push({name,ok});
      const setupOK=p.setup==='yes';add('可复现环境',setupOK);r.add(1,'验证能否从空环境启动','依赖锁定、配置样例与可执行的安装命令让新人和 Agent 都能复现环境。这里读取给定案例事实，不真实安装依赖。',{setupOK},flow('环境检查',[['环境',setupOK?'材料齐全':'缺少可复现说明',setupOK]]));
      const docsOK=p.docs==='yes';add('当前文档',docsOK);r.add(2,'核对文档是否仍然适用','旧命令比缺少文档更容易误导。记录具体失败命令与拥有者，不把“有 README”直接算成可用。',{docsOK},flow('文档检查',[['文档',docsOK?'与当前接口一致':'旧路径已失效',docsOK]]));
      const testsOK=p.tests==='yes';add('可执行测试',testsOK);r.add(3,'让结果可以被检查','测试和类型检查提供客观反馈；只有“看起来不错”无法支持长任务可靠迭代。给定测试命令也仍要实际运行。',{testsOK},flow('验证入口',[['测试',testsOK?'有已知命令与案例':'未建立可执行检查',testsOK]]));
      const isolationOK=p.isolation==='yes';add('共享资源隔离',isolationOK);r.add(4,'分别检查 worktree 和运行资源','Git worktree 分离文件版本，但不会自动隔离端口、数据库和外部服务；同端口并行服务仍会冲突。',{isolationOK,worktreesSeparated:true},flow('两个任务的资源',[['任务 A',isolationOK?'端口 8101 / db_a':'端口 8100 / shared_db',true],['任务 B',isolationOK?'端口 8102 / db_b':'端口 8100 / shared_db',isolationOK]]));
      const blockers=checks.filter(x=>!x.ok).map(x=>x.name);r.add(5,'把缺口变成具体修复任务','不输出未经校准的“自治分数”。先修会阻塞当前任务的缺口，再重新检查原失败条件。',{checks,blockers},flow('本案例检查清单',checks.map(x=>[x.name,x.ok?'有可用证据':'缺少可用证据',x.ok])));
      const status=blockers.length?'blocked':'ready_for_this_task';r.add(6,'只对已检查任务给出结论','四项均具备只说明本案例的前置条件齐全，不保证代码质量、覆盖率或长期自治成功。',{status,blockerCount:blockers.length},flow('本案例准备状态',[[status,blockers.join('、')||'可开始受限任务并运行验证',blockers.length===0]]));
      return r.end({checks,blockers,status});
    });

    M.register('cs146s-durable',[
      select('workflow','恢复策略',[['durable','从已记录步骤继续'],['queue','整项任务从头重跑']],'durable'),select('crash','中断位置',[['none','不中断'],['read','读完但尚未保存进度'],['write','写入后但尚未保存进度']],'write'),select('idempotent','写工具是否使用回执',[['yes','相同请求复用回执'],['no','每次调用都再次写入']],'yes')
    ],p=>{
      const r=trace('cs146s-durable',p,`const uniqueEvents = [...new Set(['event-a','event-a','event-b'])];
let checkpoint=0, writes=0, writeAttempts=0; const receipts=new Set();
function store(){writeAttempts++; if(idempotent==='yes' && receipts.has('event-a:store')) return; writes++; receipts.add('event-a:store');}
runUntilCrash(); // 每完成一步保存 checkpoint，中断可发生在工具效果之后
const resumeAt = workflow === 'durable' ? checkpoint : 0;
runRemaining(resumeAt);
const result = {checkpoint,writes,writeAttempts};`);
      const uniqueEvents=[...new Set(['event-a','event-a','event-b'])];r.add(1,'事件先去重、再排队','只演示路由发现两个不同事件；下面执行的是 event-a 的一个工作流，event-b 保持在队列中。每个会话按序处理。',{incoming:3,uniqueEvents},flow('入口事件',[['event-a','接收',true],['event-a 重试','去重',false],['event-b','排队等待',false]]));
      let checkpoint=0,writes=0,writeAttempts=0;const receipts=new Set(),counts={read:0,transform:0,store:0,notify:0},steps=['read','transform','store','notify'];r.add(2,'服务端保留进度与操作键','进度检查点和业务幂等回执是不同记录。浏览器或虚拟机可以休眠，恢复所需的状态必须持久化；此处用内存对象代替数据库。',{checkpoint,operationKey:'event-a:store'},flow('持久工作流的两类状态',[['进度','下一未完成步骤',true],['回执','已完成业务效果',true]]));
      function execute(i){counts[steps[i]]++;if(i===2){writeAttempts++;if(p.idempotent!=='yes'||!receipts.has('event-a:store')){writes++;receipts.add('event-a:store');}}}
      const crashIndex=p.crash==='read'?0:p.crash==='write'?2:-1;let crashed=false;
      for(let i=0;i<steps.length;i++){execute(i);if(i===crashIndex){crashed=true;break;}checkpoint=i+1;}
      r.add(4,crashed?'工具效果之后发生中断':'本轮顺利结束','刻意在工具已经执行、检查点尚未更新的缝隙中断。仅保存进度不能自动带来 exactly-once 业务效果。',{checkpoint,writes,writeAttempts,counts,crashed},flow('中断前的步骤',steps.map((name,i)=>[name,counts[name]?'工具已执行': '未执行',i<checkpoint])));
      const resumeAt=p.workflow==='durable'?checkpoint:0;r.add(5,'选择恢复位置','持久工作流从检查点重做未确认步骤；普通任务队列重跑整项任务。两者都可能重复一个已产生效果的工具调用。',{resumeAt,checkpoint,strategy:p.workflow},flow('恢复入口',steps.map((name,i)=>[name,i===resumeAt?'从这里继续':i<resumeAt?'已有检查点':'后续步骤',i===resumeAt])));
      if(crashed)for(let i=resumeAt;i<steps.length;i++){execute(i);checkpoint=i+1;}
      r.add(6,'重放未确认步骤','同一操作键复用回执时，store 可以被调用两次却只产生一次写入；关闭回执可观察重复业务效果。',{checkpoint,writes,writeAttempts,counts},bars('调用次数与业务效果',[['读工具调用',counts.read],['store 调用',writeAttempts],['实际写入',writes],['通知调用',counts.notify]],'次'));
      r.add(7,'核对恢复后的状态','生产系统还需要事务、幂等键冲突检测、租约与重试策略。这个案例不声称实现完整消息系统或无限期代理。',{checkpoint,writes,writeAttempts,uniqueEvents,queuedEvent:'event-b'},flow('本次恢复结果',[['event-a','4 步完成',checkpoint===4],['实际写入',`${writes} 次`,writes===1],['event-b','仍在队列',false]]));
      return r.end({checkpoint,writes,writeAttempts,counts,uniqueEvents,crashed});
    });

    M.register('cs146s-verification',[
      range('p','单次尝试正确率（假设）',0.5,0.99,0.01,0.9),range('steps','任务步骤数',1,20,1,20),range('attempts','每步最多尝试（含第一次）',1,5,1,3),select('independent','重复尝试的关系',[['yes','假设独立且检查完美'],['no','错误完全相关，重试不改善']],'yes'),range('seconds','每次检查等待',5,600,5,5,'秒')
    ],p=>{
      const r=trace('cs146s-verification',p,`const finalOnly = Math.pow(p,steps);
const perStep = independent === 'yes' ? 1-Math.pow(1-p,attempts) : p;
const checked = Math.pow(perStep,steps);
const maxChecks = steps*attempts;
const checksPerHour = Math.floor(3600/seconds);
const assumption = 'independent attempts, independent steps, perfect checker';`);
      const finalOnly=Math.pow(p.p,p.steps);r.add(1,'先写清单次成功假设','这是课件概率示例的复算，不是实测 Agent 正确率。假设各步骤互相独立，全部正确才算整项成功。',{singleAttempt:p.p,steps:p.steps,finalOnly},bars('只在最后检查的全对概率',[['pⁿ',finalOnly]],'比例',1));
      const perStep=p.independent==='yes'?1-Math.pow(1-p.p,p.attempts):p.p;r.add(2,'在每一步检查并有限重试','k 包括第一次尝试。独立且完美检查时，一步最多 k 次都失败的概率为 (1−p)^k；完全相关错误则重试没有这项收益。',{attempts:p.attempts,independent:p.independent,perStep},bars('每步最多 k 次后的正确概率',[['单次',p.p],['检查后',perStep]],'比例',1));
      const checked=Math.pow(perStep,p.steps);r.add(3,'再组合整项任务','课件的 20 步、p=.9、k=3 得到约 .9802。现实中的相关错误和不完美测试会削弱这个提升。',{checked,finalOnly},bars('两种假设下的整项全对概率',[['末尾检查',finalOnly],['逐步检查+重试',checked]],'比例',1));
      const maxChecks=p.steps*p.attempts;r.add(4,'同时核算最多检查次数','可靠性与检查成本一起考虑。最大次数是 n×k，实际使用量通常更小；这里未计算复杂的停止时间分布。',{maxChecks},bars('最多检查次数',[['只查末尾',1],['每步最多 k 次',maxChecks]],'次'));
      const checksPerHour=Math.floor(3600/p.seconds);r.add(5,'快检查提供更密的反馈','仅计检查等待的理论上限，忽略生成和执行时间。5 秒一次是 720 次/小时，600 秒一次是 6 次/小时，不能直接当开发效率。',{seconds:p.seconds,checksPerHour,ignores:['model_generation','tool_runtime','human_review']},bars('只计等待的检查上限',[['当前',checksPerHour]],'次/小时'));
      r.add(6,'把演示假设与工程证据分开','应验证检查器会不会漏检、任务错误是否相关、反馈能否指导修复。演示中的概率不是“可验证就一定能解决”的保证。',{finalOnly,perStep,checked,maxChecks,checksPerHour,assumption:p.independent==='yes'?'independent + perfect checker':'perfectly correlated retries'},flow('要单独验证的条件',[['检查器','是否能区分对错',true],['反馈粒度','是否定位失败步骤',true],['重试','是否产生不同候选',p.independent==='yes']]));
      return r.end({finalOnly,perStep,checked,maxChecks,checksPerHour});
    });

    M.register('cs146s-review',[
      select('patch','候选补丁',[['floor','向下取整'],['round','半分向上'],['bug','误把折扣当售价比例']],'floor'),select('suite','可用验证',[['smoke','只跑整数价格'],['edge','加上边界与全折扣']],'edge'),select('spec','评审是否取得规格',[['yes','取得分币与舍入约定'],['no','只有 diff，缺少业务规格']],'yes')
    ],p=>{
      const r=trace('cs146s-review',p,`const contract = spec === 'yes' ? {rounding:'half_up',unit:'cents'} : null;
const cases = suite === 'edge' ? [[1000,20,800],[1,50,1],[999,0,999],[999,100,0]] : [[1000,20,800]];
const price = (c,d)=>patch==='floor'?Math.floor(c*(100-d)/100):patch==='bug'?Math.round(c*d/100):Math.round(c*(100-d)/100);
const results = cases.map(([c,d,want])=>({c,d,want,actual:price(c,d)}));
const failed = results.filter(x=>x.actual!==x.want);
const findings = contract ? deduplicateByRootCause(failed) : [];
const verdict = !contract ? 'needs_spec' : findings.length ? 'request_changes' : 'eligible_for_human_review';`);
      const contract=p.spec==='yes'?{rounding:'half_up',unit:'cents'}:null;r.add(1,'为评审补足规格与调用上下文','只读 diff 不一定知道预期。给定的规格明确非负整数分币和半分向上；缺少规格时不能把自己的猜测写成已验证缺陷。',{contract,patch:p.patch},flow('评审输入',[['补丁',p.patch,true],['规格',contract?'已取得':'缺失',!!contract],['调用方','整数分币接口',true]]));
      const cases=p.suite==='edge'?[[1000,20,800],[1,50,1],[999,0,999],[999,100,0]]:[[1000,20,800]];r.add(2,'按风险选择具体检查','本例是业务数值逻辑变更，选择正常、半分、零折扣和全折扣。没有把未执行的安全/性能检查写成通过。',{cases,reviewScope:'pricing correctness'},flow('验证矩阵',cases.map(([c,d,w])=>[`${c} 分 / ${d}%`,`期望 ${w}`,false])));
      const price=(c,d)=>p.patch==='floor'?Math.floor(c*(100-d)/100):p.patch==='bug'?Math.round(c*d/100):Math.round(c*(100-d)/100);r.add(3,'复现候选路径','选择预先定义的本地函数，真实执行算术；不是让多个真实模型评审，也不自动改代码。',{patch:p.patch,normalCase:price(1000,20)},bars('普通用例',[['实际',price(1000,20)],['预期',800]],'分'));
      const results=cases.map(([c,d,want])=>({c,d,want,actual:price(c,d)}));r.add(4,'用独立预期验证发现','预期结果来自显式用例，不由待测函数生成。只跑普通整数案例可能漏掉舍入缺陷。',{results},flow('测试复现',results.map((x,i)=>[`用例 ${i+1}`,`实际 ${x.actual} / 预期 ${x.want}`,x.actual===x.want])));
      const failed=results.filter(x=>x.actual!==x.want),findings=contract&&failed.length?[{rootCause:p.patch==='bug'?'discount_formula':'rounding_rule',evidence:failed}]:[];r.add(6,'聚合并去掉同根重复报告','同一个公式错误触发多个用例时，把证据合并到一项根因中。没取得规格时保留待核实，不凭测试表冒充业务授权。',{rawFailures:failed.length,findings},bars('失败用例与去重发现',[['失败用例',failed.length],['已核实根因',findings.length]],'项'));
      const verdict=!contract?'needs_spec':findings.length?'request_changes':'eligible_for_human_review';r.add(7,'输出能复算的评审结论','可复现发现给出输入、实际值、预期值和原理。当前用例通过只进入人工评审，不代表全场景正确或自动合并。',{verdict,findings,uncovered:['invalid input types','negative prices','large integer precision']},flow('本次评审结论',[[verdict,findings.length?`${findings.length} 项有证据根因`:'保留范围与未覆盖条件',verdict==='eligible_for_human_review']]));
      return r.end({contract,results,failed,findings,verdict});
    });
  };
});
