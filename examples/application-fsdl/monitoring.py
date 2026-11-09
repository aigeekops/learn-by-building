import json
from fractions import Fraction

baseline, current = [80, 20], [50, 50]
reference = [Fraction(n, sum(baseline)) for n in baseline]
observed = [Fraction(n, sum(current)) for n in current]
tv = sum(abs(a - b) for a, b in zip(reference, observed)) / 2
assert tv == Fraction(3, 10)
drift_alert = tv >= Fraction(1, 5)

def quality(feedback):
    return sum(feedback) / len(feedback) if feedback else None

assert quality(None) is None
assert quality([0, 1, 0, 0, 1, 1, 0, 1]) == 0.5
print(json.dumps(dict(totalVariation=float(tv), driftAlert=drift_alert,
                      feedback=None, errorRate=quality(None))))
