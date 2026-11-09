# CS50P 全部讲次主题与原创综合项目：来源和验证

新增材料核对：2026-11-09；既有 Week 0–6 保留 2026-11-08 的核对记录。使用官方当前公开版，不标成“2026 年度 CS50P”。本站现在有 11 讲：按 Week 0–9 的全部讲次主题组织十讲，再增加一讲原创综合项目；这是主题配套范围补齐，不代表逐字翻译、完成全部官方题集、独立完成官方个人项目或取得认证。

`config/foundation_cs50p.json` 保留原七个讲次 ID，增加 `cs50p-regex`、`cs50p-oop`、`cs50p-etcetera`、`cs50p-project`。`course.coverage` 按原课顺序逐项映射本站讲次，状态 `authored` 只表示内容已制作，不表示用户已经学习完成。每讲都有中文直觉、机制、完整例子、参数与状态对照、至少三项跟练、独立数值题、迁移任务及来源定位。

| 本站讲次 | 官方材料 | 核对位置 | 本站原创案例 |
| --- | --- | --- | --- |
| 1 变量与函数 | [Week 0 Notes](https://cs50.harvard.edu/python/notes/0/) | Variables、Creating Your Own Functions、Return Values | 读数乘增益再加偏移；实参、形参与返回值 |
| 2 条件与边界 | [Week 1 Notes](https://cs50.harvard.edu/python/notes/1/) | if、elif、else、比较与分支顺序 | 互斥分支与无效输入优先 |
| 3 循环与列表 | [Week 2 Notes](https://cs50.harvard.edu/python/notes/2/) | For Loops、list、range、len | 筛选、累计与空结果 |
| 4 异常与恢复 | [Week 3 Notes](https://cs50.harvard.edu/python/notes/3/) | ValueError、try、except、else | 固定 ASCII 文本转换和除零分流 |
| 5 库与接口 | [Week 4 Notes](https://cs50.harvard.edu/python/notes/4/) | Statistics、import、mean | 均值与中位数的不同响应 |
| 6 单元测试 | [Week 5 Notes](https://cs50.harvard.edu/python/notes/5/) | assert、AssertionError、pytest | 普通用例与边界用例的检出差异 |
| 7 文件读写 | [Week 6 Notes](https://cs50.harvard.edu/python/notes/6/) | open、with、CSV、逐行读取 | 追加与截断；真实临时文件重读 |
| 8 正则表达式 | [Week 7 Notes](https://cs50.harvard.edu/python/notes/7/) | 格式、量词、大小写、清理、提取 | ASCII 距离记录的全文匹配、子串查找与命名分组 |
| 9 面向对象 | [Week 8 Notes](https://cs50.harvard.edu/python/notes/8/) | 类、raise、property、类方法、静态方法、继承、运算符协议 | 对象别名与独立实例；属性写入先验证；校准方法 |
| 10 更多 Python | [Week 9 Notes](https://cs50.harvard.edu/python/notes/9/) | set、全局/常量、类型提示、文档、argparse、解包、map/filter、推导式、enumerate、生成器 | 按首次出现去重、按需消费及实际访问量 |
| 11 原创综合项目 | [Final Project](https://cs50.harvard.edu/python/project/) | 自主设计；main 和至少三个顶层函数；pytest 测试；依赖、说明、展示 | 人工记录报告器：解析、坏行策略、筛选、汇总与可复现交付 |

实际读取并核对新增四个官方网页正文与讲义目录；未声称核对完整视频字幕。公开版本、定位和核对日存于逐条来源元数据。材料只保留链接与原创说明，不复制整份课件或官方练习答案；没有进行官方提交、登录或认证操作。实际提交要求和期限以当时官方页面为准。

## 代码状态图示

11 个主模型由 `web/foundation-cs50p.js` 注册。新增四个模型用 `web/foundation-cs50p-extra-scenes.js` 绘制真实执行快照；该文件在 `foundation-coding-scenes.js` 之后加载，通过 `apply(S)` 扩展共享渲染器，旧场景与函数调用栈保持原接口。

- 正则图同时保留原文的可见转义、清理后文本、strip 开关、大小写及匹配范围，解释不同原文为何可能得到同一解析结果。没有将 JavaScript 正则宣传为任意 Python 正则解释器；只覆盖列明的 ASCII 输入与格式。
- 对象图分开显示 a、b、target 与对象 a/c 的指向。写入失败先拒绝，旧状态保留；独立实例不会因为名字变化而误更新 a。继承只复用规则，校准后的物理范围仍需另立合同。
- 迭代图按实际访问推进，生成器创建时没有扫描记录，take=0 不读取任何项。次数是教学操作计数，不是实测性能；已有迭代状态不自动重置。
- 项目图按实际行处理；strict 中止后没有成功汇总或报告，skip 保留错误行号。空集合均值为缺失，合法零值为零；相同文本的不同观测不会擅自去重。

图示默认使用共享阅读器的单步执行方式。它们无循环装饰效果，不自动增加学习分钟、写任务完成或证明掌握；页面不执行任意 Python、Shell 或网络请求。绘图只读取当前及此前的快照，未知模型安全返回空串。

## 可运行 Python 与项目练习

原创例程位于 `examples/foundation-cs50p/`，运行时只依赖 Python 标准库。新增讲义最后一节内嵌对应完整例程；真实文件读写使用隔离临时目录。运行命令和边界见该目录 README。

官方项目要求使用 pytest；本站 `test_project.py` 的四个顶层测试函数兼容 pytest，也能通过 `unittest.FunctionTestCase` 用标准库直接执行。当前制作环境没有 pytest，已实际执行标准库包装下的同一批断言，没有声称跑过 pytest 或完成官方项目验收。

## 本轮验证结果

执行 `node --test tests/foundation_cs50p.test.cjs`：**20 项通过，0 失败**。执行四个新增 Python 例程、`test_project.py` 与 Python 语法编译检查通过。

验证包括：

- 原七讲稳定 ID、课序与来源保留；新增四讲、官方主题覆盖清单、跨讲连接、模型 ID 一致。
- 11 个模型默认值、所有选项或滑块两端至少五步，代码行有效、快照独立，无非有限数。
- 11 段页面展示的完整 Python 程序均实际执行成功；旧七讲独立 Python oracle 保留。
- 新增 **218 组**独立 Python 对照：正则 56 组、对象 90 组、迭代 40 组、项目 32 组；逐项核对数值、状态、对象与记录结构，项目同时核对完整报告文本。
- 新增模型在每个控件选项或范围两端的全部 SVG 帧经 XML 解析，验证尺寸、可访问标题、模型/步骤标识、不变输入及无脚本/动画标签。
- 额外覆盖原型键查找、末尾换行原文保留、负值写入保留旧状态、生成器零消费、strict 不产生半份成功报告、合法零值与缺失均值分离。
- 真正运行 CLI 的错误范围、缺失文件和严格模式中止，退出状态分别为 2、2、1；项目四个纯函数/策略测试实际通过。

以上证明主题配套、有限模型和例程的当前行为；整体页面、地图同步和跨课回归由主集成任务另行验收。硬件、人工学习效果、官方完整作业与个人项目不在这些检查的证明范围内。
