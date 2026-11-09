# 动手学深度学习基础选读：来源与计算验证

2026-11-09更新：已扩展为16讲，新增卷积/CNN、RNN/GRU、动量/Adam与数据并行/DDP。16讲PyTorch片段均已在PyTorch 2.9.1 CPU实跑；CNN、GRU训练和双进程Gloo另有实际回执。CUDA多GPU未执行。详见[进阶补充与验证](course-expansion-2026-11-09.md)。下文首批范围为11月8日的历史记录。

核对日：2026-11-08。材料为《动手学深度学习》中文版当前公开版，页面标识为 2.0.0 documentation；采用 PyTorch 路径。本站首批八讲按学习先后重新选编，不称为“2026 年度官方课程”，也不表示完整翻译或覆盖全书。

## 制作范围与定位

| 本站讲次 | 官方公开材料 | 本站原创演示 |
| --- | --- | --- |
| 1 张量形状与广播 | [2.1 数据操作](https://zh.d2l.ai/chapter_preliminaries/ndarray.html)，特别是 2.1.3 广播机制 | 可调矩阵形状、行向量加法、不兼容形状的明确拒绝 |
| 2 矩阵、点积与概率 | [2.3 线性代数](https://zh.d2l.ai/chapter_preliminaries/linear-algebra.html)及[2.6 概率](https://zh.d2l.ai/chapter_preliminaries/probability.html) | 两样本矩阵向量积、非负权重归一化、离散期望 |
| 3 自动微分 | [2.5 自动微分](https://zh.d2l.ai/chapter_preliminaries/autograd.html)，反向传播与梯度累加、清零 | 标量仿射模型、半平方误差与链式法则 |
| 4 回归训练循环 | [3.2 线性回归的从零开始实现](https://zh.d2l.ai/chapter_linear-networks/linear-regression-scratch.html)，模型、损失、SGD、梯度清零 | 固定两条数据的全批量平均梯度更新与逐轮损失 |
| 5 分类与交叉熵 | [3.4 softmax 回归](https://zh.d2l.ai/chapter_linear-networks/softmax-regression.html)及[3.6 从零实现](https://zh.d2l.ai/chapter_linear-networks/softmax-regression-scratch.html) | 三分类稳定 softmax、交叉熵、对 logit 的梯度与平移不变性 |
| 6 MLP 与反传 | [4.1 多层感知机](https://zh.d2l.ai/chapter_multilayer-perceptrons/mlp.html)，隐藏层、非线性、ReLU | 单隐藏单元的前后向、关闭分支、ReLU 零点约定 |
| 7 训练与验证 | [4.4 模型选择、欠拟合和过拟合](https://zh.d2l.ai/chapter_multilayer-perceptrons/underfit-overfit.html) | 最小二乘直线与查表模型；独立验证与故意重复训练点的泄漏对照 |
| 8 注意力衔接 | [10.3 注意力评分函数](https://zh.d2l.ai/chapter_attention-mechanisms/attention-scoring-functions.html)，特别是 10.3.3；[10.7 Transformer](https://zh.d2l.ai/chapter_attention-mechanisms/transformer.html)作为继续阅读 | 给定 Q/K/V 的单查询缩放点积注意力、严格屏蔽与 Value 汇总 |

上述章节入口已使用网页读取核对。广播机制、backward / 梯度清零、SGD、ReLU 零点约定与缩放点积注意力进一步定位到对应正文段落。每讲来源、定位、状态和核对日期写入 `config/foundation_d2l.json`；公开页面只引用材料入口，未复制整份教材、Notebook 或课件。

## 教学结构

八讲各自包含问题、先修说明、至少三段中文讲解、三节知识展开、完整最小算例、误区、预测与操作练习、数值检查题及独立迁移任务。每讲有一个独立计算模型，默认分别产生 6、6、6、14、6、7、7、7 个步骤；步骤数随训练更新次数改变。每步显示对应核心代码行、中间变量和 flow / bars / segments 数值画面，支持统一播放器的前后单步、播放与暂停。

各讲还各有一份可保存运行的 PyTorch 示例。它们使用 CPU、固定数值与 float64（需要数值对照时），无模型权重、远端数据或 GPU 要求。运行这些片段需要用户自己的 Python 环境已安装可用的 `torch`；网页不安装依赖、不执行 Python。示例中的张量形状、目标 dtype、梯度更新和清零条件均显式给出。

## 验证结果与界限

运行：`node --test tests/foundation_d2l.test.cjs`。11 项测试全部通过，覆盖八模型全部控件选项与范围取值、有限数值、形状错误、概率归一化、解析梯度与独立中心差分、训练更新前后的同一状态、softmax 平移不变性、ReLU 零点、验证泄漏和遮罩不变性。

16 段 Python 示例均通过语法解析，其中 8 段不依赖 torch 的示例在 Python 实际执行；另外运行了标准库的张量加法、标量梯度与三轮回归更新独立核算。2026-11-08首次制作环境未安装 `torch`，当时8段PyTorch示例尚未在该环境实跑，因此不把语法检查写成 PyTorch 运行通过，也没有真实 PyTorch 训练日志。

浏览器模型为有界 JavaScript 数值计算，未实现完整张量库、自动微分引擎或 Transformer。回归训练确实更新本例参数，但不是完整教材实验；查表模型的“未知输入返回 0”是特意规定的反例；最终测试集未在此构造或报告。页面播放、答题与数值检查不生成学习分钟、课程完成或掌握证明。

公开构建仅需要原创配置和 `web/foundation-d2l.js`；教材原文、第三方代码与 PyTorch 自身保留各自许可和权利。
