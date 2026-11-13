// Isolated end-to-end checks. Never attach a saved browser profile.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const build=path.resolve(process.env.PRACTICUM_BUILD||'dist'),out=path.resolve(process.env.PRACTICUM_QA_OUTPUT||'/tmp/lbb-robot-practicums-qa');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{
  let relative=decodeURIComponent(new URL(req.url,'http://local').pathname);if(relative==='/')relative='/index.html';
  const file=path.resolve(build,'.'+relative);if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=(process.env.PRACTICUM_REMOTE_URL||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');
 const browser=await chromium.launch({headless:true}),results=[];
 try{
  for(const offline of process.env.PRACTICUM_REMOTE_URL?[false]:[false,true])for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.route(/^https?:/,r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
   const qa='practicums-'+Date.now()+'-'+width+'-'+offline,base=(offline?'file://'+build+'/standalone.html':origin+'/index.html')+'?integration-qa='+qa;
   const click=async selector=>{await p.locator(selector).first().click();};
   const view=async id=>p.waitForSelector('.rp-workbench[data-practicum="'+id+'"]');
   const backup=()=>p.evaluate(()=>LBBLearningEngine.backup());
   await p.goto(base+'#learn/course/modern');
   await click('[data-action="rp-open"][data-value="robot-coordinates"]');await view('robot-coordinates');
   assert.equal(new URL(p.url()).hash,'#learn/projects/robot-coordinates');
   const blank=await backup();assert.equal(await p.locator('textarea:visible').count(),2);assert.equal(await p.locator('#rp-tools').getAttribute('open'),null);
   await p.locator('#rp-prediction').fill('private prediction: child chain follows local axis');
   await p.reload();await view('robot-coordinates');assert.match(await p.locator('#rp-prediction').inputValue(),/private prediction/);
   assert(!p.url().includes('private'));assert.deepEqual((await backup()).tables,blank.tables,'drafting and navigation cannot save learning records');
   await click('[data-rp-action="record"]');assert.match(await p.locator('#rp-status').innerText(),/草稿已保存/);assert.deepEqual((await backup()).tables,blank.tables);
   // A site root plus subpath must survive link generation. The learning-site URL is not a lab.
   await click('[data-rp-action="show-base"]');
   await p.locator('#rp-radar-base').fill('https://aigeekops.github.io/learn-by-building/');await click('[data-rp-action="set-base"]');assert.match(await p.locator('#rp-status').innerText(),/学习站/);
   await p.locator('#rp-radar-base').fill('https://example.org/robot-radar/');await click('[data-rp-action="set-base"]');
   const href=new URL(await p.locator('[data-rp-radar]').getAttribute('href'));assert.equal(href.pathname,'/robot-radar/');assert.equal(href.searchParams.get('mode'),'joints');
   await p.goBack();await p.waitForSelector('[data-rf-topic="kinematics"]');await p.goForward();await view('robot-coordinates');
   // Adopt test-only courses; keep an unrelated course current to expose wrong attribution.
   const profile=await p.evaluate(async qa=>{
    const profile={id:crypto.randomUUID(),name:'Practicum isolated QA',goal:'robotics',courseIds:['modern','mit2007','lerobot','cs50p'],startCourseId:'cs50p',currentCourseId:'cs50p',minutes:30,days:7,start:'2026-11-13',progression:'current',device:'browser',status:'active'};
    const adopted=await LBBLearningEngine.adopt(profile);profile.taskIds=adopted.taskIds;
    localStorage.setItem('lbb-personal-routes-v1:qa:'+qa,JSON.stringify({version:1,activeId:profile.id,items:[profile]}));return profile;
   },qa);
   await p.reload();await view('robot-coordinates');
   const before=await backup();
   await p.locator('#rp-tools>summary').click();
   for(const [id,text] of Object.entries({q0:'0',q1:'0.08',prediction:'局部轴改变后，子链跟随；世界方向还受父链姿态影响。',finding:'左肘由 0 到 0.08 rad，手腕跟随，因为位于该关节下游。',explanation:'关节轴定义在局部，父子变换传递到世界；比较了固定参考系。',transfer:'右肘独立预测并复做，记录实际角度与子链方向。',limitations:'源模型运动学计算，不包含力、接触与硬件。',evidenceRef:'QA fixture original.json，实际教学需保留自己的日志与截图。'}))await p.locator('#rp-'+id).fill(text);
   const json=await p.evaluate(()=>({schemaVersion:1,robotId:'g1',sourceCommit:RobotPracticumData.robots[0].sourceCommit,program:JSON.stringify({frames:[{time:0,joints:{left_elbow_joint:0}},{time:1,joints:{left_elbow_joint:.08}}]}),trace:[{time:0,values:{left_elbow_joint:0}},{time:1,values:{left_elbow_joint:.08}}]}));
   await p.locator('#rp-import').setInputFiles({name:'original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(json))});
   await p.waitForFunction(()=>document.querySelector('#rp-import-status')?.textContent.includes('2 个运行采样'));
   await p.locator('#rp-tools>summary').click();
   const downloaded=p.waitForEvent('download');await click('[data-rp-action="download"]');const download=await downloaded;
   const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(report.rawImport.trace.length,2);assert.equal(report.inputs.jointId,'left_elbow_joint');assert.equal(report.evidenceType,'calculation');
   assert.deepEqual((await backup()).tables,before.tables,'checking and exporting cannot certify completion');
   await click('[data-rp-action="record"]');await p.waitForFunction(()=>document.querySelector('#rp-status')?.textContent.includes('已保存到学习记录'));
   await click('[data-rp-action="record"]');await p.waitForFunction(()=>document.querySelector('#rp-status')?.textContent.includes('已保存到学习记录'));
   const saved=await backup();assert.equal(saved.tables.learning_entries.filter(e=>e.title==='坐标与关节＋实验记录').length,1);assert.deepEqual(saved.tables.sessions,before.tables.sessions);assert.deepEqual(saved.tables.tasks,before.tables.tasks);
   assert.equal(saved.tables.learning_entries.find(e=>e.title==='坐标与关节＋实验记录').evidence_type,'calculation');
   await p.screenshot({path:path.join(out,`coordinates-${offline?'file':'http'}-${width}.png`)});
   // A task belongs to modern even though cs50p is the current learning course.
   await click('[data-rp-action="task"]');await p.locator('#lbb-workspace-dialog [type="submit"]').click();await p.waitForSelector('[data-action="workspace-task-edit"]');
   const tasked=await backup(),task=tasked.tables.tasks.find(t=>t.title==='坐标与关节＋实验记录');assert(task.note.includes('[课程id modern]'));assert.equal(task.evidence,'');assert.equal(task.state,'todo');
   await p.goto(base+'#learn/projects/so101-bom-audit');await view('so101-bom-audit');
   const bomStart=await backup();assert.equal(await p.locator('textarea:visible').count(),2);assert(!await p.locator('.rp-bom').isVisible());
   await p.locator('#rp-prediction').fill('紧固件总数可能仍有缺口');await p.locator('#rp-finding').fill('当前参考资料未核定总数，因此这次只是局部观察。');
   await click('[data-rp-action="record"]');await p.waitForFunction(()=>document.querySelector('#rp-status')?.textContent.includes('已保存到学习记录'));
   const partial=await backup();assert.match(partial.tables.learning_entries.find(e=>e.title==='SO-101 装配资料＋BOM 审核').body,/0\/18 行/);
   await p.locator('#rp-tools>summary').click();
   const rows=await p.evaluate(()=>RobotPracticumData.so101.rows);
   for(const r of rows){
    await p.locator(`[data-rp-row="${r.id}"][data-rp-cell="status"]`).selectOption(r.quantity===null?'unknown':'match');
    if(r.quantity!==null)await p.locator(`[data-rp-row="${r.id}"][data-rp-cell="quantity"]`).fill(String(r.quantity));
    else await p.locator(`[data-rp-row="${r.id}"][data-rp-cell="note"]`).fill('固定文档没有 follower 完整总数；保留未知，采购前需逐步核对。');
   }
   for(const [id,text] of Object.entries({prediction:'包/件单位与紧固件总数可能造成缺项。',finding:'逐项核对了固定版本，紧固件仍保留未知；阅读顺序不等于唯一物理工序。',explanation:'单 follower / Waveshare；采购包单位保留。SO-ARM100 Apache-2.0 根许可需按文件核对；打印两份语境分别保留。',transfer:'换 leader 应重新核对电机减速比、手柄与触发器、数量和装配文字；换板卡应重核支架与连接资料。',limitations:'紧固件总数未知。没有打印、采购、供电、校准或硬件验收。',evidenceRef:'固定版本 README / 3DPRINT / LeRobot so101 装配章节；此为隔离测试内容。'}))await p.locator('#rp-'+id).fill(text);
   assert.deepEqual((await backup()).tables,partial.tables);
   await click('[data-rp-action="record"]');await p.waitForFunction(()=>document.querySelector('#rp-status')?.textContent.includes('已保存到学习记录'));
   const final=await backup(),bom=final.tables.learning_entries.find(e=>e.title==='SO-101 装配资料＋BOM 审核');assert(bom.body.includes('fasteners')||bom.body.includes('Screws / horns'));assert(bom.body.includes('未知'));assert.equal(bom.evidence_type,'reading');assert.deepEqual(final.tables.sessions,bomStart.tables.sessions);assert.deepEqual(final.tables.tasks,bomStart.tables.tasks);
   await p.reload();await view('so101-bom-audit');assert.equal(await p.locator('[data-rp-row="fasteners"][data-rp-cell="status"]').inputValue(),'unknown');
   const size=await p.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert(size.scroll<=size.client+1,JSON.stringify(size));
   await p.screenshot({path:path.join(out,`bom-${offline?'file':'http'}-${width}.png`)});
   assert.deepEqual(errors,[]);results.push({mode:offline?'offline':'http',width,entries:2,rawImportRetained:true,duplicateSubmission:'same journal entry',taskCourse:'modern',completionAndMinutesUnchanged:true,errors});
   await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
