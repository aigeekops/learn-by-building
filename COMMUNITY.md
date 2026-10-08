# 一起学习与改进

这里欢迎初学者、使用者和开发者。不会写代码，也可以提问、指出某句话看不懂、报告链接失效，或分享一次小练习的结果。不需要把项目做完才参与。

## 选择参与入口

- **学习求助**：在 GitHub Discussions 的“学习求助”分类发帖，写明环境、课程或学习块、做到哪一步、期望、实际结果和已尝试的办法。不知道下一步怎么做也可以直接说。
- **作品分享**：在 Discussions 的“作品分享”分类介绍目标、复现步骤、真实结果与希望收到的反馈。失败记录和小练习同样有价值。
- **课程勘误**：使用 Issues 的“课程勘误”表单，报告错字、断链、解释不清、缺失先修或无法复现的步骤。
- **网站问题**：使用 Issues 的“网站问题”表单，报告页面、交互、保存和导航问题。
- **提交改进**：通过 Pull Request 提交文档、课程或代码修改。教学内容要交代“先修 → 操作 → 输出 → 排错 → 独立练习”，并提供与改动相关的测试证据。

## 提问与回答

提问时尽量让别人知道你已经做到哪一步；不确定的地方直接写“不确定”。没有尝试过排查也可以求助。不要把没运行的示例写成实测结果。

回答时先确认卡点，解释缺失的概念，再给出一个可以执行的小动作。用引导帮助对方推进，避免指责、嘲讽或用“太简单”“自己搜”打断学习。需要补信息时，说明这条信息有助于判断什么。

问题解决后，在原帖补充最终做法和结果。学习求助使用 Q&A 分类；提问者可以将有效回复标记为答案。Issue 由参与者补充解决证据，维护者核对后关闭。尚未解决的部分请保留说明。

## 公开前检查真实记录

只分享你愿意公开且有权公开的内容。计算、网页模拟、硬件实验、预期结果和待验证内容应明确区分；计划生成、日期到期和勾选任务不代表已经掌握。

截图、日志、代码和附件发布前请脱敏，移除姓名、联系方式、账号、密钥、访问令牌、内部地址及其他个人信息。不要上传 `data/` 数据库、备份文件或完整学习日志；用少量脱敏信息复现问题即可。

## 维护者连接 GitHub 社区

当前随项目提供的 `config/community.json` 为未连接状态：`repository` 为空，`discussions_enabled` 为 `false`。项目不会填入假仓库地址，也不会创建仓库、启用 Discussions 或自动发帖。配置开关只是本地设置，不会验证 GitHub 上的实际状态。

准备连接时：

1. 确定实际 GitHub 仓库，在仓库设置中启用 Issues 与 Discussions。
2. 创建两个 Discussion 分类：“学习求助”使用 Q&A 格式，分类 slug 必须为 `learning-help`；“作品分享”分类 slug 必须为 `show-and-tell`。可先用英文名创建后调整显示名，并在 GitHub 实际分类链接中核对 slug。
3. 将 `.github/DISCUSSION_TEMPLATE/learning-help.yml` 与 `show-and-tell.yml` 放入仓库**默认分支**；文件名必须匹配各自分类 slug。Issue 表单位于 `.github/ISSUE_TEMPLATE/`，PR 模板位于 `.github/PULL_REQUEST_TEMPLATE.md`，同样提交到默认分支。
4. 在 GitHub 实际打开两个分类和新建 Issue 页面，确认表单可见。模板文件存在不代表远程已经启用。
5. 将真实 `owner/repo` 或 `https://github.com/owner/repo` 填入网站社区设置；确认 Discussions 可用后再打开对应开关。

未连接仓库时，网站应说明尚未连接，并保留提问指南。已填写仓库但尚未启用 Discussions 时，可以使用已启用的 Issues 反馈课程和网站问题，也可以通过保留的空白 Issue 入口提问；学习求助与作品分享的 Discussion 入口需等待配置完成。打开 GitHub 后仍需你自己检查并提交内容，不会自动上传本地学习记录。

GitHub 官方说明：[创建 Discussion 表单](https://docs.github.com/en/discussions/managing-discussions-for-your-community/creating-discussion-category-forms)、[创建 Issue 模板](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)。
