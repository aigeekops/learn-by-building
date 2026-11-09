from math import comb, isclose
n,q = 4,0.5
mass = [comb(n,k)*q**k*(1-q)**(n-k) for k in range(n+1)]
assert isclose(sum(mass),1)
assert isclose(mass[2],0.375)
expectation = sum(k*v for k,v in enumerate(mass))
assert isclose(expectation,n*q)
print(mass,expectation)
