/* Author the public original companions and runnable local examples.
 * No remote downloads, runtime data, or personal plans are read. */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),E=require('../web/extension-course-models.js');
const checked='2026-11-09',courses=[],lessons=[],sources={};
function course(id,label,title,edition,position,description,prerequisites,url,locator,pending){
 const source=id+'-official';sources[source]={kind:'官方公开材料',label:label+' · 官方目录',url,locator,role:'official',checked,edition,status:'2026-11-09已核对官方目录与公开状态；本站讲解、算例、代码与练习为原创选编，原课视频和幻灯片未复制。'};
 courses.push({id,label,title,edition,position,description,prerequisites,published:[],pending,sources:[source]});
}
function lesson(id,title,question,outcome,explanation,formula,worked,misconception,prompt,expected,solution,transfer,locator,minutes=120){
 const courseId=id.slice(0,id.indexOf('-')),c=courses.find(c=>c.id===courseId),d=E.definitions[id];if(!c||!d)throw Error('Missing course/model '+id);
 const sourceId=id+'-reading',source=sources[courseId+'-official'];sources[sourceId]={...source,label:c.label+' · '+locator,locator};
 const unit=String(c.published.length+1),code=E.example(id),boundary=courseId==='arduino'?'浏览器仅做理想电路与控制逻辑计算；没有连接开发板，也不代表仿真器或实物结果。': ['nav2','moveit'].includes(courseId)?'浏览器仅做有限的几何、约束和流程计算；未执行ROS 2、Gazebo、MoveIt或Nav2，不代表目标环境或真机验证。':courseId==='lerobot'?'本站小数据和标量策略模型；未加载真实机器人数据、LeRobot策略权重或训练任务，不代表真实闭环评测。':'本站原创有限计算案例；不训练真实深度网络、不调用机器人或外部服务，计算结果仅支持本讲明确的模型假设。';
 const sections=d.stages.map(stage=>({title:stage.title,explanation:stage.detail}));
 sections.push({title:'独立运行与核对',explanation:'将下面的完整原创JavaScript保存为.cjs文件，使用Node.js运行。p是输入参数，s保留每步结果，H只包含本例使用的纯计算函数。浏览器使用同一实现回放步骤；你本地运行的输出应另存为自己的证据。',code,language:'javascript',execution:'Node.js 标准库；node '+id+'.cjs。无需安装依赖；不会启动原课框架或硬件。',exercise:transfer});
 lessons.push({id,course:courseId,unit,title:'第'+unit+'讲 '+title,summary:outcome,question,outcome,prerequisites:c.prerequisites,explanation,formula,worked,misconception,sections,practice:['先不操作参数，回答：'+question,'按步骤核对本讲算例，再改变一个参数，记录输入、关键中间值和输出。',transfer],exercise:{prompt,expected,tolerance:1e-6,unit:'',hint:'先根据本讲公式手算，再对照步骤中的变量；复算方法在下方。',solution,transfer},sources:[sourceId],bridges:[],modelId:id,demos:[{modelId:id,title:title+' · 逐步核对'}],boundary,study_minutes:minutes});
 c.published.push({unit,title,lessons:[id],material:'本站原创配套讲次；对照官方材料：'+locator+'。'});
}
course('cs234','CS234','强化学习：从交互到策略更新','Stanford Winter 2026 · 八讲主题选编','AI与机器人共享的强化学习基础','从MDP、动态规划、采样更新走到探索、函数近似和策略梯度；用手算与独立代码解释每个目标。',['会读Python或JavaScript列表与循环','概率期望、向量和基础求导；可按需回补现有基础课'],'https://web.stanford.edu/class/cs234/modules.html','Lecture Materials：Introduction、Tabular MDP planning、policy evaluation、Q-learning、Policy Gradient','本站八讲为核心主题选编。Data Efficient RL、MCTS、客座讲座及完整作业另见官方目录，未声称完整覆盖原课。');
lesson('cs234-return','MDP与回报：奖励怎样定义目标？','同一条奖励序列，折扣改变后为什么回报会变化？','区分状态、动作、奖励、终止与期望回报，独立复算有限轨迹。',[
 '强化学习先定义交互问题：在状态下选择动作，环境返回奖励和下一状态。奖励是任务设计的一部分；如果只奖励“快速移动”，机器人可能学到与“平稳到达”不同的行为。',
 '回报把从当前时刻开始的奖励放在同一口径比较。折扣γ降低远期奖励的权重；有限回合也可以γ=1。终止后没有后续奖励，不应重复加入终点价值。',
 '本讲只算一条给定轨迹。策略价值还要对策略动作和环境转移求期望，因此一次高回报并不能说明策略通常表现好。'
 ],'G₀ = r₁ + γr₂ + γ²r₃','默认奖励[1,0,2]、γ=0.9，折回起点后为[1,0,1.62]，回报2.62。','折扣不是学习率；把奖励换个尺度也会改变数值口径，比较前需固定定义。','奖励[1,0,2]，γ=0.5，起点回报是多少？',1.5,'1+0.5×0+0.5²×2=1.5。','把奖励改为[0,0,2]，分别手算γ=0和γ=1；说明延迟奖励如何影响短视策略。','Introduction to Reinforcement Learning；SB Chapter 1、3',120);
