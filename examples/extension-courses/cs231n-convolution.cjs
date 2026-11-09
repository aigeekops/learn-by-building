'use strict';
const H={sum:xs=>xs.reduce((a,b)=>a+b,0)};
const p={"center":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定图像、卷积核与边界
Object.assign(s, ((s,p)=>({image:[[1,2,3],[0,p.center,2],[1,0,1]],kernel:[[1,0],[0,-1]]}))(s, p));
// 滑动做互相关
Object.assign(s, ((s,p)=>({output:[0,1].map(i=>[0,1].map(j=>H.sum([0,1].flatMap(a=>[0,1].map(b=>s.image[i+a][j+b]*s.kernel[a][b])))))}))(s, p));
// 对每个输出应用ReLU
Object.assign(s, ((s,p)=>({activated:s.output.map(row=>row.map(x=>Math.max(0,x)))}))(s, p));
// 进行2×2最大池化
Object.assign(s, ((s,p)=>({pooled:Math.max(...s.activated.flat()),outputWidth:2,sharedParameters:4}))(s, p));
console.log(JSON.stringify(s,null,2));
