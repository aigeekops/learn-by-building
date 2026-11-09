"""Original publisher/subscriber with an explicit static coordinate chain."""
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    sim_time = ParameterValue(LaunchConfiguration('use_sim_time'), value_type=bool)
    return LaunchDescription([
        DeclareLaunchArgument('use_sim_time', default_value='false'),
        Node(package='lbb_robotics_basics', executable='publisher', output='screen',
             parameters=[{'use_sim_time': sim_time}]),
        Node(package='lbb_robotics_basics', executable='subscriber', output='screen',
             parameters=[{'use_sim_time': sim_time}]),
        Node(package='tf2_ros', executable='static_transform_publisher', name='world_to_base',
             arguments=['--x', '1', '--y', '0', '--z', '0', '--yaw', '1.5707963267948966',
                        '--pitch', '0', '--roll', '0', '--frame-id', 'world', '--child-frame-id', 'base_link'],
             parameters=[{'use_sim_time': sim_time}]),
        Node(package='tf2_ros', executable='static_transform_publisher', name='base_to_sensor',
             arguments=['--x', '0.2', '--y', '0', '--z', '0', '--yaw', '0', '--pitch', '0', '--roll', '0',
                        '--frame-id', 'base_link', '--child-frame-id', 'sensor'],
             parameters=[{'use_sim_time': sim_time}]),
    ])
