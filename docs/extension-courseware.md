# 十门独立课程配套

2026-11-09，为此前七门待整理课程和三门仅有前置练习的课程新增独立课件。每门八讲，共80讲；它们是本站原创中文主题选编，**不代表完整翻译或覆盖原始大学课程**。每课的版本、已覆盖主题和未制作范围保存在自己的课程说明中。

| 课程 | 独立课件顺序 | 原始材料版本 |
| --- | --- | --- |
| CS234 | MDP与回报、Bellman、价值迭代、MC/TD、SARSA/Q-learning、探索、价值近似、策略梯度 | Stanford Winter 2026 |
| Bonn Mobile Robotics | 差速运动、观测、Bayes、EKF、粒子定位、占用栅格、位姿图、A* | Bonn 2020在线课程 |
| MIT Robotic Manipulation | 坐标、IK、几何感知、摩擦抓取、路径、轨迹、控制、任务状态 | 在线工作讲义，核对日快照 |
| Nav2 | 生命周期、TF/时钟、地图定位、costmap、规划、跟踪、行为树、任务验收 | Jazzy文档；目标Gazebo Harmonic |
| MoveIt 2 | 模型语义、关节限制、IK、场景碰撞、采样边验证、笛卡尔路径、时间参数化、执行回执 | 目标Jazzy；main/Rolling文档只作明确标注的概念参考 |
| CS224R | BC、DAgger分布偏移、GAE、PPO、最大熵、模型误差、离线支持、目标重标记 | Stanford Spring 2026公开目录 |
| Underactuated Robotics | 欠驱动秩、摆与相图、线性化、LQR、Lyapunov、能量整形、离散缺陷、MPC | 在线讲义首页标注Spring 2024，未改称2026年度课 |
| CS231n | 线性分类、softmax、反传、卷积、残差、注意力、检测、迁移评价 | Stanford Spring 2025；未取得注册学生受限视频 |
| Arduino Lessons | LED、数字输入、ADC、PWM、非阻塞计时、消抖、执行器、故障停止项目 | Paul McWhorter NEW系列，Uno R3 |
| HF Robotics / LeRobot | 契约、时序、episode划分、标准化、BC、动作块、执行接口、独立评测 | HF已公开Unit 0与LeRobot当前文档分别标注 |

每讲包含问题、产出、三段讲解、公式、算例、误区、逐步计算、对应代码和变量、可运行Node例程、数值检查、独立任务和官方材料定位。80个模型默认共320个步骤；没有模型调用、网络计算或硬件操作。几何路径和矩阵由当前计算快照绘制，没有循环装饰动画。

Arduino另提供八份原创`.ino`，Nav2和MoveIt另提供16份目标环境实验说明。ROS状态与日志、MoveIt模拟执行、AVR目标编译、真实LeRobot训练及机器人运行都需要在对应环境独立完成；离线算例通过不能替代这些结果。Uno R3与ESP32的电压、ADC、PWM和接口需分别核对。

## 入口与原有内容

完整学习版沿用原来的十个地图ID。可用`?extension=cs234`等查询参数打开目录，加`&lesson=cs234-bellman`进入单讲，或加`&inspect=1`进入暂停的步骤页。新的`#learn/`位置支持后退、前进和刷新。课程目录、总览分组、完整地图、首课入口和新个人路线使用同一份讲次。

CS231n、Arduino、LeRobot的原有前置练习保留在目录下方的折叠入口；旧练习有独立的legacy地址，刷新仍回到原内容。没有改写已采用的个人路线、历史任务、完成证据、学习时间或回执。新讲预计分钟是编排估计，不是原课官方课时或实测用时。

步骤页的代码标题旁可下载带当前参数的完整`.cjs`例程。讲解中另列默认参数代码；两者都使用相同纯计算函数。阅读、播放、改参数和数值检查不会自动采用路线、完成任务或增加分钟。

## 维护与验证

内容源是`scripts/author_extension_courses.cjs`及`scripts/course-authoring/`；模型源为`web/extension-course-models.js`。运行作者脚本生成`config/extension_*.json`、80份Node例程和八份Arduino Sketch。页面集成由`scripts/integrate_extension_draft.py`完成，不读取个人数据库。

```sh
node scripts/author_extension_courses.cjs
node scripts/run_extension_demo.cjs --list
node scripts/run_extension_demo.cjs cs234-td '{"terminal":"yes"}'
node examples/extension-courses/bonn-slam.cjs
node --test tests/extension_courses.test.cjs
python3 -m unittest discover -s tests -p 'test_extension_integration.py' -v
python3 qa/extension_arduino_syntax.py
python3 scripts/build_learning_app.py
```

算例测试包含80项解析数值、参数组合、独立差分、终止掩码、不可达IK、整段碰撞、部分轨迹、负优势PPO、静止摆起盲点、浮空输入、millis回绕和时间配对。独立例程实际执行后与页面实现核对。桌面C++检查只检查语法，使用声明级Arduino/Servo接口，不是AVR编译或实物测试。

浏览器脚本`qa/extension_courses.cjs`使用隔离上下文检查1440/390宽度、单文件离线/本地HTTP入口、全部80讲四面板、逐步代码、高亮、改参、草稿、下载、旧练习刷新及无外部运行请求。检查结果与截图保存在交付目录，不能当用户学习记录。

正式交付仍经统一脚本：先用`refresh_learning_delivery.py --repository-source --output <stage>`构建，检查后对同一stage执行`--publish`。脚本保存旧文件备份、核对并发哈希并回读三个既有交付入口。

## 官方材料

- [CS234 2026](https://web.stanford.edu/class/cs234/modules.html)、[Bonn 2020](https://www.ipb.uni-bonn.de/online-training-robotics/index.html)、[MIT Manipulation](https://manipulation.mit.edu/)
- [Nav2 Jazzy](https://docs.nav2.org/jazzy/)、[MoveIt main/Rolling](https://moveit.picknik.ai/main/doc/tutorials/tutorials.html)、[MoveIt RViz Quickstart](https://moveit.picknik.ai/main/doc/tutorials/quickstart_in_rviz/quickstart_in_rviz_tutorial.html)
- [CS224R](https://cs224r.stanford.edu/)、[Underactuated Robotics](https://underactuated.mit.edu/)、[CS231n 2025](https://cs231n.stanford.edu/2025/)
- [Arduino Lessons](https://toptechboy.com/arduino-lessons/)、[HF Robotics Unit 0](https://huggingface.co/learn/robotics-course/unit0/1)、[LeRobot Dataset v3](https://huggingface.co/docs/lerobot/lerobot-dataset-v3)、[LeRobot模仿学习](https://huggingface.co/docs/lerobot/il_robots)、[ACT](https://huggingface.co/docs/lerobot/act)

来源核对日为2026-11-09。逐讲定位与公开状态保存在课程JSON；原始视频、幻灯片及书稿不随构建分发，第三方权利独立于本站原创代码。
