'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0)};
const p={"epsilon":0.2,"draw":0.7};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先声明贪心动作和平分规则
Object.assign(s, ((s,p)=>({q:[1,3,2],greedy:1}))(s, p));
// 分配 ε-greedy 概率
Object.assign(s, ((s,p)=>({probabilities:s.q.map((_,i)=>p.epsilon/3+(i===s.greedy?1-p.epsilon:0))}))(s, p));
// 构造累计区间
Object.assign(s, ((s,p)=>({cdf:s.probabilities.map((_,i)=>H.sum(s.probabilities.slice(0,i+1)))}))(s, p));
// 选出本次动作
Object.assign(s, ((s,p)=>({action:s.cdf.findIndex(x=>p.draw<x),total:H.sum(s.probabilities)}))(s, p));
console.log(JSON.stringify(s,null,2));
