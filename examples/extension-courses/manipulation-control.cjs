'use strict';
const H={};
const p={"stiffness":4,"damping":2,"velocity":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 从一维末端质量开始
Object.assign(s, ((s,p)=>({position:.5,goal:1,mass:1}))(s, p));
// 分别计算弹性与阻尼反馈
Object.assign(s, ((s,p)=>({elastic:p.stiffness*(s.goal-s.position),dampingForce:-p.damping*p.velocity}))(s, p));
// 合力决定加速度
Object.assign(s, ((s,p)=>({force:s.elastic+s.dampingForce,acceleration:(s.elastic+s.dampingForce)/s.mass}))(s, p));
// 显式Euler走0.1秒
Object.assign(s, ((s,p)=>({nextPosition:s.position+.1*p.velocity,nextVelocity:p.velocity+.1*s.acceleration}))(s, p));
console.log(JSON.stringify(s,null,2));
