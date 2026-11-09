const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const M=require('../web/ai-course-models.js');
require('../web/foundation-d2l.js')(M);
const S=require('../web/foundation-d2l-scenes.js');
const ids=Object.keys(M.specs).filter(id=>id.startsWith('d2l-'));
const renderLast=t=>S.render(t,t.steps.length-1);
const fmt=n=>String(Number(n.toFixed(3)));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};

test('all registered models retain the original eight and render accessible SVG frames',()=>{
  assert.ok(ids.length>=8);
  const svgs=[];
  for(const id of ids){
    const t=freeze(M.run(id));
    const distinct=new Set();
    t.steps.forEach((frame,index)=>{
      const svg=S.render(t,index);svgs.push(svg);distinct.add(svg);
      assert.ok(svg.startsWith('<svg '));assert.ok(svg.endsWith('</svg>'));
      assert.match(svg,/viewBox="0 0 800 284"/);assert.match(svg,/role="img"/);assert.match(svg,/<title[^>]*>[^<]+<\/title>/);
      assert.match(svg,/width:100%;height:auto/);assert.ok(svg.includes(`data-fid-step="${index}"`));
      assert.ok(svg.includes(frame.title));assert.match(svg,/<(?:circle|line|path|rect)\s/);
      assert.doesNotMatch(svg,/\b(?:NaN|Infinity|undefined)\b/);
    });
    assert.equal(distinct.size,t.steps.length);
  }
  const python=`import json,sys,xml.etree.ElementTree as E\nxs=json.load(sys.stdin)\nfor svg in xs:\n root=E.fromstring(svg)\n assert root.tag=='{http://www.w3.org/2000/svg}svg'\n assert root.find('{http://www.w3.org/2000/svg}title') is not None\nprint(len(xs))`;
  assert.equal(Number(execFileSync('python3',['-c',python],{input:JSON.stringify(svgs),encoding:'utf8'}).trim()),svgs.length);
});

test('every range endpoint and select option remains finite at every recorded step',()=>{
  for(const id of ids)for(const control of M.specs[id]){
    const values=control.type==='select'?control.options.map(o=>o[0]):[control.min,control.max];
    for(const value of values){
      const t=M.run(id,{[control.id]:value});
      t.steps.forEach((_,i)=>{const svg=S.render(t,i);assert.doesNotMatch(svg,/\b(?:NaN|Infinity|undefined)\b/,`${id} ${control.id} ${value} ${i}`);});
    }
  }
});

test('parameter changes modify substantive geometry or values for the original eight scenes',()=>{
  const changes={
    'd2l-tensors':{rows:3,offset:3},'d2l-matrix-probability':{w0:3,p0:4},
    'd2l-autograd':{x:3,w:2},'d2l-regression':{initialW:-1,rate:.5},
    'd2l-classification':{gap:3,target:2},'d2l-mlp':{w:-1},
    'd2l-generalization':{capacity:'memorize',split:'leaked'},'d2l-attention':{query:3,value:6}
  };
  for(const id of Object.keys(changes)){
    const base=renderLast(M.run(id)),changed=renderLast(M.run(id,changes[id]));
    const withoutTitles=svg=>svg.replace(/<title[\s\S]*?<\/title>/g,'').replace(/<desc[\s\S]*?<\/desc>/g,'');
    assert.notEqual(withoutTitles(base),withoutTitles(changed),id);
  }
});

