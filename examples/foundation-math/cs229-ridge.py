from math import isclose
x,y = [1,2],[2,4]
lam = 1
xx = sum(a*a for a in x)
xy = sum(a*b for a,b in zip(x,y))
w = xy/(xx+lam)
fit = sum((w*a-b)**2 for a,b in zip(x,y))/2
penalty = lam*w*w/2
assert isclose(w,5/3)
assert abs(xx*w-xy+lam*w)<1e-12
assert xy/(xx+5) == 1
print(w,fit,penalty)
