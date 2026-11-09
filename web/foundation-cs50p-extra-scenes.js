/* Actual execution snapshots for the remaining CS50P companion topics. */
(function(root,factory){const apply=factory();if(typeof module!=='undefined'&&module.exports)module.exports=apply;else apply(root.FoundationCodingScenes)})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C={ink:'#173042',muted:'#607786',line:'#c4d6dc',mint:'#dcf5ee',teal:'#147b70',rose:'#fde8e7',red:'#b14740',white:'#ffffff',pale:'#f1f6f8'};
const text=(x,y,value,size=14,color=C.ink,anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(value)}</text>`;
const box=(x,y,w,h,active=false,error=false)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${error?C.rose:active?C.mint:C.white}" stroke="${error?C.red:active?C.teal:C.line}" stroke-width="${active?3:1.5}"/>`;
const arrow=(x,y,end,active=false)=>`<path d="M${x} ${y} H${end-7} M${end-13} ${y-5} L${end-7} ${y} L${end-13} ${y+5}" fill="none" stroke="${active?C.teal:C.line}" stroke-width="2"/>`;
const fmt=x=>x===null?'无':Array.isArray(x)?x.join(', '):typeof x==='object'?JSON.stringify(x):String(x);
const cut=(x,n=52)=>{const s=fmt(x);return s.length>n?s.slice(0,n-1)+'…':s};
const owns=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
function regex({v,p,i}){let s=text(400,27,'先检查格式，再核对范围，最后提取数值',16);
s+=box(35,42,730,60,i<2)+text(52,64,'原文：'+cut(JSON.stringify(p.text),58),14,C.ink,'start')+text(52,86,'text：'+(owns(v,'text')?cut(JSON.stringify(v.text),40):'等待清理'),13,C.muted,'start')+text(748,86,'strip：'+(p.clean==='yes'?'开启':'关闭')+' · 大小写：'+(p.ignoreCase==='yes'?'忽略':'严格'),12,C.muted,'end');
[['两个字母','[A-Z]{2}'],['分隔符','-'],['1至3位数字','[0-9]{1,3}'],['单位','cm']].forEach(([label,pattern],k)=>{const x=38+k*185;s+=box(x,111,166,56,i===2)+text(x+83,133,label,12,C.muted)+text(x+83,153,pattern,15);if(k<3)s+=arrow(x+167,140,x+181,i>=2)});
s+=text(43,201,'候选子串：'+(owns(v,'candidate')?cut(v.candidate,30):'尚未查找'),13,C.ink,'start');
s+=text(43,226,'范围：'+(owns(v,'matched')?(v.matched?'通过':'拒绝'):'等待检查')+' · '+(p.mode==='full'?'整条':'子串'),14,owns(v,'matched')&&!v.matched?C.red:C.teal,'start');
s+=box(482,184,281,61,i>=6,owns(v,'matched')&&!v.matched)+text(623,206,'sensor：'+(owns(v,'sensor')?fmt(v.sensor):'等待'),13)+text(623,229,'value：'+(owns(v,'value')?fmt(v.value):'等待'),16);return s}
function oop({v,p,i}){const objects=v.objects||{},target=v.targetId;let s=text(400,27,'名字指向对象；写入前检查，拒绝时保留旧值',16);
[['a',102],['target',400],['b',698]].forEach(([name,x])=>{s+=box(x-58,49,116,35,i===2)+text(x,73,name,16)});
[['a',125],['c',400],['b',675]].forEach(([id,x])=>{const exists=owns(objects,id)&&objects[id]!==null;const active=target===id&&i>=2;s+=box(x-85,122,170,77,active,active&&v.status==='ValueError')+text(x,144,'对象 '+id,13,C.muted)+text(x,178,exists?'value = '+objects[id]:id==='c'?'尚未新建':'尚未构造',17,exists?C.ink:C.muted)});
if(i>=1)s+=`<path d="M102 84 L125 120 M698 84 L675 120" stroke="${C.teal}" fill="none" stroke-width="2"/>`;
if(target)s+=`<path d="M400 84 L${target==='a'?125:400} 120" stroke="${C.teal}" fill="none" stroke-width="3"/>`;
s+=text(33,232,owns(v,'status')?'写入：'+v.status:owns(v,'attempt')?'候选新值：'+v.attempt:'等待属性写入',13,v.status==='ValueError'?C.red:C.muted,'start');s+=text(768,232,owns(v,'total')?'校准和 = '+v.total:'偏移 = '+p.offset+'；结果尚未汇总',14,C.teal,'end');return s}
function etcetera({v,p,i}){const readings=v.readings||[12,18,12,26],visited=v.visited||0,selected=v.selected||[],current=v.index;let s=text(400,27,'生成器按请求推进；访问量与返回条数分开',16);
readings.forEach((value,k)=>{const x=66+k*125,active=current===k&&i>=3,seen=k<visited;s+=box(x-35,62,95,65,active)+text(x+12,86,'索引 '+k,12,C.muted)+text(x+12,114,value,20,seen?C.teal:C.muted);if(k<3)s+=arrow(x+62,95,x+87,seen)});
s+=box(568,57,195,80,i<3)+text(665,80,p.strategy==='lazy'?'按需生成器':'完整列表',15)+text(665,105,'保留 value ≥ '+p.minimum+' cm',12,C.muted)+text(665,126,'上限 '+p.take+' 条',13,C.muted);
s+=text(36,174,'已见不同值：'+cut(v.seen||[],34),14,C.muted,'start')+text(36,204,'实际访问 '+visited+' / 4 项',16,C.teal,'start');
s+=box(398,159,364,78,i>=3)+text(416,183,'实际选中：'+(selected.length?selected.map(x=>x.value).join(', '):'空'),14,C.ink,'start')+text(416,215,'sum = '+(owns(v,'total')?v.total:'尚未汇总'),18,C.teal,'start');return s}
function project({v,p,i}){let s=text(400,27,'解析、筛选、汇总与报告分别承担一种责任',16);const lines=v.lines||[];
lines.forEach((line,k)=>{const y=55+k*37,active=v.lineNumber===k+1;s+=box(25,y,222,30,active,(v.errors||[]).includes(k+1))+text(38,y+20,(k+1)+': '+line,13,C.ink,'start')});if(!lines.length)s+=box(25,66,222,65,i<2)+text(136,103,'空文件',15,C.muted);
s+=arrow(250,128,292,i>=2)+box(298,83,180,86,i>=2&&i<7,v.status==='aborted')+text(388,110,'parse → filter',15)+text(388,139,'已收 '+(v.records||[]).length+' 条',14,C.teal)+arrow(480,128,526,owns(v,'summary')&&v.summary!==null);
s+=box(534,66,239,122,owns(v,'summary'),v.status==='aborted');const summary=v.summary;s+=text(655,92,'汇总 / 报告',15)+text(655,118,summary?'count = '+summary.count:'尚无汇总',14)+text(655,143,summary?'total = '+summary.total:'状态：'+(v.status||'等待'),14)+text(655,170,summary?'mean = '+fmt(summary.mean):v.status==='aborted'?'中止后无成功报告':'等待完成读取',12,v.status==='aborted'?C.red:C.muted);
s+=text(29,226,'策略：'+(p.policy==='skip'?'跳过并列错误':'坏行即中止')+' · 坏行 '+fmt(v.errors||[]),13,C.muted,'start');s+=text(767,226,owns(v,'report')?(v.report===null?'无报告':'报告已生成'):'报告未产生',13,C.teal,'end');return s}
const scenes={'cs50p-regex':regex,'cs50p-oop':oop,'cs50p-etcetera':etcetera,'cs50p-project':project};
function render(trace,index=0){if(!trace||!owns(scenes,trace.model)||!trace.steps?.length)return '';const i=Math.min(trace.steps.length-1,Math.max(0,Number.isFinite(Number(index))?Math.trunc(Number(index)):0)),v={};trace.steps.slice(0,i+1).forEach(s=>Object.assign(v,s.variables));const dots=trace.steps.map((_,n)=>`<circle cx="${28+n*744/Math.max(1,trace.steps.length-1)}" cy="266" r="${n===i?4:2}" fill="${n===i?C.teal:C.line}"/>`).join('');return `<svg xmlns="http://www.w3.org/2000/svg" class="fid-coding-scene" viewBox="0 0 800 280" role="img" aria-labelledby="fid-extra-${trace.model}-${i}" data-fid-scene="${trace.model}" data-fid-stage="${i}" font-family="system-ui, sans-serif"><title id="fid-extra-${trace.model}-${i}">${esc(trace.steps[i].title)}</title>${scenes[trace.model]({v,p:trace.params,i})}${dots}</svg>`}
function apply(S){if(!S||typeof S.render!=='function')throw Error('CS50P extra scenes require FoundationCodingScenes');const prior=S.render;S.render=(trace,index=0)=>render(trace,index)||prior(trace,index);return S}
apply.render=render;return apply;
});
