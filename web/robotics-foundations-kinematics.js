/* Original planar/spatial transforms, ideal two-link dynamics and trajectories. No hardware execution. */
(function (global) {
  'use strict';
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>Number(value.toFixed(4)).toString();
  const svg=(label,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 320" role="img" aria-label="${escape(label)}"><rect width="560" height="320" rx="16" fill="#f4f7fb"/>${body}</svg>`;
  const axes=(scale)=>`<path d="M25 150H535M280 15V280" stroke="#c3d1de"/><text x="528" y="170" fill="#526d82">x</text><text x="290" y="24" fill="#526d82">y</text><text x="25" y="304" fill="#526d82">右手二维坐标；向上为 +y；图上 1 m = ${number(scale)} px</text>`;
  const arm=(joints,scale,color,opacity=1)=>{
    if(!joints||joints.length!==3)return '';
    const points=joints.map(([x,y])=>[280+x*scale,150-y*scale]);
    return `<g opacity="${opacity}"><polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>${points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i===1?7:5}" fill="#f4f7fb" stroke="${color}" stroke-width="3"/>`).join('')}</g>`;
  };
  const models={};

  models['rf-transform']={
    controls:[
      {key:'x',label:'局部坐标 x',min:-2,max:2,step:0.1,value:1,unit:'m'},
      {key:'y',label:'局部坐标 y',min:-2,max:2,step:0.1,value:0,unit:'m'},
      {key:'angle',label:'局部坐标系相对世界的转角',min:-180,max:180,step:5,value:90,unit:'°'},
      {key:'tx',label:'局部原点的世界 x',min:-2,max:2,step:0.1,value:1,unit:'m'},
      {key:'ty',label:'局部原点的世界 y',min:-2,max:2,step:0.1,value:0.5,unit:'m'}
    ],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw new TypeError('参数必须是对象');
      const specs={x:[-2,2,1],y:[-2,2,0],angle:[-180,180,90],tx:[-2,2,1],ty:[-2,2,0.5]},v={};
      for(const [key,[min,max,fallback]]of Object.entries(specs)){
        const value=p[key]===undefined?fallback:p[key];
        if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(key+' 超出模型范围');
        v[key]=value;
      }
      const theta=v.angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
      const rotated=[c*v.x-s*v.y,s*v.x+c*v.y];
      const world=[rotated[0]+v.tx,rotated[1]+v.ty];
      const recovered=[c*(world[0]-v.tx)+s*(world[1]-v.ty),-s*(world[0]-v.tx)+c*(world[1]-v.ty)];
      const translatedFirst=[c*(v.x+v.tx)-s*(v.y+v.ty),s*(v.x+v.tx)+c*(v.y+v.ty)];
      const matrix=[[c,-s,v.tx],[s,c,v.ty],[0,0,1]];
      const make=(title,text,code,vars,phase)=>({title,text,code,vars,scene:{kind:'transform',local:[v.x,v.y],rotated,world,translation:[v.tx,v.ty],translatedFirst,angle:v.angle,phase}});
      const frames=[
        make('01 先写清“这个点在哪个坐标系里”','输入 (x,y) 是局部坐标。局部原点在世界坐标 (tx,ty)，局部轴相对世界逆时针转 angle。相同数字换一个坐标系可能是不同的点。','const theta=v.angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);',{local_point_m:[v.x,v.y],frame_angle_deg:v.angle,local_origin_in_world_m:[v.tx,v.ty]},0),
        make('02 将局部向量转到世界的轴方向','采用列向量和逆时针正角。旋转矩阵的两列分别是局部 x 轴和 y 轴在世界中的方向。旋转保持向量长度。','const rotated=[c*v.x-s*v.y,s*v.x+c*v.y];',{cos_theta:c,sin_theta:s,rotated_point_m:rotated,original_length_m:Math.hypot(v.x,v.y),rotated_length_m:Math.hypot(...rotated)},1),
        make('03 加上局部原点的世界位置','把方向换好后，再加原点位移：p_world=R·p_local+t。平移是世界坐标中的向量，不要先把它和局部点相加。','const world=[rotated[0]+v.tx,rotated[1]+v.ty];',{world_point_m:world,homogeneous_matrix:matrix},2),
        make('04 逆变换要先减平移，再反向旋转','旋转矩阵的逆等于转置。用 Rᵀ(p_world−t) 回到局部坐标，可以检查方向和顺序有没有弄错。','const recovered=[c*(world[0]-v.tx)+s*(world[1]-v.ty),-s*(world[0]-v.tx)+c*(world[1]-v.ty)];',{recovered_local_m:recovered,reconstruction_error_m:Math.hypot(recovered[0]-v.x,recovered[1]-v.y)},3),
        make('05 比较另一种运算顺序','R(p+t) 与 Rp+t 通常不同。这里的另一结果只是顺序反例，不能当成本课定义的坐标变换。','const translatedFirst=[c*(v.x+v.tx)-s*(v.y+v.ty),s*(v.x+v.tx)+c*(v.y+v.ty)];',{rotate_then_translate_m:world,translate_then_rotate_m:translatedFirst,order_difference_m:Math.hypot(world[0]-translatedFirst[0],world[1]-translatedFirst[1])},4)
      ];
      return {frames,result:{local:[v.x,v.y],rotated,world,recovered,translatedFirst,matrix},summary:`世界坐标为 (${world[0].toFixed(3)}, ${world[1].toFixed(3)}) m；逆变换可回到输入点。`,boundary:'Modern Robotics 三维刚体变换概念的原创二维缩小例子。采用列向量、逆时针正角和世界坐标平移；不计算标定误差或真实 TF 时间同步。'};
    },
    render:frame=>{
      const s=frame.scene,points=[s.local,s.rotated,s.world,s.translatedFirst,s.translation],extent=Math.max(2,...points.flat().map(Math.abs)),scale=Math.min(57,112/extent),point=(p,color,label)=>`<circle cx="${280+p[0]*scale}" cy="${150-p[1]*scale}" r="6" fill="${color}"/><text x="${Math.min(440,286+p[0]*scale)}" y="${Math.max(35,142-p[1]*scale)}" fill="${color}">${escape(label)}</text>`;
      const shown=s.phase===0?s.local:s.phase===1?s.rotated:s.world;
      return svg('局部点先旋转再平移，并比较错误顺序',axes(scale)+`<path d="M280 150L${280+s.rotated[0]*scale} ${150-s.rotated[1]*scale}L${280+s.world[0]*scale} ${150-s.world[1]*scale}" fill="none" stroke="#9bafbf" stroke-dasharray="5 4"/>`+point(s.local,'#a278b4','局部数值')+(s.phase>=1?point(s.rotated,'#447ca9','旋转后'):'')+(s.phase>=2?point(s.world,'#317c63','世界点'):'')+(s.phase===4?point(s.translatedFirst,'#b34d42','另一顺序'):'')+`<text x="22" y="26" fill="#203a54">当前点 (${number(shown[0])}, ${number(shown[1])}) m；θ=${number(s.angle)}°</text>`);
    }
  };

  models['rf-forward-kinematics']={
    controls:[
      {key:'l1',label:'第一连杆长度',min:0.3,max:2,step:0.1,value:1,unit:'m'},
      {key:'l2',label:'第二连杆长度',min:0.3,max:2,step:0.1,value:0.8,unit:'m'},
      {key:'theta1',label:'肩关节角（相对世界 x）',min:-180,max:180,step:5,value:30,unit:'°'},
      {key:'theta2',label:'肘关节角（相对第一杆）',min:-180,max:180,step:5,value:60,unit:'°'}
    ],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw new TypeError('参数必须是对象');
      const specs={l1:[0.3,2,1],l2:[0.3,2,0.8],theta1:[-180,180,30],theta2:[-180,180,60]},v={};
      for(const[key,[min,max,fallback]]of Object.entries(specs)){
        const value=p[key]===undefined?fallback:p[key];
        if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(key+' 超出模型范围');
        v[key]=value;
      }
      const a=v.theta1*Math.PI/180,b=v.theta2*Math.PI/180;
      const elbow=[v.l1*Math.cos(a),v.l1*Math.sin(a)];
      const second=[v.l2*Math.cos(a+b),v.l2*Math.sin(a+b)];
      const tip=[elbow[0]+second[0],elbow[1]+second[1]];
      const jacobian=[[-v.l1*Math.sin(a)-v.l2*Math.sin(a+b),-v.l2*Math.sin(a+b)],[v.l1*Math.cos(a)+v.l2*Math.cos(a+b),v.l2*Math.cos(a+b)]];
      const determinant=v.l1*v.l2*Math.sin(b);
      const singular=Math.abs(determinant)<1e-10;
      const make=(title,text,code,vars,phase)=>({title,text,code,vars,scene:{kind:'fk',l1:v.l1,l2:v.l2,theta1:v.theta1,theta2:v.theta2,elbow,tip,second,singular,determinant,phase,joints:[[0,0],elbow,tip]}});
      const frames=[
        make('01 关节角是相对角，不是两杆各自的世界角','肩角相对世界 x 轴；肘角相对第一根杆。两角都逆时针为正，因此第二杆的世界方向是 θ₁+θ₂。','const a=v.theta1*Math.PI/180,b=v.theta2*Math.PI/180;',{theta1_deg:v.theta1,theta2_relative_deg:v.theta2,second_absolute_deg:v.theta1+v.theta2},0),
        make('02 求肘关节的位置','长度乘余弦得到 x 分量，乘正弦得到 y 分量。第一杆端点就是肘关节，尚未包含第二杆。','const elbow=[v.l1*Math.cos(a),v.l1*Math.sin(a)];',{elbow_m:elbow,first_link_length_m:Math.hypot(...elbow)},1),
        make('03 在正确的世界方向上放第二杆','第二杆从肘关节出发。先计算它的位移向量，再相加；不能把这个向量直接当成末端位置。','const second=[v.l2*Math.cos(a+b),v.l2*Math.sin(a+b)];',{second_displacement_m:second,second_absolute_deg:v.theta1+v.theta2},2),
        make('04 相加得到末端位置','正运动学从关节角出发得到末端位置；这里给定的角度只对应一个位置。每次改变参数，都重新计算两个向量。','const tip=[elbow[0]+second[0],elbow[1]+second[1]];',{tip_m:tip,tip_distance_m:Math.hypot(...tip),outer_reach_m:v.l1+v.l2,inner_reach_m:Math.abs(v.l1-v.l2)},3),
        make('05 用 Jacobian 行列式观察奇异位形','本课只看二维位置任务。det J=L₁L₂sinθ₂；两杆共线时为零，末端瞬时少一个独立运动方向，但正运动学本身仍然有定义。','const determinant=v.l1*v.l2*Math.sin(b);\nconst singular=Math.abs(determinant)<1e-10;',{jacobian,determinant_m2:determinant,singular},4)
      ];
      return {frames,result:{elbow,second,tip,jacobian,determinant,singular,absoluteAngleDegrees:v.theta1+v.theta2},summary:`末端 (${tip[0].toFixed(3)}, ${tip[1].toFixed(3)}) m；${singular?'处于二维位置奇异位形':'二维位置 Jacobian 非奇异'}。`,boundary:'无关节限制、碰撞、杆件厚度与动力学的平面 2R 刚杆模型。可复算的位置不是电机执行或真机标定证据。'};
    },
    render:frame=>{
      const s=frame.scene,scale=115/(s.l1+s.l2),joints=s.phase<2?[[0,0],s.elbow,s.elbow]:s.joints;
      return svg('平面两连杆机械臂的相对角与末端位置',axes(scale)+arm(joints,scale,'#447ca9')+`<circle cx="280" cy="150" r="${(s.l1+s.l2)*scale}" fill="none" stroke="#d4e2dc" stroke-dasharray="4 5"/><text x="20" y="26" fill="#203a54">θ₁=${number(s.theta1)}°，θ₂=${number(s.theta2)}°；第二杆世界角 ${number(s.theta1+s.theta2)}°</text><text x="20" y="278" fill="${s.singular?'#b34d42':'#317c63'}">${s.phase<3?'先分解两个位移，再求和':`末端 (${number(s.tip[0])}, ${number(s.tip[1])}) m；${s.singular?'奇异位形':'非奇异'}`}</text>`);
    }
  };

  models['rf-inverse-kinematics']={
    controls:[
      {key:'l1',label:'第一连杆长度',min:0.3,max:2,step:0.1,value:1,unit:'m'},
      {key:'l2',label:'第二连杆长度',min:0.3,max:2,step:0.1,value:1,unit:'m'},
      {key:'x',label:'目标世界 x',min:-3,max:3,step:0.1,value:1,unit:'m'},
      {key:'y',label:'目标世界 y',min:-3,max:3,step:0.1,value:1,unit:'m'},
      {key:'branch',label:'选择肘角分支',options:['θ₂ 非负的分支','θ₂ 非正的分支'],value:0}
    ],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw new TypeError('参数必须是对象');
      const specs={l1:[0.3,2,1],l2:[0.3,2,1],x:[-3,3,1],y:[-3,3,1],branch:[0,1,0]},v={};
      for(const[key,[min,max,fallback]]of Object.entries(specs)){
        const value=p[key]===undefined?fallback:p[key];
        if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(key==='branch'&&!Number.isInteger(value)))throw new RangeError(key+' 超出模型范围');
        v[key]=value;
      }
      const radius=Math.hypot(v.x,v.y),inner=Math.abs(v.l1-v.l2),outer=v.l1+v.l2,epsilon=1e-12;
      const reachable=radius>=inner-epsilon&&radius<=outer+epsilon;
      const infiniteSolutions=reachable&&radius<epsilon&&Math.abs(v.l1-v.l2)<epsilon;
      const cosine=(v.x*v.x+v.y*v.y-v.l1*v.l1-v.l2*v.l2)/(2*v.l1*v.l2);
      let solutions=[],selected=null,reason='',singular=null;
      if(!reachable){reason=radius>outer?'目标太远，超过两杆长度之和':'目标太近，位于两杆长度差形成的内孔';}
      else if(infiniteSolutions){
        singular=true;
        selected={theta1:0,theta2:Math.PI,theta1Degrees:0,theta2Degrees:180,elbow:[v.l1,0],tip:[0,0],residual:0,determinant:0};
        solutions=[selected];reason='两杆等长且目标在原点：θ₂=π，肩角任意；图中只展示一个代表解';
      }else{
        const magnitude=Math.acos(Math.max(-1,Math.min(1,cosine)));
        const signs=Math.abs(Math.sin(magnitude))<1e-10?[1]:[1,-1];
        solutions=signs.map(sign=>{
          const theta2=sign*magnitude;
          const theta1=Math.atan2(v.y,v.x)-Math.atan2(v.l2*Math.sin(theta2),v.l1+v.l2*Math.cos(theta2));
          const elbow=[v.l1*Math.cos(theta1),v.l1*Math.sin(theta1)];
          const tip=[elbow[0]+v.l2*Math.cos(theta1+theta2),elbow[1]+v.l2*Math.sin(theta1+theta2)];
          return {theta1,theta2,theta1Degrees:theta1*180/Math.PI,theta2Degrees:theta2*180/Math.PI,elbow,tip,residual:Math.hypot(tip[0]-v.x,tip[1]-v.y),determinant:v.l1*v.l2*Math.sin(theta2)};
        });
        selected=solutions[Math.min(v.branch,solutions.length-1)];
        singular=Math.abs(selected.determinant)<1e-10;
        reason=solutions.length===2?'存在两个不同肘角分支；两者可达同一目标':'处于工作空间边界，两个肘角分支合并（按角度模 2π 计）';
      }
      const make=(title,text,code,vars,phase)=>({title,text,code,vars,scene:{kind:'ik',target:[v.x,v.y],l1:v.l1,l2:v.l2,inner,outer,radius,reachable,infiniteSolutions,singular,reason,phase,joints:selected?[[0,0],selected.elbow,selected.tip]:null,alternatives:solutions.map(s=>[[0,0],s.elbow,s.tip])}});
      const frames=[
        make('01 用目标距离判断是否有几何解','只有落在半径 |L₁−L₂| 到 L₁+L₂ 的圆环内，末端才可能到达。先做可达检查，不能把非法余弦强行截断成一个“成功解”。','const radius=Math.hypot(v.x,v.y),inner=Math.abs(v.l1-v.l2),outer=v.l1+v.l2;\nconst reachable=radius>=inner-epsilon&&radius<=outer+epsilon;',{radius_m:radius,inner_radius_m:inner,outer_radius_m:outer,reachable},0),
        make('02 从余弦定理得到肘角条件',reachable?'连接基座、肘关节、目标形成三角形。cosθ₂=(x²+y²−L₁²−L₂²)/(2L₁L₂)。边界附近只修正浮点舍入。':reason+'。本步只展示诊断数值，不执行 acos。','const cosine=(v.x*v.x+v.y*v.y-v.l1*v.l1-v.l2*v.l2)/(2*v.l1*v.l2);',{cos_theta2:cosine,acos_allowed:reachable},1),
        make('03 保留解的数量与分支',!reachable?'没有解，停止后续角度计算。':infiniteSolutions?reason:'一般情况下 θ₂=±acos(cosθ₂)。肩角由 atan2(y,x) 减去三角形内部偏角得到。',!reachable?"if(!reachable){reason=radius>outer?'目标太远，超过两杆长度之和':'目标太近，位于两杆长度差形成的内孔';}":infiniteSolutions?'selected={theta1:0,theta2:Math.PI,theta1Degrees:0,theta2Degrees:180,elbow:[v.l1,0],tip:[0,0],residual:0,determinant:0};':'const theta2=sign*magnitude;\nconst theta1=Math.atan2(v.y,v.x)-Math.atan2(v.l2*Math.sin(theta2),v.l1+v.l2*Math.cos(theta2));',{solution_count:!reachable?0:infiniteSolutions?'无穷多':solutions.length,selected_theta1_deg:selected?selected.theta1Degrees:null,selected_theta2_deg:selected?selected.theta2Degrees:null},2),
        make('04 把求出的角度代回正运动学',selected?'求角度只是候选解。再由这两个角重算肘关节和末端，并与原目标比较；这次复算是几何一致性检查。':'保持不可达状态，不绘制已到达目标的机械臂。',!selected?'let solutions=[],selected=null,reason=\'\',singular=null;':infiniteSolutions?'solutions=[selected];':'const tip=[elbow[0]+v.l2*Math.cos(theta1+theta2),elbow[1]+v.l2*Math.sin(theta1+theta2)];',{reconstructed_tip_m:selected?selected.tip:null,residual_m:selected?selected.residual:null,status:reason},3),
        make('05 区分可达、奇异与真实可执行','奇异是局部速度映射退化，不等于位置不可达。即使几何上有解，还必须检查关节限制、碰撞、动力学与真实执行器。',!selected?'let solutions=[],selected=null,reason=\'\',singular=null;':infiniteSolutions?'singular=true;':'singular=Math.abs(selected.determinant)<1e-10;',{reachable,singular,infinite_solutions:infiniteSolutions,determinant_m2:selected?selected.determinant:null},4)
      ];
      return {frames,result:{reachable,infiniteSolutions,solutionCount:!reachable?0:infiniteSolutions?'无穷多':solutions.length,solutions,selected,cosine,radius,inner,outer,singular,reason},summary:reason,boundary:'无关节限制和碰撞的平面 2R 解析逆解；角度按模 2π 视为相同。等长杆原点是无穷多肩角的退化特例。浏览器复算不等于机器人完成运动。'};
    },
    render:frame=>{
      const s=frame.scene,extent=Math.max(s.outer,Math.abs(s.target[0]),Math.abs(s.target[1]),1),scale=112/extent,targetX=280+s.target[0]*scale,targetY=150-s.target[1]*scale;
      const workspace=`<circle cx="280" cy="150" r="${s.outer*scale}" fill="#e1eee6" stroke="#8fb29d"/>${s.inner>0?`<circle cx="280" cy="150" r="${s.inner*scale}" fill="#f4f7fb" stroke="#8fb29d"/>`:''}`;
      const alternatives=s.phase>=2?s.alternatives.map(j=>arm(j,scale,'#71889c',0.25)).join(''):'';
      return svg('平面机械臂圆环工作空间与逆运动学分支',workspace+axes(scale)+alternatives+(s.phase>=2?arm(s.joints,scale,'#447ca9'):'')+`<path d="M${targetX-7} ${targetY-7}l14 14m0-14-14 14" stroke="${s.reachable?'#317c63':'#b34d42'}" stroke-width="3"/><text x="20" y="25" fill="#203a54">目标 (${number(s.target[0])}, ${number(s.target[1])}) m；范围 ${number(s.inner)}～${number(s.outer)} m</text><text x="20" y="280" fill="${s.reachable?'#317c63':'#b34d42'}">${!s.reachable?'不可达：不生成关节命令':s.infiniteSolutions?'无穷多肩角解，显示代表解':s.singular?'可达，但处于奇异边界':'可达；切换分支可观察不同肘角'}</text>`);
    }
  };

  models['rf-rotation3d']={
    controls:[{key:'roll',label:'绕x旋转 roll',min:-90,max:90,step:15,value:30,unit:'°'},{key:'pitch',label:'绕y旋转 pitch',min:-90,max:90,step:15,value:45,unit:'°'},{key:'yaw',label:'绕z旋转 yaw',min:-90,max:90,step:15,value:60,unit:'°'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x< -90||x>90)throw RangeError(k+'超出范围');return x*Math.PI/180;};
      const a=pick('roll',30),b=pick('pitch',45),c=pick('yaw',60),Rx=[[1,0,0],[0,Math.cos(a),-Math.sin(a)],[0,Math.sin(a),Math.cos(a)]],Ry=[[Math.cos(b),0,Math.sin(b)],[0,1,0],[-Math.sin(b),0,Math.cos(b)]],Rz=[[Math.cos(c),-Math.sin(c),0],[Math.sin(c),Math.cos(c),0],[0,0,1]],point=[1,2,1],frames=[];
      const mv=(A,v)=>A.map(row=>row.reduce((s,x,i)=>s+x*v[i],0)),mm=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((s,x,k)=>s+x*B[k][j],0))),transpose=A=>A[0].map((_,j)=>A.map(row=>row[j]));
      const add=(title,text,code,vars,current)=>frames.push({title,text,code,vars,scene:{kind:'rotation3d',point,current:current||point,...vars}});
      add('列向量与右手系先固定','对同一个向量依次绕固定世界x、y、z轴主动旋转，合成矩阵为Rz Ry Rx，最右边先作用。','const point = [1,2,1];',{point,Rx,Ry,Rz},point);
      const afterX=mv(Rx,point);add('先绕固定x轴','旋转保持三维长度；图中采用固定等距投影，屏幕距离并不等于三维距离。','const afterX = Rx.map(row => dot(row, point));',{afterX},afterX);
      const afterY=mv(Ry,afterX);add('再绕固定y轴','这里的y仍指世界y轴。若改成随物体移动的轴，乘法约定需要一起改变。','const afterY = Ry.map(row => dot(row, afterX));',{afterY},afterY);
      const R=mm(Rz,mm(Ry,Rx)),output=mv(R,point);add('最后绕z轴，形成完整SO(3)矩阵','不要逐项相加旋转矩阵。R由矩阵乘法合成。','const R = multiply(Rz, multiply(Ry, Rx));\nconst output = R.map(row => dot(row, point));',{R,output},output);
      const restored=mv(transpose(R),output),orthogonal=mm(transpose(R),R),inverseError=Math.hypot(...restored.map((x,i)=>x-point[i])),determinant=R[0][0]*(R[1][1]*R[2][2]-R[1][2]*R[2][1])-R[0][1]*(R[1][0]*R[2][2]-R[1][2]*R[2][0])+R[0][2]*(R[1][0]*R[2][1]-R[1][1]*R[2][0]);
      add('用正交性、行列式与逆变换核验','合法旋转满足RᵀR=I与det R=1。欧拉角有奇异表示，不影响本次矩阵乘法的定义。','const restored = transpose(R).map(row => dot(row, output));',{R,orthogonal,determinant,restored,inverseError,inputNorm:Math.hypot(...point),outputNorm:Math.hypot(...output)},output);
      return {frames,result:{R,point,output,restored,orthogonal,determinant,inverseError},summary:'用三个基本旋转组成三维姿态并独立核验。',boundary:'固定世界轴的主动旋转；图为等距投影，不提供真实相机标定或机器人姿态测量。'};
    },render:renderKinematicsExpansion
  };

  models['rf-se3-chain']={
    controls:[{key:'yaw',label:'机体绕世界z轴',min:-90,max:90,step:15,value:90,unit:'°'},{key:'tx',label:'机体世界x',min:-1,max:2,step:.5,value:1,unit:'m'},{key:'ty',label:'机体世界y',min:-1,max:2,step:.5,value:0,unit:'m'},{key:'tz',label:'机体世界z',min:0,max:2,step:.5,value:.5,unit:'m'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const yaw=pick('yaw',-90,90,90)*Math.PI/180,t=[pick('tx',-1,2,1),pick('ty',-1,2,0),pick('tz',0,2,.5)],R=[[Math.cos(yaw),-Math.sin(yaw),0],[Math.sin(yaw),Math.cos(yaw),0],[0,0,1]],camera=[.2,0,.5],local=[1,0,0],frames=[];
      const mv=(A,v)=>A.map(row=>row.reduce((s,x,i)=>s+x*v[i],0));
      const add=(title,text,code,vars,current)=>frames.push({title,text,code,vars,scene:{kind:'se3',origin:t,camera,local,current:current||local,...vars}});
      const T=[...R.map((row,i)=>[...row,t[i]]),[0,0,0,1]];add('下标写清变换方向','T_WB把机体B坐标变成世界W坐标；T_BC把相机C坐标变成机体坐标。本例相机与机体轴平行。','const T_WB = [[...R[0],tx],[...R[1],ty],[...R[2],tz],[0,0,0,1]];',{T_WB:T,T_BC:[[1,0,0,.2],[0,1,0,0],[0,0,1,.5],[0,0,0,1]],local},local);
      const bodyPoint=local.map((x,i)=>x+camera[i]);add('先把相机点换到机体','相机偏移以机体坐标描述。顺序由相邻下标C→B→W决定。','const bodyPoint = local.map((x,i) => x + camera[i]);',{bodyPoint},bodyPoint);
      const rotated=mv(R,bodyPoint);add('再把机体向量换到世界轴','旋转的对象包括相机偏移，不应把机体偏移误当成世界偏移直接相加。','const rotated = R.map(row => dot(row, bodyPoint));',{rotated},rotated);
      const world=rotated.map((x,i)=>x+t[i]),cameraWorld=mv(R,camera).map((x,i)=>x+t[i]);add('最后平移世界原点','齐次矩阵链T_WC=T_WB T_BC把这些步骤合在一起。','const world = rotated.map((x,i) => x + translation[i]);',{world,cameraWorld,T_WC:[...R.map((row,i)=>[...row,cameraWorld[i]]),[0,0,0,1]]},world);
      const centered=world.map((x,i)=>x-t[i]),restored=R[0].map((_,j)=>R.reduce((s,row,i)=>s+row[j]*centered[i],0)).map((x,i)=>x-camera[i]),wrong=mv(R,local).map((x,i)=>x+t[i]+camera[i]),inverseError=Math.hypot(...restored.map((x,i)=>x-local[i]));
      add('逆链按相反顺序撤销','先减世界平移、再Rᵀ，最后减相机偏移。错误顺序的反例与正确结果并列。','const restored = transpose(R).map(row => dot(row, centered)).map((x,i) => x-camera[i]);',{world,restored,inverseError,wrong,orderError:Math.hypot(...wrong.map((x,i)=>x-world[i]))},world);
      return {frames,result:{R,T_WB:T,local,bodyPoint,world,cameraWorld,restored,inverseError,wrong},summary:'按坐标系下标组合三维刚体变换。',boundary:'人工SE(3)链与固定相机偏移；没有真实TF时间戳、标定误差或硬件坐标。'};
    },render:renderKinematicsExpansion
  };

  models['rf-arm-dynamics']={
    presentation:'calculation',
    controls:[{key:'q1',label:'第一关节相对水平',min:-90,max:90,step:15,value:30,unit:'°'},{key:'q2',label:'第二关节相对第一杆',min:-90,max:90,step:15,value:45,unit:'°'},{key:'acceleration',label:'第一关节加速度',min:-2,max:2,step:.5,value:1,unit:'rad/s²'},{key:'velocity',label:'两关节速度',min:0,max:2,step:.5,value:.5,unit:'rad/s'}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const q1=pick('q1',-90,90,30)*Math.PI/180,q2=pick('q2',-90,90,45)*Math.PI/180,a=pick('acceleration',-2,2,1),v=pick('velocity',0,2,.5),m1=1,m2=1,l1=1,l2=1,lc1=.5,lc2=.5,I1=1/12,I2=1/12,g=9.81,frames=[];
      const add=(title,text,code,vars)=>frames.push({title,text,code,vars,scene:{kind:'dynamics',q1,q2,...vars}});
      add('明确两杆质量分布与角度','两根均匀细杆均长1m、质量1kg，转动惯量I=mL²/12。q1从世界水平量起，q2为相对角；重力向下。','const inertia = 1 / 12, centers = [0.5,0.5];',{q1,q2,velocity:[v,v],acceleration:[a,0]});
      const M=[[I1+I2+m1*lc1**2+m2*(l1**2+lc2**2+2*l1*lc2*Math.cos(q2)),I2+m2*(lc2**2+l1*lc2*Math.cos(q2))],[I2+m2*(lc2**2+l1*lc2*Math.cos(q2)),I2+m2*lc2**2]];
      add('质量矩阵把加速度映射为惯性扭矩','M随q2变化且对称正定。非对角项表示两个关节的耦合，不能把每杆都当孤立电机。','const M12 = 1/12 + 1/4 + 0.5*Math.cos(q2);',{M,determinant:M[0][0]*M[1][1]-M[0][1]**2});
      const h=m2*l1*lc2*Math.sin(q2),C=[-h*(2*v*v+v*v),h*v*v];add('运动还产生速度相关项','两关节速度均为v，C是C(q,q̇)q̇整个向量。速度归零时这一项归零。','const C = [-h*(2*dq1*dq2+dq2*dq2),h*dq1*dq1];',{M,C});
      const G=[(m1*lc1+m2*l1)*g*Math.cos(q1)+m2*lc2*g*Math.cos(q1+q2),m2*lc2*g*Math.cos(q1+q2)];add('保持不动也可能需要扭矩','G由势能对关节角求导；竖直姿态和水平姿态的重力矩不同。','const G2 = 0.5 * 9.81 * Math.cos(q1+q2);',{G});
      const inertial=[M[0][0]*a,M[1][0]*a],torque=inertial.map((x,i)=>x+C[i]+G[i]);add('逆动力学叠加三个来源','τ=Mq̈+C+G。这里q̈2固定为0；不给出执行器电流、摩擦或负载补偿结论。','const torque = inertial.map((x,i) => x+C[i]+G[i]);',{inertial,C,G,torque});
      const rhs=torque.map((x,i)=>x-C[i]-G[i]),det=M[0][0]*M[1][1]-M[0][1]**2,recovered=[(M[1][1]*rhs[0]-M[0][1]*rhs[1])/det,(-M[1][0]*rhs[0]+M[0][0]*rhs[1])/det],kinetic=.5*v*v*(M[0][0]+2*M[0][1]+M[1][1]);add('再用正动力学还原加速度','解2×2线性方程独立检查扭矩。动能非负是另一条可用的不变量。','const recovered = solve2x2(M, torque.map((x,i)=>x-C[i]-G[i]));',{M,torque,recovered,kinetic});
      return {frames,result:{M,C,G,inertial,torque,recovered,kinetic,determinant:det},summary:'计算两杆模型的惯性、速度和重力扭矩。',boundary:'均匀细杆理想刚体，未计摩擦、齿隙、弹性、碰撞、执行器和真实负载辨识。'};
    },render:renderKinematicsExpansion
  };

  models['rf-joint-trajectory']={
    controls:[{key:'duration',label:'运动总时间',min:1,max:5,step:.5,value:2,unit:'s'},{key:'target',label:'目标关节角',min:30,max:120,step:15,value:90,unit:'°'},{key:'quintic',label:'时间标度',min:0,max:1,step:1,value:1,options:['三次：端点速度0','五次：端点速度与加速度0']}],
    run:(p={})=>{
      if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('参数必须是对象');const pick=(k,min,max,d)=>{const x=p[k]??d;if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw RangeError(k+'超出范围');return x;};
      const T=pick('duration',1,5,2),target=pick('target',30,120,90),quintic=pick('quintic',0,1,1);if(!Number.isInteger(quintic))throw RangeError('时间标度选项无效');const frames=[],samples=[];
      for(let i=0;i<=12;i++){const u=i/12,t=u*T,s=quintic?10*u**3-15*u**4+6*u**5:3*u**2-2*u**3,ds=quintic?(30*u**2-60*u**3+30*u**4)/T:(6*u-6*u**2)/T,dds=quintic?(60*u-180*u**2+120*u**3)/T**2:(6-12*u)/T**2,q=target*s,velocity=target*ds,acceleration=target*dds;samples.push({t,s,q,velocity,acceleration});frames.push({title:'t='+Number(t.toFixed(3))+'s：位置由时间标度决定',text:i===0?'三次保证端点速度0，五次额外保证端点加速度0。关节从0到给定目标，未加入障碍物。':'位置、速度和加速度来自同一多项式及其导数。时间缩短会同时提高速度与加速度需求。',code:quintic?'const s=10*u**3-15*u**4+6*u**5;\nconst q=target*s;':'const s=3*u**2-2*u**3;\nconst q=target*s;',vars:{t,u,s,q,velocity,acceleration,T},scene:{kind:'trajectory',q,target,samples:samples.map(x=>({...x})),T}});}
      const peakVelocity=target*(quintic?1.875:1.5)/T,peakAcceleration=target*(quintic?10/Math.sqrt(3):6)/T**2;
      frames.push({title:'解析峰值比采样峰值更可靠',text:'离散帧可能错过加速度峰值，所以额外给出解析上界；随后还要与关节速度、加速度和动力学扭矩约束比较。',code:'const peakVelocity=target*(quintic?1.875:1.5)/T;\nconst peakAcceleration=target*(quintic?10/Math.sqrt(3):6)/T**2;',vars:{peakVelocity,peakAcceleration},scene:{kind:'trajectory',q:target,target,samples,T}});
      return {frames,result:{samples,peakVelocity,peakAcceleration,start:samples[0],end:samples.at(-1)},summary:'从路径参数得到同时一致的位置、速度和加速度。',boundary:'单关节多项式时间标度，无碰撞检查、关节耦合或真实轨迹执行；屏幕时间不替代物理采样时间。'};
    },render:renderKinematicsExpansion
  };

  function renderKinematicsExpansion(frame){
    const s=frame.scene,project=v=>[270+70*v[0]-45*v[1],175-65*v[2]+22*(v[0]+v[1])],text=(x,y,v)=>`<text x="${x}" y="${y}" font-size="13" fill="#18384f">${escape(v)}</text>`;let body='';
    if(s.kind==='rotation3d'||s.kind==='se3'){
      const origin=project([0,0,0]);body=[[2,0,0],[0,2,0],[0,0,2]].map((v,i)=>{const a=project(v);return `<path d="M${origin}L${a}" stroke="${['#c06545','#318981','#617ec0'][i]}" stroke-width="2"/>${text(a[0]+3,a[1],['x','y','z'][i])}`;}).join('');
      for(const [i,v] of [s.point||s.local,s.current].entries()){const end=project(v);body+=`<path d="M${origin}L${end}" stroke="${i?'#267e78':'#aebdcb'}" stroke-width="${i?4:2}"/><circle cx="${end[0]}" cy="${end[1]}" r="5" fill="${i?'#267e78':'#aebdcb'}"/>`;}
      body+=text(20,35,'固定三维等距投影：'+s.current.map(x=>Number(x.toFixed(3))).join(', '));
    }else if(s.kind==='dynamics'){
      const a=[220,205],b=[220+100*Math.cos(s.q1),205-100*Math.sin(s.q1)],c=[b[0]+100*Math.cos(s.q1+s.q2),b[1]-100*Math.sin(s.q1+s.q2)];body=`<path d="M${a}L${b}L${c}" fill="none" stroke="#3a789c" stroke-width="10"/>${[a,b,c].map(x=>`<circle cx="${x[0]}" cy="${x[1]}" r="7" fill="#204b68"/>`).join('')}`;if(frame.vars.torque)body+=text(25,40,'τ = ['+frame.vars.torque.map(x=>Number(x.toFixed(3))).join(', ')+'] N·m');if(frame.vars.M)body+=text(25,65,'M = '+JSON.stringify(frame.vars.M.map(row=>row.map(x=>Number(x.toFixed(3))))));
    }else{
      const values=s.samples,xx=t=>40+470*t/s.T,yy=q=>250-170*q/Math.max(s.target,1);body=`<path d="M40 65V250H520" fill="none" stroke="#c3d1de"/><polyline points="${values.map(x=>xx(x.t)+','+yy(x.q)).join(' ')}" fill="none" stroke="#2d7c77" stroke-width="3"/>${text(40,40,'已计算位置（°）；时间（s）')}${text(40,285,frame.vars.peakVelocity===undefined?'当前关节角 '+number(s.q)+'°':'解析峰值速度 '+number(frame.vars.peakVelocity)+'°/s')}`;
    }return svg(frame.title,body+text(20,310,frame.title));
  }

  if(typeof module!=='undefined'&&module.exports)module.exports=models;
  global.RoboticsFoundationModels=Object.assign(global.RoboticsFoundationModels||{},models);
})(globalThis);
