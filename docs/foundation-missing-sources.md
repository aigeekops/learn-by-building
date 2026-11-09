# Missing Semester 2026：九主题配套与来源

核对及制作日期：2026-11-09。沿用现有地图和个人路线的课程 ID `tools` 与原有六个讲次 ID。本轮新增三讲后，官方 **2026 公开版九个主题**均有原创中文配套；本站讲次保留既有任务顺序，另以 `course.coverage` 按官方顺序列出九项映射。配套不等于逐字翻译或已经完成全部官方练习，只以实际读取的公开网页正文为来源，不声称取得完整视频字幕。

| 本站讲次 | 相关官方公开材料 | 本次核对的定位 | 本站原创模型 |
| --- | --- | --- | --- |
| 1 Shell、路径与重定向 | [Introduction to the Shell](https://missing.csail.mit.edu/2026/course-shell/) | Navigating in the shell；The shell language (bash)；`>` / `>>` / 标准流 | 固定虚拟目录、词法路径解析、父目录检查与覆盖/追加；不处理真实权限或符号链接 |
| 2 管道、计数与失败状态 | [Shell](https://missing.csail.mit.edu/2026/course-shell/)、[Command-line Environment](https://missing.csail.mit.edu/2026/command-line-environment/) | Shell 页的管道、排序分组、`pipefail`；命令行环境中的进程状态与流 | 原创六条日志的筛选、排序、分组与上游失败；不解析任意Shell命令 |
| 3 开发环境与依赖 | [Development Environment and Tools](https://missing.csail.mit.edu/2026/development-environment/)、[Packaging and Shipping Code](https://missing.csail.mit.edu/2026/shipping-code/) | 开发工具与解释器入口；Packaging 的 Dependencies & Environments / Releases & Versioning | 虚构整数版本包 `core` 的交集、锁定与解释器条件；不安装真实包 |
| 4 调试与性能 | [Debugging and Profiling](https://missing.csail.mit.edu/2026/debugging-profiling/) | Debugging；Profiling / Timing；真实经过时间、用户态与内核态时间的区分 | 非空等差序列平均值错误定位、回归断言与理论加法计数；不把动画或计数当真实计时 |
| 5 Git 暂存快照 | [Version Control and Git](https://missing.csail.mit.edu/2026/version-control/) | Git 数据模型；Staging area；Basics；Undo | HEAD、暂存区与工作区的独立内容；C0/C1 是标签，不是实际SHA |
| 6 质量与可复现交付 | [Code Quality](https://missing.csail.mit.edu/2026/code-quality/)、[Packaging and Shipping Code](https://missing.csail.mit.edu/2026/shipping-code/) | Formatting / Linting / Testing / Continuous integration；环境与发布说明 | 有限整数测试、门禁和独立边界检查；不运行真实CI或部署 |
| 7 打包与发布 | [Packaging and Shipping Code](https://missing.csail.mit.edu/2026/shipping-code/) | Artifacts & Packaging、Releases & Versioning、Reproducibility、VMs & Containers、Configuration、Services & Orchestration、Publishing | 明确文件允许清单、入口、接口变化与版本、接收方运行时；浏览器不构建，独立标准库例程真实构建zipapp并在接收目录运行 |
| 8 Agentic Coding | [Agentic Coding](https://missing.csail.mit.edu/2026/agentic-coding/) | How AI models and agents work、Privacy、Use cases、Advanced agents、What to watch out for | 固定决策的五次内存工具反馈；实际布尔运算、预算/权限停止、弱测试漏错与规格缺口；不调用LLM |
| 9 Beyond the Code | [Beyond the Code](https://missing.csail.mit.edu/2026/beyond-code/) | One-way communication、Collaboration / Contributing / Reviewing、Education | 三整数的最小反例、报告复查条件、修改原因与聚焦范围、可行动评审；不发送外部消息或给人评分 |

[2026官方目录](https://missing.csail.mit.edu/2026/)九主题与本站映射：Shell→1，Command-line Environment→2，Development Environment→3，Debugging→4，Git→5，Packaging→7，Agentic Coding→8，Beyond the Code→9，Code Quality→6。官方主题与本站讲次编号明确区分；旧课程、任务与草稿ID不重排。

原有六讲补充了参数引用、CLI约定、进程信号与作业控制、SSH与本地/远端边界、编辑器与语言服务、真实profiling入口、分支/合并/worktree概念，以及质量检查种类的适用范围。它们含具体解释、代码或命令、观察任务；只有当前有限案例的实际状态使用图示，不把每条命令都装饰成动画。常驻说明、按需工作流和子任务只解释概念，具体产品用法仍应以当前厂商文档核对。


每讲包含问题、产出、三段通俗讲解、至少三个展开小节、逐步动画、对应JavaScript计算代码与变量快照、预测和操作练习、独立数值题、迁移检验和可复制的本地Python案例。本地案例都使用标准库；Shell路径与新增打包课只在自动清理的临时目录创建文件，其余课件Python案例处理内存中的公开虚构数据。正文中的终端命令注明本地环境和练习条件，不会由网页执行。

## 计算与验证

代码入口：`web/foundation-missing.js`，注册到既有 `AICourseModels`。新增专用图示位于 `web/foundation-missing-extra-scenes.js`，加载在既有 `foundation-coding-scenes.js` 后包装 `render`，保留既有 `renderExecution`；Node环境用 `require(extra)(scenes)`。课件配置为 `config/foundation_missing.json`。模型与讲次 ID 均使用 `missing-` 前缀，与 `tools` 课程身份分开，避免创建重复课程。

运行：

```sh
node --test tests/foundation_missing.test.cjs
```

2026-11-09 实际结果：17 个测试通过，0 失败。

- 九个模型的默认值、参数变化与失败条件分别核对；全部控件选项或端点均生成有效、有限的轨迹。
- 九份课件内的Python案例由 `python3` 实际执行，输出与文中预期逐项一致。
- 真实Bash只读管道验证：上游输出一行后退出7，默认管道状态0；启用 `pipefail` 后状态7；两次末端计数都是1。
- 在自动清理的临时Git仓库中验证：编辑为2并暂存，再编辑为7，提交内容保持2而工作区为7；`git restore` 后工作区恢复2。未改动项目现有仓库或用户提交。

新增本地例程使用 Python 3.11+ 标准库：

```sh
python3 examples/foundation-missing/shipping.py --self-test
python3 examples/foundation-missing/agentic.py --self-test
python3 examples/foundation-missing/beyond.py --self-test
```

本轮三条命令均实际执行通过。打包例程真实生成pyz，检查入口/允许清单，复制后回读SHA-256，再在独立临时接收目录执行；缺入口和越界文件不会被执行。摘要比较针对同一产物复制，不宣称两次独立构建字节完全相同。Agent与协作例程使用虚构输入，覆盖预算耗尽、拒绝、错误候选、弱回归和材料缺项，没有外部调用或发布。

新增SVG逐帧检查覆盖所有控件选项或端点、早期未知值、拒绝编辑和预算耗尽。场景只累计已经执行的快照：未测结果保留未知，拒绝编辑显示失败而不显示成功标记；图中运行时通过不代表真实启动通过。

浏览器模型只运行有限、确定性的内存计算。页面播放是已计算步骤的回放；暂停、前后步与修改参数不执行Shell、Git、安装、打包或发布，不生成学习时长、真实运行日志、完成证明或知识掌握判断。上述本地测试是制作过程中的技术核对，也不替代学习者自己的操作和解释。

中文讲解、原创日志、虚构版本数据、计算模型和练习为本站制作；官方材料通过原始链接定位。第三方讲义及录播保留原作者权利，不因本站代码许可而重新授权。
