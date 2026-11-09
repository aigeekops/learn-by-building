'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0)};
const p={"expert":0.5,"draw":0.6};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先保留已有示范
Object.assign(s, ((s,p)=>({dataset:[[1,2]],learnerAction:3,expertAction:4,visitedObservation:2}))(s, p));
// 在当前策略访问状态上请求专家标签
Object.assign(s, ((s,p)=>({label:s.expertAction,executed:p.draw<p.expert?s.expertAction:s.learnerAction}))(s, p));
// 聚合数据再拟合
Object.assign(s, ((s,p)=>({aggregated:s.dataset.concat([[s.visitedObservation,s.label]])}))(s, p));
// 在聚合样本上做闭式线性拟合
Object.assign(s, ((s,p)=>({weight:H.sum(s.aggregated.map(([o,a])=>o*a))/H.sum(s.aggregated.map(([o])=>o*o)),sampleCount:s.aggregated.length}))(s, p));
console.log(JSON.stringify(s,null,2));
