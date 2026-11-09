# 第二批：数学与机器学习

2026-11-09。按地图中的实际课件与前置练习核对，开始时26门课程中13门已有配套课件，10门完全未整理，3门只有旧前置练习。本批选择会影响后续AI与机器人学习的三个上游缺口：`linear`、`probability`、`cs229`，各制作6讲，共18讲。

## 课程范围

| 地图课程 | 本批六讲 | 官方版本 |
| --- | --- | --- |
| MIT 18.06 | 列向量、消元与秩、变换复合、投影、最小二乘、特征方向 | [2010公开版课程表](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/calendar/) |
| MIT 18.05 | 二项分布、贝叶斯、期望方差、极大似然、置信区间、精确检验 | [2022公开版阅读材料](https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/pages/classes-reading-and-in-class-materials/) |
| CS229 | 梯度回归、逻辑回归、L2正则、验证选择、K-means、PCA | [Stanford SEE历史公开版](https://see.stanford.edu/Course/CS229)及Notes 1、5、7a、10 |

每讲有问题、先修、中文讲解、知识展开、算例、误区、可调计算、对应代码与变量、可运行Python例程、预测和修改条件的练习、数值检查与迁移验证。公开资料只用于核对版本和知识点；讲解、例子和代码独立创作。六讲选编不代表完整覆盖原课。各课程的未整理主题在课程目录中保留；MIT原课先修与本站入门选编的先修分别说明，不把历史版标成2026年度课。

图示来自当前计算快照，禁止提前显示未来答案。坐标、投影、残差和区间使用静态几何；梯度、矩阵幂、K-means使用真实离散更新。默认暂停，读者主动单步或连续查看，不添加循环装饰动画。浏览器运行有限JavaScript模型，完整Python复现使用标准库。

## 地图与网站

保留既有课程、节点、个人路线、存储键和历史讲次身份。新课复用共享阅读器，地图总览、完整课程图、搜索、节点详情与首课入口读取同一目录。新个人计划使用18个稳定讲次ID和编排估时，不修改已有计划与记录。

本批三门接入时，地图从13门增加到16门有独立课件，当时另有7门完全待整理、3门仅前置练习。随后其他分支的配套选编也接入了共享源码；最终验收版本为26门、220讲，完全空白课程与仅前置练习课程均为0。各门仍有未覆盖的专题和待更新讲次，配套选编不代表完成官方整门课程。当前总数以构建的`build-info.json`和逐课程审计回执为准。

此前的7门完全空白课程为CS234、Bonn Mobile Robotics、MIT Robotic Manipulation、Nav2、MoveIt 2、CS224R、Underactuated Robotics；此前仅有前置练习的3门为CS231n、Arduino Lessons、HF Robotics / LeRobot。最终版本这10门各有8讲配套选编，原有练习仍保留。此处保留前后状态，避免把最初的剩余清单当作当前进度。

## 源码与验证

- 课程：`config/foundation_linear.json`、`foundation_probability.json`、`foundation_cs229.json`。
- 计算与图示：`web/foundation-math.js`、`foundation-math-scenes.js`。
- 18个标准库例程：`examples/foundation-math/`，与讲义中的完整代码保持一致。
- 接入：`scripts/integrate_foundation_draft.py`；共享地图状态：`web/course-map-status.js`。
- 数值及边界：`node --test tests/foundation_math.test.cjs`。
- 网站与离线浏览器检查：`qa/foundation_math_batch2.cjs`，使用独立临时浏览器，不读取个人浏览器数据。

模型检查覆盖控制参数边界、方程三种解型、零方向拒绝、概率归一化、无误报边界、精确双尾、独立有限差分、学习率发散、正则化驻点、验证隔离、空簇和PCA平移不变。运行记录与截图保存在交付目录的`qa/`；全量测试与最终交付回读结果另存回执，未经完成的检查不记为通过。
