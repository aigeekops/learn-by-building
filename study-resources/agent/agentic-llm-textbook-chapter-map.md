# 《Agentic Large Language Models》全书章节地图

> 这份地图对应 arXiv:2610.13455 的 HTML 全本（472 页 / 7 部分 / 23 章 / 4 个动手案例）。章节号、小节名与每章「读完后你能做到」均按原书口径整理，未添加书外内容。
>
> 配套走读文章：《Agent = LLM + Harness：一本 472 页教科书里的完整 Agent 学习路线》
> 持续更新与更多 Agent 工程走读，见公众号 **「极客行动」**（合集《Agent开发内功》）。

---

## 一、这本书的基本信息

| 项 | 内容 |
|---|---|
| 书名 | Agentic Large Language Models |
| 作者 / 机构 | 莱顿大学（Leiden University）四位研究者 |
| 挂出时间 | 2026 年 10 月 9 日 |
| 体量 | 472 页，23 章，7 个部分，4 个动手案例 |
| 定位 | 研究生课程 Agentic LLMs 的教材，兼顾「简明」与「覆盖全」 |
| 价格 | 免费；HTML 版可全文搜索，勘误通过课程网站提交 |
| 课程网站 | https://agenticllms.liacs.nl |
| 星号（*）含义 | 原书用 `*` 标记进阶章节与进阶小节（第 19–22 章整章为进阶） |
| 先修要求（原书 1.4） | Python + PyTorch；机器学习基础（分类/回归、训练/测试集、过拟合欠拟合、决策树与随机森林）；深度学习（MLP/CNN/RNN、反向传播、交叉熵、ReLU）；强化学习（序贯决策、agent 与环境、Q-learning / DQN / PPO / SAC）；NLP（分词、词向量、注意力、Huggingface） |

---

## 二、全书总览（7 部分 × 23 章）

| 部分 | 章 | 主题 | 一句话定位 | 建议 |
|---|---|---|---|---|
| 导论 | 1 | Introduction | 全书框架、Agent 与 Harness 的定义、五种交互风格总图 | 必读 |
| **Part I 语言建模** | 2–5 | Language Modeling | 从分词到 Transformer，再到完整训练流水线与算力账 | 按需（不会训练就补） |
| **Part II 推理** | 6–8 | Reasoning | CoT、自反思、视觉与世界模型、元学习 | 必读 |
| **Part III Agent** | 9–10 | Agents | 五种交互风格 + 记忆架构，配 BALROG 动手案例 | 必读（全书核心） |
| **Part IV 工具与助手** | 11–14 | Tools and Assistants | 工具调用、MCP、RAG/Agentic RAG、六大应用领域 | 必读（工程最密） |
| **Part V 行为与认知** | 15–18 | Behavior and Cognition | 机器行为学、角色制多智能体、涌现规范、社会模拟 | 选读（做模拟或研究必读） |
| **Part VI 进阶** | 19–22 | Advanced Topics | 合成数据、先进架构、机制可解释性、认知科学视角 | 选读（带 `*`） |
| **Part VII 结论** | 23 | Future Directions | 现状回顾 + 八类局限 | 必读（半小时） |

---

## 三、逐章地图

### 导论

**第 1 章 · Introduction（导论）**

- 讲什么：提出全书主线——当 LLM 不只生成文本，而是能行动、能彼此交互，会发生什么。
- 关键小节：1.2 概念与定义（辅助型 Agent vs 交互型 Agent / Agentic Harness / 多模态 / 训练数据）、1.3 受众与目标、1.4 先修、1.5 课程结构、1.6 方法与范围。
- 读完后你能做到：说清 Agent 与 Harness 的分工；理解书里那张「推理—行动—交互」分类图；按自己的目标选课程路线。
- 别跳过：1.5 给出了原书官方的三条选课路线（见本文第四节）。

---

### Part I · Language Modeling（语言建模）

**第 2 章 · Foundations of Language Modeling with LLMs（语言建模基础）**

