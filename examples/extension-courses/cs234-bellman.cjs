'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0)};
const p={"gamma":0.9,"success":0.8};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 列出转移的所有结果
Object.assign(s, ((s,p)=>({probabilities:[p.success,1-p.success],oldValue:1}))(s, p));
// 对转移结果求期望
Object.assign(s, ((s,p)=>({contributions:[p.success*2,(1-p.success)*p.gamma*s.oldValue]}))(s, p));
// 进行一次 Bellman 更新
Object.assign(s, ((s,p)=>({nextValue:H.sum(s.contributions)}))(s, p));
// 独立解固定点
Object.assign(s, ((s,p)=>({fixedPoint:2*p.success/(1-(1-p.success)*p.gamma),residual:Math.abs(s.nextValue-s.oldValue)}))(s, p));
console.log(JSON.stringify(s,null,2));
