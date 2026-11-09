# CS336 Spring 2026：已公开讲次的教学配套

核对与制作日期：2026-11-08。覆盖官方第 1–17 讲和已发布 Dan Fu 嘉宾讲座，共 18 个原课程单位；每单位有讲解、逐步计算/调度、对应代码、跟做、独立数值题与迁移验证。本文说明素材与本站原创配套的边界，不宣称已经完成全部 GPU 作业或逐字翻译。

## 来源核对

以 [2026 官方课程页](https://cs336.stanford.edu/)及其链接的 [官方讲义仓库](https://github.com/stanford-cs336/lectures)为依据。第 1–17 讲的原始 `.py` 或 `.pdf` 已逐份下载，SHA-256 摘要保存在 `config/ai_cs336_2026.json` 的来源元数据和本地下载回执中。Python 文件只读取，不未经审查执行其 GPU、网络或资源配置。

已有的第 1–17 讲英文时间戳字幕从用户指定的 blogAi 素材库只读复制，并与官方 2026 视频播放列表的标题及原课核心机制交叉核对。转录可能把术语、数字或公式识别错，因此正文以实际代码、课件和可复算公式核对，而非机械翻译字幕。

Dan Fu 官方视频 `9EEm4iMAF5s` 已取得 1914 段英文自动字幕；另读取用户既有第 18 份时间戳字幕。其开场讲服务侧推理、结尾 71:30 感谢 Dan，与官方视频时长 4301 秒相符。已核对 16:31 连续 batching、37:35 Megakernels、64:47 起 co-design 问答。未取得嘉宾独立官方课件，因此只以视频/字幕作依据，不杜撰页码或把别人的硬件指标写成本站运行结果。

## 逐讲材料与配套

| 2026 讲次 | 已读取的一手材料 | 本站实际计算或调度 |
| --- | --- | --- |
| 1 Overview / tokenization | `lecture_01.py` 的 byte/character/word/BPE 与 `train_bpe` | 带词边界、固定并列规则的 BPE 合并与可逆检查 |
| 2 PyTorch / resource accounting | `lecture_02.py` 的 tensor/einops、FLOP、optimizer、训练循环 | 6ND 与用时、状态容量、roofline |
| 3 Architectures / hyperparameters | `lecture_03.pdf` 的 norm、激活/门控、位置/head 与超参数 | RMSNorm、受控门控与残差、标准 FFN 形状计数 |
| 4 Attention alternatives / MoE | `lecture_04.pdf` 的线性/混合机制与路由/负载 | top-k 专家、加权输出、固定大小线性 Attention 状态 |
| 5 GPUs / TPUs | `lecture_05.pdf` 执行与存储层级及性能讨论 | 计算与带宽两种时间下界与理想 roofline |
| 6 Kernels / Triton | `lecture_06.py` 的 benchmark、softmax、row sum 与 matmul | 真实小矩阵乘加、尾块、假设下读取次数 |
| 7 Parallelism I | `lecture_07.py` 的 collectives、DP、TP、PP | 平均梯度、ZeRO 持久状态、输入/输出维分片 |
| 8 Parallelism II | `lecture_08.pdf` 的网络、ZeRO、pipeline、tensor、expert/sequence 组合 | 前向 fill/drain 逐槽排程与矩阵分片结果对照 |
| 9 Scaling laws I | `lecture_09.pdf` 的幂律、等算力与 Chinchilla 拟合讨论 | 人为函数的模型/数据分配与解析最优点 |
| 10 Inference | `lecture_10.py` 的负载、缓存、压缩、speculation、batching/paging | KV 元素/字节、prefill/decode 计数、连续调度 |
| 11 Scaling laws II | `lecture_11.pdf` 的公开配方、μP、WSD 与数据约束 | 已知合成函数的对数拟合、floor 敏感性与留出误差 |
| 12 Evaluation | `lecture_12.py` 的 perplexity、各类评测、realism/validity | pass@k 组合估计及 PPL/BPB 分母对照 |
| 13 Data I | `lecture_13.py` 的 raw sources、copyright 与各语料处理案例 | 虚构 dump 的确定性提取、筛选与 provenance 保留 |
| 14 Data II | `lecture_14.py` 的变换、过滤、exact/MinHash/LSH、混合与合成 | 稳定去重、定向去污染、精确 Jaccard 与理论 LSH 候选概率 |
| 15 Mid/post-training | `lecture_15.pdf` 的 SFT 数据、偏好/RLHF 与 DPO | 助手 mask 损失、相对参考 log-ratio 的 DPO 单对目标 |
| 16 RLVR | `lecture_16.pdf` 的 PPO、GRPO、变体与长推理现象 | 算术 verifier、组优势、零方差边界、正负优势裁剪 |
| 17 Multimodality | `lecture_17.py` 的 CLIP、SigLIP、LLaVA、Qwen-VL 与 Chameleon | patch 特征/计数与统一序列成本、图到文单向对比损失 |
| Guest: Dan Fu | 官方视频及自动字幕，另与既有时间戳字幕交叉核对 | 相同 token 工作量下静态批次与连续补入的实际排程 |

## 讲解与原课程的对应方式

每讲四个原创教学 section 将原课核心主题连成问题、直觉、公式/形状、代码摘录与验证任务，而不是只放链接目录。主动画展示一个或多个可独立核算的机制；完整 GPU 实验、训练收敛与模型质量需按原作业另做。

下列假设在页面中明确标注：

- 架构示例使用给定矩阵/重复索引解释机制；标准 FFN 参数计数与玩具实现的独立参数数目分别说明。
- Roofline、访存计数、ZeRO 状态与流水线利用率都是给定假设的估算，不是 GPU 实测。前向流水线不声称实现反向 1F1B。
- 线性 Attention 是非负特征、带归一化的本站变体，不声称与 softmax 等价；MoE 路由只固定一个 top-k 方案。
- Scaling 拟合数据来自明确的人为函数，留出真值只在该教学函数中可知，不能当作真实模型预测结果。
- 数据样本、provenance 与许可标签均为原创虚构案例；技术处理不替代许可或适用用途判断。
- pass@k、CLIP 单向项、DPO 单对项、GRPO surrogate 只实现各自已声明的计算范围，未冒充完整模型训练。
- 连续 batching 在固定到达、统一单 token 速度和确定输出长度的案例上实际执行；时间槽不是毫秒或 MFU。

## 验证

`tests/ai_cs336_2026.test.cjs` 含 15 项独立模型与内容检查，覆盖 20 个新增模型的默认输入、每个控制项的有效边界、数值有限性和有界步骤；关键机制有固定参考数值和不变性验证。旧 `compute`、`parallel`、`dedup` 继续由原模型测试覆盖。

PDF 已提取文字并核对相关主题；另渲染检查了第 3 讲第 14 页（norm）、第 4 讲第 5 页（线性递归）、第 8 讲第 34 页（pipeline 空泡）、第 16 讲第 20 页（优势计算）的公式/示意。原始 PDF、字幕和截图仅存在本地素材目录，不进入公开静态构建。

Daniel Selsam 嘉宾讲目前只核实到官方排期，未核实可公开访问的课件/视频，因此保留待发布/待核实，不提前编造授课内容。
