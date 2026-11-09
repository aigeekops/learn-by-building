DOCUMENTS = [
    {"id": "sampling-v1", "tokens": ["采样", "周期"], "value": "10 ms"},
    {"id": "power-v1", "tokens": ["电源", "电压"], "value": "3.3 V"},
    {"id": "log-v1", "tokens": ["日志", "时间戳"], "value": "毫秒"},
]

def retrieve(question="sampling", budget=2, topk=2, threshold=.75):
    plan = {"sampling": [["采样", "频率"], ["采样", "周期"]],
            "power": [["电源", "电压"]], "unknown": [["电机", "速度"], ["转速", "上限"]]}
    expected = {"sampling": "sampling-v1", "power": "power-v1", "unknown": None}
    evidence, calls = [], 0
    for terms in plan[question][:budget]:
        calls += 1
        ranked = [dict(d, score=sum(t in d["tokens"] for t in terms)/len(terms)) for d in DOCUMENTS]
        ranked.sort(key=lambda d: (-d["score"], d["id"]))
        hits = [d for d in ranked if d["score"] >= threshold and d["score"] > 0][:topk]
        evidence = [d for d in hits if d["id"] == expected[question]]
        if evidence:
            break
    answer = [{"source": d["id"], "value": d["value"]} for d in evidence]
    return {"calls": calls, "evidenceCount": len(evidence),
            "answer": answer or [{"source": None, "value": "资料不足"}]}

if __name__ == "__main__":
    assert retrieve()["calls"] == 2
    assert retrieve(budget=1)["evidenceCount"] == 0
    assert retrieve("unknown", threshold=0)["evidenceCount"] == 0
    print(retrieve())
