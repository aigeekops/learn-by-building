/* Same deterministic curriculum pacing as radar/plans.py, for static hosting. */
(function(root){
'use strict';
function preview(config,body){
 const goal=body.goal||'robotics',level=body.level||'zero',raw=body.minutes??30;
 if(!['number','string'].includes(typeof raw)||!/^\d{1,4}$/.test(String(raw).trim()))throw Error('每日可投入时间请填写 1–1440 分钟的整数');
 const minutes=Number(raw),days=Number(body.days??7),progression=body.progression??'sequential';
 if(minutes<1||minutes>1440)throw Error('每日可投入时间请填写 1–1440 分钟的整数');
 if(!['robotics','embedded','agent'].includes(goal)||!['zero','basic','project'].includes(level)||![7,14].includes(days))throw Error('学习目标、阶段或时间设置无效');
 if(!['current','sequential'].includes(progression))throw Error('排期方式无效');
 const start=body.start;
 if(typeof start!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||new Date(start).toISOString().slice(0,10)!==start)throw Error('开始日期无效');
 const track=goal==='agent'?'agent':'robotics',units=config[track+'_curriculum'].months.flatMap(m=>m.blocks.map(b=>[m,b]));
 const startBlock=body.start_block||units[0][1].id,offset=units.findIndex(([,b])=>b.id===startBlock);
 if(offset<0)throw Error('起始学习块不属于当前路线');
 const profile={goal,level,minutes,days,start,start_block:startBlock};
 if(Object.hasOwn(body,'progression'))profile.progression=progression;
 const device=body.device||'browser',practice=body.practice||'simulation';
 if(!['browser','windows','macos','linux'].includes(device)||!['simulation','hardware'].includes(practice))throw Error('设备或练习条件无效');
 Object.assign(profile,{device,practice});
 let setup=device==='browser'?'当前仅用浏览器；涉及终端或本地软件时，先准备对应环境，不因排期跳过配置。':'当前设备：'+({windows:'Windows',macos:'macOS',linux:'Linux'})[device]+'；安装步骤以课程对应版本为准。';
 setup+=track==='robotics'?(practice==='simulation'?' 尚无硬件，优先使用本站模型、纸上计算或课程样例；无法运行的部分保留待做。':' 硬件实验先确认接线、器件与额定值；网页模型不等于实物验证。'):' 模型额度不是起步条件，先用固定响应检查程序；真实调用自行配置并记录。';
 const practiceDays=b=>Math.max(3,Math.ceil((b.study_load?.core_minutes??180)/minutes));
 const tasks=[];let unitIndex=offset,practiceIndex=0;
 for(let i=0;i<days;i++){
  const review=(i+1)%7===0;
  if(progression==='sequential'&&!review&&practiceIndex>=practiceDays(units[unitIndex][1])){
   if(unitIndex+1<units.length){unitIndex++;practiceIndex=0;}else practiceIndex=practiceDays(units[unitIndex][1])-1;
  }
  const [month,block]=units[unitIndex],steps=block.sessions,allocated=practiceDays(block);
  const sequence=[['understand','看懂并开始',steps[0]],['understand','对照例子解释','回看昨天这一步：'+steps[0]+' 写下一个原先不懂的词，用例子解释；尚未跑通就继续此步。'],['practice','跟着做一次',steps[1]],['practice','只改一个条件','在上次练习中只改一个输入或条件，先预测再观察。上次练习：'+steps[1]],['explain','解释与核对',steps[2]],['explain','脱离示例复现','收起示例，重新完成本块第一步，再对照检查。第一步：'+steps[0]]];
  let phase,label,instruction;
  if(review){
   phase='review';label='复盘与决定下一步';instruction='对照本块验收：'+block.acceptance+' 用真实记录指出已会和仍不会的内容；未通过则重排本块，不因日期到了就跳过。';
   if(block.recall)instruction+='\n间隔回想：'+block.recall.prompt;
  }else if(progression==='current'&&practiceIndex>=allocated){
   phase='explain';
   if((practiceIndex-allocated)%2===0){label='独立复现当前块';instruction='收起示例，独立复现本块练习：'+steps[1]+' 写下自己的预测、真实输出和仍需提示的地方。';}
   else{label='核对并补练当前块';instruction='对照本块验收核对上次结果：'+block.acceptance+' 选一个没有解释清楚或尚未跑通的地方，回看对应步骤后重做并记录。';}
   instruction+='\n参考练习次数已经排完，仍只练当前块；未通过就继续补练，通过验收后由你再安排下一块，计划不会自动判定掌握。';practiceIndex++;
  }else{
   const first=Math.min(5,Math.floor(practiceIndex*6/allocated)),last=Math.min(6,Math.max(first+1,Math.floor((practiceIndex+1)*6/allocated))),selected=sequence.slice(first,last);
   phase=selected[0][0];label=selected.map(x=>x[1]).join(' / ');instruction=selected.map(x=>x[2]).join('\n');
   instruction+=`\n本块第 ${practiceIndex+1}/${allocated} 次建议练习；先完成当次最小动作，未完成可续练。`;practiceIndex++;
  }
  const reading=block.readings[0];
  let note=instruction+'\n\n开始前：'+block.prerequisite+'\n先懂一句话：'+block.intuition+'\n本次预算：'+minutes+' 分钟。时间少就只做上述第一项，未做完留到下次；时间多可复现或改例子，不强行跨阶段。'+'\n练习条件：'+setup+'\n阅读入口：'+reading.title+' '+reading.url+'\n阅读范围：'+block.scope+'\n整块验收（不代表本次必须全部完成）：'+block.acceptance+'\n卡住回补：'+block.remedy.text+'\n每次只记录真实完成部分；模拟、计算与实物分开说明。';
  if(block.walkthrough)note+='\n从“回到本块教材与跟练”打开本站课例，按步骤预测，再展开结果核对。';
  if(block.bridge)note+='\n先修小课：'+block.bridge.title+'。'+block.bridge.before;
  note+='\n参考用时来自课程编排，不是实测承诺；采用计划不会验证先修或自动标记掌握。';
  tasks.push({title:block.title+' · '+label,track,learning_route:track,stage:month.stage,due:new Date(Date.parse(start)+i*86400000).toISOString().slice(0,10),minutes,note,source_url:reading.url,day_index:i+1,unit_id:'curriculum:'+block.id,phase,electronics_unit:''});
 }
 return {profile,tasks};
}
if(typeof module!=='undefined')module.exports={preview};else root.StaticPlan={preview};
})(globalThis);
