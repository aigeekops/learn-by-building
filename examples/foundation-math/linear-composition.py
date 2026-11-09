def rotate(v): return [-v[1], v[0]]
def scale(v, s): return [s*v[0], v[1]]
x = [1, 1]
rs = rotate(scale(x, 2))
sr = scale(rotate(x), 2)
assert rs == [-1, 2] and sr == [-2, 1]
assert rotate(scale(x, 1)) == scale(rotate(x), 1)
print(rs, sr)