lesson('cs234-bellman','Bellman方程：把未来缩成下一步','一项行动可能成功，也可能留在原地，怎样把两种结果都算进去？','列出转移分支、做一次价值备份，并用固定点检查迭代目标。',[
 'Bellman关系把长程目标拆成即时奖励与下一状态价值。随机转移要求对所有可能结果加权；只保留最可能分支会丢掉失败的影响。',
 '本例只有一个非终止状态：成功概率p，得到2分并终止；失败留在原地。给定旧估计后能做一次更新，重复更新才逐步接近固定点。',
 '这个小例子还能直接解方程。用解析值对照迭代可以找出折扣、终止掩码和转移概率的错误；大问题通常没有这么简单的闭式解。'
 ],'V_new = 2p + (1−p)γV_old；V* = 2p/[1−(1−p)γ]','p=0.8、γ=0.9、旧V=1，一次更新1.78；固定点约1.95122。','一次更新结果不是收敛价值；终止分支没有额外bootstrap项。','p=0.5、γ=0.8、旧V=1，一次更新值是多少？',1.4,'0.5×2+0.5×0.8×1=1.4。','独立解同一参数的固定点5/3，再从0迭代五次，记录误差是否减小。','Tabular MDP planning；SB 3、4.1–4.4',150);
lesson('cs234-planning','价值迭代：已知环境时先做规划','知道转移和奖励后，如何从零估计找到应选的动作？','做同步价值迭代，再从动作价值提取贪心策略。',[
 '规划利用已知模型，不需要采真实环境样本。本例两状态通向终点：状态0可以立刻退出拿1分，也可以走到状态1；状态1随后终止得2分。',
 '同步迭代一整轮只读旧V，计算结束后再整体替换。若更新第一个状态时立刻读到本轮的新值，就换成了另一种更新顺序，需要单独说明。',
 '策略选择比较的是各动作的即时奖励加折扣后续价值。状态价值只保存最大期望回报，本身不是动作编号。'
 ],'Vₖ₊₁(0)=max(1,γVₖ(1))；Vₖ₊₁(1)=2','γ=0.9：从[0,0]到[1,2]再到[1.8,2]，状态0选择前进。','贪心是相对于当前价值估计而言；价值尚不准确时，选出的策略也可能改变。','γ=0.5且已收敛，状态0的价值是多少？',1,'max(1,0.5×2)=1；平分按本例规则选退出。','将γ设为0和0.9，逐轮记录V与动作；解释高折扣为什么更偏好延迟收益。','Tabular MDP planning；Policy/Value Iteration',150);
lesson('cs234-td','Monte Carlo与TD：等回合结束还是先更新？','还没看到整段未来，为什么可以用下一状态估计来更新？','区分完整回报与单步bootstrap，正确处理真正终止。',[
 'Monte Carlo用实际完整回报作为目标，需要看到回合结尾。TD利用一步奖励加下一状态的旧价值，可以在非终止转移上立即更新，代价是目标也含估计误差。',
 'TD误差是目标减旧值，学习率控制这一次修正幅度。折扣决定远期收益的权重，两者进入公式的位置不同。',
 '真正终止时后续价值为零。训练采样因为时间上限而截断，不一定意味着任务终止；是否bootstrap取决于任务定义和环境返回的终止语义。'
 ],'δ = r + γ(1−terminated)V(s′) − V(s)；V←V+αδ','V=1、V′=2、r=0、γ=0.9、α=0.5：非终止目标1.8，更新1.4；终止时更新0.5。','不能因为采样数组结束就一律清空后续价值，也不能给真正终止状态重复加值。','相同默认值但真正终止，更新后V是多少？',.5,'目标0，δ=−1，1+0.5×(−1)=0.5。','另给一条奖励[0,2]的完整回合，手算MC目标并与一步TD目标比较，说明两者信息来源。','Tabular RL policy evaluation；SB 5.1、6.1–6.3',150);
