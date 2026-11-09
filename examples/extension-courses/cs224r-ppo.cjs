'use strict';
const H={clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
const p={"ratio":1.3,"advantage":1,"clip":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定采样数据与旧策略
Object.assign(s, ((s,p)=>({ratio:p.ratio,advantage:p.advantage}))(s, p));
// 计算未裁剪代理项
Object.assign(s, ((s,p)=>({unclipped:s.ratio*s.advantage}))(s, p));
// 裁剪比值并保留保守项
Object.assign(s, ((s,p)=>({clippedRatio:H.clamp(s.ratio,1-p.clip,1+p.clip),clipped:H.clamp(s.ratio,1-p.clip,1+p.clip)*s.advantage}))(s, p));
// 求单样本PPO目标
Object.assign(s, ((s,p)=>({objective:Math.min(s.unclipped,s.clipped),loss:-Math.min(s.unclipped,s.clipped)}))(s, p));
console.log(JSON.stringify(s,null,2));
