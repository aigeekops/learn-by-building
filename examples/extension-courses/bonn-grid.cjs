'use strict';
const H={};
const p={"occupied":0.75,"hits":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 从未知开始
Object.assign(s, ((s,p)=>({prior:.5,priorLogOdds:0}))(s, p));
// 把逆传感器概率转成对数几率
Object.assign(s, ((s,p)=>({increment:Math.log(p.occupied/(1-p.occupied))}))(s, p));
// 累积条件独立的命中
Object.assign(s, ((s,p)=>({history:Array.from({length:p.hits+1},(_,k)=>k*s.increment),logOdds:p.hits*s.increment}))(s, p));
// 还原概率
Object.assign(s, ((s,p)=>({probability:1/(1+Math.exp(-s.logOdds))}))(s, p));
console.log(JSON.stringify(s,null,2));
