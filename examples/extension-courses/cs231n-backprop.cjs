'use strict';
const H={};
const p={"weight":1,"x":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 展开一个带ReLU的计算图
Object.assign(s, ((s,p)=>({preactivation:p.weight*p.x-.5}))(s, p));
// 先完成前向损失
Object.assign(s, ((s,p)=>({activation:Math.max(0,s.preactivation),loss:(Math.max(0,s.preactivation)-1)**2/2}))(s, p));
// 按链式法则反向求导
Object.assign(s, ((s,p)=>({gradient:(s.activation-1)*(s.preactivation>0?1:0)*p.x}))(s, p));
// 用独立差分检查光滑点
Object.assign(s, ((s,p)=>{const f=w=>(Math.max(0,w*p.x-.5)-1)**2/2,h=1e-5;return {numerical:(f(p.weight+h)-f(p.weight-h))/(2*h),smooth:Math.abs(s.preactivation)>Math.abs(p.x*h)};})(s, p));
console.log(JSON.stringify(s,null,2));
