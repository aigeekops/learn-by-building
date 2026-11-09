# Missing Semester 剩余主题：原创本地例程

使用 Python 3.11+ 标准库，不安装依赖。所有材料是公开虚构数据，不执行外部消息、网络部署或真实 LLM 调用。

```sh
python3 examples/foundation-missing/shipping.py --self-test
python3 examples/foundation-missing/agentic.py --self-test
python3 examples/foundation-missing/beyond.py --self-test
```

- `shipping.py`：在自动清理的临时目录构建 zipapp，按允许清单检查内容，把同一产物复制到接收目录，回读 SHA-256 后实际执行。缺入口或混入不允许文件时阻止运行，结果保持未执行。摘要用于核对同一产物；不声称两次独立构建字节完全相同。
- `agentic.py`：固定读取、原测试、编辑、新测试、评审顺序；真实执行内存中的布尔函数，区分预算耗尽、权限拒绝、弱测试漏错和规格不明。`llm_called` 始终为 `False`。
- `beyond.py`：用 `[0,2,-1]` 复现零读数漏计，生成供本地审阅的材料检查结果。条件只适用于这个案例，不评价个人能力、不向任何服务提交。

去掉 `--self-test` 可查看默认案例的 JSON 结果。网页使用相同教学条件的 JavaScript 状态模型；网页播放不执行这些 Python 文件，实际运行结果应由学习者另行保存。
