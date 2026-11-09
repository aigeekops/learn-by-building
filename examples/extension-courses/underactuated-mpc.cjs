'use strict';
const H={};
const p={"state":1,"disturbance":0.25};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 给出候选输入和预测模型
Object.assign(s, ((s,p)=>({actions:[-1,0,1]}))(s, p));
// 只用模型选择当前动作
Object.assign(s, ((s,p)=>({costs:s.actions.map(u=>(p.state+u)**2+.1*u*u)}))(s, p));
// 执行第一动作并测量新状态
Object.assign(s, ((s,p)=>{const best=s.costs.indexOf(Math.min(...s.costs)),u=s.actions[best];return {action:u,predicted:p.state+u,measured:p.state+u+p.disturbance};})(s, p));
// 基于新测量重新规划
Object.assign(s, ((s,p)=>({nextCosts:s.actions.map(u=>(s.measured+u)**2+.1*u*u),predictionError:s.measured-s.predicted}))(s, p));
console.log(JSON.stringify(s,null,2));
