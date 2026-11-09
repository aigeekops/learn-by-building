'use strict';
const H={};
const p={"deviation":0.1,"gain":12};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 围绕向上平衡点定义小量
Object.assign(s, ((s,p)=>({delta:p.deviation,gravity:9.81}))(s, p));
// 比较非线性与线性重力项
Object.assign(s, ((s,p)=>({nonlinear:s.gravity*Math.sin(s.delta),linear:s.gravity*s.delta}))(s, p));
// 加入位置负反馈
Object.assign(s, ((s,p)=>({control:-p.gain*s.delta,positionCoefficient:s.gravity-p.gain}))(s, p));
// 区分恢复力与渐近稳定
Object.assign(s, ((s,p)=>({linearAcceleration:s.positionCoefficient*s.delta,restoring:p.gain>s.gravity,approximationError:s.nonlinear-s.linear}))(s, p));
console.log(JSON.stringify(s,null,2));
