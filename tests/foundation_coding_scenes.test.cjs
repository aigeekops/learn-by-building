'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const M=require('../web/ai-course-models.js');require('../web/foundation-cs50p.js')(M);require('../web/foundation-missing.js')(M);
const S=require('../web/foundation-coding-scenes.js');
require('../web/foundation-cs50p-extra-scenes.js')(S);
require('../web/foundation-missing-extra-scenes.js')(S);
const ids=Object.keys(M.specs).filter(id=>/^(?:cs50p-|missing-)/.test(id));
const clone=x=>JSON.parse(JSON.stringify(x));
function shapes(svg){return svg.replace(/<title[\s\S]*?<\/title>/g,'').replace(/<text[\s\S]*?<\/text>/g,'').replace(/data-fid-stage="\d+"/g,'').replace(/fid-code-[a-z0-9-]+-\d+-/g,'fid-');}

test('all twenty supported models render every real frame as accessible self-contained SVG',()=>{
 assert.equal(ids.length,20);let total=0;
 const all=[];
 for(const id of ids){
  const trace=M.run(id),before=clone(trace),frames=[];
  for(let index=0;index<trace.steps.length;index++){
   const svg=S.render(trace,index);assert.ok(svg.startsWith('<svg '),id);assert.ok(svg.includes('viewBox="0 0 800 280"'));assert.ok(svg.includes('role="img"'));assert.ok(svg.includes('<title '));assert.ok(svg.includes(`data-fid-scene="${id}"`));assert.ok(svg.includes(`data-fid-stage="${index}"`));assert.ok(/<(?:circle|path|polygon|ellipse)\b/.test(svg),id+' has diagrammatic shapes');assert.ok(!/NaN|Infinity|undefined/.test(svg),id+' '+index);assert.ok(!/<script|<foreignObject|<animate|<set\b|onload=|href=/i.test(svg));frames.push(svg);all.push(svg);total++;
  }
  assert.equal(new Set(frames).size,trace.steps.length,id+' must advance every step');
  assert.ok(new Set(frames.map(shapes)).size>=2,id+' must change actual geometry or highlights, not only captions');
  assert.deepEqual(trace,before,id+' renderer must not change model data');
 }
 assert.ok(total>=100);
 // XML parsing also checks that dynamic labels never leave a broken SVG tree.
 const report=execFileSync('python3',['-c','import json,sys,xml.etree.ElementTree as E\na=json.load(sys.stdin)\nfor svg in a:\n root=E.fromstring(svg)\n assert root.tag=="{http://www.w3.org/2000/svg}svg"\nprint(len(a))'],{input:JSON.stringify(all),encoding:'utf8',maxBuffer:4e6});assert.equal(Number(report.trim()),total);
});

test('parameter changes remain visible in their execution sequence, including convergent final results',()=>{
 for(const id of ids){
  const base=M.run(id),sequence=base.steps.map((_,i)=>S.render(base,i)).join('\n');
  for(const spec of M.specs[id]){
   const alternatives=spec.type==='select'?spec.options.map(x=>x[0]):[spec.min,spec.max];
   for(const value of alternatives){
    if(String(value)===String(base.params[spec.id]))continue;
    const tr=M.run(id,{[spec.id]:value});
    assert.notEqual(tr.steps.map((_,i)=>S.render(tr,i)).join('\n'),sequence,id+' '+spec.id+'='+value);
    for(let index=0;index<tr.steps.length;index++){const svg=S.render(tr,index);assert.ok(svg.includes('<svg '));assert.ok(!/NaN|Infinity|undefined/.test(svg),id+' '+spec.id+' '+index);}
   }
  }
 }
});

test('function execution separates caller and locals and reveals values only after their assignments',()=>{
 const tr=M.run('cs50p-functions');
 const states=tr.steps.map((_,i)=>S.executionState(tr,i));
 assert.deepEqual(states[0].callStack,['调用处']);assert.equal(states[0].locals,null);
 for(const s of states.slice(0,6))assert.ok(!Object.hasOwn(s.caller,'distance'));
 assert.deepEqual(states[2].callStack,['调用处','calibrate']);
 assert.deepEqual(states[2].locals,{value:8,gain:2,offset:1});
 assert.equal(states[3].locals.scaled,16);assert.ok(!Object.hasOwn(states[3].locals,'corrected'));
 assert.equal(states[4].locals.corrected,17);
 assert.deepEqual(states[5].changes,[{name:'返回值',before:null,after:17}]);
 assert.equal(states[6].locals,null);assert.equal(states[6].caller.distance,tr.result.distance);
 assert.equal(states[6].caller.raw,8);
 assert.ok(!S.render(tr,0).includes('data-fid-after="17"'));
 assert.ok(!S.render(tr,6).includes('data-fid-motion="token"'));
 const changed=M.run('cs50p-functions',{raw:3,gain:4,offset:-2});
 assert.equal(S.executionState(changed,6).caller.distance,10);
 assert.equal(S.executionState(M.run('cs50p-loops')),null);
 assert.ok(S.renderExecution(tr,3).includes('aria-label="本步变量变化"'));
 assert.ok(S.renderExecution(tr,3).includes('scaled'));
 assert.ok(!S.renderExecution(tr,0).includes('>17<'));
 assert.equal(S.renderExecution(M.run('cs50p-loops')), '');
});

