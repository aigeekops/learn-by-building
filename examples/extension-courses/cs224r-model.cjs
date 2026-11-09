'use strict';
const H={};
const p={"bias":0.1,"horizon":3};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义真实系统与学习模型
Object.assign(s, ((s,p)=>({initial:0,action:.5}))(s, p));
// 先预测不执行
Object.assign(s, ((s,p)=>({truePath:Array.from({length:p.horizon+1},(_,k)=>k*s.action),modelPath:Array.from({length:p.horizon+1},(_,k)=>k*(s.action+p.bias))}))(s, p));
// 逐步比较预测误差
Object.assign(s, ((s,p)=>({errors:s.modelPath.map((x,i)=>x-s.truePath[i])}))(s, p));
// 分别报告一步与多步质量
Object.assign(s, ((s,p)=>({oneStepError:p.bias,terminalError:s.errors[s.errors.length-1]}))(s, p));
console.log(JSON.stringify(s,null,2));
