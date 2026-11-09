'use strict';
const H={mean:xs=>xs.reduce((a,b)=>a+b,0)/xs.length};
const p={"weight":1,"rate":0.1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 声明训练样本和回合级保留集
Object.assign(s, ((s,p)=>({observations:[0,1,2],actions:[0,2,4],heldOut:[3,6]}))(s, p));
// 拟合一个线性行为策略
Object.assign(s, ((s,p)=>({errors:s.observations.map((o,i)=>p.weight*o-s.actions[i])}))(s, p));
// 只用训练数据更新
Object.assign(s, ((s,p)=>({gradient:H.mean(s.errors.map((e,i)=>e*s.observations[i])),trainingLoss:H.mean(s.errors.map(e=>e*e))/2}))(s, p));
// 更新后独立评价一次
Object.assign(s, ((s,p)=>({weight:p.weight-p.rate*s.gradient,heldOutError:(p.weight-p.rate*s.gradient)*s.heldOut[0]-s.heldOut[1]}))(s, p));
console.log(JSON.stringify(s,null,2));
