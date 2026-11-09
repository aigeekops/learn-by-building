'use strict';
const H={dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),
segmentDistance:(a,b,c)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((c[0]-a[0])*dx+(c[1]-a[1])*dy)/den)):0;return Math.hypot(a[0]+t*dx-c[0],a[1]+t*dy-c[1]);}};
const p={"obstacle":1,"radius":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 给出一段机器人路径
Object.assign(s, ((s,p)=>({start:[0,0],goal:[2,0],center:[p.obstacle,.2]}))(s, p));
// 比较端点和整段距离
Object.assign(s, ((s,p)=>({endpointDistances:[H.dist(s.start,s.center),H.dist(s.goal,s.center)],segmentDistance:H.segmentDistance(s.start,s.goal,s.center)}))(s, p));
// 按接触也算碰撞判定
Object.assign(s, ((s,p)=>({endpointClear:s.endpointDistances.every(x=>x>p.radius),edgeClear:s.segmentDistance>p.radius}))(s, p));
// 保留场景版本的概念
Object.assign(s, ((s,p)=>({collisionFree:s.edgeClear,minimumClearance:s.segmentDistance-p.radius}))(s, p));
console.log(JSON.stringify(s,null,2));
