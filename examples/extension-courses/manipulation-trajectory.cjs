'use strict';
const H={};
const p={"duration":2,"position":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 选一个零端点速度的时间标度
Object.assign(s, ((s,p)=>({sigma:p.position,t:p.position*p.duration}))(s, p));
// 计算三次位置曲线
Object.assign(s, ((s,p)=>({q:3*s.sigma*s.sigma-2*s.sigma**3}))(s, p));
// 求速度与加速度
Object.assign(s, ((s,p)=>({velocity:(6*s.sigma-6*s.sigma*s.sigma)/p.duration,acceleration:(6-12*s.sigma)/(p.duration*p.duration)}))(s, p));
// 检查峰值速度
Object.assign(s, ((s,p)=>({peakVelocity:1.5/p.duration,withinLimit:1.5/p.duration<=1}))(s, p));
console.log(JSON.stringify(s,null,2));
