a = [[1, 1], [1, -1]]
x = [2, 1]
first = [x[0]*v for v in a[0]]
second = [x[1]*v for v in a[1]]
output = [u+v for u, v in zip(first, second)]
row_result = [x[0]+x[1], x[0]-x[1]]
assert output == row_result == [3, 1]
print(output, sum(v*v for v in output))
