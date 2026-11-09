'use strict';
const H={};
const p={"x":2,"variance":0.5,"noise":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义非线性传感器
Object.assign(s, ((s,p)=>({predicted:p.x*p.x,jacobian:2*p.x,measurement:5}))(s, p));
// 传播观测不确定性
Object.assign(s, ((s,p)=>({innovation:s.measurement-s.predicted,innovationVariance:s.jacobian*s.jacobian*p.variance+p.noise}))(s, p));
// 计算Kalman增益
Object.assign(s, ((s,p)=>({gain:p.variance*s.jacobian/s.innovationVariance}))(s, p));
// 修正均值与方差
Object.assign(s, ((s,p)=>({updated:p.x+s.gain*s.innovation,posteriorVariance:(1-s.gain*s.jacobian)**2*p.variance+s.gain*s.gain*p.noise}))(s, p));
console.log(JSON.stringify(s,null,2));
