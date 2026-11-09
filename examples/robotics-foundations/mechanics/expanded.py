"""Independent standard-library reproduction of the three design lessons."""
import argparse
import json
import math


def beam(length=100,width=30,thickness=3,force=10):
    inertia=width*thickness**3/12
    stress=force*length*(thickness/2)/inertia
    deflection=force*length**3/(3*70000*inertia)
    return dict(inertia=inertia,stress=stress,deflection=deflection,pass_model=stress<=60 and deflection<=1)


def datums(spacing=40,tolerance=.1,hole=4.6,bolt=4):
    clearance=(hole-.1-bolt)/2
    return dict(centers=[[10,15],[10+spacing,15]],worst_spacing_error=2*tolerance,
        radial_clearance=clearance,guaranteed_1d=clearance>=tolerance)


def design(mass=2,acceleration=.4,radius=.05,ratio=4,thickness=3):
    force=mass*(acceleration+.03*9.81)
    torque=force*radius/2
    available=.03*ratio*.8
    speed=600/ratio*2*math.pi*radius/60
    bracket=beam(60,30,thickness,mass*9.81/2)
    return dict(force=force,required_torque=torque,available_torque=available,speed=speed,
        bracket=bracket,pass_model=available>=torque and speed>=.5 and bracket['pass_model'])


def check():
    assert abs(beam(120,30,4,10)['stress']-15)<1e-12
    assert abs(beam(thickness=6)['deflection']*8-beam()['deflection'])<1e-12
    assert abs(datums(tolerance=.15)['worst_spacing_error']-.3)<1e-12
    assert not datums(tolerance=.3,hole=4.2)['guaranteed_1d']
    assert abs(design(mass=3)['required_torque']-.0520725)<1e-12
    assert not design(ratio=8)['pass_model']  # more torque but fails speed


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('case',choices=['beam','datums','design'],nargs='?',default='design');args=parser.parse_args()
    check();print(json.dumps(dict(case=args.case,result=globals()[args.case](),independent_checks=True),ensure_ascii=False))
