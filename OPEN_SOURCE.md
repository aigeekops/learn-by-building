# 发布与维护清单

「动手学 · Learn by Building」是面向零基础的机器人与 AI Agent 学习工作台，可本地运行，源码仓库为 `learn-by-building`。

## 代码与内容

- Python 3.11+ 标准库、SQLite、原生 HTML/CSS/JavaScript，无前端构建和必需的付费模型服务。
- MIT 仅覆盖贡献者有权授权的代码与原创内容；第三方教材、课程、图片与商标保留各自权利，不因收录就转为 MIT。
- 两条学习路线感谢 Ronin 公开分享，保留原帖链接与出处；中文整理仅作顺序参考，原帖权利归原作者，不在 MIT 授权范围内。新增指南与实践卡为本站原创，不代表原作者背书，也不是作者已完成的实验记录。
- `config/roadmaps.json` 配置阶段与资源，`config/guides.json` 配置图文指南，`config/electronics_paths.json` 配置目标路线与优先级；无需改业务代码即可调整文字、学习顺序与链接。

## 数据边界

`data/`、`.env` 与虚拟环境不进入源码包。学习记录位于 SQLite 中，未保存的编辑、每日目标和专注计时位于当前浏览器。

```bash
python3 scripts/package_project.py --output /tmp/learn-by-building-source.tar.gz
```

`--with-data` 用于含运行数据的完整迁移，不作为源码分发包。

「学习记录备份与恢复」可迁移两条路线已保存的任务、时长、笔记与计划。恢复采用替换方式，先校验预览，再明确确认；服务会保留恢复前副本，数据变化后需重新预览。恢复前结束计时并关闭其他学习台页面。不包含浏览器草稿或每日目标；完整环境迁移仍需另外保留停止服务后的 `data/`。备份文件属于个人数据，不放入源码包。

## 验证与发布前检查

```bash
python3 -m unittest discover -s tests -v
node --test tests/*.test.cjs
python3 server.py
```

在桌面和390px手机宽度下检查：任务计划与计时、记录保存和刷新恢复、未保存编辑恢复、阶段关联、归档恢复、下一步转任务、交互电路与结果转笔记、复盘下载。

核对许可、归属与配置；验证全新空数据目录可以启动；检查源码包没有数据库与运行数据。

静态站点使用 `python3 scripts/build_static.py` 生成的 GitHub Pages 文件，个人记录和课程编辑留在各自浏览器，不部署 Python API。构建不含运行数据；源码打包也默认排除 `data/`。Python 服务用于本机个人使用。静态启动、备份和部署配置见 README。

## 模块入口

| 修改内容 | 入口 |
|---|---|
| 整站路线与数据归属 | `web/site-route.js` / `.css`、`radar/routes.py` |
| HTTP与本地静态文件 | `server.py` |
| 记录结构与导出 | `radar/journal.py` |
| 记录界面 | `web/journal.js`、`web/journal.css` |
| 学习任务与实际时长 | `radar/study.py`、`web/dashboard.js` |
| 图文与资源 | `config/guides.json`、`web/electronics-lab.js`、`web/electronics-lab.css` |
| 个性化短计划与打卡 | `radar/plans.py`、`web/personal-plan.js` |
| 初次设置、每日入口和记录备份恢复 | `web/workspace-tools.js`、`radar/backup.py` |
| 电子学习优先级与动态演示 | `config/electronics_paths.json`、`web/learning-paths.js`、`web/rc-lab.js` |
| 新增主题练习与理想模型 | `web/electronics-lessons.js`、`web/electronics-models.js` |
| 零基础步骤、术语与单位换算 | `config/electronics_beginner.json`、`web/electronics-beginner.js` / `.css` |
| 第一次点亮LED | `web/electronics-basics.js` |
