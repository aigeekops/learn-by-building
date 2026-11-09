'use strict';
const H={mean:xs=>xs.reduce((a,b)=>a+b,0)/xs.length};
const p={"weight":1,"rate":0.1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 以示范的观测动作对为监督数据
Object.assign(s, ((s,p)=>({observations:[1,2],actions:[2,4]}))(s, p));
// 计算预测和均方误差
Object.assign(s, ((s,p)=>({predicted:s.observations.map(o=>p.weight*o),errors:s.observations.map((o,i)=>p.weight*o-s.actions[i])}))(s, p));
// 明确损失归约后求导
Object.assign(s, ((s,p)=>({loss:H.mean(s.errors.map(e=>e*e))/2,gradient:H.mean(s.errors.map((e,i)=>e*s.observations[i]))}))(s, p));
// 更新并检查新的观测
Object.assign(s, ((s,p)=>({updatedWeight:p.weight-p.rate*s.gradient,heldOutAction:(p.weight-p.rate*s.gradient)*3}))(s, p));
console.log(JSON.stringify(s,null,2));
