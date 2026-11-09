'use strict';
const H={};
const p={"left":1,"right":1.2,"dt":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 写清差速模型和单位
Object.assign(s, ((s,p)=>({track:.5,pose:[0,0,0]}))(s, p));
// 由轮速求机体速度
Object.assign(s, ((s,p)=>({v:(p.left+p.right)/2,omega:(p.right-p.left)/s.track}))(s, p));
// 积分一段恒定速度运动
Object.assign(s, ((s,p)=>{const a=s.omega*p.dt;return {next:Math.abs(s.omega)<1e-9?[s.v*p.dt,0,a]:[s.v/s.omega*Math.sin(a),s.v/s.omega*(1-Math.cos(a)),a]};})(s, p));
// 报告里程计的假设
Object.assign(s, ((s,p)=>({distance:s.v*p.dt,heading:s.next[2]}))(s, p));
console.log(JSON.stringify(s,null,2));
