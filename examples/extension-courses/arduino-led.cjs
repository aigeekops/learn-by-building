'use strict';
const H={};
const p={"resistance":220,"drop":2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把板卡和电路条件写清
Object.assign(s, ((s,p)=>({supply:5,ledDrop:p.drop,resistance:p.resistance}))(s, p));
// 求电阻两端电压
Object.assign(s, ((s,p)=>({resistorVoltage:s.supply-s.ledDrop}))(s, p));
// 由欧姆定律求电流
Object.assign(s, ((s,p)=>({currentAmp:s.resistorVoltage/s.resistance,currentMilliamp:1000*s.resistorVoltage/s.resistance}))(s, p));
// 算电阻消耗功率
Object.assign(s, ((s,p)=>({resistorWatt:s.currentAmp*s.currentAmp*s.resistance}))(s, p));
console.log(JSON.stringify(s,null,2));
