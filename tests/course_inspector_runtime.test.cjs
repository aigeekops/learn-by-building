const {test}=require('node:test'),assert=require('node:assert/strict');
const UI=require('../web/course-inspector.js');
const provider={courseId:'fixture',models:{demo:{intuition:'明确输入、累计和与结果',inspect(t,i){return {title:'累计步骤',cells:[{id:'sum',label:'部分和',value:t.steps[i].sum,formula:t.params.n+' 项累计',inputs:{n:t.params.n}}]};},experiments:[{id:'double',label:'增加一项',prediction:'总和增加',before:{n:2},after:{n:3},expectation:'由3变为6',verify:(a,b)=>a.result.sum===3&&b.result.sum===6}]}}};
globalThis.CourseInspectorProviders={fixture:provider};
const run=({n=2}={})=>({model:'demo',params:{n},steps:Array.from({length:n},(_,i)=>({title:'第'+i+'项',sum:(i+1)*(i+2)/2})),result:{sum:n*(n+1)/2}});
test('step and cell selection reuse the actual trace and reject invalid jumps',()=>{
 const s={trace:run(),index:0};UI.render('fixture',s);
 assert.equal(UI.perform('fixture',s,'step','-1',run),false);assert.equal(s.index,0);
 assert.equal(UI.perform('fixture',s,'step','1',run),true);assert.equal(s.index,1);
 assert.ok(UI.render('fixture',s).includes('>3</code>'));
});
test('prediction preparation uses the baseline, applying verifies real after-results',()=>{
 const s={trace:run(),index:0};UI.perform('fixture',s,'prepare','double',run);
 assert.equal(s.trace.result.sum,3);assert.ok(!UI.render('fixture',s).includes('data-ci-verified='));
 UI.perform('fixture',s,'apply','',run);const text=UI.render('fixture',s);
 assert.equal(s.trace.result.sum,6);assert.ok(text.includes('data-ci-verified="true"'));
 assert.equal(s.ci.baseline.result.sum,3);assert.equal(s.index,2);
});
test('manual recomputation pins the old trace and reset restores only inspector state',()=>{
 const s={trace:run(),index:0,draft:'preserve evidence'};UI.render('fixture',s);
 const before=s.trace;s.trace=run({n:4});UI.render('fixture',s);assert.equal(s.ci.baseline,before);
 UI.perform('fixture',s,'reset','',run);assert.equal(s.trace.params.n,2);assert.equal(s.index,0);assert.equal(s.draft,'preserve evidence');
});
test('course content is escaped and unsupported models do not fabricate an inspector',()=>{
 assert.equal(UI.render('missing',{trace:run(),index:0}), '');
 const original=provider.models.demo.inspect;provider.models.demo.inspect=()=>({title:'<script>',cells:[{id:'x',label:'<svg>',value:'<img>',formula:'<b>'}]});
 const text=UI.render('fixture',{trace:run(),index:0});assert.ok(text.includes('&lt;script&gt;'));assert.ok(!text.includes('<img>'));provider.models.demo.inspect=original;
});
