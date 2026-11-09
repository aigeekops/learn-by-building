import json

def evaluate(threshold, fp_cost=2, fn_cost=5):
    rows = [(0.9, 1), (0.75, 0), (0.6, 1), (0.45, 0), (0.3, 1), (0.1, 0)]
    tp = fp = fn = tn = 0
    for score, label in rows:
        predicted = score >= threshold
        if predicted and label: tp += 1
        elif predicted: fp += 1
        elif label: fn += 1
        else: tn += 1
    return dict(tp=tp, fp=fp, fn=fn, tn=tn,
                precision=tp / (tp + fp) if tp + fp else None,
                recall=tp / (tp + fn), accuracy=(tp + tn) / len(rows),
                penalty=fp * fp_cost + fn * fn_cost)

result = evaluate(0.5)
assert (result['tp'], result['fp'], result['fn'], result['tn']) == (2, 1, 1, 2)
assert result['penalty'] == 7
assert evaluate(0.8)['penalty'] == 10
print(json.dumps(result, sort_keys=True))
