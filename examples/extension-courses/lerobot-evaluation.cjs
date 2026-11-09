'use strict';
const H={wilson:(success,n)=>{const z=1.96,p=success/n,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h];}};
const p={"successes":14,"baseline":10};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先固定回合级任务成功定义
Object.assign(s, ((s,p)=>({episodes:20,successes:p.successes,baseline:p.baseline}))(s, p));
// 比较相同条件的成功率
Object.assign(s, ((s,p)=>({rate:s.successes/s.episodes,baselineRate:s.baseline/s.episodes}))(s, p));
// 给成功率附上不确定性
Object.assign(s, ((s,p)=>({interval:H.wilson(s.successes,s.episodes),baselineInterval:H.wilson(s.baseline,s.episodes)}))(s, p));
// 按预先约定报告效果差异
Object.assign(s, ((s,p)=>({difference:s.rate-s.baselineRate,percentagePoints:100*(s.rate-s.baselineRate)}))(s, p));
console.log(JSON.stringify(s,null,2));
