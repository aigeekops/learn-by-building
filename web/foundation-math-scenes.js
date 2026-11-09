/* Static mathematical diagrams use only the current recorded state. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FoundationMathScenes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const f=v=>typeof v==='number'?Number.isFinite(v)?v!==0&&Math.abs(v)<.001?v.toExponential(2):String(Number(v.toFixed(4))):'未定义':String(v);
  const C=['#216b91','#ab5a28','#21765c','#7b50a0'];
  const text=(x,y,value,size=15,color='#243b50',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${esc(value)}</text>`;
  const line=(x,y,a,b,color='#ccd9df',width=2)=>`<line x1="${x}" y1="${y}" x2="${a}" y2="${b}" stroke="${color}" stroke-width="${width}"/>`;
  const dot=(x,y,color,r=5)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
  function vectorScene(v,keys){
    const vectors=keys.filter(k=>Array.isArray(v[k])&&v[k].length===2&&v[k].every(Number.isFinite)).map(k=>[k,v[k]]);
    if(!vectors.length)return '';
    const extent=Math.max(1,...vectors.flatMap(x=>x[1].map(Math.abs))),scale=95/extent,ox=225,oy=164;
    let out=line(75,oy,380,oy)+line(ox,58,ox,272)+text(386,oy+5,'x',12)+text(ox+7,62,'y',12);
    for(const [j,[key,a]] of vectors.entries()){
      const x=ox+a[0]*scale,y=oy-a[1]*scale;
      out+=line(ox,oy,x,y,C[j%C.length],3)+dot(x,y,C[j%C.length])+text(425,94+j*42,key+' = '+JSON.stringify(a.map(x=>Number(x.toFixed(4)))),16,C[j%C.length]);
    }
    if(v.b&&v.projection)out+=line(ox+v.projection[0]*scale,oy-v.projection[1]*scale,ox+v.b[0]*scale,oy-v.b[1]*scale,C[2],2);
    return out+text(75,291,'原点固定；箭头端点来自当前计算快照',12,'#64788a');
  }
  function fitScene(v){
    if(!v.x||!v.y)return '';
    const low=Math.min(0,...v.y,...(v.predictions||[])),high=Math.max(1,...v.y,...(v.predictions||[])),span=high-low||1;
    const X=x=>100+x*245,Y=y=>250-(y-low)/span*160;
    let out=line(85,250,655,250)+line(100,270,100,65);
    v.x.forEach((x,i)=>{out+=dot(X(x),Y(v.y[i]),C[0],6)+text(X(x)-9,276,String(x),12);});
    if(v.predictions){
      out+=`<polyline points="${v.x.map((x,i)=>X(x)+','+Y(v.predictions[i])).join(' ')}" fill="none" stroke="${C[1]}" stroke-width="3"/>`;
      v.x.forEach((x,i)=>out+=line(X(x),Y(v.y[i]),X(x),Y(v.predictions[i]),C[2],3));
    }
    return out+text(120,65,'● 观测',15,C[0])+text(295,65,v.predictions?'线：拟合；竖段：残差':'预测尚未计算',15,C[1]);
  }
  function clusterScene(v){
    if(!v.points)return '';
    const X=x=>105+x*55;let out=line(80,160,690,160);
    v.points.forEach((x,i)=>out+=dot(X(x),160,v.assignments?C[v.assignments[i]]:'#728493',8)+text(X(x)-5,193,f(x),14));
    const centers=v.next||v.centers;
    if(centers)centers.forEach((x,j)=>{const y=92+j*18;out+=line(X(x)-7,y-7,X(x)+7,y+7,C[j],3)+line(X(x)-7,y+7,X(x)+7,y-7,C[j],3)+text(X(x)+10,y+5,'μ'+j+'='+f(x),14,C[j]);});
    return out+text(110,239,'圆点：数据；叉号：当前中心；颜色：已计算的指派',14);
  }
  function intervalScene(v){
    if(!v.interval)return '';
    const [a,b]=v.interval,mid=(a+b)/2,span=Math.max(1,b-a),X=x=>400+(x-mid)/span*420;
    return line(130,175,670,175)+line(X(a),175,X(b),175,C[0],8)+line(X(a),158,X(a),192,C[0],3)+line(X(b),158,X(b),192,C[0],3)+dot(X(mid),175,C[1],7)+text(X(a),223,f(a),16,C[0],'text-anchor="middle"')+text(X(b),223,f(b),16,C[0],'text-anchor="middle"')+text(X(mid),130,'样本均值 '+f(mid),16,C[1],'text-anchor="middle"')+text(150,270,'区间按已知σ的正态模型计算，不表示95%的原始样本范围',13);
  }
  function visualScene(visual){
    if(visual.kind==='bars'){
      const rows=visual.rows.filter(x=>Number.isFinite(x.value));if(!rows.length)return '';
      const lo=Math.min(0,...rows.map(x=>x.value)),hi=Math.max(0,...rows.map(x=>x.value)),span=hi-lo||1,zero=244-(0-lo)/span*145,width=Math.min(65,610/rows.length),gap=610/rows.length;
      let out=line(85,zero,725,zero);
      rows.forEach((x,i)=>{const xx=90+i*gap,yy=244-(x.value-lo)/span*145,h=Math.abs(yy-zero);out+=`<rect x="${xx}" y="${Math.min(yy,zero)}" width="${width*.7}" height="${h}" rx="3" fill="${C[i%C.length]}"/>`+text(xx+width*.35,yy+(x.value<0?20:-10),f(x.value),13,C[i%C.length],'text-anchor="middle"')+text(xx,278,x.label,rows.length>7?10:12);});
      return out;
    }
    return (visual.nodes||[]).slice(0,6).map((n,i)=>{const y=71+i*34,s=String(n.detail);return text(75,y,n.label,14,C[i%C.length])+text(270,y,s.length>65?s.slice(0,62)+'…':s,14);}).join('');
  }
  function render(trace,index){
    const frame=trace.steps[index];if(!frame)return '';
    const v=Object.assign({},...trace.steps.slice(0,index+1).map(s=>s.variables));
    let body='';
    if(trace.model==='linear-vectors')body=vectorScene(v,['first','second','output']);
    else if(trace.model==='linear-projection')body=vectorScene(v,['a','b','projection','residual']);
    else if(trace.model==='linear-composition')body=vectorScene(v,['x','scaled','rotateAfterScale','scaleAfterRotate']);
    else if(trace.model==='linear-eigen')body=vectorScene(v,['vector','direction']);
    else if(trace.model==='linear-least-squares')body=fitScene(v);
    else if(trace.model==='cs229-kmeans')body=clusterScene(v);
    else if(trace.model==='probability-interval')body=intervalScene(v);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 315" role="img" aria-label="${esc(frame.title)}" data-fid-stage="${index}" data-model="${esc(trace.model)}"><rect width="800" height="315" fill="#f7fafb" rx="10"/>${text(35,33,frame.title,18)}${body||visualScene(frame.visual)}</svg>`;
  }
  return {render};
});
