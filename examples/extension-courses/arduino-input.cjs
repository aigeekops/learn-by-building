'use strict';
const H={};
const p={"pressed":"no","pullup":"yes"};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 明确按钮接地和上拉电路
Object.assign(s, ((s,p)=>({pressed:p.pressed==='yes',pullup:p.pullup==='yes'}))(s, p));
// 保持浮空输入未知
Object.assign(s, ((s,p)=>({raw:s.pressed?0:s.pullup?1:null}))(s, p));
// 将低有效电平转成语义
Object.assign(s, ((s,p)=>({logicalPressed:s.raw===null?null:s.raw===0}))(s, p));
// 列出可核对的真值行
Object.assign(s, ((s,p)=>({known:s.raw!==null,led:s.logicalPressed===null?'未知':s.logicalPressed?'开':'关'}))(s, p));
console.log(JSON.stringify(s,null,2));
