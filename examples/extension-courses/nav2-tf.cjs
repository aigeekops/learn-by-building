'use strict';
const H={};
const p={"mapOdom":0.5,"odomBase":1,"age":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先检查坐标链
Object.assign(s, ((s,p)=>({chain:['map','odom','base_link','laser'],laserOffset:.2}))(s, p));
// 复合相同时间的变换
Object.assign(s, ((s,p)=>({laserMap:p.mapOdom+p.odomBase+s.laserOffset}))(s, p));
// 把观测从laser变到map
Object.assign(s, ((s,p)=>({endpointMap:s.laserMap+2}))(s, p));
// 用教学阈值检查时效
Object.assign(s, ((s,p)=>({fresh:p.age<=.3,usable:p.age<=.3,ageSeconds:p.age}))(s, p));
console.log(JSON.stringify(s,null,2));
