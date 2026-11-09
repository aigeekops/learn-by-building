import json

def predict(x, fixed=False):
    return int(x >= 0 if fixed else x > 0)

def audit(cases, fixed, data_valid=True, artifact_match=True):
    checks = [dict(x=x, expected=int(x >= 0), actual=predict(x, fixed)) for x in cases]
    selected = all(c['expected'] == c['actual'] for c in checks)
    independent = predict(0, fixed) == 1
    return dict(checks=checks, selectedTestsPass=selected,
                independentBoundaryPass=independent,
                releaseReady=data_valid and selected and independent and artifact_match)

assert audit([-2, 2], False)['selectedTestsPass']
assert not audit([-2, 2], False)['releaseReady']
result = audit([-1, 0, 1], False)
assert sum(c['expected'] != c['actual'] for c in result['checks']) == 1
assert audit([-1, 0, 1], True)['releaseReady']
assert not audit([-1, 0, 1], True, artifact_match=False)['releaseReady']
print(json.dumps(result))
