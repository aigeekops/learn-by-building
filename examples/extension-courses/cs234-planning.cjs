'use strict';
const H={};
const p={"gamma":0.9,"sweeps":3};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义两状态和终点
Object.assign(s, ((s,p)=>({values:[0,0]}))(s, p));
// 同步执行价值迭代
Object.assign(s, ((s,p)=>{let v=s.values.slice(),history=[v.slice()];for(let k=0;k<p.sweeps;k++){v=[Math.max(1,p.gamma*v[1]),2];history.push(v.slice());}return {values:v,history};})(s, p));
// 用更新后的价值选择动作
Object.assign(s, ((s,p)=>({actionValues:[1,p.gamma*s.values[1]]}))(s, p));
// 给出贪心策略
Object.assign(s, ((s,p)=>({action:s.actionValues[0]>=s.actionValues[1]?'退出':'前进',value:Math.max(...s.actionValues)}))(s, p));
console.log(JSON.stringify(s,null,2));
