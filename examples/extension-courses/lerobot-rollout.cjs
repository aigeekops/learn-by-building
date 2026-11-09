'use strict';
const H={};
const p={"command":1,"current":0,"fresh":"yes"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先检查动作契约和当前状态
Object.assign(s, ((s,p)=>({command:p.command,current:p.current,fresh:p.fresh==='yes'}))(s, p));
// 分开检查位置和变化率
Object.assign(s, ((s,p)=>({positionValid:s.command>=-1&&s.command<=1,delta:s.command-s.current}))(s, p));
// 决定是否允许提交
Object.assign(s, ((s,p)=>({allowed:s.fresh&&s.positionValid&&Math.abs(s.delta)<=.2+1e-9}))(s, p));
// 保留失败原因
Object.assign(s, ((s,p)=>({submitted:false,reason:!s.fresh?'观测过期':!s.positionValid?'位置超界':Math.abs(s.delta)>.2+1e-9?'单周期变化过大':'通过教学检查，未实际提交'}))(s, p));
console.log(JSON.stringify(s,null,2));
