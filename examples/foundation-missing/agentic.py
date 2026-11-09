"""Fixed teaching decisions and actual in-memory checks; no model or external tool."""
from __future__ import annotations

import argparse
import json


def run_case(budget=5, permission=True, candidate="fixed", suite="boundary", explicit=True):
    if isinstance(budget, bool) or not isinstance(budget, int) or budget < 0:
        raise ValueError("budget must be a nonnegative integer")
    if candidate not in {"fixed", "unchanged"} or suite not in {"boundary", "normal"}:
        raise ValueError("unknown teaching choice")
    code = "x > 0"
    writes = 0
    events = []
    observations = {"before": None, "after": None, "review": None}
    status = "running"
    for action in ["read", "test-before", "edit", "test-after", "review"]:
        if len(events) == budget:
            status = "budget-exhausted"
            break
        if action == "read":
            result = {"code": code, "explicit": explicit, "permission": permission}
        elif action in {"test-before", "test-after"}:
            values = [0, -1, 3] if suite == "boundary" else [1, 5]
            accept = (lambda x: x >= 0) if code == "x >= 0" else (lambda x: x > 0)
            cases = [{"x": x, "expected": x >= 0, "actual": accept(x)} for x in values]
            result = {"cases": cases, "passed": all(item["expected"] == item["actual"] for item in cases)}
            observations["before" if action == "test-before" else "after"] = result
        elif action == "edit":
            if not permission:
                result = {"error": "permission-denied"}
            else:
                code = "x >= 0" if candidate == "fixed" else "x > 0"
                writes += 1
                result = {"code": code, "writes": writes}
        else:
            observations["review"] = ("needs-spec" if not explicit else
                                      "tests-failed" if not observations["after"]["passed"] else
                                      "boundary-failed" if code != "x >= 0" else "pass")
            result = {"review": observations["review"]}
        events.append({"action": action, "result": result})
        if "error" in result:
            status = result["error"]
            break
    if status == "running":
        status = "checked-example" if observations["review"] == "pass" else observations["review"] or "needs-review"
    return {"status": status, "calls": len(events), "writes": writes, "source": code,
            "events": events, "observations": observations, "llm_called": False}


def self_test():
    good = run_case()
    assert good["status"] == "checked-example" and good["calls"] == 5 and good["writes"] == 1
    assert run_case(budget=3)["observations"]["after"] is None
    assert run_case(budget=3)["status"] == "budget-exhausted"
    refused = run_case(permission=False)
    assert refused["writes"] == 0 and refused["observations"]["after"] is None
    assert refused["status"] == "permission-denied"
    assert run_case(candidate="unchanged", suite="normal")["status"] == "boundary-failed"
    assert run_case(candidate="unchanged")["status"] == "tests-failed"
    assert run_case(explicit=False)["status"] == "needs-spec"
    assert run_case(budget=0)["calls"] == 0
    print("agentic: budget, refusal, weak tests, failure and explicit specification passed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    self_test() if args.self_test else print(json.dumps(run_case(), ensure_ascii=False, indent=2))
