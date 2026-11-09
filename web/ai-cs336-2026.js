/* Original CS336 2026 teaching computations. No GPU performance claims or network. */
(function(root,register){if(typeof module!=='undefined'&&module.exports)module.exports=register;else register(root.AICourseModels);})(globalThis,function(M){
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x)),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),sum=a=>a.reduce((s,x)=>s+x,0);
 const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
 const select=(id,label,options,value)=>({id,label,type:'select',options,value});
 const bars=(title,rows,unit='',max=null)=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit,max});
 const flow=(title,rows)=>({kind:'flow',title,nodes:rows.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
 const softmax=a=>{const m=Math.max(...a),e=a.map(x=>Math.exp(x-m));return e.map(x=>x/sum(e));};
 function rec(id,p,code){const steps=[];return {add(line,title,detail,variables,visual){steps.push(clone({line,title,detail,variables,visual}));},end(result){return {model:id,params:p,code:code.split('\n'),steps,result:clone(result)};}};}
 const ids=[];function add(id,controls,fn){ids.push(id);M.register(id,controls,fn);}

 add('cs336-bpe',[range('merges','BPE 合并次数',0,4,1,2)],p=>{
  const r=rec('cs336-bpe',p,`let words = [['l','o','w'],['l','o','w'],['l','o','w','e','r']];
const counts = countAdjacentPairs(words);
const best = rankByCountThenLexical(counts)[0];
words = words.map(word => mergeNonOverlapping(word,best));
const tokenCount = words.reduce((n,w)=>n+w.length,0);`);
  let words=[['l','o','w'],['l','o','w'],['l','o','w','e','r']],vocab=['l','o','w','e','r'];const merges=[];
  r.add(1,'从可逆字符切分开始','本例用 low、low、lower，频率通过重复词显式体现。真实 byte-level BPE 从字节出发，还要处理特殊 token 与预分词。',{words,vocab},flow('初始词边界',words.map((w,i)=>['词 '+i,w.join(' · '),true])));
  for(let t=0;t<p.merges;t++){
   const counts={};for(const w of words)for(let i=0;i<w.length-1;i++){const k=JSON.stringify([w[i],w[i+1]]);counts[k]=(counts[k]||0)+1;}
   const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'en'));
   if(!ranked.length)break;const pair=JSON.parse(ranked[0][0]);
   r.add(2,'统计相邻对','只统计同一个词内的相邻 token，不跨边界合并。并列时使用固定字符串顺序，保证复算可重复。',{counts},bars('相邻对次数',ranked.map(([k,n])=>[JSON.parse(k).join('+'),n]),'次'));
   r.add(3,'选择最高频对',`本轮合并 ${pair.join(' + ')}；这是语料压缩目标，不是按语义挑词。`,{pair,count:ranked[0][1]},flow('本轮规则',[[pair.join(' + '),pair.join(''),true]]));
   words=words.map(w=>{const out=[];for(let i=0;i<w.length;i++){if(i+1<w.length&&w[i]===pair[0]&&w[i+1]===pair[1]){out.push(pair.join(''));i++;}else out.push(w[i]);}return out;});
   vocab.push(pair.join(''));merges.push(pair);
   r.add(4,'从左到右非重叠替换','训练增加一条合并规则。编码新文本时必须使用相同规则顺序；解码通过拼回原字符核对。',{words,merges},flow('合并后的语料',words.map((w,i)=>['词 '+i,w.join(' · '),true])));
  }
  const tokenCount=sum(words.map(w=>w.length));
  r.add(5,'核对压缩与可逆性','合并减少本语料的 token 数，同时增加词表项。这个小案例不模拟完整 UTF-8 tokenizer。',{tokenCount,vocabularySize:vocab.length,decoded:words.map(w=>w.join(''))},bars('合并前后的 token 数',[['初始',11],['当前',tokenCount]],'个',11));
  return r.end({words,merges,tokenCount,vocabularySize:vocab.length,decoded:words.map(w=>w.join(''))});
 });
 add('cs336-rms',[range('width','模型维度 d',2,8,2,4),range('ratio','FFN 扩张倍数',2,4,1,2),range('scale','残差分支系数',0,2,.5,1)],p=>{
  const r=rec('cs336-rms',p,`const x = Array.from({length:width},(_,i)=>(i%2?-1:1)*(1+Math.floor(i/2)));
const rms = Math.sqrt(x.reduce((s,v)=>s+v*v,0)/width+1e-6);
const norm = x.map(v=>v/rms);
const residual = x.map((v,i)=>v+scale*0.5*norm[i]);
const hidden = expand(residual,ratio).map(v=>silu(v)*v);
const output = residual.map((v,i)=>v+mean(hidden.filter((_,j)=>j%width===i)));
const ffnParameters = 3*width*(width*ratio);`);
  const x=Array.from({length:p.width},(_,i)=>(i%2?-1:1)*(1+Math.floor(i/2)));
  r.add(1,'读出向量和层宽','用正负交替向量代替真实 token 表示。层宽、FFN 扩张倍数会改变参数和计算成本。',{x,width:p.width},bars('输入 x',x.map((v,i)=>['维 '+i,v])));
  const rms=Math.sqrt(sum(x.map(v=>v*v))/p.width+1e-6),norm=x.map(v=>v/rms);
  r.add(3,'按 RMS 归一化','RMSNorm 除以均方根，不先减均值。本例不使用可学习缩放向量。',{rms,norm},bars('RMSNorm(x)',norm.map((v,i)=>['维 '+i,v])));
  const residual=x.map((v,i)=>v+p.scale*.5*norm[i]);
  r.add(4,'走 pre-norm 残差路径','先归一化再进分支，最后加回原输入。本例分支为 0.5 倍线性映射，不是完整 Attention。',{residual},bars('残差相加',residual.map((v,i)=>['维 '+i,v])));
  const hidden=Array.from({length:p.width*p.ratio},(_,j)=>{const v=residual[j%p.width];return v/(1+Math.exp(-v))*v;});
  r.add(5,'查看门控 FFN 的逐元素操作','演示 SiLU(gate)×value，使用重复索引作投影以便复算；真实 SwiGLU 的 gate/up/down 是学习到的矩阵。',{hidden},bars('门控中间值',hidden.map((v,i)=>['h'+i,v])));
  const output=residual.map((v,i)=>v+sum(hidden.filter((_,j)=>j%p.width===i))/p.ratio),ffnParameters=3*p.width*p.width*p.ratio;
  r.add(6,'压回模型维度并保留残差','用同维分组平均代替可学习 down projection。输出维度回到 d。',{output},bars('最终输出',output.map((v,i)=>['维 '+i,v])));
  r.add(7,'单独核算真实稠密 FFN 形状','三个 d↔h 矩阵、不计偏置，共 3dh 个参数；本式是标准形状计数，不是上面重复索引算例的独立可训练参数量。',{hiddenWidth:p.width*p.ratio,ffnParameters},bars('标准 SwiGLU 矩阵参数',[['gate/up/down 合计',ffnParameters]],'个'));
  return r.end({x,rms,norm,residual,hidden,output,ffnParameters});
 });
 add('cs336-moe',[range('experts','专家数 E',4,8,1,4),range('topk','激活专家数 k',1,2,1,2),range('x','输入标量',1,4,1,2)],p=>{
  const r=rec('cs336-moe',p,`const logits = Array.from({length:experts},(_,i)=>2-i);
const chosen = logits.map((_,i)=>i).slice(0,topk);
const weights = softmax(chosen.map(i=>logits[i]));
const values = chosen.map(i=>x*(i+1));
const output = weights.reduce((s,w,j)=>s+w*values[j],0);
const activeParameters = topk*100;`);
  const logits=Array.from({length:p.experts},(_,i)=>2-i);
  r.add(1,'路由器先打分','这些是给定路由分数，专家本身不是语言模型。MoE 的稀疏激活发生在 FFN 等子层，不代表所有参数同时参与。',{logits},bars('路由 logits',logits.map((v,i)=>['专家 '+i,v])));
  const chosen=logits.map((_,i)=>i).slice(0,p.topk);
  r.add(2,'选择 top-k 专家','真实系统要处理容量、负载均衡和跨设备通信；这里只追踪单个 token。',{chosen},flow('本 token 的专家',logits.map((v,i)=>['专家 '+i,chosen.includes(i)?'激活':'未激活',chosen.includes(i)])));
  const weights=softmax(chosen.map(i=>logits[i]));
  r.add(3,'对所选专家归一化','本案例明确采用所选专家上的 softmax；不同路由方案对权重处理可能不同。',{weights},bars('门控权重',chosen.map((i,j)=>['专家 '+i,weights[j]]),'比例',1));
  const values=chosen.map(i=>p.x*(i+1));
  r.add(4,'分别执行专家函数','专家 i 使用 fᵢ(x)=(i+1)x，真实计算后再汇总，不把选择过程冒充训练。',{values},bars('专家输出',chosen.map((i,j)=>['专家 '+i,values[j]])));
  const output=dot(weights,values),activeParameters=p.topk*100;
  r.add(5,'门控加权汇总','k=1 时只取一个专家；k=2 时输出一般不是简单平均。',{output,weights,values},bars('加权输出',[['输出',output]]));
  r.add(6,'比较总参数与激活参数','人为假设每专家 100 参数，只作计数。路由和 Attention 等共享参数没有计入，不能用此比值直接预测吞吐。',{totalExpertParameters:p.experts*100,activeParameters},bars('专家部分参数',[['全部专家',p.experts*100],['本 token 激活',activeParameters]],'个'));
  return r.end({logits,chosen,weights,values,output,activeParameters,totalExpertParameters:p.experts*100});
 });
 add('cs336-linear-attention',[range('tokens','前缀长度',1,4,1,3)],p=>{
  const r=rec('cs336-linear-attention',p,`let S = [[0,0],[0,0]], z = [0,0];
for (const {k,v} of prefix) {
  S = S.map((row,i)=>row.map((x,j)=>x+k[i]*v[j]));
  z = z.map((x,i)=>x+k[i]);
}
const numerator = [0,1].map(j=>q[0]*S[0][j]+q[1]*S[1][j]);
const output = numerator.map(x=>x/dot(q,z));`);
  const keys=[[1,0],[0,1],[1,1],[2,1]],values=[[2,0],[0,2],[1,1],[1,3]],q=[1,1];let S=[[0,0],[0,0]],z=[0,0];
  r.add(1,'固定大小的累计状态','采用非负特征映射为恒等的二维小例子。这个归一化线性 Attention 不是 softmax Attention 的精确重写。',{S,z,q},flow('状态大小不随前缀增大',[['S','2 × 2',true],['z','2 维',true]]));
  for(let t=0;t<p.tokens;t++){const k=keys[t],v=values[t];S=S.map((row,i)=>row.map((x,j)=>x+k[i]*v[j]));z=z.map((x,i)=>x+k[i]);r.add(3,'读取 token '+t+' 并更新状态','把 KᵀV 和 K 的累计量留在固定大小状态中。因果模式只使用已经看到的前缀。',{token:t,k,v,S,z},flow('外积与累积',[['k',JSON.stringify(k),false],['v',JSON.stringify(v),false],['S = Σkvᵀ',JSON.stringify(S),true]]));}
  const numerator=[0,1].map(j=>q[0]*S[0][j]+q[1]*S[1][j]),denominator=dot(q,z),output=numerator.map(x=>x/denominator);
  r.add(6,'用 Query 读取状态','把 q 乘累计矩阵得到分子；相同特征下直接逐 token 算加权和应相同。',{numerator,denominator},bars('未归一化输出',numerator.map((v,i)=>['维 '+i,v])));
  r.add(7,'除以归一化分母','状态压缩降低前缀存储需求，也改变了可表达的注意力机制；混合模型会保留部分全局 softmax 层。',{output},bars('线性 Attention 输出',output.map((v,i)=>['维 '+i,v])));
  return r.end({S,z,numerator,denominator,output});
 });
 add('cs336-roofline',[range('intensity','算术强度',1,64,1,16,'FLOP/byte'),range('peak','峰值计算',10,100,10,50,'TFLOP/s'),range('bandwidth','内存带宽',100,2000,100,1000,'GB/s')],p=>{
  const r=rec('cs336-roofline',p,`const work = 1e12;
const bytes = work/intensity;
const computeSeconds = work/(peak*1e12);
const memorySeconds = bytes/(bandwidth*1e9);
const seconds = Math.max(computeSeconds,memorySeconds);
const roofTF = Math.min(peak,bandwidth*intensity/1000);`);
  const work=1e12,bytes=work/p.intensity,computeSeconds=work/(p.peak*1e12),memorySeconds=bytes/(p.bandwidth*1e9),seconds=Math.max(computeSeconds,memorySeconds),roofTF=Math.min(p.peak,p.bandwidth*p.intensity/1000);
  r.add(1,'同一工作量，两条限制','固定 10¹² FLOP 的工作；GPU 型号不指定，峰值和带宽均为教学参数。',{work},flow('数据到执行单元',[['HBM','搬运字节',false],['片上存储','复用数据',false],['计算单元','执行 FLOP',true]]));
  r.add(2,'先算要搬多少字节','算术强度 I=FLOP/byte。复用越好，同样工作所需的外部搬运越少。',{bytes,intensity:p.intensity},bars('需要访问的内存量',[['传输',bytes/1e9]],'GB'));
  r.add(3,'计算单元的理想时间','计算时间=工作量/峰值计算速度。真实执行还受占用率、调度与指令等影响。',{computeSeconds},bars('单独受计算限制',[['时间',computeSeconds*1000]],'ms'));
  r.add(4,'内存搬运的理想时间','搬运时间=字节数/带宽。假设两者能理想重叠，整体下界取较大者，而不是随意相加。',{memorySeconds},bars('两项时间下界',[['计算',computeSeconds*1000],['内存',memorySeconds*1000]],'ms'));
  r.add(5,'找出瓶颈','较大的时间决定这个简化 roofline 上界；高算术强度也不保证实际达到峰值。',{seconds,bottleneck:memorySeconds>computeSeconds?'memory':'compute'},flow('理想瓶颈',[['计算',computeSeconds.toFixed(5)+' s',computeSeconds>=memorySeconds],['内存',memorySeconds.toFixed(5)+' s',memorySeconds>computeSeconds]]));
  r.add(6,'换算成可达算力上界','min(峰值算力, 带宽×算术强度)。这是上界推演，不是浏览器测到的 GPU 性能。',{roofTF},bars('同口径算力',[['计算峰值',p.peak],['roofline 上界',roofTF]],'TFLOP/s'));
  return r.end({work,bytes,computeSeconds,memorySeconds,seconds,roofTF,bottleneck:memorySeconds>computeSeconds?'memory':'compute'});
 });
 add('cs336-tiling',[range('size','方阵维度 n',4,16,4,8),select('tile','K 方向分块大小',[[2,'2'],[4,'4'],[8,'8']],4)],p=>{
  const r=rec('cs336-tiling',p,`const A = makeMatrix(n,(i,k)=>(i+k)%3);
const B = makeMatrix(n,(k,j)=>(k+j)%4);
let c00 = 0;
for (let k0=0;k0<n;k0+=tile) {
  c00 += sum(Array.from({length:Math.min(tile,n-k0)},(_,u)=>A[0][k0+u]*B[k0+u][0]));
}
const naiveLoads = 2*n*n*n;
const idealTiledLoads = 2*n*n*Math.ceil(n/tile);`);
  const n=p.size,A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,k)=>(i+k)%3)),B=Array.from({length:n},(_,k)=>Array.from({length:n},(_,j)=>(k+j)%4));let c00=0;
  r.add(1,'建立两个可复算矩阵','Aᵢₖ=(i+k) mod 3，Bₖⱼ=(k+j) mod 4。使用浏览器实际乘加；它不是 Triton 或 GPU 执行。',{n,AfirstRow:A[0],BfirstColumn:B.map(row=>row[0])},flow('本次矩阵乘',[['A',n+' × '+n,false],['B',n+' × '+n,false],['C',n+' × '+n,true]]));
  r.add(3,'保留一个输出累加器','只逐步展开 C[0,0]，同一模式可推广到输出 tile；累加器必须跨 K 块保留。',{c00},bars('C[0,0] 初值',[['累加器',c00]]));
  for(let k0=0;k0<n;k0+=p.tile){const products=Array.from({length:Math.min(p.tile,n-k0)},(_,u)=>A[0][k0+u]*B[k0+u][0]);c00+=sum(products);r.add(5,'处理 K 块 '+k0,'先取数据，再在片上重复使用。最后不足整块时要 mask；不能越界读写。',{k0,products,c00},bars('当前块乘积与累计值',[...products.map((v,i)=>['k='+String(k0+i),v]),['累计',c00]]));}
  const naiveLoads=2*n*n*n,idealTiledLoads=2*n*n*Math.ceil(n/p.tile);
  r.add(7,'数一数朴素全局读取','朴素模型为每个输出点读 n 对元素，共 2n³ 次。现实缓存可能已减少读取，本例不把它当实测。',{naiveLoads},bars('朴素读取元素数',[['读取',naiveLoads]],'个'));
  r.add(8,'估算理想 tile 复用','按每个输出块装入 A/B 子块的简化模型估算全局读取；忽略缓存、边界浪费和占用率。tile 更大也可能耗尽寄存器/共享内存。',{idealTiledLoads,ratio:naiveLoads/idealTiledLoads,c00},bars('简化全局读取对比',[['朴素',naiveLoads],['理想分块',idealTiledLoads]],'个'));
  return r.end({A,B,c00,naiveLoads,idealTiledLoads});
 });
 add('cs336-pipeline',[range('stages','流水线阶段 p',2,4,1,4),range('microbatches','微批数 m',1,8,1,4)],p=>{
  const r=rec('cs336-pipeline',p,`const slots = stages+microbatches-1;
const schedule = Array.from({length:slots},(_,t)=>Array.from({length:stages},(_,s)=>t-s>=0&&t-s<microbatches?t-s:null));
const activeCells = stages*microbatches;
const idleCells = stages*slots-activeCells;
const utilization = microbatches/slots;`);
  const slots=p.stages+p.microbatches-1,schedule=Array.from({length:slots},(_,t)=>Array.from({length:p.stages},(_,s)=>t-s>=0&&t-s<p.microbatches?t-s:null));
  r.add(1,'给每段同样的执行时间','只演示均匀阶段的前向 fill/drain 流水线；不模拟反向或 1F1B，也不把此利用率当真实训练 MFU。',{stages:p.stages,microbatches:p.microbatches,slots},flow('分段模型',Array.from({length:p.stages},(_,s)=>['阶段 '+s,'同等耗时',false])));
  schedule.forEach((row,t)=>r.add(2,'时间槽 '+t,'微批每个时间槽前进一段。null 是空泡；中间激活需要跨段传输，图中未估通信耗时。',{time:t,stageMicrobatch:row},flow('当前并行执行',row.map((b,s)=>['阶段 '+s,b===null?'空泡':'微批 '+b,b!==null]))));
  const activeCells=p.stages*p.microbatches,idleCells=p.stages*slots-activeCells,utilization=p.microbatches/slots;
  r.add(4,'统计有效与空闲阶段槽','总容量 p(m+p−1)，有用计算 pm。增大 m 可摊薄首尾空泡，但会影响激活存储和 batch 组织。',{activeCells,idleCells},bars('阶段槽计数',[['有用',activeCells],['空闲',idleCells]],'槽'));
  r.add(5,'计算理想利用率','m/(m+p−1)。实际系统的阶段不均匀、通信和反向调度都会改变结果。',{utilization},bars('理想前向利用率',[['利用率',utilization]],'比例',1));
  return r.end({slots,schedule,activeCells,idleCells,utilization});
 });
 add('cs336-tensorparallel',[select('mode','矩阵切法',[['output','按输出维切分'],['input','按输入维切分']],'output'),select('gpus','卡数',[[2,'2'],[4,'4']],2),range('scale','输入缩放',1,3,1,1)],p=>{
  const r=rec('cs336-tensorparallel',p,`const x = [1,2,3,4].map(v=>v*scale);
const W = Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>i===j?2:1));
const shards = splitIndices(4,gpus);
const partials = shards.map(indices=>mode==='output'?indices.map(i=>dot(W[i],x)):W.map(row=>indices.reduce((s,j)=>s+row[j]*x[j],0)));
const output = mode==='output'?partials.flat():[0,1,2,3].map(i=>partials.reduce((s,row)=>s+row[i],0));`);
  const x=[1,2,3,4].map(v=>v*p.scale),W=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>i===j?2:1)),shards=Array.from({length:p.gpus},(_,s)=>Array.from({length:4/p.gpus},(_,u)=>s*(4/p.gpus)+u));
  r.add(1,'固定同一矩阵乘','W 对角为 2，其余为 1。基准 y=W x，可以用 x 各维总和再加该维 x 检查。',{x,W},bars('输入向量',x.map((v,i)=>['x'+i,v])));
  r.add(3,'决定切输入维还是输出维','此例以 y=W x、W 行为输出维的约定命名；其他资料用 xW 时行列叫法会互换，先核对形状。',{mode:p.mode,shards},flow('每卡负责的索引',shards.map((s,i)=>['GPU '+i,s.join(', '),true])));
  const partials=shards.map(indices=>p.mode==='output'?indices.map(i=>dot(W[i],x)):W.map(row=>sum(indices.map(j=>row[j]*x[j]))));
  r.add(4,'实际算每卡局部乘法','切输出维得到输出片段；切输入维得到每个输出的部分和。两者需要的后续通信不同。',{partials},flow('局部结果',partials.map((row,i)=>['GPU '+i,JSON.stringify(row),true])));
  const output=p.mode==='output'?partials.flat():[0,1,2,3].map(i=>sum(partials.map(row=>row[i])));
  r.add(5,p.mode==='output'?'拼接输出片段':'对部分和做求和','先验证数学结果等于未分片矩阵乘；真实 tensor parallel 还要组织下一层的布局、通信和梯度。',{output,reference:W.map(row=>dot(row,x))},bars('最终 y',output.map((v,i)=>['y'+i,v])));
  return r.end({x,W,shards,partials,output});
 });
 add('cs336-scaling',[range('budget','归一化预算 N×D',400,3600,400,1600),range('N','归一化模型规模 N',4,100,4,20)],p=>{
  const r=rec('cs336-scaling',p,`const D = budget/N;
const modelTerm = 10/Math.sqrt(N);
const dataTerm = 20/Math.sqrt(D);
const loss = 1+modelTerm+dataTerm;
const optimalN = 0.5*Math.sqrt(budget);
const optimalD = budget/optimalN;`);
  const D=p.budget/p.N,modelTerm=10/Math.sqrt(p.N),dataTerm=20/Math.sqrt(D),loss=1+modelTerm+dataTerm,optimalN=.5*Math.sqrt(p.budget),optimalD=p.budget/optimalN;
  r.add(1,'先固定算力约束','用无量纲 N×D 预算展示机制；真实稠密训练才映射到约 6ND FLOP。这里系数由作者设定，未拟合真实模型。',{N:p.N,D,budget:p.budget},flow('同预算的取舍',[['模型 N',p.N,true],['数据 D',D,false]]));
  r.add(2,'模型太小的代价','假设不可约损失为 1，模型项为 10/√N。单独增加 N 会降低此项。',{modelTerm},bars('模型项',[['10 / √N',modelTerm]]));
  r.add(3,'数据太少的代价','同预算下 N 增大导致 D 减少，数据项可能升高。不能只沿单一规模方向外推。',{dataTerm,D},bars('两种可约损失项',[['模型项',modelTerm],['数据项',dataTerm]]));
  r.add(4,'求当前预测损失','L=1+10/√N+20/√D，仅适用于这个人为函数；幂律的适用范围和拟合误差需要实验证据。',{loss},bars('损失构成',[['不可约',1],['模型项',modelTerm],['数据项',dataTerm]]));
  r.add(5,'求这个函数的最优 N','固定预算代入 D=C/N，再令导数为 0，可得 N*=0.5√C。最优点来自假设系数，不是普适最优 token/parameter 比。',{optimalN,optimalD},flow('解析最优解',[['N*',optimalN,true],['D*',optimalD,true]]));
  r.add(6,'与当前分配对比','先做多组小规模等算力实验，再检验拟合能否预测留出的规模。',{loss,optimumLoss:1+10/Math.sqrt(optimalN)+20/Math.sqrt(optimalD)},bars('同预算损失预测',[['当前',loss],['解析最优',1+10/Math.sqrt(optimalN)+20/Math.sqrt(optimalD)]]));
  return r.end({N:p.N,D,modelTerm,dataTerm,loss,optimalN,optimalD});
 });
 add('cs336-kv',[range('length','已有上下文长度',16,128,16,64),select('kvheads','KV heads',[[1,'1 · MQA'],[2,'2 · GQA'],[8,'8 · MHA']],2),range('batch','并发序列数',1,8,1,2),range('headDim','每 head 维度',16,64,16,32)],p=>{
  const r=rec('cs336-kv',p,`const keyElements = batch*length*kvheads*headDim;
const valueElements = keyElements;
const cacheBytesPerLayer = (keyElements+valueElements)*2;
const prefillScoresPerHead = length*length;
const decodeScoresPerHead = length+1;
const nextCacheBytes = 2*batch*(length+1)*kvheads*headDim*2;`);
  const keyElements=p.batch*p.length*p.kvheads*p.headDim,valueElements=keyElements,cacheBytesPerLayer=4*keyElements,prefillScoresPerHead=p.length*p.length,decodeScoresPerHead=p.length+1,nextCacheBytes=4*p.batch*(p.length+1)*p.kvheads*p.headDim;
  r.add(1,'缓存过去的 Key','缓存随 batch、长度、KV head 数和 head 维度增长。以下只算一层、每元素 2 字节。',{keyElements},flow('当前状态',[['K cache',keyElements+' 个元素',true],['当前 Q','本次只处理新 token',false]]));
  r.add(2,'Value 也要保留','只缓存 K 无法完成后面的权重×V。MQA/GQA 减少的是 KV head 数，不是直接删掉所有 Query heads。',{valueElements},bars('一层缓存元素',[['K',keyElements],['V',valueElements]],'个'));
  r.add(3,'换算存储字节','不含参数、激活、allocator 对齐和多层倍数。GQA 缓存少是否变快仍需实测。',{cacheBytesPerLayer},bars('不同 KV head 配置的一层缓存',[["MQA",4*p.batch*p.length*p.headDim],["GQA(2)",8*p.batch*p.length*p.headDim],["MHA(8)",32*p.batch*p.length*p.headDim]],'字节'));
  r.add(4,'区分 prefill 与 decode','prefill 的完整分数矩阵为 T×T；含因果遮罩时有效项约一半。本例这里只作完整矩阵元素计数。',{prefillScoresPerHead},bars('每 Query head 的分数项',[['完整 prefill',prefillScoresPerHead]],'项'));
  r.add(5,'生成下一 token','decode 的新 Query 对 T+1 个 Key 打分。缓存避免重复生成旧 K/V，但仍需访问历史 KV。',{decodeScoresPerHead},bars('一次 decode 分数项',[['新 Query',decodeScoresPerHead]],'项'));
  r.add(6,'追加缓存并管理并发','连续 batching 可按序列结束/加入管理请求；paged attention 管理缓存块，二者均不改变这里的逻辑元素数。',{nextCacheBytes,addedBytes:nextCacheBytes-cacheBytesPerLayer},bars('一层缓存增长',[['生成前',cacheBytesPerLayer],['生成后',nextCacheBytes]],'字节'));
  return r.end({keyElements,valueElements,cacheBytesPerLayer,prefillScoresPerHead,decodeScoresPerHead,nextCacheBytes});
 });
 add('cs336-fit',[range('floor','拟合时假设的不可约损失',1,2,.25,2),range('target','要预测的模型规模',100,300,20,160)],p=>{
  const r=rec('cs336-fit',p,`const N=[10,20,40,80], losses=[4,3,2.5,2.25];
const x=N.map(Math.log), y=losses.map(L=>Math.log(L-floor));
const slope=covariance(x,y)/variance(x);
const intercept=mean(y)-slope*mean(x);
const predicted=floor+Math.exp(intercept)*Math.pow(target,slope);
const heldout=2+20/target; // 独立生成的已知函数，仅本例可知`);
  const N=[10,20,40,80],losses=[4,3,2.5,2.25],x=N.map(Math.log),y=losses.map(L=>Math.log(L-p.floor));
  r.add(1,'先看小规模实验表','这些数由 L=2+20/N 人工生成，不是某模型的真实训练结果。真实扩展应控制数据、训练配方与评测口径。',{N,losses},bars('小规模样本损失',N.map((n,i)=>['N='+n,losses[i]])));
  r.add(2,'扣除假设的不可约损失后取对数','只有 L−L∞>0 才能取 log。错误的不可约损失会扭曲幂律拟合，不是“取对数后总成直线”。',{x,y,floor:p.floor},bars('log(L−L∞)',y.map((v,i)=>['N='+N[i],v])));
  const mx=sum(x)/4,my=sum(y)/4,slope=sum(x.map((v,i)=>(v-mx)*(y[i]-my)))/sum(x.map(v=>(v-mx)**2)),intercept=my-slope*mx;
  r.add(3,'计算斜率','最小二乘拟合 log(L−L∞)=b+s logN。这里每点权重相同，不估计置信区间。',{slope,alpha:-slope},bars('拟合指数',[['α = −斜率',-slope]]));
  r.add(4,'恢复截距系数','系数和指数都依赖拟合数据与 L∞ 假设；不要把一个案例的数值当作课程的经验常数。',{intercept,coefficient:Math.exp(intercept)},flow('拟合函数',[['L∞',p.floor,false],['系数 a',Math.exp(intercept),false],['指数 α',-slope,true]]));
  const predicted=p.floor+Math.exp(intercept)*p.target**slope,heldout=2+20/p.target;
  r.add(5,'对更大规模作预测','预测不等于运行。真正训练之前，应先在未用于拟合的中间规模验证误差。',{target:p.target,predicted},bars('预测损失',[['预测',predicted]]));
  r.add(6,'用留出函数复核','本例知道数据生成函数，所以能计算误差。真实模型不能预先知道大规模真值。',{heldout,absoluteError:Math.abs(predicted-heldout)},bars('留出规模的复核',[['预测',predicted],['本例真值',heldout]]));
  return r.end({N,losses,slope,alpha:-slope,coefficient:Math.exp(intercept),predicted,heldout,absoluteError:Math.abs(predicted-heldout)});
 });
 add('cs336-evaluation',[range('k','每题采样 k 次',1,4,1,2)],p=>{
  const r=rec('cs336-evaluation',p,`const n=4, successes=[2,0,1,4];
const failure=successes.map(c=>k>n-c?0:Array.from({length:k},(_,i)=>(n-c-i)/(n-i)).reduce((a,b)=>a*b,1));
const passAtK=failure.map(x=>1-x);
const macro=passAtK.reduce((a,b)=>a+b,0)/passAtK.length;
const callsPerEvaluation=successes.length*k;`);
  const n=4,successes=[2,0,1,4];
  r.add(1,'把题目和方法口径固定','每题有 4 个独立生成后已验证的候选，本例成功数人工给定。pass@k 衡量允许采样 k 次的方法，不是一次生成的模型准确率。',{n,successes,k:p.k},bars('每题成功候选数',successes.map((v,i)=>['题 '+(i+1),v]),'个',4));
  const failure=successes.map(c=>p.k>n-c?0:Array.from({length:p.k},(_,i)=>(n-c-i)/(n-i)).reduce((a,b)=>a*b,1));
  r.add(2,'先算 k 个候选都失败的比例','使用 1−C(n−c,k)/C(n,k) 的无偏估计式；边界 k>n−c 时失败组合为 0。它不是根据单次观测直接猜成功率。',{failure},bars('k 个候选均失败',failure.map((v,i)=>['题 '+(i+1),v]),'比例',1));
  const passAtK=failure.map(x=>1-x);
  r.add(3,'取至少一次成功','从 1 减去全部失败的比例。检查 c=0、c=n 的边界，防止出现负数或除零。',{passAtK},bars('逐题 pass@k',passAtK.map((v,i)=>['题 '+(i+1),v]),'比例',1));
  const macro=sum(passAtK)/4;
  r.add(4,'逐题等权汇总','先按题算再平均，避免候选数量或题型分布改变权重。本例每题候选数相同。',{macro},bars('宏平均 pass@k',[['平均',macro]],'比例',1));
  r.add(5,'把方法成本一起记录','增加 k 会增加允许的推理预算，不能隐去采样次数、工具和验证器差异后声称模型更强。',{callsPerEvaluation:4*p.k},bars('评测允许采样数量',[['题数×k',4*p.k]],'次'));
  return r.end({n,successes,failure,passAtK,macro,callsPerEvaluation:4*p.k});
 });
 add('cs336-bpb',[select('tokenizer','同一文本的切分方式',[['A','A · 四个 token'],['B','B · 两个 token']],'A')],p=>{
  const r=rec('cs336-bpb',p,`const byteCount=20;
const nll=tokenizer==='A'?[2,2,2,2]:[4,4];
const totalNLL=nll.reduce((a,b)=>a+b,0);
const perplexity=Math.exp(totalNLL/nll.length);
const bpb=totalNLL/(Math.log(2)*byteCount);`);
  const byteCount=20,nll=p.tokenizer==='A'?[2,2,2,2]:[4,4],totalNLL=sum(nll),perplexity=Math.exp(totalNLL/nll.length),bpb=totalNLL/(Math.log(2)*byteCount);
  r.add(1,'固定同一段原文本','两个假想 tokenizer 都在同一个 20 字节文本上评估；本例特意令总 NLL 都为 8，隔离分母的影响。',{byteCount},flow('比较前先统一对象',[['原文本','20 bytes',true],['切分',p.tokenizer,false]]));
  r.add(2,'逐 token 累加负对数概率','NLL 使用自然对数（nats）；这是给定的示例损失，没有运行语言模型。',{nll},bars('逐 token NLL',nll.map((v,i)=>['token '+i,v]),'nat'));
  r.add(3,'保留总 NLL','不要先把不同长度的段平均再无权平均；先按明确的 token 或 byte 总数汇总。',{totalNLL},bars('总负对数似然',[['总 NLL',totalNLL]],'nat'));
  r.add(4,'看 perplexity 的分母','PPL=exp(总 NLL/token 数)。相同总概率、不同切分，会得到不同 PPL，不能直接跨 tokenizer 排名。',{perplexity,tokenCount:nll.length},bars('每 token 指标',[['perplexity',perplexity]]));
  r.add(5,'改按原文本 byte 数归一化','BPB=总 NLL/(ln2×bytes)。本例两种切分都得到相同 BPB，但真实模型本身的总 NLL 也可能不同。',{bpb},bars('按文本字节归一化',[['bits / byte',bpb]],'bit/byte'));
  return r.end({byteCount,nll,totalNLL,perplexity,bpb});
 });
 add('cs336-data-sources',[range('minChars','最小文本字符数',5,45,5,15),select('language','语言筛选',[['en','保留标注为英文'],['all','保留所有标注语言']],'en')],p=>{
  const r=rec('cs336-data-sources',p,`const raw=readFixedTeachingDump();
const text=raw.map(d=>({...d,text:stripKnownSampleTags(d.html)}));
const languageFiltered=text.filter(d=>language==='all'||d.lang===language);
const filtered=languageFiltered.filter(d=>d.text.length>=minChars);
const records=filtered.map(({id,source,license,text})=>({id,source,license,text}));`);
  const raw=[{id:'w1',source:'example/wiki',license:'CC BY-SA (案例标记)',lang:'en',html:'<p>Models learn patterns from carefully prepared text.</p>'},{id:'w2',source:'example/forum',license:'unknown (案例标记)',lang:'en',html:'<p>Hi</p>'},{id:'w3',source:'example/zh',license:'author permission (案例标记)',lang:'zh',html:'<p>数据需要保留来源和处理记录，不能只留下最终文本。</p>'},{id:'w4',source:'example/code',license:'MIT (案例标记)',lang:'en',html:'<code>def add(a, b): return a + b</code>'}];
  r.add(1,'从有来源的快照开始','原创虚构 dump，既不爬取网站也不声称这些来源真实存在。source、语言与许可状态显式随记录保存。',{records:raw.map(({id,source,lang,license})=>({id,source,lang,license}))},flow('输入记录',raw.map(d=>[d.id,d.source,false])));
  const text=raw.map(d=>({...d,text:d.html.replace(/<[^>]*>/g,'').trim()}));
  r.add(2,'把结构化载体转成文本','这里正则只处理四条受控样例；生产 HTML 需要解析器、正文提取与异常编码处理，不能照搬此规则处理任意网页。',{text:text.map(d=>({id:d.id,text:d.text}))},bars('提取后字符数',text.map(d=>[d.id,d.text.length]),'字符'));
  const languageFiltered=text.filter(d=>p.language==='all'||d.lang===p.language);
  r.add(3,'按已有语言标注筛选','标注是人工给定，未运行语言识别器。真实分类器会有误差，阈值必须与目标语种和质量抽样检查一起确定。',{kept:languageFiltered.map(d=>d.id)},flow('语言处理结果',text.map(d=>[d.id,d.lang,languageFiltered.includes(d)])));
  const filtered=languageFiltered.filter(d=>d.text.length>=p.minChars);
  r.add(4,'检查一个可解释的质量规则','字符数只是一个示例特征，不能单凭长短判断质量。保留被删除原因，方便审计误删。',{minChars:p.minChars,kept:filtered.map(d=>d.id)},flow('长度筛选',languageFiltered.map(d=>[d.id,d.text.length+' 字符',filtered.includes(d)])));
  const records=filtered.map(({id,source,license,text})=>({id,source,license,text}));
  r.add(5,'输出时保留 provenance','技术上可处理不等于可自由使用；本课只追踪许可元数据，不作法律判断，也不把 unknown 自动改成授权。',{records},bars('处理各阶段数量',[['原始',raw.length],['语言',languageFiltered.length],['质量规则后',records.length]],'条',4));
  return r.end({records,rawCount:raw.length,languageCount:languageFiltered.length,retainedCount:records.length});
 });
 add('cs336-jaccard',[range('overlap','两个四元素集合共有的元素',0,4,1,3),range('bands','LSH band 数 b',1,8,1,4),range('rows','每 band 行数 r',1,4,1,2)],p=>{
  const r=rec('cs336-jaccard',p,`const A=['a','b','c','d'];
const B=A.slice(0,overlap).concat(Array.from({length:4-overlap},(_,i)=>'x'+i));
const intersection=A.filter(x=>B.includes(x)).length;
const union=new Set([...A,...B]).size;
const similarity=intersection/union;
const candidateProbability=1-Math.pow(1-Math.pow(similarity,rows),bands);`);
  const A=['a','b','c','d'],B=A.slice(0,p.overlap).concat(Array.from({length:4-p.overlap},(_,i)=>'x'+i)),intersection=A.filter(x=>B.includes(x)).length,union=new Set([...A,...B]).size,similarity=intersection/union,candidateProbability=1-(1-similarity**p.rows)**p.bands;
  r.add(1,'先把文档变成集合','本例直接给四个 shingle 标签；真实 n-gram 提取需先固定归一化与窗口边界。集合不保留重复次数。',{A},flow('集合 A',A.map(x=>[x,'shingle',false])));
  r.add(2,'构造另一个集合','改变共有元素数，观察精确 Jaccard 与近似候选概率的区别。',{B},flow('集合 B',B.map(x=>[x,A.includes(x)?'共有':'仅 B',A.includes(x)])));
  r.add(3,'统计交集','每个共有 shingle 只数一次。把字符编辑距离、语义相似度与 Jaccard 分开。',{intersection},bars('集合规模',[['交集',intersection],['A',4],['B',4]],'元素',4));
  r.add(4,'统计并集','Jaccard 分母是去重后的并集，不是两个集合大小直接相加。',{union},bars('集合并集',[['并集',union]],'元素',8));
  r.add(5,'得到精确相似度','MinHash 用签名估计这一量；本步直接计算真值，便于检查近似方法的误差。',{similarity},bars('Jaccard',[['精确值',similarity]],'比例',1));
  r.add(6,'估算 LSH 进入候选集的概率','理想独立 MinHash 下 P=1−(1−sʳ)ᵇ；它是概率曲线，不是实际采样结果，也不是删除决定。候选需再复核。',{candidateProbability,b:p.bands,r:p.rows},bars('候选概率',[['概率',candidateProbability]],'比例',1));
  return r.end({A,B,intersection,union,similarity,candidateProbability});
 });
 add('cs336-posttrain',[select('mode','目标函数',[['sft','SFT 助手 token 掩码'],['dpo','DPO 偏好对']],'sft'),range('chosen','偏好输出的对数似然差',0,4,.5,2),range('rejected','非偏好输出的对数似然差',0,4,.5,1),range('beta','DPO β',.1,1,.1,.5)],p=>{
  const r=rec('cs336-posttrain',p,`const nll=[1,1,0.3,0.7], mask=[0,0,1,1];
const sftLoss=nll.reduce((s,x,i)=>s+x*mask[i],0)/mask.reduce((a,b)=>a+b,0);
const logRatioDifference=chosen-rejected;
const margin=beta*logRatioDifference;
const preferenceProbability=1/(1+Math.exp(-margin));
const dpoLoss=-Math.log(preferenceProbability);`);
  const nll=[1,1,.3,.7],mask=[0,0,1,1],sftLoss=.5,logRatioDifference=p.chosen-p.rejected,margin=p.beta*logRatioDifference,preferenceProbability=1/(1+Math.exp(-margin)),dpoLoss=-Math.log(preferenceProbability);
  r.add(1,'明确训练信号来自哪里','SFT 使用期望回复；偏好学习使用 chosen/rejected 对。示例 NLL 与相对参考模型的 log-ratio 都为人为输入，未训练 LM。',{mode:p.mode,nll,mask},flow('两类训练信号',[['SFT','输入 → 理想回复',p.mode==='sft'],['偏好','同输入下两条回复',p.mode==='dpo']]));
  r.add(2,'SFT 只对目标位置计损失','本案例前两个位置为提示，不计监督损失；后两个为助手回复。真实 mask 需处理边界、padding 和多轮消息。',{sftLoss,unmaskedLoss:.75},bars('相同序列、不同统计口径',[['助手 token 平均',sftLoss],['错误地全位置平均',.75]],'nat/token'));
  r.add(3,'DPO 先比较相对参考的 log-ratio','chosen/rejected 控件表示 logπ−logπ_ref，不是原始 logits。两项作差才得到偏好方向。',{logRatioDifference},bars('相对参考的 log-ratio',[['chosen',p.chosen],['rejected',p.rejected]]));
  r.add(4,'用 β 缩放差值','β 影响此偏好损失的尺度；不能把它理解为生成温度。参考策略不同，差值也会改变。',{beta:p.beta,margin},bars('DPO margin',[['β×差值',margin]]));
  r.add(5,'把 margin 映射为偏好概率','sigmoid 只是目标函数中的二分类量，不等于模型回答的事实正确率。',{preferenceProbability},bars('目标函数的偏好概率',[['σ(margin)',preferenceProbability]],'比例',1));
  r.add(6,'核对损失与适用边界','margin=0 时为 ln2；偏好方向更正确时损失下降。这里只计算单对目标，没有实现完整 RLHF/PPO 训练。',{dpoLoss,sftLoss,selectedLoss:p.mode==='sft'?sftLoss:dpoLoss},bars('所选案例的训练目标',[['loss',p.mode==='sft'?sftLoss:dpoLoss]],'nat'));
  return r.end({sftLoss,logRatioDifference,margin,preferenceProbability,dpoLoss,selectedLoss:p.mode==='sft'?sftLoss:dpoLoss});
 });
 add('cs336-grpo',[select('group','同一题的候选答案',[['mixed','答案 4、5、6、5'],['allwrong','答案全为 4'],['allcorrect','答案全为 5']],'mixed'),range('ratio','第一个候选的新旧策略比',.5,1.5,.1,1),range('clip','裁剪 ε',.1,.3,.1,.2)],p=>{
  const r=rec('cs336-grpo',p,`const answers=group==='mixed'?[4,5,6,5]:Array(4).fill(group==='allwrong'?4:5);
const rewards=answers.map(a=>Number(a===5));
const mean=rewards.reduce((a,b)=>a+b,0)/4;
const std=Math.sqrt(rewards.reduce((s,x)=>s+(x-mean)**2,0)/4);
const advantage=rewards.map(x=>std===0?0:(x-mean)/std);
const ratios=[ratio,1,1,1];
const surrogate=advantage.map((a,i)=>Math.min(ratios[i]*a,Math.max(1-clip,Math.min(1+clip,ratios[i]))*a));
const objective=surrogate.reduce((a,b)=>a+b,0)/4;`);
  const answers=p.group==='mixed'?[4,5,6,5]:Array(4).fill(p.group==='allwrong'?4:5),rewards=answers.map(a=>Number(a===5)),mean=sum(rewards)/4,std=Math.sqrt(sum(rewards.map(x=>(x-mean)**2))/4),advantage=rewards.map(x=>std===0?0:(x-mean)/std),ratios=[p.ratio,1,1,1],surrogate=advantage.map((a,i)=>Math.min(ratios[i]*a,Math.max(1-p.clip,Math.min(1+p.clip,ratios[i]))*a)),objective=sum(surrogate)/4;
  r.add(1,'对同一题采样一组回答','问题为 2+3，候选答案预先给定。此处用实际数值相等校验作 verifier，不把它推广为任意任务正确性判断。',{answers},flow('候选答案',answers.map((a,i)=>['候选 '+i,a,false])));
  r.add(2,'计算可验证奖励','答案等于 5 得 1，否则为 0；真实 verifier 仍可能有漏洞，训练奖励不等于完整能力。',{rewards},bars('逐候选奖励',rewards.map((v,i)=>['候选 '+i,v]),'reward',1));
  r.add(4,'计算组内基线和尺度','这里使用总体标准差；不同 GRPO 变体的归一化与 token/sequence 聚合方式需要分别核对。',{mean,std},bars('组内统计',[['均值',mean],['标准差',std]]));
  r.add(5,'得到组相对优势','全对或全错时标准差为 0，本例明确返回零优势，防止 NaN；有奖励不保证这组样本有学习信号。',{advantage},bars('归一化优势',advantage.map((v,i)=>['候选 '+i,v])));
  r.add(7,'对新旧策略比进行裁剪','对正负优势都要用 min(rA,clip(r)A)，不能先把优势绝对值化。这里第一项 ratio 可变，其余为 1。',{ratios,surrogate},bars('逐样本 clipped surrogate',surrogate.map((v,i)=>['候选 '+i,v])));
  r.add(8,'按本例口径聚合','计算组内均值，仅展示一个 surrogate 项；未加入 KL、value loss 或真实采样/反向传播，不声称复现完整 GRPO。',{objective},bars('组目标',[['均值',objective]]));
  return r.end({answers,rewards,mean,std,advantage,ratios,surrogate,objective});
 });
 add('cs336-patches',[select('patch','224×224 图像的 patch 边长',[[14,'14'],[16,'16'],[32,'32']],16),range('images','图像数',1,4,1,1),range('text','文本 token 数',16,128,16,32)],p=>{
  const r=rec('cs336-patches',p,`const patchesPerImage=(224/patch)**2;
const visualTokens=images*(patchesPerImage+1);
const totalTokens=text+visualTokens;
const denseScoreCells=totalTokens*totalTokens;
const toyPatchMeans=meanEach2x2(make4x4Image());`);
  const patchesPerImage=(224/p.patch)**2,visualTokens=p.images*(patchesPerImage+1),totalTokens=p.text+visualTokens,denseScoreCells=totalTokens**2;
  r.add(1,'先把图像切成 patch','使用简化 ViT 约定：224 可被选定 patch 边长整除。真实动态分辨率、合并 token 与 crop 策略另算。',{patchesPerImage,patchSide:p.patch},flow('图像网格',[['图像','224 × 224',false],['网格',224/p.patch+' × '+224/p.patch,true]]));
  r.add(2,'加入一个全局 token','人为采用每图额外 1 个 CLS 的计数约定，不是所有多模态架构都这样。必须在模型配置里核对。',{images:p.images,visualTokens},bars('图像 token 数',[['patch',p.images*patchesPerImage],['全局',p.images]],'token'));
  r.add(3,'与文本 token 拼接','LLaVA 风格 projector 把视觉特征映射到 LM 输入空间；token 数相同不等于特征相同或能力相同。',{totalTokens}, {kind:'segments',title:'简化统一序列',capacity:totalTokens,unit:'token',segments:[{label:'文本',value:p.text},{label:'视觉',value:visualTokens}]} );
  r.add(4,'核算稠密 Attention 元素','这里只算分数矩阵元素，不是 FLOP、显存或实际运行时；FlashAttention 不必在 HBM 中物化整个矩阵。',{denseScoreCells,textOnlyCells:p.text**2,ratio:denseScoreCells/p.text**2},bars('完整分数矩阵元素对比',[['纯文本',p.text**2],['文本+图像',denseScoreCells]],'项'));
  const image=[[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15]],toyPatchMeans=[];for(let i=0;i<4;i+=2)for(let j=0;j<4;j+=2)toyPatchMeans.push((image[i][j]+image[i][j+1]+image[i+1][j]+image[i+1][j+1])/4);
  r.add(5,'在小图上实际算一个 patch 特征','4×4 数值图分成四个 2×2 patch，取均值作为可复算特征；真实 ViT 使用可学习投影与位置编码，这里没有模拟视觉理解。',{image,toyPatchMeans},bars('四个玩具 patch 均值',toyPatchMeans.map((v,i)=>['patch '+i,v])));
  return r.end({patchesPerImage,visualTokens,totalTokens,denseScoreCells,toyPatchMeans});
 });
 add('cs336-clip',[range('temperature','对比学习温度',.1,1,.1,.2),select('pairing','正样本配对',[['correct','同编号图文'],['swapped','交换前两条文本标签']],'correct')],p=>{
  const r=rec('cs336-clip',p,`const images=[[1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2]];
const texts=pairing==='correct'?images:[images[1],images[0],images[2]];
const scores=images.map(x=>texts.map(y=>dot(x,y)/temperature));
const probabilities=scores.map(softmax);
const imageToTextLoss=-probabilities.reduce((s,row,i)=>s+Math.log(row[i]),0)/3;`);
  const images=[[1,0],[0,1],[Math.SQRT1_2,Math.SQRT1_2]],texts=p.pairing==='correct'?images:[images[1],images[0],images[2]],scores=images.map(x=>texts.map(y=>dot(x,y)/p.temperature)),probabilities=scores.map(softmax),imageToTextLoss=-sum(probabilities.map((row,i)=>Math.log(row[i])))/3;
  r.add(1,'把图像和文本表示归一化','给定三个单位二维向量，省略真实图像与文本编码器。点积因此等于余弦相似度。',{images},flow('图像表示',images.map((v,i)=>['图 '+i,JSON.stringify(v),false])));
  r.add(2,'固定训练配对关系','目标仍是矩阵对角线；交换文本向量模拟标签配对出错，而不是偷偷改变目标答案。',{texts,pairing:p.pairing},flow('文本表示',texts.map((v,i)=>['文 '+i,JSON.stringify(v),false])));
  r.add(3,'计算批内图文相似度','一张图对所有文本计算相似度，再除以温度。本例所有负样本都来自同一小批。',{scores},bars('图 0 对各文本的缩放分数',scores[0].map((v,i)=>['文 '+i,v])));
  r.add(4,'把每行转成检索概率','每行归一化，正样本为同编号图文。模型可能把错误标签推成高置信，这仍需要数据检查。',{probabilities},bars('对角正样本概率',probabilities.map((row,i)=>['图文 '+i,row[i]]),'比例',1));
  r.add(5,'累计图到文的对比损失','仅计算 CLIP 的 image→text 单向项；完整 CLIP 还含反向项，SigLIP 则改用成对 sigmoid 目标。这里未训练编码器。',{imageToTextLoss},bars('单向交叉熵',[['平均 NLL',imageToTextLoss]],'nat'));
  return r.end({scores,probabilities,imageToTextLoss});
 });
 add('cs336-serving',[range('slots','并发解码槽位',1,4,1,2)],p=>{
  const r=rec('cs336-serving',p,`const lengths=[2,5,1,3];
const staticTicks=sum(chunk(lengths,slots).map(group=>Math.max(...group)));
let waiting=lengths.map((remaining,id)=>({id,remaining})), active=[],tick=0;
while(waiting.length||active.length){
  while(active.length<slots&&waiting.length)active.push(waiting.shift());
  active=active.map(x=>({...x,remaining:x.remaining-1})).filter(x=>x.remaining>0); tick++;
}
const tokens=lengths.reduce((a,b)=>a+b,0);
const utilization=tokens/(tick*slots);`);
  const lengths=[2,5,1,3],staticTicks=sum(Array.from({length:Math.ceil(lengths.length/p.slots)},(_,g)=>Math.max(...lengths.slice(g*p.slots,(g+1)*p.slots))));let waiting=lengths.map((remaining,id)=>({id,remaining})),active=[],tick=0;const schedule=[];
  r.add(1,'先固定到达与输出长度','四个案例请求在开始时全部到达；每个活跃请求每时间槽生成一个 token。未模拟真实 prefill、网络、GPU 算力或 KV 容量。',{lengths,slots:p.slots},bars('请求需要的输出 token',lengths.map((v,i)=>['请求 '+i,v]),'token'));
  r.add(2,'静态批次等最慢请求','按固定组分批，同组短请求完成后槽位空闲，等整批结束再发下一组。',{staticTicks},flow('静态批次时间',[['总时间槽',staticTicks,true],['口径','各组最长输出长度相加',false]]));
  while(waiting.length||active.length){while(active.length<p.slots&&waiting.length)active.push(waiting.shift());const before=clone(active);active=active.map(x=>({...x,remaining:x.remaining-1})).filter(x=>x.remaining>0);schedule.push(before.map(x=>x.id));r.add(6,'连续批处理：时间槽 '+tick,'每个时间槽结束后释放完成请求，下一槽填入等待者。真实 scheduler 还要遵守 token/KV 预算、优先级和公平性。',{tick,activeBefore:before,waiting:waiting.map(x=>x.id),finished:before.filter(x=>x.remaining===1).map(x=>x.id)},flow('当前占用槽位',before.map(x=>['请求 '+x.id,'执行前剩 '+x.remaining+' token',true])));tick++;}
  const tokens=sum(lengths),utilization=tokens/(tick*p.slots);
  r.add(8,'比较相同工作的时间槽','固定相同的 token 工作量；这里只证明该调度案例减少空闲，不声称连续 batching 在所有服务目标下都更优。',{tokens,staticTicks,continuousTicks:tick,schedule},bars('同案例的调度耗时',[['静态批次',staticTicks],['连续填充',tick]],'时间槽'));
  r.add(9,'核算理想槽位利用率','token/(时间槽×并发槽位)。它不是 GPU MFU，更不是实测吞吐；真实服务还要同时报告延迟、成本与质量。',{utilization,tokensPerTick:tokens/tick},bars('连续调度的槽位利用率',[['利用率',utilization]],'比例',1));
  return r.end({lengths,staticTicks,continuousTicks:tick,schedule,tokens,utilization,tokensPerTick:tokens/tick});
 });
 return ids;
});
