# CS146S · 现代软件开发者（Stanford, Fall 2026）课程地图

> 一份给「没有学籍也想学」的人用的课程地图：11 周骨架、六次作业的真实要求、2025→2026 的迭代轨迹，以及把课堂改造成 6 周自学任务的对照表。
> 事实截止 2026-10-24（课程进行到第 5 周）。所有链接与引文均来自课程官网、官方作业仓库与公开课堂转录；标注 `[推断]` 的段落是我的转述与判断，不是官方口径。
>
> 配套文章与更多 Agent 工程走读，见公众号 **「极客行动」**（合集《Agent开发内功》）。

---

## 一、这门课到底在教什么

讲师 Mihail Eric（Stanford CS146S 主讲）在第二讲开场把立场说得很直白：

> "Sometimes people call this the vibe coding class. That's not what I want it to be called. This is about systematic principles for using coding agents."

一句话概括课程命题：**当写代码的人从「手写」变成「指挥 agent」，新增的工程问题不在模型里，而在模型外面那层壳——harness。**

| 项 | 内容 |
|---|---|
| 全称 | CS146S: The Modern Software Developer |
| 机构 / 学期 | Stanford University · Fall 2026（3 units） |
| 官网 | https://themodernsoftware.dev |
| 先修 | CS111/CS161 级编程能力；CS221/229 建议 |
| 时间投入 | 官方 FAQ：每周 10–12 小时（含讲座、作业、项目） |
| 形式 | 周二/周四讲座 + 动手课 + 产业界客座 + 期末项目 |
| 语言无关 | FAQ 明确：课程本身语言无关，示例以 Python / JavaScript 为主 |
| 旁听 | 对 Stanford 师生开放；旁听可听全部课，但不批作业、不指导期末项目 |

课程描述里点名的五个技术主题，恰好就是 2026 年 AI 原生开发的五块拼图：**MCP、agent skills、spec-driven development、loop engineering、software factory**。

---

## 二、11 周骨架

讲座分两类：**周二是原理课**（讲师拆解 + 现场演示），**周四是客座**（几乎全是当年一线产品的负责人）。这个节奏本身就是课程设计的一部分——原理讲完立刻听做的人怎么说。

| 周 | 主题 | 周二（原理/演示） | 周四（客座为主） | 本周截止 |
|---|---|---|---|---|
| 1 (9/22) | The Internals of Coding Agents | 课程导论 + 200 行写出 Claude Code | 顶尖 coding agent 的设计（system prompt 深挖） | A1 (9/27) |
| 2 (9/29) | Advanced Context Engineering | 高级 prompting + RePPIT / spec-driven | MCP 与 tool calling 全解（含 Factory 工作坊） | 提案 (10/1)、A2 (10/4) |
| 3 (10/6) | Agent Skills and CLI | agent skills（含 web skills）+ cmux 演示 | Lee Robinson | A3 (10/11) |
| 4 (10/13) | Customizing Your Agent and Repository | CLAUDE.md / AGENTS.md / hooks | Boris Cherny（Claude Code 作者 @ Anthropic） | 技术规格 (10/15)、OSS 贡献 1 (10/18) |
| 5 (10/20) | Agent-Ready Codebases | 让 repo 对 agent 友好：结构、文档、检查 | Eno Reyes（CTO @ Factory） | A4 (10/25) |
| 6 (10/27) | Agentic Code Review | AI 评审的架构与最佳实践 | Silas Alberti（SVP Research @ Cognition） | A5 (11/1) |
| 7 (11/3) | Security | AI 代码库的安全（SAST/SCA、prompt injection） | Isaac Evans（CEO @ Semgrep） | Alpha 发布 + 任务清单 (11/5)、OSS 贡献 2 (11/8) |
| 8 (11/10) | Background Agents | 异步后台 agent、并行 agent 舰队、issue→PR | Rajesh Bhatia（Sr. Director @ Cloudflare） | OSS 贡献 3 (11/15) |
| 9 (11/17) | Building an AI-Native Team | 客座 Elad Gil（投资人 @ Gil Capital） | 客座 Amjad Masad（CEO @ Replit） | A6 (11/22) |
| 10 (12/1) | The Software Factory + The Future | 大团队里的 coding agent：MCP 门户、LLM 网关、成本、模型路由 | 软件工厂：自运行、自改进的软件系统 | OSS 贡献 4 (12/6) |
| 11 (12/10) | Finals | — | — | 期末项目 + Expo (12/10 晚) |

