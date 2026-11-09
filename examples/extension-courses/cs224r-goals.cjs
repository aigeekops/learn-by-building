'use strict';
const H={};
const p={"achieved":2,"desired":3};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 保存原始目标条件轨迹
Object.assign(s, ((s,p)=>({achieved:p.achieved,desired:p.desired}))(s, p));
// 按原任务计算稀疏奖励
Object.assign(s, ((s,p)=>({originalReward:s.achieved===s.desired?0:-1,originalSuccess:s.achieved===s.desired}))(s, p));
// 生成一个事后目标样本
Object.assign(s, ((s,p)=>({relabeledGoal:s.achieved,relabeledReward:0}))(s, p));
// 把训练增广和评测分开
Object.assign(s, ((s,p)=>({evaluationSuccess:s.originalSuccess,augmentedTrainingPairs:2}))(s, p));
console.log(JSON.stringify(s,null,2));
