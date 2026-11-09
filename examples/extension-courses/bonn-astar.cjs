'use strict';
const H={};
const p={"weight":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义一个有限图
Object.assign(s, ((s,p)=>({names:['S','A','B','G'],edges:[[[1,1],[2,2]],[[3,4]],[[3,1]],[]],heuristic:[3,1,1,0]}))(s, p));
// 从起点执行带重新打开的A*
Object.assign(s, ((s,p)=>{const g=[0,Infinity,Infinity,Infinity],parent=[-1,-1,-1,-1],open=[0],expanded=[];while(open.length&&expanded.length<20){open.sort((a,b)=>(g[a]+p.weight*s.heuristic[a])-(g[b]+p.weight*s.heuristic[b]));const n=open.shift();expanded.push(n);if(n===3)break;for(const [to,c] of s.edges[n])if(g[n]+c<g[to]){g[to]=g[n]+c;parent[to]=n;if(!open.includes(to))open.push(to);}}return {costs:g.map(x=>Number.isFinite(x)?x:null),parent,expanded};})(s, p));
// 回溯到起点
Object.assign(s, ((s,p)=>{const path=[];if(s.expanded.includes(3)){for(let n=3;n!==-1;n=s.parent[n])path.unshift(s.names[n]);}return {path};})(s, p));
// 记录搜索代价和路径长度
Object.assign(s, ((s,p)=>({cost:s.costs[3],expandedCount:s.expanded.length}))(s, p));
console.log(JSON.stringify(s,null,2));
