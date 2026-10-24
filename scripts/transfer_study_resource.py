#!/usr/bin/env python3
"""把一篇学习资料一键收进 learning-radar 的「学习资料」板块。

这是给「极客行动」公众号配套资料用的极简搬运工具：章节地图、读书笔记、
链接合集等。复制（或搬移）文件到 study-resources/<分类>/，并自动登记进
机器可读清单 study-resources/index.json（站内板块直接读它渲染）。

█ 最简用法（其余全自动）█
  # 只给文件，分类交互选，标题/文件名自动推断，默认复制不删源
  python3 scripts/transfer_study_resource.py ~/Desktop/chapter-map.md

  # 指定分类（最常用）
  python3 scripts/transfer_study_resource.py chapter-map.md --category robotics

  # 真正“搬走”源文件（删源）
  python3 scripts/transfer_study_resource.py chapter-map.md -m

  # 全自动不交互（脚本/CI 用）
  python3 scripts/transfer_study_resource.py chapter-map.md -c agent -y

  # 带标签（可多次 -T，站内卡片与详情都会显示）
  python3 scripts/transfer_study_resource.py chapter-map.md -c agent -T 软件开发 -y

推断规则：
  · slug（清单 id / 文件名）：取源文件名（去扩展名）做 slugify；纯中文文件名则原样保留
  · title（展示标题）：优先取文件首行 `# 一级标题`；否则用文件名（去连字符）
  · category（分类）：优先 --category；否则看路径含 agent/robotics 关键词；否则交互选
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STUDY = ROOT / "study-resources"
MANIFEST = STUDY / "index.json"
CATEGORIES = ("agent", "robotics")

# 中文分类名，交互时展示
CAT_LABEL = {"agent": "Agent 工程", "robotics": "机器人工程"}


def die(msg: str) -> "NoReturn":  # type: ignore[name-defined]
    print("error: " + msg, file=sys.stderr)
    sys.exit(2)


def ask(prompt: str, default: str = "") -> str:
    try:
        suf = f" [{default}]" if default else ""
        val = input(prompt + suf + " ").strip()
        return val or default
    except (EOFError, KeyboardInterrupt):
        print()
        die("已取消")


def load_manifest() -> dict:
    if MANIFEST.exists():
        try:
            data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            die(f"manifest 解析失败: {e}")
        if not isinstance(data, dict) or "resources" not in data or not isinstance(data["resources"], list):
            die("manifest 结构异常：缺少 resources 数组")
        return data
    return {"version": 1, "resources": []}


def save_manifest(data: dict) -> None:
    data["resources"].sort(key=lambda r: (r.get("category", ""), r.get("added", ""), r.get("id", "")))
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify(text: str) -> str:
    out = []
    for ch in text.strip().lower():
        if ch.isalnum() or ch in ("-", "_", "."):
            out.append(ch)
        elif ch.isspace():
            out.append("-")
        else:
            out.append("-")
    s = "".join(out)
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-") or ""


def infer_slug(stem: str) -> str:
    s = slugify(stem)
    # 纯中文文件名 slugify 后会变空，原样保留文件名（id 允许中文）
    return s or stem


def infer_title(src: Path, slug: str) -> str:
    try:
        head = src.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        head = ""
    for line in head.splitlines():
        line = line.strip()
        if line.startswith("# ") and len(line) > 2:
            return line[2:].strip()
    # 退而求其次：文件名去连字符
    return src.stem.replace("-", " ").replace("_", " ").strip() or slug


def infer_category(src: Path, explicit: str | None) -> str:
    if explicit:
        return explicit
    text = str(src).lower()
    if "robotics" in text:
        return "robotics"
    if "agent" in text:
        return "agent"
    # 交互选择
    print("选择分类：")
    for i, c in enumerate(CATEGORIES, 1):
        print(f"  {i}) {CAT_LABEL[c]} ({c})")
    choice = ask("请输入序号 / 直接回车默认 1", "1")
    try:
        idx = int(choice) - 1
        if 0 <= idx < len(CATEGORIES):
            return CATEGORIES[idx]
    except ValueError:
        pass
    # 允许直接输入 agent/robotics
    if choice in CATEGORIES:
        return choice
    return CATEGORIES[0]


def main() -> None:
    ap = argparse.ArgumentParser(
        description="一键把学习资料收进 learning-radar 的「学习资料」板块。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("source", type=Path, help="要收进来的源文件（章节地图 / 笔记 / 链接合集等）")
    ap.add_argument("-c", "--category", choices=CATEGORIES, help="分类：agent | robotics（省略则自动推断/交互选）")
    ap.add_argument("-s", "--slug", help="清单 id 与目标文件名（省略则从源文件名推断）")
    ap.add_argument("-t", "--title", help="展示标题（省略则从文件首行 # 标题 推断）")
    ap.add_argument("-n", "--note", help="备注，写进清单")
    ap.add_argument("-T", "--tag", action="append", metavar="TAG",
                    help="标签，可多次指定（如 -T 软件开发 -T 上下文工程）；省略则沿用已有标签")
    ap.add_argument("--source-article", help="来源文章路径（写进清单，便于回溯）")
    ap.add_argument("-m", "--move", action="store_true", help="搬移：复制后删除源文件")
    ap.add_argument("-f", "--force", action="store_true", help="目标已存在时覆盖")
    ap.add_argument("-y", "--yes", action="store_true", help="跳过所有交互确认（分类用默认、搬移不追问）")
    ap.add_argument("--dry", action="store_true", help="只预览，不写入")
    args = ap.parse_args()

    src = args.source.expanduser().resolve()
    if not src.is_file():
        die(f"源文件不存在: {src}")
    ext = src.suffix
    if not ext:
        die("源文件缺少扩展名，无法判断格式")
    fmt = ext.lstrip(".").lower()

    slug = args.slug or infer_slug(src.stem)
    title = args.title or infer_title(src, slug)
    category = infer_category(src, args.category)
    dest_dir = STUDY / category
    dest = dest_dir / f"{slug}{ext}"
    rel_file = f"{category}/{slug}{ext}"

    manifest = load_manifest()
    existing = next((r for r in manifest["resources"] if r.get("id") == slug), None)
    entry = {
        "id": slug,
        "category": category,
        "title": title,
        "file": rel_file,
        "format": fmt,
        "added": date.today().isoformat(),
    }
    if args.source_article:
        entry["source_article"] = args.source_article
    if args.note:
        entry["note"] = args.note
    tags = [t.strip() for t in (args.tag or []) if t.strip()]
    if tags:
        entry["tags"] = tags
    elif existing and existing.get("tags"):
        # 未指定新标签时不要抹掉已有标签
        entry["tags"] = existing["tags"]
    if existing:
        entry["added"] = existing.get("added", entry["added"])
        manifest["resources"] = [entry if r.get("id") == slug else r for r in manifest["resources"]]
    else:
        manifest["resources"].append(entry)

    print(f"源文件 : {src}")
    print(f"目标   : {dest}")
    print(f"分类   : {CAT_LABEL[category]} ({category})")
    print(f"标题   : {title}")
    if tags:
        print(f"标签   : {'、'.join(tags)}")
    print(f"清单   : 已登记 {rel_file}")
    if args.move:
        print("模式   : 搬移（复制后删除源文件）")
    if args.dry:
        print("[dry-run] 未写入任何文件。")
        return

    if dest.exists() and not args.force:
        if not args.yes and not ask(f"目标已存在 {dest.name}，覆盖？(y/N)", "N").lower().startswith("y"):
            die("已取消（用 --force 可强制覆盖）")
        print("覆盖已存在的目标文件。")

    # 搬移模式：删除源前再确认一次（除非 -y）
    if args.move and not args.yes:
        if not ask(f"确认删除源文件 {src.name}？(y/N)", "N").lower().startswith("y"):
            print("已改为「复制」模式（保留源文件）。")
            args.move = False

    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    save_manifest(manifest)
    print(f"已复制 : {src.name} -> {rel_file}")
    if args.move:
        try:
            src.unlink()
            print(f"已搬移 : 删除源文件 {src}")
        except OSError as e:
            print(f"warning: 复制成功但删除源文件失败: {e}", file=sys.stderr)
    print("完成。")


if __name__ == "__main__":
    main()
