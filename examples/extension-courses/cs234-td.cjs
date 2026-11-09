'use strict';
const H={};
const p={"alpha":0.5,"gamma":0.9,"terminal":"no"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 取出一条经验
Object.assign(s, ((s,p)=>({value:1,nextValue:2,reward:0}))(s, p));
// 构造单步目标
Object.assign(s, ((s,p)=>({target:s.reward+(p.terminal==='yes'?0:p.gamma*s.nextValue)}))(s, p));
// 计算 TD 误差
Object.assign(s, ((s,p)=>({delta:s.target-s.value}))(s, p));
// 只走一步更新
Object.assign(s, ((s,p)=>({updated:s.value+p.alpha*s.delta}))(s, p));
console.log(JSON.stringify(s,null,2));
