'use strict';
const H={softmax:xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z);}};
const p={"score":2,"temperature":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定标签并缩放logit
Object.assign(s, ((s,p)=>({logits:[p.score,1,0],label:0}))(s, p));
// 稳定计算softmax
Object.assign(s, ((s,p)=>({probabilities:H.softmax(s.logits.map(x=>x/p.temperature))}))(s, p));
// 交叉熵只读取真类概率
Object.assign(s, ((s,p)=>({loss:-Math.log(s.probabilities[s.label])}))(s, p));
// 回传到原始logit
Object.assign(s, ((s,p)=>({gradient:s.probabilities.map((x,i)=>(x-Number(i===s.label))/p.temperature)}))(s, p));
console.log(JSON.stringify(s,null,2));
