'use strict';
const H={norm:xs=>{const z=xs.reduce((a,b)=>a+b,0);if(!(z>0))throw Error('归一化总量必须为正');return xs.map(x=>x/z);}};
const p={"range":2,"sigma":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 为两个位置预测测距
Object.assign(s, ((s,p)=>({positions:[2,3],predicted:[3,2]}))(s, p));
// 计算残差
Object.assign(s, ((s,p)=>({residuals:s.predicted.map(z=>p.range-z)}))(s, p));
// 计算高斯似然
Object.assign(s, ((s,p)=>({likelihoods:s.residuals.map(e=>Math.exp(-.5*(e/p.sigma)**2)/(p.sigma*Math.sqrt(2*Math.PI)))}))(s, p));
// 合并均匀先验
Object.assign(s, ((s,p)=>({posterior:H.norm(s.likelihoods)}))(s, p));
console.log(JSON.stringify(s,null,2));
