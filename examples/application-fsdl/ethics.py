import json
rows={'A':[(0.9,1),(0.7,0),(0.6,1),(0.1,0)],'B':[(0.8,1),(0.5,1),(0.4,0),(0.2,0)]}
audit={}
for group,samples in rows.items():
    fp=sum(score>=0.5 and label==0 for score,label in samples)
    negatives=sum(label==0 for _,label in samples)
    fn=sum(score<0.5 and label==1 for score,label in samples)
    positives=sum(label==1 for _,label in samples)
    audit[group]=dict(fpr=fp/negatives if negatives else None,fnr=fn/positives if positives else None,n=len(samples))
assert audit['A']['fpr']==0.5 and audit['B']['fpr']==0
print(json.dumps(audit))
