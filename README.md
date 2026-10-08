# 动手学 · Learn by Building

> 面向零基础的**机器人 / AI Agent 动手学习工作台**。课程、交互练习、每日任务与成果记录都在一个可本地运行的平台里，**不发送推送**。

Python 3.11+ 标准库 + SQLite + 原生 HTML/CSS/JS，**零第三方依赖、零前端构建**。可选静态部署到 GitHub Pages。

| | |
|---|---|
| 🧭 两条整站路线 | 机器人工程 / AI · Agent 工程，各自 6 阶段 24 个学习块 |
| 🔬 交互练习 | 电路原理导学 24 节 · 零基础 8 单元 · 负载/排查/RC 动态实验 |
| 📓 学习记录 | 自动留痕、沉浸模式、复盘导出、备份迁移；记录即本地数据 |
| 🔒 隐私边界 | 学习数据留在本机 SQLite 或浏览器，不进仓库、不上传 |
| 🧱 零依赖 | 只用 Python 标准库与原生前端，无包管理、无构建步骤 |

---

## 快速开始

### 方式一 · 静态站点（推荐，不需要 Python 服务）

```bash
python3 scripts/build_static.py       # 生成 dist/
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
# 浏览器打开 http://127.0.0.1:8000/
```

浏览器端不请求 `/api/`，资源用相对路径，可直接跑在 `https://账号.github.io/仓库名/` 下。学习记录存在浏览器 IndexedDB，草稿与界面偏好存站点本地存储。

### 方式二 · 本地 Python 服务（记录保存在 SQLite）

```bash
cd learn-by-building
python3 server.py                # 需要 Python 3.11+，默认只监听本机
# 打开 http://127.0.0.1:8765
```

```bash
python3 server.py --port 9000       # 换端口
```

两种方式的差别只有数据存放位置：静态版用浏览器 IndexedDB，Python 版用本机 SQLite；都不联网、都不需要账号或同步。

---

## 功能地图

| 模块 | 能做什么 | 关键入口 |
|---|---|---|
| 今日学习台 | 七日日期切换、快捷添加、方向/状态筛选、改期、成果回顾、按 `N` 快速添加 | `web/dashboard.js` |
| 专注计时 | 跨页面保留、可暂停；刷新后回到暂停态，不累计关机时间 | `radar/study.py` |
| 学习路线 | 两条路线各 6 阶段 24 块；先修自检、中文直觉、三步跟练、验收与回补 | `config/*_curriculum.json`、`web/robotics-curriculum.js` |
| 交互练习 | 理想直流模型、RC 充电动画、6 类主题练习；参数变化即客观快照 | `web/electronics-lab.js`、`web/rc-lab.js` |
| 原理补课 | AAC 六卷 24 节原创中文导学 + 81 章节索引，可搜索与自测 | `config/ee_textbook.json`、`web/ee-textbook.js` |
| 学习记录 | 自动记录、证据校验、归档恢复、下一步转任务 | `radar/journal.py`、`web/journal.js` |
| 个性化计划 | 选起点与每日分钟，按 7/14 天拆成理解/跟做/验证小任务 | `radar/plans.py`、`web/personal-plan.js` |
| 复盘导出 | 选 1–31 天，按北京时间整理时长、任务与记录为 Markdown | `radar/journal.py` |
| 备份迁移 | 预览只读、校验和比对、写入前自动安全备份、原子替换 | `radar/backup.py` |

---

## 学习路线

### 整站两条路线

侧栏统一切换 **机器人工程 / AI · Agent 工程**，学习台、路线、练习、记录、复盘共同跟随，状态写入浏览器偏好与 URL（如 `/?route=agent#learn`）。

- 两条路线各自保留当前短期计划，互不覆盖
- 专注计时跨路线保留，并标明原任务所属路线
- 未保存草稿按路线独立保存；既有数据新增 `learning_route` 归属，不改写成果与分钟
- 电子学与电路原理是机器人路线内部模块

### 每条路线 6 阶段 · 24 学习块

