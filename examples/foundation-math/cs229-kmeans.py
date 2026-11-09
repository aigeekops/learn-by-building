from math import isclose
points,centers = [0,1,9,10],[0.0,10.0]
for step in range(2):
    groups = [0 if abs(x-centers[0])<=abs(x-centers[1]) else 1 for x in points]
    next_centers = []
    for j,old in enumerate(centers):
        group = [x for x,c in zip(points,groups) if c == j]
        next_centers.append(sum(group)/len(group) if group else old)
    centers = next_centers
    sse = sum((x-centers[c])**2 for x,c in zip(points,groups))
    print(step,groups,centers,sse)
assert centers == [0.5,9.5] and isclose(sse,1)
