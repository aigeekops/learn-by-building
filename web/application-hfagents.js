/* Original bounded Agents Course companions. Fixed policies, local data, no LLM or network. */
(function(root,factory){const register=factory();if(typeof module!=='undefined'&&module.exports)module.exports=register;else register(root.AICourseModels)})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
const select=(id,label,options,value)=>({id,label,type:'select',options,value});
const flow=(title,nodes)=>({kind:'flow',title,nodes:nodes.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
const bars=(title,rows,unit='')=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit});
const copy=x=>JSON.parse(JSON.stringify(x));
function rec(model,params,code){const steps=[];return{add(line,title,detail,variables,visual){steps.push(copy({line,title,detail,variables,visual}))},end(result){return{model,params,code:code.split('\n'),steps,result:copy(result)}}}}
const docs=[{id:'sampling-v1',tokens:['采样','周期'],value:'10 ms'},{id:'power-v1',tokens:['电源','电压'],value:'3.3 V'},{id:'log-v1',tokens:['日志','时间戳'],value:'毫秒'}];
const score=(terms,doc)=>terms.filter(t=>doc.tokens.includes(t)).length/terms.length;
return function register(M){
if(!M||typeof M.register!=='function')throw Error('HF Agents Course requires AICourseModels.register');
M.register('hfagents-state',[range('turns','保留的历史轮数',0,3,1,1),select('observation','有无本次工具结果',[['no','尚无结果'],['yes','已有来源结果']],'no'),select('tool','本次候选工具',[['read','读取资料'],['write','修改文件']],'read')],p=>{
const r=rec('hfagents-state',p,`const system={role:'system',content:'只读资料，保留来源'};
const task={role:'user',content:'采样周期是多少？'};
const history=turns===0?[]:previousTurns.slice(-turns);
const observation=hasObservation?{source:'sampling-v1',value:'10 ms'}:null;
const messages=[system,...history.flat(),task,...(observation?[{role:'tool',content:observation}]:[])];
const allowed=tool==='read';
const next=!allowed?'refuse':observation?'answer_with_source':'lookup';
const state={messageCount:messages.length,allowed,next};`);
const system={role:'system',content:'只读资料，保留来源'};r.add(1,'系统说明规定这次能力范围','消息角色有用途；工具能做什么由实际注册与执行边界决定，文字约束不等于技术权限。',{system},flow('约束',[['system',system.content,true]]));
const task={role:'user',content:'采样周期是多少？'};r.add(2,'把问题与环境资料分开','本轮问题是用户任务；后面返回的资料是证据，不是新的用户授权。',{task},flow('当前任务',[['user',task.content,true]]));
const history=Array.from({length:p.turns},(_,i)=>[{role:'user',content:'旧问题'+(i+1)},{role:'assistant',content:'旧回答'+(i+1)}]);r.add(3,'历史只有实际传入才进入上下文','这里每轮固定两条消息，历史只是本站设定的短文本。轮数不等于真实token数。',{history,historyMessages:history.length*2},bars('历史消息条数',[['已保留',history.length*2]],'条'));
const observation=p.observation==='yes'?{source:'sampling-v1',value:'10 ms'}:null;r.add(4,'工具结果作为可追溯的观测','只有参数选择已有观测时，才出现带source的结果；尚无观测时不提前编造答案。',{observation},flow('观测槽',[['source',observation?observation.source:'等待',!!observation],['value',observation?observation.value:'等待',!!observation]]));
const messages=[system,...history.flat(),task,...(observation?[{role:'tool',content:observation}]:[])];r.add(5,'本轮输入由这些消息组成','真实模型一般把消息经chat template序列化；本站只按角色计算结构，不实现特定模型tokenizer。',{messages,messageCount:messages.length},bars('本轮实际消息',[['system',1],['history',history.length*2],['user',1],['tool',observation?1:0]],'条'));
const allowed=p.tool==='read';r.add(6,'执行层检查工具是否在允许集合里','写文件不在只读工具集合中，即使生成文本建议调用也应拒绝。',{allowed,tool:p.tool},flow('能力边界',[['候选工具',p.tool,true],['允许集合','read',allowed]]));
const next=!allowed?'refuse':observation?'answer_with_source':'lookup';r.add(7,'选择下一步是预设策略','有来源就确定性摘录，无来源则读取，越界则拒绝。没有调用语言模型，也不展示或伪称模型内部思考。',{next},flow('下一状态',[[next,allowed?'按当前证据行动':'能力外请求被拒绝',true]]));
r.add(8,'形成可以重放的状态快照','页面回放的是一次本地计算得到的状态，而不是再次调用工具。',{state:{messageCount:messages.length,allowed,next}},flow('状态快照',[['messages',messages.length,false],['next',next,true]]));return r.end({messageCount:messages.length,historyMessages:history.length*2,allowed,next,observation});
});
M.register('hfagents-tools',[range('limit','请求条数 limit',0,4,1,2),select('name','请求的工具名',[['lookup','lookup'],['delete','delete（未注册）']],'lookup'),select('fault','工具环境',[['none','正常'],['timeout','超时']],'none')],p=>{
const r=rec('hfagents-tools',p,`const request={name,arguments:{limit}};
const registered=request.name==='lookup';
const valid=registered&&Number.isInteger(limit)&&limit>=1&&limit<=3;
let executed=false,response=null;
if(!valid)response={isError:true,kind:'contract'};
else{executed=true;response=fault==='timeout'?{isError:true,kind:'timeout'}:{isError:false,rows:documents.slice(0,limit)};}
const rows=response.isError?[]:response.rows;
const usable=!response.isError;
const receipt={executed,usable,count:rows.length};`);
const request={name:p.name,arguments:{limit:p.limit}};r.add(1,'先固定本次请求','schema描述字段，执行层再检查它们；浏览器只接收页面列出的有限值。',{request},flow('工具信封',[['name',p.name,true],['limit',p.limit,false]]));
const registered=p.name==='lookup';r.add(2,'名字必须解析到实际注册工具','未注册的delete不会退化成任意函数执行，也不会先执行再报错。',{registered},flow('注册表',[['lookup','已注册',registered],['delete','未注册',!registered]]));
const valid=registered&&Number.isInteger(p.limit)&&p.limit>=1&&p.limit<=3;r.add(3,'参数范围与类型属于契约','本例limit合法范围为1到3；0与4用于检查拒绝边界，不能悄悄截成合法值。',{valid,limit:p.limit},bars('本次请求值',[['limit',p.limit]],'条'));
let executed=false,response=null;r.add(4,'进入执行前状态','执行标志和结果槽先初始化；响应尚未产生，动画也不展示文档。',{executed,response},flow('调用状态',[['executed','false',true],['response','等待',false]]));
if(!valid){response={isError:true,kind:'contract'};r.add(5,'契约失败，工具不运行','名字或参数不合法时，输出结构化错误。无效请求不能产生成功文档。',{executed,response},flow('拒绝',[['contract','未调用工具',true]]));}
else{executed=true;response=p.fault==='timeout'?{isError:true,kind:'timeout'}:{isError:false,rows:docs.slice(0,p.limit)};r.add(6,p.fault==='timeout'?'工具已调用但超时':'工具执行后才产生文档','超时与契约失败分别报告；这次执行只读取内存样例，没有联网。',{executed,response},flow('执行返回',[[response.isError?'timeout':'documents',response.isError?'无可用文档':response.rows.map(x=>x.id).join(', '),true]]));}
const rows=response.isError?[]:response.rows;r.add(7,'错误响应不能冒充空的成功答案','消费方先看isError，再取rows；成功返回零条与执行失败是不同状态。',{rows,count:rows.length},bars('可消费文档数',[['rows',rows.length]],'条'));
const usable=!response.isError;r.add(8,'依据响应决定是否继续','调用成功也不自动证明资料支持问题，还要在RAG课检查来源与匹配。',{usable},flow('下游入口',[[usable?'继续证据检查':'处理失败','usable='+usable,true]]));
const receipt={executed,usable,count:rows.length};r.add(9,'记录这次调用的真实状态','回执只描述这个教学模型；不写入真实学习记录或外部系统。',{receipt},flow('调用回执',[['executed',executed,false],['usable',usable,true],['count',rows.length,false]]));return r.end({...receipt,error:response.isError?response.kind:null});
});
M.register('hfagents-loop',[range('budget','最多决策步数',1,6,1,4),select('scenario','预设反馈场景',[['success','首次读取成功'],['retry','第一次临时失败'],['stall','持续临时失败'],['fatal','不可恢复错误']],'retry')],p=>{
const r=rec('hfagents-loop',p,`let calls=0,observation=null,status='running',answer=null;
for(let step=1;step<=budget;step++){
  const action=observation?'final':'lookup';
  if(action==='final'){answer=observation.value;status='completed';break;}
  calls++;const feedback=lookupFixture(scenario,calls);
  if(feedback.kind==='fatal'){status='tool_error';break;}
  if(feedback.kind==='ok')observation=feedback.document;
}
if(status==='running')status='budget_exhausted';
const receipt={calls,status,answer};`);
let calls=0,observation=null,status='running',answer=null,decisions=0;const events=[];r.add(1,'初始化一轮有界任务','决策次数与工具调用次数分开计数；最后输出也占一个决策步骤。',{calls,observation,status,answer,decisions},flow('起点',[['任务','读取采样周期',true],['budget',p.budget,false]]));
r.add(2,'预算是停止条件的一部分','预算限制防止无限循环，不等同于任务成功；即使最后一次读到了资料，可能还没有进入输出步骤。',{budget:p.budget},bars('最多决策数',[['预算',p.budget]],'步'));
for(let step=1;step<=p.budget;step++){
 decisions=step;const action=observation?'final':'lookup';events.push({step,action});r.add(3,'决策 '+step+'：'+(action==='final'?'整理已有证据':'读取资料'),'策略由已有观测确定，页面没有运行LLM。',{step,decisions,action,calls},flow('本步动作',[[action,observation?'已有有效来源':'尚无有效来源',true]]));
 if(action==='final'){answer=observation.value;status='completed';r.add(4,'有证据后才输出答案','输出来自sampling-v1，而不是把工具报错或预算耗尽当成答案。',{answer,status,source:observation.source},flow('输出',[['sampling-v1',answer,true]]));break;}
 calls++;const kind=p.scenario==='fatal'?'fatal':p.scenario==='stall'||p.scenario==='retry'&&calls===1?'retryable':'ok';const feedback=kind==='ok'?{kind,document:{source:'sampling-v1',value:'10 ms'}}:{kind};events.at(-1).feedback=kind;r.add(5,'实际读取第 '+calls+' 次','失败反馈只包含错误类别，不包含虚构文档。临时失败会在下一预算步重试。',{calls,feedback},flow('返回观测',[[kind,kind==='ok'?'sampling-v1 · 10 ms':'无文档',true]]));
 if(kind==='fatal'){status='tool_error';r.add(6,'不可恢复错误立即停止','不把所有错误都无条件重试；此次状态没有成功答案。',{status,answer},flow('停止',[['tool_error','不再调用',true]]));break;}
 if(kind==='ok')observation=feedback.document;r.add(7,kind==='ok'?'接入成功观测':'保留无观测状态',kind==='ok'?'下一个决策步才能进入final。':'错误不是知识，observation仍为null。',{observation,calls},flow('下一轮输入',[['observation',observation?observation.source:'null',true]]));
}
if(status==='running')status='budget_exhausted';r.add(9,'核对停止原因','completed、tool_error、budget_exhausted分别表示不同结果，不能互相替代。',{status,calls,decisions,answer},flow('停止原因',[[status,answer===null?'未输出答案':answer,true]]));r.add(10,'保存可以独立复算的轨迹','回放不会再次执行lookup，也不伪称这是模型内部推理。',{receipt:{calls,status,answer}},bars('实际资源计数',[['决策',decisions],['工具调用',calls]],'次'));return r.end({calls,decisions,status,answer,events});
});
M.register('hfagents-context',[range('window','总预算（人工计量）',40,90,5,65,'单位'),range('reserve','预留输出',10,30,5,20,'单位'),select('memory','历史工具记录',[['full','保留全文24单位'],['summary','带来源摘要10单位']],'summary')],p=>{
const r=rec('hfagents-context',p,`const inputBudget=window-reserve;
const mandatory=[['system',12],['task',8],['constraint',6]];
const memory={source:'sampling-v1',fact:'周期10 ms',cost:memoryMode==='full'?24:10};
const required=[...mandatory,['memory',memory.cost]];
const requiredCost=required.reduce((s,x)=>s+x[1],0);
const fits=requiredCost<=inputBudget;
const selected=fits?[...required]:[];
if(fits&&requiredCost+12<=inputBudget)selected.push(['optional',12]);
const used=selected.reduce((s,x)=>s+x[1],0);
const status=fits?'ready':'refuse_missing_required';`);
const inputBudget=p.window-p.reserve;r.add(1,'先扣输出预留','本课用人工指定成本研究容量约束，不声称是某个模型tokenizer的真实计数。',{inputBudget,window:p.window,reserve:p.reserve},bars('预算分配',[['输入可用',inputBudget],['输出预留',p.reserve]],'人工单位'));
const mandatory=[['system',12],['task',8],['constraint',6]];r.add(2,'任务与约束不能被可选背景挤掉','系统说明、当前问题和只读约束一起构成必需部分。',{mandatory},bars('必需消息',mandatory,'人工单位'));
const memory={source:'sampling-v1',fact:'周期10 ms',cost:p.memory==='full'?24:10};r.add(3,'显式组织记忆中的事实与来源','摘要保留本例事实与来源；它更短不意味着任意摘要都无损。完整应用还应核对版本和丢失约束。',{memory},flow('长期记忆进入上下文',[['source',memory.source,false],['fact',memory.fact,true],['cost',memory.cost,false]]));
const required=[...mandatory,['memory',memory.cost]];r.add(4,'先收齐所有必需材料','本例记忆也是回答所需的证据，不能只装下问题就假装已经具备信息。',{required},bars('所需各部分',required,'人工单位'));
const requiredCost=required.reduce((s,x)=>s+x[1],0);r.add(5,'累计实际成本','固定开销26，再加本次记忆成本；这一步可手算复核。',{requiredCost},bars('必需总成本',[['required',requiredCost],['inputBudget',inputBudget]],'人工单位'));
const fits=requiredCost<=inputBudget;r.add(6,'容量不足时拒绝本次装入','不截断半条来源或把缺少资料的状态标为ready。',{fits},flow('容量判断',[['required ≤ inputBudget',fits,true]]));
const selected=fits?[...required]:[];r.add(7,'完整保留必需材料或保持空选择','失败时selected为空，清楚表明本次上下文不能用于作答。',{selected},flow('已选择',selected.length?selected.map(([k,n])=>[k,n,false]):[['无有效上下文','需要压缩或扩大预算',true]]));
if(fits&&requiredCost+12<=inputBudget)selected.push(['optional',12]);r.add(8,'有余量才加可选背景','可选记录不影响本例核心事实，只有整段放得下时才加入。',{selected},bars('当前装入',selected,'人工单位'));
const used=selected.reduce((s,x)=>s+x[1],0);r.add(9,'检查实际利用量','空位不等于缺信息，满窗口也不证明信息足够。',{used,remaining:inputBudget-used},bars('输入预算核对',[['已用',used],['剩余',inputBudget-used]],'人工单位'));
const status=fits?'ready':'refuse_missing_required';r.add(10,'形成可核对的上下文状态','这里没有摘要模型或真实持久化记忆服务，摘要文本与成本为本站给定值。',{status},flow('下一步',[[status,fits?'具备本例作答必需信息':'先补齐必需信息',true]]));return r.end({inputBudget,requiredCost,used,remaining:inputBudget-used,selected,status});
});
M.register('hfagents-smolagents',[range('quantity','样例数量',1,5,1,3),range('unitPrice','每个项目成本',5,15,1,12,'单位'),select('allow','是否注册计数工具',[['yes','已注册'],['no','未注册']],'yes')],p=>{
const r=rec('hfagents-smolagents',p,`const modelOutput='n=count_items("sensors"); final_answer(n*unitPrice)';
const toolRegistry=allow==='yes'?['count_items']:[];
const parsed={tool:'count_items',category:'sensors'};
const allowed=toolRegistry.includes(parsed.tool);
const toolCount=allowed?quantity:null;
const toolObservation=allowed?{n:toolCount}:null;
const amount=toolObservation?toolObservation.n*unitPrice:null;
const answer=amount===null?null:{amount,source:'inventory-fixture'};`);
const modelOutput='n=count_items("sensors"); final_answer(n*unitPrice)';r.add(1,'框架接收预设的模型输出','真实CodeAgent会请求模型生成Python。本页使用给定程序说明框架边界；不会eval或执行任意代码。',{modelOutput},flow('模型接口',[['ReplayModel','固定受控响应',true]]));
const toolRegistry=p.allow==='yes'?['count_items']:[];r.add(2,'工具由应用显式注册','未注册的名称不能因为生成代码中出现就被信任执行。',{toolRegistry},flow('工具注册',[['count_items',toolRegistry.length?'已注册':'未注册',true]]));
const parsed={tool:'count_items',category:'sensors'};r.add(3,'解释受控动作中的调用意图','页面中的解析结果是固定结构，不是Python解释器。实际框架代码在本地示例里验证。',{parsed},flow('调用',[['tool',parsed.tool,true],['category',parsed.category,false]]));
const allowed=toolRegistry.includes(parsed.tool);r.add(4,'检查工具边界后才产生计数','CodeAgent能运行代码不意味着应给任意文件、网络或安装权限。本站示例只给一个确定性只读工具。',{allowed},flow('授权集合',[['是否已注册',allowed,true]]));
const toolCount=allowed?p.quantity:null;r.add(5,allowed?'实际执行计数工具':'拒绝未注册工具','本页库存数量来自参数；本地离线框架示例通过真实工具回调返回同样计数。',{toolCount},bars('工具返回的项目数',toolCount===null?[]:[['count',toolCount]],'个'));
const toolObservation=allowed?{n:toolCount}:null;r.add(6,'框架把工具输出接回执行状态','无工具结果时保持null，不能把错误悄悄当成0个物品。',{toolObservation},flow('观测',[['n',toolObservation?toolObservation.n:'未产生',true]]));
const amount=toolObservation?toolObservation.n*p.unitPrice:null;r.add(7,'使用结果完成确定性计算','先拿到工具结果再乘每项成本。这里可以检验代码动作怎样组合工具与Python运算。',{amount,unitPrice:p.unitPrice},bars('计算金额',amount===null?[]:[['amount',amount]],'教学单位'));
const answer=amount===null?null:{amount,source:'inventory-fixture'};r.add(8,'以final_answer返回，失败则无答案','离线ReplayModel不验证LLM理解能力。本地真实CodeAgent执行只核验接口和工具调度，不调用真实模型。',{answer},flow('输出边界',[['answer',answer?answer.amount:'未输出',true],['source',answer?answer.source:'无',false]]));return r.end({allowed,toolCount,amount,answer});
});
M.register('hfagents-rag',[select('question','资料问题',[['sampling','采样频率对应的周期？'],['power','电源电压？'],['unknown','电机最大速度？']],'sampling'),range('budget','最多检索调用',1,2,1,2),range('topk','返回候选数上限',1,3,1,2),range('threshold','词项匹配阈值',0,1,.25,.75)],p=>{
const r=rec('hfagents-rag',p,`const queries=queryPlan[question];
let calls=0,evidence=[],answer=null;
for(const terms of queries.slice(0,budget)){
  calls++;
  const ranked=documents.map(d=>({...d,score:overlap(terms,d.tokens)})).sort(byScoreThenId);
  const hits=ranked.filter(d=>d.score>=threshold&&d.score>0).slice(0,topk);
  evidence=hits.filter(d=>supportsQuestion(d,question));
  if(evidence.length)break;
}
answer=evidence.length?evidence.map(d=>({source:d.id,value:d.value})):[{source:null,value:'资料不足'}];
const receipt={calls,evidenceCount:evidence.length,answer};`);
const queryPlan={sampling:[['采样','频率'],['采样','周期']],power:[['电源','电压']],unknown:[['电机','速度'],['转速','上限']]},queries=queryPlan[p.question];r.add(1,'先规定可复现的查询计划','本课将查询改写固定下来，解释Agentic RAG中的多步检索；不是LLM在实时规划。',{queries,documents:docs},flow('知识库',docs.map(d=>[d.id,d.tokens.join(' '),false])));
let calls=0,evidence=[],answer=null;const attempts=[];r.add(2,'初始化证据槽','原始文档给定并保留id，答案尚未产生。相似候选必须再经过支持性检查。',{calls,evidence,answer},flow('起点',[['evidence','空',true],['answer','等待',false]]));
for(const terms of queries.slice(0,p.budget)){
 calls++;r.add(4,'检索调用 '+calls+'：'+terms.join(' '),'耗尽调用预算时不继续无界改写。查询方案也不能凭空补出不存在的知识。',{calls,terms},flow('检索词',terms.map(t=>[t,'query',true])));
 const ranked=docs.map(d=>({...d,score:score(terms,d)})).sort((a,b)=>b.score-a.score||(a.id<b.id?-1:a.id>b.id?1:0));r.add(5,'按实际词项重合排序','score是查询词命中比例，不是真实embedding相似度，更不是答案正确率。',{ranked},bars('检索分数',ranked.map(d=>[d.id,d.score]),'比例'));
 const hits=ranked.filter(d=>d.score>=p.threshold&&d.score>0).slice(0,p.topk);r.add(6,'阈值与top-k共同筛选','显式要求score>0，避免阈值为0时把完全无关文档收进来。',{hits},flow('候选',hits.length?hits.map(d=>[d.id,d.score,true]):[['无候选','可在预算内改写',true]]));
 evidence=hits.filter(d=>p.question==='sampling'?d.id==='sampling-v1':p.question==='power'?d.id==='power-v1':false);attempts.push({terms,hitIds:hits.map(d=>d.id),evidenceIds:evidence.map(d=>d.id)});r.add(7,'再检查资料能否支持当前问题','支持规则是本站人工给定的真值检查。一般应用需要独立评测支持性，不能只看检索分数。',{evidence,evidenceCount:evidence.length},flow('可引用证据',evidence.length?evidence.map(d=>[d.id,d.value,true]):[['无支持证据','保持无答案',true]]));
 if(evidence.length)break;
}
answer=evidence.length?evidence.map(d=>({source:d.id,value:d.value})):[{source:null,value:'资料不足'}];r.add(10,evidence.length?'按来源摘录':'明确资料不足','输出仅使用本次证据，不编造电机速度，也不声称真实向量数据库检索。',{answer},flow('可追溯回答',answer.map(x=>[x.source||'无来源',x.value,true])));
r.add(11,'复算检索调用与支持数','这份轨迹来自内存资料；部署中的检索索引、权限与版本需另外验证。',{receipt:{calls,evidenceCount:evidence.length,answer}},bars('本次检索资源',[['调用数',calls],['支持证据',evidence.length]],'次/条'));return r.end({calls,evidenceCount:evidence.length,answer,attempts});
});
M.register('hfagents-evaluation',[select('version','待评测方案',[['baseline','原始方案'],['repaired','补齐失败处理']],'baseline'),select('normalize','答案判定',[['strict','原样比较'],['units','去除案例单位后比较']],'units'),range('threshold','本地发布最低正确率',.25,1,.25,.75,'比例')],p=>{
const r=rec('hfagents-evaluation',p,`const cases=heldOutFixtures(version);
const results=[];
for(const c of cases){
  const equal=c.predicted!==null&&normalize(c.predicted)===normalize(c.gold);
  const grounded=c.predicted==='资料不足'||c.source!==null;
  results.push({id:c.id,correct:equal&&grounded,timeout:c.predicted===null});
}
const correct=results.filter(x=>x.correct).length;
const accuracy=correct/cases.length;
const gate=accuracy>=threshold;`);
const cases=[{id:'q1',gold:'10',predicted:'10 ms',source:'sampling-v1'},{id:'q2',gold:'3.3',predicted:'3.3',source:'power-v1'},{id:'q3',gold:'资料不足',predicted:p.version==='repaired'?'资料不足':'5',source:null},{id:'q4',gold:'42',predicted:p.version==='repaired'?'42':null,source:p.version==='repaired'?'fixture-42':null}],results=[];r.add(1,'先固定独立题集与判定规则','四题是本站小样例，不是GAIA官方分数。改方案时使用同一题集；最终还需要新的未见任务。',{cases},flow('评测题集',cases.map(c=>[c.id,'gold已固定',false])));
r.add(2,'保留每题结果，失败不能从分母消失','超时也算一次未完成任务；只统计成功返回的题目会抬高正确率。',{results},flow('评测记录',[['结果列表','空',true]]));
const normalize=x=>p.normalize==='units'?String(x).trim().replace(/\s*(?:ms|V)$/,'').trim():String(x);
for(const c of cases){const equal=c.predicted!==null&&normalize(c.predicted)===normalize(c.gold);r.add(4,'检查 '+c.id+' 的答案匹配','规范化只按本课明确的单位规则，不使用模糊字符串相似度冒充语义正确。',{caseId:c.id,gold:c.gold,predicted:c.predicted,equal},flow('逐题比较',[['gold',c.gold,false],['predicted',c.predicted===null?'超时':c.predicted,true]]));const grounded=c.predicted==='资料不足'||c.source!==null;r.add(5,'检查 '+c.id+' 的引用条件','该规则只查来源字段存在，不能证明引用真正支持答案；资料不足允许明确拒答。',{caseId:c.id,grounded,source:c.source},flow('来源检查',[['source',c.source||'无',grounded]]));results.push({id:c.id,correct:equal&&grounded,timeout:c.predicted===null});r.add(6,'记下 '+c.id+' 的可核对结果','单题结果写入后才更新动画中的通过格；未评测的题保持等待。',{results:[...results]},bars('已判定正确题数',[['correct',results.filter(x=>x.correct).length]],'题'));}
const correct=results.filter(x=>x.correct).length;r.add(8,'汇总分子','固定四题全部参与分母，包括超时与无依据输出。',{correct,total:cases.length},bars('任务结果',[['正确',correct],['未通过',cases.length-correct]],'题'));
const accuracy=correct/cases.length;r.add(9,'计算本题集正确率','这不是能力证书，也不能从四题外推真实生产效果。修复基线后的提升还应在新题集复验。',{accuracy},bars('本地正确率',[['accuracy',accuracy]],'比例'));
const gate=accuracy>=p.threshold;r.add(10,'按预先声明阈值形成简化门禁','门禁仅使用本课正确率；真实交付还要考虑失败类别、成本、延迟与任务风险。',{gate,threshold:p.threshold},flow('本地评测结论',[[gate?'通过本地门槛':'未过本地门槛',accuracy+' / '+p.threshold,true]]));return r.end({correct,total:cases.length,accuracy,gate,results});
});
M.register('hfagents-project',[select('question','项目请求',[['sampling','采样周期'],['power','电源电压'],['unknown','未知速度']],'sampling'),select('fault','读取故障',[['none','正常'],['once','第一次临时失败'],['permanent','持续失败']],'once'),range('budget','最多读取次数',1,3,1,2),select('replay','重放同一请求ID',[['same','参数相同'],['conflict','参数改变']],'same')],p=>{
const r=rec('hfagents-project',p,`const request={id:'run-1',question};
let calls=0,evidence=null,answer=null;
while(calls<budget&&!evidence){calls++;evidence=lookupFixture(question,fault,calls);}
if(evidence)answer=evidence.value;
const completed=answer!==null;
const receipts=new Map();if(completed)receipts.set(request.id,{question,answer,source:evidence?.id||null});
const repeated={id:request.id,question:replay==='same'?question:'changed-question'};
const cached=receipts.get(repeated.id);
const replayStatus=!cached?'not_committed':cached.question===repeated.question?'replayed':'conflict';
const final={completed,calls,answer,replayStatus};`);
const request={id:'run-1',question:p.question};r.add(1,'给一次任务一个稳定身份','请求id用于复验同一任务；幂等规则不能只看id，还要比较参数。所有状态只在这次内存运行里存在。',{request},flow('任务身份',[['id',request.id,true],['question',p.question,false]]));
let calls=0,evidence=null,answer=null;r.add(2,'初始化重试与证据','没有观测就不输出答案；读取失败与知识库没有这条事实分开报告。',{calls,evidence,answer},flow('初始状态',[['evidence','null',false],['answer','null',true]]));
while(calls<p.budget&&!evidence){calls++;const transient=p.fault==='permanent'||p.fault==='once'&&calls===1;const id=p.question==='sampling'?'sampling-v1':p.question==='power'?'power-v1':null;evidence=transient?null:id?docs.find(d=>d.id===id):{id:null,value:'资料不足'};r.add(3,'受预算约束读取第 '+calls+' 次','未知问题的正常返回是明确资料不足；临时读取故障没有答案，不能伪装成一次已完成检索。',{calls,evidence,lookupStatus:transient?'temporary_error':id?'found':'not_found'},flow('读取结果',[[transient?'error':id||'not_found',evidence?evidence.value:'无观测',true]]));}
if(evidence)answer=evidence.value;r.add(4,'依据有效观测作答或保持失败','只有实际收到的found/not_found观测能产生答案；预算耗尽后的临时故障不能自动转成资料不足。',{answer},flow('项目输出',[['answer',answer===null?'未输出':answer,true]]));
const completed=answer!==null;r.add(5,'区分任务完成与答案有知识依据','明确拒答可表示正确完成一个缺知识任务，但没有事实来源；临时故障则仍为失败。',{completed},flow('业务状态',[[completed?'completed':'failed',answer===null?'需要处理故障':answer,true]]));
const receipts=new Map();if(completed)receipts.set(request.id,{question:p.question,answer,source:evidence.id});r.add(6,'完成后才提交请求回执','本例不写真实数据库或个人学习记录。失败不提交，避免下次重试被错误缓存拦住。',{committed:receipts.size,receipt:receipts.get(request.id)||null},bars('有效回执',[['已提交',receipts.size]],'条'));
const repeated={id:request.id,question:p.replay==='same'?p.question:'changed-question'};r.add(7,'重放时重新核对身份与参数','相同id但不同question属于冲突；不能返回另一问题的旧答案。',{repeated},flow('重放输入',[['id',repeated.id,false],['question',repeated.question,true]]));
const cached=receipts.get(repeated.id);r.add(8,'先查回执，不重复读取','已提交的相同请求可以直接读回；这步不增加工具调用计数。',{cached:cached||null,calls},flow('回执查找',[['cache',cached?'hit':'miss',true]]));
const replayStatus=!cached?'not_committed':cached.question===repeated.question?'replayed':'conflict';r.add(9,'区分命中、冲突与未提交','幂等性不是“所有重复都成功”。冲突时拒绝返回内容，未提交时可以另行重试。',{replayStatus,replayedAnswer:replayStatus==='replayed'?cached.answer:null},flow('重放结果',[[replayStatus,replayStatus==='replayed'?cached.answer:'无重放答案',true]]));
r.add(10,'给完整小作品留下验证清单','检查输入、证据、输出、预算和回执。本地示例会用临时目录写JSON回执并验证重放。',{final:{completed,calls,answer,replayStatus}},bars('本次实际计数',[['读取调用',calls],['回执',receipts.size]],'次/条'));return r.end({completed,calls,answer,source:evidence?.id||null,replayStatus,replayedAnswer:replayStatus==='replayed'?cached.answer:null});
});
};
});
