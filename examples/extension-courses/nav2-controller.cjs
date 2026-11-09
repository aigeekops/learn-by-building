'use strict';
const H={};
const p={"lookahead":1,"speed":0.5,"y":0.2};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 把前视目标放到机体系
Object.assign(s, ((s,p)=>({target:[Math.sqrt(p.lookahead*p.lookahead-p.y*p.y),p.y]}))(s, p));
// 由圆弧几何求曲率
Object.assign(s, ((s,p)=>({curvature:2*p.y/(p.lookahead*p.lookahead)}))(s, p));
// 速度乘曲率得到角速度
Object.assign(s, ((s,p)=>({omega:p.speed*s.curvature}))(s, p));
// 检查离散控制周期
Object.assign(s, ((s,p)=>({headingStep:s.omega*.05,travelStep:p.speed*.05}))(s, p));
console.log(JSON.stringify(s,null,2));
