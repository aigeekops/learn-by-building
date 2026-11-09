'use strict';
const H={};
const p={"x":1,"scale":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 区分直接映射与残差映射
Object.assign(s, ((s,p)=>({input:p.x,residual:p.scale*p.x}))(s, p));
// 合并快捷连接
Object.assign(s, ((s,p)=>({output:s.input+s.residual}))(s, p));
// 比较输入梯度路径
Object.assign(s, ((s,p)=>({plainGradient:p.scale,residualGradient:1+p.scale}))(s, p));
// 检查抵消反例
Object.assign(s, ((s,p)=>({gradientCanceled:Math.abs(s.residualGradient)<1e-9}))(s, p));
console.log(JSON.stringify(s,null,2));
