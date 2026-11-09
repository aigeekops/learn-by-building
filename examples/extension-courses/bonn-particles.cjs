'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0),
norm:xs=>{const z=xs.reduce((a,b)=>a+b,0);if(!(z>0))throw Error('归一化总量必须为正');return xs.map(x=>x/z);}};
const p={"measurement":1,"sigma":0.5,"offset":0.1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 准备四个等权粒子
Object.assign(s, ((s,p)=>({particles:[0,.5,1,2]}))(s, p));
// 按似然更新权重
Object.assign(s, ((s,p)=>({weights:H.norm(s.particles.map(x=>Math.exp(-.5*((p.measurement-x)/p.sigma)**2)))}))(s, p));
// 检查有效样本数
Object.assign(s, ((s,p)=>({ess:1/H.sum(s.weights.map(x=>x*x)),cdf:s.weights.map((_,i)=>H.sum(s.weights.slice(0,i+1)))}))(s, p));
// 系统重采样
Object.assign(s, ((s,p)=>({draws:[0,1,2,3].map(k=>p.offset+k/4),resampled:[0,1,2,3].map(k=>s.particles[s.cdf.findIndex(x=>p.offset+k/4<x)]),newWeights:[.25,.25,.25,.25]}))(s, p));
console.log(JSON.stringify(s,null,2));
