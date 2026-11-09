'use strict';
const H={};
const p={"unseenQ":8,"penalty":5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把离线数据支持范围写出
Object.assign(s, ((s,p)=>({counts:[20,0],q:[2,p.unseenQ]}))(s, p));
// 观察无约束贪心的外推
Object.assign(s, ((s,p)=>({naiveChoice:s.q[0]>=s.q[1]?0:1}))(s, p));
// 用显式支持惩罚作教学对照
Object.assign(s, ((s,p)=>({adjusted:s.q.map((q,i)=>q-(s.counts[i]===0?p.penalty:0))}))(s, p));
// 保留选择与不可识别范围
Object.assign(s, ((s,p)=>({choice:s.adjusted[0]>=s.adjusted[1]?0:1,unseenActionCovered:false}))(s, p));
console.log(JSON.stringify(s,null,2));
