from math import isclose
n,k = 10,7
estimate = k/n
candidates = [0.2,0.5,0.7,0.9]
likelihood = [q**k*(1-q)**(n-k) for q in candidates]
best = candidates[max(range(len(candidates)),key=likelihood.__getitem__)]
assert isclose(estimate,0.7) and best == 0.7
assert 0/10 == 0 and 10/10 == 1
print(estimate,list(zip(candidates,likelihood)))
