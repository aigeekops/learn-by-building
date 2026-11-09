# Full Stack Deep Learning：第二批八讲选编

核对与制作日期：2026-11-08。课程身份沿用 `fsdl`。官方材料采用 **FSDL 2022公开版**；本站八讲按学习目标重新组织，不声称是原课1–8讲的完整翻译。中文讲解、六条记录等小数据、JavaScript计算、SVG、练习与Python示例均为本站原创配套。

| 本站讲次 | 原课依据与已核对的具体位置 | 本站增加的例子 |
| --- | --- | --- |
| 1 问题与指标 | [Lecture 1](https://fullstackdeeplearning.com/course/2022/lecture-1-course-vision-and-when-to-use-ml/)：When to Use ML、Feasibility Assessment、Lifecycle | 六条分数逐条进入混淆矩阵，阈值与错误代价对比 |
| 2 数据与版本 | [Lecture 4](https://fullstackdeeplearning.com/course/2022/lecture-4-data-management/)：Data Processing、Datasets、Data Versioning；[Lecture 3](https://fullstackdeeplearning.com/course/2022/lecture-3-troubleshooting-and-testing/)：Expectation Testing on Data | 三个实体的划分、预处理中心与独立泄漏检查 |
| 3 实验管理 | [Lab 4](https://fullstackdeeplearning.com/course/2022/lab-4-experiment-management/)：00:00实验管理、16:27制品版本、25:00超参数sweeps | 两个学习率的真实标量更新与验证版本不一致时拒绝选优 |
| 4 训练调试 | [Lecture 3](https://fullstackdeeplearning.com/course/2022/lecture-3-troubleshooting-and-testing/)：Troubleshooting Models；Make It Run/Fast/Right | 平均与求和归约反例、独立中心差分、一次更新前后结果 |
| 5 测试与质量 | [Lecture 3](https://fullstackdeeplearning.com/course/2022/lecture-3-troubleshooting-and-testing/)：Testing Software、Testing ML Systems | x≥0规格与x>0缺陷，数据、制品和独立边界门禁 |
| 6 部署与服务 | [Lecture 5](https://fullstackdeeplearning.com/course/2022/lecture-5-deployment/)：Batch Prediction、Model-as-Service、Concurrency、Batching | 六条请求的排队甘特图、尾批、并行槽、延迟和有限窗口吞吐 |
| 7 监控与漂移 | [Lecture 6](https://fullstackdeeplearning.com/course/2022/lecture-6-continual-learning/)：What Metrics to Monitor、Distribution Drift；[Lab 8](https://fullstackdeeplearning.com/course/2022/lab-8-model-monitoring/)：00:00反馈、14:23分布与筛选 | 两箱总变差与延迟标签下未知的真实错误率 |
| 8 更新与回滚 | [Lecture 5](https://fullstackdeeplearning.com/course/2022/lecture-5-deployment/)：Model Rollouts；[Lecture 6](https://fullstackdeeplearning.com/course/2022/lecture-6-continual-learning/)：Offline/Online Testing | 明确阈值的离线门禁、金丝雀、阻断、晋升与回滚状态 |

官方[课程目录](https://fullstackdeeplearning.com/course/2022/)已核对：2022材料包含Lecture 1–9与相关Labs。所列网页正文、章节目录与发布时间已读取；未声称逐分钟观看完整视频、下载全部幻灯片或复现原课Text Recognizer全环境。

原课中W&B、Gantry、Gradio、云平台和框架接口保留2022历史说明。本次不把它们的旧安装和API步骤写成最新指南；本地例子只用Python 3标准库，未安装第三方服务依赖、未调用外部模型、未真实部署服务。Foundation Models、ML Teams、Ethics等完整原讲保留为后续选读，不能把八讲小例子当作整门原课已完成。

## 教学与动画的关系

每讲先给具体问题、先修、观察点和预测，再逐步核对结果。SVG只表现与本讲因果或计算直接有关的信息：混淆矩阵计数、分组边界、实际实验参数点、梯度与拟合线、请求时间轴、分布面积、流量比例。静态步骤保持对应结果，不包含随机动画、入场编排或自行运行的计时器。

场景仅累积读取当前及之前的变量快照，不读取 `trace.result` 或未来步骤。尚未划分的数据不会提前放进训练/验证框；尚未得到标签的实际错误率保持未知；未进入金丝雀的候选没有观测结果。`data-fid-motion`仅供共享播放器强调当前计算步骤，不构成真实请求或服务活动的证据。

## 验证与运行

在项目目录执行：

```sh
node --test tests/application_fsdl.test.cjs
python3 examples/application-fsdl/metrics.py
python3 examples/application-fsdl/data.py
python3 examples/application-fsdl/experiments.py
python3 examples/application-fsdl/debugging.py
python3 examples/application-fsdl/testing.py
python3 examples/application-fsdl/serving.py
python3 examples/application-fsdl/monitoring.py
python3 examples/application-fsdl/release.py
```

12项测试通过，包含所有控件的全部取值、有限快照、独立闭式训练解、梯度差分、数据泄漏、无正预测时的精确率未知、批4的真实尾批2条、延迟标签、门禁边界及回滚路径。场景还以“投毒未来步骤/最终结果”的方式验证当前画面不提前使用未来信息。

8段页面展示的完整Python代码与 `examples/application-fsdl/*.py` 一致，均已真实运行。分别使用Python标准库的集合、统计、SHA-256、堆调度、Fraction与临时文件，独立复算JavaScript默认结果。SVG已逐步执行字符串结构与有限数值检查；浏览器布局和共同地图接入由主任务完成。

本地摘要只核对字节，不能证明数据和标签正确；小数据下的分数、毫秒与告警均是教学计算。未声称完成真实GPU训练、生产压测、云发布或长期线上质量验证。
