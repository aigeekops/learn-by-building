'use strict';
const H={};
const p={"odom":1.2,"loop":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定第一帧消除自由漂移
Object.assign(s, ((s,p)=>({raw:[0,1,1+p.odom]}))(s, p));
// 列出正规方程
Object.assign(s, ((s,p)=>({rhs:[1-p.odom,p.odom+p.loop]}))(s, p));
// 解出最小二乘位姿
Object.assign(s, ((s,p)=>({poses:[0,(2*s.rhs[0]+s.rhs[1])/3,(s.rhs[0]+2*s.rhs[1])/3]}))(s, p));
// 回算全部残差
Object.assign(s, ((s,p)=>({residuals:[s.poses[1]-1,s.poses[2]-s.poses[1]-p.odom,s.poses[2]-p.loop]}))(s, p));
console.log(JSON.stringify(s,null,2));
