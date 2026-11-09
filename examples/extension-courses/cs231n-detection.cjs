'use strict';
const H={};
const p={"offset":1,"threshold":0.5};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 声明同类别的两个检测框
Object.assign(s, ((s,p)=>({a:[0,0,2,2],b:[p.offset,0,p.offset+2,2],scores:[.9,.8]}))(s, p));
// 先求交集再求并集
Object.assign(s, ((s,p)=>({intersection:Math.max(0,2-p.offset)*2}))(s, p));
// 计算IoU
Object.assign(s, ((s,p)=>({union:8-s.intersection,iou:s.intersection/(8-s.intersection)}))(s, p));
// 执行一次同类硬NMS
Object.assign(s, ((s,p)=>({kept:s.iou>p.threshold?[0]:[0,1],suppressed:s.iou>p.threshold}))(s, p));
console.log(JSON.stringify(s,null,2));
