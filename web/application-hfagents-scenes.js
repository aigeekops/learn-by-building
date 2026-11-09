/* Original computed SVG scenes for the Agents Course. Reads recorded frames only. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ApplicationHFAgentsScenes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const C={ink:'#17364a',muted:'#708294',line:'#cbd8e2',pale:'#eef4f8',green:'#147c6f',mint:'#d8f2e9',blue:'#426fbc',orange:'#ba711d',sand:'#fff0d4',red:'#b33f57',rose:'#fce2e7',white:'#fff'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>x===null?'无结果':x===undefined?'等待':typeof x==='number'?String(Number(x.toFixed(3))):typeof x==='object'?JSON.stringify(x):String(x);
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k),A=x=>Array.isArray(x)?x:[];
const text=(x,y,s,size=14,color=C.ink,anchor='middle',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${color}" ${extra}>${esc(fmt(s))}</text>`;
const rect=(x,y,w,h,fill=C.white,stroke=C.line,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;
const circle=(x,y,r,fill=C.white,stroke=C.line,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2" ${extra}/>`;
const edge=(g,d,on=false,color=C.green)=>`<path d="${d}" fill="none" stroke="${on?color:C.line}" stroke-width="${on?3:2}" ${on?'data-teaching-state="current"':'stroke-dasharray="4 4"'} marker-end="url(#${g.id}-arrow)"/>`;
const value=(x,y,label,n,on=true,color=C.green)=>circle(x,y,31,on?C.mint:C.pale,on?color:C.line,on?'data-teaching-state="current"':'')+text(x,y-7,label,11,on?color:C.muted)+text(x,y+15,fmt(n),16,on?C.ink:C.muted,'middle',`data-number="${esc(fmt(n))}"`);
function page(x,y,w,h,label,lines,on=false){let out=`<path d="M${x} ${y} H${x+w-17} L${x+w} ${y+17} V${y+h} H${x} Z" fill="${C.white}" stroke="${on?C.green:C.line}" stroke-width="${on?3:2}" ${on?'data-teaching-state="current"':''}/>`+text(x+w/2,y-10,label,12,C.muted);for(const [i,line] of lines.slice(0,5).entries())out+=text(x+12,y+27+i*21,String(line).slice(0,27),12,on?C.ink:C.muted,'start');return out;}
function state(g){const {v,p,line:l}=g;let s=text(400,27,'消息按角色进入状态，能力由工具集合决定',17);
 const messages=A(v.messages),items=messages.length?messages:[v.system,v.task].filter(Boolean);items.slice(0,9).forEach((m,i)=>{const y=57+i*19;s+=rect(38,y,219,18,m.role==='tool'?C.mint:C.pale,C.line,`data-message-role="${m.role}"`)+text(49,y+13,m.role+': '+(typeof m.content==='string'?m.content:JSON.stringify(m.content)).slice(0,22),10,C.ink,'start');});
 s+=edge(g,'M270 138 H343',l>=5)+circle(405,138,60,C.pale,l>=5?C.green:C.line)+text(405,125,'本轮状态',15)+text(405,152,has(v,'messageCount')?v.messageCount+' 条消息':'消息装配中',14,C.muted);
 s+=edge(g,'M467 138 H543',l>=6)+rect(550,70,204,78,l===6?C.mint:C.white,l>=6?C.green:C.line)+text(652,95,'工具注册边界',13,C.muted)+text(652,125,has(v,'allowed')?(v.allowed?'允许 read':'拒绝 write'):'待校验',16,has(v,'allowed')&&!v.allowed?C.red:C.green);
 s+=edge(g,'M652 150 V190',l>=7)+text(652,221,has(v,'next')?v.next:'下一动作尚未产生',15,has(v,'next')?C.green:C.muted);
 return s+text(38,248,'保留历史：'+p.turns+'轮；本次观测：'+(p.observation==='yes'?'提供':'尚无'),12,C.muted,'start');}
function tools(g){const {v,line:l}=g;let s=text(400,27,'请求经过注册与契约检查，结果在执行后才出现',17);
 s+=page(35,81,170,124,'请求',['name: '+g.p.name,'limit: '+g.p.limit],l===1);
 [['registered',305,'注册名'],['valid',470,'参数范围'],['executed',635,'实际执行']].forEach(([k,x,label])=>{const ready=has(v,k),flag=v[k];s+=circle(x,136,35,ready?(flag?C.mint:C.rose):C.pale,ready?(flag?C.green:C.red):C.line,ready?'data-teaching-state="current"':'')+text(x,141,ready?(flag?'✓':'×'):'?',24,ready?(flag?C.green:C.red):C.muted)+text(x,191,label,12,C.muted);});
 s+=edge(g,'M207 136 H268',l>=2)+edge(g,'M342 136 H432',l>=3)+edge(g,'M507 136 H597',l>=5);
 const response=v.response,rows=A(v.rows);s+=text(400,235,response?(response.isError?'返回错误：'+response.kind:'响应已产生；可消费 '+(has(v,'count')?v.count:'待核对')+' 条'):'响应尚未产生',14,response?.isError?C.red:C.green);
 if(has(v,'count'))rows.forEach((d,i)=>s+=page(685+i*4,192+i*5,75,38,d.id.slice(0,8),[],true));return s;}
function loop(g){const {v,line:l}=g;const points=[[210,95,'决策'],[420,75,'工具'],[520,185,'观测'],[270,212,'状态']];let s=text(400,26,'没有证据就读取，成功观测进入下一次决策',17);
 const active=l===3?0:l===5?1:l===7?2:3;
 [['M245 89 L384 77',0],['M451 94 L502 153',1],['M485 195 L305 210',2],['M246 184 L218 130',3]].forEach(([d,i])=>s+=edge(g,d,active===i));
 points.forEach(([x,y,label],i)=>s+=circle(x,y,33,i===active?C.mint:C.pale,i===active?C.green:C.line,i===active?'data-teaching-state="current"':'')+text(x,y+5,label,14));
 s+=value(95,133,'calls',has(v,'calls')?v.calls:'?',has(v,'calls'))+value(678,88,'decisions',has(v,'decisions')?v.decisions:'?',has(v,'decisions'));
 s+=rect(580,151,175,91,C.white,has(v,'status')&&v.status!=='running'?(v.status==='completed'?C.green:C.red):C.line)+text(666,174,'停止原因 / 输出',12,C.muted)+text(666,198,has(v,'status')?v.status:'running',12,v.status==='completed'?C.green:C.muted)+text(666,224,v.answer===null||!has(v,'answer')?'未输出':v.answer,14,v.answer?C.green:C.muted);
 return s+text(400,258,'决策上限 '+g.p.budget+'；只有进入 final 才算已输出',12,C.muted);}
function context(g){const {v}=g;let s=text(400,27,'完整保留任务、约束和带来源记忆，再考虑背景',17);const budget=v.inputBudget||0,req=A(v.required),selected=A(v.selected),x=42,y=80,w=720;
 s+=rect(x,y,w,55,C.white,C.line)+rect(x,y,w*budget/80,55,C.pale,C.line)+`<line x1="${x+w*budget/80}" x2="${x+w*budget/80}" y1="${y-6}" y2="${y+62}" stroke="${C.orange}" stroke-dasharray="4 3" data-input-budget="${budget}"/>`+text(x,y-12,'本次输入空间 '+(has(v,'inputBudget')?v.inputBudget:'等待')+' 人工单位',12,C.muted,'start');let offset=x;
 const shown=[...req,...selected.filter(([id])=>id==='optional')];if(shown.length){const scale=w/80;for(const [id,cost] of shown){const chosen=selected.some(([a])=>a===id),ww=cost*scale;s+=rect(offset,y+4,ww-3,47,chosen?C.mint:C.white,chosen?C.green:C.line,`data-budget-piece="${id}" data-cost="${cost}"`)+text(offset+ww/2,y+24,id,11,C.muted)+text(offset+ww/2,y+43,cost,12);offset+=ww;}}
 s+=text(x,162,'system 12 + task 8 + constraint 6 + memory',14,C.muted,'start');
 s+=value(170,219,'必需',has(v,'requiredCost')?v.requiredCost:'?',has(v,'requiredCost'))+value(400,219,'已用',has(v,'used')?v.used:'?',has(v,'used'))+value(635,219,'余量',has(v,'remaining')?v.remaining:'?',has(v,'remaining'));
 if(has(v,'fits'))s+=text(745,162,v.fits?'必需内容可完整装入':'容量不足：拒绝本次装入',12,v.fits?C.green:C.red,'end');return s;}
function framework(g){const {v,p,line:l}=g;let s=text(400,27,'受控模型响应 → 真实工具边界 → 计算与返回',17);
 s+=page(35,78,220,131,'ReplayModel 给定响应',['n = count_items("sensors")','final_answer(n * unitPrice)'],l===1);
 s+=edge(g,'M264 141 H339',l>=3)+rect(350,84,175,116,l===4?C.mint:C.pale,has(v,'allowed')&&!v.allowed?C.red:C.line)+text(437,111,'注册的只读工具',13,C.muted)+text(437,145,'count_items',14)+text(437,176,has(v,'allowed')?(v.allowed?'允许调用':'拒绝调用'):'等待边界检查',12,has(v,'allowed')&&!v.allowed?C.red:C.green);
 s+=edge(g,'M529 141 H602',l>=5)+value(651,114,'工具数值',has(v,'toolCount')&&v.toolCount!==null?v.toolCount:'?',v.toolCount!==null&&has(v,'toolCount'))+text(651,169,'× '+p.unitPrice,16,C.muted)+value(651,226,'amount',has(v,'amount')&&v.amount!==null?v.amount:'?',has(v,'amount')&&v.amount!==null);
 return s+text(39,248,'本页不执行Python；离线本地CodeAgent案例另行真实运行',12,C.muted,'start');}
function rag(g){const {v,line:l}=g;let s=text(400,27,'查询匹配不等于事实支持，候选还要过证据检查',17);
 s+=page(32,85,176,135,'本次查询',A(v.terms).length?v.terms:['查询尚未发出'],l===4)+edge(g,'M211 147 H280',l>=5);
 const ranked=l>=5?A(v.ranked):[],hits=l>=6?A(v.hits):[],evidence=l>=7?A(v.evidence):[];
 const docList=v.documents||[{id:'sampling-v1'},{id:'power-v1'},{id:'log-v1'}];docList.forEach((d,i)=>{const y=65+i*62,rank=ranked.find(x=>x.id===d.id),supported=evidence.some(x=>x.id===d.id),hit=hits.some(x=>x.id===d.id),score=rank?.score,ww=score===undefined?0:score*180;
 s+=rect(290,y,230,45,supported?C.mint:hit?C.sand:C.white,supported?C.green:C.line,supported?'data-teaching-state="current"':'')+text(302,y+18,d.id,12,C.ink,'start');s+=`<rect x="302" y="${y+27}" width="${ww}" height="8" fill="${supported?C.green:C.blue}" data-score="${score===undefined?'waiting':score}"/>`+text(510,y+20,score===undefined?'等待':fmt(score),12,C.muted,'end');});
 s+=edge(g,'M524 147 H579',l>=7)+page(591,92,171,119,'回答与来源',has(v,'answer')?A(v.answer).map(x=>(x.source||'无来源')+': '+x.value):['等待证据检查'],has(v,'answer'));
 return s+text(400,253,'calls = '+(has(v,'calls')?v.calls:'等待')+'；最多 '+g.p.budget+' 次检索',13,C.muted);}
function evaluation(g){const {v,line:l}=g;let s=text(400,27,'未判定保持等待，超时仍然占一题',17);const results=A(v.results);
 for(let i=0;i<4;i++){const x=45+i*186,result=results.find(r=>r.id==='q'+(i+1)),color=result?(result.correct?C.green:C.red):C.line;s+=rect(x,77,157,118,result?(result.correct?C.mint:C.rose):C.pale,color,result?'data-teaching-state="current"':'')+text(x+78,105,'q'+(i+1),15,C.muted)+text(x+78,151,result?(result.correct?'✓':result.timeout?'超时':'×'):'等待',27,result?color:C.muted)+text(x+78,182,result?'已计入分母':'尚未判定',11,C.muted);}
 s+=text(68,239,'正确题数 '+(has(v,'correct')?v.correct:'等待')+' / 4',16,C.ink,'start')+text(403,239,'accuracy '+(has(v,'accuracy')?fmt(v.accuracy):'等待'),16,C.green)+text(744,239,has(v,'gate')?(v.gate?'通过本地门槛':'未过本地门槛'):'门禁待判定',14,has(v,'gate')?(v.gate?C.green:C.red):C.muted,'end');return s;}
function project(g){const {v,line:l}=g;let s=text(400,27,'先有有效观测才提交；重放还要检查参数',17);
 s+=page(33,85,171,123,'任务 run-1',['question: '+g.p.question,'最多读取: '+g.p.budget],l===1)+edge(g,'M207 145 H275',l>=3)+circle(325,145,39,C.pale,has(v,'completed')?(v.completed?C.green:C.red):C.line,l===3?'data-teaching-state="current"':'')+text(325,135,'读取',13,C.muted)+text(325,160,has(v,'calls')?v.calls:'?',20,C.ink);
 s+=edge(g,'M367 145 H429',l>=4)+page(444,84,150,127,'完成回执',has(v,'receipt')&&v.receipt?['question: '+v.receipt.question,'answer: '+v.receipt.answer,'source: '+(v.receipt.source||'无')]:['未提交'],has(v,'committed')&&v.committed>0);
 s+=edge(g,'M600 145 H660',l>=8)+circle(710,145,40,has(v,'replayStatus')?(v.replayStatus==='replayed'?C.mint:C.rose):C.pale,has(v,'replayStatus')?(v.replayStatus==='replayed'?C.green:C.red):C.line,has(v,'replayStatus')?'data-teaching-state="current"':'')+text(710,139,'重放',12,C.muted)+text(710,159,has(v,'replayStatus')?v.replayStatus:'待检查',11,C.ink);
 s+=edge(g,'M710 185 C710 246 520 246 520 215',l>=7)+text(512,257,'同一请求ID + 相同参数，才可使用缓存答案',12,C.muted);
 return s+text(37,244,'answer: '+(has(v,'answer')&&v.answer!==null?v.answer:'尚未输出'),13,C.muted,'start');}
const scenes={'hfagents-state':state,'hfagents-tools':tools,'hfagents-loop':loop,'hfagents-context':context,'hfagents-smolagents':framework,'hfagents-rag':rag,'hfagents-evaluation':evaluation,'hfagents-project':project};
function render(trace,index=0){if(!trace||!has(scenes,trace.model)||!Array.isArray(trace.steps)||!trace.steps.length)return '';const i=Math.max(0,Math.min(trace.steps.length-1,Number.isFinite(index)?Math.trunc(index):0)),frame=trace.steps[i],v=Object.assign({},...trace.steps.slice(0,i+1).map(s=>s.variables));const g={trace,v,p:trace.params,line:frame.line,index:i,id:'app-hf-'+trace.model+'-'+i};
 const title=trace.model+' · '+frame.title,defs=`<defs><marker id="${g.id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${C.green}"/></marker></defs>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" role="img" aria-labelledby="${g.id}-title" data-application-scene="${trace.model}" data-fid-scene="${trace.model}" data-fid-stage="${i}" font-family="system-ui,sans-serif"><title id="${g.id}-title">${esc(title)}</title>${defs}${scenes[trace.model](g)}${text(26,287,frame.title,11,C.muted,'start')}${text(774,287,(i+1)+' / '+trace.steps.length,11,C.muted,'end')}</svg>`;
}
return {render};
});
