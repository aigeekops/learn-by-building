'use strict';
const H={};
const p={"cell":4,"resolution":0.1,"origin":-1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 读取地图元数据
Object.assign(s, ((s,p)=>({column:p.cell,resolution:p.resolution,origin:p.origin}))(s, p));
// 将栅格中心换到世界坐标
Object.assign(s, ((s,p)=>({world:p.origin+(p.cell+.5)*p.resolution}))(s, p));
// 区分先验位姿和定位结果
Object.assign(s, ((s,p)=>({initialPose:.2,correction:-.1,localizedPose:.1}))(s, p));
// 写出目标相对位移
Object.assign(s, ((s,p)=>({relativeGoal:s.world-s.localizedPose,cellRoundTrip:Math.floor((s.world-p.origin)/p.resolution)}))(s, p));
console.log(JSON.stringify(s,null,2));
