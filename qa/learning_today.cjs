const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const build=path.resolve(process.env.TODAY_BUILD||path.join(__dirname,'../dist/learning'));
const output=path.resolve(process.env.TODAY_QA_OUTPUT||path.join(build,'today-qa'));
fs.mkdirSync(output,{recursive:true});
const taskIds=page=>page.locator('.workspace-task [data-action="workspace-task-edit"]').evaluateAll(rows=>rows.map(row=>Number(row.dataset.value)).sort((a,b)=>a-b));
const sort=ids=>ids.slice().sort((a,b)=>a-b);
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(build,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const results=[];
 try{for(const source of [origin+'/index.html','file://'+build+'/standalone.html'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const qa='today-'+width+'-'+Date.now(),url=source+'?integration-qa='+qa+'#learn/today';
  await page.goto(url);await page.waitForFunction(()=>!!globalThis.LBBLearningEngine);
  const seed=await page.evaluate(async qa=>{
   const engine=LBBLearningEngine,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const shift=n=>{const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);};
   const profile={id:crypto.randomUUID(),name:'切课回归路线',goal:'agent',courseIds:['cs50p','tools','cme295'],startCourseId:'cs50p',currentCourseId:'cs50p',minutes:30,days:1,start:shift(5),progression:'current',device:'browser',status:'active'};
   const adopted=await engine.adopt(profile);profile.taskIds=adopted.taskIds;
   const foreign={...profile,id:crypto.randomUUID(),name:'另一条路线',courseIds:['cs50p']};
   foreign.taskIds=(await engine.adopt(foreign)).taskIds;
   const ids={};
   for(const [name,course,day,owner] of [['currentPast','cs50p',-1,profile],['currentToday','cs50p',0,profile],['otherPast','tools',-1,profile],['otherToday','tools',0,profile],['currentFuture','cs50p',5,profile],['otherFuture','tools',5,profile],['completed','cs50p',-1,profile],['foreignToday','cs50p',0,foreign]]){
    ids[name]=(await engine.createTask({profile:owner,courseId:course,requestId:crypto.randomUUID(),title:'回归任务 '+name,due:shift(day),minutes:20,note:'隔离测试；不读写个人数据。'})).id;
   }
   await engine.finish({routeId:profile.id,task_id:ids.completed,session_key:crypto.randomUUID(),minutes:0,timer_seconds:0,complete:true,evidence:'隔离测试成果',note:'已保存的历史记录'});
   const key='lbb-personal-routes-v1:qa:'+qa;
   const focus={key:crypto.randomUUID(),taskId:ids.currentToday,routeId:profile.id,seconds:17,running:false,started:0};
   localStorage.setItem(key,JSON.stringify({version:1,activeId:profile.id,items:[profile,foreign]}));
   localStorage.setItem(key+':focus-v2',JSON.stringify(focus));
   return {key,profile,foreign,ids,focus,adoptedIds:adopted.taskIds};
  },qa);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.workspace-task-list')&&document.querySelector('.workspace-status')?.textContent==='');
  const baseline=await page.evaluate(key=>({registry:localStorage.getItem(key),focus:JSON.parse(localStorage.getItem(key+':focus-v2'))}),seed.key);
  const before=await page.evaluate(()=>LBBLearningEngine.backup());
  assert.deepEqual(await taskIds(page),sort([seed.ids.currentPast,seed.ids.currentToday,seed.ids.otherPast,seed.ids.otherToday]),'today must include due tasks across the route and exclude future, completed and foreign-route tasks');
  const scope=async value=>{await page.locator('[data-action="workspace-task-scope"][data-value="'+value+'"]').click();};
  await scope('course');
  assert.deepEqual(await taskIds(page),sort([...seed.adoptedIds,seed.ids.currentPast,seed.ids.currentToday,seed.ids.currentFuture,seed.ids.completed]));
  assert.equal(await page.locator('#lbb-current-learning-course').inputValue(),'cs50p');
  await scope('all');
  await page.locator('.workspace-task-group').evaluateAll(groups=>groups.forEach(group=>{group.open=true;}));
  await page.waitForFunction(()=>[...document.querySelectorAll('.workspace-task-group[open]')].every(group=>group.querySelector('.workspace-task-group-body')?.innerHTML));
  assert.deepEqual(await taskIds(page),sort([...seed.adoptedIds,...Object.entries(seed.ids).filter(([key])=>key!=='foreignToday').map(([,id])=>id)]));
  assert.deepEqual((await page.evaluate(()=>LBBLearningEngine.backup())).tables,before.tables,'task filters cannot mutate plans, evidence, receipts or time');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),seed.key),baseline.registry,'task filters cannot switch courses');
  await page.locator('#lbb-current-learning-course').focus();
  await page.locator('#lbb-current-learning-course').selectOption('tools');
  await page.waitForFunction(()=>document.querySelector('[data-action="workspace-task-scope"][data-value="course"]')?.getAttribute('aria-pressed')==='true'&&!document.querySelector('#lbb-current-learning-course')?.disabled);
  assert.deepEqual(await taskIds(page),sort([seed.ids.otherPast,seed.ids.otherToday,seed.ids.otherFuture]));
  assert.match(await page.locator('#lbb-task-scope-description').innerText(),/Missing Semester/);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'lbb-current-learning-course','keyboard focus stays on the course selector');
  await page.screenshot({path:path.join(output,'switched-'+(source.startsWith('file:')?'offline':'http')+'-'+width+'.png'),fullPage:true});
  assert.equal((await page.evaluate(()=>LBBLearningEngine.routeIndex())).find(p=>p.id===seed.profile.id).currentCourseId,'tools');
  const switched=await page.evaluate(()=>LBBLearningEngine.backup());
  const withoutCheckpoint=tables=>({...tables,tasks:tables.tasks.map(task=>({...task,note:task.note.replace(/^\[个人路线配置 .*\]$/m,'[路线配置]')}))});
  assert.deepEqual(withoutCheckpoint(switched.tables),withoutCheckpoint(before.tables),'switching a course changes only its checkpoint, never historical tasks or records');
  const focusAfter=await page.evaluate(key=>JSON.parse(localStorage.getItem(key+':focus-v2')),seed.key);
  assert.equal(focusAfter.key,seed.focus.key);assert.equal(focusAfter.taskId,seed.ids.currentToday);assert.equal(focusAfter.seconds,17);
  await page.locator('[data-action="workspace-open-current"]').click();
  await page.waitForFunction(()=>location.hash==='#learn/course/tools');
  await page.locator('.nav-item[data-action="workspace"]').click();
  await page.waitForFunction(()=>document.querySelector('#lbb-current-learning-course')?.value==='tools');
  // A failed checkpoint must leave the selector and both stored profiles unchanged.
  await page.evaluate(()=>{window.originalTodayCheckpoint=LBBLearningEngine.checkpoint;LBBLearningEngine.checkpoint=async()=>{throw Error('模拟切课保存失败');};});
  await page.locator('#lbb-current-learning-course').selectOption('cme295');
  await page.waitForFunction(()=>document.querySelector('#lbb-workspace-toast')?.textContent.includes('模拟切课保存失败'));
  assert.equal(await page.locator('#lbb-current-learning-course').inputValue(),'tools');
  assert.deepEqual(await taskIds(page),sort([seed.ids.otherPast,seed.ids.otherToday,seed.ids.otherFuture]));
  await page.evaluate(()=>{LBBLearningEngine.checkpoint=window.originalTodayCheckpoint;});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#lbb-current-learning-course')?.value==='tools');
  await page.locator('#lbb-current-learning-course').selectOption('cme295');
  await page.waitForFunction(()=>document.querySelector('#lbb-task-scope-description')?.textContent.includes('CME 295'));
  assert.equal(await page.locator('.workspace-task').count(),0);assert.match(await page.locator('.workspace-task-list').innerText(),/尚未安排/);
  // The existing route-page action uses the same explicit switch behavior.
  await page.locator('.nav-item[data-action="route-view"]').click();
  await page.locator('[data-action="workspace-course-current"][data-value="tools"]').click();
  await page.waitForFunction(()=>document.querySelector('#lbb-current-learning-course')?.value==='tools');
  assert.equal(await page.locator('[data-action="workspace-task-scope"][data-value="course"]').getAttribute('aria-pressed'),'true');
  // With all due work finished, tomorrow's schedule must stay out of today's list.
  await page.evaluate(async seed=>{for(const name of ['currentPast','currentToday','otherPast','otherToday'])await LBBLearningEngine.finish({routeId:seed.profile.id,task_id:seed.ids[name],session_key:crypto.randomUUID(),minutes:0,timer_seconds:0,complete:true,evidence:'测试中完成到期任务',note:''});},seed);
  await page.reload();await page.waitForFunction(()=>document.querySelector('.workspace-task-list')&&document.querySelector('.workspace-status')?.textContent==='');
  assert.equal(await page.locator('.workspace-task').count(),0);assert.match(await page.locator('.workspace-task-list').innerText(),/今天没有待办/);
  await scope('course');assert.equal((await taskIds(page)).includes(seed.ids.otherFuture),true);
  // Changing the route changes the available courses without touching the old timer.
  await page.locator('#lbb-current-learning-route').selectOption(seed.foreign.id);
  await page.waitForFunction(()=>document.querySelector('#lbb-current-learning-course')?.value==='cs50p');
  assert.deepEqual(await taskIds(page),[seed.ids.foreignToday]);
  assert.deepEqual(await page.locator('#lbb-current-learning-course option').evaluateAll(rows=>rows.map(x=>x.value)),['cs50p']);
  await page.locator('#lbb-current-learning-route').selectOption(seed.profile.id);
  await page.waitForFunction(()=>document.querySelector('#lbb-current-learning-course')?.value==='tools');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'course controls must fit the mobile viewport');
  await page.screenshot({path:path.join(output,(source.startsWith('file:')?'offline':'http')+'-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);results.push({source:source.startsWith('file:')?'offline':'http',width,dates:true,filtersReadOnly:true,courseSwitch:true,failedSave:true,routeIsolation:true,timerPreserved:true,errors});
  await context.close();
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }catch(error){const page=browser.contexts().at(-1)?.pages().at(-1);if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
