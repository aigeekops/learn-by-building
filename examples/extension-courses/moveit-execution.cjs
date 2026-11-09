'use strict';
const H={};
const p={"startError":0.02,"scene":"same","result":"success"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 规划结果先作为候选
Object.assign(s, ((s,p)=>({planned:true,sceneVersion:'v1'}))(s, p));
// 核对起点和场景
Object.assign(s, ((s,p)=>({startCompatible:p.startError<=.04,sceneCurrent:p.scene==='same'}))(s, p));
// 只在条件满足时请求执行
Object.assign(s, ((s,p)=>({requested:s.startCompatible&&s.sceneCurrent}))(s, p));
// 区分已请求与已成功
Object.assign(s, ((s,p)=>({success:s.requested&&p.result==='success',outcome:!s.requested?'未提交':p.result==='success'?'本例返回成功':'本例返回中止'}))(s, p));
console.log(JSON.stringify(s,null,2));
