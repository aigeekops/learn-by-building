"""Import resource directories from user-supplied Ronin translations, offline.

Usage: python3 scripts/import_roadmap_resources.py --agent ARTICLE --robotics ARTICLE
Preserves curated projects. Does not copy article bodies or contact any service.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r"(?<!!)\[([^\]]+)\]\((https?://[^\s)]+)\)")


def extract(text):
    starts = list(re.finditer(r"(?m)^## 第[一二三四五六]个月：(.+)$", text))
    if len(starts) != 6:
        raise ValueError("Expected exactly six month sections")
    stages = []
    for i, match in enumerate(starts):
        body = text[match.end():starts[i+1].start() if i < 5 else len(text)]
        body = re.split(r"(?m)^## ", body)[0]
        group, resources, seen = "参考入口", [], set()
        topics = []
        for line in body.splitlines():
            if line.startswith("### ") or line.startswith("#### "):
                group = re.sub(r"^#+\s+", "", line)
                if line.startswith("### ") and "阶段目标" not in group:
                    topics.append(group)
            for title, url in LINK.findall(line):
                # Preserve the same URL under different learning topics.
                key = (group, title, url)
                if key not in seen:
                    seen.add(key)
                    resources.append(dict(title=title, url=url, section=group,
                                          origin="原文资源", verified=False))
        stages.append(dict(name=match.group(1), topics=topics, resources=resources))
    return stages


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", required=True, type=Path)
    parser.add_argument("--robotics", required=True, type=Path)
    args = parser.parse_args()
    dest = ROOT / "config/roadmaps.json"
    roads = json.loads(dest.read_text())
    for road in roads:
        content = getattr(args, road["id"]).read_text()
        extracted = extract(content)
        for stage, imported in zip(road["stages"], extracted, strict=True):
            stage.update(imported)
            for resource in stage["resources"]:
                if "19 小时" in resource["title"]:
                    resource["note"] = "原文与终端课程链接重复，待核实；优先使用 FastAPI 官方教程。"
        road["source"]["translation_sha256"] = hashlib.sha256(content.encode()).hexdigest()
    dest.write_text(json.dumps(roads, ensure_ascii=False, indent=2) + "\n")
    print({r["id"]: sum(len(s["resources"]) for s in r["stages"]) for r in roads})


if __name__ == "__main__":
    main()
