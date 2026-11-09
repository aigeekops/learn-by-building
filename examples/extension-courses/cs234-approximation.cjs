'use strict';
const H={dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0)};
const p={"alpha":0.1,"target":3};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 用特征共享参数
Object.assign(s, ((s,p)=>({features:[1,2],weights:[.5,.5]}))(s, p));
// 前向估计
Object.assign(s, ((s,p)=>({prediction:H.dot(s.features,s.weights)}))(s, p));
// 冻结目标后取半梯度
Object.assign(s, ((s,p)=>({delta:p.target-s.prediction,gradient:s.features.map(x=>(s.prediction-p.target)*x)}))(s, p));
// 更新共享权重
Object.assign(s, ((s,p)=>({updated:s.weights.map((w,i)=>w-p.alpha*s.gradient[i]),newPrediction:H.dot(s.weights.map((w,i)=>w-p.alpha*s.gradient[i]),s.features)}))(s, p));
console.log(JSON.stringify(s,null,2));
