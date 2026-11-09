# 机器人学习路线后续课程讨论稿

编排及归档日期：2026-11-08。共同基础首批已按后续指令制作：机械、运动学、PID、状态估计、ROS 2 与 Gazebo，共16节原创配套课，见[首批课件说明](robotics-foundations.md)。其余课程选择与分支单元安排保留为讨论稿。

恢复入口：[后续课程规划存档](course-expansion-archive.md)。

机器人路线以能观察、解释和复现的完整系统为目标。共同基础覆盖编程、电子与执行器、机械设计、坐标与运动学、反馈控制、状态估计和软件集成，然后分别进入自主导航与抓取操作，后续再连接机器人学习。

现有六阶段课程、开源项目、任务和学习记录继续沿用；能力地图补充知识点之间的先修关系。数学按任务穿插：使用 TF 和定位前补坐标变换，调电机前补误差与反馈，做机械臂运动前补运动学。

## 共同基础和作品

| 能力段 | 要学的内容 | 可以检查的产出 |
| --- | --- | --- |
| 编程与实验方法 | Python、Linux、Git、单位、时间戳、记录和复现；C++ 按后续任务引入。 | 能重新运行一个采样与绘图程序，并解释数据单位与时间。 |
| 电子与执行器 | GPIO、输入输出、传感器、电机、编码器与驱动的基本关系。 | 分别保存计算、在线仿真和实际测量结果，说明条件与差异。 |
| 机械与 CAD | 草图、装配、传动、减速比、扭矩、安装尺寸与制造约束。 | 一份可修改的支架或小机构设计，以及尺寸和选择依据。 |
| 坐标与运动学 | 平移旋转、坐标变换、差速运动、关节与末端位置。 | 用小车或两连杆机械臂模型复算一次运动，并核对坐标与单位。 |
| 控制与状态估计 | 目标、误差、反馈、PID、饱和、噪声与基础滤波。 | 改变目标、控制参数和噪声，比较响应，并解释假设与限制。 |
| ROS 2 与系统集成 | 节点、话题、服务、Action、TF、URDF、日志和仿真。 | 一套可重启、可回放、能定位模块问题的机器人软件示例。 |

learn-esp32 继续承担嵌入式在线仿真练习。真机实践单列测量、标定、执行器控制和系统联调的产出。浏览器动画与仿真结果按其实际证据类型记录。

## 后续课程和材料候选

课程与官方教程分别注明用途。已有引用优先深化，新增课程按能力缺口引入。

