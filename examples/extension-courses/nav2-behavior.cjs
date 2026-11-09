'use strict';
const H={};
const p={"failures":1,"budget":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先初始化一个有界恢复流程
Object.assign(s, ((s,p)=>({events:[],attempts:0}))(s, p));
// 执行明确的有限规则
Object.assign(s, ((s,p)=>{const events=[];let success=false,recoveries=0;for(let attempt=0;attempt<=p.budget;attempt++){events.push('plan '+attempt);if(attempt>=p.failures){events.push('follow');success=true;break;}if(attempt<p.budget){recoveries++;events.push('recover');}}return {events,success,recoveries,attempts:Math.min(p.failures+1,p.budget+1)};})(s, p));
// 区分运行、成功和失败
Object.assign(s, ((s,p)=>({status:s.success?'SUCCESS':'FAILURE'}))(s, p));
// 记录结束原因
Object.assign(s, ((s,p)=>({stoppedBy:s.success?'路径与跟踪分支成功':'恢复预算耗尽'}))(s, p));
console.log(JSON.stringify(s,null,2));
