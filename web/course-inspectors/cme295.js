/* CME 295: cell-level calculations from immutable, recorded teaching traces. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const sum=xs=>xs.reduce((a,b)=>a+b,0),near=(a,b)=>Math.abs(a-b)<1e-9;
  const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>typeof x==='number'?near(x,b[i]):x===b[i]);
  const n=x=>typeof x==='number'?Number(x.toFixed(4)).toString():String(x);
  const list=xs=>xs.map(n).join(' + '),product=(a,b)=>a.map((x,i)=>`${n(x)} × ${n(b[i])}`).join(' + ');
  const C=(id,label,value,formula,inputs={},note='给定的小型教学案例；数值展示保留四位小数，检查使用完整精度。')=>({id,label,value,formula,inputs,note});
  const state=(t,end)=>Object.assign({},...t.steps.slice(0,end+1).map(s=>s.variables));
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  function define(intuition,inspect,experiments){return {intuition,inspect(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(index)||0)),f=t.steps[i];return {title:f.title,summary:`对应当前第 ${i+1} 步、第 ${f.line} 行。${f.detail}`,cells:inspect(t,i,f.variables,state(t,i),f.line)};},experiments};}
  const models={};
  models.attention=define('由同一 Query 与三个 Key 的匹配分数决定 Value 混合比例；保留原有 Attention 专用逐格面板。',(t,i,v)=>{
    const a=t.steps[i].visual.attention;
    const key=({dots:'dot',scaled:'scaled',scores:'maskedScore',weights:'weight',output:'output'})[a.stage];
    return [C('attention-current','当前结果格',key?(v[key]===null?'−∞':v[key]):(v.q||[]).join(', '),a.expression,v,'给定 Q/K/V 的单头前向；null 在遮罩分数中代表 −∞。')];
  },[E('value','只改取回内容','Value 改变时，匹配权重应该变吗？',{value:1},{value:3},'权重保持，输出第一维改变，第二维保持。',(a,b)=>equal(a.result.weights,b.result.weights)&&b.result.output[0]>a.result.output[0]&&near(a.result.output[1],b.result.output[1]))]);

  models['cme-representations']=define('同一套 BPE 规则决定 token；查表后的均值丢失顺序，递归状态保留顺序。',(t,i,v,s,line)=>{
    const p=t.params;
    if(line===1||line===4)return v.corpus.map((w,j)=>C('word-'+j,'语料词 '+j,w.join(' · '),`${w.length} 个当前符号；按已学规则在词内非重叠替换`,{symbols:w},'词边界禁止跨越；规则学习不使用新输入的词序。'));
    if(line===3){const pair=v.pair,occurrences=s.corpus.map(w=>w.slice(0,-1).filter((x,j)=>x===pair[0]&&w[j+1]===pair[1]).length);return [C('pair-count',pair.join(' + ')+' 的次数',v.count,`${list(occurrences)} = ${v.count}`,{pair,countsByWord:occurrences},'并列计数按字符串排序，保证可重复。')];}
    if(line===5)return [C('pieces','应用合并规则后 token 数',v.tokenCount,`${v.pieces.map(x=>'['+x+']').join(' ')} → ${v.pieces.length} 项`,{pieces:v.pieces,merges:t.result.merges})];
    if(line===6)return v.vectors.flatMap((row,j)=>row.map((x,d)=>C(`lookup-${j}-${d}`,`位置 ${j} 的第 ${d} 维`,x,`E[${JSON.stringify(s.pieces[j])}][${d}] = ${n(x)}`,{token:s.pieces[j],vector:row},'E 是人工指定的查表数值，不是已训练语义表示。')));
    if(line===7)return v.pooled.map((x,d)=>C('mean-'+d,'均值第 '+d+' 维',x,`(${list(s.vectors.map(row=>row[d]))}) / ${s.vectors.length} = ${n(x)}`,{column:s.vectors.map(row=>row[d]),count:s.vectors.length},'此加法平均与 token 顺序无关。'));
    return v.states.map((h,j)=>{const before=j?v.states[j-1]:0,x=s.vectors[j][0];return C('rnn-'+j,'递归状态 h'+j,h,`tanh(0.5 × ${n(before)} + ${n(x)}) = ${n(h)}`,{previous:before,input:x},'这是真实记录的标量递推；没有训练 RNN。');});
  },[E('order','倒转输入词序','均值和 RNN 最后状态会一起变吗？',{order:'normal',merges:2},{order:'reverse',merges:2},'相同 token 集合保持均值，RNN 的有序递推末状态变化。',(a,b)=>equal(a.result.pooled,b.result.pooled)&&a.result.tokenCount===b.result.tokenCount&&!near(a.result.finalState,b.result.finalState))]);

  models['cme-moe']=define('先对路由分数归一化，再选择专家并重新分配所选权重，最后计算加权输出。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params;
    if(line===1)return v.scores.map((x,j)=>C('score-'+j,'专家 '+j+' 分数',x,j===0?`gate = ${p.gate}`:`固定分数 = ${x}`,{gate:p.gate},'教学路由分数，不是专家正确率。'));
    if(line===2){const m=Math.max(...R.scores),exps=R.scores.map(x=>Math.exp(x-m));return v.probs.map((x,j)=>C('prob-'+j,'路由概率 '+j,x,`exp(${R.scores[j]} − ${m}) / (${list(exps)}) = ${n(x)}`,{scores:R.scores,exps}));}
    if(line===3)return [C('active','激活参数',v.activeParameters,`${p.topk} 个专家 × 每专家 4 参数 = ${v.activeParameters}`,{chosen:v.chosen,total:12},'总专家参数仍为12，不代表实际吞吐提升比例。'),...R.scores.map((_,j)=>C('chosen-'+j,'专家 '+j+' 是否激活',v.chosen.includes(j),`按概率降序取前 ${p.topk} 个 → ${JSON.stringify(v.chosen)}`,{chosen:v.chosen}))];
    if(line===5)return v.weights.map((x,j)=>C('weight-'+j,'汇总权重 '+j,x,R.chosen.includes(j)?`${n(R.probs[j])} / ${n(v.z)} = ${n(x)}`:'未入选 → 0',{probability:R.probs[j],selectedMass:v.z,selected:R.chosen.includes(j)}));
    if(line===6)return v.expertOutputs.map((x,j)=>C('expert-'+j,'专家 '+j+' 输出',x,`${[1,2,-1][j]} × ${p.x} = ${x}`,{input:p.x,multiplier:[1,2,-1][j]}));
    return [C('mixture','激活专家加权和',v.output,`${product(R.weights,R.expertOutputs)} = ${n(v.output)}`,{weights:R.weights,outputs:R.expertOutputs})];
  },[E('topk','激活一位或两位专家','多一个专家时，活跃参数和输出会怎样变化？',{topk:1},{topk:2},'活跃参数4→8，总参数12不变；第二个专家加入汇总。',(a,b)=>a.result.activeParameters===4&&b.result.activeParameters===8&&a.result.totalParameters===b.result.totalParameters&&!near(a.result.output,b.result.output))]);

  models['cme-kv']=define('把共同 prefill、逐步 decode 的分数对数，以及 KV 存储字节分别核算。',(t,i,v,s,line)=>{
    const p=t.params,R=t.result;
    if(line===1)return v.lengths.map((x,j)=>C('length-'+j,'decode '+j+' 的总长度',x,`${p.prefix} + ${j} + 1 = ${x}`,{prefix:p.prefix,newTokens:j+1}));
    if(line===2)return [C('prefill','共同 prefill 分数对',v.prefillScorePairs,`${p.prefix} × ${p.prefix} = ${v.prefillScorePairs}`,{prefix:p.prefix},'只计一个头的稠密 QK 分数对，不是 FLOP 或耗时。')];
    if(line===3||line===4)return [...v.perDecode.map((x,j)=>C('decode-'+j,'解码步 '+j+' 分数对',x,line===3?`${R.lengths[j]}² = ${x}`:`新 Query × ${R.lengths[j]} 个 Key = ${x}`,{length:R.lengths[j]},'两种基线均另计共同 prefill。')),C('total','计入 prefill 后总对数',line===3?v.noCache:v.cached,`${R.prefill} + ${list(v.perDecode)} = ${line===3?v.noCache:v.cached}`,{prefill:R.prefill,decode:v.perDecode})];
    if(line===5)return [C('cache','KV 缓存字节',v.cacheBytes,`2 × ${v.layers} × (${p.prefix}+${p.tokens}) × ${p.kvheads} × ${v.headDim} × ${v.bytesPerElement} = ${v.cacheBytes}`,{keyAndValue:2,layers:v.layers,length:p.prefix+p.tokens,kvheads:p.kvheads,headDim:v.headDim,bytes:v.bytesPerElement},'单位为字节；batch=1，不含激活与额外索引。')];
    return [C('ratio','分数对减少比',v.scorePairReductionRatio,`${v.noCache} / ${v.cached} = ${n(v.scorePairReductionRatio)}`,{withoutCache:v.noCache,withCache:v.cached},'计算计数比例不能当作实测 GPU 加速比。')];
  },[E('heads','MHA 改成 MQA','缓存减少时，给定的 QK 分数对计数也会减少吗？',{kvheads:8},{kvheads:1},'存储减少到1/8；本例单个 Query 头的分数对计数保持。',(a,b)=>a.result.cacheBytes===8*b.result.cacheBytes&&a.result.cached===b.result.cached&&a.result.noCache===b.result.noCache)]);

  models['cme-rope']=define('检查二维旋转的坐标、点积与共同位置平移；几何是静态数值检查。',(t,i,v,s,line)=>{
    const p=t.params,R=t.result;
    if(line===1)return [C('q-angle','Query 旋转角',p.qpos*p.theta,`${p.qpos} × ${p.theta} = ${n(p.qpos*p.theta)} rad`,{position:p.qpos,theta:p.theta}),C('k-angle','Key 旋转角',p.kpos*p.theta,`${p.kpos} × ${p.theta} = ${n(p.kpos*p.theta)} rad`,{position:p.kpos,theta:p.theta})];
    if(line===2||line===3){const name=line===2?'q':'k',angle=(line===2?p.qpos:p.kpos)*p.theta;return v[name].map((x,d)=>C(name+d,name+' 第 '+d+' 维',x,`${d===0?'cos':'sin'}(${n(angle)}) = ${n(x)}`,{angle,base:[1,0]},'旋转不改变向量模长。'));}
    if(line===4)return [C('dot','旋转后点积',v.score,`${product(R.q,R.k)} = ${n(v.score)} = cos((${p.qpos}−${p.kpos})×${p.theta})`,{q:R.q,k:R.k})];
    if(line===6)return ['movedQ','movedK'].flatMap((name,j)=>v[name].map((x,d)=>{const pos=(j?p.kpos:p.qpos)+p.shift;return C(name+d,name+' 第 '+d+' 维',x,`${d===0?'cos':'sin'}((${pos}) × ${p.theta}) = ${n(x)}`,{position:pos,theta:p.theta});}));
    return [C('moved','平移后的点积',v.movedScore,`${product(R.movedQ,R.movedK)} = ${n(v.movedScore)}`,{q:R.movedQ,k:R.movedK}),C('difference','前后差值',v.difference,`${n(v.movedScore)} − ${n(v.score)} = ${n(v.difference)}`,{before:v.score,after:v.movedScore},'共同平移的相对旋转性质，不是长上下文泛化保证。')];
  },[E('shift','共同平移三个位置','坐标和相对位置点积是否都保持？',{shift:0},{shift:3},'旋转坐标变化；原点积与共同平移后的点积相等，模长为1。',(a,b)=>near(a.result.score,b.result.movedScore)&&!equal(a.result.q,b.result.movedQ)&&near(Math.hypot(...b.result.movedQ),1))]);

  models['cme-training']=define('明确监督位置与概率分布，区分交叉熵、SFT、DPO 和教师 KL 的口径。',(t,i,v,s,line)=>{
    const p=t.params,R=t.result;
    if(line===1)return [...v.student.map((x,j)=>C('student-'+j,'学生概率 '+j,x,j===0?`p = ${p.p}`:`1 − ${p.p} = ${n(x)}`,{p:p.p})),...v.teacher.map((x,j)=>C('teacher-'+j,'教师概率 '+j,x,j===0?`q = ${p.q}`:`1 − ${p.q} = ${n(x)}`,{q:p.q}))];
    if(line===2)return [C('pretrain','两位置平均交叉熵',v.pretrainLoss,`(−ln(${p.p}) − ln(0.8)) / 2 = ${n(v.pretrainLoss)}`,{probabilities:[p.p,.8],mask:[1,1]},'单位nat；两个位置均被监督。')];
    if(line===3)return [C('sft','仅回答位置损失',v.sftLoss,`(0 × −ln(${p.p}) + 1 × −ln(0.8)) / 1 = ${n(v.sftLoss)}`,{mask:v.lossMask,answerProbability:.8},'分母为有效监督位置数，prompt概率不贡献SFT损失。')];
    if(line===5)return [C('margin','相对参考的对数赔率差',v.margin,`ln(${p.p}/(1−${p.p})) − ln(${p.q}/(1−${p.q})) = ${n(v.margin)}`,{student:p.p,reference:p.q}),C('dpo','偏好损失',v.dpoLoss,`ln(1 + exp(−${p.beta} × ${n(v.margin)})) = ${n(v.dpoLoss)}`,{beta:p.beta,margin:v.margin},'本例chosen为第一个候选，未做训练更新。')];
    if(line===6)return [...v.teacher.map((x,j)=>C('kl-'+j,'KL 第 '+j+' 项',x*Math.log(x/v.student[j]),`${n(x)} × ln(${n(x)}/${n(v.student[j])}) = ${n(x*Math.log(x/v.student[j]))}`,{teacher:x,student:v.student[j]},'KL单项可为负，总和非负。')),C('kl','KL(teacher || student)',v.kl,`${v.teacher.map((x,j)=>n(x*Math.log(x/v.student[j]))).join(' + ')} = ${n(v.kl)}`,{teacher:v.teacher,student:v.student})];
    return [C('objective','当前选择的损失',v.loss,`losses[${JSON.stringify(v.objective)}] = ${n(v.loss)}`,{objective:v.objective,losses:v.losses},'只能在相同目标和数据口径下比较损失。')];
  },[E('sft-mask','只改 prompt 位置概率','prompt的概率提高，SFT回答损失会下降吗？',{objective:'sft',p:.2},{objective:'sft',p:.8},'SFT回答损失保持；两位置预训练损失下降。',(a,b)=>near(a.result.sftLoss,b.result.sftLoss)&&b.result.pretrainLoss<a.result.pretrainLoss)]);

  models['cme-rl']=define('从一组奖励计算均值、相对优势、候选策略和裁剪目标；全部是给定样本上的算术。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params;
    if(line===1)return v.rewards.map((x,j)=>C('reward-'+j,'回答 '+j+' 给定奖励',x,`rewards[${j}] = ${x}`,{oldProbability:v.old[j]},'固定组样本奖励，不是模型真实性评分。'));
    if(line===2)return [C('mean','组均值',v.mean,`(${list(R.rewards)}) / 3 = ${n(v.mean)}`,{rewards:R.rewards}),C('sd','总体标准差',v.sd,`√(Σ(rᵢ−${n(v.mean)})² / 3) = ${n(v.sd)}`,{rewards:R.rewards,mean:v.mean},'使用总体标准差；不是无偏样本标准差。')];
    if(line===3)return v.advantages.map((x,j)=>C('advantage-'+j,'回答 '+j+' 相对优势',x,R.sd===0?'标准差为0 → 优势约定为0':`(${R.rewards[j]} − ${n(R.mean)}) / ${n(R.sd)} = ${n(x)}`,{reward:R.rewards[j],mean:R.mean,sd:R.sd}));
    if(line===5)return [...v.score.map((x,j)=>C('grad-'+j,'回答 '+j+' 梯度贡献',R.advantages[j]*x/3,`${n(R.advantages[j])} × ${n(x)} / 3 = ${n(R.advantages[j]*x/3)}`,{advantage:R.advantages[j],score:x})),C('gradient','梯度估计之和',v.gradient,`${list(v.score.map((x,j)=>x*R.advantages[j]/3))} = ${n(v.gradient)}`,{score:v.score,advantages:R.advantages})];
    if(line===6)return [C('theta','候选新logit',v.updatedTheta,`${p.theta} + ${p.eta} × ${n(R.gradient)} = ${n(v.updatedTheta)}`,{theta:p.theta,eta:p.eta,gradient:R.gradient}),...v.updated.map((x,j)=>C('updated-'+j,'新策略概率 '+j,x,`softmax([0, ${n(v.updatedTheta)}, ${n(v.updatedTheta)}])[${j}] = ${n(x)}`,{logits:[0,v.updatedTheta,v.updatedTheta]},'单次候选更新，不冒充PPO/GRPO训练完成。'))];
    if(line===7)return v.ratios.map((x,j)=>C('ratio-'+j,'概率比 '+j,x,`${n(R.updated[j])} / ${n(R.old[j])} = ${n(x)}`,{newProbability:R.updated[j],oldProbability:R.old[j]}));
    return [...v.terms.map((x,j)=>{const ratio=R.ratios[j],a=R.advantages[j],clipped=Math.max(1-p.epsilon,Math.min(1+p.epsilon,ratio));return C('clip-'+j,'裁剪目标项 '+j,x,`min(${n(ratio)} × ${n(a)}, ${n(clipped)} × ${n(a)}) = ${n(x)}`,{ratio,advantage:a,lower:1-p.epsilon,upper:1+p.epsilon},'负优势也须对两个乘积取min。');}),C('surrogate','三项平均',v.surrogate,`(${list(v.terms)}) / 3 = ${n(v.surrogate)}`,{terms:v.terms}),C('kl','新旧策略 KL',v.kl,`Σ p新 × ln(p新/p旧) = ${n(v.kl)}`,{updated:R.updated,old:R.old},'这里只诊断策略偏离，未加入更新梯度。')];
  },[E('equal-rewards','把同组奖励改为同分','没有相对差异还能产生策略更新吗？',{rewards:'mixed'},{rewards:'equal'},'同分组标准差为0，优势、梯度为0，候选策略等于旧策略。',(a,b)=>a.result.sd>0&&b.result.sd===0&&b.result.advantages.every(x=>x===0)&&b.result.gradient===0&&equal(b.result.updated,b.result.old))]);

  models['cme-online-softmax']=define('每块保留共同最大值 m、分母 l 和加权分子 z，检查结果与完整 Softmax 一致。',(t,i,v,s,line)=>{
    if(line===1)return v.scores.map((x,j)=>C('score-'+j,'位置 '+j+' 分数',x,`${j+1} + ${t.params.offset} = ${x}`,{offset:t.params.offset,value:v.values[j]}));
    if(line===2)return [C('initial','初始归一化状态','m未定义；l=0；z=0','尚未读取分数 → 无最大值、分子分母均为0',{m:null,l:0,z:0},'未读到有效分母时不执行 z/l。')];
    let blockIndex=i;while(blockIndex>=0&&t.steps[blockIndex].line!==4)blockIndex--;
    const block=t.steps[blockIndex].variables,old=state(t,blockIndex-1),oldM=old.m??null,oldL=old.l||0,oldZ=old.z||0;
    if(line===4)return [C('max','新共同最大值',v.nextM,`max(${oldM===null?'尚无旧最大值':n(oldM)}, ${v.blockScores.map(n).join(', ')}) = ${n(v.nextM)}`,{oldMaximum:oldM,blockScores:v.blockScores}),C('rescale','旧累计量重缩放系数',v.scale,oldM===null?'首块没有旧累计量 → 0':`exp(${n(oldM)} − ${n(v.nextM)}) = ${n(v.scale)}`,{oldMaximum:oldM,nextMaximum:v.nextM})];
    if(line===6){const e=block.blockScores.map(x=>Math.exp(x-block.nextM)),values=t.result.values.slice(block.start,block.start+e.length);return [...e.map((x,j)=>C('exp-'+j,'本块指数 '+j,x,`exp(${block.blockScores[j]} − ${block.nextM}) = ${n(x)}`,{score:block.blockScores[j],maximum:block.nextM})),C('denominator','更新分母 l',v.l,`${n(block.scale)} × ${n(oldL)} + ${list(e)} = ${n(v.l)}`,{scale:block.scale,oldL,exps:e}),C('numerator','更新加权分子 z',v.z,`${n(block.scale)} × ${n(oldZ)} + ${product(e,values)} = ${n(v.z)}`,{scale:block.scale,oldZ,exps:e,values})];}
    return [C('online','在线加权输出',v.output,`${n(t.result.z)} / ${n(t.result.l)} = ${n(v.output)}`,{numerator:t.result.z,denominator:t.result.l}),C('check','完整Softmax核对误差',v.error,`${n(v.output)} − ${n(v.reference)} = ${n(v.error)}`,{online:v.output,reference:v.reference},'最终核对：仅浮点误差；不是GPU吞吐或显存测量。')];
  },[E('offset','所有分数共同增加1000','大数平移会改变权重或让指数溢出吗？',{offset:0,block:2},{offset:1000,block:2},'共同减最大值保持输出，在线值仍与完整归一化一致。',(a,b)=>b.result.scores[0]-a.result.scores[0]===1000&&near(a.result.output,b.result.output)&&near(b.result.output,b.result.reference)&&Number.isFinite(b.result.z))]);

  models['cme-speculative']=define('区分草稿提出、按 p/q 接受，以及拒绝后的残差重采样。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params;
    if(line===1)return [...v.target.map((x,j)=>C('target-'+j,'目标概率 '+j,x,j===0?`p₀ = ${p.p0}`:`1 − ${p.p0} = ${n(x)}`,{p0:p.p0})),...v.draft.map((x,j)=>C('draft-'+j,'草稿概率 '+j,x,j===0?`q₀ = ${p.q0}`:`1 − ${p.q0} = ${n(x)}`,{q0:p.q0}))];
    if(line===2)return [C('proposal','草稿建议候选',v.proposed,`${p.draftU} < ${p.q0} ? 0 : 1 → ${v.proposed}`,{draw:p.draftU,threshold:p.q0},'页面固定落点用于复算单轨迹；不证明采样频率。')];
    if(line===3)return [C('acceptance','接受概率',v.acceptance,`min(1, ${n(v.targetProbability)}/${n(v.draftProbability)}) = ${n(v.acceptance)}`,{target:v.targetProbability,draft:v.draftProbability})];
    if(line===4)return [C('accept','接受判断',v.accepted,`${p.acceptU} < ${n(R.acceptance)} → ${v.accepted}`,{draw:p.acceptU,acceptance:R.acceptance},'接受落点与草稿落点在概率推导中应独立。')];
    if(line===5){const raw=R.target.map((x,j)=>Math.max(0,x-R.draft[j])),z=sum(raw);return v.residual.map((x,j)=>C('residual-'+j,'拒绝修正概率 '+j,x,z?`max(${n(R.target[j])}−${n(R.draft[j])},0) / ${n(z)} = ${n(x)}`:'p=q → 拒绝概率0，无须抽取零残差',{target:R.target[j],draft:R.draft[j],raw,total:z},'仅在拒绝时使用该分布。'));}
    return [C('output','最终候选',v.output,v.accepted?`已接受 → 草稿候选 ${v.proposed}`:`已拒绝；0.6 < ${n(R.residual[0])} ? 0 : 1 → ${v.output}`,{accepted:v.accepted,proposed:v.proposed,residual:R.residual},'最终核对：单位置教学案例，不模拟多token并行核验或实际延迟。')];
  },[E('accept-draw','只改变接受判断落点','同一个草稿建议可以被接受或拒绝吗？',{acceptU:.7},{acceptU:.2},'接受概率保持0.625；落点跨越阈值后接受状态与输出候选变化。',(a,b)=>near(a.result.acceptance,b.result.acceptance)&&a.result.accepted===false&&b.result.accepted===true&&a.result.output!==b.result.output)]);

  models['cme-memory']=define('按人工向量算余弦、筛选证据并保留来源，资料不足时明确返回空结果。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params;
    if(line===1)return v.chunks.map(d=>C(d.id,'给定片段 '+d.id,JSON.stringify(d.vector),`${d.id} → ${JSON.stringify(d.vector)}`,{text:d.text,queryVector:v.queryVector},'片段事实与向量均为人工教学资料，不是实际商业规则。'));
    if(line===2)return v.scored.map(d=>{const chunk=s.chunks.find(c=>c.id===d.id),q=R.queryVector,k=chunk.vector;return C(d.id,'余弦 '+d.id,d.score,`(${product(q,k)}) / (${n(Math.hypot(...q))} × ${n(Math.hypot(...k))}) = ${n(d.score)}`,{query:q,document:k},'相似度不是资料支持当前问题的真实性概率。');});
    if(line===3)return v.ranking.map((id,j)=>C('rank-'+j,'排名 '+(j+1),id,`按分数降序；${id} 的分数 ${n(R.scored.find(x=>x.id===id).score)}`,{ranking:v.ranking},'同分按id排序，不是学习得到的重排器。'));
    if(line===4)return R.scored.map(d=>C(d.id,'选入 '+d.id,v.selected.includes(d.id),`${n(d.score)} ≥ ${p.threshold}，并且位于最多 ${p.topk} 个保留名额内 → ${v.selected.includes(d.id)}`,{score:d.score,threshold:p.threshold,selected:v.selected},'预算与阈值选择不保证片段支持问题。'));
    if(line===5)return v.context.length?v.context.map(d=>C(d.source,'带来源上下文',d.text,`保留来源 ${d.source} 与原片段文本`,{source:d.source},'确定性摘录，不调用生成模型。')):[C('empty','空上下文','资料不足','通过阈值的片段数 = 0',{threshold:p.threshold})];
    return [C('answer','引用或资料不足',v.answer,v.sourceIds.length?`输出 ${v.sourceIds.length} 条带 [source] 的摘录`:'没有引用来源 → 资料不足',{sources:v.sourceIds},'最终核对：教学语料中不存在天气资料。')];
  },[E('missing-evidence','改问天气','没有天气资料时，还应引用退货规则回答吗？',{query:'returns',threshold:.7},{query:'weather',threshold:.7},'退货问题有检索片段，天气问题无片段，返回资料不足。',(a,b)=>a.result.selected.length>0&&b.result.selected.length===0&&b.result.answer==='资料不足')]);

  models.sampling=define('温度与 top-k 改变归一化分布，固定落点 u 在累计区间内选择一个候选。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params;
    if(line===1)return v.logits.map((x,j)=>C('logit-'+j,'候选 '+j+' logit',x,`给定 logit[${j}] = ${x}`,{logits:v.logits},'logit 是分数，不是概率。'));
    if(line===2)return v.scaled.map((x,j)=>C('scaled-'+j,'温度缩放 '+j,x,`${R.logits[j]} / ${p.temperature} = ${n(x)}`,{logit:R.logits[j],temperature:p.temperature}));
    if(line===3)return v.kept.map((x,j)=>C('kept-'+j,'top-k保留 '+j,x===null?'已移除':x,`${j} < ${p.topk} → ${x===null?'不参与分母':n(x)}`,{rank:j,topk:p.topk},'被移除位置的概率严格为0。'));
    if(line===4){const kept=R.kept.filter(x=>x!==null),m=Math.max(...kept),exps=R.kept.map(x=>x===null?0:Math.exp(x-m));return v.probs.map((x,j)=>C('prob-'+j,'候选概率 '+j,x,R.kept[j]===null?'移除 → 0':`exp(${n(R.kept[j])}−${n(m)}) / (${list(exps)}) = ${n(x)}`,{kept:R.kept,exps}));}
    if(line===5)return v.cdf.map((x,j)=>C('cdf-'+j,'累计区间右端 '+j,x,`${list(R.probs.slice(0,j+1))} = ${n(x)}`,{probabilities:R.probs.slice(0,j+1),draw:p.u}));
    const j=R.token,lower=j?R.cdf[j-1]:0;return [C('sample','本次候选',v.token,`${n(lower)} ≤ ${p.u} < ${n(R.cdf[j])} → ${v.token}`,{lower,upper:R.cdf[j],draw:p.u},'一次固定落点结果不代表采样分布的频率。')];
  },[E('temperature','降低温度','最大概率和固定落点选中的候选会怎样变化？',{temperature:1},{temperature:.25},'概率更集中，固定u=0.7从第二候选变为第一候选。',(a,b)=>b.result.probs[0]>a.result.probs[0]&&a.result.token===1&&b.result.token===0)]);

  models.lora=define('保留冻结基座，逐格核对 A 降维、B 升维、α/r 缩放与残差相加。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params;
    if(line===1||line===2)return (v.x||v.base).map((x,j)=>C('base-'+j,line===1?'输入 x'+j:'冻结基座输出 '+j,x,line===1?`x[${j}] = ${x}`:`单位矩阵 W₀ 的第 ${j} 行 × x = ${x}`,{input:R.x},'给定的四维玩具模型；没有训练适配器。'));
    if(line===3)return v.hidden.map((x,j)=>C('hidden-'+j,'A x 第 '+j+' 维',x,`${product(R.A[j],R.x)} = ${n(x)}`,{row:R.A[j],input:R.x}));
    if(line===4)return v.delta.map((x,j)=>C('delta-'+j,'适配器贡献 '+j,x,`(${product(R.B[j],R.hidden)}) × ${p.alpha}/${p.rank} = ${n(x)}`,{row:R.B[j],hidden:R.hidden,alpha:p.alpha,rank:p.rank}));
    if(line===5)return v.output.map((x,j)=>C('output-'+j,'输出第 '+j+' 维',x,`${n(v.base[j])} + ${n(v.delta[j])} = ${n(x)}`,{base:v.base[j],delta:v.delta[j]}));
    return [C('parameters','可训练参数',v.trainable,`${p.rank} × (4 + 4) = ${v.trainable}`,{rank:p.rank,input:4,output:4},'玩具矩阵r≥2时已不节约参数；参数更多不保证任务更好。'),C('saved','节省比例',v.savedFraction,`1 − ${v.trainable}/16 = ${n(v.savedFraction)}`,{full:16,adapter:v.trainable})];
  },[E('zero-alpha','把α设为0','关掉适配器贡献时，哪些参数计数还保留？',{alpha:1},{alpha:0},'增量全0、输出等于基座，可训练参数计数保持。',(a,b)=>b.result.delta.every(x=>x===0)&&equal(b.result.output,b.result.base)&&a.result.trainable===b.result.trainable)]);

  models.parallel=define('分别核算状态分片与跨卡梯度平均，避免把显存分片直接当作加速。',(t,i,v,s,line)=>{
    const R=t.result,p=t.params,labels=['参数','梯度','优化器'];
    if(line===1)return v.bytesByType.map((x,j)=>C('bytes-'+j,labels[j]+'字节',x,`${[2,2,12][j]} × ${p.parameters} × 10⁹ = ${x}`,{parametersB:p.parameters,bytesPerParameter:[2,2,12][j]},'十进制字节；不含激活和通信缓冲。'));
    if(line===2)return v.perCard.map((x,j)=>{const divisor=j>=3-p.zero?p.gpus:1;return C('local-'+j,'每卡'+labels[j]+' GB',x,`${R.local[j]} / ${divisor} / 10⁹ = ${n(x)}`,{bytes:R.local[j],divisor},'只对当前ZeRO级别需要分片的状态除以卡数。');});
    if(line===3)return v.grads.flatMap((row,j)=>row.map((x,d)=>C(`grad-${j}-${d}`,`卡${j}梯度维${d}`,x,d===0?`${j}+1 = ${x}`:`2 − ${j}/4 = ${x}`,{card:j},'本站给定梯度案例，不是实际GPU反向传播。')));
    if(line===4)return v.mean.map((x,d)=>C('mean-'+d,'平均梯度维 '+d,x,`(${list(R.grads.map(row=>row[d]))}) / ${p.gpus} = ${n(x)}`,{gradients:R.grads.map(row=>row[d]),cards:p.gpus}));
    if(line===5)return v.updated.map((x,d)=>C('updated-'+d,'更新后的权重 '+d,x,`1 − ${v.learningRate} × ${n(R.mean[d])} = ${n(x)}`,{oldWeight:1,learningRate:v.learningRate,gradient:R.mean[d]}));
    const parts=R.local.map((x,j)=>x/(j>=3-p.zero?p.gpus:1)/1e9);return [C('gb','每卡持久状态 GB',v.perCardGB,`${list(parts)} = ${n(v.perCardGB)}`,{parts,zero:p.zero},'最终核对：不代表总峰值显存或真实扩展效率。')];
  },[E('zero3','DDP改为ZeRO-3','分片状态会改变当前固定梯度的数学平均吗？',{zero:0,gpus:4},{zero:3,gpus:4},'每卡持久状态32GB→8GB，逻辑平均梯度及更新保持。',(a,b)=>near(a.result.perCardGB,4*b.result.perCardGB)&&equal(a.result.mean,b.result.mean)&&equal(a.result.updated,b.result.updated))]);

  models.agent=define('逐事件跟踪预设策略、工具返回、测试结果和停止条件；停止不等于修复成功。',(t,i,v,s,line)=>{
    if(line===1)return [C('budget','剩余调用预算',v.budget-v.calls,`${v.budget} − ${v.calls} = ${v.budget-v.calls}`,{budget:v.budget,calls:v.calls},'预设策略与内存工具；没有调用外部Agent模型。')];
    if(line===3)return [C('tool','本次工具选择',v.tool,`calls=${v.calls}；首次read，之后test/edit交替 → ${v.tool}`,{calls:v.calls,implementation:v.implementation},'下一步接收工具结果后才有新证据。')];
    if(line===4||line===6){const ob=v.observation||v.latest?.observation;if(ob?.results)return ob.results.map((x,j)=>C('test-'+j,'测试 '+j+' 结果',x.actual,`${x.actual} ${x.actual===x.expected?'=':'≠'} 规则要求 ${x.a}+${x.b}=${x.expected}`,{a:x.a,b:x.b,actual:x.actual,expected:x.expected},'只说明这三个给定用例，不能证明所有输入正确。'));return [C('observation','已收到工具结果',JSON.stringify(ob),`${line===4?'调用数加1':'把刚收到的观察追加到上下文'}；累计 ${v.calls} 次调用`,{calls:v.calls,observation:ob},ob?.error?'工具错误与测试失败分别保留。':'执行结果来自当前内存案例。')];}
    if(line===7){const error=!!s.observation?.error,cont=!v.passed&&v.calls<v.budget&&!error;return [C('continue','是否允许继续',cont,`未通过=${!v.passed} 且 ${v.calls}<${v.budget} 且 无工具错误=${!error} → ${cont}`,{passed:v.passed,calls:v.calls,budget:v.budget,toolError:error})];}
    return [C('stop','实际停止原因',v.stop,`测试通过=${v.passed}；已调用${v.calls}次 → ${v.stop}`,{passed:v.passed,calls:v.calls,implementation:v.implementation},'最终核对：预算耗尽、工具错误不计为成功。')];
  },[E('budget','把工具预算5增至6','已编辑成正确函数，是否就可跳过最后的测试？',{scenario:'retry',budget:5},{scenario:'retry',budget:6},'5次时缺最终测试而预算耗尽；6次时收到全部通过的测试结果。',(a,b)=>a.result.stop==='budget_exhausted'&&!a.result.passed&&b.result.stop==='tests_passed'&&b.result.passed&&b.result.context.at(-1).tool==='test')]);

  models.tools=define('先校验结构化请求，再比较版本；相同幂等键重试读取已有回执而非再写一次。',(t,i,v,s,line)=>{
    const p=t.params;
    if(line===1)return v.definition.inputSchema.required.map(k=>C('required-'+k,'必需参数 '+k,'必需',`${v.definition.name} 的 schema.required 包含 ${k}`,{type:v.definition.inputSchema.properties[k]},'固定案例schema，不是通用JSON Schema解释器。'));
    if(line===2)return Object.entries(v.args).map(([k,x])=>C('arg-'+k,'请求参数 '+k,x,`${k} = ${JSON.stringify(x)}`,{tool:v.name},'只展示结构化请求，尚未执行读写。'));
    if(line===3)return [C('valid','参数校验结果',v.valid,p.mode==='read'?`整数 ${p.limit} 满足 1≤limit≤3 → ${v.valid}`:'写请求结构有效；版本冲突仍须在执行时检查',{mode:p.mode,limit:p.limit,version:p.version,error:v.error})];
    if(line===4)return [C('no-write','错误请求写入次数',v.writes,`参数不合法 → 不分派工具 → ${v.writes} 次写入`,{error:v.message})];
    if(line===5)return [C('first','首次返回',JSON.stringify(v.first),p.mode==='read'?`取最多 ${p.limit} 条案例问题`:`预期版本 ${p.version} 与当前版本1比较 → ${v.first.isError?'冲突，不写入':'open→closed，版本1→2，写入1次'}`,{first:v.first,writes:v.writes})];
    if(line===6)return [C('retry','相同请求重试',v.retry?.replayed===true?'复用回执':v.retry?.isError?'仍为冲突':'无写重试',v.retry?.replayed?'同一key命中成功回执 → 直接返回，不重复执行':p.mode==='read'?'读取请求没有写入重试':'没有成功回执，保留版本冲突',{retry:v.retry}),C('writes','实际写入次数',v.writes,`首次执行 + 幂等重放新增0次 = ${v.writes}`,{writes:v.writes},'回执查询必须早于版本检查，以便重放成功请求。')];
    return [C('final-writes','整次案例写入次数',v.writes,`首次结果与重试结果归并，实际写入 ${v.writes} 次`,{first:v.output.first,retry:v.output.retry},'最终核对：只修改本次内存案例对象。')];
  },[E('stale-version','提交过期写入版本','请求结构合法是否就可以覆盖新版本？',{mode:'write',version:1},{mode:'write',version:0},'正确版本写一次并幂等重放；过期版本写零次并返回冲突。',(a,b)=>a.result.writes===1&&a.result.retry.replayed===true&&b.result.writes===0&&b.result.status==='version_conflict')]);

  models.context=define('先给输出留预算，再保留必需约束与任务，逐片段判断能否完整装入。',(t,i,v,s,line)=>{
    const costs={'约束':8,'任务':7,'目标函数':14,'相关测试':10,'失败日志':6,'项目历史说明':18};
    if(line===1)return [C('input-budget','输入预算',v.inputBudget,`${v.budget} − ${v.reserve} = ${v.inputBudget}`,{total:v.budget,reserved:v.reserve},'token开销均为人工教学数字，不来自真实tokenizer。')];
    if(line===3)return [C('mandatory','必需内容预算',v.used,`${v.mandatory.map(x=>x.cost).join(' + ')} = ${v.used}`,{mandatory:v.mandatory,inputBudget:v.inputBudget},'容量不足时必须拒绝，不能静默丢弃任务或约束。')];
    if(line===4)return v.ordered.map((x,j)=>C('order-'+j,'候选次序 '+(j+1),x.name,`${x.name} 需要 ${x.cost} token，按${t.params.strategy==='priority'?'给定相关性':'文件顺序'}检查`,{cost:x.cost},'排序为作者预设，不是模型自动评估。'));
    if(line===6){if(v.status==='insufficient_capacity')return [C('overflow','必需内容超过容量',true,`${v.used} > ${v.inputBudget} → 拒绝继续装入`,{required:v.used,budget:v.inputBudget})];const cost=costs[v.item],before=v.accepted?v.used-cost:v.used;return [C('fits','是否装入 '+v.item,v.accepted,`${before} + ${cost} ≤ ${v.inputBudget} → ${v.accepted}`,{previousUsed:before,cost,budget:v.inputBudget}),C('used','本步已用预算',v.used,v.accepted?`${before} + ${cost} = ${v.used}`:`不装入，保持 ${before}`,{accepted:v.accepted})];}
    const used=sum(v.selected.map(x=>costs[x]));return [C('remaining','剩余输入预算',v.remaining,`${s.inputBudget} − (${v.selected.map(x=>costs[x]).join(' + ')}) = ${v.remaining}`,{selected:v.selected,used,budget:s.inputBudget},'最终核对：窗口空位不等于已保留足够证据。')];
  },[E('reserve','多预留8个输出token','预留输出增加，输入选择和必需内容会怎样变化？',{reserve:16},{reserve:24},'输入预算40→32，必需任务与约束保持，少装入一个可选片段。',(a,b)=>a.result.inputBudget-b.result.inputBudget===8&&b.result.selected.includes('约束')&&b.result.selected.includes('任务')&&b.result.selected.length<a.result.selected.length&&b.result.used<=b.result.inputBudget)]);

  return {courseId:'cme295',models};
});
