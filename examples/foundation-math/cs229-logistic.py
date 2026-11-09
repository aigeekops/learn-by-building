from math import exp,log1p,isclose
z,y = 2.0,1
prob = 1/(1+exp(-z))
def loss(z): return max(z,0)-y*z+log1p(exp(-abs(z)))
grad = prob-y
h = 1e-5
numeric = (loss(z+h)-loss(z-h))/(2*h)
assert isclose(grad,numeric,abs_tol=1e-8)
assert isclose(prob,0.8807970779778823)
print(prob,loss(z),grad,numeric)
