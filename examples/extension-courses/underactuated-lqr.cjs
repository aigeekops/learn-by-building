'use strict';
const H={};
const p={"a":1.1,"r":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定有限时域标量系统
Object.assign(s, ((s,p)=>({q:1,terminal:1,horizon:3}))(s, p));
// 反向Riccati递推
Object.assign(s, ((s,p)=>{let P=s.terminal;const backwards=[];for(let k=2;k>=0;k--){const K=p.a*P/(p.r+P),next=1+p.a*p.a*P-p.a*p.a*P*P/(p.r+P);backwards.push({k,Pnext:P,K,P:next});P=next;}return {backwards,initialP:P};})(s, p));
// 提取最初一步反馈
Object.assign(s, ((s,p)=>({gain:s.backwards[s.backwards.length-1].K}))(s, p));
// 从x=1执行第一步
Object.assign(s, ((s,p)=>({control:-s.gain,nextState:p.a-s.gain}))(s, p));
console.log(JSON.stringify(s,null,2));
