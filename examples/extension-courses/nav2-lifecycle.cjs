'use strict';
const H={};
const p={"configured":"yes","sensor":"yes"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 启动时处于未配置状态
Object.assign(s, ((s,p)=>({states:['unconfigured'],active:false}))(s, p));
// 配置资源并检查参数
Object.assign(s, ((s,p)=>({states:s.states.concat(p.configured==='yes'?'inactive':'unconfigured'),configured:p.configured==='yes'}))(s, p));
// 满足依赖后激活
Object.assign(s, ((s,p)=>({active:s.configured&&p.sensor==='yes',states:s.states.concat(s.configured&&p.sensor==='yes'?'active':'blocked')}))(s, p));
// 为目标受理给出条件
Object.assign(s, ((s,p)=>({acceptGoal:s.active,readyCount:Number(s.configured)+Number(p.sensor==='yes')}))(s, p));
console.log(JSON.stringify(s,null,2));
