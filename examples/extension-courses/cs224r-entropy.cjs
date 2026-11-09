'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0),
dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0)};
const p={"probability":0.5,"temperature":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 用离散动作切片解释熵正则
Object.assign(s, ((s,p)=>({probabilities:[1-p.probability,p.probability],q:[1,2]}))(s, p));
// 计算期望价值
Object.assign(s, ((s,p)=>({expectedQ:H.dot(s.probabilities,s.q)}))(s, p));
// 计算策略熵
Object.assign(s, ((s,p)=>({entropy:-H.sum(s.probabilities.map(x=>x*Math.log(x)))}))(s, p));
// 合成最大熵目标
Object.assign(s, ((s,p)=>({objective:s.expectedQ+p.temperature*s.entropy}))(s, p));
console.log(JSON.stringify(s,null,2));