> 两处官方口径不一致，值得记一笔：① 周四 10/8 的客座，官网页写的是 Lee Robinson "Model Behavior @ SpaceX"，而官方日历文档仍写着 "VP of Developer Relations @ Cursor"，官网更新但日历没跟；② 周二 11/3 官网页排了 "Security in AI codebases"，日历文档写的是 "No Class (Democracy Day!)"。以官网页为准，但 11/3 当天到底上不上，得看当周通知。

---

## 三、五条递进主线（比周历更重要的东西）

按周看是 11 个话题，按知识结构看是五级台阶。想自学的话，按这五级走，比按周打卡有效。

**第一级 · 解剖 harness（W1）**
第一讲用 200 行写一个能改文件的 coding agent，证明核心循环简单；第二讲立刻反转——真正的复杂度全在循环外面：工具列表、system prompt、配置注入、plan mode、subagents、skills、hooks、compaction。讲师的核心论断：**harness 设计是 coding agent 里最难也最重要的问题**，而且这套原则能平移到销售、法律、客服等任何垂直。

**第二级 · 上下文工程（W2）**
从"能跑"到"在百万行代码库里能跑"。核心手段是 RePPIT（Research → Propose → Plan → Implement → Test）与 spec-driven development：先把代码库蒸馏成一份结构化研究文档，再基于它产出 2 个正交方案，由人挑，再实现、再测。讲师强调大部分价值发生在 propose 阶段，因为那是人做判断的地方。

**第三级 · 把能力装进可复用的壳（W2–W4）**
MCP 是原语（一次输入输出），skills 是过程（多步 + 中间提示 + 脚本），AGENTS.md / CLAUDE.md 是长期上下文。三者的分工是这门课最实用的部分：**工具解决"能不能做"，skill 解决"按什么流程做"，配置解决"在这个仓库里怎么做"。**

**第四级 · 让工程流程能吃下 agent（W5–W7）**
repo 就绪度（结构、文档、可复现的检查命令）、AI 评审的分工边界（什么能抓、什么抓不到）、安全（依赖与密钥泄漏、prompt injection、agent 特有的攻击面）。这一段是从"个人用 agent"跨到"团队用 agent"的门槛。

**第五级 · 规模化（W8–W10）**
后台 agent、并行舰队、issue→PR 管道（Slack / Linear / GitHub 触发）、MCP 门户、LLM 网关、模型路由与成本、最终落到"软件工厂"——自运行、自改进的软件系统。

---

## 四、六次作业真正在练什么

2026 的作业不是"交个 demo"，而是**逐级把学生推到别人写过的生产系统里去读、去改、去写给别人用的接口**。前四次已在官方仓库公开（`mihail911/modern-software-dev-assignments`，5.2k stars）。

| 作业 | 标题 | 一句话任务 | 真正的考点 | 分项权重 |
|---|---|---|---|---|
| A1 (W1) | Trace Dissection of a Real Claude Code Session | 用 mitmproxy 反代抓 Claude Code 的真实请求，逐层拆开 | 读别人的生产系统，读到设计决策可见的程度 | 抓包 15 / system prompt 25 / 工具 25 / 行为 25 / 反思 10 |
| A2 (W2) | Build an MCP Server for a Third-Party API | 给一个 OAuth 2.0 API 写 MCP server（≥3 个可串联工具 + ≥1 个写工具） | **agent ergonomics**：约束放进 schema 不放文档、输出裁剪、错误当数据、写操作要刹车 | server 25 / ergonomics 30 / OAuth 25 / 集成 20 |
| A3 (W3) | Author a Skill | 对一个真实开源库写一个 SKILL.md | description 能不能被触发；body 编码的是判断还是步骤；近义误触发测试 | 选题 15 / 技能 60 / 测试 25 |
| A4 (W4) | Make a Messy Repo Agent-Ready | 给一个陌生开源库补一份 AGENTS.md / CLAUDE.md | 每一行是否只对**这个**仓库成立；长度即成本 | 探索 20 / 文件 55 / 试用 25 |
| A5 (W5) | Agent-Readiness Report | 审计一个仓库的 agent 就绪度并出报告 | 结构、文档、检查、常见阻塞点 | 未公开 |
| A6 (W9) | TBD | 官方标注待定 | — | 未公开 |