- 讲什么：从语言的复杂性出发，一路讲到 Transformer 的每一块零件。
- 关键小节：2.1 自然语言处理（语言复杂度：句法/形态/语义/语用/篇章；分布式表示；分词：词级/字符级/子词级）、2.2 三种学习范式（监督 / 自回归 / 强化）、2.3 建模语言（嵌入 → 上下文嵌入 → RNN/LSTM/Encoder-Decoder → 注意力 → Transformer → BERT → GPT）。
- 读完后你能做到：解释每种表示方法是为解决什么问题而设计；说清 q/k/v 如何交互；按任务选 encoder 还是 decoder。
- 可以跳过的情况：已经能手推注意力、写得出 Transformer，扫一眼 2.4 的开放挑战即可。

**第 3 章 · The Large Language Model Training Pipeline（训练流水线）**

- 讲什么：一个 LLM 从随机初始化到可部署，中间到底有几步。
- 关键小节：3.1 训练模型（encoder vs decoder；预训练/微调范式；开源 vs 闭源）、3.2 流水线（获取数据 → 预训练 → 微调 SFT → 偏好对齐（价值/安全/目标对齐）→ 推理）、3.3 基准与指标（预训练指标 / 后训练指标 / 常见基准 / 数据污染）。
- 读完后你能做到：说清每一阶段的目的；解释为什么偏好对齐放在微调之后；指出常见基准各自在测什么能力。
- 别跳过：3.3.3 的数据污染一节，是后面判断 Agent 评测结果可信度的依据。

**第 4 章 · Scaling Laws and Efficient Large Language Models（规模定律与高效模型）**

- 讲什么：算力、数据、参数三者怎么换性能，以及省算力有哪些招。
- 关键小节：4.1 规模定律（Kaplan / Chinchilla / 算力最优曲线 / 涌现能力 / 逆向规模 / Grokking）、4.2 小语言模型（模型侧：降预训练成本、PEFT、架构创新、知识蒸馏；推理侧：KV Cache、剪枝、量化、投机解码；数据侧：筛选、合成数据、样本高效学习）、4.3 推理时算力、4.4 可持续模型（能耗、隐私与数据泄露）。
- 读完后你能做到：预测某一项放大、其余固定时的效果变化；分析小模型在算力与性能上的取舍；分清训练时算力与推理时算力。
- 重点关注：4.2.1.2 的 KV Cache 与投机解码，是做 Agent 时 latency 优化的落点。

**第 5 章 · Case Study 1: Building LLMs from Scratch（案例 1：从零训练 LLM）** ⚒️

- 讲什么：照着 Karpathy 的 nanochat，把第 3 章的流水线亲手跑一遍。
- 关键小节：5.3 实验准备（仓库 / 算力 / 日志）、5.5 任务 1 分词（BPE，词表大小的取舍）、5.6 任务 2 预训练、5.7 任务 3 中期训练 + SFT、5.8 任务 4 推理、部署与批判性反思。
- 读完后你能做到：区分 tokenization / pre-training / mid-training / SFT 各阶段的机制；配并训练一个 BPE 分词器；在机制层面描述 Transformer 超参（注意力头、层数、嵌入维度）与容量和算力预算的关系；在 ARC-Easy / ARC-Challenge / GSM-8K 上评测并批判性解读失败模式。
- 什么时候跳过：只想做 Agent 应用、不碰训练，可跳过，代价是不懂「模型没学过的能力」从哪来。

---

### Part II · Reasoning（推理）

**第 6 章 · Multi-step Reasoning in LLMs（多步推理）**

