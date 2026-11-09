'use strict';
const H={};
const p={"torque":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 写出两自由度单输入系统
Object.assign(s, ((s,p)=>({mass:[[2,1],[1,2]],input:[0,p.torque],configurationDof:2,actuatorRank:1}))(s, p));
// 用输入矩阵判断欠驱动
Object.assign(s, ((s,p)=>({underactuated:s.actuatorRank<s.configurationDof}))(s, p));
// 耦合质量矩阵使未驱动关节也加速
Object.assign(s, ((s,p)=>({acceleration:[-p.torque/3,2*p.torque/3]}))(s, p));
// 回代动力学核对
Object.assign(s, ((s,p)=>({recoveredForce:[2*s.acceleration[0]+s.acceleration[1],s.acceleration[0]+2*s.acceleration[1]]}))(s, p));
console.log(JSON.stringify(s,null,2));
