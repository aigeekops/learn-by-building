'use strict';
const H={};
const p={"split":"episode"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 保留回合和时间身份
Object.assign(s, ((s,p)=>({episodes:['A','A','B','B'],frameIndex:[0,1,0,1]}))(s, p));
// 先划分再拟合统计量
Object.assign(s, ((s,p)=>({train:p.split==='episode'?[0,1]:[0,2],validation:p.split==='episode'?[2,3]:[1,3]}))(s, p));
// 检查回合是否跨边界
Object.assign(s, ((s,p)=>({overlap:[...new Set(s.train.map(i=>s.episodes[i]))].filter(e=>s.validation.some(i=>s.episodes[i]===e))}))(s, p));
// 保留进一步独立性的要求
Object.assign(s, ((s,p)=>({episodeIndependent:s.overlap.length===0,trainingFrames:s.train.length,validationFrames:s.validation.length}))(s, p));
console.log(JSON.stringify(s,null,2));
