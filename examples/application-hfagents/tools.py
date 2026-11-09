def lookup(limit=2, name="lookup", fault="none"):
    registered = name == "lookup"
    valid = registered and type(limit) is int and 1 <= limit <= 3
    if not valid:
        return {"executed": False, "usable": False, "count": 0, "error": "contract"}
    if fault == "timeout":
        return {"executed": True, "usable": False, "count": 0, "error": "timeout"}
    documents = ["sampling-v1", "power-v1", "log-v1"]
    rows = documents[:limit]
    return {"executed": True, "usable": True, "count": len(rows), "error": None}

if __name__ == "__main__":
    assert lookup()["count"] == 2
    assert lookup(0)["executed"] is False
    assert lookup(True)["error"] == "contract"
    assert lookup(2, "delete")["executed"] is False
    assert lookup(2, fault="timeout")["error"] == "timeout"
    print(lookup())
