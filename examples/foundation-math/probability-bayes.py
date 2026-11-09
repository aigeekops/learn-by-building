from math import isclose
prior,sensitivity,false_positive = 0.1,0.9,0.1
a = prior*sensitivity
b = (1-prior)*false_positive
posterior = a/(a+b)
assert isclose(posterior,0.5)
assert isclose(a+b,0.18)
print(a,b,posterior)
