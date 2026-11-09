def controlled_fixture(quantity=3, unit_price=12, allow=True):
    # This standalone calculation is the expected result, not a framework imitation.
    def count_items(category):
        if category != "sensors":
            raise ValueError("unknown category")
        return quantity
    registry = {"count_items": count_items} if allow else {}
    if "count_items" not in registry:
        return {"allowed": False, "toolCount": None, "amount": None, "answer": None}
    n = registry["count_items"]("sensors")
    amount = n * unit_price
    return {"allowed": True, "toolCount": n, "amount": amount,
            "answer": {"amount": amount, "source": "inventory-fixture"}}

if __name__ == "__main__":
    assert controlled_fixture()["amount"] == 36
    assert controlled_fixture(4, 7)["amount"] == 28
    assert controlled_fixture(allow=False)["answer"] is None
    print(controlled_fixture())
