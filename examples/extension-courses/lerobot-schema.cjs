'use strict';
const H={};
const p={"action":"valid","unit":"rad"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把观测和动作契约写清
Object.assign(s, ((s,p)=>({state:[.1,.2],action:p.action==='valid'?[.2,.3]:[.2],requiredDof:2,unit:p.unit}))(s, p));
// 检查维度和有限值
Object.assign(s, ((s,p)=>({shapeValid:s.action.length===s.requiredDof,finite:s.action.every(Number.isFinite)}))(s, p));
// 把单位校验独立列出
Object.assign(s, ((s,p)=>({unitValid:s.unit==='rad'}))(s, p));
// 报告输入是否允许进入训练
Object.assign(s, ((s,p)=>({accepted:s.shapeValid&&s.finite&&s.unitValid}))(s, p));
console.log(JSON.stringify(s,null,2));
