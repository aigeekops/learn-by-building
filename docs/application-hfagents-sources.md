# 第二批：Hugging Face Agents Course 来源、教学范围与验证

核对日期：2026-11-08。采用当前公开课程，而非虚构的“2026年度版”。本站按知识点重新编排8讲原创中文配套教学，使用一个只读资料助手贯穿；讲次编号不等于官方单元编号，不声称完整翻译原课、完成GAIA提交或取得课程认证。

## 官方材料与本站编排

| 本站讲次 | 对照材料 | 本站讲透的问题 |
| --- | --- | --- |
| 1 组件与状态 | [Unit 1 · What is an Agent?](https://huggingface.co/learn/agents-course/en/unit1/what-are-agents)、[Messages and Special Tokens](https://huggingface.co/learn/agents-course/en/unit1/messages-and-special-tokens) | 消息角色、实际传入的历史、工具能力边界与下一状态 |
| 2 工具契约 | [Unit 1 · Tools](https://huggingface.co/learn/agents-course/en/unit1/tools) | 注册名、参数范围、执行与响应，契约失败和超时分开 |
| 3 循环与停止 | [Unit 1 · Thought-Action-Observation](https://huggingface.co/learn/agents-course/en/unit1/agent-steps-and-structure) | 观测如何进入下一决策；完成、错误、预算耗尽的不同条件 |
| 4 上下文与记忆 | [Messages](https://huggingface.co/learn/agents-course/en/unit1/messages-and-special-tokens)、[smolagents Memory](https://huggingface.co/docs/smolagents/tutorials/memory) | 保留任务、约束和来源；人工成本装箱是本站透明扩展，不是真实tokenizer |
| 5 smolagents实践 | [Unit 2.1 · Code Agents](https://huggingface.co/learn/agents-course/en/unit2/smolagents/code_agents)、[Tools](https://huggingface.co/learn/agents-course/en/unit2/smolagents/tools)、[稳定版1.26.0 Model接口](https://huggingface.co/docs/smolagents/v1.26.0/en/reference/models) | 工具注册、受控模型响应、CodeAgent执行与最终返回 |
| 6 Agentic RAG | [Unit 3 · Agentic RAG](https://huggingface.co/learn/agents-course/en/unit3/agentic-rag/introduction) | 查询改写、检索分数、支持性检查与带来源拒答；词项检索器为本站原创 |
| 7 评测 | [Bonus Unit 2 · Observability & Evaluation](https://huggingface.co/learn/agents-course/en/bonus-unit2/introduction)、[Unit 4](https://huggingface.co/learn/agents-course/en/unit4/introduction) | 固定题集、判定规则、超时分母、来源字段与独立新题 |
| 8 完整小作品 | [Unit 4 · Final Project](https://huggingface.co/learn/agents-course/en/unit4/introduction)、[Agent循环](https://huggingface.co/learn/agents-course/en/unit1/agent-steps-and-structure) | 预算、故障恢复、参数冲突与请求回执；幂等提交是本站工程扩展 |

页面已读取以上公开材料，并在配置中保留具体URL、章节定位、来源角色与核对日。原课含其他框架、视觉、多Agent与微调等内容；本批选择smolagents一条框架路径，其余保留选读状态。第三方材料保持原作者权利；本站不打包整份官方转录或课件。

## 教学和图示

8讲均包含问题、先修、至少3段通俗说明、知识展开、完整标准库Python例子、可检验预测、操作与解释练习、数值题、独立输入验证及来源。框架讲还提供完整真实smolagents示例。

8个确定性模型提供逐步代码行和变量快照，SVG只读取已发生的快照，不读取最终结果来提前填图。图示分别回答消息怎样组成状态、工具在哪道检查失败、反馈怎样改变下一轮、预算怎样分配、框架怎样调用工具、检索怎样进入证据、评测怎样保留失败分母、完成回执怎样重放。图形按数值或因果状态变化更新，没有持续脉冲、跑箭头或卡片飞入的装饰动画。单步停留时可以先预测，再用下一步核对。

边界已专门校正：3轮历史加一次观测时全部9条消息都可见；工具未运行的结果保持未知，备用图也不画成0；可选背景12单位只有实际加入时才出现；RAG调用计数高亮对应真实`calls++`行；未知问题遇到永久读取失败时保持未完成，不伪造“资料不足”观测。

## 实际验证

命令：

```sh
node --test tests/application_hfagents.test.cjs
# 额外验证已安装框架的独立环境：
HFAGENTS_FRAMEWORK_PYTHON=/private/tmp/hfagents-batch2-env/bin/python \
  node --test tests/application_hfagents.test.cjs
```

已在临时独立Python环境从PyPI安装并实际测试 `smolagents==1.26.0`。使用 `HF_HUB_OFFLINE=1`，执行 `examples/application-hfagents/smolagents_offline.py`，真实CodeAgent调度一个只读工具，预设ReplayModel提供可信固定代码，输出为36，模型接口调用1次。该验证不请求真实LLM、不下载模型，不证明模型自主规划或生产环境效果。框架包仅安装在临时环境，不成为网页运行依赖。

14项测试在提供此环境变量时全部通过；默认没有第三方环境时仅跳过专门的框架实跑项，其余13项仍可运行。验证包括：

- 全部控件选项和每个数值控件的所有合法取值产生有限、确定且有界的轨迹。
- 工具越界拒绝、超时、循环预算、永久错误、上下文不足、检索拒答、固定四题正确率和回执冲突。
- SVG逐帧读取已发生的状态，关键消息、可选预算段、分数宽度与数值相符，不读取`trace.result`。
- 8段完整标准库例子实际运行断言；额外用Python独立复算JS的循环、检索、评测、上下文与临时JSON文件回执。
- 完整框架程序语法与真实离线运行分别核验。

## 本地复现

`examples/application-hfagents/` 中8个标准库例子可直接用Python 3运行。框架算例单独使用：

```sh
python3 -m venv .venv
.venv/bin/pip install -r examples/application-hfagents/requirements-smolagents.txt
HF_HUB_OFFLINE=1 .venv/bin/python examples/application-hfagents/smolagents_offline.py
```

不要把标准库基准例子命名为 `smolagents.py`，以免遮蔽第三方包；对应文件命名为 `controlled_fixture.py`。安装文件固定的是框架API版本，不宣称所有传递依赖都已锁定。接入真实模型时需另行配置可信提供方、环境、工具和评测；本网页的固定策略、人工预算与小题集不替代这些验证。
