import json
x=[1.,2.]; encoder=[[1.,0.],[0.,0.5]]; head=[0.5,-0.5]
dot=lambda a,b:sum(v*w for v,w in zip(a,b))
features=[dot(row,x) for row in encoder]
error=dot(head,features)-1
gradient=[error*h for h in features]
new_head=[w-0.1*g for w,g in zip(head,gradient)]
after=dot(new_head,features)
assert new_head==[0.6,-0.4] and abs(after-0.2)<1e-12
assert encoder==[[1.,0.],[0.,0.5]]
print(json.dumps(dict(features=features,new_head=new_head,prediction=after)))
