'use strict';
const H={};
const p={"distance":1,"vmax":1,"amax":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先固定单关节运动边界
Object.assign(s, ((s,p)=>({rampDistance:p.vmax*p.vmax/p.amax}))(s, p));
// 决定三角形还是梯形速度曲线
Object.assign(s, ((s,p)=>({triangular:p.distance<=s.rampDistance}))(s, p));
// 计算加速段和匀速段时间
Object.assign(s, ((s,p)=>({rampTime:s.triangular?Math.sqrt(p.distance/p.amax):p.vmax/p.amax,cruiseTime:s.triangular?0:(p.distance-s.rampDistance)/p.vmax}))(s, p));
// 合成总时长和峰值速度
Object.assign(s, ((s,p)=>({duration:2*s.rampTime+s.cruiseTime,peakVelocity:p.amax*s.rampTime}))(s, p));
console.log(JSON.stringify(s,null,2));