四次 OSS 贡献（10/18、11/8、11/15、12/6）占 30%，方向是官网列出的 15 个开源伙伴项目：Vercel、Anyscale、Browserbase、HeyGen、CopilotKit、Semgrep、OpenHands、Milvus（Zilliz）、Marimo、Pi、CrewAI、Warp、cmux、Phoenix (Arize)、Unsloth。讲师在课上提到还发了 Claude Code、Factory、xAI、Devin、Windsurf 的额度给选课学生。

期末项目占 50%，四个里程碑：提案（10/1）→ 技术规格（10/15）→ Alpha 发布 + 任务清单（11/5）→ 最终交付 + Expo（12/10）。

### A1 的方法值得单独抄走

第一份作业最有价值的地方不是题目，而是它给了一套**可复用的观测手法**：反代抓包 + 分层注释。上手成本极低：

```bash
# 反向代理模式：不需要装 CA 证书，Claude Code 直接指向本地明文地址
mitmweb --listen-host 127.0.0.1 --listen-port 58888 \
        --web-open-browser --mode reverse:https://api.anthropic.com \
        -w session.flows
```

然后在**项目级** `.claude/settings.json` 里把 `ANTHROPIC_BASE_URL` 指到 `http://127.0.0.1:58888`——注意绝不能写进 `~/.claude/settings.json`，否则你机器上所有会话都会被抓进同一条流里。作业里还反复强调：请求体里会回放 agent 读过的 `.env`、配置和命令输出，引用前必须脱敏，`session.flows` 不许进任何 git 仓库。

拿到 trace 之后要回答的问题，其实就是一套读 harness 的检查单：system prompt 分成哪几段、每段在防什么失败模式；`<system-reminder>` 出现在哪里、为什么中途注入而不是一次说清；可用工具多少个、内置/MCP/延迟加载怎么分；失败恢复走了几轮；会话变长后 payload 怎么变形。

---

## 五、2025 → 2026：一年内这门课改了方向

这一节是我认为整份资料最值得看的部分。把去年的周历和今年的并排放，能看出整个领域在 12 个月里往哪儿挪了。

| 周 | Fall 2025 | Fall 2026 |
|---|---|---|
| 1 | Introduction to Coding LLMs and AI Development | **The Internals of Coding Agents** |
| 2 | The Anatomy of Coding Agents | **Advanced Context Engineering** |
| 3 | The AI IDE | **Agent Skills and CLI** |
| 4 | Coding Agent Patterns | **Customizing Your Agent and Repository** |
| 5 | The Modern Terminal | **Agent-Ready Codebases** |
| 6 | AI Testing and Security | **Agentic Code Review** |
| 7 | Modern Software Support | **Security** |
| 8 | Automated UI and App Building | **Background Agents** |
| 9 | Agents Post-Deployment | **Building an AI-Native Team** |
| 10 | What's Next for AI Software Engineering | **The Software Factory + The Future** |

三个变化方向很清楚：

1. **从"用工具"到"拆系统"。** 去年第 1 周讲"怎么prompt"，今年第 1 周直接把生产 harness 抓包摊在桌上。作业也从 2025 的 "LLM Prompting Playground" 变成 2026 的 "Trace Dissection of a Real Claude Code Session"——同一个知识点的练习，从"你写个 prompt"变成"你读别人的协议"。
2. **从个人效率到组织工程。** 新增的三讲——agent-ready repo、agentic code review、AI-native team——全部指向同一个问题：agent 进入团队之后，代码库、评审流程、采购与权限要怎么改。
3. **考核重心从"做出来"转向"贡献出去"。** 2025 评分是期末项目 80% + 作业 15% + 参与 5%；2026 变成期末 50% + **开源贡献 30%** + 作业 15% + 参与 5%。这个 30% 是课程对"agent 时代工程师的可信度来自哪里"的表态。

