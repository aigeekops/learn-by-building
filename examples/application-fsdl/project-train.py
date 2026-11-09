import math,json
X=[[-1.,-1.],[-1.,-0.5],[1.,0.5],[1.,1.]]; Y=[0.,0.,1.,1.]
w=[0.,0.]; b=0.; history=[]
for epoch in range(4):
    probs=[1/(1+math.exp(-(sum(a*c for a,c in zip(w,x))+b))) for x in X]
    errors=[p-y for p,y in zip(probs,Y)]
    gradient=[sum(e*x[j] for e,x in zip(errors,X))/len(X) for j in range(2)]
    w=[a-0.3*g for a,g in zip(w,gradient)]; b-=0.3*sum(errors)/len(X)
    history.append(dict(epoch=epoch+1,w=w[:],b=b))
assert w[0]>0 and w[1]>0
print(json.dumps(history))
# 完整项目：python examples/application-fsdl/full_project.py --output /tmp/lbb-fsdl-project
