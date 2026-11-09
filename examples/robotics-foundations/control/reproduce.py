#!/usr/bin/env python3
"""Original independent arithmetic checks. Python 3, standard library only.

These cases use different conditions from the browser defaults. They calculate
one controller update or a prescribed error record, not a real motor experiment.
"""
import argparse
import json
import math


def proportional_step(target=2.0, kp=3.0, dt=0.1, initial=0.0, tau=1.0):
    if not all(math.isfinite(x) for x in (target, kp, dt, initial, tau)):
        raise ValueError("all values must be finite")
    if dt <= 0 or tau <= 0 or kp < 0:
        raise ValueError("dt/tau must be positive and kp nonnegative")
    error = target - initial
    command = kp * error
    after = initial + dt * (command - initial) / tau
    return {"error": error, "effective_speed_command_m_s": command,
            "velocity_after_m_s": after, "time_step_s": dt}


def pid_step(target=1.0, measured=0.5, previous=0.4,
             integral=0.8, dt=0.2, kp=2.0, ki=0.5, kd=0.1):
    if not all(math.isfinite(x) for x in (target, measured, previous, integral, dt, kp, ki, kd)):
        raise ValueError("all values must be finite")
    if dt <= 0:
        raise ValueError("dt must be positive")
    error = target - measured
    new_integral = integral + error * dt
    derivative = -(measured - previous) / dt
    parts = {"P": kp * error, "I": ki * new_integral, "D": kd * derivative}
    return {"error": error, "new_integral_s": new_integral,
            "measurement_derivative_per_s": derivative, "parts": parts,
            "normalized_command": sum(parts.values())}


def windup_record():
    # The errors and the saturation decisions are prescribed, not plant output.
    errors, dt = [2.0, 2.0, 2.0], 0.25
    unguarded, guarded, trace = 0.0, 0.0, []
    for error in errors:
        unguarded += error * dt
        # Each candidate positive update is given to deepen positive saturation.
        trace.append({"error": error, "unlimited_integral_s": unguarded,
                      "conditional_integral_s": guarded})
    return {"trace": trace, "difference_s": unguarded - guarded}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=("feedback", "pid", "windup"), default="feedback")
    parser.add_argument("--target", type=float, default=2.0)
    parser.add_argument("--kp", type=float, default=3.0)
    parser.add_argument("--dt", type=float, default=0.1)
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()
    if args.self_check:
        assert math.isclose(proportional_step()["velocity_after_m_s"], 0.6)
        assert math.isclose(pid_step()["normalized_command"], 1.4)
        assert math.isclose(windup_record()["difference_s"], 1.5)
        print("3 independent control arithmetic checks passed")
        return
    if args.case == "feedback":
        result = proportional_step(target=args.target, kp=args.kp, dt=args.dt)
    elif args.case == "pid":
        result = pid_step()
    else:
        result = windup_record()
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
