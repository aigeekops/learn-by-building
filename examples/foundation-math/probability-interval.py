from math import sqrt, isclose
from statistics import NormalDist
sigma,n,mean = 2,16,0
se = sigma/sqrt(n)
z = NormalDist().inv_cdf(0.975)
interval = [mean-z*se,mean+z*se]
assert isclose(se,0.5)
assert isclose(z,1.959963984540054)
assert isclose(sigma/sqrt(64),se/2)
print(se,interval)
