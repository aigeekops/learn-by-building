from math import hypot
v = [1.0,1.0]
for k in range(3):
    v = [2*v[0], 0.5*v[1]]
    print(k+1,v)
assert v == [8,0.125]
u = [a/hypot(*v) for a in v]
assert abs(sum(a*a for a in u)-1)<1e-12
print(u)
