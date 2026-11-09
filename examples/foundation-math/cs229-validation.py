from math import isclose
train_x,train_y = [0,1,2],[0,1,0]
valid_x,valid_y = [0.5,1.5],[0.4,0.4]
models = {'constant':lambda x:1/3,'curve':lambda x:x*(2-x)}
def mse(f,x,y): return sum((f(a)-b)**2 for a,b in zip(x,y))/len(x)
scores = {name:(mse(f,train_x,train_y),mse(f,valid_x,valid_y)) for name,f in models.items()}
assert isclose(scores['curve'][0],0)
assert isclose(scores['curve'][1],0.1225)
assert isclose(scores['constant'][1],1/225)
assert min(scores,key=lambda n:scores[n][1]) == 'constant'
print(scores)
