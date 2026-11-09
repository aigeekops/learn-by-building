#!/usr/bin/env python3
"""Planar transform and 2R kinematics, Python 3 standard library only.

All lengths are metres, CLI angles are degrees. No joint limits or collision
checks are included. This is a calculation, not a robot execution result.
Use --check to run hand-derived special cases.
"""
import argparse
import json
import math


def finite(value):
    value=float(value)
    if not math.isfinite(value):
        raise argparse.ArgumentTypeError("需要有限数值")
    return value


def transform(x=1,y=0,angle=90,tx=1,ty=0.5):
    c=math.cos(math.radians(angle));s=math.sin(math.radians(angle))
    rx=c*x-s*y;ry=s*x+c*y
    return {"rotated_m":[rx,ry],"world_m":[rx+tx,ry+ty],
            "recovered_local_m":[c*rx+s*ry,-s*rx+c*ry]}


def fk(l1=1,l2=0.8,theta1=30,theta2=60):
    if min(l1,l2)<=0:
        raise ValueError("杆长必须为正")
    a=math.radians(theta1);b=math.radians(theta2)
    elbow=[l1*math.cos(a),l1*math.sin(a)]
    tip=[elbow[0]+l2*math.cos(a+b),elbow[1]+l2*math.sin(a+b)]
    determinant=l1*l2*math.sin(b)
    return {"elbow_m":elbow,"tip_m":tip,"determinant_m2":determinant,
            "singular":abs(determinant)<1e-10}


def ik(l1=1,l2=1,x=1,y=1):
    if min(l1,l2)<=0:
        raise ValueError("杆长必须为正")
    radius=math.hypot(x,y);inner=abs(l1-l2);outer=l1+l2
    if radius<inner-1e-12 or radius>outer+1e-12:
        return {"reachable":False,"solution_count":0,"solutions":[]}
    if radius<1e-12 and abs(l1-l2)<1e-12:
        return {"reachable":True,"solution_count":"无穷多","singular":True,
                "representative_angles_deg":[0,180],
                "condition":"θ₂=180°，θ₁任意（按角度模360°计）"}
    cosine=(x*x+y*y-l1*l1-l2*l2)/(2*l1*l2)
    magnitude=math.acos(max(-1,min(1,cosine)))
    signs=(1,) if abs(math.sin(magnitude))<1e-10 else (1,-1)
    solutions=[]
    for sign in signs:
        b=sign*magnitude
        a=math.atan2(y,x)-math.atan2(l2*math.sin(b),l1+l2*math.cos(b))
        angles=[math.degrees(a),math.degrees(b)]
        forward=fk(l1,l2,*angles)
        solutions.append({"angles_deg":angles,"tip_m":forward["tip_m"],
                          "residual_m":math.hypot(forward["tip_m"][0]-x,forward["tip_m"][1]-y),
                          "singular":forward["singular"]})
    return {"reachable":True,"solution_count":len(solutions),"solutions":solutions}


def check():
    def near(actual,expected):
        assert math.isclose(actual,expected,abs_tol=1e-10)
    t=transform(0,2,90,1,-1)
    near(t["world_m"][0],-1);near(t["world_m"][1],-1)
    f=fk(1,0.5,90,-90)
    near(f["tip_m"][0],0.5);near(f["tip_m"][1],1)
    inverse=ik(1,1,0,1)
    assert inverse["solution_count"]==2
    near(inverse["solutions"][0]["angles_deg"][1],120)
    near(inverse["solutions"][0]["angles_deg"][0],30)
    assert ik(1,1,3,0)["reachable"] is False
    assert ik(2,0.5,0.5,0)["reachable"] is False
    assert ik(1,1,2,0)["solution_count"]==1
    assert ik(1,1,0,0)["solution_count"]=="无穷多"
    assert ik(2,1,1,0)["solutions"][0]["singular"] is True
    return {"checks":12,"status":"passed","evidence_type":"calculation"}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check",action="store_true")
    sub=parser.add_subparsers(dest="command")
    p=sub.add_parser("transform")
    for key,default in (("x",1),("y",0),("angle",90),("tx",1),("ty",0.5)):
        p.add_argument("--"+key,type=finite,default=default)
    p=sub.add_parser("fk")
    for key,default in (("l1",1),("l2",0.8),("theta1",30),("theta2",60)):
        p.add_argument("--"+key,type=finite,default=default)
    p=sub.add_parser("ik")
    for key,default in (("l1",1),("l2",1),("x",1),("y",1)):
        p.add_argument("--"+key,type=finite,default=default)
    args=vars(parser.parse_args());do_check=args.pop("check");command=args.pop("command")
    if do_check:
        result=check()
    elif command:
        try:
            result={"transform":transform,"fk":fk,"ik":ik}[command](**args)
        except ValueError as error:
            parser.error(str(error))
    else:
        parser.error("请选择 transform、fk、ik 或 --check")
    print(json.dumps(result,ensure_ascii=False,allow_nan=False,indent=2))


if __name__=="__main__":
    main()
