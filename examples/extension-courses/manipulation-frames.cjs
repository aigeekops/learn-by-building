'use strict';
const H={};
const p={"angle":90,"tx":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 明确坐标的上下标
Object.assign(s, ((s,p)=>({pointCamera:[1,0],translation:[p.tx,1],theta:p.angle*Math.PI/180}))(s, p));
// 先旋转点向量
Object.assign(s, ((s,p)=>({rotated:[Math.cos(s.theta),Math.sin(s.theta)]}))(s, p));
// 再加原点平移
Object.assign(s, ((s,p)=>({pointWorld:s.rotated.map((x,i)=>x+s.translation[i])}))(s, p));
// 用逆变换回到相机系
Object.assign(s, ((s,p)=>{const d=s.pointWorld.map((x,i)=>x-s.translation[i]);return {recovered:[Math.cos(s.theta)*d[0]+Math.sin(s.theta)*d[1],-Math.sin(s.theta)*d[0]+Math.cos(s.theta)*d[1]]};})(s, p));
console.log(JSON.stringify(s,null,2));