- 讲什么：模型怎么从「一步出答案」变成「分步想清楚」，以及 Harness 第一次登场。
- 关键小节：6.1 上下文内推理（in-context learning：是激发不是训练、上下文窗口、少样本、提示工程）、6.1.2 多步推理基准、6.1.3 思维链（自评估 / 生成代码做验证 / 提示演化）、6.2 自反思与状态（LLM 是无记忆函数、检索增强与长上下文、有状态问题与 knowing-doing gap、用 Harness 改进提示）。
- 读完后你能做到：解释 CoT 如何用上下文内学习引导中间步骤；**写出你的第一个 agentic harness**（一个用不同 prompt 反复调用 LLM、并管理提示与回复的小算法）；理解 Harness 如何维护状态。
- 别跳过：这是全书第一次把「Harness」落到可执行的代码形态上。

**第 7 章 · Vision, Action and World Models（视觉、行动与世界模型）**

- 讲什么：Agent 要行动，就得看懂图像、会输出动作、知道墙撞不过去。
- 关键小节：7.1 视觉语言模型 VLM（任务 / 架构 / 学习算法 / 结果）、7.2 视觉-语言-动作模型 VLA（同上四段式，含机器人动作）、7.3 世界模型（WorldGPT / WebDreamer / WorldCoder 三个系统的任务、架构、算法、结果；末节讲基于模型的强化学习、降维、JEPA、agentic 世界模型）。
- 读完后你能做到：描述 VLM 的三段式结构；说清 VLA 为什么提升机器人行为的通用性；解释世界模型如何避免 Agent 做出撞墙这类决策。
- 与机器人线交叉：做具身智能的话，这一章是全书和你最相关的一章。

**第 8 章 · Metalearning（元学习）**

- 讲什么：为什么「会自我改进的 Agent」很难训稳。
- 关键小节：8.1 为什么需要元学习（深度学习太慢 / 实现少样本学习）、8.2 内循环与外循环（迁移学习）、8.3 LLM 与元学习（静态：预训练流水线 / ICL / CoT，静态元学习是稳定的；动态：自反思 / RLVR）、8.4 稳定动态元学习。
- 读完后你能做到：识别流水线里不同层次的学习；搭出一个含内外循环的系统；认出 moving-target 问题（动态元学习为何难收敛）。
- 别跳过：8.4 是理解「自我改进型 Agent 为什么会跑飞」的关键。

---

### Part III · Agents（智能体）

**第 9 章 · Interaction Styles for Agentic LLMs（Agent 的交互风格）** ★ 全书枢纽

- 讲什么：把「Agent 怎么和模型打交道」分成五档，并给出记忆该放在哪。
- 关键小节：9.1 AI 中的 Agent（机器人助手 / BDI Agent / 群体 Agent / Agentic LLM 作为强化学习 Agent）、9.2 五种交互风格（**A 单次查询 → B 上下文内学习 → C 思维链 → D 自反思 Harness → E 强化微调 Harness**）、9.3 记忆架构（为什么需要记忆：连贯对话 / 适应 / 身份 / 持续学习；三种做法：微调 / 长上下文与压缩 / 显式记忆管理（含向量库、学会使用记忆））。
- 读完后你能做到：认出 AI 史上三类 Agent 及其与今天的关联；分辨五种交互风格；区分不同的 Agent 记忆架构并知道各自代价。
- 别跳过：全书公式「Agentic LLM = LLM + Harness」就是在这章立住的。

**第 10 章 · Case Study 2: BALROG for LLM Reasoning and Reflection（案例 2：BALROG 推理与反思）** ⚒️

- 讲什么：在谜题与游戏基准上跑一个会自我反思的推理 Agent，然后改它。
- 关键小节：10.1 BALROG 概览（谜题与游戏 / 架构 / Prompt Builder / Agent）、10.2 实现步骤（复现论文 / 换 LLM / 换谜题 / 算力成本 / 实现自己的推理 Agent）、10.3 评测、10.4 自反思（ReAct、Reflexion、扩展）。
- 读完后你能做到：在多步推理基准上跑通 Agent；按自己的想法改造推理 Agent；实现自己的自反思 Agent；批判性评估学习系统在谜题域的性能与稳定性。
- 说明：BALROG = Benchmarking Agentic LLM and VLM Reasoning On Games（Paglieri et al., 2025），原论文见 arXiv:2411.13543。

---

