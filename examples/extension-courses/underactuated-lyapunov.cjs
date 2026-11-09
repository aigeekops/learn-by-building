'use strict';
const H={};
const p={"x":1,"limit":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 给出非线性一维系统
Object.assign(s, ((s,p)=>({state:p.x,derivative:-p.x+p.x**3}))(s, p));
// 沿动力学求Vdot
Object.assign(s, ((s,p)=>({value:p.x*p.x/2,valueDerivative:p.x*s.derivative}))(s, p));
// 比较单点检查与区域符号
Object.assign(s, ((s,p)=>({pointDecreasing:s.valueDerivative<0,strictDomain:p.limit<1}))(s, p));
// 陈述可支持的结论
Object.assign(s, ((s,p)=>({insideCertifiedRegion:Math.abs(p.x)<1,atTargetEquilibrium:p.x===0,atEquilibrium:Math.abs(s.derivative)<1e-12}))(s, p));
console.log(JSON.stringify(s,null,2));
