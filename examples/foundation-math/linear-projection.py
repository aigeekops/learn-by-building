def project(a, b):
    denominator = sum(x*x for x in a)
    if denominator == 0: return None
    c = sum(x*y for x,y in zip(a,b))/denominator
    point = [c*x for x in a]
    residual = [x-y for x,y in zip(b,point)]
    assert abs(sum(x*y for x,y in zip(a,residual))) < 1e-12
    return c, point, residual
assert project([1,1], [2,0]) == (1, [1,1], [1,-1])
assert project([0,0], [2,0]) is None
print(project([1,1], [2,0]))