### Part IV · Tools and Assistants（工具与助手）

**第 11 章 · How Agents Use Tools to Act in the World（Agent 如何用工具行动）**

- 讲什么：工具是 LLM 内部推理通往外部世界的桥，也包括这桥怎么塌。
- 关键小节：11.2 工具使用架构（直接调用 Direct Invocation / Planner–Caller–Summarizer）、11.3 API 与工具链（LangChain 示例、浏览器与电脑工具）、11.4 **Model Context Protocol（MCP）与上下文管理**（含实现示例）、11.5 鲁棒性、错误处理与恢复（反应式处理 / 自纠正与状态感知 / 人在环路）、11.6 安全与安全风险。
- 读完后你能做到：说清工具为什么是必须的；区分两种调用架构；用 LangChain 与 ReAct 循环干活；把 MCP 作为标准化集成方案讲清楚；分析给 Agent 外部工具权限后的风险。
- 别跳过：11.5 是工程上最容易被忽略、上线后最先出事的一节。

**第 12 章 · Search and Retrieval in Agentic LLMs（检索与搜索）**

- 讲什么：从信息检索这门老学科讲到 Agentic RAG。
- 关键小节：12.1 检索通论（词袋 / 向量空间 / 稠密与稀疏表示）、12.3 RAG 流水线、**12.4 自适应检索**（Self-RAG 与 Self-Ask、Python 稠密检索示例、查询改写与扩展）、12.5 超越文本（Graph-RAG / Code-RAG（AST + 嵌入）/ 表格与异构文档 / 多模态 RAG）、12.6 Agentic RAG（关键组件 / 实时与流式）、12.7 评测（Recall@k、MRR、忠实度、归因与新鲜度）。
- 读完后你能做到：描述从索引分块到答案生成的完整链路；实现自适应检索；把检索扩展到图、代码、表格与多模态；说清 Agentic RAG 与一次性检索的区别；用标准指标评测。
- 重点关注：12.7 的归因与新鲜度，是 RAG 上线后最常见的两个投诉来源。

**第 13 章 · From Tools to Assistants: Real-World Applications（从工具到助手：真实应用）**

- 讲什么：六个真实场景里，助手系统分别长什么样、各自的风险边界在哪。
- 关键小节：13.2 对话助手、13.3 购物助手（做什么 / 关键成分 / 基准 / 实践建议 / 挑战与开放问题）、13.4 航班运行助手（预订与行程规划 / 运行决策支持 / 关键建议）、13.5 医疗助手（高风险域 / 医学教育）、13.6 交易助手（含评测）、13.7 自动化科学发现、13.8 编码助手。
- 读完后你能做到：说清助手相比问答多了哪些能力（规划、检索、调工具、随时间适应）；跨领域比较助手架构；解释高风险域对安全、透明、合规的额外要求。
- 说明：原书明说医疗案例的目标不是做出临床可用系统，是让你亲眼看到这类系统在高风险域怎么出问题。

**第 14 章 · Case Study 3: Building a Multi-Agent Diagnosis Framework（案例 3：多智能体诊断框架）** ⚒️

- 讲什么：在简化医院场景里，用 planner + executor 两个 Agent 通过共享上下文协作（灵感来自 MCP）。
- 关键小节：14.3 实现步骤（Step 0 训练诊断模型 → Step 1 跑通并理解基线 → Step 2 用 LLM Agent 替换基于规则的 planner）、14.4 评测、14.5 反思题与可选扩展。
- 读完后你能做到：实现 planner/executor 通过共享上下文通信的诊断流程；把训练好的 ML 分类器作为工具接进 Agent 流水线；替换规则 planner 并评估对路由与诊断准确率的影响；把 planner 错误与 executor 错误分开评估。
- 别跳过：14.5 的反思题，是全书写得最诚实的一组「你以为你做对了其实没有」的检查清单。

---

### Part V · Behavior and Cognition（行为与认知）

**第 15 章 · Studying Behavior of Agentic LLMs（研究 Agentic LLM 的行为）**

