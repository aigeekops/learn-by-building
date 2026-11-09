'use strict';
const H={};
const p={"delay":0.05,"tolerance":0.05};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 各传感器保留原时间戳
Object.assign(s, ((s,p)=>({stateTimes:[0,.1,.2],cameraTimes:[p.delay,.1+p.delay,.2+p.delay]}))(s, p));
// 对每个状态选择最近相机帧
Object.assign(s, ((s,p)=>({matches:s.stateTimes.map(t=>{const ds=s.cameraTimes.map(c=>Math.abs(c-t));let i=0;for(let j=1;j<ds.length;j++)if(ds[j]<ds[i]-1e-9)i=j;return {state:t,camera:s.cameraTimes[i],index:i,error:ds[i]};})}))(s, p));
// 检查时间容差与未来帧
Object.assign(s, ((s,p)=>({valid:s.matches.map(m=>m.error<=p.tolerance+1e-9),future:s.matches.map(m=>m.camera>m.state+1e-9)}))(s, p));
// 分别报告可配对和在线可用
Object.assign(s, ((s,p)=>({acceptedCount:s.valid.filter(Boolean).length,causalCount:s.matches.filter((m,i)=>s.valid[i]&&!s.future[i]).length}))(s, p));
console.log(JSON.stringify(s,null,2));