lesson('cs234-qlearning','SARSA与Q-learning：谁在决定下一步目标？','下一步实际选了较差动作，Q-learning还会用最大动作值吗？','在同一条转移上比较on-policy与off-policy样本目标。',[
 'SARSA沿实际行为策略更新，目标读取已选的下一动作；Q-learning以贪心动作的价值构造目标，即使采样行为选择了别的动作。',
 '两者都只更新本次访问的状态动作对。未访问项没有因为页面显示或规划动画而获得新经验。',
 '这个查表例子方便手算，但并不涵盖深度Q网络的稳定性问题。加入函数近似、回放与目标网络后，需要重新检查数据和优化假设。'
 ],'SARSA: y=r+γQ(s′,a′)；Q-learning: y=r+γmaxₐQ(s′,a)','Q旧值0、奖励1、下一值[2,4]、实际下一动作0：α=0.5、γ=0.9时两种更新分别为1.4和2.3。','off-policy说的是目标策略与采样策略可不同，不等于可以忽略数据覆盖。','默认Q-learning的目标值是多少？',4.6,'1+0.9×max(2,4)=4.6。','切到SARSA再把α改成1，手算得到2.8；解释为什么两者都不需要重新采样奖励。','Q-learning；SB 6.4–6.5、6.7',150);
lesson('cs234-exploration','探索与利用：ε-greedy的概率到底怎样分？','探索时贪心动作还可能被选中吗？','正确分配探索概率，使用固定采样点重放一次选择。',[
 '只选当前估计最好的动作可能永远看不到更好的选择。ε-greedy把概率ε交给均匀探索，其余交给贪心动作。',
 '均匀探索覆盖所有动作，包括贪心动作本身。因此唯一贪心动作的概率是1−ε+ε/K，其余每个ε/K。平分动作要另行定义规则。',
 '滑块u固定在[0,1)，用于解释累计概率区间。它让计算可复现，并不模拟大量独立抽样，也不能凭一次结果判断探索策略好坏。'
 ],'π(greedy)=1−ε+ε/K；π(other)=ε/K','K=3、ε=0.2：动作概率[1/15,13/15,1/15]；u=0.7选动作1。','“贪心动作概率1−ε”漏掉了探索分支也可能选它的概率。','三个动作、ε=0.3，唯一贪心动作被选中的概率是多少？',.8,'1−0.3+0.3/3=0.8。','手动取u=0.02和0.98，对照累计区间；再将ε=1验证概率变成均匀分布。','Introduction / Data Efficient RL；exploration主题',120);
lesson('cs234-approximation','价值函数近似：一次更新为何影响多个状态？','把价值存在共享权重里，与为每个状态建表有什么不同？','算线性价值预测与半梯度更新，解释泛化和干扰。',[
 '状态很多时查表难以覆盖，可以用特征和共享参数预测价值。相似特征共享同一组权重，既能泛化，也会相互干扰。',
 '本例固定TD目标后最小化半平方误差，只对当前预测求导。这叫半梯度更新；如果目标来自同一个网络，不应该在这个公式里悄悄反传过去。',
 '步长太大时，更新后预测可能越过目标。单个样本误差下降也不保证其他状态的误差下降，需用独立状态和轨迹核对。'
 ],'V=wᵀφ；w_new=w+α(y−V)φ','φ=[1,2]、w=[0.5,0.5]、y=3、α=0.1：V=1.5，w新=[0.65,0.8]，新预测2.25。','共享权重不是免费获得所有状态的正确值；目标在此次更新中必须冻结。','按默认参数更新后，第二个权重是多少？',.8,'0.5+0.1×(3−1.5)×2=0.8。','用另一个状态φ=[2,0]比较更新前后预测，说明它未被采样却受到了什么影响。','Function approximation连接；Policy Gradient前置',150);
lesson('cs234-policy-gradient','策略梯度：直接改变动作概率','已采到的动作表现较好，怎样让它下一次更可能出现？','计算一个二元策略的对数梯度，区分上升目标和下降损失。',[
 '价值方法先估计动作价值，再据此选动作；策略梯度直接参数化概率分布，用采样回报或优势来调节概率。',
 '对二元策略logit θ，采到动作1时对数概率梯度为1−π(1)。正优势沿这个方向增加θ，负优势则反向。',
 '本例只更新一个已采样项，不是完整期望梯度。实践还涉及轨迹相关性、方差、基线和评测；基线不能依赖当前抽到的动作而引入偏差。'
 ],'p=σ(θ)；g=A(1−p)；θ_new=θ+αg','θ=0、A=1、α=0.2：p=0.5，g=0.5，θ新=0.1，p新约0.524979。','最大化回报用梯度上升；写成负代理损失后才用梯度下降。','θ=0、A=−1时，对数梯度乘优势的结果是多少？',-.5,'p=0.5，所以−1×(1−0.5)=−0.5。','在相同θ和α下比较A=1与A=−1，记录新概率；再到CS224R的GAE与PPO核对目标差别。','Policy Gradient；SB Chapter 13',180);
