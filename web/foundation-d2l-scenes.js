/* Data-driven SVG scenes. Playback chooses a recorded frame; no model is rerun here. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.FoundationD2LScenes=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const C={ink:'#17324d',muted:'#62758a',grid:'#dce5eb',blue:'#3c6bd6',green:'#167d72',orange:'#c56429',red:'#c44343',pale:'#edf5f6',white:'#fff'};
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const f=x=>typeof x==='number'&&Number.isFinite(x)?String(Number(x.toFixed(3))):'…';
  const N=x=>Number.isFinite(Number(x))?Number(x):0;
  const attrs=o=>Object.entries(o||{}).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('');
  const text=(x,y,s,o={})=>`<text x="${f(x)}" y="${f(y)}"${attrs({'font-size':14,fill:C.ink,...o})}>${esc(s)}</text>`;
  const line=(x1,y1,x2,y2,o={})=>`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"${attrs({stroke:C.grid,'stroke-width':2,...o})}/>`;
  const circle=(x,y,r,o={})=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"${attrs({fill:C.white,stroke:C.grid,'stroke-width':2,...o})}/>`;
  const rect=(x,y,w,h,o={})=>`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${attrs({rx:7,fill:C.white,stroke:C.grid,...o})}/>`;
  const path=(d,o={})=>`<path d="${esc(d)}"${attrs({fill:'none',stroke:C.grid,'stroke-width':2,...o})}/>`;
  const active=(yes,color=C.green)=>yes?color:C.grid;
  const motion=(yes,type='edge')=>yes?{'data-fid-motion':type}:{};
  const dot=(x,y,color=C.green,r=5,o={})=>circle(x,y,r,{fill:color,stroke:color,...o});
  function arrow(g,x1,y1,x2,y2,on=false,color=C.green,width=2,extra={}){
    return line(x1,y1,x2,y2,{stroke:on?color:C.grid,'stroke-width':width,'marker-end':`url(#${g.id}-arrow)`,...motion(on),...extra});
  }
  function node(x,y,label,value,on=false,color=C.green,r=27){
    return circle(x,y,r,{fill:on?C.pale:C.white,stroke:active(on,color),'stroke-width':on?3:2,...motion(on,'token')})+
      text(x,y-3,label,{'text-anchor':'middle','font-size':13,fill:on?color:C.muted})+
      text(x,y+16,value,{'text-anchor':'middle','font-weight':650,'font-size':15});
  }
  function latest(trace,index){return Object.assign({},...trace.steps.slice(0,index+1).map(s=>s.variables||{}));}
  function axes(x,y,w,h,xLabel,yLabel){
    return line(x,y,x+w,y,{stroke:C.muted})+line(x,y-h,x,y,{stroke:C.muted})+
      text(x+w+8,y+5,xLabel,{'font-size':12,fill:C.muted})+text(x-5,y-h-9,yLabel,{'font-size':12,fill:C.muted});
  }
  function tensors(g){
    const {trace:t,index:i,frame:s,state:v}=g,p=t.params,R=t.result,rows=p.rows,cols=p.columns,A=R.A,B=R.B;
    let out='';
    if(i===0){
      const flat=s.variables.flat;
      out+=text(35,80,'同一组元素：先看一维，再按行重排',{'font-size':16});
      flat.forEach((n,j)=>{const x=35+j*76;out+=rect(x,111,62,55,{fill:C.pale,stroke:C.green,'stroke-width':2,'data-cell-id':'a-'+j,...motion(true,'token')})+text(x+31,145,f(n),{'text-anchor':'middle','font-size':21});});
      return out+text(35,211,flat.length+' 个元素 → '+rows+' 行 × '+cols+' 列',{'font-size':18,fill:C.green});
    }
    const size=43,top=87,left=38,bLeft=300,cLeft=552;
    out+=text(left,65,'A：'+rows+' × '+cols,{'font-weight':650})+text(bLeft,65,'B：1 × '+B.length,{'font-weight':650})+text(cLeft,65,'A + B',{'font-weight':650});
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const x=left+c*(size+5),y=top+r*(size+5),ready=s.line>=6&&R.output;
      out+=rect(x,y,size,size,{stroke:i===1?C.green:C.grid,'data-cell-id':'a-'+(r*cols+c),...motion(i===1,'token')})+text(x+size/2,y+28,f(A[r][c]),{'text-anchor':'middle','font-size':18});
      out+=rect(cLeft+c*(size+5),y,size,size,{fill:ready?C.pale:C.white,stroke:ready?C.green:C.grid,'stroke-dasharray':ready?undefined:'4 4','data-fid-cell':'output-'+r+'-'+c,'data-value':ready?f(R.output[r][c]):undefined,...motion(!!ready,'token')})+
        text(cLeft+c*(size+5)+size/2,y+28,ready?f(R.output[r][c]):'·',{'text-anchor':'middle','font-size':18,fill:ready?C.ink:C.muted});
    }
    out+=text(235,153,'+',{'font-size':34,fill:C.muted})+arrow(g,496,143,532,143,s.line>=4);
    B.forEach((n,j)=>{
      const x=bLeft+j*(size+5),shown=i>=2;
      out+=rect(x,top,size,size,{fill:shown?C.pale:C.white,stroke:shown?C.green:C.grid,opacity:shown?1:.35})+
        text(x+size/2,top+28,shown?f(n):'·',{'text-anchor':'middle','font-size':18});
      if(shown&&R.status==='ok')for(let r=1;r<rows;r++){
        const yy=top+r*(size+5);
        out+=rect(x,yy,size,size,{fill:C.pale,stroke:C.green,'stroke-dasharray':'3 4',opacity:s.line>=4?.45:.16})+
          text(x+size/2,yy+28,f(n),{'text-anchor':'middle','font-size':18,fill:C.green,opacity:s.line>=4?.65:.2});
        if(s.line>=4)out+=path(`M ${x+size/2} ${top+size} Q ${x+size/2-17} ${yy} ${x+size/2} ${yy+7}`,{stroke:C.green,'stroke-dasharray':'3 5',...motion(s.line===4)});
      }
    });
    if(R.status==='shape_error'&&s.line>=4){
      out+=line(510,121,535,147,{stroke:C.red,'stroke-width':4})+line(535,121,510,147,{stroke:C.red,'stroke-width':4});
      out+=text(300,252,'末轴 '+cols+' 与 '+B.length+' 不兼容：停止相加',{'font-size':17,fill:C.red});
    }else out+=text(38,252,s.line>=7?'总和 '+f(v.total)+' = 原矩阵总和 + '+rows+' × 向量总和':'虚线表示同一个行向量被重复使用，不代表实际复制内存',{'font-size':14,fill:s.line>=7?C.green:C.muted});
    return out;
  }
  function matrixProbability(g){
    const {trace:t,index:i,state:v}=g,R=t.result,p=t.params;let out='';
    const ox=68,oy=219,scale=42;
    out+=axes(ox,oy,226,144,'特征0','特征1');
    for(let a=1;a<=3;a++)out+=text(ox+a*scale,oy+18,String(a),{'text-anchor':'middle','font-size':10,fill:C.muted});
    R.X.forEach((row,j)=>{const x=ox+row[0]*scale,y=oy-row[1]*scale;out+=arrow(g,ox,oy,x,y,i===0,C.blue,2)+dot(x,y,C.blue,5)+text(x+9,y-7,'样本'+j+' ['+row.join(',')+']',{'font-size':11,fill:C.blue});});
    const wx=ox+p.w0*scale,wy=oy-2*scale;
    out+=arrow(g,ox,oy,wx,wy,i<=1,C.green,4)+text(wx+8,wy+19,'w=['+f(p.w0)+',2]',{'font-size':12,fill:C.green});
    out+=text(44,65,'特征向量与权重方向',{'font-weight':650});
    if(i>=1){const products=Array.isArray(v.products?.[0])?v.products:t.steps[1].variables.products;out+=text(44,257,products.map((row,j)=>'样本'+j+'：'+row.map(f).join(' + ')).join('；'),{'font-size':12,fill:C.muted});}
    const shown=i>=2,prob=i>=4;
    R.prediction.forEach((z,j)=>{
      const yy=102+j*106,w=prob?R.probabilities[j]:.5;
      out+=arrow(g,497,yy,657,152,prob,C.green,prob?1+w*12:2,{'data-weight':prob?f(w):undefined});
      out+=node(462,yy,'样本'+j,shown?f(z):'·',i===2,C.blue,33);
      if(i>=3)out+=text(548,yy+(j===0?-13:22),prob?'p='+f(R.probabilities[j]):'份额 '+(j===0?p.p0:1),{'text-anchor':'middle','font-size':15,fill:prob?C.green:C.muted});
    });
    out+=node(701,153,'期望',i>=5?f(R.expectation):'Σ',i>=5,C.green,39);
    out+=text(440,65,prob?'按概率组合两个结果':'点积：每行各得到一个输出',{'font-weight':650});
    return out;
  }
  function autograd(g){
    const {trace:t,index:i,state:v}=g,p=t.params,R=t.result;let out='';
    out+=arrow(g,89,85,181,133,i===0)+arrow(g,89,205,181,157,i===0);
    out+=arrow(g,237,145,322,145,i===1)+arrow(g,207,234,333,170,i===1);
    out+=arrow(g,378,145,482,145,i===2)+arrow(g,352,234,493,170,i===2);
    out+=arrow(g,538,145,646,145,i===3);
    out+=node(61,85,'x',f(p.x),i===0)+node(61,205,'w',f(p.w),i===0);
    out+=node(209,145,'×',f(v.product),i===0)+node(207,238,'b',f(p.b),i===1,C.blue,23);
    out+=node(350,145,'+',i>=1?f(R.prediction):'·',i===1)+node(352,238,'目标',f(p.target),i===2,C.blue,23);
    out+=node(510,145,'−',i>=2?f(R.error):'·',i===2)+node(680,145,'平方/2',i>=3?f(R.loss):'·',i===3,C.green,35);
    if(i>=4){
      out+=path('M 674 187 C 640 226 449 226 366 187',{stroke:C.orange,'stroke-width':3,'marker-end':`url(#${g.id}-arrow)`,...motion(i>=4)});
      out+=text(510,223,'dL/d预测 = '+f(R.error),{'text-anchor':'middle',fill:C.orange,'font-weight':650});
    }
    if(i>=5){
      out+=path('M 326 117 C 240 27 135 28 78 59',{stroke:C.orange,'stroke-width':3,...motion(true)});
      out+=text(210,65,'dx = '+f(R.dX),{'text-anchor':'middle',fill:C.orange});
      out+=path('M 325 177 C 258 202 169 216 91 205',{stroke:C.orange,'stroke-width':3,'marker-end':`url(#${g.id}-arrow)`,...motion(true)});
      out+=text(188,205,'dw = '+f(R.dW),{'text-anchor':'middle',fill:C.orange});
      out+=text(288,263,'db = '+f(R.dB),{fill:C.orange});
    }
    out+=text(422,76,i<4?'前向：输入 → 预测 → 损失':'反向：误差 × 每条边的局部导数',{'font-size':16,fill:i<4?C.green:C.orange});
    return out;
  }
  function regression(g){
    const {trace:t,index:i,state:v,frame:s}=g,p=t.params,R=t.result;let out='';
    const w=N(v.w??p.initialW),b=N(v.b??0),data=t.steps[0].variables;
    const all=R.history.flatMap(h=>[h.b,h.w*2.5+h.b]);
    const low=Math.min(-1,p.initialW*2.5,...all),high=Math.max(5,...all),x0=51,y0=219,W=345,H=145;
    const X=x=>x0+x/2.6*W,Y=y=>y0-(y-low)/(high-low)*H;
    out+=axes(x0,y0,W,H,'x','y');
    for(const tick of [0,1,2])out+=text(X(tick),y0+17,String(tick),{'text-anchor':'middle','font-size':11,fill:C.muted});
    for(const tick of [0,2,4])out+=line(x0,Y(tick),x0+W,Y(tick),{stroke:C.grid,'stroke-dasharray':'3 5'})+text(x0-8,Y(tick)+4,String(tick),{'text-anchor':'end','font-size':10,fill:C.muted});
    if(s.line===6&&i>0){
      const prev=latest(t,i-1),pw=N(prev.w??p.initialW),pb=N(prev.b??0);
      out+=line(X(0),Y(pb),X(2.5),Y(pw*2.5+pb),{stroke:C.muted,'stroke-width':2,'stroke-dasharray':'5 5'});
      out+=text(51,263,'本步更新 w：'+f(pw)+' → '+f(w)+'；b：'+f(pb)+' → '+f(b),{'font-size':13,fill:C.green});
    }else out+=text(51,263,'两条实心数据点；绿色直线是当前参数的预测',{'font-size':13,fill:C.muted});
    out+=line(X(0),Y(b),X(2.5),Y(w*2.5+b),{stroke:C.green,'stroke-width':3,'data-fid-geometry':'regression-fit','data-w':f(w),'data-b':f(b),...motion(s.line===6)});
    data.X.forEach((x,j)=>{
      const yy=data.Y[j],pred=w*x+b;
      if(i>0)out+=line(X(x),Y(yy),X(x),Y(pred),{stroke:C.orange,'stroke-width':2,'stroke-dasharray':'3 4',...motion(s.line===4)});
      out+=dot(X(x),Y(yy),C.blue,6,{'data-fid-observation':j,'data-x':x,'data-y':yy})+text(X(x)+8,Y(yy)-9,'('+x+','+yy+')',{'font-size':12,fill:C.blue});
      out+=circle(X(x),Y(pred),5,{fill:C.white,stroke:C.green,'stroke-width':2,...motion(s.line===3,'token')});
    });
    out+=text(51,61,'当前直线：ŷ = '+f(w)+'x + '+f(b),{'font-size':17,'font-weight':650,fill:C.green});
    const count=t.steps.slice(0,i+1).filter(x=>x.line===6).length,history=R.history.slice(0,count),losses=[R.history[0].before,...R.history.map(h=>h.after)],maxLoss=Math.max(...losses,1);
    const lx=470,ly=216,lw=263,lh=128,LX=e=>lx+e/p.epochs*lw,LY=l=>ly-l/maxLoss*lh;
    out+=axes(lx,ly,lw,lh,'更新次数','损失')+text(lx,62,'每轮更新后的真实损失',{'font-size':15,'font-weight':650});
    const pts=[{epoch:0,loss:R.history[0].before},...history.map(h=>({epoch:h.epoch,loss:h.after}))];
    if(i>=2){
      out+=path(pts.map((a,j)=>(j?'L ':'M ')+f(LX(a.epoch))+' '+f(LY(a.loss))).join(' '),{stroke:C.orange,'stroke-width':3,...motion(s.line===6)});
      pts.forEach((a,j)=>{out+=dot(LX(a.epoch),LY(a.loss),C.orange,5,motion(j===pts.length-1,'token'))+text(LX(a.epoch),LY(a.loss)-9,f(a.loss),{'font-size':11,'text-anchor':'middle',fill:C.orange});});
    }
    const loss=v.after??v.before??(i===t.steps.length-1?R.finalLoss:null);
    out+=text(470,258,s.line===5?'梯度 dw='+f(v.dw)+'；db='+f(v.db):loss===null?'预测 → 损失 → 梯度 → 同时更新':'当前记录损失：'+f(loss),{'font-size':14,fill:C.orange});
    return out;
  }
  function classification(g){
    const {trace:t,index:i,state:v}=g,p=t.params,R=t.result;let out='';
    const values=i===0?R.logits:i===1?R.logits.map(x=>x-Math.max(...R.logits)):i===2?v.exp:R.probabilities;
    const isProb=i>=3,minimum=Math.min(0,...values),maximum=Math.max(1,...values),scale=124/(maximum-minimum),zero=207+minimum*scale;
    out+=text(40,65,i===0?'原始logit':i===1?'共同减去最大值':i===2?'指数权重':'归一化概率',{'font-size':17,'font-weight':650});
    out+=line(35,zero,288,zero,{stroke:C.muted});
    values.forEach((n,j)=>{
      const x=58+j*79,yy=zero-n*scale,h=Math.max(1,Math.abs(n)*scale),target=j===p.target;
      out+=rect(x,Math.min(zero,yy),43,h,{rx:3,fill:target&&i>=4?C.green:C.blue,stroke:'none',opacity:.75,...motion(i<=3,'token')})+
        text(x+21,yy+(n>=0?-9:21),f(n),{'text-anchor':'middle','font-size':13})+text(x+21,235,'类'+j,{'text-anchor':'middle','font-size':12,fill:C.muted});
      if(target)out+=text(x+21,254,'目标',{'text-anchor':'middle','font-size':12,fill:C.green});
    });
    out+=arrow(g,310,143,371,143,i>=2,C.green,3);
    const left=401,top=100,totalW=346;let cursor=left;
    out+=text(left,65,'三个类别占同一个概率整体',{'font-size':16,'font-weight':650});
    R.probabilities.forEach((prob,j)=>{
      const width=prob*totalW,shown=i>=3,color=j===p.target?C.green:C.blue;
      out+=rect(cursor,top,width,58,{rx:0,fill:shown?color:C.white,stroke:C.white,opacity:shown?.55+.18*j:.4,'data-probability':shown?f(prob):undefined,...motion(shown&&i===3,'token')});
      if(shown)out+=text(cursor+width/2,top+82,'类'+j+' '+f(prob),{'text-anchor':'middle','font-size':11,fill:j===p.target?C.green:C.muted});
      if(j===p.target&&i>=4)out+=rect(cursor,top-5,width,68,{rx:0,fill:'none',stroke:C.green,'stroke-width':3});
      cursor+=width;
    });
    if(i>=4)out+=text(left,213,'L = −ln('+f(R.probabilities[p.target])+') = '+f(R.loss),{'font-size':17,fill:C.green,'font-weight':650});
    if(i>=5)out+=text(left,234,'箭头表示沿负梯度调整分数的方向',{'font-size':11,fill:C.orange});
    if(i>=5)R.gradient.forEach((d,j)=>{
      const x=435+j*113;
      out+=arrow(g,x,247,x-d*45,247,true,C.orange,3)+text(x,269,'∂L/∂z'+j+'='+f(d),{'font-size':11,'text-anchor':'middle',fill:C.orange});
    });
    if(isProb)out+=text(398,92,'概率之和 = 1',{'font-size':12,fill:C.muted});
    return out;
  }
  function mlp(g){
    const {trace:t,index:i,state:v}=g,p=t.params,R=t.result;let out='';
    out+=arrow(g,99,145,215,145,i===0,C.blue,2+Math.abs(p.w)*2)+text(153,128,'w='+f(p.w),{'text-anchor':'middle',fill:C.blue});
    out+=node(66,145,'输入x',f(p.x),i===0,C.blue,30)+node(250,145,'wx+b',f(v.z),i===0,C.green,34)+text(250,200,'b='+f(p.b),{'text-anchor':'middle',fill:C.muted});
    out+=arrow(g,287,145,326,145,i===1);
    const ox=408,oy=190;
    out+=line(345,oy,475,oy,{stroke:C.muted})+line(ox,82,ox,203,{stroke:C.muted})+text(479,195,'z',{'font-size':12,fill:C.muted})+text(415,86,'h',{'font-size':12,fill:C.muted})+
      path('M 350 190 L 408 190 L 466 132',{stroke:C.green,'stroke-width':4,...motion(i===1)})+text(408,67,'ReLU：负值被挡住',{'text-anchor':'middle','font-size':14,'font-weight':650});
    const zScale=11,z=R.z;
    if(i>=1)out+=dot(ox+z*zScale,oy-Math.max(0,z)*zScale,R.hidden===0?C.red:C.green,6,motion(i===1,'token'))+
      text(405,223,'z='+f(R.z)+' → h='+f(R.hidden),{'text-anchor':'middle','font-size':13,fill:R.hidden===0?C.red:C.green});
    out+=arrow(g,480,145,518,145,i>=1&&R.hidden>0,C.green,3,{'stroke-dasharray':i>=1&&R.hidden===0?'4 5':undefined});
    out+=node(549,145,'h',i>=1?f(R.hidden):'·',i===1,C.green,28);
    out+=arrow(g,580,145,658,145,i===2,C.blue,2+p.v*2)+text(619,128,'v='+f(p.v),{'text-anchor':'middle',fill:C.blue});
    out+=node(699,145,'预测',i>=2?f(R.prediction):'·',i===2,C.blue,35);
    if(i>=3)out+=text(680,217,'目标1；L='+f(R.loss),{'text-anchor':'middle',fill:C.green});
    if(i>=4){
      out+=path('M 690 238 C 650 264 582 264 552 237',{stroke:C.orange,'stroke-width':3,...motion(true)});
      out+=text(618,267,'dv='+f(R.dV),{'text-anchor':'middle','font-size':13,fill:C.orange});
    }
    if(i>=5){
      out+=text(405,250,'反向门 = '+f(R.gate)+(R.z===0?'（零点约定）':''),{'text-anchor':'middle',fill:R.gate?C.orange:C.red,'font-size':13});
      if(!R.gate)out+=line(480,130,498,160,{stroke:C.red,'stroke-width':4});
    }
    if(i>=6){out+=path('M 332 238 C 257 269 165 269 91 205',{stroke:R.gate?C.orange:C.red,'stroke-width':3,'stroke-dasharray':R.gate?undefined:'4 5',...motion(!!R.gate)});out+=text(201,266,'dw='+f(R.dW)+'；db='+f(R.dB),{'text-anchor':'middle',fill:C.orange,'font-size':13});}
    return out;
  }
  function generalization(g){
    const {trace:t,index:i}=g,p=t.params,R=t.result;let out='';
    const train=t.steps[0].variables,tx=train.trainX,ty=train.trainY,vx=R.validationX,vy=p.split==='clean'?vx.map(x=>2*x):ty;
    const x0=52,y0=222,W=365,H=148,X=x=>x0+x/5.5*W,Y=y=>y0-(y+1)/13*H;
    out+=axes(x0,y0,W,H,'x','y');
    for(let j=0;j<=5;j++)out+=text(X(j),y0+16,String(j),{'text-anchor':'middle','font-size':10,fill:C.muted});
    out+=text(47,63,p.capacity==='line'?'最小二乘直线：只使用训练点拟合':'查表：记住训练点，未见点返回0',{'font-size':15,'font-weight':650});
    if(i>=3&&p.capacity==='line')out+=line(X(0),Y(R.b),X(5),Y(5*R.w+R.b),{stroke:C.green,'stroke-width':3,...motion(i===3)});
    tx.forEach((x,j)=>{out+=dot(X(x),Y(ty[j]),C.blue,6,motion(i===0,'token'))+text(X(x)+8,Y(ty[j])-8,f(ty[j]),{'font-size':11,fill:C.blue});});
    if(i>=1)vx.forEach((x,j)=>{
      const yy=vy[j],xx=X(x),y=Y(yy);
      out+=path(`M ${xx} ${y-7} L ${xx+7} ${y} L ${xx} ${y+7} L ${xx-7} ${y} Z`,{fill:'none',stroke:p.split==='leaked'?C.red:C.orange,'stroke-width':2,...motion(i===1,'token')});
      if(p.split==='leaked')out+=circle(xx,y,12,{stroke:C.red,fill:'none','stroke-dasharray':'3 3'});
      if(i>=6){
        const pred=p.capacity==='line'?R.w*x+R.b:0;
        // In the deliberate leaked case a memorizer sees its stored label, not zero.
        const actual=p.capacity==='memorize'&&tx.includes(x)?ty[tx.indexOf(x)]:pred;
        out+=line(xx,y,xx,Y(actual),{stroke:C.orange,'stroke-width':2,'stroke-dasharray':'3 4',...motion(true)})+circle(xx,Y(actual),5,{stroke:C.green,fill:C.white});
      }
    });
    if(i>=3&&p.capacity==='memorize'){
      tx.forEach((x,j)=>{out+=circle(X(x),Y(ty[j]),10,{stroke:C.green,fill:'none','stroke-width':2});});
      if(p.split==='clean')vx.forEach(x=>{out+=circle(X(x),Y(0),5,{stroke:C.green,fill:C.white});});
    }
    out+=dot(58,260,C.blue,4)+text(70,264,'训练标签',{'font-size':12})+path('M 167 254 L 173 260 L 167 266 L 161 260 Z',{stroke:C.orange})+text(180,264,'保留验证标签',{'font-size':12});
    const bx=486,by=112,max=Math.max(R.trainMSE,R.validationMSE,1),bw=244;
    out+=text(bx,65,'相同模型，不同数据用途',{'font-size':16,'font-weight':650});
    [['训练MSE',R.trainMSE,i>=4,C.blue],['验证MSE',R.validationMSE,i>=6,p.split==='leaked'?C.red:C.orange]].forEach(([label,value,shown,color],j)=>{
      const y=by+j*79;out+=text(bx,y-13,label,{'font-size':13,fill:color})+rect(bx,y,bw,22,{fill:'#f1f4f7',stroke:'none'});
      if(shown)out+=rect(bx,y,Math.max(value>0?2:0,value/max*bw),22,{fill:color,stroke:'none',...motion(true,'token')})+text(bx+bw,y-13,f(value),{'font-size':14,'text-anchor':'end',fill:color});
    });
    out+=text(bx,248,p.split==='leaked'?'索引重叠：这个验证分数不是独立证据':'验证输入与训练输入无重叠',{'font-size':13,fill:p.split==='leaked'?C.red:C.green});
    return out;
  }
  function attention(g){
    const {trace:t,index:i}=g,p=t.params,R=t.result,masked=p.visible==='first'&&i>=3;let out='';
    const qx=92,qy=149,kx=324,vx=520,ys=[90,208],ox=704,oy=149;
    out+=path('M 92 107 L 134 149 L 92 191 L 50 149 Z',{fill:C.pale,stroke:C.green,'stroke-width':3,...motion(i===0,'token')})+
      text(qx,qy-5,'Query',{'text-anchor':'middle','font-size':13,fill:C.green})+text(qx,qy+16,'['+f(p.query)+',1]',{'text-anchor':'middle','font-size':16,'font-weight':650});
    ys.forEach((y,j)=>{
      const hidden=masked&&j===1,weight=hidden?0:R.weights[j],color=hidden?C.red:C.blue;
      out+=arrow(g,qx+43,qy,kx-35,y,i>=1&&!hidden,color,i>=4?1+weight*8:2,{'stroke-dasharray':hidden?'5 5':undefined,opacity:hidden?.35:1});
      const label=i>=4?'权重 '+f(weight):i>=2?'分数 '+f(R.scaled[j]):i>=1?'点积 '+f(R.dots[j]):'';
      if(label)out+=text(216,j===0?86:231,label,{'text-anchor':'middle','font-size':13,fill:hidden?C.red:C.blue});
      out+=node(kx,y,'Key'+j,'['+R.K[j].join(',')+']',i===1||i===2,color,31);
      out+=arrow(g,kx+34,y,vx-35,y,i>=4&&!hidden,C.green,i>=4?1+weight*10:2,{'data-weight':i>=4?f(weight):undefined,opacity:hidden?.25:1});
      out+=node(vx,y,'Value'+j,f(R.V[j]),i===5&&!hidden,C.green,31);
      out+=arrow(g,vx+35,y,ox-43,oy,i>=5&&!hidden,C.green,i>=5?1+weight*12:2,{opacity:hidden?.2:1});
      if(i>=5)out+=text(620,j===0?85:235,'贡献 '+f(R.contributions[j]),{'text-anchor':'middle','font-size':13,fill:hidden?C.muted:C.green});
      if(hidden)out+=line(kx-20,y-23,kx+20,y+23,{stroke:C.red,'stroke-width':4})+text(kx,y+53,'被遮住 → 权重0',{'text-anchor':'middle','font-size':12,fill:C.red});
    });
    out+=node(ox,oy,'汇总输出',i>=6?f(R.output):'Σ',i>=6,C.green,42);
    out+=text(195,62,i<4?'Query和Key决定匹配；Value提供内容':'连线粗细来自本次计算的权重',{'font-size':16,'font-weight':650});
    out+=text(45,270,masked?'位置1不进入归一化分母，对输出贡献严格为0':'改变Value只改变加权内容，不改变Q/K得到的匹配权重',{'font-size':13,fill:masked?C.red:C.muted});
    return out;
  }
  const scenes={'d2l-tensors':tensors,'d2l-matrix-probability':matrixProbability,'d2l-autograd':autograd,'d2l-regression':regression,'d2l-classification':classification,'d2l-mlp':mlp,'d2l-generalization':generalization,'d2l-attention':attention};
  function expandedScene(g){
    const s=g.state,p=g.trace.params,id=g.trace.model;
    const t=(x,y,v,size=16)=>`<text x="${x}" y="${y}" font-size="${size}" fill="#18374c">${esc(v)}</text>`;
    const n=x=>typeof x==='number'?String(Number(x.toFixed(4))):x===null?'待算':String(x??'待算');
    const box=(x,y,w,h,label,fill='#edf5f7')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="#b9cfd8"/>${t(x+10,y+22,label)}`;
    const matrix=(values,x,y,label,active=null)=>{if(!values)return t(x,y+20,label+'：待算');const rows=values.length,columns=values[0].length,cell=Math.min(48,200/Math.max(rows,columns));let html=t(x,y-9,label,15);for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){const highlight=active&&i>=active[0]&&i<active[0]+2&&j>=active[1]&&j<active[1]+2;html+=`<rect x="${x+j*cell}" y="${y+i*cell}" width="${cell-2}" height="${cell-2}" rx="4" fill="${highlight?'#c9e8e2':values[i][j]===null?'#f4f6f8':'#e5edf7'}" stroke="#c5d6df"/><text x="${x+j*cell+cell/2}" y="${y+i*cell+cell*.63}" text-anchor="middle" font-size="17" fill="#17374c">${esc(n(values[i][j]))}</text>`;}return html;};
    if(id==='d2l-convolution')return matrix(s.padded||s.image,25,88,s.padded?'填充后输入':'输入',s.window)+matrix(s.kernel,260,88,'共享核')+matrix(s.output,485,88,'已经计算的输出')+t(25,252,s.position?'当前窗口 '+s.position.join(', ')+'；乘积 '+JSON.stringify(s.products):'空白输出不代表0；步幅 '+p.stride+'，零填充 '+p.padding);
    if(id==='d2l-cnn-pooling')return matrix(s.image,25,88,'输入')+matrix(s.conv,220,88,'卷积结果')+matrix(s.activation,405,88,'ReLU')+box(610,82,160,88,'汇聚 '+n(s.pooled))+t(615,135,p.pool==='max'?'取最大响应':'取平均响应')+t(25,250,'分类概率：'+(s.probabilities?s.probabilities.map(n).join(' / '):'等待汇聚后计算'));
    if(id==='d2l-rnn'){
      let html=t(25,70,'hₜ=tanh(xₜ+w·hₜ₋₁)；按已经完成的时间步展开');
      (s.history||[]).forEach((row,i)=>{html+=box(25+i*190,105,172,110,'t='+(i+1))+t(35+i*190,157,'x='+n(row.x))+t(35+i*190,180,'h='+n(row.hidden))+t(35+i*190,202,'局部导数 '+n(row.localDerivative));});
      return html+t(25,254,s.memoryDerivative===undefined?'初始状态为0，未来状态尚未计算':'末状态对初状态导数 '+n(s.memoryDerivative));
    }
    if(id==='d2l-gru')return box(25,85,220,66,'旧状态 '+n(s.previous))+box(288,85,220,66,'候选 '+n(s.candidate))+box(553,85,220,66,'新状态 '+n(s.hidden))+t(30,185,'z='+n(p.update)+' → 保留 '+n(s.retained))+t(295,185,'1−z='+n(1-p.update)+' → 接纳 '+n(s.admitted))+t(30,237,'r='+n(p.reset)+'；重置只在候选支路中，z=1保留旧状态');
    if(id==='d2l-momentum'||id==='d2l-adam'||id==='fsdl-project-train'){
      const history=s.history||[],losses=history.map(x=>x.loss),max=Math.max(2,...losses),points=history.map((row,i)=>(55+i*85)+','+(230-row.loss/max*135)).join(' ');
      return `<path d="M45 80V235H590" fill="none" stroke="#c6d5dd"/><polyline points="${points}" fill="none" stroke="#278379" stroke-width="3"/>${history.map((row,i)=>`<circle cx="${55+i*85}" cy="${230-row.loss/max*135}" r="4" fill="#278379"/>`).join('')}`+t(50,67,'已计算更新后的损失')+box(610,80,163,95,'θ = '+n(s.theta))+t(620,126,id==='d2l-adam'?'m̂ = '+n(s.mHat):'速度 = '+n(s.velocity))+t(620,150,id==='d2l-adam'?'v̂ = '+n(s.vHat):'梯度 = '+n(s.gradient))+t(45,260,'点只来自当前及更早步骤；没有提前画出未来损失');
    }
    if(id==='d2l-data-parallel'){
      let html=t(25,70,'先分片，再合并梯度分子与样本分母');
      for(let i=0;i<2;i++)html+=box(35+i*385,90,350,98,'rank '+i)+t(48+i*385,138,'样本 '+JSON.stringify(s.local?.[i]||[]))+t(48+i*385,164,'梯度和 '+n(s.sums?.[i])+'；均值 '+n(s.localMeans?.[i]));
      return html+box(200,207,400,48,'全局梯度 '+n(s.globalGradient)+'；参照 '+n(s.reference));
    }
    const xs=s.localSums||[],width=720/Math.max(1,p.world);let html=t(25,70,'微批累积 → 最后一次同步 → 各副本同一更新');
    for(let i=0;i<p.world;i++)html+=box(30+i*width,95,width-12,95,'rank '+i)+t(42+i*width,150,'累积 '+n(xs[i]));
    return html+t(30,222,'已同步：'+(s.synced===undefined?'尚无微批':s.synced?'是':'否'))+t(30,248,'归约 '+n(s.reduced)+'；全局批次参照 '+n(s.reference)+'；新权重 '+n(s.nextWeight));
  }
  for(const id of ['d2l-convolution','d2l-cnn-pooling','d2l-rnn','d2l-gru','d2l-momentum','d2l-adam','d2l-data-parallel','d2l-ddp'])scenes[id]=expandedScene;

  function render(trace,index=0){
    if(!trace||!Object.hasOwn(scenes,trace.model)||!Array.isArray(trace.steps)||!trace.steps.length)return '';
    const i=Math.max(0,Math.min(trace.steps.length-1,Number.isFinite(Number(index))?Math.trunc(Number(index)):0)),frame=trace.steps[i];
    const id='fid-'+trace.model+'-'+i,g={trace,index:i,frame,state:latest(trace,i),id};
    const body=scenes[trace.model](g),label=frame.title||trace.model;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 284" width="800" height="284" role="img" aria-labelledby="${id}-title ${id}-desc" preserveAspectRatio="xMidYMid meet" data-fid-model="${esc(trace.model)}" data-fid-step="${i}" style="display:block;width:100%;height:auto;max-width:100%;font-family:system-ui,-apple-system,sans-serif"><title id="${id}-title">${esc(label)}</title><desc id="${id}-desc">第${i+1}步，共${trace.steps.length}步。图形与数值来自当前计算轨迹；高亮当前运算。</desc><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 Z" fill="context-stroke"/></marker></defs><rect x="0" y="0" width="800" height="284" rx="14" fill="#fbfcfd"/>${text(23,29,label,{'font-size':17,'font-weight':650})}${text(777,29,(i+1)+' / '+trace.steps.length,{'text-anchor':'end','font-size':12,fill:C.muted})}${line(23,43,777,43)}${body}</svg>`;
  }
  return {render};
});
