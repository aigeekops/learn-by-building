'use strict';
const H={};
const p={"interval":200,"elapsed":300};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 让计时跨越32位回绕
Object.assign(s, ((s,p)=>({last:4294967196,now:(4294967196+p.elapsed)>>>0}))(s, p));
// 使用无符号时间差
Object.assign(s, ((s,p)=>({difference:(s.now-s.last)>>>0}))(s, p));
// 达到间隔才运行一次任务
Object.assign(s, ((s,p)=>({due:s.difference>=p.interval}))(s, p));
// 更新时间基准
Object.assign(s, ((s,p)=>({nextLast:s.due?s.now:s.last,executions:s.due?1:0}))(s, p));
console.log(JSON.stringify(s,null,2));