- **机器人工程**：电路与编程起步 → 传感器到执行器 → 机械与 CAD → ROS 2 与仿真 → 机器人用得上的数学 → 机器人学习与作品集
- **AI / Agent 工程**：编程起步 → 理解并连接模型 → 有依据的资料问答 → 工具与受限 Agent → 可靠地运行小应用 → 交付一个完整作品
- 每块含先修自检、三步跟练、阅读范围、验收条件与回补路径；"有基础"不会自动跳课
- 7/14 天计划按参考用时与每日分钟拆分，**每块至少三次练习**，每第 7 天复盘
- 参考用时是课程编排估计，不是实测学习承诺；旧计划、成果与时长不会被重写

### 路线来源

250 个原文资源入口与 37 张可编辑实践卡保存在 `config/roadmaps.json`，原帖链接位于各路线的 `source.url`。**资源目录不复制文章正文，链接未逐条实时核验**；收录内容为原帖链接与以其为顺序的学习编排，原帖权利归原作者（见许可与致谢章节）。

学习路线另含 13 组配套学习卡，按「先学原理 → 再做练习 → 留下成果」排列，映射集中在 `config/learning_links.json`。

---

## 交互练习

### 电路原理补课站

连接 [Lessons in Electric Circuits](https://www.allaboutcircuits.com/textbook/) 六卷教材的 24 节原创中文导学，按六个阶段递进：读图与测量 → 直流分析 → 变化信号 → 器件与驱动 → 数字信息 → 系统验证。每节含概念解释、带步骤算例、误区、练习、验收条件与带解析自测。入口 `/#textbook`。

### 8 个知识单元

| 单元 | 直达链接 | 内容 |
|---|---|---|
| 起步课 | `/?lesson=basics#guides` | 第一次点亮 LED，无需先买硬件 |
| 直流分压 | `/?lesson=dc#guides` | 理想直流分压模型 |
| 开关与 RC | `/?lesson=switching`、`rc` | 充放电动画与时间常数 |
| 测量 | `/?lesson=measurement#guides` | 节点、电压极性、串联电流、断电电阻 |
| 逻辑与接口 | `/?lesson=logic`、`interface` | 逻辑门、SR 锁存、按键去抖、ADC 与程序输出 |
| 排查与电磁 | `/?lesson=soldering`、`exploration` | 焊点与连接质量排查、电磁感应 |

八个单元是原创教学模型与检查案例，**不等同于逐项复刻教材实验**。LED 使用固定 2 V 正向压降与本练习 20 mA 上限，不代表任意实际元件，不能作为实物接线依据。

### 交互电路实验

`web/electronics-lab.js` 提供负载、候选故障排查与电阻取值代价三个场景；RC 实验支持播放、暂停、时间拖动与参数变化，结果可一键转笔记。**所有结果都是理想直流电阻模型计算，不是 SPICE 仿真或硬件测量**；写入记录时标为「计算」，结论留给学习者填写。

---

## 学习记录与复盘

- **自动记录**：结束专注、提交成果、查看课程、操作模型与检查答案时自动留痕；相同日期 + 来源 + 客观快照去重，重试不会覆盖你后来补的想法或取消归档
- **诚实标注**：操作日志不代表掌握，模型输出不冒充硬件测量；计划分钟与实际分钟分开记录
- **沉浸模式**：顶栏一键进出，切换时复用页面节点，保留练习输入、未提交草稿与计时；聚焦单个课块，完整目录仍可打开
- **备份与恢复**：v1 JSON（≤12 MB）含两条路线的任务、时长、笔记、计划与防重复记录；先校验预览再原子替换，并自动留存恢复前副本。静态版另存个人课程编辑（`curricula`）
- **复盘导出**：只整理已有数据，不调用模型、不生成虚构经历、不重复累计时间

---

## 我的路线与计划

静态版的所有个性化都存在浏览器里，不写回源码库：

- **修改学习计划**：选起点、开始日期、每日分钟（1–1440）与 7/14 天周期，先预览再采用；采用新计划保留此前任务、成果与时长，旧任务可继续单独编辑、改期或删除
- **编辑我的课程路线**：改阶段名称、阶段与课块顺序、讲解、三个练习步骤与资源；「恢复默认路线」只清除课程编辑，保留任务、计划、笔记与时长
- 已有计划保留生成时的内容，新计划使用修改后的路线；历史任务与成果不会重排

入口：`web/static-plan.js`、`web/course-editor.js`（静态版）、`radar/plans.py`（Python 版）

---

## 数据与隐私边界

| 数据 | 存放位置 | 是否随仓库分发 |
|---|---|---|
| 任务、时长、笔记、计划 | 本地 SQLite（`data/radar.db`）或浏览器 IndexedDB | 否 |
| 未保存草稿、每日目标、界面偏好 | 当前浏览器 | 否 |
| 课程内容与代码 | `config/`、`web/`、`radar/` | 是 |

- 备份文件属于个人数据；完整环境迁移需另备份整个 `data/`（先停止服务）
- Python 版无登录与多人隔离，**不能直接暴露公网**；公网使用静态站点
- 未保存的编辑只在当前浏览器；清除网站数据、无痕窗口或换设备前请先导出备份

---

## 目录结构

```
├── server.py              # 本地 HTTP 接口与参数校验
├── radar/                 # SQLite、记录、计划、备份
├── web/                   # 页面、样式与全部前端模块（含静态版运行时）
├── config/                # 课程、路线、练习与社区配置（JSON，可直接编辑）
├── scripts/               # 静态构建、源码打包、资源导入
├── tests/                 # Python unittest + Node test
├── qa/                    # 浏览器验收脚本（Playwright）
├── data/                  # 运行时数据（git 忽略）
├── OPEN_SOURCE.md         # 发布与维护清单
└── AGENTS.md              # 后续开发约束
```

---

## 配置

| 文件 | 用途 |
|---|---|
| `config/roadmaps.json` | 两条路线的阶段、资源入口与实践卡 |
| `config/robotics_curriculum.json` / `config/agent_curriculum.json` | 6 阶段 24 块课程内容 |
| `config/ee_textbook.json` | 24 节原理导学与六卷章节索引 |
| `config/electronics_beginner.json` / `config/electronics_paths.json` | 零基础主题、目标路线与优先级 |
| `config/learning_links.json` | 路线 ↔ 原理课 ↔ 练习的映射 |
| `config/guides.json` | 图文指南与交互说明 |
| `config/community.json` | 课程讨论入口（仓库地址、Discussions 开关） |

修改路线 / 阶段 ID 前请先迁移已有任务引用。

---

## 开发与验证

```bash
python3 -m unittest discover -s tests -v     # 后端测试
node --test tests/*.test.cjs                 # 前端模型测试
```

浏览器验收（需自行安装 Playwright 并设置 `PLAYWRIGHT_MODULE`，先启动本地服务）：

```bash
node qa/check.cjs    # 检查任务持久化、证据校验、1440px/390px 溢出与 JS 错误
```

GitHub Actions 会在每次推送运行上述两套测试。

---

## 部署

`.github/workflows/pages.yml` 已配置构建与部署。把仓库 **Settings → Pages → Source** 设为 **GitHub Actions**，推送到默认分支即发布 `dist/`。参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

---

## 许可与致谢

**MIT**（见 [LICENSE](LICENSE)）仅覆盖本项目贡献者有权授权的代码与原创内容。第三方教材、课程、图片与商标保留各自权利，不因出现在推荐链接或引用中就转为 MIT。

- 课程与资料来源：《爱上电子学》（Make: Electronics）、[Lessons in Electric Circuits](https://www.allaboutcircuits.com/textbook/)（Design Science License，Tony R. Kuphaldt 及各章贡献者）、[CS50P](https://cs50.harvard.edu/python/license/)（CC BY-NC-SA 4.0）
- **感谢 Ronin** 公开分享 Agent 与机器人两条学习路线：本站仅参考其顺序做中文编排并保留原帖链接，原帖权利归原作者，不作 MIT 再授权；权利人不希望被引用时可提交 Issue 移除
- 站点图标、练习与配图为本站原创模型与脚本绘制

---

## 参与共建

- 讨论与勘误：[COMMUNITY.md](COMMUNITY.md) · 贡献流程：[CONTRIBUTING.md](CONTRIBUTING.md)