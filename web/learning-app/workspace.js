
(() => {
  const root = document.getElementById('lbb-course-prototype');
  const main = root.querySelector('#lbb-main');
  const contextNav = root.querySelector('#lbb-context-nav');
  const breadcrumbs = root.querySelector('#lbb-breadcrumbs');
  const announce = root.querySelector('#lbb-announcement');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (value, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : '−∞';
  const button = (text, action, value, primary = false) => '<button class="button cursor-interaction' + (primary ? ' primary' : '') + '" data-action="' + action + '"' + (value ? ' data-value="' + value + '"' : '') + '>' + text + '</button>';
  const link = (text, href) => '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + text + ' ↗</a>';
  const pad = n => String(n).padStart(2, '0');
  const branches = [
    {id:'A', title:'大模型原理与研发', sub:'理解模型怎样学习，亲手构建', nodes:['a1','a2','a3','a4','a5']},
    {id:'B', title:'AI 应用与 Agent', sub:'把模型能力接进真实任务', nodes:['b1','b2','b3','b4','b5']},
    {id:'C', title:'机器人与具身实践', sub:'从计算和仿真，走到真实系统', nodes:['c1','c2','c3','c4','c5']}
  ];
  const nodes = {
    python:{code:'基础 01',title:'Python 与编程',kicker:'共同基础',desc:'写出能读输入、处理数据、输出结果的小程序。',prereq:'从变量、条件、循环和函数开始。',check:'独立写一个读取 CSV 并计算均值的小程序。',courses:[]},
    math:{code:'基础 02',title:'用得上的数学',kicker:'共同基础',desc:'把向量、概率、导数放进具体计算。',prereq:'代数与函数；可与项目并行回补。',check:'解释矩阵乘法的形状，并手算一个两项 softmax。',courses:[]},
    experiment:{code:'基础 03',title:'工程与实验方法',kicker:'共同基础',desc:'用假设、对照与可复现的结果检验想法。',prereq:'能运行一个简单程序。',check:'写清输入、预期、实测与差异，而不只保存截图。',courses:[]},
    a1:{code:'A01',title:'数据、损失与泛化',kicker:'机器学习',desc:'从一组数据开始，理解模型怎样改进预测。',prereq:'Python 函数、坐标与均值。',check:'解释训练误差降低，为什么不等于新数据上一定更好。',courses:[],foot:'训练与验证'},
    a2:{code:'A02',title:'神经网络与 PyTorch',kicker:'深度学习',desc:'串起张量、前向、损失、反向与参数更新。',prereq:'矩阵形状、导数与基础机器学习。',check:'独立写通训练循环，比较训练集与验证集。',courses:[],foot:'前向 → 反向 → 更新'},
    a3:{code:'A03',title:'Transformer 与语言模型',kicker:'模型结构',desc:'看清一段文字怎样成为向量，再一步步得到预测。',prereq:'向量点积、softmax、训练循环。',check:'用三枚教学 token 手算注意力，说明每个权重从哪来。',courses:['cme295','cs336'],foot:'Token · Attention · 推理'},
    a4:{code:'A04',title:'大模型训练与系统',kicker:'训练工程',desc:'把模型、数据、算力和显存放进同一张账本。',prereq:'Transformer、PyTorch 与训练循环。',check:'写出有单位、有假设的训练预算，并复现一个小模型。',courses:['cs336','cme295'],foot:'数据 · 算力 · 并行'},
    a5:{code:'A05',title:'对齐、评测与扩展',kicker:'模型能力',desc:'从预训练走向 SFT、强化学习与可靠评测。',prereq:'训练与推理的区别、概率与基本评测。',check:'选择评价指标与对照实验，说明分数的适用边界。',courses:['cme295','cs336'],foot:'SFT · RL · Evaluation'},
    b1:{code:'B01',title:'模型调用与结构化输出',kicker:'应用起步',desc:'做一个有明确输入、输出与失败反馈的小应用。',prereq:'Python 或 JavaScript、HTTP 与 JSON。',check:'处理格式错误、超时与空结果；让输出能被程序使用。',courses:[],foot:'API · JSON · 校验'},
    b2:{code:'B02',title:'RAG 与检索评测',kicker:'资料问答',desc:'先找到依据，再组织回答，并检查找得对不对。',prereq:'模型调用、向量相似度与基本数据处理。',check:'用固定问题集比较检索结果，能指出答案的出处。',courses:['cme295'],foot:'检索 · 依据 · 评测'},
    b3:{code:'B03',title:'工具调用与 Agent',kicker:'执行任务',desc:'观察、行动、接收反馈；让模型通过工具推进任务。',prereq:'结构化输出、函数与错误处理。',check:'重放一次工具轨迹，解释结果怎样回到下一轮决策。',courses:['cme295','cs146s'],foot:'Tools · Loop · Context'},
    b4:{code:'B04',title:'AI 软件工程',kicker:'人机协作',desc:'把需求、上下文、仓库规则和检查接进开发流程。',prereq:'能编程、使用 Git，并读懂基本测试。',check:'让另一个人复现一次改动，给出代码差异与测试结果。',courses:['cs146s'],foot:'Spec · Skills · Repository'},
    b5:{code:'B05',title:'可靠性与应用交付',kicker:'作品与团队',desc:'从能演示，走到可以评审、验证与维护的软件。',prereq:'工具调用、测试与基本项目结构。',check:'用回归测试、评审和真实任务验证改动。',courses:['cs146s'],foot:'测试 · 评审 · 交付'},
    c1:{code:'C01',title:'嵌入式与电子基础',kicker:'计算 / 在线仿真',desc:'先在在线开发板中建立信号、接口与执行器的直觉。',prereq:'基础电路、变量与函数；不会的可边做边补。',check:'解释一次传感器输入怎样改变电机输出，再迁移到真实接线实验。',courses:[],project:'esp32',foot:'learn-esp32 ↗'},
    c2:{code:'C02',title:'机械结构与制造',kicker:'建模 / 制造',desc:'从结构、尺寸与传动出发，做出能装配的机器人。',prereq:'长度、角度、力与基本 CAD 操作。',check:'给出结构图、材料清单、装配间隙与制造记录。',courses:[],foot:'CAD · 传动 · 装配'},
    c3:{code:'C03',title:'传感器、标定与控制',kicker:'反馈 / 真机',desc:'测量误差、建立反馈，再让系统按目标运动。',prereq:'电机、传感器与基本数据采集。',check:'记录目标与实测曲线，比较控制前后的误差。',courses:[],project:'control',foot:'测量 · PID · 误差'},
    c4:{code:'C04',title:'ROS 2、感知与规划',kicker:'物理仿真 / 集成',desc:'让通信、感知、定位和规划在同一项任务里协作。',prereq:'Linux、坐标变换与基础控制。',check:'在仿真环境完成导航任务，解释节点与数据流。',courses:[],foot:'ROS 2 · 定位 · 导航'},
    c5:{code:'C05',title:'真机集成与机器人学习',kicker:'实物 / 学习',desc:'完成联调与安全验证，再探索模仿学习、RL 与 VLA。',prereq:'完整控制与感知链路；进入学习部分前回补 ML。',check:'记录仿真与实物差异，建立可复现的任务评估。',courses:[],foot:'联调 · IL / RL · VLA'}
  };
  const courses = {
    cme295:{
      label:'CME 295', english:'Transformers & Large Language Models', branch:'A · 大模型原理与研发', node:'a3',
      title:'从三个词，<br>看懂大模型的运转。',
      intro:'先建立 Transformer 的直觉，再把训练、推理、Agent 与评测连起来。',
      fit:'先建立大模型全景与核心原理', version:'Stanford · Fall 2026', count:'9 讲官方目录', sample:1,
      prereq:'微积分、线性代数与基础机器学习。本站样例从二维向量和三个教学 token 开始；它是概念演示，不替代正式先修。',
      groups:[{title:'模型：怎样表示与学习',ids:[1,2,3]},{title:'能力：从训练到应用',ids:[4,5,6]},{title:'判断：评价与新方向',ids:[7,8,9]}],
      lessons:[
        ['Transformer','跟着 token，算清一次注意力。','手算一行注意力权重与输出向量。'],
        ['大语言模型','从模型家族、MoE 到位置与采样。','解释温度、上下文与模型结构的不同作用。'],
        ['LLM 训练','预训练、SFT、偏好与蒸馏怎样衔接。','画出数据、训练目标与模型能力的对应关系。'],
        ['LLM 强化学习','奖励、策略梯度与 PPO / GRPO。','区分偏好奖励与可验证奖励。'],
        ['LLM 系统','分布式训练、KV Cache 与推理优化。','说明瓶颈在哪里，以及优化针对什么。'],
        ['AI Agents','工具、MCP、记忆与运行循环。','解释工具结果怎样进入下一轮上下文。'],
        ['LLM 评测','模型裁判、偏差与 Agent 评测。','为一个任务选择可检验的评价方法。'],
        ['Diffusion LLMs','连续、离散与掩码扩散语言模型。','比较扩散式与自回归式生成。'],
        ['趋势与多模态','把新方向放回模型全景。','用已有概念解释一项新模型设计。']
      ],
      official:'https://cme295.stanford.edu/syllabus/', sources:[['课程官网','https://cme295.stanford.edu/'],['2026 官方目录','https://cme295.stanford.edu/syllabus/'],['第 1 讲讲义','https://cme295.stanford.edu/slides/fall26-cme295-lecture1.pdf']],
      note:'目录依据 2026 官网；后续讲次以官方更新为准。本站练习为原创教学样例，CME 295 官方课程不设课后作业。'
    },
    cs146s:{
      label:'CS146S', english:'The Modern Software Developer', branch:'B · AI 应用与 Agent', node:'b4',
      title:'让 Agent 写代码，<br>也让结果经得起检查。',
      intro:'从一次工具调用，到上下文、仓库、评审与交付，把 AI 协作放进完整工程流程。',
      fit:'把 Coding Agent 用进可验证的工程流程', version:'Stanford · Fall 2026', count:'10 周主题 + 期末项目', sample:1,
      prereq:'具备 CS111 / CS161 同等编程经验，能读项目、用 Git、运行测试；官方建议具备 CS221 / CS229 背景。本站用很小的任务展示运行循环。',
      groups:[{title:'理解与装备 Agent',ids:[1,2,3]},{title:'让仓库与检查就绪',ids:[4,5,6,7]},{title:'从个人到团队交付',ids:[8,9,10]}],
      lessons:[
        ['Coding Agent 内部机制','任务怎样经过读文件、测试与修改。','重放一次工具轨迹，解释反馈如何推动下一轮。'],
        ['高级上下文工程','研究、方案、计划与规格。','把含糊需求整理成可执行、可检查的任务。'],
        ['Agent Skills 与 CLI','把常用工作流程写成可复用能力。','区分工具接口与多步工作流程。'],
        ['定制 Agent 与仓库','长期说明、配置与 hooks。','给一个真实仓库写出具体可用的工作约定。'],
        ['Agent-Ready Codebases','让结构、文档与检查便于理解和执行。','定位仓库里最影响任务完成的阻塞点。'],
        ['Agentic Code Review','评审架构、规则与人工判断。','给出可定位、可验证的评审意见。'],
        ['安全','依赖、静态检查与 Agent 攻击面。','识别一次工具或上下文边界失效。'],
        ['后台 Agents','异步任务、并行协作与 issue→PR。','说明任务怎样隔离、追踪并收回结果。'],
        ['AI-Native 团队','团队怎样组织人与 Agent 的分工。','设计任务交接、验收与责任边界。'],
        ['软件工厂与未来','运行、改进与规模化工程系统。','把生成、检查和反馈连成可观测流程。']
      ],
      official:'https://themodernsoftware.dev/', sources:[['2026 课程官网','https://themodernsoftware.dev/'],['官方作业仓库','https://github.com/mihail911/modern-software-dev-assignments'],['已有中文课程地图','https://github.com/aigeekops/learn-by-building/blob/main/study-resources/agent/cs146s-modern-software-dev-2026.md']],
      note:'按 2026 官网的周主题组织；期末项目单列。本站的迷你修复任务用于理解循环，与官方作业分别标注。'
    },
    cs336:{
      label:'CS336', english:'Language Modeling from Scratch', branch:'A · 大模型原理与研发', node:'a4',
      title:'从一段文字，<br>到一个语言模型。',
      intro:'沿着亲手造一个小模型的主线，把原理、计算与训练实践连起来。',
      fit:'进一步亲手训练模型与理解系统工程', version:'Stanford · Spring 2026', count:'16 讲现有精读', sample:2,
      prereq:'能用 Python 编程、看懂矩阵与概率、用 PyTorch 写训练循环，并解释损失、梯度与过拟合。需要时从全站地图回补基础。',
      groups:[{title:'模型与资源',ids:[1,2,3,4]},{title:'系统与规模',ids:[5,6,7,8,9,10,11,12]},{title:'数据与后训练',ids:[13,14,15,16]}],
      lessons:[
        ['概览与分词','从文本开始，理解语言建模任务。','解释文本怎样变成 token。'],
        ['资源核算','训练要多久，一张卡能装多大。','写出一份有假设、有单位的训练预算。'],
        ['架构与超参数','让模型结构与训练选择相互对应。','说明关键超参数改变了什么。'],
        ['注意力与 MoE','理解信息混合与稀疏计算。','比较不同架构的计算路径。'],
        ['GPU 与 TPU','把算子放进硬件。','区分计算与访存瓶颈。'],
        ['Kernel 与 Triton','从算子到执行效率。','解释一次内核优化的收益。'],
        ['并行：怎么切','模型、数据与设备怎样划分。','画出一次跨设备数据流。'],
        ['并行：ZeRO 分片','状态怎样分散存储。','解释分片节省了哪部分显存。'],
        ['Scaling Laws','用小实验预测更大训练。','说明拟合与外推的边界。'],
        ['推理与 KV Cache','减少生成时的重复计算。','解释缓存保存什么。'],
        ['缩放规律落地','把预算转成训练配置。','比较不同资源分配方案。'],
        ['评测','分数背后是什么任务。','给出合适的指标与对照。'],
        ['数据来源','训练数据从哪里来。','记录数据来源与使用条件。'],
        ['过滤、去重与配比','让数据质量可讨论。','比较处理前后的数据样本。'],
        ['SFT 与 RLHF','从预训练到指令与偏好。','区分训练目标与数据。'],
        ['RLVR 与推理','用可验证信号推动学习。','说明奖励与任务能力的关系。']
      ],
      official:'https://cs336.stanford.edu/', sources:[['官方课程','https://cs336.stanford.edu/']],
      note:'这里沿用已整理的第 1–16 讲精读目录；当前可体验资源核算单讲样例。'
    }
  };

  const expansionCourses = [{"id":"cs50p","label":"CS50P","title":"Python 与编程","lane":"shared","phase":"基础补全","summary":"变量、函数、文件、异常与测试","prereq":"可从第一个 Python 程序开始。","check":"独立完成一个读取文件、处理异常并带测试的小程序。","sources":[["Harvard CS50P","https://cs50.harvard.edu/python/"]],"node":"plan-cs50p"},{"id":"tools","label":"Missing Semester","title":"工程工具与实验方法","lane":"shared","phase":"基础补全","summary":"Shell、Git、环境、调试与代码质量","prereq":"能运行一个简单程序；工具与项目并行练习。","check":"复现一次环境配置、提交与错误恢复。","sources":[["MIT Missing Semester","https://missing.csail.mit.edu/"]],"node":"plan-tools"},{"id":"linear","label":"MIT 18.06","title":"线性代数","lane":"shared","phase":"按需回补","summary":"向量、矩阵变换、投影与特征值","prereq":"基本代数与函数；按当前任务选读。","check":"手算一个矩阵变换，再用代码核对坐标与维度。","sources":[["MIT 18.06 · 2010 公开版","https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/"]],"node":"plan-linear"},{"id":"probability","label":"MIT 18.05","title":"概率与统计","lane":"shared","phase":"按需回补","summary":"分布、条件概率、估计与假设检验","prereq":"基本代数；按采样、损失和评测问题回补。","check":"用一组样本比较估计结果，解释不确定性。","sources":[["MIT 18.05 · 2022 公开版","https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/"]],"node":"plan-probability"},{"id":"cs229","label":"CS229","title":"机器学习与泛化","lane":"a","phase":"按需回补","summary":"回归、分类、泛化与无监督学习","prereq":"Python、向量与基础概率；理论按知识点补充。","check":"区分拟合与泛化，比较训练集和独立测试集。","sources":[["Stanford CS229 · 历史公开版","https://see.stanford.edu/Course/CS229"]],"column":"1 / 4","row":3,"mobileColumn":"1","mobileRow":3,"icon":"chart-no-axes-combined","node":"plan-cs229"},{"id":"d2l","label":"动手学深度学习","title":"神经网络与 PyTorch","lane":"a","phase":"第一批补充","summary":"张量、自动微分、训练循环与注意力","prereq":"Python、基础矩阵计算与损失函数。","check":"写通前向、反向和更新，并解释训练曲线。","sources":[["动手学深度学习 · 中文版","https://zh.d2l.ai/"]],"column":"4 / 7","row":3,"mobileColumn":"2","mobileRow":3,"icon":"network","node":"plan-d2l"},{"id":"cme295","label":"CME 295","title":"Transformer 与大模型原理","lane":"shared","phase":"当前专题","summary":"模型、训练、推理、Agent 与评测","prereq":"线性代数、概率与基础机器学习；教学样例可先建立直觉。","check":"复算一次注意力，并说明训练、推理与工具调用的关系。","sources":[["CME 295 官方目录","https://cme295.stanford.edu/syllabus/"]],"column":"1 / 7","row":4,"mobileColumn":"1 / 3","mobileRow":4,"icon":"layers","node":"a3","course":"cme295"},{"id":"cs336","label":"CS336","title":"从零构建大模型","lane":"a","phase":"当前专题","summary":"模型、资源、训练系统、数据与后训练","prereq":"Transformer、PyTorch 与训练循环。","check":"实现小语言模型，并给出可复算的训练预算。","sources":[["CS336 官方课程","https://cs336.stanford.edu/"]],"column":"1 / 4","row":5,"mobileColumn":"1","mobileRow":5,"icon":"boxes","node":"a4","course":"cs336"},{"id":"hfagents","label":"HF Agents Course","title":"Agent 实作与工具循环","lane":"b","phase":"第二批补充","summary":"工具调用、观察行动、停止条件与评测","prereq":"编程、模型调用、结构化输出和错误处理。","check":"重放一条工具轨迹，并处理一次工具失败。","sources":[["Hugging Face Agents Course","https://huggingface.co/learn/agents-course/en/unit0/introduction"]],"column":"4 / 7","row":5,"mobileColumn":"2","mobileRow":5,"icon":"workflow","node":"plan-hfagents"},{"id":"cs146s","label":"CS146S","title":"AI 软件工程","lane":"b","phase":"当前专题","summary":"上下文、Skills、仓库、评审与交付","prereq":"编程、Git、测试和基本软件工程；不要求修完 CS336。","check":"交付一次可复现的代码改动、评审和测试结果。","sources":[["CS146S 官方课程","https://themodernsoftware.dev/"]],"column":"4 / 7","row":6,"mobileColumn":"2","mobileRow":6,"icon":"code-xml","node":"b4","course":"cs146s"},{"id":"cs231n","label":"CS231n","title":"视觉模型与表示","lane":"a","phase":"后续分支","summary":"图像模型、特征与视觉表示","prereq":"深度学习与 PyTorch；图像几何、标定按任务补充。","check":"修改输入或模型，解释视觉结果与失败案例。","sources":[["CS231n · 2025 公开材料","https://cs231n.stanford.edu/2025/"]],"column":"1 / 4","row":6,"mobileColumn":"1","mobileRow":6,"icon":"scan-eye","node":"plan-cs231n"},{"id":"fsdl","label":"Full Stack Deep Learning","title":"从实验到工程交付","lane":"shared","phase":"第二批补充","summary":"实验、数据、测试、部署与维护","prereq":"已有一个能运行的模型或应用。","check":"为作品补齐实验记录、测试、部署和失败复现。","sources":[["Full Stack Deep Learning · 2022","https://fullstackdeeplearning.com/course/2022/"]],"column":"1 / 7","row":7,"mobileColumn":"1 / 3","mobileRow":7,"icon":"package-check","node":"plan-fsdl"},{"id":"cs234","label":"CS234","title":"强化学习基础","lane":"a","phase":"后续分支","summary":"MDP、价值函数、Q-learning 与策略优化","prereq":"概率、机器学习与编程；按任务回补。","check":"在小环境中复算价值更新，比较奖励设计。","sources":[["Stanford CS234","https://web.stanford.edu/class/cs234/modules.html"]],"column":"1 / 7","row":8,"mobileColumn":"1 / 3","mobileRow":8,"icon":"route","node":"plan-cs234"},{"id":"arduino","label":"Arduino Lessons","title":"电子、传感器与执行器","lane":"c","phase":"深化已有引用","summary":"GPIO、PWM、测量与电机；连接 Learn ESP32","prereq":"基础编程与电路；按实际板卡核对供电和接口。","check":"分别保存计算、在线仿真与实测结果，解释差异。","sources":[["Paul McWhorter Arduino Lessons","https://toptechboy.com/arduino-lessons/"],["Learn ESP32 在线实验室","https://aigeekops.github.io/learn-esp32/"]],"column":"7 / 10","row":3,"mobileColumn":"1","mobileRow":10,"icon":"cpu","node":"plan-arduino"},{"id":"mit2007","label":"MIT 2.007","title":"机械设计与 CAD","lane":"c","phase":"候选 · 选读","summary":"机构、电机、齿轮、CAD 与设计迭代","prereq":"基础力学、长度角度与简单 CAD；器材和软件另作适配。","check":"给出可修改的机构、尺寸、装配与选型依据。","sources":[["MIT 2.007 · 2009 公开版","https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/"]],"column":"10 / 13","row":3,"mobileColumn":"2","mobileRow":10,"icon":"component","node":"plan-mit2007"},{"id":"modern","label":"Modern Robotics","title":"坐标、运动学与机器人原理","lane":"c","phase":"深化已有引用","summary":"变换、Jacobian、轨迹、动力学与控制","prereq":"向量、矩阵、坐标与基础微积分；按任务安排阅读。","check":"用小车或两连杆机械臂复算一次运动。","sources":[["Modern Robotics 作者配套材料","https://modernrobotics.northwestern.edu/nu-gm-book-resource/"]],"column":"7 / 13","row":4,"mobileColumn":"1 / 3","mobileRow":11,"icon":"move-3d","node":"plan-modern"},{"id":"pid","label":"Understanding PID","title":"反馈控制与调参","lane":"c","phase":"深化已有引用","summary":"误差、反馈、饱和、噪声与响应","prereq":"目标、传感器、执行器与时间序列。","check":"比较两组参数的响应，说明饱和与噪声影响。","sources":[["Understanding PID Control","https://www.mathworks.com/videos/series/understanding-pid-control.html"]],"column":"7 / 10","row":5,"mobileColumn":"1","mobileRow":12,"icon":"sliders-horizontal","node":"plan-pid"},{"id":"kalman","label":"Kalman & Bayesian Filters","title":"噪声、滤波与状态估计","lane":"c","phase":"深化已有引用","summary":"预测、观测、更新与不确定性","prereq":"Python、概率与基本状态模型。","check":"修改噪声假设，比较真实状态、测量和估计。","sources":[["Kalman and Bayesian Filters in Python","https://rlabbe.github.io/Kalman-and-Bayesian-Filters-in-Python/"]],"column":"10 / 13","row":5,"mobileColumn":"2","mobileRow":12,"icon":"activity","node":"plan-kalman"},{"id":"ros","label":"ROS 2 + Gazebo","title":"机器人软件与物理仿真","lane":"c","phase":"共同工程基础","summary":"节点、话题、TF、URDF、日志与仿真","prereq":"Linux、编程、坐标变换与基本反馈；沿用 Jazzy / Harmonic 配套。","check":"构建可重启、可回放、能定位故障的机器人示例。","sources":[["ROS 2 Jazzy 官方教程","https://docs.ros.org/en/jazzy/Tutorials.html"],["Gazebo Harmonic 配套说明","https://gazebosim.org/docs/harmonic/ros_installation/"]],"column":"7 / 13","row":6,"mobileColumn":"1 / 3","mobileRow":13,"icon":"boxes","node":"plan-ros"},{"id":"bonn","label":"Bonn Mobile Robotics","title":"移动机器人原理","lane":"c","phase":"候选 · 导航分支","summary":"概率定位、滤波、建图与路径规划","prereq":"坐标、概率、状态估计与基础机器人运动。","check":"比较定位与建图结果，记录轨迹误差与失败条件。","sources":[["Bonn · 2020 在线课程","https://www.ipb.uni-bonn.de/online-training-robotics/index.html"]],"column":"7 / 10","row":7,"mobileColumn":"1","mobileRow":14,"icon":"navigation","node":"plan-bonn"},{"id":"manipulation","label":"MIT Robotic Manipulation","title":"机械臂操作原理","lane":"c","phase":"候选 · 机械臂分支","summary":"感知、抓取、规划与控制","prereq":"坐标、正逆运动学、Jacobian 与基础控制。","check":"用小规模示例完成受约束的抓取与放置。","sources":[["MIT Robotic Manipulation","https://manipulation.mit.edu/"]],"column":"10 / 13","row":7,"mobileColumn":"2","mobileRow":14,"icon":"hand","node":"plan-manipulation"},{"id":"nav2","label":"Nav2","title":"自主导航工程","lane":"c","phase":"候选 · 工程材料","summary":"地图、定位、规划、控制与行为树","prereq":"ROS 2、定位与规划；制作时匹配选定 ROS 2 版本。","check":"让小车完成导航任务，分别报告仿真与真机结果。","sources":[["Nav2 官方文档","https://docs.nav2.org/"]],"column":"7 / 10","row":8,"mobileColumn":"1","mobileRow":15,"icon":"map-pinned","node":"plan-nav2"},{"id":"moveit","label":"MoveIt 2","title":"机械臂规划与执行","lane":"c","phase":"候选 · 工程材料","summary":"机器人模型、碰撞、规划与执行","prereq":"ROS 2、运动学与关节限制；文档版本与实际环境匹配。","check":"复现无碰撞轨迹，解释执行限制与失败案例。","sources":[["MoveIt 2 官方教程","https://moveit.picknik.ai/main/doc/tutorials/tutorials.html"]],"column":"10 / 13","row":8,"mobileColumn":"2","mobileRow":15,"icon":"git-pull-request-arrow","node":"plan-moveit"},{"id":"lerobot","label":"HF Robotics + LeRobot","title":"机器人数据与模仿学习","lane":"c","phase":"后续 · 公开单元选用","summary":"数据检查、行为克隆与独立评测","prereq":"机器人系统、深度学习与 PyTorch。规划注明部分课程单元待公开，启动时核对材料。","check":"检查观测与动作数据，在独立条件下比较基线和策略。","sources":[["Hugging Face Robotics Course","https://huggingface.co/learn/robotics-course/unit0/1"],["LeRobot 文档","https://huggingface.co/docs/lerobot/"]],"column":"7 / 13","row":9,"mobileColumn":"1 / 3","mobileRow":17,"icon":"database","node":"plan-lerobot"},{"id":"cs224r","label":"CS224R","title":"机器人学习进阶","lane":"c","phase":"候选 · 机器人学习","summary":"模仿学习、深度 RL、模型学习与离线数据","prereq":"机器学习、深度学习与 PyTorch。CS234 可按需回补，并非强制修课链。","check":"复现实验配置、独立评测与失败分析。","sources":[["Stanford CS224R","https://cs224r.stanford.edu/"]],"column":"4 / 10","row":10,"mobileColumn":"1 / 3","mobileRow":18,"icon":"brain-circuit","node":"plan-cs224r"},{"id":"underactuated","label":"Underactuated Robotics","title":"运动控制与动力学进阶","lane":"c","phase":"后期选读","summary":"非线性动力学、轨迹优化与运动控制","prereq":"机器人动力学、控制、线性代数和微积分；按项目需要进入。","check":"复算一个控制或轨迹优化例子，说明模型假设。","sources":[["MIT Underactuated Robotics","https://underactuated.mit.edu/"]],"column":"10 / 13","row":10,"mobileColumn":"1 / 3","mobileRow":19,"icon":"orbit","node":"plan-underactuated"}];
  const expansionById = Object.fromEntries(expansionCourses.map(p=>[p.id,p]));
  expansionCourses.forEach(p=>{
    if(!p.course)nodes[p.node]={code:p.label,title:p.title,kicker:p.phase,desc:p.summary,prereq:p.prereq,check:p.check,courses:[],planIds:[p.id],foot:p.label};
  });
  const planGroups={python:['cs50p'],math:['linear','probability'],experiment:['tools'],a1:['cs229'],a2:['d2l'],a5:['cs231n','cs234'],b1:['hfagents'],b3:['hfagents'],b5:['fsdl'],c1:['arduino'],c2:['mit2007','modern'],c3:['mit2007','modern','pid','kalman'],c4:['ros','bonn','nav2','manipulation','moveit'],c5:['lerobot','cs224r','underactuated']};
  Object.entries(planGroups).forEach(([id,ids])=>{nodes[id].planIds=ids;});
  nodes.a3.courses=['cme295'];nodes.a4.courses=['cs336'];nodes.b4.courses=['cs146s'];
  nodes.shared={code:'能力交汇',title:'共享表征、评测与跨方向能力',kicker:'共享能力 · 按需连接',desc:'数据表征与独立评测贯穿不同方向；视觉、强化学习与软件工程进一步连接机器人实践。',prereq:'按当前任务回补，不要求先修完所有分支。',check:'用独立输入复现结果，说明数据、误差与条件。',courses:['cme295','cs146s'],planIds:['cs231n','cs234','fsdl'],foot:'视觉 × 强化学习 × 工程'};

  const lessonInfo = {
    cme295:{number:'第 01 讲 · Transformer',title:'“追”这个词，应该关注谁？',intro:'把一句话拆成三个教学 token，用二维向量算出一行注意力。',output:'手算一行权重，并解释输出向量。',analogy:'注意力像查资料：先说明自己要找什么，再决定从每份资料里拿多少。',heading:'先分清：想找什么、怎样匹配、带回什么。',body:'Query 是当前 token 发出的查询，Key 用来和查询匹配，Value 是要汇总的信息。先用 Q 与 K 算出分数，再用 softmax 变成权重，最后按权重混合 V。',second:'这里的“小猫 / 追 / 毛球”是教学切分，向量也是手工预设。我们先把计算算通；实际模型中的投影参数需要从训练中学到。',question:'注意力权重更大，直接意味着什么？',answers:['这个 token 的 Value 在汇总中占比更大','这个 token 永远更重要','这个词出现得更多'],correct:0,feedback:'它表示本次计算里 Value 的混合比例；换一个 Query，权重也会改变。'},
    cs146s:{number:'第 01 周 · Coding Agent 内部机制',title:'Agent 改完代码，就算完成了吗？',intro:'跟着一个小修复，看清任务、工具、反馈与结束条件怎样连起来。',output:'复述一次工具轨迹，区分改动与验证。',analogy:'Agent 像接到任务的同事：先看现场，再动手，拿到检查结果后继续决定。',heading:'关键不只是生成代码，而是接住每一次反馈。',body:'读文件获得现状，运行测试暴露差异，修改文件后再运行测试。工具结果需要回到下一轮上下文，模型才有依据决定继续改，还是给出结果。',second:'下面是固定脚本驱动的本地教学回放，没有连接模型或终端。加法错误、乘法修复与三组测试由浏览器实际计算；它用来展示循环的结构。',question:'文件已经改好，接下来最有价值的一步是？',answers:['直接宣布任务完成','重新运行相关测试，检查结果','再生成一份更长的总结'],correct:1,feedback:'改过代码是一个动作。把预期与实际结果对上，才有可检查的依据。'},
    cs336:{number:'第 02 讲 · 资源核算',title:'训练一个模型，要算多久？',intro:'参数、数据与算力各自怎样影响训练时间？跟着一笔能复算的账把它弄清楚。',output:'一份有假设、有单位的训练预算。',analogy:'训练时间 ≈ 要搬的箱子总量 ÷ 实际搬运速度。',heading:'先把训练，想成搬完一堆箱子。',body:'参数与训练 token 决定工作总量，设备数量与每卡算力决定峰值能力；并非每一刻都在做有效计算，所以还要乘上实际利用率 MFU。',second:'本例用 6ND 近似训练计算量；每卡峰值按 1,000 TFLOP/s 假设。结果是计算估计，用来讨论资源，不是设备实测。',question:'同样的工作，MFU 从 50% 降到 25%，预计用时怎样变化？',answers:['缩短一半','基本不变','变成两倍'],correct:2,feedback:'有效速度减半，工作量不变，预计时间约变成两倍。'}
  };
  const defaultState = {view:'map',node:'a3',nodeOpen:false,course:'cme295',selected:1,section:'explain',search:'',mapMode:'overview',atlasPlaying:true};
  let state = {...defaultState};
  let attention = {step:0,query:1,causal:false};
  let agent = {step:0};
  let budget = {step:0,n:7,d:140,g:8,mfu:50};
  let playing = false;
  let timer = null;
  let answer = null;
  const readSaved = raw => {
    const saved = raw && raw.privateContent;
    if (!saved || saved.version !== 1) return false;
    const s = saved.state || {};
    state = {...defaultState,...s};
    if (!['map','course','lesson','projects','personal','today','routes','records','resources'].includes(state.view)) state.view='map';
    if (!nodes[state.node]) state.node='a3';
    if (!courses[state.course]) state.course='cme295';
    if (!Number.isInteger(state.selected) || state.selected<1 || state.selected>courses[state.course].lessons.length) state.selected=courses[state.course].sample;
    if (!['explain','lab','exercise','read'].includes(state.section)) state.section='explain';
    if (state.view==='lesson') state.selected=courses[state.course].sample;
    state.search=typeof state.search==='string'?state.search.slice(0,100):'';
    state.nodeOpen=Boolean(state.nodeOpen);
    state.mapMode=state.mapMode==='courses'?'courses':'overview';
    state.atlasPlaying=state.atlasPlaying!==false;
    return true;
  };
  readSaved(globalThis.openai && globalThis.openai.widgetState);
  state.view='map';state.nodeOpen=false;state.search='';state.mapMode='overview';
  const save = () => {
    if (globalThis.openai && typeof globalThis.openai.setWidgetState === 'function') {
      globalThis.openai.setWidgetState({
        modelContent:{page:state.view,node:nodes[state.node].title,course:state.view==='map'?null:courses[state.course].label,section:state.view==='lesson'?state.section:null},
        privateContent:{version:1,state:{...state}}
      }).catch(() => {});
    }
  };
  const stop = () => {playing=false;if(timer)clearTimeout(timer);timer=null;};
  const icons = () => {if(globalThis.lucide)globalThis.lucide.createIcons({attrs:{width:16,height:16}});};
  let moduleHeading=null;
  const moduleTitles={map:'学习地图',today:'今日学习台',routes:'我的路线',personal:'制定个人路线',records:'学习记录',resources:'学习资料',projects:'项目实践'};
  function renderAppShell(){
    const isMap=state.view==='map',topbar=root.querySelector('.app-topbar');
    root.dataset.view=state.view;root.classList.toggle('is-map-view',isMap);topbar.classList.toggle('module-header',!isMap);
    const activeView={today:'workspace',routes:'route-view',personal:'route-view',records:'records',resources:'resources',projects:'projects'}[state.view]||'map';
    root.querySelectorAll('.nav-item').forEach(el=>{const active=el.dataset.action===activeView;el.classList.toggle('is-active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    const descriptor=moduleHeading?.view===state.view?moduleHeading:null;
    const title=descriptor?.title||moduleTitles[state.view]||'学习课程',subtitle=descriptor?.copy||'';
    let crumbs=`<div class="module-title-group"><h1 id="lbb-page-title">${esc(title)}</h1>${subtitle?`<p class="module-subtitle" title="${esc(subtitle)}">${esc(subtitle)}</p>`:''}</div>`;
    contextNav.innerHTML='';
    breadcrumbs.innerHTML=crumbs;main.setAttribute('aria-label',title);
    const header=root.querySelector('.header-learning-actions'),p=activePersonal(),saved=personalRoutes.items.filter(x=>x.status==='active');
    const search=isMap?'<label class="search header-map-search"><i data-lucide="search" aria-hidden="true"></i><input id="lbb-map-search" type="search" placeholder="搜索知识点、课程或项目" aria-label="搜索知识点、课程或项目" value="'+esc(state.search)+'"></label>':'';
    const picker=saved.length&&state.view!=='personal'?'<label class="header-route-picker" for="lbb-current-learning-route"><span>个人路线</span><select id="lbb-current-learning-route" aria-label="当前个人路线">'+(!p?'<option value="" selected disabled>选择已保存路线</option>':'')+saved.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===p?.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>':'';
    let actions=descriptor?.actions||'';
    if(!actions&&!p&&['map','resources','projects'].includes(state.view))actions=button('制定个人路线','personal',null,true);
    if(header)header.innerHTML=search+picker+(actions?'<div class="module-page-actions">'+actions+'</div>':'');
    let tools=topbar.querySelector('.module-tools');if(!tools){tools=document.createElement('div');tools.className='module-tools';topbar.append(tools);}
    tools.hidden=true;tools.replaceChildren();
    let mapControls=topbar.querySelector('.header-map-controls');
    if(isMap){if(!mapControls){mapControls=document.createElement('div');mapControls.className='header-map-controls';topbar.append(mapControls);}}
    else mapControls?.remove();
    topbar.dataset.moduleView=state.view;icons();
  }
  function chrome(){
    if(state.view==='course'||state.view==='lesson'){
      const c=courses[state.course];
      breadcrumbs.innerHTML='<button data-action="map">学习地图</button><span>/</span>'+(state.view==='lesson'?'<button data-action="course" data-value="'+state.course+'">'+c.label+'</button><span>/</span><b>'+lessonInfo[state.course].number+'</b>':'<b>'+c.label+' · 课程目录</b>');
      contextNav.innerHTML='<span class="nav-caption">'+c.label+' · 学习位置</span><div class="context-list"><button class="'+(state.view==='course'?'is-active':'')+'" data-action="course" data-value="'+state.course+'">课程地图与目录</button><button class="'+(state.view==='lesson'?'is-active':'')+'" data-action="sample" data-value="'+state.course+'">'+(state.course==='cs336'?'02　资源核算':state.course==='cme295'?'01　Transformer':'W1　Agent 内部机制')+'</button></div>';
    }
  }
  function renderAppChrome(){
    renderAppShell();chrome();
    // Course directories belong in the content area; the sidebar is global navigation.
    contextNav.replaceChildren();
    if(['course','lesson'].includes(state.view)){
      const current=[...breadcrumbs.querySelectorAll('button,b')].at(-1);
      current?.setAttribute('aria-current','page');
    }
  }
  function syncModuleHeader(){
    if(state.view==='map')return;
    const topbar=root.querySelector('.app-topbar'),same=topbar.dataset.moduleView===state.view;
    const focus=topbar.contains(document.activeElement)?{id:document.activeElement.id,action:document.activeElement.dataset.action,value:document.activeElement.dataset.value}:null;
    const selector=state.view==='today'?'.workspace-view-switch':state.view==='records'?'.workspace-record-summary':['resources','projects'].includes(state.view)?'.workspace-resource-toolbar':null;
    const control=selector?(main.querySelector(selector)||(same?topbar.querySelector('.module-tools '+selector):null)):null;
    renderAppChrome();
    const tools=topbar.querySelector('.module-tools'),p=activePersonal(),c=currentCourse();
    if(state.view==='today'&&p){tools.innerHTML='<div class="module-context"><span class="module-context-dot"></span><label class="workspace-course-picker" for="lbb-current-learning-course"><span>当前课程</span><select id="lbb-current-learning-course" '+(courseChangeBusy?'disabled':'')+'>'+p.courseIds.map(id=>'<option value="'+esc(id)+'" '+(id===c.id?'selected':'')+'>'+esc(expansionById[id].label)+'</option>').join('')+'</select></label><span>'+esc(routeDay())+'</span></div>';if(control)tools.append(control);}
    else if(state.view==='routes'&&p){const tasks=personalTasks(),dates=tasks.map(t=>t.due).filter(Boolean).sort(),done=tasks.filter(t=>t.state==='done').length;tools.innerHTML='<div class="module-context"><span class="module-context-dot"></span><button type="button" class="module-current-course" data-action="module-current-course" title="定位当前课程">当前课程 · '+esc(c.label)+'</button><span>'+p.days+' 天 · 每天 '+p.minutes+' 分钟</span><span>'+esc(dates[0]||p.start)+' — '+esc(dates.at(-1)||p.start)+'</span></div><span class="module-total">'+p.courseIds.length+' 组课程 · 已完成 '+done+' / '+tasks.length+' 项任务</span>';}
    else if(control)tools.append(control);
    else if(state.view==='personal')tools.innerHTML='<p class="module-hint">选择课程与起点 <span>→</span> 预览排期 <span>→</span> 采用后开始学习</p>';
    tools.hidden=!tools.childNodes.length;
    if(state.view==='routes')main.querySelector('.workspace-route-overview')?.remove();
    if(['course','lesson'].includes(state.view))main.querySelectorAll('.back-link').forEach(el=>el.remove());
    if(['course','lesson'].includes(state.view)){const heading=main.querySelector('h1');if(heading)main.setAttribute('aria-label',heading.textContent);}
    if(focus){const next=focus.id?topbar.querySelector('#'+CSS.escape(focus.id)):[...topbar.querySelectorAll('[data-action]')].find(x=>x.dataset.action===focus.action&&x.dataset.value===focus.value);next?.focus({preventScroll:true});}
    icons();
  }
  root.addEventListener('click',event=>{
    if(event.target.closest('[data-action="module-current-course"]'))main.querySelector('.workspace-course-step.is-current')?.scrollIntoView({block:'center',behavior:'auto'});
    if(event.target.closest('[data-action="module-directory"]'))main.querySelector('.syllabus-heading')?.scrollIntoView({block:'start',behavior:'auto'});
  });
  function render(){
    courseHeroController?.dispose();courseHeroController=null;
    stopWorkspaceCardFlow();
    if(state.view!=='map'){atlasController?.dispose();atlasController=null;}
    ++workspaceTicket;main.hidden=false;renderAppChrome();
    if(state.view==='map')renderMap();
    else if(state.view==='course')renderCourse();
    else if(state.view==='lesson')renderLesson();
    else if(state.view==='personal')renderPersonalRoutes();
    else renderUnifiedPage(state.view);
    if(['course','lesson','personal'].includes(state.view))syncModuleHeader();
    icons();drawPersonalFocus();recoverPersonalRoutes();hydratePersonalFocus();
  }

  let atlasController = null;
  let atlasFullscreenWanted = false;
  const atlasSettings = {playing: state.atlasPlaying !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches};
  const atlasCourseNode = p => {
    const current = Boolean(p.course);
    return `<button type="button" class="atlas-node atlas-course-node map-node map-point atlas-clickable cursor-interaction ${current?'is-current-topic':''}" data-map-key="${p.id}" data-lane="${p.lane}" data-action="node" data-value="${p.node}" aria-pressed="${state.nodeOpen&&state.node===p.node}" style="--map-col:${p.column};--map-row:${p.row};--mobile-col:${p.mobileColumn};--mobile-row:${p.mobileRow}"><span class="atlas-node-top"><span class="atlas-topic-icon"><i data-lucide="${p.icon}" aria-hidden="true"></i></span><small>${p.lane==='a'?'AI · 原理与模型':p.lane==='b'?'AI · 应用与工程':p.lane==='c'?'机器人 · 工程与学习':'共享主干'}</small></span><b>${esc(p.label)}</b><span class="atlas-course-subtitle">${esc(p.title)}</span><span class="atlas-node-caption">${esc(p.summary)}</span><span class="atlas-course-phase"><span>${current?'当前专题 · 可体验':esc(p.phase)}</span><span aria-hidden="true">↗</span></span></button>`;
  };
  function atlasFullMarkup(){
    const foundation = document.getElementById('lbb-atlas-overview').content.querySelector('.atlas-origin').outerHTML;
    return `<div class="learning-atlas atlas-full" aria-label="完整课程地图：共同基础、AI 研发与应用、移动机器人、机械臂和机器人学习"><svg class="atlas-lines" aria-hidden="true" focusable="false"></svg><div class="atlas-grid">${foundation}<div class="atlas-section-heading atlas-ai-heading"><span>AI</span><div><b>理解模型，构建应用</b><small>模型研发 / AI 软件工程</small></div></div><div class="atlas-section-heading atlas-robot-heading"><span>R</span><div><b>从共同工程，走向两种机器人</b><small>自主导航 / 机械臂操作</small></div></div>${expansionCourses.filter(p=>p.column).map(atlasCourseNode).join('')}<button type="button" class="atlas-junction atlas-cross-skills map-point atlas-clickable cursor-interaction" data-map-key="cross" data-lane="shared" data-action="node" data-value="shared"><span class="junction-icon"><i data-lucide="git-merge" aria-hidden="true"></i></span><span class="junction-copy"><small>跨方向共享 · 按需连接</small><b>视觉 × 强化学习 × 工程</b><span>让 AI 原理与机器人实践相遇</span></span><span class="junction-arrow" aria-hidden="true">↗</span></button><button type="button" class="atlas-destination map-point atlas-clickable cursor-interaction" data-map-key="build" data-lane="shared" data-action="node" data-value="b5"><span class="destination-icon"><i data-lucide="rocket" aria-hidden="true"></i></span><span><small>BUILD SOMETHING REAL</small><b>用你的作品，把知识连起来。</b><span>语言模型 · 可靠 Agent · 自主导航 · 抓取操作</span></span><span class="destination-arrow" aria-hidden="true">↗</span></button></div></div>`;
  }
  function renderMap(){
    atlasController?.dispose({preserveFullscreen:true});
    main.scrollTop=0;
    const headerSearch=root.querySelector('#lbb-map-search');if(headerSearch)headerSearch.value=state.search;
    const full = state.mapMode === 'courses';
    main.innerHTML = `<section class="branching-screen" aria-label="动态学习地图"><div class="atlas-view-toolbar"><button type="button" id="atlas-expand-control" class="atlas-expand-control cursor-interaction" aria-controls="atlas-map-panel" aria-expanded="${full}" data-action="atlas-mode" data-value="${full?'overview':'courses'}"><i data-lucide="${full?'git-merge':'git-branch'}" aria-hidden="true"></i><span>${full?'收起课程，查看主干':'展开全部课程'}</span><small>26</small></button><button type="button" class="atlas-motion cursor-interaction" data-action="atlas-motion" aria-pressed="${atlasSettings.playing}" aria-label="${atlasSettings.playing?'暂停地图动画':'播放地图动画'}"><i data-lucide="${atlasSettings.playing?'pause':'play'}" aria-hidden="true"></i><span>${atlasSettings.playing?'动画开启':'动画暂停'}</span></button><div class="atlas-zoom-controls" role="group" aria-label="地图缩放"><button type="button" data-atlas-zoom="out" aria-label="缩小学习地图" title="缩小">−</button><output class="atlas-zoom-value" aria-label="地图缩放比例" aria-live="polite">适应中</output><button type="button" data-atlas-zoom="in" aria-label="放大学习地图" title="放大">＋</button><button type="button" class="atlas-fit-button" data-atlas-zoom="fit" aria-pressed="true">适应一屏</button></div><label class="atlas-fullscreen-search"><span class="sr-label">全屏地图搜索</span><input type="search" data-atlas-search placeholder="搜索课程与知识点" value="${esc(state.search)}"></label><button type="button" class="atlas-fullscreen-toggle" data-atlas-fullscreen aria-pressed="${atlasFullscreenWanted}">${atlasFullscreenWanted?'退出全屏':'全屏地图'}</button></div><span class="sr-label" id="atlas-zoom-help">悬停节点预览详情，点击节点固定展开。用加减按钮缩放，放大后可在图内滚动。</span><div id="atlas-map-panel" class="atlas-map-frame" role="region" aria-label="动态学习地图"><div class="atlas-map-viewport" tabindex="0" aria-label="可缩放学习地图" aria-describedby="atlas-zoom-help"><div class="atlas-map-canvas">${full?atlasFullMarkup():document.getElementById('lbb-atlas-overview').innerHTML}</div></div><div class="atlas-map-overlay"><div class="atlas-footer"><span class="atlas-legend"><span><i class="legend-a"></i>模型研发</span><span><i class="legend-b"></i>AI 应用</span><span><i class="legend-c"></i>机器人</span><span><i class="legend-join"></i>能力交汇</span></span><span class="atlas-explore-label">悬停查看详情 · 点击节点固定</span></div><p class="map-caption" id="lbb-map-results"></p></div></div><section class="node-detail" id="lbb-node-detail" aria-label="当前知识点详情" ${state.nodeOpen?'':'hidden'}></section></section>`;
    const toolbar=main.querySelector('.atlas-view-toolbar'),mapFrame=main.querySelector('.atlas-map-frame');
    if(toolbar&&mapFrame){
      mapFrame.prepend(toolbar);
      const legend=mapFrame.querySelector('.atlas-map-overlay'),mode=toolbar.querySelector('.atlas-expand-control,.atlas-mode-tabs');
      if(legend){(mode||toolbar.firstElementChild).after(legend);const caption=legend.querySelector('#lbb-map-results');if(caption){const note=document.createElement('details');note.className='atlas-map-note';note.innerHTML='<summary>连线说明 ⓘ</summary>';note.append(caption);legend.append(note);}}
    }
    renderNodeDetail();
    atlasController = mountLearningAtlas(full,toolbar);
    filterMap();
    icons();
  }
  function renderNodeDetail(previewId=null){
    const nodeId=previewId||state.node,open=Boolean(previewId)||state.nodeOpen;
    const n = nodes[nodeId];
    main.querySelectorAll('[data-action="node"]').forEach(b=>b.setAttribute('aria-pressed',String(state.nodeOpen&&b.dataset.value===state.node)));
    const container = main.querySelector('#lbb-node-detail');
    if(!container)return;
    container.hidden = !open;
    container.dataset.mode=previewId?'preview':'pinned';container.dataset.node=nodeId;
    if(!open)return;
    const currentRows = n.courses.map(id=>{const c=courses[id];return `<div class="course-row"><div><span class="atlas-detail-status">当前专题 · 可体验样例</span><h4>${c.label} · ${id==='cme295'?'Transformer 与大模型':id==='cs146s'?'AI 软件工程':'从零构建语言模型'}</h4><p>${c.fit}<br><span class="small">${c.count}</span></p></div><div class="row">${button('课程地图 →','course',id)}${button('加入我的路线','personal-add',id)}</div></div>`;}).join('');
    const plannedRows = (n.planIds||[]).map(id=>{const p=expansionById[id];return `<div class="course-row"><div><span class="atlas-detail-status planned">${esc(p.phase)}</span><h4>${esc(p.label)} · ${esc(p.title)}</h4><p>${esc(p.summary)}</p><div class="atlas-source-links">${p.sources.map(([name,url])=>link(esc(name),url)).join('')}</div>${button('加入我的路线','personal-add',p.id)}<p class="atlas-planned-caption">本站后续课程规划；具体单元与材料版本在制作时核对。</p></div></div>`;}).join('');
    const project = n.project ? `<div class="course-row"><div><h4>Learn ESP32 · ${n.project==='control'?'速度与反馈控制':'在线开发板实验'}</h4><p>在线教学模拟；再用独立的实测与标定检验。</p></div><a class="button" href="https://aigeekops.github.io/learn-esp32/${n.project==='control'?'#speed':'#board'}" target="_blank" rel="noopener noreferrer">去在线实验 ↗</a></div>` : '';
    container.innerHTML = `<div class="detail-heading"><div><div class="eyebrow">${esc(n.code)} · ${esc(n.kicker)}</div><h2>${esc(n.title)}</h2><p>${esc(n.desc)}</p></div><button class="detail-close cursor-interaction" data-action="close-node" aria-label="收起知识点详情">收起 ×</button></div><div class="detail-body"><div class="detail-prereq"><h3>先会这些</h3><p>${esc(n.prereq)}</p><div class="next-note"><h3>怎样检验理解</h3><p>${esc(n.check)}</p></div></div><div>${currentRows+plannedRows+project||'<p class="lead">按当前问题进入相应课程，用独立实践检验。</p>'}${nodeId==='b5'?button('打开项目实践 →','projects'):''}</div></div>`;
    const trigger = main.querySelector(`[data-action="node"][data-value="${nodeId}"]`);
    if(trigger&&(matchMedia('(min-width:671px)').matches||matchMedia('(hover:hover) and (pointer:fine)').matches)){
      const host=main.querySelector('.branching-screen').getBoundingClientRect(),mainRect=main.getBoundingClientRect();
      const top=atlasFullscreenWanted?0:Math.max(host.top,mainRect.top),bottom=atlasFullscreenWanted?innerHeight:Math.min(host.bottom,mainRect.bottom);
      container.style.maxHeight=Math.max(150,bottom-top-16)+'px';container.style.overflowY='auto';
      const detailTop=Math.max(top-host.top+8,Math.min(trigger.getBoundingClientRect().top-host.top,bottom-host.top-container.offsetHeight-8))+'px';
      container.style.top=detailTop;container.style.setProperty('--atlas-detail-top',detailTop);
    }
  }
  function filterMap(){
    const q = state.search.trim().toLowerCase();
    let matches = 0;
    main.querySelectorAll('.atlas-clickable').forEach(el=>{
      const n=nodes[el.dataset.value];
      if(!n)return;
      const text=[n.title,n.desc,n.code,n.foot||'',...n.courses.map(id=>courses[id].label+' '+courses[id].english),...(n.planIds||[]).map(id=>{const p=expansionById[id];return p.label+' '+p.title+' '+p.summary;}),n.project?'esp32':''].join(' ').toLowerCase();
      const ok=!q||text.includes(q);el.classList.toggle('is-dimmed',!ok);if(ok)matches++;
    });
    main.querySelector('.learning-atlas')?.classList.toggle('is-searching',Boolean(q));
    const result=main.querySelector('#lbb-map-results');
    if(result)result.textContent=q?(matches?`找到 ${matches} 个相关入口；点节点查看课程、先修和实践。`:'没有匹配项。可以试试 Nav2、机械臂、CS231n 或 Agent。'):(state.mapMode==='courses'?'实线表示建议路线，虚线表示按需补学或跨方向连接。课程规划依据 11 月 8 日归档；机器人候选保留讨论稿状态。':'实线表示建议顺序，交汇表示共享能力；点击节点查看课程与先修。');
  }

  function mountLearningAtlas(full,toolbar){
    const screen=main.querySelector('.branching-screen'),atlas=screen.querySelector('.learning-atlas'),svg=atlas.querySelector('.atlas-lines');
    toolbar ||= screen.querySelector('.atlas-view-toolbar');
    const motion=toolbar.querySelector('.atlas-motion'),label=screen.querySelector('.atlas-explore-label');
    const viewport=screen.querySelector('.atlas-map-viewport'),canvas=screen.querySelector('.atlas-map-canvas'),mapFrame=screen.querySelector('.atlas-map-frame'),overlay=screen.querySelector('.atlas-map-overlay');
    const zoomControls=toolbar.querySelector('.atlas-zoom-controls'),zoomValue=toolbar.querySelector('.atlas-zoom-value');
    const fullscreenButton=toolbar.querySelector('[data-atlas-fullscreen]'),fullscreenSearch=toolbar.querySelector('[data-atlas-search]');
    const detail=screen.querySelector('#lbb-node-detail');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const points=new Map([...atlas.querySelectorAll('[data-map-key]')].map(el=>[el.dataset.mapKey,el]));
    const previewTargets=new Map(points);atlas.querySelectorAll('.origin-topics [data-action="node"]').forEach((el,i)=>previewTargets.set('foundation-'+i,el));
    const overviewLinks=[['start','ml','a'],['start','apps','b'],['start','embedded','c'],['ml','dl','a'],['apps','rag','b'],['embedded','control','c'],['dl','shared','a'],['rag','shared','b'],['control','shared','c'],['shared','transformer','a'],['shared','agent','b'],['shared','ros','c'],['transformer','cs336','a'],['agent','embodied','b'],['ros','embodied','c'],['cs336','build','a'],['embodied','build','c']];
    const fullLinks=[
      ['start','cs229','a','optional'],['start','d2l','a'],['start','arduino','c'],['start','mit2007','c'],
      ['cs229','d2l','a','optional'],['d2l','cme295','a'],['arduino','pid','c','right'],['mit2007','modern','c'],
      ['modern','pid','c'],['modern','kalman','c'],['cme295','cs336','a'],['cme295','hfagents','b'],
      ['d2l','cs231n','a','optional-left'],['hfagents','cs146s','b'],['pid','ros','c'],['kalman','ros','c'],
      ['cs336','fsdl','a','left'],['cs146s','fsdl','b'],['d2l','cs234','a','optional-left'],
      ['ros','bonn','c'],['ros','manipulation','c','optional'],['bonn','nav2','c'],['manipulation','moveit','c'],
      ['cs231n','cross','a','optional-left'],['cs234','cross','a','optional'],['cs146s','cross','b','optional-left'],
      ['cross','lerobot','b','optional'],['nav2','lerobot','c','optional'],['moveit','lerobot','c','optional'],
      ['lerobot','cs224r','c'],['cs234','cs224r','a','optional-left'],['modern','underactuated','c','optional-right'],
      ['fsdl','build','b','left'],['nav2','build','c','right'],['moveit','build','c','right'],['cs224r','build','c'],['underactuated','build','c','optional']
    ];
    const links=full?fullLinks:overviewLinks;
    let previewKey=null,suppressedKey=null,previewTimer=null,closeTimer=null;
    let frame=0,focused=null,disposed=false,scale=1,fitScale=1,fitMode=true,naturalWidth=0,naturalHeight=0,nativeFullscreen=document.fullscreenElement===root;
    const ns='http://www.w3.org/2000/svg';
    const make=(tag,attrs)=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
    function outsideHeight(el){if(!el)return 0;const css=getComputedStyle(el);return el.offsetHeight+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);}
    function paintScale(){
      if(!viewport||!canvas)return;
      canvas.style.width=Math.ceil(naturalWidth*scale)+'px';canvas.style.height=Math.ceil(naturalHeight*scale)+'px';
      atlas.style.transform=`scale(${scale})`;viewport.dataset.zoom=String(scale);viewport.dataset.zoomMode=fitMode?'fit':'manual';
      if(mapFrame){mapFrame.dataset.zoom=String(scale);mapFrame.dataset.zoomMode=fitMode?'fit':'manual';}
      const percentage=Math.round(scale*100)+'%';if(zoomValue.textContent!==percentage)zoomValue.textContent=percentage;
      zoomControls.querySelector('[data-atlas-zoom="out"]').disabled=scale<=.05+.001;
      zoomControls.querySelector('[data-atlas-zoom="in"]').disabled=scale>=2-.001;
      zoomControls.querySelector('[data-atlas-zoom="fit"]').setAttribute('aria-pressed',String(fitMode));
    }
    function layoutZoom(){
      if(!viewport||!canvas)return;
      const css=getComputedStyle(viewport),gutter=(parseFloat(css.paddingLeft)||0)+(parseFloat(css.paddingRight)||0)+2;
      // A stable desktop graph keeps all branches together even on a narrow screen.
      naturalWidth=full?1120:960;
      if(atlas.style.width!==naturalWidth+'px')atlas.style.width=naturalWidth+'px';
      naturalHeight=atlas.offsetHeight;
      const mainCss=getComputedStyle(main),screenCss=getComputedStyle(screen),bottom=atlasFullscreenWanted?innerHeight:Math.min(innerHeight,main.getBoundingClientRect().bottom);
      const below=(parseFloat(atlasFullscreenWanted?screenCss.paddingBottom:mainCss.paddingBottom)||0);
      const available=Math.max(120,Math.floor(bottom-Math.max(0,(mapFrame||viewport).getBoundingClientRect().top)-below));
      const sized=mapFrame||viewport;if(sized.style.height!==available+'px')sized.style.height=available+'px';
      if(mapFrame&&overlay){mapFrame.style.setProperty('--atlas-overlay-height','0px');mapFrame.style.setProperty('--atlas-tools-height',Math.ceil(toolbar.offsetHeight+16)+'px');}
      fitScale=Math.max(.05,Math.min(1,(viewport.clientWidth-gutter)/naturalWidth,(viewport.clientHeight-gutter)/naturalHeight));
      if(fitMode)scale=fitScale;
      paintScale();
    }
    function zoom(next,fit=false){
      if(!viewport||!canvas)return;
      const old=scale,centerX=(viewport.scrollLeft+viewport.clientWidth/2-canvas.offsetLeft)/old,centerY=(viewport.scrollTop+viewport.clientHeight/2-canvas.offsetTop)/old;
      fitMode=fit;scale=Math.max(.05,Math.min(2,next));layoutZoom();
      if(fit){viewport.scrollLeft=0;viewport.scrollTop=0;}
      else{viewport.scrollLeft=canvas.offsetLeft+centerX*scale-viewport.clientWidth/2;viewport.scrollTop=canvas.offsetTop+centerY*scale-viewport.clientHeight/2;}
    }
    function handleZoom(event){
      const control=event.target.closest('[data-atlas-zoom]');if(!control||!zoomControls?.contains(control)||control.disabled)return;
      zoom(control.dataset.atlasZoom==='fit'?fitScale:scale*(control.dataset.atlasZoom==='in'?1.25:.8),control.dataset.atlasZoom==='fit');
    }
    function handleZoomKey(event){
      if(event.target!==viewport||event.ctrlKey||event.metaKey||event.altKey)return;
      if(['+','=','-','0'].includes(event.key)){event.preventDefault();zoom(event.key==='0'?fitScale:scale*(event.key==='-'?.8:1.25),event.key==='0');}
    }
    function syncFullscreen(){
      if(mapFrame&&toolbar.parentElement!==mapFrame)mapFrame.prepend(toolbar);
      screen.classList.toggle('is-map-fullscreen',atlasFullscreenWanted);
      fullscreenButton.textContent=atlasFullscreenWanted?'退出全屏':'全屏地图';fullscreenButton.setAttribute('aria-pressed',String(atlasFullscreenWanted));
      if(atlasFullscreenWanted){screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');}
      else{screen.removeAttribute('role');screen.removeAttribute('aria-modal');}
      scheduleDraw();
    }
    function leaveFullscreen(){
      atlasFullscreenWanted=false;syncFullscreen();
      if(document.fullscreenElement===root)document.exitFullscreen?.().catch(()=>{});
      fullscreenButton.focus({preventScroll:true});
    }
    async function toggleFullscreen(){
      if(atlasFullscreenWanted){leaveFullscreen();return;}
      atlasFullscreenWanted=true;syncFullscreen();fullscreenButton.focus({preventScroll:true});
      // The stable root survives course expansion; the fixed map remains the fallback.
      if(!document.fullscreenElement&&root.requestFullscreen){try{await root.requestFullscreen();nativeFullscreen=document.fullscreenElement===root;if(!atlasFullscreenWanted&&nativeFullscreen)await document.exitFullscreen();}catch{nativeFullscreen=false;}}
    }
    function changedFullscreen(){
      if(document.fullscreenElement===root)nativeFullscreen=true;
      else if(nativeFullscreen){nativeFullscreen=false;atlasFullscreenWanted=false;}
      if(!disposed)syncFullscreen();
    }
    function fullscreenKey(event){
      if(!atlasFullscreenWanted)return;
      if(event.key==='Escape'){event.preventDefault();leaveFullscreen();return;}
      if(event.key!=='Tab')return;
      const targets=[...screen.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
      if(!targets.length)return;
      const first=targets[0],last=targets.at(-1);
      if(event.shiftKey&&(!screen.contains(document.activeElement)||document.activeElement===first)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(!screen.contains(document.activeElement)||document.activeElement===last)){event.preventDefault();first.focus();}
    }
    function searchFullscreen(){
      state.search=fullscreenSearch.value;const header=root.querySelector('#lbb-map-search');if(header)header.value=state.search;filterMap();save();scheduleDraw();
    }
    function setMotion(){
      const animate=atlasSettings.playing&&!reduced.matches&&main.contains(atlas)&&!document.hidden;
      screen.classList.toggle('atlas-screen-paused',!animate);
      motion.setAttribute('aria-pressed',String(atlasSettings.playing));
      motion.setAttribute('aria-label',atlasSettings.playing?'暂停地图动画':'播放地图动画');
      motion.innerHTML=`<i data-lucide="${atlasSettings.playing?'pause':'play'}" aria-hidden="true"></i><span>${reduced.matches?'静态模式':atlasSettings.playing?'动画开启':'动画暂停'}</span>`;
      if(animate)svg.unpauseAnimations?.();else svg.pauseAnimations?.();icons();
    }
    function rect(key){const el=points.get(key),grid=atlas.querySelector('.atlas-grid');return{x:el.offsetLeft+grid.offsetLeft,y:el.offsetTop+grid.offsetTop,w:el.offsetWidth,h:el.offsetHeight};}
    function pathFor(from,to,lane,kind=''){
      const a=rect(from),b=rect(to),narrow=!viewport&&matchMedia(full?'(max-width:900px)':'(max-width:600px)').matches;
      let spread=from==='start'?(lane==='a'?-.23:lane==='c'?.23:0):from==='shared'?(lane==='a'?-.26:lane==='c'?.26:0):0;
      let arrive=to==='shared'?(lane==='a'?-.28:lane==='c'?.28:0):to==='embodied'?(lane==='b'?-.25:.25):to==='build'?(lane==='a'?-.23:.23):0;
      let x1=a.x+a.w*(.5+spread),y1=a.y+a.h,x2=b.x+b.w*(.5+arrive),y2=b.y;
      const railNeeded=kind.includes('left')||kind.includes('right')||(narrow&&((full&&Math.abs(b.y-a.y)>a.h+60)||(!full&&((from==='start'&&to==='embedded')||(from==='shared'&&to!=='transformer')||to==='embodied'||from==='cs336'||from==='dl'))));
      if(railNeeded){
        const left=kind.includes('left')||(!kind.includes('right')&&lane==='a');
        const rail=left?-5:atlas.clientWidth+5;
        x2=left?b.x:b.x+b.w;y2=b.y+b.h*.5;
        const down=y2>y1,turn=y1+(down?13:-13),corner=10*(down?1:-1);
        return {d:`M ${x1} ${y1} C ${x1} ${turn}, ${rail} ${turn}, ${rail} ${turn+corner} L ${rail} ${y2-corner} Q ${rail} ${y2}, ${x2} ${y2}`,x1,y1,x2,y2};
      }
      if(Math.abs(a.y-b.y)<15){x1=a.x+a.w;y1=a.y+a.h*.5;x2=b.x;y2=b.y+b.h*.5;return{d:`M ${x1} ${y1} C ${x1+10} ${y1}, ${x2-10} ${y2}, ${x2} ${y2}`,x1,y1,x2,y2};}
      const bend=Math.max(17,(y2-y1)*.53);
      return{d:`M ${x1} ${y1} C ${x1} ${y1+bend}, ${x2} ${y2-bend}, ${x2} ${y2}`,x1,y1,x2,y2};
    }
    function draw(){
      frame=0;if(disposed||!atlas.clientWidth)return;
      layoutZoom();
      const fragment=document.createDocumentFragment();svg.setAttribute('viewBox',`0 0 ${atlas.clientWidth} ${atlas.clientHeight}`);
      links.forEach(([from,to,lane,kind=''],i)=>{
        if(!points.has(from)||!points.has(to))return;
        const p=pathFor(from,to,lane,kind),optional=kind.includes('optional');
        const group=make('g',{class:`atlas-edge ${optional?'is-optional':''}`,'data-from':from,'data-to':to,style:`--edge-color:var(--atlas-${lane})`});
        group.append(make('path',{d:p.d,class:'atlas-line-base'}),make('path',{d:p.d,class:'atlas-line-trace'}));
        if(!optional){const dot=make('circle',{r:2.4,class:'atlas-traveler'});dot.append(make('animateMotion',{path:p.d,dur:`${4.5+i%4*.7}s`,begin:`${-i*1.13}s`,repeatCount:'indefinite',calcMode:'paced'}));group.append(dot);}
        group.append(make('circle',{cx:p.x1,cy:p.y1,r:2.5,class:'atlas-port'}),make('circle',{cx:p.x2,cy:p.y2,r:2.5,class:'atlas-port'}));fragment.append(group);
      });
      svg.replaceChildren(fragment);setMotion();if(focused)trace(focused);
    }
    function scheduleDraw(){if(!disposed&&!frame)frame=requestAnimationFrame(draw);}
    function trace(key){
      focused=key;atlas.classList.toggle('has-trace',Boolean(key));
      const relevant=new Set(key?[key]:[]),edgeKeys=new Set();
      function walk(current,upstream,seen=new Set()){
        if(seen.has(current))return;seen.add(current);
        links.forEach(([from,to,,kind=''])=>{if((upstream?to:from)!==current)return;const next=upstream?from:to;relevant.add(next);edgeKeys.add(`${from}:${to}`);if(!kind.includes('optional'))walk(next,upstream,seen);});
      }
      if(key){walk(key,true);walk(key,false);}
      points.forEach((el,id)=>{el.classList.toggle('is-related',relevant.has(id));el.classList.toggle('is-focused',id===key);});
      svg.querySelectorAll('.atlas-edge').forEach(el=>el.classList.toggle('is-related',edgeKeys.has(`${el.dataset.from}:${el.dataset.to}`)));
      label.textContent=key?`正在探索 · ${points.get(key).querySelector('b')?.textContent||'共同基础'}`:'悬停查看详情 · 点击节点固定';
    }
    function cancelPreviewTimers(){clearTimeout(previewTimer);clearTimeout(closeTimer);previewTimer=null;closeTimer=null;}
    function dismissPreview(suppress=false){
      cancelPreviewTimers();if(suppress)suppressedKey=previewKey;previewKey=null;
      if(!state.nodeOpen){renderNodeDetail();trace(null);}
    }
    function showPreview(key){
      clearTimeout(previewTimer);clearTimeout(closeTimer);closeTimer=null;
      const el=previewTargets.get(key);if(!el||el.dataset.action!=='node'||state.nodeOpen||suppressedKey===key)return;
      previewTimer=setTimeout(()=>{
        previewTimer=null;if(disposed||state.nodeOpen||!main.contains(el))return;
        if(!el.matches(':hover')&&!el.contains(document.activeElement))return;
        previewKey=key;renderNodeDetail(el.dataset.value);trace(points.has(key)?key:'start');icons();
      },160);
    }
    function leavePreview(){
      clearTimeout(previewTimer);previewTimer=null;clearTimeout(closeTimer);
      closeTimer=setTimeout(()=>{
        closeTimer=null;if(disposed||state.nodeOpen||detail.matches(':hover')||detail.contains(document.activeElement))return;
        if([...previewTargets.values()].some(el=>el.matches(':hover')||el.contains(document.activeElement)))return;
        dismissPreview();
      },240);
    }
    function enterDetail(){if(previewKey)trace(points.has(previewKey)?previewKey:'start');clearTimeout(closeTimer);closeTimer=null;clearTimeout(previewTimer);previewTimer=null;}
    function detailClick(event){
      if(event.target.closest('[data-action="close-node"]'))dismissPreview(true);
      else if(event.target.closest('[data-action="node"]')){cancelPreviewTimers();previewKey=null;}
    }
    function previewEscape(event){
      if(event.key==='Escape'&&previewKey&&!state.nodeOpen){event.preventDefault();event.stopPropagation();dismissPreview(true);}
    }
    previewTargets.forEach((el,key)=>{
      el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){trace(points.has(key)?key:'start');showPreview(key);}});
      el.addEventListener('pointerleave',()=>{if(suppressedKey===key)suppressedKey=null;if(!el.contains(document.activeElement))trace(null);leavePreview();});
      el.addEventListener('focusin',()=>{trace(points.has(key)?key:'start');if(el.matches(':focus-visible'))showPreview(key);});
      el.addEventListener('focusout',e=>{if(!el.contains(e.relatedTarget)){trace(null);leavePreview();}});
    });
    detail.addEventListener('pointerenter',enterDetail);detail.addEventListener('pointerleave',leavePreview);
    detail.addEventListener('focusin',enterDetail);detail.addEventListener('focusout',leavePreview);
    screen.addEventListener('click',detailClick);document.addEventListener('keydown',previewEscape,true);
    const changedMotion=()=>{atlasSettings.playing=!reduced.matches;setMotion();};
    const observer=new ResizeObserver(scheduleDraw);observer.observe(atlas);if(viewport)observer.observe(viewport);if(mapFrame)observer.observe(mapFrame);if(overlay)observer.observe(overlay);observer.observe(screen);observer.observe(main);observer.observe(toolbar);
    toolbar.addEventListener('click',handleZoom);viewport?.addEventListener('keydown',handleZoomKey);window.addEventListener('resize',scheduleDraw);
    fullscreenButton?.addEventListener('click',toggleFullscreen);fullscreenSearch?.addEventListener('input',searchFullscreen);document.addEventListener('fullscreenchange',changedFullscreen);document.addEventListener('keydown',fullscreenKey);
    reduced.addEventListener('change',changedMotion);document.addEventListener('visibilitychange',setMotion);scheduleDraw();
    syncFullscreen();
    document.fonts?.ready.then(()=>{if(!disposed)scheduleDraw();});
    return{setMotion,fit:()=>zoom(fitScale,true),dispose({preserveFullscreen=false}={}){disposed=true;cancelPreviewTimers();detail.removeEventListener('pointerenter',enterDetail);detail.removeEventListener('pointerleave',leavePreview);detail.removeEventListener('focusin',enterDetail);detail.removeEventListener('focusout',leavePreview);screen.removeEventListener('click',detailClick);document.removeEventListener('keydown',previewEscape,true);observer.disconnect();if(frame)cancelAnimationFrame(frame);toolbar.removeEventListener('click',handleZoom);viewport?.removeEventListener('keydown',handleZoomKey);window.removeEventListener('resize',scheduleDraw);fullscreenButton?.removeEventListener('click',toggleFullscreen);fullscreenSearch?.removeEventListener('input',searchFullscreen);document.removeEventListener('fullscreenchange',changedFullscreen);document.removeEventListener('keydown',fullscreenKey);reduced.removeEventListener('change',changedMotion);document.removeEventListener('visibilitychange',setMotion);svg.pauseAnimations?.();toolbar.remove();if(!preserveFullscreen){atlasFullscreenWanted=false;screen.classList.remove('is-map-fullscreen');if(document.fullscreenElement===root)document.exitFullscreen?.().catch(()=>{});}}};
  }

  let courseHeroController=null;
  const courseHeroTopics={
    cme295:{title:'一个 Query，怎样分配注意力？',badge:'二维教学模型',steps:['选 Query','计算匹配','分配权重','汇总 Value'],descriptions:['点选一个词，查看它的 Query 向量。','用当前 Query 与三个 Key 点积，再除以 √2。','分数经过 softmax，得到总和为 1 的混合权重。','按权重混合三个 Value，得到当前词的输出。'],note:'手设 Q / K / V · 无因果遮罩'},
    cs336:{title:'文字怎样变成下一个 token？',badge:'流程示意',steps:['切分文本','查找向量','经过模型','得到分布'],descriptions:['先把文字切成 token；此处用中文词作教学切分。','每个 token 查找对应向量，再加入位置信息。','向量经过注意力与 MLP，逐层更新表示。','从最后位置的表示得到词表分布，再选择下一 token。'],note:'预设向量与分布 · 未运行语言模型'},
    cs146s:{title:'一次修复，怎样形成证据？',badge:'固定轨迹回放',steps:['明确任务','读取代码','修改一行','复跑检查'],descriptions:['任务先给出可检查的目标：10 × 3 应当等于 30。','读到加法实现，示例输入得到 13，发现与预期不符。','把加法改成乘法；这时还需要检查修改结果。','对照三组预设验收输出，再回到任务给出结论。'],note:'示意回放 · 不代表实际工具执行结果'}
  };
  const courseHeroAttention={tokens:['小猫','追','毛球'],Q:[[1,0],[0,1],[1,1]],K:[[1,0],[0,1],[1,1]],V:[[2,0],[0,2],[1,1]]};
  function courseHeroAttentionValues(query){
    const {Q,K,V}=courseHeroAttention,q=Q[query];
    const scores=K.map(k=>q.reduce((sum,x,i)=>sum+x*k[i],0)/Math.sqrt(2));
    const max=Math.max(...scores),exponents=scores.map(s=>Math.exp(s-max)),sum=exponents.reduce((a,b)=>a+b,0),weights=exponents.map(x=>x/sum);
    return {q,scores,weights,output:V[0].map((_,i)=>weights.reduce((n,w,j)=>n+w*V[j][i],0))};
  }
  function courseHeroVisual(id,step=0,query=1){
    if(id==='cme295'){
      const {tokens,K,V}=courseHeroAttention,a=courseHeroAttentionValues(query);
      return `<div class="course-preview-query"><span>Query</span>${tokens.map((token,i)=>`<button type="button" data-preview-query="${i}" aria-pressed="${query===i}">${token}</button>`).join('')}<code>q = [${a.q.join(', ')}]</code></div><div class="course-preview-attention"><div class="course-preview-query-vector"><span>${tokens[query]}</span><b>Q</b><small>[${a.q.join(', ')}]</small></div><svg class="course-preview-links ${step===1||step===2?'is-active':''}" viewBox="0 0 40 75" aria-hidden="true"><path d="M 2 37.5 C 20 37.5,20 12.5,38 12.5"/><path d="M 2 37.5 L 38 37.5"/><path d="M 2 37.5 C 20 37.5,20 62.5,38 62.5"/></svg><div class="course-preview-attention-rows">${tokens.map((token,i)=>`<div class="course-preview-weight ${step===2?'is-active':''}"><span>${token}<small>${step===3?'V':'K'} [${(step===3?V:K)[i]}]</small></span><div class="course-preview-weight-track"><i style="width:${a.weights[i]*100}%"></i></div><b>${(a.weights[i]*100).toFixed(1)}<small>%</small></b></div>`).join('')}</div></div><div class="course-preview-equation ${step===3?'is-active':''}"><span>${step===1?'匹配分数':'Σ αᵢ Vᵢ'}</span><code>${step===1?'['+a.scores.map(x=>x.toFixed(2)).join(', ')+']':'['+a.output.map(x=>x.toFixed(2)).join(', ')+']'}</code><small>Σ α = 1.00</small></div>`;
    }
    if(id==='cs336')return `<div class="course-preview-pipeline">${['Token','Embedding','Transformer','Prediction'].map((name,i)=>`<div class="${i===step?'is-active':''}"><span>${String(i+1).padStart(2,'0')}</span><b>${name}</b>${i<3?'<i aria-hidden="true">→</i>':''}</div>`).join('')}</div><div class="course-preview-model"><div class="course-preview-model-input"><small>输入文本</small><b>小猫 喜欢 …</b><div class="course-preview-embeddings ${step===1?'is-active':''}" aria-label="预设教学向量">${[.2,.7,.4,.8,.3,.6,.5,.9,.1,.4,.8,.3].map(v=>`<i style="--cell:${v}"></i>`).join('')}</div><span>token → 向量</span></div><div class="course-preview-model-block ${step===2?'is-active':''}"><span>Attention</span><i aria-hidden="true">↓</i><span>MLP</span><small>逐层更新表示</small></div><div class="course-preview-predictions ${step===3?'is-active':''}" aria-label="下一 token 的预设示意分布">${[['鱼',.68],['饭',.24],['云',.08]].map(([token,value])=>`<div><span>${token}</span><i><b style="width:${value*100}%"></b></i><small>${Math.round(value*100)}%</small></div>`).join('')}</div></div>`;
    const details=[
      '<span class="course-preview-code-label">任务与验收</span><strong>subtotal(10, 3) → 30</strong><p>输入单价与数量，返回总价。</p>',
      '<span class="course-preview-code-label">读到当前实现</span><code>return price <b class="course-preview-error">+</b> qty</code><p><b class="course-preview-error">13</b><span> ≠ </span>预期 30</p>',
      '<span class="course-preview-code-label">查看这一行的变化</span><code class="course-preview-removed">− return price + qty</code><code class="course-preview-added">+ return price * qty</code>',
      '<span class="course-preview-code-label">预设验收输出</span><div class="course-preview-checks"><span>10 × 3 <b>30 ✓</b></span><span>0 × 5 <b>0 ✓</b></span><span>7 × 1 <b>7 ✓</b></span></div><p class="course-preview-success">三组示例符合预期，再给出结论。</p>'
    ];
    return `<div class="course-preview-agent-flow">${['任务','读取','修改','检查'].map((name,i)=>`<div class="${i===step?'is-active':i<step?'is-done':''}"><span>${i<step?'✓':i+1}</span><b>${name}</b></div>`).join('')}</div><div class="course-preview-code" data-agent-step="${step}">${details[step]}</div>`;
  }
  function heroSketch(id){
    const topic=courseHeroTopics[id];if(!topic)return '';
    return `<section class="course-preview" data-course-preview="${id}" aria-label="${topic.title}"><div class="course-preview-heading"><h2>${topic.title}</h2><span>${topic.badge}</span></div><div class="course-preview-stages" role="group" aria-label="预览步骤">${topic.steps.map((label,i)=>`<button type="button" data-preview-step="${i}" aria-pressed="${i===0}"><span>${i+1}</span>${label}</button>`).join('')}</div><div class="course-preview-visual">${courseHeroVisual(id)}</div><p class="course-preview-description">${topic.descriptions[0]}</p><div class="course-preview-controls"><button type="button" data-preview-action="toggle" aria-pressed="false">播放预览</button><button type="button" data-preview-action="next">下一步 →</button><span class="course-preview-count">1 / 4</span><small>${topic.note}</small></div></section>`;
  }
  function mountCourseHero(id){
    const host=main.querySelector('[data-course-preview]'),topic=courseHeroTopics[id];
    if(!host||!topic||host.dataset.coursePreview!==id)return {dispose(){}};
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let step=0,query=1,playing=!reduced.matches,disposed=false,timer=null;
    const visual=host.querySelector('.course-preview-visual'),description=host.querySelector('.course-preview-description'),toggle=host.querySelector('[data-preview-action="toggle"]'),count=host.querySelector('.course-preview-count');
    function cancelTimer(){if(timer!==null){clearTimeout(timer);timer=null;}}
    function schedule(){
      cancelTimer();
      const running=playing&&!document.hidden&&!reduced.matches&&!disposed&&host.isConnected;
      host.classList.toggle('is-playing',running);
      if(running)timer=setTimeout(()=>{timer=null;step=(step+1)%topic.steps.length;render();schedule();},1800);
    }
    function render(){
      if(disposed)return;
      // Step and playback controls stay mounted; preserve a replaced Query control's focus.
      const focusedQuery=document.activeElement?.closest('[data-preview-query]'),restoreQuery=focusedQuery&&visual.contains(focusedQuery)?focusedQuery.dataset.previewQuery:null;
      visual.innerHTML=courseHeroVisual(id,step,query);
      if(restoreQuery!==null)visual.querySelector(`[data-preview-query="${restoreQuery}"]`)?.focus({preventScroll:true});
      description.textContent=topic.descriptions[step];count.textContent=`${step+1} / ${topic.steps.length}`;
      host.querySelectorAll('[data-preview-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.previewStep)===step)));
      toggle.textContent=reduced.matches?'静态预览':playing?'暂停预览':'播放预览';
      toggle.setAttribute('aria-pressed',String(playing&&!reduced.matches));
      toggle.disabled=reduced.matches;toggle.title=reduced.matches?'已按系统偏好减少动画；仍可选择步骤与 Query。':'';
      host.dataset.phase=String(step);host.dataset.reducedMotion=String(reduced.matches);
    }
    function onClick(event){
      const control=event.target.closest('[data-preview-action],[data-preview-step],[data-preview-query]');if(!control||!host.contains(control))return;
      if(control.dataset.previewAction==='toggle')playing=!playing;
      else if(control.dataset.previewAction==='next'){playing=false;step=(step+1)%topic.steps.length;}
      else if(control.dataset.previewStep!==undefined){playing=false;step=Number(control.dataset.previewStep);}
      else if(control.dataset.previewQuery!==undefined){playing=false;query=Number(control.dataset.previewQuery);step=0;}
      render();schedule();
    }
    function onVisibility(){schedule();}
    function onReducedMotion(){if(reduced.matches)playing=false;render();schedule();}
    host.addEventListener('click',onClick);document.addEventListener('visibilitychange',onVisibility);
    if(reduced.addEventListener)reduced.addEventListener('change',onReducedMotion);else reduced.addListener(onReducedMotion);
    render();schedule();
    return {dispose(){
      if(disposed)return;disposed=true;cancelTimer();host.classList.remove('is-playing');host.removeEventListener('click',onClick);document.removeEventListener('visibilitychange',onVisibility);
      if(reduced.removeEventListener)reduced.removeEventListener('change',onReducedMotion);else reduced.removeListener(onReducedMotion);
    }};
  }

  function renderCourse(){
    const c=courses[state.course];
    main.innerHTML='<button class="back-link cursor-interaction" data-action="map">← 返回全站学习地图</button><div class="course-hero"><div><div class="eyebrow">'+c.branch+' · '+nodes[state.node].code+'</div><h1>'+c.title+'</h1><p class="lead">'+c.label+' · '+c.english+'<br>'+c.intro+'</p><div class="row">'+button('体验一讲：'+(state.course==='cme295'?'注意力':state.course==='cs146s'?'Agent 循环':'资源核算')+' →','sample',state.course,true)+'<button class="button cursor-interaction" data-action="prereq">检查学习起点</button></div><div class="course-meta"><span>'+c.version+'</span><span>'+c.count+'</span><span>讲解 → 动画 → 代码 → 练习</span></div></div>'+heroSketch(state.course)+'</div>'+
      '<details class="prereq" id="lbb-course-prereq"><summary class="cursor-interaction">这门课之前，先需要会什么？</summary><p>'+c.prereq+'</p><p>'+button('回到地图补基础','node-map',state.course==='cs146s'?'python':'a2')+'</p></details>'+
      '<div class="syllabus-heading"><div><h2>课程地图</h2><p>按主题找问题；点讲次，查看目标与学习入口。</p></div><span class="small muted">'+(state.course==='cs146s'?'编号 = 官方周次':'编号 = 讲次')+'</span></div><div class="syllabus-grid">'+c.groups.map(g=>'<section class="syllabus-group"><h3>'+g.title+'</h3>'+g.ids.map(n=>'<button class="lesson-choice cursor-interaction" data-action="select-lesson" data-value="'+n+'" aria-pressed="'+(n===state.selected)+'"><span class="lesson-number">'+(state.course==='cs146s'?'W':'')+pad(n)+'</span><span><strong>'+c.lessons[n-1][0]+'</strong>'+(n===c.sample?'<small>可体验单讲样例 →</small>':state.course==='cme295'&&n>=7?'<small>官方计划 · 以更新为准</small>':'')+'</span></button>').join('')+'</section>').join('')+'</div><div id="lbb-lesson-preview"></div>'+
      '<div class="method-strip"><div>01　通俗讲解<p>一个具体问题、一个小例子</p></div><div>02　逐步动画<p>一步一算，观察变化</p></div><div>03　代码运行<p>当前行、变量与画面对应</p></div><div>04　动手练习<p>先预测，再验证和解释</p></div></div><p class="source-line">'+c.note+'<br>'+c.sources.map(x=>link(x[0],x[1])).join('')+'</p>';
    renderLessonPreview();
    courseHeroController=mountCourseHero(state.course);
  }
  function renderLessonPreview(){
    const c=courses[state.course],n=state.selected,l=c.lessons[n-1];
    main.querySelectorAll('.lesson-choice').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.value)===n)));
    main.querySelector('#lbb-lesson-preview').innerHTML='<section class="lesson-preview"><div><div class="eyebrow">'+(state.course==='cs146s'?'第 '+pad(n)+' 周':'第 '+pad(n)+' 讲')+' · '+l[0]+'</div><h3>'+l[1]+'</h3><p>学后产出：'+l[2]+'</p><p class="small muted">'+(n===c.sample?'本站单讲样例：讲解、逐步演示、代码与练习均可操作。':'本次展示目录与目标；本站单讲内容待逐讲补齐。')+'</p></div><div>'+(n===c.sample?button('进入本讲样例 →','sample',state.course,true):'<a class="button" href="'+c.official+'" target="_blank" rel="noopener noreferrer">查看官方资料 ↗</a>')+'</div></section>';
  }
  function renderLesson(){
    const c=courses[state.course],l=lessonInfo[state.course];
    const tabs=[['explain','① 通俗讲解'],['lab','② 动画 + ③ 代码'],['exercise','④ 动手练习'],['read','深入阅读']];
    main.innerHTML='<button class="back-link cursor-interaction" data-action="course" data-value="'+state.course+'">← 返回 '+c.label+' 课程地图</button><div class="lesson-title"><div><div class="eyebrow">'+c.label+' · '+l.number+'</div><h1>'+l.title+'</h1><p class="lead">'+l.intro+'</p></div><aside class="lesson-output">这一讲的产出<b>'+l.output+'</b></aside></div><div class="lesson-tabs" role="tablist" aria-label="本讲学习步骤">'+tabs.map(t=>'<button class="cursor-interaction" role="tab" id="lbb-tab-'+t[0]+'" aria-controls="lbb-lesson-content" aria-selected="'+(state.section===t[0])+'" data-action="section" data-value="'+t[0]+'">'+t[1]+'</button>').join('')+'</div><section id="lbb-lesson-content" role="tabpanel" aria-labelledby="lbb-tab-'+state.section+'"></section>';
    renderLessonSection();
  }
  function renderLessonSection(){
    const target=main.querySelector('#lbb-lesson-content');
    root.querySelectorAll('.lesson-tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===state.section)));
    target.setAttribute('aria-labelledby','lbb-tab-'+state.section);
    if(state.section==='explain')renderExplain(target);
    else if(state.section==='lab')renderLab(target);
    else if(state.section==='exercise')renderExercise(target);
    else renderRead(target);
  }
  function renderExplain(target){
    const l=lessonInfo[state.course];
    answer=null;
    target.innerHTML='<div class="reading-layout"><article class="reading-paper"><div class="eyebrow">01 / 通俗讲解</div><h2>'+l.heading+'</h2><p>'+l.body+'</p><div class="analogy">'+l.analogy+'</div><p>'+l.second+'</p><div class="question"><h3>先作一个判断</h3><p>'+l.question+'</p><div class="answer-choices">'+l.answers.map((t,i)=>'<button class="cursor-interaction" data-action="answer" data-value="'+i+'" aria-pressed="false">'+t+'</button>').join('')+'</div><div class="feedback" id="lbb-answer-feedback" aria-live="polite">选一个答案，再用下一步的演示检验。</div></div><div class="row" style="margin-top:20px">'+button('带着预测看动画 →','section','lab',true)+'</div></article><aside class="reading-side"><h3>贯穿本讲的小例子</h3><p>'+(state.course==='cme295'?'三枚 token、二维向量、一行注意力。每个数字都能复算。':state.course==='cs146s'?'一个把加法改成乘法的小任务。每次工具动作都有输入和结果。':'7B 参数、140B token、8 张假设设备。每个单位都对得上。')+'</p><h3>看到哪里算学会？</h3><p>'+l.output+'</p><h3>接下来怎么学</h3><p>先预测 → 分步看 → 对照代码 → 换一组输入独立完成。</p></aside></div>';
  }
  const Q=[[1,0],[0,1],[1,1]], K=[[1,0],[0,1],[1,1]], V=[[2,0],[0,2],[1,1]], tokens=['小猫','追','毛球'];
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const softmax = scores => {const max=Math.max(...scores);const e=scores.map(x=>Math.exp(x-max));const sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);};
  const applyMask = scores => scores.map((x,i)=>attention.causal&&i>attention.query?-Infinity:x);
  const weightedSum = (weights,values) => [0,1].map(d=>weights.reduce((sum,w,i)=>sum+w*values[i][d],0));
  function attentionValues(){
    const q=Q[attention.query];
    const scores=K.map(k=>dot(q,k)/Math.sqrt(2));
    const masked=applyMask(scores);
    const weights=softmax(masked);
    const output=weightedSum(weights,V);
    return {q,scores,masked,weights,output};
  }
  function codeMarkup(lines,active){
    return '<div class="code-lines" aria-label="当前执行代码">'+lines.map((x,i)=>'<div class="code-line'+(i===active?' active':'')+'"><span class="line-no">'+(i+1)+'</span><span>'+esc(x)+'</span></div>').join('')+'</div>';
  }
  const stepsFor = id => id==='cme295'?['选择 Query','点积与缩放','softmax 权重','汇总 Value']:id==='cs146s'?['接收任务','读代码','跑测试','改一行','再测试','给结果']:['计算总量','峰值算力','有效速度','预计时间'];
  function activeLab(){return state.course==='cme295'?attention:state.course==='cs146s'?agent:budget;}
  function renderLab(target){
    if(!target)target=main.querySelector('#lbb-lesson-content');
    const previousFocus=document.activeElement;
    const focusInside=previousFocus&&target.contains(previousFocus);
    const focusKey=focusInside?{id:previousFocus.id,action:previousFocus.dataset.action,value:previousFocus.dataset.value}:null;
    const names=stepsFor(state.course),s=activeLab().step;
    const title=state.course==='cme295'?'一行注意力，怎样算出来？':state.course==='cs146s'?'一次修复，怎样走完循环？':'把训练时间，算进同一张账本';
    const setting=state.course==='cme295'?'<label><input type="checkbox" id="lbb-causal" '+(attention.causal?'checked':'')+'>因果遮罩</label>':state.course==='cs336'?'<label>MFU <select id="lbb-mfu" aria-label="有效算力利用率">'+[25,50,75,100].map(x=>'<option value="'+x+'" '+(budget.mfu===x?'selected':'')+'>'+x+'%</option>').join('')+'</select></label>':'<span class="tag">固定轨迹 · 本地回放</span>';
    target.innerHTML='<div class="lab" id="lbb-active-lab"><div class="lab-top"><div><h2>'+title+'</h2><p>左边看数据与过程，右边对照当前代码和变量。</p></div><div class="lab-settings">'+setting+'</div></div><div class="lab-steps" aria-label="演示步骤">'+names.map((name,i)=>'<button class="cursor-interaction" data-action="lab-step" data-value="'+i+'" aria-current="'+(i===s?'step':'false')+'">'+(i+1)+'. '+name+'</button>').join('')+'</div><div class="lab-grid" id="lbb-lab-grid">'+(state.course==='cme295'?attentionMarkup():state.course==='cs146s'?agentMarkup():budgetMarkup())+'</div><div class="lab-controls"><div class="row">'+button(playing?'暂停':'播放全过程','play',null,true)+button('下一步 →','next')+button('重置','reset')+'</div><span class="small muted">'+(s+1)+' / '+names.length+' · '+names[s]+'</span></div><p class="lab-footnote">'+(state.course==='cme295'?'教学假设：三枚 token、预设二维 Q / K / V；切换 Query 或遮罩后重新开始。浏览器执行数值计算。':state.course==='cs146s'?'固定工具轨迹在浏览器内回放；测试实际计算本例输入。没有连接模型、读取磁盘或运行终端。':'计算假设：训练量约为 6ND，每卡峰值 1,000 TFLOP/s。这里只估算时间，不包含完整显存预算。')+'</p></div>';
    const next=target.querySelector('[data-action="next"]');next.disabled=s===names.length-1;
    if(focusKey){
      const replacement=Array.from(target.querySelectorAll('button,input,select')).find(el=>focusKey.id?el.id===focusKey.id:focusKey.action&&el.dataset.action===focusKey.action&&el.dataset.value===focusKey.value);
      if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
    }
  }
  function attentionMarkup(){
    const a=attentionValues(),s=attention.step;
    const descriptions=['取出当前 token 的 Query。换一个 Query，就换了这次想找的信息。','Q 与各个 K 点积，再除以 √2。二维 toy 模型里，缩放维度为 2。',attention.causal?'未来位置先设为 −∞，再 softmax。被遮住的位置权重为 0。':'对分数做稳定 softmax：指数化后归一化，三个权重相加为 1。','用权重混合三个 Value，得到当前 Query 的输出向量。'];
    const lines=['const q = Q[query];','const scores = K.map(k => dot(q,k) / Math.sqrt(2));','const weights = softmax(applyMask(scores));','const output = weightedSum(weights, V);'];
    return '<div class="lab-visual"><div class="query-line"><h4>点一个 token 作为 Query</h4><div class="row">'+tokens.map((t,i)=>'<button class="query-token cursor-interaction" data-action="query" data-value="'+i+'" aria-pressed="'+(attention.query===i)+'">'+t+'</button>').join('')+'</div></div><table class="lab-table"><thead><tr><th>Token</th><th>Key</th><th>Value</th><th>缩放分数</th></tr></thead><tbody>'+tokens.map((t,i)=>'<tr><td>'+t+'</td><td>['+K[i]+']</td><td>['+V[i]+']</td><td>'+(s>=1?fmt(attention.causal&&i>attention.query&&s>=2?-Infinity:a.scores[i]):'—')+'</td></tr>').join('')+'</tbody></table><div class="weight-bars" aria-label="注意力权重">'+tokens.map((t,i)=>'<div class="weight-bar"><span>'+t+'</span><div class="weight-track"><span class="weight-fill" style="width:'+(s>=2?a.weights[i]*100:0)+'%"></span></div><span>'+(s>=2?fmt(a.weights[i]):'—')+'</span></div>').join('')+'</div><div class="output-strip"><span>输出向量</span><b>'+(s>=3?'['+a.output.map(x=>fmt(x)).join(', ')+']':'等待汇总')+'</b></div></div><div class="lab-code"><h4>当前公式</h4><div class="formula">'+['q = Q[query]','scoreᵢ = q · kᵢ / √2','α = softmax(scores)','output = Σ αᵢ vᵢ'][s]+'</div><p class="step-description">'+descriptions[s]+'</p><div class="code-label"><span>attention.js</span><span>浏览器数值计算</span></div>'+codeMarkup(lines,s)+'<div class="variables"><span>Query<b>['+a.q+']</b></span><span>权重和<b>'+(s>=2?fmt(a.weights.reduce((x,y)=>x+y,0)):'—')+'</b></span><span>未来位置<b>'+(attention.causal?'已遮罩':'可见')+'</b></span></div></div>';
  }
  const testCases=[[10,3],[0,5],[7,1]];
  const runTests = op => testCases.map(([price,qty])=>({price,qty,actual:op==='*'?price*qty:price+qty,expected:price*qty}));
  function replayAgent(until){
    const memory={operator:'+',tests:null,messages:[]};
    const messages=memory.messages;
    const trace=[{name:'read_file',args:{}},{name:'run_tests',args:{}},{name:'edit_file',args:{operator:'*'}},{name:'run_tests',args:{}},{name:'final_answer',args:{}}];
    const tools={
      read_file:()=>({operator:memory.operator}),
      run_tests:()=>{memory.tests=runTests(memory.operator);return memory.tests;},
      edit_file:args=>{memory.operator=args.operator;memory.tests=null;return {changed:true};},
      final_answer:()=>({verified:!!memory.tests&&memory.tests.every(t=>t.actual===t.expected)})
    };
    let step=0;
    while(step<until){
      const call=trace[step];
      const result=tools[call.name](call.args);
      messages.push({role:'tool',result});
      step+=1;
    }
    return memory;
  }
  function agentMarkup(){
    const s=agent.step,replay=replayAgent(s),tests=replay.tests||runTests(replay.operator);
    const calls=['用户任务','read_file("cart.py")','run_tests("cart")','edit_file("+", "*")','run_tests("cart")','final_answer()'];
    const outputs=['修复 subtotal(price, qty)，让总价等于单价 × 数量。保留三组可复算测试。','def subtotal(price, qty):\n    return price + qty','FAIL: subtotal(10, 3)\nexpected: 30\nactual:   13','def subtotal(price, qty):\n    return price * qty','PASS: 3 / 3 cases\nsubtotal(10, 3) = 30','已将 + 改为 *。\n三组测试通过；可以提交代码差异与检查结果。'];
    const descriptions=['先接收需求与结束条件。回放轨迹是固定的，后面的工具只操作本例内存数据。','读取现状：函数把单价与数量相加，和需求不一致。','测试结果成为工具反馈：10 + 3 得到 13，而预期是 30。','依据反馈把加法改成乘法；此刻只是代码发生了变化。','用相同测试再次计算。三组结果都与预期一致。','给出具体改动与验证结果。这个小任务到此结束。'];
    const lines=['const call = trace[step];','const result = tools[call.name](call.args);','messages.push({role: "tool", result});','step += 1;'];
    const phase=s===0?0:s===5?2:s%2===0?2:1;
    return '<div class="lab-visual"><h4>工具反馈循环</h4><div class="agent-flow"><div class="'+(phase===0?'active':'')+'">选择动作<br>Agent / 轨迹</div><div class="'+(phase===1?'active':'')+'">执行工具<br>读 · 测 · 改</div><div class="'+(phase===2?'active':'')+'">回填反馈<br>继续 / 结束</div></div><div class="tool-name">'+calls[s]+'</div><pre class="tool-output">'+esc(outputs[s])+'</pre><div style="margin-top:10px">'+tests.map(t=>'<div class="trace-row"><span>subtotal('+t.price+', '+t.qty+')</span><span class="'+(s>=2?(t.actual===t.expected?'passed':'failed'):'')+'">'+(s>=2?(s===3?'待复测':t.actual+' / 预期 '+t.expected):'等待测试')+'</span></div>').join('')+'</div></div><div class="lab-code"><h4>这一轮发生了什么</h4><div class="formula">'+(s===0?'task → context':s===5?'verified result → final':'tool call → result → context')+'</div><p class="step-description">'+descriptions[s]+'</p><div class="code-label"><span>trace-replay.js</span><span>固定调用序列</span></div>'+codeMarkup(lines,s===0?0:s===5?3:s%2===0?2:1)+'<div class="variables"><span>代码状态<b>'+(s>=3?'已修改':'原始 +')+'</b></span><span>验证状态<b>'+(s>=4?'3/3 通过':s===3?'待复测':s===2?'0/3 通过':'未运行')+'</b></span><span>结束条件<b>'+(s>=5?'已检查':'待检查')+'</b></span></div></div>';
  }
  function budgetValues(){
    const flops=6*budget.n*1e9*budget.d*1e9,peak=budget.g*1000*1e12,effective=peak*budget.mfu/100;
    return {flops,peak,effective,days:flops/effective/86400};
  }
  function budgetMarkup(){
    const b=budgetValues(),s=budget.step;
    const lines=['const flops = 6 * N * D;','const peak = GPUs * 1000e12;','const effective = peak * (MFU / 100);','const days = flops / effective / 86400;'];
    const text=['先估算需要完成的计算工作总量。参数 N 与训练 token D 都放回实际数量。','合计峰值 = 卡数 × 每卡峰值。本例假设每卡 1,000 TFLOP/s。','有效速度 = 峰值能力 × MFU。50% 表示只用上峰值的一半。','总工作量 ÷ 实际速度，先得到秒，再除以 86,400 换成天。'];
    const names=['训练总量','峰值算力','有效速度','预计时间'];
    const values=[(b.flops/1e21).toFixed(2)+' × 10²¹ FLOPs',(b.peak/1e12).toLocaleString()+' TFLOP/s',(b.effective/1e12).toLocaleString()+' TFLOP/s',fmt(b.days,1)+' 天'];
    return '<div class="lab-visual"><h4>换一组输入，重新复算</h4><div class="budget-inputs"><label>参数 N / B<input id="lbb-budget-n" type="number" min="0.1" max="1000" step="0.1" value="'+budget.n+'"></label><label>Token D / B<input id="lbb-budget-d" type="number" min="1" max="100000" step="1" value="'+budget.d+'"></label><label>GPU 数量<input id="lbb-budget-g" type="number" min="1" max="100000" step="1" value="'+budget.g+'"></label><span class="small muted">每卡 1,000 TFLOP/s</span></div>'+names.map((name,i)=>'<div class="budget-line'+(s===i?' is-current':'')+'"><span>'+(i+1)+'. '+name+'</span><b>'+(s>=i?values[i]:'—')+'</b></div>').join('')+'<div class="output-strip"><span>在这些假设下，约需</span><span class="result-big">'+(s>=3?fmt(b.days,1):'—')+'<small> 天</small></span></div></div><div class="lab-code"><h4>当前公式</h4><div class="formula">'+['FLOPs ≈ 6ND','peak = G × peak_per_GPU','effective = peak × MFU','days = FLOPs / effective / 86400'][s]+'</div><p class="step-description">'+text[s]+'</p><div class="code-label"><span>training-budget.js</span><span>浏览器数值计算</span></div>'+codeMarkup(lines,s)+'<div class="variables"><span>N / 参数<b>'+budget.n+'B</b></span><span>D / token<b>'+budget.d+'B</b></span><span>MFU<b>'+budget.mfu+'%</b></span></div></div>';
  }
  function renderExercise(target){
    if(state.course==='cme295'){
      target.innerHTML='<div class="exercise-paper"><div class="eyebrow">04 / 动手练习</div><h2>离开动画，独立算两步。</h2><p>已知分数 [0, ln 2]，Value 为 [[1, 0], [0, 2]]。对分数做 softmax，再计算输出向量。</p><div class="exercise-grid"><div><div class="exercise-fields"><label for="lbb-attn-weight">第一个位置的权重（0–1）<input id="lbb-attn-weight" type="number" step="0.001" placeholder="保留 3 位小数"></label><label for="lbb-attn-output">输出向量的第二维<input id="lbb-attn-output" type="number" step="0.001" placeholder="保留 3 位小数"></label></div>'+button('检查数值与原因','check-attention',null,true)+'<div class="exercise-result" id="lbb-exercise-result" aria-live="polite">先写下自己的结果，再检查。</div></div><div class="exercise-side"><h3>把过程写清楚</h3><code>exp(0) = 1\nexp(ln 2) = 2\n\nweights = [ ?, ? ]\noutput = w₁ × [1, 0]\n       + w₂ × [0, 2]</code><p class="small">核对后再解释：权重为什么相加为 1？如果未来位置被因果遮罩，应该在哪一步处理？</p></div></div><details><summary class="cursor-interaction">需要提示时再展开</summary><p>指数值为 1 与 2，总和为 3。输出第二维只来自第二个 Value 的第二维。</p></details></div>';
    }else if(state.course==='cs146s'){
      target.innerHTML='<div class="exercise-paper"><div class="eyebrow">04 / 动手练习</div><h2>补上修复，也补上验证。</h2><p>总价应当等于单价乘数量。选择代码与结束方式，运行三组本地输入，观察哪个结果足以支持完成结论。</p><div class="exercise-grid"><div><div class="exercise-fields"><label for="lbb-agent-op">return price ___ qty<select id="lbb-agent-op"><option value="+">+　相加</option><option value="*">*　相乘</option></select></label><label for="lbb-agent-check">改完后怎样结束？<select id="lbb-agent-check"><option value="verify">再跑测试，用结果判断</option><option value="skip">文件改完就直接结束</option></select></label></div>'+button('运行本地练习','check-agent',null,true)+'<div class="exercise-result" id="lbb-exercise-result" aria-live="polite">只计算本例数据，不连接模型或终端。</div></div><div class="exercise-side"><h3>验收输入</h3><code>subtotal(10, 3) → 30\nsubtotal(0, 5)  → 0\nsubtotal(7, 1)  → 7</code><p class="small">检查的不只是代码写法。还要能说明：做了什么、检查了什么、结果是什么。</p></div></div></div>';
    }else{
      target.innerHTML='<div class="exercise-paper"><div class="eyebrow">04 / 动手练习</div><h2>同一笔预算，换个利用率。</h2><p>仍用 7B 参数、140B token、8 张卡，每卡峰值 1,000 TFLOP/s。如果 MFU 变为 25%，预计训练需要多少天？</p><div class="exercise-grid"><div><div class="exercise-fields"><label for="lbb-budget-answer">预计训练时间 / 天<input id="lbb-budget-answer" type="number" step="0.1" placeholder="保留 1 位小数"></label></div>'+button('检查这笔账','check-budget',null,true)+'<div class="exercise-result" id="lbb-exercise-result" aria-live="polite">先预测变化倍数，再填写数值。</div></div><div class="exercise-side"><h3>保留单位</h3><code>FLOPs = 6 × 7e9 × 140e9\neffective = 8 × 1000e12 × 0.25\ndays = FLOPs / effective / 86400</code><p class="small">再解释：为什么显存更大，不会直接出现在这条时间公式里？</p></div></div></div>';
    }
  }
  function renderRead(target){
    const c=courses[state.course];
    target.innerHTML='<div class="reading-paper"><div class="eyebrow">继续 / 深入阅读</div><h2>把小例子放回完整课程。</h2><p>'+(state.course==='cme295'?'接着看官方讲义中的分词、表示与完整 Transformer。单行注意力只是其中一个计算环节。':state.course==='cs146s'?'接着看真实 Coding Agent 的工具定义、上下文与工程约束。本站迷你任务用于理解循环；官方作业会进入更完整的系统。':'继续核算显存中的参数、梯度、优化器状态与激活值。再用运行结果检查时间估计的假设。')+'</p><div class="reading-links">'+c.sources.map(x=>'<a href="'+x[1]+'" target="_blank" rel="noopener noreferrer"><span>'+x[0]+'</span><span>打开原资料 ↗</span></a>').join('')+'</div><div class="row" style="margin-top:23px">'+button('回课程地图继续','course',state.course,true)+button('在全站地图找相关知识','node-map',state.node)+'</div></div>';
  }
  function renderProjects(){
    main.innerHTML='<div class="eyebrow">BUILD / 已有开源项目</div><h1>在对应的工具里，把东西做出来。</h1><p class="lead">主站负责学习路径、原理与练习；独立项目直接跳转，带着代码、观察和结果回来检验。</p><div class="project-list"><section class="project-item"><div><span class="tag">C01 / C03 · 在线教学模拟</span><h2 style="margin-top:10px">Learn ESP32</h2><p>在线开发板、传感器、电机与反馈控制。先建立直觉，再进入实物接线、标定和真机联调。</p></div><a class="button primary" href="https://aigeekops.github.io/learn-esp32/" target="_blank" rel="noopener noreferrer">打开在线实验 ↗</a></section><section class="project-item"><div><span class="tag">C01 · 嵌入式语法</span><h2 style="margin-top:10px">Arduino / ESP32 语法速查</h2><p>从示例看初始化、循环、接口与常见写法，配合在线实验使用。</p></div><a class="button" href="https://github.com/aigeekops/arduino-esp32-syntax/blob/main/article.md" target="_blank" rel="noopener noreferrer">打开原项目 ↗</a></section><section class="project-item"><div><span class="tag">阅读工具 · 源码仓库</span><h2 style="margin-top:10px">PDFMark</h2><p>用于课程讲义阅读与标注。这里连接项目源码。</p></div><a class="button" href="https://github.com/aigeekops/PDFMark" target="_blank" rel="noopener noreferrer">查看工具源码 ↗</a></section></div><p class="lead" style="margin-top:22px">机器人路线继续覆盖结构与制造、控制与标定、ROS 2 与物理仿真、感知规划、真机集成，以及机器人学习。</p>';
  }
  function go(view,course){
    main.scrollTop=0;
    stop();
    state.view=view;
    if(course){state.course=course;state.selected=courses[course].sample;}
    render();save();
    root.scrollIntoView({block:'start',behavior:'auto'});
    announce.textContent=view==='map'?'已返回全站学习地图':view==='course'?'已进入 '+courses[state.course].label+' 课程地图':view==='lesson'?'已进入单讲样例':view==='personal'?'已进入个人学习路线':view==='today'?'已进入今日学习台':'已进入学习页面';
  }
  function updateLab(){if(state.view==='lesson'&&state.section==='lab')renderLab();}
  function advance(){
    const lab=activeLab(),last=stepsFor(state.course).length-1;
    if(lab.step<last)lab.step++;
    if(lab.step>=last)stop();
    updateLab();
  }
  function schedule(){
    timer=setTimeout(()=>{advance();if(playing)schedule();},1200);
  }
  function setSection(section){
    stop();main.scrollTop=0;state.section=section;renderLessonSection();save();icons();
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');
    if(!b||!root.contains(b)||b.disabled)return;
    const action=b.dataset.action,value=b.dataset.value;
    if(action==='atlas-mode'){state.mapMode=value==='courses'?'courses':'overview';state.nodeOpen=false;state.search='';renderMap();save();announce.textContent=state.mapMode==='courses'?'已展开完整课程规划':'已返回路线总览';}
    else if(action==='atlas-motion'){if(!matchMedia('(prefers-reduced-motion: reduce)').matches){atlasSettings.playing=!atlasSettings.playing;state.atlasPlaying=atlasSettings.playing;atlasController?.setMotion();save();}}
    else if(action==='map'){state.search='';state.nodeOpen=false;go('map');}
    else if(action==='projects')go('projects');
    else if(action==='node-map'){
      if(!nodes[value])return;state.node=value;state.nodeOpen=true;state.search='';go('map');
    }else if(action==='node'){
      if(!nodes[value])return;state.node=value;state.nodeOpen=true;renderNodeDetail();save();announce.textContent='已展开 '+nodes[value].title+' 的课程与先修。';
      const detail=main.querySelector('#lbb-node-detail');
      if(detail)detail.scrollIntoView({block:'nearest',behavior:'auto'});
    }else if(action==='close-node'){
      state.nodeOpen=false;renderNodeDetail();save();
      const current=main.querySelector('[data-action="node"][aria-pressed="true"]');if(current)current.focus({preventScroll:true});
    }else if(action==='course'){
      if(!courses[value])return;
      if(!nodes[state.node].courses.includes(value))state.node=courses[value].node;
      go('course',value);
    }else if(action==='sample'){
      if(!courses[value])return;
      if(!nodes[state.node].courses.includes(value))state.node=courses[value].node;
      state.section='explain';go('lesson',value);
    }else if(action==='select-lesson'){
      state.selected=Number(value);renderLessonPreview();save();
    }else if(action==='prereq'){const d=main.querySelector('#lbb-course-prereq');d.open=!d.open;}
    else if(action==='section')setSection(value);
    else if(action==='answer'){
      answer=Number(value);const l=lessonInfo[state.course];
      main.querySelectorAll('.answer-choices button').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.value)===answer)));
      const result=main.querySelector('#lbb-answer-feedback');
      result.textContent=(answer===l.correct?'这个判断符合本例。':'再想一步。')+l.feedback;
    }else if(action==='query'){
      stop();attention.query=Number(value);attention.step=0;updateLab();
    }else if(action==='lab-step'){
      stop();activeLab().step=Number(value);updateLab();
    }else if(action==='next'){stop();advance();}
    else if(action==='reset'){stop();activeLab().step=0;updateLab();}
    else if(action==='play'){
      if(playing){stop();updateLab();}
      else{const lab=activeLab();if(lab.step===stepsFor(state.course).length-1)lab.step=0;playing=true;updateLab();schedule();}
    }else if(action==='check-attention'){
      const w=main.querySelector('#lbb-attn-weight'),o=main.querySelector('#lbb-attn-output'),r=main.querySelector('#lbb-exercise-result');
      if(w.value===''||o.value===''){r.className='exercise-result error';r.textContent='先填写两个数值，再检查。';return;}
      const ok=Math.abs(Number(w.value)-1/3)<=.002&&Math.abs(Number(o.value)-4/3)<=.002;
      r.className='exercise-result '+(ok?'success':'error');
      r.textContent=ok?'两步数值都对：权重 [1/3, 2/3]，输出 [1/3, 4/3]。接着用自己的话解释归一化与加权求和。':'再核对：指数值相加等于 3；先归一化，再用第二个权重乘 Value 的第二维 2。';
    }else if(action==='check-agent'){
      const op=main.querySelector('#lbb-agent-op').value,verify=main.querySelector('#lbb-agent-check').value==='verify',r=main.querySelector('#lbb-exercise-result');
      if(!verify){r.className='exercise-result error';r.textContent='流程在修改后就停止了，没有测试结果可支持“通过”。先补上复跑测试这一步。';return;}
      const tests=runTests(op),passed=tests.filter(t=>t.actual===t.expected).length;
      r.className='exercise-result '+(passed===3?'success':'error');
      r.innerHTML=tests.map(t=>'subtotal('+t.price+', '+t.qty+') = '+t.actual+'，预期 '+t.expected+(t.actual===t.expected?' ✓':' ✕')).join('<br>')+'<br>'+passed+'/3 通过。'+(passed===3?'这次既有代码改动，也有对应检查结果。':'检查加法是否表达了单价乘数量。');
    }else if(action==='check-budget'){
      const input=main.querySelector('#lbb-budget-answer'),r=main.querySelector('#lbb-exercise-result'),expected=6*7e9*140e9/(8*1000e12*.25)/86400;
      if(input.value===''){r.className='exercise-result error';r.textContent='先填写预计天数，再检查。';return;}
      const ok=Math.abs(Number(input.value)-expected)<=.15;
      r.className='exercise-result '+(ok?'success':'error');
      r.textContent=ok?'数值符合本例：约 '+expected.toFixed(1)+' 天，是 MFU 50% 时的两倍。接着说明这个估计省略了哪些条件。':'先核对单位：1 TFLOP/s = 10¹² FLOP/s；再把秒换成天。有效速度应乘 0.25。';
    }
  });
  root.addEventListener('input',e=>{
    if(e.target.id==='lbb-map-search'){state.search=e.target.value;filterMap();}
  });
  root.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&state.view==='map'&&state.nodeOpen){
      state.nodeOpen=false;renderNodeDetail();save();
      const current=main.querySelector('[data-action="node"][aria-pressed="true"]');if(current)current.focus({preventScroll:true});
    }
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.target.matches('.atlas-mode-tabs button')){e.preventDefault();const tabs=[...main.querySelectorAll('.atlas-mode-tabs button')];const next=tabs[(tabs.indexOf(e.target)+1)%tabs.length];next.click();main.querySelector('#'+next.id)?.focus();}
    if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.target.matches('.lesson-tabs button')){
      e.preventDefault();
      const tabs=Array.from(root.querySelectorAll('.lesson-tabs button'));
      const next=tabs[(tabs.indexOf(e.target)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
      next.focus();setSection(next.dataset.value);
    }
  });
  root.addEventListener('change',e=>{
    if(e.target.id==='lbb-causal'){stop();attention.causal=e.target.checked;attention.step=0;updateLab();}
    else if(e.target.id==='lbb-mfu'){stop();budget.mfu=Number(e.target.value);budget.step=0;updateLab();}
    else if(['lbb-budget-n','lbb-budget-d','lbb-budget-g'].includes(e.target.id)){
      const val=Number(e.target.value);
      if(!e.target.validity.valid||!Number.isFinite(val)||val<=0){announce.textContent='请填写范围内的正数。';e.target.reportValidity();return;}
      budget[e.target.id==='lbb-budget-n'?'n':e.target.id==='lbb-budget-d'?'d':'g']=val;
      stop();budget.step=0;updateLab();
    }
  });
  globalThis.addEventListener('openai:set_globals',e=>{
    if(!e.detail||!e.detail.globals||!e.detail.globals.widgetState)return;
    const previous=JSON.stringify(state);
    if(readSaved(e.detail.globals.widgetState)&&JSON.stringify(state)!==previous){stop();render();}
  });
  globalThis.addEventListener('pagehide',stop,{once:true});
  const routePresets={
    model:{title:'大模型原理与研发',goal:'agent',ids:['cs50p','tools','linear','probability','cs229','d2l','cme295','cs336','fsdl']},
    agent:{title:'AI 应用与软件工程',goal:'agent',ids:['cs50p','tools','cme295','hfagents','cs146s','fsdl']},
    mobile:{title:'移动机器人与自主导航',goal:'robotics',ids:['cs50p','tools','linear','probability','arduino','mit2007','modern','pid','kalman','ros','bonn','nav2']},
    arm:{title:'机械臂与抓取操作',goal:'robotics',ids:['cs50p','tools','linear','probability','arduino','mit2007','modern','pid','kalman','ros','manipulation','moveit']}
  };
  const routeDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const qaNamespace=new URLSearchParams(location.search).get('integration-qa');
  const personalStoreKey='lbb-personal-routes-v1:'+(qaNamespace?'qa:'+qaNamespace:new URL('.',location.href).pathname);
  let personalRoutes={version:1,activeId:null,items:[]},personalDraft=null,personalPreview=null,personalPreviewTicket=0,personalPreviewKey='';
  try{const saved=JSON.parse(localStorage.getItem(personalStoreKey)||'null');if(saved?.version===1&&Array.isArray(saved.items))personalRoutes=saved;}catch{}
  const writePersonal=()=>localStorage.setItem(personalStoreKey,JSON.stringify(personalRoutes));
  const activePersonal=()=>personalRoutes.items.find(p=>p.id===personalRoutes.activeId&&p.status==='active');
  const validPersonalProfile=p=>p&&/^[A-Za-z0-9-]{16,80}$/.test(p.id||'')&&typeof p.name==='string'&&p.name.trim()&&p.name.length<=120&&['agent','robotics'].includes(p.goal)&&Array.isArray(p.courseIds)&&p.courseIds.length&&new Set(p.courseIds).size===p.courseIds.length&&p.courseIds.every(id=>expansionById[id])&&p.courseIds.includes(p.startCourseId)&&(!p.currentCourseId||p.courseIds.includes(p.currentCourseId))&&Number.isInteger(p.days)&&p.days>=1&&p.days<=366&&Number.isInteger(p.minutes)&&p.minutes>=1&&p.minutes<=1440&&/^\d{4}-\d{2}-\d{2}$/.test(p.start||'')&&['active','pending'].includes(p.status);
  const validateRouteRegistry=value=>{if(value?.version!==1||!Array.isArray(value.items)||value.items.length>200||value.items.some(p=>!validPersonalProfile(p))||new Set(value.items.map(p=>p.id)).size!==value.items.length||value.activeId&&!value.items.some(p=>p.id===value.activeId&&p.status==='active'))throw Error('个人路线备份格式无效。');return value;};
  personalRoutes.items=personalRoutes.items.filter(validPersonalProfile);
  if(!personalRoutes.items.some(p=>p.id===personalRoutes.activeId&&p.status==='active'))personalRoutes.activeId=null;
  const newDraft=key=>{const p=routePresets[key]||routePresets.model;return {name:p.title,direction:key,goal:p.goal,courseIds:[...p.ids],startCourseId:p.ids[0],minutes:30,days:180,start:routeDay(),device:'browser',progression:'sequential'};};
  const customPersonalName=name=>!!name&&name!=='自定义学习路线'&&!Object.values(routePresets).some(preset=>preset.title===name);
  function personalDirection(profile){
    if(profile?.direction==='custom')return 'custom';
    if(routePresets[profile?.direction])return profile.direction;
    if(!profile)return 'model';
    const candidates=Object.entries(routePresets).filter(([,preset])=>preset.goal===profile.goal);
    const exact=candidates.find(([,preset])=>JSON.stringify(preset.ids)===JSON.stringify(profile.courseIds));
    if(exact)return exact[0];
    const named=candidates.find(([,preset])=>preset.title===profile.name);
    if(named)return named[0];
    const scores=candidates.map(([key,preset])=>({key,score:(profile.courseIds||[]).filter(id=>preset.ids.includes(id)).length})).sort((a,b)=>b.score-a.score);
    return scores[0]?.score>0&&scores[0].score>scores[1]?.score?scores[0].key:'custom';
  }
  function newContextDraft(){
    const p=activePersonal();if(!p)return newDraft('model');
    const direction=personalDirection(p);
    return direction==='custom'?{...newDraft('model'),name:p.name,direction,goal:p.goal,courseIds:[...p.courseIds],startCourseId:p.currentCourseId||p.startCourseId}:{...newDraft(direction),...(customPersonalName(p.name)?{name:p.name}:{})};
  }
  const personalDraftKey=profile=>JSON.stringify(Object.fromEntries(['name','direction','goal','courseIds','startCourseId','minutes','days','start','device','progression'].map(key=>[key,profile[key]])));
  function invalidatePersonalPreview(){
    personalPreview=null;personalPreviewKey='';personalPreviewTicket++;
    const preview=main.querySelector('#lbb-route-preview');if(preview?.childNodes.length)preview.innerHTML='<p class="small muted" role="status">路线设置已更改，请重新预览后再采用。</p>';
  }
  delete personalRoutes.legacyGoal;
  let workbenchFrame=null,workbenchReady=null,rpcSequence=0;
  const rpcPending=new Map();
  function sendWorkbench(method,args={}){
    return new Promise((resolve,reject)=>{
      const id='lbb-rpc-'+(++rpcSequence),timeout=setTimeout(()=>{rpcPending.delete(id);reject(Error('学习数据暂未响应，请重试。'));},15000);
      rpcPending.set(id,{resolve,reject,timeout});workbenchFrame.contentWindow.postMessage({type:'lbb-workbench-call',id,method,args},location.protocol==='file:'?'*':location.origin);
    });
  }
  function ensureWorkbench(){
    if(workbenchReady)return workbenchReady;
    workbenchFrame=document.createElement('iframe');workbenchFrame.id='lbb-learning-engine';workbenchFrame.title='学习数据';workbenchFrame.hidden=true;workbenchFrame.setAttribute('aria-hidden','true');root.append(workbenchFrame);
    workbenchReady=new Promise((resolve,reject)=>{
      workbenchFrame.addEventListener('load',()=>sendWorkbench('ping').then(resolve,reject),{once:true});
      workbenchFrame.src='learning-data-engine.html'+(qaNamespace?'?integration-qa='+encodeURIComponent(qaNamespace):'');
    });
    return workbenchReady;
  }
  async function workbenchCall(method,args={}){await ensureWorkbench();return sendWorkbench(method,args);}
  let routeRecoveryBusy=false;
  function recoverPersonalRoutes(){
    if(routeRecoveryBusy)return;routeRecoveryBusy=true;
    workbenchCall('routeIndex').then(rows=>{
      let changed=false;
      for(const p of rows){if(!personalRoutes.items.some(old=>old.id===p.id)){personalRoutes.items.push(p);changed=true;}}
      if(changed){writePersonal();if(state.view==='map')renderAppChrome();else syncModuleHeader();if(state.view==='personal'){syncPersonalDraft();renderPersonalRoutes();}else if(['today','routes','records','resources','projects'].includes(state.view))renderUnifiedPage(state.view);}
    }).catch(()=>{}).finally(()=>{routeRecoveryBusy=false;});
  }
  addEventListener('message',event=>{
    if(!workbenchFrame||event.source!==workbenchFrame.contentWindow||event.origin!==(location.protocol==='file:'?'null':location.origin))return;
    const m=event.data||{};
    if(m.type!=='lbb-workbench-result')return;
    const p=rpcPending.get(m.id);if(!p)return;clearTimeout(p.timeout);rpcPending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.value);
  });
  function syncPersonalDraft(){
    const form=main.querySelector('#lbb-personal-form');if(!form||!personalDraft)return;
    const fields=new FormData(form);
    for(const k of ['name','direction','startCourseId','start','device','progression'])personalDraft[k]=String(fields.get(k)||'');
    personalDraft.minutes=Number(fields.get('minutes'));personalDraft.days=Number(fields.get('days'));
  }
  function personalPreviewMarkup(result,d){
    const labels={full:'完整排入',partial:'部分排入','not-scheduled':'未排入'},count=status=>result.coverage.filter(c=>c.status===status).length;
    const load=n=>`${n} 分钟${n>=60?'（'+Number((n/60).toFixed(1))+' 小时）':''}`;
    const phases=result.coverage.map(c=>`<li class="route-coverage-course" data-course="${esc(c.course_id)}" data-coverage="${c.status}"><span>${c.first_date?esc(c.first_date)+'<br>至 '+esc(c.last_date):'本周期未排入'}</span><div><b>${esc(c.label)} · ${esc(c.title)}</b><span class="route-coverage-status">${labels[c.status]}</span><p>完整排入 ${c.full_lessons} / ${c.total_lessons} 讲${c.partial_lessons?'，另 '+c.partial_lessons+' 讲只排入一部分':''} · 已排 ${c.scheduled_minutes} / 预计 ${c.estimated_minutes} 分钟</p>${c.reason?'<p class="route-coverage-reason">'+esc(c.reason)+'</p>':''}<details class="route-lecture-loads"><summary>每讲预计学习量与排入情况</summary><ul>${c.lessons.map(l=>`<li><b>${esc(l.title)}</b><span>预计 ${l.estimated_minutes} 分钟 · ${l.scheduled_minutes===0?'未排入':l.scheduled_minutes===l.estimated_minutes?'完整排入':'部分排入'} ${l.scheduled_minutes} 分钟</span></li>`).join('')}</ul></details></div></li>`).join('');
    const days=result.calendar.map(day=>`<li><span>${esc(day.due)}</span><div>${day.task_indexes.map(i=>{const t=result.tasks[i];return `<b>${esc(t.title)} · ${t.minutes} 分钟</b><p>${esc(t.note.split('\n')[0])}</p>`;}).join('')}${day.free_minutes?'<p>机动与补练：'+day.free_minutes+' 分钟。可按实际验收补练，暂不自动分配新讲。</p>':''}</div></li>`);
    return `<section class="personal-preview"><div class="eyebrow">PREVIEW / ${d.days} 天</div><h2>${esc(d.name)}</h2><p class="lead">${esc(result.calendar[0].due)} 至 ${esc(result.calendar.at(-1).due)} · 每天可投入 ${d.minutes} 分钟</p><p class="route-coverage-counts">完整排入 ${count('full')} 门 · 部分排入 ${count('partial')} 门 · 未排入 ${count('not-scheduled')} 门</p><p class="small muted">预排学习 ${load(result.summary.study_minutes)} · ${result.summary.review_days} 天复盘，共 ${load(result.summary.review_minutes)} · 机动与补练 ${load(result.summary.free_minutes)}</p><p class="small muted">按每讲独立的预计学习量逐日分配，可跨日续学，也可在一天内接着学下一讲。预计量包含本站讲解、阅读、跟练与独立核对，是编排估算，不代表原课官方课时或掌握承诺。</p><p class="small muted">日期是参考安排；今日学习保持当前课程，按实际验收选择下一课。</p><h3 class="route-preview-title">课程排入情况</h3><ol>${phases}</ol><details class="route-calendar-detail"><summary>查看全部 ${result.calendar.length} 天的逐日安排（${result.tasks.length} 项任务）</summary><ol>${days.join('')}</ol></details><h3 class="route-preview-title">前 7 天安排</h3><ol>${days.slice(0,7).join('')}</ol><p class="small muted">采用后生成学习任务，计时、学习记录与资料同步跟随这条路线。</p><button type="button" class="button primary" data-action="personal-adopt">采用路线并开始学习 →</button></section>`;
  }
  function renderPersonalRoutes(){
    invalidatePersonalPreview();
    personalDraft ||= newContextDraft();
    personalDraft.direction=personalDirection(personalDraft);
    const d=personalDraft;
    const options=Object.entries(routePresets).map(([id,p])=>`<option value="${id}" ${d.direction===id?'selected':''}>${p.title}</option>`).join('')+(d.direction==='custom'?'<option value="custom" selected>自定义路线 · 保留现有课程</option>':'');
    const queue=d.courseIds.map((id,i)=>{const p=expansionById[id];return `<li><span class="route-order">${i+1}</span><span><b>${esc(p.label)}</b><small>${esc(p.title)} · ${p.course?'当前专题':esc(p.phase)}</small></span><span class="route-queue-tools"><button type="button" data-action="personal-up" data-value="${id}" aria-label="将 ${esc(p.label)} 前移" ${i?'':'disabled'}>↑</button><button type="button" data-action="personal-down" data-value="${id}" aria-label="将 ${esc(p.label)} 后移" ${i<d.courseIds.length-1?'':'disabled'}>↓</button><button type="button" data-action="personal-remove" data-value="${id}" aria-label="移除 ${esc(p.label)}">×</button></span></li>`;}).join('');
    const extra=expansionCourses.filter(p=>!d.courseIds.includes(p.id)).map(p=>`<button type="button" class="button" data-action="personal-add" data-value="${p.id}">＋ ${esc(p.label)}</button>`).join('');
    const history=personalRoutes.items.map(p=>`<article class="saved-route"><div><span class="tag">${p.id===personalRoutes.activeId?'当前路线':p.status==='pending'?'保存待重试':'已保存路线'}</span><h3>${esc(p.name)}</h3><p>${p.courseIds.length} 组课程 · 每天 ${p.minutes} 分钟 · ${p.taskIds?.length||0} 个学习任务</p></div><button type="button" class="button ${p.status==='active'?'primary':''}" data-action="personal-start" data-value="${p.id}">${p.status==='active'?'开始学习 →':'继续采用计划 →'}</button></article>`).join('');
    moduleHeading={view:'personal',title:'制定个人路线',copy:'按目标选择课程、起点与学习节奏。',actions:button('返回我的路线','route-view')+'<button type="submit" form="lbb-personal-form" class="button primary">预览学习安排 →</button>'};
    main.innerHTML=`<form id="lbb-personal-form" class="personal-route-form"><div class="personal-planner-layout"><section class="route-preferences"><h2>目标与节奏</h2><label for="lbb-personal-direction">学习方向</label><select id="lbb-personal-direction" name="direction">${options}</select><label for="lbb-personal-name">路线名称</label><input id="lbb-personal-name" name="name" value="${esc(d.name)}" maxlength="120" required><label for="lbb-personal-start">从哪门课程开始</label><select id="lbb-personal-start" name="startCourseId">${d.courseIds.map(id=>`<option value="${id}" ${d.startCourseId===id?'selected':''}>${esc(expansionById[id].label)}</option>`).join('')}</select><p class="route-prerequisite" id="lbb-personal-prerequisite">${esc(expansionById[d.startCourseId]?.prereq||'请先选择课程。')}</p><div class="route-fields"><div><label for="lbb-personal-minutes">每天可投入 / 分钟</label><input id="lbb-personal-minutes" name="minutes" type="number" min="1" max="1440" step="1" value="${d.minutes}" required></div><div><label for="lbb-personal-days">学习周期 / 天</label><input id="lbb-personal-days" name="days" type="number" min="1" max="366" step="1" value="${d.days}" list="lbb-duration-options" required><datalist id="lbb-duration-options"><option value="7">7 天</option><option value="14">14 天</option><option value="30">一个月</option><option value="90">三个月</option><option value="180">半年</option><option value="365">一年</option></datalist><div class="route-duration-presets"><button type="button" data-action="personal-duration" data-value="30">30 天</button><button type="button" data-action="personal-duration" data-value="180">半年</button><button type="button" data-action="personal-duration" data-value="365">一年</button></div></div></div><label for="lbb-personal-date">开始日期</label><input id="lbb-personal-date" name="start" type="date" value="${esc(d.start)}" required><label for="lbb-personal-progression">安排方式</label><select id="lbb-personal-progression" name="progression"><option value="sequential" ${d.progression!=='current'?'selected':''}>沿路线预排，按实际验收推进</option><option value="current" ${d.progression==='current'?'selected':''}>只安排当前课程</option></select><label for="lbb-personal-device">主要设备</label><select id="lbb-personal-device" name="device">${[['browser','先用浏览器'],['windows','Windows'],['macos','macOS'],['linux','Linux']].map(([id,name])=>`<option value="${id}" ${d.device===id?'selected':''}>${name}</option>`).join('')}</select><p class="small muted">支持 1–366 天；半年和一年按阶段预排。今日学习围绕当前课程，每第 7 天复盘，再由你选择下一步。</p></section><section class="route-course-selection"><h2>我的课程顺序 <span class="small muted">${d.courseIds.length} 组</span></h2><p class="small muted">按需调整课程与顺序；进入后面的课程前，先核对起点的先修。</p><ol class="personal-course-queue">${queue||'<li>从下方选择至少一门课程。</li>'}</ol><details class="personal-course-extra"><summary>补充其他课程与材料</summary><div class="row">${extra||'<span class="muted">全部课程已加入。</span>'}</div></details></section></div><p class="personal-error" id="lbb-personal-error" role="alert"></p></form><div id="lbb-route-preview"></div>${history?'<section class="saved-routes"><h2>已保存的学习路线</h2>'+history+'</section>':''}`;
    syncModuleHeader();
    const form=main.querySelector('#lbb-personal-form');
    for(const type of ['input','change'])form.addEventListener(type,()=>{syncPersonalDraft();invalidatePersonalPreview();});
    form.addEventListener('submit',async event=>{
      event.preventDefault();syncPersonalDraft();const submit=event.submitter;submit.disabled=true;
      const error=main.querySelector('#lbb-personal-error');error.textContent='';
      try{
        if(!personalDraft.courseIds.length)throw Error('请先选择至少一门课程。');
        const draft=structuredClone(personalDraft),key=personalDraftKey(draft),ticket=++personalPreviewTicket;
        const result=await workbenchCall('preview',draft);
        if(ticket!==personalPreviewTicket||state.view!=='personal'||main.querySelector('#lbb-personal-form')!==form||personalDraftKey(personalDraft)!==key)return;
        personalPreview={...draft,id:crypto.randomUUID(),status:'pending',createdAt:new Date().toISOString(),tasks:result.tasks};personalPreviewKey=key;
        const preview=main.querySelector('#lbb-route-preview');
        preview.innerHTML=personalPreviewMarkup(result,draft);
        preview.scrollIntoView({block:'start',behavior:'auto'});
      }catch(e){error.textContent=e.message;}finally{submit.disabled=false;}
    });
    recoverPersonalRoutes();
  }
  async function adoptPersonal(profile){
    let saved=personalRoutes.items.find(p=>p.id===profile.id);
    if(!saved){saved={...profile};delete saved.tasks;personalRoutes.items.push(saved);writePersonal();}
    const result=await workbenchCall('adopt',saved);
    Object.assign(saved,{status:'active',taskIds:result.taskIds,currentCourseId:saved.startCourseId});personalRoutes.activeId=saved.id;taskScope='today';recordScope='route';resourceScope='route';projectScope='route';writePersonal();
    personalDraft=null;invalidatePersonalPreview();
    return saved;
  }
  root.addEventListener('click',async event=>{
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;
    const action=b.dataset.action,id=b.dataset.value;
    if(action==='personal'){go('personal');return;}
    if(['workspace','records','resources','route-view'].includes(action)){
      go({workspace:'today',records:'records',resources:'resources','route-view':'routes'}[action]);return;
    }
    if(!action?.startsWith('personal-'))return;
    try{
      if(action==='personal-duration'){
        syncPersonalDraft();personalDraft.days=Number(id);personalPreview=null;renderPersonalRoutes();
      }else if(action==='personal-add'){
        syncPersonalDraft();personalDraft ||= activePersonal()?.courseIds.includes(id)?newContextDraft():newDraft(expansionById[id]?.lane==='c'?'mobile':expansionById[id]?.lane==='b'?'agent':'model');
        if(expansionById[id]&&!personalDraft.courseIds.includes(id)){
          const preset=routePresets[personalDirection(personalDraft)];personalDraft.courseIds.push(id);
          if(preset&&!preset.ids.includes(id)){if(!customPersonalName(personalDraft.name))personalDraft.name='自定义学习路线';personalDraft.direction='custom';}
        }
        if(state.view!=='personal')go('personal');else renderPersonalRoutes();
      }else if(['personal-up','personal-down','personal-remove'].includes(action)){
        syncPersonalDraft();const ids=personalDraft.courseIds,i=ids.indexOf(id);
        if(action==='personal-remove')ids.splice(i,1);else{const other=i+(action==='personal-up'?-1:1);if(other>=0&&other<ids.length)[ids[i],ids[other]]=[ids[other],ids[i]];}
        if(!ids.includes(personalDraft.startCourseId))personalDraft.startCourseId=ids[0]||'';
        personalPreview=null;renderPersonalRoutes();
      }else if(action==='personal-adopt'){
        syncPersonalDraft();if(!personalPreview||personalDraftKey(personalDraft)!==personalPreviewKey){invalidatePersonalPreview();throw Error('路线设置已变化，请重新预览后再采用。');}b.disabled=true;await adoptPersonal(personalPreview);go('today');
      }else if(action==='personal-start'){
        const p=personalRoutes.items.find(p=>p.id===id);if(!p)return;b.disabled=true;
        if(p.status!=='active')await adoptPersonal(p);else{personalRoutes.activeId=p.id;taskScope='today';recordScope='route';resourceScope='route';projectScope='route';writePersonal();}
        go('today');
      }
    }catch(e){const target=main.querySelector('#lbb-personal-error')||document.getElementById('lbb-workbench-error');if(target)target.textContent=e.message;else announce.textContent=e.message;b.disabled=false;}
  });
  root.addEventListener('change',async event=>{
    if(event.target.id==='lbb-current-learning-course'){
      const restoreFocus=event.target===document.activeElement;
      event.target.disabled=true;
      try{await switchCurrentCourse(event.target.value);}catch(error){workspaceToast(error.message);}
      finally{if(state.view==='today'){syncModuleHeader();if(restoreFocus)root.querySelector('#lbb-current-learning-course')?.focus({preventScroll:true});}}
    }else if(event.target.id==='lbb-current-learning-route'){
      const p=personalRoutes.items.find(p=>p.id===event.target.value&&p.status==='active');if(!p)return;
      if(state.view==='personal')syncPersonalDraft();
      personalRoutes.activeId=p.id;taskScope='today';recordScope='route';resourceScope='route';projectScope='route';writePersonal();render();
    }else if(event.target.id==='lbb-personal-direction'){
      const direction=event.target.value;syncPersonalDraft();const old=personalDraft;
      if(direction!=='custom')personalDraft={...newDraft(direction),minutes:old.minutes,days:old.days,start:old.start,device:old.device,...(customPersonalName(old.name)?{name:old.name}:{})};
      invalidatePersonalPreview();renderPersonalRoutes();
    }else if(event.target.id==='lbb-personal-start'){
      syncPersonalDraft();main.querySelector('#lbb-personal-prerequisite').textContent=expansionById[personalDraft.startCourseId]?.prereq||'';personalPreview=null;
    }
  });

  let workspaceCardObserver=null,workspaceCardFrame=0,workspaceCardGeneration=0;
  function stopWorkspaceCardFlow(){
    workspaceCardGeneration++;workspaceCardObserver?.disconnect();workspaceCardObserver=null;
    if(workspaceCardFrame)cancelAnimationFrame(workspaceCardFrame);workspaceCardFrame=0;
  }
  function mountWorkspaceCardFlow(){
    stopWorkspaceCardFlow();
    const grid=main.querySelector('.workspace-resource-grid,.workspace-project-grid,.workspace-record-grid');
    if(!grid)return;
    const cards=[...grid.children].filter(el=>el.matches('.workspace-resource,.workspace-project,.workspace-note'));
    if(!cards.length)return;
    const generation=workspaceCardGeneration;
    function layout(){
      if(generation!==workspaceCardGeneration||!main.contains(grid))return;
      workspaceCardFrame=0;
      const columns=Math.max(1,Math.min(4,Math.floor((grid.clientWidth+14)/(224+14))));
      if(grid.style.getPropertyValue('--workspace-card-columns')!==String(columns))grid.style.setProperty('--workspace-card-columns',String(columns));
      const spans=cards.map(card=>Math.ceil((card.getBoundingClientRect().height+14)/4));
      cards.forEach((card,i)=>{const value='span '+spans[i];if(card.style.gridRowEnd!==value)card.style.gridRowEnd=value;});
    }
    function schedule(){if(generation===workspaceCardGeneration&&!workspaceCardFrame)workspaceCardFrame=requestAnimationFrame(layout);}
    layout();workspaceCardObserver=new ResizeObserver(schedule);workspaceCardObserver.observe(grid);
    cards.forEach(card=>workspaceCardObserver.observe(card));
    if(document.fonts?.status!=='loaded')document.fonts?.ready.then(schedule);
  }

  let workspaceData={tasks:[],sessions:[],entries:[]},workspaceLoaded=false,workspaceTicket=0;
  let taskScope='today',recordScope='route',resourceScope='route',projectScope='route';
  let courseChangeBusy=false;
  const openTaskGroups=new Set(),taskGroupLimits=new Map(),taskListLimits=new Map();
  const cleanLearningText=(s='')=>String(s).replace(/^\[个人路线 [A-Za-z0-9-]{16,80}(?: \/ [^\n\]]+)?\]\n?/gm,'').replace(/^\[个人路线配置 \{[^\n]*\}\]\n?/gm,'').replace(/^\[课程id [a-z0-9-]+\]\n?/gm,'');
  const taskCourse=t=>t.note?.match(/^\[课程id ([a-z0-9-]+)\]$/m)?.[1]||null;
  const taskRoute=t=>t.note?.match(/^\[个人路线 ([A-Za-z0-9-]{16,80})(?: \/ [^\n\]]+)?\]$/m)?.[1]||null;
  const personalTasks=(p=activePersonal())=>p?workspaceData.tasks.filter(t=>p.taskIds?.includes(t.id)||taskRoute(t)===p.id):[];
  const personalEntries=(p=activePersonal())=>{if(!p)return [];const ids=new Set(personalTasks(p).map(t=>t.id));return workspaceData.entries.filter(e=>ids.has(e.task_id)||e.body?.includes('[个人路线 '+p.id+']'));};
  const currentCourse=(p=activePersonal())=>p&&expansionById[p.currentCourseId||p.startCourseId];
  async function switchCurrentCourse(id){
    const p=activePersonal();if(!p?.courseIds.includes(id)||courseChangeBusy)return;
    courseChangeBusy=true;
    try{
      if(currentCourse(p).id!==id){
        await workbenchCall('checkpoint',{routeId:p.id,courseId:id});
        p.currentCourseId=id;writePersonal();
      }
      if(activePersonal()===p){taskScope='course';go('today');}
    }finally{courseChangeBusy=false;}
  }
  const dayOf=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const scopedEmpty=(title,copy)=>`<section class="workspace-empty"><span class="workspace-empty-icon">◇</span><h2>${title}</h2><p>${copy}</p><div class="row">${button('到学习地图选择课程 →','map',null,true)}</div></section>`;
  function workspaceHeading(kicker,title,copy,actions=''){moduleHeading={view:state.view,title,copy,actions};return '';}
  async function refreshWorkspace(){workspaceData=await workbenchCall('snapshot');workspaceLoaded=true;return workspaceData;}
  function renderUnifiedPage(view){
    const ticket=++workspaceTicket;
    paintWorkspace(view);
    refreshWorkspace().then(()=>{if(ticket===workspaceTicket&&state.view===view){paintWorkspace(view);}recoverPriorFocus();}).catch(e=>{const el=main.querySelector('.workspace-status');if(el)el.textContent=e.message;});
    retryActivities();
  }
  function paintWorkspace(view){
    if(view==='today')renderTodayPage();else if(view==='routes')renderRoutePage();else if(view==='records')renderRecordsPage();else if(view==='resources')renderResourcesPage();else renderProjectPage();
    syncModuleHeader();mountWorkspaceCardFlow();icons();drawPersonalFocus();
  }
  function recordCards(rows,compact=false){return rows.map(e=>{const text=cleanLearningText(e.body||e.result||e.question||''),owner=personalRoutes.items.find(p=>personalEntries(p).some(x=>x.id===e.id));return `<article class="workspace-note"><div class="workspace-note-meta"><time>${esc(e.entry_date)}</time><span>${{activity:'学习动态',note:'阅读笔记',experiment:'实验记录',review:'阶段复盘'}[e.kind]||'学习记录'}</span><span>${owner?esc(owner.name):'独立学习记录'}</span></div><h3>${esc(e.title)}</h3><p>${esc(text.slice(0,compact?150:400))}</p>${e.result?'<div class="workspace-result"><b>结果</b><p>'+esc(e.result)+'</p></div>':''}${e.next_step?'<p class="workspace-next">下一步：'+esc(e.next_step)+'</p>':''}<div class="row">${button('查看记录','workspace-note-open',e.id)}${!e.id.startsWith('auto-')&&owner?.id===activePersonal()?.id?button('编辑','workspace-note-edit',e.id):''}</div></article>`;}).join('');}
  function taskCard(t,next=false){const c=expansionById[taskCourse(t)],done=t.state==='done',title=c&&t.title.startsWith(c.label+' · ')?t.title.slice(c.label.length+3):t.title;return `<article class="workspace-task ${done?'is-done':''} ${next?'is-next-task':''}"><div class="workspace-task-content"><div class="workspace-note-meta"><span>${done?'已完成':next?'下一项':t.state==='doing'?'进行中':t.due<routeDay()?'待续练':'待开始'}</span><span>${esc(t.due||'未排期')}</span><span>计划 ${t.minutes} 分钟</span>${c?'<span>'+esc(c.label)+'</span>':''}</div><h3 title="${esc(t.title)}">${esc(title)}</h3><details><summary>步骤与验收</summary><p class="workspace-prewrap">${esc(cleanLearningText(t.note))}</p>${t.evidence?'<p><b>已保存成果：</b>'+esc(t.evidence)+'</p>':''}</details></div><div class="workspace-task-actions">${!done?button('开始专注','workspace-start',t.id,true)+button('记录成果','workspace-complete',t.id):''}${button('编辑安排','workspace-task-edit',t.id)}</div></article>`;}
  const taskOrder=(a,b)=>Number(a.state==='done')-Number(b.state==='done')||(a.due||'').localeCompare(b.due||'')||a.id-b.id;
  const taskGroupKey=(p,id)=>p.id+':'+id;
  function routeTaskGroups(p,tasks=personalTasks(p)){
    const groups=new Map(p.courseIds.map(id=>[id,{id,course:expansionById[id],tasks:[],inRoute:true}]));
    for(const task of tasks){
      const id=taskCourse(task),key=id&&expansionById[id]?id:'__route__';
      if(!groups.has(key))groups.set(key,{id:key,course:expansionById[id],tasks:[],inRoute:false});
      groups.get(key).tasks.push(task);
    }
    return [...groups.values()].map(group=>({...group,tasks:group.tasks.slice().sort(taskOrder)}));
  }
  function taskGroupBody(group,p){
    if(!group.tasks.length){
      const beforeStart=p.courseIds.indexOf(group.id)<p.courseIds.indexOf(p.startCourseId);
      const reason=beforeStart?'这门课程位于该计划的起点之前。':p.progression==='current'?'该计划只为起点课程安排学习任务。':'当前已保存计划尚未为这门课程安排任务。';
      return '<p class="workspace-inline-empty">'+(workspaceLoaded?reason+' 课程保留在路线中，可调整后续安排。':'正在读取学习安排…')+'</p>';
    }
    const limit=taskGroupLimits.get(taskGroupKey(p,group.id))||20,rows=group.tasks.slice(0,limit);
    return '<div class="workspace-task-list">'+rows.map(task=>taskCard(task,false)).join('')+'</div>'+(rows.length<group.tasks.length?'<div class="workspace-task-pagination"><span>已显示 '+rows.length+' / '+group.tasks.length+' 项</span>'+button('再显示 20 项','workspace-task-more',group.id)+'</div>':'');
  }
  function renderRouteTaskGroups(p,tasks){
    const groups=routeTaskGroups(p,tasks),scheduled=groups.filter(g=>g.inRoute&&g.tasks.length).length,missing=p.courseIds.length-scheduled;
    const overview='<div class="workspace-route-task-overview"><p>已保存安排覆盖 '+scheduled+' / '+p.courseIds.length+' 门课程。展开课程查看任务，查看路线不会重新排期。</p>'+(workspaceLoaded&&missing?'<p>还有 '+missing+' 门课程尚未安排任务。'+button('调整后续安排','workspace-edit-route')+'</p>':'')+'</div>';
    return overview+'<div class="workspace-route-task-groups">'+groups.map((group,index)=>{
      const dates=group.tasks.map(t=>t.due).filter(Boolean).sort(),done=group.tasks.filter(t=>t.state==='done').length,open=openTaskGroups.has(taskGroupKey(p,group.id));
      return '<details class="workspace-task-group" data-course="'+esc(group.id)+'" '+(open?'open':'')+'><summary><span class="workspace-task-group-number">'+String(index+1).padStart(2,'0')+'</span><span class="workspace-task-group-title"><b>'+esc(group.course?.label||'复盘与其他任务')+'</b><small>'+esc(group.course?.title||'保留没有课程标记的路线任务')+'</small></span><span class="workspace-task-group-state">'+(group.tasks.length?'已安排 '+group.tasks.length+' 项 · 已完成 '+done+' 项':'尚未安排 · 0 项')+'<small>'+(dates.length?esc(dates[0]+' — '+dates.at(-1)):group.inRoute?'保留在路线中':'历史路线任务')+'</small></span></summary><div class="workspace-task-group-body">'+(open?taskGroupBody(group,p):'')+'</div></details>';
    }).join('')+'</div>';
  }
  root.addEventListener('toggle',event=>{
    const element=event.target,p=activePersonal();
    if(!p||!element.matches?.('.workspace-task-group')||!root.contains(element))return;
    const key=taskGroupKey(p,element.dataset.course);
    if(element.open){
      openTaskGroups.add(key);const group=routeTaskGroups(p).find(g=>g.id===element.dataset.course);
      if(group)element.querySelector('.workspace-task-group-body').innerHTML=taskGroupBody(group,p);
    }else openTaskGroups.delete(key);
  },true);
  function renderTodayPage(){
    const p=activePersonal(),c=currentCourse();
    main.innerHTML=workspaceHeading('TODAY / 一步一步做出来','今日学习台','围绕当前课程推进今天的一小步，留下可以回看的结果。',p?button('＋ 新建任务','workspace-task-new'):button('制定路线','personal',null,true));
    if(!p){main.insertAdjacentHTML('beforeend',scopedEmpty('先选一条属于你的路线。','从地图选择课程，按目标、时间和起点生成学习安排。'));return;}
    const tasks=personalTasks(),current=tasks.filter(t=>taskCourse(t)===c.id),today=routeDay();
    const ids=new Set(tasks.map(t=>t.id)),sessions=workspaceData.sessions.filter(s=>ids.has(s.task_id)&&dayOf(s.created_at)===routeDay()),minutes=sessions.reduce((n,s)=>n+s.minutes,0),done=tasks.filter(t=>t.state==='done').length;
    let shown=taskScope==='all'?tasks:taskScope==='course'?current:tasks.filter(t=>t.state!=='done'&&(!t.due||t.due<=today));
    shown=shown.slice().sort(taskOrder);
    const next=shown.find(t=>t.state!=='done');
    const description=taskScope==='today'?'整条路线截至 '+today+' 的未完成任务':taskScope==='course'?c.label+' 的全部任务（含后续安排和已完成）':'整条路线的全部任务（含后续安排和已完成）';
    const empty=taskScope==='today'?'今天没有待办或待续任务。后续安排可查看「本课程任务」或「整条路线」。':taskScope==='course'?'这门课程尚未安排学习任务。可以新建任务，或到「我的路线」调整后续安排。':'这条路线还没有学习任务，可以新建任务或调整路线。';
    const listLimit=taskListLimits.get(taskGroupKey(p,taskScope==='course'?c.id:'today'))||40;
    const taskList=taskScope==='all'?renderRouteTaskGroups(p,tasks):'<div class="workspace-task-list">'+(shown.length?shown.slice(0,listLimit).map(t=>taskCard(t,next?.id===t.id)).join(''):'<div class="workspace-inline-empty">'+(workspaceLoaded?empty:'正在读取学习安排…')+'</div>')+'</div>'+(shown.length>listLimit?'<div class="workspace-task-pagination"><span>已显示 '+listLimit+' / '+shown.length+' 项</span>'+button('显示更多任务','workspace-task-list-more')+'</div>':'');
    main.insertAdjacentHTML('beforeend',`<section class="workspace-day-summary" aria-label="今日学习概况"><div class="workspace-day-count"><span>今日实际投入</span><strong>${minutes}<small> / ${p.minutes} 分钟</small></strong></div><progress value="${Math.min(minutes,p.minutes)}" max="${p.minutes}" aria-label="当日已记录 ${minutes} 分钟"></progress><span class="workspace-day-completed">路线任务 ${done} / ${tasks.length} 已完成</span>${button(c.course?'进入当前课程 →':'打开当前课程资料 ↗','workspace-open-current')}</section><div class="workspace-content-grid"><section class="workspace-card"><div class="workspace-section-top"><h2>我的学习任务</h2><div class="workspace-view-switch" role="group" aria-label="任务显示范围" aria-describedby="lbb-task-scope-description">${[['today','今日与待续'],['course','本课程任务'],['all','整条路线']].map(([id,label])=>`<button type="button" data-action="workspace-task-scope" data-value="${id}" aria-pressed="${taskScope===id}">${label}</button>`).join('')}</div></div><p id="lbb-task-scope-description" class="workspace-task-description" role="status">${esc(description)} · ${shown.length} 项</p>${taskList}</section><aside class="workspace-card"><div class="workspace-section-top"><h2>最近的学习记录</h2>${button('全部记录 →','records')}</div>${recordCards(personalEntries().filter(e=>!e.archived).slice(0,3),true)||'<p class="workspace-inline-empty">完成一次专注、保存成果或补充笔记后，记录会出现在这里。</p>'}${button('＋ 记下收获','workspace-note-new')}</aside></div><p class="workspace-status" role="status">${workspaceLoaded?'':'正在读取学习安排…'}</p>`);
  }
  function renderRoutePage(){
    const p=activePersonal(),c=currentCourse();main.innerHTML=workspaceHeading('MY PATH / 从选择到实践','我的学习路线','课程、阶段、今日任务和记录，沿着同一条路线连接。',button('新建路线','workspace-new-route')+(p?button('备份','workspace-export')+button('调整路线','workspace-edit-route',null,true):''));
    if(!p){main.insertAdjacentHTML('beforeend',scopedEmpty('把地图上的方向，变成自己的安排。','按兴趣选择课程，核对先修，安排半年、一年或自己的节奏。'));return;}
    const tasks=personalTasks();
    main.insertAdjacentHTML('beforeend',`<div class="workspace-course-timeline">${p.courseIds.map((id,i)=>{const item=expansionById[id],rows=tasks.filter(t=>taskCourse(t)===id),completed=rows.filter(t=>t.state==='done').length,span=rows.map(t=>t.due).sort();return `<article class="workspace-course-step ${c.id===id?'is-current':''}"><span class="workspace-step-number">${String(i+1).padStart(2,'0')}</span><div class="workspace-card"><div class="workspace-route-row"><div class="workspace-route-course"><div class="workspace-note-meta"><span>${c.id===id?'当前课程':item.course?'当前专题':esc(item.phase)}</span><span>${span.length?span[0]+' — '+span.at(-1):'后续按需安排'}</span><span>${rows.length?'已完成 '+completed+' / '+rows.length+' 个任务':'保留在路线队列'}</span></div><h2>${esc(item.label)} <span>${esc(item.title)}</span></h2></div><div class="row workspace-route-actions">${button('课程与资料 →','workspace-open-course',id)}${c.id!==id?button('从这门课继续','workspace-course-current',id):button('继续今日学习','workspace',null,true)}</div></div><details class="workspace-route-details"><summary>课程说明与先修</summary><p>${esc(item.summary)}</p><p><b>开始前：</b>${esc(item.prereq)}</p><p><b>怎样检验：</b>${esc(item.check)}</p></details></div></article>`;}).join('')}</div>`);
  }
  function renderRecordsPage(){
    const p=activePersonal();if(!p)recordScope='all';const rows=(recordScope==='all'?workspaceData.entries:personalEntries()).filter(e=>!e.archived),count=rows.filter(e=>e.kind==='experiment').length;
    main.innerHTML=workspaceHeading('LEARNING JOURNAL / 观察、解释、复现','学习记录','把真实投入、操作、成果与问题，积累在自己的路线上。',button('备份与恢复','workspace-backup')+(p?button('＋ 记下收获','workspace-note-new',null,true):''));
    main.insertAdjacentHTML('beforeend',`<div class="workspace-record-summary"><span><b>${rows.length}</b> 篇记录</span><span><b>${count}</b> 次实验记录</span><div class="workspace-view-switch">${p?`<button type="button" data-action="workspace-record-scope" data-value="route" aria-pressed="${recordScope==='route'}">本路线</button>`:''}<button type="button" data-action="workspace-record-scope" data-value="all" aria-pressed="${recordScope==='all'}">全部记录</button></div></div><div class="workspace-record-grid">${recordCards(rows)||'<section class="workspace-empty workspace-record-empty"><span class="workspace-empty-icon" aria-hidden="true">▤</span><h2>先做一小步，记录会慢慢长出来。</h2><p>专注结束和成果保存会留下操作记录，也可以主动写下想法和问题。</p><div class="row">'+button(p?'去今日学习':'先制定路线',p?'workspace':'personal',null,true)+'</div></section>'}</div><p class="workspace-status" role="status">${workspaceLoaded?'':'正在读取学习记录…'}</p>`);
  }
  function renderResourcesPage(){
    const p=activePersonal();if(!p)resourceScope='all';const rows=resourceScope==='all'?expansionCourses:p.courseIds.map(id=>expansionById[id]);
    main.innerHTML=workspaceHeading('RESOURCES / 为当前问题找依据','学习资料','课程讲义、官方教程与实践工具，放在该用到的课程旁。');
    main.insertAdjacentHTML('beforeend',`<div class="workspace-section-top workspace-resource-toolbar"><span>${rows.length} 组课程与材料</span><div class="workspace-view-switch">${p?`<button type="button" data-action="workspace-resource-scope" data-value="route" aria-pressed="${resourceScope==='route'}">本路线资料</button>`:''}<button type="button" data-action="workspace-resource-scope" data-value="all" aria-pressed="${resourceScope==='all'}">全部资料</button></div></div><div class="workspace-resource-grid">${rows.map(item=>`<article class="workspace-card workspace-resource"><div class="workspace-note-meta"><span>${item.course?'当前专题 · 含课例':esc(item.phase)}</span>${p&&(p.currentCourseId||p.startCourseId)===item.id?'<span class="workspace-current-tag">正在学习</span>':''}</div><h2>${esc(item.label)}</h2><h3>${esc(item.title)}</h3><div class="workspace-source-list">${item.sources.map(([title,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(title)} <span>↗</span></a>`).join('')}</div><div class="row">${item.course?button('打开站内课程 →','workspace-open-course',item.id,true):button('查看学习目标','workspace-course-info',item.id)}${p&&!p.courseIds.includes(item.id)?button('加入个人路线','personal-add',item.id):''}</div></article>`).join('')}</div>`);
  }
  const integratedProjects=[
    {id:'python-data',title:'把一组数据，做成可复现的实验',subtitle:'从读取数据、处理异常到测试与结果说明。',courses:['cs50p','tools','cs229'],outcome:'一份能重新运行的程序、输入数据和解释。',step:'读取一小组数据，保存输入与输出；换一组输入后，再用测试检查。'},
    {id:'small-lm',title:'从零构建一个小语言模型',subtitle:'连接模型结构、训练、资源预算和独立评测。',courses:['cs336','cme295','d2l'],outcome:'可运行的小模型、资源预算与独立测试结果。',step:'先进入资源核算课例，用自己的假设复算训练时间，再写下实现小模型前的先修缺口。',sample:'cs336'},
    {id:'agent-loop',title:'让 Agent 完成一次可检查的修复',subtitle:'任务、上下文、工具动作、测试与结果，形成闭环。',courses:['cs146s','hfagents','cme295'],outcome:'一次工具轨迹、代码修改与测试结果。',step:'重放 Coding Agent 课例，指出每次行动的依据，再独立补上验证环节。',sample:'cs146s'},
    {id:'rag-notes',title:'做一个带依据的资料助手',subtitle:'从选取资料，到检索、回答和固定问题集评测。',courses:['hfagents','cme295','fsdl'],outcome:'能指出来源的回答，以及可重复的评测样例。',step:'先准备五个问题与资料出处，记录检索结果和回答错误，再选一项改进。'},
    {id:'mobile-nav',title:'让一辆小车完成导航任务',subtitle:'电机与测量、坐标与定位、地图与路径，在同一个任务中协作。',courses:['arduino','ros','bonn','nav2'],outcome:'可回放的导航过程、轨迹误差和失败案例；仿真与真机分开记录。',step:'从在线开发板练习或 ROS 2 仿真准备开始，记录一次输入与响应，并列出导航需要的模块。',external:['打开 ESP32 实验室 ↗','https://aigeekops.github.io/learn-esp32/']},
    {id:'arm-grasp',title:'完成一次受约束的抓取与放置',subtitle:'连接运动学、碰撞规划、相机标定和执行。',courses:['modern','manipulation','moveit'],outcome:'一条可复现的抓取流程，注明坐标、限制与失败条件。',step:'先选一个两连杆或官方最小示例，核对坐标、可达范围和关节限制，再规划后续操作。'}
  ];
  function renderProjectPage(){
    const p=activePersonal(),recommended=p?integratedProjects.filter(x=>x.courses.some(id=>p.courseIds.includes(id))):integratedProjects,rows=projectScope==='all'?integratedProjects:recommended;
    main.innerHTML=workspaceHeading('BUILD / 用作品连接知识','项目实践','从当前课程出发，做出能解释、能检查、能复现的作品。');
    main.insertAdjacentHTML('beforeend',`<div class="workspace-section-top workspace-resource-toolbar"><span>${rows.length} 个实践 · ${p&&projectScope==='route'?'与当前路线相关':'按目标选择一个作品'}</span><div class="workspace-view-switch"><button type="button" data-action="workspace-project-scope" data-value="route" aria-pressed="${projectScope==='route'}">${p?'本路线推荐':'实践方向'}</button><button type="button" data-action="workspace-project-scope" data-value="all" aria-pressed="${projectScope==='all'}">全部项目</button></div></div><div class="workspace-project-grid">${rows.map(x=>`<article class="workspace-card workspace-project"><span class="eyebrow">${x.courses.map(id=>esc(expansionById[id].label)).join(' · ')}</span><h2><button type="button" class="workspace-project-title" data-action="workspace-project-detail" data-value="${x.id}" title="查看实践目标与步骤">${x.title}</button></h2><p>${x.subtitle}</p><div class="row">${x.sample?button('进入站内课例 →','workspace-project-sample',x.id,true):button('查看实践步骤','workspace-project-detail',x.id,true)}${p?button('安排为学习任务','workspace-project-task',x.id):button('加入我的路线','personal')}${x.external?`<a href="${x.external[1]}" target="_blank" rel="noopener noreferrer">${x.external[0]}</a>`:''}</div></article>`).join('')}</div>`);
  }
  function workspaceModal(title,fields,handler,submitText='保存'){
    let dialog=root.querySelector('#lbb-workspace-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='lbb-workspace-dialog';dialog.className='workspace-dialog';root.append(dialog);}
    dialog.innerHTML=`<form id="lbb-workspace-form"><div class="workspace-dialog-heading"><h2>${title}</h2><button type="button" data-action="workspace-dialog-close" aria-label="关闭窗口">×</button></div>${fields}<p class="workspace-form-error" role="alert"></p><div class="row workspace-dialog-actions"><button type="button" class="button" data-action="workspace-dialog-close">取消</button><button type="submit" class="button primary">${submitText}</button></div></form>`;
    const form=dialog.querySelector('form');form.addEventListener('submit',async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;form.querySelector('.workspace-form-error').textContent='';try{await handler(Object.fromEntries(new FormData(form)),form);dialog.close();}catch(err){form.querySelector('.workspace-form-error').textContent=err.message;}finally{b.disabled=false;}});dialog.showModal();return {dialog,form};
  }
  function workspaceToast(message){let status=root.querySelector('#lbb-workspace-toast');if(!status){status=document.createElement('div');status.id='lbb-workspace-toast';status.setAttribute('role','status');root.append(status);}status.textContent=message;setTimeout(()=>{if(status.textContent===message)status.textContent='';},6000);}
  const workspaceField=(label,name,control)=>`<label for="workspace-${name}">${label}</label>${control.replace('<input','<input id="workspace-'+name+'"').replace('<textarea','<textarea id="workspace-'+name+'"').replace('<select','<select id="workspace-'+name+'"')}`;
  function editWorkspaceTask(task,project){
    const p=activePersonal();if(!p){go('personal');return;}
    const projectCourse=project?.practicum?project.courses.find(id=>p.courseIds.includes(id)):null;
    if(project?.practicum&&!projectCourse){workspaceToast('请先在个人路线中加入实训关联课程，再安排任务。');return;}
    const idempotency=crypto.randomUUID(),initial={title:project?project.title:task?.title||'',due:task?.due||routeDay(),minutes:task?.minutes||p.minutes,note:project?project.step+'\n验收：'+project.outcome:cleanLearningText(task?.note||'')};
    workspaceModal(task?'调整学习安排':project?'把实践安排进路线':'安排一次学习',workspaceField('任务名称','title',`<input name="title" maxlength="300" required value="${esc(initial.title)}">`)+`<div class="workspace-form-grid"><div>${workspaceField('安排日期','due',`<input name="due" type="date" value="${initial.due}" required>`)}</div><div>${workspaceField('计划分钟','minutes',`<input name="minutes" type="number" min="1" max="1440" value="${initial.minutes}" required>`)}</div></div>`+workspaceField('步骤与验收','note',`<textarea name="note" rows="6" maxlength="4000">${esc(initial.note)}</textarea>`),async d=>{if(task)await workbenchCall('updateTask',{...d,id:task.id,routeId:p.id});else await workbenchCall('createTask',{...d,profile:p,requestId:idempotency,courseId:projectCourse||p.currentCourseId||p.startCourseId});await refreshWorkspace();go('today');},'保存学习安排');
  }
  let personalFocus=null,focusImported=false,focusOpening=false,focusSaving=false,focusHydration=null;
  const focusStoreKey=personalStoreKey+':focus-v2';
  try{personalFocus=JSON.parse(localStorage.getItem(focusStoreKey)||'null');if(personalFocus){personalFocus.running=false;personalFocus.started=0;}}catch{}
  const focusElapsed=()=>personalFocus?Math.min(86400,Math.max(0,personalFocus.seconds+(personalFocus.running?(Date.now()-personalFocus.started)/1000:0))):0;
  function persistPersonalFocus(){if(personalFocus){personalFocus.seconds=focusElapsed();personalFocus.started=personalFocus.running?Date.now():0;}localStorage.setItem(focusStoreKey,JSON.stringify(personalFocus));}
  function hydratePersonalFocus(){
    if(!personalFocus||workspaceLoaded||focusHydration)return;
    focusHydration=refreshWorkspace().then(drawPersonalFocus).catch(()=>{}).finally(()=>{focusHydration=null;});
  }
  async function recoverPriorFocus(){
    if(focusImported||personalFocus)return;focusImported=true;
    const old=await workbenchCall('resumeFocus').catch(()=>null);
    if(old?.key&&Number.isFinite(old.seconds)){
      const task=workspaceData.tasks.find(t=>t.id===Number(old.taskId));
      personalFocus={key:old.key,taskId:old.taskId,taskTitle:task?.title||old.taskTitle||'',routeId:old.routeId||taskRoute(task||{}),seconds:old.seconds,running:false,started:0,finishPayload:old.finishPayload||null};
      persistPersonalFocus();await workbenchCall('releaseFocus',{key:old.key}).catch(()=>{});drawPersonalFocus();hydratePersonalFocus();
    }
  }
  function drawPersonalFocus(){
    let dock=root.querySelector('#lbb-personal-focus');
    if(!dock){dock=document.createElement('div');dock.id='lbb-personal-focus';dock.setAttribute('role','region');dock.setAttribute('aria-label','专注计时');root.querySelector('.app-workspace').insertBefore(dock,root.querySelector('.app-footer'));}
    if(!personalFocus){dock.hidden=true;dock.dataset.key='';return;}
    dock.hidden=false;
    const task=workspaceData.tasks.find(t=>t.id===Number(personalFocus.taskId)),p=personalRoutes.items.find(p=>p.id===personalFocus.routeId),pending=!!personalFocus.finishPayload,busy=focusOpening||focusSaving,orphan=workspaceLoaded&&!task;
    const s=Math.floor(focusElapsed()),clock=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'),key=[personalFocus.key,personalFocus.running,pending,busy,workspaceLoaded,task?.title,p?.name].join('|');
    if(dock.dataset.key===key&&dock.querySelector('output')){dock.querySelector('output').textContent=clock;return;}dock.dataset.key=key;
    const status=focusSaving?'正在保存':focusOpening?'正在读取':pending?'等待保存':personalFocus.running?'正在专注':'已暂停';
    dock.innerHTML=`<div><small>${status} · ${p?esc(p.name):'学习任务'}</small><b>${esc(task?.title||personalFocus.taskTitle||(workspaceLoaded?'关联任务未找到':'正在读取原任务…'))}</b></div><output aria-label="专注时长">${clock}</output><div class="row">${pending?'':button(personalFocus.running?'暂停':'继续','workspace-focus-toggle')}${button(orphan?'处理计时':pending?'重试保存':'结束并保存','workspace-focus-finish',null,true)}</div>`;
    dock.querySelectorAll('button').forEach(b=>{b.disabled=busy;});
  }
  async function clearPersonalFocus(captured){
    await workbenchCall('releaseFocus',{key:captured.key}).catch(()=>{});
    if(personalFocus?.key===captured.key){personalFocus=null;persistPersonalFocus();drawPersonalFocus();}
  }
  async function openPersonalFocusResult(){
    if(!personalFocus||focusOpening||focusSaving)return;
    const captured=personalFocus;focusOpening=true;
    try{
      persistPersonalFocus();captured.running=false;captured.started=0;persistPersonalFocus();drawPersonalFocus();
      if(captured.finishPayload&&(await workbenchCall('focusStatus',captured.finishPayload)).saved){
        await clearPersonalFocus(captured);workspaceToast('这次学习结果已经保存，没有重复累计时长。');return;
      }
      await refreshWorkspace();if(personalFocus?.key!==captured.key)return;
      const task=workspaceData.tasks.find(t=>t.id===Number(captured.taskId));
      if(task){finishWorkspaceTask(task,true);return;}
      workspaceModal('处理保留的专注计时',`<p class="lead">原任务未找到，本次 ${Math.floor(captured.seconds/60)} 分 ${Math.floor(captured.seconds%60)} 秒仍保留在浏览器中。可以先下载，找回原任务后继续处理。</p><div class="row">${button('下载本次计时','workspace-focus-export')}</div><label class="workspace-check"><input type="checkbox" name="discard" required>我已保留需要的信息，确认清除此计时（不会计入学习记录）</label>`,async()=>{await clearPersonalFocus(captured);},'确认清除此计时');
    }finally{focusOpening=false;drawPersonalFocus();}
  }
  async function startPersonalFocus(task){
    if(personalFocus){if(Number(personalFocus.taskId)!==task.id)throw Error('请先保存当前专注，再开始另一项任务。');return drawPersonalFocus();}
    const p=personalRoutes.items.find(p=>p.id===taskRoute(task));
    personalFocus={key:crypto.randomUUID(),taskId:task.id,taskTitle:task.title,routeId:p?.id||taskRoute(task),seconds:0,running:true,started:Date.now()};persistPersonalFocus();drawPersonalFocus();
  }
  function finishWorkspaceTask(task,fromTimer=false){
    if(fromTimer){persistPersonalFocus();personalFocus.running=false;personalFocus.started=0;persistPersonalFocus();drawPersonalFocus();}
    const captured=fromTimer?personalFocus:null,key=captured?.key||crypto.randomUUID(),pending=captured?.finishPayload,seconds=captured?(pending?.timer_seconds??Math.floor(focusElapsed())):null,complete=pending?.complete??!fromTimer;
    const {form}=workspaceModal(fromTimer?'收好这次学习的结果':'记录成果，完成任务',`<p class="lead">${esc(task.title)}</p>${workspaceField('本次收获 / 下次继续','note',`<textarea name="note" rows="3" maxlength="1000">${esc(pending?.note||'')}</textarea>`)}<label class="workspace-check"><input type="checkbox" name="complete" ${complete?'checked':''}>这项任务已经完成</label>${workspaceField('成果与验证证据','evidence',`<textarea name="evidence" rows="4" maxlength="5000" ${complete?'required':''}>${esc(pending?.evidence??task.evidence??'')}</textarea>`)}${seconds!==null?`<p class="small muted">本次计时 ${Math.floor(seconds/60)} 分 ${seconds%60} 秒，按实际秒数保存。</p>`:workspaceField('本次实际投入 / 分钟','minutes','<input name="minutes" type="number" min="0" max="1440" value="0" required>')}`,async(d,f)=>{
      if(captured&&(personalFocus?.key!==captured.key||focusSaving))throw Error('此计时正在处理或已经结束，请关闭窗口后重试。');
      const payload={task_id:task.id,routeId:captured?.routeId||taskRoute(task),session_key:key,minutes:seconds!==null?Math.floor(seconds/60):Number(d.minutes),...(seconds!==null?{timer_seconds:seconds}:{}),complete:f.elements.complete.checked,evidence:d.evidence,note:d.note};
      if(captured)focusSaving=true;
      try{
        if(captured){captured.finishPayload=payload;persistPersonalFocus();drawPersonalFocus();}
        let result;
        try{result=await workbenchCall('finish',payload);}catch(error){
          const status=await workbenchCall('focusStatus',payload).catch(()=>null);
          if(!status?.saved)throw error;result={alreadySaved:true,matches:status.matches};
        }
        if(captured)await clearPersonalFocus(captured);
        if(result?.alreadySaved&&result.matches===false)workspaceToast('先前的结果已经保存，本次修改未覆盖原记录；请到学习记录补充。没有重复累计时长。');
        try{await refreshWorkspace();if(['today','records','routes'].includes(state.view))paintWorkspace(state.view);}catch{workspaceToast('学习结果已保存，列表暂未刷新，请稍后重新打开。');}
      }finally{if(captured){focusSaving=false;drawPersonalFocus();}}
    },'保存学习结果');
    form.elements.complete.addEventListener('change',()=>{form.elements.evidence.required=form.elements.complete.checked;});
  }
  function editWorkspaceNote(entry){const p=activePersonal();if(!p){go('personal');return;}const id=entry?.id||crypto.randomUUID(),e=entry||{title:'',entry_date:routeDay(),kind:'note',evidence_type:'reading',body:'',next_step:'',result:''};workspaceModal(entry?'编辑学习记录':'记下这次学习',workspaceField('标题','title',`<input name="title" value="${esc(e.title)}" maxlength="300" required>`)+`<div class="workspace-form-grid"><div>${workspaceField('日期','entry_date',`<input name="entry_date" type="date" value="${e.entry_date}" required>`)}</div><div>${workspaceField('类型','kind',`<select name="kind">${[['note','阅读笔记'],['experiment','实验记录'],['review','阶段复盘']].map(([id,n])=>`<option value="${id}" ${e.kind===id?'selected':''}>${n}</option>`).join('')}</select>`)}</div></div>`+workspaceField('学习收获','body',`<textarea name="body" rows="5" required maxlength="9000">${esc(cleanLearningText(e.body))}</textarea>`)+workspaceField('实际观察 / 结果','result',`<textarea name="result" rows="3" maxlength="9000">${esc(e.result||'')}</textarea>`)+workspaceField('结果依据','evidence_type',`<select name="evidence_type">${[['reading','阅读理解'],['calculation','计算'],['simulation','仿真'],['hardware','实际硬件测量'],['mixed','多种证据，分别注明']].map(([id,n])=>`<option value="${id}" ${e.evidence_type===id?'selected':''}>${n}</option>`).join('')}</select>`)+workspaceField('下一步','next_step',`<textarea name="next_step" rows="2" maxlength="9000">${esc(e.next_step||'')}</textarea>`),async values=>{await workbenchCall('journal',{profile:p,id,expectedUpdatedAt:e.updated_at,task_id:e.task_id,values:{...values,status:'recorded'}});await refreshWorkspace();go('records');},'保存学习记录');}
  function downloadWorkspace(name,value,type='application/json'){const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportWorkspace(){const records=await workbenchCall('backup');downloadWorkspace('动手学-学习数据-'+routeDay()+'.json',{format:'learn-by-building-workspace',version:2,created_at:new Date().toISOString(),routes:personalRoutes,records});}
  function openWorkspaceBackup(){let incoming=null,preview=null;const {form,dialog}=workspaceModal('备份与恢复',`<p class="lead">备份包含个人路线、任务、时长和学习记录。</p><div class="row">${button('下载完整备份','workspace-export')}</div><label for="workspace-backup-file">恢复备份文件</label><input id="workspace-backup-file" type="file" accept=".json,application/json"><div id="workspace-backup-preview"></div>`,async()=>{if(!incoming||!preview)throw Error('请先选择文件并检查预览。');if(personalFocus)throw Error('先结束并保存当前专注，再恢复备份。');await workbenchCall('backupRestore',{backup:incoming.records||incoming,checksum:preview.checksum,revision:preview.revision,confirmation:'replace-learning-records'});if(incoming.format==='learn-by-building-workspace'){personalRoutes=validateRouteRegistry(incoming.routes);writePersonal();}else{const profiles=await workbenchCall('routeIndex');personalRoutes={version:1,activeId:profiles[0]?.id||null,items:profiles};writePersonal();}await refreshWorkspace();renderAppChrome();go('records');},'确认恢复预览中的数据');form.querySelector('#workspace-backup-file').addEventListener('change',async event=>{const f=event.target.files[0];if(!f)return;try{if(f.size>12*1024*1024)throw Error('备份文件超过 12 MB');incoming=JSON.parse(await f.text());if(incoming.format==='learn-by-building-workspace')validateRouteRegistry(incoming.routes);preview=await workbenchCall('backupPreview',{backup:incoming.records||incoming});form.querySelector('#workspace-backup-preview').innerHTML=`<p class="lead">文件含 ${preview.counts.tasks} 个任务、${preview.counts.sessions} 条时长、${preview.counts.learning_entries} 篇记录。恢复会替换当前记录，系统会先保存一份安全备份。</p>`;}catch(e){form.querySelector('.workspace-form-error').textContent=e.message;}});}
  function openWorkspaceCourse(id,lesson){const c=expansionById[id];if(!c)return;if(c.course){state.node=c.node;go('course',c.course);enqueueActivity(id,'course','打开了课程地图与目录。');if(lesson&&lesson<=courses[c.course].lessons.length){state.selected=lesson;renderLessonPreview();save();}}else{workspaceModal(c.label,`<p class="lead">${esc(c.title)}</p><p>${esc(c.summary)}</p><h3>开始前</h3><p>${esc(c.prereq)}</p><h3>怎样检验</h3><p>${esc(c.check)}</p><div class="workspace-source-list">${c.sources.map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${esc(n)} ↗</a>`).join('')}</div>`,async()=>{},'知道了');}}
  let activities=[];try{activities=JSON.parse(localStorage.getItem(personalStoreKey+':activities')||'[]');}catch{}
  let activityBusy=false;
  function enqueueActivity(courseId,kind,text){const p=activePersonal();if(!p||!p.courseIds.includes(courseId))return;const event={profile:structuredClone(p),courseId,kind,text,day:routeDay(),attempts:0};if(!activities.some(a=>a.profile.id===p.id&&a.courseId===courseId&&a.kind===kind&&a.day===event.day&&a.text===text))activities.push(event);activities=activities.slice(-60);localStorage.setItem(personalStoreKey+':activities',JSON.stringify(activities));retryActivities();}
  async function retryActivities(){if(activityBusy)return;activityBusy=true;try{for(const event of activities.slice()){if(event.attempts>=3)continue;try{await workbenchCall('activity',event);activities.splice(activities.indexOf(event),1);}catch{event.attempts++;}}localStorage.setItem(personalStoreKey+':activities',JSON.stringify(activities));}finally{activityBusy=false;}}
  root.addEventListener('click',async event=>{
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.value;
    if(['sample','course'].includes(action)&&courses[id])enqueueActivity(id,action,action==='sample'?'打开了本站单讲样例。':'打开了课程地图与目录。');
    if(['check-agent','check-attention','check-budget'].includes(action)&&courses[state.course])enqueueActivity(state.course,'exercise','提交了本站课例的独立练习检查。');
    if(!action?.startsWith('workspace-'))return;
    try{
      const task=workspaceData.tasks.find(t=>t.id===Number(id));
      if(action==='workspace-new-route'){personalDraft=newContextDraft();go('personal');}
      else if(action==='workspace-edit-route'){const p=activePersonal();if(p)personalDraft={...structuredClone(p),direction:personalDirection(p),startCourseId:p.currentCourseId||p.startCourseId};go('personal');}
      else if(action==='workspace-task-scope'){taskScope=id;paintWorkspace('today');}
      else if(action==='workspace-task-more'){
        const p=activePersonal(),element=b.closest('.workspace-task-group');if(!p||!element)return;
        const key=taskGroupKey(p,id),group=routeTaskGroups(p).find(g=>g.id===id);if(!group)return;
        taskGroupLimits.set(key,(taskGroupLimits.get(key)||20)+20);
        element.querySelector('.workspace-task-group-body').innerHTML=taskGroupBody(group,p);
        (element.querySelector('[data-action="workspace-task-more"]')||element.querySelector('summary'))?.focus({preventScroll:true});
      }
      else if(action==='workspace-task-list-more'){
        const p=activePersonal();if(!p)return;const key=taskGroupKey(p,taskScope==='course'?currentCourse(p).id:'today');
        taskListLimits.set(key,(taskListLimits.get(key)||40)+40);paintWorkspace('today');
        (main.querySelector('[data-action="workspace-task-list-more"]')||main.querySelector('.workspace-task-list [data-action="workspace-task-edit"]'))?.focus({preventScroll:true});
      }
      else if(action==='workspace-record-scope'){recordScope=id;paintWorkspace('records');}
      else if(action==='workspace-resource-scope'){resourceScope=id;paintWorkspace('resources');}
      else if(action==='workspace-project-scope'){projectScope=id;paintWorkspace('projects');}
      else if(action==='workspace-task-new')editWorkspaceTask();
      else if(action==='workspace-task-edit'&&task)editWorkspaceTask(task);
      else if(action==='workspace-start'&&task)await startPersonalFocus(task);
      else if(action==='workspace-complete'&&task)finishWorkspaceTask(task);
      else if(action==='workspace-focus-toggle'&&personalFocus){if(focusOpening||focusSaving)return;if(personalFocus.finishPayload)throw Error('本次结果正在等待保存，请点击“重试保存”。');persistPersonalFocus();personalFocus.running=!personalFocus.running;personalFocus.started=personalFocus.running?Date.now():0;persistPersonalFocus();drawPersonalFocus();}
      else if(action==='workspace-focus-finish'&&personalFocus)await openPersonalFocusResult();
      else if(action==='workspace-focus-export'&&personalFocus)downloadWorkspace('保留的专注计时-'+personalFocus.key+'.json',{format:'learn-by-building-pending-focus',version:1,created_at:new Date().toISOString(),focus:personalFocus});
      else if(action==='workspace-dialog-close')root.querySelector('#lbb-workspace-dialog')?.close();
      else if(action==='workspace-note-new')editWorkspaceNote();
      else if(action==='workspace-note-edit')editWorkspaceNote(workspaceData.entries.find(e=>e.id===id));
      else if(action==='workspace-note-open'){const e=workspaceData.entries.find(e=>e.id===id);if(e)workspaceModal(esc(e.title),`<p class="small muted">${esc(e.entry_date)}</p>`+Object.entries({body:'学习收获',question:'问题',prediction:'预测',procedure:'操作与条件',result:'实际结果',conclusion:'结论',next_step:'下一步'}).filter(([k])=>e[k]).map(([k,label])=>'<h3>'+label+'</h3><p class="workspace-prewrap">'+esc(cleanLearningText(e[k]))+'</p>').join(''),async()=>{},'关闭');}
      else if(action==='workspace-export')await exportWorkspace();
      else if(action==='workspace-backup')openWorkspaceBackup();
      else if(action==='workspace-open-course'||action==='workspace-course-info')openWorkspaceCourse(id);
      else if(action==='workspace-open-current'){const c=currentCourse(),next=personalTasks().filter(t=>taskCourse(t)===c.id&&t.state!=='done').sort((a,b)=>a.due.localeCompare(b.due))[0];const index=c.course?courses[c.course].lessons.findIndex(l=>next?.title.startsWith(c.label+' · '+l[0]+' · ')):-1;openWorkspaceCourse(c.id,index>=0?index+1:undefined);}
      else if(action==='workspace-course-current'){b.disabled=true;try{await switchCurrentCourse(id);}finally{b.disabled=false;}}
      else if(action.startsWith('workspace-project-')){const x=integratedProjects.find(x=>x.id===id);if(!x)return;if(action==='workspace-project-task')editWorkspaceTask(null,x);else if(action==='workspace-project-sample'){state.node=courses[x.sample].node;go('lesson',x.sample);enqueueActivity(x.sample,'sample','打开了项目中的站内课例。');}else workspaceModal(x.title,`<p class="lead">${x.subtitle}</p><h3>先做这一小步</h3><p>${x.step}</p><h3>验收产出</h3><p>${x.outcome}</p>`,async()=>{},'知道了');}
      icons();
    }catch(e){workspaceToast(e.message);}
  });
  setInterval(()=>{if(personalFocus){if(personalFocus.running)persistPersonalFocus();drawPersonalFocus();}},1000);
  addEventListener('pagehide',()=>{if(personalFocus){persistPersonalFocus();personalFocus.running=false;personalFocus.started=0;persistPersonalFocus();}});

  render();
  if(globalThis.Tweak){
    const design={compact:false};
    const tweak=new globalThis.Tweak({container:root,onChange:()=>{root.style.setProperty('--lbb-node-pad',design.compact?'9px':'13px');}});
    tweak.addToggle(design,'compact',{label:'地图更紧凑'});
  }
})();
