import re

def evaluate(version="baseline", normalize="units", threshold=.75):
    cases = [("10", "10 ms", "sampling-v1"), ("3.3", "3.3", "power-v1"),
             ("资料不足", "资料不足" if version == "repaired" else "5", None),
             ("42", "42" if version == "repaired" else None,
              "fixture-42" if version == "repaired" else None)]
    def clean(s):
        return re.sub(r"\s*(?:ms|V)$", "", s.strip()).strip() if normalize == "units" else s
    correct = 0
    for gold, predicted, source in cases:
        equal = predicted is not None and clean(predicted) == clean(gold)
        grounded = predicted == "资料不足" or source is not None
        correct += int(equal and grounded)
    accuracy = correct / len(cases)  # Timeouts remain in the denominator.
    return {"correct": correct, "total": len(cases), "accuracy": accuracy, "gate": accuracy >= threshold}

if __name__ == "__main__":
    assert evaluate()["accuracy"] == .5
    assert evaluate(normalize="strict")["accuracy"] == .25
    assert evaluate("repaired")["accuracy"] == 1
    print(evaluate())
