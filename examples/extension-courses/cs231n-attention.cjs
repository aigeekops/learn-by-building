'use strict';
const H={softmax:xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),z=e.reduce((a,b)=>a+b,0);return e.map(x=>x/z);},
dot:(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0)};
const p={"query":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把三个patch特征列出
Object.assign(s, ((s,p)=>({keys:[1,0,-1],values:[2,4,6]}))(s, p));
// 计算全局匹配分数
Object.assign(s, ((s,p)=>({scores:s.keys.map(k=>p.query*k)}))(s, p));
// 对所有patch归一化
Object.assign(s, ((s,p)=>({weights:H.softmax(s.scores)}))(s, p));
// 加权汇总不同位置的信息
Object.assign(s, ((s,p)=>({output:H.dot(s.weights,s.values)}))(s, p));
console.log(JSON.stringify(s,null,2));