- 讲什么：把 LLM 当一类「行动者」来研究，而不是当工程制品来测。
- 关键小节：15.2 实验探测行为、15.3 基础社交工具箱（语言能力与语用 / 礼貌理论（LLM 对用户礼貌吗？用户的礼貌会影响性能吗？）/ 共情与情感线索）、15.4 策略行为（社会困境中的合作与协调 / 跨游戏跨模型基准）、15.5 心智理论（ToM 基准、字面—功能差距、推理模型与 ToM）、15.6 道德判断与行为（道德心理学背景 / 探测 LLM 的道德判断 / 从判断到行为 / 压力下的行动）。
- 读完后你能做到：说清「LLM 行为」指什么、怎么研究；列出基础社交能力并知道哪些强哪些弱；评估行为学方法能证明什么、不能证明什么。
- 值得一提：15.3.2 里「用户礼貌与否会不会影响模型表现」这一问，有实测结论，值得单独看。

**第 16 章 · Role-Based Interaction in Multi-LLM Systems（角色制多 LLM 交互）**

- 讲什么：给 Agent 分配角色后，它们怎么合作、什么时候合作反而更差。
- 关键小节：16.1 从单智能体到多智能体（多智能体模拟的历史与现状 / 角色制 vs 涌现式 / **多智能体协作的五个维度** / 方法学说明）、16.2 策略互动（博弈基准 / 单场景平台）、16.3 角色制任务求解（互补配对 / 辩论与讨论 / 角色制软件团队 / 社会角色扮演）。
- 读完后你能做到：区分角色制与开放式涌现；描述 LLM Agent 在博弈场景中的行为；说出哪些框架实现了哪种协作模式；批判性判断多智能体何时真的提升性能。
- 重点关注：16.1.3 的五个维度，可以直接拿来当多智能体方案的设计检查表。

**第 17 章 · Emergent Behavior in Multi-LLM Systems（多 LLM 系统的涌现行为）**

- 讲什么：不给角色、只给规则和自然语言，规范与「元规范」会自己长出来。
- 关键小节：17.2 模拟基础设施（小世界 / 上千到百万 Agent / 把模拟当科学仪器 / AgentVerse 这个边界案例）、17.3 涌现的规范与元规范、17.4 开放世界环境下的评测、17.5 涌现行为的风险。
- 读完后你能做到：区分涌现式模拟与角色制交互；描述生成式 Agent 模拟的架构与规模扩展路径；解释局部交互如何产生全局规范；判断「涌现」「自组织」这类从人类语境借来的概念在多大程度上成立。
- 别跳过：17.5 的风险一节，配合 17.3 的规范涌现一起读，才知道这类系统该在哪里设闸。

**第 18 章 · Case Study 4: Simulating Societies with LLM Agents（案例 4：用 LLM Agent 模拟社会）** ⚒️

- 讲什么：照着 Generative Agents（Park et al., 2023）搭一个社会模拟，并做一次机器心理学实验。
- 关键小节：18.2 背景（生成式 Agent / 「坏比好更强」/ 为什么这对 Agent 设计重要）、18.3 实现（模拟环境 / Agent 架构 / 认知循环 / **两种架构变体：A 基线记忆检索 vs B 带负性偏差的记忆检索**）、18.4 讨论。
- 读完后你能做到：跑通并配置一个 LLM 社会模拟；做一次结构化机器心理学实验；对比标准记忆系统与负性偏差记忆系统；研究人格描述与架构选择如何塑造涌现行为。
- 别跳过：18.4 明确要求反思提示脆弱性、模型依赖性与 LLM 模拟的边界。

---

### Part VI · Advanced Topics（进阶，原书标 `*`）

**第 19 章 · \*Synthetic Data Generation for Training Agentic LLMs（合成数据生成）**

