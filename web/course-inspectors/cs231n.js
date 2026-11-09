/* CS231n: course-owned cells from the current real computation frame only. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const f=x=>typeof x==='number'?x.toFixed(4):String(x);
  const sum=a=>a.reduce((s,x)=>s+x,0);
  const close=(a,b)=>typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-10;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const end=t=>t.steps[t.steps.length-1].variables;
  const C=(id,label,value,formula,inputs,note='原创有限算例；显示四位小数，计算与验证保留完整精度。')=>({id,label,value,formula,inputs,note});
  const V=(step,cells,summary)=>({title:step.title,summary,cells});
  const models={};

  models['cs231n-linear']={
    intuition:'两个像素分别乘以每一类别的权重，再加该类偏置；分数是未归一化的实数，平分时采用类别0。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,c=[];
      if(index===0){
        v.image.forEach((x,j)=>c.push(C('pixel-'+j,'输入像素 x'+j,x,`x${j}=${f(x)}${j===1?'（固定第二特征）':''}`,{feature:j},'输入形状2；这里的归一化像素只是玩具特征，不是可用图像识别器。')));
        v.weights.forEach((row,i)=>row.forEach((w,j)=>c.push(C(`weight-${i}-${j}`,`权重 W[${i},${j}]`,w,`类别${i}、特征${j}：W[${i},${j}]=${f(w)}`,{classId:i,feature:j},'W形状2类×2特征；本例不训练权重。'))));
        v.bias.forEach((b,i)=>c.push(C('bias-'+i,'类别 '+i+' 偏置',b,`b${i}=${f(b)}`,{classId:i})));
      }else if(index===1){
        v.weights.forEach((row,i)=>{
          row.forEach((w,j)=>c.push(C(`product-${i}-${j}`,`类别${i}的特征${j}贡献`,w*v.image[j],`${f(w)}×${f(v.image[j])}=${f(w*v.image[j])}`,{weight:w,pixel:v.image[j]})));
          c.push(C('score-'+i,'类别 '+i+' 未归一化分数',v.scores[i],`s${i}=${row.map((w,j)=>`(${f(w)}×${f(v.image[j])})`).join(' + ')} + ${f(v.bias[i])} = ${f(v.scores[i])}`,{bias:v.bias[i]},'分数可为负且不要求总和为1，不是概率。'));
        });
      }else if(index===2){
        c.push(C('score-margin','类别0相对类别1的分数差',v.scores[0]-v.scores[1],`${f(v.scores[0])}−(${f(v.scores[1])})=${f(v.scores[0]-v.scores[1])}`,{score0:v.scores[0],score1:v.scores[1]}));
        c.push(C('class-id','按分数选出的类别',v.classId,`${f(v.scores[0])} ≥ ${f(v.scores[1])} → ${v.scores[0]>=v.scores[1]}；预测类别 ${v.classId}`,{score0:v.scores[0],score1:v.scores[1]},'类别索引从0开始；等分时明确选0，没有监督真值，不能判断分对。'));
      }else{
        v.changedImage.forEach((x,j)=>c.push(C('changed-pixel-'+j,'扰动后像素 x′'+j,x,j===0?`x′0=1−${f(v.image[0])}=${f(x)}`:`x′1=x1=${f(x)}`,{oldPixel:v.image[j]},'只翻转第一个输入特征；保留既有权重和偏置。')));
        v.weights.forEach((row,i)=>{
          row.forEach((w,j)=>c.push(C(`changed-product-${i}-${j}`,`扰动后类别${i}特征${j}贡献`,w*v.changedImage[j],`${f(w)}×${f(v.changedImage[j])}=${f(w*v.changedImage[j])}`,{weight:w,pixel:v.changedImage[j]})));
          c.push(C('changed-score-'+i,'扰动后类别 '+i+' 分数',v.changedScores[i],`s′${i}=${row.map((w,j)=>`(${f(w)}×${f(v.changedImage[j])})`).join(' + ')} + ${f(v.bias[i])} = ${f(v.changedScores[i])}`,{bias:v.bias[i]}));
        });
      }
      return V(step,c,'当前真实快照逐项核对二维线性分类；输入扰动是独立对照，不是训练更新，也没有图像分类准确率证据。');
    },
    experiments:[{id:'pixel-flip',label:'只把第一像素从0改为1',before:{pixel:0,bias:0},after:{pixel:1,bias:0},prediction:'类别分数由[-1,1]变成[0,0]；预测由类别1变为平分规则选择的0，扰动后的分数交换。',expectation:'W与b保持；原分数[-1,1]→[0,0]，classId 1→0，changedScores [0,0]→[-1,1]。',verify(a,b){const x=end(a),y=end(b);return a.params.pixel===0&&b.params.pixel===1&&a.params.bias===0&&b.params.bias===0&&same(x.weights,[[1,-1],[-1,1]])&&same(x.weights,y.weights)&&same(x.bias,[0,0])&&same(x.bias,y.bias)&&same(x.scores,[-1,1])&&same(y.scores,[0,0])&&x.classId===1&&y.classId===0&&same(x.changedScores,[0,0])&&same(y.changedScores,[-1,1]);}}]
  };

  models['cs231n-softmax']={
    intuition:'先按温度缩放三类logit，用减最大值的稳定指数归一化，再只取已知真类0的负对数，并逐类回传到原始logit。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.logits.forEach((x,i)=>c.push(C('logit-'+i,'原始 logit z'+i,x,`z${i}=${f(x)}${i===0?'（正确类别分数控件）':'（固定对照分数）'}`,{classId:i},'logit不是概率；本帧尚未计算softmax。')));
        c.push(C('label','给定监督标签',v.label,`y=${v.label}；正确类别索引固定为0`,{classes:v.logits.length},'标签是监督输入；不能把当前最大分数的类别擅自当成真类。'));
        c.push(C('temperature','概率变换温度 T',p.temperature,`T=${f(p.temperature)}>0`,{temperature:p.temperature},'控件范围0.5至2；这里只改变概率变换，不实施校准拟合或训练。'));
      }else if(index===1){
        const scaled=v.logits.map(x=>x/p.temperature),maximum=Math.max(...scaled),exps=scaled.map(x=>Math.exp(x-maximum)),normalizer=sum(exps);
        scaled.forEach((x,i)=>c.push(C('scaled-logit-'+i,'温度缩放分数 u'+i,x,`u${i}=z${i}/T=${f(v.logits[i])}/${f(p.temperature)}=${f(x)}`,{logit:v.logits[i],temperature:p.temperature})));
        c.push(C('maximum','稳定化共同平移量',maximum,`m=max(${scaled.map(f).join(', ')})=${f(maximum)}`,{classes:scaled.length},'共同减去最大值不改变softmax概率，且最大指数为1。'));
        exps.forEach((e,i)=>c.push(C('exponential-'+i,'平移后指数 e'+i,e,`e${i}=exp(${f(scaled[i])}−${f(maximum)})=${f(e)}`,{scaledLogit:scaled[i],maximum})));
        c.push(C('normalizer','指数归一化分母 Z',normalizer,`Z=${exps.map(f).join(' + ')}=${f(normalizer)}`,{classes:exps.length}));
        v.probabilities.forEach((prob,i)=>c.push(C('probability-'+i,'类别 '+i+' 概率',prob,`p${i}=e${i}/Z=${f(exps[i])}/${f(normalizer)}=${f(prob)}`,{exponential:exps[i],normalizer},'三类共同归一化；减最大值只为数值稳定。')));
        c.push(C('probability-sum','完整类别概率之和',sum(v.probabilities),`${v.probabilities.map(f).join(' + ')}=${f(sum(v.probabilities))}`,{classes:v.probabilities.length},'显示舍入可能使可见小数之和略偏离1；内部保留完整精度。'));
      }else if(index===2){
        const py=v.probabilities[v.label];
        c.push(C('true-probability','已知真类的概率',py,`y=${v.label} → p_y=p${v.label}=${f(py)}`,{label:v.label},'只读取监督标签对应的概率，不取概率最大值。'));
        c.push(C('cross-entropy','单样本交叉熵',v.loss,`L=−ln(p_y)=−ln(${f(py)})=${f(v.loss)}`,{trueProbability:py},'自然对数，单位nat；没有批次平均或正则项。'));
      }else{
        v.gradient.forEach((g,i)=>{
          const target=Number(i===v.label),numerator=v.probabilities[i]-target;
          c.push(C('onehot-'+i,'类别 '+i+' 监督one-hot',target,`1[${i}=${v.label}]=${target}`,{classId:i,label:v.label}));
          c.push(C('gradient-numerator-'+i,'类别 '+i+' 缩放logit梯度',numerator,`∂L/∂u${i}=p${i}−y${i}=${f(v.probabilities[i])}−${f(target)}=${f(numerator)}`,{probability:v.probabilities[i],target}));
          c.push(C('gradient-'+i,'原始 logit z'+i+' 梯度',g,`∂L/∂z${i}=(p${i}−y${i})/T=(${f(v.probabilities[i])}−${f(target)})/${f(p.temperature)}=${f(g)}`,{probability:v.probabilities[i],target,temperature:p.temperature},'链式法则需保留1/T；这里对原始logit求导，不是对温度求导。'));
        });
        c.push(C('gradient-sum','三个logit梯度之和',sum(v.gradient),`${v.gradient.map(f).join(' + ')}=${f(sum(v.gradient))}`,{classes:v.gradient.length},'共同平移logit不改变损失，对应梯度和约为0。'));
      }
      return V(step,c,'本帧仅展示真实计算顺序中已得到的量；温度只用于本例变换，交叉熵和梯度均依赖固定监督标签0。');
    },
    experiments:[{id:'correct-score',label:'只把正确类别logit从0提高到2',before:{score:0,temperature:1},after:{score:2,temperature:1},prediction:'真类概率增大，负对数损失下降；三个梯度和仍为0。',expectation:'真类概率从1/(2+e)变为e²/(e²+e+1)，损失约1.5514→0.4076，真类梯度p0−1的绝对值缩小。',verify(a,b){const x=end(a),y=end(b),za=2+Math.E,zb=Math.exp(2)+Math.E+1,pa=[1/za,Math.E/za,1/za],pb=[Math.exp(2)/zb,Math.E/zb,1/zb];return a.params.score===0&&b.params.score===2&&a.params.temperature===1&&b.params.temperature===1&&x.label===0&&y.label===0&&x.probabilities.every((q,i)=>close(q,pa[i]))&&y.probabilities.every((q,i)=>close(q,pb[i]))&&close(x.loss,-Math.log(pa[0]))&&close(y.loss,-Math.log(pb[0]))&&y.loss<x.loss&&x.gradient.every((g,i)=>close(g,pa[i]-Number(i===0)))&&y.gradient.every((g,i)=>close(g,pb[i]-Number(i===0)))&&close(sum(x.gradient),0)&&close(sum(y.gradient),0);}}]
  };

  models['cs231n-backprop']={
    intuition:'标量计算图先算z=wx−0.5、ReLU与半平方损失，再把误差、激活门和输入相乘；最后仅在光滑点使用中心差分核对。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        c.push(C('weighted-input','输入乘权重',p.weight*p.x,`wx=${f(p.weight)}×${f(p.x)}=${f(p.weight*p.x)}`,{weight:p.weight,input:p.x}));
        c.push(C('preactivation','ReLU前激活 z',v.preactivation,`z=wx−0.5=${f(p.weight)}×${f(p.x)}−0.5000=${f(v.preactivation)}`,{weight:p.weight,input:p.x,bias:-.5},'标量单样本，偏置固定为−0.5，尚未计算激活与损失。'));
      }else if(index===1){
        const error=v.activation-1;
        c.push(C('activation','ReLU激活 a',v.activation,`a=max(0,z)=max(0.0000,${f(v.preactivation)})=${f(v.activation)}`,{preactivation:v.preactivation},'z≤0时输出0；输出0不能推出损失也为0。'));
        c.push(C('prediction-error','相对固定标签1的误差',error,`e=a−1=${f(v.activation)}−1.0000=${f(error)}`,{activation:v.activation,label:1}));
        c.push(C('loss','单样本半平方损失',v.loss,`L=(a−1)²/2=(${f(error)})²/2=${f(v.loss)}`,{error},'不包含批次平均、正则项或参数更新。'));
      }else if(index===2){
        const error=v.activation-1,gate=Number(v.preactivation>0);
        c.push(C('loss-activation-gradient','损失对激活的局部导数',error,`∂L/∂a=a−1=${f(v.activation)}−1.0000=${f(error)}`,{activation:v.activation,label:1}));
        c.push(C('relu-gradient','ReLU局部导数约定',gate,`∂a/∂z=1[z>0]=1[${f(v.preactivation)}>0]=${gate}`,{preactivation:v.preactivation},'ReLU在z=0不可导；本实现明确选择导数0，不能称为唯一数学导数。'));
        c.push(C('z-weight-gradient','线性节点对权重的导数',p.x,`∂z/∂w=x=${f(p.x)}`,{input:p.x}));
        c.push(C('weight-gradient','链式法则得到权重梯度',v.gradient,`∂L/∂w=(a−1)×1[z>0]×x=${f(error)}×${f(gate)}×${f(p.x)}=${f(v.gradient)}`,{error,reluDerivative:gate,input:p.x},'激活关闭时梯度为0，即使损失非零；这里没有执行优化器更新。'));
      }else{
        const h=1e-5,plusWeight=p.weight+h,minusWeight=p.weight-h,zPlus=plusWeight*p.x-.5,zMinus=minusWeight*p.x-.5,lossPlus=(Math.max(0,zPlus)-1)**2/2,lossMinus=(Math.max(0,zMinus)-1)**2/2;
        c.push(C('difference-step','中心差分权重步长 h',h,'h=1×10⁻⁵；在原权重两侧独立重算损失',{step:h},'h以科学记数法显示，避免四位小数将它写成零。'));
        c.push(C('loss-plus','w+h的独立前向损失',lossPlus,`L(w+h)=(max(0,(${f(p.weight)}+1e−5)×${f(p.x)}−0.5000)−1)²/2=${f(lossPlus)}`,{weight:plusWeight,preactivation:zPlus,input:p.x}));
        c.push(C('loss-minus','w−h的独立前向损失',lossMinus,`L(w−h)=(max(0,(${f(p.weight)}−1e−5)×${f(p.x)}−0.5000)−1)²/2=${f(lossMinus)}`,{weight:minusWeight,preactivation:zMinus,input:p.x}));
        c.push(C('numerical-gradient','中心差分斜率',v.numerical,`[L(w+h)−L(w−h)]/(2h)=(${f(lossPlus)}−${f(lossMinus)})/(2×1e−5)=${f(v.numerical)}`,{lossPlus,lossMinus,step:h},'使用未舍入损失相减；公式中的四位显示值可能相同，不表示实际差值为0。'));
        c.push(C('smooth-check','差分区间是否避开ReLU拐点',v.smooth,`|z|>|xh|：|${f(v.preactivation)}| > |${f(p.x)}×1e−5| → ${v.smooth}`,{preactivation:v.preactivation,input:p.x,step:h},v.smooth?'该区间保持同一光滑分支，可用中心差分核对解析梯度。':'区间触及或跨越z=0，不用中心差分证明所选零次梯度的正确性。'));
        c.push(C('gradient-gap','差分与解析值的绝对差',Math.abs(v.numerical-v.gradient),`|${f(v.numerical)}−${f(v.gradient)}|=${f(Math.abs(v.numerical-v.gradient))}`,{numerical:v.numerical,analytic:v.gradient},'只有smooth=true时此差值才作为光滑点导数检查；没有学习完成含义。'));
      }
      return V(step,c,'当前帧对应真实前向、反向或数值检查；ReLU零点约定和差分检查的适用边界分别说明。');
    },
    experiments:[{id:'open-relu',label:'只把权重从0改为1，输入固定2',before:{weight:0,x:2},after:{weight:1,x:2},prediction:'从关闭分支进入开启分支，z由−0.5变1.5；有损失但零梯度的状态变为梯度1。',expectation:'a:0→1.5，L:0.5→0.125，∂L/∂w:0→1；两端都避开拐点，中心差分与解析值相符。',verify(a,b){const x=end(a),y=end(b);return a.params.weight===0&&b.params.weight===1&&a.params.x===2&&b.params.x===2&&close(x.preactivation,-.5)&&close(y.preactivation,1.5)&&close(x.activation,0)&&close(y.activation,1.5)&&close(x.loss,.5)&&close(y.loss,.125)&&close(x.gradient,0)&&close(y.gradient,1)&&x.smooth===true&&y.smooth===true&&Math.abs(x.numerical)<1e-8&&Math.abs(y.numerical-1)<1e-8;}}]
  };

  models['cs231n-convolution']={
    intuition:'一个2×2核以步幅1在3×3单通道图像上做不翻核的互相关，逐窗口累加四个乘积，再逐格ReLU并对整个2×2结果做最大池化。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,c=[];
      if(index===0){
        v.image.forEach((row,i)=>row.forEach((x,j)=>c.push(C(`image-${i}-${j}`,`输入图像 I[${i},${j}]`,x,`I[${i},${j}]=${f(x)}${i===1&&j===1?'（中心像素控件）':'（固定像素）'}`,{row:i,column:j},'输入3×3、单通道；数值是给定教学像素。'))));
        v.kernel.forEach((row,i)=>row.forEach((w,j)=>c.push(C(`kernel-${i}-${j}`,`共享核 K[${i},${j}]`,w,`K[${i},${j}]=${f(w)}`,{row:i,column:j},'核2×2；stride=1、padding=0，不翻转核，没有偏置。'))));
      }else if(index===1){
        v.output.forEach((row,i)=>row.forEach((out,j)=>{
          const terms=[];
          v.kernel.forEach((kr,a)=>kr.forEach((w,b)=>{
            const pixel=v.image[i+a][j+b],product=pixel*w;terms.push(product);
            c.push(C(`window-${i}-${j}-product-${a}-${b}`,`窗口(${i},${j})核格(${a},${b})乘积`,product,`I[${i+a},${j+b}]×K[${a},${b}]=${f(pixel)}×${f(w)}=${f(product)}`,{inputRow:i+a,inputColumn:j+b,pixel,kernel:w}));
          }));
          c.push(C(`output-${i}-${j}`,`互相关输出 O[${i},${j}]`,out,`O[${i},${j}]=${terms.map(x=>`(${f(x)})`).join(' + ')}=${f(out)}`,{windowRow:i,windowColumn:j},'同一组4个核参数在四个空间位置复用；不是四组独立权重。'));
        }));
      }else if(index===2){
        v.activated.forEach((row,i)=>row.forEach((a,j)=>c.push(C(`activated-${i}-${j}`,`ReLU输出 A[${i},${j}]`,a,`A[${i},${j}]=max(0,O[${i},${j}])=max(0.0000,${f(v.output[i][j])})=${f(a)}`,{preactivation:v.output[i][j]},'逐元素操作；空间形状仍为2×2、通道数仍为1。'))));
      }else{
        v.activated.forEach((row,i)=>row.forEach((a,j)=>c.push(C(`pool-candidate-${i}-${j}`,`池化候选 A[${i},${j}]`,a,`A[${i},${j}]=max(0,${f(v.output[i][j])})=${f(a)}`,{preactivation:v.output[i][j]},'2×2池化窗口覆盖全部激活；相同最大值也只返回一个最大数值。'))));
        c.push(C('pooled','2×2最大池化结果',v.pooled,`pool=max(${v.activated.flat().map(f).join(', ')})=${f(v.pooled)}`,{windowHeight:2,windowWidth:2},'最大池化没有可学习权重；本例未计算池化反向梯度或argmax分配。'));
        c.push(C('output-width','互相关输出空间宽度',v.outputWidth,`(输入宽3−核宽2+2×padding0)/stride1+1=${v.outputWidth}`,{inputWidth:3,kernelWidth:2,padding:0,stride:1},'这里的outputWidth属于池化前互相关输出；池化后为1×1。'));
        c.push(C('shared-parameters','共享核参数数量',v.sharedParameters,`2行×2列×1输入通道×1输出通道=${v.sharedParameters}`,{kernelHeight:2,kernelWidth:2,inputChannels:1,outputChannels:1},'含数值为0的两个核格；无偏置，四个窗口共享这4个参数。'));
      }
      return V(step,c,'逐格检查真实3×3→2×2互相关、ReLU和全窗口池化；只有模型的四个真实阶段，不另造逐像素播放帧。');
    },
    experiments:[{id:'center-change',label:'只把中心像素从0改为4',before:{center:0},after:{center:4},prediction:'中心像素在左上窗口乘−1，在右下窗口乘+1，其余两个窗口乘0；池化主导位置改变。',expectation:'O:[[1,0],[0,−1]]→[[-3,0],[0,3]]；ReLU:[[1,0],[0,0]]→[[0,0],[0,3]]，最大池化1→3，核与输出宽度不变。',verify(a,b){const x=end(a),y=end(b);return a.params.center===0&&b.params.center===4&&same(x.kernel,[[1,0],[0,-1]])&&same(x.kernel,y.kernel)&&same(x.image,[[1,2,3],[0,0,2],[1,0,1]])&&same(y.image,[[1,2,3],[0,4,2],[1,0,1]])&&same(x.output,[[1,0],[0,-1]])&&same(y.output,[[-3,0],[0,3]])&&same(x.activated,[[1,0],[0,0]])&&same(y.activated,[[0,0],[0,3]])&&x.pooled===1&&y.pooled===3&&x.outputWidth===2&&y.outputWidth===2&&x.sharedParameters===4&&y.sharedParameters===4;}}]
  };

  models['cs231n-residual']={
    intuition:'把标量输入沿恒等快捷路径和F(x)=wx路径相加；输入梯度同样将1与w相加，因此w=−1恰好抵消。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        c.push(C('identity-input','快捷路径的输入 x',v.input,`identity(x)=x=${f(v.input)}`,{input:p.x},'输入与残差都是标量，形状一致才可相加；这里没有投影快捷连接。'));
        c.push(C('residual-branch','残差分支 F(x)',v.residual,`F(x)=wx=${f(p.scale)}×${f(v.input)}=${f(v.residual)}`,{scale:p.scale,input:v.input},'本例分支为线性标量，未实现卷积、BatchNorm或非线性堆叠。'));
      }else if(index===1){
        c.push(C('output','相加后的残差块输出 y',v.output,`y=x+F(x)=${f(v.input)}+(${f(v.residual)})=${f(v.output)}`,{identity:v.input,residual:v.residual},'这是当前前向输出，不是误差或已训练模型的改善量。'));
        c.push(C('output-scale','整体线性映射系数',1+p.scale,`y=(1+w)x；1+w=1.0000+(${f(p.scale)})=${f(1+p.scale)}`,{scale:p.scale},'由当前两分支代数合并得到系数；尚不声称已完成下一阶段的梯度计算。'));
      }else if(index===2){
        c.push(C('plain-gradient','只有线性分支时 dy/dx',v.plainGradient,`d(wx)/dx=w=${f(p.scale)}=${f(v.plainGradient)}`,{scale:p.scale},'假定w固定，求对输入x的导数；不是对w的梯度。'));
        c.push(C('identity-gradient','快捷路径的局部输入导数',1,'d(x)/dx=1.0000',{identityCoefficient:1}));
        c.push(C('residual-gradient','两条路径合成的输入导数',v.residualGradient,`dy/dx=1+w=1.0000+(${f(p.scale)})=${f(v.residualGradient)}`,{identityGradient:1,branchGradient:v.plainGradient},'两条路径的梯度相加；这里没有上游损失梯度或优化器更新。'));
      }else{
        const magnitude=Math.abs(v.residualGradient);
        c.push(C('gradient-magnitude','合成输入导数绝对值',magnitude,`|1+w|=|${f(v.residualGradient)}|=${f(magnitude)}`,{residualGradient:v.residualGradient}));
        c.push(C('cancellation','是否触发梯度抵消检查',v.gradientCanceled,`|dy/dx|<1e−9：|${f(v.residualGradient)}|<1e−9 → ${v.gradientCanceled}`,{residualGradient:v.residualGradient,tolerance:1e-9},'本实现采用1e−9数值阈值；w=−1时恰好为0，快捷连接不能保证任意权重下梯度非零。'));
        c.push(C('forward-check','同一参数下的当前输出',v.output,`y=(1+w)x=(1.0000+(${f(p.scale)}))×${f(v.input)}=${f(v.output)}`,{scale:p.scale,input:v.input},'x=0也会给输出0，但只有w=−1附近触发梯度抵消，不能从输出0推断梯度0。'));
      }
      return V(step,c,'真实标量残差加法和输入导数对照；明确检验抵消反例，不把快捷连接当作所有深层网络梯度的保证。');
    },
    experiments:[{id:'cancel-paths',label:'只把残差分支系数从0.5改为−1',before:{x:1,scale:.5},after:{x:1,scale:-1},prediction:'快捷路径导数保持1，残差分支由正贡献变为−1，整体输出与输入导数同时抵消为0。',expectation:'F:0.5→−1，y:1.5→0，plainGradient:0.5→−1，residualGradient:1.5→0，gradientCanceled:false→true。',verify(a,b){const x=end(a),y=end(b);return a.params.x===1&&b.params.x===1&&a.params.scale===.5&&b.params.scale===-1&&x.input===1&&y.input===1&&close(x.residual,.5)&&close(y.residual,-1)&&close(x.output,1.5)&&close(y.output,0)&&close(x.plainGradient,.5)&&close(y.plainGradient,-1)&&close(x.residualGradient,1.5)&&close(y.residualGradient,0)&&x.gradientCanceled===false&&y.gradientCanceled===true;}}]
  };

  models['cs231n-attention']={
    intuition:'一个标量query与三个patch的key逐项点积，经全位置softmax得到权重，再将三个value逐项加权相加。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.keys.forEach((k,j)=>c.push(C('key-'+j,'patch '+j+' 的标量Key',k,`k${j}=${f(k)}`,{patch:j},'只有d_k=1的单个query计算；没有位置编码、投影矩阵或多头。')));
        v.values.forEach((value,j)=>c.push(C('value-'+j,'patch '+j+' 的标量Value',value,`v${j}=${f(value)}`,{patch:j},'Key与Value分开给定，匹配分数不是Value本身。')));
        c.push(C('query','当前标量Query',p.query,`q=${f(p.query)}`,{query:p.query},'query是当前控制量；本帧尚未计算匹配分数。'));
      }else if(index===1){
        v.scores.forEach((score,j)=>c.push(C('score-'+j,'Query与patch '+j+' 的匹配分数',score,`s${j}=qk${j}/√d_k=${f(p.query)}×(${f(v.keys[j])})/√1=${f(score)}`,{query:p.query,key:v.keys[j],keyDimension:1},'缩放因子√1=1；三个位置均可查看，没有因果遮罩。')));
      }else if(index===2){
        const maximum=Math.max(...v.scores),exps=v.scores.map(x=>Math.exp(x-maximum)),z=sum(exps);
        c.push(C('maximum','softmax稳定化最大分数',maximum,`m=max(${v.scores.map(f).join(', ')})=${f(maximum)}`,{patches:v.scores.length}));
        exps.forEach((e,j)=>c.push(C('exponential-'+j,'patch '+j+' 的稳定指数',e,`e${j}=exp(s${j}−m)=exp(${f(v.scores[j])}−${f(maximum)})=${f(e)}`,{score:v.scores[j],maximum})));
        c.push(C('normalizer','三个patch共同归一化分母',z,`Z=${exps.map(f).join(' + ')}=${f(z)}`,{patches:exps.length}));
        v.weights.forEach((w,j)=>c.push(C('weight-'+j,'patch '+j+' 的注意力权重',w,`α${j}=e${j}/Z=${f(exps[j])}/${f(z)}=${f(w)}`,{exponential:exps[j],normalizer:z},'注意力权重不是像素因果重要性证明，也不是分类真值概率。')));
        c.push(C('weight-sum','注意力权重总和',sum(v.weights),`${v.weights.map(f).join(' + ')}=${f(sum(v.weights))}`,{patches:v.weights.length},'内部完整精度下和为1；显示小数单独舍入。'));
      }else{
        const contributions=v.weights.map((w,j)=>w*v.values[j]);
        contributions.forEach((part,j)=>c.push(C('value-contribution-'+j,'patch '+j+' 对输出的贡献',part,`α${j}v${j}=${f(v.weights[j])}×${f(v.values[j])}=${f(part)}`,{weight:v.weights[j],value:v.values[j]})));
        c.push(C('output','三个patch加权汇总的输出',v.output,`o=Σαjvj=${contributions.map(f).join(' + ')}=${f(v.output)}`,{patches:v.values.length},'输出是Value的凸组合，不是取最大权重位置的Value，也没有后续MLP或残差层。'));
        const lower=Math.min(...v.values),upper=Math.max(...v.values);
        c.push(C('convex-bound','输出是否在Value最小最大值之间',v.output>=lower&&v.output<=upper,`${f(lower)} ≤ ${f(v.output)} ≤ ${f(upper)} → ${v.output>=lower&&v.output<=upper}`,{lower,output:v.output,upper},'非负且归一化的权重给出此界；只核对本例标量值。'));
      }
      return V(step,c,'真实单query、三patch的双向注意力；本帧展开实际产生的分数、权重或加权输出，不虚构训练或额外播放阶段。');
    },
    experiments:[{id:'query-focus',label:'只把Query从0提高到2',before:{query:0},after:{query:2},prediction:'均匀权重变为偏向Key=1，输出向对应Value=2移动；权重总和仍为1。',expectation:'分数[0,0,0]→[2,0,−2]；权重约[0.3333,0.3333,0.3333]→[0.8668,0.1173,0.0159]；输出4→约2.2981。',verify(a,b){const x=end(a),y=end(b),z=Math.exp(2)+1+Math.exp(-2),expected=[Math.exp(2)/z,1/z,Math.exp(-2)/z],output=(2*Math.exp(2)+4+6*Math.exp(-2))/z;return a.params.query===0&&b.params.query===2&&same(x.keys,[1,0,-1])&&same(x.keys,y.keys)&&same(x.values,[2,4,6])&&same(x.values,y.values)&&same(x.scores,[0,0,0])&&same(y.scores,[2,0,-2])&&x.weights.every(w=>close(w,1/3))&&y.weights.every((w,j)=>close(w,expected[j]))&&close(sum(x.weights),1)&&close(sum(y.weights),1)&&close(x.output,4)&&close(y.output,output)&&y.output>=2&&y.output<4;}}]
  };

  models['cs231n-detection']={
    intuition:'同类别的两个连续坐标框先计算交集和并集，再按分数优先保留A；只有IoU严格大于阈值才抑制B。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[],coordinateNames=['左边界 x1','下边界 y1','右边界 x2','上边界 y2'];
      if(index===0){
        [v.a,v.b].forEach((box,i)=>box.forEach((value,j)=>c.push(C(`box-${i}-coordinate-${j}`,`${i===0?'A':'B'}框${coordinateNames[j]}`,value,i===1&&(j===0||j===2)?`${j===0?'x1':'x2'}=${f(p.offset)}${j===2?'+2.0000':''}=${f(value)}`:`${i===0?'A':'B'}[${j}]=${f(value)}`,{box:i,coordinate:j},'坐标是连续边界，面积不加1；两个框都假定属于同一类别。'))));
        v.scores.forEach((score,i)=>c.push(C('score-'+i,`${i===0?'A':'B'}框分类分数`,score,`score_${i===0?'A':'B'}=${f(score)}`,{box:i},'给定分类分数，不等于IoU；本例只用来确定NMS处理顺序。')));
      }else if(index===1){
        const left=Math.max(v.a[0],v.b[0]),right=Math.min(v.a[2],v.b[2]),bottom=Math.max(v.a[1],v.b[1]),top=Math.min(v.a[3],v.b[3]),width=Math.max(0,right-left),height=Math.max(0,top-bottom);
        c.push(C('intersection-width','连续坐标交集宽度',width,`w∩=max(0,min(${f(v.a[2])},${f(v.b[2])})−max(${f(v.a[0])},${f(v.b[0])}))=${f(width)}`,{right,left},'在控件位移范围0至2内，等价于max(0,2−offset)。'));
        c.push(C('intersection-height','连续坐标交集高度',height,`h∩=max(0,min(${f(v.a[3])},${f(v.b[3])})−max(${f(v.a[1])},${f(v.b[1])}))=${f(height)}`,{top,bottom}));
        c.push(C('intersection','框的交集面积',v.intersection,`area∩=w∩h∩=${f(width)}×${f(height)}=${f(v.intersection)}`,{width,height},'仅边界相接时交集宽度0、面积0，不给像素坐标额外加1。'));
      }else if(index===2){
        const areaA=(v.a[2]-v.a[0])*(v.a[3]-v.a[1]),areaB=(v.b[2]-v.b[0])*(v.b[3]-v.b[1]);
        [v.a,v.b].forEach((box,i)=>c.push(C('area-'+i,`${i===0?'A':'B'}框面积`,i===0?areaA:areaB,`(${f(box[2])}−${f(box[0])})×(${f(box[3])}−${f(box[1])})=${f(i===0?areaA:areaB)}`,{width:box[2]-box[0],height:box[3]-box[1]},'两框边长均2，面积各4；平移不改变面积。')));
        c.push(C('union','交并比的并集面积',v.union,`area∪=areaA+areaB−area∩=${f(areaA)}+${f(areaB)}−${f(v.intersection)}=${f(v.union)}`,{areaA,areaB,intersection:v.intersection}));
        c.push(C('iou','连续框交并比IoU',v.iou,`IoU=area∩/area∪=${f(v.intersection)}/${f(v.union)}=${f(v.iou)}`,{intersection:v.intersection,union:v.union},'本例并集至少4且为正；IoU只量化几何重叠，不是检测准确率。'));
      }else{
        c.push(C('first-box','先保留的高分框索引',v.kept[0],`score_A=${f(v.scores[0])} > score_B=${f(v.scores[1])}；先保留A，索引${v.kept[0]}`,{scoreA:v.scores[0],scoreB:v.scores[1]},'仅有两个同类框；没有跨类NMS、Soft-NMS或多框循环。'));
        c.push(C('suppressed','是否抑制低分B框',v.suppressed,`IoU > τ：${f(v.iou)} > ${f(p.threshold)} → ${v.suppressed}`,{iou:v.iou,threshold:p.threshold},'使用严格大于；IoU恰好等于阈值时不抑制B。'));
        c.push(C('kept-a','A框是否在保留集合',v.kept.includes(0),`0∈kept → ${v.kept.includes(0)}`,{boxIndex:0},'固定分数使A始终优先保留。'));
        c.push(C('kept-b','B框是否在保留集合',v.kept.includes(1),`1∈kept ↔ ¬suppressed → ${v.kept.includes(1)}`,{boxIndex:1,suppressed:v.suppressed}));
        c.push(C('kept-count','本次保留框数',v.kept.length,`保留索引[${v.kept.join(', ')}]；数量=${v.kept.length}`,{suppressed:v.suppressed},'减少重叠框不证明检测正确，也可能误抑制邻近真实物体；本例没有真值匹配或AP。'));
      }
      return V(step,c,'当前实际帧核对连续框几何和同类硬NMS的严格阈值；面积不加1，分类分数与IoU分开解释。');
    },
    experiments:[{id:'separate-boxes',label:'只把B框位移从0改为2',before:{offset:0,threshold:.5},after:{offset:2,threshold:.5},prediction:'完全重叠变为只接触边界；IoU从1降至0，B从被抑制变为保留，分类分数保持。',expectation:'交集4→0、并集4→8、IoU1→0；kept [0]→[0,1]，suppressed true→false。',verify(a,b){const x=end(a),y=end(b);return a.params.offset===0&&b.params.offset===2&&a.params.threshold===.5&&b.params.threshold===.5&&same(x.a,[0,0,2,2])&&same(x.a,y.a)&&same(x.b,[0,0,2,2])&&same(y.b,[2,0,4,2])&&same(x.scores,[.9,.8])&&same(x.scores,y.scores)&&x.intersection===4&&y.intersection===0&&x.union===4&&y.union===8&&x.iou===1&&y.iou===0&&same(x.kept,[0])&&same(y.kept,[0,1])&&x.suppressed===true&&y.suppressed===false;}}]
  };

  models['cs231n-transfer']={
    intuition:'人工固定特征和给定分类头生成四条预测，再比较按对象与按行划分的验证独立性；相同准确率可以伴随不同的对象泄漏。',
    inspect(t,index){
      const step=t.steps[index],v=step.variables,p=t.params,c=[];
      if(index===0){
        v.features.forEach((feature,j)=>{
          c.push(C('feature-'+j,'样本 '+j+' 人工特征',feature,`feature[${j}]=${f(feature)}`,{sample:j},'特征人工给定；没有加载或运行预训练特征提取器。'));
          c.push(C('group-'+j,'样本 '+j+' 对象身份',v.groups[j],`group[${j}]=${v.groups[j]}`,{sample:j},'同一对象的两帧不等于两个独立新对象。'));
          c.push(C('label-'+j,'样本 '+j+' 真实标签',v.labels[j],`label[${j}]=${v.labels[j]}`,{sample:j},'标签是固定输入；没有用模型预测生成真值。'));
        });
      }else if(index===1){
        v.predictions.forEach((prediction,j)=>{
          const score=v.features[j]*p.head;
          c.push(C('head-score-'+j,'样本 '+j+' 线性头分数',score,`z${j}=feature${j}×head=${f(v.features[j])}×${f(p.head)}=${f(score)}`,{feature:v.features[j],head:p.head},'头权重由控件直接给定；本模型没有拟合或梯度更新。'));
          c.push(C('prediction-'+j,'样本 '+j+' 预测类别',prediction,`ŷ${j}=1[z${j}≥2.5]=1[${f(score)}≥2.5000]=${prediction}`,{score,threshold:2.5},'分数恰好达到2.5时选类1；阈值固定。'));
        });
      }else if(index===2){
        v.train.forEach((sample,j)=>c.push(C('train-index-'+j,'训练侧第 '+j+' 个样本索引',sample,`train[${j}]=${sample}；对象${v.groups[sample]}，特征${f(v.features[sample])}`,{sample,group:v.groups[sample]},'这里仅选择索引；没有随后用训练侧索引拟合头。')));
        v.validation.forEach((sample,j)=>c.push(C('validation-index-'+j,'验证侧第 '+j+' 个样本索引',sample,`validation[${j}]=${sample}；对象${v.groups[sample]}，特征${f(v.features[sample])}`,{sample,group:v.groups[sample]})));
        [...new Set(v.groups)].forEach(group=>{
          const inTrain=v.train.some(j=>v.groups[j]===group),inValidation=v.validation.some(j=>v.groups[j]===group);
          c.push(C('overlap-group-'+group,'对象 '+group+' 是否跨训练与验证',inTrain&&inValidation,`对象${group}在训练侧=${inTrain}，在验证侧=${inValidation}；两侧同时出现 → ${inTrain&&inValidation}`,{inTrain,inValidation},'面向未见对象的评价要求对象不跨集合；面向同对象未来帧需另定义时间划分。'));
        });
        c.push(C('group-leak','本次划分的对象泄漏标记',v.groupLeak,`split=${p.split}；${p.split==='row'?'按行[0,2]/[1,3]使A和B都跨集合':'按对象[0,1]/[2,3]分别保留A/B'} → groupLeak=${v.groupLeak}`,{split:p.split},'标记用于当前固定数据与部署目标，不是所有验证问题的一般充分判据。'));
      }else{
        const correctness=v.validation.map(j=>Number(v.predictions[j]===v.labels[j])),correct=sum(correctness);
        v.validation.forEach((sample,j)=>c.push(C('validation-correct-'+sample,'验证样本 '+sample+' 是否分类正确',correctness[j],`1[ŷ${sample}=y${sample}]=1[${v.predictions[sample]}=${v.labels[sample]}]=${correctness[j]}`,{sample,prediction:v.predictions[sample],label:v.labels[sample],group:v.groups[sample]})));
        c.push(C('validation-correct-count','验证正确样本数',correct,`${correctness.join(' + ')}=${correct}`,{validationSamples:v.validation.length}));
        c.push(C('validation-accuracy','当前两条验证数据准确率',v.validationAccuracy,`accuracy=正确数/验证数=${correct}/${v.validation.length}=${f(v.validationAccuracy)}`,{correct,validationSamples:v.validation.length},'两条人工样本的流程核对，不证明迁移学习有效、统计稳定或真实泛化。'));
        c.push(C('independent-groups','训练验证是否没有共享对象',v.independentGroups,`independentGroups=¬groupLeak=¬${v.groupLeak} → ${v.independentGroups}`,{groupLeak:v.groupLeak},'没有共享对象只满足此处的分组条件；不证明场景、时间、预训练数据等也独立。'));
      }
      return V(step,c,'真实固定特征分类与分组审计；给定头权重不代表完成训练，样本准确率与对象独立性分别报告。');
    },
    experiments:[{id:'split-independence',label:'只把验证划分从按对象改为按行',before:{head:1,split:'group'},after:{head:1,split:'row'},prediction:'四条预测和验证准确率都保持，但验证由全新对象B变为A/B都跨集合，独立性标记翻转。',expectation:'train [0,1]→[0,2]、validation [2,3]→[1,3]；预测均[0,0,1,1]、准确率均1，groupLeak false→true、independentGroups true→false。',verify(a,b){const x=end(a),y=end(b);return a.params.head===1&&b.params.head===1&&a.params.split==='group'&&b.params.split==='row'&&same(x.features,[1,2,3,4])&&same(x.features,y.features)&&same(x.groups,['A','A','B','B'])&&same(x.groups,y.groups)&&same(x.labels,[0,0,1,1])&&same(x.labels,y.labels)&&same(x.predictions,[0,0,1,1])&&same(x.predictions,y.predictions)&&same(x.train,[0,1])&&same(y.train,[0,2])&&same(x.validation,[2,3])&&same(y.validation,[1,3])&&x.validationAccuracy===1&&y.validationAccuracy===1&&x.groupLeak===false&&y.groupLeak===true&&x.independentGroups===true&&y.independentGroups===false;}}]
  };

  return {courseId:'cs231n',models};
});
