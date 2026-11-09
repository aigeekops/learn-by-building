'use strict';
const H={};
const p={"angle":90,"current":0.5,"resistance":0.4};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把控制信号和供电分开
Object.assign(s, ((s,p)=>({angle:p.angle,current:p.current}))(s, p));
// 用教学标定映射脉宽
Object.assign(s, ((s,p)=>({pulseMicroseconds:1000+s.angle/180*1000}))(s, p));
// 估算驱动导通损耗
Object.assign(s, ((s,p)=>({voltageDrop:p.current*p.resistance,conductionWatt:p.current*p.current*p.resistance}))(s, p));
// 报告控制和功率的不同单位
Object.assign(s, ((s,p)=>({signal:'脉宽 μs',power:'外部驱动与供电核对'}))(s, p));
console.log(JSON.stringify(s,null,2));
