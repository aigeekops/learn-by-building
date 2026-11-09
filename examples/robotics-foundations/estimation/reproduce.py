#!/usr/bin/env python3
"""Independent scalar estimation calculations; Python 3 standard library.

No sensor access. The known inputs are independent numerical exercises, rather
than a copy of a browser execution trace.
"""
import argparse
import json
import math


def mean_standard_error(sigma=3.0, count=4):
    if not math.isfinite(sigma) or sigma < 0 or count < 1:
        raise ValueError("sigma must be finite/nonnegative, count positive")
    return {"single_variance_cm2": sigma * sigma, "count": count,
            "mean_variance_cm2": sigma * sigma / count,
            "mean_standard_deviation_cm": sigma / math.sqrt(count),
            "assumptions": ["independent", "unbiased", "equal variance"]}


def scalar_update(mean=2.0, variance=2.0, motion=1.0,
                  q=1.0, observation=7.0, r=3.0):
    if not all(math.isfinite(x) for x in (mean, variance, motion, q, observation, r)):
        raise ValueError("all parameters must be finite")
    if min(variance, q) < 0 or r <= 0:
        raise ValueError("P/Q must be nonnegative and R positive")
    predicted_mean, predicted_variance = mean + motion, variance + q
    innovation = observation - predicted_mean
    gain = predicted_variance / (predicted_variance + r)
    updated_mean = predicted_mean + gain * innovation
    # Joseph scalar covariance form: all terms are nonnegative.
    updated_variance = (1 - gain) ** 2 * predicted_variance + gain * gain * r
    return {"predicted_mean_m": predicted_mean,
            "predicted_variance_m2": predicted_variance, "innovation_m": innovation,
            "gain": gain, "updated_mean_m": updated_mean,
            "updated_variance_m2": updated_variance}


def innovation_check(predicted_mean=6.0, predicted_variance=2.0,
                     observation=12.0, r=2.0):
    if not all(math.isfinite(x) for x in (predicted_mean, predicted_variance, observation, r)):
        raise ValueError("all parameters must be finite")
    if predicted_variance < 0 or r <= 0:
        raise ValueError("predicted P must be nonnegative and R positive")
    innovation = observation - predicted_mean
    innovation_variance = predicted_variance + r
    nis = innovation * innovation / innovation_variance
    return {"innovation_m": innovation, "innovation_variance_m2": innovation_variance,
            "nis": nis, "reject_if_strictly_above_9": nis > 9}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=("mean", "kalman", "innovation"), default="kalman")
    parser.add_argument("--sigma", type=float, default=3.0)
    parser.add_argument("--count", type=int, default=4)
    parser.add_argument("--self-check", action="store_true")
    args = parser.parse_args()
    if args.self_check:
        assert math.isclose(mean_standard_error()["mean_standard_deviation_cm"], 1.5)
        result = scalar_update()
        assert math.isclose(result["updated_mean_m"], 5.0)
        assert math.isclose(result["updated_variance_m2"], 1.5)
        assert innovation_check()["nis"] == 9
        assert not innovation_check()["reject_if_strictly_above_9"]
        assert innovation_check(observation=13.0)["reject_if_strictly_above_9"]
        print("5 independent estimation arithmetic checks passed")
        return
    if args.case == "mean":
        result = mean_standard_error(args.sigma, args.count)
    elif args.case == "kalman":
        result = scalar_update()
    else:
        result = innovation_check()
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
