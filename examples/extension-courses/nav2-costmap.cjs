'use strict';
const H={};
const p={"radius":0.2,"inflation":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 给出通道净宽
Object.assign(s, ((s,p)=>({width:.9,diameter:2*p.radius}))(s, p));
// 先检查几何可通过性
Object.assign(s, ((s,p)=>({physicalMargin:s.width-2*p.radius,geometricPass:s.width>2*p.radius}))(s, p));
// 加入规划缓冲要求
Object.assign(s, ((s,p)=>({preferredWidth:2*(p.radius+p.inflation),bufferMargin:s.width-2*(p.radius+p.inflation)}))(s, p));
// 区分碰撞与偏好
Object.assign(s, ((s,p)=>({bufferPass:s.bufferMargin>0,geometricPass:s.geometricPass}))(s, p));
console.log(JSON.stringify(s,null,2));
