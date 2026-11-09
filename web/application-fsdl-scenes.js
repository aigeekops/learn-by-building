/* Original data-driven FSDL SVG scenes; rendering never reruns models or reads final results. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ApplicationFSDLScenes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const C={ink:'#18384c',muted:'#6f8390',line:'#cbd9df',pale:'#f0f5f7',blue:'#3c68b8',green:'#137b70',mint:'#daf2e9',orange:'#b56b20',sand:'#fff0d8',red:'#b44558',rose:'#ffe5e9',white:'#fff'};
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),fmt=x=>typeof x==='number'?Number.isFinite(x)?String(Number(x.toFixed(4))):'?':x===null?'未知':String(x??'等待');
  const txt=(x,y,s,size=14,color=C.ink,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${esc(fmt(s))}</text>`;
  const rect=(x,y,w,h,fill=C.white,stroke=C.line,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;
  const line=(x1,y1,x2,y2,color=C.line,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${extra}/>`;
  const circle=(x,y,r,fill=C.white,stroke=C.line,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;
  const motion=(on,type='active')=>on?`data-fid-motion="${type}"`:'';
  const value=(key,n)=>`data-fsdl-output="${esc(key)}" data-fsdl-value="${esc(fmt(n))}"`;
  const pill=(x,y,w,label,on=false,color=C.green)=>rect(x,y,w,35,on?C.mint:C.pale,on?color:C.line,motion(on))+txt(x+10,y+23,label,13,on?color:C.muted);
  function metrics(g){
    const {v,p,frame}=g,rows=v.rows||[],checked=v.checked||[];let out=txt(30,32,'同一组分数：阈值 → 四类计数 → 任务代价',17);
    out+=line(50,90,355,90,C.line)+line(50+p.threshold*305,60,50+p.threshold*305,220,C.orange,'stroke-dasharray="5 4"')+txt(50+p.threshold*305,52,'阈值 '+fmt(p.threshold),11,C.orange,'text-anchor="middle"');
    rows.forEach((r,i)=>{const done=checked.find(x=>x.index===i),x=50+r.score*305,y=112+i*23;const color=done?(done.predicted===r.y?C.green:C.red):C.line;
      out+=circle(x,y,8,done?(done.predicted===r.y?C.mint:C.rose):C.white,color,motion(i===v.index,'token'))+txt(16,y+5,'r'+i,11,C.muted)+txt(375,y+5,done?done.predicted+' / '+r.y:'待判断',11,done?color:C.muted);
    });
    [['tp',490,70,'真阳 TP'],['fp',630,70,'误报 FP'],['fn',490,160,'漏报 FN'],['tn',630,160,'真阴 TN']].forEach(([key,x,y,label])=>{
      const ready=has(v,key),n=ready?v[key]:'·',bad=key==='fp'||key==='fn';
      out+=rect(x,y,126,75,ready?(bad?C.rose:C.mint):C.pale,bad?C.red:C.green,value(key,n))+txt(x+12,y+23,label,12,C.muted)+txt(x+63,y+58,n,25,bad?C.red:C.green,'text-anchor="middle"');
    });
    out+=txt(36,278,'accuracy: '+(has(v,'accuracy')?fmt(v.accuracy):'等待'),13,C.muted)+txt(285,278,'precision: '+(has(v,'precision')?fmt(v.precision):'等待'),13,C.muted);
    if(has(v,'penalty'))out+=txt(490,278,'代价 = '+v.penalty,20,C.orange,value('penalty',v.penalty));else out+=txt(490,278,'代价：尚未计算',14,C.muted);
    return out;
  }
  function data(g){
    const {v,frame}=g,train=v.train||[],validation=v.validation||[],rows=v.rows||[];let out=txt(30,32,'同一实体保留在同一侧，预处理只从训练侧拟合',17);
    if(!has(v,'train')){
      out+=rect(25,62,750,155,C.pale,C.line)+txt(40,87,'尚未划分的输入记录',15,C.muted);
      rows.forEach((r,i)=>{out+=circle(80+i*125,130,22,C.white,C.line)+txt(80+i*125,135,r.id,12,C.muted,'text-anchor="middle"');});
    }else out+=rect(25,62,350,155,C.pale,C.line)+rect(425,62,350,155,C.pale,C.line)+txt(40,87,'训练集',15,C.green)+txt(440,87,'验证集',15,C.blue);
    for(const [items,left,color] of [[train,50,C.green],[validation,450,C.blue]])items.forEach((r,i)=>{
      const x=left+i%3*100,y=122+Math.floor(i/3)*58;
      out+=circle(x+23,y,22,C.white,color,motion(frame.line===3,'token'))+txt(x+23,y+4,r.group+':'+r.x,12,color,'text-anchor="middle"')+txt(x+23,y+38,r.id,11,C.muted,'text-anchor="middle"');
    });
    if(has(v,'center'))out+=line(375,128,425,128,C.orange,motion(frame.line===4,'edge'))+txt(400,115,'μ',18,C.orange,'text-anchor="middle"')+txt(28,249,'拟合中心 μ = '+fmt(v.center),16,C.orange,value('center',v.center));else out+=txt(28,249,'拟合中心：等待划分与拟合',14,C.muted);
    if(has(v,'validationX'))out+=txt(430,249,'验证转换：['+v.validationX.map(fmt).join(', ')+']',14,C.blue);
    if(has(v,'overlap'))out+=pill(28,269,310,'实体重叠：'+(v.overlap.length?v.overlap.join(','):'无'),true,v.overlap.length?C.red:C.green);
    if(has(v,'preprocessingLeak'))out+=pill(430,269,345,'预处理泄漏：'+(v.preprocessingLeak?'有':'无'),true,v.preprocessingLeak?C.red:C.green);
    return out;
  }
  function experiments(g){
    const {v,frame}=g,h=v.history||[[],[]],colors=[C.blue,C.orange],X=e=>55+e*53,Y=w=>245-w*44;let out=txt(30,32,'每个点来自已经完成的一次参数更新',17);
    out+=line(55,245,400,245,C.muted)+line(55,245,55,57,C.muted)+txt(410,248,'轮次',11,C.muted)+txt(25,58,'w',12,C.muted);
    out+=line(55,Y(2),395,Y(2),C.green,'stroke-dasharray="4 4"')+txt(175,Y(2)-8,'训练目标 w=2',11,C.green);
    h.forEach((points,j)=>{let prev=[X(0),Y(0)];points.forEach((point,i)=>{const x=X(point.epoch),y=Y(point.w);out+=line(...prev,x,y,colors[j])+circle(x,y,5,C.white,colors[j],motion(frame.line===3&&i===points.length-1,'token')+' data-fsdl-epoch="'+point.epoch+'" data-fsdl-weight="'+fmt(point.w)+'"');prev=[x,y];});});
    out+=txt(75,280,'A',14,C.blue)+txt(110,280,'lr='+fmt(g.p.rate),12,C.muted)+txt(235,280,'B',14,C.orange)+txt(270,280,'lr='+fmt(g.p.rate*2),12,C.muted);
    for(const [key,y] of [['training',95],['validation',175]]){
      out+=txt(475,y-22,key==='training'?'训练损失':'验证损失',13,C.muted);
      if(!has(v,key)){out+=txt(475,y+15,'尚未计算',14,C.muted);continue;}
      v[key].forEach((n,i)=>{out+=rect(475,y+i*25,n*36,15,i?C.sand:'#e2eaff',colors[i],value(key+'-'+i,n))+txt(710,y+13+i*25,fmt(n),12,colors[i]);});
    }
    if(has(v,'winner'))out+=txt(475,286,'选择：'+(v.winner??'验证版本不同，拒绝选优'),15,v.winner?C.green:C.red,value('winner',v.winner));
    return out;
  }
  function debugging(g){
    const {v,frame}=g,w=has(v,'nextWeight')?v.nextWeight:v.weight,X=x=>80+x*130,Y=y=>226-(y+10)*5;let out=txt(30,32,'同一损失函数：解析梯度与独立差分交叉核对',17);
    out+=line(80,Y(0),400,Y(0),C.muted)+line(80,240,80,57,C.muted)+txt(55,64,'y',12,C.muted);
    if(has(v,'xs')){
      v.xs.forEach((x,i)=>out+=circle(X(x),Y(v.ys[i]),7,C.white,C.blue)+txt(X(x)+10,Y(v.ys[i])-10,'('+x+','+v.ys[i]+')',12,C.blue));
      if(Number.isFinite(w))out+=line(X(0),Y(0),X(2),Y(2*w),C.green,motion(frame.line===7,'edge'))+txt(145,258,'当前斜率 w='+fmt(w),14,C.green,value('displayedWeight',w));
    }
    const rows=[['gradient','实现梯度',82],['numerical','独立差分',137],['nextWeight','更新参数',192],['nextLoss','更新后损失',247]];
    rows.forEach(([key,label,y])=>{out+=txt(475,y,label,12,C.muted);out+=txt(610,y,has(v,key)?fmt(v[key]):'等待',19,has(v,key)?(key==='numerical'?C.blue:C.green):C.muted,has(v,key)?value(key,v[key]):'');});
    if(has(v,'gradientError'))out+=txt(475,291,'梯度差值 '+fmt(v.gradientError),13,v.gradientError>1e-5?C.red:C.green);
    return out;
  }
  function testing(g){
    const {v,frame}=g,cases=v.cases||[],checks=v.checks||[];let out=txt(30,32,'每条期望由规则给出，候选函数单独计算实际值',17);
    cases.forEach((x,i)=>{const check=checks.find(c=>c.x===x),ok=check&&check.expected===check.actual,cx=93+i*94,color=check?(ok?C.green:C.red):C.line;
      out+=circle(cx,112,29,check?(ok?C.mint:C.rose):C.white,color,motion(!!check&&frame.line===4&&i===checks.length-1,'token'))+txt(cx,118,x,20,color,'text-anchor="middle"');
      out+=txt(cx,168,check?'期望 '+check.expected:'待执行',12,C.muted,'text-anchor="middle"');if(check)out+=txt(cx,192,'实际 '+check.actual,12,color,'text-anchor="middle"');
    });
    [['dataValid','数据契约',58],['selectedTestsPass','当前测试',110],['independentBoundaryPass','独立边界0',162],['artifactMatch','版本匹配',214]].forEach(([key,label,y])=>{
      const ready=has(v,key),ok=v[key];out+=rect(430,y,315,40,ready?(ok?C.mint:C.rose):C.pale,ready?(ok?C.green:C.red):C.line)+txt(445,y+25,label,13,C.muted)+txt(695,y+25,ready?(ok?'通过':'失败'):'等待',14,ready?(ok?C.green:C.red):C.muted,'text-anchor="end"');
    });
    if(has(v,'releaseReady'))out+=txt(430,289,'教学门禁：'+(v.releaseReady?'通过':'拒绝'),18,v.releaseReady?C.green:C.red,value('releaseReady',v.releaseReady));else out+=txt(60,279,'没有被测试的输入仍然未知',13,C.muted);
    return out;
  }
  function serving(g){
    const {v,p,frame}=g,X=ms=>52+ms*6.6;let out=txt(30,32,'确定性的请求排队：横轴是模拟毫秒，不是实测性能',17);
    [0,20,40,60,80,100].forEach(ms=>out+=line(X(ms),60,X(ms),245,C.line,'stroke-dasharray="3 5"')+txt(X(ms),263,ms,11,C.muted,'text-anchor="middle"'));
    (v.arrivals||[]).forEach((ms,i)=>out+=circle(X(ms),65,4,C.blue,C.blue)+txt(X(ms)+i%2*2,50-i%2*14,'r'+i,9,C.muted));
    for(let worker=0;worker<p.workers;worker++)out+=txt(18,121+worker*82,'槽'+worker,12,C.muted)+line(52,128+worker*82,725,128+worker*82,C.line);
    (v.jobs||[]).forEach((job,i)=>{const x=X(job.start),y=93+job.worker*82,width=(job.finish-job.start)*6.6;out+=rect(x,y,width,36,i%2?C.sand:C.mint,i%2?C.orange:C.green,motion(frame.line===4&&i===v.jobs.length-1,'active')+' data-fsdl-start="'+job.start+'" data-fsdl-finish="'+job.finish+'"')+txt(x+width/2,y+23,'批'+(i+1),Math.min(12,width/2.2),C.ink,'text-anchor="middle"');});
    let footer='延迟与吞吐：等待全部排队完成';if(has(v,'latencies'))footer='latency=['+v.latencies.map(fmt).join(', ')+'] ms';
    out+=txt(30,286,footer,12,C.muted);
    if(has(v,'p95'))out+=txt(555,286,'p95='+fmt(v.p95),12,C.orange,value('p95',v.p95));
    if(has(v,'throughput'))out+=txt(30,311,'吞吐 = '+fmt(v.throughput)+' req/s；窗口 '+fmt(v.makespan)+' ms',12,C.green,value('throughput',v.throughput));
    return out;
  }
  function monitoring(g){
    const {v,p,frame}=g;let out=txt(30,32,'分布变化是调查信号，模型质量需要标签证据',17);
    for(const [key,label,y,fill] of [['baseline','基准',92,C.blue],['current','当前',156,C.orange]]){
      out+=txt(28,y+24,label,14,C.muted);
      if(!has(v,key))continue;const counts=v[key],widths=counts.map(n=>n*4.8);
      out+=rect(90,y,widths[0],38,key==='baseline'?'#e3ebfb':C.sand,fill)+rect(90+widths[0],y,widths[1],38,key==='baseline'?'#a9bce4':'#e5bd8a',fill,motion(frame.line===1,'active'));
      out+=txt(105,y+24,counts[0],14,fill)+txt(557,y+24,counts[1],14,fill,'text-anchor="end"');
    }
    if(has(v,'totalVariation'))out+=txt(90,231,'总变差 TV = '+fmt(v.totalVariation),20,C.green,value('totalVariation',v.totalVariation));else out+=txt(90,231,'TV：尚未计算',15,C.muted);
    if(has(v,'driftAlert'))out+=pill(530,211,230,'分布告警：'+(v.driftAlert?'是':'否'),true,v.driftAlert?C.orange:C.green);
    if(has(v,'errorRate'))out+=txt(90,283,v.errorRate===null?'实际错误率：标签未返回，保持未知':'已核对窗口错误率 = '+fmt(v.errorRate),17,v.errorRate===null?C.muted:C.blue,value('errorRate',v.errorRate));
    else out+=txt(90,283,'实际错误率：尚未计算',15,C.muted);
    return out;
  }
  function release(g){
    const {v,frame}=g,traffic=v.traffic||{v1:0,v2:0};let out=txt(30,32,'先检查制品，再让真实进入的案例分支产生观测',17);
    out+=txt(40,80,'请求入口',13,C.muted)+line(100,110,200,110,C.line)+line(200,110,200,223,C.line);
    for(const [version,y,color] of [['v1',115,C.blue],['v2',220,C.green]]){
      const ratio=traffic[version];out+=line(200,y,690,y,ratio?color:C.line,motion(frame.line===5||frame.line===7,'edge'))+txt(704,y+5,version,17,color);
      for(let i=0;i<Math.round(ratio*10);i++)out+=circle(245+i*42,y,9,color,color,motion(frame.line===5||frame.line===7,'token'));
      out+=txt(240,y+35,has(v,'traffic')?Math.round(ratio*100)+'%':'等待流量',14,color,value('traffic-'+version,ratio));
    }
    [['offlinePass','离线',35],['manifestPass','制品',205],['eligible','资格',375]].forEach(([key,label,x])=>out+=pill(x,265,150,label+'：'+(has(v,key)?v[key]?'通过':'拒绝':'等待'),has(v,key),has(v,key)&&!v[key]?C.red:C.green));
    out+=txt(565,72,'状态：'+(v.state||'准备中'),14,C.muted);
    if(has(v,'canaryRate'))out+=txt(565,94,'金丝雀：'+(v.canaryRate===null?'未执行':fmt(v.canaryRate)),13,v.canaryRate===null?C.muted:C.orange,value('canaryRate',v.canaryRate));
    if(has(v,'active'))out+=txt(570,290,'最终 '+v.active,20,v.active==='v2'?C.green:C.blue,value('active',v.active));
    return out;
  }
  const scenes={'fsdl-metrics':metrics,'fsdl-data':data,'fsdl-experiments':experiments,'fsdl-debugging':debugging,'fsdl-testing':testing,'fsdl-serving':serving,'fsdl-monitoring':monitoring,'fsdl-release':release};
  function expandedFSDL(ctx){
    const s=ctx.v,p=ctx.p,id=ctx.trace.model,n=x=>typeof x==='number'?String(Number(x.toFixed(4))):x===null?'未知':String(x??'待算');
    const text=(x,y,v,size=15)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#18384c">${esc(v)}</text>`;
    const box=(x,y,w,h,title,color='#edf4f8')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${color}" stroke="#b7ccd9"/>${text(x+12,y+25,title)}`;
    let body=text(23,29,ctx.frame.title,17);
    if(id==='fsdl-foundation-models'){
      body+=box(25,70,210,140,'表示 encoder')+box(295,70,210,140,'任务 head')+box(565,70,210,140,'下游输出');
      body+=text(37,124,'特征 '+(s.features?s.features.map(n).join(', '):'待算'))+text(37,162,p.strategy==='full'?'参与更新':'参数冻结')+text(307,124,'梯度 '+(s.headGradient?s.headGradient.map(n).join(', '):'待算'))+text(577,124,'预测 '+n(s.after??s.prediction))+text(577,162,'更新后损失 '+n(s.afterLoss));
      body+=text(25,262,'人工小矩阵演示适配机制；未加载或运行真实基础模型');
    }else if(id==='fsdl-ml-teams'){
      const rows=s.schedule||[],max=Math.max(8,...rows.map(x=>x.finish||0));rows.forEach((row,i)=>{body+=text(20,75+i*43,row.label,12);if(row.finish===null)body+=box(190,55+i*43,565,30,'阻塞：负责人或依赖未齐','#fff0df');else body+=`<rect x="${190+row.start/max*540}" y="${55+i*43}" width="${Math.max(25,row.days/max*540)}" height="28" rx="4" fill="#cfe7e1"/>${text(198+row.start/max*540,75+i*43,row.start+'→'+row.finish+'日',11)}`;});body+=text(20,303,'排程估计，不是已经完成的工作；责任和交付证据分别保存');
    }else if(id==='fsdl-ethics'){
      const rows=s.audits||[];if(!rows.length){const groups=s.groups||['A','B'];groups.forEach((group,i)=>{const items=(s.rows||[]).filter(row=>row.group===group),x=30+i*385;body+=box(x,75,355,150,'原始分组 '+group)+text(x+12,125,'样本数 '+items.length)+text(x+12,156,'分数 '+items.map(row=>row.score).join(' / '))+text(x+12,187,'标签 '+items.map(row=>row.label).join(' / '));});}rows.forEach((row,i)=>{const x=30+i*385;body+=box(x,75,355,150,'虚构分组 '+row.group)+text(x+12,130,'TP '+row.tp+' / FP '+row.fp+' / FN '+row.fn+' / TN '+row.tn)+text(x+12,164,'FPR '+n(row.fpr)+'；FNR '+n(row.fnr))+text(x+12,196,'负类分母 '+row.negatives+'；正类分母 '+row.positives);});body+=text(30,262,'FPR差 '+n(s.fprGap)+'；FNR差 '+n(s.fnrGap))+text(30,294,'遗漏分组 '+(s.missingGroups?s.missingGroups.join('、')||'无':'待检查')+'；数值不替代目的、同意、申诉与后果审查');
    }else if(id==='fsdl-project-train'){
      const history=s.history||[],max=Math.max(.7,...history.map(x=>x.loss));body+=`<path d="M45 75V240H550" fill="none" stroke="#cbd8df"/><polyline points="${history.map((x,i)=>(60+i*75)+','+(235-x.loss/max*145)).join(' ')}" fill="none" stroke="#268279" stroke-width="3"/>`+text(50,66,'训练损失：当前已完成的更新')+box(585,85,190,110,'独立验证概率')+text(600,143,s.validation?s.validation.map(n).join(' / '):'训练后才计算')+text(30,285,'完整本地项目另生成图像、保存模型、启动HTTP接口并验证回滚');
    }else{
      const cards=[['制品哈希',s.manifestValid],['离线检查',s.offlinePassed],['允许试运行',s.eligible],['触发回滚',s.rollback]];
      cards.forEach(([label,value],i)=>{body+=box(25+i*192,85,178,100,label,value===undefined?'#f2f5f7':value?'#e0f1eb':'#fff0e1')+text(40+i*192,147,value===undefined?'尚未检查':value?'是':'否');});body+=text(30,230,'已执行错误率 '+n(s.canaryRate)+'；候选流量 '+n(s.candidateTraffic))+text(30,266,'最终活动版本 '+n(s.active))+text(30,300,'浏览器为决策模型；HTTP请求与制品哈希使用本地项目回执核验');
    }return body;
  }
  for(const id of ['fsdl-foundation-models','fsdl-ml-teams','fsdl-ethics','fsdl-project-train','fsdl-project-serve'])scenes[id]=expandedFSDL;

  function render(trace,index=0){
    if(!trace||!scenes[trace.model]||!Array.isArray(trace.steps)||!trace.steps.length)return '';
    const current=Math.max(0,Math.min(trace.steps.length-1,Math.trunc(Number(index)||0))),frame=trace.steps[current],v={};
    trace.steps.slice(0,current+1).forEach(s=>Object.assign(v,s.variables||{}));
    const ctx={trace,index:current,frame,v,p:trace.params||{}};
    return `<svg xmlns="http://www.w3.org/2000/svg" class="fid-coding-scene application-fsdl-scene" viewBox="0 0 800 340" role="img" aria-label="${esc(trace.model+'：'+frame.title)}" data-fid-scene="${esc(trace.model)}" data-fid-stage="${current}" font-family="system-ui,sans-serif">${scenes[trace.model](ctx)}${txt(776,333,(current+1)+' / '+trace.steps.length+' 步',10,C.muted,'text-anchor="end"')}</svg>`;
  }
  return {render};
});
