/* Original numerical companions to the published CME 295 Autumn 2026 lectures. */
(function(root,factory){
  const register=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=register;
  else register(root.AICourseModels);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
  const choose=(id,label,options,value)=>({id,label,type:'select',options,value});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const bars=(title,values,unit='',max=null)=>({kind:'bars',title,rows:values.map(([label,value])=>({label,value})),unit,max});
  const flow=(title,nodes)=>({kind:'flow',title,nodes:nodes.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
  const softmax=xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z)};
  const sum=xs=>xs.reduce((a,b)=>a+b,0);
  const dot=(a,b)=>sum(a.map((x,i)=>x*b[i]));
  function rec(model,p,code){const steps=[];return{add(line,title,detail,variables,visual){steps.push(copy({line,title,detail,variables,visual}))},end(result){return{model,params:p,code:code.split('\n'),steps,result:copy(result)}}}}
  return function register(M){
    if(!M||typeof M.register!=='function')throw Error('CME 295 requires AICourseModels.register');

    M.register('cme-representations',[range('merges','BPE 合并次数',0,4,1,2),choose('order','输入词序',[['normal','low lower'],['reverse','lower low']],'normal')],p=>{
      const r=rec('cme-representations',p,`let corpus = ['low','low','lower'].map(w=>[...w]);
const pairCounts = countAdjacentPairs(corpus);
const pair = mostFrequentPair(pairCounts); // 同频时按字符串排序
corpus = mergeNonoverlapping(corpus,pair);
const pieces = applyLearnedMerges(inputWords,merges);
const vectors = pieces.map(piece=>embeddingTable[piece]);
const pooled = mean(vectors); // 丢失顺序
let h=0; for(const v of vectors) h=Math.tanh(0.5*h+v[0]);`);
      let corpus=['low','low','lower'].map(w=>[...w]);const merges=[];
      r.add(1,'从字符和词边界开始','训练语料固定为 low、low、lower；本例不跨词合并，不实现真实 tokenizer 的字节编码和特殊 token。',{corpus},flow('初始字符',corpus.map((x,i)=>['词 '+i,x.join(' · '),false])));
      const merge=(seq,pair)=>{const out=[];for(let i=0;i<seq.length;i++){if(i+1<seq.length&&seq[i]===pair[0]&&seq[i+1]===pair[1]){out.push(seq[i]+seq[i+1]);i++}else out.push(seq[i])}return out};
      for(let k=0;k<p.merges;k++){
        const counts=new Map();for(const seq of corpus)for(let j=0;j<seq.length-1;j++){const key=JSON.stringify([seq[j],seq[j+1]]);counts.set(key,(counts.get(key)||0)+1)}
        const ranked=[...counts].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0));if(!ranked.length)break;
        const pair=JSON.parse(ranked[0][0]);merges.push(pair);
        r.add(3,'选出现最多的相邻对','按语料实际计数；计数相同使用固定排序，便于复现。',{round:k+1,pair,count:ranked[0][1]},bars('当前相邻对计数',ranked.map(([s,n])=>[JSON.parse(s).join(' + '),n]),'次'));
        corpus=corpus.map(x=>merge(x,pair));r.add(4,'在每个词内做非重叠合并','将学到的合并规则依次用于新输入，不能根据新输入临时重排规则。',{corpus,merges},flow('合并后的语料',corpus.map((x,i)=>['词 '+i,x.join(' · '),true])));
      }
      const words=p.order==='normal'?['low','lower']:['lower','low'];let sequences=words.map(w=>[...w]);for(const pair of merges)sequences=sequences.map(x=>merge(x,pair));const pieces=sequences.flat();
      r.add(5,'把规则应用到输入','两种词序使用同一词表和合并序列；token 数量受合并规则影响。',{pieces,tokenCount:pieces.length},flow('输入 token',pieces.map((x,i)=>['位置 '+i,x,false])));
      const vocab=[...new Set(corpus.flat())].sort(),table=Object.fromEntries(vocab.map((x,i)=>[x,[(i+1)/10,((i+1)%3)/10]])),vectors=pieces.map(x=>table[x]);
      r.add(6,'用 token ID 查表示向量','向量是本站指定的教学表，不是训练得到的语义表示。one-hot 乘嵌入矩阵等价于取对应一行。',{vocab,table,vectors},bars('每个 token 的向量第一维',pieces.map((x,i)=>[i+': '+x,vectors[i][0]])));
      const pooled=[0,1].map(d=>sum(vectors.map(v=>v[d]))/vectors.length);r.add(7,'对比无序汇总与序列模型','均值池化只看这些向量，不区分先后；这解释了为什么仅靠词袋表示不能完整表达语序。',{pooled},bars('均值池化输出',pooled.map((x,i)=>['维 '+i,x])));
      let h=0;const states=[];for(const v of vectors){h=Math.tanh(.5*h+v[0]);states.push(h)}r.add(8,'让隐藏状态按顺序传递','这里是标量 RNN 的真实递推。LSTM 增加门与细胞状态以改善长期信息传递，但仍按序更新。',{states,finalState:h},bars('RNN 每步隐藏状态',states.map((x,i)=>['位置 '+i,x]),'',1));
      return r.end({merges,pieces,tokenCount:pieces.length,pooled,states,finalState:h});
    });

    M.register('cme-moe',[range('x','输入标量 x',1,3,1,2),range('gate','第一个路由分数',0,4,.5,2),range('topk','激活专家数 k',1,3,1,2)],p=>{
      const r=rec('cme-moe',p,`const scores=[gate,1,0];
const probs=softmax(scores);
const chosen=rankDescending(probs).slice(0,topk);
const z=sum(chosen.map(i=>probs[i]));
const weights=probs.map((v,i)=>chosen.includes(i)?v/z:0);
const expertOutputs=[x,2*x,-x];
const output=dot(weights,expertOutputs);`);
      const scores=[p.gate,1,0];r.add(1,'路由器先打分','分数是给定的教学值；真实路由器通常由可训练层产生。',{scores},bars('三个专家的路由分数',scores.map((v,i)=>['专家 '+i,v])));
      const probs=softmax(scores);r.add(2,'转换为路由概率','概率用于决定哪些专家参与；这不是对专家正确率的评估。',{probs},bars('路由概率',probs.map((v,i)=>['专家 '+i,v]),'比例',1));
      const chosen=probs.map((_,i)=>i).sort((a,b)=>probs[b]-probs[a]||a-b).slice(0,p.topk);r.add(3,'只调用 top-k 专家','稀疏激活减少每个 token 的活跃计算；总参数仍需存储，且实际还涉及容量限制与跨卡通信。',{chosen,activeParameters:p.topk*4,totalParameters:12},flow('本次被激活的专家',probs.map((v,i)=>['专家 '+i,chosen.includes(i)?'激活':'不激活',chosen.includes(i)])));
      const z=sum(chosen.map(i=>probs[i])),weights=probs.map((v,i)=>chosen.includes(i)?v/z:0);r.add(5,'对选中权重重新归一化','本例采用选中专家后重新归一化的规则；工程实现可能有共享专家与额外缩放，需按模型定义核对。',{weights,z},bars('实际汇总权重',weights.map((v,i)=>['专家 '+i,v]),'比例',1));
      const expertOutputs=[p.x,2*p.x,-p.x];r.add(6,'计算各专家输出','用三个标量函数代替 FFN，便于观察路由变化与输出的关系。',{expertOutputs},bars('专家函数输出',expertOutputs.map((v,i)=>['专家 '+i,v])));
      const output=dot(weights,expertOutputs);r.add(7,'汇总激活专家','不同输入可以走不同专家；总参数多不意味着每个 token 都计算所有参数。',{output,activeExperts:chosen.length},bars('汇总输出',[['加权输出',output]]));return r.end({scores,probs,chosen,weights,expertOutputs,output,activeParameters:p.topk*4,totalParameters:12});
    });

    M.register('cme-rope',[range('qpos','Query 位置',0,8,1,2),range('kpos','Key 位置',0,8,1,1),range('shift','共同平移的位置数',0,4,1,0),range('theta','每位置旋转角',.25,1,.25,.5,'rad')],p=>{
      const r=rec('cme-rope',p,`const rotate=(v,a)=>[v[0]*cos(a)-v[1]*sin(a),v[0]*sin(a)+v[1]*cos(a)];
const q=rotate([1,0],qpos*theta);
const k=rotate([1,0],kpos*theta);
const score=dot(q,k);
const movedQ=rotate([1,0],(qpos+shift)*theta);
const movedK=rotate([1,0],(kpos+shift)*theta);
const movedScore=dot(movedQ,movedK);`);
      const rotate=a=>[Math.cos(a),Math.sin(a)];r.add(1,'从一个二维子空间开始','真实 RoPE 把向量按二维分组，每组使用不同频率。这里仅看一组，基础向量均为 [1,0]。',{theta:p.theta},flow('位置对应旋转角',[['Query',p.qpos+' × '+p.theta,false],['Key',p.kpos+' × '+p.theta,false]]));
      const q=rotate(p.qpos*p.theta);r.add(2,'旋转 Query','旋转保持向量长度，位置被编码到方向。',{q,norm:Math.hypot(...q)},bars('旋转后 Query',q.map((x,i)=>['维 '+i,x]),'',1));
      const k=rotate(p.kpos*p.theta);r.add(3,'旋转 Key','相同的旋转规则作用于 Key；不把位置数直接加进特征。',{k,norm:Math.hypot(...k)},bars('旋转后 Key',k.map((x,i)=>['维 '+i,x]),'',1));
      const score=dot(q,k);r.add(4,'点积体现相对位置','对这两个基础向量，得分等于 cos((Query位置−Key位置)θ)。一般向量也具有相对旋转关系。',{score,relativePosition:p.qpos-p.kpos},bars('当前相对位置得分',[['q·k',score]],'',1));
      const movedQ=rotate((p.qpos+p.shift)*p.theta),movedK=rotate((p.kpos+p.shift)*p.theta);r.add(6,'同时平移两者','两个位置增加相同数值，角度差保持不变；只移动一个位置则不成立。',{movedQ,movedK},flow('共同平移',[['Query 新位置',p.qpos+p.shift,true],['Key 新位置',p.kpos+p.shift,true]]));
      const movedScore=dot(movedQ,movedK);r.add(7,'核对平移不变性','这只说明 RoPE 的相对旋转结构，不保证任意长上下文都能泛化。',{score,movedScore,difference:movedScore-score},bars('共同平移前后',[['原得分',score],['平移后',movedScore]],'',1));return r.end({q,k,score,movedQ,movedK,movedScore});
    });

    M.register('cme-training',[choose('objective','查看训练目标',[['pretrain','预训练交叉熵'],['sft','仅回答部分 SFT'],['dpo','偏好对 DPO'],['distill','教师分布蒸馏']],'sft'),range('p','学生对第一个候选的概率',.1,.9,.1,.6),range('q','教师 / 参考分布概率',.1,.9,.1,.8),range('beta','DPO β',.1,2,.1,.5)],p=>{
      const r=rec('cme-training',p,`const student=[p,1-p], teacher=[q,1-q];
const pretrainLoss=(-log(p)-log(0.8))/2;
const sftLoss=-log(0.8); // prompt 位置不计入 loss
const margin=log(p/(1-p))-log(q/(1-q));
const dpoLoss=log1p(exp(-beta*margin));
const kl=sum(teacher.map((t,i)=>t*log(t/student[i])));
const loss=selectObjective(objective);`);
      const student=[p.p,1-p.p],teacher=[p.q,1-p.q];r.add(1,'先指定预测分布和训练位置','所有数值为固定二候选任务；不加载权重。对序列的损失要说明哪些位置进入平均。',{student,teacher,objective:p.objective},bars('学生分布',student.map((v,i)=>['候选 '+i,v]),'比例',1));
      const pretrainLoss=(-Math.log(p.p)-Math.log(.8))/2;r.add(2,'预训练：各目标 token 贡献损失','两个目标位置的正确概率分别为 p 与 0.8；负对数概率越大，表示模型给正确目标的概率越小。',{correctProbabilities:[p.p,.8],pretrainLoss},bars('各目标位置的交叉熵',[['位置 0',-Math.log(p.p)],['位置 1',-Math.log(.8)]],'nat'));
      const sftLoss=-Math.log(.8);r.add(3,'SFT：用 mask 选择监督位置','prompt 是条件输入，不必作为训练目标。这里把第一个位置当 prompt，第二个位置当回答；改变 prompt 位置概率不改变此 SFT loss。',{lossMask:[0,1],sftLoss},bars('进入 SFT 损失的贡献',[['prompt',0],['回答',sftLoss]],'nat'));
      const margin=Math.log(p.p/(1-p.p))-Math.log(p.q/(1-p.q)),dpoLoss=Math.log1p(Math.exp(-p.beta*margin));r.add(5,'DPO：比较偏好对相对参考模型的变化','第一个候选被标为 chosen。用学生与固定参考的对数赔率差建立偏好目标；这里是二候选的简化序列案例。',{beta:p.beta,margin,dpoLoss},bars('相对偏好目标',[['DPO loss',dpoLoss]],'nat'));
      const kl=sum(teacher.map((t,i)=>t*Math.log(t/student[i])));r.add(6,'蒸馏：学习教师的软分布','KL(teacher || student) 与相反方向不同。真实 OPD 使用学生生成的轨迹再取教师信号，本模型只算给定位置的分布差异。',{teacher,student,kl},bars('两候选的概率差',[['教师候选0',teacher[0]],['学生候选0',student[0]]],'比例',1));
      const losses={pretrain:pretrainLoss,sft:sftLoss,dpo:dpoLoss,distill:kl},loss=losses[p.objective];r.add(7,'明确当前优化哪一个目标','不同目标使用不同数据与信号；数值更小只能在同一目标、同一评测口径下比较。',{objective:p.objective,loss,losses},bars('当前选定目标',[['loss',loss]],'nat'));return r.end({student,teacher,pretrainLoss,sftLoss,margin,dpoLoss,kl,loss});
    });

    M.register('cme-rl',[choose('rewards','组内三个奖励',[['mixed','0、1、1'],['equal','1、1、1'],['sparse','0、0、1']],'mixed'),range('theta','旧策略 logit θ',-1,1,.5,0),range('eta','示例更新步长',0,3,.25,1),range('epsilon','ratio 裁剪范围 ε',.1,.3,.1,.2)],p=>{
      const r=rec('cme-rl',p,`const old=softmax([0,theta,theta]);
const baseline=sum(rewards)/3, sd=sqrt(meanSquaredDeviation(rewards));
const A=rewards.map(x=>sd===0?0:(x-baseline)/sd);
const score=[-old[1]-old[2],1-old[1]-old[2],1-old[1]-old[2]];
const gradient=sum(A.map((a,i)=>a*score[i]))/A.length;
const updated=softmax([0,theta+eta*gradient,theta+eta*gradient]);
const ratios=updated.map((x,i)=>x/old[i]);
const surrogate=sum(A.map((a,i)=>min(ratios[i]*a,clip(ratios[i],1-epsilon,1+epsilon)*a)))/A.length;`);
      const old=softmax([0,p.theta,p.theta]),rewards=p.rewards==='mixed'?[0,1,1]:p.rewards==='equal'?[1,1,1]:[0,0,1];r.add(1,'固定同一提示的三个采样回答','用三个不同的回答作为一个小组；奖励是给定的案例标注，不是模型真实性或推理质量的完整衡量。',{old,rewards},bars('组内回答的奖励',rewards.map((x,i)=>['回答 '+i,x]),'',1));
      const mean=sum(rewards)/3,sd=Math.sqrt(sum(rewards.map(x=>(x-mean)**2))/3);r.add(2,'先找组内基线','使用总体标准差口径，不同库的无偏修正设置会改变数值。所有回答同分时，分母为零必须处理。',{mean,sd},bars('奖励与组均值',[...rewards.map((x,i)=>['回答 '+i,x]),['组均值',mean]],'',1));
      const A=rewards.map(x=>sd===0?0:(x-mean)/sd);r.add(3,'GRPO 风格的相对优势','高于组均值为正，低于均值为负。同分组在此置零；没有相对信号时不能凭归一化制造梯度。',{advantages:A},bars('标准化相对优势',A.map((x,i)=>['回答 '+i,x])));
      const score=[-old[1]-old[2],1-old[1]-old[2],1-old[1]-old[2]],gradient=sum(A.map((a,i)=>a*score[i]))/3;r.add(5,'算一次 score-function 梯度估计','这是固定样本组对标量 logit 的未裁剪策略梯度估计。用它生成一个候选更新，不冒充完整 PPO 或 GRPO 训练器。',{score,gradient},bars('各回答的梯度贡献',A.map((x,i)=>['回答 '+i,x*score[i]/3])));
      const updated=softmax([0,p.theta+p.eta*gradient,p.theta+p.eta*gradient]);r.add(6,'查看候选策略如何改变','步长增大可能使策略离旧分布过远。完整实现还需要正确 token mask、KL、采样、优化器与分布式核对。',{old,updated,updatedTheta:p.theta+p.eta*gradient},bars('更新后的三个回答概率',updated.map((x,i)=>['回答 '+i,x]),'比例',1));
      const ratios=updated.map((x,i)=>x/old[i]);r.add(7,'把新旧策略的概率相除','分母是生成该批数据的旧策略。PPO/GRPO 的具体目标、KL 形式与归一化要以算法版本为准。',{ratios,lower:1-p.epsilon,upper:1+p.epsilon},bars('各回答的概率比',ratios.map((x,i)=>['回答 '+i,x])));
      const terms=A.map((a,i)=>Math.min(ratios[i]*a,Math.min(1+p.epsilon,Math.max(1-p.epsilon,ratios[i]))*a)),surrogate=sum(terms)/3,kl=sum(updated.map((x,i)=>x*Math.log(x/old[i])));r.add(8,'检查裁剪目标与策略偏离','对负优势也必须取两个乘积的 min，不能简单把概率比裁完就结束。KL 在本例作为诊断，未加入候选更新的梯度。',{terms,surrogate,kl},bars('裁剪后的各项贡献',terms.map((x,i)=>['回答 '+i,x])));return r.end({old,rewards,mean,sd,advantages:A,gradient,updated,ratios,terms,surrogate,kl});
    });

    M.register('cme-kv',[range('prefix','提示词 token 数',4,32,4,8),range('tokens','新生成 token 数',1,8,1,4),choose('kvheads','8个Query头共享KV的方式',[[8,'MHA：8个KV头'],[2,'GQA：2个KV头'],[1,'MQA：1个KV头']],2)],p=>{
      const r=rec('cme-kv',p,`const lengths=Array.from({length:tokens},(_,i)=>prefix+i+1);
const prefill=prefix*prefix;
const noCache=prefill+sum(lengths.map(t=>t*t));
const cached=prefill+sum(lengths);
const cacheBytes=2*layers*(prefix+tokens)*kvheads*headDim*bytesPerElement;
const ratio=noCache/cached;`);
      const lengths=Array.from({length:p.tokens},(_,i)=>p.prefix+i+1);r.add(1,'区分 prefill 与逐步 decode','先把提示词一起编码，再每步生成一个 token。KV cache 保存过去的 Key 和 Value，不保存每层未来所有输出。',{prefix:p.prefix,lengths},flow('本次生成过程',[['prefill',p.prefix+' tokens',true],['decode',p.tokens+' 个逐步输出',false]]));
      const prefill=p.prefix*p.prefix;r.add(2,'先算共同的提示词 QK 规模','这里只计一个注意力头的稠密 QK 点积分数对数，略去维度乘法、投影、FFN 和因果稀疏优化；不是完整 FLOP 或时间估计。',{prefillScorePairs:prefill},bars('提示词的共同工作',[['prefill QK 分数对',prefill]],'对'));
      const noCache=prefill+sum(lengths.map(t=>t*t));r.add(3,'没有缓存就重算旧位置','每个 decode 步重做完整长度 t 的稠密 t×t 分数矩阵。此比较明确采用重新计算全部旧 Query 的基线。',{perDecode:lengths.map(t=>t*t),noCache},bars('无缓存：每个解码步的分数对',lengths.map((t,i)=>['步 '+i,t*t]),'对'));
      const cached=prefill+sum(lengths);r.add(4,'只算新 Query 对旧 Key','过去的 Key/Value 已在缓存，每次仅新增最后一个 Query 对前文的 t 个分数；历史缓存仍持续占用显存。',{perDecode:lengths,cached},bars('有缓存：每个解码步的分数对',lengths.map((t,i)=>['步 '+i,t]),'对'));
      const layers=4,headDim=8,bytesPerElement=2,cacheBytes=2*layers*(p.prefix+p.tokens)*p.kvheads*headDim*bytesPerElement;r.add(5,'单独核算 KV 容量','2 代表 Key 与 Value，另外乘层数、序列长度、KV 头数、头维和元素字节数。示例只有一条序列，真实批次还要乘 batch。',{layers,headDim,bytesPerElement,cacheBytes},bars('同样8个Query头时的KV缓存',[['MHA',2*layers*(p.prefix+p.tokens)*8*headDim*2],['当前方案',cacheBytes]],'字节'));
      const ratio=noCache/cached;r.add(6,'分开看计算与显存','计算分数对的减少比例不能直接当 GPU 加速倍数。GQA/MQA 减少缓存，与计算复用是两种不同机制。',{noCache,cached,scorePairReductionRatio:ratio,cacheBytes},bars('计入共同 prefill 的分数对',[['无缓存',noCache],['有缓存',cached]],'对'));return r.end({lengths,prefill,noCache,cached,cacheBytes,ratio});
    });

    M.register('cme-online-softmax',[range('block','每块元素数',1,4,1,2),range('offset','给全部分数加常数',0,1000,100,0)],p=>{
      const r=rec('cme-online-softmax',p,`const scores=[1,2,3,4].map(x=>x+offset), values=[2,1,0,3];
let m=null,l=0,z=0;
for (const block of blocks(scores,values,blockSize)) {
  const nextM=max(m, ...block.scores), scale=m===null?0:exp(m-nextM);
  l=scale*l+sum(block.scores.map(s=>exp(s-nextM)));
  z=scale*z+sum(block.scores.map((s,i)=>exp(s-nextM)*block.values[i])); m=nextM;
}
const output=z/l;`);
      const scores=[1,2,3,4].map(x=>x+p.offset),values=[2,1,0,3];r.add(1,'一次加权汇总的输入','用四个分数演示 FlashAttention 背后的在线归一化思想；未编写或计时 GPU kernel。',{scores,values},bars('输入分数',scores.map((x,i)=>['位置 '+i,x])));
      let m=null,l=0,z=0;r.add(2,'只维护三个累积量','m 保存见过的最大分数，l 是归一化分母，z 是加权分子；不必先存下整张注意力概率矩阵。',{m,l,z},flow('在线状态',[['m','尚无最大值',true],['l',0,false],['z',0,false]]));
      for(let start=0;start<scores.length;start+=p.block){const bs=scores.slice(start,start+p.block),bv=values.slice(start,start+p.block),nextM=Math.max(m===null?-Infinity:m,...bs),scale=m===null?0:Math.exp(m-nextM);r.add(4,'读入一块并更新共同尺度','新块可能有更大的最大值，需要把旧累积量乘 exp(旧m−新m)，才与新块处在相同尺度。',{start,blockScores:bs,nextM,scale},bars('当前块分数',bs.map((x,i)=>['位置 '+(start+i),x])));l=scale*l+sum(bs.map(s=>Math.exp(s-nextM)));z=scale*z+sum(bs.map((s,i)=>Math.exp(s-nextM)*bv[i]));m=nextM;r.add(6,'累积分子和分母','这里严格保留 softmax 的数学结果；块化改变计算次序，浮点运算只会在误差范围内相等。',{m,l,z},bars('当前已读部分的输出',[['z / l',z/l]]))}
      const output=z/l,reference=dot(softmax(scores),values);r.add(8,'核对与完整 softmax 的等价','FlashAttention 的收益还来自 SRAM/HBM 的 IO 组织和反向重计算，不能只凭这个四元素例子声称实际显存或速度收益。',{output,reference,error:output-reference},bars('在线与完整计算',[['在线',output],['完整',reference]]));return r.end({scores,values,m,l,z,output,reference});
    });

    M.register('cme-speculative',[range('p0','目标模型候选0概率',.1,.9,.1,.5),range('q0','草稿模型候选0概率',.1,.9,.1,.8),range('draftU','草稿抽样点',0,.9,.1,.2),range('acceptU','接受判断抽样点',0,.9,.1,.7)],p=>{
      const r=rec('cme-speculative',p,`const target=[p0,1-p0],draft=[q0,1-q0];
const proposed=draftU<draft[0]?0:1;
const acceptance=min(1,target[proposed]/draft[proposed]);
const accepted=acceptU<acceptance;
const residual=normalize(target.map((x,i)=>max(x-draft[i],0)));
const output=accepted?proposed:sampleResidual(residual,0.6);`);
      const target=[p.p0,1-p.p0],draft=[p.q0,1-p.q0];r.add(1,'同一位置的两套分布','目标模型和草稿模型各有二候选分布。原课的分布保持推导需要正确的接受与拒绝修正，不能仅保留“猜对的 token”。',{target,draft},bars('候选0的概率',[['目标',target[0]],['草稿',draft[0]]],'比例',1));
      const proposed=p.draftU<draft[0]?0:1;r.add(2,'草稿先提出候选','使用固定抽样点，便于复算一条轨迹。完整算法会提出多个 token，目标模型并行核验。',{draftU:p.draftU,proposed},flow('草稿建议',[['候选 '+proposed,'来自草稿分布',true]]));
      const acceptance=Math.min(1,target[proposed]/draft[proposed]);r.add(3,'计算目标模型的接受概率','若目标给建议 token 更高的概率，则直接接受；否则按 p/q 的概率接受。',{acceptance,targetProbability:target[proposed],draftProbability:draft[proposed]},bars('接受与拒绝概率',[['接受',acceptance],['拒绝',1-acceptance]],'比例',1));
      const accepted=p.acceptU<acceptance;r.add(4,'用独立落点做接受判断','草稿抽样点与接受判断点在概率推导中应独立。页面手动固定它们，仅检查单条可重复轨迹。',{acceptU:p.acceptU,accepted},flow('接受判断',[['草稿 token',proposed,false],[accepted?'接受':'拒绝','u='+p.acceptU+'，阈值='+acceptance.toFixed(3),true]]));
      const raw=target.map((x,i)=>Math.max(x-draft[i],0)),total=sum(raw),residual=total===0?[0,0]:raw.map(x=>x/total);r.add(5,'拒绝时使用修正分布','残差是 max(p−q,0) 的归一化。两分布相同时拒绝概率为零，此时不需要从零残差抽样。',{residual,needed:!accepted},bars('拒绝修正分布',residual.map((x,i)=>['候选 '+i,x]),'比例',1));
      const output=accepted?proposed:.6<residual[0]?0:1;r.add(6,'输出经过修正的 token','这是一位置的数值核对，不模拟大模型并行核验、额外 token 或实际延迟；速度取决于草稿成本和接受长度。',{output,accepted,proposed},flow('最终输出',[['候选 '+output,accepted?'采用草稿建议':'从残差重采样',true]]));return r.end({target,draft,proposed,acceptance,accepted,residual,output});
    });

    M.register('cme-memory',[choose('query','当前问题',[['returns','退货窗口是几天？'],['weather','明天天气如何？'],['unknown','问题无对应资料']],'returns'),range('topk','最多检索片段数',1,3,1,2),range('threshold','相似度阈值',0,.9,.1,.7)],p=>{
      const r=rec('cme-memory',p,`const queryVector=queryVectors[query];
const scored=chunks.map(d=>({...d,score:cosine(queryVector,d.vector)}));
const ranked=[...scored].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
const selected=ranked.filter(d=>d.score>=threshold).slice(0,topk);
const context=selected.map(d=>({source:d.id,text:d.text}));
const answer=selected.length?quoteWithSources(context):'资料不足';`);
      const vectors={returns:[1,0],weather:[0,1],unknown:[-1,-1]},queryVector=vectors[p.query],chunks=[{id:'policy-1',text:'本案例退货窗口为7天。',vector:[1,0]},{id:'invoice-2',text:'本案例电子发票可在订单页下载。',vector:[.8,.2]},{id:'guide-3',text:'本案例售后咨询开放于工作日。',vector:[.7,.3]}];r.add(1,'保留可追溯的知识片段','片段、向量、事实都是本站设定的教学资料。没有查询真实天气或商业规则，也没有调用 embedding 模型。',{query:p.query,queryVector,chunks},flow('知识库片段',chunks.map(d=>[d.id,d.text,false])));
      const cosine=(a,b)=>dot(a,b)/(Math.hypot(...a)*Math.hypot(...b)),scored=chunks.map(d=>({...d,score:cosine(queryVector,d.vector)}));r.add(2,'候选检索先提高召回','用余弦相似度找候选。原课还包括关键词检索、混合检索、查询改写与 reranking；不同检索器要用独立相关性标注评测。',{scored:scored.map(d=>({id:d.id,score:d.score}))},bars('人工向量余弦相似度',scored.map(d=>[d.id,d.score]),'',1));
      const ranked=[...scored].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));r.add(3,'排序但不把相似度当真理','检索分数只衡量该表示下的接近程度，不能单独保证片段支持当前问题。这里没有训练 cross-encoder 重排器。',{ranking:ranked.map(d=>d.id)},flow('候选排序',ranked.map(d=>[d.id,d.score.toFixed(3),false])));
      const selected=ranked.filter(d=>d.score>=p.threshold).slice(0,p.topk);r.add(4,'根据阈值与预算选取','天气问题没有天气资料；阈值提高可以拒绝弱相关候选，但召回与误收都需要检查。',{selected:selected.map(d=>d.id),threshold:p.threshold},flow('选入上下文',selected.length?selected.map(d=>[d.id,d.text,true]):[['无片段','资料不足',false]]));
      const context=selected.map(d=>({source:d.id,text:d.text}));r.add(5,'增强提示词并保留来源','长期记忆进入当前上下文前应检索和核对；压缩时保留问题、约束、来源和未解决事项，不把网页中的命令当作用户授权。',{context},flow('上下文中的来源',context.length?context.map(d=>[d.source,d.text,true]):[['空上下文','拒绝无依据补全',false]]));
      const answer=selected.length?context.map(d=>'['+d.source+'] '+d.text).join('\n'):'资料不足';r.add(6,'返回引用摘录或资料不足','本步是确定性摘录，不模拟语言模型生成。工具调用扩展行动能力；Skills 编排工作流程；它们都不能替代来源与结果验证。',{answer,sourceIds:context.map(d=>d.source)},flow('回答依据',[[selected.length?'有来源摘录':'资料不足',answer,selected.length>0]]));return r.end({queryVector,scored:scored.map(d=>({id:d.id,score:d.score})),selected:selected.map(d=>d.id),context,answer});
    });
  };
});
