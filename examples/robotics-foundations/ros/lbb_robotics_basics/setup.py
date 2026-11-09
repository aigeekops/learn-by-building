from glob import glob
from setuptools import find_packages, setup

package_name = 'lbb_robotics_basics'
setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name + '/launch', glob('launch/*.launch.py')),
        ('share/' + package_name + '/config', glob('config/*.yaml')),
        ('share/' + package_name + '/worlds', glob('worlds/*.sdf')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Learn by Building contributors',
    maintainer_email='local@example.invalid',
    description='Original ROS 2 Jazzy learning examples',
    license='MIT',
    entry_points={'console_scripts': [
        'publisher = lbb_robotics_basics.publisher:main',
        'subscriber = lbb_robotics_basics.subscriber:main',
        'recorder = lbb_robotics_basics.recorder:main',
    ]},
)
