/* Original MIT 2.007 companion: inspect the existing arithmetic, never hardware evidence. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else(root.CourseInspectorProviders ||= {})[api.courseId]=api;})(globalThis,function(){
  'use strict';
  const n=x=>typeof x==='number'?Number(x.toFixed(4)).toString():String(x);
  const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=1e-9;
  const C=(id,label,value,formula,inputs,note)=>({id,label,value,formula,inputs,note:note+' 算式显示四位小数；值和验证保留完整精度。'});
  const E=(id,label,prediction,before,after,expectation,verify)=>({id,label,prediction,before,after,expectation,verify});
  const gearNote='同模数、无打滑、定常外啮合一对齿轮；负号表示反向，不是负的功率。未检查强度、齿隙或寿命。';
  const loadNote='水平力臂的静态末端点负载，g=9.81 m/s²；不含杆件自重、加速、摩擦、电流或温升。';
  const fitNote='尺寸及直径间隙用mm；对称尺寸公差、孔居中、板宽精确，不是ISO配合或强度验证。';
  const beamNote='N、mm、MPa=N/mm²；理想完全固支、等截面、线弹性小挠度梁，不含剪切、孔口应力、疲劳或真实材料验收。';
  const datumNote='坐标、直径、偏差均用mm；螺杆固定在名义中心、板件不能平移补偿的一维最坏界限，非二维位置度或装配试验。';
  const designNote='原创平地双驱轮简化计算；电机0.03 N·m与600 rpm为人工给定同一工作点，效率0.8；不是实测或硬件验收。';
  function model(intuition,inspect,experiments,kind='静态几何的有限计算检查，不表示运动或时间演化。'){
    return {intuition,inspect(t,index){
      const i=Math.max(0,Math.min(t.frames.length-1,Math.trunc(Number(index))||0)),f=t.frames[i];
      // Only accumulated vars: scenes may already contain quantities from later arithmetic.
      const v=Object.assign({},...t.frames.slice(0,i+1).map(frame=>frame.vars));
      return {title:f.title,summary:`当前第 ${i+1} 个实际快照。${f.text} ${kind}`,cells:inspect(t.params,i,v)};
    },experiments};
  }
  const fitClassification=(min,max)=>min>1e-10?'总有间隙':max< -1e-10?'总有过盈':Math.abs(min)<=1e-10&&Math.abs(max)<=1e-10?'理想零间隙':Math.abs(min)<=1e-10?'可能恰好接触，其余有间隙':Math.abs(max)<=1e-10?'可能恰好接触，其余有过盈':'可能间隙，也可能过盈';
  function fitCell(v){const min=v.minimum_diametral_clearance_mm,max=v.maximum_diametral_clearance_mm;
    return C('fit','尺寸区间分类',v.fit,`c_min=${n(min)}，c_max=${n(max)}；与0比较（容差 ε=0.0000000001）→ ${fitClassification(min,max)}`,{minimumDiametralClearance:min,maximumDiametralClearance:max,epsilon:1e-10},fitNote+' 端点为零只说明可能接触，不保证自由滑动或可靠压装。');
  }
  function centerCells(centers,spacing){return centers.flatMap((row,j)=>row.map((value,k)=>C(`center-${j}-${k}`,`孔${j+1}中心${k===0?'x':'y'}`,value,`${j===1&&k===0?'10 + '+n(spacing):n(k===0?10:15)} = ${n(value)} mm`,{holeIndex:j,axis:k,datumOffset:k===0?10:15,...(j===1&&k===0?{spacing}:{})},datumNote)));}
  const models={};

  models['rf-gears']=model('同一接触点通过的齿数相等，速度按齿数反比变化；逐项核对方向、效率后的扭矩和功率损耗。',(p,i,v)=>{
    if(i===0)return [C('ratio','从动/主动齿数比 i',v.ratio,`${n(v.driven)} / ${n(v.driver)} = ${n(v.ratio)}`,{drivenTeeth:v.driven,driverTeeth:v.driver},gearNote+' i无量纲；i<1表示增速而非减速。')];
    if(i===1)return [
      C('output-rpm','从动轮有向转速',v.output_rpm,`−${n(v.input_rpm)} / ${n(v.ratio)} = ${n(v.output_rpm)} rpm`,{inputRpm:v.input_rpm,ratio:v.ratio},gearNote),
      C('driver-angle','本快照主动轮示意角',v.driver_angle_deg,`本实际快照给定 θ₁ = ${n(v.driver_angle_deg)}°`,{angleDegrees:v.driver_angle_deg},gearNote+' 这是运动学取样角，不是按时间积分的状态。'),
      C('driven-angle','本快照从动轮示意角',v.driven_angle_deg,`−${n(v.driver_angle_deg)} / ${n(v.ratio)} = ${n(v.driven_angle_deg)}°`,{driverAngle:v.driver_angle_deg,ratio:v.ratio},gearNote+' 没有从rpm伪造该示意角对应的测量时间。')
    ];
    if(i===2)return [
      C('ideal-torque','无损时输出扭矩大小',v.input_torque_Nm*v.ratio,`${n(v.input_torque_Nm)} × ${n(v.ratio)} = ${n(v.input_torque_Nm*v.ratio)} N·m`,{inputTorque:v.input_torque_Nm,ratio:v.ratio},gearNote),
      C('output-torque','效率后的输出扭矩大小',v.output_torque_Nm,`${n(v.input_torque_Nm)} × ${n(v.ratio)} × ${n(v.efficiency)} = ${n(v.output_torque_Nm)} N·m`,{inputTorque:v.input_torque_Nm,ratio:v.ratio,efficiency:v.efficiency},gearNote+' 损耗统一记在扭矩端，几何速度比不变。')
    ];
    if(i===3){const inputOmega=v.input_rpm*2*Math.PI/60,outputOmega=Math.abs(v.output_rpm)*2*Math.PI/60;return [
      C('input-omega','输入角速度大小',inputOmega,`${n(v.input_rpm)} × 2π / 60 = ${n(inputOmega)} rad/s`,{rpm:v.input_rpm,radiansPerRevolution:2*Math.PI,secondsPerMinute:60},gearNote),
      C('output-omega','输出角速度大小',outputOmega,`|${n(v.output_rpm)}| × 2π / 60 = ${n(outputOmega)} rad/s`,{signedRpm:v.output_rpm,radiansPerRevolution:2*Math.PI,secondsPerMinute:60},gearNote),
      C('input-power','输入机械功率',v.input_power_W,`${n(v.input_torque_Nm)} × (${n(v.input_rpm)} × 2π / 60) = ${n(v.input_power_W)} W`,{torque:v.input_torque_Nm,rpm:v.input_rpm},gearNote),
      C('output-power','输出机械功率',v.output_power_W,`${n(v.output_torque_Nm)} × (|${n(v.output_rpm)}| × 2π / 60) = ${n(v.output_power_W)} W`,{torque:v.output_torque_Nm,signedRpm:v.output_rpm},gearNote),
      C('power-loss','总机械功率损失',v.loss_W,`${n(v.input_power_W)} − ${n(v.output_power_W)} = ${n(v.loss_W)} W`,{inputPower:v.input_power_W,outputPower:v.output_power_W},gearNote),
      C('efficiency-power-check','效率独立核对 ηP₁',v.efficiency*v.input_power_W,`${n(v.efficiency)} × ${n(v.input_power_W)} = ${n(v.efficiency*v.input_power_W)} W；P₂=${n(v.output_power_W)} W`,{efficiency:v.efficiency,inputPower:v.input_power_W,actualOutputPower:v.output_power_W},gearNote+' 同一当前功率帧核对，不读取最终result。')
    ];}
    return [
      C('ratio','最终核对齿数比',v.ratio,`${n(v.driven)} / ${n(v.driver)} = ${n(v.ratio)}`,{drivenTeeth:v.driven,driverTeeth:v.driver},gearNote),
      C('output-rpm','最终核对输出转速',v.output_rpm,`−${n(v.input_rpm)} / ${n(v.ratio)} = ${n(v.output_rpm)} rpm`,{inputRpm:v.input_rpm,ratio:v.ratio},gearNote),
      C('output-torque','最终核对输出扭矩',v.output_torque_Nm,`${n(v.input_torque_Nm)} × ${n(v.ratio)} × ${n(v.efficiency)} = ${n(v.output_torque_Nm)} N·m`,{inputTorque:v.input_torque_Nm,ratio:v.ratio,efficiency:v.efficiency},gearNote),
      C('power-ratio','最终核对输出/输入功率',v.power_ratio,`${n(v.output_power_W)} / ${n(v.input_power_W)} = ${n(v.power_ratio)} = η (${n(v.efficiency)})`,{inputPower:v.input_power_W,outputPower:v.output_power_W,efficiency:v.efficiency},gearNote+' 控件范围内输入功率严格为正；增扭没有增加机械功率。')
    ];
  },[
    E('double-driven','只把从动轮60齿改为120齿','输入工作点和效率不变时，转速、扭矩与功率各怎样变化？',{driven:60},{driven:120},'i由3变6，输出−200→−100 rpm，扭矩0.54→1.08 N·m；输入、输出功率保持。',(a,b)=>a.params.driven===60&&b.params.driven===120&&near(a.result.ratio,3)&&near(b.result.ratio,6)&&near(a.result.outputRpm,-200)&&near(b.result.outputRpm,-100)&&near(a.result.outputTorque,.54)&&near(b.result.outputTorque,1.08)&&near(a.result.inputPower,b.result.inputPower)&&near(a.result.outputPower,b.result.outputPower)),
    E('halve-efficiency','只把效率1改为0.5','齿数速度比是否改变，功率和输出扭矩是否一起减半？',{efficiency:1},{efficiency:.5},'输出转速均−200 rpm；输出扭矩0.6→0.3 N·m，输出功率减半，后者损耗为输入功率的一半。',(a,b)=>a.params.efficiency===1&&b.params.efficiency===.5&&near(a.result.outputRpm,-200)&&near(b.result.outputRpm,-200)&&near(a.result.outputTorque,.6)&&near(b.result.outputTorque,.3)&&near(b.result.outputPower,a.result.outputPower/2)&&near(a.result.loss,0)&&near(b.result.loss,b.result.inputPower/2))
  ],'沿用现有外啮合运动学示意角，逐帧检查真实计算快照；角度不是动力学或计时积分。');

  models['rf-motor-load']=model('先将kg换成N，再乘水平力臂和设计系数；同一工作点的扭矩与转速分别检查，零负载仍保留合法零值。',(p,i,v)=>{
    if(i===0)return [C('gravity-force','末端重力',v.gravity_force_N,`${n(v.mass_kg)} × ${n(v.g_m_s2)} = ${n(v.gravity_force_N)} N`,{massKg:v.mass_kg,gravity:v.g_m_s2},loadNote)];
    if(i===1)return [C('load-torque','关节静态负载力矩',v.load_torque_Nm,`${n(v.gravity_force_N)} × ${n(v.lever_m)} = ${n(v.load_torque_Nm)} N·m`,{gravityForce:v.gravity_force_N,leverMetres:v.lever_m},loadNote+' 重力与力臂垂直，sin90°=1。')];
    if(i===2)return [C('required-torque','加入设计系数后的需求',v.required_torque_Nm,`${n(v.load_torque_Nm)} × ${n(v.design_factor)} = ${n(v.required_torque_Nm)} N·m`,{loadTorque:v.load_torque_Nm,designFactor:v.design_factor},loadNote+' 系数只放大已知简化负载，不自动覆盖未知风险。')];
    if(i===3)return [
      C('effective-ratio','传动扭矩倍率 iη',p.ratio*p.efficiency,`${n(p.ratio)} × ${n(p.efficiency)} = ${n(p.ratio*p.efficiency)}`,{ratio:p.ratio,efficiency:p.efficiency},loadNote+' 无量纲；控件范围保证iη>0。'),
      C('available-torque','电机工作点对应的可用关节扭矩',v.available_torque_Nm,`${n(p.motorTorque)} × ${n(p.ratio)} × ${n(p.efficiency)} = ${n(v.available_torque_Nm)} N·m`,{motorTorque:p.motorTorque,ratio:p.ratio,efficiency:p.efficiency},loadNote+' 工作点扭矩不是堵转规格。'),
      C('minimum-motor-torque','所需最小电机工作点扭矩',v.minimum_motor_torque_Nm,`${n(v.required_torque_Nm)} / (${n(p.ratio)} × ${n(p.efficiency)}) = ${n(v.minimum_motor_torque_Nm)} N·m`,{requiredTorque:v.required_torque_Nm,ratio:p.ratio,efficiency:p.efficiency},loadNote)
    ];
    return [
      C('output-rpm','同一工作点的输出转速',v.output_rpm,`${n(p.motorRpm)} / ${n(p.ratio)} = ${n(v.output_rpm)} rpm`,{motorRpm:p.motorRpm,ratio:p.ratio},loadNote+' 本负载模型只给速度大小，没有定义齿轮级数和输出方向。'),
      C('torque-margin','可用减所需的扭矩余量',v.margin_Nm,`${n(v.available_torque_Nm)} − ${n(v.required_torque_Nm)} = ${n(v.margin_Nm)} N·m`,{availableTorque:v.available_torque_Nm,requiredTorque:v.required_torque_Nm},loadNote),
      C('torque-check','本模型扭矩检查',v.passes_torque_check,`${n(v.margin_Nm)} ≥ −0.000000000001 → ${v.passes_torque_check}`,{margin:v.margin_Nm,epsilon:1e-12},loadNote+' 仅扭矩算术通过，目标速度、温升和真机连续承载仍未知。')
    ];
  },[
    E('double-lever','只把水平力臂0.1m改为0.2m','可用工作点不变时，需要的电机扭矩会如何变化，通过状态是否保持？',{lever:.1},{lever:.2},'负载与需求力矩翻倍；最小电机扭矩0.24525→0.4905 N·m，可用2.4 N·m保持，扭矩检查通过→失败。',(a,b)=>a.params.lever===.1&&b.params.lever===.2&&near(b.result.loadTorque,2*a.result.loadTorque)&&near(b.result.requiredTorque,2*a.result.requiredTorque)&&near(a.result.minimumMotorTorque,.24525)&&near(b.result.minimumMotorTorque,.4905)&&near(a.result.availableTorque,2.4)&&near(b.result.availableTorque,2.4)&&a.result.passesTorqueCheck===true&&b.result.passesTorqueCheck===false),
    E('zero-load','只把负载1kg改为0kg','重力、需求和最小电机扭矩能否保留为零，可用工作点会改变吗？',{mass:1},{mass:0},'重力、静态力矩、所需力矩和最小电机扭矩都归零；可用扭矩与输出速度不变，不计算无意义的需求比值。',(a,b)=>a.params.mass===1&&b.params.mass===0&&near(a.result.gravityForce,9.81)&&near(b.result.gravityForce,0)&&near(b.result.loadTorque,0)&&near(b.result.requiredTorque,0)&&near(b.result.minimumMotorTorque,0)&&near(a.result.availableTorque,b.result.availableTorque)&&near(a.result.outputRpm,b.result.outputRpm)&&b.result.passesTorqueCheck===true)
  ]);

  models['rf-fit']=model('用最小孔减最大轴和最大孔减最小轴逐项构造直径间隙；将配合、径向余量与孔边几何要求分开。',(p,i,v)=>{
    if(i===0)return [
      C('hole-min','孔直径下限',v.hole_min_mm,`${n(v.hole_nominal_mm)} − ${n(p.holeTolerance)} = ${n(v.hole_min_mm)} mm`,{nominal:v.hole_nominal_mm,tolerance:p.holeTolerance},fitNote),
      C('hole-max','孔直径上限',v.hole_max_mm,`${n(v.hole_nominal_mm)} + ${n(p.holeTolerance)} = ${n(v.hole_max_mm)} mm`,{nominal:v.hole_nominal_mm,tolerance:p.holeTolerance},fitNote)
    ];
    if(i===1)return [
      C('shaft-min','轴直径下限',v.shaft_min_mm,`${n(v.shaft_nominal_mm)} − ${n(p.shaftTolerance)} = ${n(v.shaft_min_mm)} mm`,{nominal:v.shaft_nominal_mm,tolerance:p.shaftTolerance},fitNote),
      C('shaft-max','轴直径上限',v.shaft_max_mm,`${n(v.shaft_nominal_mm)} + ${n(p.shaftTolerance)} = ${n(v.shaft_max_mm)} mm`,{nominal:v.shaft_nominal_mm,tolerance:p.shaftTolerance},fitNote)
    ];
    if(i===2)return [
      C('clearance-min','最小直径间隙',v.minimum_diametral_clearance_mm,`${n(v.hole_min_mm)} − ${n(v.shaft_max_mm)} = ${n(v.minimum_diametral_clearance_mm)} mm`,{holeMin:v.hole_min_mm,shaftMax:v.shaft_max_mm},fitNote),
      C('clearance-max','最大直径间隙',v.maximum_diametral_clearance_mm,`${n(v.hole_max_mm)} − ${n(v.shaft_min_mm)} = ${n(v.maximum_diametral_clearance_mm)} mm`,{holeMax:v.hole_max_mm,shaftMin:v.shaft_min_mm},fitNote),
      C('radial-min','单边最小径向间隙',v.minimum_diametral_clearance_mm/2,`${n(v.minimum_diametral_clearance_mm)} / 2 = ${n(v.minimum_diametral_clearance_mm/2)} mm`,{diametralClearance:v.minimum_diametral_clearance_mm},fitNote+' 负值只表示过盈量的径向表达。'),
      C('radial-max','单边最大径向间隙',v.maximum_diametral_clearance_mm/2,`${n(v.maximum_diametral_clearance_mm)} / 2 = ${n(v.maximum_diametral_clearance_mm/2)} mm`,{diametralClearance:v.maximum_diametral_clearance_mm},fitNote),fitCell(v)
    ];
    if(i===3)return [
      C('edge-min','居中孔最小边缘余量',v.minimum_edge_mm,`(${n(v.bracket_width_mm)} − ${n(v.hole_max_mm)}) / 2 = ${n(v.minimum_edge_mm)} mm`,{bracketWidth:v.bracket_width_mm,holeMax:v.hole_max_mm},fitNote+' 孔中心偏移和板宽公差未加入。'),
      C('edge-margin','几何要求余量',v.minimum_edge_mm-v.required_edge_mm,`${n(v.minimum_edge_mm)} − ${n(v.required_edge_mm)} = ${n(v.minimum_edge_mm-v.required_edge_mm)} mm`,{minimumEdge:v.minimum_edge_mm,requiredEdge:v.required_edge_mm},fitNote+' 只比较给定几何要求，不推断材料强度。')
    ];
    return [fitCell(v),
      C('clearance-min','最终核对最小直径间隙',v.minimum_clearance_mm,`${n(v.hole_min_mm)} − ${n(v.shaft_max_mm)} = ${n(v.minimum_clearance_mm)} mm`,{holeMin:v.hole_min_mm,shaftMax:v.shaft_max_mm},fitNote),
      C('edge-check','独立孔边几何检查',v.passes_edge_check,`${n(v.minimum_edge_mm)} ≥ ${n(v.required_edge_mm)} − 0.0000000001 → ${v.passes_edge_check}`,{minimumEdge:v.minimum_edge_mm,requiredEdge:v.required_edge_mm,epsilon:1e-10},fitNote+' 配合分类与孔边检查独立，都不是承载验收。')
    ];
  },[
    E('contact-to-transition','只把孔8.2mm改为8.0mm','孔轴公差都为±0.1mm时，最坏组合是否仍只有间隙或接触？',{hole:8.2,shaft:8,holeTolerance:.1,shaftTolerance:.1},{hole:8,shaft:8,holeTolerance:.1,shaftTolerance:.1},'最小/最大直径间隙0/0.4→−0.2/0.2mm，可能恰好接触变为可能间隙也可能过盈。',(a,b)=>a.params.hole===8.2&&b.params.hole===8&&near(a.result.clearanceMin,0)&&near(a.result.clearanceMax,.4)&&a.result.fit==='可能恰好接触，其余有间隙'&&near(b.result.clearanceMin,-.2)&&near(b.result.clearanceMax,.2)&&b.result.fit==='可能间隙，也可能过盈'),
    E('narrow-bracket','只把板宽30mm改为20mm','孔轴尺寸不变，配合分类和边缘余量哪些会改变？',{width:30,minimumEdge:8},{width:20,minimumEdge:8},'配合和直径间隙保持；边缘10.875→5.875mm，8mm几何要求通过→失败。',(a,b)=>a.params.width===30&&b.params.width===20&&near(a.result.clearanceMin,b.result.clearanceMin)&&near(a.result.clearanceMax,b.result.clearanceMax)&&a.result.fit===b.result.fit&&near(a.result.edgeMin,10.875)&&near(b.result.edgeMin,5.875)&&a.result.passesEdgeCheck===true&&b.result.passesEdgeCheck===false)
  ]);

  models['rf-beam-design']=model('同一静载先形成根部弯矩，再由矩形截面惯性矩分别检查应力与位移；厚度平方和三次方的影响逐项展示。',(p,i,v)=>{
    if(i===0)return [
      C('length','有效悬臂长L',v.length,`p.length = ${n(v.length)} mm`,{length:v.length},beamNote),
      C('width','截面宽b',v.width,`p.width = ${n(v.width)} mm`,{width:v.width},beamNote),
      C('thickness','受弯方向厚h',v.thickness,`p.thickness = ${n(v.thickness)} mm`,{thickness:v.thickness},beamNote+' h不能与b随意互换。'),
      C('force','末端静载F',v.force,`p.force = ${n(v.force)} N`,{force:v.force},beamNote),
      C('modulus','教学给定弹性模量E',v.E,`E = ${n(v.E)} MPa = N/mm²`,{elasticModulus:v.E},beamNote),
      C('allowable','教学给定许用应力',v.allowable,`σ_allow = ${n(v.allowable)} MPa`,{allowableStress:v.allowable},beamNote+' 当前仅声明输入，尚未计算弯矩、应力或挠度。')
    ];
    if(i===1)return [C('moment','根部最大弯矩M',v.moment,`${n(v.force)} × ${n(v.length)} = ${n(v.moment)} N·mm`,{force:v.force,length:v.length},beamNote+' 牛顿毫米不能直接当牛顿米。')];
    if(i===2)return [
      C('thickness-cube','截面厚度三次方',v.thickness**3,`${n(v.thickness)}³ = ${n(v.thickness**3)} mm³`,{thickness:v.thickness},beamNote),
      C('inertia','矩形截面惯性矩I',v.inertia,`${n(v.width)} × ${n(v.thickness)}³ / 12 = ${n(v.inertia)} mm⁴`,{width:v.width,thickness:v.thickness,rectangularFactor:12},beamNote+' 这是截面几何量，不是质量转动惯量。')
    ];
    if(i===3)return [
      C('outer-fibre','最外纤维到中性轴c',v.thickness/2,`${n(v.thickness)} / 2 = ${n(v.thickness/2)} mm`,{thickness:v.thickness},beamNote),
      C('stress','根部最大弯曲应力σ',v.stress,`${n(v.moment)} × (${n(v.thickness)} / 2) / ${n(v.inertia)} = ${n(v.stress)} MPa`,{moment:v.moment,thickness:v.thickness,inertia:v.inertia},beamNote),
      C('stress-ratio','应力/许用应力',v.stressRatio,`${n(v.stress)} / ${n(v.allowable)} = ${n(v.stressRatio)}`,{stress:v.stress,allowable:v.allowable},beamNote+' 无量纲；≤1仅满足当前强度约束，挠度尚未核对。')
    ];
    if(i===4){const numerator=v.force*v.length**3,denominator=3*v.E*v.inertia;return [
      C('deflection-numerator','挠度分子FL³',numerator,`${n(v.force)} × ${n(v.length)}³ = ${n(numerator)} N·mm³`,{force:v.force,length:v.length},beamNote),
      C('deflection-denominator','挠度分母3EI',denominator,`3 × ${n(v.E)} × ${n(v.inertia)} = ${n(denominator)} N·mm²`,{factor:3,elasticModulus:v.E,inertia:v.inertia},beamNote),
      C('deflection','末端挠度δ',v.deflection,`${n(numerator)} / ${n(denominator)} = ${n(v.deflection)} mm`,{numerator,denominator},beamNote+' 正值为位移大小，静态图没有按此数值制造弯曲动画。')
    ];}
    return [
      C('stress-ratio','最终强度比',v.stressRatio,`${n(v.stress)} / ${n(v.allowable)} = ${n(v.stressRatio)}`,{stress:v.stress,allowable:v.allowable},beamNote),
      C('strength-check','单独强度约束',v.stress<=v.allowable,`${n(v.stress)} ≤ ${n(v.allowable)} MPa → ${v.stress<=v.allowable}`,{stress:v.stress,allowable:v.allowable},beamNote),
      C('deflection-ratio','最终刚度比',v.deflectionRatio,`${n(v.deflection)} / 1 = ${n(v.deflectionRatio)}`,{deflection:v.deflection,limitMm:1},beamNote+' 位移上限1mm为教学给定。'),
      C('stiffness-check','单独刚度约束',v.deflection<=1,`${n(v.deflection)} ≤ 1 mm → ${v.deflection<=1}`,{deflection:v.deflection,limitMm:1},beamNote),
      C('pass','两项约束合取',v.pass,`(${n(v.stress)} ≤ ${n(v.allowable)}) ∧ (${n(v.deflection)} ≤ 1) → ${v.pass}`,{stress:v.stress,allowable:v.allowable,deflection:v.deflection,deflectionLimit:1},beamNote+' 通过不是可制造或真机承载证明。')
    ];
  },[E('double-thickness','只把厚度2mm改为4mm','厚度翻倍时惯性矩、应力、挠度如何缩放，哪一项原来失败？',{thickness:2},{thickness:4},'I变8倍，应力50→12.5MPa，挠度约2.381→0.2976mm；原来强度通过但刚度失败，两项合取失败→通过。',(a,b)=>a.params.thickness===2&&b.params.thickness===4&&near(b.result.inertia,8*a.result.inertia)&&near(a.result.stress,50)&&near(b.result.stress,12.5)&&near(b.result.deflection,a.result.deflection/8)&&a.result.stress<=60&&a.result.deflection>1&&b.result.deflection<1&&a.result.pass===false&&b.result.pass===true)]);

  models['rf-manufacturing-datums']=model('以同一基准逐坐标定位两孔；相反方向的极限偏移形成孔距最坏界限，再与最小孔的径向余量分别比较。',(p,i,v)=>{
    if(i===0)return centerCells(v.centers,p.spacing).concat(C('datum-tolerance','每孔相对基准的偏差界限',v.datumTolerance,`每孔中心线偏差 e ∈ [−${n(v.datumTolerance)}, +${n(v.datumTolerance)}] mm`,{datumTolerance:v.datumTolerance},datumNote+' 此处只声明界限，尚未计算孔距误差或装配保证。'));
    if(i===1)return [
      C('spacing-error-max','两孔相反偏移的正孔距误差',v.worstSpacingError,`(+${n(v.datumTolerance)}) − (−${n(v.datumTolerance)}) = ${n(v.worstSpacingError)} mm`,{secondHoleError:v.datumTolerance,firstHoleError:-v.datumTolerance},datumNote+' 不是独立随机误差的均方根。'),
      C('spacing-min','最小可能中心距',p.spacing-v.worstSpacingError,`${n(p.spacing)} − ${n(v.worstSpacingError)} = ${n(p.spacing-v.worstSpacingError)} mm`,{nominalSpacing:p.spacing,errorBound:v.worstSpacingError},datumNote),
      C('spacing-max','最大可能中心距',p.spacing+v.worstSpacingError,`${n(p.spacing)} + ${n(v.worstSpacingError)} = ${n(p.spacing+v.worstSpacingError)} mm`,{nominalSpacing:p.spacing,errorBound:v.worstSpacingError},datumNote)
    ];
    if(i===2)return [
      C('hole-lower','孔直径下限Dmin',v.holeLower,`${n(p.hole)} − 0.1 = ${n(v.holeLower)} mm`,{nominalHole:p.hole,lowerDeviation:.1},datumNote+' 孔径下偏差0.1mm为固定教学假设。'),
      C('diametral-clearance','最坏直径间隙Dmin−dmax',v.holeLower-p.bolt,`${n(v.holeLower)} − ${n(p.bolt)} = ${n(v.holeLower-p.bolt)} mm`,{holeLower:v.holeLower,boltMaximum:p.bolt},datumNote),
      C('radial-clearance','每孔单边径向余量c',v.radialClearance,`(${n(v.holeLower)} − ${n(p.bolt)}) / 2 = ${n(v.radialClearance)} mm`,{holeLower:v.holeLower,boltMaximum:p.bolt},datumNote)
    ];
    if(i===3)return [
      C('per-hole-margin','每孔径向余量减偏差界限',v.radialClearance-v.datumTolerance,`${n(v.radialClearance)} − ${n(v.datumTolerance)} = ${n(v.radialClearance-v.datumTolerance)} mm`,{radialClearance:v.radialClearance,datumTolerance:v.datumTolerance},datumNote+' 比较的是每孔t，不是把孔距误差2t直接当每孔偏差。'),
      C('guaranteed','一维固定螺杆装配保证',v.guaranteed,`${n(v.radialClearance)} ≥ ${n(v.datumTolerance)} → ${v.guaranteed}`,{radialClearance:v.radialClearance,datumTolerance:v.datumTolerance},datumNote+' 失败表示本模型无法保证，不代表所有实际零件都装不上。')
    ];
    return [
      C('outline-width','图纸板宽',v.width,`${n(p.spacing)} + 20 = ${n(v.width)} mm`,{spacing:p.spacing,endOffset:10},datumNote+' 两端名义孔中心各距外缘10mm。'),
      C('outline-height','图纸板高',v.height,`固定板高 = ${n(v.height)} mm = 2 × 15 mm`,{height:v.height,holeCentreY:15},datumNote),
      ...centerCells(v.centers,p.spacing),
      C('guaranteed','最终核对一维保证',v.guaranteed,`${n(v.radialClearance)} ≥ ${n(v.datumTolerance)} → ${v.guaranteed}`,{radialClearance:v.radialClearance,datumTolerance:v.datumTolerance},datumNote+' 此快照只是计算图纸尺寸；插件不生成文件，不证明打印比例或实物合格。')
    ];
  },[E('loosen-position','只把每孔基准偏差界限0.1mm改为0.3mm','径向余量不变时，孔距误差界限和装配保证怎样变化？',{datumTolerance:.1},{datumTolerance:.3},'孔距误差界限0.2→0.6mm；最小孔4.5mm、最大螺杆4mm的单边余量仍0.25mm，一维保证通过→失败。',(a,b)=>a.params.datumTolerance===.1&&b.params.datumTolerance===.3&&near(a.result.worstSpacingError,.2)&&near(b.result.worstSpacingError,.6)&&near(a.result.holeLower,4.5)&&near(b.result.holeLower,4.5)&&near(a.result.radialClearance,.25)&&near(b.result.radialClearance,.25)&&a.result.guaranteed===true&&b.result.guaranteed===false)]);

  function projectCheckCells(v){return [
    C('torque-check','每轮连续扭矩约束',v.checks.torque,`${n(v.availableTorque)} ≥ ${n(v.requiredTorque)} N·m → ${v.checks.torque}`,{available:v.availableTorque,required:v.requiredTorque},designNote),
    C('speed-check','目标速度约束',v.checks.speed,`${n(v.speed)} ≥ 0.5 m/s → ${v.checks.speed}`,{speed:v.speed,targetSpeed:.5},designNote),
    C('strength-check','支架应力约束',v.checks.strength,`${n(v.stress)} ≤ 60 MPa → ${v.checks.strength}`,{stress:v.stress,allowable:60},designNote+' 理想60mm悬臂、30mm宽截面。'),
    C('stiffness-check','支架位移约束',v.checks.stiffness,`${n(v.deflection)} ≤ 1 mm → ${v.checks.stiffness}`,{deflection:v.deflection,limit:1},designNote+' 不含孔口、连接柔度或电机反扭矩。')
  ];}
  models['rf-design-project']=model('从车体惯性力与滚阻分配每轮扭矩，同时核对减速后的速度；把支架强度、刚度和交付计划独立记账。',(p,i,v)=>{
    if(i===0)return [
      C('mass','车体总质量',v.mass,`p.mass = ${n(v.mass)} kg`,{mass:v.mass},designNote),
      C('acceleration','目标加速度',v.acceleration,`p.acceleration = ${n(v.acceleration)} m/s²`,{acceleration:v.acceleration},designNote),
      C('radius','驱动轮半径',v.radius,`p.radius = ${n(v.radius)} m`,{radius:v.radius},designNote+' 本半径是m；支架尺寸随后用mm。'),
      C('ratio','减速比',v.ratio,`p.ratio = ${n(v.ratio)}`,{ratio:v.ratio},designNote+' 无量纲；尚未计算可用扭矩或速度。'),
      C('thickness','支架受弯厚度',v.thickness,`p.thickness = ${n(v.thickness)} mm`,{thickness:v.thickness},designNote),
      C('target-speed','教学给定速度下限',.5,'目标速度 ≥ 0.5 m/s',{targetSpeed:.5},designNote+' 目标是输入要求，不是当前已达到的测量结果。')
    ];
    if(i===1){const accelerationForce=p.mass*p.acceleration,rollingForce=p.mass*.03*9.81;return [
      C('acceleration-force','加速需求ma',accelerationForce,`${n(p.mass)} × ${n(p.acceleration)} = ${n(accelerationForce)} N`,{mass:p.mass,acceleration:p.acceleration},designNote+' 未含旋转惯量。'),
      C('rolling-force','简化滚阻μmg',rollingForce,`0.03 × ${n(p.mass)} × 9.81 = ${n(rollingForce)} N`,{rollingCoefficient:.03,mass:p.mass,gravity:9.81},designNote+' μ=0.03固定，不含坡度和轮滑。'),
      C('drive-force','车体总驱动力需求',v.force,`${n(accelerationForce)} + ${n(rollingForce)} = ${n(v.force)} N`,{accelerationForce,rollingForce},designNote),
      C('required-torque','每个驱动轮所需扭矩',v.requiredTorque,`${n(v.force)} × ${n(p.radius)} / 2 = ${n(v.requiredTorque)} N·m`,{totalForce:v.force,radius:p.radius,drivenWheels:2},designNote+' 两驱轮均分所需驱动力。')
    ];}
    if(i===2){const wheelRpm=600/p.ratio,wheelOmega=wheelRpm*2*Math.PI/60;return [
      C('available-torque','每电机可用轮端扭矩',v.availableTorque,`0.03 × ${n(p.ratio)} × 0.8 = ${n(v.availableTorque)} N·m`,{motorTorque:.03,ratio:p.ratio,efficiency:.8},designNote),
      C('wheel-rpm','驱动轮转速大小',wheelRpm,`600 / ${n(p.ratio)} = ${n(wheelRpm)} rpm`,{motorRpm:600,ratio:p.ratio},designNote),
      C('wheel-omega','驱动轮角速度大小',wheelOmega,`${n(wheelRpm)} × 2π / 60 = ${n(wheelOmega)} rad/s`,{wheelRpm,radiansPerRevolution:2*Math.PI,secondsPerMinute:60},designNote),
      C('speed','无滑动线速度',v.speed,`(600 / ${n(p.ratio)}) × 2π × ${n(p.radius)} / 60 = ${n(v.speed)} m/s`,{motorRpm:600,ratio:p.ratio,radiusMetres:p.radius},designNote+' 此处只算速度；四约束判断在后续实际帧。')
    ];}
    if(i===3){const moment=v.bracketForce*60;return [
      C('bracket-force','单侧支架静重载荷',v.bracketForce,`${n(p.mass)} × 9.81 / 2 = ${n(v.bracketForce)} N`,{mass:p.mass,gravity:9.81,supports:2},designNote+' 此处为承受静重的一半，不是此前的水平驱动力。'),
      C('bracket-moment','支架根部弯矩',moment,`${n(v.bracketForce)} × 60 = ${n(moment)} N·mm`,{bracketForce:v.bracketForce,lengthMm:60},designNote),
      C('inertia','支架截面惯性矩',v.inertia,`30 × ${n(p.thickness)}³ / 12 = ${n(v.inertia)} mm⁴`,{widthMm:30,thicknessMm:p.thickness,rectangularFactor:12},designNote),
      C('stress','支架弯曲应力',v.stress,`6 × ${n(v.bracketForce)} × 60 / (30 × ${n(p.thickness)}²) = ${n(v.stress)} MPa`,{bracketForce:v.bracketForce,lengthMm:60,widthMm:30,thicknessMm:p.thickness},designNote+' 线弹性梁假设，没有局部应力集中。'),
      C('deflection','支架末端挠度',v.deflection,`${n(v.bracketForce)} × 60³ / (3 × 70000 × ${n(v.inertia)}) = ${n(v.deflection)} mm`,{bracketForce:v.bracketForce,lengthMm:60,elasticModulusMPa:70000,inertia:v.inertia},designNote+' E为教学给定70000MPa，不是材料实测。')
    ];}
    if(i===4)return projectCheckCells(v).concat(
      C('torque-margin','扭矩余量',v.availableTorque-v.requiredTorque,`${n(v.availableTorque)} − ${n(v.requiredTorque)} = ${n(v.availableTorque-v.requiredTorque)} N·m`,{available:v.availableTorque,required:v.requiredTorque},designNote),
      C('speed-margin','速度余量',v.speed-.5,`${n(v.speed)} − 0.5 = ${n(v.speed-.5)} m/s`,{speed:v.speed,target:.5},designNote),
      C('strength-margin','应力上限余量',60-v.stress,`60 − ${n(v.stress)} = ${n(60-v.stress)} MPa`,{allowable:60,stress:v.stress},designNote),
      C('stiffness-margin','位移上限余量',1-v.deflection,`1 − ${n(v.deflection)} = ${n(1-v.deflection)} mm`,{limit:1,deflection:v.deflection},designNote+' 四条判断分别来自同一当前trace，不合成为已完成的硬件实验。')
    );
    return projectCheckCells(v).concat(
      C('pass','最终四约束合取',v.pass,`${v.checks.torque} ∧ ${v.checks.speed} ∧ ${v.checks.strength} ∧ ${v.checks.stiffness} = ${v.pass}`,{torque:v.checks.torque,speed:v.checks.speed,strength:v.checks.strength,stiffness:v.checks.stiffness},designNote+' 计算通过不等于制造、尺寸、负载、温升或行驶验收完成。'),
      v.files.map((file,j)=>C('package-file-'+j,'计划交付文件 '+(j+1),file,`packageFiles[${j}] = "${file}"`,{index:j,plannedFilename:file},designNote+' 该列表是模型的交付计划；本帧和检查器没有执行文件写入，acceptance.json中的实测应留空。'))
    );
  },[
    E('double-reduction','只把减速比4改为8','轮端扭矩翻倍时车速会如何变化，四项中哪一项可能失败？',{ratio:4},{ratio:8},'可用扭矩0.096→0.192 N·m，速度π/4→π/8 m/s；结构结果和所需扭矩保持，速度约束通过→失败，最终通过→失败。',(a,b)=>a.params.ratio===4&&b.params.ratio===8&&near(a.result.availableTorque,.096)&&near(b.result.availableTorque,.192)&&near(a.result.speed,Math.PI/4)&&near(b.result.speed,Math.PI/8)&&near(a.result.requiredTorque,b.result.requiredTorque)&&near(a.result.stress,b.result.stress)&&near(a.result.deflection,b.result.deflection)&&a.result.checks.speed===true&&b.result.checks.speed===false&&a.result.checks.torque===true&&b.result.checks.torque===true&&a.result.pass===true&&b.result.pass===false),
    E('stiffen-heavy-bracket','5kg条件下只把支架厚度2mm改为4mm','传动保持时，厚度能否修复结构约束，哪些结果应保持？',{mass:5,thickness:2},{mass:5,thickness:4},'轮端需求、可用扭矩和车速保持；I变8倍，应力73.575→18.39375MPa，挠度变1/8；强度与刚度失败→通过，最终失败→通过。',(a,b)=>a.params.mass===5&&b.params.mass===5&&a.params.thickness===2&&b.params.thickness===4&&near(a.result.requiredTorque,b.result.requiredTorque)&&near(a.result.availableTorque,b.result.availableTorque)&&near(a.result.speed,b.result.speed)&&near(b.result.inertia,8*a.result.inertia)&&near(a.result.stress,73.575)&&near(b.result.stress,18.39375)&&near(b.result.deflection,a.result.deflection/8)&&a.result.checks.strength===false&&a.result.checks.stiffness===false&&b.result.checks.strength===true&&b.result.checks.stiffness===true&&a.result.pass===false&&b.result.pass===true)
  ]);
  return {courseId:'mit2007',models};
});
