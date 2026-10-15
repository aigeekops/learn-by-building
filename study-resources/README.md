# 学习资料库 · Study Resources

> 公众号「极客行动」每篇文章附带的**免费学习资料**集中存放处：章节地图、读书笔记、精选链接合集等。
> 按方向分两类：**Agent 工程**（`agent/`）与**机器人工程**（`robotics/`）。

这些资料是文章的「配套包」，和 `config/`、`web/` 里的课程内容一样随仓库分发（MIT 仅覆盖本站原创整理，第三方教材/图书各自保留权利）。

站点侧栏已提供「学习资料」页面（`#resources`）：按方向分类浏览资料卡，点开直接渲染章节地图等 Markdown 正文（内置零依赖 Markdown 渲染，无需额外依赖）。数据来自 `index.json` + 各资源正文，构建时由 `scripts/build_static.py` 烤进 `public-config.json`，本地服务端由 `server.py` 一并吐出。

## 目录约定

```
study-resources/
├── index.json          # 机器可读清单（未来 app 内板块直接读它）
├── README.md
├── agent/              # Agent / LLM 工程相关资料
└── robotics/           # 机器人工程相关资料
```

- 每个资料一个文件，放进对应分类目录。
- 每条都在 `index.json` 登记：`id` / `category` / `title` / `file` / `format` / `added`，可选 `source_article` / `note`。

## 怎么加一个新资料（一键转移）

不用手敲 JSON，把文件丢给脚本就行——**分类、标题、文件名全自动推断**，日常只需给个路径：

```bash
# 最简：只给文件，分类交互选，标题/文件名自动推断，默认复制不删源
python3 scripts/transfer_study_resource.py ~/Desktop/chapter-map.md

# 指定分类（最常用）
python3 scripts/transfer_study_resource.py chapter-map.md -c robotics

# 真正“搬走”源文件（复制后删源）
python3 scripts/transfer_study_resource.py chapter-map.md -m

# 全自动不交互（脚本 / CI 用）
python3 scripts/transfer_study_resource.py chapter-map.md -c agent -y
```

推断规则（都不用你填）：

- **slug / 文件名**：取源文件名（去扩展名）自动规整；纯中文文件名则原样保留
- **title 展示标题**：优先取文件首行 `# 一级标题`，否则用文件名（去连字符）
- **category 分类**：优先 `-c` 参数；否则看路径里含 `agent`/`robotics` 关键词；都没有就交互让你选

参数速查：

- 位置参数 `source` 源文件（必填，其余都可选）
- `-c/--category` `agent` | `robotics`
- `-m/--move` 复制后删除源文件（默认只复制，不动源）
- `-y/--yes` 跳过所有交互确认（分类用默认、搬移不追问）
- `-f/--force` 覆盖已存在目标；`--dry` 只预览不写入
- `-s/--slug` `-t/--title` `-n/--note` `--source-article` 想手动覆盖推断值时才用

## 版权边界

- ✅ 放得进来的：**你自己整理的衍生作品**（章节地图、笔记、习题答案、链接合集），以及**明确开源/免费授权**的材料。
- ⚠️ 不放：受版权保护的商业书全文 PDF。用「正版购买链接 + 你的笔记」替代；若原书本身免费（如 arXiv 预印本），链接到官方页面即可，不要托管整本扫描件。

## 当前收录

| 方向 | 资料 | 说明 |
|---|---|---|
| Agent | 《Agentic Large Language Models》全书章节地图 | 原书 arXiv:2610.13455，472 页 / 23 章；本文件为章节结构衍生整理，非原书正文 |
