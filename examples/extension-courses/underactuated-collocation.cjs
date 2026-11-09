'use strict';
const H={};
const p={"middle":0.5,"control":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把连续问题变成节点与约束
Object.assign(s, ((s,p)=>({states:[0,p.middle,1],dt:.5,controls:[p.control,p.control,p.control]}))(s, p));
// 计算梯形离散的动力学缺陷
Object.assign(s, ((s,p)=>({defects:[p.middle-.5*p.control,1-p.middle-.5*p.control]}))(s, p));
// 积分控制代价
Object.assign(s, ((s,p)=>({cost:p.control*p.control}))(s, p));
// 同时核对边界与缺陷
Object.assign(s, ((s,p)=>({maxDefect:Math.max(...s.defects.map(Math.abs)),discreteFeasible:s.defects.every(x=>Math.abs(x)<1e-9)}))(s, p));
console.log(JSON.stringify(s,null,2));
