from math import sqrt,isclose
points = [[-2,-2],[-1,-1],[1,1],[2,2]]
center = [sum(x[j] for x in points)/4 for j in range(2)]
x = [[v-center[j] for j,v in enumerate(row)] for row in points]
cov = [[sum(row[i]*row[j] for row in x)/4 for j in range(2)] for i in range(2)]
u = [1/sqrt(2),1/sqrt(2)]
scores = [sum(a*b for a,b in zip(row,u)) for row in x]
variance = sum(v*v for v in scores)/4
ratio = variance/(cov[0][0]+cov[1][1])
assert cov == [[2.5,2.5],[2.5,2.5]]
assert isclose(variance,5) and isclose(ratio,1)
print(cov,scores,variance,ratio)
