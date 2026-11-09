"""Run a small Harmonic world and bridge only its clock into ROS 2 Jazzy."""
from pathlib import Path
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import ExecuteProcess, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch_ros.actions import Node


def generate_launch_description():
    share = Path(get_package_share_directory('lbb_robotics_basics'))
    return LaunchDescription([
        ExecuteProcess(cmd=['gz', 'sim', '-r', str(share / 'worlds' / 'foundations.sdf')], output='screen'),
        Node(package='ros_gz_bridge', executable='parameter_bridge', name='lbb_clock_bridge',
             parameters=[{'config_file': str(share / 'config' / 'clock_bridge.yaml')}], output='screen'),
        IncludeLaunchDescription(PythonLaunchDescriptionSource(str(share / 'launch' / 'basics.launch.py')),
                                 launch_arguments={'use_sim_time': 'true'}.items()),
    ])
