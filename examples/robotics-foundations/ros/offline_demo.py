#!/usr/bin/env python3
"""Original standard-library exercises. This program does not import or run ROS."""
import argparse
import json
import math
import unittest


def finite(name, value, minimum, maximum, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{name}: expected a finite number')
    if not minimum <= value <= maximum or (integer and int(value) != value):
        raise ValueError(f'{name}: outside the exercise range')
    return value


def queue_demo(count=6, depth=2, consume_every=3, drop_every=0):
    for name, value, low, high in (
        ('count', count, 3, 8), ('depth', depth, 1, 4),
        ('consume_every', consume_every, 1, 4), ('drop_every', drop_every, 0, 4),
    ):
        finite(name, value, low, high, integer=True)
    queue, received, evicted, lost, trace = [], [], [], [], []
    for seq in range(1, count + 1):
        if drop_every and seq % drop_every == 0:
            lost.append(seq)
        else:
            queue.append(seq)
            if len(queue) > depth:
                evicted.append(queue.pop(0))
        if seq % consume_every == 0 and queue:
            received.append(queue.pop(0))
        trace.append({'published': seq, 'queue': queue[:], 'received': received[:]})
    received.extend(queue)
    return {'published': count, 'received': received, 'evicted': evicted, 'lost': lost, 'trace': trace}


def tf_demo(yaw=90, tx=1, ty=0, px=1, age_ms=100, max_age_ms=300):
    for name, value, low, high in (
        ('yaw', yaw, -180, 180), ('tx', tx, -2, 2), ('ty', ty, -2, 2),
        ('px', px, 0, 2), ('age_ms', age_ms, 0, 1000), ('max_age_ms', max_age_ms, 50, 1000),
    ):
        finite(name, value, low, high)
    base_x = px + 0.2
    radians = math.radians(yaw)
    world = [math.cos(radians) * base_x + tx, math.sin(radians) * base_x + ty]
    accepted = age_ms <= max_age_ms
    return {'base_point': [base_x, 0], 'world_candidate': world,
            'accepted': accepted, 'usable_point': world if accepted else None}


def replay_demo(duration_ms=1000, rate=2, origin_ms=1000):
    finite('duration_ms', duration_ms, 100, 2000)
    finite('rate', rate, 0.25, 4)
    finite('origin_ms', origin_ms, 0, 5000)
    stamps = [origin_ms + i * duration_ms / 4 for i in range(5)]
    return {'schedule': [{'sequence': i + 1, 'stamp_ms': stamp,
                          'elapsed_ms': (stamp - stamps[0]) / rate, 'value': i * 0.2}
                         for i, stamp in enumerate(stamps)],
            'wall_duration_ms': duration_ms / rate}


def bridge_demo(message_type='clock', direction='gz-to-ros', mismatch=False,
                wall_clock=False, sim_seconds=2, wall_seconds=1002):
    if message_type not in ('clock', 'scalar') or direction not in ('gz-to-ros', 'ros-to-gz'):
        raise ValueError('unknown type or direction')
    finite('sim_seconds', sim_seconds, 0, 10)
    finite('wall_seconds', wall_seconds, 1000, 1010)
    accepted = not mismatch and direction == 'gz-to-ros'
    clock_available = accepted and message_type == 'clock'
    return {'accepted': accepted, 'clock_available': clock_available,
            'node_now': wall_seconds if wall_clock else (sim_seconds if clock_available else 0),
            'ready': wall_clock or clock_available}


class IndependentChecks(unittest.TestCase):
    def test_queue_accounting_and_independent_four_message_case(self):
        result = queue_demo(count=4, depth=1, consume_every=2)
        self.assertEqual(result['received'], [2, 4])
        self.assertEqual(result['evicted'], [1, 3])
        for depth in range(1, 5):
            for every in range(1, 5):
                result = queue_demo(depth=depth, consume_every=every, drop_every=3)
                partition = result['received'] + result['evicted'] + result['lost']
                self.assertEqual(sorted(partition), list(range(1, 7)))
                self.assertTrue(all(len(row['queue']) <= depth for row in result['trace']))

    def test_transform_analytic_case_and_stale_rejection(self):
        result = tf_demo(yaw=0, tx=2, ty=1, px=0.8)
        self.assertEqual(result['world_candidate'], [3, 1])
        rotated = tf_demo(yaw=90, tx=1, px=1)
        self.assertAlmostEqual(rotated['world_candidate'][0], 1)
        self.assertAlmostEqual(rotated['world_candidate'][1], 1.2)
        stale = tf_demo(age_ms=301, max_age_ms=300)
        self.assertFalse(stale['accepted'])
        self.assertIsNone(stale['usable_point'])
        self.assertTrue(tf_demo(age_ms=300, max_age_ms=300)['accepted'])

    def test_replay_rate_and_timestamp_origin(self):
        a = replay_demo(duration_ms=1200, rate=3, origin_ms=100)
        b = replay_demo(duration_ms=1200, rate=3, origin_ms=3000)
        self.assertEqual(a['wall_duration_ms'], 400)
        self.assertEqual([r['elapsed_ms'] for r in a['schedule']], [0, 100, 200, 300, 400])
        self.assertEqual([r['elapsed_ms'] for r in a['schedule']],
                         [r['elapsed_ms'] for r in b['schedule']])
        self.assertEqual(b['schedule'][-1]['stamp_ms'], 4200)

    def test_bridge_type_direction_and_distinct_clock(self):
        self.assertEqual(bridge_demo(sim_seconds=7, wall_seconds=1007)['node_now'], 7)
        self.assertFalse(bridge_demo(direction='ros-to-gz')['ready'])
        self.assertFalse(bridge_demo(mismatch=True)['accepted'])
        scalar = bridge_demo(message_type='scalar')
        self.assertTrue(scalar['accepted'])
        self.assertFalse(scalar['clock_available'])
        self.assertEqual(scalar['node_now'], 0)
        self.assertEqual(bridge_demo(mismatch=True, wall_clock=True)['node_now'], 1002)

    def test_reject_invalid_inputs(self):
        for invalid in (math.inf, math.nan, -1):
            with self.assertRaises(ValueError):
                replay_demo(rate=invalid)
        with self.assertRaises(ValueError):
            queue_demo(depth=1.5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    commands = parser.add_subparsers(dest='command')
    queue = commands.add_parser('queue')
    queue.add_argument('--count', type=int, default=6)
    queue.add_argument('--depth', type=int, default=2)
    queue.add_argument('--consume-every', type=int, default=3)
    queue.add_argument('--drop-every', type=int, default=0)
    tf = commands.add_parser('tf')
    for name, default in [('yaw', 90), ('tx', 1), ('ty', 0), ('px', 1), ('age-ms', 100), ('max-age-ms', 300)]:
        tf.add_argument('--' + name, type=float, default=default)
    replay = commands.add_parser('replay')
    replay.add_argument('--duration-ms', type=float, default=1000)
    replay.add_argument('--rate', type=float, default=2)
    replay.add_argument('--origin-ms', type=float, default=1000)
    bridge = commands.add_parser('bridge')
    bridge.add_argument('--type', choices=['clock', 'scalar'], default='clock', dest='message_type')
    bridge.add_argument('--direction', choices=['gz-to-ros', 'ros-to-gz'], default='gz-to-ros')
    bridge.add_argument('--mismatch', action='store_true')
    bridge.add_argument('--wall-clock', action='store_true')
    bridge.add_argument('--sim-seconds', type=float, default=2)
    bridge.add_argument('--wall-seconds', type=float, default=1002)
    args = vars(parser.parse_args())
    if args.pop('self_test'):
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(IndependentChecks))
        raise SystemExit(not result.wasSuccessful())
    command = args.pop('command')
    functions = {'queue': queue_demo, 'tf': tf_demo, 'replay': replay_demo, 'bridge': bridge_demo}
    if command not in functions:
        parser.error('choose queue, tf, replay, bridge, or --self-test')
    try:
        result = functions[command](**args)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps({'evidence_type': 'calculation', 'ros_executed': False, 'result': result}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
