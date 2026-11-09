"""Publish a finite sequence of stamped points, using the node's clock."""
import math
import rclpy
from geometry_msgs.msg import PointStamped
from rclpy.node import Node
from rclpy.qos import DurabilityPolicy, HistoryPolicy, QoSProfile, ReliabilityPolicy


class PointPublisher(Node):
    def __init__(self):
        super().__init__('lbb_point_publisher')
        self.declare_parameter('count', 10)
        self.declare_parameter('period', 0.2)
        self.count_limit = self.get_parameter('count').value
        period = self.get_parameter('period').value
        if isinstance(self.count_limit, bool) or not isinstance(self.count_limit, int) or not 1 <= self.count_limit <= 10000:
            raise ValueError('count must be an integer from 1 to 10000')
        if not isinstance(period, (int, float)) or isinstance(period, bool) or not math.isfinite(period) or period <= 0:
            raise ValueError('period must be positive and finite')
        qos = QoSProfile(depth=10, history=HistoryPolicy.KEEP_LAST,
                         reliability=ReliabilityPolicy.RELIABLE, durability=DurabilityPolicy.VOLATILE)
        self.publisher = self.create_publisher(PointStamped, '/lbb/points', qos)
        self.sent = 0
        self.timer = self.create_timer(float(period), self.publish_one)

    def publish_one(self):
        self.sent += 1
        msg = PointStamped()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'sensor'
        msg.point.x = self.sent * 0.1
        self.publisher.publish(msg)
        self.get_logger().info(f'sent={self.sent} frame=sensor x={msg.point.x:.3f}')
        if self.sent >= self.count_limit:
            self.timer.cancel()
            self.get_logger().info('finite sequence finished; timer cancelled; Ctrl+C to exit')


def main(args=None):
    rclpy.init(args=args)
    node = None
    try:
        node = PointPublisher()
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
