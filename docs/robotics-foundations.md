# 机器人共同基础首批课件

2026-11-09更新：机械6讲、运动学/动力学7讲、PID6讲、Kalman8讲、ROS4讲，共31讲。新增内容、设计文件与验证见[六门课进阶补充](course-expansion-2026-11-09.md)。以下首批16节说明为11月8日记录。

制作日期：2026-11-08。本轮由三个 agent 并行制作五个专题，主 agent 统一课件结构、播放器、下载代码、地图入口和验证。以下是本站原创中文配套教学，按原始资料的知识点选编，共 16 节；不代表五套原始课程已经逐讲制作完成。

| 专题 | 本轮课程 | 地图课程 ID |
| --- | --- | --- |
| 机械设计与传动 | 齿轮减速比、负载与电机扭矩、孔轴配合与制造约束 | `mit2007` |
| 坐标与运动学 | 二维坐标变换、两连杆正运动学、逆运动学与可达边界 | `modern` |
| 反馈控制 | P 闭环、离散 PID 算术、输出限幅与条件积分 | `pid` |
| 状态估计 | 测量噪声与偏差、一维 Kalman 更新、假设失配与创新门限 | `kalman` |
| ROS 2 与 Gazebo | 发布订阅、坐标与时间、记录回放、桥接与仿真时钟 | `ros` |

每节课提供中文解释、先修自检与产出、至少四个计算步骤、可调参数、SVG 画面、对应代码与变量、三项动手练习、另外条件下的数值题、迁移任务和定位到章节的原始来源。各节使用稳定 `rf-` 标识；答案、解释与参数按单课隔离保存在浏览器草稿中。

## 播放、代码与练习

播放器支持播放、暂停、前后单步、跳步与重新计算。动画回放使用已经计算的轨迹；改参数后重新执行纯函数。切换学习环节、离开课程或隐藏页面都会停止播放。播放与答题不新增学习时长，也不写入任务完成或掌握状态。

代码页调用的函数与动画模型相同，可以下载自包含 `.cjs`，用 Node.js 输出完整轨迹。代码包另外保留五个 Python 标准库复算程序、ROS 示例包与独立测试。从网页下载的程序使用当前参数；练习导出保留用户自己的输入、解释和计算结果。

独立数值题使用与默认演示不同的条件；改动画参数不会改题目。输入为空、非数字或非有限数值时拒绝判断。数值一致只说明本题数值一致，迁移任务要求额外说明条件与过程。

## 统一地图与学习记录

地图总览标注共同基础的4专题12课，以及ROS 2基础4课；点击“展开全部课程”可看到五个专题的实际课数、快捷入口和“开始第一课”。状态从已整理的课程目录读取，前置练习与后续待整理分支分别标注。原有前置教学保留在同一课程目录下；课程 ID、历史任务、学习记录和时长不重写。

嵌入式课程目录仅更新未来个人路线的单元定义。保存观察需要用户点击，并选择包含该课程的当前路线；保存的是计算观察，不是任务完成或学习时长。三个现有 AI 专题、编程基础课及其他原有教学继续沿用各自入口。

`scripts/build_robotics_foundations.py` 对已有地图草稿做标记范围内的增量接入，比较写入前哈希、保存备份后原子替换。`scripts/integrate_ai_draft.py` 以非 AI 内容指纹保护其他课程，后续 AI 更新保留这组课件。公开构建仅加入明确允许的课件和示例文件，不读取个人运行数据。

仅同步地图状态时运行 `python3 scripts/sync_course_map.py`。这会保留课件正文与记录引擎，并在覆盖前生成备份。桌面和手机入口检查见统一草稿目录的 `map-sync-qa/results.json`。

## 运行与构建

从项目根目录执行：

```bash
node --test tests/robotics_foundations_*.test.cjs
python3 -m unittest discover -s tests -p test_robotics_foundations_build.py -v
python3 examples/robotics-foundations/mechanics/mechanics.py --check
python3 examples/robotics-foundations/kinematics/kinematics.py --check
python3 examples/robotics-foundations/control/reproduce.py --self-check
python3 examples/robotics-foundations/estimation/reproduce.py --self-check
python3 examples/robotics-foundations/ros/offline_demo.py --self-test
python3 scripts/build_robotics_foundations.py --integrate
```

独立输出位于 `output/robotics-foundations-20261108/`；默认接入目标为原有 `output/learning-unified-20261108/index.html`。项目本地 HTTP 服务另提供 `/robotics-foundations.html`，静态公开构建也包含此入口。独立 HTML 已内嵌数据与代码，可以离线打开。

浏览器检查由 `qa/robotics_foundations.cjs` 完成，使用已有 Playwright 安装，通过 `PLAYWRIGHT_MODULE` 指定路径。浏览器结果保存在独立输出目录下的 `qa/results.json`；数值、脚本与结构验证详见 `robotics-foundations-coverage.json`。

## 验证范围

机械模型是传动、负载与尺寸的简化计算，不替代强度、加工和实测。两连杆模型检查几何可达性与解的分支，不包含关节限位、碰撞或动力学。PID 中固定测量记录用于检查控制器算术，另有明确标注的一阶闭环例子。滤波课程使用原创固定扰动与已知真值，不保证任意噪声下都优于原始观测。

ROS/Gazebo 配套采用既定 Jazzy/Harmonic 环境。制作机没有 `ros2` 和 `gz`：已执行 JavaScript 和 Python 离线模型，检查 ROS 包 Python 语法、清单、launch、SDF 和桥接配置；尚未执行 `colcon build`、真实 DDS 通信、rosbag2 或 Gazebo。目标环境步骤与需要保存的证据位于 `examples/robotics-foundations/ros/README.md`。
