# 第二批应用与交付课程

2026-11-09更新：FSDL已扩展到13讲，新增Foundation Models、ML Teams、Ethics和完整原创本地项目；实际完成数据、训练、制品、HTTP与回滚验证。HF保持8讲。本轮范围与运行方式见[进阶补充](course-expansion-2026-11-09.md)。以下八讲首批说明保留其11月8日日期。

制作与材料核对：2026-11-08。沿用已有 `hfagents`、`fsdl` 课程身份，新增两门各8讲的原创中文配套教学。它们是按问题选编的教学内容，官方完整课程、框架能力和本站小案例分别说明。

| 课程 | 材料版本 | 本批教学范围 |
| --- | --- | --- |
| Hugging Face Agents Course | 当前公开课程，选smolagents路径 | 消息与状态、工具契约、循环与停止、上下文、框架实践、Agentic RAG、评测、完整资料助手 |
| Full Stack Deep Learning | 2022公开版原理 | 指标与成本、数据划分与版本、实验比较、训练调试、测试、服务排队、监控与标签延迟、发布与回滚 |

## 教学与图示

每讲先讲具体问题、先修和产出，再用一个算例展开原理，提供可运行代码、预测与修改条件的练习，以及换输入的独立验证。图示仅用于解释数据、状态或判断的因果；能够用文字或静态步骤图讲清的内容保持静态。

16个计算模型配有16种教学图示，默认共161步。读者默认进入讲解，步骤演示默认暂停；可以先预测再单步核对，也可以主动连续查看并暂停。图示、当前代码行和变量使用同一次真实计算轨迹；没有卡片入场、随机移动、循环跑箭头或持续脉冲。

- HF案例检查工具调用是否执行、证据是否有效、预算是否足够、未完成时为何没有答案。最新工具观测不被截掉；未执行的结果保持未知，不能画成0；只有真实加入背景后预算图才增加相应占用。
- FSDL案例计算阈值代价、分组泄漏、实验差异、批处理排队时间、延迟标签和回滚条件。划分前记录保持未分配；无正预测时精确率保持未定义；线上标签未到时不生成准确率。

## 接入与制作

配置位于 `config/application_hfagents.json` 与 `application_fsdl.json`，模型和图示分别位于 `web/application-*.js`；本地例程在 `examples/application-hfagents/` 与 `examples/application-fsdl/`。`scripts/integrate_application_draft.py` 校验稳定ID、来源及跨课连接，并将目录、未来路线单元和共享阅读器接在一起。

课程、地图、先修导航和新个人计划使用同一套8讲目录。原有前置练习保留在课程下方，已有个人计划、任务、回执和学习时长不重写。图示不自动完成任务、创建学习时长或宣称掌握。浏览器不调用真实LLM、执行任意Python或访问生产服务。

2026-11-08第二批交付时，完整学习版包含13门已整理课程、87讲配套课件；当前目录与讲数以最新build-info.json为准，另保留原有48个学习块和24节电路导学。公共构建的 `index.html` 和 `learning-map-courses-integrated.html` 相同，`standalone.html` 为同源单文件版。

```sh
python3 scripts/integrate_application_draft.py
python3 scripts/build_learning_app.py
# 先从项目源码构建三份旧交付入口所用的完整单文件stage：
python3 scripts/refresh_learning_delivery.py --repository-source
# 检查stage后再同步，逐个备份、核对并回读三个允许的交付文件：
python3 scripts/refresh_learning_delivery.py --publish
```

进入课程可使用 `?application=hfagents` 或 `?application=fsdl`，附 `&lesson=<讲次ID>` 进入讲解，附 `&inspect=1` 进入暂停的步骤核对。地图的总览、完整课程节点与首课入口均从实际课件读取讲数。

## 验证

两门新增课程26项模型与例程测试通过。HF的8个标准库例程、FSDL的8个标准库例程均实际运行。额外在独立临时环境实际运行 `smolagents==1.26.0` 的CodeAgent：它执行只读工具，使用固定ReplayModel，返回36、模型接口调用1次；未调用真实LLM。这项验证证明框架调用路径能运行，不证明模型自主规划效果。

交叉审阅对预算耗尽、永久故障、上下文占用、分组划分、独立梯度、服务尾批、金丝雀阈值和回滚做了独立复算；发现的摘录、未知结果和图示提前显示问题已修复。

完整Node测试242项、Python测试86项通过，覆盖既有课程、记录、长计划、备份与回执，以及新课目录和构建完整性。浏览器检查与截图保存在构建目录的 `batch2-qa/`；交付同步以 `delivery-publish-receipt.json` 的三份文件回读哈希为准。

最终拆分资源版与单文件交付版均完成浏览器验证：每份16讲在1440/390宽度下共128次教学面板访问、168帧图示/代码/变量对应和32次参数重算检查。默认暂停、连续查看与暂停、跨课草稿恢复、旧配套入口、两种地图入口以及原有基础课/AI/机器人课回归均通过，无运行错误或自动创建个人路线。FSDL阈值0.5与0.8的代价7/10对比及HF工具反馈截图已保存。两份 `learning-map-courses-integrated.html` 与原整合页已同步并回读为相同最终哈希，原文件均已备份。

原课与验证细节：

- [HF Agents Course来源与验证](application-hfagents-sources.md)
- [FSDL来源与验证](application-fsdl-sources.md)
