"""Reproduce derivative filtering, bounded PD tuning and two-rate cascade control."""
import argparse
import json


def derivative(noise=.1,tau=.2,kd=1):
    dt=.1;alpha=tau/(tau+dt);previous=0;filtered=0;rows=[]
    for k in range(16):
        measurement=.2*k*dt+noise*(1 if k%2==0 else -1)
        raw=0 if k==0 else -kd*(measurement-previous)/dt
        filtered=0 if k==0 else alpha*filtered+(1-alpha)*raw
        rows.append(dict(t=k*dt,measurement=measurement,raw=raw,filtered=filtered));previous=measurement
    return dict(alpha=alpha,samples=rows)


def tuning(kp=2,kd=1.5,limit=3):
    dt=.05;position=velocity=0;rows=[]
    for k in range(80):
        u=max(-limit,min(limit,kp*(1-position)-kd*velocity))
        velocity+=dt*(u-.4*velocity);position+=dt*velocity
        rows.append(dict(t=(k+1)*dt,position=position,velocity=velocity,u=u))
    return dict(samples=rows,overshoot=max(0,max(x['position'] for x in rows)-1))


def cascade(outer=1.5,inner=3,disturbance=.4):
    dt=.02;position=velocity=reference=0;rows=[]
    for k in range(150):
        if k%5==0:reference=max(-1,min(1,outer*(1-position)))
        load=disturbance if k*dt>=1 else 0
        u=max(-2,min(2,inner*(reference-velocity)))
        velocity+=dt*(u-velocity-load)/.3;position+=dt*velocity
        rows.append(dict(t=(k+1)*dt,position=position,velocity=velocity,reference=reference,u=u,load=load))
    return dict(samples=rows,outer_updates=30)


def check():
    assert abs(derivative(tau=.3)['alpha']-.75)<1e-12
    assert all(row['raw']==row['filtered'] for row in derivative(tau=0)['samples'])
    assert abs(tuning()['samples'][0]['position']-.005)<1e-12
    assert len(cascade()['samples'])==150
    assert all(abs(row['u'])<=2 for row in cascade()['samples'])


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('case',choices=['derivative','tuning','cascade'],nargs='?',default='derivative');args=parser.parse_args();check();print(json.dumps(dict(case=args.case,result=globals()[args.case](),independent_checks=True)))
