"""pytest-compatible test functions; also runnable using the standard library."""
from project import build_report, format_report, parse_record, summarize


def test_parse_record():
    assert parse_record("AB-000cm") == {"sensor": "AB", "value": 0}
    assert parse_record(" AB-12cm ")["value"] == 12
    for line in ["AB-1000cm", "prefix AB-12cm", "ab-12cm", "AB-1.2cm", "bad"]:
        assert parse_record(line) is None


def test_summarize():
    assert summarize([]) == {"count": 0, "total": 0, "mean": None}
    assert summarize([{"value": 0}, {"value": 20}]) == {"count": 2, "total": 20, "mean": 10}


def test_format_report():
    report = format_report({"count": 0, "total": 0, "mean": None}, [2])
    assert report == "count=0; total=0; mean=NA; errors=1"


def test_build_report_policies():
    lines = ["AB-12cm", "bad", "CD-20cm", "AB-12cm"]
    skip = build_report(lines)
    assert skip["summary"] == {"count": 3, "total": 44, "mean": 44 / 3}
    assert skip["errors"] == [2]
    assert [r["line"] for r in skip["records"]] == [1, 3, 4]
    strict = build_report(lines, policy="strict")
    assert strict["status"] == "aborted"
    assert strict["summary"] is None and strict["report"] is None
    assert build_report(["bad"])["summary"]["mean"] is None
    assert build_report(["AB-12cm", "CD-20cm"], minimum=15)["summary"]["total"] == 20


if __name__ == "__main__":
    import unittest
    suite = unittest.TestSuite(unittest.FunctionTestCase(test) for test in
                               [test_parse_record, test_summarize, test_format_report, test_build_report_policies])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
