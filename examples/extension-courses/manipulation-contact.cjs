'use strict';
const H={};
const p={"mu":0.5,"normal":5,"mass":0.4};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 画出对称双指夹持的受力
Object.assign(s, ((s,p)=>({weight:p.mass*9.81}))(s, p));
// 计算单侧摩擦锥边界
Object.assign(s, ((s,p)=>({perFinger:p.mu*p.normal}))(s, p));
// 两侧共同抵抗重力
Object.assign(s, ((s,p)=>({capacity:2*s.perFinger,margin:2*s.perFinger-s.weight}))(s, p));
// 保留模型假设和裕量
Object.assign(s, ((s,p)=>({staticFeasible:s.margin>=0,requiredPerFinger:s.weight/(2*p.mu)}))(s, p));
console.log(JSON.stringify(s,null,2));
