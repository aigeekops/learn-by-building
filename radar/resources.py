"""Build the study-resources bundle (index + file contents) for both the static
build and the local server.

The catalog lives in ``study-resources/index.json``; each listed file's text is
embedded so the front end needs no extra fetch and the static site stays
self-contained.
"""
from __future__ import annotations

from pathlib import Path


def build(root) -> dict:
    base = Path(root) / "study-resources"
    index = base / "index.json"
    if not index.is_file():
        return {"version": 1, "resources": []}
    import json

    try:
        data = json.loads(index.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"version": 1, "resources": []}
    resources = []
    for entry in data.get("resources", []):
        rel = entry.get("file", "")
        dest = (base / rel).resolve()
        base_resolved = base.resolve()
        # Path-traversal guard: every file must live inside study-resources/.
        if dest != base_resolved and base_resolved not in dest.parents:
            continue
        item = dict(entry)
        if dest.is_file():
            item["content"] = dest.read_text(encoding="utf-8")
        resources.append(item)
    return {"version": data.get("version", 1), "resources": resources}
