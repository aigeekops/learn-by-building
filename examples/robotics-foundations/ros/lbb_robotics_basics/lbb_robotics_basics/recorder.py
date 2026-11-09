"""Record actual PointStamped callback data to a new, explicit JSONL file."""
import json
from pathlib import Path
import rclpy
from geometry_msgs.msg import PointStamped
from rclpy.node import Node
from rclpy.qos import DurabilityPolicy, HistoryPolicy, QoSProfile, ReliabilityPolicy


class PointRecorder(Node):
    def __init__(self):
        super().__init__('lbb_point_recorder')
        self.declare_parameter('output', '')
        output = self.get_parameter('output').value
        if not isinstance(output, str) or not output:
            raise ValueError('set an explicit output file with -p output:=/path/to/new.jsonl')
        self.path = Path(output).expanduser()
        # Exclusive creation prevents overwriting an earlier experiment.
        self.stream = self.path.open('x', encoding='utf-8', buffering=1)
        self.received = 0
        qos = QoSProfile(depth=10, history=HistoryPolicy.KEEP_LAST,
                         reliability=ReliabilityPolicy.RELIABLE, durability=DurabilityPolicy.VOLATILE)
        self.subscription = self.create_subscription(PointStamped, '/lbb/points', self.receive, qos)
        self.get_logger().info(f'recording callbacks to {self.path}')

    def receive(self, msg):
        self.received += 1
        row = {'sequence_received': self.received, 'frame_id': msg.header.frame_id,
               'source_stamp_ns': msg.header.stamp.sec * 1_000_000_000 + msg.header.stamp.nanosec,
               'receipt_stamp_ns': self.get_clock().now().nanoseconds,
               'point_m': [msg.point.x, msg.point.y, msg.point.z]}
        self.stream.write(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n')

    def destroy_node(self):
        self.stream.close()
        return super().destroy_node()


def main(args=None):
    rclpy.init(args=args)
    node = None
    try:
        node = PointRecorder()
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if node is not None:
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == '__main__':
    main()
