'use strict';
const H={mean:xs=>xs.reduce((a,b)=>a+b,0)/xs.length};
const p={"head":1,"split":"group"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定特征提取器，训练新任务头
Object.assign(s, ((s,p)=>({features:[1,2,3,4],groups:['A','A','B','B'],labels:[0,0,1,1]}))(s, p));
// 用新的线性头做分类
Object.assign(s, ((s,p)=>({predictions:s.features.map(x=>Number(x*p.head>=2.5))}))(s, p));
// 核对验证是否覆盖未见对象
Object.assign(s, ((s,p)=>({train:p.split==='group'?[0,1]:[0,2],validation:p.split==='group'?[2,3]:[1,3],groupLeak:p.split==='row'}))(s, p));
// 同时报告误差和划分限制
Object.assign(s, ((s,p)=>({validationAccuracy:H.mean(s.validation.map(i=>Number(s.predictions[i]===s.labels[i]))),independentGroups:!s.groupLeak}))(s, p));
console.log(JSON.stringify(s,null,2));
