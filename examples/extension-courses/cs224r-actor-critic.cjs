'use strict';
const H={};
const p={"gamma":0.9,"lambda":0.9};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把一条终止轨迹的奖励和值对齐
Object.assign(s, ((s,p)=>({rewards:[0,1],values:[.2,.4,0]}))(s, p));
// 先计算两个TD残差
Object.assign(s, ((s,p)=>({deltas:[p.gamma*s.values[1]-s.values[0],1-s.values[1]]}))(s, p));
// 向前累计衰减残差
Object.assign(s, ((s,p)=>({advantages:[s.deltas[0]+p.gamma*p.lambda*s.deltas[1],s.deltas[1]]}))(s, p));
// 构造价值回归目标
Object.assign(s, ((s,p)=>({targets:s.advantages.map((a,i)=>a+s.values[i])}))(s, p));
console.log(JSON.stringify(s,null,2));
