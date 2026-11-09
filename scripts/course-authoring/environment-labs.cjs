/* Target-environment labs complement the offline arithmetic; none run on build. */
module.exports=({lessons,sources,ROOT,fs,path})=>{
 const labs={
  'nav2-lifecycle':['启动依赖与生命周期','在已配置的Jazzy仿真中，分别保存未激活与激活后的节点状态；把未出现的节点与inactive状态分开诊断。','ros2 node list\nros2 lifecycle get /planner_server\nros2 lifecycle get /controller_server\nros2 action list -t\n','保存节点状态、Action类型和实际启动参数；如果节点有命名空间，先替换为实际全名。'],
  'nav2-tf':['TF与仿真时间','在已运行的仿真中检查map到base_link；另外核对所有使用仿真时间的节点是否读取同一/clock。','ros2 run tf2_ros tf2_echo map base_link\n# 上一条持续显示变换，Ctrl-C后继续\nros2 topic echo /clock --once\nros2 param get /planner_server use_sim_time\n','保留变换查询时间、帧名称、错误和时钟配置；坐标数值正确与时序正确分别检查。'],
  'nav2-localization':['地图和初始定位','用自己保存的地图配置和Gazebo场景，按官方Jazzy快速入门初始化机器人位姿，记录定位前后与已知地标的误差。','ros2 topic echo /map --once --field info\nros2 topic echo /amcl_pose --once\n','保存地图resolution、origin与frame、初始位姿来源，以及独立测得的位姿误差；不要只保存RViz截图。'],
  'nav2-costmap':['footprint与两种地图','在相同通道中固定机器人几何，分别调整缓冲相关配置。先记录原值，重新加载后核对实际参数和地图。','ros2 param get /local_costmap/local_costmap robot_radius\nros2 param get /local_costmap/local_costmap footprint\nros2 topic list -t\n','核对实际使用的是圆形半径还是多边形footprint、传感器层及未知空间策略；参数名和命名空间以目标版本为准。'],
  'nav2-planner':['规划器受控比较','在同一地图、起终点与初始位姿下，对照两组已记录的规划配置；保存路径、耗时、约束和失败原因。','ros2 param get /planner_server planner_plugins\nros2 action list -t\n','用官方Simple Commander或RViz提交目标；成功路径先验碰撞有效性，再比较长度与间隙，不用本例成本冒充插件成本。'],
  'nav2-controller':['跟踪误差与延迟','固定全局路径和场景，记录速度命令、里程计与传感器时间，按同一口径比较前视与速度参数。','ros2 param get /controller_server controller_plugins\nros2 topic list -t\n','先按实际版本核对cmd_vel类型，再记录速度、横向误差、控制频率与取消结果；不能用离线几何值代替控制实测。'],
  'nav2-behavior':['有限恢复和取消','按匹配版本的默认行为树，在仿真分别注入临时障碍、不可达目标与取消请求，保存各分支的最终Action状态。','ros2 param dump /bt_navigator\nros2 action list -t\n','保留所用XML及插件版本、恢复次数、取消时刻和最终状态；预期失败是有效实验结果。'],
  'nav2-validation':['导航最小验收集','按官方Jazzy Quickstart搭建Gazebo Harmonic目标环境。固定至少10个起终点/障碍场景，先预写到达误差、时限、碰撞定义，再运行每回合。','ros2 doctor --report\nros2 pkg prefix nav2_bringup\nros2 pkg prefix nav2_simple_commander\n','提交场景清单、地图和参数摘要、每回合日志、失败分类及版本；仿真与真机分开，不把本页人工计数当运行记录。'],
  'moveit-model':['模型和规划组检查','先在匹配Jazzy版本的教程工作空间中打开纯模拟示例，核对URDF/SRDF、规划组、状态关节名和碰撞模型。','ros2 pkg prefix moveit2_tutorials\n# 只有已按匹配版本完成安装/构建时才启动模拟demo\nros2 launch moveit2_tutorials demo.launch.py\n','main/Rolling的2026页面示例机器人可能与Jazzy分支不同，使用本环境实际group和frame，不照抄页面截图。'],
  'moveit-limits':['限制来自哪个配置','在模拟配置中保存URDF与joint_limits.yaml，分别检查位置、速度、加速度以及缩放系数。','ros2 topic echo /joint_states --once\nros2 param list /move_group\n','构造合法、越界和超速请求；分别保留规划错误与执行错误，不把目标裁剪后结果算原请求成功。'],
  'moveit-ik':['IK与分支检查','对固定末端目标更换种子关节状态，对比解分支、残差、关节限制和碰撞；用正运动学独立回代。','ros2 service list -t\nros2 param list /move_group\n','使用目标版本实际IK接口，记录求解器、种子、超时与错误码；未返回解时保留失败。'],
  'moveit-scene':['场景同步和附着物体','在RViz模拟场景加入障碍，确认规划器读取后再规划；对抓取物体分别测试世界障碍和附着状态。','ros2 topic list -t\nros2 topic echo /monitored_planning_scene --once\n','话题名称以实际命名空间为准；保存场景回读与碰撞结果，不能只凭发布动作认定已同步。'],
  'moveit-planning':['规划参数与边验证','固定起终点、场景、随机种子与预算，只改一种规划或碰撞分辨率配置，保存轨迹与失败情况。','ros2 param list /move_group\nros2 action list -t\n','独立核对路径各段、关节约束及整机几何；不要把一次成功当成任意场景成功率。'],
  'moveit-cartesian':['部分路径的返回值','在纯模拟中分别制造完整可达、不可达和碰撞中断的笛卡尔路径，按目标版本API记录fraction、错误码和轨迹。','ros2 pkg prefix moveit2_tutorials\n','用匹配版本官方Cartesian Path教程编写调用，明确fraction口径；返回轨迹对象仍需检查覆盖与约束。'],
  'moveit-timing':['时间戳和运动限制','先规划几何路径，再用目标版本时间参数化检查每个关节的时间戳、速度与加速度；记录所用算法与缩放。','ros2 topic echo /display_planned_path --once\n','显示话题仅辅助检查；保存实际轨迹消息并独立计算差分，分析它和控制器限制是否一致。'],
  'moveit-execution':['模拟执行和终态回执','仅在纯模拟控制器上检查起点偏差、场景变化、取消与中止；提交前重新核对当前状态。','ros2 control list_controllers\nros2 action list -t\n','命令要求已安装匹配版本ros2_control。保留最终回执、关节误差与故障原因；接收、完成、抓取成功分别记账。']
 };
 for(const [id,[title,explanation,code,exercise]]of Object.entries(labs))lessons.find(l=>l.id===id).sections.push({title:'目标环境实验：'+title,explanation,code,language:'bash',execution:'需另配Ubuntu 24.04 / ROS 2 Jazzy与匹配的仿真、包和机器人配置；这些命令未在本机运行。',exercise});
 sources['moveit-quickstart']={...sources['moveit-official'],label:'MoveIt Quickstart in RViz · main/Rolling',url:'https://moveit.picknik.ai/main/doc/tutorials/quickstart_in_rviz/quickstart_in_rviz_tutorial.html',locator:'Launch Demo / Planning / Cartesian / Execution；按目标版本调整机器人与组名'};
 lessons.find(l=>l.id==='moveit-model').sources.push('moveit-quickstart');
 const sketches={
  'arduino-led':`// Uno R3: pin 9 -> resistor -> LED -> GND; check polarity and ratings first.
const byte ledPin = 9;
void setup() { pinMode(ledPin, OUTPUT); }
void loop() {
  digitalWrite(ledPin, HIGH); delay(500);
  digitalWrite(ledPin, LOW); delay(500);
}
`,
  'arduino-input':`// Button between pin 2 and GND. Uno R3 built-in LED shows pressed state.
const byte buttonPin = 2;
void setup() {
  pinMode(buttonPin, INPUT_PULLUP); pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  const bool pressed = digitalRead(buttonPin) == LOW;
  digitalWrite(LED_BUILTIN, pressed ? HIGH : LOW);
  Serial.println(pressed ? 1 : 0); delay(20);
}
`,
  'arduino-adc':`// Uno R3 only: input must stay within board limits; measure Vref independently.
const float measuredReference = 5.0f;
void setup() { Serial.begin(9600); }
void loop() {
  const int raw = analogRead(A0);
  const float endpointVolts = raw * measuredReference / 1023.0f;
  Serial.print(raw); Serial.print(','); Serial.println(endpointVolts, 4);
  delay(100);
}
`,
  'arduino-pwm':`// Uno R3 pin 9 PWM; LED needs its own series resistor.
const byte pwmPin = 9;
const byte level = 128;
void setup() { pinMode(pwmPin, OUTPUT); analogWrite(pwmPin, level); }
void loop() { }
`,
  'arduino-timing':`const unsigned long intervalMs = 200;
unsigned long last = 0;
bool on = false;
void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  const unsigned long now = millis();
  if ((unsigned long)(now - last) >= intervalMs) {
    last = now; on = !on;
    digitalWrite(LED_BUILTIN, on ? HIGH : LOW);
  }
  // Other non-blocking sensor/state work can run here.
}
`,
  'arduino-debounce':`const byte buttonPin = 2;
const unsigned long quietMs = 20;
int candidate = HIGH, stable = HIGH;
unsigned long since = 0;
bool on = false;
void setup() { pinMode(buttonPin, INPUT_PULLUP); pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  const unsigned long now = millis();
  const int raw = digitalRead(buttonPin);
  if (raw != candidate) { candidate = raw; since = now; }
  if (candidate != stable && (unsigned long)(now - since) >= quietMs) {
    stable = candidate;
    if (stable == LOW) { on = !on; digitalWrite(LED_BUILTIN, on ? HIGH : LOW); }
  }
}
`,
  'arduino-actuator':`// Requires the Servo library and separately checked servo power/wiring.
// The example only commands the documented/calibrated center pulse.
#include <Servo.h>
Servo joint;
void setup() { joint.attach(9); joint.writeMicroseconds(1500); }
void loop() { }
`,
  'arduino-project':`// Bench-only logic: Serial sends distance_cm then newline; -1 means invalid.
// Pin 9 drives an LED with a resistor for this exercise, not a motor.
const byte outputPin = 9, enablePin = 2;
char digits[12]; byte used = 0; bool malformed = false;
long distanceCm = -1;
unsigned long observedAt = 0;
bool observed = false;
void setup() { pinMode(outputPin, OUTPUT); pinMode(enablePin, INPUT_PULLUP); Serial.begin(9600); }
void loop() {
  while (Serial.available()) {
    const char c = (char)Serial.read();
    if (c == '\\n') {
      if (used == 0) malformed = true;
      long value = 0; bool negative = used > 0 && digits[0] == '-';
      if (negative && used == 1) malformed = true;
      for (byte i = negative ? 1 : 0; i < used; ++i) {
        if (digits[i] < '0' || digits[i] > '9') { malformed = true; break; }
        value = value * 10 + (digits[i] - '0');
        if (value > 1000) { malformed = true; break; }
      }
      distanceCm = malformed || negative ? -1 : value;
      observed = true; observedAt = millis(); used = 0; malformed = false;
    } else if (c != '\\r') {
      if (used < sizeof(digits)) digits[used++] = c; else malformed = true;
    }
  }
  const unsigned long now = millis();
  const bool fresh = observed && (unsigned long)(now - observedAt) <= 300;
  const bool enabled = digitalRead(enablePin) == LOW;
  analogWrite(outputPin, fresh && enabled && distanceCm >= 15 ? 100 : 0);
}
`
 };
 const dir=path.join(ROOT,'examples/extension-arduino');fs.mkdirSync(dir,{recursive:true});
 for(const [id,code]of Object.entries(sketches)){
  const name=id.replaceAll('-','_');fs.mkdirSync(path.join(dir,name),{recursive:true});fs.writeFileSync(path.join(dir,name,name+'.ino'),code);
  lessons.find(l=>l.id===id).sections.push({title:'开发板实验：独立Arduino Sketch',explanation:'这是本站原创Uno R3示例，与上方离线计算分开。先核对本讲电路与引脚，IDE中选择真实板卡和端口。未在本机进行AVR目标编译或实物测试；不要把桌面语法检查当开发板运行。',code,language:'cpp',execution:'Arduino IDE / Uno R3；Servo示例另外需要Servo库。项目课用串口人工距离和LED做桌面逻辑验收，不直接驱动电机。',exercise:'先在不接负载的条件下检查输入输出，保存编译结果、板卡型号、接线和实测；将计算、仿真、硬件分别标注。'});
 }
};
