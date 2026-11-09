'use strict';
const H={mean:xs=>xs.reduce((a,b)=>a+b,0)/xs.length};
const p={"offset":1,"outlier":0};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 显式给定点对应关系
Object.assign(s, ((s,p)=>({source:[0,1,2],target:[p.offset,1+p.offset,2+p.offset+p.outlier]}))(s, p));
// 每对点提供一个位移候选
Object.assign(s, ((s,p)=>({differences:s.target.map((v,i)=>v-s.source[i])}))(s, p));
// 比较均值与中位数平移
Object.assign(s, ((s,p)=>({leastSquares:H.mean(s.differences),robust:s.differences.slice().sort((a,b)=>a-b)[1]}))(s, p));
// 回算配准残差
Object.assign(s, ((s,p)=>({residuals:s.target.map((v,i)=>v-(s.source[i]+s.leastSquares)),robustResiduals:s.target.map((v,i)=>v-(s.source[i]+s.robust))}))(s, p));
console.log(JSON.stringify(s,null,2));
