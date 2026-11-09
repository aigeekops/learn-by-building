'use strict';
const H={};
const p={"arm":6,"gripper":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 区分几何描述和语义分组
Object.assign(s, ((s,p)=>({arm:p.arm,gripper:p.gripper}))(s, p));
// 计算整个机器人自由度
Object.assign(s, ((s,p)=>({robotDof:s.arm+s.gripper}))(s, p));
// 按规划组选择状态空间
Object.assign(s, ((s,p)=>({planningDof:s.arm,excludedGripper:s.gripper}))(s, p));
// 核对状态消息长度
Object.assign(s, ((s,p)=>({expectedArmPositions:s.planningDof,modelCheck:'仅自由度记账'}))(s, p));
console.log(JSON.stringify(s,null,2));
