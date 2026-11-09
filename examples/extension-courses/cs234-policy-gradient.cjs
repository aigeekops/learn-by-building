'use strict';
const H={softmax:xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z);}};
const p={"logit":0,"advantage":1,"alpha":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把logit变成随机策略
Object.assign(s, ((s,p)=>({probabilities:H.softmax([0,p.logit])}))(s, p));
// 对已采到的动作1取对数梯度
Object.assign(s, ((s,p)=>({score:1-s.probabilities[1]}))(s, p));
// 用优势加权
Object.assign(s, ((s,p)=>({gradient:p.advantage*s.score}))(s, p));
// 执行梯度上升并重新计算
Object.assign(s, ((s,p)=>({updatedLogit:p.logit+p.alpha*s.gradient,newProbability:H.softmax([0,p.logit+p.alpha*s.gradient])[1]}))(s, p));
console.log(JSON.stringify(s,null,2));
