/* Original small numerical companions to selected D2L Chinese/PyTorch chapters. */
(function(root,factory){
  const register=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=register;
  else register(root.AICourseModels);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const range=(id,label,min,max,step,value,unit='')=>({id,label,type:'range',min,max,step,value,unit});
  const choice=(id,label,options,value)=>({id,label,type:'select',options,value});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const sum=xs=>xs.reduce((a,b)=>a+b,0),mean=xs=>sum(xs)/xs.length;
  const dot=(a,b)=>sum(a.map((x,i)=>x*b[i]));
  const bars=(title,rows,unit='',max=null)=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value})),unit,max});
  const flow=(title,rows)=>({kind:'flow',title,nodes:rows.map(([label,detail,active])=>({label,detail:String(detail),active:!!active}))});
  const softmax=xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m));return e.map(x=>x/sum(e));};
  const loss=(xs,ys,w,b)=>mean(xs.map((x,i)=>(w*x+b-ys[i])**2/2));
  function record(model,p,code){const steps=[];return{
    add(line,title,detail,variables,visual){steps.push(copy({line,title,detail,variables,visual}));},
    end(result){return {model,params:p,code:code.split('\n'),steps,result:copy(result)};}
  };}
  return function register(M){
    if(!M||typeof M.register!=='function')throw Error('D2L requires AICourseModels.register');

    M.register('d2l-tensors',[
      range('rows','A 的行数',2,3,1,2),range('columns','A 的列数',2,3,1,3),
      choice('mode','B 的末轴',[['row','长度等于列数：可以广播'],['incompatible','长度多1：应拒绝']],'row'),
      range('offset','B 元素的起点',0,3,1,1)
    ],p=>{
      const r=record('d2l-tensors',p,`const flat=Array.from({length:rows*columns},(_,i)=>i);
const A=reshapeRows(flat,rows,columns);
const B=Array.from({length:mode==='row'?columns:columns+1},(_,j)=>offset+j);
const compatible=B.length===columns||B.length===1;
if(!compatible) return {status:'shape_error',output:null};
const output=A.map(row=>row.map((x,j)=>x+B[j]));
const total=output.flat().reduce((a,b)=>a+b,0);`);
      const flat=Array.from({length:p.rows*p.columns},(_,i)=>i);
      r.add(1,'先数元素，再谈形状','数据有多少个数，与这些数排成几行几列，是两个需要同时核对的信息。',{flat,elements:flat.length},bars('一维元素',flat.map((x,i)=>['位置 '+i,x])));
      const A=Array.from({length:p.rows},(_,i)=>flat.slice(i*p.columns,(i+1)*p.columns));
      r.add(2,'按行重排','重排保持元素个数不变；这里用新的数组表示形状，不模拟张量底层存储、视图或设备。',{A,shape:[p.rows,p.columns]},flow('矩阵各行',A.map((row,i)=>['第 '+i+' 行',JSON.stringify(row),false])));
      const B=Array.from({length:p.mode==='row'?p.columns:p.columns+1},(_,j)=>p.offset+j);
      r.add(3,'写清待相加向量的形状','A 为二维，B 为一维；从最右轴开始比较。缺失的前导轴按1处理。',{B,shapeB:[B.length],alignedShapeB:[1,B.length]},flow('对齐形状',[['A',p.rows+' × '+p.columns,false],['B','1 × '+B.length,true]]));
      const compatible=B.length===p.columns||B.length===1;
      r.add(4,'先检查每个轴能否广播','对应轴相等，或其中一个为1，才允许广播。本演示只实现矩阵加行向量这一种情况。',{compatible,lastAxisA:p.columns,lastAxisB:B.length},flow('末轴检查',[[compatible?'允许':'拒绝',p.columns+' 对 '+B.length,compatible]]));
      if(!compatible){r.add(5,'不把不匹配形状悄悄截断','这里返回明确错误，不生成任何相加结果。真实PyTorch会在形状不兼容时抛出运行错误。',{status:'shape_error',output:null},flow('检查结果',[['形状错误','改回长度等于列数的B',true]]));return r.end({status:'shape_error',A,B,output:null,total:null});}
      const output=A.map(row=>row.map((x,j)=>x+B[j]));
      r.add(6,'按位置做实际加法','B 的同一个元素用于各行的同一列。广播的数学语义不要求真的把B复制成完整矩阵。',{output},flow('相加后的各行',output.map((row,i)=>['第 '+i+' 行',JSON.stringify(row),true])));
      const total=sum(output.flat());r.add(7,'用元素总和独立核对','输出元素总和应等于A元素总和加上行数乘B元素总和。',{total,check:sum(flat)+p.rows*sum(B)},bars('两种复算',[['逐元素求和',total],['利用广播复算',sum(flat)+p.rows*sum(B)]]));
      return r.end({status:'ok',A,B,output,total});
    });

    M.register('d2l-matrix-probability',[
      range('w0','第一个特征权重',0,3,.5,1),range('p0','第一个结果的未归一化权重',0,4,1,1)
    ],p=>{
      const r=record('d2l-matrix-probability',p,`const X=[[1,2],[3,1]],w=[w0,2];
const products=X.map(row=>row.map((x,j)=>x*w[j]));
const prediction=products.map(row=>row.reduce((a,b)=>a+b,0));
const mass=[p0,1],normalizer=mass.reduce((a,b)=>a+b,0);
const probabilities=mass.map(x=>x/normalizer);
const expectation=prediction.reduce((s,x,i)=>s+probabilities[i]*x,0);`);
      const X=[[1,2],[3,1]],w=[p.w0,2];
      r.add(1,'一行是一条样本','X有两条样本、每条两个特征，w有两个权重。特征的列顺序必须与权重一一对应。',{X,w,shapeX:[2,2],shapeW:[2]},flow('输入与权重',[['样本0','[1,2]',false],['样本1','[3,1]',false],['权重',JSON.stringify(w),true]]));
      const products=X.map(row=>row.map((x,j)=>x*w[j]));r.add(2,'先逐项相乘','点积把对应位置相乘，再沿特征轴求和；矩阵乘法与逐元素乘法是不同运算。',{products},bars('每个特征的贡献',products.flatMap((row,i)=>row.map((x,j)=>['样本'+i+'·特征'+j,x]))));
      const prediction=products.map(sum);r.add(3,'每条样本各得到一个数','X的二维形状乘w的一维形状，结果为长度2的向量。此处没有偏置，之后的回归课再加入。',{prediction},bars('X @ w',prediction.map((x,i)=>['样本 '+i,x])));
      const mass=[p.p0,1],normalizer=sum(mass);r.add(4,'分数不能直接当概率','这里的非负权重只表示相对份额。先求总量，再做归一化，才能用于概率加权。',{mass,normalizer},bars('未归一化权重',mass.map((x,i)=>['结果 '+i,x])));
      const probabilities=mass.map(x=>x/normalizer);r.add(5,'归一化得到离散分布','两个概率非负且和为1。分母始终至少为1；没有把全零权重当作有效分布。',{probabilities,sum:sum(probabilities)}, {kind:'segments',title:'两种结果的概率',capacity:1,unit:'比例',segments:probabilities.map((x,i)=>({label:'结果 '+i,value:x}))});
      const expectation=dot(probabilities,prediction);r.add(6,'期望是按概率加权的平均','这不是随机抽样一次的输出，而是这个离散分布的数学期望。',{expectation,products:prediction.map((x,i)=>x*probabilities[i])},bars('各结果对期望的贡献',prediction.map((x,i)=>['结果 '+i,x*probabilities[i]])));
      return r.end({X,w,prediction,probabilities,expectation});
    });

    M.register('d2l-autograd',[
      range('x','输入 x',-2,3,.5,2),range('w','权重 w',-2,3,.5,1),range('b','偏置 b',-1,2,.5,0),range('target','目标 y',-2,4,1,3)
    ],p=>{
      const r=record('d2l-autograd',p,`const product=w*x;
const prediction=product+b;
const error=prediction-target;
const loss=0.5*error**2;
const dPrediction=error;
const dW=dPrediction*x,dB=dPrediction,dX=dPrediction*w;`);
      const product=p.w*p.x;r.add(1,'记录乘法节点','前向计算保存反向所需输入。自动微分是沿已执行的计算图应用求导规则，不是试很多次随机扰动。',{x:p.x,w:p.w,product},flow('乘法节点',[['x',p.x,false],['w',p.w,false],['w×x',product,true]]));
      const prediction=product+p.b;r.add(2,'加入偏置','加法对两个输入的局部导数都是1，因此上游梯度会不缩放地传向乘积与偏置。',{b:p.b,prediction},flow('加法节点',[['w×x',product,false],['b',p.b,false],['预测',prediction,true]]));
      const error=prediction-p.target;r.add(3,'区分预测和误差','目标固定，本轮只对模型计算所用的x、w、b求梯度。',{target:p.target,error},bars('预测与目标',[['预测',prediction],['目标',p.target],['误差',error]]));
      const lossValue=.5*error**2;r.add(4,'把误差变成一个标量损失','使用半平方误差，便于把导数写成误差本身。损失的数值与梯度的数值承担不同作用。',{loss:lossValue},bars('半平方误差',[['L',lossValue]]));
      const dPrediction=error;r.add(5,'从损失向后走','dL/de=e，且de/d预测=1，所以dL/d预测=e。链式法则把局部导数相乘。',{dLoss_dError:error,dError_dPrediction:1,dPrediction},flow('上游梯度',[['损失→误差',error,true],['误差→预测','×1',true]]));
      const dW=dPrediction*p.x,dB=dPrediction,dX=dPrediction*p.w;r.add(6,'沿分支得到各输入梯度','权重的局部导数是x；输入的局部导数是w。PyTorch的backward会累加到.grad，下一轮通常要清零。',{dW,dB,dX},bars('反向梯度',[['dL/dw',dW],['dL/db',dB],['dL/dx',dX]]));
      return r.end({prediction,error,loss:lossValue,dW,dB,dX});
    });

    M.register('d2l-regression',[
      range('initialW','初始权重',-1,2,.5,0),range('rate','学习率',.05,.5,.05,.1),range('epochs','完整数据更新次数',1,5,1,3)
    ],p=>{
      const r=record('d2l-regression',p,`const X=[1,2],Y=[2,4]; let w=initialW,b=0;
for(let epoch=0;epoch<epochs;epoch++){
  const prediction=X.map(x=>w*x+b),error=prediction.map((v,i)=>v-Y[i]);
  const before=mean(error.map(e=>0.5*e**2));
  const dw=mean(error.map((e,i)=>e*X[i])),db=mean(error);
  w-=rate*dw; b-=rate*db;
}
const finalLoss=mean(X.map((x,i)=>0.5*(w*x+b-Y[i])**2));`);
      const X=[1,2],Y=[2,4];let w=p.initialW,b=0;const history=[];
      r.add(1,'固定数据与初始参数','这里只有两条原创数据、一个权重和一个偏置。每次使用全部数据求平均梯度，是全批量梯度下降。',{X,Y,w,b},flow('回归问题',[['数据','x=[1,2]；y=[2,4]',false],['初始参数','w='+w+'，b=0',true]]));
      for(let epoch=0;epoch<p.epochs;epoch++){
        const prediction=X.map(x=>w*x+b),error=prediction.map((v,i)=>v-Y[i]);
        r.add(3,'第'+(epoch+1)+'次：先预测','用本轮更新前的同一组参数处理两条数据。',{epoch:epoch+1,w,b,prediction,error},bars('预测与标签',prediction.flatMap((v,i)=>[['预测'+i,v],['标签'+i,Y[i]]])));
        const before=mean(error.map(e=>.5*e**2));r.add(4,'把每条误差变成平均损失','先求每条半平方误差，再按样本数求平均。不能在之后重复除一次样本数。',{before,errors:error},bars('各样本损失',error.map((e,i)=>['样本 '+i,.5*e**2])));
        const dw=mean(error.map((e,i)=>e*X[i])),db=mean(error);r.add(5,'计算同一个旧状态下的梯度','dw与db都来自更新前的参数，随后同时应用。学习率控制沿负梯度移动的距离。',{dw,db,rate:p.rate},bars('本轮平均梯度',[['dw',dw],['db',db]]));
        w-=p.rate*dw;b-=p.rate*db;const after=loss(X,Y,w,b);history.push({epoch:epoch+1,w,b,before,after,dw,db});r.add(6,'更新后重新计算损失','本例会真实执行参数更新。过大的学习率可能让损失上升；下降也不等于在未知数据上表现好。',{w,b,before,after},bars('更新前后损失',[['更新前',before],['更新后',after]]));
      }
      const finalLoss=loss(X,Y,w,b);r.add(8,'留下可复算的训练轨迹','这两条数据的局部JavaScript计算不是PyTorch性能实验，也没有使用GPU。',{w,b,finalLoss,updates:history.length},bars('各轮更新后的损失',history.map(x=>['第 '+x.epoch+' 次',x.after])));
      return r.end({w,b,finalLoss,history});
    });

    M.register('d2l-classification',[
      range('gap','相邻logit差',0,3,.5,1),range('shift','所有logit共同平移',-10,10,1,0),choice('target','正确类别',[[0,'类别0'],[1,'类别1'],[2,'类别2']],0)
    ],p=>{
      const r=record('d2l-classification',p,`const logits=[shift+gap,shift,shift-gap];
const maximum=Math.max(...logits);
const exp=logits.map(z=>Math.exp(z-maximum));
const probabilities=exp.map(x=>x/exp.reduce((a,b)=>a+b,0));
const loss=Math.log(exp.reduce((a,b)=>a+b,0))+maximum-logits[target];
const gradient=probabilities.map((v,i)=>v-(i===target?1:0));`);
      const logits=[p.shift+p.gap,p.shift,p.shift-p.gap];r.add(1,'logit是分数，不是概率','每个类别有一个实数分数；它可以为负，且不要求和为1。',{logits,target:p.target},bars('原始分数',logits.map((x,i)=>['类别 '+i,x])));
      const maximum=Math.max(...logits);r.add(2,'先减最大值','所有分数减同一个常数不改变softmax概率；数值稳定写法避免不必要的大指数。',{maximum,shifted:logits.map(x=>x-maximum)},bars('减最大值后',logits.map((x,i)=>['类别 '+i,x-maximum])));
      const exp=logits.map(z=>Math.exp(z-maximum));r.add(3,'指数把相对差变成正权重','这里只计算一个三分类样本，不包含从图像或文本提取特征的过程。',{exp,normalizer:sum(exp)},bars('非负权重',exp.map((x,i)=>['类别 '+i,x])));
      const probabilities=exp.map(x=>x/sum(exp));r.add(4,'归一化为概率分布','各项非负且总和为1。改变正确类别只改变监督目标，不会反过来改变本次前向概率。',{probabilities,sum:sum(probabilities)}, {kind:'segments',title:'预测概率',capacity:1,unit:'比例',segments:probabilities.map((x,i)=>({label:'类别 '+i,value:x}))});
      const lossValue=Math.log(sum(exp))+maximum-logits[p.target];r.add(5,'只读取正确类别的负对数概率','使用稳定的log-sum-exp等价式计算交叉熵。正确类别概率越小，该样本损失越大。',{target:p.target,correctProbability:probabilities[p.target],loss:lossValue},bars('本样本交叉熵',[['L',lossValue]]));
      const gradient=probabilities.map((v,i)=>v-(i===p.target?1:0));r.add(6,'对logit的梯度是p减one-hot目标','这里给出对各类别分数的解析梯度；完整模型还需把梯度传回生成logit的参数。',{gradient,sum:sum(gradient)},bars('dL / dlogit',gradient.map((x,i)=>['类别 '+i,x])));
      return r.end({logits,probabilities,loss:lossValue,gradient});
    });

    M.register('d2l-mlp',[
      range('x','输入 x',-2,2,.5,1),range('w','隐藏层权重 w',-2,2,.5,1),range('b','隐藏层偏置 b',-1,1,.5,0),range('v','输出层权重 v',.5,2,.5,2)
    ],p=>{
      const r=record('d2l-mlp',p,`const z=w*x+b;
const hidden=Math.max(0,z);
const prediction=v*hidden;
const error=prediction-1,loss=0.5*error**2;
const dV=error*hidden,dHidden=error*v;
const gate=z>0?1:0;
const dZ=dHidden*gate,dW=dZ*x,dB=dZ;`);
      const z=p.w*p.x+p.b;r.add(1,'先做一个仿射变换','单隐藏单元接收一个特征，先按w缩放再加偏置；真实MLP可将此扩展为矩阵与向量。',{x:p.x,w:p.w,b:p.b,z},flow('第一层',[['输入',p.x,false],['w×x+b',z,true]]));
      const hidden=Math.max(0,z);r.add(2,'非线性决定哪些信号通过','ReLU正区间保留数值，负区间输出0。没有非线性时，连续线性层仍可合并为一层线性变换。',{z,hidden},bars('ReLU前后',[['z',z],['h',hidden]]));
      const prediction=p.v*hidden;r.add(3,'输出层汇总隐藏表示','本例仅有一个隐藏单元，输出是v乘h；这展示计算链，不代表足够解决复杂任务。',{v:p.v,prediction},flow('第二层',[['隐藏值',hidden,false],['输出层权重',p.v,false],['预测',prediction,true]]));
      const error=prediction-1,lossValue=.5*error**2;r.add(4,'固定目标为1，生成上游误差','半平方误差的梯度从预测误差开始向后传递。',{target:1,error,loss:lossValue},bars('预测、目标与损失',[['预测',prediction],['目标',1],['损失',lossValue]]));
      const dV=error*hidden,dHidden=error*p.v;r.add(5,'先经过输出层','链式法则得到dL/dv=误差×h，以及传向隐藏层的梯度=误差×v。',{dV,dHidden},bars('输出层反向',[['dL/dv',dV],['dL/dh',dHidden]]));
      const gate=z>0?1:0;r.add(6,'再经过ReLU门','z<0时门为0。z=0处不可导，本例与PyTorch采用梯度0的约定；数值差分不要在此边界验证唯一导数。',{z,gate,atKink:z===0},flow('ReLU局部导数',[['z>0 ?',z>0?'是':'否',false],['局部导数',gate,true]]));
      const dZ=dHidden*gate,dW=dZ*p.x,dB=dZ;r.add(7,'把梯度分给第一层参数','参数得到的是当前这一个样本的梯度。隐藏单元关闭时，即便损失大，该分支梯度也可能为0。',{dZ,dW,dB},bars('隐藏层反向',[['dL/dz',dZ],['dL/dw',dW],['dL/db',dB]]));
      return r.end({z,hidden,prediction,error,loss:lossValue,gate,dW,dB,dV});
    });

    M.register('d2l-generalization',[
      choice('capacity','候选模型',[['line','最小二乘直线'],['memorize','查表记住训练点，未见点返回0']],'line'),
      range('noise','训练标签固定扰动量',0,2,.5,1),choice('split','评估索引',[['clean','独立验证点'],['leaked','错误：重复训练点']],'clean')
    ],p=>{
      const r=record('d2l-generalization',p,`const trainX=[0,2,4],trainY=[noise,4-noise,8+noise];
const validationX=split==='clean'?[1,3,5]:[0,2,4];
const mx=mean(trainX),my=mean(trainY);
const w=sum(trainX.map((x,i)=>(x-mx)*(trainY[i]-my)))/sum(trainX.map(x=>(x-mx)**2)),b=my-w*mx;
const predict=x=>capacity==='line'?w*x+b:lookupOrZero(x,trainX,trainY);
const trainMSE=mean(trainX.map((x,i)=>(predict(x)-trainY[i])**2));
const validationY=split==='clean'?validationX.map(x=>2*x):trainY;
const validationMSE=mean(validationX.map((x,i)=>(predict(x)-validationY[i])**2));`);
      const trainX=[0,2,4],trainY=[p.noise,4-p.noise,8+p.noise];r.add(1,'先固定训练样本','原始关系为y=2x，训练标签叠加明确的固定扰动。训练集用来拟合参数。',{trainX,trainY,noise:p.noise},bars('训练标签',trainY.map((y,i)=>['x='+trainX[i],y])));
      const validationX=p.split==='clean'?[1,3,5]:[0,2,4];r.add(2,'在拟合前区分数据用途','独立验证点为1、3、5；切换错误模式会把训练点再次当验证点。页面明确展示这种泄漏。',{trainX,validationX,overlap:validationX.filter(x=>trainX.includes(x))},flow('索引划分',[['训练',JSON.stringify(trainX),false],['验证',JSON.stringify(validationX),p.split==='clean']]));
      const mx=mean(trainX),my=mean(trainY);r.add(3,'只从训练数据统计均值','验证标签不参与拟合，也不用于计算训练均值。两种候选模型使用完全相同的训练样本。',{meanX:mx,meanY:my},bars('训练统计量',[['x均值',mx],['y均值',my]]));
      const w=sum(trainX.map((x,i)=>(x-mx)*(trainY[i]-my)))/sum(trainX.map(x=>(x-mx)**2)),b=my-w*mx;
      r.add(4,'拟合直线或记忆训练表','直线用最小二乘闭式解；另一模型刻意记忆训练标签，未见x时返回0。后者是过拟合的极简反例，不代表所有高容量模型。',{w,b,capacity:p.capacity},flow('模型',[['直线','w='+w+'，b='+b,false],['当前选择',p.capacity==='line'?'线性外推':'查表，未知返回0',true]]));
      const predict=x=>{if(p.capacity==='line')return w*x+b;const i=trainX.indexOf(x);return i<0?0:trainY[i];};
      const trainMSE=mean(trainX.map((x,i)=>(predict(x)-trainY[i])**2));r.add(6,'训练误差只检查已经看过的数据','查表模型能把训练MSE降到0，但这不能证明它能处理未见输入。',{trainPrediction:trainX.map(predict),trainMSE},bars('训练MSE',[['训练',trainMSE]]));
      const validationY=p.split==='clean'?validationX.map(x=>2*x):trainY;r.add(7,'核对验证标签的来源','独立模式使用未扰动的保留点标签；错误模式故意复用训练标签，因此得分不再是独立泛化证据。',{validationY,leaked:p.split==='leaked'},flow('验证条件',[[p.split==='clean'?'独立验证':'数据泄漏',p.split==='clean'?'未见输入与保留标签':'训练输入与标签被重复使用',true]]));
      const validationMSE=mean(validationX.map((x,i)=>(predict(x)-validationY[i])**2));r.add(8,'比较两种误差，再讨论模型选择','小样本得分只描述当前数据划分；真实实验还需最终独立测试集、合适划分和多次重复，不能由本例推出真实准确率。',{trainMSE,validationMSE,validationPrediction:validationX.map(predict),independent:p.split==='clean'},bars('本例误差对照',[['训练MSE',trainMSE],['验证MSE',validationMSE]]));
      return r.end({w,b,trainMSE,validationMSE,trainX,validationX,independent:p.split==='clean'});
    });

    M.register('d2l-attention',[
      range('query','查询的第一维',0,3,.5,1),range('value','第二个Value',0,6,1,4),choice('visible','可见范围',[['both','两个位置均可见'],['first','只允许位置0']],'both')
    ],p=>{
      const r=record('d2l-attention',p,`const q=[query,1],K=[[1,0],[0,1]],V=[2,value];
const dots=K.map(k=>q[0]*k[0]+q[1]*k[1]);
const scaled=dots.map(x=>x/Math.sqrt(2));
const visibleScores=visible==='first'?[scaled[0]]:scaled;
const weights=softmax(visibleScores).concat(visible==='first'?[0]:[]);
const contributions=weights.map((w,i)=>w*V[i]);
const output=contributions.reduce((a,b)=>a+b,0);`);
      const q=[p.query,1],K=[[1,0],[0,1]],V=[2,p.value];r.add(1,'把Q、K、V角色分开','Q用来发问，K参与匹配，V是最后加权的信息。本例直接给定向量，没有训练投影矩阵。',{q,K,V},flow('两组键值对',[['位置0','K=[1,0]，V=2',false],['位置1','K=[0,1]，V='+p.value,false],['当前Q',JSON.stringify(q),true]]));
      const dots=K.map(k=>dot(q,k));r.add(2,'逐位置计算点积','查询与每个Key相乘求和，得到两个匹配分数。值向量不会参与此处的分数计算。',{dots},bars('原始点积分数',dots.map((x,i)=>['位置 '+i,x])));
      const scaled=dots.map(x=>x/Math.sqrt(2));r.add(3,'按Key维度缩放','Key有2维，因此除以sqrt(2)。这是缩放点积注意力中的固定维度因子，不是温度参数。',{dimension:2,scaled},bars('缩放后分数',scaled.map((x,i)=>['位置 '+i,x])));
      const visibleScores=p.visible==='first'?[scaled[0]]:scaled;r.add(4,'在softmax前处理可见范围','只允许位置0时，位置1不会进入归一化分母。概念上相当于把被遮位置的分数设为负无穷。',{visible:p.visible,visibleScores},flow('可见性',[['位置0','可见',true],['位置1',p.visible==='first'?'被遮住':'可见',p.visible==='both']]));
      const weights=softmax(visibleScores).concat(p.visible==='first'?[0]:[]);r.add(5,'变成和为1的注意力权重','被遮位置严格为0。权重表示此层如何混合信息，不是来源内容的真实性概率。',{weights,sum:sum(weights)}, {kind:'segments',title:'注意力权重',capacity:1,unit:'比例',segments:weights.map((w,i)=>({label:'位置 '+i,value:w}))});
      const contributions=weights.map((w,i)=>w*V[i]);r.add(6,'把权重用于Value','位置的Key负责分配权重，对应Value负责提供被组合的值。改变Value不应改变前面已算出的权重。',{contributions},bars('Value的加权贡献',contributions.map((x,i)=>['位置 '+i,x])));
      const output=sum(contributions);r.add(7,'汇总并连接到Transformer','Transformer还包括多头投影、位置表示、前馈层、残差与归一化。本课只执行一个查询的单头标量Value汇总。',{output},bars('单头输出',[['加权输出',output]]));
      return r.end({q,K,V,dots,scaled,weights,contributions,output});
    });
    // Second teaching sequence: convolution, recurrence, optimization and synchronized training.
    M.register('d2l-convolution',[
      range('stride','步幅',1,2,1,1),range('padding','零填充',0,1,1,0),
      range('edge','核的右列系数',-2,1,1,-1)
    ],p=>{
      const r=record('d2l-convolution',p,`const image=[[1,2,0],[0,1,3],[2,1,0]];
const kernel=[[1,edge],[1,edge]];
const padded=zeroPad(image,padding);
const size=Math.floor((3+2*padding-2)/stride)+1;
const output=emptyMatrix(size,size);
for(const [row,column] of coordinates(size,size)){
  const patch=windowAt(padded,row*stride,column*stride,2);
  output[row][column]=sum(elementwiseProduct(patch,kernel));
}
const shape=[1,1,size,size];`);
      const image=[[1,2,0],[0,1,3],[2,1,0]],kernel=[[1,p.edge],[1,p.edge]],n=3+2*p.padding;
      r.add(1,'图像的轴与数值先固定','这里只计算一个样本、一个输入通道和一个输出通道。框架常用NCHW；图中只展开最后两个空间轴。',{image,kernel},flow('输入轴',[['N',1,false],['C',1,false],['H×W','3×3',true]]));
      const padded=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i>=p.padding&&i<3+p.padding&&j>=p.padding&&j<3+p.padding?image[i-p.padding][j-p.padding]:0));
      r.add(3,'填充只改变边界，不凭空产生图像内容','卷积核不翻转，这是深度学习库通常称作卷积的互相关。',{padded,kernel},flow('边界',[['padding',p.padding,true],['互相关','不翻转核',false]]));
      const size=Math.floor((3+2*p.padding-2)/p.stride)+1,output=Array.from({length:size},()=>Array(size).fill(null));
      r.add(4,'先算输出形状','每个输出位置必须有完整窗口；步幅为2时中间有位置不会取样。',{size,stride:p.stride,output:copy(output)},bars('空间宽度',[['输入',3],['填充后',n],['输出',size]]));
      r.add(5,'尚未计算的格子保持空白','空格不是数值0。每次只写入已经完成乘加的输出位置。',{output:copy(output)},flow('输出',[['状态','等待第一个窗口',true]]));
      for(let row=0;row<size;row++)for(let column=0;column<size;column++){
        const patch=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>padded[row*p.stride+i][column*p.stride+j]));
        const products=patch.map((xs,i)=>xs.map((x,j)=>x*kernel[i][j]));output[row][column]=sum(products.flat());
        r.add(8,'窗口 ('+row+','+column+') 的四次乘加','同一个核在所有位置共享；偏置本例固定为0。',{patch,products,window:[row*p.stride,column*p.stride],position:[row,column],kernel,output:copy(output)},bars('实际乘积',products.flat().map((x,i)=>['项'+i,x])));
      }
      const shape=[1,1,size,size];r.add(10,'数值与形状一起交付','更换padding或stride后重新计算；不把空间形状变化画成训练或性能提升。',{shape,output},flow('输出轴',[['NCHW',JSON.stringify(shape),true]]));
      return r.end({image,kernel,padded,output,shape});
    });

    M.register('d2l-cnn-pooling',[choice('pool','汇聚规则',[['max','最大汇聚'],['average','平均汇聚']],'max'),range('bias','卷积偏置',-2,2,1,0)],p=>{
      const r=record('d2l-cnn-pooling',p,`const image=[[1,2,0],[0,1,3],[2,1,0]];
const conv=correlate2d(image,[[1,0],[0,-1]],bias);
const activation=conv.map(row=>row.map(x=>Math.max(0,x)));
const pooled=pool==='max'?Math.max(...activation.flat()):mean(activation.flat());
const logits=[pooled,-pooled];
const probabilities=softmax(logits);
const loss=-Math.log(probabilities[0]);`);
      const image=[[1,2,0],[0,1,3],[2,1,0]],kernel=[[1,0],[0,-1]];
      r.add(1,'把一条小网络的尺寸写出来','输入3×3，互相关后2×2，ReLU保持2×2，整块汇聚成一个标量，再接两个logit。',{image,kernel},flow('网络尺寸',[['输入','1×1×3×3',false],['卷积','1×1×2×2',false],['池化','1×1×1×1',false]]));
      const conv=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>image[i][j]-image[i+1][j+1]+p.bias));
      r.add(2,'核先找到局部变化','加偏置后才进入激活；本例共享同一个2×2核。',{conv,bias:p.bias},bars('卷积结果',conv.flat().map((x,i)=>['格'+i,x])));
      const activation=conv.map(row=>row.map(x=>Math.max(0,x)));r.add(3,'ReLU移除负响应','这一步改变数值而不改变空间尺寸；它不是分类概率。',{activation},bars('激活结果',activation.flat().map((x,i)=>['格'+i,x])));
      const values=activation.flat(),pooled=p.pool==='max'?Math.max(...values):mean(values),maxIndex=values.indexOf(Math.max(...values));
      r.add(4,'汇聚决定保留什么信息','最大汇聚只保留最大响应；平均汇聚保留平均强度。本例最大值相等时，梯度位置按第一个最大值约定。',{pooled,pool:p.pool,maxIndex},bars('汇聚',[['结果',pooled]]));
      const logits=[pooled,-pooled],probabilities=softmax(logits);r.add(6,'分类头仍要归一化','权重固定为[1,-1]，以便独立复算。完整PyTorch实验另执行参数更新。',{logits,probabilities},bars('两类概率',probabilities.map((x,i)=>['类'+i,x])));
      const lossValue=-Math.log(probabilities[0]);r.add(7,'对照标签检查损失','标签是人工指定的0。一次前向计算不能证明网络已经学会图像分类。',{loss:lossValue},bars('交叉熵',[['loss',lossValue]]));
      return r.end({image,kernel,conv,activation,pooled,logits,probabilities,loss:lossValue});
    });

    M.register('d2l-rnn',[range('recurrent','循环权重',-.9,.9,.1,.5),range('input','首个输入',-1,1,.5,1)],p=>{
      const r=record('d2l-rnn',p,`const inputs=[input,0,-0.5,0.5]; let hidden=0;
const history=[];
for(const x of inputs){
  const previous=hidden,preactivation=x+recurrent*previous;
  hidden=Math.tanh(preactivation);
  const localDerivative=(1-hidden**2)*recurrent;
  history.push({x,previous,preactivation,hidden,localDerivative});
}
const memoryDerivative=product(history.map(row=>row.localDerivative));`);
      const inputs=[p.input,0,-.5,.5],history=[];let hidden=0;
      r.add(1,'同一参数跨时间共享','四个标量不是四个独立样本；每步接收上一步状态。初始状态固定为0。',{inputs,recurrent:p.recurrent,history:[]},flow('展开时间',[['h₀',0,true],['输入',JSON.stringify(inputs),false]]));
      r.add(2,'区分状态与输出预测','这里先只研究隐藏状态；语言模型还需要输出层、标签和训练目标。',{hidden},bars('初始状态',[['h₀',hidden]]));
      for(let t=0;t<inputs.length;t++){
        const x=inputs[t],previous=hidden,preactivation=x+p.recurrent*previous;hidden=Math.tanh(preactivation);
        const localDerivative=(1-hidden**2)*p.recurrent;history.push({x,previous,preactivation,hidden,localDerivative});
        r.add(7,'第'+(t+1)+'步：合并输入与旧状态','先保存旧状态，再进行tanh；不能提前覆盖反向传播所需的值。',{time:t+1,x,previous,preactivation,hidden,history:copy(history)},bars('本步状态',[['旧h',previous],['输入x',x],['新h',hidden]]));
      }
      const memoryDerivative=history.reduce((v,x)=>v*x.localDerivative,1);r.add(9,'沿时间链乘局部导数','这里只算末状态对初状态的导数，不是对共享权重的完整梯度；共享权重梯度还需把各时间路径相加。',{memoryDerivative},bars('∂h末/∂h初',[['梯度',memoryDerivative]]));
      return r.end({inputs,history,hidden,memoryDerivative});
    });

    M.register('d2l-gru',[range('update','更新门 z',0,1,.1,.8),range('reset','重置门 r',0,1,.1,.5),range('initial','旧状态',-1,1,.5,1)],p=>{
      const r=record('d2l-gru',p,`const previous=initial,input=0.5;
const resetState=reset*previous;
const candidate=Math.tanh(input+resetState);
const retained=update*previous;
const admitted=(1-update)*candidate;
const hidden=retained+admitted;`);
      const previous=p.initial,input=.5;r.add(1,'先选定GRU约定','采用D2L约定：z越大保留旧状态越多。门值由控件直接给定，完整网络中通常由可训练仿射变换加sigmoid生成。',{previous,input,update:p.update,reset:p.reset},flow('约定',[['z','保留比例',true],['r','候选中旧状态比例',false]]));
      const resetState=p.reset*previous;r.add(2,'重置门只作用于候选支路','r=0让候选忽略旧状态，但并不直接清空最终状态。',{resetState},bars('候选的历史输入',[['r×旧h',resetState]]));
      const candidate=Math.tanh(input+resetState);r.add(3,'形成候选状态','本例候选权重都为1，偏置为0。', {candidate},bars('候选',[['h候选',candidate]]));
      const retained=p.update*previous;r.add(4,'旧状态有一条直接保留路径','它绕过候选的tanh，这有助于理解门控为什么能改变长期信息传递。',{retained},bars('保留',[['z×旧h',retained]]));
      const admitted=(1-p.update)*candidate;r.add(5,'剩余份额接纳候选','两个份额之和为1，不把门值本身解释为正确率。',{admitted},bars('接纳',[['(1−z)×候选',admitted]]));
      const hidden=retained+admitted;r.add(6,'两个极端可以手工核验','z=1时新h严格等于旧h；z=0时严格等于候选。',{hidden},bars('合成状态',[['旧状态份额',retained],['候选份额',admitted],['新h',hidden]]));return r.end({previous,input,resetState,candidate,retained,admitted,hidden});
    });

    M.register('d2l-momentum',[range('rate','学习率',.05,.4,.05,.1),range('momentum','动量系数',0,.9,.1,.8)],p=>{
      const r=record('d2l-momentum',p,`let theta=2,velocity=0;
const history=[];
for(let step=1;step<=6;step++){
  const gradient=theta;
  velocity=momentum*velocity+gradient;
  theta-=rate*velocity;
  history.push({step,gradient,velocity,theta,loss:0.5*theta**2});
}`);let theta=2,velocity=0;const history=[];
      r.add(1,'只优化一个可手算目标','L=θ²/2，最优点0。这里采用与PyTorch SGD momentum一致的未归一化速度约定，无权重衰减、无Nesterov。',{theta,velocity,history:[]},bars('初始化',[['θ',theta]]));
      r.add(2,'动量是优化器状态','恢复训练需要同时保存参数与速度，否则下一步不会接着原轨迹走。',{velocity},bars('速度',[['v',velocity]]));
      for(let step=1;step<=6;step++){const gradient=theta,previous=theta;velocity=p.momentum*velocity+gradient;theta-=p.rate*velocity;history.push({step,gradient,velocity,theta,loss:.5*theta**2});r.add(7,'更新 '+step+'：梯度与历史共同决定步长','梯度来自旧θ。动量可能越过最优点；不保证每一步损失都下降。',{previous,theta,velocity,gradient,history:copy(history)},bars('更新状态',[['梯度',gradient],['速度',velocity],['θ',theta]]));}
      return r.end({theta,velocity,loss:.5*theta**2,history});
    });

    M.register('d2l-adam',[range('rate','学习率',.05,.3,.05,.1),range('beta1','一阶矩系数',0,.9,.1,.9),range('beta2','二阶矩系数',.5,.9,.1,.9)],p=>{
      const r=record('d2l-adam',p,`let theta=2,m=0,v=0;
const history=[];
for(let step=1;step<=5;step++){
  const gradient=theta;
  m=beta1*m+(1-beta1)*gradient; v=beta2*v+(1-beta2)*gradient**2;
  const mHat=m/(1-beta1**step),vHat=v/(1-beta2**step);
  theta-=rate*mHat/(Math.sqrt(vHat)+1e-8);
  history.push({step,gradient,m,v,mHat,vHat,theta,loss:0.5*theta**2});
}`);let theta=2,m=0,v=0;const history=[];
      r.add(1,'固定目标，分开存三类状态','目标仍为θ²/2。Adam需保存θ、一阶矩m、二阶矩v以及步数t。',{theta,m,v,history:[]},flow('初始化',[['参数',theta,false],['m / v','0 / 0',true]]));
      r.add(2,'平方梯度不是梯度方差','v是梯度平方的指数滑动平均；本例未实现AdamW权重衰减。',{beta1:p.beta1,beta2:p.beta2},flow('两个记忆时间尺度',[['β₁',p.beta1,false],['β₂',p.beta2,true]]));
      for(let step=1;step<=5;step++){
        const gradient=theta;m=p.beta1*m+(1-p.beta1)*gradient;v=p.beta2*v+(1-p.beta2)*gradient**2;
        const mHat=m/(1-p.beta1**step),vHat=v/(1-p.beta2**step);theta-=p.rate*mHat/(Math.sqrt(vHat)+1e-8);history.push({step,gradient,m,v,mHat,vHat,theta,loss:.5*theta**2});
        r.add(8,'Adam 第'+step+'步：校正后再除尺度','零初始化会使早期矩估计偏小，分别除以1−βᵗ。ε在根号外，数值位置与PyTorch Adam一致。',{theta,gradient,m,v,mHat,vHat,step,history:copy(history)},bars('校正后的矩',[['m̂',mHat],['√v̂',Math.sqrt(vHat)],['θ',theta]]));
      }return r.end({theta,m,v,history});
    });

    M.register('d2l-data-parallel',[range('split','rank0 样本数',1,3,1,2),choice('reduction','归约规则',[['weighted','按全局样本数加权'],['rank_mean','错误：局部均值再等权平均']],'weighted')],p=>{
      const r=record('d2l-data-parallel',p,`const X=[1,2,3,4],Y=X.map(x=>2*x),w=0;
const local=[X.slice(0,split),X.slice(split)];
const sums=local.map(xs=>sum(xs.map(x=>(w*x-2*x)*x)));
const counts=local.map(xs=>xs.length);
const localMeans=sums.map((g,i)=>g/counts[i]);
const globalGradient=reduction==='weighted'?sum(sums)/sum(counts):mean(localMeans);
const reference=mean(X.map(x=>(w*x-2*x)*x));
const nextW=w-0.1*globalGradient;`);
      const X=[1,2,3,4],local=[X.slice(0,p.split),X.slice(p.split)],counts=local.map(x=>x.length);
      r.add(1,'全局批次固定，参数副本相同','各rank有同一个w=0，各自只读自己的数据。CPU图示没有创建GPU或通信进程。',{X,w:0},flow('全局样本',[['样本',JSON.stringify(X),false],['目标','y=2x',false]]));
      r.add(2,'数据分片可能大小不同','不同rank的局部平均损失不能在样本数不同时直接等权。',{local,counts},flow('样本分配',local.map((x,i)=>['rank'+i,JSON.stringify(x),true])));
      const sums=local.map(xs=>sum(xs.map(x=>-2*x*x)));r.add(3,'先求局部梯度和','每条梯度为(w x−y)x，来自半平方误差；不要重复除batch大小。',{sums},bars('局部和',sums.map((x,i)=>['rank'+i,x])));
      const localMeans=sums.map((g,i)=>g/counts[i]);r.add(5,'均值要连同分母传递','相同大小时局部均值等权平均恰好正确，大小不同时会改变目标。',{localMeans},bars('局部均值',localMeans.map((x,i)=>['rank'+i,x])));
      const globalGradient=p.reduction==='weighted'?sum(sums)/sum(counts):mean(localMeans);r.add(6,'合并分子与分母','正确分支求全局梯度和除以全局样本数；错误分支保留作可观察反例。',{globalGradient,reduction:p.reduction},bars('归约',[['梯度',globalGradient]]));
      const reference=mean(X.map(x=>-2*x*x)),nextW=-.1*globalGradient;r.add(8,'与单设备全局批次对照','只有梯度与更新都一致，才能说这个算例的归约等价；不能据此推断并行提速。',{reference,globalGradient,nextW,error:globalGradient-reference},bars('独立参照',[['单批梯度',reference],['归约梯度',globalGradient]]));
      return r.end({local,counts,sums,localMeans,globalGradient,reference,nextW,error:globalGradient-reference});
    });

    M.register('d2l-ddp',[range('microbatches','每rank累积微批数',1,4,1,2),choice('scaling','loss缩放',[['correct','先除以累积次数'],['missing','错误：忘记除累积次数']],'correct'),range('world','rank数量',2,4,1,2)],p=>{
      const r=record('d2l-ddp',p,`const localSums=Array(world).fill(0);
for(let micro=0;micro<microbatches;micro++){
  for(let rank=0;rank<world;rank++){
    const gradient=rank+1;
    localSums[rank]+=scaling==='correct'?gradient/microbatches:gradient;
  }
}
const reduced=sum(localSums)/world;
const reference=(world+1)/2;
const nextWeight=-0.1*reduced;`);
      const localSums=Array(p.world).fill(0);r.add(1,'DDP默认同步梯度，数据仍需自行分片','各rank的微批梯度固定为rank+1，便于把缩放问题从模型计算中单独拿出来。',{localSums:copy(localSums),world:p.world},flow('进程',[['world_size',p.world,false],['参数副本','每rank一份',false]]));
      r.add(2,'累积时先明确最终平均目标','每rank微批大小相同；前几次可用no_sync避免多余同步，最后一次才同步。',{microbatches:p.microbatches},flow('同步约定',[['前m−1次','no_sync 内前向+反向',false],['最后一次','梯度同步',true]]));
      for(let micro=0;micro<p.microbatches;micro++){
        for(let rank=0;rank<p.world;rank++)localSums[rank]+=p.scaling==='correct'?(rank+1)/p.microbatches:rank+1;
        r.add(5,'累积微批 '+(micro+1),'没有正确缩放时，微批越多会把有效更新倍数一并放大。',{micro:micro+1,localSums:copy(localSums),synced:micro===p.microbatches-1},bars('各rank已累积梯度',localSums.map((x,i)=>['rank'+i,x])));
      }
      const reduced=sum(localSums)/p.world,reference=(p.world+1)/2;r.add(8,'只在最后合并等大小rank','本模型展示平均语义。真实Gloo/NCCL运行由配套脚本单独记录；CPU多进程不等于多GPU。',{reduced,reference},bars('全局梯度',[['本次',reduced],['参照',reference]]));
      const nextWeight=-.1*reduced;r.add(10,'所有副本应用同一个更新','更新后再清零梯度；保存时还需保存优化器与采样器状态。',{nextWeight,error:reduced-reference},bars('共享更新',[['新权重',nextWeight]]));return r.end({localSums,reduced,reference,nextWeight,error:reduced-reference});
    });

  };
});
