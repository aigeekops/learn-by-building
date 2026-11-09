"""Three-dimensional rigid transforms, two-link dynamics and time scaling."""
import argparse
import json
import math


def multiply(A,B):
    return [[sum(a*b for a,b in zip(row,column)) for column in zip(*B)] for row in A]


def rotation(roll=30,pitch=45,yaw=60):
    a,b,c=map(math.radians,[roll,pitch,yaw])
    Rx=[[1,0,0],[0,math.cos(a),-math.sin(a)],[0,math.sin(a),math.cos(a)]]
    Ry=[[math.cos(b),0,math.sin(b)],[0,1,0],[-math.sin(b),0,math.cos(b)]]
    Rz=[[math.cos(c),-math.sin(c),0],[math.sin(c),math.cos(c),0],[0,0,1]]
    R=multiply(Rz,multiply(Ry,Rx));point=[[1],[2],[1]]
    out=multiply(R,point);restored=multiply(list(map(list,zip(*R))),out)
    assert max(abs(a[0]-b[0]) for a,b in zip(point,restored))<1e-12
    return dict(R=R,output=[v[0] for v in out],restored=[v[0] for v in restored])


def transform(yaw=90,translation=(1,0,.5)):
    a=math.radians(yaw);R=[[math.cos(a),-math.sin(a),0],[math.sin(a),math.cos(a),0],[0,0,1]]
    camera=[.2,0,.5];local=[1,0,0];body=[a+b for a,b in zip(camera,local)]
    rotated=[sum(a*b for a,b in zip(row,body)) for row in R]
    world=[a+b for a,b in zip(rotated,translation)]
    return dict(world=world,R=R)


def dynamics(q1=30,q2=45,acceleration=1,velocity=.5):
    a,b=map(math.radians,[q1,q2]);I=1/12
    M=[[2*I+.25+1.25+math.cos(b),I+.25+.5*math.cos(b)],[I+.25+.5*math.cos(b),I+.25]]
    C=[-1.5*math.sin(b)*velocity**2,.5*math.sin(b)*velocity**2]
    G=[1.5*9.81*math.cos(a)+.5*9.81*math.cos(a+b),.5*9.81*math.cos(a+b)]
    torque=[M[i][0]*acceleration+C[i]+G[i] for i in range(2)]
    det=M[0][0]*M[1][1]-M[0][1]**2
    assert det>0 and M[0][1]==M[1][0]
    return dict(M=M,C=C,G=G,torque=torque,determinant=det)


def trajectory(duration=2,target=90,quintic=True):
    rows=[]
    for i in range(13):
        u=i/12
        s=10*u**3-15*u**4+6*u**5 if quintic else 3*u**2-2*u**3
        ds=(30*u**2-60*u**3+30*u**4 if quintic else 6*u-6*u*u)/duration
        dds=(60*u-180*u*u+120*u**3 if quintic else 6-12*u)/duration**2
        rows.append(dict(t=u*duration,q=target*s,velocity=target*ds,acceleration=target*dds))
    return dict(samples=rows,peak_velocity=target*(1.875 if quintic else 1.5)/duration,
        peak_acceleration=target*(10/math.sqrt(3) if quintic else 6)/duration**2)


def check():
    assert abs(transform(0,(.5,1,1))['world'][0]-1.7)<1e-12
    assert abs(dynamics(0,0,0,0)['torque'][1]-4.905)<1e-12
    assert trajectory(2,60,False)['peak_velocity']==45
    assert abs(trajectory()['samples'][-1]['acceleration'])<1e-12
    rotation()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('case',choices=['rotation','transform','dynamics','trajectory'],nargs='?',default='rotation');args=parser.parse_args();check();print(json.dumps(dict(case=args.case,result=globals()[args.case](),independent_checks=True)))
