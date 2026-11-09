/* Original finite computations for the map's mathematics and ML courses.
 * Every displayed line is recorded after its calculation; no random data,
 * network, model inference, browser storage or learning-record writes. */
(function(root,factory){
  const register=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=register;
  else register(root.AICourseModels);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const range=(id,label,min,max,step,value)=>({id,label,type:'range',min,max,step,value});
  const choice=(id,label,options,value)=>({id,label,type:'select',options,value});
  const sum=a=>a.reduce((s,x)=>s+x,0),dot=(a,b)=>sum(a.map((x,i)=>x*b[i]));
  const bars=(title,rows)=>({kind:'bars',title,rows:rows.map(([label,value])=>({label,value}))});
  const flow=(title,rows)=>({kind:'flow',title,nodes:rows.map(([label,detail])=>({label,detail:typeof detail==='string'?detail:JSON.stringify(detail),active:true}))});
  const clone=x=>JSON.parse(JSON.stringify(x));
  function record(model,p,code){const steps=[];return {
    add(line,title,detail,variables,visual){steps.push(clone({line,title,detail,variables,visual}));},
    end(result){return {model,params:p,code:code.split('\n'),steps,result:clone(result)};}
  };}
  const choose=(n,k)=>{if(k<0||k>n)return 0;let c=1;for(let i=1;i<=Math.min(k,n-k);i++)c=c*(n-i+1)/i;return c;};
  return function register(M){
    M.register('linear-vectors',[range('x','向量横坐标',-3,3,1,2),range('y','向量纵坐标',-3,3,1,1)],p=>{
      const r=record('linear-vectors',p,`const columns=[[1,1],[1,-1]],x=[p.x,p.y];
const first=columns[0].map(v=>v*x[0]);
const second=columns[1].map(v=>v*x[1]);
const output=first.map((v,i)=>v+second[i]);
const squaredNorm=dot(output,output);`);
      const columns=[[1,1],[1,-1]],x=[p.x,p.y];r.add(1,'把矩阵看成两根列向量','x的两个系数决定各取多少列；坐标与列的顺序对应。',{columns,x},flow('矩阵与输入',[['列1',columns[0]],['列2',columns[1]],['系数',x]]));
      const first=columns[0].map(v=>v*x[0]);r.add(2,'缩放第一列','负系数会反向，零系数会得到零向量。',{columns,x,first},flow('第一份贡献',[['x₁a₁',first]]));
      const second=columns[1].map(v=>v*x[1]);r.add(3,'缩放第二列','两份贡献仍是二维向量，还不能当作总结果。',{columns,x,first,second},flow('两份贡献',[['x₁a₁',first],['x₂a₂',second]]));
      const output=first.map((v,i)=>v+second[i]);r.add(4,'按同一坐标相加','本例A x=[x₁+x₂,x₁−x₂]，不是逐元素乘矩阵。',{columns,x,first,second,output},bars('输出坐标',output.map((v,i)=>['坐标'+(i+1),v])));
      const squaredNorm=dot(output,output);r.add(5,'用行点积和长度再核对','两种视角应得到同一输出；平方长度非负。',{columns,x,output,squaredNorm},bars('坐标与平方长度',[['横',output[0]],['纵',output[1]],['平方长度',squaredNorm]]));return r.end({columns,x,first,second,output,squaredNorm});
    });
    M.register('linear-elimination',[choice('kind','第二条方程',[['unique','x−y=0'],['many','2x+2y=4'],['none','2x+2y=5']],'unique')],p=>{
      const r=record('linear-elimination',p,`const A=p.kind==='unique'?[[1,1],[1,-1]]:[[1,1],[2,2]];
const b=[2,p.kind==='unique'?0:p.kind==='many'?4:5];
const factor=A[1][0]/A[0][0];
const row=[A[1][1]-factor*A[0][1],b[1]-factor*b[0]];
const status=row[0]!==0?'unique':row[1]===0?'many':'none';
const solution=status==='unique'?[(b[0]-row[1]/row[0]),row[1]/row[0]]:null;`);
      const A=p.kind==='unique'?[[1,1],[1,-1]]:[[1,1],[2,2]];r.add(1,'先列系数矩阵','第一式固定为x+y=2；系数相依与否要经过消元检查。',{A},flow('两行系数',A.map((x,i)=>['行'+(i+1),x])));
      const b=[2,p.kind==='unique'?0:p.kind==='many'?4:5];r.add(2,'把右端也写进增广矩阵','只改变左侧而忘记右端，会改变解集。',{A,b},flow('增广行',A.map((x,i)=>['行'+(i+1),[...x,b[i]]])));
      const factor=A[1][0]/A[0][0];r.add(3,'算出要减几倍第一行','本例首主元为1，不需要换行；一般消元须选主元。',{factor},bars('消元倍数',[['倍数',factor]]));
      const row=[A[1][1]-factor*A[0][1],b[1]-factor*b[0]];r.add(4,'第二行减去倍数行','得到0·x+row[0]·y=row[1]；0=0与0=1含义不同。',{A,b,row},flow('新第二行',[['系数与右端',[0,...row]]]));
      const status=row[0]!==0?'unique':row[1]===0?'many':'none';r.add(5,'区分唯一解、多解和无解','有自由变量不代表无解；只有矛盾行才无解。',{row,status,rankA:status==='unique'?2:1,rankAugmented:status==='none'?2:status==='unique'?2:1},flow('解的类型',[['状态',status]]));
      const solution=status==='unique'?[b[0]-row[1]/row[0],row[1]/row[0]]:null;r.add(6,'能回代时才给唯一向量','多解时可写[x,y]=[2−t,t]；无解时不伪造坐标。',{status,solution},flow('结果',[['解',solution===null?'没有唯一解向量':solution]]));return r.end({A,b,row,status,solution});
    });
    M.register('linear-composition',[range('scale','横向缩放倍数',0,3,.5,2)],p=>{
      const r=record('linear-composition',p,`const x=[1,1];
const scaled=[p.scale*x[0],x[1]];
const rotateAfterScale=[-scaled[1],scaled[0]];
const rotated=[-x[1],x[0]];
const scaleAfterRotate=[p.scale*rotated[0],rotated[1]];`);
      const x=[1,1];r.add(1,'同一输入比较两个顺序','列向量约定：R S x先做S，再做R。R为逆时针90度旋转。',{x},flow('输入',[['x',x]]));
      const scaled=[p.scale*x[0],x[1]];r.add(2,'先沿横轴缩放','纵坐标保持不变；零倍缩放会丢失横向信息。',{x,scaled},flow('S x',[['缩放结果',scaled]]));
      const rotateAfterScale=[-scaled[1],scaled[0]];r.add(3,'随后旋转','旋转[x,y]变成[−y,x]。',{x,scaled,rotateAfterScale},flow('R S x',[['先缩放后旋转',rotateAfterScale]]));
      const rotated=[-x[1],x[0]];r.add(4,'回到同一输入，先旋转','第二条路径从原始x重新开始，不沿用第一条路径的结果。',{x,rotated},flow('R x',[['旋转结果',rotated]]));
      const scaleAfterRotate=[p.scale*rotated[0],rotated[1]];r.add(5,'再沿世界横轴缩放','默认2倍时两结果分别是[−1,2]、[−2,1]；矩阵乘法一般不可交换。',{x,rotateAfterScale,scaleAfterRotate},flow('两种组合',[['R S x',rotateAfterScale],['S R x',scaleAfterRotate]]));return r.end({x,scaled,rotated,rotateAfterScale,scaleAfterRotate});
    });
    M.register('linear-projection',[range('x','待投影横坐标',-3,4,1,2),range('y','待投影纵坐标',-3,4,1,0),choice('basis','方向向量',[['diagonal','[1,1]'],['zero','[0,0]：无效方向']],'diagonal')],p=>{
      const r=record('linear-projection',p,`const b=[p.x,p.y],a=p.basis==='zero'?[0,0]:[1,1];
const denominator=dot(a,a);
if(denominator===0)return {status:'invalid_direction',projection:null};
const coefficient=dot(a,b)/denominator;
const projection=a.map(x=>coefficient*x);
const residual=b.map((x,i)=>x-projection[i]);
const orthogonality=dot(a,residual);`);
      const b=[p.x,p.y],a=p.basis==='zero'?[0,0]:[1,1];r.add(1,'先定点和投影直线','方向a的全部倍数组成一条过原点的直线。',{a,b},flow('输入',[['方向',a],['目标',b]]));
      const denominator=dot(a,a);r.add(2,'检查方向有没有长度','零向量不能定义投影直线，不能除以零。',{a,b,denominator},bars('aᵀa',[['平方长度',denominator]]));
      if(denominator===0){r.add(3,'拒绝无效方向','结果保持未知，换一个非零方向后重新计算。',{status:'invalid_direction',projection:null},flow('停止',[['原因','方向向量为零']]));return r.end({status:'invalid_direction',a,b,projection:null,residual:null,coefficient:null});}
      const coefficient=dot(a,b)/denominator;r.add(4,'沿a取最合适的倍数','系数不是投影向量本身；它可能为负。',{a,b,coefficient},bars('投影系数',[['系数',coefficient]]));
      const projection=a.map(x=>coefficient*x);r.add(5,'得到线上的最近点','投影仍有两个坐标。',{a,b,projection,coefficient},flow('最近点',[['投影',projection]]));
      const residual=b.map((x,i)=>x-projection[i]);r.add(6,'把目标减去投影','残差指向目标；默认输入残差为[1,−1]。',{a,b,projection,residual},flow('分解',[['投影',projection],['残差',residual]]));
      const orthogonality=dot(a,residual);r.add(7,'核对残差与方向垂直','aᵀ残差应为0；这是最小二乘的几何条件。',{a,b,projection,residual,orthogonality},bars('正交检查',[['aᵀ残差',orthogonality]]));return r.end({status:'ok',a,b,coefficient,projection,residual,orthogonality});
    });
    M.register('linear-least-squares',[range('last','第三个观测值',0,6,1,2)],p=>{
      const r=record('linear-least-squares',p,`const x=[0,1,2],y=[1,2,p.last];
const mx=sum(x)/3,my=sum(y)/3;
const numerator=sum(x.map((v,i)=>(v-mx)*(y[i]-my))),denominator=sum(x.map(v=>(v-mx)**2));
const slope=numerator/denominator,intercept=my-slope*mx;
const predictions=x.map(v=>intercept+slope*v),residual=y.map((v,i)=>v-predictions[i]);
const sse=dot(residual,residual),normalResidual=[sum(residual),dot(x,residual)];`);
      const x=[0,1,2],y=[1,2,p.last];r.add(1,'三点通常不能被直线同时穿过','只拟合一条有截距的直线，不要求残差全为零。',{x,y},flow('观测',[['x',x],['y',y]]));
      const mx=sum(x)/3,my=sum(y)/3;r.add(2,'先求中心','中心化后斜率和截距可以分开计算。',{x,y,mx,my},bars('均值',[['x均值',mx],['y均值',my]]));
      const numerator=sum(x.map((v,i)=>(v-mx)*(y[i]-my))),denominator=sum(x.map(v=>(v-mx)**2));r.add(3,'累计协变项与横坐标平方','本例x不全相同，分母为2。',{numerator,denominator},bars('斜率的两部分',[['分子',numerator],['分母',denominator]]));
      const slope=numerator/denominator,intercept=my-slope*mx;r.add(4,'求出拟合参数','默认斜率0.5、截距7/6；这是一组观测上的最小二乘解。',{slope,intercept},bars('参数',[['斜率',slope],['截距',intercept]]));
      const predictions=x.map(v=>intercept+slope*v),residual=y.map((v,i)=>v-predictions[i]);r.add(5,'回到每条观测看误差','观察点、拟合点和残差用相同一组数绘制。',{x,y,predictions,residual},bars('逐点残差',residual.map((v,i)=>['点'+i,v])));
      const sse=dot(residual,residual),normalResidual=[sum(residual),dot(x,residual)];r.add(6,'核对法方程的正交条件','含截距时残差和、x与残差点积均约为0；这是数值校验，不代表泛化。',{x,y,predictions,residual,sse,normalResidual},bars('独立检查',[['SSE',sse],['Σ残差',normalResidual[0]],['xᵀ残差',normalResidual[1]]]));return r.end({x,y,slope,intercept,predictions,residual,sse,normalResidual});
    });
    M.register('linear-eigen',[range('iterations','矩阵作用次数',1,6,1,3),range('initial','初始第二坐标',-2,2,1,1)],p=>{
      const r=record('linear-eigen',p,`const A=[[2,0],[0,0.5]];
let vector=[1,p.initial];
for(let k=0;k<p.iterations;k++)vector=[2*vector[0],0.5*vector[1]];
const eigenCheck=[2*1,0.5*0];
const direction=vector.map(v=>v/Math.hypot(...vector));`);
      const A=[[2,0],[0,.5]];r.add(1,'固定线性变换','两个坐标轴分别是特征方向；对应倍数为2和0.5。',{A},flow('特征对',[['横轴','λ=2'],['纵轴','λ=0.5']]));
      let vector=[1,p.initial];r.add(2,'记录起始向量','一般向量含多个特征方向分量，并不都是特征向量。',{vector,iteration:0},flow('初始',[['向量',vector]]));
      for(let k=0;k<p.iterations;k++){vector=[2*vector[0],.5*vector[1]];r.add(3,'第'+(k+1)+'次作用','横向翻倍、纵向减半；只有大小与相对分量变化，没有平移。',{vector,iteration:k+1},bars('当前向量',[['横',vector[0]],['纵',vector[1]]]));}
      const eigenCheck=[2*1,.5*0];r.add(4,'单独检验一条特征方向','A[1,0]=2[1,0]，方向不变。',{eigenCheck},flow('特征关系',[['A e₁',eigenCheck],['2 e₁',[2,0]]]));
      const direction=vector.map(v=>v/Math.hypot(...vector));r.add(5,'把长度和方向分开报告','本例初始向量含横向分量，方向逐渐靠近主特征方向；不是任意矩阵都满足这一行为。',{vector,direction},bars('单位方向',[['横',direction[0]],['纵',direction[1]]]));return r.end({A,vector,direction,eigenCheck});
    });
    M.register('probability-binomial',[range('n','独立试验次数',1,10,1,4),range('prob','每次成功概率',0,1,.1,.5)],p=>{
      const r=record('probability-binomial',p,`const n=p.n,q=p.prob;
const counts=Array.from({length:n+1},(_,k)=>choose(n,k));
const masses=counts.map((c,k)=>c*q**k*(1-q)**(n-k));
const total=sum(masses);
const expectation=sum(masses.map((mass,k)=>mass*k));`);
      const n=p.n,q=p.prob;r.add(1,'把抽样假设写明','各次独立、成功概率相同。相关试验不能直接套二项分布。',{n,q},flow('条件',[['次数',n],['每次成功率',q]]));
      const counts=Array.from({length:n+1},(_,k)=>choose(n,k));r.add(2,'数恰好k次成功的不同位置','例如4次中2次成功有6种排列，不是只有一种。',{counts},bars('组合数',counts.map((v,k)=>[k+'次成功',v])));
      const masses=counts.map((c,k)=>c*q**k*(1-q)**(n-k));r.add(3,'每种排列概率乘上排列数','边界q=0或1也有效，0次幂按1处理。',{masses},bars('二项分布',masses.map((v,k)=>[String(k),v])));
      const total=sum(masses);r.add(4,'先核对总概率','所有可能成功次数覆盖整个样本空间，和应约为1。',{masses,total},bars('概率总和',[['合计',total]]));
      const expectation=sum(masses.map((mass,k)=>mass*k));r.add(5,'按概率加权成功次数','期望等于nq，不要求是整数，也不是一次试验结果。',{masses,expectation,formula:n*q},bars('两种求期望方法',[['加权和',expectation],['nq',n*q]]));return r.end({n,q,counts,masses,total,expectation});
    });
    M.register('probability-bayes',[range('prior','次品比例',.01,.5,.01,.1),range('sensitivity','次品报警率',.5,1,.05,.9),range('falsePositive','良品误报率',0,.5,.05,.1)],p=>{
      const r=record('probability-bayes',p,`const defectiveAlarm=p.prior*p.sensitivity;
const goodAlarm=(1-p.prior)*p.falsePositive;
const evidence=defectiveAlarm+goodAlarm;
const posterior=defectiveAlarm/evidence;
const odds=posterior/(1-posterior);`);
      const defectiveAlarm=p.prior*p.sensitivity;r.add(1,'沿次品分支算报警份额','虚构零件检测模型；先验乘条件概率得到联合概率。',{defectiveAlarm,prior:p.prior,sensitivity:p.sensitivity},bars('次品且报警',[['份额',defectiveAlarm]]));
      const goodAlarm=(1-p.prior)*p.falsePositive;r.add(2,'把良品误报也算进去','报警集合同时包含次品和良品。',{defectiveAlarm,goodAlarm},bars('报警来自两条分支',[['次品报警',defectiveAlarm],['良品报警',goodAlarm]]));
      const evidence=defectiveAlarm+goodAlarm;r.add(3,'求报警总概率','分母不能只写次品报警；本控件范围保证分母为正。',{defectiveAlarm,goodAlarm,evidence},bars('总报警份额',[['合计',evidence]]));
      const posterior=defectiveAlarm/evidence;r.add(4,'限制在已报警集合内归一化','默认0.09/(0.09+0.09)=0.5，报警率0.9并非后验概率。',{posterior,defectiveAlarm,goodAlarm},bars('报警后的次品概率',[['P(次品|报警)',posterior]]));
      // Infinite odds are meaningful but the reader only accepts finite numbers.
      const odds=posterior===1?null:posterior/(1-posterior);r.add(5,'明确边界含义','无误报时后验为1，赔率为无穷，本例用文字说明而不显示伪造有限值。',{posterior,odds,oddsStatus:posterior===1?'infinite':'finite'},flow('结果',[['后验',posterior],['赔率',odds===null?'无穷':odds]]));return r.end({defectiveAlarm,goodAlarm,evidence,posterior,odds});
    });
    M.register('probability-moments',[range('high','第三种结果',2,8,1,4)],p=>{
      const r=record('probability-moments',p,`const values=[0,2,p.high],mass=[0.25,0.5,0.25];
const expectation=dot(values,mass);
const deviations=values.map(v=>v-expectation);
const contributions=deviations.map((v,i)=>mass[i]*v*v);
const variance=sum(contributions),secondMoment=dot(values.map(v=>v*v),mass);`);
      const values=[0,2,p.high],mass=[.25,.5,.25];r.add(1,'列出有限分布','概率来自给定模型，不从一次观测猜出来。',{values,mass},bars('各结果的概率',mass.map((v,i)=>[String(values[i]),v])));
      const expectation=dot(values,mass);r.add(2,'按概率求平均','默认期望为2；期望可能不是最常出现的数。',{values,mass,expectation},bars('期望贡献',values.map((v,i)=>[String(v),v*mass[i]])));
      const deviations=values.map(v=>v-expectation);r.add(3,'计算距期望的偏差','偏差有正有负，直接求平均会相互抵消。',{values,mass,expectation,deviations},bars('有符号偏差',deviations.map((v,i)=>['结果'+i,v])));
      const contributions=deviations.map((v,i)=>mass[i]*v*v);r.add(4,'平方后再按概率加权','方差的单位是原单位的平方，不能与原读数直接相加。',{contributions},bars('方差贡献',contributions.map((v,i)=>['结果'+i,v])));
      const variance=sum(contributions),secondMoment=dot(values.map(v=>v*v),mass);r.add(5,'用第二种公式检查','Var(X)=E[X²]−E[X]²，默认方差为2。',{expectation,variance,secondMoment,check:secondMoment-expectation**2},bars('方差两种复算',[['偏差平方',variance],['二阶矩公式',secondMoment-expectation**2]]));return r.end({values,mass,expectation,variance,secondMoment});
    });
    M.register('probability-mle',[range('successes','十次观测的成功数',0,10,1,7)],p=>{
      const r=record('probability-mle',p,`const n=10,k=p.successes;
const estimate=k/n;
const candidates=[0.2,0.5,0.7,0.9];
const likelihood=candidates.map(q=>q**k*(1-q)**(n-k));
const best=candidates[likelihood.indexOf(Math.max(...likelihood))];`);
      const n=10,k=p.successes;r.add(1,'固定已观测数据','观测是一段给定的成功失败序列；本例不随机采样。',{n,k},bars('观测计数',[['成功',k],['失败',n-k]]));
      const estimate=k/n;r.add(2,'在Bernoulli模型下估参数','极大似然估计为成功频率；边界全失败为0、全成功为1。',{estimate},bars('连续参数的最优点',[['q̂',estimate]]));
      const candidates=[.2,.5,.7,.9];r.add(3,'另列四个可比较候选','有限候选只用于看似然曲线，不把网格最佳误称精确估计。',{candidates},bars('候选成功概率',candidates.map(v=>[String(v),v])));
      const likelihood=candidates.map(q=>q**k*(1-q)**(n-k));r.add(4,'把数据固定、参数当变量','这里算指定序列的似然，省略与q无关的组合因子。似然不需要对q求和为1。',{candidates,likelihood},bars('序列似然',likelihood.map((v,i)=>[String(candidates[i]),v])));
      const best=candidates[likelihood.indexOf(Math.max(...likelihood))];r.add(5,'报告点估计与有限网格最佳','点估计没有描述不确定性；只有十次试验不能证明真实q正好等于q̂。',{estimate,best,candidates,likelihood},flow('两种结果',[['连续估计',estimate],['候选中最佳',best]]));return r.end({n,k,estimate,candidates,likelihood,best});
    });
    M.register('probability-interval',[range('n','样本量',4,100,4,16),range('mean','样本均值',-2,2,.25,0)],p=>{
      const r=record('probability-interval',p,`const sigma=2;
const standardError=sigma/Math.sqrt(p.n);
const margin=1.959963984540054*standardError;
const interval=[p.mean-margin,p.mean+margin];
const width=2*margin;`);
      const sigma=2;r.add(1,'先固定适用条件','独立同分布正态样本、总体标准差已知为2。未知σ时不能照搬这个z区间。',{sigma,n:p.n,mean:p.mean},flow('模型条件',[['已知σ',sigma],['n',p.n],['样本均值',p.mean]]));
      const standardError=sigma/Math.sqrt(p.n);r.add(2,'区分样本散布与均值误差','σ不随样本量改变，均值的标准误按1/√n缩小。',{standardError,sigma},bars('两种标准差',[['单次观测',sigma],['均值',standardError]]));
      const margin=1.959963984540054*standardError;r.add(3,'用95%正态分位数扩出误差界','1.96是双侧95%对应的近似分位数，不是随意倍数。',{margin,standardError},bars('半宽',[['误差界',margin]]));
      const interval=[p.mean-margin,p.mean+margin];r.add(4,'以观测均值为中心给出区间','频率学解释是重复抽样程序约95%的区间覆盖固定真均值，不说本区间有95%后验概率。',{interval,mean:p.mean},flow('95%区间',[['下端',interval[0]],['中心',p.mean],['上端',interval[1]]]));
      const width=2*margin;r.add(5,'比较改样本量后的宽度','样本量扩大4倍，区间宽度减半；页面不产生新的实测样本。',{interval,mean:p.mean,width},bars('区间宽度',[['宽度',width]]));return r.end({sigma,standardError,margin,interval,width});
    });
    M.register('probability-test',[range('k','十次抛币正面数',0,10,1,9),range('alpha','预设显著性水平',.01,.1,.01,.05)],p=>{
      const r=record('probability-test',p,`const n=10,observed=p.k;
const masses=Array.from({length:11},(_,k)=>choose(n,k)/2**n);
const extreme=masses.map((_,k)=>Math.abs(k-5)>=Math.abs(observed-5));
const pvalue=sum(masses.filter((_,k)=>extreme[k]));
const reject=pvalue<=p.alpha;`);
      const n=10,observed=p.k;r.add(1,'先规定零假设与统计量','H₀为独立公平抛币，统计量是距5次正面的绝对偏离；双侧规则在看结果前规定。',{n,observed,alpha:p.alpha},flow('检验设定',[['H₀','q=0.5'],['观察正面数',observed]]));
      const masses=Array.from({length:11},(_,k)=>choose(n,k)/2**n);r.add(2,'在零假设下列出所有结果','这里精确枚举二项分布，不用正态近似。',{masses},bars('H₀下概率',masses.map((v,k)=>[String(k),v])));
      const extreme=masses.map((_,k)=>Math.abs(k-5)>=Math.abs(observed-5));r.add(3,'挑出至少同样极端的结果','包含观测点本身，且同时计入对称另一尾。',{masses,extreme,observed},bars('计入双尾的概率',masses.map((v,k)=>[String(k),extreme[k]?v:0])));
      const pvalue=sum(masses.filter((_,k)=>extreme[k]));r.add(4,'把双尾概率相加','p值是给定H₀后的结果概率，不是H₀为真的概率。默认22/1024。',{masses,extreme,pvalue},bars('精确p值',[['p',pvalue]]));
      const reject=pvalue<=p.alpha;r.add(5,'与预设阈值比较','不拒绝不等于证明公平；拒绝也不报告真实偏差大小。',{pvalue,alpha:p.alpha,reject},flow('决定',[['结论',reject?'拒绝H₀':'未拒绝H₀']]));return r.end({n,observed,masses,extreme,pvalue,reject});
    });
    M.register('cs229-gradient',[range('rate','学习率',0,1,.1,.2),range('iterations','更新次数',1,8,1,4)],p=>{
      const r=record('cs229-gradient',p,`const x=[1,2],y=[2,4];
let weight=0,history=[];
for(let step=0;step<p.iterations;step++){
  const loss=sum(x.map((v,i)=>(weight*v-y[i])**2))/4;
  const gradient=sum(x.map((v,i)=>v*(weight*v-y[i])))/2;
  const next=weight-p.rate*gradient;
  history.push({step,weight,loss,gradient,next});weight=next;
}
const finalLoss=sum(x.map((v,i)=>(weight*v-y[i])**2))/4;`);
      const x=[1,2],y=[2,4];r.add(1,'先固定模型与损失','只拟合无截距直线；目标是平均平方误差的一半，不是分类准确率。',{x,y},flow('两条训练数据',[['x',x],['y',y]]));
      let weight=0,history=[];r.add(2,'从同一初值开始','改变学习率后从0重新计算，避免把两次训练混在一条轨迹中。',{weight,history},bars('初始参数',[['w',weight]]));
      for(let step=0;step<p.iterations;step++){
        const loss=sum(x.map((v,i)=>(weight*v-y[i])**2))/4;r.add(4,'第'+(step+1)+'轮：先看当前损失','损失属于更新前的权重。',{step,weight,loss,history},bars('当前损失',[['J(w)',loss]]));
        const gradient=sum(x.map((v,i)=>v*(weight*v-y[i])))/2;r.add(5,'求导得到坡度','本例梯度为2.5(w−2)，方向随w的位置变化。',{step,weight,loss,gradient},bars('当前坡度',[['梯度',gradient]]));
        const next=weight-p.rate*gradient;r.add(6,'沿负梯度更新','学习率过大可发散，本控件保留失败现象，不强行画成下降。',{step,weight,gradient,next},bars('更新前后',[['旧w',weight],['新w',next]]));
        history.push({step,weight,loss,gradient,next});weight=next;r.add(7,'把本轮值写进轨迹','下一轮从新权重开始；不是每帧重新训练。',{step,weight,history},bars('历轮权重',history.map(h=>['第'+(h.step+1)+'轮',h.next])));
      }
      const finalLoss=sum(x.map((v,i)=>(weight*v-y[i])**2))/4;r.add(9,'重新评估最终权重','学习率稳定区间为0<η<0.8；训练损失下降不证明测试集效果。',{weight,finalLoss,history},bars('最终结果',[['w',weight],['J(w)',finalLoss]]));return r.end({x,y,weight,finalLoss,history});
    });
    M.register('cs229-logistic',[range('score','模型分数z',-6,6,.5,2),choice('label','真实标签',[[0,'0'],[1,'1']],1)],p=>{
      const r=record('cs229-logistic',p,`const probability=1/(1+Math.exp(-p.score));
const label=Number(p.label);
const loss=Math.max(p.score,0)-label*p.score+Math.log1p(Math.exp(-Math.abs(p.score)));
const gradient=probability-label;
const prediction=Number(probability>=0.5);`);
      const probability=1/(1+Math.exp(-p.score));r.add(1,'把实数分数映到0和1之间','sigmoid输出模型对标签1的概率估计，不保证校准。',{score:p.score,probability},bars('预测分布',[['P(y=1)',probability],['P(y=0)',1-probability]]));
      const label=Number(p.label);r.add(2,'分清预测与真实标签','标签来自给定样例，不能因为模型高置信就改标签。',{label,probability},flow('监督信号',[['标签',label],['预测概率',probability]]));
      const loss=Math.max(p.score,0)-label*p.score+Math.log1p(Math.exp(-Math.abs(p.score)));r.add(3,'计算负对数似然','使用数值稳定的softplus形式；预测错且越自信，损失越大。',{label,probability,loss},bars('单样本损失',[['交叉熵',loss]]));
      const gradient=probability-label;r.add(4,'对分数求导','p−y给出更新方向；权重的梯度还需乘特征。',{label,probability,gradient},bars('分数梯度',[['p−y',gradient]]));
      const prediction=Number(probability>=.5);r.add(5,'最后才应用决策阈值','阈值是决策规则，调整阈值不改变这一输入的概率。',{label,probability,loss,gradient,prediction},flow('分类决定',[['阈值',.5],['预测类',prediction]]));return r.end({probability,label,loss,gradient,prediction});
    });
    M.register('cs229-ridge',[range('lambda','L2惩罚系数',0,8,1,1)],p=>{
      const r=record('cs229-ridge',p,`const x=[1,2],y=[2,4];
const xx=dot(x,x),xy=dot(x,y);
const weight=xy/(xx+p.lambda);
const predictions=x.map(v=>v*weight);
const fitLoss=sum(predictions.map((v,i)=>(v-y[i])**2))/2,penalty=p.lambda*weight**2/2;
const gradient=xx*weight-xy+p.lambda*weight;`);
      const x=[1,2],y=[2,4];r.add(1,'固定损失的缩放约定','J=1/2Σ(wx−y)²+λw²/2，本例没有截距。使用平均损失时λ的尺度要相应调整。',{x,y,lambda:p.lambda},flow('输入',[['x',x],['y',y]]));
      const xx=dot(x,x),xy=dot(x,y);r.add(2,'汇总拟合所需统计量','Σx²=5，Σxy=10；不是凭图猜一条直线。',{xx,xy},bars('累计项',[['Σx²',xx],['Σxy',xy]]));
      const weight=xy/(xx+p.lambda);r.add(3,'解出带惩罚的最优权重','λ越大权重越向0收缩；λ=0回到普通最小二乘。',{weight,lambda:p.lambda},bars('权重',[['未惩罚',2],['当前',weight]]));
      const predictions=x.map(v=>v*weight);r.add(4,'回到数据看欠拟合代价','较小权重会带来更大训练误差；不能据此直接断言测试误差更好。',{predictions},bars('预测',predictions.map((v,i)=>['样本'+i,v])));
      const fitLoss=sum(predictions.map((v,i)=>(v-y[i])**2))/2,penalty=p.lambda*weight**2/2;r.add(5,'把拟合项与惩罚分开','选择λ需要独立验证数据；训练目标最小并非训练误差最小。',{fitLoss,penalty,weight},bars('目标分解',[['拟合项',fitLoss],['惩罚项',penalty]]));
      const gradient=xx*weight-xy+p.lambda*weight;r.add(6,'核对驻点条件','本例凸二次目标的梯度约为0，因此是全局最小点。',{gradient,weight,fitLoss,penalty},bars('目标梯度',[['dJ/dw',gradient]]));return r.end({x,y,weight,predictions,fitLoss,penalty,gradient});
    });
    M.register('cs229-validation',[choice('selection','选择模型使用哪份数据',[['validation','独立验证集'],['training','训练集']],'validation')],p=>{
      const r=record('cs229-validation',p,`const train={x:[0,1,2],y:[0,1,0]},validation={x:[0.5,1.5],y:[0.4,0.4]};
const models={constant:x=>1/3,curve:x=>x*(2-x)};
const mse=(model,data)=>sum(data.x.map((x,i)=>(model(x)-data.y[i])**2))/data.x.length;
const scores=Object.entries(models).map(([name,model])=>({name,training:mse(model,train),validation:mse(model,validation)}));
const key=p.selection==='training'?'training':'validation';
const selected=scores.reduce((a,b)=>b[key]<a[key]?b:a).name;`);
      const train={x:[0,1,2],y:[0,1,0]},validation={x:[.5,1.5],y:[.4,.4]};r.add(1,'训练与验证先分开','原创小表固定划分。这里只演示模型选择，独立最终测试集尚未使用，也没有生成测试成绩。',{train,validation},flow('分区',[['训练',train],['验证',validation]]));
      const models={constant:x=>1/3,curve:x=>x*(2-x)};r.add(2,'只用训练样本得到候选','常数为训练均值1/3，二次曲线穿过三个训练点；没有用验证标签拟合。',{definitions:{constant:'1/3',curve:'x(2−x)'}},flow('候选',[['常数','训练均值'],['曲线','三点插值']]));
      const mse=(model,data)=>sum(data.x.map((x,i)=>(model(x)-data.y[i])**2))/data.x.length;r.add(3,'统一使用均方误差','比较必须使用相同单位与样本口径。',{metric:'mean_squared_error'},flow('度量',[['MSE','平方误差之和 / 样本数']]));
      const scores=Object.entries(models).map(([name,model])=>({name,training:mse(model,train),validation:mse(model,validation)}));r.add(4,'训练与验证各算一遍','曲线训练误差为0，但验证误差更高。',{scores},bars('两份数据的MSE',scores.flatMap(s=>[[s.name+'·训练',s.training],[s.name+'·验证',s.validation]])));
      const key=p.selection==='training'?'training':'validation';r.add(5,'明确模型选择准则','控件可切换错误做法，看只按训练误差选择会发生什么。',{key,scores},flow('准则',[['当前按',key]]));
      const selected=scores.reduce((a,b)=>b[key]<a[key]?b:a).name;r.add(6,'选定后仍需独立测试','反复用同一验证集调参也会过拟合；不能把已用于选择的分数称为最终无偏测试。',{selected,scores},flow('选择',[['模型',selected],['最终测试','尚未评估']]));return r.end({train,validation,scores,selected,testScore:null});
    });
    M.register('cs229-kmeans',[range('iterations','交替更新轮数',1,5,1,2),choice('initial','初始中心',[['apart','[0,10]'],['same','[0,0]：含空簇']],'apart')],p=>{
      const r=record('cs229-kmeans',p,`const points=[0,1,9,10];
let centers=p.initial==='same'?[0,0]:[0,10],history=[];
for(let step=0;step<p.iterations;step++){
  const assignments=points.map(x=>Math.abs(x-centers[0])<=Math.abs(x-centers[1])?0:1);
  const next=centers.map((old,j)=>{const group=points.filter((_,i)=>assignments[i]===j);return group.length?sum(group)/group.length:old;});
  const sse=sum(points.map((x,i)=>(x-next[assignments[i]])**2));
  history.push({step,centers:[...centers],assignments,next,sse});centers=next;
}
const assignments=points.map(x=>Math.abs(x-centers[0])<=Math.abs(x-centers[1])?0:1);`);
      const points=[0,1,9,10];r.add(1,'无标签的四个一维点','簇编号是算法内部标号，不是已知类别名称。',{points},bars('观测位置',points.map((v,i)=>['点'+i,v])));
      let centers=p.initial==='same'?[0,0]:[0,10],history=[];r.add(2,'固定可复现初值','距离并列归到簇0；空簇保留旧中心，策略明确而不除以零。',{points,centers},bars('初始中心',centers.map((v,i)=>['簇'+i,v])));
      for(let step=0;step<p.iterations;step++){
        const assignments=points.map(x=>Math.abs(x-centers[0])<=Math.abs(x-centers[1])?0:1);r.add(4,'第'+(step+1)+'轮：指派最近中心','指派依据更新前的中心。',{points,centers,assignments},flow('分簇',points.map((x,i)=>['点'+x,'簇'+assignments[i]])));
        const next=centers.map((old,j)=>{const group=points.filter((_,i)=>assignments[i]===j);return group.length?sum(group)/group.length:old;});r.add(5,'在固定指派下求各簇均值','非空簇用均值，空簇保持原位；没有偷偷把点重新分配。',{points,centers,assignments,next},bars('新中心',next.map((v,i)=>['簇'+i,v])));
        const sse=sum(points.map((x,i)=>(x-next[assignments[i]])**2));r.add(6,'检查当前指派下的平方距离','交替更新不会保证找到全局最优，也不会自动决定k。',{points,assignments,centers:next,sse},bars('目标值',[['SSE',sse]]));
        history.push({step,centers:[...centers],assignments,next,sse});centers=next;
      }
      const assignments=points.map(x=>Math.abs(x-centers[0])<=Math.abs(x-centers[1])?0:1);r.add(9,'报告最后中心和最终指派','有限轮数用完后重新指派，不宣称已满足任意收敛标准。',{points,centers,assignments,history},flow('最终簇',centers.map((c,j)=>['簇'+j,points.filter((_,i)=>assignments[i]===j)])));return r.end({points,centers,assignments,history});
    });
    M.register('cs229-pca',[range('offset','两个坐标共同平移',0,5,1,2),range('angle','投影方向角度（度）',0,90,15,45)],p=>{
      const r=record('cs229-pca',p,`const points=[[-2,-2],[-1,-1],[1,1],[2,2]].map(row=>row.map(x=>x+p.offset));
const mean=[0,1].map(j=>sum(points.map(x=>x[j]))/points.length);
const centered=points.map(row=>row.map((x,j)=>x-mean[j]));
const covariance=[0,1].map(i=>[0,1].map(j=>sum(centered.map(x=>x[i]*x[j]))/points.length));
const direction=[Math.cos(p.angle*Math.PI/180),Math.sin(p.angle*Math.PI/180)];
const scores=centered.map(x=>dot(x,direction)),explained=sum(scores.map(x=>x*x))/points.length;
const ratio=explained/(covariance[0][0]+covariance[1][1]);`);
      const points=[[-2,-2],[-1,-1],[1,1],[2,2]].map(row=>row.map(x=>x+p.offset));r.add(1,'一组沿对角线变化的数据','两个特征单位与尺度相同；不同尺度时应先讨论是否标准化。',{points},flow('原始点',points.map((x,i)=>['点'+i,x])));
      const mean=[0,1].map(j=>sum(points.map(x=>x[j]))/points.length);r.add(2,'仅用拟合数据求中心','部署时沿用训练中心；不能用测试集均值更新预处理。',{points,mean},flow('中心',[['均值向量',mean]]));
      const centered=points.map(row=>row.map((x,j)=>x-mean[j]));r.add(3,'减去均值后讨论变化','整体平移不改变中心化结果。',{points,mean,centered},flow('中心化',centered.map((x,i)=>['点'+i,x])));
      const covariance=[0,1].map(i=>[0,1].map(j=>sum(centered.map(x=>x[i]*x[j]))/points.length));r.add(4,'计算协方差矩阵','本例统一用1/n约定，矩阵为[[2.5,2.5],[2.5,2.5]]。',{centered,covariance},flow('协方差矩阵',covariance.map((x,i)=>['行'+i,x])));
      const direction=[Math.cos(p.angle*Math.PI/180),Math.sin(p.angle*Math.PI/180)];r.add(5,'选择一个单位投影方向','45度对应最大特征值5的方向；控件也可检查其他方向损失了多少变化。',{centered,covariance,direction},flow('单位方向',[['方向',direction]]));
      const scores=centered.map(x=>dot(x,direction)),explained=sum(scores.map(x=>x*x))/points.length;r.add(6,'把每个点压成一个坐标','分数是点积，不是分类概率。',{centered,direction,scores,explained},bars('一维坐标',scores.map((v,i)=>['点'+i,v])));
      const ratio=explained/(covariance[0][0]+covariance[1][1]);r.add(7,'比较保留的方差比例','45度时保留全部方差；高保留率不等于高预测准确率，也不证明因果。',{centered,direction,scores,explained,ratio},bars('方差保留',[['方向方差',explained],['总方差',5],['比例',ratio]]));return r.end({points,mean,centered,covariance,direction,scores,explained,ratio});
    });
  };
});
