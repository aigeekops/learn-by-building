'use strict';
const H={};
const p={"quiet":20};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 提供一次有抖动的按键采样
Object.assign(s, ((s,p)=>({times:[0,5,10,15,40,70],raw:[1,0,1,0,0,0]}))(s, p));
// 跟踪候选电平的持续时间
Object.assign(s, ((s,p)=>{let candidate=1,since=0,stable=1;const history=[],presses=[];s.times.forEach((t,i)=>{if(s.raw[i]!==candidate){candidate=s.raw[i];since=t;}if(candidate!==stable&&t-since>=p.quiet){stable=candidate;if(stable===0)presses.push(t);}history.push({t,candidate,stable,since});});return {history,presses};})(s, p));
// 只把稳定下降沿算成一次按下
Object.assign(s, ((s,p)=>({pressCount:s.presses.length}))(s, p));
// 比较原始边沿与稳定事件
Object.assign(s, ((s,p)=>({rawFallingEdges:s.raw.filter((v,i)=>i>0&&s.raw[i-1]===1&&v===0).length,firstConfirmed:s.presses[0]??null}))(s, p));
console.log(JSON.stringify(s,null,2));
