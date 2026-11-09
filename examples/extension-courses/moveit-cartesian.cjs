'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0)};
const p={"completed":3,"required":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 给出四段笛卡尔路径
Object.assign(s, ((s,p)=>({lengths:[1,1,2,2]}))(s, p));
// 分别计段数和弧长覆盖
Object.assign(s, ((s,p)=>({segmentFraction:p.completed/4,lengthFraction:H.sum(s.lengths.slice(0,p.completed))/H.sum(s.lengths)}))(s, p));
// 按本例弧长规则核对完整性
Object.assign(s, ((s,p)=>({accepted:s.lengthFraction>=p.required}))(s, p));
// 给出缺失路径长度
Object.assign(s, ((s,p)=>({remainingLength:H.sum(s.lengths.slice(p.completed)),fullPath:p.completed===4}))(s, p));
console.log(JSON.stringify(s,null,2));
