# CS50P 与 Missing Semester 补齐

制作日期：2026-11-09。两名课程 agent 分别制作，独立审阅 agent 交叉核对，主任务接入课程页面、地图、个人路线与网站构建。

| 课程 | 当前配套 | 本次新增 |
| --- | --- | --- |
| CS50P | 11讲：Week 0–9 主题与一个本站原创综合项目 | 正则、面向对象、Et Cetera、原创记录报告器 |
| Missing Semester | 9讲，逐项对应2026公开版九个主题 | 打包交付、Agentic Coding、Beyond the Code |

这是依据官方材料编排的原创中文配套教学。主题对应不等于逐字翻译、完整原课作业答案或官方项目认证。原有讲次 ID 与顺序保留；Missing Semester 的原课主题顺序通过对应表呈现，避免重排已有学习记录。

## 页面与开发入口

课程目录保留一个主操作和完整讲次列表，新增“官方主题对应与课程范围”，可从原课主题直接进入本站课件。每讲沿用通俗讲解、执行过程、动手练习、来源四个面板，支持代码与变量左右对照、单步、暂停、参数重算、草稿恢复及练习导出。图示默认暂停，展示本次真实计算出的状态。

新增独立场景在基础图示模块后加载：`web/foundation-cs50p-extra-scenes.js` 与 `web/foundation-missing-extra-scenes.js`；Node 端使用 `require(path)(FoundationCodingScenes)`。浏览器与命令行使用同一模型和图示契约。

`scripts/integrate_foundation_draft.py` 校验官方主题到本站讲次的对应，并为未来个人路线接入完整单元与预计用时。已有逐讲编排值保留，新讲可提供明确估计，否则沿用课程编排基准。这些数值只用于排课，不是官方课时或用户已学习时长。

```sh
python3 scripts/build_learning_app.py --serve
python3 scripts/build_static.py
python3 scripts/refresh_learning_delivery.py --repository-source --output <新的交付目录>
```

源码、拆分资源站点和离线交付使用同一构建入口；不依赖桌面原型目录。交付同步使用 `refresh_learning_delivery.py --publish`，检查构建后并发修改、备份旧文件并回读校验。

## 已执行的内容核对

- 四份课程与共享回归共51项通过，包含全部20个编程/工程模型的逐帧SVG、控件端点、异常分支、来源对应及旧讲次位置。
- 作者实际执行CS50P的218组Python对照；独立审阅另核对368组组合，覆盖Python正则、对象别名、生成器、报告字符串、打包条件、Agent预算/权限与协作材料。
- 综合项目4个测试函数已由标准库执行。制作环境没有pytest；没有把未运行的pytest命令标作通过。
- Missing Semester九份本地例程实际运行，新增打包例程真实构建zipapp、复制后核对SHA-256，并从独立接收目录启动。
- 错误路径保留未取得的结果：预算耗尽不产生修改后测试结果；拒绝写入不显示成功；项目严格模式遇坏行不输出部分成功报告。

本轮构建、浏览器验收和发布回执保存在PAM的 `output/foundation-completion-20261109/`。浏览器脚本为 `qa/foundation_completion.cjs`，覆盖桌面1440与手机390、拆分资源与单文件、地图总览与展开模式、参数、代码高亮、练习和草稿；使用独立临时浏览器，不读取个人数据。

详细官方材料定位与例程见 [CS50P来源](foundation-cs50p-sources.md)、[Missing Semester来源](foundation-missing-sources.md)；可运行文件位于 `examples/foundation-cs50p/` 与 `examples/foundation-missing/`。
