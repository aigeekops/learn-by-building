def solve(kind):
    row2 = [1, -1, 0] if kind == 'unique' else [2, 2, 4 if kind == 'many' else 5]
    first = [1, 1, 2]
    factor = row2[0]/first[0]
    reduced = [a-factor*b for a,b in zip(row2, first)]
    status = 'unique' if reduced[1] else 'many' if reduced[2] == 0 else 'none'
    return status, reduced
assert solve('unique') == ('unique', [0, -2, -2])
assert solve('many') == ('many', [0, 0, 0])
assert solve('none') == ('none', [0, 0, 1])
print({k: solve(k) for k in ['unique', 'many', 'none']})
