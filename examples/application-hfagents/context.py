def pack(window=65, reserve=20, memory="summary"):
    input_budget = window - reserve
    required = [("system", 12), ("task", 8), ("constraint", 6),
                ("memory", 24 if memory == "full" else 10)]
    required_cost = sum(cost for _, cost in required)
    fits = required_cost <= input_budget
    selected = list(required) if fits else []
    if fits and required_cost + 12 <= input_budget:
        selected.append(("optional", 12))
    used = sum(cost for _, cost in selected)
    return {"inputBudget": input_budget, "requiredCost": required_cost,
            "used": used, "remaining": input_budget-used, "selected": selected,
            "status": "ready" if fits else "refuse_missing_required"}

if __name__ == "__main__":
    assert pack()["used"] == 36
    assert pack(memory="full")["status"] == "refuse_missing_required"
    assert pack(90, 10, "full")["used"] == 62
    print(pack())