for(const name of ['bonn','manipulation','nav2','moveit','cs224r','underactuated','cs231n','arduino','lerobot'])require('./course-authoring/'+name+'.cjs')({course,lesson});
require('./course-authoring/environment-labs.cjs')({lessons,sources,ROOT,fs,path});
// Give HF onboarding its own source rather than attributing unpublished units.
sources['lerobot-course-onboarding']={kind:'官方已公开入门',label:'HF Robotics Course · Unit 0',url:'https://huggingface.co/learn/robotics-course/unit0/1',locator:'Welcome / Getting Started；后续课程目录未视作已公开正文',role:'official',checked,edition:'Unit 0公开状态快照',status:'已核对Unit 0与公开导航；后续未公开单元没有被包装成本站已完成原课。'};
const detailSources={
 'lerobot-schema':['https://huggingface.co/docs/lerobot/lerobot-dataset-v3','LeRobotDataset v3.0'],
 'lerobot-time':['https://huggingface.co/docs/lerobot/lerobot-dataset-v3','LeRobotDataset v3.0；时序配对为本站原创延伸'],
 'lerobot-episodes':['https://huggingface.co/docs/lerobot/lerobot-dataset-v3','LeRobotDataset v3.0；回合划分为本站原创延伸'],
 'lerobot-normalization':['https://huggingface.co/docs/lerobot/il_robots','Imitation Learning；统计量核对为本站原创延伸'],
 'lerobot-bc':['https://huggingface.co/docs/lerobot/il_robots','Imitation Learning；标量BC为本站原创延伸'],
 'lerobot-chunks':['https://huggingface.co/docs/lerobot/act','ACT；时序预算为本站原创延伸'],
 'lerobot-rollout':['https://huggingface.co/docs/lerobot/index','Policy Deployment；接口门控为本站原创延伸'],
 'lerobot-evaluation':['https://huggingface.co/docs/lerobot/il_robots','Imitation Learning / Evaluate'],
 'nav2-tf':['https://docs.nav2.org/jazzy/configuration_and_development/first_time_robot_setup_guide/','First-Time Robot Setup Guide'],
 'nav2-localization':['https://docs.nav2.org/jazzy/configuration_and_development/first_time_robot_setup_guide/','Mapping and Localization'],
 'nav2-validation':['https://docs.nav2.org/jazzy/configuration_and_development/simple_commander_api/simple_commander_api/','Simple Commander API']
};
for(const [id,[url,locator]]of Object.entries(detailSources))Object.assign(sources[id+'-reading'],{url,locator});
for(const c of courses){
 const items=lessons.filter(l=>l.course===c.id);
 items.forEach((l,i)=>{if(i>0)l.bridges.push({lesson:items[i-1].id,label:'回看上一讲'});if(i+1<items.length)l.bridges.push({lesson:items[i+1].id,label:'继续下一讲'});});
}
const crossLinks={'cs234-policy-gradient':'cs224r-actor-critic','bonn-astar':'nav2-lifecycle','manipulation-task':'moveit-model','nav2-validation':'lerobot-schema','moveit-execution':'lerobot-rollout','cs224r-goals':'lerobot-evaluation','underactuated-mpc':'manipulation-control','cs231n-transfer':'manipulation-perception','arduino-project':'nav2-lifecycle','lerobot-evaluation':'cs224r-offline'};
for(const [from,to]of Object.entries(crossLinks))lessons.find(l=>l.id===from).bridges.push({lesson:to,label:'连接后续课程：'+lessons.find(l=>l.id===to).title});
if(courses.length!==10||lessons.length!==80||lessons.length!==new Set(lessons.map(l=>l.id)).size)throw Error('课程数量或身份不一致');
for(const id of Object.keys(E.definitions))if(!lessons.some(l=>l.id===id))throw Error('孤立模型 '+id);
const directory=path.join(ROOT,'examples/extension-courses');fs.mkdirSync(directory,{recursive:true});
for(const l of lessons)fs.writeFileSync(path.join(directory,l.id+'.cjs'),E.example(l.id));
for(const c of courses){const data={checked,course:c,lessons:lessons.filter(l=>l.course===c.id),sources:Object.fromEntries(Object.entries(sources).filter(([id])=>id.startsWith(c.id+'-')))};if(c.id==='lerobot')data.lessons[0].sources.push('lerobot-course-onboarding');fs.writeFileSync(path.join(ROOT,'config/extension_'+c.id+'.json'),JSON.stringify(data,null,2)+'\n');}
console.log(JSON.stringify({courses:courses.length,lessons:lessons.length,examples:lessons.length,checked}));
