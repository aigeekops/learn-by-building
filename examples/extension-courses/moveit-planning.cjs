'use strict';
const H={};
const p={"step":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义一维配置空间的窄障碍
Object.assign(s, ((s,p)=>({invalidInterval:[.9,1.1],start:0,goal:2}))(s, p));
// 生成离散检查点
Object.assign(s, ((s,p)=>({samples:Array.from({length:Math.ceil(2/p.step)+1},(_,i)=>Math.min(2,i*p.step))}))(s, p));
// 分别做离散和连续检查
Object.assign(s, ((s,p)=>({discreteClear:!s.samples.some(x=>x>=.9&&x<=1.1),continuousClear:false}))(s, p));
// 用移位障碍展示漏检反例
Object.assign(s, ((s,p)=>({shiftedDiscreteClear:!s.samples.some(x=>x>=.4&&x<=.6),shiftedContinuousClear:false}))(s, p));
console.log(JSON.stringify(s,null,2));
