# 六门课程进阶补充与完整实验

2026-11-09，本轮在现有课程上新增28讲，保留全部原有课程与讲次ID。每讲包含原创中文解释、当前计算对应的图示与代码、动手练习、换条件数值题和一手材料定位。静态计算保持手动步骤；控制、估计和轨迹的播放只回放真实计算的状态。

| 课程 | 原有 | 新增 | 当前 | 新增范围 |
|---|---:|---:|---:|---|
| 动手学深度学习 | 8 | 8 | 16 | 卷积、CNN与汇聚、RNN、GRU、动量、Adam、数据并行、DDP |
| FSDL | 8 | 5 | 13 | Foundation Models、ML Teams、Ethics、完整本地项目的训练与服务 |
| MIT 2.007配套 | 3 | 3 | 6 | 悬臂支架强度/刚度、制造基准、双驱小车设计文件项目 |
| Modern Robotics配套 | 3 | 4 | 7 | SO(3)、SE(3)坐标链、两杆动力学、关节时间轨迹 |
| PID配套 | 3 | 3 | 6 | 微分滤波、指标化调参、两种采样周期的串级控制 |
| Kalman配套 | 3 | 5 | 8 | 位置/速度联合状态、交叉协方差、二维跟踪、EKF测距、UKF无迹变换组件 |

课程地图、课程目录与新个人路线使用同一批目录；历史计划、完成回执、学习时长和浏览器草稿不重写。整站还可能包含其他批次的新课，实际总数由构建的`build-info.json`给出。

## 已实际运行

验证环境：Python 3.12.15、PyTorch 2.9.1、CPU。依赖仅用于可选的本地实验，网站运行仍使用原有标准库和原生前端。

- 16讲页面中的PyTorch片段实际运行，原有张量、梯度、分类、训练和注意力例子也已核对。CNN与GRU分别完成真实反向传播和参数更新。
- 小CNN对按生成组切分的合成横/竖条纹训练70轮；验证/测试各24张，准确率均为1.0。结论仅限这个人工任务，不能外推到真实图像。
- GRU对人工正弦序列训练130轮，时序留出窗口与训练窗口间有间隔，19个测试窗口MSE约0.00010557。不是现实时间序列预测效果。
- 真实启动2个CPU Gloo/DDP进程，训练4步；两rank与单进程全局批次的权重均为`[0.75,1.21875,1.51171875,1.69482421875]`，最大差为0。
- FSDL标准库项目实际生成80张合成图像，按组划分、训练和保存制品，启动临时本地HTTP服务，验证预测、无效输入、坏模型哈希拒绝以及回滚后的版本与响应恢复。
- 15个新增机器人模型有独立Python复算；设计项目生成毫米DXF、SVG、BOM、计算书与空白实测验收表。

本机没有CUDA GPU，未执行真实多GPU或多机性能实验。CPU DDP验证同步与数值等价；CUDA脚本路径需要至少2张可用CUDA GPU。机械文件生成不等于加工或实物验收，UKF一讲只实现无迹变换组件，不冒充完整UKF跟踪器。

## 复现

在项目根目录运行；FSDL与机械项目只需要Python标准库：

```bash
python3 examples/application-fsdl/full_project.py --output /tmp/lbb-fsdl-project
python3 examples/robotics-foundations/mechanics/make_project.py --output /tmp/lbb-mechanical-project
```

准备可用的PyTorch环境后：

```bash
python examples/foundation-d2l/validate.py --output /tmp/lbb-pytorch-validation
python examples/foundation-d2l/train.py --output /tmp/lbb-d2l-training
python examples/foundation-d2l/distributed_train.py --output /tmp/lbb-ddp
# 仅在至少2张CUDA GPU可用的环境执行：
python examples/foundation-d2l/distributed_train.py --device cuda --output /tmp/lbb-ddp-cuda
```

CNN/RNN/DDP与FSDL项目课的“运行与验证”区域提供完整单文件程序下载，下载内容由构建时明确允许的原创文件嵌入，离线版同样可用。机器人代码页保留可执行JavaScript模型与Python复算下载，完整代码包包含设计文件生成器。

## 来源与计算范围

- D2L采用中文版2.0.0公开教材的6.2、6.5、8.4、9.1、11.6、11.10、12.5等章节，以及PyTorch官方DDP文档。动量公式明确使用PyTorch SGD未归一化速度约定；GRU使用D2L更新门保留约定。
- FSDL采用2022年的Lecture 7、8、9和Lab Overview。完整实验是本站合成图像分类项目，未宣称复现原Text Recognizer、云服务或全套Labs。Foundation Models的浏览器例子使用人工小矩阵，不下载真实预训练模型。
- MIT 2.007参考Spring 2009设计制造材料。悬臂梁、极限公差与电机假设逐项注明；图纸不承担加工合格证明。
- Modern Robotics定位到3.2.1、3.3.1、8.1.3和9.1–9.2。旋转使用列向量、固定世界轴主动旋转；动力学公开均匀杆与角度参考。
- PID参考MathWorks Understanding PID Control的微分滤波、调参与串级/离散系统主题。直接下载受403限制时，按已读取的官网正文与系列说明核对；没有虚构下载回执。
- Kalman参考原作者第6、8、10、11章Notebook。已读取原文，分别检查多维预测、非线性创新/Jacobian和两套sigma点权重。

原始网页、教材和Notebook保存在项目外研究目录；公开网站仅打包原创教学、代码与来源元数据。

## 开发与交付检查

`tests/course_expansion_20261109.test.cjs`检查输出形状、梯度缩放反例、强度/刚度分离、SO(3)/SE(3)不变量、动力学还原、轨迹端点/峰值、控制限幅、多维协方差和非线性矩。所有新机器人模型下载后仍可独立执行。

`qa/course_expansion_20261109.cjs`从地图进入新增课，检查1440/390宽度、拆分资源/离线两版的全部28讲、教学面板、当前代码变量、默认暂停、工作区溢出、程序下载与学习记录不被自动创建。结果、截图和实际实验回执保存在本轮交付目录。

构建与统一交付继续使用：

```bash
python3 scripts/build_static.py
python3 scripts/refresh_learning_delivery.py --repository-source --output <新的交付暂存目录>
# 审阅暂存产物后再发布同一份：
python3 scripts/refresh_learning_delivery.py --publish --output <同一个交付暂存目录>
```
