x, y = [0,1,2], [1,2,2]
mx, my = sum(x)/3, sum(y)/3
w = sum((a-mx)*(b-my) for a,b in zip(x,y))/sum((a-mx)**2 for a in x)
b = my-w*mx
prediction = [b+w*a for a in x]
r = [a-b for a,b in zip(y,prediction)]
sse = sum(a*a for a in r)
assert abs(w-0.5)<1e-12 and abs(b-7/6)<1e-12
assert abs(sum(r))<1e-12 and abs(sum(a*b for a,b in zip(x,r)))<1e-12
assert abs(sse-1/6)<1e-12
print(w,b,prediction,r,sse)
