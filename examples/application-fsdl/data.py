import hashlib
import json
from statistics import mean

rows = [dict(id=f'r{i}', group='AABBCC'[i], x=x, y=int(x >= 5))
        for i, x in enumerate([0, 2, 4, 6, 8, 10])]
# Freeze canonical bytes so the same dataset can be identified again.
payload = json.dumps(rows, sort_keys=True, separators=(',', ':')).encode()
manifest = dict(revision=0, sha256=hashlib.sha256(payload).hexdigest())
train = [row for row in rows if row['group'] != 'C']
validation = [row for row in rows if row['group'] == 'C']
center = mean(row['x'] for row in train)
validation_x = [row['x'] - center for row in validation]
overlap = {row['group'] for row in train} & {row['group'] for row in validation}
assert center == 3 and validation_x == [5, 7] and not overlap
row_train, row_validation = rows[::2], rows[1::2]
assert len({r['group'] for r in row_train} & {r['group'] for r in row_validation}) == 3
print(json.dumps(dict(manifest=manifest, center=center, validationX=validation_x)))