- 关键小节：19.2 蒸馏循环（**四个轴**：信号 / 数据来源（师生范式）/ 时机（off-policy vs on-policy）/ 教师身份（自蒸馏与自我改进））、19.3 模拟人类生成内容（训练数据 / 评测数据（自动化红队）/ Agentic 数据）、19.4 数据策展（外在评估 / 内在评估：正确性、多样性、污染、公平与偏见）、19.5 风险（模型坍塌 / 偏见放大 / 安全 / 隐私 / 版权与使用条款）。
- 读完后你能做到：说清数据在流水线里的地位；描述强弱模型间的蒸馏闭环；列出合成数据的策展与评估策略；对照讲出使用合成数据的利弊。
- 适合谁：走 Part IV（助手）路线且要自己造数据的人。

**第 20 章 · \*Advanced Transformer and Agentic Architectures（先进 Transformer 与 Agentic 架构）**

- 关键小节：20.1 Transformer 架构（图灵完备性 / 在决策轨迹上预训练回溯 / LoopedLLM 与递归多智能体系统）、20.2 Agentic 架构（上下文内强化学习 / 自修改 Hyperagent / Meta Agent）。
- 读完后你能做到：说清 Transformer 原则上图灵完备；解释为什么在决策轨迹而非自然语言上训练能让模型学会规划；描述循环语言模型如何跳过分词层直连嵌入；说明自修改 Agent 的利弊；理解把元学习用在 Harness 设计上得到 meta-harness。
- 适合谁：走 Part II（推理）路线想再深一层的人。

**第 21 章 · \*Mechanistic Interpretability for LLM Agents（机制可解释性）**

- 关键小节：21.2 幻觉与忠实性、21.3 残差流与逐层迭代精化、21.4 多义性与叠加、21.5 Logit Lens（直接 logit 归因 / Tuned Lens）、21.6 电路分析（归纳头原型 / 电路发现方法 / 忠实性、完备性与最小性评估）、21.7 激活补丁与因果干预、21.8 稀疏自编码器（字典学习 / 单义性与影子模型）。
- 读完后你能做到：区分四种可解释性范式；解释幻觉与忠实性的关系；用 Logit Lens / Tuned Lens 可视化预测如何逐层演化；用 SAE 把激活分解成人类可读特征；用电路分析与激活补丁定位并因果验证内部电路。
- 适合谁：想给 Part I / Part II 补一层底层证据的人。

**第 22 章 · \*Cognitive Perspectives on Agentic LLMs（认知科学视角）**

- 关键小节：22.1 从行为到认知（三层证据：行为层 / 表征层 / 机制层；能力与表现；分析单位是模型、系统还是环境）、22.2 语言内容理解（怀疑论与回应、正反证据）、22.3 世界模型与空间认知、22.4 社会认知与心智理论、22.5 元认知、内省与自我知识、22.6 意识（功能主义与理论驱动评估 / 对功能主义的反驳 / 自我报告与内在生活）。
- 读完后你能做到：区分行为、内部表征、机制三层证据；刻画「LLM 是否理解语言内容」的争论；评估世界模型与空间表征的正反证据；说明为什么自我报告是弱证据；讲清过度归因与归因不足各自的风险。
- 适合谁：走 Part V（社会模拟）路线的人，尤其 22.4。

---

### Part VII · Conclusion（结论）

**第 23 章 · Future Directions for Agentic LLMs（未来方向）**

- 讲什么：先回看全书讲了什么，再逐条列出这个领域还没解决的问题。
- 关键小节：23.1 现状（技术 / 应用 / 行为）、23.2 局限与未来工作（记忆与自反思 / 规模（过度思考、开放世界模型与课程学习）/ 幻觉与可解释性 / 情感行为与意识 / 社会行为 / 法律与伦理 / 犯罪 / 应用层面的局限（AI 科学、电商、交易、医疗））、23.3 结语。
- 读法建议：先读，再读全书。23.2 相当于一份「这个领域哪里还不靠谱」的清单，带着它去读前面的章节，会更容易判断哪些结论可以直接拿来用。

---

## 四、原书官方的三条路线（Table 1.1）

