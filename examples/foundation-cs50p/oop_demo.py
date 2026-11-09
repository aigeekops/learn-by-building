"""Instances, validated properties, aliasing and inheritance with independent state."""
import json
import math


class Reading:
    def __init__(self, value):
        self.value = value

    @staticmethod
    def is_valid(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, candidate):
        if not self.is_valid(candidate):
            raise ValueError("expected a finite nonnegative reading")
        self._value = candidate

    @classmethod
    def from_text(cls, text):
        return cls(int(text))

    def __add__(self, other):
        if not isinstance(other, Reading):
            return NotImplemented
        return Reading(self.value + other.value)

    def __str__(self):
        return f"Reading({self.value})"


class OffsetReading(Reading):
    def corrected(self, offset):
        return self.value + offset


def simulate(initial=8, update=20, offset=2, reference="alias"):
    a, b = OffsetReading(initial), OffsetReading(12)
    target = a if reference == "alias" else OffsetReading(a.value)
    status = "ok"
    try:
        target.value = update
    except ValueError:
        status = "ValueError"
    corrected = [a.corrected(offset), b.corrected(offset)]
    return {"a": a.value, "b": b.value, "target": target.value,
            "targetId": "a" if reference == "alias" else "c", "status": status,
            "corrected": corrected, "total": sum(corrected)}


def main():
    assert simulate()["total"] == 36
    assert simulate(reference="copy")["total"] == 24
    assert simulate(update=-1)["a"] == 8
    assert Reading.from_text("7").value == 7
    assert (Reading(2) + Reading(3)).value == 5
    assert not Reading.is_valid(True)
    assert not Reading.is_valid(float("nan"))
    print(json.dumps(simulate(), ensure_ascii=False))


if __name__ == "__main__":
    main()
