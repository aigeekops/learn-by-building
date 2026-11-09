/* Original FSDL 2022 companions: bounded local calculations, no services or records. */
(function(root,factory){const register=factory();if(typeof module!=='undefined'&&module.exports)module.exports=register;else register(root.AICourseModels);})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const record=rec;
  const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
  const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
  const choose=(id,label,options,value)=>({id,label,type:'select',options,value});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const bars=(title,rows,unit='')=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit});
  const flow=(title,rows)=>({kind:'flow',title,nodes:rows.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
  function rec(model,p,code){const steps=[];return {add(line,title,detail,variables,visual){steps.push(copy({line,title,detail,variables,visual}));},end(result){return {model,params:p,code:code.split('\n'),steps,result:copy(result)};}};}
  const sum=xs=>xs.reduce((a,b)=>a+b,0),mean=xs=>sum(xs)/xs.length;
  return function register(M){
    if(!M||typeof M.register!=='function')throw Error('FSDL requires AICourseModels.register');
    M.register('fsdl-metrics',[range('threshold','判为正类的分数阈值',.1,1,.1,.5),range('falsePositiveCost','一次误报的代价',1,5,1,2,'单位'),range('falseNegativeCost','一次漏报的代价',1,10,1,5,'单位')],p=>{
      const r=rec('fsdl-metrics',p,`const rows=[{score:.9,y:1},{score:.75,y:0},{score:.6,y:1},{score:.45,y:0},{score:.3,y:1},{score:.1,y:0}];
let tp=0,fp=0,fn=0,tn=0;
for(const row of rows){ const predicted=Number(row.score>=threshold);
  if(predicted&&row.y)tp++;else if(predicted)fp++;else if(row.y)fn++;else tn++; }
const precision=tp+fp?tp/(tp+fp):null,recall=tp/(tp+fn);
const accuracy=(tp+tn)/rows.length;
const penalty=fp*falsePositiveCost+fn*falseNegativeCost;`);
      const rows=[{score:.9,y:1},{score:.75,y:0},{score:.6,y:1},{score:.45,y:0},{score:.3,y:1},{score:.1,y:0}];
      r.add(1,'先固定任务、标签和数据','六个分数和标签都是本站小案例。代价单位仅用于比较规则，不是金融收益或业务实测。',{rows},bars('模型分数',rows.map((x,i)=>['样本'+(i+1),x.score])));
      let tp=0,fp=0,fn=0,tn=0;const checked=[];
      r.add(2,'把四种结果从零开始累计','真阳、假阳、假阴、真阴是不同事件，先数清楚，之后才能计算指标。',{tp,fp,fn,tn,checked},bars('混淆矩阵计数',[['TP',tp],['FP',fp],['FN',fn],['TN',tn]],'条'));
      rows.forEach((row,index)=>{
        const predicted=Number(row.score>=p.threshold);
        r.add(3,'第'+(index+1)+'条：先做阈值判断','等于阈值也判为正类；分数并非经过校准的真实概率。',{index,row,predicted},flow('预测与标签',[['分数',row.score,true],['预测',predicted,true],['标签',row.y,false]]));
        if(predicted&&row.y)tp++;else if(predicted)fp++;else if(row.y)fn++;else tn++;
        checked.push({...row,predicted,index});
        r.add(4,'将这条结果放进对应格子','计数只包含当前与之前已处理的样本；后续样本的判断还未加入。',{index,tp,fp,fn,tn,checked},bars('已处理结果',[['TP',tp],['FP',fp],['FN',fn],['TN',tn]],'条'));
      });
      const precision=tp+fp?tp/(tp+fp):null,recall=tp/(tp+fn);
      r.add(5,'精确率与召回率的分母不同','没有正类预测时精确率未定义，保持null，不将它伪造为0或100%。',{precision,recall},bars('可定义的比例',[...(precision===null?[]:[['precision',precision]]),['recall',recall]]));
      const accuracy=(tp+tn)/rows.length;
      r.add(6,'准确率相同也可能有不同影响','准确率把所有错误同等计数，尚未包含本任务对误报与漏报的不同代价。',{accuracy},bars('正确与错误比例',[['正确',accuracy],['错误',1-accuracy]]));
      const penalty=fp*p.falsePositiveCost+fn*p.falseNegativeCost;
      r.add(7,'根据明确规则复算代价','阈值要在验证集和任务约束下选择；这六条数据不能证明线上收益。',{penalty,falsePositiveCost:p.falsePositiveCost,falseNegativeCost:p.falseNegativeCost},bars('案例代价',[['误报',fp*p.falsePositiveCost],['漏报',fn*p.falseNegativeCost]],'单位'));
      return r.end({rows,checked,tp,fp,fn,tn,precision,recall,accuracy,penalty});
    });
    M.register('fsdl-data',[choose('split','数据划分规则',[['group','按实体分组'],['row','按行交替']],'group'),choose('fit','标准化统计使用的数据',[['train','只用训练集'],['all','错误地使用全部数据']],'train'),range('revision','数据修订号',0,2,1,0)],p=>{
      const r=rec('fsdl-data',p,`const rows=makeRows(revision); // 3个实体，每个实体2条记录
const signature=rows.map(r=>[r.id,r.x,r.y].join(':')).join('|');
const [train,validation]=splitRows(rows,split);
const fitRows=fit==='train'?train:rows; const center=mean(fitRows.map(r=>r.x));
const validationX=validation.map(r=>r.x-center);
const overlap=[...new Set(train.map(r=>r.group))].filter(g=>validation.some(r=>r.group===g));
const preprocessingLeak=fit!=='train';`);
      const rows=[0,2,4,6,8,10+p.revision].map((x,i)=>({id:'r'+i,group:['A','A','B','B','C','C'][i],x,y:x>=5?1:0}));
      r.add(1,'每条记录带上实体身份','同一个实体的相近记录若分到训练和验证两侧，验证可能在测记忆，而非对新实体的泛化。',{rows},bars('输入特征',rows.map(x=>[x.id,x.x])));
      const signature=rows.map(row=>[row.id,row.x,row.y].join(':')).join('|');
      r.add(2,'记录本次使用的完整小数据清单','教学模型展示可直接比较的清单字符串；正式制品应使用实际数据版本和密码学摘要，不把这个字符串当防篡改签名。',{signature,revision:p.revision},flow('数据版本',[['revision',p.revision,true],['清单',signature,true]]));
      const train=rows.filter((x,i)=>p.split==='group'?x.group!=='C':i%2===0),validation=rows.filter((x,i)=>p.split==='group'?x.group==='C':i%2!==0);
      r.add(3,'在拟合任何统计量前先划分','按实体分组把C留作验证；按行交替会让A/B/C全部跨边界出现。',{train,validation},flow('划分清单',[['训练',train.map(x=>x.id).join(','),true],['验证',validation.map(x=>x.id).join(','),true]]));
      const fitRows=p.fit==='train'?train:rows,center=mean(fitRows.map(x=>x.x));
      r.add(4,'只从允许使用的数据估计中心','即使没有读取验证标签，用验证特征估计预处理统计量也会污染这个严格保留验证集的流程。',{fitIds:fitRows.map(x=>x.id),center},bars('拟合预处理中心',[['center',center]]));
      const validationX=validation.map(x=>x.x-center);
      r.add(5,'把同一套转换应用到验证记录','验证集使用训练阶段的中心；不能为了让验证看起来舒服而重新拟合。',{validationX},bars('验证特征减中心',validationX.map((x,i)=>[validation[i].id,x])));
      const overlap=[...new Set(train.map(x=>x.group))].filter(g=>validation.some(x=>x.group===g));
      r.add(6,'独立检查实体有没有跨边界','分组的适用性取决于部署目标。这里目标是未见过的新实体，因此跨实体重叠是一个问题。',{overlap},bars('跨边界实体数',[['重叠',overlap.length]],'个'));
      const preprocessingLeak=p.fit!=='train';
      r.add(7,'把两个泄漏来源分别报告','实体划分错误与预处理泄漏彼此独立，修复一个不能替代检查另一个。',{preprocessingLeak,groupLeak:overlap.length>0},flow('验证独立性',[['实体重叠',overlap.length?'有':'无',true],['预处理泄漏',preprocessingLeak?'有':'无',true]]));
      return r.end({rows,signature,train,validation,center,validationX,overlap,preprocessingLeak});
    });
    M.register('fsdl-experiments',[range('rate','实验A学习率',.05,.4,.05,.1),range('epochs','更新次数',1,6,1,3),choose('evaluation','两次实验的验证版本',[['same','相同验证版本'],['changed','实验B更换了验证数据']],'same')],p=>{
      const r=rec('fsdl-experiments',p,`const runs=[{id:'A',lr:rate,data:'train-v1',validation:'val-v1'},{id:'B',lr:2*rate,data:'train-v1',validation:evaluation==='same'?'val-v1':'val-v2'}];
let weights=[0,0],history=[[],[]];
for(let epoch=1;epoch<=epochs;epoch++){weights=weights.map((w,i)=>w-runs[i].lr*2*(w-2));history.forEach((h,i)=>h.push({epoch,w:weights[i]}));}
const training=weights.map(w=>(w-2)**2);
const validation=weights.map((w,i)=>(w-(i===1&&evaluation==='changed'?2.5:1.5))**2);
const comparable=runs[0].validation===runs[1].validation;
const winner=comparable?(validation[0]<=validation[1]?'A':'B'):null;`);
      const runs=[{id:'A',lr:p.rate,data:'train-v1',validation:'val-v1'},{id:'B',lr:2*p.rate,data:'train-v1',validation:p.evaluation==='same'?'val-v1':'val-v2'}];
      r.add(1,'先记录条件，而不只抄一个分数','数据、代码、超参数与验证版本是实验身份的一部分；本例使用确定性标量目标，无随机训练或外部追踪服务。',{runs},flow('实验配置',runs.map(x=>[x.id,'lr='+x.lr+'; '+x.validation,true])));
      let weights=[0,0];const history=[[],[]];
      r.add(2,'相同起点便于比较这一个变量','两次实验初始w均为0，实验B学习率是A的两倍。不能把这种小例子的差别解释为一般的最佳学习率。',{weights,history},bars('初始参数',[['A',0],['B',0]]));
      for(let epoch=1;epoch<=p.epochs;epoch++){
        weights=weights.map((w,i)=>w-runs[i].lr*2*(w-2));history.forEach((h,i)=>h.push({epoch,w:weights[i]}));
        r.add(3,'更新'+epoch+'：保存当时的轨迹','每一步来自同一个训练目标(w−2)²；后续参数尚未进入当前快照。',{epoch,weights,history},bars('本轮参数',[['A',weights[0]],['B',weights[1]]]));
      }
      const training=weights.map(w=>(w-2)**2);
      r.add(4,'训练损失说明拟合了什么','训练目标相同，因此两次训练损失可比较，但它不自动决定哪一个模型更适合独立验证数据。',{training},bars('训练损失',[['A',training[0]],['B',training[1]]]));
      const validation=weights.map((w,i)=>(w-(i===1&&p.evaluation==='changed'?2.5:1.5))**2);
      r.add(5,'把独立验证结果连回具体版本','训练目标2与默认验证目标1.5不同，用于说明训练分数和选择指标可能排序不同；这不是统计泛化证明。',{validation},bars('验证损失',[['A',validation[0]],['B',validation[1]]]));
      const comparable=runs[0].validation===runs[1].validation;
      r.add(6,'先问能不能比，再问谁更好','验证版本改变时拒绝直接选优，应该让两个模型在同一个保留基准上重新评价。',{comparable},flow('比较条件',[['验证版本',comparable?'相同':'不同',true]]));
      const winner=comparable?(validation[0]<=validation[1]?'A':'B'):null;
      r.add(7,'保存选择依据和未解决问题','保留完整配置和两组分数。相同分数按稳定规则选A；不可比较时winner保持null。',{winner},flow('本次选择',[['winner',winner??'拒绝直接比较',true]]));
      return r.end({runs,weights,history,training,validation,comparable,winner});
    });
    M.register('fsdl-debugging',[range('weight','更新前参数w',0,4,.5,0),range('rate','学习率',.01,.8,.01,.1),choose('reduction','梯度归约',[['mean','与平均损失一致'],['sum','故意漏除样本数']],'mean')],p=>{
      const r=rec('fsdl-debugging',p,`const xs=[1,2],ys=[2,4];
const errors=xs.map((x,i)=>weight*x-ys[i]);
const loss=sum(errors.map(e=>e*e))/(2*xs.length);
const contributions=xs.map((x,i)=>x*errors[i]);
const gradient=sum(contributions)/(reduction==='mean'?xs.length:1);
const numerical=(halfMSE(weight+1e-5)-halfMSE(weight-1e-5))/(2e-5);
const nextWeight=weight-rate*gradient;
const nextLoss=halfMSE(nextWeight);`);
      const xs=[1,2],ys=[2,4];r.add(1,'从能手算的小数据开始','先验证训练程序与目标是否一致，不能只看曲线是否下降。这里是两点线性回归，不是完整神经网络调优。',{xs,ys,weight:p.weight},flow('训练点',xs.map((x,i)=>['x='+x,'y='+ys[i],false])));
      const errors=xs.map((x,i)=>p.weight*x-ys[i]);r.add(2,'预测与标签逐项对齐','每个误差都保留原来的样本索引，这样才能定位是模型、标签还是配对出了问题。',{errors},bars('逐点误差',errors.map((x,i)=>['e'+i,x])));
      const loss=sum(errors.map(e=>e*e))/(2*xs.length);r.add(3,'固定损失的平均与二分之一口径','本课使用平均半平方损失，梯度必须使用同一个样本数归约。',{loss},bars('更新前平均半平方损失',[['L',loss]]));
      const contributions=xs.map((x,i)=>x*errors[i]);r.add(4,'先分开计算各样本梯度贡献','链式法则给出x×误差；此刻还未完成样本维度的平均。',{contributions},bars('逐点梯度贡献',contributions.map((x,i)=>['样本'+i,x])));
      const gradient=sum(contributions)/(p.reduction==='mean'?xs.length:1);r.add(5,'让归约错误成为可复现反例','sum模式故意漏除样本数，与显示的平均损失不一致；即使损失下降也不代表梯度实现正确。',{gradient},bars('实现给出的梯度',[['g',gradient]]));
      const halfMSE=w=>mean(xs.map((x,i)=>(w*x-ys[i])**2))/2,numerical=(halfMSE(p.weight+1e-5)-halfMSE(p.weight-1e-5))/(2e-5);
      r.add(6,'用独立中心差分检查','中心差分只读取损失函数，没有复用解析梯度公式；浮点误差用容差解释。',{numerical,gradientError:Math.abs(gradient-numerical)},bars('两种梯度',[['实现',gradient],['数值差分',numerical]]));
      const nextWeight=p.weight-p.rate*gradient;r.add(7,'拿旧梯度更新一次参数','学习率过大和梯度口径错误会相互放大，先修计算再谈调参。',{nextWeight},bars('更新后的参数',[['w_next',nextWeight]]));
      const nextLoss=halfMSE(nextWeight);r.add(8,'重新前向评价结果','这里只评价这一次更新与两个样本。下降是一个观察结果，不是实现正确或独立验证通过的证明。',{nextLoss},bars('更新前后损失',[['前',loss],['后',nextLoss]]));
      return r.end({xs,ys,errors,loss,contributions,gradient,numerical,nextWeight,nextLoss});
    });
    M.register('fsdl-testing',[choose('suite','当前回归用例',[['smoke','普通输入 -2 / 2'],['boundary','边界 -1 / 0 / 1']],'boundary'),choose('bug','分类边界实现',[['fixed','正确：x >= 0'],['strict','缺陷：x > 0']],'strict'),choose('schema','数据契约',[['valid','字段与类型齐全'],['missing','缺少特征字段']],'valid'),choose('artifact','模型与配置版本',[['match','匹配'],['mismatch','不匹配']],'match')],p=>{
      const r=rec('fsdl-testing',p,`const dataValid=schema==='valid';
const cases=suite==='boundary'?[-1,0,1]:[-2,2];
const predict=x=>Number(bug==='fixed'?x>=0:x>0);
const checks=cases.map(x=>({x,expected:Number(x>=0),actual:predict(x)}));
const selectedTestsPass=checks.every(c=>c.expected===c.actual);
const independentBoundaryPass=predict(0)===1;
const artifactMatch=artifact==='match';
const releaseReady=dataValid&&selectedTestsPass&&independentBoundaryPass&&artifactMatch;`);
      const dataValid=p.schema==='valid';r.add(1,'数据契约先于模型分数','字段缺失时不能把后续计算当有效预测；模型测试也不能取代输入契约检查。',{dataValid},flow('数据检查',[['字段与类型',dataValid?'通过':'失败',true]]));
      const cases=p.suite==='boundary'?[-1,0,1]:[-2,2];r.add(2,'选一组能抓住具体缺陷的用例','普通输入不包含0，可能完全看不到大于和大于等于的差异。',{cases},flow('当前测试点',cases.map(x=>[String(x),'待判断',false])));
      const predict=x=>Number(p.bug==='fixed'?x>=0:x>0);r.add(3,'把实现与独立规则分开','参考规则明确为x≥0；候选实现允许切换成一个已知的边界缺陷。',{implementation:p.bug},flow('候选函数',[['边界',p.bug==='fixed'?'x >= 0':'x > 0',true]]));
      const checks=[];for(const x of cases){checks.push({x,expected:Number(x>=0),actual:predict(x)});r.add(4,'核对输入'+x,'期望来自规则，实际来自候选函数，不让测试调用同一实现生成期望。',{checks},bars('当前失败数',[['失败',checks.filter(c=>c.actual!==c.expected).length]],'条'));}
      const selectedTestsPass=checks.every(c=>c.expected===c.actual);r.add(5,'绿色只覆盖当前选中的用例','不能把没有被覆盖的输入或真实生产环境都说成已经通过。',{selectedTestsPass},flow('当前套件',[['结论',selectedTestsPass?'通过':'失败',true]]));
      const independentBoundaryPass=predict(0)===1;r.add(6,'单独检查没有偷换的边界0','新增一个针对已知风险的独立验证；这比机械增加不相干的覆盖率更有价值。',{independentBoundaryPass},flow('独立边界',[['x=0',independentBoundaryPass?'通过':'失败',true]]));
      const artifactMatch=p.artifact==='match';r.add(7,'检查模型与配置属于同一次制品','错误地搭配模型和预处理版本，也可能通过函数级测试。此处版本匹配是明确的教学输入。',{artifactMatch},flow('制品契约',[['版本配对',artifactMatch?'匹配':'拒绝',true]]));
      const releaseReady=dataValid&&selectedTestsPass&&independentBoundaryPass&&artifactMatch;r.add(8,'汇总有限检查的结果','所有检查通过只表示这个简化门禁通过，不证明线上质量、无所有缺陷或已经部署。',{releaseReady},flow('教学门禁',[['releaseReady',releaseReady,true]]));
      return r.end({dataValid,cases,checks,selectedTestsPass,independentBoundaryPass,artifactMatch,releaseReady});
    });
    M.register('fsdl-serving',[range('batch','每批请求数',1,4,1,2),range('workers','并行服务槽数',1,2,1,1),range('overhead','每批固定开销',2,10,1,4,'ms'),range('perItem','每条请求计算开销',1,6,1,3,'ms')],p=>{
      const r=rec('fsdl-serving',p,`const arrivals=[0,2,4,6,8,10];
const duration=overhead+batch*perItem; // 尾批按实际大小计算
const free=Array(workers).fill(0);const jobs=[];
for(const group of chunks(arrivals,batch)){const worker=argmin(free),start=max(free[worker],group.at(-1)),finish=start+overhead+group.length*perItem;free[worker]=finish;jobs.push({worker,start,finish,group});}
const latencies=jobs.flatMap(job=>job.group.map(arrival=>job.finish-arrival));
const p95=[...latencies].sort((a,b)=>a-b)[ceil(.95*latencies.length)-1];
const throughput=arrivals.length*1000/(max(...free)-arrivals[0]);`);
      const arrivals=[0,2,4,6,8,10];r.add(1,'先说清请求在什么时候到达','这是一段有限的确定性排队轨迹，不是线上负载生成器。每批等待组内最后一个请求到达。',{arrivals},bars('到达时间',arrivals.map((x,i)=>['r'+i,x]),'ms'));
      const duration=p.overhead+p.batch*p.perItem;r.add(2,'分开固定开销与逐条计算','批处理分摊固定开销，也可能让先到的请求等待凑批；尾批按真实条数计费。',{duration},bars('完整一批服务时间',[['固定',p.overhead],['逐条合计',p.batch*p.perItem]],'ms'));
      const free=Array(p.workers).fill(0),jobs=[];r.add(3,'初始化明确数量的服务槽','槽之间可并行，同一槽一次处理一批；不模拟GPU硬件、网络、缓存或多模型竞争。',{free,jobs},bars('槽最早空闲时间',free.map((x,i)=>['槽'+i,x]),'ms'));
      for(let i=0;i<arrivals.length;i+=p.batch){const group=arrivals.slice(i,i+p.batch),worker=free.indexOf(Math.min(...free)),start=Math.max(free[worker],group[group.length-1]),finish=start+p.overhead+group.length*p.perItem;free[worker]=finish;jobs.push({worker,start,finish,group,ids:group.map((_,j)=>i+j)});r.add(4,'安排第'+jobs.length+'批','先选最早空闲的槽，同时间选较小编号；再同时满足槽空闲和组内全部到达这两个条件。',{jobs,free,lastJob:jobs[jobs.length-1]},bars('各槽最早空闲',free.map((x,j)=>['槽'+j,x]),'ms'));}
      const latencies=jobs.flatMap(job=>job.group.map(arrival=>job.finish-arrival));r.add(5,'按每条请求计算端到端延迟','从请求到达算到该批结束，不能只用单批计算时间代替用户等待。',{latencies,meanLatency:mean(latencies)},bars('请求延迟',latencies.map((x,i)=>['r'+i,x]),'ms'));
      const p95=[...latencies].sort((a,b)=>a-b)[Math.ceil(.95*latencies.length)-1];r.add(6,'明确这个小样本分位数的定义','本例采用nearest-rank，六条样本的p95等于最大延迟；不把它当稳定的生产p95估计。',{p95},bars('本轨迹p95',[['p95',p95]],'ms'));
      const throughput=arrivals.length*1000/(Math.max(...free)-arrivals[0]);r.add(7,'吞吐和延迟来自不同分母','吞吐按整个观察窗口的完成请求数计算。增大批次和并行槽可能改变两项指标，应按任务要求比较。',{throughput,makespan:Math.max(...free)},bars('此有限轨迹吞吐',[['完成请求/秒',throughput]],'req/s'));
      return r.end({arrivals,duration,jobs,latencies,p95,throughput,makespan:Math.max(...free)});
    });
    M.register('fsdl-monitoring',[range('shift','当前高区间样本变化',-20,60,10,30,'条'),range('threshold','分布变化告警阈值',.05,.5,.05,.2),choose('labels','当前窗口标签状态',[['delayed','真实标签尚未返回'],['ready','标签已经核对']],'delayed'),range('window','反馈窗口样本数',4,8,1,8)],p=>{
      const r=rec('fsdl-monitoring',p,`const baseline=[80,20],current=[80-shift,20+shift];
const reference=normalize(baseline),observed=normalize(current);
const totalVariation=.5*sum(baseline.map((x,i)=>abs(x-current[i])))/100; // 两窗口均100条
const driftAlert=totalVariation>=threshold;
const feedback=labels==='ready'?[0,1,0,0,1,1,0,1].slice(0,window):null;
const errorRate=feedback?sum(feedback)/feedback.length:null;
const conclusion=driftAlert?'检查数据与任务质量':'继续观察，仍需标签核对';`);
      const baseline=[80,20],current=[80-p.shift,20+p.shift];r.add(1,'先保存两个窗口的分箱计数','两箱各自总量均为100；分箱是本站教学假设，真实高维数据需合理特征与窗口设计。',{baseline,current},bars('两个窗口的高区间条数',[['基准',baseline[1]],['当前',current[1]]],'条'));
      const reference=baseline.map(x=>x/100),observed=current.map(x=>x/100);r.add(2,'先归一化，避免混淆总量与比例','不同窗口大小时也应该分别除以各自的总数；这里保持100便于手算。',{reference,observed},bars('高区间比例',[['基准',reference[1]],['当前',observed[1]]]));
      const totalVariation=.5*sum(baseline.map((x,i)=>Math.abs(x-current[i])))/100;r.add(3,'计算一个有明确界限的分布差异','两箱总变差为比例绝对差之和的一半，范围0到1；它不等于模型错误率。',{totalVariation},bars('总变差距离',[['TV',totalVariation]]));
      const driftAlert=totalVariation>=p.threshold;r.add(4,'将信号与事先定义的阈值比较','等于阈值也告警。阈值来自本案例约定，不能用这一小例子推导真实业务阈值。',{driftAlert},flow('分布检查',[['告警',driftAlert?'是':'否',true]]));
      const feedback=p.labels==='ready'?[0,1,0,0,1,1,0,1].slice(0,p.window):null;r.add(5,'标签延迟时保留未知','0表示已核对正确，1表示已核对错误。没有标签就不制造实际质量分数。',{feedback},flow('反馈可用性',[['真实标签',feedback?'已返回':'尚未返回',true]]));
      const errorRate=feedback?sum(feedback)/feedback.length:null;r.add(6,'有标签后再算这个窗口的错误率','窗口很小，结果只覆盖这几条已核对反馈；不因分布没有报警而宣称质量没有问题。',{errorRate},bars('有标签窗口错误率',errorRate===null?[]:[['error rate',errorRate]]));
      const conclusion=driftAlert?'检查数据与任务质量':'继续观察，仍需标签核对';r.add(7,'把分布信号与任务结果分开交付','告警用于触发调查，不自动证明模型失效，更不自动启动训练或发布。',{conclusion},flow('下一步',[['建议',conclusion,true],['执行状态','未执行真实运维动作',false]]));
      return r.end({baseline,current,reference,observed,totalVariation,driftAlert,feedback,errorRate,conclusion});
    });
    M.register('fsdl-release',[range('score','候选离线质量',.7,.98,.02,.9),range('latency','候选回放p95',80,160,10,100,'ms'),choose('manifest','制品清单',[['complete','模型/配置/数据版本齐全'],['missing','缺少配置版本']],'complete'),range('canaryErrors','20条金丝雀中的错误数',0,5,1,1,'条')],p=>{
      const r=rec('fsdl-release',p,`const versions={champion:'v1',candidate:'v2'},traffic={v1:1,v2:0};
const offlinePass=score>=.88&&latency<=120;
const manifestPass=manifest==='complete';
const eligible=offlinePass&&manifestPass;
let state=eligible?'canary':'blocked';if(eligible){traffic.v1=.8;traffic.v2=.2;}
const canaryRate=eligible?canaryErrors/20:null; const rollback=eligible&&canaryRate>.1;
if(eligible){state=rollback?'rolled_back':'promoted';traffic.v1=rollback?1:0;traffic.v2=rollback?0:1;}
const active=traffic.v2===1?'v2':'v1';`);
      const versions={champion:'v1',candidate:'v2'},traffic={v1:1,v2:0},events=['prepared'];r.add(1,'先保留可以回去的旧版本','模型、数据和配置版本属于制品清单。这里仅演算有限状态机，不部署网络服务。',{versions,traffic,events},bars('当前流量比例',[['v1',1],['v2',0]]));
      const offlinePass=p.score>=.88&&p.latency<=120;r.add(2,'离线质量与延迟条件同时满足','本例约定score≥0.88且回放p95≤120ms；回放数字为输入，并非当前机器真实性能。',{offlinePass,score:p.score,latency:p.latency},flow('离线检查',[['质量',p.score>=.88?'通过':'失败',true],['延迟',p.latency<=120?'通过':'失败',true]]));
      const manifestPass=p.manifest==='complete';r.add(3,'检查这个候选能否被完整复现','缺少配置版本时拒绝进入流量切换，不能用较高模型分数掩盖制品缺项。',{manifestPass},flow('制品清单',[['模型与数据','已有版本',false],['配置版本',manifestPass?'齐全':'缺失',true]]));
      const eligible=offlinePass&&manifestPass;r.add(4,'合并门禁，不提前承诺上线','门禁通过才进入金丝雀；否则保持v1。',{eligible},flow('候选资格',[['eligible',eligible,true]]));
      let state=eligible?'canary':'blocked';if(eligible){traffic.v1=.8;traffic.v2=.2;}events.push(state);r.add(5,eligible?'只分配20%金丝雀流量':'门禁失败，跳过金丝雀',eligible?'v1仍服务80%，v2仅接收20%；这是一段设定的有限请求样本。':'候选未收到请求，因此没有金丝雀观测结果。',{state,traffic,events},bars('此刻流量比例',[['v1',traffic.v1],['v2',traffic.v2]]));
      const canaryRate=eligible?p.canaryErrors/20:null,rollback=eligible&&canaryRate>.1;r.add(6,eligible?'观察金丝雀，再决定下一步':'没有流量，就没有线上观测',eligible?'错误率严格大于0.1才回滚；等于阈值暂不回滚，真实系统还需样本量与置信度分析。':'canaryRate保持null；不把未执行的分支说成已成功或失败。',{canaryRate,rollback},bars('实际进入此案例分支的错误率',canaryRate===null?[]:[['canary',canaryRate]]));
      if(eligible){state=rollback?'rolled_back':'promoted';traffic.v1=rollback?1:0;traffic.v2=rollback?0:1;events.push(state);}r.add(7,'执行明确的最终切换','回滚回到保留的v1，晋升才把全部流量转给v2；被阻断时持续使用v1。',{state,traffic,events},bars('最终流量比例',[['v1',traffic.v1],['v2',traffic.v2]]));
      const active=traffic.v2===1?'v2':'v1';r.add(8,'把最终版本和证据一起保存','这份轨迹只证明本教学状态机的规则执行，不代表真实生产发布、稳定性或用户效果。',{active},flow('审计结果',[['active',active,true],['terminal',state,true]]));
      return r.end({versions,offlinePass,manifestPass,eligible,canaryRate,rollback,state,traffic,events,active});
    });
    M.register('fsdl-foundation-models',[
      choose('strategy','适配策略',[['head','冻结表示，仅训练线性头'],['full','同时更新表示与分类头']],'head'),range('rate','学习率',.05,.3,.05,.1)
    ],p=>{
      const r=record('fsdl-foundation-models',p,`const x=[1,2],encoder=[[1,0],[0,0.5]],head=[0.5,-0.5];
const features=encoder.map(row=>dot(row,x));
const prediction=dot(head,features),error=prediction-1;
const headGradient=features.map(h=>error*h);
const encoderGradient=head.map(w=>x.map(v=>error*w*v));
const newHead=head.map((w,j)=>w-rate*headGradient[j]);
const newEncoder=strategy==='full'?encoder.map((row,i)=>row.map((w,j)=>w-rate*encoderGradient[i][j])):encoder;
const after=dot(newHead,newEncoder.map(row=>dot(row,x)));`);
      const x=[1,2],encoder=[[1,0],[0,.5]],head=[.5,-.5];r.add(1,'先认识迁移学习的两个部分','人工2×2表示矩阵只是计算练习，不是预训练基础模型；真实模型还需核对权重、数据、许可与适用任务。',{x,encoder,head},flow('组成',[['表示','人工2×2矩阵',false],['任务头','2个权重',true]]));
      const features=encoder.map(row=>dot(row,x));r.add(2,'冻结表示可以复用特征','冻结表示意味着其参数不更新，不意味着输入或特征不会改变；真实训练还需处理eval/train行为。',{features},bars('当前表示',features.map((x,i)=>['h'+i,x])));
      const prediction=dot(head,features),error=prediction-1;r.add(3,'用下游目标生成误差','目标固定为1，本课使用半平方误差，避免把语言模型生成质量简化成这个标量。',{prediction,error,loss:.5*error**2},bars('下游任务',[['预测',prediction],['目标',1]]));
      const headGradient=features.map(h=>error*h),encoderGradient=head.map(w=>x.map(v=>error*w*v));r.add(5,'把梯度与可训练范围分开','完整微调时两层梯度都使用同一旧状态计算；不能先更新head再反传encoder。',{headGradient,encoderGradient,trainable:p.strategy==='full'?6:2,frozen:p.strategy==='full'?0:4},bars('可训练参数',[['任务头',2],['表示',p.strategy==='full'?4:0]]));
      const newHead=head.map((w,j)=>w-p.rate*headGradient[j]),newEncoder=p.strategy==='full'?encoder.map((row,i)=>row.map((w,j)=>w-p.rate*encoderGradient[i][j])):encoder;
      r.add(7,'按策略应用一次同时更新','冻结分支逐项保持encoder不变；这个区别可用张量断言验证。',{newHead,newEncoder},flow('更新范围',[['head',JSON.stringify(newHead),true],['encoder',JSON.stringify(newEncoder),p.strategy==='full']]));
      const after=dot(newHead,newEncoder.map(row=>dot(row,x)));r.add(8,'独立测试比训练损失更重要','一条训练样本上损失下降并不说明迁移有效。真实选择还需基线、独立评估、成本与失效案例。',{after,afterLoss:.5*(after-1)**2},bars('本样本损失',[['更新前',.5*error**2],['更新后',.5*(after-1)**2]]));
      return r.end({features,prediction,error,headGradient,encoderGradient,newHead,newEncoder,after,afterLoss:.5*(after-1)**2,trainable:p.strategy==='full'?6:2});
    });

    M.register('fsdl-ml-teams',[choose('missing','缺失的责任人',[['none','责任完整'],['data','缺数据负责人'],['review','缺独立评估负责人']],'none'),range('labelDays','标注所需工作日',1,5,1,2)],p=>{
      const r=record('fsdl-ml-teams',p,`const tasks=[specification,labels,training,evaluation,release];
const schedule=[];
for(const task of tasks){
  const dependencies=task.depends.map(id=>schedule.find(row=>row.id===id));
  const blocked=!task.owner||dependencies.some(row=>row.finish===null);
  const start=blocked?null:Math.max(0,...dependencies.map(row=>row.finish));
  const finish=blocked?null:start+task.days;
  schedule.push({...task,blocked,start,finish});
}
const ready=schedule.every(row=>!row.blocked);`);
      const tasks=[{id:'specification',label:'产品验收约定',owner:'产品负责人',days:1,depends:[]},{id:'labels',label:'标签与数据版本',owner:p.missing==='data'?null:'数据负责人',days:p.labelDays,depends:['specification']},{id:'training',label:'训练与基线',owner:'模型工程师',days:2,depends:['labels']},{id:'evaluation',label:'独立评估与风险',owner:p.missing==='review'?null:'评估负责人',days:1,depends:['training']},{id:'release',label:'运行与回滚交接',owner:'运行负责人',days:1,depends:['evaluation']}],schedule=[];
      r.add(1,'把交付拆成责任与证据','这是一个教学项目依赖图，不是现实团队的人效预测。产品验收、数据、模型、评估和运行各自需要明确的负责人。',{tasks,schedule:[]},flow('交接',[['产品→数据→模型→评估→运行','每步有负责人和产物',true]]));
      for(const task of tasks){const dependencies=task.depends.map(id=>schedule.find(row=>row.id===id)),blocked=!task.owner||dependencies.some(row=>row.finish===null),start=blocked?null:Math.max(0,...dependencies.map(row=>row.finish)),finish=blocked?null:start+task.days;
        schedule.push({...task,blocked,start,finish});r.add(8,task.label+'：'+(blocked?'等待补齐责任或依赖':'约定交付时间'),'空负责人或未完成依赖不会被自动当成验收通过。时间是本例给定的编排估计。',{schedule:copy(schedule)},flow('当前交接',schedule.map(x=>[x.label,x.blocked?'阻塞':x.start+'→'+x.finish+'工作日',!x.blocked])));
      }
      const ready=schedule.every(x=>!x.blocked),plannedDays=ready?schedule.at(-1).finish:null;r.add(10,'交接的结果应当可追责','模型文件之外，还应交接数据定义、风险、版本、监控和回滚入口。这里的ready只表示依赖图可排程，不代表人员已实际完成工作。',{ready,plannedDays},flow('排程状态',[['可排程',ready?'是':'否',true]]));
      return r.end({schedule,ready,plannedDays,blocked:schedule.filter(x=>x.blocked).map(x=>x.id)});
    });

    M.register('fsdl-ethics',[range('threshold','统一分类阈值',.3,.8,.1,.5),choose('coverage','评估覆盖',[['all','报告两个虚构分组'],['omit','反例：漏掉分组B']],'all')],p=>{
      const r=record('fsdl-ethics',p,`const rows=fictionalAuditRows();
const groups=coverage==='all'?['A','B']:['A'];
const audits=groups.map(group=>confusion(rows.filter(row=>row.group===group),threshold));
const fprGap=audits.length===2?Math.abs(audits[0].fpr-audits[1].fpr):null;
const fnrGap=audits.length===2?Math.abs(audits[0].fnr-audits[1].fnr):null;
const missingGroups=['A','B'].filter(group=>!groups.includes(group));`);
      const rows=[{group:'A',score:.9,label:1},{group:'A',score:.7,label:0},{group:'A',score:.6,label:1},{group:'A',score:.1,label:0},{group:'B',score:.8,label:1},{group:'B',score:.5,label:1},{group:'B',score:.4,label:0},{group:'B',score:.2,label:0}],groups=p.coverage==='all'?['A','B']:['A'];
      r.add(1,'先说明谁会受错误影响','八条数据与A/B分组完全虚构。伦理审查还包括目的、同意、隐私和申诉；不能用一个数替代这些判断。',{rows,threshold:p.threshold},flow('评估范围',[['样本',8,false],['分组','A、B（虚构）',true]]));
      r.add(2,'分母与覆盖一起公开','只报告容易的分组会掩盖失效。样本极少，不适合推断人群风险或统计显著性。',{groups,coverage:p.coverage},flow('纳入评估',groups.map(x=>[x,'纳入',true])));
      const covered=groups.map(group=>({group,count:rows.filter(row=>row.group===group).length}));r.add(2,'先留下各组的样本分母','样本覆盖与错误率是不同信息；没有纳入的组不能被默认当成零风险。',{covered},bars('已纳入样本数',covered.map(x=>[x.group,x.count])));
      const audits=[];
      for(const group of groups){let tp=0,fp=0,fn=0,tn=0;for(const row of rows.filter(x=>x.group===group)){const positive=row.score>=p.threshold;if(positive&&row.label)tp++;else if(positive)fp++;else if(row.label)fn++;else tn++;}const positives=tp+fn,negatives=fp+tn;audits.push({group,tp,fp,fn,tn,positives,negatives,fpr:negatives?fp/negatives:null,fnr:positives?fn/positives:null});r.add(3,'逐条计数分组 '+group,'假阳性率分母是实际负类，假阴性率分母是实际正类。空分母保持未知。',{audits:copy(audits)},bars('错误率',audits.flatMap(x=>[[x.group+' FPR',x.fpr],[x.group+' FNR',x.fnr]])));}
      const fprGap=audits.length===2?Math.abs(audits[0].fpr-audits[1].fpr):null,fnrGap=audits.length===2?Math.abs(audits[0].fnr-audits[1].fnr):null;r.add(5,'差异只指向继续调查的问题','差异为0也不是公平证明：定义、标签偏差、交叉分组和真实后果仍需检查。',{fprGap,fnrGap},flow('差异',[['FPR差',fprGap===null?'未知':fprGap,true],['FNR差',fnrGap===null?'未知':fnrGap,true]]));
      const missingGroups=['A','B'].filter(x=>!groups.includes(x));r.add(6,'把遗漏显式留在报告中','本例不自动给出上线许可。应让责任人解释后果、补采样本，准备人工复核、申诉和停止使用的路径。',{missingGroups,coverageComplete:missingGroups.length===0},flow('报告完整性',[['缺失分组',missingGroups.join('、')||'无',true]]));return r.end({audits,fprGap,fnrGap,missingGroups,coverageComplete:missingGroups.length===0});
    });

    M.register('fsdl-project-train',[range('rate','学习率',.1,.5,.1,.3),range('epochs','更新次数',1,6,1,4)],p=>{
      const r=record('fsdl-project-train',p,`const X=[[-1,-1],[-1,-0.5],[1,0.5],[1,1]],Y=[0,0,1,1];
let w=[0,0],b=0; const history=[];
for(let epoch=0;epoch<epochs;epoch++){
  const probabilities=X.map(x=>sigmoid(dot(w,x)+b));
  const errors=probabilities.map((value,i)=>value-Y[i]);
  const gradient=[0,1].map(j=>mean(errors.map((e,i)=>e*X[i][j])));
  w=w.map((value,j)=>value-rate*gradient[j]); b-=rate*mean(errors);
  history.push({epoch:epoch+1,w:[...w],b,loss:binaryCrossEntropy(X,Y,w,b)});
}
const validation=[[-0.75,-0.25],[0.75,0.25]].map(x=>sigmoid(dot(w,x)+b));`);
      const X=[[-1,-1],[-1,-.5],[1,.5],[1,1]],Y=[0,0,1,1];let w=[0,0],b=0;const history=[];const sigmoid=x=>1/(1+Math.exp(-x));
      r.add(1,'用最小训练核解释完整项目','四条二维数据仅用于浏览器复算；可下载项目另生成有组别划分的合成条纹图像，实际训练、保存模型、启动本地接口并验证回滚。',{X,Y,w,b,history:[]},flow('项目训练核',[['数据','4条二维特征',false],['模型','逻辑回归',false]]));
      r.add(2,'训练与验证不混用','先固定数据用途，再优化训练损失。独立实验报告还会保存数据和模型文件的SHA-256。',{validationX:[[-.75,-.25],[.75,.25]]},flow('用途',[['训练','求梯度',true],['验证','训练后检查',false]]));
      r.add(2,'零权重基线有可核对的损失','初始所有logit为0，概率为0.5，平均交叉熵为ln2。先保存基线，后续改善才有参照。',{initialLoss:Math.log(2)},bars('基线',[['BCE',Math.log(2)]]));
      for(let epoch=0;epoch<p.epochs;epoch++){const probabilities=X.map(x=>sigmoid(dot(w,x)+b)),errors=probabilities.map((v,i)=>v-Y[i]),gradient=[0,1].map(j=>mean(errors.map((e,i)=>e*X[i][j])));r.add(6,'更新前先核对平均梯度','本轮所有样本用相同旧权重；先汇总误差乘特征，再平均。',{probabilities,gradient},bars('本轮平均梯度',gradient.map((g,j)=>['dw'+j,g])));w=w.map((value,j)=>value-p.rate*gradient[j]);b-=p.rate*mean(errors);const loss=mean(X.map((x,i)=>{const z=dot(w,x)+b;return Math.max(z,0)-Y[i]*z+Math.log1p(Math.exp(-Math.abs(z)));}));history.push({epoch:epoch+1,w:[...w],b,loss});r.add(8,'训练更新 '+(epoch+1),'梯度来自同一旧状态；用稳定的logit交叉熵重新评估更新后损失。',{w:[...w],b,gradient,history:copy(history)},bars('当前权重',w.map((v,i)=>['w'+i,v])));}
      const validation=[[-.75,-.25],[.75,.25]].map(x=>sigmoid(dot(w,x)+b));r.add(10,'在未参与梯度的两条输入上检查','这个小样本结论没有泛化保证；完整实验另报告固定测试集与错误案例。',{validation,predictions:validation.map(x=>Number(x>=.5))},bars('验证概率',validation.map((v,i)=>['样本'+i,v])));return r.end({w,b,history,validation});
    });

    M.register('fsdl-project-serve',[choose('candidate','候选包检查',[['good','候选通过离线检查'],['hash','模型哈希不匹配'],['regression','候选出现回归']],'good'),range('canaryErrors','候选请求错误数',0,4,1,0)],p=>{
      const r=record('fsdl-project-serve',p,`let active='baseline',candidateTraffic=0;
const manifestValid=candidate!=='hash';
const offlinePassed=candidate==='good';
const eligible=manifestValid&&offlinePassed;
if(eligible)candidateTraffic=0.1;
const canaryRate=eligible?canaryErrors/20:null;
const rollback=eligible&&canaryRate>0.05;
if(eligible&&!rollback){active='candidate';candidateTraffic=1;}
if(rollback)candidateTraffic=0;`);
      let active='baseline',candidateTraffic=0;r.add(1,'把实验文件变成可检查的包','完整本地项目会真实加载模型和manifest。此浏览器案例只演示发布决策，不伪造HTTP日志。',{active,candidateTraffic},flow('当前服务',[['active',active,true]]));
      const manifestValid=p.candidate!=='hash';r.add(2,'先验证内容哈希与输入契约','哈希失配不允许继续使用候选模型。真实服务还需验证schema与有限输入。',{manifestValid},flow('制品验证',[['manifest',manifestValid?'匹配':'失配',true]]));
      const offlinePassed=p.candidate==='good',eligible=manifestValid&&offlinePassed;r.add(4,'离线回归失败就不试流量','候选只在两类检查都通过时进入试运行；未执行的请求统计保持未知。',{offlinePassed,eligible},flow('离线门槛',[['可试运行',eligible?'是':'否',true]]));
      if(eligible)candidateTraffic=.1;r.add(5,'先用小流量暴露运行问题','固定20个候选请求只是教学样本，不是生产统计保证。',{candidateTraffic,requests:eligible?20:null},bars('候选流量',[['比例',candidateTraffic]]));
      const canaryRate=eligible?p.canaryErrors/20:null,rollback=eligible&&canaryRate>.05;r.add(7,'边界写清楚再比较','错误率严格大于5%回滚，恰好5%不触发这条规则；真实策略需要更多证据和风险约束。',{canaryRate,rollback},flow('运行观测',[['错误率',canaryRate===null?'未执行':canaryRate,true]]));
      if(eligible&&!rollback){active='candidate';candidateTraffic=1;}if(rollback)candidateTraffic=0;r.add(9,'用健康检查确认最终版本','下载项目实际启动临时本地HTTP服务、发送有效与无效请求、触发坏包拒绝和版本回滚，并保存回执。',{active,candidateTraffic},flow('最终版本',[['active',active,true],['结果',!eligible?'阻断':rollback?'回滚':'晋升',true]]));return r.end({manifestValid,offlinePassed,eligible,canaryRate,rollback,active,candidateTraffic});
    });

  };
});
