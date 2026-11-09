'use strict';
const H={};
const p={"grasp":"ok","place":"clear"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 定义有限任务状态
Object.assign(s, ((s,p)=>({states:['approach','close'],held:null}))(s, p));
// 先确认抓取再搬运
Object.assign(s, ((s,p)=>({held:p.grasp==='ok',states:s.states.concat(p.grasp==='ok'?['verify','transport']:['verify','stop'])}))(s, p));
// 在放置前检查环境
Object.assign(s, ((s,p)=>({states:s.states.concat(s.held?(p.place==='clear'?['release']:['wait']):[]),released:s.held&&p.place==='clear'}))(s, p));
// 报告任务结果与失败条件
Object.assign(s, ((s,p)=>({success:s.released,reason:!s.held?'抓取确认失败':p.place==='blocked'?'放置区域阻塞':'完成本例流程'}))(s, p));
console.log(JSON.stringify(s,null,2));
