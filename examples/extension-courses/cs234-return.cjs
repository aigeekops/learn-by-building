'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0)};
const p={"gamma":0.9};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定交互顺序
Object.assign(s, ((s,p)=>({rewards:[1,0,2]}))(s, p));
// 把未来奖励折回起点
Object.assign(s, ((s,p)=>({discounted:s.rewards.map((r,t)=>r*p.gamma**t)}))(s, p));
// 合成一次回报
Object.assign(s, ((s,p)=>({return:H.sum(s.discounted)}))(s, p));
// 比较即时和未来收益
Object.assign(s, ((s,p)=>({immediate:s.rewards[0],future:s.return-s.rewards[0]}))(s, p));
console.log(JSON.stringify(s,null,2));
