"""Multivariate Kalman, EKF range update and unscented-transform reproductions."""
import argparse
import json
import math


def transpose(A):return [list(x) for x in zip(*A)]
def multiply(A,B):return [[sum(a*b for a,b in zip(row,column)) for column in zip(*B)] for row in A]
def plus(A,B):return [[a+b for a,b in zip(row,other)] for row,other in zip(A,B)]
def mv(A,x):return [sum(a*b for a,b in zip(row,x)) for row in A]
def identity(n):return [[int(i==j) for j in range(n)] for i in range(n)]


def joseph(P,H,K,R):
    KH=multiply(K,H);A=[[int(i==j)-KH[i][j] for j in range(len(P))] for i in range(len(P))]
    return plus(multiply(A,multiply(P,transpose(A))),multiply(K,multiply(R,transpose(K))))


def state(dt=1,q=.2,r=.4):
    F=[[1,dt],[0,1]];P=identity(2);Q=[[q*dt**4/4,q*dt**3/2],[q*dt**3/2,q*dt**2]]
    predicted=mv(F,[0,1]);prior=plus(multiply(F,multiply(P,transpose(F))),Q)
    H=[[1,0]];S=prior[0][0]+r;K=[[prior[0][0]/S],[prior[1][0]/S]]
    updated=[a+k[0]*(1.2-predicted[0]) for a,k in zip(predicted,K)]
    return dict(predicted=predicted,predictedP=prior,K=[x[0] for x in K],state=updated,covariance=joseph(prior,H,K,[[r]]))


def covariance(rho=.6,z=2):
    P=[[4,2*rho],[2*rho,1]];K=[[4/5],[2*rho/5]]
    return dict(P=P,K=[row[0] for row in K],state=[row[0]*z for row in K],covariance=joseph(P,[[1,0]],K,[[1]]))


def tracking(r=.4,bias=0):
    F=[[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]];H=[[1,0,0,0],[0,1,0,0]]
    Q=[[.0125,0,.025,0],[0,.0125,0,.025],[.025,0,.05,0],[0,.025,0,.05]];R=[[r,0],[0,r]]
    P=[[1,.3,0,0],[.3,1,0,0],[0,0,1,0],[0,0,0,1]];x=[0,0,1,.5];samples=[]
    for k,(zx,zy) in enumerate([[1.2,.4],[1.9,1.2],[3.1,1.3],[3.8,2.2]]):
        predicted=mv(F,x);prior=plus(multiply(F,multiply(P,transpose(F))),Q)
        S=plus(multiply(H,multiply(prior,transpose(H))),R);a,b=S[0];c,d=S[1];det=a*d-b*c
        inverse=[[d/det,-b/det],[-c/det,a/det]];K=multiply(prior,multiply(transpose(H),inverse))
        innovation=[zx-predicted[0],zy+bias-predicted[1]];correction=mv(K,innovation);x=[a+b for a,b in zip(predicted,correction)]
        P=joseph(prior,H,K,R);samples.append(dict(t=k+1,state=x[:],P=[row[:] for row in P]))
    return dict(state=x,P=P,samples=samples)


def ekf(x=2,y=1,z=3,r=.2):
    distance=math.hypot(x,y);H=[[x/distance,y/distance]];S=1+r;K=[[h/S] for h in H[0]]
    updated=[v+k[0]*(z-distance) for v,k in zip([x,y],K)]
    P=joseph(identity(2),H,K,[[r]])
    return dict(predictedRange=distance,H=H[0],K=[row[0] for row in K],state=updated,covariance=P)


def unscented(mean=1,variance=.4):
    points=[mean,mean+math.sqrt(variance),mean-math.sqrt(variance)]
    transformed=[x*x for x in points];wm=[0,.5,.5];wc=[2,.5,.5]
    out_mean=sum(w*x for w,x in zip(wm,transformed));out_variance=sum(w*(x-out_mean)**2 for w,x in zip(wc,transformed))
    return dict(points=points,transformed=transformed,outputMean=out_mean,outputVariance=out_variance,
        exactMean=mean*mean+variance,exactVariance=2*variance**2+4*mean**2*variance)


def check():
    assert abs(state(q=0,r=1)['K'][1]-1/3)<1e-12
    assert abs(covariance(-.4)['state'][1]+.32)<1e-12
    assert abs(ekf(3,4,6,1)['H'][0]-.6)<1e-12
    assert abs(unscented(2,.5)['outputVariance']-8.5)<1e-12
    for case in [state(),covariance(),ekf()]:
        P=case['covariance'];assert abs(P[0][1]-P[1][0])<1e-12
        assert P[0][0]>0 and P[0][0]*P[1][1]-P[0][1]*P[1][0]>0
    assert len(tracking()['state'])==4


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('case',choices=['state','covariance','tracking','ekf','unscented'],nargs='?',default='state');args=parser.parse_args();check();print(json.dumps(dict(case=args.case,result=globals()[args.case](),independent_checks=True)))
