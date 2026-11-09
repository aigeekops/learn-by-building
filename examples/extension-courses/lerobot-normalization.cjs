'use strict';
const H={mean:xs=>xs.reduce((a,b)=>a+b,0)/xs.length};
const p={"validation":8,"fit":"train"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先固定训练和保留样本
Object.assign(s, ((s,p)=>({train:[0,2,4],validation:p.validation}))(s, p));
// 只从允许的数据拟合中心和尺度
Object.assign(s, ((s,p)=>{const fit=p.fit==='train'?s.train:s.train.concat([s.validation]),center=H.mean(fit),scale=Math.sqrt(H.mean(fit.map(x=>(x-center)**2)));return {center,scale};})(s, p));
// 同一变换应用到保留样本
Object.assign(s, ((s,p)=>({normalized:(s.validation-s.center)/s.scale}))(s, p));
// 用逆变换核对单位恢复
Object.assign(s, ((s,p)=>({recovered:s.normalized*s.scale+s.center,leaked:p.fit==='all'}))(s, p));
console.log(JSON.stringify(s,null,2));
