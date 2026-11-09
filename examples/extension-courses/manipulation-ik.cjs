'use strict';
const H={clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
const p={"x":1,"y":1,"elbow":"up"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先检查目标是否可达
Object.assign(s, ((s,p)=>({radius:Math.hypot(p.x,p.y),reachable:Math.hypot(p.x,p.y)<=2}))(s, p));
// 用余弦定理解肘角
Object.assign(s, ((s,p)=>({q2:s.reachable?(p.elbow==='up'?1:-1)*Math.acos(H.clamp((s.radius*s.radius-2)/2,-1,1)):null}))(s, p));
// 补回肩角
Object.assign(s, ((s,p)=>({q1:s.reachable?Math.atan2(p.y,p.x)-Math.atan2(Math.sin(s.q2),1+Math.cos(s.q2)):null}))(s, p));
// 用正运动学独立回代
Object.assign(s, ((s,p)=>({end:s.reachable?[Math.cos(s.q1)+Math.cos(s.q1+s.q2),Math.sin(s.q1)+Math.sin(s.q1+s.q2)]:null,elbow:s.reachable?[Math.cos(s.q1),Math.sin(s.q1)]:null}))(s, p));
console.log(JSON.stringify(s,null,2));
