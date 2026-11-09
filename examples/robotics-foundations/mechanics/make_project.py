"""Produce a reviewable mechanical design package; physical measurements stay blank."""
import argparse
import csv
import hashlib
import json
from pathlib import Path


def make(output):
    output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    length,width,thickness=60,30,3
    mass,acceleration,radius,ratio=2,.4,.05,4
    force=mass*(acceleration+.03*9.81);required=force*radius/2;available=.03*ratio*.8
    import math
    speed=600/ratio*2*math.pi*radius/60
    load=mass*9.81/2;inertia=width*thickness**3/12
    stress=load*length*(thickness/2)/inertia;deflection=load*length**3/(3*70000*inertia)
    design=dict(units='mm, N, MPa; vehicle calculations use SI',plate=dict(length=length,width=width,thickness=thickness,hole_diameter=4.6,centers=[[10,15],[50,15]]),
        assumptions=dict(mass_kg=mass,acceleration_m_s2=acceleration,wheel_radius_m=radius,reduction=ratio,efficiency=.8,motor_torque_Nm=.03,motor_rpm=600,rolling_coefficient=.03),
        calculations=dict(required_torque=required,available_torque=available,speed=speed,stress_MPa=stress,deflection_mm=deflection),
        checks=dict(torque=available>=required,speed=speed>=.5,strength=stress<=60,stiffness=deflection<=1),
        boundary='理想化设计；人工电机规格并非实测工作点，未完成制造、温升、疲劳和装配验收。')
    (output/'design.json').write_text(json.dumps(design,ensure_ascii=False,indent=2)+'\n')
    # ASCII DXF with millimetre units, a closed outline and two round holes.
    pairs=[(0,'SECTION'),(2,'HEADER'),(9,'$INSUNITS'),(70,4),(0,'ENDSEC'),(0,'SECTION'),(2,'ENTITIES'),
        (0,'LWPOLYLINE'),(100,'AcDbEntity'),(8,'OUTLINE'),(100,'AcDbPolyline'),(90,4),(70,1)]
    for x,y in [(0,0),(length,0),(length,width),(0,width)]:pairs.extend([(10,x),(20,y)])
    for x,y in [(10,15),(50,15)]:pairs.extend([(0,'CIRCLE'),(100,'AcDbEntity'),(8,'HOLES'),(100,'AcDbCircle'),(10,x),(20,y),(30,0),(40,2.3)])
    pairs.extend([(0,'ENDSEC'),(0,'EOF')]);(output/'bracket.dxf').write_text(''.join(f'{k}\n{v}\n' for k,v in pairs))
    svg='''<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="60mm" viewBox="0 0 80 60"><rect width="80" height="60" fill="white"/><g fill="none" stroke="#163b4d" stroke-width="0.25"><rect x="10" y="10" width="60" height="30"/><circle cx="20" cy="25" r="2.3"/><circle cx="60" cy="25" r="2.3"/><path d="M10 48H30M10 46V50M30 46V50"/></g><g font-family="sans-serif" font-size="2.7" fill="#163b4d"><text x="10" y="7">60 x 30 x 3 mm; 2 x diameter 4.6 mm</text><text x="10" y="55">20 mm scale - verify printed size</text></g></svg>'''
    (output/'drawing.svg').write_text(svg)
    with (output/'bom.csv').open('w',newline='') as stream:
        writer=csv.writer(stream);writer.writerow(['item','quantity','specification','status'])
        writer.writerows([['bracket',2,'aluminium plate 60x30x3 mm','material and process to verify'],['motor',2,'teaching assumption 0.03 Nm at 600 rpm','select actual continuous operating point'],['gearbox',2,'ratio 4; assumed efficiency 0.8','verify supplier specification'],['wheel',2,'radius 50 mm','verify attachment and traction']])
    acceptance=dict(manufactured=False,items=[dict(id=k,requirement=v,measured=None,passed=None,evidence=None) for k,v in [('dimensions','verify plate, holes and datum'),('assembly','verify real fastener and fixture fit'),('load','measure deflection with stated load'),('temperature','record motor continuous-load temperature'),('motion','measure speed and acceleration')]])
    (output/'acceptance.json').write_text(json.dumps(acceptance,indent=2)+'\n')
    receipt=dict(generated=True,physical_tested=False,files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(output.iterdir()) if p.is_file() and p.name!='receipt.json'})
    (output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    assert all(design['checks'].values())
    return receipt


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='/tmp/lbb-mechanical-project');args=parser.parse_args();print(json.dumps(make(args.output)))
