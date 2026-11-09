import json
from pathlib import Path
from tempfile import TemporaryDirectory

def project(directory, question="sampling", fault="once", budget=2, replay="same"):
    values = {"sampling": ("sampling-v1", "10 ms"), "power": ("power-v1", "3.3 V")}
    calls, evidence = 0, None
    while calls < budget and evidence is None:
        calls += 1
        failed = fault == "permanent" or fault == "once" and calls == 1
        if not failed:
            evidence = values.get(question, (None, "资料不足"))
    answer = None if evidence is None else evidence[1]
    completed = answer is not None
    path = Path(directory) / "run-1.json"
    if completed:
        path.write_text(json.dumps({"question": question, "answer": answer, "source": evidence[0]}), encoding="utf-8")
    repeated = question if replay == "same" else "changed-question"
    cached = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    replay_status = "not_committed" if cached is None else "replayed" if cached["question"] == repeated else "conflict"
    return {"completed": completed, "calls": calls, "answer": answer,
            "source": evidence[0] if evidence else None, "replayStatus": replay_status,
            "replayedAnswer": cached["answer"] if replay_status == "replayed" else None}

if __name__ == "__main__":
    with TemporaryDirectory() as directory:
        result = project(directory)
        assert result["calls"] == 2 and result["replayedAnswer"] == "10 ms"
        assert len(list(Path(directory).glob("*.json"))) == 1
        print(result)
    with TemporaryDirectory() as directory:
        assert project(directory, replay="conflict")["replayStatus"] == "conflict"
    with TemporaryDirectory() as directory:
        assert project(directory, fault="permanent")["completed"] is False
