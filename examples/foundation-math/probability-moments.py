from math import isclose
values,mass = [0,2,4],[0.25,0.5,0.25]
mu = sum(x*p for x,p in zip(values,mass))
var = sum(p*(x-mu)**2 for x,p in zip(values,mass))
second = sum(p*x*x for x,p in zip(values,mass))
assert isclose(mu,2) and isclose(var,2)
assert isclose(var,second-mu*mu)
print(mu,var,second)
