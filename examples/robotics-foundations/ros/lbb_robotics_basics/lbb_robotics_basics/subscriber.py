"""Print received PointStamped messages and both source and receipt times."""
import json
import rclpy
from geometry_msgs.msg import PointStamped
from rclpy.node import Node
from rclpy.qos import DurabilityPolicy, HistoryPolicy, QoSProfile, ReliabilityPolicy


class PointSubscriber(Node):
    def __init__(self):
        super().__init__('lbb_point_subscriber')
        self.received = 0
        qos = QoSProfile(depth=10, history=HistoryPolicy.KEEP_LAST,
                         reliability=ReliabilityPolicy.RELIABLE, durability=DurabilityPolicy.VOLATILE)
        self.subscription = self.create_subscription(PointStamped, '/lbb/points', self.receive, qos)

    def receive(self, msg):
        self.received += 1
        row = {'received': self.received, 'frame_id': msg.header.frame_id,
               'source_stamp_ns': msg.header.stamp.sec * 1_000_000_000 + msg.header.stamp.nanosec,
               'receipt_stamp_ns': self.get_clock().now().nanoseconds,
               'point_m': [msg.point.x, msg.point.y, msg.point.z]}
        self.get_logger().info(json.dumps(row, ensure_ascii=False, separators=(',', ':')))


def main(args=None):
    rclpy.init(args=args)
    node = None
    try:
        node = PointSubscriber()
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
