from math import isclose
x,y = [1,2],[2,4]
w,rate = 0.0,0.2
for step in range(4):
    loss = sum((w*a-b)**2 for a,b in zip(x,y))/4
    gradient = sum(a*(w*a-b) for a,b in zip(x,y))/2
    new = w-rate*gradient
    print(step,w,loss,gradient,new)
    w = new
assert isclose(w,1.875)
assert isclose(sum((w*a-b)**2 for a,b in zip(x,y))/4,0.01953125)