test('loop scene uses the actual accepted snapshot and handles empty input without inventing a mean',()=>{
 const empty=M.run('cs50p-loops',{count:0});const svg=S.render(empty,empty.steps.length-1);assert.ok(svg.includes('空列表'));assert.ok(svg.includes('无结果'));assert.ok(!svg.includes('data-fid-value="18"'));
 const a=M.run('cs50p-loops'),b=M.run('cs50p-loops',{minimum:30});assert.notEqual(shapes(S.render(a,a.steps.length-1)),shapes(S.render(b,b.steps.length-1)));
});

test('exception branches show actual parse and zero-division failures rather than a stale successful result',()=>{
 for(const [text,status] of [['oops','ValueError'],['3.5','ValueError'],['0','ZeroDivisionError']]){
  const tr=M.run('cs50p-exceptions',{text}),svg=S.render(tr,tr.steps.length-1);assert.ok(svg.includes(status));assert.ok(svg.includes('无结果'));assert.ok(svg.includes('#b42348'));
 }
 const good=M.run('cs50p-exceptions',{text:'-2'});assert.ok(S.render(good,good.steps.length-1).includes('data-fid-value="-50"'));
});

test('test scene reveals per-case judgments as assertions execute and colors the actual failed boundary',()=>{
 const tr=M.run('cs50p-tests');assert.ok(!S.render(tr,0).includes('>×</text>'));
 const failure=tr.steps.findIndex(s=>s.variables.distance===20&&s.variables.passed===false);assert.ok(failure>=0);assert.ok(S.render(tr,failure).includes('>×</text>'));
 assert.ok(S.render(tr,tr.steps.length-1).includes('4/5'));
 const fixed=M.run('cs50p-tests',{implementation:'correct'});assert.ok(S.render(fixed,fixed.steps.length-1).includes('5/5'));
});

test('shell diagram exposes the unresolved path and prevents output tokens on the failed-open branch',()=>{
 const tr=M.run('missing-shell',{target:'missing/report.txt'}),svg=S.render(tr,tr.steps.length-1);assert.ok(svg.includes('missing/report.txt'));assert.ok(svg.includes('目标未打开'));assert.ok(svg.includes('无输出 · 无写入'));assert.ok(!svg.includes('data-fid-motion="token"'));
 const good=M.run('missing-shell');assert.ok(S.render(good,good.steps.length-1).includes('data-fid-value="1"'));assert.ok(S.render(good,good.steps.length-1).includes('2 行'));
});

test('Git uses three real snapshots and quality distinguishes green weak tests from independent failure',()=>{
 const git=M.run('missing-git'),svg=S.render(git,5);for(const value of ['2','7'])assert.ok(svg.includes('>'+value+'</text>'));assert.ok(svg.includes('HEAD'));assert.ok(svg.includes('暂存区'));assert.ok(svg.includes('工作区'));assert.ok(svg.includes('C1'));
 const weak=M.run('missing-quality'),weakSvg=S.render(weak,weak.steps.length-1);assert.ok(weakSvg.includes('独立边界失败'));assert.ok(weakSvg.includes('简化门禁'));
 const fixed=M.run('missing-quality',{implementation:'fixed',suite:'boundary'});assert.ok(S.render(fixed,fixed.steps.length-1).includes('独立边界通过'));
});

test('dynamic labels, input and titles are XML-escaped, with no injected markup',()=>{
 const payload='</text><script onload="bad()">x&\'"</script>';
 const tr=M.run('cs50p-exceptions');tr.params.text=payload;tr.steps[0].title=payload;tr.steps[0].variables.raw=payload;
 const svg=S.render(tr,0);assert.ok(svg.includes('&lt;script'));assert.ok(svg.includes('&amp;'));assert.ok(svg.includes('&quot;'));assert.ok(svg.includes('&#39;'));assert.ok(!svg.includes('<script'));assert.ok(!svg.includes('onload="bad()"'));
 const env=M.run('missing-environment');env.params.runtime=payload;assert.ok(S.render(env,0).includes('&lt;script'));
});

test('unknown models and malformed traces return empty strings; valid indexes are clamped',()=>{
 for(const trace of [undefined,null,{},M.run('attention'),{model:'__proto__',steps:[{}]},{model:'cs50p-files',steps:[]}])assert.equal(S.render(trace,0),'');
 const trace=M.run('cs50p-files');assert.equal(S.render(trace,-2),S.render(trace,0));assert.equal(S.render(trace,10000),S.render(trace,trace.steps.length-1));assert.equal(S.render(trace,NaN),S.render(trace,0));
});

test('the same module registers a browser global without requiring models, DOM or Node',()=>{
 const context={};
 for(const name of ['foundation-coding-scenes.js','foundation-cs50p-extra-scenes.js','foundation-missing-extra-scenes.js'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web',name),'utf8'),context);
 assert.equal(typeof context.FoundationCodingScenes.render,'function');
 for(const id of ids)assert.equal(context.FoundationCodingScenes.render(M.run(id),0),S.render(M.run(id),0),id+' browser and Node scenes agree');
 assert.ok(!fs.readFileSync(path.join(__dirname,'../web/foundation-coding-scenes.js'),'utf8').includes('animateMotion'));
});
