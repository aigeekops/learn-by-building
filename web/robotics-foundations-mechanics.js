/* Original MIT 2.007 companion models. These calculations are not hardware tests. */
(function (global) {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value.toFixed(4)).toString();
  const svg = (label, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 300" role="img" aria-label="${escape(label)}"><rect width="560" height="300" rx="16" fill="#f4f7fb"/>${body}</svg>`;
  const models = {};

  models['rf-gears'] = {
    controls: [
      {key:'driver',label:'主动轮齿数',min:10,max:40,step:1,value:20,unit:'齿'},
      {key:'driven',label:'从动轮齿数',min:20,max:120,step:1,value:60,unit:'齿'},
      {key:'rpm',label:'输入转速',min:60,max:6000,step:60,value:600,unit:'rpm'},
      {key:'torque',label:'输入扭矩',min:0.05,max:2,step:0.05,value:0.2,unit:'N·m'},
      {key:'efficiency',label:'传动效率',min:0.5,max:1,step:0.05,value:0.9,unit:''}
    ],
    run: (p = {}) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError('参数必须是对象');
      const specs = {driver:[10,40,20],driven:[20,120,60],rpm:[60,6000,600],torque:[0.05,2,0.2],efficiency:[0.5,1,0.9]};
      const v = {};
      for (const [key,[min,max,fallback]] of Object.entries(specs)) {
        const value = p[key] === undefined ? fallback : p[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || ((key === 'driver' || key === 'driven') && !Number.isInteger(value))) throw new RangeError(key + ' 超出模型范围');
        v[key] = value;
      }
      const ratio = v.driven / v.driver;
      const outputRpm = -v.rpm / ratio;
      const outputTorque = v.torque * ratio * v.efficiency;
      const inputPower = v.torque * v.rpm * 2 * Math.PI / 60;
      const outputPower = outputTorque * Math.abs(outputRpm) * 2 * Math.PI / 60;
      const make = (title,text,code,vars,phase,angle) => ({title,text,code,vars,scene:{kind:'gears',driver:v.driver,driven:v.driven,angle,outputAngle:-angle/ratio,ratio,outputRpm,outputTorque,inputPower,outputPower,phase}});
      const frames = [
        make('01 先数齿，再定义方向','相同模数、外啮合的一对齿轮接触处速度相同。约定主动轮逆时针为正，从动轮方向相反。','const ratio = v.driven / v.driver;',{driver:v.driver,driven:v.driven,ratio},0,0),
        make('02 大轮每转需要更多齿经过接触点','主动轮每转经过 driver 个齿；从动轮每转经过 driven 个齿，因此转速大小按齿数反比变化。','const outputRpm = -v.rpm / ratio;',{input_rpm:v.rpm,output_rpm:outputRpm,driver_angle_deg:90,driven_angle_deg:-90/ratio},1,90),
        make('03 减速换来更大的输出扭矩','效率只缩小输出机械功率，本例把损耗统一放在扭矩端；它不会改变不打滑时的齿数速度比。','const outputTorque = v.torque * ratio * v.efficiency;',{input_torque_Nm:v.torque,efficiency:v.efficiency,output_torque_Nm:outputTorque},2,180),
        make('04 用功率核对单位和损耗','rpm 先乘 2π/60 变成 rad/s，再乘扭矩得到 W。输出功率应等于输入功率乘效率。','const inputPower = v.torque * v.rpm * 2 * Math.PI / 60;\nconst outputPower = outputTorque * Math.abs(outputRpm) * 2 * Math.PI / 60;',{input_power_W:inputPower,output_power_W:outputPower,loss_W:inputPower-outputPower},3,270),
        make('05 改变齿数，重新观察整条链','这是一对外啮合齿轮；中间加惰轮会改变方向关系，复合齿轮列还需要逐级相乘。不能直接把本例套到任意传动机构。','const ratio = v.driven / v.driver;\nconst outputRpm = -v.rpm / ratio;\nconst outputTorque = v.torque * ratio * v.efficiency;',{ratio,output_rpm:outputRpm,output_torque_Nm:outputTorque,power_ratio:outputPower/inputPower},4,360)
      ];
      return {frames,result:{ratio,outputRpm,outputTorque,inputPower,outputPower,loss:inputPower-outputPower},summary:`减速比 ${ratio.toFixed(3)}；从动轮 ${outputRpm.toFixed(2)} rpm，扭矩 ${outputTorque.toFixed(3)} N·m。负号表示反向。`,boundary:'定常、相同模数、无打滑的外啮合齿轮模型；不计算齿根强度、间隙、惯量、轴承损耗分布或真机寿命。'};
    },
    render: frame => {
      const s = frame.scene, max = Math.max(s.driver,s.driven), r1 = 82*s.driver/max, r2 = 82*s.driven/max, c1 = 280-(r1+r2)/2, c2 = 280+(r1+r2)/2;
      const gear = (cx,r,teeth,angle,color) => {
        const points = Array.from({length:teeth*4},(_,i) => {const a=(i/(teeth*4)*360+angle)*Math.PI/180,rad=r*(i%4===1||i%4===2?1:0.91);return `${cx+rad*Math.cos(a)},${126-rad*Math.sin(a)}`;}).join(' ');
        return `<polygon points="${points}" fill="${color}" stroke="#325275" stroke-width="1.3"/><circle cx="${cx}" cy="126" r="8" fill="#f4f7fb"/><line x1="${cx}" y1="126" x2="${cx+r*.72*Math.cos(angle*Math.PI/180)}" y2="${126-r*.72*Math.sin(angle*Math.PI/180)}" stroke="#fff" stroke-width="4"/>`;
      };
      return svg('外啮合齿轮的齿数、方向、转速和扭矩',gear(c1,r1,s.driver,s.angle,'#447ca9')+gear(c2,r2,s.driven,s.outputAngle,'#57a68c')+`<text x="${c1}" y="25" text-anchor="middle" fill="#203a54">主动 ${s.driver} 齿</text><text x="${c2}" y="240" text-anchor="middle" fill="#203a54">从动 ${s.driven} 齿 · ${number(s.outputAngle)}°</text><text x="24" y="272" fill="#203a54">i=${number(s.ratio)}　输出 ${number(s.outputRpm)} rpm　${number(s.outputTorque)} N·m</text>`);
    }
  };

  models['rf-motor-load'] = {
    presentation: 'calculation',
    controls: [
      {key:'mass',label:'末端负载质量',min:0,max:5,step:0.1,value:1,unit:'kg'},
      {key:'lever',label:'水平力臂',min:0.02,max:0.2,step:0.01,value:0.1,unit:'m'},
      {key:'safety',label:'所需扭矩的设计系数',min:1,max:3,step:0.1,value:2,unit:''},
      {key:'motorTorque',label:'给定工作点的电机扭矩',min:0.02,max:1,step:0.01,value:0.3,unit:'N·m'},
      {key:'ratio',label:'减速比',min:1,max:30,step:1,value:10,unit:''},
      {key:'efficiency',label:'传动效率',min:0.5,max:1,step:0.05,value:0.8,unit:''},
      {key:'motorRpm',label:'同一工作点的电机转速',min:100,max:3000,step:100,value:1000,unit:'rpm'}
    ],
    run: (p = {}) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError('参数必须是对象');
      const specs = {mass:[0,5,1],lever:[0.02,0.2,0.1],safety:[1,3,2],motorTorque:[0.02,1,0.3],ratio:[1,30,10],efficiency:[0.5,1,0.8],motorRpm:[100,3000,1000]};
      const v = {};
      for (const [key,[min,max,fallback]] of Object.entries(specs)) {
        const value = p[key] === undefined ? fallback : p[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new RangeError(key + ' 超出模型范围');
        v[key] = value;
      }
      const gravityForce = v.mass * 9.81;
      const loadTorque = gravityForce * v.lever;
      const requiredTorque = loadTorque * v.safety;
      const availableTorque = v.motorTorque * v.ratio * v.efficiency;
      const minimumMotorTorque = requiredTorque / (v.ratio * v.efficiency);
      const outputRpm = v.motorRpm / v.ratio;
      const margin = availableTorque - requiredTorque;
      const passesTorqueCheck = margin >= -1e-12;
      const make = (title,text,code,vars,phase) => ({title,text,code,vars,scene:{kind:'load',lever:v.lever,mass:v.mass,gravityForce,loadTorque,requiredTorque,availableTorque,passesTorqueCheck,phase}});
      const frames = [
        make('01 把质量换成重力','这里支架水平，末端重力垂直于力臂。质量用 kg，g 固定为 9.81 m/s²，先得到 N。','const gravityForce = v.mass * 9.81;',{mass_kg:v.mass,g_m_s2:9.81,gravity_force_N:gravityForce},0),
        make('02 把力换成关节力矩','相同负载放得越远，关节越费力。仅计算末端点质量，支架自重、摩擦和加速度尚未计入。','const loadTorque = gravityForce * v.lever;',{lever_m:v.lever,load_torque_Nm:loadTorque},1),
        make('03 为已知简化负载留出设计系数','设计系数放大所需扭矩，它不是对所有未知风险的保证。质量翻倍或力臂翻倍都会让所需扭矩翻倍。','const requiredTorque = loadTorque * v.safety;',{design_factor:v.safety,required_torque_Nm:requiredTorque},2),
        make('04 把需求折算回电机端','减速和效率同时影响可用输出扭矩。输入扭矩必须是选定转速下可持续的工作点值，不能把堵转扭矩当作持续输出。','const availableTorque = v.motorTorque * v.ratio * v.efficiency;\nconst minimumMotorTorque = requiredTorque / (v.ratio * v.efficiency);',{available_torque_Nm:availableTorque,minimum_motor_torque_Nm:minimumMotorTorque},3),
        make('05 同时检查扭矩与速度的代价',passesTorqueCheck?'给定工作点通过本例的扭矩算术检查。还要核对目标速度、连续电流、温升、惯量和实测。':'给定工作点的输出扭矩不足；改变负载、力臂或传动后重新计算。','const outputRpm = v.motorRpm / v.ratio;\nconst margin = availableTorque - requiredTorque;\nconst passesTorqueCheck = margin >= -1e-12;',{output_rpm:outputRpm,margin_Nm:margin,passes_torque_check:passesTorqueCheck},4)
      ];
      return {frames,result:{gravityForce,loadTorque,requiredTorque,availableTorque,minimumMotorTorque,outputRpm,margin,passesTorqueCheck},summary:`需要 ${requiredTorque.toFixed(3)} N·m，可用 ${availableTorque.toFixed(3)} N·m；${passesTorqueCheck?'通过':'未通过'}本例扭矩检查。`,boundary:'水平力臂、静态点负载与给定电机工作点的计算；不含杆件自重、动态加速、效率随工况变化、电流、温升及结构强度。通过此检查不表示真机选型完成。'};
    },
    render: frame => {
      const s=frame.scene, length=100+s.lever*900, end=100+length, scale=Math.max(s.requiredTorque,s.availableTorque,0.1), color=s.passesTorqueCheck?'#317c63':'#b34d42';
      return svg('水平负载的重力力臂与所需可用扭矩对比',`<circle cx="100" cy="95" r="24" fill="#447ca9"/><path d="M100 95H${end}" stroke="#7e9ab2" stroke-width="16"/><rect x="${end-20}" y="91" width="40" height="42" rx="4" fill="#e2b96a"/><path d="M${end} 135v37m-7-10 7 10 7-10" fill="none" stroke="#b34d42" stroke-width="3"/><text x="${end-62}" y="194" fill="#203a54">重力 ${number(s.gravityForce)} N</text><path d="M100 145H${end}" stroke="#526d82" stroke-dasharray="4 3"/><text x="130" y="168" fill="#203a54">力臂 ${number(s.lever)} m</text><text x="24" y="225" fill="#203a54">所需</text><rect x="82" y="211" width="${420*s.requiredTorque/scale}" height="18" rx="4" fill="#d79c70"/><text x="24" y="254" fill="#203a54">可用</text><rect x="82" y="240" width="${420*s.availableTorque/scale}" height="18" rx="4" fill="${color}"/><text x="24" y="284" fill="${color}">${s.phase<2?'先确定力与力臂':s.passesTorqueCheck?'本模型扭矩足够，仍需其他选型检查':'本模型扭矩不足'}</text>`);
    }
  };

  models['rf-fit'] = {
    presentation: 'calculation',
    controls: [
      {key:'hole',label:'孔的名义直径',min:6,max:16,step:0.1,value:8.2,unit:'mm'},
      {key:'shaft',label:'轴的名义直径',min:5.5,max:16,step:0.1,value:8,unit:'mm'},
      {key:'holeTolerance',label:'孔直径的对称公差 ±',min:0,max:0.3,step:0.01,value:0.05,unit:'mm'},
      {key:'shaftTolerance',label:'轴直径的对称公差 ±',min:0,max:0.3,step:0.01,value:0.03,unit:'mm'},
      {key:'width',label:'居中孔所在支架宽度',min:20,max:80,step:1,value:30,unit:'mm'},
      {key:'minimumEdge',label:'自定最小边缘余量',min:2,max:10,step:0.5,value:5,unit:'mm'}
    ],
    run: (p = {}) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError('参数必须是对象');
      const specs={hole:[6,16,8.2],shaft:[5.5,16,8],holeTolerance:[0,0.3,0.05],shaftTolerance:[0,0.3,0.03],width:[20,80,30],minimumEdge:[2,10,5]},v={};
      for (const [key,[min,max,fallback]] of Object.entries(specs)) {
        const value=p[key]===undefined?fallback:p[key];
        if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(key+' 超出模型范围');
        v[key]=value;
      }
      const holeMin=v.hole-v.holeTolerance,holeMax=v.hole+v.holeTolerance;
      const shaftMin=v.shaft-v.shaftTolerance,shaftMax=v.shaft+v.shaftTolerance;
      const clearanceMin=holeMin-shaftMax,clearanceMax=holeMax-shaftMin;
      const epsilon=1e-10;
      const fit=clearanceMin>epsilon?'总有间隙':clearanceMax < -epsilon?'总有过盈':Math.abs(clearanceMin)<=epsilon&&Math.abs(clearanceMax)<=epsilon?'理想零间隙':Math.abs(clearanceMin)<=epsilon?'可能恰好接触，其余有间隙':Math.abs(clearanceMax)<=epsilon?'可能恰好接触，其余有过盈':'可能间隙，也可能过盈';
      const edgeMin=(v.width-holeMax)/2;
      const passesEdgeCheck=edgeMin>=v.minimumEdge-epsilon;
      const make=(title,text,code,vars,phase)=>({title,text,code,vars,scene:{kind:'fit',width:v.width,hole:v.hole,shaft:v.shaft,holeMin,holeMax,shaftMin,shaftMax,clearanceMin,clearanceMax,edgeMin,minimumEdge:v.minimumEdge,fit,passesEdgeCheck,phase}});
      const frames=[
        make('01 名义尺寸不是每个成品的尺寸','同样写着一个孔径，制造后也可能偏大或偏小。本例分别为孔和轴指定对称直径公差；不采用任何标准配合等级。','const holeMin=v.hole-v.holeTolerance,holeMax=v.hole+v.holeTolerance;',{hole_nominal_mm:v.hole,hole_min_mm:holeMin,hole_max_mm:holeMax},0),
        make('02 找出轴的极限尺寸','判断一定装得进去，需要拿最小孔与最大轴比较。公差是尺寸范围，不是额外加到每一侧半径上的量。','const shaftMin=v.shaft-v.shaftTolerance,shaftMax=v.shaft+v.shaftTolerance;',{shaft_nominal_mm:v.shaft,shaft_min_mm:shaftMin,shaft_max_mm:shaftMax},1),
        make('03 用最不利组合算直径间隙','最小直径间隙=最小孔−最大轴；最大直径间隙=最大孔−最小轴。若要径向单边间隙，还需除以 2。','const clearanceMin=holeMin-shaftMax,clearanceMax=holeMax-shaftMin;',{minimum_diametral_clearance_mm:clearanceMin,maximum_diametral_clearance_mm:clearanceMax,fit},2),
        make('04 计算孔边到外缘的最小距离','孔居中且支架宽度视为精确，所以最大孔对应最小边缘余量。宽度公差、孔位偏差和偏心尚未加入本例。','const edgeMin=(v.width-holeMax)/2;',{bracket_width_mm:v.width,hole_max_mm:holeMax,minimum_edge_mm:edgeMin,required_edge_mm:v.minimumEdge},3),
        make('05 分别判断配合与几何约束','能装进去与边缘余量足够是两项检查；二者都不能证明材料强度足够。实际制造还要考虑工艺、表面和测量条件。','const passesEdgeCheck=edgeMin>=v.minimumEdge-epsilon;',{fit,passes_edge_check:passesEdgeCheck,minimum_clearance_mm:clearanceMin,minimum_edge_mm:edgeMin},4)
      ];
      return {frames,result:{holeMin,holeMax,shaftMin,shaftMax,clearanceMin,clearanceMax,edgeMin,fit,passesEdgeCheck},summary:`直径间隙 ${clearanceMin.toFixed(3)}～${clearanceMax.toFixed(3)} mm：${fit}；最小边缘余量 ${edgeMin.toFixed(3)} mm。`,boundary:'原创尺寸链练习；对称尺寸公差、孔居中、板宽精确。不是 ISO 配合等级，也不是材料强度、疲劳、有限元或加工质量验证。'};
    },
    render: frame => {
      const s=frame.scene, width=Math.min(300,s.width*4), x=280-width/2, radius=s.hole/s.width*width/2, color=s.passesEdgeCheck?'#317c63':'#b34d42';
      return svg('居中孔支架的名义尺寸与最不利尺寸链',`<rect x="${x}" y="45" width="${width}" height="115" rx="8" fill="#c9dce9" stroke="#447ca9" stroke-width="2"/><circle cx="280" cy="102" r="${radius}" fill="#f4f7fb" stroke="#447ca9" stroke-width="2"/><line x1="${x}" y1="180" x2="${x+width}" y2="180" stroke="#526d82"/><text x="280" y="201" text-anchor="middle" fill="#203a54">支架宽 ${number(s.width)} mm</text><text x="22" y="27" fill="#203a54">孔 ${number(s.holeMin)}～${number(s.holeMax)} mm；轴 ${number(s.shaftMin)}～${number(s.shaftMax)} mm</text><text x="22" y="234" fill="#203a54">直径间隙 ${number(s.clearanceMin)}～${number(s.clearanceMax)} mm</text><text x="22" y="260" fill="${color}">最小边缘 ${number(s.edgeMin)} mm；要求 ≥ ${number(s.minimumEdge)} mm</text><text x="22" y="286" fill="#203a54">${escape(s.fit)} · 图为名义轮廓，公差差异看数值</text>`);
    }
  };

  models['rf-beam-design']={
    presentation:'calculation',
    controls:[{key:'length',label:'悬臂有效长度',min:60,max:180,step:10,value:100,unit:'mm'},{key:'width',label:'矩形截面宽度',min:20,max:50,step:5,value:30,unit:'mm'},{key:'thickness',label:'受弯方向厚度',min:2,max:8,step:1,value:3,unit:'mm'},{key:'force',label:'末端静载荷',min:5,max:30,step:5,value:10,unit:'N'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');
      const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const length=pick('length',60,180,100),width=pick('width',20,50,30),thickness=pick('thickness',2,8,3),force=pick('force',5,30,10),E=70000,allowable=60,deflectionLimit=1,frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'beam',length,width,thickness,force,...vars}});
      add('先固定载荷与支承','理想等截面悬臂，左端完全固支，末端受竖向静载荷。毫米、牛顿与MPa保持一致。','const moment = force * length;',{length,width,thickness,force,E,allowable});
      const moment=force*length;add('根部弯矩最大','本模型仅讨论这一个受力平面；固定端柔度、冲击和疲劳未计入。','const moment = force * length;',{moment});
      const inertia=width*thickness**3/12;add('厚度以三次方影响惯性矩','受弯方向的尺寸决定h。把宽度与厚度写反会造成很大的设计错误。','const inertia = width * thickness ** 3 / 12;',{moment,inertia});
      const stress=moment*(thickness/2)/inertia;add('强度检查材料应力','E=70000MPa和许用60MPa都是教学给定值；真实材料与工况必须另查。','const stress = moment * thickness / (2 * inertia);',{moment,inertia,stress,stressRatio:stress/allowable});
      const deflection=force*length**3/(3*E*inertia);add('刚度检查位移','没有超出应力上限也可能太软。小挠度Euler–Bernoulli梁模型忽略剪切变形。','const deflection = force * length ** 3 / (3 * E * inertia);',{moment,inertia,stress,deflection});
      const pass=stress<=allowable&&deflection<=deflectionLimit;add('把两个约束分别记账','通过只是满足本例的静态模型约束，不是可制造、可承载或已完成实验的证明。','const pass = stress <= 60 && deflection <= 1;',{stress,deflection,stressRatio:stress/allowable,deflectionRatio:deflection/deflectionLimit,pass});
      return {frames,result:{moment,inertia,stress,deflection,pass,allowable,deflectionLimit},summary:'同一截面分别检查强度与刚度。',boundary:'理想静载悬臂计算；不包含固定端柔度、疲劳、冲击、局部应力或真实试验。'};
    },render:renderMechanicsExpansion
  };

  models['rf-manufacturing-datums']={
    presentation:'calculation',
    controls:[{key:'spacing',label:'两孔中心距',min:30,max:70,step:5,value:40,unit:'mm'},{key:'datumTolerance',label:'每个孔相对基准的偏差界限',min:.05,max:.3,step:.05,value:.1,unit:'mm'},{key:'hole',label:'间隙孔名义直径',min:4.2,max:5,step:.2,value:4.6,unit:'mm'},{key:'bolt',label:'螺杆最大直径',min:3.8,max:4,step:.1,value:4,unit:'mm'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const spacing=pick('spacing',30,70,40),datumTolerance=pick('datumTolerance',.05,.3,.1),hole=pick('hole',4.2,5,4.6),bolt=pick('bolt',3.8,4,4),holeLower=hole-.1,frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'datums',spacing,hole,bolt,...vars}});
      add('用同一基准描述两孔','基准点A位于左下角。孔中心为(10,15)和(10+s,15)毫米；本例把孔距误差简化为一维。','const centers = [[10,15],[10+spacing,15]];',{centers:[[10,15],[10+spacing,15]],datumTolerance});
      const worstSpacingError=2*datumTolerance;add('极限偏差按最坏方向相加','两个孔各自相对A可能向相反方向偏移，因此孔距误差界限为±2t。','const worstSpacingError = 2 * datumTolerance;',{worstSpacingError});
      const radialClearance=(holeLower-bolt)/2;add('先使用最小孔与最大螺杆','间隙半径按最坏尺寸算，不能拿名义孔径当保证值。这里两只螺杆固定在名义中心线上。','const radialClearance = (hole - 0.1 - bolt) / 2;',{holeLower,radialClearance});
      const guaranteed=radialClearance>=datumTolerance;add('检查每个孔能否覆盖其偏差','模型假定板件不能通过整体平移补偿，且仅考虑中心线一维误差。真实二维位置度与GD&T需另建模型。','const guaranteed = radialClearance >= datumTolerance;',{radialClearance,datumTolerance,guaranteed});
      const width=spacing+20,height=30;add('制造图同时写单位与基准','下载项目生成毫米坐标DXF、带标尺SVG和BOM。打印模板需要先量标尺，不能直接把屏幕像素当毫米。','const outline = {width: spacing + 20, height: 30};',{width,height,centers:[[10,15],[10+spacing,15]],guaranteed});
      return {frames,result:{centers:[[10,15],[10+spacing,15]],worstSpacingError,holeLower,radialClearance,guaranteed,width,height},summary:'基准、尺寸下限与位置误差一起决定装配余量。',boundary:'一维极限公差教学模型；未进行真实加工、GD&T验证或装配试验。'};
    },render:renderMechanicsExpansion
  };

  models['rf-design-project']={
    presentation:'calculation',
    controls:[{key:'mass',label:'小车总质量',min:1,max:5,step:.5,value:2,unit:'kg'},{key:'acceleration',label:'目标加速度',min:.2,max:1,step:.2,value:.4,unit:'m/s²'},{key:'radius',label:'驱动轮半径',min:.03,max:.07,step:.01,value:.05,unit:'m'},{key:'ratio',label:'减速比',min:2,max:8,step:1,value:4,unit:''},{key:'thickness',label:'支架厚度',min:2,max:6,step:1,value:3,unit:'mm'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const mass=pick('mass',1,5,2),acceleration=pick('acceleration',.2,1,.4),radius=pick('radius',.03,.07,.05),ratio=pick('ratio',2,8,4),thickness=pick('thickness',2,6,3),g=9.81,rolling=.03,efficiency=.8,motorTorque=.03,motorRPM=600,frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'design',mass,ratio,thickness,...vars}});
      add('需求先写成可检验条件','平地、双驱轮均分载荷，目标速度至少0.5m/s。电机连续扭矩0.03N·m与600rpm是人工给定规格。','const force = mass * (acceleration + 0.03 * 9.81);',{mass,acceleration,radius,ratio,thickness});
      const force=mass*(acceleration+rolling*g),requiredTorque=force*radius/2;add('从车体需求分配到每个驱动轮','滚阻只用μmg近似；没有坡度、轮滑或冲击。双电机必须各满足自己的连续工况。','const requiredTorque = force * radius / 2;',{force,requiredTorque});
      const availableTorque=motorTorque*ratio*efficiency,speed=motorRPM/ratio*2*Math.PI*radius/60;add('同一个减速比同时影响力与速度','增大减速比会增加轮端扭矩，同时降低车速。不能把最大扭矩和空载转速当同一真实工作点。','const availableTorque = 0.03 * ratio * 0.8;\nconst speed = 600 / ratio * 2 * Math.PI * radius / 60;',{requiredTorque,availableTorque,speed});
      const bracketForce=mass*g/2,inertia=30*thickness**3/12,stress=6*bracketForce*60/(30*thickness**2),deflection=bracketForce*60**3/(3*70000*inertia);add('把结构载荷连接到支架尺寸','每侧承受一半静重，用60mm悬臂与30mm宽矩形截面估算。真实电机反扭矩、孔边应力尚需检查。','const stress = 6 * bracketForce * 60 / (30 * thickness ** 2);',{bracketForce,inertia,stress,deflection});
      const checks={torque:availableTorque>=requiredTorque,speed:speed>=.5,strength:stress<=60,stiffness:deflection<=1};add('把四条验收拆开','任何一项失败都需要重新选择参数；没有把一个合成评分当成工程通过。','const pass = Object.values(checks).every(Boolean);',{checks,requiredTorque,availableTorque,speed,stress,deflection});
      const pass=Object.values(checks).every(Boolean);add('设计交付还包含制造与测试计划','本地项目生成图纸、BOM和空白试验记录。实际尺寸、负载、温升和行驶效果需要后来真实填写。','const packageFiles = ["bracket.dxf","drawing.svg","bom.csv","acceptance.json"];',{checks,pass,files:['bracket.dxf','drawing.svg','bom.csv','acceptance.json']});
      return {frames,result:{force,requiredTorque,availableTorque,speed,bracketForce,inertia,stress,deflection,checks,pass},summary:'由需求推导传动与支架，再生成可审查的设计文件。',boundary:'原创简化设计项目。人工电机规格不是实测工作点，图纸与计算不证明制造或硬件验收完成。'};
    },render:renderMechanicsExpansion
  };

  function renderMechanicsExpansion(frame){
    const s=frame.scene,v=frame.vars,f=x=>typeof x==='number'?Number(x.toFixed(4)):String(x),text=(x,y,value)=>`<text x="${x}" y="${y}" font-size="14" fill="#17354b">${escape(value)}</text>`;
    let drawing='';
    if(s.kind==='beam')drawing=`<path d="M65 55V220M65 130H475" stroke="#537b99" stroke-width="${s.thickness*3}"/><path d="M470 55V110l-8-12m8 12 8-12" fill="none" stroke="#c45e42" stroke-width="3"/>${text(80,90,'有效长度 '+s.length+' mm；厚度 '+s.thickness+' mm')}${text(350,45,'载荷 '+s.force+' N')}${v.deflection!==undefined?text(90,200,'末端挠度 '+f(v.deflection)+' mm'):''}`;
    else if(s.kind==='datums'){const scale=5,xx=80+s.spacing*scale;drawing=`<rect x="30" y="70" width="${(s.spacing+20)*scale}" height="150" fill="#e4eef5" stroke="#618298"/><path d="M30 230v-160m-8 150h40" stroke="#264f68"/>${[80,xx].map(x=>`<circle cx="${x}" cy="145" r="${s.hole*scale/2}" fill="white" stroke="#2f7881"/><path d="M${x-15} 145h30M${x} 130v30" stroke="#9cb2be"/>`).join('')}${text(35,50,'A基准；两孔中心距 '+s.spacing+' mm')}${text(35,250,'图示比例仅用于理解；下载DXF使用毫米坐标')}`;}
    else{drawing=`<rect x="90" y="100" width="300" height="70" rx="8" fill="#e5eef6" stroke="#4a708d"/><circle cx="150" cy="190" r="35" fill="#dae4ed" stroke="#4a708d"/><circle cx="335" cy="190" r="35" fill="#dae4ed" stroke="#4a708d"/>${text(110,135,'双驱轮 · 减速比 '+s.ratio)}${v.checks?Object.entries(v.checks).map(([k,a],i)=>text(55+(i%2)*240,35+Math.floor(i/2)*25,k+'：'+(a?'满足本例约束':'需要调整'))).join(''):text(90,60,'质量 '+s.mass+' kg · 支架 '+s.thickness+' mm')}`;}
    return svg(frame.title,drawing+text(25,285,frame.title));
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  global.RoboticsFoundationModels = Object.assign(global.RoboticsFoundationModels || {}, models);
})(globalThis);
