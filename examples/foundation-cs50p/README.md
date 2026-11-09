# CS50P 后半程：原创 Python 例程

这些标准库例程配套本站正则、对象、迭代和综合项目四讲；输入均为人工案例，不连接设备。综合项目是练习脚手架，学习者仍需独立选择自己的题目、设计、实现和验证。

从本目录运行：

```bash
python3 regex_demo.py
python3 oop_demo.py
python3 iteration_demo.py --minimum 10 --take 2
python3 project.py
python3 test_project.py
```

预期：正则示范解析出 `AB / 12`；对象别名示范校准和 `36`；迭代示范选中 `[12, 18]`，访问两项，总和 `30`；项目默认临时文件有四行，其中第 2 行格式错误，合法三行总和 `44`、均值 `44/3`，错误行清单 `[2]`。项目的默认文件创建在 `TemporaryDirectory`，读取完自动清理。

真实读取自己准备的 UTF-8 记录文件时：

```bash
python3 project.py readings.txt --minimum 10 --policy skip
python3 project.py readings.txt --minimum 10 --policy strict
```

记录格式是两位大写 ASCII 字母、连字符、1–3 位 ASCII 数字、`cm`，例如 `AB-12cm`；每行前后空白按合同清理。`skip` 保留错误行号继续，`strict` 遇到坏行即中止并返回退出状态 1，没有成功报告。缺失文件或非法 CLI 参数返回状态 2。空文件产生 0 条、总和 0、均值 `null`，合法 `AB-0cm` 则是实际零读数。不同文件行即使文本相同，也仍代表不同观测。

`test_project.py` 有四个 pytest 兼容的顶层测试函数，分别检查解析、汇总、报告格式与坏行策略；它也支持用标准库直接运行。当前制作机未安装 pytest，实际验证通过的是直接运行中的 `unittest.FunctionTestCase` 包装。已有 pytest 的独立开发环境可运行：

```bash
python3 -m pytest test_project.py
```

官方 Final Project 另有个人原创实现、至少三个函数的 pytest 测试、文档和展示等要求，请[对照原规范](https://cs50.harvard.edu/python/project/)。本站没有执行提交或认证，也不把运行此目录例程当作完成官方项目。