| 目标 | 覆盖部分 | 案例 | 章节 | 可选 |
|---|---|---|---|---|
| 全面（Comprehensive） | I, II, III, IV, V | 1, 2, 3, 4 | 1–18 | 19–22 |
| 核心：助手（Core Assistants） | II, III, IV | 2, 3 | 6–14 | 2–5, 19 |
| 核心：社会模拟（Core Social Simulation） | II, III, V | 2, 4 | 6–10, 11, 15–18 | 2–5, 22 |

原书的配套课程是 14 讲：导论 1 讲，Part I 3 讲，Part II + III 3 讲，Part IV 3 讲，Part V 3 讲，最后 1 讲结课评估；四个案例即作业，成绩按作业平均，没有期末理论考试。

---

## 五、章节中英对照速查

| 章 | 英文标题 | 中文 |
|---|---|---|
| 1 | Introduction | 导论 |
| 2 | Foundations of Language Modeling with LLMs | 语言建模基础 |
| 3 | The Large Language Model Training Pipeline | 大语言模型训练流水线 |
| 4 | Scaling Laws and Efficient Large Language Models | 规模定律与高效大语言模型 |
| 5 | Case Study 1: Building LLMs from Scratch | 案例 1：从零构建 LLM |
| 6 | Multi-step Reasoning in LLMs | LLM 的多步推理 |
| 7 | Vision, Action and World Models | 视觉、行动与世界模型 |
| 8 | Metalearning | 元学习 |
| 9 | Interaction Styles for Agentic LLMs | Agentic LLM 的交互风格 |
| 10 | Case Study 2: BALROG for LLM Reasoning and Reflection | 案例 2：BALROG 推理与反思 |
| 11 | How Agents Use Tools to Act in the World | Agent 如何用工具在世界中行动 |
| 12 | Search and Retrieval in Agentic LLMs | Agentic LLM 中的搜索与检索 |
| 13 | From Tools to Assistants: Real-World Applications | 从工具到助手：真实世界应用 |
| 14 | Case Study 3: Building a Multi-Agent Diagnosis Framework | 案例 3：构建多智能体诊断框架 |
| 15 | Studying Behavior of Agentic LLMs | 研究 Agentic LLM 的行为 |
| 16 | Role-Based Interaction in Multi-LLM Systems | 多 LLM 系统中的角色制交互 |
| 17 | Emergent Behavior in Multi-LLM Systems | 多 LLM 系统中的涌现行为 |
| 18 | Case Study 4: Simulating Societies with LLM Agents | 案例 4：用 LLM Agent 模拟社会 |
| 19 | *Synthetic Data Generation for Training Agentic LLMs | 面向 Agentic LLM 训练的合成数据生成 |
| 20 | *Advanced Transformer and Agentic Architectures | 先进 Transformer 与 Agentic 架构 |
| 21 | *Mechanistic Interpretability for LLM Agents | 面向 LLM Agent 的机制可解释性 |
| 22 | *Cognitive Perspectives on Agentic LLMs | Agentic LLM 的认知科学视角 |
| 23 | Future Directions for Agentic LLMs | Agentic LLM 的未来方向 |

---

## 六、链接

- 原书 arXiv 页：https://arxiv.org/abs/2610.13455
- 原书 HTML 全文（可搜索）：https://arxiv.org/html/2610.13455v1
- DOI：https://doi.org/10.48550/arXiv.2610.13455
- 课程网站（讲义与作业）：https://agenticllms.liacs.nl
- 第 18 章社会模拟练习代码：https://github.com/DorotaMoravcikova/agentic-llm-course-excercises

---

**这份地图会跟着后面的章节走读一起更新，本文件即最新版；公众号文章里放的版本可能滞后，以评论区置顶为准。**

公众号 **「极客行动」**，合集《Agent开发内功》，持续更新 Agent 工程的一手走读：模型之外那部分（Harness、上下文、工具、记忆、多智能体）到底怎么设计、为什么这样设计。
