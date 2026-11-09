import json

def run(rate, epochs, validation_target=1.5):
    w, history = 0.0, []
    for epoch in range(1, epochs + 1):
        w -= rate * 2 * (w - 2)
        history.append(dict(epoch=epoch, w=w))
    return dict(rate=rate, data='train-v1', validation='val-v1',
                history=history, w=w, train_loss=(w - 2) ** 2,
                val_loss=(w - validation_target) ** 2)

runs = [run(0.1, 3), run(0.2, 3)]
assert abs(runs[0]['w'] - 0.976) < 1e-12
assert abs(runs[1]['w'] - 1.568) < 1e-12
assert runs[0]['validation'] == runs[1]['validation']
winner = min(range(2), key=lambda i: (runs[i]['val_loss'], i))
assert winner == 1
# Compare on one fixed held-out validation version before choosing an artifact.
print(json.dumps(dict(runs=runs, winner=['A', 'B'][winner])))
