# ROS 2 与 Gazebo 基础配套代码

这组原创代码配套四节中文课：`rf-ros-pubsub`、`rf-ros-tf`、`rf-ros-replay`、`rf-ros-bridge`。网页与离线脚本做确定性计算；`lbb_robotics_basics/` 则是需要真实 ROS 2 环境的软件包。两类结果分别报告。

制作日期为 2026-11-08。本制作机没有 `ros2`、`gz` 或 `/opt/ros`。离线 Python 与 JavaScript 模型已执行测试；ROS 软件包检查了 Python 语法和清单结构，尚未进行 `colcon build`、ROS/DDS 通信或 Gazebo 运行。下面的目标环境步骤应在已有 ROS 2 Jazzy + Gazebo Harmonic 的机器执行，并留下自己的日志。

## 1. 先运行不依赖 ROS 的复算

从项目根目录运行；若拿到的是下载包，先进入包含 `offline_demo.py` 的目录，并将命令改为 `python3 offline_demo.py ...`。

```bash
python3 examples/robotics-foundations/ros/offline_demo.py --self-test
python3 examples/robotics-foundations/ros/offline_demo.py queue --count 4 --depth 1 --consume-every 2
python3 examples/robotics-foundations/ros/offline_demo.py tf --yaw 0 --tx 2 --ty 1 --px 0.8
python3 examples/robotics-foundations/ros/offline_demo.py replay --duration-ms 1200 --rate 3
python3 examples/robotics-foundations/ros/offline_demo.py bridge --sim-seconds 7 --wall-seconds 1007
```

独立核对值依次为：处理序号 `[2, 4]`；world 点 `[3, 1]` 米；理想首末回放间隔 `400` 毫秒；选中的仿真时间 `7` 秒。CLI JSON 标明 `evidence_type=calculation` 和 `ros_executed=false`。

队列脚本定义了固定消费者调度与人为链路损失，不实现 DDS。TF 脚本只做二维几何和本站年龄阈值检查，不实现 tf2 缓存或插值。回放脚本不读取 bag；桥接脚本不启动通信进程。

## 2. 在已有 Jazzy 环境构建软件包

以下使用 Ubuntu 上的 Bash。安装 ROS、Gazebo 与对应桥接依赖不属于离线演示；请先按官方配套说明准备好 Jazzy、Harmonic、`colcon`、`rclpy`、`geometry_msgs`、`tf2_ros`、`ros_gz_bridge`。软件包清单中声明了运行依赖。

从包含 `examples/` 的项目根目录执行。用新的临时工作空间，保留原工作空间。

```bash
source /opt/ros/jazzy/setup.bash
LBB_ROS_EXERCISE_SOURCE="$PWD/examples/robotics-foundations/ros/lbb_robotics_basics"
LBB_ROS_WORKSPACE="$(mktemp -d /tmp/lbb-ros-jazzy.XXXXXX)"
mkdir -p "$LBB_ROS_WORKSPACE/src"
cp -R "$LBB_ROS_EXERCISE_SOURCE" "$LBB_ROS_WORKSPACE/src/"
cd "$LBB_ROS_WORKSPACE"
colcon build --packages-select lbb_robotics_basics
source install/setup.bash
printf '%s\n' "$LBB_ROS_WORKSPACE"
```

记录最后输出的实际路径。后面的每个新终端都先 `source /opt/ros/jazzy/setup.bash`，再 `source <实际工作空间路径>/install/setup.bash`。离线文件的 Python 语法检查不等于 `colcon build` 通过。

## 3. 发布、订阅与静态 TF

```bash
ros2 launch lbb_robotics_basics basics.launch.py
```

启动文件包含发布者、订阅者及两个静态变换。发布者按节点时钟每 0.2 秒发送一个 `geometry_msgs/msg/PointStamped`，共 10 条，然后取消定时器；节点保持运行，`Ctrl+C` 退出。点使用 `sensor` 参考系，x 从 0.1 米增加到 1.0 米。订阅者打印源时间戳、接收时间戳和回调计数。双方显式使用 Keep Last、depth=10、Reliable、Volatile。

在第二个终端检查：

```bash
ros2 node list
ros2 topic info /lbb/points --verbose
ros2 run tf2_ros tf2_echo world sensor
```

TF 几何约定为 world←base_link：平移 `(1,0,0)` 米、yaw=`π/2`；base_link←sensor：平移 `(0.2,0,0)` 米、同向。因此 sensor 原点位于 world `(1,0.2,0)`；sensor 中 `(1,0,0)` 米的点位于 world `(1,1.2,0)` 米。`tf2_echo` 输出变换本身，不会自动打印这个任意点的变换结果；后者用离线脚本复算。

