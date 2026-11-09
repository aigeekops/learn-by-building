'use strict';
const H={};
const p={"execute":2,"latency":60};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 区分预测长度和执行长度
Object.assign(s, ((s,p)=>({chunk:[.1,.2,.3,.4],controlPeriod:20}))(s, p));
// 每次只提交前k个动作
Object.assign(s, ((s,p)=>({executed:s.chunk.slice(0,p.execute),coverage:p.execute*s.controlPeriod}))(s, p));
// 比较覆盖时间和计算延迟
Object.assign(s, ((s,p)=>({gap:Math.max(0,p.latency-s.coverage),slack:s.coverage-p.latency}))(s, p));
// 陈述时序与任务表现的不同
Object.assign(s, ((s,p)=>({noGap:s.gap===0,feedbackInterval:s.coverage}))(s, p));
console.log(JSON.stringify(s,null,2));
