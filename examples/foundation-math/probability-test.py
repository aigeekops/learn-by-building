from math import comb,isclose
n,k = 10,9
mass = [comb(n,j)/2**n for j in range(n+1)]
pvalue = sum(v for j,v in enumerate(mass) if abs(j-5)>=abs(k-5))
assert isclose(pvalue,22/1024)
assert sum(v for j,v in enumerate(mass) if abs(j-5)>=0) == 1
assert isclose(sum(v for j,v in enumerate(mass) if abs(j-5)>=3),112/1024)
print(pvalue,pvalue<=0.05)
