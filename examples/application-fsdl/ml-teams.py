import json
tasks=[('specification',1,[],True),('labels',2,['specification'],False),('training',2,['labels'],True),('evaluation',1,['training'],True),('release',1,['evaluation'],True)]
result={}
for name,days,dependencies,owner in tasks:
    blocked=not owner or any(result[d]['finish'] is None for d in dependencies)
    start=None if blocked else max([0]+[result[d]['finish'] for d in dependencies])
    result[name]=dict(start=start,finish=None if blocked else start+days)
assert result['specification']['finish']==1
assert result['release']['finish'] is None
print(json.dumps(result))
