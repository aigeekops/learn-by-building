'use strict';
const H={};
const p={"desired":0.2,"jacobian":0.5,"damping":0.1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把任务速度映射到关节空间
Object.assign(s, ((s,p)=>({jacobian:p.jacobian,desired:p.desired}))(s, p));
// 构造阻尼逆
Object.assign(s, ((s,p)=>({inverse:p.jacobian/(p.jacobian*p.jacobian+p.damping*p.damping)}))(s, p));
// 求关节速度与实际任务速度
Object.assign(s, ((s,p)=>({qdot:s.inverse*p.desired,achieved:p.jacobian*s.inverse*p.desired}))(s, p));
// 回算残差并检查限速
Object.assign(s, ((s,p)=>({residual:s.achieved-p.desired,withinLimit:Math.abs(s.qdot)<=1}))(s, p));
console.log(JSON.stringify(s,null,2));
