'use strict';
const H={};
const p={"angle":60,"velocity":0,"torque":0};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先确定角度零点
Object.assign(s, ((s,p)=>({theta:p.angle*Math.PI/180,omega:p.velocity}))(s, p));
// 由力矩平衡求加速度
Object.assign(s, ((s,p)=>({acceleration:p.torque-.1*s.omega-9.81*Math.sin(s.theta)}))(s, p));
// 计算相空间中的速度向量
Object.assign(s, ((s,p)=>({stateDerivative:[s.omega,s.acceleration]}))(s, p));
// 算机械能并保留势能零点
Object.assign(s, ((s,p)=>({energy:.5*s.omega*s.omega+9.81*(1-Math.cos(s.theta))}))(s, p));
console.log(JSON.stringify(s,null,2));