test('tensor scenes reveal actual broadcast output cells and an incompatible shape draws no output',()=>{
  const t=M.run('d2l-tensors'),first=S.render(t,0),last=renderLast(t);
  assert.match(first,/data-cell-id="a-0"/);assert.doesNotMatch(first,/data-fid-cell="output-/);
  assert.match(last,/data-fid-cell="output-1-2" data-value="8"/);
  assert.ok(last.includes('总和 27'));
  const bad=renderLast(M.run('d2l-tensors',{mode:'incompatible'}));
  assert.ok(bad.includes('不兼容：停止相加'));assert.doesNotMatch(bad,/data-fid-cell="output-[^"]+" data-value=/);
});

test('autograd highlights the reverse graph only after the recorded backward step',()=>{
  const t=M.run('d2l-autograd');
  assert.ok(!S.render(t,2).includes('dL/d预测 ='));
  assert.ok(S.render(t,4).includes('dL/d预测 = -1'));
  const last=renderLast(t);assert.ok(last.includes('dw = -2'));assert.ok(last.includes('db = -1'));
  assert.match(last,/data-fid-motion="edge"/);
});

test('regression fit uses the parameters of the current frame rather than final fit in every frame',()=>{
  const t=M.run('d2l-regression'),first=S.render(t,0),updated=S.render(t,4),last=renderLast(t);
  assert.match(first,/data-fid-geometry="regression-fit" data-w="0" data-b="0"/);
  assert.match(updated,/data-fid-geometry="regression-fit" data-w="0.5" data-b="0.3"/);
  assert.ok(last.includes(`data-w="${fmt(t.result.w)}" data-b="${fmt(t.result.b)}"`));
  assert.match(last,/data-fid-observation="0" data-x="1" data-y="2"/);
  assert.match(last,/data-fid-observation="1" data-x="2" data-y="4"/);
  assert.ok(S.render(t,3).includes('梯度 dw=-5；db=-3'));
});

test('classification segments are derived from softmax probabilities and target loss',()=>{
  const t=M.run('d2l-classification',{gap:2,target:2}),svg=renderLast(t);
  for(const p of t.result.probabilities)assert.ok(svg.includes('data-probability="'+fmt(p)+'"'));
  assert.ok(svg.includes('= '+fmt(t.result.loss)));
});

test('MLP shows a blocked ReLU path and explicit zero-gradient convention',()=>{
  const closed=renderLast(M.run('d2l-mlp',{w:-1}));
  assert.ok(closed.includes('反向门 = 0'));assert.ok(closed.includes('dw=0；db=0'));
  const kink=renderLast(M.run('d2l-mlp',{w:0}));assert.ok(kink.includes('零点约定'));
});

test('validation leakage is visible as overlapping sample markers and labelled nonindependent score',()=>{
  const clean=renderLast(M.run('d2l-generalization'));
  const leaked=renderLast(M.run('d2l-generalization',{capacity:'memorize',split:'leaked'}));
  assert.ok(clean.includes('验证输入与训练输入无重叠'));assert.ok(leaked.includes('这个验证分数不是独立证据'));
  assert.match(leaked,/stroke-dasharray="3 3"/);
});

test('attention widths and contributions use the actual weights, while masked content has zero effect',()=>{
  const t=M.run('d2l-attention',{query:3}),svg=renderLast(t);
  t.result.weights.forEach(w=>assert.ok(svg.includes(`data-weight="${fmt(w)}"`)));
  assert.ok(svg.includes('贡献 '+fmt(t.result.contributions[0])));
  const masked=renderLast(M.run('d2l-attention',{visible:'first',value:6}));
  assert.ok(masked.includes('data-weight="0"'));assert.ok(masked.includes('权重0'));assert.ok(masked.includes('贡献 0'));
  assert.ok(masked.includes('对输出贡献严格为0'));
});

test('browser UMD export works independently of model loading and unknown model returns empty',()=>{
  const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../web/foundation-d2l-scenes.js'),'utf8'),context);
  assert.equal(typeof context.FoundationD2LScenes.render,'function');assert.equal(context.FoundationD2LScenes.render({model:'unknown',steps:[]},0),'');
  assert.equal(S.render(null,0),'');assert.equal(S.render({model:'d2l-tensors',steps:[]},0),'');
  const t=M.run('d2l-attention');assert.equal(S.render(t,-2),S.render(t,0));assert.equal(S.render(t,999),renderLast(t));
});
