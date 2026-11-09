const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const M=require('../web/ai-course-models.js');
require('../web/foundation-cs50p.js')(M);
const data=require('../config/foundation_cs50p.json');
const result=(id,p)=>M.run('cs50p-'+id,p).result;

test('CS50P eleven lessons have substantive content, matching demos and source locators',()=>{
 assert.equal(data.course.id,'cs50p');assert.equal(data.lessons.length,11);
 for(const [i,l] of data.lessons.entries()){
  assert.equal(l.unit,String(i+1));assert.equal(l.course,'cs50p');assert.ok(l.explanation.length>=3);assert.ok(l.sections.length>=4);
  assert.ok(l.sections.every(s=>s.explanation.length>45&&s.code&&s.exercise));
  assert.equal(l.exercise.expected,Number(l.exercise.expected));assert.ok(l.exercise.transfer.length>30);
  for(const id of l.sources){assert.ok(data.sources[id]);assert.match(data.sources[id].url,/^https:\/\/cs50.harvard.edu\/python\/(?:notes\/[0-9]|project)\//);assert.ok(data.sources[id].locator)}
  for(const b of l.bridges)assert.ok(data.lessons.some(x=>x.id===b.lesson));
 }
});
test('Every model computes >=5 valid trace snapshots at defaults and each boundary control',()=>{
 for(const l of data.lessons){
  const run=params=>{const t=M.run(l.modelId,params);assert.ok(t.steps.length>=5);assert.equal(t.model,l.modelId);for(const s of t.steps){assert.ok(s.line>=1&&s.line<=t.code.length);assert.ok(['flow','bars','segments'].includes(s.visual.kind));assert.ok(s.title&&s.detail&&s.variables)}assert.doesNotMatch(JSON.stringify(t),/NaN|Infinity/);return t};
  const base=run();assert.deepEqual(run(),base);
  for(const c of M.specs[l.modelId])for(const v of c.type==='range'?[c.min,c.max]:c.options.map(x=>x[0]))run({[c.id]:v});
  assert.throws(()=>M.run(l.modelId,{[M.specs[l.modelId][0].id]:null}));
 }
});
test('Function call retains raw and independently recomputes scale/offset including negative values',()=>{
 assert.deepEqual(result('functions'),{raw:8,scaled:16,distance:17});
 assert.equal(result('functions',{raw:7,gain:3,offset:-2}).distance,19);
 assert.equal(result('functions',{raw:0,gain:5,offset:-1}).distance,-1);
 assert.equal(result('functions',{raw:20,gain:5,offset:5}).distance,105);
});
test('Ordered conditions preserve equality, both thresholds and invalid measurement precedence',()=>{
 for(const [distance,branch,speed] of [[19,'stop',0],[20,'stop',0],[21,'slow',30],[50,'slow',30],[51,'forward',60]]){const r=result('conditions',{distance});assert.equal(r.branch,branch);assert.equal(r.speed,speed)}
 assert.equal(result('conditions',{distance:100,valid:'no'}).branch,'invalid');
 assert.equal(result('conditions',{distance:31,stop:30}).speed,30);
 assert.equal(result('conditions',{distance:30,stop:30}).speed,0);
});
test('Loop retains cumulative values and treats empty mean as missing',()=>{
 assert.deepEqual(result('loops'),{readings:[12,18,26,9],accepted:[18,26],total:44,mean:22});
 assert.equal(result('loops',{minimum:10}).total,56);
 assert.deepEqual(result('loops',{count:0}),{readings:[],accepted:[],total:0,mean:null});
 assert.equal(result('loops',{minimum:30}).mean,null);
 assert.equal(result('loops',{count:3,minimum:20}).mean,26);
});
test('Python conversion semantics on the declared ASCII choices and separate division failure',()=>{
 assert.equal(result('exceptions',{text:'3.5'}).status,'ValueError');
 assert.equal(result('exceptions',{text:'oops'}).result,null);
 assert.equal(result('exceptions',{text:'0'}).status,'ZeroDivisionError');
 assert.equal(result('exceptions',{text:'-2'}).result,-50);
 assert.equal(result('exceptions',{text:' 7 '}).parsed,7);
 assert.equal(result('exceptions',{text:'12'}).result,100/12);
});
test('Library model uses numeric sorting and correct even-count median',()=>{
 let r=result('libraries');assert.equal(r.mean,16.5);assert.equal(r.median,13);
 r=result('libraries',{last:50,method:'median'});assert.equal(r.mean,21.5);assert.equal(r.answer,13);
 r=result('libraries',{last:10});assert.deepEqual(r.sorted,[10,10,12,14]);assert.equal(r.median,11);assert.equal(r.mean,11.5);assert.deepEqual(r.values,[10,12,14,10]);
});
test('Boundary suite exposes defect that smoke suite misses',()=>{
 assert.equal(result('tests').failed,1);assert.equal(result('tests').results.find(x=>!x.passed).distance,20);
 assert.equal(result('tests',{suite:'smoke'}).failed,0);
 assert.equal(result('tests',{implementation:'correct'}).passed,5);
});
test('Append retains history; write mode truncates even for zero new reading',()=>{
 let r=result('files');assert.deepEqual(r.values,[12,20,30]);assert.equal(r.total,62);assert.equal(r.mean,62/3);assert.equal(r.buffer,'12\n20\n30\n');
 r=result('files',{mode:'w'});assert.deepEqual(r.values,[30]);assert.equal(r.mean,30);
 r=result('files',{value:0});assert.equal(r.mean,32/3);
 assert.deepEqual(result('files',{mode:'w',value:0}).values,[0]);
});
test('Every displayed complete Python example actually runs successfully',()=>{
 for(const l of data.lessons){const s=l.sections.at(-1);assert.match(s.title,/Python/);const r=spawnSync('python3',['-c',s.code],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,l.id+'\n'+r.stderr);assert.ok(r.stdout.trim())}
});
test('Python serves as an independent numeric oracle across errors, thresholds and file modes',()=>{
 const script=`import json, statistics, tempfile\nfrom pathlib import Path\nout={}\nout['functions']=[x*g+o for x,g,o in [(0,5,-1),(7,3,-2),(20,5,5)]]\nout['conditions']=[0 if d<=20 else 30 if d<=50 else 60 for d in [0,19,20,21,50,51,100]]\nout['exceptions']=[]\nfor text in ['12','3.5','oops','0','-2',' 7 ']:\n try:\n  n=int(text)\n  value=100/n\n  out['exceptions'].append(['ok',value])\n except (ValueError,ZeroDivisionError) as e:\n  out['exceptions'].append([type(e).__name__,None])\nout['libraries']=[[statistics.mean([10,12,14,n]),statistics.median([10,12,14,n])] for n in [10,30,50]]\nout['files']=[]\nwith tempfile.TemporaryDirectory() as directory:\n path=Path(directory)/'example.txt'\n for mode in ['a','w']:\n  path.write_text('12\\n20\\n',encoding='utf8')\n  with path.open(mode,encoding='utf8') as f: f.write('30\\n')\n  with path.open(encoding='utf8') as f: values=[int(line) for line in f]\n  out['files'].append(values)\nprint(json.dumps(out))`;
 const p=spawnSync('python3',['-c',script],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);const py=JSON.parse(p.stdout);
 assert.deepEqual([[0,5,-1],[7,3,-2],[20,5,5]].map(([raw,gain,offset])=>result('functions',{raw,gain,offset}).distance),py.functions);
 assert.deepEqual([0,19,20,21,50,51,100].map(distance=>result('conditions',{distance}).speed),py.conditions);
 assert.deepEqual(['12','3.5','oops','0','-2',' 7 '].map(text=>{const r=result('exceptions',{text});return[r.status,r.result]}),py.exceptions);
 assert.deepEqual([10,30,50].map(last=>{const r=result('libraries',{last});return[r.mean,r.median]}),py.libraries);
 assert.deepEqual(['a','w'].map(mode=>result('files',{mode}).values),py.files);
});

test('The full official topic order maps to stable authored lessons and an original project',()=>{
 const c=data.course.coverage;
 assert.equal(c.status,'authored');assert.equal(c.items.length,11);
 assert.deepEqual(c.items.map(x=>x.unit),[...Array.from({length:10},(_,i)=>'Week '+i),'Final Project']);
 assert.deepEqual(c.items.flatMap(x=>x.lessons),data.lessons.map(l=>l.id));
 assert.ok(c.items.every(x=>x.status==='authored'));
 assert.deepEqual(data.lessons.slice(-4).map(x=>x.id),['cs50p-regex','cs50p-oop','cs50p-etcetera','cs50p-project']);
 assert.match(data.course.pending,/个人选题|学习者/);assert.match(data.course.pending,/认证/);
});

test('Regex distinguishes whole-input validation, normalization, leading zero, and an absent result',()=>{
 assert.equal(result('regex',{text:'AB-0cm'}).value,0);
 assert.equal(result('regex',{text:'AB-1234cm'}).value,null);
 assert.equal(result('regex',{text:'prefix AB-12cm suffix'}).matched,false);
 assert.equal(result('regex',{text:'prefix AB-12cm suffix',mode:'search'}).value,12);
 assert.equal(result('regex',{text:'AB-12cm\n',clean:'no'}).matched,false);
 assert.equal(result('regex',{text:' ab-012cm ',ignoreCase:'no'}).matched,false);
 assert.equal(result('regex',{text:' ab-012cm '}).value,12);
});

test('Object aliases change one identity while copies and rejected writes preserve other objects',()=>{
 assert.deepEqual(result('oop'),{a:20,b:12,target:20,targetId:'a',status:'ok',corrected:[22,14],total:36});
 assert.equal(result('oop',{reference:'copy'}).a,8);assert.equal(result('oop',{reference:'copy'}).target,20);
 for(const reference of ['alias','copy']){
  const r=result('oop',{reference,update:-5});assert.equal(r.status,'ValueError');assert.equal(r.a,8);assert.equal(r.target,8);assert.equal(r.b,12);
 }
 const trace=M.run('cs50p-oop');
 assert.equal(trace.steps[1].variables.objects.a,8);
 assert.equal(trace.steps[4].variables.objects.a,20);
});

test('Lazy consumption stops exactly at the requested prefix and does not claim unvisited results',()=>{
 const empty=result('etcetera',{take:0});assert.equal(empty.visited,0);assert.deepEqual(empty.produced,[]);
 const first=result('etcetera',{take:1});assert.equal(first.visited,1);assert.deepEqual(first.selected,[{index:0,value:12}]);
 const second=result('etcetera',{take:2});assert.equal(second.visited,2);assert.equal(second.total,30);
 const eager=result('etcetera',{take:2,strategy:'eager'});assert.equal(eager.visited,4);assert.equal(eager.total,30);
 assert.equal(result('etcetera',{minimum:30}).visited,4);assert.equal(result('etcetera',{minimum:30}).total,0);
 const trace=M.run('cs50p-etcetera',{take:1});
 assert.ok(trace.steps.every(s=>!Object.hasOwn(s.variables,'visited')||s.variables.visited<=1));
});

test('Project errors stay attributable; strict failure cannot become a partial successful report',()=>{
 const skip=result('project');assert.deepEqual(skip.summary,{count:3,total:44,mean:44/3});assert.deepEqual(skip.errors,[2]);
 const strict=result('project',{policy:'strict'});assert.equal(strict.status,'aborted');assert.equal(strict.summary,null);assert.equal(strict.report,null);assert.equal(strict.records.length,1);
 for(const dataset of ['empty','invalid'])assert.equal(result('project',{dataset}).summary.mean,null);
 assert.equal(result('project',{dataset:'valid',minimum:10}).summary.total,32);
 assert.equal(result('project',{dataset:'valid',minimum:25}).summary.count,0);
});

test('Independent Python library execution matches 218 bounded input combinations',()=>{
 const path=require('node:path'),dir=path.resolve(__dirname,'../examples/foundation-cs50p');
 const cases=[];
 for(const text of M.specs['cs50p-regex'][0].options.map(x=>x[0]))for(const clean of ['yes','no'])for(const ignoreCase of ['yes','no'])for(const mode of ['full','search'])cases.push({id:'regex',params:{text,clean,ignoreCase,mode}});
 for(const initial of [0,8,20])for(const update of [-5,-1,0,20,25])for(const offset of [-2,0,2])for(const reference of ['alias','copy'])cases.push({id:'oop',params:{initial,update,offset,reference}});
 for(const minimum of [0,10,15,30])for(const take of [0,1,2,3,4])for(const strategy of ['lazy','eager'])cases.push({id:'etcetera',params:{minimum,take,strategy}});
 for(const dataset of ['mixed','valid','invalid','empty'])for(const policy of ['skip','strict'])for(const minimum of [0,10,15,25])cases.push({id:'project',params:{dataset,policy,minimum}});
 const script=`import json,sys\nsys.path.insert(0,sys.argv[1])\nimport regex_demo,oop_demo,iteration_demo,project\nfixtures={'mixed':['AB-12cm','bad','CD-20cm','AB-12cm'],'valid':['AB-12cm','CD-20cm','EF-4cm'],'invalid':['bad','AB-xcm'],'empty':[]}\nout=[]\nfor case in json.load(sys.stdin):\n p=case['params']; ident=case['id']\n if ident=='regex': r=regex_demo.parse_record(p['text'],clean=p['clean']=='yes',ignore_case=p['ignoreCase']=='yes',mode=p['mode'])\n elif ident=='oop': r=oop_demo.simulate(**p)\n elif ident=='etcetera': r=iteration_demo.summarize(**p)\n else: r=project.build_report(fixtures[p['dataset']],policy=p['policy'],minimum=p['minimum'])\n out.append(r)\nprint(json.dumps(out))`;
 const proc=spawnSync('python3',['-c',script,dir],{input:JSON.stringify(cases),encoding:'utf8',timeout:20000,maxBuffer:3e6});assert.equal(proc.status,0,proc.stderr);
 const py=JSON.parse(proc.stdout);assert.equal(cases.length,218);assert.equal(py.length,cases.length);
 cases.forEach((c,i)=>{const actual=result(c.id,c.params);if(c.id==='etcetera'){for(const key of ['visited','selected','total'])assert.deepEqual(actual[key],py[i][key],JSON.stringify(c)+' '+key)}else if(c.id==='project'){for(const key of ['status','records','summary','errors','report'])assert.deepEqual(actual[key],py[i][key],JSON.stringify(c)+' '+key)}else assert.deepEqual(actual,py[i],JSON.stringify(c))});
});

test('New diagrams expose only current snapshots and remain valid, safe SVG for all controls',()=>{
 const scenes=require('../web/foundation-coding-scenes.js');require('../web/foundation-cs50p-extra-scenes.js')(scenes);
 const all=[];
 for(const l of data.lessons.slice(-4)){
  const variants=[{}];for(const control of M.specs[l.id])for(const value of control.type==='range'?[control.min,control.max]:control.options.map(x=>x[0]))variants.push({[control.id]:value});
  for(const params of variants){const trace=M.run(l.id,params),before=JSON.stringify(trace),frames=[];
   trace.steps.forEach((_,i)=>{const svg=scenes.render(trace,i);assert.ok(svg.startsWith('<svg '));assert.ok(svg.includes('viewBox="0 0 800 280"'));assert.ok(svg.includes('role="img"'));assert.ok(svg.includes('<title '));assert.ok(svg.includes('data-fid-scene="'+l.id+'"'));assert.ok(svg.includes('data-fid-stage="'+i+'"'));assert.doesNotMatch(svg,/NaN|Infinity|undefined|<script|<foreignObject|<animate|<set\b|onload=|href=/i);frames.push(svg);all.push(svg)});
   assert.equal(new Set(frames).size,frames.length);assert.equal(JSON.stringify(trace),before);
  }
 }
 const proc=spawnSync('python3',['-c','import json,sys,xml.etree.ElementTree as E\na=json.load(sys.stdin)\nfor svg in a: assert E.fromstring(svg).tag=="{http://www.w3.org/2000/svg}svg"\nprint(len(a))'],{input:JSON.stringify(all),encoding:'utf8',timeout:10000,maxBuffer:8e6});assert.equal(proc.status,0,proc.stderr);assert.equal(Number(proc.stdout),all.length);assert.ok(all.length>300);
});

test('New Python CLI examples and compatible project tests really execute success and failure paths',()=>{
 const path=require('node:path'),dir=path.resolve(__dirname,'../examples/foundation-cs50p');
 let p=spawnSync('python3',[path.join(dir,'test_project.py')],{encoding:'utf8',timeout:10000});assert.equal(p.status,0,p.stderr);assert.match(p.stderr,/Ran 4 tests/);
 p=spawnSync('python3',[path.join(dir,'iteration_demo.py'),'--take','9'],{encoding:'utf8'});assert.equal(p.status,2);assert.match(p.stderr,/invalid choice/);
 p=spawnSync('python3',[path.join(dir,'project.py'),'--policy','strict'],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).report,null);
 p=spawnSync('python3',[path.join(dir,'project.py'),path.join(dir,'definitely-not-an-input-file.txt')],{encoding:'utf8'});assert.equal(p.status,2);assert.match(p.stderr,/No such file|not found/);
});


test('Extra scene lookup rejects prototype keys and keeps raw text visible after normalization',()=>{
 const apply=require('../web/foundation-cs50p-extra-scenes.js');
 for(const model of ['__proto__','constructor','toString','unknown'])assert.equal(apply.render({model,steps:[{variables:{},title:'unknown'}],params:{}}),'');
 const a=M.run('cs50p-regex',{text:'AB-12cm'}),b=M.run('cs50p-regex',{text:'AB-12cm\n'});
 assert.equal(a.result.value,b.result.value);
 const clean=apply.render(a,a.steps.length-1),newline=apply.render(b,b.steps.length-1);
 assert.notEqual(clean,newline);assert.ok(newline.includes('\\n'));assert.match(clean,/strip/);assert.match(clean,/大小写/);
 const regular=M.run('cs50p-etcetera'),zero=M.run('cs50p-etcetera',{minimum:0});assert.notEqual(apply.render(regular,0),apply.render(zero,0));assert.ok(apply.render(zero,0).includes('≥ 0 cm'));
});