| 位置 | 课程或材料 | 引入重点与状态 |
| --- | --- | --- |
| 电子与嵌入式 | [Paul McWhorter Arduino Lessons](https://toptechboy.com/arduino-lessons/) | 现有路线已引用。补连续的输入输出、PWM、测量和实物练习；原课示例使用 Arduino Uno R3，本站练习按实际选定板卡重新核对。 |
| 机械设计 | [MIT 2.007 Design and Manufacturing I](https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/) | 新增选读。选机构、电机、齿轮、CAD 与设计迭代；使用 2009 公开版的设计原理，器材与软件另作适配。 |
| 机器人原理主干 | [Modern Robotics 作者配套视频](https://modernrobotics.northwestern.edu/nu-gm-book-resource/) | 现有路线已引用。展开坐标、运动学、Jacobian、轨迹、动力学与控制，按任务安排阅读。 |
| 控制入门 | [Understanding PID Control](https://www.mathworks.com/videos/series/understanding-pid-control.html) | 现有路线已引用。补反馈、调参、饱和与噪声；本站计算练习可用 Python 实现。 |
| 传感器与估计 | [Kalman and Bayesian Filters in Python](https://rlabbe.github.io/Kalman-and-Bayesian-Filters-in-Python/) | 现有路线已引用。先做一维估计和噪声实验，再连接定位与多传感器问题。 |
| 机器人软件共同基础 | [ROS 2 Jazzy 官方教程](https://docs.ros.org/en/jazzy/Tutorials.html) 与 [Gazebo 配套说明](https://gazebosim.org/docs/harmonic/ros_installation/) | 将已有教程编成本站项目实验。现有路线采用 Jazzy 与 Harmonic；新增材料沿用这一配套，升级作为独立决策。 |
| 移动机器人原理 | [Bonn Mobile Robotics 在线课程](https://www.ipb.uni-bonn.de/online-training-robotics/index.html) | 新增候选。使用公开的 2020 在线讲座与练习，补概率定位、滤波、建图和路径规划。 |
| 移动机器人工程 | [Nav2 官方文档](https://docs.nav2.org/) | 新增实践材料。把地图、定位、规划、控制和行为树接成导航任务；制作时匹配选定 ROS 2 版本。 |
| 机械臂与操作原理 | [MIT Robotic Manipulation](https://manipulation.mit.edu/) | 新增候选。补感知、抓取、规划和控制，优先小规模 Drake 示例；公开笔记正在随课程更新。 |
| 机械臂工程 | [MoveIt 2 官方教程](https://moveit.picknik.ai/main/doc/tutorials/tutorials.html) | 新增实践材料。补机器人模型、碰撞、规划与执行；当前链接为 Rolling 文档，制作时选择与运行环境一致的版本。 |
| 机器人数据与模仿学习 | [Hugging Face Robotics Course](https://huggingface.co/learn/robotics-course/unit0/1) 与 [LeRobot 文档](https://huggingface.co/docs/lerobot/) | 现有路线已引用。先用已公开材料与小数据实践。课程页面的强化学习、模仿学习和基础模型章节目前仍标 Coming Soon，不能据此安排为现成完整课。 |
| 机器人学习进阶 | [Stanford CS224R](https://cs224r.stanford.edu/) | 新增候选。补模仿学习、深度强化学习、模型学习与离线数据方法。先具备机器学习、深度学习与 PyTorch 基础；强化学习概念可与 AI 路线共享。 |
| 运动控制进阶 | [MIT Underactuated Robotics](https://underactuated.mit.edu/) | 后期选修。用于非线性动力学、轨迹优化与运动控制的深入学习，按具体项目需要进入。 |

ROS 2 教程另有[官方 Jazzy 源文件入口](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Tutorials.rst)。Gazebo 官方配套表仍列 Jazzy 与 Harmonic 为匹配组合。Nav2、MoveIt 和 LeRobot 在本路线中按工程教程与工具材料编排。

## 移动机器人分支

建议顺序：差速运动与里程计 → 传感器与坐标标定 → 状态估计与定位 → 地图与 SLAM → 全局路径和局部控制 → Nav2 集成 → 真机结果复现。

主作品是一辆能在给定地图或建图环境中完成导航任务的小车。每次练习记录输入条件、路径、轨迹、误差和失败案例。仿真与真机分别报告，增加真实测量后再讨论模型与实际行为的差异。

参考主线以 Bonn 课程的定位与建图原理、ROS 2 的模块组织和 Nav2 的工程实践组成。视觉感知按需要连接 OpenCV 与 AI 路线中的 CS231n。

## 机械臂分支

建议顺序：关节与末端坐标 → 正运动学与逆运动学 → Jacobian、可达范围与奇异位形 → 轨迹与关节限制 → 碰撞与路径规划 → 相机和机械臂坐标标定 → 抓取与放置 → 真机结果复现。

主作品是一个能在限定条件下重复抓取和放置物体的流程。原理以 Modern Robotics 和 MIT Robotic Manipulation 为参考，ROS 2 工程实践按需要接入 MoveIt 2。Drake 示例与 MoveIt 工程分别说明环境与用途。

## 与 AI 路线的衔接

- Python、Git、线性代数、概率和深度学习沿用共同课程，避免重复制作基础内容。
- 图像几何、相机标定和视觉模型分别安排；按感知任务连接 OpenCV 与 CS231n。
- 强化学习基础可回补 AI 路线的 CS234，已有基础者按自检直接进入 CS224R。两门官方课程互为补充，不构成强制先修链。
- 机器人学习先做数据检查、行为克隆和评测，再按任务进入强化学习、视觉动作策略或视觉语言动作模型。
- CME 295 提供大模型与 Agent 的概念；CS336 在需要理解或修改模型训练时深入；CS146S 的规格、测试与开发流程用于机器人软件和实验工程。

AI 交叉阶段的产出包含可检查的数据、训练配置、独立评测条件与失败分析。语言模型规划的文字结果与机器人实际执行结果分别记录。

## 动画和动手练习

以一辆差速小车和一个两连杆平面机械臂作为贯穿的小例子，逐步增加感知、控制与规划内容。

| 知识点 | 可以操作的演示 | 练习产出 |
| --- | --- | --- |
| 传动与执行器 | 改减速比、负载和控制命令，观察模型中的速度与扭矩变化。 | 解释单位、假设与实测差异。 |
| 坐标与运动学 | 拖动目标或关节，显示坐标变换、车轮运动和末端轨迹。 | 用代码复算位置，解释不可达和奇异位形。 |
| PID 与噪声 | 单步查看误差、控制量和系统响应，改变噪声与饱和条件。 | 比较两组参数并说明适用条件。 |
| 滤波与定位 | 同步显示观测、预测、不确定性与更新结果。 | 修改噪声假设，核对估计结果。 |
| 规划与碰撞 | 展示搜索节点、候选轨迹、障碍和碰撞检查。 | 换环境，解释成功与失败。 |
| 机器人学习 | 展示数据中的观测和动作、训练与评测流程、策略输出。 | 在独立条件下比较基线与新方法，留下可复现记录。 |

每讲沿用问题、通俗讲解、逐步动画、代码运行、动手练习和独立验证的结构。动画由实际计算或明确标注的执行轨迹驱动；真实设备结果来自对应实验记录。

## 后续补充顺序

1. 优先深化共同基础：机械与 CAD、Modern Robotics 的基础章节、PID、状态估计和 ROS 2 项目实验。
2. 再分两条作品线：Bonn 与 Nav2 的自主导航，MIT Manipulation 与 MoveIt 的抓取操作。
3. 之后引入 LeRobot 数据与模仿学习、CS224R 等机器人学习内容；Underactuated Robotics 按运动控制项目选读。

机器人本轮只确定路线和候选。新增制作与 AI 后续课程一起排期，保持 CME 295、CS336、CS146S 三个现有专题的优先级。
