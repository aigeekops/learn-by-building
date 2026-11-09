/* Geometry is drawn from the same snapshot as the code and values. No clocks. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ExtensionCourseScenes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=x=>Number(x.toFixed(4));
  function render(scene){
    const title='<h3>'+escape(scene.title)+'</h3>';
    if(scene.kind==='matrix')return title+'<div class="ext-matrix" role="table" aria-label="'+escape(scene.title)+'">'+scene.values.map((row,i)=>'<div role="row">'+row.map((v,j)=>'<span role="cell" data-row="'+i+'" data-column="'+j+'">'+escape(number(v))+'</span>').join('')+'</div>').join('')+'</div>';
    if(scene.kind!=='xy')throw Error('未知课件图示');
    const points=[...scene.paths.flat(),...(scene.points||[]).map(p=>p.xy),...(scene.circles||[]).flatMap(c=>[[c.xy[0]-c.r,c.xy[1]-c.r],[c.xy[0]+c.r,c.xy[1]+c.r]])];
    if(!points.length)return title;
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),xmin=Math.min(0,...xs),xmax=Math.max(0,...xs),ymin=Math.min(0,...ys),ymax=Math.max(0,...ys),scale=260/Math.max(xmax-xmin,ymax-ymin,1),cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
    const X=x=>220+(x-cx)*scale,Y=y=>180-(y-cy)*scale,colors=['#0e7490','#b45309','#7c3aed'];
    const axes='<path d="M25 '+Y(0)+'H415 M'+X(0)+' 25V335" stroke="#cbd5e1" stroke-width="1"/><text x="405" y="'+(Y(0)-6)+'">x</text><text x="'+(X(0)+6)+'" y="25">y</text>';
    const circles=(scene.circles||[]).map(c=>'<circle cx="'+X(c.xy[0])+'" cy="'+Y(c.xy[1])+'" r="'+c.r*scale+'" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>').join('');
    const paths=scene.paths.map((path,i)=>'<polyline points="'+path.map(p=>X(p[0])+','+Y(p[1])).join(' ')+'" fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="3"/>'+path.map(p=>'<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="4" fill="'+colors[i%colors.length]+'"/>').join('')).join('');
    const labels=(scene.points||[]).map(p=>'<text x="'+(X(p.xy[0])+6)+'" y="'+(Y(p.xy[1])-8)+'">'+escape(p.label)+'</text>').join('');
    const table=scene.paths.map((path,i)=>'<p><b>曲线'+(i+1)+'</b> '+path.map(p=>'('+p.map(number).join(', ')+')').join(' → ')+'</p>').join('');
    return title+'<svg class="ext-geometry" viewBox="0 0 440 360" role="img" aria-label="'+escape(scene.title)+'；各坐标见下方数据">'+axes+circles+paths+labels+'</svg><div class="ext-coordinates">'+table+'</div>';
  }return {render};
});
