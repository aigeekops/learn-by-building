import json
def decide(valid_manifest,passed_offline,errors):
    eligible=valid_manifest and passed_offline
    rate=errors/20 if eligible else None
    rollback=eligible and rate>0.05
    return dict(rate=rate,active='candidate' if eligible and not rollback else 'baseline',rollback=rollback)
assert decide(True,True,2)['rollback']
assert not decide(True,True,1)['rollback']
assert decide(False,True,0)['rate'] is None
print(json.dumps(decide(True,True,2)))
# 真正HTTP与回滚：python examples/application-fsdl/full_project.py --output /tmp/lbb-fsdl-project
