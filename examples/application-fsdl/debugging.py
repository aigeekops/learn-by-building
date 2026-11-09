import json
from statistics import mean

xs, ys = [1, 2], [2, 4]
def half_mse(w):
    return mean((w * x - y) ** 2 for x, y in zip(xs, ys)) / 2

w, rate = 0.0, 0.1
errors = [w * x - y for x, y in zip(xs, ys)]
contributions = [x * error for x, error in zip(xs, errors)]
gradient = mean(contributions)
eps = 1e-5
numerical = (half_mse(w + eps) - half_mse(w - eps)) / (2 * eps)
assert abs(gradient - numerical) < 1e-8
assert abs(sum(contributions) - numerical) > 1  # Deliberate reduction defect.
next_w = w - rate * gradient
assert next_w == 0.5 and half_mse(next_w) == 2.8125
print(json.dumps(dict(loss=half_mse(w), gradient=gradient, numerical=numerical,
                      nextWeight=next_w, nextLoss=half_mse(next_w))))
