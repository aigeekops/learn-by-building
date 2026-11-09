#!/usr/bin/env python3
"""Original mechanics calculation examples. Python 3, standard library only.

Run ``python3 examples/robotics-foundations/mechanics/mechanics.py --check``
for hand-derived examples, or select gears/load/fit and change the CLI inputs.
These calculations provide no motor, manufacturing or strength test evidence.
"""
import argparse
import json
import math


def finite(value):
    value = float(value)
    if not math.isfinite(value):
        raise argparse.ArgumentTypeError("需要有限数值")
    return value


def gears(driver=20, driven=60, rpm=600, torque=0.2, efficiency=0.9):
    if driver <= 0 or driven <= 0 or int(driver) != driver or int(driven) != driven:
        raise ValueError("齿数必须为正整数")
    if rpm < 0 or torque < 0 or not 0 < efficiency <= 1:
        raise ValueError("本例只接受非负输入速度/扭矩与 (0,1] 的效率")
    ratio = driven / driver
    output_rpm = -rpm / ratio
    output_torque = torque * ratio * efficiency
    return {
        "ratio": ratio,
        "output_rpm": output_rpm,
        "output_torque_Nm": output_torque,
        "input_power_W": torque * rpm * math.tau / 60,
        "output_power_W": output_torque * abs(output_rpm) * math.tau / 60,
    }


def load(mass=1, lever=0.1, safety=2, ratio=10, efficiency=0.8,
         motor_torque=0.3, motor_rpm=1000):
    if mass < 0 or lever <= 0 or safety < 1 or ratio <= 0 or not 0 < efficiency <= 1:
        raise ValueError("检查质量、力臂、设计系数、减速比和效率")
    required = mass * 9.81 * lever * safety
    available = motor_torque * ratio * efficiency
    return {
        "load_torque_Nm": mass * 9.81 * lever,
        "required_torque_Nm": required,
        "minimum_motor_torque_Nm": required / (ratio * efficiency),
        "available_torque_Nm": available,
        "output_rpm": motor_rpm / ratio,
        "passes_torque_check": available + 1e-12 >= required,
        "boundary": "水平静态点负载；未计杆重、惯性、温升与结构强度",
    }


def fit(hole=8.2, shaft=8, hole_tolerance=0.05,
        shaft_tolerance=0.03, width=30, minimum_edge=5):
    if min(hole, shaft, width) <= 0 or min(hole_tolerance, shaft_tolerance, minimum_edge) < 0:
        raise ValueError("名义尺寸必须为正，公差与余量要求不能为负")
    smallest_hole = hole - hole_tolerance
    largest_hole = hole + hole_tolerance
    smallest_shaft = shaft - shaft_tolerance
    largest_shaft = shaft + shaft_tolerance
    if min(smallest_hole, smallest_shaft) <= 0:
        raise ValueError("尺寸下限必须为正")
    edge = (width - largest_hole) / 2
    return {
        "minimum_diametral_clearance_mm": smallest_hole - largest_shaft,
        "maximum_diametral_clearance_mm": largest_hole - smallest_shaft,
        "minimum_edge_mm": edge,
        "passes_edge_check": edge + 1e-10 >= minimum_edge,
        "boundary": "自定对称直径公差、居中孔和精确板宽；非标准配合等级或强度结论",
    }


def check():
    # Independently hand-derived values; no dependency on the browser models.
    gear = gears(20, 80, 600, 0.25, 0.8)
    assert math.isclose(gear["output_torque_Nm"], 0.8)
    assert math.isclose(gear["output_rpm"], -150)
    assert math.isclose(gear["input_power_W"], 5 * math.pi)
    assert math.isclose(gear["output_power_W"], 4 * math.pi)
    assert math.isclose(load(mass=2, lever=0.05)["minimum_motor_torque_Nm"], 0.24525)
    assert math.isclose(load(mass=0)["required_torque_Nm"], 0)
    size = fit(hole=10.2, shaft=10, hole_tolerance=0.05, shaft_tolerance=0.02)
    assert math.isclose(size["minimum_diametral_clearance_mm"], 0.13)
    assert math.isclose(size["maximum_diametral_clearance_mm"], 0.27)
    assert math.isclose(size["minimum_edge_mm"], 9.875)
    assert fit(width=20, minimum_edge=10)["passes_edge_check"] is False
    return {"checks": 10, "status": "passed", "evidence_type": "calculation"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    sub = parser.add_subparsers(dest="command")
    p = sub.add_parser("gears")
    for key, default in (("driver",20),("driven",60),("rpm",600),("torque",0.2),("efficiency",0.9)):
        p.add_argument("--"+key,type=finite,default=default)
    p = sub.add_parser("load")
    for key, default in (("mass",1),("lever",0.1),("safety",2),("ratio",10),("efficiency",0.8),("motor-torque",0.3),("motor-rpm",1000)):
        p.add_argument("--"+key,type=finite,default=default)
    p = sub.add_parser("fit")
    for key, default in (("hole",8.2),("shaft",8),("hole-tolerance",0.05),("shaft-tolerance",0.03),("width",30),("minimum-edge",5)):
        p.add_argument("--"+key,type=finite,default=default)
    args=vars(parser.parse_args())
    do_check=args.pop("check");command=args.pop("command")
    if do_check:
        result=check()
    elif command:
        try:
            result={"gears":gears,"load":load,"fit":fit}[command](**args)
        except ValueError as error:
            parser.error(str(error))
    else:
        parser.error("请选择 gears、load、fit 或 --check")
    print(json.dumps(result,ensure_ascii=False,allow_nan=False,indent=2))


if __name__ == "__main__":
    main()
