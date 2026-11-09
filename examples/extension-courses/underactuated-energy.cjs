'use strict';
const H={clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
const p={"angle":90,"velocity":1,"limit":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 计算当前能量和向上目标能量
Object.assign(s, ((s,p)=>({theta:p.angle*Math.PI/180,energy:.5*p.velocity*p.velocity+9.81*(1-Math.cos(p.angle*Math.PI/180)),desired:19.62}))(s, p));
// 用能量差决定注入方向
Object.assign(s, ((s,p)=>({rawTorque:.5*(s.desired-s.energy)*p.velocity}))(s, p));
// 施加执行器饱和
Object.assign(s, ((s,p)=>({torque:H.clamp(s.rawTorque,-p.limit,p.limit)}))(s, p));
// 检查能量变化率和静止盲点
Object.assign(s, ((s,p)=>({energyRate:s.torque*p.velocity,energyError:s.desired-s.energy,stalled:p.velocity===0}))(s, p));
console.log(JSON.stringify(s,null,2));