---

## 六、一手材料在哪（哪些能白看）

| 材料 | 地址 | 状态 |
|---|---|---|
| 课程主页（10 周 topics + 每周 reading + 客座） | https://themodernsoftware.dev | 公开 |
| 官方日历（FA26，含全部截止与里程碑） | https://docs.google.com/document/d/1W11sWBigWIsi9wVIhhFx3wajIEnP0Qfb-ei8Ecf5VKU | 公开 |
| 官方作业仓库（week1–week4，含 rubric） | https://github.com/mihail911/modern-software-dev-assignments | 公开，MIT 未声明 |
| 课堂转录 · 9/24（harness 解剖 + Claude Code 抓包） | https://themodernsoftware.dev/materials/9-24-26-transcript.txt | 公开 |
| 课堂转录 · 9/29（RePPIT + spec-driven） | https://themodernsoftware.dev/materials/9-29-26-transcript.txt | 公开 |
| 课堂转录 · 10/1（MCP 理论与工具设计） | https://themodernsoftware.dev/materials/10-1-26-transcript.txt | 公开 |
| 各讲 Slides | 官网各周链接 | **需 Stanford 账号**（页面上标 gated） |
| 完整 trace 演示文件、课堂代码 | 官网 Google Drive 链接 | 部分公开（completed code 可下载） |

### 每周推荐阅读（官方 reading，全部公开）

| 周 | 阅读 |
|---|---|
| W1 | Building a Coding Agent（YouTube 演示）、Lessons from Building Claude Code（x.com/trq212）、Dive into Claude Code（arXiv:2604.14228） |
| W2 | The Context Tax: When to Compact（langwatch）、OpenSpec（openspec.dev）、Superpowers（github.com/obra/superpowers）、Enterprise MCP（Cloudflare 博客） |
| W3 | pstack（cursor/plugins）、Matt Pocock's Skills（github.com/mattpocock/skills）、browse.sh |
| W4 | I Still Prefer MCP Over Skills（david.coffee）、AGENTS.md（Factory 文档）、Steering Claude Code（claude.com）、Writing a Good CLAUDE.md（hlyr.dev） |
| W5 | Making Codebases Agent Ready（YouTube）、Making Ergonomic Repositories（x.com/trybasis） |
| W6–W10 | 官网未给阅读清单 |

作业材料里另有一批更"上手"的链接，比 reading 更值得先看：Intercepting Claude Code Requests（ai.moda 教程，A1 的方法出处）、Anthropic Messages API 参考、Claude Code settings 文档、FastMCP、MCP 规范、官方 reference servers、agentskills.io、agents.md、Claude Code best practices。

---

## 七、没有学籍怎么学：把课堂改成 6 周自学任务

课程的真实约束不是内容，是**截止日期、评分的第三方、以及同学**。去掉这三样，剩下的东西仍然可以照着做——只要把"交作业"换成"留证据"。下面这张表是改造方案，我的判断（`[推断]`）：原课 11 周对业余学习偏长，6 周、每周 8–10 小时更现实。

| 周 | 对应原课 | 你要做的动作 | 留下的证据 |
|---|---|---|---|
| 1 | W1 | 抓一次自己用 Claude Code / Cursor 干活的完整请求：mitmproxy 反代 + 项目级配置，跑一个"多文件 + 中途失败 + 有明确计划"的任务 | 一份系统的 system prompt 分段注释（每段防什么失败） |
| 2 | W2 | 拿一个陌生仓库，串 RePPIT：研究文档 → 两个正交方案 → 挑一个 → 实现 → 测 | 研究文档 + 两方案 trade-off 表 + 实际 diff |
| 3 | W2 下半 + W3 | 给一个你常用的第三方 API 写 MCP server（3 个串联工具 + 1 个写工具 + OAuth） | 一次 agent 串联两个工具完成任务的完整 transcript，一次故意触发的失败路径 |
| 4 | W3 下半 + W4 | 写一个 SKILL.md：选真会重复做、且有判断点的工作流；再造一个"近义但不该触发"的测试 | 3 个该触发 + 1 个不该触发的实测结果 |
| 5 | W4 下半 + W5 | 给一个你没参与过的开源库写 AGENTS.md，然后让它按文件里写的命令跑测试 | 该文件 + 一次"按它执行"的记录 + 一处你想改的地方 |
| 6 | W6–W10 选一 | 挑一个方向做深：AI 评审规则 / 安全扫描清单 / 后台 agent 流水线 | 一个能重复跑的小工具或检查单 |

