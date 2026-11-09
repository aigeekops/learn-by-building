'use strict';
const H={};
const p={"raw":512,"reference":5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 固定ADC分辨率与板卡
Object.assign(s, ((s,p)=>({raw:p.raw,maxCode:1023,reference:p.reference}))(s, p));
// 计算端点线性标定值
Object.assign(s, ((s,p)=>({voltage:s.raw*s.reference/s.maxCode}))(s, p));
// 给出量化步距
Object.assign(s, ((s,p)=>({lsb:s.reference/1024}))(s, p));
// 按分压比还原外部值
Object.assign(s, ((s,p)=>({sourceVoltage:2*s.voltage,quantizationOnly:2*s.lsb}))(s, p));
console.log(JSON.stringify(s,null,2));