有限发布者可能在发现完成前发出早期样本，且本例使用 Volatile，晚加入者不会自动得到旧样本。接收数量以实际日志为准。要专门做录制，先准备好订阅者和记录工具，再单独启动发布者；不要把预期 10 条写成已收到 10 条。

## 4. 记录实际回调和 rosbag2 回放

先停止之前的 launch。分别在终端启动：

```bash
ros2 run lbb_robotics_basics subscriber
```

```bash
ros2 run lbb_robotics_basics recorder --ros-args -p output:=/tmp/robotics-points-new.jsonl
```

JSONL 记录器要求显式路径并使用独占创建；如果文件已存在会拒绝覆盖。换一个新文件名即可。它记录的是该订阅者实际处理到的回调，不是所有已发布样本的权威清单，也不能代替原始 bag。

在单独的新目录运行录制工具，避免覆盖先前实验：

```bash
mkdir points-recording
cd points-recording
ros2 bag record -o points_bag /lbb/points
```

最后，在另一个终端启动有限发布者。可用较慢周期便于观察，但发现和投递仍以实际运行结果为准：

```bash
ros2 run lbb_robotics_basics publisher --ros-args -p count:=10 -p period:=1.0
```

发布结束后，`Ctrl+C` 停止 bag 录制与发布节点，保留订阅者或重新启动一个新的订阅者以便从零计数。检查录制目录后再回放：

```bash
ros2 bag info points_bag
ros2 bag play points_bag --rate 2
```

本步骤默认使用墙钟的订阅者。源消息 `header.stamp` 保持录制时的值，接收时间戳来自订阅节点当前时钟，两者不是同一个时间。若另行使用 `--clock` 做仿真时间回放，应相应设置消费者 `use_sim_time=true`，并停止其他 `/clock` 发布源；不要让 bag 与 Gazebo 同时驱动同一个时钟练习。真实 bag 录制时间与 `header.stamp` 也可能不同。

## 5. 可选的真实 Gazebo/Clock 集成

停止前面的练习，确认已安装 Jazzy/Harmonic 和对应 `ros_gz_bridge`，再运行：

```bash
ros2 launch lbb_robotics_basics simulation.launch.py
```

它启动 `foundations.sdf` 的原创静态参考盒场景、桥接器与 `use_sim_time=true` 的基础节点。此场景用来检查仿真时钟链路，不是可导航机器人、物理控制实验或真机成果。

桥接配置明确映射 `/world/foundations/clock` 的 `gz.msgs.Clock` 到 ROS `/clock` 的 `rosgraph_msgs/msg/Clock`，方向 `GZ_TO_ROS`。在目标环境分别检查两侧 topic 和使用者：

```bash
gz topic -l
gz topic -e -t /world/foundations/clock
ros2 topic info /clock --verbose
ros2 topic echo /clock
ros2 param get /lbb_point_publisher use_sim_time
```

若 GUI 不可用，可在 `simulation.launch.py` 的 `gz sim` 命令中加入 `-s`，只运行服务端；这是使用者按目标环境做的调整。若 `/clock` 没有到达，基于仿真时间的定时器可能不前进，不能以节点启动成功代替时钟有效性。

建议保存：系统与 ROS/Gazebo 版本、构建结果、两端 topic/类型/方向、节点时钟参数、消息计数、时间戳和失败日志。实际运行前不填写成功结果。

## 来源与适用范围

- [ROS 2 Jazzy Python发布订阅教程源](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Tutorials/Beginner-Client-Libraries/Writing-A-Simple-Py-Publisher-And-Subscriber.rst)：节点与 `ament_python` 包的组织方式。
- [ROS 2 Jazzy QoS概念](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Concepts/Intermediate/About-Quality-of-Service-Settings.rst)：History、Depth、Reliability 与兼容性。
- [ROS 2 Jazzy tf2入门](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Tutorials/Intermediate/Tf2/Introduction-To-Tf2.rst)：坐标树和检查工具。
- [ROS 2 Jazzy录制与回放](https://github.com/ros2/ros2_documentation/blob/jazzy/source/Tutorials/Beginner-CLI-Tools/Recording-And-Playing-Back-Data/Recording-And-Playing-Back-Data.rst)：bag record、info、play。
- [Gazebo Harmonic ROS集成](https://gazebosim.org/docs/harmonic/ros2_integration/)与[ros_gz Jazzy桥接说明](https://github.com/gazebosim/ros_gz/tree/jazzy/ros_gz_bridge)：支持类型、方向和配置格式。

代码与小场景为本站原创，遵循项目 MIT 许可；链接的第三方材料保留各自许可。没有原始教学幻灯片或转录进入这个代码包。
