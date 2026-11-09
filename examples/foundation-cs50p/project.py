"""Original practice project: report validated artificial distance records.

This program is a teaching scaffold. Choose and implement your own project
before considering the separate CS50P final project submission requirements.
"""
import argparse
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory


def parse_record(line):
    match = re.fullmatch(r"([A-Z]{2})-([0-9]{1,3})cm", line.strip())
    return {"sensor": match[1], "value": int(match[2])} if match else None


def summarize(records):
    count = len(records)
    total = sum(row["value"] for row in records)
    return {"count": count, "total": total, "mean": total / count if count else None}


def format_report(summary, errors):
    value = summary["mean"]
    mean = "NA" if value is None else str(int(value)) if float(value).is_integer() else str(value)
    return f"count={summary['count']}; total={summary['total']}; mean={mean}; errors={len(errors)}"


def build_report(lines, *, policy="skip", minimum=0):
    if policy not in {"skip", "strict"}:
        raise ValueError("unknown bad-line policy")
    records, errors = [], []
    for number, line in enumerate(lines, start=1):
        record = parse_record(line)
        if record is None:
            errors.append(number)
            if policy == "strict":
                return {"status": "aborted", "records": records, "summary": None,
                        "errors": errors, "report": None}
            continue
        if record["value"] >= minimum:
            records.append({**record, "line": number})
    summary = summarize(records)
    return {"status": "ok", "records": records, "summary": summary,
            "errors": errors, "report": format_report(summary, errors)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", help="UTF-8 input file; omitted: isolated demo")
    parser.add_argument("--policy", choices=["skip", "strict"], default="skip")
    parser.add_argument("--minimum", type=int, default=0)
    args = parser.parse_args(argv)
    try:
        if args.path:
            lines = Path(args.path).read_text(encoding="utf-8").splitlines()
        else:
            with TemporaryDirectory() as directory:
                path = Path(directory) / "readings.txt"
                path.write_text("AB-12cm\nbad\nCD-20cm\nAB-12cm\n", encoding="utf-8")
                lines = path.read_text(encoding="utf-8").splitlines()
        result = build_report(lines, policy=args.policy, minimum=args.minimum)
    except (OSError, UnicodeError) as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["status"] == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
