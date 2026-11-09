'use strict';
const H={};
const p={"penalty":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义同一地图上的两条候选路径
Object.assign(s, ((s,p)=>({lengths:[3,4],proximity:[2,.2]}))(s, p));
// 把路径成本写明
Object.assign(s, ((s,p)=>({costs:s.lengths.map((x,i)=>x+p.penalty*s.proximity[i])}))(s, p));
// 按同一个目标选择
Object.assign(s, ((s,p)=>({choice:s.costs[0]<=s.costs[1]?0:1}))(s, p));
// 保存选择依据
Object.assign(s, ((s,p)=>({selectedLength:s.lengths[s.choice],selectedCost:s.costs[s.choice]}))(s, p));
console.log(JSON.stringify(s,null,2));
