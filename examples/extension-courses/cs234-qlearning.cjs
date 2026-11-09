'use strict';
const H={};
const p={"alpha":0.5,"gamma":0.9,"method":"q"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 记录行为策略的一次转移
Object.assign(s, ((s,p)=>({q:0,reward:1,nextQ:[2,4],nextAction:0}))(s, p));
// 区分目标策略
Object.assign(s, ((s,p)=>({bootstrap:p.method==='q'?Math.max(...s.nextQ):s.nextQ[s.nextAction]}))(s, p));
// 形成样本目标
Object.assign(s, ((s,p)=>({target:s.reward+p.gamma*s.bootstrap}))(s, p));
// 更新被访问的Q
Object.assign(s, ((s,p)=>({updated:s.q+p.alpha*(s.target-s.q)}))(s, p));
console.log(JSON.stringify(s,null,2));
