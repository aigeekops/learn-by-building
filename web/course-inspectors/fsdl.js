/* FSDL: inspect only the recorded prefix; all experiments rerun the original local models. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const n=x=>typeof x==='number'?String(Number(x.toFixed(4))):String(x);
  const has=(v,k)=>Object.hasOwn(v,k);
  const sum=xs=>xs.reduce((a,b)=>a+b,0);
  const dot=(a,b)=>sum(a.map((x,i)=>x*b[i]));
  const near=(a,b)=>Math.abs(a-b)<1e-10;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const cell=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note});
  const exp=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const snapshot=(t,i)=>Object.assign({},...t.steps.slice(0,i+1).map(s=>s.variables));
  function frame(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0));return {i,f:t.steps[i],v:snapshot(t,i)};}
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const s=frame(t,index);return {title:s.f.title,summary:'格子只使用本步及此前记录，数值显示至四位小数，公式用完整精度验证。'+s.f.detail,cells:inspect(t,s)};},experiments};}
  const models={};

  models['fsdl-metrics']=model('先把每个阈值决定落到混淆矩阵的一个格，再用不同分母和错误代价解释指标。',(t,{v})=>{
    const p=t.params,c=[];
    v.rows.forEach((r,i)=>c.push(cell('sample-'+i,'样本 '+i+' 的已知标签',r.y,`${n(r.score)} 分；标签 = ${r.y}`,{score:r.score,label:r.y},'六条人工案例数据；分数不是校准概率，本格尚未宣称做过预测。')));
    if(v.row)c.push(cell('prediction','最近一次阈值判断',v.predicted,`Number(${n(v.row.score)} ≥ ${n(p.threshold)}) = ${v.predicted}`,{score:v.row.score,threshold:p.threshold,index:v.index},'等于阈值判正；只有已到达的判断帧才显示结果。'));
    if(v.checked){
      v.checked.forEach(r=>{const bucket=r.predicted?(r.y?'tp':'fp'):(r.y?'fn':'tn');c.push(cell('checked-'+r.index,'已入格样本 '+r.index,bucket,`预测 ${r.predicted}，标签 ${r.y} → ${bucket.toUpperCase()}`,{score:r.score,predicted:r.predicted,label:r.y},'只含已处理记录；判断帧中当前样本尚未入格。'));});
      for(const key of ['tp','fp','fn','tn']){const terms=v.checked.map(r=>Number((r.predicted?(r.y?'tp':'fp'):(r.y?'fn':'tn'))===key));c.push(cell('count-'+key,key.toUpperCase()+' 累计',v[key],`${terms.length?terms.join(' + '):'0'} = ${v[key]}`,{processed:v.checked.length,indicators:terms},'四格计数仅使用当前及此前已入格的样本。'));}
    }
    if(has(v,'precision'))c.push(cell('precision','精确率',v.precision,v.tp+v.fp?`${v.tp} / (${v.tp} + ${v.fp}) = ${n(v.precision)}`:`${v.tp} / (${v.tp} + ${v.fp}) → 分母0，未定义`,{tp:v.tp,fp:v.fp},'没有正类预测时保留null。'));
    if(has(v,'recall'))c.push(cell('recall','召回率',v.recall,`${v.tp} / (${v.tp} + ${v.fn}) = ${n(v.recall)}`,{tp:v.tp,fn:v.fn},'分母为实际正类，本案例固定3条。'));
    if(has(v,'accuracy'))c.push(cell('accuracy','准确率',v.accuracy,`(${v.tp} + ${v.tn}) / ${v.rows.length} = ${n(v.accuracy)}`,{tp:v.tp,tn:v.tn,total:v.rows.length},'正确与错误等权；不能替代代价指标。'));
    if(has(v,'penalty'))c.push(cell('penalty','案例错误代价',v.penalty,`${v.fp} × ${p.falsePositiveCost} + ${v.fn} × ${p.falseNegativeCost} = ${v.penalty}`,{fp:v.fp,fn:v.fn,falsePositiveCost:p.falsePositiveCost,falseNegativeCost:p.falseNegativeCost},'单位由教学规则给定，不是线上收益。'));
    return c;
  },[
    exp('threshold','只提高分类阈值','0.5改为0.8，误报与漏报会怎样交换？',{threshold:.5},{threshold:.8},'TP由2变1，FP由1变0，FN由1变2；默认代价7变10。',(a,b)=>a.result.tp===2&&b.result.tp===1&&a.result.fp===1&&b.result.fp===0&&a.result.fn===1&&b.result.fn===2&&a.result.penalty===7&&b.result.penalty===10),
    exp('cost','只提高漏报代价','预测完全不变，漏报单价5改为10，准确率和代价如何变化？',{falseNegativeCost:5},{falseNegativeCost:10},'准确率与四格不变，总代价由7变12。',(a,b)=>same(a.result.checked,b.result.checked)&&a.result.accuracy===b.result.accuracy&&a.result.penalty===7&&b.result.penalty===12)
  ]);

  models['fsdl-data']=model('用每条记录的实体、划分与中心减法，分开定位实体重叠和预处理读取验证数据的两种泄漏。',(t,{v})=>{
    const p=t.params,c=[];
    v.rows.forEach((r,i)=>c.push(cell('row-'+r.id,r.id+' 的标签',r.y,`x = ${r.x}；Number(${r.x} ≥ 5) = ${r.y}`,{id:r.id,group:r.group,x:r.x,revision:p.revision},i===5?'最后一条特征为10+revision；修订不会自动改写历史数据。':'A/B/C每实体两条人工记录。')));
    if(v.signature)c.push(cell('signature','本次数据清单',v.signature,v.rows.map(r=>`${r.id}:${r.x}:${r.y}`).join(' | '),{revision:p.revision,records:v.rows.length},'可读清单字符串，不是密码学摘要。'));
    if(v.train)v.rows.forEach((r,i)=>{const training=v.train.some(x=>x.id===r.id);c.push(cell('split-'+r.id,r.id+' 的用途',training?'train':'validation',p.split==='group'?`${r.group} ≠ C → ${training} → ${training?'train':'validation'}`:`${i} % 2 = ${i%2} → ${training?'train':'validation'}`,{id:r.id,group:r.group,index:i,rule:p.split},'先划分再拟合统计；此例目标为新实体泛化。'));});
    if(has(v,'center')){const xs=v.fitIds.map(id=>v.rows.find(r=>r.id===id).x);c.push(cell('center','预处理中心',v.center,`(${xs.join(' + ')}) / ${xs.length} = ${n(v.center)}`,{fitIds:v.fitIds,fitValues:xs,fit:p.fit},p.fit==='train'?'只用训练特征。':'反例读取了保留验证集特征。'));}
    if(v.validationX)v.validationX.forEach((x,i)=>c.push(cell('validation-'+v.validation[i].id,v.validation[i].id+' 转换后特征',x,`${v.validation[i].x} − ${n(v.center)} = ${n(x)}`,{id:v.validation[i].id,x:v.validation[i].x,center:v.center},'沿用拟合中心，不对验证记录重新估计。')));
    if(v.overlap)c.push(cell('overlap','跨划分实体数',v.overlap.length,`{${[...new Set(v.train.map(r=>r.group))].join(',')}} ∩ {${[...new Set(v.validation.map(r=>r.group))].join(',')}} = {${v.overlap.join(',')}} → ${v.overlap.length}`,{trainingGroups:[...new Set(v.train.map(r=>r.group))],validationGroups:[...new Set(v.validation.map(r=>r.group))]},'新实体任务中重叠是问题；其他部署目标需另定切分规则。'));
    if(has(v,'preprocessingLeak'))c.push(cell('preprocessing-leak','预处理泄漏判断',v.preprocessingLeak,`fit '${p.fit}' ≠ 'train' → ${v.preprocessingLeak}`,{fit:p.fit,fitIds:v.fitIds},'是否看过验证标签不是唯一泄漏条件。'));
    return c;
  },[
    exp('group-split','只改为按行划分','实体A/B/C的两条记录会不会分到两侧？',{split:'group'},{split:'row'},'分组无重叠；按行后A/B/C全重叠，中心由3变4。',(a,b)=>a.result.overlap.length===0&&same(b.result.overlap,['A','B','C'])&&a.result.center===3&&b.result.center===4),
    exp('fit-scope','只扩大中心拟合范围','训练和验证ID保持不变，读取全部特征会怎样改变中心？',{fit:'train'},{fit:'all'},'中心3变5，验证转换[5,7]变[3,5]，明确报告预处理泄漏。',(a,b)=>same(a.result.train,b.result.train)&&a.result.center===3&&b.result.center===5&&same(a.result.validationX,[5,7])&&same(b.result.validationX,[3,5])&&!a.result.preprocessingLeak&&b.result.preprocessingLeak),
    exp('revision','只修订最后一条记录','分组与训练中心不变，数据清单与最后验证值会不会变？',{revision:0},{revision:2},'训练中心仍3；清单变化且最后验证值7变9。',(a,b)=>a.result.signature!==b.result.signature&&a.result.center===3&&b.result.center===3&&a.result.validationX[1]===7&&b.result.validationX[1]===9)
  ]);

  models['fsdl-experiments']=model('每轮参数由真实旧权重与梯度更新；只有验证版本相同，最终两组分数才允许选优。',(t,{v})=>{
    const p=t.params,c=[];
    v.runs.forEach((r,j)=>c.push(cell('run-'+r.id,'实验 '+r.id+' 学习率',r.lr,`${j?'2 × ':''}${n(p.rate)} = ${n(r.lr)}；验证 ${r.validation}`,{rate:p.rate,multiplier:j?2:1,data:r.data,validation:r.validation},'确定性标量训练，未连接实验追踪服务。')));
    if(v.weights)v.weights.forEach((w,j)=>{const h=v.history[j],old=h.length>1?h[h.length-2].w:0;c.push(cell('weight-'+j,`实验 ${v.runs[j].id} 已记录权重`,w,h.length?`${n(old)} − ${n(v.runs[j].lr)} × 2 × (${n(old)} − 2) = ${n(w)}`:'初始权重 = 0',{epoch:h.length,oldWeight:old,rate:v.runs[j].lr,target:2},'只复算已保存的本轮；后续轮次不在此快照。'));});
    if(v.training)v.training.forEach((loss,j)=>c.push(cell('training-'+j,'实验 '+v.runs[j].id+' 训练损失',loss,`(${n(v.weights[j])} − 2)² = ${n(loss)}`,{weight:v.weights[j],target:2},'相同训练目标，可比较训练拟合程度。')));
    if(v.validation)v.validation.forEach((loss,j)=>{const target=j===1&&p.evaluation==='changed'?2.5:1.5;c.push(cell('validation-'+j,'实验 '+v.runs[j].id+' 验证损失',loss,`(${n(v.weights[j])} − ${target})² = ${n(loss)}`,{weight:v.weights[j],target,version:v.runs[j].validation},'分数必须连同验证版本解释。'));});
    if(has(v,'comparable'))c.push(cell('comparable','是否允许直接比较',v.comparable,`'${v.runs[0].validation}' === '${v.runs[1].validation}' → ${v.comparable}`,{a:v.runs[0].validation,b:v.runs[1].validation},'不同验证版本需共同保留基准重评。'));
    if(has(v,'winner'))c.push(cell('winner','本次选择',v.winner,v.comparable?`${n(v.validation[0])} ≤ ${n(v.validation[1])} → ${v.winner}`:'验证版本不同 → winner = null',{comparable:v.comparable,validation:v.validation},'相同分数稳定选A；null代表拒绝选优。'));
    return c;
  },[
    exp('validation-version','只换实验B验证版本','相同权重与训练分数，还能直接给出winner吗？',{evaluation:'same'},{evaluation:'changed'},'权重保持相同；B的验证目标变2.5，comparable变false、winner为null。',(a,b)=>same(a.result.weights,b.result.weights)&&same(a.result.training,b.result.training)&&a.result.winner==='B'&&!b.result.comparable&&b.result.winner===null&&near(b.result.validation[1],.868624)),
    exp('updates','只增加一次训练更新','四轮改五轮，训练损失更小是否仍选同一个验证winner？',{epochs:4},{epochs:5},'两边训练损失均下降，但默认验证选择由B变A。',(a,b)=>a.result.winner==='B'&&b.result.winner==='A'&&b.result.training.every((x,i)=>x<a.result.training[i])&&a.result.history[0].length===4&&b.result.history[0].length===5)
  ]);

  models['fsdl-debugging']=model('把每个误差、平方项和梯度贡献拆开，独立中心差分能识别曲线下降时仍存在的归约错误。',(t,{v})=>{
    const p=t.params,c=[];
    v.xs.forEach((x,i)=>c.push(cell('data-'+i,'训练点 '+i+' 的目标',v.ys[i],`x = ${x} → y = ${v.ys[i]}`,{x,y:v.ys[i],oldWeight:p.weight},'固定两点回归，目标为平均半平方误差。')));
    if(v.errors)v.errors.forEach((e,i)=>c.push(cell('error-'+i,'误差 e'+i,e,`${n(p.weight)} × ${v.xs[i]} − ${v.ys[i]} = ${n(e)}`,{weight:p.weight,x:v.xs[i],y:v.ys[i]},'同一旧参数生成所有样本误差。')));
    if(has(v,'loss'))c.push(cell('loss','更新前损失',v.loss,`(${v.errors.map(e=>`(${n(e)})²`).join(' + ')}) / (2 × ${v.xs.length}) = ${n(v.loss)}`,{errors:v.errors,count:v.xs.length},'二分之一与样本平均必须和梯度口径一致。'));
    if(v.contributions)v.contributions.forEach((g,i)=>c.push(cell('contribution-'+i,'样本 '+i+' 梯度贡献',g,`${v.xs[i]} × (${n(v.errors[i])}) = ${n(g)}`,{x:v.xs[i],error:v.errors[i]},'贡献尚未归约。')));
    if(has(v,'gradient')){const divisor=p.reduction==='mean'?v.xs.length:1;c.push(cell('gradient','实现梯度',v.gradient,`(${v.contributions.map(n).join(' + ')}) / ${divisor} = ${n(v.gradient)}`,{contributions:v.contributions,divisor,reduction:p.reduction},p.reduction==='mean'?'匹配平均损失。':'故意漏除样本数的反例。'));}
    if(has(v,'numerical')){const eps=1e-5,loss=w=>sum(v.xs.map((x,i)=>(w*x-v.ys[i])**2))/(2*v.xs.length),plus=loss(p.weight+eps),minus=loss(p.weight-eps);c.push(cell('numerical','独立中心差分',v.numerical,`[L(${n(p.weight)} + 0.00001) − L(${n(p.weight)} − 0.00001)] / 0.00002 = ${n(v.numerical)}`,{epsilon:eps,lossPlus:plus,lossMinus:minus},'inputs保留完整精度；显示舍入后不可拿两个四位小数相减。'));c.push(cell('gradient-error','梯度差绝对值',v.gradientError,`|${n(v.gradient)} − ${n(v.numerical)}| = ${n(v.gradientError)}`,{implemented:v.gradient,numerical:v.numerical},'微小浮点差用容差判断，不要求逐位相等。'));}
    if(has(v,'nextWeight'))c.push(cell('next-weight','更新后参数',v.nextWeight,`${n(p.weight)} − ${n(p.rate)} × (${n(v.gradient)}) = ${n(v.nextWeight)}`,{oldWeight:p.weight,rate:p.rate,gradient:v.gradient},'使用旧状态梯度更新一次。'));
    if(has(v,'nextLoss')){const errors=v.xs.map((x,i)=>v.nextWeight*x-v.ys[i]);c.push(cell('next-loss','重新前向后的损失',v.nextLoss,`(${errors.map(e=>`(${n(e)})²`).join(' + ')}) / (2 × ${v.xs.length}) = ${n(v.nextLoss)}`,{newWeight:v.nextWeight,errors,count:v.xs.length},'损失下降不能替代梯度正确性检查。'));}
    return c;
  },[
    exp('reduction','只把平均改成求和','两种实现都让损失下降时，哪一个通过独立梯度检查？',{reduction:'mean'},{reduction:'sum'},'解析梯度-5变-10；数值差分仍约-5，求和分支与损失的梯度不匹配。',(a,b)=>near(a.result.gradient,-5)&&near(b.result.gradient,-10)&&near(a.result.numerical,b.result.numerical)&&Math.abs(a.result.gradient-a.result.numerical)<1e-7&&Math.abs(b.result.gradient-b.result.numerical)>4.9&&a.result.nextLoss<a.result.loss&&b.result.nextLoss<b.result.loss),
    exp('rate','只增大学习率','正确梯度不变，0.1改为0.8的一步更新能否改善损失？',{rate:.1},{rate:.8},'梯度均-5；新权重0.5变4，损失2.8125变5，后者没有下降。',(a,b)=>a.result.gradient===b.result.gradient&&a.result.nextWeight===.5&&b.result.nextWeight===4&&a.result.nextLoss===2.8125&&b.result.nextLoss===b.result.loss)
  ]);

  models['fsdl-testing']=model('对每个明确输入比较候选函数和独立预期，分开保留套件覆盖、边界、数据契约和制品门禁。',(t,{v})=>{
    const p=t.params,c=[cell('data-contract','数据契约',v.dataValid,`schema '${p.schema}' === 'valid' → ${v.dataValid}`,{schema:p.schema},'给定教学契约状态，没有运行真实生产schema检查。')];
    if(v.cases)v.cases.forEach((x,i)=>c.push(cell('expected-'+i,'用例 '+x+' 独立预期',Number(x>=0),`Number(${x} ≥ 0) = ${Number(x>=0)}`,{x,reference:'x >= 0'},'先确定规则；此格不是候选函数的已执行结果。')));
    if(v.implementation)c.push(cell('implementation','候选边界运算符',p.bug==='fixed'?'>=':'>',`bug '${p.bug}' → ${p.bug==='fixed'?'x >= 0':'x > 0'}`,{bug:p.bug},'预定义候选实现，未执行任意代码。'));
    if(v.checks)v.checks.forEach((r,i)=>c.push(cell('check-'+i,'已执行输入 '+r.x,r.actual,`Number(${r.x} ${p.bug==='fixed'?'≥':'>'} 0) = ${r.actual}；预期 ${r.expected} → ${r.actual===r.expected}`,{x:r.x,actual:r.actual,expected:r.expected},'只列已经返回的测试记录。')));
    if(has(v,'selectedTestsPass'))c.push(cell('suite','当前套件全通过',v.selectedTestsPass,`${v.checks.map(r=>`${r.actual} === ${r.expected}`).join(' AND ')} → ${v.selectedTestsPass}`,{checks:v.checks},'通过范围仅限选中的输入。'));
    if(has(v,'independentBoundaryPass'))c.push(cell('boundary','独立边界0通过',v.independentBoundaryPass,`Number(0 ${p.bug==='fixed'?'≥':'>'} 0) = ${p.bug==='fixed'?1:0}；与独立预期1比较 → ${v.independentBoundaryPass}`,{x:0,expected:1,implementation:p.bug},'普通套件遗漏0也不能绕过此检查。'));
    if(has(v,'artifactMatch'))c.push(cell('artifact','制品配对',v.artifactMatch,`artifact '${p.artifact}' === 'match' → ${v.artifactMatch}`,{artifact:p.artifact},'版本配对是给定案例条件。'));
    if(has(v,'releaseReady'))c.push(cell('release-ready','有限检查门禁',v.releaseReady,`${v.dataValid} AND ${v.selectedTestsPass} AND ${v.independentBoundaryPass} AND ${v.artifactMatch} = ${v.releaseReady}`,{dataValid:v.dataValid,selectedTestsPass:v.selectedTestsPass,independentBoundaryPass:v.independentBoundaryPass,artifactMatch:v.artifactMatch},'不代表所有输入正确或已经发布。'));
    return c;
  },[
    exp('boundary-fix','只修复分类边界','大于改为大于等于，只会改变哪条用例？',{bug:'strict'},{bug:'fixed'},'仅输入0由错误变正确，边界和门禁均通过。',(a,b)=>!a.result.releaseReady&&b.result.releaseReady&&a.result.checks[1].actual===0&&b.result.checks[1].actual===1&&a.result.checks[0].actual===b.result.checks[0].actual&&a.result.checks[2].actual===b.result.checks[2].actual),
    exp('test-coverage','只改为普通输入套件','缺陷保留，套件变绿能否让独立边界和门禁变绿？',{suite:'boundary'},{suite:'smoke'},'普通套件通过，但独立边界仍失败，门禁仍阻断。',(a,b)=>!a.result.selectedTestsPass&&b.result.selectedTestsPass&&!a.result.independentBoundaryPass&&!b.result.independentBoundaryPass&&!b.result.releaseReady),
    exp('artifact-contract','只破坏制品版本配对','函数已修复且用例通过，错配模型与配置能否发布？',{bug:'fixed',artifact:'match'},{bug:'fixed',artifact:'mismatch'},'套件保持通过，制品配对失败令门禁由true变false。',(a,b)=>a.result.selectedTestsPass&&b.result.selectedTestsPass&&a.result.releaseReady&&!b.result.releaseReady&&!b.result.artifactMatch)
  ]);

  models['fsdl-serving']=model('逐批复算选槽、等待到齐、完成时间，再逐请求算延迟，最后用明确窗口计算分位数与吞吐。',(t,{v})=>{
    const p=t.params,c=[];
    v.arrivals.forEach((a,i)=>c.push(cell('arrival-'+i,'请求 r'+i+' 到达',a,`arrivals[${i}] = ${a} ms`,{request:i,arrival:a},'固定有限到达序列，不是线上流量测试。')));
    if(has(v,'duration'))c.push(cell('duration','完整一批服务时间',v.duration,`${p.overhead} + ${p.batch} × ${p.perItem} = ${v.duration} ms`,{overhead:p.overhead,batch:p.batch,perItem:p.perItem},'尾批按实际条数算，不能套用完整批大小。'));
    if(v.free)v.free.forEach((free,j)=>c.push(cell('free-'+j,'槽 '+j+' 最早空闲',free,`已安排该槽最后完成时间；无批次时为0 → ${free} ms`,{worker:j,free},'这是已排定任务的时间表；播放不等待真实毫秒。')));
    if(v.jobs)v.jobs.forEach((job,j)=>{
      const freeBefore=Array(p.workers).fill(0);v.jobs.slice(0,j).forEach(x=>{freeBefore[x.worker]=x.finish;});const last=job.group.at(-1),ready=freeBefore[job.worker];
      c.push(cell('job-'+j+'-worker','第 '+(j+1)+' 批选择服务槽',job.worker,`argmin([${freeBefore.join(', ')}]) = ${job.worker}`,{freeBefore,ids:job.ids},'同空闲时间选较小槽号。'));
      c.push(cell('job-'+j+'-start','第 '+(j+1)+' 批开始',job.start,`max(槽空闲 ${ready}, 组末到达 ${last}) = ${job.start} ms`,{workerReady:ready,lastArrival:last,arrivals:job.group},'既要等槽可用，也要等组内全部请求到达。'));
      c.push(cell('job-'+j+'-finish','第 '+(j+1)+' 批结束',job.finish,`${job.start} + ${p.overhead} + ${job.group.length} × ${p.perItem} = ${job.finish} ms`,{start:job.start,overhead:p.overhead,actualBatch:job.group.length,perItem:p.perItem},'这批真实条数包括尾批。'));
    });
    if(v.latencies){v.jobs.forEach(job=>job.group.forEach((a,j)=>{const id=job.ids[j];c.push(cell('latency-'+id,'请求 r'+id+' 端到端延迟',v.latencies[id],`${job.finish} − ${a} = ${v.latencies[id]} ms`,{finish:job.finish,arrival:a,request:id},'包括凑批、排队和服务，不只模型计算时间。'));}));c.push(cell('mean-latency','平均延迟',v.meanLatency,`(${v.latencies.join(' + ')}) / ${v.latencies.length} = ${n(v.meanLatency)} ms`,{latencies:v.latencies,count:v.latencies.length},'只描述此六请求轨迹。'));}
    if(has(v,'p95')){const sorted=[...v.latencies].sort((a,b)=>a-b),rank=Math.ceil(.95*sorted.length);c.push(cell('p95','nearest-rank p95',v.p95,`ceil(0.95 × ${sorted.length}) = ${rank}；排序[${sorted.join(', ')}]第${rank}项 = ${v.p95} ms`,{sorted,rank},'六样本p95等于最大值，非稳定生产估计。'));}
    if(has(v,'throughput'))c.push(cell('throughput','观察窗口吞吐',v.throughput,`${v.arrivals.length} × 1000 / (${v.makespan} − ${v.arrivals[0]}) = ${n(v.throughput)} req/s`,{requests:v.arrivals.length,makespan:v.makespan,firstArrival:v.arrivals[0]},'窗口包含凑批等待；未模拟硬件、网络与持续流量。'));
    return c;
  },[
    exp('workers','只增加一个服务槽','相同批次与到达序列，一槽改两槽如何改变最后完成时间和p95？',{workers:1},{workers:2},'总完工32变22ms，p95为24变14ms，吞吐187.5变约272.7273。',(a,b)=>a.result.makespan===32&&b.result.makespan===22&&a.result.p95===24&&b.result.p95===14&&near(a.result.throughput,187.5)&&near(b.result.throughput,6000/22)),
    exp('batch-size','只改为单请求批次','省掉凑批等待时，固定开销更频繁会怎样影响队列？',{batch:2},{batch:1},'默认一槽下完工32变42ms，p95为24变32ms，吞吐下降。',(a,b)=>a.result.jobs.length===3&&b.result.jobs.length===6&&a.result.makespan===32&&b.result.makespan===42&&a.result.p95===24&&b.result.p95===32&&b.result.throughput<a.result.throughput)
  ]);

  models['fsdl-monitoring']=model('先逐箱计算比例差，再分开报告分布告警与有标签错误率；标签延迟保持未知。',(t,{v})=>{
    const p=t.params,c=[];
    v.baseline.forEach((x,i)=>c.push(cell('count-'+i,'当前第 '+i+' 箱计数',v.current[i],i===0?`80 − (${p.shift}) = ${v.current[i]}`:`20 + (${p.shift}) = ${v.current[i]}`,{baseline:x,shift:p.shift},'两个窗口各100条，分箱由教学案例指定。')));
    if(v.reference)v.reference.forEach((x,i)=>{c.push(cell('reference-'+i,'基准第 '+i+' 箱比例',x,`${v.baseline[i]} / ${sum(v.baseline)} = ${n(x)}`,{count:v.baseline[i],total:sum(v.baseline)},'各窗口分别归一化。'));c.push(cell('observed-'+i,'当前第 '+i+' 箱比例',v.observed[i],`${v.current[i]} / ${sum(v.current)} = ${n(v.observed[i])}`,{count:v.current[i],total:sum(v.current)},'改变比例不自动等于模型质量改变。'));});
    if(has(v,'totalVariation'))c.push(cell('tv','总变差距离',v.totalVariation,`0.5 × (|${v.baseline[0]} − ${v.current[0]}| + |${v.baseline[1]} − ${v.current[1]}|) / 100 = ${n(v.totalVariation)}`,{baseline:v.baseline,current:v.current,total:100},'范围[0,1]，不等于错误率。'));
    if(has(v,'driftAlert'))c.push(cell('alert','分布告警判断',v.driftAlert,`${n(v.totalVariation)} ≥ ${n(p.threshold)} → ${v.driftAlert}`,{totalVariation:v.totalVariation,threshold:p.threshold},'等于阈值也告警；只触发调查。'));
    if(has(v,'feedback')){if(v.feedback)v.feedback.forEach((e,i)=>c.push(cell('feedback-'+i,'已核对请求 '+i+' 错误标志',e,`已返回标签核对记录[${i}] = ${e}`,{index:i,error:e},'0为正确，1为错误；不是模型自行生成的真值。')));else c.push(cell('feedback','标签可用性',null,`labels '${p.labels}' → feedback = null`,{labels:p.labels,window:p.window},'尚未获得真值，不能算成零错误。'));}
    if(has(v,'errorRate'))c.push(cell('error-rate','有标签窗口错误率',v.errorRate,v.feedback?`(${v.feedback.join(' + ')}) / ${v.feedback.length} = ${n(v.errorRate)}`:'feedback = null → errorRate = null',{feedback:v.feedback,window:p.window},'极小窗口的已核对错误比例，非置信保证。'));
    if(v.conclusion)c.push(cell('conclusion','此规则的调查建议',v.conclusion,`driftAlert ${v.driftAlert} → '${v.conclusion}'`,{driftAlert:v.driftAlert,errorRate:v.errorRate},'没有执行重训或发布；无告警也不能证明无质量问题。'));
    return c;
  },[
    exp('threshold','只提高告警阈值','分布差异固定0.3，阈值0.2改0.4会改变真实错误率吗？',{threshold:.2},{threshold:.4},'告警true变false；TV仍0.3，延迟标签下错误率均null。',(a,b)=>near(a.result.totalVariation,.3)&&a.result.totalVariation===b.result.totalVariation&&a.result.driftAlert&&!b.result.driftAlert&&a.result.errorRate===null&&b.result.errorRate===null),
    exp('labels','只让真实标签返回','分布不变，未知错误率能否变成一个有分母的值？',{labels:'delayed'},{labels:'ready'},'TV与告警不变；八条反馈四错，错误率由null变0.5。',(a,b)=>a.result.errorRate===null&&b.result.errorRate===.5&&sum(b.result.feedback)===4&&b.result.feedback.length===8&&a.result.totalVariation===b.result.totalVariation&&a.result.driftAlert===b.result.driftAlert),
    exp('window','只扩大有标签窗口','头4条一错与头8条四错，错误比例会保持不变吗？',{labels:'ready',window:4},{labels:'ready',window:8},'错误率0.25变0.5；分布信号保持相同。',(a,b)=>a.result.errorRate===.25&&b.result.errorRate===.5&&a.result.feedback.length===4&&b.result.feedback.length===8&&a.result.totalVariation===b.result.totalVariation)
  ]);

  models['fsdl-release']=model('按离线门禁、清单、金丝雀观测和最终切换复算状态，跳过的流量观测始终保持null。',(t,{v})=>{
    const p=t.params,c=[];
    Object.entries(v.traffic).forEach(([version,share])=>c.push(cell('traffic-'+version,version+' 已记录流量',share,`${v.events.at(-1)} → ${version} = ${n(share)}；两版合计 ${n(v.traffic.v1+v.traffic.v2)}`,{state:v.events.at(-1),v1:v.traffic.v1,v2:v.traffic.v2},'只展示当前状态机快照，不是真实分流配置。')));
    if(has(v,'offlinePass')){c.push(cell('quality','质量子门槛',p.score>=.88,`${n(p.score)} ≥ 0.88 → ${p.score>=.88}`,{score:p.score,minScore:.88},'质量数字为输入，不是测量回执。'));c.push(cell('latency','延迟子门槛',p.latency<=120,`${p.latency} ≤ 120 → ${p.latency<=120}`,{latency:p.latency,maxLatency:120},'ms，输入的回放值不表示当前机器性能。'));c.push(cell('offline','离线组合门槛',v.offlinePass,`${p.score>=.88} AND ${p.latency<=120} = ${v.offlinePass}`,{quality:p.score>=.88,latency:p.latency<=120},'两项都满足才通过。'));}
    if(has(v,'manifestPass'))c.push(cell('manifest','制品清单门槛',v.manifestPass,`'${p.manifest}' === 'complete' → ${v.manifestPass}`,{manifest:p.manifest},'缺配置版本时拒绝金丝雀。'));
    if(has(v,'eligible'))c.push(cell('eligible','可进入金丝雀',v.eligible,`${v.offlinePass} AND ${v.manifestPass} = ${v.eligible}`,{offline:v.offlinePass,manifest:v.manifestPass},'资格不是最终晋升。'));
    if(has(v,'state'))c.push(cell('state','当前状态',v.state,v.events.join(' → '),{events:v.events},'事件仅含已执行的状态转换。'));
    if(has(v,'canaryRate')){c.push(cell('canary-rate','金丝雀错误率',v.canaryRate,v.eligible?`${p.canaryErrors} / 20 = ${n(v.canaryRate)}`:'eligible = false → 未接候选流量 → null',{eligible:v.eligible,errors:p.canaryErrors,requests:v.eligible?20:null},'固定20条，未执行时不制造观测。'));c.push(cell('rollback','回滚规则',v.rollback,v.eligible?`${n(v.canaryRate)} > 0.1 → ${v.rollback}`:'eligible = false → rollback = false',{eligible:v.eligible,canaryRate:v.canaryRate,threshold:.1},'严格大于才回滚，恰好10%不回滚；不代表统计安全。'));}
    if(v.active)c.push(cell('active','最终服务版本',v.active,`traffic.v2 ${n(v.traffic.v2)} === 1 → ${v.active}`,{traffic:v.traffic,events:v.events},'有限状态机结果，不是生产部署证明。'));
    return c;
  },[
    exp('rollback-boundary','只增加一条金丝雀错误','20条中2错与3错，严格大于10%的边界如何切换？',{canaryErrors:2},{canaryErrors:3},'10%晋升v2；15%回滚v1，最终流量分别[0,1]与[1,0]。',(a,b)=>a.result.canaryRate===.1&&!a.result.rollback&&a.result.active==='v2'&&b.result.canaryRate===.15&&b.result.rollback&&b.result.active==='v1'&&same(a.result.traffic,{v1:0,v2:1})&&same(b.result.traffic,{v1:1,v2:0})),
    exp('manifest','只删除配置版本','离线指标与错误输入不变，缺清单还会有金丝雀观测吗？',{manifest:'complete'},{manifest:'missing'},'完整包晋升；缺项被阻断，canaryRate为null，继续v1。',(a,b)=>a.result.active==='v2'&&a.result.eligible&&b.result.state==='blocked'&&!b.result.eligible&&b.result.canaryRate===null&&b.result.active==='v1'&&same(b.result.events,['prepared','blocked']))
  ]);

  models['fsdl-foundation-models']=model('展开2×2表示与线性头的每个乘积和梯度格，说明冻结与完整更新如何使用同一旧状态。',(t,{v})=>{
    const p=t.params,c=[];
    v.encoder.forEach((row,i)=>row.forEach((weight,j)=>c.push(cell('encoder-'+i+'-'+j,`旧表示 E[${i},${j}]`,weight,`初始人工矩阵[${i},${j}] = ${n(weight)}`,{row:i,column:j,weight,input:v.x[j]},'人工小矩阵，不是已加载预训练基础模型。'))));
    if(v.features)v.features.forEach((h,i)=>c.push(cell('feature-'+i,'特征 h'+i,h,`${v.encoder[i].map((w,j)=>`${n(w)} × ${v.x[j]}`).join(' + ')} = ${n(h)}`,{encoderRow:v.encoder[i],x:v.x},'点积每项与输入索引对齐。')));
    if(has(v,'prediction')){c.push(cell('prediction','下游预测',v.prediction,`${v.head.map((w,j)=>`${n(w)} × ${n(v.features[j])}`).join(' + ')} = ${n(v.prediction)}`,{head:v.head,features:v.features},'线性标量，无生成式模型调用。'));c.push(cell('error','目标误差',v.error,`${n(v.prediction)} − 1 = ${n(v.error)}`,{prediction:v.prediction,target:1},'半平方损失导数为误差。'));c.push(cell('loss','更新前损失',v.loss,`0.5 × (${n(v.error)})² = ${n(v.loss)}`,{error:v.error},'单一样本训练目标，不是迁移质量。'));}
    if(v.headGradient){v.headGradient.forEach((g,j)=>c.push(cell('head-gradient-'+j,'任务头梯度 '+j,g,`${n(v.error)} × ${n(v.features[j])} = ${n(g)}`,{error:v.error,feature:v.features[j]},'使用更新前特征。')));v.encoderGradient.forEach((row,i)=>row.forEach((g,j)=>c.push(cell('encoder-gradient-'+i+'-'+j,`表示梯度 [${i},${j}]`,g,`${n(v.error)} × ${n(v.head[i])} × ${v.x[j]} = ${n(g)}`,{error:v.error,oldHead:v.head[i],input:v.x[j]},'即便冻结也可检查理论梯度；冻结分支不应用它。'))));c.push(cell('trainable','可训练参数数',v.trainable,`2 个头参数 + ${p.strategy==='full'?4:0} 个表示参数 = ${v.trainable}`,{strategy:p.strategy,head:2,encoder:4,frozen:v.frozen},'参数个数，不是显存或实际计算成本测量。'));}
    if(v.newHead){v.newHead.forEach((w,j)=>c.push(cell('new-head-'+j,'更新后的任务头 '+j,w,`${n(v.head[j])} − ${n(p.rate)} × (${n(v.headGradient[j])}) = ${n(w)}`,{old:v.head[j],rate:p.rate,gradient:v.headGradient[j]},'两层梯度都已从同一旧状态取得。')));v.newEncoder.forEach((row,i)=>row.forEach((w,j)=>c.push(cell('new-encoder-'+i+'-'+j,`更新后 E[${i},${j}]`,w,p.strategy==='full'?`${n(v.encoder[i][j])} − ${n(p.rate)} × (${n(v.encoderGradient[i][j])}) = ${n(w)}`:`冻结 → 保留旧值 ${n(v.encoder[i][j])}`,{old:v.encoder[i][j],gradient:v.encoderGradient[i][j],rate:p.rate,strategy:p.strategy},'不使用更新后的任务头重算表示梯度。'))));}
    if(has(v,'after')){const features=v.newEncoder.map(row=>dot(row,v.x));features.forEach((h,i)=>c.push(cell('after-feature-'+i,'更新后重算 h'+i,h,`${v.newEncoder[i].map((w,j)=>`${n(w)} × ${v.x[j]}`).join(' + ')} = ${n(h)}`,{encoderRow:v.newEncoder[i],x:v.x},'更新后前向，不回填到更新前特征。')));c.push(cell('after','更新后预测',v.after,`${v.newHead.map((w,j)=>`${n(w)} × ${n(features[j])}`).join(' + ')} = ${n(v.after)}`,{newHead:v.newHead,newFeatures:features},'同一条训练输入。'));c.push(cell('after-loss','更新后损失',v.afterLoss,`0.5 × (${n(v.after)} − 1)² = ${n(v.afterLoss)}`,{prediction:v.after,target:1},'下降只说明这一样本的一次更新。'));}
    return c;
  },[
    exp('trainable-scope','只解冻表示层','同样旧梯度与学习率，2个变6个可训练参数会改变哪些格？',{strategy:'head'},{strategy:'full'},'任务头相同，表示由不变改为[[1.05,0.1],[-0.05,0.4]]；预测0.2变0.45。',(a,b)=>a.result.trainable===2&&b.result.trainable===6&&same(a.result.newHead,b.result.newHead)&&same(a.result.newEncoder,[[1,0],[0,.5]])&&same(b.result.newEncoder,[[1.05,.1],[-.05,.4]])&&near(a.result.after,.2)&&near(b.result.after,.45)),
    exp('learning-rate','只提高冻结头学习率','表示保持冻结，0.1改0.2后头权重和本样本损失怎样变？',{strategy:'head',rate:.1},{strategy:'head',rate:.2},'表示完全相同，头[0.6,-0.4]变[0.7,-0.3]，预测0.2变0.4、损失0.32变0.18。',(a,b)=>same(a.result.newEncoder,b.result.newEncoder)&&near(a.result.after,.2)&&near(b.result.after,.4)&&near(a.result.afterLoss,.32)&&near(b.result.afterLoss,.18))
  ]);

  models['fsdl-ml-teams']=model('对每个责任节点核对依赖完成时间，再计算开始与结束；缺责任人把下游时间留为空。',(t,{v})=>{
    const c=[];
    v.tasks.forEach(task=>c.push(cell('task-'+task.id,task.label+' 的约定工期',task.days,`${task.id}：${task.days} 工作日；owner = ${task.owner===null?'null':task.owner}；依赖 [${task.depends.join(',')}]`,{owner:task.owner,days:task.days,depends:task.depends},'给定项目编排估计，不代表人员已完成或现实人效。')));
    v.schedule.forEach((row,i)=>{const deps=row.depends.map(id=>v.schedule.find(x=>x.id===id)),finishes=deps.map(x=>x.finish),blocked=!row.owner||finishes.some(x=>x===null);c.push(cell('blocked-'+row.id,row.label+' 阻塞判断',row.blocked,`无owner ${!row.owner} OR 依赖finish含null ${finishes.some(x=>x===null)} → ${blocked}`,{owner:row.owner,depends:row.depends,dependencyFinishes:finishes},'缺责任人与上游阻断分别保留原因。'));c.push(cell('start-'+row.id,row.label+' 开始日',row.start,row.blocked?'blocked = true → start = null':`max(0${finishes.length?', '+finishes.join(', '):''}) = ${row.start}`,{blocked:row.blocked,dependencyFinishes:finishes},'工作日相对起点，不是实际日历承诺。'));c.push(cell('finish-'+row.id,row.label+' 结束日',row.finish,row.blocked?'start = null → finish = null':`${row.start} + ${row.days} = ${row.finish}`,{start:row.start,days:row.days},'只能排到当前已处理的节点，不推测未处理的下游。'));});
    if(has(v,'ready')){c.push(cell('ready','整个依赖图可排程',v.ready,`${v.schedule.map(x=>`!${x.blocked}`).join(' AND ')} = ${v.ready}`,{blocked:v.schedule.filter(x=>x.blocked).map(x=>x.id)},'可排程不是已执行验收。'));c.push(cell('planned-days','约定总工期',v.plannedDays,v.ready?`最后节点 ${v.schedule.at(-1).id}.finish = ${v.plannedDays}`:'存在阻塞 → plannedDays = null',{ready:v.ready,finish:v.schedule.at(-1).finish},'严格链式依赖；不模拟真实团队并行与资源竞争。'));}
    return c;
  },[
    exp('data-owner','只移除数据负责人','产品约定能完成时，哪个节点开始失去可排程时间？',{missing:'none'},{missing:'data'},'原计划7天；缺数据负责人后labels及全部下游共4项阻塞，总工期null。',(a,b)=>a.result.ready&&a.result.plannedDays===7&&!b.result.ready&&b.result.plannedDays===null&&same(b.result.blocked,['labels','training','evaluation','release'])&&b.result.schedule[0].finish===1),
    exp('label-duration','只增加标注工期','标签2天改5天，哪些下游结束日需要平移？',{labelDays:2},{labelDays:5},'均可排程；标签与之后各结束日延后3天，整体7变10天。',(a,b)=>a.result.ready&&b.result.ready&&a.result.plannedDays===7&&b.result.plannedDays===10&&a.result.schedule[0].finish===b.result.schedule[0].finish&&b.result.schedule.slice(1).every((x,i)=>x.finish-a.result.schedule[i+1].finish===3))
  ]);

  models['fsdl-ethics']=model('逐条落入虚构A/B分组的混淆矩阵，公开实际正负类分母，并把遗漏组的差异留为未知。',(t,{v})=>{
    const p=t.params,c=[];
    v.rows.forEach((r,i)=>c.push(cell('input-'+i,'虚构记录 '+i+' 标签',r.label,`${r.group}组；score ${n(r.score)}；label ${r.label}`,{group:r.group,score:r.score,label:r.label},'八条虚构记录，不用于推断真实人群风险。')));
    if(v.groups)c.push(cell('groups','纳入评估组数',v.groups.length,`coverage '${p.coverage}' → [${v.groups.join(', ')}] → ${v.groups.length}`,{coverage:p.coverage,groups:v.groups},'未纳入不等于没有风险。'));
    if(v.covered)v.covered.forEach(g=>c.push(cell('coverage-'+g.group,g.group+'组样本分母',g.count,`count(group === '${g.group}') = ${g.count}`,{group:g.group,ids:v.rows.map((r,i)=>r.group===g.group?i:null).filter(i=>i!==null)},'覆盖人数与错误率分母分开报告。')));
    if(v.audits)v.audits.forEach(a=>{
      const rows=v.rows.map((r,i)=>({...r,index:i})).filter(r=>r.group===a.group);
      rows.forEach(r=>{const predicted=Number(r.score>=p.threshold),bucket=predicted?(r.label?'tp':'fp'):(r.label?'fn':'tn');c.push(cell('decision-'+r.index,a.group+'组记录 '+r.index+' 入格',bucket,`Number(${n(r.score)} ≥ ${n(p.threshold)}) = ${predicted}；标签 ${r.label} → ${bucket.toUpperCase()}`,{score:r.score,threshold:p.threshold,label:r.label},'只有该组审计帧已出现后才展示其预测和入格。'));});
      for(const k of ['tp','fp','fn','tn']){const terms=rows.map(r=>{const pred=r.score>=p.threshold;return Number((pred?(r.label?'tp':'fp'):(r.label?'fn':'tn'))===k);});c.push(cell(a.group+'-'+k,a.group+'组 '+k.toUpperCase(),a[k],`${terms.join(' + ')} = ${a[k]}`,{indicators:terms,group:a.group},'各组单独计数。'));}
      c.push(cell(a.group+'-fpr',a.group+'组 FPR',a.fpr,`${a.fp} / (${a.fp} + ${a.tn}) = ${n(a.fpr)}`,{fp:a.fp,tn:a.tn,actualNegatives:a.negatives},'分母实际负类；空分母应保留null。'));
      c.push(cell(a.group+'-fnr',a.group+'组 FNR',a.fnr,`${a.fn} / (${a.tp} + ${a.fn}) = ${n(a.fnr)}`,{fn:a.fn,tp:a.tp,actualPositives:a.positives},'分母实际正类；样本极少。'));
    });
    if(has(v,'fprGap'))for(const [key,rate] of [['fprGap','fpr'],['fnrGap','fnr']])c.push(cell(key,rate.toUpperCase()+' 组间绝对差',v[key],v.audits.length===2?`|${n(v.audits[0][rate])} − ${n(v.audits[1][rate])}| = ${n(v[key])}`:'缺B组审计 → 无法比较 → null',{audits:v.audits.map(a=>({group:a.group,rate:a[rate]}))},'差异为零也不是公平证明。'));
    if(v.missingGroups)c.push(cell('missing','报告遗漏组数',v.missingGroups.length,`[A,B] − [${v.groups.join(',')}] = [${v.missingGroups.join(',')}] → ${v.missingGroups.length}`,{expected:['A','B'],included:v.groups,missing:v.missingGroups},'伦理还包括同意、目的、隐私与申诉，本例不自动授予上线许可。'));
    return c;
  },[
    exp('coverage','只遗漏B组','只看A组后，FPR差能否被解释成0？',{coverage:'all'},{coverage:'omit'},'完整FPR差0.5；遗漏后两差均null，明确列出B组缺失。',(a,b)=>a.result.fprGap===.5&&b.result.fprGap===null&&b.result.fnrGap===null&&same(b.result.missingGroups,['B'])&&!b.result.coverageComplete&&same(a.result.audits[0],b.result.audits[0])),
    exp('threshold','只提高统一阈值','0.5改0.8，FPR差缩小是否意味着两组漏报也消失？',{threshold:.5},{threshold:.8},'两组FPR差0.5变0，但FNR均由0变0.5，差值仍0；不能据此认证公平。',(a,b)=>a.result.fprGap===.5&&b.result.fprGap===0&&a.result.audits.every(x=>x.fnr===0)&&b.result.audits.every(x=>x.fnr===.5)&&b.result.fnrGap===0)
  ]);

  models['fsdl-project-train']=model('用逻辑回归的每个旧logit、概率和误差贡献复算平均梯度，再检查真实记录的一次更新与独立验证输入。',(t,{i,v})=>{
    const p=t.params,c=[];
    v.X.forEach((x,k)=>c.push(cell('data-'+k,'训练样本 '+k+' 标签',v.Y[k],`x = [${x.join(', ')}] → y = ${v.Y[k]}`,{x,y:v.Y[k]},'浏览器四样本训练核；不等于下载项目的完整训练回执。')));
    if(v.validationX)v.validationX.forEach((x,k)=>c.push(cell('validation-input-'+k,'保留验证输入 '+k,x,`validationX[${k}] = [${x.join(', ')}]`,{x,usedForGradient:false},'本输入不参与梯度。')));
    if(has(v,'initialLoss'))c.push(cell('baseline','零权重基线损失',v.initialLoss,`−log(0.5) = log(2) = ${n(v.initialLoss)}`,{initialProbability:.5,samples:v.X.length},'零logit的二元交叉熵基线，不是最终损失。'));
    let gradientIndex=-1;for(let k=i;k>=0;k--)if(has(t.steps[k].variables,'probabilities')){gradientIndex=k;break;}
    if(gradientIndex>=0){
      const current=t.steps[gradientIndex].variables,old=snapshot(t,gradientIndex-1),errors=current.probabilities.map((prob,k)=>prob-v.Y[k]);
      current.probabilities.forEach((prob,k)=>{const z=dot(old.w,v.X[k])+old.b;c.push(cell('probability-'+k,'最近梯度所用概率 '+k,prob,`z = ${v.X[k].map((x,j)=>`${n(old.w[j])} × (${x})`).join(' + ')} + ${n(old.b)} = ${n(z)}；sigmoid(z) = ${n(prob)}`,{oldWeight:old.w,oldBias:old.b,x:v.X[k],logit:z},'这是最近一次梯度帧的旧状态，不是更新后概率。'));c.push(cell('error-'+k,'最近梯度所用误差 '+k,errors[k],`${n(prob)} − ${v.Y[k]} = ${n(errors[k])}`,{probability:prob,label:v.Y[k]},'使用完整精度计算贡献。'));});
      current.gradient.forEach((g,j)=>{const contributions=errors.map((e,k)=>e*v.X[k][j]);contributions.forEach((term,k)=>c.push(cell('contribution-'+j+'-'+k,`dw${j} 样本${k}贡献`,term,`${n(errors[k])} × (${v.X[k][j]}) = ${n(term)}`,{error:errors[k],feature:v.X[k][j]},'所有贡献使用同一旧权重。')));c.push(cell('gradient-'+j,'最近平均梯度 dw'+j,g,`(${contributions.map(n).join(' + ')}) / ${v.X.length} = ${n(g)}`,{contributions,count:v.X.length},'平均而非求和。'));});
      const biasGradient=sum(errors)/errors.length;c.push(cell('bias-gradient','最近平均偏置梯度',biasGradient,`(${errors.map(n).join(' + ')}) / ${errors.length} = ${n(biasGradient)}`,{errors,count:errors.length},'对称案例梯度约为0，但仍逐项保留。'));
    }
    let updateIndex=-1;for(let k=i;k>=0;k--)if(t.steps[k].variables.history?.length){updateIndex=k;break;}
    if(updateIndex>=0){
      const update=t.steps[updateIndex].variables,old=snapshot(t,updateIndex-1),saved=update.history.at(-1),errors=old.probabilities.map((prob,k)=>prob-v.Y[k]),db=sum(errors)/errors.length;
      update.w.forEach((w,j)=>c.push(cell('saved-weight-'+j,`已保存第${saved.epoch}轮 w${j}`,w,`${n(old.w[j])} − ${n(p.rate)} × (${n(update.gradient[j])}) = ${n(w)}`,{oldWeight:old.w[j],rate:p.rate,gradient:update.gradient[j],epoch:saved.epoch},'来自最后一次已执行更新；不会把下一轮梯度套到旧更新上。')));
      c.push(cell('saved-bias','已保存偏置',update.b,`${n(old.b)} − ${n(p.rate)} × (${n(db)}) = ${n(update.b)}`,{oldBias:old.b,rate:p.rate,biasGradient:db},'使用相同旧概率的平均误差。'));
      const logits=v.X.map(x=>dot(update.w,x)+update.b),terms=logits.map((z,k)=>Math.max(z,0)-v.Y[k]*z+Math.log1p(Math.exp(-Math.abs(z))));terms.forEach((loss,k)=>c.push(cell('loss-'+k,'最近更新后样本 '+k+' BCE',loss,`max(${n(logits[k])},0) − ${v.Y[k]} × (${n(logits[k])}) + log(1 + exp(−|${n(logits[k])}|)) = ${n(loss)}`,{logit:logits[k],label:v.Y[k]},'稳定logit交叉熵，和轨迹的更新后损失同一口径。')));c.push(cell('saved-loss','最近保存平均BCE',saved.loss,`(${terms.map(n).join(' + ')}) / ${terms.length} = ${n(saved.loss)}`,{losses:terms,epoch:saved.epoch},'只含已记录的轮次；不用最终result补未来。'));
    }else v.w.forEach((w,j)=>c.push(cell('initial-weight-'+j,'初始权重 w'+j,w,`训练前 w[${j}] = ${n(w)}`,{weight:w,bias:v.b},'未执行更新。')));
    if(v.validation)v.validation.forEach((prob,k)=>{const x=v.validationX[k],z=dot(v.w,x)+v.b;c.push(cell('validation-'+k,'最终验证概率 '+k,prob,`sigmoid(${x.map((xj,j)=>`${n(v.w[j])} × (${xj})`).join(' + ')} + ${n(v.b)}) = ${n(prob)}；≥ 0.5 → ${v.predictions[k]}`,{x,weights:v.w,bias:v.b,logit:z,prediction:v.predictions[k]},'训练后才产生两条验证结果；小样本无泛化保证。'));});
    return c;
  },[
    exp('training-epochs','只增加一次更新','三轮改四轮，权重和训练损失怎样变化？验证类别会不会变？',{epochs:3},{epochs:4},'第4轮平均BCE进一步下降；两验证类别仍[0,1]，正例概率提高。',(a,b)=>a.result.history.length===3&&b.result.history.length===4&&b.result.history[3].loss<a.result.history[2].loss&&b.result.w.every((x,j)=>x>a.result.w[j])&&same(a.result.validation.map(x=>Number(x>=.5)),[0,1])&&same(b.result.validation.map(x=>Number(x>=.5)),[0,1])&&b.result.validation[1]>a.result.validation[1]),
    exp('training-rate','只提高训练学习率','固定4轮，0.1改0.5后是否仍是同一梯度规则？',{rate:.1},{rate:.5},'首轮w由[0.05,0.0375]变[0.25,0.1875]，同为平均梯度；第4轮损失更低。',(a,b)=>near(a.result.history[0].w[0],.05)&&near(a.result.history[0].w[1],.0375)&&near(b.result.history[0].w[0],.25)&&near(b.result.history[0].w[1],.1875)&&b.result.history[3].loss<a.result.history[3].loss&&a.result.b===b.result.b)
  ]);

  models['fsdl-project-serve']=model('把包验证、离线回归、10%试流量和严格大于5%的回滚边界逐项检查，区分阻断与真实进入过的分支。',(t,{v})=>{
    const p=t.params,c=[cell('traffic','候选当前流量比例',v.candidateTraffic,`已记录状态 active '${v.active}'；candidateTraffic = ${n(v.candidateTraffic)}`,{active:v.active,candidateTraffic:v.candidateTraffic},'教学状态机快照，不伪造HTTP调用或流量日志。')];
    if(has(v,'manifestValid'))c.push(cell('manifest','包哈希与清单检查',v.manifestValid,`candidate '${p.candidate}' ≠ 'hash' → ${v.manifestValid}`,{candidate:p.candidate},'浏览器是已知分支案例；真实哈希在下载项目中另行执行。'));
    if(has(v,'offlinePassed'))c.push(cell('offline','离线回归检查',v.offlinePassed,`candidate '${p.candidate}' === 'good' → ${v.offlinePassed}`,{candidate:p.candidate},'回归失败与哈希失败是不同拒绝理由。'));
    if(has(v,'eligible'))c.push(cell('eligible','可接候选请求',v.eligible,`${v.manifestValid} AND ${v.offlinePassed} = ${v.eligible}`,{manifest:v.manifestValid,offline:v.offlinePassed},'先通过门禁再试流量。'));
    if(has(v,'requests'))c.push(cell('requests','候选观测样本数',v.requests,v.eligible?'eligible = true → 请求数20，候选比例0.1':'eligible = false → requests = null',{eligible:v.eligible,requests:v.requests},'未执行时null不是0错误。'));
    if(has(v,'canaryRate')){c.push(cell('canary-rate','候选请求错误率',v.canaryRate,v.eligible?`${p.canaryErrors} / 20 = ${n(v.canaryRate)}`:'候选没有接请求 → canaryRate = null',{errors:p.canaryErrors,requests:v.requests},'固定20条，不是生产统计保证。'));c.push(cell('rollback','是否触发回滚',v.rollback,v.eligible?`${n(v.canaryRate)} > 0.05 → ${v.rollback}`:'eligible = false → 不进入回滚分支',{eligible:v.eligible,errorRate:v.canaryRate,threshold:.05},'恰好5%不触发；超过才触发。'));}
    c.push(cell('active','当前服务版本',v.active,`candidateTraffic ${n(v.candidateTraffic)} === 1 ? candidate : baseline → ${v.active}`,{active:v.active,candidateTraffic:v.candidateTraffic},'只有记录到最终帧才算完成本案例切换；不表示已启动真实服务。'));
    return c;
  },[
    exp('canary-boundary','只增加一条候选请求错误','20条中1错与2错会落在哪一侧？',{canaryErrors:1},{canaryErrors:2},'5%晋升candidate；10%回滚baseline，候选流量1变0。',(a,b)=>a.result.canaryRate===.05&&!a.result.rollback&&a.result.active==='candidate'&&a.result.candidateTraffic===1&&b.result.canaryRate===.1&&b.result.rollback&&b.result.active==='baseline'&&b.result.candidateTraffic===0),
    exp('hash-rejection','只令模型哈希失配','有效包改坏哈希，候选还有观测错误率吗？',{candidate:'good'},{candidate:'hash'},'好包晋升；失配时manifestValid=false、eligible=false、错误率null并保持baseline。',(a,b)=>a.result.active==='candidate'&&!b.result.manifestValid&&!b.result.eligible&&b.result.canaryRate===null&&b.result.active==='baseline'&&b.result.candidateTraffic===0),
    exp('regression-rejection','只引入离线回归','哈希仍有效时，离线失败是否仍阻断候选？',{candidate:'good'},{candidate:'regression'},'哈希均有效；回归分支offlinePassed=false，跳过金丝雀且保持baseline。',(a,b)=>a.result.manifestValid&&b.result.manifestValid&&a.result.offlinePassed&&!b.result.offlinePassed&&!b.result.eligible&&b.result.canaryRate===null&&b.result.active==='baseline')
  ]);
  return {courseId:'fsdl',models};
});
