/* CS146S: inspect actual arithmetic and in-memory event snapshots, never claim model execution. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const n=x=>typeof x==='number'?Number(x.toFixed(4)):String(x);
  const has=(v,k)=>Object.hasOwn(v,k);
  const cell=(id,label,value,formula,inputs={},note='')=>({id,label,value,formula,inputs,note});
  const exp=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const near=(a,b)=>Math.abs(a-b)<1e-10;
  function frame(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0));return {i,f:t.steps[i],v:Object.assign({},...t.steps.slice(0,i+1).map(s=>s.variables))};}
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const s=frame(t,index);return {title:s.f.title,summary:'逐格核对本步的输入、判断和结果；下列格子来自当前及此前实际计算快照。'+s.f.detail,cells:inspect(t,s)};},experiments};}
  const models={};

  models.agent=model('把预设策略选工具、工具真实算术、接收观察和停止条件分开；播放快照不会再次调用工具。',(t,{v})=>{
    const p=t.params,calls=v.calls||0,c=[cell('budget','剩余调用预算',p.budget-calls,`${p.budget} − ${calls} = ${p.budget-calls}`,{budget:p.budget,calls},'调用预算不是成功次数；不包含真实模型调用。')];
    const observation=v.observation||v.latest?.observation;
    if(observation?.results)observation.results.forEach((r,i)=>c.push(cell('case-'+i,`最近执行的测试 ${i+1}`,r.actual,`${r.a} ${v.implementation==='add'?'+':v.implementation==='multiply'?'×':'−'} ${r.b} = ${r.actual}；独立预期 ${r.expected} → ${r.actual===r.expected?'通过':'失败'}`,{a:r.a,b:r.b,expected:r.expected,actual:r.actual},'本格是已返回的内存测试结果，不是未来执行计划。')));
    if(observation?.implementation)c.push(cell('implementation','当前内存实现',observation.implementation,`${v.tool||v.latest?.tool} → ${observation.implementation}`,{tool:v.tool||v.latest?.tool},'预定义函数的切换，没有修改真实文件。'));
    if(observation?.error)c.push(cell('tool-error','工具错误',observation.error,'补丁被拒绝 → 记录 tool_error；不能当作测试失败后继续成功',observation,'错误路径保留独立停止原因。'));
    if(has(v,'passed'))c.push(cell('passed','最近一次测试是否全通过',v.passed,`所有已执行用例 actual === expected → ${v.passed}`,{calls,passed:v.passed},'当前案例通过不证明所有输入正确。'));
    if(v.stop)c.push(cell('stop','本次停止原因',v.stop,`通过测试 ? tests_passed : 工具错误 ? tool_error : budget_exhausted → ${v.stop}`,{stop:v.stop,calls},'停止与成功是两个不同状态。'));
    return c;
  },[
    exp('one-more-call','只增加一次调用预算','预算从5增到6时，修正后的函数是否有机会接受最后一次测试？',{scenario:'retry',budget:5},{scenario:'retry',budget:6},'5次预算停在未验证状态；第6次测试返回全通过。',(a,b)=>a.result.stop==='budget_exhausted'&&!a.result.passed&&b.result.stop==='tests_passed'&&b.result.calls===6),
    exp('tool-error','只改变补丁返回路径','补丁被拒绝时，停止原因是否仍会被写成测试通过？',{scenario:'success',budget:7},{scenario:'error',budget:7},'错误路径在第3次工具调用停止，且 passed 保持 false。',(a,b)=>a.result.passed&&b.result.stop==='tool_error'&&b.result.calls===3&&!b.result.passed)
  ]);

  models['cs146s-harness']=model('固定规则、工具名字、详细签名和历史分别占预算；逐项加起来才能判断是否装得下。',(t,{v})=>{
    const p=t.params,c=[cell('fixed','固定规则费用',22,'系统 12 + 仓库 10 = 22',{system:12,repository:10},'人工教学 token 费用，非真实分词计数。')];
    if(has(v,'toolNames'))c.push(cell('names','工具名字费用',v.toolNames,`${p.tools} 个工具 × 每名字 1 = ${v.toolNames}`,{tools:p.tools}));
    if(has(v,'definitions'))c.push(cell('definitions','本次工具详细定义',v.definitions,p.lazy==='yes'?`只加载一个签名：1 × 8 = ${v.definitions}`:`全部预载：${p.tools} × 8 = ${v.definitions}`,{tools:p.tools,lazy:p.lazy},'懒加载调用前仍需取得完整工具契约。'));
    if(has(v,'history'))c.push(cell('history','历史费用',v.history,`预设${p.compact==='yes'?'摘要 12':'完整历史 36'} = ${v.history}`,{compact:p.compact},'没有实际调用模型压缩，也不声称摘要无损。'));
    if(has(v,'used'))c.push(cell('used','合计输入费用',v.used,`22 + ${p.tools} + ${v.definitions} + ${v.history} = ${v.used}`,{fixed:22,names:p.tools,definitions:v.definitions,history:v.history}));
    if(has(v,'remaining'))c.push(cell('remaining','预算余量',v.remaining,`${p.budget} − ${v.used} = ${v.remaining}`,{budget:p.budget,used:v.used},v.remaining<0?'负数表示超预算，不能偷偷丢任务约束。':'装得下只说明容量条件满足。'));
    return c;
  },[
    exp('lazy','只改变工具签名加载方式','预载4份签名会多用多少教学token？',{lazy:'yes'},{lazy:'no'},'签名费用8变32，合计46变70，增加24。',(a,b)=>a.result.definitions===8&&b.result.definitions===32&&b.result.used-a.result.used===24),
    exp('capacity','只增加输入预算','固定输入70 token，预算64与72分别是什么状态？',{lazy:'no',budget:64},{lazy:'no',budget:72},'输入费用不变，容量状态由不足转为 fits。',(a,b)=>a.result.used===70&&b.result.used===70&&a.result.status==='needs_reorganization'&&b.result.status==='fits')
  ]);

  models.context=model('先为输出留位置，再按顺序完整装入片段；剩余空位不代表关键上下文已经足够。',(t,{v,i})=>{
    const p=t.params,capacity=p.budget-p.reserve,c=[cell('input-budget','输入可用预算',capacity,`${p.budget} − ${p.reserve} = ${capacity}`,{total:p.budget,outputReserve:p.reserve},'人工教学费用，非真实 tokenizer 结果。')];
    if(v.mandatory)c.push(cell('mandatory','必须保留的费用',15,'约束 8 + 任务 7 = 15',{constraints:8,task:7},'容量不足时明确拒绝，不删任务或约束。'));
    const events=t.steps.slice(0,i+1).map(s=>s.variables).filter(x=>has(x,'accepted'));
    events.forEach((e,j)=>{const cost=v.ordered?.find(x=>x.name===e.item)?.cost||0,before=e.accepted?e.used-cost:e.used;c.push(cell('candidate-'+j,e.item,e.accepted,`${before} + ${cost} ${before+cost<=capacity?'≤':'>'} ${capacity} → ${e.accepted?'装入':'跳过'}；已用 ${e.used}`,{usedBefore:before,cost,capacity},'每个格子对应已发生的一次装入判断；不把未来片段提前当作已选。'));});
    if(has(v,'remaining'))c.push(cell('remaining','输入预算剩余',v.remaining,`${capacity} − ${v.used} = ${v.remaining}`,{capacity,used:v.used},'空位不能用来证明问题所需信息已齐全。'));
    if(v.status==='insufficient_capacity')c.push(cell('refusal','容量不足判断',true,`必须内容 15 > 输入容量 ${capacity} → 拒绝继续装入`,{required:15,capacity}));
    return c;
  },[
    exp('reserve','只增加输出预留','输出预留增加8后，输入片段是否仍能完整保留？',{budget:56,reserve:16},{budget:56,reserve:24},'输入上限40变32，已用39变29；相关测试被移出。',(a,b)=>a.result.inputBudget===40&&b.result.inputBudget===32&&a.result.used===39&&b.result.used===29&&!b.result.selected.includes('相关测试')),
    exp('mandatory','只增加总预算','必须内容15 token，输入空间8与16会怎样？',{budget:32,reserve:24},{budget:40,reserve:24},'空间8时拒绝装入，空间16时保留任务和约束。',(a,b)=>a.result.status==='insufficient_capacity'&&b.result.status==='packed'&&b.result.selected.includes('约束')&&b.result.selected.includes('任务'))
  ]);

  models['cs146s-reppit']=model('先确定分币与半分向上契约，再用独立边界用例检验选定方案。',(t,{v})=>{
    const p=t.params,c=[cell('rule','本案例舍入规则','非负分币 / half_up','1 分减 50% = 0.5 分；按给定契约应为 1 分',{cents:1,discount:50,expected:1},'这是虚构项目的明确约定，不是所有金融系统通用规则。')];
    if(v.plan)v.plan.forEach((x,i)=>c.push(cell('plan-'+i,`计划步骤 ${i+1}`,x,`${i+1} → ${x}`,{ordinal:i+1},'计划尚未执行时不算完成证据。')));
    if(v.results)v.results.forEach((r,i)=>{const [price,discount,want]=v.cases[i];c.push(cell('case-'+i,`已执行用例 ${i+1}`,r.actual,`${p.proposal==='round'?'round':'floor'}(${price} × (100 − ${discount}) / 100) = ${r.actual}；预期 ${want}`,{price,discount,expected:want,actual:r.actual},r.actual===want?'当前用例通过。':'实际与独立预期不同，应修正方案。'));});
    if(has(v,'passed'))c.push(cell('passed','当前用例集全通过',v.passed,`${v.covered} 个实际值全部等于预期 → ${v.passed}`,{covered:v.covered},'少测边界可让错误方案暂时通过。'));
    return c;
  },[
    exp('boundary','只增加半分边界测试','向下取整通过旧测试，能否说明满足半分规则？',{proposal:'floor',edge:'no'},{proposal:'floor',edge:'yes'},'普通整数用例通过；新增1分减50%的边界用例后失败。',(a,b)=>a.result.passed&&!b.result.passed&&b.result.results[1].actual===0&&b.result.results[1].want===1),
    exp('rounding','只改变实现方案','保持边界测试，改成半分向上会怎样？',{proposal:'floor',edge:'yes'},{proposal:'round',edge:'yes'},'半分结果由0变1，两个既有用例均通过。',(a,b)=>!a.result.passed&&b.result.passed&&b.result.results[1].actual===1)
  ]);

  models.tools=model('工具契约、执行前校验、版本检查和幂等回执分别提供不同保证。',(t,{v})=>{
    const p=t.params,c=[];
    if(p.mode==='read')c.push(cell('limit','读取参数预检',p.limit>=1&&p.limit<=3,`1 ≤ ${p.limit} ≤ 3 → ${p.limit>=1&&p.limit<=3}`,{limit:p.limit,min:1,max:3},'服务器执行前校验；无效参数不触发读写。'));
    else c.push(cell('version','首次调用的版本条件',p.version===1,`当前案例版本 1 === 请求版本 ${p.version} → ${p.version===1}`,{storedVersion:1,expectedVersion:p.version},'重试先查同一操作键的回执，再考虑版本条件。'));
    if(has(v,'valid'))c.push(cell('validation','输入校验状态',v.valid,`校验错误 ${v.error===null?'不存在':'存在'} → valid = ${v.valid}`,{error:v.error}));
    if(v.first?.issues)v.first.issues.forEach((x,i)=>c.push(cell('issue-'+i,`已返回问题 ${i+1}`,x.id,`前 ${p.limit} 项中的第 ${i+1} 项 → ID ${x.id}`,{limit:p.limit,id:x.id},'固定内存案例，不是远端问题列表。')));
    if(v.first?.version)c.push(cell('after-version','首次写入后的版本',v.first.version,`1 + 1 = ${v.first.version}`,{before:1,writes:v.writes},'成功写入一次才推进版本。'));
    if(v.first?.isError)c.push(cell('conflict','首次调用被拒绝',true,`请求版本 ${p.version} ≠ 当前版本 ${v.first.currentVersion} → 不写入`,{expectedVersion:p.version,currentVersion:v.first.currentVersion}));
    if(v.retry)c.push(cell('retry','同一请求重试结果',!!v.retry.replayed,v.retry.replayed?'命中 demo-001 回执 → 重用成功结果，不新增写入':'无成功回执 → 保留版本冲突，不新增写入',{replayed:!!v.retry.replayed,writes:v.writes},'幂等由本案例工具实现，不是 MCP 自动附带的事务功能。'));
    if(has(v,'writes'))c.push(cell('writes','实际写入次数',v.writes,`成功业务效果累计 = ${v.writes}`,{writes:v.writes},'调用次数不能当作写入次数。'));
    return c;
  },[
    exp('schema','只修改读取上限','limit=0 的调用会不会读取第一条记录？',{mode:'read',limit:0},{mode:'read',limit:1},'0被schema拒绝且无写入；1返回一条固定问题。',(a,b)=>a.result.status==='invalid_arguments'&&a.result.writes===0&&b.result.first?.issues?.length===1),
    exp('version','只修改请求版本','首次写入版本正确与冲突时，重试和写入次数如何不同？',{mode:'write',version:1},{mode:'write',version:2},'正确版本产生一次写入、重试复用；错误版本始终零写入。',(a,b)=>a.result.writes===1&&a.result.retry.replayed&&b.result.writes===0&&b.result.status==='version_conflict')
  ]);

  models['cs146s-skills']=model('技能先按显式范围选择，执行真实内存转换，再独立验证；跳过检查必须保留未知。',(t,{v})=>{
    const p=t.params,c=[cell('routing','显式路由选择',p.request==='verify'?'verify-transform':p.request==='browse'?'read-page':null,`request = ${p.request} → ${p.request==='verify'?'转换验证':p.request==='browse'?'网页标题流程':'不触发技能'}`,{request:p.request},'确定性教学路由，不是模型意图识别。网页分支不真实抓取网页。')];
    if(v.loaded)Object.entries(v.loaded).forEach(([k,cost])=>c.push(cell('cost-'+k,k+' 费用',cost,`${k} 费用 = ${cost}`,{component:k,cost},'人工教学 token 费用。')));
    if(has(v,'total'))c.push(cell('total','载入总费用',v.total,`${Object.values(v.loaded).join(' + ')} = ${v.total}`,v.loaded));
    if(v.executed&&v.transformed)v.transformed.forEach((x,i)=>c.push(cell('converted-'+i,`实际转换项 ${i+1}`,x,p.implementation==='double'?`${v.input[i]} × 2 = ${x}`:`原样返回 ${v.input[i]} = ${x}`,{input:v.input[i],actual:x},'转换函数真实执行；不涉及外部工具。')));
    if(has(v,'verified'))c.push(cell('verified','验证结论',v.verified,v.verified===null?'未选择转换验证任务或跳过检查 → 未验证':`逐项与独立预期 [2,4,6] 比较 → ${v.verified}`,{checks:v.checks||[],verified:v.verified},'null 是未验证，不能改写成通过或失败。'));
    return c;
  },[
    exp('implementation','只改变转换实现','原样返回是否仍能通过独立预期[2,4,6]？',{request:'verify',implementation:'double',verify:'yes'},{request:'verify',implementation:'identity',verify:'yes'},'双倍转换通过，原样返回实际得到[1,2,3]并失败。',(a,b)=>a.result.verified===true&&b.result.verified===false&&b.result.transformed.join(',')==='1,2,3'),
    exp('unknown','只改变是否检查','实现保持有缺陷，未检查与检查失败是一回事吗？',{implementation:'identity',verify:'no'},{implementation:'identity',verify:'yes'},'跳过检查为null；执行检查后为false，实际转换值不变。',(a,b)=>a.result.verified===null&&b.result.verified===false&&a.result.transformed.join(',')===b.result.transformed.join(','))
  ]);

  models['cs146s-durable']=model('检查点记录从哪里重做，幂等回执约束重复调用产生几次业务效果；两者不能互相替代。',(t,{v})=>{
    const c=[];
    if(v.uniqueEvents)c.push(cell('event-count','去重后的事件数',v.uniqueEvents.length,`['event-a','event-a','event-b'] 去重 → ${v.uniqueEvents.length}`,{incoming:3,unique:v.uniqueEvents},'下方只执行event-a，event-b仍排队。'));
    if(has(v,'checkpoint'))c.push(cell('checkpoint','已确认检查点',v.checkpoint,`已确认 ${v.checkpoint} / 4 步；下一未确认下标 = ${v.checkpoint}`,{checkpoint:v.checkpoint},'工具效果发生后、检查点保存前可以中断。'));
    if(has(v,'resumeAt'))c.push(cell('resume','恢复入口',v.resumeAt,`${t.params.workflow==='durable'?'durable → 已记录的恢复下标 '+v.resumeAt:'queue → 从头 0'} = ${v.resumeAt}`,{resumeAt:v.resumeAt,strategy:t.params.workflow},'恢复入口在中断时选定；恢复后的检查点可能已继续推进。它不是 exactly-once 业务效果保证。'));
    if(v.counts)Object.entries(v.counts).forEach(([name,count])=>c.push(cell('count-'+name,name+' 已调用次数',count,`当前快照 ${name} 调用累计 = ${count}`,{step:name,count},'实际内存事件计数；播放不会再执行一次。')));
    if(has(v,'writeAttempts'))c.push(cell('receipt','store 尝试与业务效果',v.writes,`${v.writeAttempts} 次尝试 − ${v.writeAttempts-v.writes} 次回执复用 = ${v.writes} 次写入`,{attempts:v.writeAttempts,writes:v.writes,idempotent:t.params.idempotent},'去重业务效果须由工具回执落实；本例不是真实数据库事务。'));
    return c;
  },[
    exp('receipt','只关闭写工具回执','检查点相同，写入后中断再恢复会写几次？',{crash:'write',workflow:'durable',idempotent:'yes'},{crash:'write',workflow:'durable',idempotent:'no'},'两边均尝试store两次；有回执写一次，无回执写两次。',(a,b)=>a.result.writeAttempts===2&&b.result.writeAttempts===2&&a.result.writes===1&&b.result.writes===2),
    exp('resume','只改变恢复入口策略','从头重跑与检查点恢复，哪些工具会重复？',{crash:'write',workflow:'durable',idempotent:'yes'},{crash:'write',workflow:'queue',idempotent:'yes'},'读工具由1次变2次；幂等回执使实际写入仍为1次。',(a,b)=>a.result.counts.read===1&&b.result.counts.read===2&&a.result.writes===1&&b.result.writes===1)
  ]);

  models['cs146s-config']=model('格式、逻辑测试与未执行状态分别判断；说明文件本身不等于已执行验证。',(t,{v})=>{
    const p=t.params,c=[cell('scope','当前局部约定范围',p.area==='api'?'API':'UI',`根说明 + src/${p.area}/AGENTS.md → ${p.area==='api'?'API':'UI'}`,{area:p.area},'这是本案例配置规则，不宣称所有 Agent 产品具有同一优先级。')];
    if(v.source)c.push(cell('source','待检查片段',v.source,`${p.code} → ${v.source}`,{code:p.code},'从预定义片段中选择，没有运行任意输入代码。'));
    if(has(v,'lintPassed'))c.push(cell('lint','格式检查',v.lintPassed,`source.endsWith(';') → ${v.lintPassed}`,{source:v.source},'仅为本例分号检查，不是完整JavaScript linter。'));
    if(has(v,'executed'))c.push(cell('test','逻辑测试状态',v.testPassed,v.executed?`1 ${p.code==='logic'?'−':'+'} 2 = ${v.testActual}；独立预期3 → ${v.testPassed}`:'格式未过或仅开格式Hook → 测试未运行',{executed:v.executed,actual:v.testActual,expected:3},'未运行时保留null，不能冒充通过。'));
    if(v.outcome)c.push(cell('outcome','组合检查结论',v.outcome,`格式 ${v.lintPassed}；测试配置 ${p.hook}；逻辑 ${v.testPassed} → ${v.outcome}`,{lintPassed:v.lintPassed,hook:p.hook,testPassed:v.testPassed},'当前内存片段的结论，不表示真实仓库已验收。'));
    return c;
  },[
    exp('logic','只改变运算符','格式都正确，加法改成减法会被哪一层发现？',{code:'valid',hook:'all'},{code:'logic',hook:'all'},'格式均通过，独立加法测试从通过变失败。',(a,b)=>a.result.lintPassed&&b.result.lintPassed&&a.result.outcome==='checks_passed'&&b.result.outcome==='tests_failed'),
    exp('test-hook','只启用逻辑测试Hook','缺陷不变，只检查格式能否下逻辑正确结论？',{code:'logic',hook:'lint'},{code:'logic',hook:'all'},'只格式检查为tests_unknown；启用测试后为tests_failed。',(a,b)=>a.result.testPassed===null&&a.result.outcome==='tests_unknown'&&b.result.testPassed===false&&b.result.outcome==='tests_failed')
  ]);

  models['cs146s-readiness']=model('用四项具体前置事实找阻塞项，避免把文件隔离或“有文档”直接等同任务可运行。',(t,{v})=>{
    const defs=[['setupOK','setup','环境可复现'],['docsOK','docs','文档当前有效'],['testsOK','tests','有可执行测试'],['isolationOK','isolation','运行资源隔离']],c=[];
    defs.forEach(([key,param,label])=>{if(has(v,key))c.push(cell(param,label,v[key],`${param} = '${t.params[param]}'；与 'yes' 比较 → ${v[key]}`,{parameter:t.params[param]},'检查的是给定教学案例事实，页面没有安装依赖、运行外部测试或配置数据库。'));});
    if(v.checks)v.checks.forEach((x,i)=>c.push(cell('evidence-'+i,x.name,x.ok,`${x.name} 的案例事实为 ${x.ok} → ${x.ok?'非阻塞':'列入阻塞清单'}`,{ok:x.ok},x.name==='共享资源隔离'?'worktree分离不等于端口与数据库分离。':'')));
    if(v.blockers)c.push(cell('blockers','阻塞项数量',v.blockers.length,`filter(check.ok === false) → ${v.blockers.length} 项`,{blockers:v.blockers},'仅对当前任务的这四项前置检查作结论。'));
    return c;
  },[
    exp('docs','只修正文档状态','其他三项齐全，过时文档这一项会不会阻塞？',{docs:'no'},{docs:'yes'},'阻塞项由当前文档1项变0，状态变ready_for_this_task。',(a,b)=>a.result.blockers.join(',')==='当前文档'&&b.result.blockers.length===0&&b.result.status==='ready_for_this_task'),
    exp('resources','只取消运行资源隔离','文件已分离时，共享端口和数据库还会不会构成阻塞？',{docs:'yes',isolation:'yes'},{docs:'yes',isolation:'no'},'前者可开始受限任务，后者明确列出共享资源隔离阻塞项。',(a,b)=>a.result.status==='ready_for_this_task'&&b.result.blockers.join(',')==='共享资源隔离')
  ]);

  models['cs146s-verification']=model('在写明独立尝试、独立步骤和完美检查器假设后，分别复算成功概率与检查成本。',(t,{v})=>{
    const p=t.params,c=[];
    if(has(v,'finalOnly'))c.push(cell('final-only','单次完成整项的全对概率',v.finalOnly,`${p.p} ^ ${p.steps} = ${n(v.finalOnly)}`,{p:p.p,steps:p.steps},'各步骤独立且全部正确才算成功；不是实测Agent正确率。'));
    if(has(v,'perStep'))c.push(cell('per-step','每步有限尝试后的正确概率',v.perStep,p.independent==='yes'?`1 − (1 − ${p.p}) ^ ${p.attempts} = ${n(v.perStep)}`:`错误完全相关：重试后仍为 ${p.p}`,{p:p.p,attempts:p.attempts,independent:p.independent},'尝试次数包括第一次；独立性不能从播放轨迹中得到。'));
    if(has(v,'checked'))c.push(cell('checked','整项经过逐步检查后的概率',v.checked,`${n(v.perStep)} ^ ${p.steps} = ${n(v.checked)}`,{perStep:v.perStep,steps:p.steps},'用完整精度计算；检查器漏检和相关错误会破坏此假设。'));
    if(has(v,'maxChecks'))c.push(cell('max-checks','最多检查次数',v.maxChecks,`${p.steps} × ${p.attempts} = ${v.maxChecks}`,{steps:p.steps,attempts:p.attempts},'这是上限，不是实际平均使用量。'));
    if(has(v,'checksPerHour'))c.push(cell('wait','每小时检查等待次数上限',v.checksPerHour,`floor(3600 / ${p.seconds}) = ${v.checksPerHour}`,{seconds:p.seconds},'忽略生成、工具执行和人工评审时间，不是开发效率。'));
    return c;
  },[
    exp('correlation','只改变重试独立性假设','重复错误完全相关时，三次尝试还有原来的概率收益吗？',{independent:'yes'},{independent:'no'},'独立假设约0.9802；完全相关时退回单次整项概率约0.1216。',(a,b)=>near(a.result.checked,0.9801888648295347)&&near(b.result.checked,b.result.finalOnly)&&b.result.checked<a.result.checked),
    exp('wait','只改变检查等待时间','等待5秒变600秒，概率和理论检查次数各如何变化？',{seconds:5},{seconds:600},'概率保持不变，理论次数720变6次/小时。',(a,b)=>a.result.checked===b.result.checked&&a.result.checksPerHour===720&&b.result.checksPerHour===6)
  ]);

  models['cs146s-review']=model('先有业务规格，再执行带独立预期的用例；把多个同源失败聚成一个可复现根因。',(t,{v})=>{
    const p=t.params,c=[cell('spec','业务规格是否齐全',!!v.contract,`spec = '${p.spec}' → ${v.contract?'已取得 half_up / cents':'未取得，保留待核实'}`,{spec:p.spec},'数值不符与有资格认定业务缺陷是两层不同判断。')];
    if(v.results)v.results.forEach((r,i)=>c.push(cell('case-'+i,`已执行价格用例 ${i+1}`,r.actual,`${p.patch==='floor'?'floor':'round'}(${r.c} × ${p.patch==='bug'?r.d:`(100 − ${r.d})`} / 100) = ${r.actual}；预期 ${r.want}`,{cents:r.c,discount:r.d,expected:r.want,actual:r.actual},r.actual===r.want?'该具体输入通过。':'该具体输入不符，失败证据需结合规格解释。')));
    else if(v.cases)v.cases.forEach(([cents,discount,want],i)=>c.push(cell('expected-'+i,`独立预期 ${i+1}`,want,`输入 ${cents} 分，折扣 ${discount}% → 预先给定 ${want} 分`,{cents,discount,want},'这是独立测试标准；还未执行候选函数。')));
    if(has(v,'rawFailures'))c.push(cell('aggregation','已核实根因数量',v.findings.length,`${v.rawFailures} 个数值失败 + ${v.contract?'已取得':'缺少'}规格 → ${v.findings.length} 项已核实根因`,{rawFailures:v.rawFailures,findings:v.findings.length},'同一个公式错误的多条失败用例合并证据，不重复计数。'));
    if(v.verdict)c.push(cell('verdict','本次评审结论',v.verdict,`缺规格 ? needs_spec : 有已核实根因 ? request_changes : eligible_for_human_review → ${v.verdict}`,{contract:!!v.contract,findings:v.findings.length},'进入人工评审不等于自动合并或所有场景正确。'));
    return c;
  },[
    exp('rounding','只修正舍入方式','普通用例相同，半分边界能否区分两种补丁？',{patch:'floor',suite:'edge'},{patch:'round',suite:'edge'},'向下取整有1项已核实舍入根因；半分向上满足当前用例集。',(a,b)=>a.result.findings.length===1&&b.result.failed.length===0&&b.result.verdict==='eligible_for_human_review'),
    exp('spec','只补全业务规格','失败数值完全相同，缺规格时能否把猜测写成已核实业务缺陷？',{patch:'floor',spec:'no'},{patch:'floor',spec:'yes'},'失败用例不变，但needs_spec变为1项已核实根因和request_changes。',(a,b)=>a.result.verdict==='needs_spec'&&a.result.findings.length===0&&b.result.findings.length===1&&b.result.verdict==='request_changes'&&JSON.stringify(a.result.failed)===JSON.stringify(b.result.failed)),
    exp('test-range','只扩大测试范围','仅一个整数价格通过，能否覆盖半分舍入？',{patch:'floor',suite:'smoke'},{patch:'floor',suite:'edge'},'普通用例未发现缺陷，增加边界后暴露舍入根因。',(a,b)=>a.result.failed.length===0&&b.result.failed.length===1&&b.result.failed[0].c===1)
  ]);
  return {courseId:'cs146s',models};
});
