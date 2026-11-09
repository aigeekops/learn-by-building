"""Bounded ASCII record parsing; this is an original example, not an assignment solution."""
import json
import re

PATTERN = r"(?P<sensor>[A-Z]{2})-(?P<value>[0-9]{1,3})cm"


def parse_record(raw, *, clean=True, ignore_case=True, mode="full"):
    text = raw.strip() if clean else raw
    flags = re.IGNORECASE if ignore_case else 0
    match = (re.fullmatch if mode == "full" else re.search)(PATTERN, text, flags)
    return {
        "raw": raw, "text": text, "matched": match is not None,
        "sensor": match.group("sensor").upper() if match else None,
        "value": int(match.group("value")) if match else None,
    }


def main():
    assert parse_record("ZZ-007cm")["value"] == 7
    assert parse_record("AB-0cm")["value"] == 0
    assert not parse_record("prefix AB-12cm suffix")["matched"]
    assert parse_record("prefix AB-12cm suffix", mode="search")["matched"]
    assert not parse_record("AB-12cm\n", clean=False)["matched"]
    assert not parse_record("AB-1234cm")["matched"]
    assert not parse_record("ab-012cm", ignore_case=False)["matched"]
    print(json.dumps(parse_record(" ab-012cm "), ensure_ascii=False))


if __name__ == "__main__":
    main()
