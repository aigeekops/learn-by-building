'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0),
dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),
segmentDistance:(a,b,c)=>{const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((c[0]-a[0])*dx+(c[1]-a[1])*dy)/den)):0;return Math.hypot(a[0]+t*dx-c[0],a[1]+t*dy-c[1]);}};
const p={"radius":0.4,"clearance":0.1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 给出起终点和两条候选路径
Object.assign(s, ((s,p)=>({paths:[[[0,0],[2,0]],[[0,0],[0,1],[2,1],[2,0]]],center:[1,0]}))(s, p));
// 检查整段距离
Object.assign(s, ((s,p)=>({distances:s.paths.map(path=>Math.min(...path.slice(1).map((b,i)=>H.segmentDistance(path[i],b,s.center))))}))(s, p));
// 同时计算可行性和长度
Object.assign(s, ((s,p)=>({valid:s.distances.map(d=>d>p.radius+p.clearance),lengths:s.paths.map(path=>H.sum(path.slice(1).map((b,i)=>H.dist(path[i],b))))}))(s, p));
// 只在可行路径里选择最短
Object.assign(s, ((s,p)=>({selected:s.valid.map((ok,i)=>ok?i:-1).filter(i=>i>=0).sort((a,b)=>s.lengths[a]-s.lengths[b])[0]??null}))(s, p));
console.log(JSON.stringify(s,null,2));
