/* CS336: inspect actual arithmetic and recorded states; no model execution here. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const sum=xs=>xs.reduce((a,b)=>a+b,0),dot=(a,b)=>sum(a.map((x,i)=>x*b[i]));
  const f=x=>typeof x==='number'?Number(x.toFixed(4)).toString():JSON.stringify(x);
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
  const sameVector=(a,b)=>a.length===b.length&&a.every((x,i)=>near(x,b[i]));
  const cell=(id,label,value,formula,inputs={},note='本步实际计算；显示四位小数，验证使用完整精度。')=>({id,label,value,formula,inputs,note});
  const vec=(label,xs,formula,inputs={},note)=>xs.map((x,i)=>cell(label+'-'+i,label+'['+i+']',x,formula(x,i),typeof inputs==='function'?inputs(i):inputs,note));
  const exp=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  function context(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0));return {t,i,s:t.steps[i],v:t.steps[i].variables||{},p:t.params,R:t.result};}
  function previous(t,index,key,fallback){for(let i=index-1;i>=0;i--)if(Object.hasOwn(t.steps[i].variables,key))return t.steps[i].variables[key];return fallback;}
  const recipes={};
  function add(id,intuition,inspect,experiments){recipes[id]={intuition,inspect(t,index){const g=context(t,index);return {title:g.s.title+' · 逐格复算',summary:g.s.detail+' 下列每格对应本步代码与实际输入；“最终核对”另行标注。',cells:inspect(g)};},experiments};}

  add('cs336-bpe','先数词内相邻对，再用固定并列规则选一对合并；压缩后仍能拼回原词。',({t,i,s,v,p,R})=>{
    if(s.line===2)return Object.entries(v.counts).map(([key,n])=>{const pair=JSON.parse(key);const words=previous(t,i,'words',[]),counts=words.map(w=>w.slice(0,-1).filter((x,j)=>x===pair[0]&&w[j+1]===pair[1]).length);return cell('pair-'+pair.join('-'),'相邻对 '+pair.join('+'),n,counts.join(' + ')+' = '+n,{words,pair},'只数词内相邻位置；重复词按实际次数计入。');});
    if(s.line===3)return [cell('winner','本轮最高频对',v.pair,v.pair.join(' + ')+'；计数 '+v.count,{pair:v.pair,count:v.count},'并列时按固定字符串顺序，不能按语义随意选。')];
    if(s.line===1||s.line===4)return v.words.map((word,j)=>cell('word-'+j,'词 '+j,word,word.map(f).join(' + ')+' → '+word.join(''),{tokens:word},'保留词边界；合并没有删除原始字符。'));
    return [cell('tokens','当前 token 总数',R.tokenCount,R.words.map(w=>w.length).join(' + ')+' = '+R.tokenCount,{wordLengths:R.words.map(w=>w.length)}),cell('vocab','词表大小',R.vocabularySize,'5 个初始符号 + '+R.merges.length+' 条合并 = '+R.vocabularySize,{merges:R.merges})];
  },[exp('merge-more','多做一次合并','token 数应下降，解码得到的三个词保持相同。',{merges:1},{merges:2},'合并压缩符号序列，不能更改 low、low、lower。',(a,b)=>b.result.tokenCount<a.result.tokenCount&&equal(a.result.decoded,b.result.decoded))]);

  add('compute','先把参数和 token 统一为个数，再用工作量÷有效速度求时间，状态显存单独算。',({s,p,R})=>{
    if(s.line===1)return [cell('N','参数个数 N',R.N,`${p.parameters} × 10^9 = ${f(R.N)}`,{parametersB:p.parameters}),cell('D','训练 token 总数 D',R.D,`${p.tokens} × 10^9 = ${f(R.D)}`,{tokensB:p.tokens})];
    if(s.line===2)return [cell('work','稠密训练工作量',R.flops,`6 × ${f(R.N)} × ${f(R.D)} = ${f(R.flops)} FLOP`,{N:R.N,D:R.D},'6ND 为稠密模型粗估，未计重计算、长上下文等。')];
    if(s.line===3)return [cell('peak','总峰值速度',R.peakPerSecond,`${p.gpus} × ${p.peak} × 10^12 = ${f(R.peakPerSecond)} FLOP/s`,p)];
    if(s.line===4)return [cell('effective','有效计算速度',R.effective,`${f(R.peakPerSecond)} × ${p.mfu} = ${f(R.effective)} FLOP/s`,{peak:R.peakPerSecond,mfu:p.mfu})];
    if(s.line===5)return [cell('hours','理想训练时长',R.hours,`${f(R.flops)} / ${f(R.effective)} / 3600 = ${f(R.hours)} 小时`,{flops:R.flops,effective:R.effective})];
    return [cell('state','未分片状态显存',R.stateGB,`${f(R.N)} × (2+2+4+4+4) / 10^9 = ${f(R.stateGB)} GB`,{N:R.N},'十进制 GB；Adam 教学口径，不含激活和临时缓冲。')];
  },[exp('double-gpus','只把 GPU 数翻倍','工作量不变；MFU 固定时，计算用时是否恰好减半？',{gpus:8},{gpus:16},'本模型的理想时间减半，工作量和未分片状态显存不变。',(a,b)=>near(b.result.hours,a.result.hours/2)&&a.result.flops===b.result.flops&&a.result.stateGB===b.result.stateGB)]);

  add('cs336-roofline','同一工作同时受计算速度和搬运速度限制；理想重叠取两项时间的较大值。',({s,p,R})=>{
    const line=s.line;
    if(line===1)return [cell('work','固定工作量',R.work,'10^12 FLOP',{work:R.work},'教学工作量，不是浏览器运行 GPU 的计时。')];
    if(line===2)return [cell('bytes','需要访问字节数',R.bytes,`${f(R.work)} / ${p.intensity} = ${f(R.bytes)} byte`,{work:R.work,intensity:p.intensity})];
    if(line===3)return [cell('compute','计算时间下界',R.computeSeconds,`10^12 / (${p.peak} × 10^12) = ${f(R.computeSeconds)} s`,{peak:p.peak})];
    if(line===4)return [cell('memory','搬运时间下界',R.memorySeconds,`${f(R.bytes)} / (${p.bandwidth} × 10^9) = ${f(R.memorySeconds)} s`,{bytes:R.bytes,bandwidth:p.bandwidth})];
    if(line===5)return [cell('time','理想重叠时间',R.seconds,`max(${f(R.computeSeconds)}, ${f(R.memorySeconds)}) = ${f(R.seconds)} s`,{compute:R.computeSeconds,memory:R.memorySeconds}),cell('bottleneck','当前瓶颈',R.bottleneck,`${f(R.memorySeconds)} ${R.memorySeconds>R.computeSeconds?'>':'≤'} ${f(R.computeSeconds)} → ${R.bottleneck}`,{})];
    return [cell('roof','可达算力上界',R.roofTF,`min(${p.peak}, ${p.bandwidth} × ${p.intensity} / 1000) = ${f(R.roofTF)} TFLOP/s`,p,'上界推演不等于实测吞吐。')];
  },[exp('reuse','只提高算术强度','搬运字节减少，瓶颈会从内存转成计算吗？',{intensity:16},{intensity:64},'算术强度从16变64，默认带宽和峰值下 roofline 从16增至50 TFLOP/s。',(a,b)=>b.result.bytes<a.result.bytes&&a.result.bottleneck==='memory'&&b.result.bottleneck==='compute'&&b.result.roofTF===50)]);

  add('cs336-rms','RMSNorm、残差和门控逐维展开；FFN 参数形状计数与玩具投影分开核对。',({s,p,R})=>{
    if(s.line===1)return vec('x',R.x,(x,i)=>`(-1)^${i%2} × (1+floor(${i}/2)) = ${f(x)}`,i=>({index:i}));
    if(s.line===3)return [cell('rms','均方根',R.rms,`sqrt((${R.x.map(x=>`${x}²`).join(' + ')})/${p.width} + 0.000001) = ${f(R.rms)}`,{x:R.x,width:p.width}),...vec('norm',R.norm,(x,i)=>`${R.x[i]} / ${f(R.rms)} = ${f(x)}`,i=>({x:R.x[i],rms:R.rms}))];
    if(s.line===4)return vec('residual',R.residual,(x,i)=>`${R.x[i]} + ${p.scale} × 0.5 × ${f(R.norm[i])} = ${f(x)}`,i=>({x:R.x[i],scale:p.scale,norm:R.norm[i]}));
    if(s.line===5)return vec('hidden',R.hidden,(x,j)=>{const u=R.residual[j%p.width];return `${f(u)}/(1+exp(-(${f(u)}))) × ${f(u)} = ${f(x)}`;},j=>({projectedValue:R.residual[j%p.width]}),'重复索引是可复算教学投影，不是学习到的 SwiGLU 矩阵。');
    if(s.line===6)return vec('output',R.output,(x,i)=>`${f(R.residual[i])} + (${R.hidden.filter((_,j)=>j%p.width===i).map(f).join(' + ')})/${p.ratio} = ${f(x)}`,i=>({residual:R.residual[i],group:R.hidden.filter((_,j)=>j%p.width===i)}));
    return [cell('ffn','标准 SwiGLU 参数数',R.ffnParameters,`3 × ${p.width} × (${p.width} × ${p.ratio}) = ${R.ffnParameters}`,p,'标准稠密矩阵的形状计数；不是本例重复索引函数的参数量。')];
  },[exp('residual-zero','关闭教学残差分支','scale=0 时残差向量是否等于原输入？',{scale:1},{scale:0},'输入与归一化不变，残差向量恢复为 x；后面的 FFN 仍会计算。',(a,b)=>sameVector(a.result.norm,b.result.norm)&&sameVector(b.result.residual,b.result.x)&&!sameVector(a.result.residual,b.result.residual))]);

  add('cs336-moe','路由选择专家，专家各算一个值，再用归一化路由权重汇总。',({s,p,R})=>{
    if(s.line===1)return vec('logit',R.logits,(x,i)=>`2 - ${i} = ${x}`,i=>({expert:i}));
    if(s.line===2)return R.logits.map((x,i)=>cell('chosen-'+i,'专家 '+i,R.chosen.includes(i),`按分数降序，索引 ${i} ${i<p.topk?'<':'≥'} k=${p.topk} → ${R.chosen.includes(i)?'激活':'不激活'}`,{logit:x,topk:p.topk}));
    if(s.line===3)return vec('weight',R.weights,(x,j)=>`exp(${R.logits[R.chosen[j]]}) / (${R.chosen.map(k=>`exp(${R.logits[k]})`).join(' + ')}) = ${f(x)}`,j=>({chosen:R.chosen,logits:R.logits}));
    if(s.line===4)return vec('expertValue',R.values,(x,j)=>`${p.x} × (${R.chosen[j]}+1) = ${f(x)}`,j=>({input:p.x,expert:R.chosen[j]}));
    if(s.line===5)return [...vec('contribution',R.values.map((x,i)=>x*R.weights[i]),(x,i)=>`${f(R.weights[i])} × ${f(R.values[i])} = ${f(x)}`,i=>({weight:R.weights[i],value:R.values[i]})),cell('output','汇总输出',R.output,R.weights.map((w,i)=>`${f(w)} × ${f(R.values[i])}`).join(' + ')+' = '+f(R.output),{weights:R.weights,values:R.values})];
    return [cell('total','全部专家参数',R.totalExpertParameters,`${p.experts} × 100 = ${R.totalExpertParameters}`,p),cell('active','激活专家参数',R.activeParameters,`${p.topk} × 100 = ${R.activeParameters}`,p,'只计专家部分；未计共享层。')];
  },[exp('top-one','只激活一个专家','k=1 后权重是否为1，输出是否等于该专家函数？',{topk:2},{topk:1},'专家0的权重为1，输出为输入 x，激活参数减半。',(a,b)=>equal(b.result.weights,[1])&&b.result.output===b.params.x&&b.result.activeParameters===a.result.activeParameters/2)]);

  add('cs336-linear-attention','逐 token 累加外积和 Key，最后用 Query 读取固定大小状态。',({t,i,s,v,R})=>{
    if(s.line===1)return [cell('S','初始累计矩阵',v.S,'S = [[0,0],[0,0]]',{S:v.S}),cell('z','初始 Key 和',v.z,'z = [0,0]',{z:v.z})];
    if(s.line===3){const before=previous(t,i,'S',[[0,0],[0,0]]),z=previous(t,i,'z',[0,0]);return [...v.S.flatMap((row,a)=>row.map((x,b)=>cell('S-'+a+'-'+b,`S[${a},${b}]`,x,`${f(before[a][b])} + ${v.k[a]} × ${v.v[b]} = ${f(x)}`,{before:before[a][b],key:v.k[a],value:v.v[b]}))),...vec('z',v.z,(x,a)=>`${z[a]} + ${v.k[a]} = ${x}`,a=>({before:z[a],key:v.k[a]}))];}
    if(s.line===6)return [...vec('numerator',v.numerator,(x,d)=>`1 × ${R.S[0][d]} + 1 × ${R.S[1][d]} = ${x}`,d=>({column:R.S.map(row=>row[d]),q:[1,1]})),cell('denominator','归一化分母',v.denominator,`1 × ${R.z[0]} + 1 × ${R.z[1]} = ${v.denominator}`,{z:R.z,q:[1,1]})];
    return vec('output',v.output,(x,d)=>`${R.numerator[d]} / ${R.denominator} = ${f(x)}`,d=>({numerator:R.numerator[d],denominator:R.denominator}),'非负恒等特征的教学例子；不是 Softmax Attention 的精确改写。');
  },[exp('longer-prefix','只增加一个历史 token','状态仍是2×2和2维；数值是否随历史更新？',{tokens:3},{tokens:4},'S/z 大小不变，累计值与输出改变。',(a,b)=>a.result.S.length===b.result.S.length&&a.result.z.length===b.result.z.length&&!equal(a.result.S,b.result.S)&&!sameVector(a.result.output,b.result.output))]);

  add('cs336-tiling','跟踪 C[0,0] 跨 K 块累加，再分开估算全局读取次数。',({t,i,s,v,p,R})=>{
    if(s.line===1)return [...vec('A第一行',v.AfirstRow,(x,k)=>`(0 + ${k}) mod 3 = ${x}`,k=>({row:0,column:k})),...vec('B第一列',v.BfirstColumn,(x,k)=>`(${k} + 0) mod 4 = ${x}`,k=>({row:k,column:0}))];
    if(s.line===3)return [cell('accumulator','跨块累加器初值',v.c00,'C[0,0] = 0',{})];
    if(s.line===5){const before=previous(t,i,'c00',0);return [...vec('本块乘积',v.products,(x,u)=>`${R.A[0][v.k0+u]} × ${R.B[v.k0+u][0]} = ${x}`,u=>({k:v.k0+u,A:R.A[0][v.k0+u],B:R.B[v.k0+u][0]})),cell('accumulator','本块结束后的 C[0,0]',v.c00,`${before} + (${v.products.join(' + ')}) = ${v.c00}`,{before,products:v.products})];}
    if(s.line===7)return [cell('naive','朴素读取次数',v.naiveLoads,`2 × ${p.size}³ = ${v.naiveLoads}`,p)];
    return [cell('tiled','理想分块读取次数',v.idealTiledLoads,`2 × ${p.size}² × ceil(${p.size}/${p.tile}) = ${v.idealTiledLoads}`,p,'简化读取估算，不代表 GPU 实测。'),cell('c00','最终核对 C[0,0]',R.c00,R.A[0].map((a,k)=>`${a}×${R.B[k][0]}`).join(' + ')+' = '+R.c00,{Arow:R.A[0],Bcolumn:R.B.map(r=>r[0])},'最终核对：所有 K 块的完整乘加。')];
  },[exp('bigger-tile','只增大 K 分块','C00 会变吗？理想读取次数会变吗？',{tile:2},{tile:4},'乘法结果不变；默认 n=8 的理想读取次数减半。',(a,b)=>a.result.c00===b.result.c00&&b.result.idealTiledLoads===a.result.idealTiledLoads/2)]);

  add('parallel','区别状态分片与梯度同步，逐卡/逐维复算平均与参数更新。',({s,v,p,R})=>{
    if(s.line===1)return vec('状态字节',v.bytesByType,(x,i)=>`${[2,2,12][i]} × ${p.parameters} × 10^9 = ${f(x)}`,i=>({bytesPerParameter:[2,2,12][i],parametersB:p.parameters}));
    if(s.line===2)return vec('每卡GB',v.perCard,(x,i)=>`${[2,2,12][i]*p.parameters} / ${i>=3-p.zero?p.gpus:1} = ${f(x)} GB`,i=>({zero:p.zero,gpus:p.gpus,sharded:i>=3-p.zero}));
    if(s.line===3)return R.grads.flatMap((row,i)=>row.map((x,d)=>cell(`gradient-${i}-${d}`,`GPU${i} 梯度维${d}`,x,d===0?`${i}+1 = ${f(x)}`:`2 - ${i}/4 = ${f(x)}`,{gpu:i,dimension:d},'固定教学梯度；每卡样本数相等。')));
    if(s.line===4)return vec('平均梯度',R.mean,(x,d)=>`(${R.grads.map(g=>f(g[d])).join(' + ')}) / ${p.gpus} = ${f(x)}`,d=>({gradients:R.grads.map(g=>g[d]),gpus:p.gpus}));
    if(s.line===5)return vec('更新参数',R.updated,(x,d)=>`1 - 0.1 × ${f(R.mean[d])} = ${f(x)}`,d=>({old:1,learningRate:.1,gradient:R.mean[d]}),'此步是 SGD 算术，显存口径另用 Adam 状态。');
    return [cell('memory','每卡持久状态',R.perCardGB,R.local.map(x=>f(x/1e9)).join(' + ')+' = '+f(R.perCardGB)+' GB',{localBytes:R.local},'理想均分，不含峰值 all-gather、激活和临时缓冲。')];
  },[exp('shard-state','只改 ZeRO 分片级别','梯度与逻辑更新是否不变？每卡状态会怎样？',{zero:0},{zero:3},'固定4卡时每卡持久状态变为1/4；逻辑平均梯度和更新不变。',(a,b)=>near(b.result.perCardGB,a.result.perCardGB/4)&&sameVector(a.result.mean,b.result.mean)&&sameVector(a.result.updated,b.result.updated))]);

  add('cs336-tensorparallel','切输出维产生片段，切输入维产生部分和；两种布局最后必须还原同一向量。',({s,v,p,R})=>{
    if(s.line===1)return R.W.flatMap((row,i)=>row.map((x,j)=>cell(`W-${i}-${j}`,`W[${i},${j}]`,x,`${i} ${i===j?'=':'≠'} ${j} → ${x}`,{row:i,column:j},'对角2、其余1，输入向量为 '+JSON.stringify(R.x))));
    if(s.line===3)return R.shards.map((indices,j)=>cell('shard-'+j,'GPU '+j+' 的索引',indices,`[${indices.join(',')}]；切${p.mode==='output'?'输出维':'输入维'}`,{gpus:p.gpus,mode:p.mode}));
    if(s.line===4)return R.partials.flatMap((row,gpu)=>row.map((x,d)=>{const outputIndex=p.mode==='output'?R.shards[gpu][d]:d,indices=p.mode==='output'?[0,1,2,3]:R.shards[gpu];return cell(`partial-${gpu}-${d}`,`GPU${gpu} 局部格${d}`,x,indices.map(k=>`${R.W[outputIndex][k]}×${R.x[k]}`).join(' + ')+' = '+x,{outputIndex,indices,x:R.x,weights:R.W[outputIndex]},p.mode==='output'?'完整输出片段，随后拼接。':'一个输出的局部和，随后跨卡求和。');}));
    return vec('y',R.output,(x,d)=>p.mode==='output'?`拼接各卡片段 → y[${d}] = ${x}`:`${R.partials.map(r=>r[d]).join(' + ')} = ${x}`,d=>({fullRow:R.W[d],input:R.x,reference:dot(R.W[d],R.x)}),'每格还需独立对照完整 W 行与 x 的点积；未模拟通信。');
  },[exp('change-layout','只切换分片方向','局部结果改变，最终 y 是否仍相同？',{mode:'output'},{mode:'input'},'输出片段改为部分和；最终向量仍为[11,12,13,14]。',(a,b)=>sameVector(a.result.output,b.result.output)&&!equal(a.result.partials,b.result.partials))]);

  add('cs336-pipeline','每个真实记录的时间槽里，微批前进一段；空泡是没有合法微批的阶段槽。',({s,v,p,R})=>{
    if(s.line===1)return [cell('slots','填充/排空时间槽数',R.slots,`${p.stages} + ${p.microbatches} - 1 = ${R.slots}`,p)];
    if(s.line===2)return v.stageMicrobatch.map((b,j)=>cell('stage-'+j,'阶段 '+j,b,`${v.time} - ${j} = ${v.time-j}；${v.time-j>=0&&v.time-j<p.microbatches?'落入微批范围 → '+b:'越出范围 → 空泡'}`,{time:v.time,stage:j,microbatches:p.microbatches},'当前真实调度帧；null 表示空泡，不是数值0。'));
    if(s.line===4)return [cell('active','有效阶段槽',R.activeCells,`${p.stages} × ${p.microbatches} = ${R.activeCells}`,p),cell('idle','空闲阶段槽',R.idleCells,`${p.stages} × ${R.slots} - ${R.activeCells} = ${R.idleCells}`,p)];
    return [cell('utilization','理想前向利用率',R.utilization,`${p.microbatches} / ${R.slots} = ${f(R.utilization)}`,p,'只算等时长前向流水线，不是完整训练 MFU。')];
  },[exp('more-microbatches','只增加微批数','空泡数量不变，有效槽占比如何变化？',{microbatches:2},{microbatches:8},'固定4阶段，空泡仍为12，利用率增加。',(a,b)=>a.result.idleCells===b.result.idleCells&&b.result.utilization>a.result.utilization)]);

  add('cs336-scaling','在 N×D 固定的约束下，增大模型会减少数据，两项代价需要共同比较。',({s,v,p,R})=>{
    if(s.line===1)return [cell('D','同预算数据规模',R.D,`${p.budget} / ${p.N} = ${R.D}`,p)];
    if(s.line===2)return [cell('model','模型项',R.modelTerm,`10 / √${p.N} = ${f(R.modelTerm)}`,{N:p.N})];
    if(s.line===3)return [cell('data','数据项',R.dataTerm,`20 / √${R.D} = ${f(R.dataTerm)}`,{D:R.D})];
    if(s.line===4)return [cell('loss','当前假设函数损失',R.loss,`1 + ${f(R.modelTerm)} + ${f(R.dataTerm)} = ${f(R.loss)}`,{modelTerm:R.modelTerm,dataTerm:R.dataTerm})];
    if(s.line===5)return [cell('optimalN','解析最优 N',R.optimalN,`0.5 × √${p.budget} = ${f(R.optimalN)}`,p),cell('optimalD','解析最优 D',R.optimalD,`${p.budget} / ${f(R.optimalN)} = ${f(R.optimalD)}`,p)];
    return [cell('gap','当前损失距解析最优的差',v.loss-v.optimumLoss,`${f(v.loss)} - ${f(v.optimumLoss)} = ${f(v.loss-v.optimumLoss)}`,v,'系数由作者指定，不能当作真实模型通用最优比。')];
  },[exp('off-optimum','同预算只增加模型规模','从默认最优点离开，数据项能否抵消模型项改善？',{N:20},{N:40},'N翻倍、D减半；此人为函数的总损失反而升高。',(a,b)=>near(b.result.D,a.result.D/2)&&b.result.modelTerm<a.result.modelTerm&&b.result.loss>a.result.loss)]);

  add('cs336-kv','先按 B×T×Hkv×D 数 K/V 元素，再按每元素2字节换算一层缓存。',({s,p,R})=>{
    if(s.line===1||s.line===2)return [cell(s.line===1?'K':'V',s.line===1?'Key 元素数':'Value 元素数',s.line===1?R.keyElements:R.valueElements,`${p.batch} × ${p.length} × ${p.kvheads} × ${p.headDim} = ${R.keyElements}`,p)];
    if(s.line===3)return [cell('bytes','一层 KV 字节数',R.cacheBytesPerLayer,`(${R.keyElements} + ${R.valueElements}) × 2 = ${R.cacheBytesPerLayer} byte`,{K:R.keyElements,V:R.valueElements,bytesPerElement:2},'一层、十进制字节，不包含其他显存。')];
    if(s.line===4)return [cell('prefill','每 Query head 完整分数项',R.prefillScoresPerHead,`${p.length} × ${p.length} = ${R.prefillScoresPerHead}`,p,'完整矩阵元素计数；不是因果可见项数量。')];
    if(s.line===5)return [cell('decode','新 Query 的打分项',R.decodeScoresPerHead,`${p.length} + 1 = ${R.decodeScoresPerHead}`,p)];
    return [cell('next','追加后的 KV 字节',R.nextCacheBytes,`2 × ${p.batch} × (${p.length}+1) × ${p.kvheads} × ${p.headDim} × 2 = ${R.nextCacheBytes}`,p),cell('added','本 token 新增字节',R.nextCacheBytes-R.cacheBytesPerLayer,`${R.nextCacheBytes} - ${R.cacheBytesPerLayer} = ${R.nextCacheBytes-R.cacheBytesPerLayer}`,{})];
  },[exp('mqa','只把 KV heads 从2降为1','缓存减半时，Query 的分数项是否也减半？',{kvheads:2},{kvheads:1},'KV容量减半；同一Query head的prefill/decode计数不变。',(a,b)=>b.result.cacheBytesPerLayer===a.result.cacheBytesPerLayer/2&&a.result.prefillScoresPerHead===b.result.prefillScoresPerHead&&a.result.decodeScoresPerHead===b.result.decodeScoresPerHead)]);

  add('cs336-serving','跟踪每槽正在生成的请求、剩余长度和等待队列，最后对同样11个 token 比较调度。',({s,v,p,R})=>{
    if(s.line===1)return vec('请求长度',v.lengths,(x,i)=>`请求 ${i} 固定需要 ${x} 个 token`,i=>({request:i,length:v.lengths[i]}));
    if(s.line===2){const groups=Array.from({length:Math.ceil(R.lengths.length/p.slots)},(_,i)=>R.lengths.slice(i*p.slots,(i+1)*p.slots));return [cell('static','静态批次总槽数',R.staticTicks,groups.map(g=>`max(${g.join(',')})`).join(' + ')+' = '+R.staticTicks,{groups})];}
    if(s.line===6)return [...v.activeBefore.map(x=>cell('request-'+x.id,'请求 '+x.id+' 本槽后剩余',x.remaining-1,`${x.remaining} - 1 = ${x.remaining-1} → ${x.remaining===1?'完成并释放槽位':'留到下一槽'}`,{tick:v.tick,request:x.id,before:x.remaining},'来自当前调度记录，未执行真实模型解码。')),cell('waiting','当前等待请求',v.waiting,'正在执行 '+v.activeBefore.map(x=>x.id).join(',')+'；等待 ['+v.waiting.join(',')+']',{active:v.activeBefore.map(x=>x.id),waiting:v.waiting})];
    if(s.line===8)return [cell('tokens','共同 token 工作量',v.tokens,R.lengths.join(' + ')+' = '+v.tokens,{lengths:R.lengths}),cell('ticks','连续批处理时间槽',v.continuousTicks,'实际记录 '+v.schedule.length+' 个时间槽 = '+v.continuousTicks,{schedule:v.schedule},'最终核对：完整调度案例，不是 GPU 实测。')];
    return [cell('utilization','理想槽位利用率',R.utilization,`${R.tokens} / (${R.continuousTicks} × ${p.slots}) = ${f(R.utilization)}`,{tokens:R.tokens,ticks:R.continuousTicks,slots:p.slots}),cell('rate','每槽生成 token 数',R.tokensPerTick,`${R.tokens} / ${R.continuousTicks} = ${f(R.tokensPerTick)}`,{})];
  },[exp('more-slots','只增加并发槽位','相同请求工作量下，总时间槽和每槽产出会怎样？',{slots:1},{slots:2},'总token仍为11；连续时间槽减少，每槽产出增加。',(a,b)=>a.result.tokens===b.result.tokens&&b.result.continuousTicks<a.result.continuousTicks&&b.result.tokensPerTick>a.result.tokensPerTick)]);

  add('cs336-fit','扣除假设下界后取对数，拟合斜率与截距，再用独立留出函数复核。',({t,i,s,v,p,R})=>{
    if(s.line===1)return vec('样本损失',v.losses,(x,j)=>`2 + 20/${v.N[j]} = ${x}`,j=>({N:v.N[j]}),'人工生成样本；不是真实训练测量。');
    if(s.line===2)return [...vec('logN',v.x,(x,j)=>`ln(${R.N[j]}) = ${f(x)}`,j=>({N:R.N[j]})),...vec('log残差',v.y,(x,j)=>`ln(${R.losses[j]} - ${p.floor}) = ${f(x)}`,j=>({loss:R.losses[j],floor:p.floor}))];
    if(s.line===3){const state=previous(t,i,'x',[]),ys=previous(t,i,'y',[]),mx=sum(state)/state.length,my=sum(ys)/ys.length;return [cell('slope','最小二乘斜率',v.slope,`Σ((x-${f(mx)})(y-${f(my)})) / Σ((x-${f(mx)})²) = ${f(v.slope)}`,{x:state,y:ys,mx,my}),cell('alpha','衰减指数',v.alpha,`-(${f(v.slope)}) = ${f(v.alpha)}`,{slope:v.slope})];}
    if(s.line===4)return [cell('coefficient','恢复系数 a',v.coefficient,`exp(${f(v.intercept)}) = ${f(v.coefficient)}`,v)];
    if(s.line===5)return [cell('predicted','目标规模预测',v.predicted,`${p.floor} + ${f(R.coefficient)} × ${p.target}^(${f(R.slope)}) = ${f(v.predicted)}`,{floor:p.floor,coefficient:R.coefficient,target:p.target,slope:R.slope})];
    return [cell('heldout','留出函数真值',v.heldout,`2 + 20/${p.target} = ${f(v.heldout)}`,{target:p.target}),cell('error','绝对误差',v.absoluteError,`|${f(R.predicted)} - ${f(v.heldout)}| = ${f(v.absoluteError)}`,{predicted:R.predicted,heldout:v.heldout},'只有本案例知道生成函数；真实大模型真值必须测量。')];
  },[exp('wrong-floor','只改变假设下界','错误下界是否改变拟合指数并扩大留出误差？',{floor:2},{floor:1},'人工真值下界是2；改为1后，拟合误差从零增加。',(a,b)=>near(a.result.absoluteError,0)&&b.result.absoluteError>0.01&&!near(a.result.alpha,b.result.alpha))]);

  add('cs336-evaluation','每题先算k个候选全失败，再取补集；分数与允许的采样预算一起报告。',({s,v,p,R})=>{
    if(s.line===1)return vec('已验证成功数',R.successes,(x,j)=>`题${j+1}：${x}/${R.n} 个候选成功`,j=>({successes:R.successes[j],candidates:R.n}));
    if(s.line===2)return vec('全部失败概率',R.failure,(x,j)=>{const c=R.successes[j];return p.k>R.n-c?`k=${p.k} > n-c=${R.n-c} → 0`:Array.from({length:p.k},(_,i)=>`(${R.n-c-i}/${R.n-i})`).join(' × ')+' = '+f(x);},j=>({n:R.n,c:R.successes[j],k:p.k}));
    if(s.line===3)return vec('pass@k',R.passAtK,(x,j)=>`1 - ${f(R.failure[j])} = ${f(x)}`,j=>({allFailed:R.failure[j]}));
    if(s.line===4)return [cell('macro','逐题宏平均',R.macro,`(${R.passAtK.map(f).join(' + ')}) / 4 = ${f(R.macro)}`,{perQuestion:R.passAtK})];
    return [cell('calls','允许采样次数',R.callsPerEvaluation,`4 题 × ${p.k} 次 = ${R.callsPerEvaluation}`,{questions:4,k:p.k},'增加k改变方法预算，不等于模型单次生成能力提高。')];
  },[exp('more-samples','只把每题预算从1改为4','分数提高时，允许的采样成本是否也变了？',{k:1},{k:4},'宏平均提高；允许采样次数增加到4倍。',(a,b)=>b.result.macro>a.result.macro&&b.result.callsPerEvaluation===4*a.result.callsPerEvaluation)]);

  add('cs336-bpb','同一文本总NLL相同，按token归一化的PPL可变，按字节归一化的BPB不变。',({s,p,R})=>{
    if(s.line===1)return [cell('bytes','同一原文本字节数',R.byteCount,'固定原文本 = 20 byte',{tokenizer:p.tokenizer})];
    if(s.line===2)return vec('tokenNLL',R.nll,(x,i)=>`token ${i} 的给定 NLL = ${x} nat`,i=>({token:i,tokenizer:p.tokenizer}));
    if(s.line===3)return [cell('total','总 NLL',R.totalNLL,R.nll.join(' + ')+' = '+R.totalNLL,{nll:R.nll})];
    if(s.line===4)return [cell('ppl','Perplexity',R.perplexity,`exp(${R.totalNLL}/${R.nll.length}) = ${f(R.perplexity)}`,{totalNLL:R.totalNLL,tokenCount:R.nll.length})];
    return [cell('bpb','Bits per byte',R.bpb,`${R.totalNLL} / (ln(2) × ${R.byteCount}) = ${f(R.bpb)}`,{totalNLL:R.totalNLL,bytes:R.byteCount},'需要同一原文本和一致概率口径才能比较。')];
  },[exp('tokenizer','只更换同一文本的切分','总NLL相同，PPL和BPB会怎样变化？',{tokenizer:'A'},{tokenizer:'B'},'PPL改变，BPB保持相同。不能用PPL直接跨tokenizer排名。',(a,b)=>a.result.totalNLL===b.result.totalNLL&&!near(a.result.perplexity,b.result.perplexity)&&near(a.result.bpb,b.result.bpb))]);

  add('cs336-data-sources','每条样本携带来源、语言与许可标记，筛选步骤保留具体去留原因。',({t,s,v,p,R})=>{
    const metadata=t.steps[0].variables.records,text=t.steps.find(x=>x.line===2).variables.text;
    if(s.line===1)return metadata.map(d=>cell(d.id,d.id+' 来源合同',d.license,`${d.source} → language=${d.lang}；license=${d.license}`,{id:d.id,source:d.source,lang:d.lang},'均为虚构案例元数据，不是已核实授权。'));
    if(s.line===2)return v.text.map(d=>cell(d.id,d.id+' 字符数',d.text.length,`length(${JSON.stringify(d.text)}) = ${d.text.length}`,{text:d.text},'本受控样例用JS字符串长度，不是任意网页正文提取算法。'));
    if(s.line===3)return metadata.map(d=>cell(d.id,d.id+' 语言筛选',v.kept.includes(d.id),`${p.language} = all 或 ${d.lang} = ${p.language} → ${v.kept.includes(d.id)?'保留':'移除'}`,{language:p.language,recordLanguage:d.lang}));
    if(s.line===4)return text.filter(d=>metadata.find(m=>m.id===d.id).lang===p.language||p.language==='all').map(d=>cell(d.id,d.id+' 长度筛选',v.kept.includes(d.id),`${d.text.length} ≥ ${p.minChars} → ${v.kept.includes(d.id)?'保留':'移除'}`,{length:d.text.length,minChars:p.minChars}));
    return v.records.map(d=>cell(d.id,d.id+' 保留来源链',d.source,`${d.id} → ${d.source}；保留 ${d.text.length} 个字符与许可标记`,{id:d.id,source:d.source,license:d.license,text:d.text},'最终核对：技术筛选不把unknown许可自动变成授权。')).concat(cell('count','最终保留条数',R.retainedCount,`${R.rawCount} 原始 → ${R.languageCount} 语言筛选 → ${R.retainedCount} 长度筛选`,{counts:[R.rawCount,R.languageCount,R.retainedCount]},'最终核对：固定四条虚构记录。'));
  },[exp('short-text','只提高最小字符数','哪条短样本会被排除，剩余来源是否仍保留？',{minChars:15},{minChars:45},'默认英文筛选下，代码样本w4被移除，只保留w1及其来源标记。',(a,b)=>b.result.retainedCount<a.result.retainedCount&&equal(b.result.records.map(x=>x.id),['w1'])&&b.result.records.every(x=>x.source&&x.license))]);

  add('dedup','先用明确规则生成比较键，稳定去重，再只从训练集排除评测重合。',({s,v,p,R})=>{
    if(s.line===1)return v.train.map(d=>cell(d.id,d.id+' 原文',d.text,`${d.id}: ${JSON.stringify(d.text)}`,{record:d},'评测集另行固定保留，不能把两边合并去重。'));
    if(s.line===2)return v.normalized.map(d=>cell(d.id,d.id+' 比较键',d.key,`${JSON.stringify(d.text)} → ${p.normalize==='yes'?'首尾去空白、连续空白合一':'保持原文'} → ${JSON.stringify(d.key)}`,{text:d.text,normalize:p.normalize}));
    if(s.line===3)return R.normalized.map((d,i)=>cell(d.id,d.id+' 集内去留',v.retained.includes(d.id),`前${i}条中 ${R.normalized.slice(0,i).some(x=>x.key===d.key)?'已有':'没有'}同键 → ${v.retained.includes(d.id)?'保留':'重复删除'}`,{key:d.key,previousKeys:R.normalized.slice(0,i).map(x=>x.key)}));
    if(s.line===4)return v.evaluationKeys.map((key,i)=>cell('eval-'+i,'固定评测比较键',key,`eval-e → ${JSON.stringify(key)}`,{key},'匹配方向是从训练集删除，不删评测。'));
    if(s.line===5)return [cell('removed','训练集去污染删除数',v.removedContamination,`${R.unique.length} 集内唯一 - ${R.retained.length} 最终保留 = ${v.removedContamination}`,{unique:R.unique,retained:R.retained},'本步实际筛选；完整ID用于核对本次案例。')];
    return [cell('train-count','训练集最终条数',v.retained.length,`[${v.retained.join(', ')}] → ${v.retained.length} 条`,{retained:v.retained}),cell('eval-count','评测集保留条数',v.evaluationRetained.length,`[${v.evaluationRetained.join(', ')}] → ${v.evaluationRetained.length} 条`,{retained:v.evaluationRetained})];
  },[exp('without-decontamination','只关闭去污染','集内去重能否自动排除训练/评测重合？',{decontaminate:'yes'},{decontaminate:'no'},'train-c重回训练集；固定评测集eval-e始终保留。',(a,b)=>!a.result.retained.includes('train-c')&&b.result.retained.includes('train-c')&&equal(a.result.evaluation,b.result.evaluation))]);

  add('cs336-jaccard','交集除以并集得到精确Jaccard，LSH公式只估计进入候选集概率。',({s,v,p,R})=>{
    if(s.line===1||s.line===2){const set=s.line===1?v.A:v.B;return set.map((x,i)=>cell('element-'+i,'元素 '+i,x,`${x} ${R.A.includes(x)&&R.B.includes(x)?'同时属于A和B':'只属于一个集合'}`,{A:R.A,B:R.B},s.line===1?'完整案例核对：比较集合已由本次参数确定。':'本步集合成员判断。'));}
    if(s.line===3)return [cell('intersection','交集大小',R.intersection,`|[${R.A.filter(x=>R.B.includes(x)).join(', ')}]| = ${R.intersection}`,{A:R.A,B:R.B})];
    if(s.line===4)return [cell('union','并集大小',R.union,`|去重([${[...R.A,...R.B].join(', ')}])| = ${R.union}`,{A:R.A,B:R.B})];
    if(s.line===5)return [cell('similarity','Jaccard',R.similarity,`${R.intersection} / ${R.union} = ${f(R.similarity)}`,{intersection:R.intersection,union:R.union})];
    return [cell('candidate','理想LSH候选概率',R.candidateProbability,`1 - (1 - ${f(R.similarity)}^${p.rows})^${p.bands} = ${f(R.candidateProbability)}`,{s:R.similarity,b:p.bands,r:p.rows},'理想独立MinHash假设；候选概率不是删除决定。')];
  },[exp('more-bands','只增加 band 数','Jaccard真值不变，候选概率会如何改变？',{bands:2},{bands:8},'精确相似度不变，理想候选概率增加。',(a,b)=>a.result.similarity===b.result.similarity&&b.result.candidateProbability>a.result.candidateProbability)]);

  add('cs336-posttrain','SFT先按助手mask平均NLL；DPO按相对参考的偏好差计算单对损失。',({s,v,p,R})=>{
    if(s.line===1)return v.nll.map((x,i)=>cell('masked-'+i,'token '+i+' 监督贡献',x*v.mask[i],`${x} × mask(${v.mask[i]}) = ${f(x*v.mask[i])}`,{nll:x,mask:v.mask[i]}));
    if(s.line===2)return [cell('sft','助手token平均NLL',R.sftLoss,'(1×0 + 1×0 + 0.3×1 + 0.7×1) / (0+0+1+1) = 0.5',{nll:[1,1,.3,.7],mask:[0,0,1,1]})];
    if(s.line===3)return [cell('difference','相对参考log-ratio差',R.logRatioDifference,`${p.chosen} - ${p.rejected} = ${f(R.logRatioDifference)}`,p)];
    if(s.line===4)return [cell('margin','DPO margin',R.margin,`${p.beta} × (${p.chosen} - ${p.rejected}) = ${f(R.margin)}`,p)];
    if(s.line===5)return [cell('preference','目标中的偏好概率',R.preferenceProbability,`1 / (1 + exp(-${f(R.margin)})) = ${f(R.preferenceProbability)}`,{margin:R.margin},'这是目标函数中的二分类量，不是事实正确率。')];
    return [cell('dpo','单对DPO损失',R.dpoLoss,`-ln(${f(R.preferenceProbability)}) = ${f(R.dpoLoss)}`,{probability:R.preferenceProbability}),cell('selected','本次所选目标',R.selectedLoss,`${p.mode} → ${f(R.selectedLoss)}`,{mode:p.mode,sft:R.sftLoss,dpo:R.dpoLoss},'未训练或运行完整语言模型。')];
  },[exp('equal-ratios','只令chosen等于rejected','偏好margin为0时，单对DPO损失是多少？',{mode:'dpo',chosen:2,rejected:1},{mode:'dpo',chosen:1,rejected:1},'margin为0、偏好概率0.5、损失ln2；SFT项不变。',(a,b)=>b.result.margin===0&&b.result.preferenceProbability===.5&&near(b.result.dpoLoss,Math.log(2))&&a.result.sftLoss===b.result.sftLoss)]);

  add('cs336-grpo','先按可验证答案给奖励，再做组内归一化，并保留负优势的裁剪符号。',({s,v,p,R})=>{
    if(s.line===1)return vec('候选答案',R.answers,(x,i)=>`候选${i} = ${x}；题目为2+3`,i=>({candidate:i,answer:R.answers[i]}));
    if(s.line===2)return vec('reward',R.rewards,(x,i)=>`${R.answers[i]} === 5 ? 1 : 0 → ${x}`,i=>({answer:R.answers[i],expected:5}));
    if(s.line===4)return [cell('mean','组内均值',R.mean,`(${R.rewards.join(' + ')}) / 4 = ${f(R.mean)}`,{rewards:R.rewards}),cell('std','总体标准差',R.std,`sqrt(Σ(reward-${f(R.mean)})² / 4) = ${f(R.std)}`,{rewards:R.rewards,mean:R.mean})];
    if(s.line===5)return vec('advantage',R.advantage,(x,i)=>R.std===0?'std = 0 → 明确返回0':`(${R.rewards[i]} - ${f(R.mean)}) / ${f(R.std)} = ${f(x)}`,i=>({reward:R.rewards[i],mean:R.mean,std:R.std}));
    if(s.line===7)return vec('surrogate',R.surrogate,(x,i)=>{const clipped=Math.max(1-p.clip,Math.min(1+p.clip,R.ratios[i]));return `min(${f(R.ratios[i])}×${f(R.advantage[i])}, ${f(clipped)}×${f(R.advantage[i])}) = ${f(x)}`;},i=>({ratio:R.ratios[i],advantage:R.advantage[i],clip:p.clip}));
    return [cell('objective','组内平均目标',R.objective,`(${R.surrogate.map(f).join(' + ')}) / 4 = ${f(R.objective)}`,{surrogate:R.surrogate},'单个surrogate项；不含完整GRPO中的KL、采样与反向传播。')];
  },[exp('equal-reward','只把候选组改成全部正确','都有奖励是否必然产生非零组相对优势？',{group:'mixed'},{group:'allcorrect'},'总体标准差为0，所有优势和目标均为0，避免NaN。',(a,b)=>b.result.rewards.every(x=>x===1)&&b.result.std===0&&b.result.advantage.every(x=>x===0)&&b.result.objective===0)]);

  add('cs336-patches','先数图像网格与额外全局token，再比较序列平方增长；玩具patch特征逐格平均。',({s,v,p,R})=>{
    if(s.line===1)return [cell('patches','每图patch数量',R.patchesPerImage,`(224 / ${p.patch})² = ${R.patchesPerImage}`,p)];
    if(s.line===2)return [cell('visual','视觉token总数',R.visualTokens,`${p.images} × (${R.patchesPerImage} + 1) = ${R.visualTokens}`,p,'人为采用每图一个CLS的约定。')];
    if(s.line===3)return [cell('total','统一序列长度',R.totalTokens,`${p.text} + ${R.visualTokens} = ${R.totalTokens}`,{text:p.text,visual:R.visualTokens})];
    if(s.line===4)return [cell('scores','完整稠密分数格数',R.denseScoreCells,`${R.totalTokens}² = ${R.denseScoreCells}`,{totalTokens:R.totalTokens},'元素个数不是FLOP、显存或实测用时。')];
    return v.toyPatchMeans.map((x,j)=>{const row=Math.floor(j/2)*2,col=(j%2)*2,items=[v.image[row][col],v.image[row][col+1],v.image[row+1][col],v.image[row+1][col+1]];return cell('patch-'+j,'玩具patch '+j+' 均值',x,`(${items.join(' + ')}) / 4 = ${x}`,{row,column:col,pixels:items},'4×4数值图的固定2×2均值；不等同于可学习视觉编码器。');});
  },[exp('larger-patches','只增大patch边长','图像token减少后，稠密分数矩阵格数会怎样？',{patch:16},{patch:32},'视觉token与序列长度下降，完整分数格数下降；固定玩具patch均值不变。',(a,b)=>b.result.visualTokens<a.result.visualTokens&&b.result.denseScoreCells<a.result.denseScoreCells&&sameVector(a.result.toyPatchMeans,b.result.toyPatchMeans))]);

  add('cs336-clip','图像与文本先给定单位向量，逐对点积、按行Softmax，再累计对角正样本NLL。',({t,s,v,p,R})=>{
    const images=t.steps[0].variables.images,texts=t.steps[1].variables.texts;
    if(s.line===1)return images.map((x,j)=>cell('image-'+j,'图像 '+j+' 范数平方',dot(x,x),`${f(x[0])}² + ${f(x[1])}² = ${f(dot(x,x))}`,{vector:x},'给定单位向量；没有执行真实图像编码器。'));
    if(s.line===2)return texts.map((x,j)=>cell('text-'+j,'文本 '+j+' 表示',x,`文本${j} → [${x.map(f).join(', ')}]；目标仍为对角配对`,{vector:x,pairing:p.pairing}));
    if(s.line===3)return R.scores.flatMap((row,i)=>row.map((x,j)=>cell(`score-${i}-${j}`,`score[${i},${j}]`,x,`(${f(images[i][0])}×${f(texts[j][0])} + ${f(images[i][1])}×${f(texts[j][1])}) / ${p.temperature} = ${f(x)}`,{image:images[i],text:texts[j],temperature:p.temperature})));
    if(s.line===4)return R.probabilities.flatMap((row,i)=>row.map((x,j)=>{const m=Math.max(...R.scores[i]),exps=R.scores[i].map(y=>Math.exp(y-m));return cell(`p-${i}-${j}`,`p[${i},${j}]`,x,`exp(${f(R.scores[i][j])}-${f(m)}) / (${exps.map(f).join(' + ')}) = ${f(x)}`,{scores:R.scores[i],maximum:m},'按当前行归一化；对角项为本案例正配对。');}));
    const losses=R.probabilities.map((row,i)=>-Math.log(row[i]));return [...vec('正配对NLL',losses,(x,j)=>`-ln(${f(R.probabilities[j][j])}) = ${f(x)}`,j=>({probability:R.probabilities[j][j]})),cell('loss','图到文平均损失',R.imageToTextLoss,`(${losses.map(f).join(' + ')}) / 3 = ${f(R.imageToTextLoss)}`,{diagonalLosses:losses},'只含image→text单向项，不是完整CLIP训练。')];
  },[exp('swap-labels','只交换前两条文本向量','目标仍在对角线时，错误配对会怎样影响损失？',{pairing:'correct'},{pairing:'swapped'},'前两对正样本概率下降，单向交叉熵增大。',(a,b)=>b.result.imageToTextLoss>a.result.imageToTextLoss&&b.result.probabilities[0][0]<a.result.probabilities[0][0])]);

  return {courseId:'cs336',models:recipes};
});
