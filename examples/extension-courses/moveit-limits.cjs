'use strict';
const H={};
const p={"target":1.5,"velocity":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定关节与约束
Object.assign(s, ((s,p)=>({lower:-1,upper:1,vmax:.8}))(s, p));
// 分别检查位置和速度
Object.assign(s, ((s,p)=>({positionValid:p.target>=s.lower&&p.target<=s.upper,velocityValid:p.velocity<=s.vmax}))(s, p));
// 给出明确的请求状态
Object.assign(s, ((s,p)=>({requestValid:s.positionValid&&s.velocityValid}))(s, p));
// 计算速度上限下的时间下界
Object.assign(s, ((s,p)=>({lowerBound:Math.abs(p.target)/s.vmax,canReachRequested:s.requestValid}))(s, p));
console.log(JSON.stringify(s,null,2));