自学的三个替代品（这是原课的隐性资源，最容易漏）：

- **代替客座**：把 8 位客座对应的公司产品当"活教材"——Factory、Cognition(Devin)、Semgrep、Cloudflare、Replit、Cursor。他们的官方文档和 blog 里，讲 agent 工程的部分往往比课程更细。
- **代替评分**：A1 的 rubric 本身就是一套高质量检查单（有具体的扣分项：未脱敏的凭据、把推断说成观测）。拿它给自己的产出打分。
- **代替同学**：把每次产出写成可被别人复现的说明——"从空目录开始能重跑一遍"是唯一硬标准。

---

## 八、关键概念速查

| 概念 | 一句话 |
|---|---|
| harness | 模型外面那层壳：system prompt、工具集、配置注入、plan mode、subagents、skills、hooks、compaction |
| dumb zone | 讲师的口头说法：上下文超长之后，模型开始明显不灵的那段区间；工具越多越容易提前进入 |
| M×N → M+N | MCP 的价值来源：M 个 agent × N 个服务，从点对点连接变成各实现一次协议 |
| agent ergonomics | 工具接口是给"只看得到 schema 和 docstring 的消费者"设计的；约束放 schema，不放散文 |
| progressive disclosure | skills 相对 MCP 的关键区别：先只暴露元数据，相关时再把正文拉进上下文 |
| RePPIT | Research → Propose → Plan → Implement → Test；spec-driven 的一种落地流程 |
| compaction | 上下文快满时把历史压成摘要（例：50 万 token 压到 15 万），摘要替换被压缩的部分 |
| software factory | 自运行、自改进的软件系统：触发 → 实现 → 评审 → 部署 全链路无人值守 |

### 从公开转录里能直接拿走的几个判断 `[转述]`

- **工具在变少，不在变多。** Claude Code 内置约 40 个工具，而早期 MCP server（如 GitHub）一出场就 100–150 个工具，把上下文吃满。行业趋势是"少而强"——Bash、SQL 这类瑞士军刀式工具。
- **system prompt 在变短。** Opus 5.5 的 system prompt 基本在 50–80 行这个量级（讲师现场目测的区间），而一两个月前还是 200–250 行。讲师的解释：很多原来必须显式写的规则（比如怎么用 git），已经被训练吃进参数里了。
- **memory 用平文件，不用向量库。** 讲师所在公司（非编码场景）同样用 flat file 存记忆；理由是 RAG / GraphRAG 的额外复杂度在多数任务上换不来相应收益，这依赖具体任务，不能一概而论。
- **模型和 harness 是一个钟摆。** 有时价值在 harness（公司护城河论），有时在模型（几十亿训练投入论）。当前摆动方向是"harness 尽量简单"。

---

## 九、出处与边界

- 课程描述、周历、topics、reading、客座、评分比例：取自 https://themodernsoftware.dev 及其 Fall 2026 页面数据（2026-10-24 抓取）。
- 每周截止日期、作业名称、项目里程碑：取自官方公开日历文档（CS 146S FA26 Calendar）。
- 作业要求与 rubric：取自官方作业仓库 `mihail911/modern-software-dev-assignments` 的 week1–week4 `assignment.md`（2026-10-19 最后提交）。
- 讲师观点与现场细节：取自官网 `/materials/` 下三份公开课堂转录（9/24、9/29、10/1），本文为节选转述，非逐字原文。
- 2025 周历与评分：取自同一官网的 Fall 2025 页面数据，用于对比。
- 第三方课程材料（slides、课堂代码、转录原文）版权归 Stanford 与讲师所有，不在本项目 MIT 范围内；本文只做结构整理、要点转述与链接指路，不复制正文。
- 本文中标注 `[推断]` / `[转述]` 的段落是我的组织与判断，不是官方表述；两处官方口径冲突已在第二节注明。
