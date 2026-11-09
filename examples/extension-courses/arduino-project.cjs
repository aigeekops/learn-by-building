'use strict';
const H={};
const p={"distance":20,"sensor":"valid","enable":"yes"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 先定义输入有效性和目标
Object.assign(s, ((s,p)=>({distance:p.sensor==='valid'?p.distance:null,enabled:p.enable==='yes'}))(s, p));
// 无效观测不当作0或远处
Object.assign(s, ((s,p)=>({known:s.distance!==null}))(s, p));
// 按显式规则决定输出
Object.assign(s, ((s,p)=>({run:s.known&&s.enabled&&s.distance>=15}))(s, p));
// 保留导致输出的原因
Object.assign(s, ((s,p)=>({pwm:s.run?100:0,reason:!s.known?'传感器超时':!s.enabled?'人工关闭':s.distance<15?'障碍过近':'允许本例运行'}))(s, p));
console.log(JSON.stringify(s,null,2));
