'use strict';
const H={dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0)};
const p={"pixel":0.5,"bias":0};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先写清输入和权重的形状
Object.assign(s, ((s,p)=>({image:[p.pixel,1],weights:[[1,-1],[-1,1]],bias:[p.bias,0]}))(s, p));
// 矩阵乘法产生分数
Object.assign(s, ((s,p)=>({scores:s.weights.map((w,i)=>H.dot(w,s.image)+s.bias[i])}))(s, p));
// 选分数最大的类别
Object.assign(s, ((s,p)=>({classId:s.scores[0]>=s.scores[1]?0:1}))(s, p));
// 做一个独立输入扰动
Object.assign(s, ((s,p)=>({changedImage:[1-p.pixel,1],changedScores:s.weights.map((w,i)=>H.dot(w,[1-p.pixel,1])+s.bias[i])}))(s, p));
console.log(JSON.stringify(s,null,2));
