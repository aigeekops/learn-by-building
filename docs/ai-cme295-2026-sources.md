# CME 295 Autumn 2026：已发布六讲教学配套

核对日期：2026-11-08。按[2026 官方大纲](https://cme295.stanford.edu/syllabus/)确认：第1–6讲课件已公开，第1–5讲有官方视频，第6讲视频仍为 Coming soon。第7–9讲仅有安排，不纳入本批课件。

本次提供六讲原创中文教学页，38个带机制解释、核心代码片段与动手问题的主题段落，18处可选择演示。每讲含通俗讲解、算例、逐步动画/变量轨迹、数值检查和独立验证。它们是对原课主题的原创教学配套，不是逐页翻译或官方视频的等价替代。

| 讲次 | 具体覆盖 | 主要可操作演示 | 核实的一手材料 |
|---|---|---|---|
| 1 Transformers | NLP任务、自回归分解、分词/BPE、one-hot与Word2vec、RNN/LSTM、QKV、多头、mask、FFN/残差/归一化、编码器/解码器与训练/生成 | BPE真实计数与合并、向量查表/均值/RNN状态；单头因果注意力 | [118页课件](https://cme295.stanford.edu/slides/fall26-cme295-lecture1.pdf)；[视频](https://www.youtube.com/watch?v=114i2Kz-LZA)及已取得英文字幕 |
| 2 Large Language Models | 模型家族、MoE总量/活跃量、MHA/MQA/GQA、RoPE与长度、温度/top-k/top-p | 稀疏路由、KV容量、RoPE共同平移、输出采样 | [138页课件](https://cme295.stanford.edu/slides/fall26-cme295-lecture2.pdf)；[视频](https://www.youtube.com/watch?v=GaIeu3npx04)及英文字幕 |
| 3 LLM training | 预训练、teacher forcing、数据分布、mid-training、长上下文、SFT mask、LoRA、RLHF/DPO、推理与验证、offline/on-policy蒸馏 | 监督位置损失、参考偏好差与KL；LoRA真实矩阵增量 | [165页课件](https://cme295.stanford.edu/slides/fall26-cme295-lecture3.pdf)；[视频](https://www.youtube.com/watch?v=S3bCDcJhz4s)及英文字幕 |
| 4 Reinforcement learning with LLMs | token/序列概率约定、主观/可验证奖励、score-function梯度、基线与信用分配、PPO、GRPO、零方差组、OPD和限制 | 三回答组内优势、一次标量策略梯度估计、候选更新、正负优势的ratio裁剪与KL诊断 | [135页课件](https://cme295.stanford.edu/slides/fall26-cme295-lecture4.pdf)；[视频](https://www.youtube.com/watch?v=3Vaj0Oka_t4)及1725段公开英文字幕；已渲染检查第72页公式 |
| 5 LLM systems | GPU容量/带宽/算力、roofline、FlashAttention精确在线归一化与IO、DP/ZeRO/TP/PP、prefill/decode、KV、分页/GQA/MLA、投机解码、实测口径 | KV字节与QK分数对；数值稳定分块softmax；投机采样接受与残差修正；状态分片 | [156页课件](https://cme295.stanford.edu/slides/fall26-cme295-lecture5.pdf)；[视频](https://www.youtube.com/watch?v=25KIyaeI_Fg)及2599段英文字幕；已渲染检查第143页拒绝修正示意 |
| 6 AI Agents | RAG召回/重排/生成、Recall/RR/NDCG、结构化工具调用、MCP、harness/计划、A2A、上下文压缩、短/长期记忆、编码Agent、Skills/plugins与验证 | 人工向量检索与引用；有界Agent循环；工具schema/幂等；上下文装箱 | [152页课件](https://cme295.stanford.edu/slides/fall26-cme295-lecture6.pdf)，已渲染检查第27页召回/排序分工。视频未发布，没有提供或虚构字幕定位 |

字幕定位经过实际读取：第4讲40:40起介绍PPO、41:03起优势、67:37起GRPO；第5讲17:11起FlashAttention、83:06起KV、92:57起投机解码。字幕可能存在识别错误，关键公式和概念按课件交叉核对。

## 计算与代码边界

- 新增9个可注册数值模型位于 `web/ai-cme295-2026.js`，复用既有注意力、采样、LoRA、并行及工具案例。模型是原创小规模 JavaScript 计算，未执行下载材料中的代码。
- RNN使用标量递推，表示表为人工数值；BPE不跨词边界，也不实现完整生产tokenizer。
- RL的候选更新使用未裁剪的单组梯度，再诊断裁剪目标与KL，没有声称实现完整PPO/GRPO训练。
- KV面板只统计明确基线下的QK分数对与缓存容量；计数减少比例不是GPU提速倍数。
- 分块softmax验证数学等价与数值稳定，不模拟FlashAttention内核、HBM/SRAM布局或真实性能。
- 投机采样演示一个位置的接受/拒绝修正，固定独立抽样点用来复算轨迹；测试另用解析边际验证目标分布保持。
- 检索向量与知识片段均为人工案例，回答是带来源的确定性摘录。其余工具与Agent策略也明确采用内存案例或预设决策。

原始PDF、字幕与提取文本保存在课件项目外的本地研究目录；公开构建只包含原创代码、教学内容和来源元数据。第三方材料维持原有权利。
