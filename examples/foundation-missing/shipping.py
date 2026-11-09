"""Build and verify an original stdlib-only zipapp in disposable directories."""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipapp
import zipfile

ALLOWED = {"__main__.py", "sensorlib.py", "README.md", "VERSION"}
SOURCES = {
    "__main__.py": "from sensorlib import total\nprint(total([0, 2, -1]))\n",
    "sensorlib.py": "def total(values):\n    return sum(x for x in values if x >= 0)\n",
    "README.md": "Run python report.pyz; Python >=3.11; expected output: 2\n",
    "VERSION": "1.3.0\n",
    ".env": "NOT_A_SECRET=teaching-only\n",
    "notes.txt": "Private development notes are not part of the artifact.\n",
}


def build_case(root: Path, mode: str = "complete") -> dict:
    source = root / "source"
    source.mkdir(parents=True)
    for name, content in SOURCES.items():
        (source / name).write_text(content, encoding="utf-8")
    selected = ALLOWED.copy()
    if mode == "missing-entry":
        selected.remove("__main__.py")
    elif mode == "includes-secret":
        selected.add(".env")
    elif mode != "complete":
        raise ValueError("Unknown bounded teaching case")
    artifact = root / "report.pyz"
    zipapp.create_archive(source, artifact, filter=lambda item: item.as_posix() in selected)
    with zipfile.ZipFile(artifact) as package:
        names = sorted(package.namelist())
    entry_ok = "__main__.py" in names
    public_only = set(names) <= ALLOWED
    receiver = root / "receiver"
    receiver.mkdir()
    copied = receiver / "report.pyz"
    shutil.copyfile(artifact, copied)
    digest = sha256(artifact.read_bytes()).hexdigest()
    same_artifact = sha256(copied.read_bytes()).hexdigest() == digest
    # Only public, structurally valid artifacts are run. A failed gate is not a run result.
    result = None
    if entry_ok and public_only:
        process = subprocess.run([sys.executable, str(copied)], cwd=receiver, capture_output=True, text=True, timeout=10)
        result = {"returncode": process.returncode, "stdout": process.stdout, "stderr": process.stderr}
    return {"files": names, "entry_ok": entry_ok, "public_only": public_only,
            "sha256": digest, "copy_readback_matches": same_artifact,
            "runtime": sys.version.split()[0], "executed": result is not None, "result": result}


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="lbb-shipping-") as folder:
        root = Path(folder)
        good = build_case(root / "good")
        assert set(good["files"]) == ALLOWED
        assert good["copy_readback_matches"]
        assert good["result"]["returncode"] == 0
        assert good["result"]["stdout"] == "2\n"
        for mode, failed in [("missing-entry", "entry_ok"), ("includes-secret", "public_only")]:
            bad = build_case(root / mode, mode)
            assert not bad[failed]
            assert bad["result"] is None and not bad["executed"]
        assert not (root / "good" / "receiver" / "sensorlib.py").exists()
    print("shipping: 3 artifact cases and receiver execution passed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        with tempfile.TemporaryDirectory(prefix="lbb-shipping-") as directory:
            print(json.dumps(build_case(Path(directory)), ensure_ascii=False, indent=2))
