'use strict';
const H={wilson:(success,n)=>{const z=1.96,p=success/n,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h];}};
const p={"successes":8,"contacts":0,"timeouts":1};
const s={};
// p 是输入参数；s 保存此前步骤的结果；H 是本文件中的纯计算辅助函数。
// 在同一场景集上比较
Object.assign(s, ((s,p)=>({episodes:10,successes:p.successes,contacts:p.contacts,timeouts:p.timeouts}))(s, p));
// 计算成功率和区间
Object.assign(s, ((s,p)=>({rate:s.successes/s.episodes,interval:H.wilson(s.successes,s.episodes)}))(s, p));
// 按预先写下的门槛核对
Object.assign(s, ((s,p)=>({pass:s.rate>=.8&&s.contacts===0&&s.timeouts<=1}))(s, p));
// 为下一步保留证据类型
Object.assign(s, ((s,p)=>({evidence:'人工教学数据',targetEnvironment:'ROS 2 Jazzy + Gazebo Harmonic'}))(s, p));
console.log(JSON.stringify(s,null,2));
