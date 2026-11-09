"""Original reproducible issue and review packet, kept local and never sent."""
from __future__ import annotations

import argparse
import json


def make_packet(report="complete", scope="focused", rationale="why", feedback="actionable"):
    if report not in {"complete", "no-steps", "no-environment"}:
        raise ValueError("unknown report condition")
    values = [0, 2, -1]
    expected = sum(1 for value in values if value >= 0)
    actual = sum(1 for value in values if value > 0)
    material = {"environment": report != "no-environment", "steps": report != "no-steps",
                "expected": expected, "actual": actual}
    checks = {"reproducible": material["environment"] and material["steps"] and expected != actual,
              "focused": scope == "focused", "whyRecorded": rationale == "why", "actionable": feedback == "actionable"}
    missing = [key for key, passed in checks.items() if not passed]
    return {"input": values, "report": material, "checks": checks, "missing": missing,
            "ready": not missing, "external_messages": 0}


def self_test():
    good = make_packet()
    assert good["ready"] and good["report"]["expected"] == 2 and good["report"]["actual"] == 1
    assert make_packet(report="no-steps")["missing"] == ["reproducible"]
    assert make_packet(report="no-environment")["missing"] == ["reproducible"]
    assert make_packet(scope="mixed", rationale="what", feedback="vague")["missing"] == ["focused", "whyRecorded", "actionable"]
    assert make_packet(report="no-steps", rationale="what")["missing"] == ["reproducible", "whyRecorded"]
    assert all(make_packet(report=r)["external_messages"] == 0 for r in ["complete", "no-steps", "no-environment"])
    print("beyond: minimal reproduction, evidence gaps and focused review packet passed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    self_test() if args.self_test else print(json.dumps(make_packet(), ensure_ascii=False, indent=2))
