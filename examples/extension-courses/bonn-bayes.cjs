'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0),
norm:xs=>{const z=xs.reduce((a,b)=>a+b,0);if(!(z>0))throw Error('归一化总量必须为正');return xs.map(x=>x/z);}};
const p={"sensor":0.8};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先保存上一步信念
Object.assign(s, ((s,p)=>({prior:[.6,.4]}))(s, p));
// 先预测再观测
Object.assign(s, ((s,p)=>({predicted:[.75*s.prior[0]+.25*s.prior[1],.25*s.prior[0]+.75*s.prior[1]]}))(s, p));
// 乘入左侧观测似然
Object.assign(s, ((s,p)=>({unnormalized:[s.predicted[0]*p.sensor,s.predicted[1]*(1-p.sensor)]}))(s, p));
// 归一化得到后验
Object.assign(s, ((s,p)=>({evidence:H.sum(s.unnormalized),posterior:H.norm(s.unnormalized)}))(s, p));
console.log(JSON.stringify(s,null,2));
