/* D2L: inspect the arithmetic in the existing immutable local teaching traces. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const sum=xs=>xs.reduce((a,b)=>a+b,0),mean=xs=>sum(xs)/xs.length;
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  const same=(a,b)=>a.length===b.length&&a.every((x,i)=>Array.isArray(x)?same(x,b[i]):typeof x==='number'?near(x,b[i]):x===b[i]);
  const n=x=>typeof x==='number'?Number(x.toFixed(4)).toString():String(x);
  const add=xs=>xs.map(n).join(' + '),mul=(a,b)=>a.map((x,i)=>`${n(x)} × ${n(b[i])}`).join(' + ');
  const C=(id,label,value,formula,inputs={},note='无量纲原创小算例；公式展示四位小数，验证使用完整精度。')=>({id,label,value,formula,inputs,note});
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const vector=(prefix,label,xs,formula,inputs=(x,j)=>({index:j,sourceValue:x}))=>xs.map((x,j)=>C(`${prefix}-${j}`,`${label}[${j}]`,x,formula(x,j),inputs(x,j)));
  const matrix=(prefix,label,xs,formula,inputs=(x,i,j)=>({row:i,column:j,sourceValue:x}))=>xs.flatMap((row,i)=>row.map((x,j)=>C(`${prefix}-${i}-${j}`,`${label}[${i},${j}]`,x,formula(x,i,j),inputs(x,i,j))));
  function model(intuition,inspect,experiments){return {intuition,inspect(t,index){const i=Math.max(0,Math.min(t.steps.length-1,Math.trunc(Number(index))||0)),f=t.steps[i],v=Object.assign({},...t.steps.slice(0,i+1).map(s=>s.variables));return {title:f.title,summary:`当前第 ${i+1} 个实际快照，第 ${f.line} 行。${f.detail}`,cells:inspect(t,f.line,v,f.variables,i)};},experiments};}
  const models={};

  models['d2l-tensors']=model('先核对元素到二维坐标的映射，再按末轴检查广播；每个输出格只加上同列的向量元素。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('flat','原始元素',v.flat,(x,j)=>`arange 的位置 ${j} → ${n(x)} = ${j}`);
    if(l===2)return matrix('reshape','A',v.A,(x,i,j)=>`flat[${i} × ${p.columns} + ${j}] = flat[${i*p.columns+j}] = ${n(x)}`,(x,i,j)=>({row:i,column:j,columns:p.columns,flatIndex:i*p.columns+j,sourceValue:x}));
    if(l===3)return vector('broadcast-vector','B',v.B,(x,j)=>`${p.offset} + ${j} = ${n(x)}；对齐为 [1, ${v.B.length}]`,(x,j)=>({offset:p.offset,index:j,alignedShape:[1,v.B.length]}));
    if(l===4)return [C('axis-check','末轴能否广播',v.compatible,`${v.lastAxisA} === ${v.lastAxisB} 或 ${v.lastAxisB} === 1 → ${v.compatible}`,{axisA:v.lastAxisA,axisB:v.lastAxisB},'轴长单位为元素个数；前导轴是1，可扩展至行数。')];
    if(l===5)return [C('shape-rejected','拒绝形状并保留空输出',v.status,`${p.columns} ≠ ${v.B.length} 且 ${v.B.length} ≠ 1 → shape_error；output = null`,{columns:p.columns,length:v.B.length},'错误分支未执行逐格加法；空输出不是数值0。')];
    if(l===6)return matrix('broadcast-sum','输出',v.output,(x,i,j)=>`${n(v.A[i][j])} + ${n(v.B[j])} = ${n(x)}`,(x,i,j)=>({A:v.A[i][j],B:v.B[j],row:i,column:j}));
    return [C('total','输出元素和',v.total,`${add(v.output.flat())} = ${n(v.total)}`,{output:v.output}),C('broadcast-check','利用广播独立核对',v.check,`(${add(v.flat)}) + ${p.rows} × (${add(v.B)}) = ${n(v.check)}`,{flat:v.flat,rows:p.rows,B:v.B})];
  },[E('shape-guard','只改变 B 的末轴长度','多一个元素时还能逐格相加吗？',{mode:'row'},{mode:'incompatible'},'相同 A 保持不变；合法分支有矩阵，非法分支拒绝并返回空输出。',(a,b)=>a.result.status==='ok'&&b.result.status==='shape_error'&&b.result.output===null&&same(a.result.A,b.result.A))]);

  models['d2l-matrix-probability']=model('逐格特征乘积先按行求预测，再把非负质量归一化；期望的每一项是概率乘相应预测。',(t,l,v)=>{
    if(l===1)return matrix('feature','X',v.X,(x,i,j)=>`样本 ${i} 的特征 ${j} = ${n(x)}，对应 w[${j}] = ${n(v.w[j])}`);
    if(l===2)return matrix('feature-product','特征贡献',v.products,(x,i,j)=>`${n(v.X[i][j])} × ${n(v.w[j])} = ${n(x)}`,(x,i,j)=>({feature:v.X[i][j],weight:v.w[j]}));
    if(l===3)return vector('prediction','预测',v.prediction,(x,i)=>`${mul(v.X[i],v.w)} = ${n(x)}`,(x,i)=>({features:v.X[i],weights:v.w}));
    if(l===4)return [C('normalizer','非负质量总量',v.normalizer,`${add(v.mass)} = ${n(v.normalizer)}`,{mass:v.mass},'分母至少为1；质量不等于概率。')];
    if(l===5)return vector('probability','概率',v.probabilities,(x,i)=>`${n(v.mass[i])} / ${n(v.normalizer)} = ${n(x)}`,(x,i)=>({mass:v.mass[i],normalizer:v.normalizer})).concat(C('probability-total','概率和',v.sum,`${add(v.probabilities)} = ${n(v.sum)}`,{probabilities:v.probabilities},'概率单位为比例。'));
    return vector('expectation-part','期望贡献',v.products,(x,i)=>`${n(v.probabilities[i])} × ${n(v.prediction[i])} = ${n(x)}`,(x,i)=>({probability:v.probabilities[i],prediction:v.prediction[i]})).concat(C('expectation','数学期望',v.expectation,`${mul(v.probabilities,v.prediction)} = ${n(v.expectation)}`,{probabilities:v.probabilities,prediction:v.prediction}));
  },[E('mass-only','只增加第一个结果的质量','改变概率是否会改掉已经算出的 Xw？',{p0:0},{p0:4},'预测仍为[5,5]；概率[0,1]变为[0.8,0.2]，期望仍为5。',(a,b)=>same(a.result.prediction,[5,5])&&same(a.result.prediction,b.result.prediction)&&same(a.result.probabilities,[0,1])&&same(b.result.probabilities,[.8,.2])&&near(a.result.expectation,5)&&near(b.result.expectation,5))]);

  models['d2l-autograd']=model('半平方误差的上游梯度是预测误差；沿加法与乘法的局部导数分别乘回 w、b 和输入。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return [C('multiply','乘法节点',v.product,`${n(v.w)} × ${n(v.x)} = ${n(v.product)}`,{w:v.w,x:v.x})];
    if(l===2)return [C('prediction','预测节点',v.prediction,`${n(v.product)} + ${n(v.b)} = ${n(v.prediction)}`,{product:v.product,b:v.b})];
    if(l===3)return [C('residual','误差节点',v.error,`${n(v.prediction)} − ${n(v.target)} = ${n(v.error)}`,{prediction:v.prediction,target:v.target})];
    if(l===4)return [C('half-square','损失节点',v.loss,`0.5 × (${n(v.error)})² = ${n(v.loss)}`,{error:v.error},'单位为目标量的平方；这里目标量无量纲。')];
    if(l===5)return [C('loss-to-error','损失对误差的局部导数',v.dLoss_dError,`d(0.5e²)/de = e = ${n(v.error)}`,{error:v.error}),C('upstream','损失对预测的链式梯度',v.dPrediction,`${n(v.dLoss_dError)} × ${v.dError_dPrediction} = ${n(v.dPrediction)}`,{dLoss_dError:v.dLoss_dError,dError_dPrediction:v.dError_dPrediction})];
    return [C('dw','权重梯度',v.dW,`${n(v.dPrediction)} × ${n(p.x)} = ${n(v.dW)}`,{upstream:v.dPrediction,local:p.x}),C('db','偏置梯度',v.dB,`${n(v.dPrediction)} × 1 = ${n(v.dB)}`,{upstream:v.dPrediction,local:1}),C('dx','输入梯度',v.dX,`${n(v.dPrediction)} × ${n(p.w)} = ${n(v.dX)}`,{upstream:v.dPrediction,local:p.w})];
  },[E('target-shift','只把目标增加1','目标改变时哪些局部导数不变、上游误差怎样变化？',{target:3},{target:4},'预测仍为2；误差−1→−2，dw−2→−4，db与dx−1→−2。',(a,b)=>near(a.result.prediction,2)&&near(b.result.prediction,2)&&near(a.result.dW,-2)&&near(b.result.dW,-4)&&near(b.result.dB,-2)&&near(b.result.dX,-2))]);

  function regressionLossCells(v,w,b,prefix){const errors=v.X.map((x,j)=>w*x+b-v.Y[j]),parts=errors.map(e=>.5*e*e);return vector(prefix+'-loss','样本半平方误差',parts,(x,j)=>`0.5 × (${n(w)} × ${v.X[j]} + ${n(b)} − ${v.Y[j]})² = ${n(x)}`,(x,j)=>({w,b,x:v.X[j],target:v.Y[j],error:errors[j]})).concat(C(prefix+'-mean','平均半平方误差',mean(parts),`(${add(parts)}) / ${parts.length} = ${n(mean(parts))}`,{w,b,X:v.X,Y:v.Y}));}
  models['d2l-regression']=model('每轮从同一组旧参数生成两条预测、损失和平均梯度，再同时更新 w 与 b；只播放实际已执行的更新。',(t,l,v,f,i)=>{
    const p=t.params;
    if(l===1)return v.X.map((x,j)=>C('sample-'+j,'训练样本 '+j,v.Y[j],`y[${j}] = 2 × ${x} = ${v.Y[j]}；初始 w=${n(v.w)}，b=${n(v.b)}`,{x,y:v.Y[j],w:v.w,b:v.b},'固定两条数据；不是独立测试集。'));
    if(l===3)return vector('prediction','本轮预测',v.prediction,(x,j)=>`${n(v.w)} × ${v.X[j]} + ${n(v.b)} = ${n(x)}`,(x,j)=>({w:v.w,x:v.X[j],b:v.b})).concat(vector('error','本轮误差',v.error,(x,j)=>`${n(v.prediction[j])} − ${v.Y[j]} = ${n(x)}`,(x,j)=>({prediction:v.prediction[j],target:v.Y[j]})));
    if(l===4)return regressionLossCells(v,v.w,v.b,'before');
    if(l===5){const contributions=v.error.map((e,j)=>e*v.X[j]);return vector('dw-part','dw 的样本贡献',contributions,(x,j)=>`${n(v.error[j])} × ${v.X[j]} = ${n(x)}`,(x,j)=>({error:v.error[j],x:v.X[j]})).concat(C('dw','平均权重梯度',v.dw,`(${add(contributions)}) / 2 = ${n(v.dw)}`,{errors:v.error,X:v.X}),C('db','平均偏置梯度',v.db,`(${add(v.error)}) / 2 = ${n(v.db)}`,{errors:v.error}));}
    if(l===6){const old=t.steps[i-3].variables;return [C('w-update','同时更新 w',v.w,`${n(old.w)} − ${n(p.rate)} × (${n(v.dw)}) = ${n(v.w)}`,{old:old.w,rate:p.rate,gradient:v.dw}),C('b-update','同时更新 b',v.b,`${n(old.b)} − ${n(p.rate)} × (${n(v.db)}) = ${n(v.b)}`,{old:old.b,rate:p.rate,gradient:v.db})].concat(regressionLossCells(v,v.w,v.b,'after'));}
    return regressionLossCells(v,v.w,v.b,'final').concat(C('updates','已执行更新数',v.updates,`循环已实际执行 ${v.updates} 次；epochs = ${p.epochs}`,{updates:v.updates,epochs:p.epochs},'最终核对：本地全批量数值轨迹，不代表GPU训练或泛化效果。'));
  },[E('learning-rate','只把学习率加倍','第一轮参数步长是否都加倍？',{epochs:1,rate:.1},{epochs:1,rate:.2},'同一旧状态 dw=−5、db=−3，更新由(0.5,0.3)变为(1,0.6)。',(a,b)=>near(a.result.w,.5)&&near(a.result.b,.3)&&near(b.result.w,1)&&near(b.result.b,.6)&&near(a.result.history[0].dw,b.result.history[0].dw))]);

  models['d2l-classification']=model('逐类减最大值、取指数并归一化；交叉熵只读取标签类概率，对每个 logit 的梯度是 p 减 one-hot。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('logit','类别分数',v.logits,(x,j)=>`${p.shift} + ${[p.gap,0,-p.gap][j]} = ${n(x)}`,(x,j)=>({shift:p.shift,offset:[p.gap,0,-p.gap][j]}));
    if(l===2)return vector('stable-score','稳定分数',v.shifted,(x,j)=>`${n(v.logits[j])} − max(${v.logits.map(n).join(', ')}) = ${n(x)}`,(x,j)=>({logit:v.logits[j],maximum:v.maximum}));
    if(l===3)return vector('exponential','指数质量',v.exp,(x,j)=>`exp(${n(v.shifted[j])}) = ${n(x)}`,(x,j)=>({shiftedScore:v.shifted[j]})).concat(C('normalizer','归一化分母',v.normalizer,`${add(v.exp)} = ${n(v.normalizer)}`,{exp:v.exp}));
    if(l===4)return vector('probability','类别概率',v.probabilities,(x,j)=>`${n(v.exp[j])} / ${n(v.normalizer)} = ${n(x)}`,(x,j)=>({exponential:v.exp[j],normalizer:v.normalizer}));
    if(l===5)return [C('cross-entropy','标签类交叉熵',v.loss,`log(${n(v.normalizer)}) + ${n(v.maximum)} − ${n(v.logits[v.target])} = ${n(v.loss)}；等价于 −log(${n(v.correctProbability)})`,{normalizer:v.normalizer,maximum:v.maximum,targetLogit:v.logits[v.target],probability:v.correctProbability},'自然对数，单位 nat/样本。')];
    return vector('logit-gradient','分数梯度',v.gradient,(x,j)=>`${n(v.probabilities[j])} − ${j===p.target?1:0} = ${n(x)}`,(x,j)=>({probability:v.probabilities[j],oneHot:j===p.target?1:0})).concat(C('gradient-zero-sum','分数梯度之和',v.sum,`${add(v.gradient)} = ${n(v.sum)}`,{gradient:v.gradient},'共同平移不改变目标；数值舍入可能留下机器精度残差。'));
  },[E('common-shift','只共同平移所有 logit','每个分数加10，概率与梯度会改变吗？',{shift:0},{shift:10},'概率、交叉熵、各类梯度都保持；原始logit共同增加10。',(a,b)=>same(a.result.probabilities,b.result.probabilities)&&same(a.result.gradient,b.result.gradient)&&near(a.result.loss,b.result.loss)&&b.result.logits.every((x,j)=>near(x-a.result.logits[j],10)))]);

  models['d2l-mlp']=model('按仿射、ReLU、输出和半平方损失的顺序执行前向；反向在 ReLU 门处乘0或1，再分给第一层参数。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return [C('affine','隐藏层预激活',v.z,`${n(p.w)} × ${n(p.x)} + ${n(p.b)} = ${n(v.z)}`,{w:p.w,x:p.x,b:p.b})];
    if(l===2)return [C('relu','隐藏状态',v.hidden,`max(0, ${n(v.z)}) = ${n(v.hidden)}`,{z:v.z},'ReLU 不改变单元数量；值不是概率。')];
    if(l===3)return [C('output','输出预测',v.prediction,`${n(p.v)} × ${n(v.hidden)} = ${n(v.prediction)}`,{v:p.v,hidden:v.hidden})];
    if(l===4)return [C('error','上游误差',v.error,`${n(v.prediction)} − 1 = ${n(v.error)}`,{prediction:v.prediction,target:1}),C('loss','半平方损失',v.loss,`0.5 × (${n(v.error)})² = ${n(v.loss)}`,{error:v.error})];
    if(l===5)return [C('dv','输出权重梯度',v.dV,`${n(v.error)} × ${n(v.hidden)} = ${n(v.dV)}`,{error:v.error,hidden:v.hidden}),C('dh','隐藏状态上游梯度',v.dHidden,`${n(v.error)} × ${n(p.v)} = ${n(v.dHidden)}`,{error:v.error,v:p.v})];
    if(l===6)return [C('relu-gate','ReLU 局部导数',v.gate,`${n(v.z)} > 0 ? 1 : 0 = ${v.gate}`,{z:v.z,atKink:v.atKink},'z=0不可导，本例与PyTorch采用梯度0；不能用此处中心差分证明唯一导数。')];
    return [C('dz','预激活梯度',v.dZ,`${n(v.dHidden)} × ${v.gate} = ${n(v.dZ)}`,{upstream:v.dHidden,gate:v.gate}),C('dw','隐藏权重梯度',v.dW,`${n(v.dZ)} × ${n(p.x)} = ${n(v.dW)}`,{dZ:v.dZ,x:p.x}),C('db','隐藏偏置梯度',v.dB,`${n(v.dZ)} × 1 = ${n(v.dB)}`,{dZ:v.dZ})];
  },[E('close-gate','只把隐藏权重由正改负','损失仍大于0时，关门支路还能得到梯度吗？',{w:1},{w:-1},'z由1变−1，门由1变0；dW与dB从2变0，关闭后损失为0.5。',(a,b)=>a.result.gate===1&&b.result.gate===0&&near(a.result.dW,2)&&near(b.result.dW,0)&&near(b.result.dB,0)&&near(b.result.loss,.5))]);

  function mseCells(prefix,xs,ys,predictions,total){const parts=predictions.map((x,j)=>(x-ys[j])**2);return vector(prefix+'-sample','逐样本平方误差',parts,(x,j)=>`x=${xs[j]}：(${n(predictions[j])} − ${n(ys[j])})² = ${n(x)}`,(x,j)=>({x:xs[j],prediction:predictions[j],target:ys[j]})).concat(C(prefix+'-mse','均方误差',total,`(${add(parts)}) / ${parts.length} = ${n(total)}`,{inputs:xs,targets:ys,predictions},'MSE无1/2因子；单位为标签量的平方。'));}
  models['d2l-generalization']=model('拟合只读取训练标签；逐点平方误差分别属于训练集和验证集，泄漏模式不能当作独立泛化证据。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('training-label','训练标签',v.trainY,(x,j)=>`2 × ${v.trainX[j]} ${j===1?'−':'+'} ${n(p.noise)} = ${n(x)}`,(x,j)=>({x:v.trainX[j],noise:p.noise,noiseSign:j===1?-1:1}));
    if(l===2)return vector('validation-index','验证输入',v.validationX,(x)=>`x=${x}；${JSON.stringify(v.trainX)} ${v.trainX.includes(x)?'包含':'不包含'}此点`).concat(C('overlap','重叠点数',v.overlap.length,`${JSON.stringify(v.validationX)} ∩ ${JSON.stringify(v.trainX)} = ${JSON.stringify(v.overlap)}`,{trainX:v.trainX,validationX:v.validationX},'重复训练点属于明确展示的数据泄漏。'));
    if(l===3)return [C('mean-x','训练输入均值',v.meanX,`(${add(v.trainX)}) / 3 = ${n(v.meanX)}`,{trainX:v.trainX}),C('mean-y','训练标签均值',v.meanY,`(${add(v.trainY)}) / 3 = ${n(v.meanY)}`,{trainY:v.trainY})];
    if(l===4){const a=v.trainX.map((x,j)=>(x-v.meanX)*(v.trainY[j]-v.meanY)),b=v.trainX.map(x=>(x-v.meanX)**2);return vector('covariance-part','斜率分子项',a,(x,j)=>`(${n(v.trainX[j])} − ${n(v.meanX)}) × (${n(v.trainY[j])} − ${n(v.meanY)}) = ${n(x)}`,(x,j)=>({x:v.trainX[j],meanX:v.meanX,y:v.trainY[j],meanY:v.meanY})).concat(C('slope','训练直线斜率',v.w,`(${add(a)}) / (${add(b)}) = ${n(v.w)}`,{numerator:a,denominator:b}),C('intercept','训练直线截距',v.b,`${n(v.meanY)} − ${n(v.w)} × ${n(v.meanX)} = ${n(v.b)}`,{meanY:v.meanY,w:v.w,meanX:v.meanX},p.capacity==='memorize'?'本步也计算直线作参照；当前查表分支使用训练表，未知输入返回0。':'只用训练数据计算最小二乘参数。'));}
    if(l===6)return mseCells('train',v.trainX,v.trainY,v.trainPrediction,v.trainMSE);
    if(l===7)return vector('validation-label','验证标签',v.validationY,(x,j)=>p.split==='clean'?`2 × ${v.validationX[j]} = ${n(x)}`:`复用 trainY[${j}] = ${n(x)}，非独立标签`,(x,j)=>({validationX:v.validationX[j],split:p.split,trainY:p.split==='leaked'?v.trainY[j]:'未使用'}));
    return mseCells('validation',v.validationX,v.validationY,v.validationPrediction,v.validationMSE).concat(C('independent','是否独立划分',v.independent,`split = ${p.split} → independent = ${v.independent}`,{split:p.split},'最终核对：小样本固定算例的误差，不证明真实准确率。'));
  },[E('memorize','只将直线改为训练点查表','训练误差为0能否保证独立验证误差更低？',{capacity:'line',split:'clean',noise:1},{capacity:'memorize',split:'clean',noise:1},'查表训练MSE为0，但独立验证未知点返回0，MSE为140/3，显著大于直线。',(a,b)=>near(b.result.trainMSE,0)&&near(b.result.validationMSE,140/3)&&a.result.validationMSE<b.result.validationMSE&&a.result.independent&&b.result.independent)]);

  models['d2l-attention']=model('Query 与每个 Key 点积并除以√2；遮罩在归一化前生效，权重逐项乘 Value 后求和。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('query','查询坐标',v.q,(x,j)=>`q[${j}] = ${n(x)}；本例直接给定，未执行投影训练`).concat(matrix('key','Key',v.K,(x,i,j)=>`K[${i},${j}] = ${n(x)}，匹配时乘 q[${j}] = ${n(v.q[j])}`),vector('value','Value',v.V,(x,j)=>`V[${j}] = ${n(x)}；仅进入后续加权汇总`));
    if(l===2)return vector('dot','QK 点积',v.dots,(x,j)=>`${mul(v.q,v.K[j])} = ${n(x)}`,(x,j)=>({q:v.q,key:v.K[j]}));
    if(l===3)return vector('scaled','缩放分数',v.scaled,(x,j)=>`${n(v.dots[j])} / √${v.dimension} = ${n(x)}`,(x,j)=>({dot:v.dots[j],dimension:v.dimension}));
    if(l===4)return v.scaled.map((x,j)=>C('mask-'+j,'位置 '+j+' 进入 softmax 的分数',p.visible==='first'&&j===1?'−∞':x,p.visible==='first'&&j===1?'位置1不可见 → 分数设为 −∞；exp(−∞) = 0':`位置${j}可见 → 保留 ${n(x)}`,{position:j,visible:p.visible,scaled:x},'−∞是遮罩语义；trace仅将可见分数送入softmax，未计算无穷浮点。'));
    if(l===5){const m=Math.max(...v.visibleScores),exps=v.scaled.map((x,j)=>p.visible==='first'&&j===1?0:Math.exp(x-m)),z=sum(exps);return vector('weight','注意力权重',v.weights,(x,j)=>p.visible==='first'&&j===1?`被遮位置：0 / ${n(z)} = 0`:`exp(${n(v.scaled[j])} − ${n(m)}) / (${add(exps)}) = ${n(x)}`).map((c,j)=>({...c,inputs:{score:v.scaled[j],visible:p.visible,maximum:m,normalizer:z},note:'单位为比例；权重表示混合份额，不是内容真实性。'})).concat(C('weight-total','权重和',v.sum,`${add(v.weights)} = ${n(v.sum)}`,{weights:v.weights}));}
    if(l===6)return vector('contribution','Value 加权贡献',v.contributions,(x,j)=>`${n(v.weights[j])} × ${n(v.V[j])} = ${n(x)}`,(x,j)=>({weight:v.weights[j],value:v.V[j]}));
    return [C('output','单查询单头输出',v.output,`${add(v.contributions)} = ${n(v.output)}`,{weights:v.weights,values:v.V,contributions:v.contributions},'最终核对：单头标量Value汇总，未执行完整Transformer或训练。')];
  },[E('value-only','只增加第二个 Value','取回内容改变时，匹配权重是否保持？',{value:2},{value:6},'相同 QK 的权重保持[0.5,0.5]，输出2→4。',(a,b)=>same(a.result.weights,[.5,.5])&&same(a.result.weights,b.result.weights)&&near(a.result.output,2)&&near(b.result.output,4)),E('mask','只遮住第二个位置','被遮住的 Value 再大还能贡献输出吗？',{visible:'both',value:6},{visible:'first',value:6},'第二权重严格为0；第一权重为1，输出回到2。',(a,b)=>near(a.result.output,4)&&same(b.result.weights,[1,0])&&near(b.result.contributions[1],0)&&near(b.result.output,2))]);

  models['d2l-convolution']=model('深度学习互相关不翻转核；每个真实窗口的四个乘积写入一个输出格，尚未经过窗口的格子保持空。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return matrix('image','输入像素',v.image,(x,i,j)=>`原始单通道 image[${i},${j}] = ${n(x)}`).concat(matrix('kernel','共享核',v.kernel,(x,i,j)=>`kernel[${i},${j}] = ${n(x)}；不翻转核`));
    if(l===3)return matrix('padded','填充后像素',v.padded,(x,i,j)=>i>=p.padding&&i<3+p.padding&&j>=p.padding&&j<3+p.padding?`image[${i-p.padding},${j-p.padding}] = ${n(x)}`:`在3×3原图外 → 零填充 = ${n(x)}`,(x,i,j)=>({row:i,column:j,padding:p.padding,sourceRow:i-p.padding,sourceColumn:j-p.padding,sourceValue:x}));
    if(l===4)return [C('spatial-size','输出空间边长',v.size,`floor((3 + 2 × ${p.padding} − 2) / ${p.stride}) + 1 = ${v.size}`,{inputSize:3,padding:p.padding,kernelSize:2,stride:p.stride},'单位为格；只接受完整2×2窗口。')];
    if(l===5)return matrix('output-pending','输出',v.output,(_,i,j)=>`output[${i},${j}] 尚无已执行窗口 → null；不是0`);
    if(l===8)return matrix('window-product','当前窗口乘积',v.products,(x,i,j)=>`${n(v.patch[i][j])} × ${n(v.kernel[i][j])} = ${n(x)}`,(x,i,j)=>({pixel:v.patch[i][j],kernel:v.kernel[i][j]})).concat(C('window-sum',`输出[${v.position.join(',')}]`,v.output[v.position[0]][v.position[1]],`${add(v.products.flat())} = ${n(v.output[v.position[0]][v.position[1]])}`,{window:v.window,patch:v.patch,kernel:v.kernel},'当前帧只完成这一窗口；其他未计算输出仍为null。'));
    return matrix('final-output','输出',v.output,(x,i,j)=>{const patch=Array.from({length:2},(_,a)=>Array.from({length:2},(_,b)=>v.padded[i*p.stride+a][j*p.stride+b]));return `${mul(patch.flat(),v.kernel.flat())} = ${n(x)}；最终核对`;},(x,i,j)=>({patch:Array.from({length:2},(_,a)=>Array.from({length:2},(_,b)=>v.padded[i*p.stride+a][j*p.stride+b])),kernel:v.kernel,stride:p.stride})).concat(C('shape','NCHW 形状',v.shape.join(' × '),`[1, 1, ${v.size}, ${v.size}] → ${v.shape.join(' × ')}`,{shape:v.shape},'最终核对：形状变化不表示训练或性能提升。'));
  },[E('stride','只把步幅由1改2','取样窗口减少后，保留的位置是否仍为相同乘加？',{stride:1},{stride:2},'输出2×2变1×1；唯一保留的左上窗口仍为−2。',(a,b)=>same(a.result.shape,[1,1,2,2])&&same(b.result.shape,[1,1,1,1])&&near(a.result.output[0][0],-2)&&near(b.result.output[0][0],-2))]);

  models['d2l-cnn-pooling']=model('每格共享卷积核与偏置，ReLU逐格截断；汇聚成标量后生成两个logit和标签0的交叉熵。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return matrix('image','输入像素',v.image,(x,i,j)=>`输入 image[${i},${j}] = ${n(x)}`).concat(matrix('kernel','共享核',v.kernel,(x,i,j)=>`kernel[${i},${j}] = ${n(x)}；卷积后空间2×2`));
    if(l===2)return matrix('conv','卷积输出',v.conv,(x,i,j)=>`${v.image[i][j]} × 1 + ${v.image[i][j+1]} × 0 + ${v.image[i+1][j]} × 0 + ${v.image[i+1][j+1]} × (−1) + ${n(p.bias)} = ${n(x)}`,(x,i,j)=>({patch:[[v.image[i][j],v.image[i][j+1]],[v.image[i+1][j],v.image[i+1][j+1]]],kernel:v.kernel,bias:p.bias}));
    if(l===3)return matrix('relu','ReLU 输出',v.activation,(x,i,j)=>`max(0, ${n(v.conv[i][j])}) = ${n(x)}`,(x,i,j)=>({preactivation:v.conv[i][j],lowerBound:0}));
    if(l===4){const xs=v.activation.flat();return [C('pool','汇聚结果',v.pooled,p.pool==='max'?`max(${xs.map(n).join(', ')}) = ${n(v.pooled)}；首个最大值索引 ${v.maxIndex}`:`(${add(xs)}) / 4 = ${n(v.pooled)}`,{activation:v.activation,pool:p.pool,maxIndex:v.maxIndex},'max相等时梯度路由约定首个最大值；此模型仅前向。')];}
    if(l===6){const m=Math.max(...v.logits),e=v.logits.map(z=>Math.exp(z-m));return vector('logit','分类头分数',v.logits,(x,j)=>`${n(v.pooled)} × ${j===0?1:-1} = ${n(x)}`,(x,j)=>({pooled:v.pooled,weight:j===0?1:-1})).concat(vector('probability','类别概率',v.probabilities,(x,j)=>`exp(${n(v.logits[j])} − ${n(m)}) / (${add(e)}) = ${n(x)}`,(x,j)=>({logit:v.logits[j],maximum:m,exponentials:e})));}
    return [C('loss','标签0交叉熵',v.loss,`−log(${n(v.probabilities[0])}) = ${n(v.loss)}`,{label:0,probability:v.probabilities[0]},'自然对数，nat/样本；一次前向不证明分类训练成功。')];
  },[E('pool-rule','只从最大汇聚改为平均汇聚','激活矩阵相同，汇聚与概率如何改变？',{pool:'max'},{pool:'average'},'相同激活[[0,0],[0,1]]；汇聚1→0.25，标签0概率下降、损失上升。',(a,b)=>same(a.result.activation,b.result.activation)&&near(a.result.pooled,1)&&near(b.result.pooled,.25)&&a.result.probabilities[0]>b.result.probabilities[0]&&a.result.loss<b.result.loss)]);

  models['d2l-rnn']=model('共享循环权重逐时刻乘上旧状态，再加输入并取tanh；末状态对初状态的梯度是各步局部导数连乘。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('input','顺序输入',v.inputs,(x,j)=>`时刻 ${j+1} 输入 = ${n(x)}；共享循环权重 = ${n(p.recurrent)}`);
    if(l===2)return [C('initial','初始隐藏状态',v.hidden,'h₀ = 0；还没有执行时间步',{hidden:v.hidden})];
    if(l===7){const row=v.history.at(-1);return [C('preactivation','本步预激活',v.preactivation,`${n(v.x)} + ${n(p.recurrent)} × ${n(v.previous)} = ${n(v.preactivation)}`,{x:v.x,recurrent:p.recurrent,previous:v.previous}),C('hidden','本步隐藏状态',v.hidden,`tanh(${n(v.preactivation)}) = ${n(v.hidden)}`,{preactivation:v.preactivation}),C('local-derivative','本步对旧状态的导数',row.localDerivative,`(1 − (${n(v.hidden)})²) × ${n(p.recurrent)} = ${n(row.localDerivative)}`,{hidden:v.hidden,recurrent:p.recurrent},'这是∂h_t/∂h_(t−1)，不是共享参数完整梯度。')];}
    return v.history.map((r,j)=>C('derivative-'+j,`时刻 ${j+1} 局部导数`,r.localDerivative,`(1 − (${n(r.hidden)})²) × ${n(p.recurrent)} = ${n(r.localDerivative)}`,{hidden:r.hidden,recurrent:p.recurrent})).concat(C('time-chain','末状态对初状态的导数',v.memoryDerivative,`${v.history.map(r=>'('+n(r.localDerivative)+')').join(' × ')} = ${n(v.memoryDerivative)}`,{localDerivatives:v.history.map(r=>r.localDerivative)},'最终核对：时间链连乘；共享权重梯度还需对各时间路径求和。'));
  },[E('cut-memory','只把循环权重设为0','前向仍有非零输出时，初状态对末状态还有影响吗？',{recurrent:.5},{recurrent:0},'循环权重0时末状态=tanh(0.5)，所有局部时间导数和连乘为0。',(a,b)=>Math.abs(a.result.memoryDerivative)>0&&near(b.result.hidden,Math.tanh(.5))&&near(b.result.memoryDerivative,0)&&b.result.history.every(r=>r.localDerivative===0))]);

  models['d2l-gru']=model('采用D2L门约定，z保留旧状态、r控制候选支路的历史份额；最终状态由保留项与接纳项相加。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return [C('old-state','已给定旧状态',v.previous,`previous = initial = ${n(p.initial)}；input = ${n(v.input)}`,{initial:p.initial,input:v.input},'z与r由控件直接指定，不虚构门参数训练。'),C('gate-partition','保留与接纳份额之和',p.update+(1-p.update),`${n(p.update)} + (1 − ${n(p.update)}) = 1`,{update:p.update},'D2L约定z越大保留越多。')];
    if(l===2)return [C('reset','候选的旧状态输入',v.resetState,`${n(p.reset)} × ${n(v.previous)} = ${n(v.resetState)}`,{reset:p.reset,previous:v.previous})];
    if(l===3)return [C('candidate','候选状态',v.candidate,`tanh(${n(v.input)} + ${n(v.resetState)}) = ${n(v.candidate)}`,{input:v.input,resetState:v.resetState})];
    if(l===4)return [C('retained','直接保留项',v.retained,`${n(p.update)} × ${n(v.previous)} = ${n(v.retained)}`,{update:p.update,previous:v.previous})];
    if(l===5)return [C('admitted','候选接纳项',v.admitted,`(1 − ${n(p.update)}) × ${n(v.candidate)} = ${n(v.admitted)}`,{update:p.update,candidate:v.candidate})];
    return [C('hidden','合成新状态',v.hidden,`${n(v.retained)} + ${n(v.admitted)} = ${n(v.hidden)}`,{retained:v.retained,admitted:v.admitted})];
  },[E('update-extremes','只把保留门由0改1','两个极端是否分别严格等于候选与旧状态？',{update:0},{update:1},'候选保持tanh(1)，z=0输出候选；z=1输出旧状态1，接纳项0。',(a,b)=>near(a.result.candidate,b.result.candidate)&&near(a.result.hidden,a.result.candidate)&&near(b.result.hidden,b.result.previous)&&near(b.result.admitted,0))]);

  models['d2l-momentum']=model('速度保留旧梯度方向并加入当前梯度；参数减去学习率乘速度，实际轨迹可能越过最优点。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return [C('initial-theta','初始参数',v.theta,`θ₀ = ${n(v.theta)}；L = θ² / 2 = ${n(.5*v.theta*v.theta)}`,{theta:v.theta},'目标是固定的一维二次函数，非数据训练。')];
    if(l===2)return [C('initial-velocity','初始速度',v.velocity,'v₀ = 0；动量状态需随参数一起保存',{velocity:v.velocity})];
    const h=v.history,row=h.at(-1),oldVelocity=h.length>1?h.at(-2).velocity:0,carried=p.momentum*oldVelocity;
    return [C('gradient','旧参数处梯度',v.gradient,`d(θ²/2)/dθ = θ旧 = ${n(v.previous)}`,{previous:v.previous}),C('momentum-carry','保留的速度',carried,`${n(p.momentum)} × ${n(oldVelocity)} = ${n(carried)}`,{momentum:p.momentum,oldVelocity}),C('velocity','当前速度',v.velocity,`${n(carried)} + ${n(v.gradient)} = ${n(v.velocity)}`,{carried,gradient:v.gradient}),C('theta-update','参数更新',v.theta,`${n(v.previous)} − ${n(p.rate)} × ${n(v.velocity)} = ${n(v.theta)}`,{previous:v.previous,rate:p.rate,velocity:v.velocity}),C('updated-loss','更新后目标',row.loss,`0.5 × (${n(v.theta)})² = ${n(row.loss)}`,{theta:v.theta},'真实本地迭代；动量不保证每步目标下降。')];
  },[E('momentum-state','只把动量从0改为0.8','初始速度相同，第一次与第二次更新分别如何变化？',{momentum:0},{momentum:.8},'首步θ都为1.8；第二步无动量θ=1.62，有动量θ=1.46。',(a,b)=>near(a.result.history[0].theta,1.8)&&near(b.result.history[0].theta,1.8)&&near(a.result.history[1].theta,1.62)&&near(b.result.history[1].theta,1.46))]);

  models['d2l-adam']=model('一阶矩积累梯度，二阶矩积累平方梯度；逐步偏差校正后，以√v̂加ε缩放参数更新。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return [C('initial-theta','初始参数',v.theta,'θ₀ = 2；m₀ = 0；v₀ = 0',{theta:v.theta,m:v.m,v:v.v},'同一维二次目标；m和v是优化器状态。')];
    if(l===2)return [C('beta1','一阶矩新梯度份额',1-p.beta1,`1 − ${n(p.beta1)} = ${n(1-p.beta1)}`,{beta1:p.beta1}),C('beta2','二阶矩新平方梯度份额',1-p.beta2,`1 − ${n(p.beta2)} = ${n(1-p.beta2)}`,{beta2:p.beta2},'v是平方梯度的滑动平均，不是方差。')];
    const row=v.history.at(-1),old=v.history.length>1?v.history.at(-2):{theta:2,m:0,v:0},d1=1-p.beta1**v.step,d2=1-p.beta2**v.step,den=Math.sqrt(v.vHat)+1e-8;
    return [C('gradient','旧参数处梯度',v.gradient,`d(θ²/2)/dθ = θ旧 = ${n(old.theta)}`,{theta:old.theta}),C('first-moment','一阶矩',v.m,`${n(p.beta1)} × ${n(old.m)} + (1 − ${n(p.beta1)}) × ${n(v.gradient)} = ${n(v.m)}`,{beta1:p.beta1,oldM:old.m,gradient:v.gradient}),C('second-moment','二阶矩',v.v,`${n(p.beta2)} × ${n(old.v)} + (1 − ${n(p.beta2)}) × (${n(v.gradient)})² = ${n(v.v)}`,{beta2:p.beta2,oldV:old.v,gradient:v.gradient}),C('corrected-m','偏差校正一阶矩',v.mHat,`${n(v.m)} / (1 − ${n(p.beta1)}^${v.step}) = ${n(v.mHat)}`,{m:v.m,step:v.step,beta1:p.beta1,divisor:d1}),C('corrected-v','偏差校正二阶矩',v.vHat,`${n(v.v)} / (1 − ${n(p.beta2)}^${v.step}) = ${n(v.vHat)}`,{v:v.v,step:v.step,beta2:p.beta2,divisor:d2}),C('theta-update','Adam 参数更新',v.theta,`${n(old.theta)} − ${n(p.rate)} × ${n(v.mHat)} / (√${n(v.vHat)} + 1e−8) = ${n(v.theta)}`,{oldTheta:old.theta,rate:p.rate,mHat:v.mHat,vHat:v.vHat,epsilon:1e-8,denominator:den},'ε在根号外；未实现AdamW衰减。'),C('updated-loss','更新后目标',row.loss,`0.5 × (${n(v.theta)})² = ${n(row.loss)}`,{theta:v.theta})];
  },[E('rate-only','只把Adam学习率加倍','第一步校正矩是否保持、更新距离是否加倍？',{rate:.1},{rate:.2},'第一步m̂=2、v̂=4保持；参数从2移动的距离加倍。',(a,b)=>near(a.result.history[0].mHat,2)&&near(b.result.history[0].mHat,2)&&near(a.result.history[0].vHat,4)&&near(b.result.history[0].vHat,4)&&near(2-b.result.history[0].theta,2*(2-a.result.history[0].theta)))]);

  models['d2l-data-parallel']=model('每样本半平方误差梯度先在rank内求和；全局分母必须是总样本数，大小不均时局部均值等权会改变目标。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('sample-gradient','全局样本已给定的梯度输入',v.X,(x,j)=>`x[${j}]=${x}，y=2 × ${x}=${2*x}；参数 w=${v.w}`);
    if(l===2)return v.local.map((xs,j)=>C('rank-count-'+j,'rank '+j+' 样本数',v.counts[j],`rank${j} 取 ${JSON.stringify(xs)} → ${xs.length} 个样本`,{rank:j,local:xs},'单位为样本；每rank参数副本相同。'));
    if(l===3)return v.local.flatMap((xs,rank)=>xs.map((x,j)=>C(`local-gradient-${rank}-${j}`,`rank${rank} 样本${j}梯度`,-2*x*x,`(0 × ${x} − ${2*x}) × ${x} = ${-2*x*x}`,{rank,x,target:2*x,w:0}))).concat(v.sums.map((x,j)=>C('rank-sum-'+j,'rank '+j+' 梯度和',x,`${add(v.local[j].map(x=>-2*x*x))} = ${n(x)}`,{local:v.local[j]})));
    if(l===5)return vector('local-mean','局部平均梯度',v.localMeans,(x,j)=>`${n(v.sums[j])} / ${v.counts[j]} = ${n(x)}`,(x,j)=>({gradientSum:v.sums[j],count:v.counts[j]}));
    if(l===6)return [C('global-gradient','归约梯度',v.globalGradient,p.reduction==='weighted'?`(${add(v.sums)}) / (${add(v.counts)}) = ${n(v.globalGradient)}`:`(${add(v.localMeans)}) / 2 = ${n(v.globalGradient)}`,{sums:v.sums,counts:v.counts,localMeans:v.localMeans,reduction:p.reduction},p.reduction==='weighted'?'按全局样本数平均。':'明确的错误反例：局部样本数不同时等权rank均值不等价。')];
    return [C('single-reference','单设备全批次梯度',v.reference,`(${add(v.X.map(x=>-2*x*x))}) / 4 = ${n(v.reference)}`,{X:v.X,w:0}),C('update','所有副本的下一权重',v.nextW,`0 − 0.1 × (${n(v.globalGradient)}) = ${n(v.nextW)}`,{rate:.1,globalGradient:v.globalGradient}),C('gradient-error','归约与单批次之差',v.error,`${n(v.globalGradient)} − (${n(v.reference)}) = ${n(v.error)}`,{global:v.globalGradient,reference:v.reference},'最终核对：梯度等价算术，不是并行提速测量。')];
  },[E('unequal-mean','不均分片下只改归约规则','1与3个样本的两个rank直接平均均值会得到什么？',{split:1,reduction:'weighted'},{split:1,reduction:'rank_mean'},'正确全局梯度−15；错误均值−32/3，更新1.5变16/15。',(a,b)=>near(a.result.globalGradient,-15)&&near(b.result.globalGradient,-32/3)&&near(a.result.nextW,1.5)&&near(b.result.nextW,16/15)&&near(a.result.error,0)&&!near(b.result.error,0))]);

  models['d2l-ddp']=model('每rank给定的微批梯度先按累积次数缩放并相加，最后在等大小rank间平均；缺失缩放会放大更新。',(t,l,v)=>{
    const p=t.params;
    if(l===1)return vector('initial-gradient','rank 累积初值',v.localSums,(x,j)=>`rank${j} 梯度缓冲初始化为 ${n(x)}；world_size=${p.world}`);
    if(l===2)return [C('target-scale','每微批的目标缩放',p.scaling==='correct'?1/p.microbatches:1,p.scaling==='correct'?`1 / ${p.microbatches} = ${n(1/p.microbatches)}`:`错误分支：不除以 ${p.microbatches}，使用 1`,{microbatches:p.microbatches,scaling:p.scaling},'每rank微批大小相等；前m−1次可no_sync，最后同步。')];
    if(l===5)return v.localSums.flatMap((x,j)=>{const increment=p.scaling==='correct'?(j+1)/p.microbatches:j+1,previous=x-increment;return [C('increment-'+j,'rank '+j+' 本微批贡献',increment,p.scaling==='correct'?`${j+1} / ${p.microbatches} = ${n(increment)}`:`${j+1} × 1 = ${n(increment)}（缺少缩放）`,{rawGradient:j+1,microbatches:p.microbatches,scaling:p.scaling}),C('accumulated-'+j,'rank '+j+' 已累积梯度',x,`${n(previous)} + ${n(increment)} = ${n(x)}；已执行 ${v.micro} 个微批`,{previous,increment,micro:v.micro},v.synced?'当前最后微批将进行归约；此格还属于局部缓冲。':'当前尚未同步；不把局部缓冲当成全局梯度。')];});
    if(l===8)return [C('reduced','全局平均梯度',v.reduced,`(${add(v.localSums)}) / ${p.world} = ${n(v.reduced)}`,{localSums:v.localSums,world:p.world}),C('reference','目标全局均值',v.reference,`(${Array.from({length:p.world},(_,j)=>j+1).join(' + ')}) / ${p.world} = (${p.world} + 1) / 2 = ${n(v.reference)}`,{world:p.world},'给定各rank梯度后的目标均值；未启动Gloo/NCCL进程。')];
    return [C('next-weight','所有副本共享更新',v.nextWeight,`0 − 0.1 × ${n(v.reduced)} = ${n(v.nextWeight)}`,{oldWeight:0,rate:.1,reduced:v.reduced}),C('scaling-error','累积缩放误差',v.error,`${n(v.reduced)} − ${n(v.reference)} = ${n(v.error)}`,{reduced:v.reduced,reference:v.reference},'最终核对：本地平均语义；真实CPU进程与GPU性能需配套脚本分别取证。')];
  },[E('missing-scaling','只取消微批loss缩放','累积3个微批会把更新放大几倍？',{microbatches:3,scaling:'correct'},{microbatches:3,scaling:'missing'},'正确梯度1.5、更新−0.15；错误梯度4.5、更新−0.45，正好放大3倍。',(a,b)=>near(a.result.reduced,1.5)&&near(b.result.reduced,4.5)&&near(a.result.nextWeight,-.15)&&near(b.result.nextWeight,-.45)&&near(b.result.nextWeight,3*a.result.nextWeight))]);

  return {courseId:'d2l',models};
});
