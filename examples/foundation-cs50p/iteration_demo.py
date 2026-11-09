"""Sets and lazy evaluation. Counts are operation counts, not timings."""
import argparse
from itertools import islice
import json

READINGS = [12, 18, 12, 26]


def unique_above(values, minimum, metrics):
    """Yield (zero-based index, value), keeping the first occurrence."""
    seen = set()
    for index, value in enumerate(values):
        metrics["visited"] += 1
        if value < minimum or value in seen:
            continue
        seen.add(value)
        yield {"index": index, "value": value}


def summarize(minimum: int = 10, take: int = 3, strategy: str = "lazy") -> dict:
    """Type hints document expected input; validate at the actual interface."""
    if take < 0 or take > 4:
        raise ValueError("take must be between 0 and 4")
    metrics = {"visited": 0}
    stream = unique_above(READINGS, minimum, metrics)
    if strategy == "eager":
        selected = list(stream)[:take]
    elif strategy == "lazy":
        selected = list(islice(stream, take))
    else:
        raise ValueError("unknown strategy")
    return {"visited": metrics["visited"], "selected": selected,
            "total": sum(row["value"] for row in selected)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum", type=int, default=10)
    parser.add_argument("--take", type=int, choices=range(5), default=3)
    parser.add_argument("--strategy", choices=["lazy", "eager"], default="lazy")
    args = parser.parse_args(argv)
    assert summarize(take=0)["visited"] == 0
    assert summarize(take=0, strategy="eager")["visited"] == 4
    assert summarize(take=1)["visited"] == 1
    assert summarize(minimum=30)["total"] == 0
    stream = unique_above(READINGS, 10, {"visited": 0})
    assert len(list(stream)) == 3
    assert list(stream) == []
    print(json.dumps(summarize(args.minimum, args.take, args.strategy)))


if __name__ == "__main__":
    main()
