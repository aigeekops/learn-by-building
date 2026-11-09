/* HF Agents: actual bounded snapshots, fixed policies and read-only in-memory tools. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const num=x=>Number(x.toFixed(4));
  const show=x=>x===null?'null':typeof x==='number'?String(num(x)):String(x);
  const cell=(id,label,value,formula,inputs={},note='')=>({id,label,value:typeof value==='number'?num(value):value,formula,inputs,note});
  const exp=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  function frame(t,index){
    const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0));
    const previous=Object.assign({},...t.steps.slice(0,i).map(s=>s.variables));
    return {i,f:t.steps[i],v:Object.assign({},previous,t.steps[i].variables),previous};
  }
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const s=frame(t,index);return {title:s.f.title,summary:'逐格检查本帧已发生的计算与状态转换。'+s.f.detail,cells:inspect(t,s)};},experiments};}
  const supported=(question,id)=>question==='sampling'?id==='sampling-v1':question==='power'?id==='power-v1':false;
  const normalized=(x,mode)=>mode==='units'?String(x).trim().replace(/\s*(?:ms|V)$/,'').trim():String(x);
  const models={};

  models['hfagents-state']=model('先数真正传入的消息，再检查只读工具边界；下一动作由预设策略决定，不代表运行语言模型。',(t,{f,v})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:c.push(cell('system-role','系统消息角色',v.system.role,`system.role = ${v.system.role}`,{role:v.system.role},'角色标记不是操作系统权限。'),cell('system-rule','本次系统约束',v.system.content,`system.content → ${v.system.content}`,{content:v.system.content},'本例只允许读取资料并保留来源。'));break;
      case 2:c.push(cell('task-role','问题的角色',v.task.role,`task.role = ${v.task.role}`,{role:v.task.role}),cell('task','当前问题',v.task.content,`task.content → ${v.task.content}`,{content:v.task.content},'工具资料不会变成新的用户授权。'));break;
      case 3:
        v.history.forEach((turn,i)=>turn.forEach((m,j)=>c.push(cell('history-'+i+'-'+j,`历史第${i+1}轮 · ${m.role}`,m.content,`history[${i}][${j}] = ${m.role}(${m.content})`,{turn:i,message:j,role:m.role,content:m.content}))));
        c.push(cell('history-count','已传入历史消息数',v.historyMessages,`${v.history.length} 轮 × 2 条/轮 = ${v.historyMessages}`,{turns:v.history.length,messagesPerTurn:2},'0轮时空数组；轮数不是token数。'));break;
      case 4:c.push(cell('observation','当前观测值',v.observation?v.observation.value:null,p.observation==='yes'?`已有本次观测 → ${v.observation.value}`:'尚无本次观测 → null',{observationMode:p.observation},'参数给定的内存观测，不是联网读取。'),cell('observation-source','当前观测来源',v.observation?v.observation.source:null,v.observation?`本次工具观测.source = ${v.observation.source}`:'observation = null → 尚无来源',{observation:v.observation}));break;
      case 5:
        v.messages.forEach((m,i)=>c.push(cell('message-'+i,`输入消息[${i}]角色`,m.role,`messages[${i}].role = ${m.role}`,{position:i,role:m.role},m.role==='tool'?'这是已经接入的观测消息。':'消息数组已在本步完成组装。')));
        c.push(cell('message-count','本轮消息总数',v.messageCount,`系统 1 + 历史 ${v.historyMessages} + 问题 1 + 工具 ${v.observation?1:0} = ${v.messageCount}`,{system:1,history:v.historyMessages,user:1,tool:v.observation?1:0}));break;
      case 6:c.push(cell('allowed','候选工具在只读集合内',v.allowed,`"${v.tool}" === "read" → ${v.allowed}`,{tool:v.tool,allowedTool:'read'},'写文件不会执行。'));break;
      case 7:c.push(cell('next','预设策略的下一状态',v.next,`allowed=${v.allowed}；observation=${v.observation?'有来源':'null'} → ${v.next}`,{allowed:v.allowed,observation:v.observation},'拒绝优先；允许且有观测才摘录，否则lookup。'));break;
      case 8:c.push(cell('state-count','状态快照 · 消息数',v.state.messageCount,`state.messageCount ← messages.length = ${v.state.messageCount}`,{messageCount:v.messageCount}),cell('state-allowed','状态快照 · 工具许可',v.state.allowed,`state.allowed ← ${v.allowed}`,{allowed:v.allowed}),cell('state-next','状态快照 · 下一状态',v.state.next,`state.next ← ${v.next}`,{next:v.next},'只重放内存状态，不再次调用工具。'));break;
    }
    return c;
  },[
    exp('receive-observation','只接入本次带来源观测','没有观测与已有观测时，消息条数和下一动作怎样变化？',{turns:0,observation:'no',tool:'read'},{turns:0,observation:'yes',tool:'read'},'消息2变3；lookup变answer_with_source，来源为sampling-v1。',(a,b)=>a.result.messageCount===2&&b.result.messageCount===3&&a.result.next==='lookup'&&b.result.next==='answer_with_source'&&b.result.observation.source==='sampling-v1'),
    exp('read-only-boundary','只把候选工具改为write','已有观测能否授权写文件？',{observation:'yes',tool:'read'},{observation:'yes',tool:'write'},'消息和观测不变，allowed由true变false，下一动作refuse。',(a,b)=>a.result.allowed&&!b.result.allowed&&a.result.messageCount===b.result.messageCount&&a.result.next==='answer_with_source'&&b.result.next==='refuse')
  ]);

  models['hfagents-tools']=model('工具名字、整数范围、调用是否发生和响应能否消费分别核对；结构化错误没有成功文档。',(t,{f,v})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:c.push(cell('request-name','请求工具名',v.request.name,`request.name ← ${v.request.name}`,{name:p.name}),cell('request-limit','请求条数',v.request.arguments.limit,`request.arguments.limit ← ${v.request.arguments.limit}`,{limit:p.limit}));break;
      case 2:c.push(cell('registered','名字注册判断',v.registered,`"${v.request.name}" === "lookup" → ${v.registered}`,{requested:v.request.name,registeredName:'lookup'},'delete未注册，不能执行。'));break;
      case 3:c.push(cell('limit-integer','参数为整数',Number.isInteger(v.limit),`Number.isInteger(${v.limit}) → ${Number.isInteger(v.limit)}`,{limit:v.limit}),cell('limit-range','参数在合法范围',v.limit>=1&&v.limit<=3,`1 ≤ ${v.limit} ≤ 3 → ${v.limit>=1&&v.limit<=3}`,{limit:v.limit,min:1,max:3}),cell('valid','完整契约是否满足',v.valid,`${v.registered} && ${Number.isInteger(v.limit)} && ${v.limit>=1} && ${v.limit<=3} → ${v.valid}`,{registered:v.registered,limit:v.limit},'0与4明确拒绝，不截成合法值。'));break;
      case 4:c.push(cell('executed','调用前执行标志',v.executed,'初始化 executed = false',{executed:v.executed}),cell('response','调用前响应槽',v.response,'初始化 response = null',{response:v.response},'此时没有任何工具文档。'));break;
      case 5:case 6:
        c.push(cell('executed','工具实际调用标志',v.executed,`valid=${v.valid} → executed=${v.executed}`,{valid:v.valid},'契约拒绝与已调用超时是不同状态。'),cell('response-error','响应错误标志',v.response.isError,`valid=${v.valid}；fault=${p.fault} → isError=${v.response.isError}`,{valid:v.valid,fault:p.fault}));
        if(v.response.isError)c.push(cell('error-kind','错误类型',v.response.kind,`!valid ? contract : timeout → ${v.response.kind}`,{valid:v.valid,fault:p.fault}));
        else v.response.rows.forEach((d,i)=>c.push(cell('returned-'+i,`内存工具返回文档[${i}]`,d.id,`documents.slice(0, ${p.limit})[${i}].id = ${d.id}`,{limit:p.limit,index:i,id:d.id,value:d.value},'文档已在当前帧返回；未联网。')));break;
      case 7:
        c.push(cell('row-count','可消费文档数',v.count,`response.isError=${v.response.isError} → rows=${v.response.isError?'[]':'response.rows'} → length=${v.count}`,{isError:v.response.isError,count:v.rows.length},'错误不是成功的空检索。'));
        v.rows.forEach((d,i)=>c.push(cell('row-'+i,`可消费来源[${i}]`,d.id,`rows[${i}].id = ${d.id}`,{index:i,id:d.id})));break;
      case 8:c.push(cell('usable','是否进入证据检查',v.usable,`!${v.response.isError} = ${v.usable}`,{isError:v.response.isError},'usable只表示响应成功，不证明资料支持问题。'));break;
      case 9:c.push(cell('receipt-executed','回执 · 实际执行',v.receipt.executed,`receipt.executed ← ${v.executed}`,{executed:v.executed}),cell('receipt-usable','回执 · 可消费',v.receipt.usable,`receipt.usable ← !${v.response.isError} = ${v.receipt.usable}`,{isError:v.response.isError}),cell('receipt-count','回执 · 文档数',v.receipt.count,`receipt.count ← rows.length = ${v.rows.length}`,{count:v.rows.length},'仅本次内存教学回执。'));break;
    }
    return c;
  },[
    exp('schema-boundary','只把limit从0改为1','非法0会不会仍取到第一条资料？',{name:'lookup',limit:0,fault:'none'},{name:'lookup',limit:1,fault:'none'},'0不执行且报contract；1执行成功并返回1条。',(a,b)=>!a.result.executed&&!a.result.usable&&a.result.error==='contract'&&a.result.count===0&&b.result.executed&&b.result.usable&&b.result.count===1&&b.result.error===null),
    exp('timeout','只把工具环境改为超时','执行过但超时能否把两条文档交给消费方？',{limit:2,fault:'none'},{limit:2,fault:'timeout'},'两次都已执行；成功2条，超时0条且usable=false。',(a,b)=>a.result.executed&&b.result.executed&&a.result.count===2&&a.result.usable&&b.result.count===0&&!b.result.usable&&b.result.error==='timeout')
  ]);

  models['hfagents-loop']=model('每次决策都花预算，final也占一步；只有成功工具观测能成为答案，停止原因必须单独记录。',(t,{f,v,previous})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:c.push(cell('initial-calls','初始工具调用数',v.calls,'calls = 0',{calls:v.calls}),cell('initial-observation','初始观测',v.observation,'observation = null',{observation:v.observation}),cell('initial-status','初始任务状态',v.status,'status = running；answer = null',{status:v.status,answer:v.answer}));break;
      case 2:c.push(cell('decision-budget','决策步数上限',v.budget,`最多 ${v.budget} 步；lookup与final均占1步`,{budget:v.budget},'不是工具调用次数上限，也不保证完成。'));break;
      case 3:c.push(cell('action','本步预设动作',v.action,`observation=${v.observation?'有来源':'null'} ? final : lookup → ${v.action}`,{observation:v.observation},'未调用LLM，不展示所谓内部思考。'),cell('decisions','已使用决策步数',v.decisions,`decisions ← step = ${v.step}`,{step:v.step}),cell('decisions-left','本步后剩余决策',p.budget-v.decisions,`${p.budget} − ${v.decisions} = ${p.budget-v.decisions}`,{budget:p.budget,decisions:v.decisions}),cell('calls-before-action','动作执行前调用数',v.calls,`此步刚选择 ${v.action}；calls仍为 ${v.calls}`,{calls:v.calls,action:v.action}));break;
      case 4:c.push(cell('answer','实际输出答案',v.answer,`已有观测.value = ${v.observation.value} → answer = ${v.answer}`,{observation:v.observation}),cell('source','答案来源',v.source,`observation.source → ${v.source}`,{source:v.observation.source}),cell('completed','完成状态',v.status,'final已执行 → status = completed',{action:v.action},'仅有观测而尚未final时不能标完成。'));break;
      case 5:
        c.push(cell('call-increment','实际工具调用累加',v.calls,`${previous.calls} + 1 = ${v.calls}`,{before:previous.calls,increment:1}),cell('feedback-kind','本次反馈类别',v.feedback.kind,`scenario=${p.scenario}；calls=${v.calls} → ${v.feedback.kind}`,{scenario:p.scenario,calls:v.calls},'retry首调失败；stall持续失败；fatal立即停止。'));
        c.push(cell('feedback-document','本次返回文档',v.feedback.document?v.feedback.document.value:null,v.feedback.kind==='ok'?`kind=ok → document.value = ${v.feedback.document.value}`:`kind=${v.feedback.kind} → 无document`,{kind:v.feedback.kind},'只在成功返回后出现10 ms。'));break;
      case 6:c.push(cell('fatal-stop','不可恢复错误停止',v.status,`feedback.kind=${v.feedback.kind} → tool_error`,{feedback:v.feedback.kind}),cell('fatal-answer','错误后的答案',v.answer,'fatal没有有效观测 → answer保持null',{answer:v.answer},'不再重试，也不标成功。'));break;
      case 7:c.push(cell('observation','接入后的有效观测',v.observation?v.observation.value:null,`feedback.kind=${v.feedback.kind} → observation=${v.observation?v.observation.value:'null'}`,{feedback:v.feedback,observation:v.observation},'成功观测进入状态，下一决策才可final；错误不是知识。'));break;
      case 9:c.push(cell('stop-status','实际停止原因',v.status,`${previous.status} ${previous.status==='running'?'→ 预算循环结束 → budget_exhausted':'→ 保留已有停止原因'} = ${v.status}`,{statusBefore:previous.status,budget:p.budget,decisions:v.decisions}),cell('stop-answer','停止时已输出答案',v.answer,`已执行final=${v.status==='completed'} → answer=${show(v.answer)}`,{status:v.status,answer:v.answer}),cell('stop-resources','工具调用与决策之差',v.decisions-v.calls,`${v.decisions} 决策 − ${v.calls} 调用 = ${v.decisions-v.calls}`,{decisions:v.decisions,calls:v.calls},'差1对应执行了final，不是多出来的工具调用。'));break;
      case 10:c.push(cell('receipt-calls','回执 · 工具调用',v.receipt.calls,`receipt.calls ← ${v.calls}`,{calls:v.calls}),cell('receipt-status','回执 · 停止原因',v.receipt.status,`receipt.status ← ${v.status}`,{status:v.status}),cell('receipt-answer','回执 · 已输出答案',v.receipt.answer,`receipt.answer ← ${show(v.answer)}`,{answer:v.answer},'这是已结束的本次内存运行，不重新执行lookup。'));break;
    }
    return c;
  },[
    exp('reserve-final-step','只把retry场景预算从2改为3','第2步读到了文档是否已完成？',{scenario:'retry',budget:2},{scenario:'retry',budget:3},'调用都为2；预算2无输出且耗尽，预算3多一次final后完成。',(a,b)=>a.result.calls===2&&b.result.calls===2&&a.result.decisions===2&&b.result.decisions===3&&a.result.status==='budget_exhausted'&&a.result.answer===null&&b.result.status==='completed'&&b.result.answer==='10 ms'),
    exp('fatal-versus-retry','只改为持续可重试失败','fatal与stall在4步预算内会各调用几次？',{scenario:'fatal',budget:4},{scenario:'stall',budget:4},'fatal首调即tool_error；stall调用4次后budget_exhausted；均无答案。',(a,b)=>a.result.calls===1&&a.result.status==='tool_error'&&b.result.calls===4&&b.result.status==='budget_exhausted'&&a.result.answer===null&&b.result.answer===null)
  ]);

  models['hfagents-context']=model('先扣输出空间，逐项相加必需资料；必需内容完整装不下就拒绝，摘要保留事实与来源仅限给定案例。',(t,{f,v})=>{
    const c=[],p=t.params;
    switch(f.line){
      case 1:c.push(cell('input-budget','输入可用容量',v.inputBudget,`${v.window} − ${v.reserve} = ${v.inputBudget}`,{window:v.window,reserve:v.reserve},'人工预算单位，非真实tokenizer计数。'));break;
      case 2:v.mandatory.forEach(([name,cost],i)=>c.push(cell('mandatory-'+i,`必需部分 · ${name}`,cost,`${name} 的给定成本 = ${cost}`,{name,cost},'系统、任务和约束均不可省略。')));break;
      case 3:c.push(cell('memory-cost','本次记忆成本',v.memory.cost,`memoryMode=${p.memory} → ${v.memory.cost} 人工单位`,{memoryMode:p.memory,cost:v.memory.cost}),cell('memory-source','记忆保留来源',v.memory.source,`memory.source = ${v.memory.source}`,{source:v.memory.source}),cell('memory-fact','记忆保留事实',v.memory.fact,`memory.fact = ${v.memory.fact}`,{fact:v.memory.fact},'给定摘要，不存在真实摘要模型或持久记忆服务。'));break;
      case 4:v.required.forEach(([name,cost],i)=>c.push(cell('required-'+i,`待装入部分[${i}] · ${name}`,cost,`required[${i}] = (${name}, ${cost})`,{name,cost},'这是所需清单，尚未产生装入选择。')));break;
      case 5:c.push(cell('required-cost','必需总成本',v.requiredCost,`${v.required.map(x=>x[1]).join(' + ')} = ${v.requiredCost}`,{costs:v.required.map(x=>x[1])},'12系统 + 8任务 + 6约束 + 本次记忆成本。'));break;
      case 6:c.push(cell('fits','必需内容整体可容纳',v.fits,`${v.requiredCost} ≤ ${v.inputBudget} → ${v.fits}`,{requiredCost:v.requiredCost,inputBudget:v.inputBudget},'false时不能留下部分材料冒充可作答。'));break;
      case 7:
        c.push(cell('required-selected','必需部分装入数',v.selected.length,`fits=${v.fits} → ${v.fits?'复制全部4个必需部分':'空选择'} → ${v.selected.length}`,{fits:v.fits,count:v.selected.length}));
        v.selected.forEach(([name,cost],i)=>c.push(cell('selected-'+i,`已装入[${i}] · ${name}`,cost,`selected[${i}] ← (${name}, ${cost})`,{name,cost})));break;
      case 8:{const optional=v.selected.some(x=>x[0]==='optional');c.push(cell('optional','可选背景是否装入',optional,`fits=${v.fits} && ${v.requiredCost} + 12 ≤ ${v.inputBudget} → ${optional}`,{fits:v.fits,requiredCost:v.requiredCost,optionalCost:12,inputBudget:v.inputBudget},'可选背景不能挤掉任何必需部分。'),cell('selected-count','当前装入部分数',v.selected.length,`必需 ${v.fits?4:0} + 可选 ${optional?1:0} = ${v.selected.length}`,{requiredCount:v.fits?4:0,optionalCount:optional?1:0}));break;}
      case 9:c.push(cell('used','实际已用容量',v.used,`${v.selected.length?v.selected.map(x=>x[1]).join(' + '):'空选择求和 0'} = ${v.used}`,{costs:v.selected.map(x=>x[1])}),cell('remaining','剩余输入容量',v.remaining,`${v.inputBudget} − ${v.used} = ${v.remaining}`,{inputBudget:v.inputBudget,used:v.used}));break;
      case 10:c.push(cell('status','上下文准备状态',v.status,`fits=${v.fits} ? ready : refuse_missing_required → ${v.status}`,{fits:v.fits},'ready只表示本例资料与容量完整，不证明模型回答能力。'));break;
    }
    return c;
  },[
    exp('summary-fit','只把全文记忆改为给定摘要','输入容量45时，50与36的必需成本各是什么状态？',{window:65,reserve:20,memory:'full'},{window:65,reserve:20,memory:'summary'},'全文50超45，选择为空；摘要36可容纳且保留来源，剩9。',(a,b)=>a.result.inputBudget===45&&b.result.inputBudget===45&&a.result.requiredCost===50&&b.result.requiredCost===36&&a.result.status==='refuse_missing_required'&&a.result.used===0&&a.result.selected.length===0&&b.result.status==='ready'&&b.result.used===36&&b.result.remaining===9),
    exp('optional-room','只把总容量65改为70','必需36保持不变，多5个单位是否足以装入12的背景？',{window:65,reserve:20,memory:'summary'},{window:70,reserve:20,memory:'summary'},'输入45变50，装入量36变48；可选背景只在后者出现。',(a,b)=>a.result.requiredCost===36&&b.result.requiredCost===36&&a.result.used===36&&b.result.used===48&&!a.result.selected.some(x=>x[0]==='optional')&&b.result.selected.some(x=>x[0]==='optional')&&b.result.remaining===2)
  ]);

  models['hfagents-smolagents']=model('固定模型响应仅表达受控调用意图，注册工具返回数量后才乘单价；浏览器不执行任意Python或真实模型。',(t,{f,v})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:c.push(cell('fixed-program','预设响应中的程序',v.modelOutput,`ReplayModel → ${v.modelOutput}`,{modelOutput:v.modelOutput},'固定文本；不eval、不调用LLM，也不是Python解释器。'));break;
      case 2:c.push(cell('registry-count','已注册只读工具数',v.toolRegistry.length,`allow=${p.allow} → registry=${v.toolRegistry.length?'[count_items]':'[]'} → length=${v.toolRegistry.length}`,{allow:p.allow,registeredTools:v.toolRegistry},'只操作内存库存数量。'));break;
      case 3:c.push(cell('parsed-tool','受控结构中的工具名',v.parsed.tool,`parsed.tool = ${v.parsed.tool}`,{tool:v.parsed.tool}),cell('parsed-category','受控结构中的类别',v.parsed.category,`parsed.category = ${v.parsed.category}`,{category:v.parsed.category},'结构由原模型给定，不冒充解析任意程序。'));break;
      case 4:c.push(cell('allowed','调用名称是否已注册',v.allowed,`[${v.toolRegistry.join(', ')}].includes("${v.parsed.tool}") → ${v.allowed}`,{registry:v.toolRegistry,tool:v.parsed.tool},'生成文本提及工具不会授予权限。'));break;
      case 5:c.push(cell('tool-count','工具本次实际返回数量',v.toolCount,`allowed=${v.allowed} ? quantity=${p.quantity} : null → ${show(v.toolCount)}`,{allowed:v.allowed,quantity:p.quantity},'未授权保留null，不能当0个物品。'));break;
      case 6:c.push(cell('observation-count','接回状态的观测数量',v.toolObservation?v.toolObservation.n:null,`allowed=${v.allowed} → toolObservation=${v.toolObservation?'{n:'+v.toolObservation.n+'}':'null'}`,{allowed:v.allowed,toolCount:v.toolCount},'只有本次工具返回后才有n。'));break;
      case 7:c.push(cell('amount','确定性乘法金额',v.amount,v.toolObservation?`${v.toolObservation.n} × ${v.unitPrice} = ${v.amount}`:'toolObservation = null → amount = null',{n:v.toolObservation?v.toolObservation.n:null,unitPrice:v.unitPrice},'教学单位；没有观测便没有可计算金额。'));break;
      case 8:c.push(cell('answer-amount','final_answer中的金额',v.answer?v.answer.amount:null,`amount=${show(v.amount)} → answer=${v.answer?v.answer.amount:'null'}`,{amount:v.amount}),cell('answer-source','答案来源',v.answer?v.answer.source:null,v.answer?`本次计数来源 → ${v.answer.source}`:'amount = null → 无答案来源',{answerExists:v.answer!==null},'页面是内存演示；独立CodeAgent例子的运行结论须另行验证。'));break;
    }
    return c;
  },[
    exp('count-times-price','只把库存数量2改为4','单价12保持不变，金额会怎样变化？',{quantity:2,unitPrice:12,allow:'yes'},{quantity:4,unitPrice:12,allow:'yes'},'工具返回2变4，金额24变48，来源均为inventory-fixture。',(a,b)=>a.result.toolCount===2&&b.result.toolCount===4&&a.result.amount===24&&b.result.amount===48&&a.result.answer.source==='inventory-fixture'&&b.result.answer.source==='inventory-fixture'),
    exp('unregistered-tool','只取消count_items注册','固定生成程序能否绕过工具注册？',{allow:'yes',quantity:3,unitPrice:12},{allow:'no',quantity:3,unitPrice:12},'注册时得到36；取消后allowed=false，计数、金额与答案均null。',(a,b)=>a.result.allowed&&a.result.amount===36&&!b.result.allowed&&b.result.toolCount===null&&b.result.amount===null&&b.result.answer===null)
  ]);

  models['hfagents-rag']=model('预设查询计划逐次检索；逐词命中率、阈值与top-k和问题支持性是不同检查，来源只在观测后出现。',(t,{f,v,previous})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:
        v.queries.forEach((terms,i)=>c.push(cell('planned-query-'+i,`预设查询计划[${i}]`,terms.join(' '),`queryPlan[${p.question}][${i}] → ${terms.join(' + ')}`,{question:p.question,ordinal:i,terms},'这是待执行计划，不表示已经检索。')));
        v.documents.forEach((d,i)=>c.push(cell('document-'+i,`内存资料[${i}]的词项`,d.tokens.join(' '),`${d.id}.tokens = [${d.tokens.join(', ')}]`,{id:d.id,tokens:d.tokens},'固定内存知识库，不是向量数据库。')));break;
      case 2:c.push(cell('initial-calls','已发生检索调用',v.calls,'calls = 0',{calls:v.calls}),cell('initial-evidence','已确认支持证据数',v.evidence.length,'evidence = [] → length = 0',{evidenceCount:v.evidence.length}),cell('initial-answer','当前答案槽',v.answer,'answer = null',{answer:v.answer},'计划与知识库不等于本次已获得证据。'));break;
      case 4:c.push(cell('calls','当前检索调用次数',v.calls,`${previous.calls} + 1 = ${v.calls}`,{before:previous.calls,increment:1}),cell('terms','本次实际检索词',v.terms.join(' '),`queries[${v.calls-1}] → ${v.terms.join(' + ')}`,{call:v.calls,terms:v.terms}),cell('calls-left','剩余调用预算',p.budget-v.calls,`${p.budget} − ${v.calls} = ${p.budget-v.calls}`,{budget:p.budget,calls:v.calls},'本帧新查询尚未计算排序，不显示前次排序为本次结果。'));break;
      case 5:v.ranked.forEach((d,i)=>{
        const matches=v.terms.filter(x=>d.tokens.includes(x));
        c.push(cell('score-'+d.id,`排序第${i+1} · ${d.id}`,d.score,`${v.terms.map(x=>`${d.tokens.includes(x)?1:0}(${x})`).join(' + ')} → ${matches.length} / ${v.terms.length} = ${show(d.score)}`,{terms:v.terms,tokens:d.tokens,matches:matches.length,queryLength:v.terms.length},'查询词命中比例，非embedding相似度或正确率。'));
      });break;
      case 6:{
        const eligible=v.ranked.filter(d=>d.score>=p.threshold&&d.score>0);
        v.ranked.forEach(d=>c.push(cell('threshold-'+d.id,`${d.id}通过分数门槛`,d.score>=p.threshold&&d.score>0,`${show(d.score)} ≥ ${p.threshold} && ${show(d.score)} > 0 → ${d.score>=p.threshold&&d.score>0}`,{score:d.score,threshold:p.threshold},'阈值为0也剔除零命中文档。')));
        c.push(cell('topk-count','top-k后候选数',v.hits.length,`min(通过门槛 ${eligible.length}, topk ${p.topk}) = ${v.hits.length}`,{eligible:eligible.length,topk:p.topk}));
        v.hits.forEach((d,i)=>c.push(cell('hit-'+i,`候选[${i}]来源`,d.id,`eligible.slice(0, ${p.topk})[${i}] → ${d.id}`,{id:d.id,score:d.score,index:i})));break;}
      case 7:
        v.hits.forEach(d=>c.push(cell('supports-'+d.id,`${d.id}支持当前问题`,supported(p.question,d.id),`question=${p.question}；candidate=${d.id} → supports=${supported(p.question,d.id)}`,{question:p.question,source:d.id},'支持规则为本站给定真值，不是自动语义证明。')));
        c.push(cell('evidence-count','本次确认支持证据数',v.evidenceCount,`hits ${v.hits.length} 条按问题支持规则筛选 → ${v.evidence.length} 条`,{question:p.question,hitIds:v.hits.map(d=>d.id),evidenceIds:v.evidence.map(d=>d.id)},'没有支持证据才能在剩余预算内改写。'));
        v.evidence.forEach((d,i)=>c.push(cell('evidence-'+i,`本次证据[${i}]事实`,d.value,`${d.id} → ${d.value}`,{source:d.id,value:d.value})));break;
      case 10:v.answer.forEach((a,i)=>c.push(cell('answer-'+i,`已形成回答[${i}]`,a.value,a.source?`evidence(${a.source}).value → ${a.value}`:'evidence.length = 0 → 资料不足',{source:a.source,evidenceCount:v.evidence.length},a.source?'本次观测的可追溯摘录。':'不编造未知电机速度。')));break;
      case 11:c.push(cell('receipt-calls','本次回执 · 检索调用数',v.receipt.calls,`receipt.calls ← ${v.calls}`,{calls:v.calls}),cell('receipt-evidence','本次回执 · 支持证据数',v.receipt.evidenceCount,`receipt.evidenceCount ← evidence.length = ${v.evidence.length}`,{evidenceIds:v.evidence.map(d=>d.id)}),cell('receipt-answer-count','本次回执 · 回答条数',v.receipt.answer.length,`answer.length = ${v.receipt.answer.length}`,{sources:v.receipt.answer.map(a=>a.source)},'调用数、支持数与回答条数不能互相替代。'));break;
    }
    return c;
  },[
    exp('query-rewrite','只把检索预算从1改为2','采样频率首次只命中半数词，改写是否能取得周期？',{question:'sampling',budget:1,threshold:.75,topk:2},{question:'sampling',budget:2,threshold:.75,topk:2},'第一次0.5低于0.75，无证据；第二次改为采样/周期后1.0，来源sampling-v1。',(a,b)=>a.result.calls===1&&a.result.evidenceCount===0&&a.result.answer[0].value==='资料不足'&&b.result.calls===2&&b.result.evidenceCount===1&&b.result.answer[0].source==='sampling-v1'&&b.result.answer[0].value==='10 ms'),
    exp('threshold','只把匹配阈值0.75降为0.5','同一次查询的0.5分数何时会入选？',{question:'sampling',budget:1,threshold:.75,topk:2},{question:'sampling',budget:1,threshold:.5,topk:2},'调用数均1，候选由空变sampling-v1，支持数0变1。',(a,b)=>a.result.calls===1&&b.result.calls===1&&a.result.evidenceCount===0&&b.result.evidenceCount===1&&a.result.attempts[0].hitIds.length===0&&b.result.attempts[0].hitIds.join(',')==='sampling-v1')
  ]);

  models['hfagents-evaluation']=model('逐题比较答案再检查来源条件，判定后才进入分子；超时始终留在固定四题的分母内。',(t,{f,v})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:
        v.cases.forEach((x,i)=>c.push(cell('fixture-'+x.id,`固定题集[${i}] · ${x.id}`,x.gold,`case ${x.id}.gold = ${x.gold}`,{id:x.id,gold:x.gold,predicted:x.predicted,source:x.source},'给定离线fixture，不是已运行GAIA，也尚未形成单题评测结果。')));
        c.push(cell('fixture-total','固定题数',v.cases.length,`[${v.cases.map(x=>x.id).join(', ')}].length = ${v.cases.length}`,{ids:v.cases.map(x=>x.id)},'超时题也在分母内。'));break;
      case 2:c.push(cell('initial-results','已判定题数',v.results.length,'results = [] → length = 0',{resultsCount:v.results.length},'尚未评测的题保持等待。'));break;
      case 4:{const gold=normalized(v.gold,p.normalize),predicted=v.predicted===null?null:normalized(v.predicted,p.normalize);c.push(cell('equal-'+v.caseId,`${v.caseId}的答案匹配`,v.equal,`${v.predicted!==null} && ${show(predicted)} === ${gold} → ${v.equal}`,{mode:p.normalize,gold:v.gold,predicted:v.predicted,normalizedGold:gold,normalizedPredicted:predicted},'仅units模式去掉末尾ms或V；null不参加字符串匹配。'));break;}
      case 5:{const x=v.cases.find(x=>x.id===v.caseId);c.push(cell('grounded-'+v.caseId,`${v.caseId}的来源条件`,v.grounded,`predicted=${show(x.predicted)} 是资料不足(${x.predicted==='资料不足'}) || source非null(${v.source!==null}) → ${v.grounded}`,{predicted:x.predicted,source:v.source},'只检查来源字段是否存在，不能证明引用内容支持答案。'));break;}
      case 6:
        v.results.forEach(x=>{const fixture=v.cases.find(y=>y.id===x.id),equal=fixture.predicted!==null&&normalized(fixture.predicted,p.normalize)===normalized(fixture.gold,p.normalize),grounded=fixture.predicted==='资料不足'||fixture.source!==null;c.push(cell('result-'+x.id,`已判定 ${x.id} 正确`,x.correct,`equal=${equal} && grounded=${grounded} → ${x.correct}`,{gold:fixture.gold,predicted:fixture.predicted,source:fixture.source,mode:p.normalize},'这里只列已写入的判定，不预填未来题。'),cell('timeout-'+x.id,`已判定 ${x.id} 超时`,x.timeout,`predicted=${show(fixture.predicted)} === null → ${x.timeout}`,{predicted:fixture.predicted}));});
        c.push(cell('evaluated-count','已完成判定题数',v.results.length,`results.length = ${v.results.length}`,{evaluatedIds:v.results.map(x=>x.id)}));break;
      case 8:c.push(cell('correct','正确题数分子',v.correct,`${v.results.map(x=>x.correct?1:0).join(' + ')} = ${v.correct}`,{results:v.results.map(x=>({id:x.id,correct:x.correct}))}),cell('total','固定题数分母',v.total,`cases.length = ${v.cases.length}（含 ${v.results.filter(x=>x.timeout).length} 道超时）`,{total:v.cases.length,timeouts:v.results.filter(x=>x.timeout).length}));break;
      case 9:c.push(cell('accuracy','本题集正确率',v.accuracy,`${v.correct} / ${v.total} = ${show(v.accuracy)}`,{correct:v.correct,total:v.total},'四题离线样例，不能外推真实Agent能力。'));break;
      case 10:c.push(cell('gate','本地发布门槛',v.gate,`${show(v.accuracy)} ≥ ${v.threshold} → ${v.gate}`,{accuracy:v.accuracy,threshold:v.threshold},'只检查本课正确率门槛；不等于完成学习或真实交付验收。'));break;
    }
    return c;
  },[
    exp('repair-failures','只切换为补齐失败处理的方案','补齐拒答与超时后，固定分母4会发生什么？',{version:'baseline',normalize:'units',threshold:.75},{version:'repaired',normalize:'units',threshold:.75},'正确2变4，准确率0.5变1；分母均4，本地门槛false变true。',(a,b)=>a.result.correct===2&&b.result.correct===4&&a.result.total===4&&b.result.total===4&&a.result.accuracy===.5&&b.result.accuracy===1&&!a.result.gate&&b.result.gate&&a.result.results[3].timeout&&!b.result.results[3].timeout),
    exp('unit-rule','只切换为明确去单位比较','10 ms与10在两种比较规则下是否相等？',{version:'baseline',normalize:'strict',threshold:.75},{version:'baseline',normalize:'units',threshold:.75},'q1由不匹配变正确，其余保持；正确1变2，均未过0.75。',(a,b)=>a.result.correct===1&&b.result.correct===2&&!a.result.results[0].correct&&b.result.results[0].correct&&a.result.total===b.result.total&&!a.result.gate&&!b.result.gate)
  ]);

  models['hfagents-project']=model('有界读取只在有效观测后完成并提交内存回执；重放先按id找回执，再比较参数，失败不缓存。',(t,{f,v,previous})=>{
    const p=t.params,c=[];
    switch(f.line){
      case 1:c.push(cell('request-id','稳定任务身份',v.request.id,`request.id = ${v.request.id}`,{id:v.request.id},'所有状态仅在本次内存运行内。'),cell('request-question','任务参数',v.request.question,`request.question = ${v.request.question}`,{question:v.request.question}));break;
      case 2:c.push(cell('initial-calls','初始读取次数',v.calls,'calls = 0',{calls:v.calls}),cell('initial-evidence','初始观测槽',v.evidence,'evidence = null',{evidence:v.evidence}),cell('initial-answer','初始答案槽',v.answer,'answer = null',{answer:v.answer}));break;
      case 3:
        c.push(cell('read-calls','本次读取次数累加',v.calls,`${previous.calls} + 1 = ${v.calls}`,{before:previous.calls,increment:1}),cell('read-budget-left','剩余读取次数',p.budget-v.calls,`${p.budget} − ${v.calls} = ${p.budget-v.calls}`,{budget:p.budget,calls:v.calls}),cell('lookup-status','本次读取状态',v.lookupStatus,`fault=${p.fault}；call=${v.calls}；question=${p.question} → ${v.lookupStatus}`,{fault:p.fault,call:v.calls,question:p.question},'temporary_error没有观测；not_found是有效的缺资料观测。'),cell('evidence-value','本次实际观测',v.evidence?v.evidence.value:null,v.evidence?`lookup返回 ${v.evidence.id||'not_found'} → ${v.evidence.value}`:'读取临时失败 → evidence = null',{source:v.evidence?v.evidence.id:null,lookupStatus:v.lookupStatus}));break;
      case 4:c.push(cell('answer','依观测产生的答案',v.answer,`evidence=${v.evidence?v.evidence.id||'not_found':'null'} → answer=${show(v.answer)}`,{evidence:v.evidence},'预算耗尽的错误保留null，不能改写为资料不足。'));break;
      case 5:c.push(cell('completed','任务业务完成状态',v.completed,`answer=${show(v.answer)} !== null → ${v.completed}`,{answer:v.answer},'明确拒答可完成缺资料任务，但没有事实来源。'));break;
      case 6:
        c.push(cell('committed','实际提交回执数',v.committed,`completed=${v.completed} → ${v.completed?'set(run-1, receipt)':'不提交'} → size=${v.committed}`,{completed:v.completed,requestId:v.request.id},'仅内存Map；不写真实数据库或学习记录。'));
        if(v.receipt)c.push(cell('receipt-question','已提交回执参数',v.receipt.question,`receipt.question ← ${p.question}`,{requestQuestion:p.question}),cell('receipt-answer','已提交回执答案',v.receipt.answer,`receipt.answer ← ${show(v.answer)}`,{answer:v.answer}),cell('receipt-source','已提交事实来源',v.receipt.source,`receipt.source ← ${v.evidence.id===null?'null（not_found）':v.evidence.id}`,{evidenceId:v.evidence.id},'null来源的资料不足不能冒充查到事实。'));
        else c.push(cell('receipt','失败后的回执槽',v.receipt,'completed = false → receipt = null',{completed:v.completed}));break;
      case 7:c.push(cell('repeated-id','重放的任务id',v.repeated.id,`repeated.id ← request.id = ${v.request.id}`,{requestId:v.request.id}),cell('repeated-question','重放的任务参数',v.repeated.question,`replay=${p.replay} → repeated.question=${v.repeated.question}`,{replay:p.replay,originalQuestion:p.question}));break;
      case 8:
        c.push(cell('cache-hit','回执查找是否命中',v.cached!==null,`receipts.get(${v.repeated.id}) → ${v.cached?'hit':'miss'}`,{repeatedId:v.repeated.id,committed:v.committed}),cell('calls-after-cache','查回执后的读取次数',v.calls,`${previous.calls} + 0 次新读取 = ${v.calls}`,{callsBefore:previous.calls,extraReads:0},'命中回执不会再次读取。'));
        if(v.cached)c.push(cell('cached-question','命中回执中的原参数',v.cached.question,`cached.question = ${v.cached.question}`,{cachedQuestion:v.cached.question}));break;
      case 9:c.push(cell('replay-status','重放结果状态',v.replayStatus,`cached=${v.cached?'有':'无'}${v.cached?`；${v.cached.question} === ${v.repeated.question} → ${v.cached.question===v.repeated.question}`:''} → ${v.replayStatus}`,{cachedQuestion:v.cached?v.cached.question:null,repeatedQuestion:v.repeated.question},'同id异参数冲突；无回执则not_committed。'),cell('replayed-answer','实际重放答案',v.replayedAnswer,`replayStatus=${v.replayStatus} → ${show(v.replayedAnswer)}`,{replayStatus:v.replayStatus,cachedAnswer:v.cached?v.cached.answer:null},'conflict不返回另一问题的旧答案。'));break;
      case 10:c.push(cell('final-completed','本次结束 · 完成状态',v.final.completed,`final.completed ← answer !== null = ${v.final.completed}`,{answer:v.answer}),cell('final-calls','本次结束 · 实际读取次数',v.final.calls,`final.calls ← ${v.calls}`,{calls:v.calls,budget:p.budget}),cell('final-answer','本次结束 · 答案',v.final.answer,`final.answer ← ${show(v.answer)}`,{answer:v.answer}),cell('final-replay','本次结束 · 重放状态',v.final.replayStatus,`final.replayStatus ← ${v.replayStatus}`,{replayStatus:v.replayStatus},'本帧才展示已结束案例的核对，不提前读取trace.result。'));break;
    }
    return c;
  },[
    exp('retry-budget','只把一次故障后的读取预算1改为2','第一次临时失败时会不会提交一个资料不足回执？',{question:'sampling',fault:'once',budget:1,replay:'same'},{question:'sampling',fault:'once',budget:2,replay:'same'},'预算1失败无答案、无回执；预算2第二次成功10 ms，并可重放。',(a,b)=>!a.result.completed&&a.result.calls===1&&a.result.answer===null&&a.result.replayStatus==='not_committed'&&b.result.completed&&b.result.calls===2&&b.result.answer==='10 ms'&&b.result.source==='sampling-v1'&&b.result.replayStatus==='replayed'&&b.result.replayedAnswer==='10 ms'),
    exp('id-parameter-conflict','只改变同id重放的参数','相同id是否足以直接返回旧答案？',{question:'power',fault:'none',budget:2,replay:'same'},{question:'power',fault:'none',budget:2,replay:'conflict'},'首次都只读1次并得到3.3 V；重放同参数成功，异参数conflict且重放答案null。',(a,b)=>a.result.completed&&b.result.completed&&a.result.calls===1&&b.result.calls===1&&a.result.answer==='3.3 V'&&b.result.answer==='3.3 V'&&a.result.replayStatus==='replayed'&&a.result.replayedAnswer==='3.3 V'&&b.result.replayStatus==='conflict'&&b.result.replayedAnswer===null)
  ]);
  return {courseId:'hfagents',models};
});
