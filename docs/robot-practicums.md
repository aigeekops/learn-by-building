# 首批机器人跨站实训

2026-11-13：在既有课程下加入两条原创实训，不增加重复课程或计划讲次。

用户反馈交互复杂后，主界面已改为“做一次观察 → 记下发现”：只需一句预测和一段实际结果与原因。资料、数值日志、独立迁移、完整 BOM 审核和导出放在默认收起的“更多”中，按需要使用。没有关联个人路线时，主按钮保存本浏览器草稿；已有路线时保存学习记录。旧草稿的观察与解释合并显示，原字段和已有记录继续保留。

短记录只描述这次观察。SO-101 未做完 18 行审核时标为局部资料观察，不能被标为完整 BOM 验收；完整逐行审核仍可选做，来源、数量单位与未知项校验继续保留。

| 实训 | 课程入口 | 直接位置 | 记录类型 |
| --- | --- | --- | --- |
| 坐标与关节＋实验记录 | 坐标、运动学与动力学 `modern` | `#learn/projects/robot-coordinates` | calculation，运动学计算观察 |
| SO-101 装配资料＋BOM 审核 | 机械设计与制造 `mit2007`、LeRobot `lerobot` | `#learn/projects/so101-bom-audit` | reading，资料审核 |

项目实践提供同样的入口。教学仍覆盖预测、实验、观察、解释，独立迁移作为继续练习。实训有自己的逐路线浏览器草稿；用户明确提交后，使用现有 journal 接口保存观察、实际已审项目和文件摘要。保存不完成任务、不增加时长，重复提交更新同一记录，保留记录接口原有的并发检查。任务明确归属实训关联课程，不借用当前无关课程。

Robot Radar 地址在实训页中设置，仅保留在本浏览器。当前已知公开地址 `https://aigeekops.github.io/learn-by-building/` 是学习站，不能用作实验站。未提供新版 Radar 地址时，实验链接明确不可用，官方固定版本资料与报告功能仍可使用。链接保留站点子路径，定位机型、模式和相关连杆；不发送接口请求或同步进度。

## 资料基线

- G1 Mode 10 与 Go2：Unitree `unitree_ros` 提交 `725b59b6de39a26c425632120c89f23c49a36f1e`。23 / 12 个独立转动关节的元数据和源 URDF SHA-256 来自已审核 Robot Radar provenance；配置中保留完整出处。Viewer 额外的整体展示变换不能误当源世界坐标。
- SO-101：SO-ARM100 `a758567c3978dfeefe282ede0500085a48fe8f78`，单 follower / Waveshare / 7.4V STS3215 C001。装配文字来自 LeRobot `e6ffde60312365c5452c46189a26872483943154`。参考表是 11 类打印件、7 类采购项；USB 与夹具保留包单位，紧固件总数保持未知。许可来源分别链接，不将上游材料改称本项目原创或统一 MIT。
- 参考元数据文件：`config/robot_practicums.json`。不复制模型网格、制造 STL、整份文档或个人记录。

## 导入、报告与边界

运动学实验接受 schemaVersion=1、固定 robotId/sourceCommit、字符串 program 和 trace；仅检查，不执行、不请求导入地址。检查时间、有限数值、源关节和限位；空 trace 只是模板。手工观察允许以具体数值、截图和文件依据提交。BOM 导入仅核对版本与参考内容，不自动填审核状态。差异和未知均是有效审核结果，但必须写依据与影响。

JSON 下载保留完整导入资料和人工记录。学习记录保存摘要、审核表、导入文件名与可用时的 SHA-256；浏览器草稿不是备份附件，需另存下载文件及截图。报告检查只校验填写与格式，不认证理解、实际制造、供电、校准、接触抓取或实机安全。

## 构建与验证

接入器随 `refresh_learning_delivery.py` 的统一流水线执行，因此完整站、根入口、副本与单文件离线版均包含实训。原有课程身份、讲次、计划、记录命名空间和计时接口不改。

```sh
node --test tests/robot_practicums.test.cjs tests/learning_app_navigation.test.cjs tests/learning_app_records.test.cjs tests/learning_app_focus.test.cjs
python3 -m unittest discover -s tests -p test_learning_app_build.py -v
python3 scripts/build_static.py
```

浏览器回归脚本 `qa/robot_practicums.cjs` 使用隔离数据，覆盖 HTTP/离线、桌面/手机、深链接与刷新、草稿保留、导入检查、报告、记录重复提交、任务归属和时长不变。验证结果记录于交付回执，不把测试数据作为学习成果。
