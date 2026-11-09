'use strict';
const H={};
const p={"code":128,"frequency":500};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 区分开关输出和模拟电压
Object.assign(s, ((s,p)=>({code:p.code,supply:5}))(s, p));
// 换算占空比
Object.assign(s, ((s,p)=>({duty:s.code/255,period:1/p.frequency}))(s, p));
// 计算高低电平时长
Object.assign(s, ((s,p)=>({onTime:s.duty*s.period,offTime:(1-s.duty)*s.period}))(s, p));
// 区分理想平均值和负载响应
Object.assign(s, ((s,p)=>({idealAverage:5*s.duty}))(s, p));
console.log(JSON.stringify(s,null,2));
