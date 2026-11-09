const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const build=path.resolve(process.env.ROUTE_SELECTION_BUILD||path.join(__dirname,'../dist/learning'));
const output=path.resolve(process.env.ROUTE_SELECTION_QA_OUTPUT||path.join(build,'route-selection-qa'));
fs.mkdirSync(output,{recursive:true});
const presets={
 model:{name:'大模型原理与研发',goal:'agent',ids:['cs50p','tools','linear','probability','cs229','d2l','cme295','cs336','fsdl']},
 agent:{name:'AI 应用与软件工程',goal:'agent',ids:['cs50p','tools','cme295','hfagents','cs146s','fsdl']},
 mobile:{name:'移动机器人与自主导航',goal:'robotics',ids:['cs50p','tools','linear','probability','arduino','mit2007','modern','pid','kalman','ros','bonn','nav2']},
 arm:{name:'机械臂与抓取操作',goal:'robotics',ids:['cs50p','tools','linear','probability','arduino','mit2007','modern','pid','kalman','ros','manipulation','moveit']}
};
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(build,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const results=[];
 try{for(const source of [origin+'/index.html','file://'+build+'/standalone.html'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await context.route(/^https?:/,route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const qa='route-selection-'+width+'-'+Date.now(),url=source+'?integration-qa='+qa+'#learn/today';
  await page.goto(url);await page.waitForFunction(()=>!!globalThis.LBBLearningEngine);
  const seed=await page.evaluate(async({qa,presets})=>{
   const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const base={minutes:30,days:1,start:day,progression:'current',device:'browser',status:'active'};
   const a={...base,id:crypto.randomUUID(),direction:'model',name:presets.model.name,goal:'agent',courseIds:presets.model.ids,startCourseId:'cs50p',currentCourseId:'cs50p'};
   const b={...base,id:crypto.randomUUID(),name:'保留的机器人路线',goal:'robotics',courseIds:presets.mobile.ids,startCourseId:'arduino',currentCourseId:'arduino'};
   const c={...base,id:crypto.randomUUID(),name:'我的组合课程',goal:'robotics',courseIds:['tools','arduino'],startCourseId:'tools',currentCourseId:'tools'};
   for(const p of [a,b,c])p.taskIds=(await LBBLearningEngine.adopt(p)).taskIds;
   const key='lbb-personal-routes-v1:qa:'+qa,focus={key:crypto.randomUUID(),taskId:a.taskIds[0],routeId:a.id,seconds:17,running:false,started:0};
   localStorage.setItem(key,JSON.stringify({version:1,activeId:a.id,items:[a,b,c]}));localStorage.setItem(key+':focus-v2',JSON.stringify(focus));
   return {a,b,c,key,focus};
  },{qa,presets});
  const active=()=>page.evaluate(key=>{const registry=JSON.parse(localStorage.getItem(key));return registry.items.find(p=>p.id===registry.activeId);},seed.key);
  const header=async profile=>{await page.waitForFunction(id=>document.querySelector('#lbb-current-learning-route')?.value===id,profile.id);assert.equal(await page.locator('#lbb-current-learning-route option:checked').innerText(),profile.name);};
  const openRoutes=()=>page.locator('.nav-item[data-action="route-view"]').click();
  const newRoute=async()=>{await openRoutes();await page.locator('[data-action="workspace-new-route"]').click();};
  const preview=async()=>{await page.locator('[type="submit"][form="lbb-personal-form"]').click();await page.locator('[data-action="personal-adopt"]').waitFor();};
  const adopt=async()=>{const previous=(await active()).id;await page.locator('[data-action="personal-adopt"]').click();await page.waitForFunction(({key,previous})=>JSON.parse(localStorage.getItem(key)).activeId!==previous,{key:seed.key,previous});const p=await active();await header(p);return p;};
  const queue=()=>page.locator('.personal-course-queue [data-action="personal-up"]').evaluateAll(rows=>rows.map(row=>row.dataset.value));
  await page.reload();await header(seed.a);const baseline=await page.evaluate(()=>LBBLearningEngine.backup());
  // Reproduce the reported stale-name path before testing ordinary preset changes:
  // changing the form after preview must not adopt the prior model-route snapshot.
  await newRoute();await page.locator('#lbb-personal-days').fill('1');await preview();
  await page.locator('#lbb-personal-name').fill('预览后选择的新名称');
  assert.equal(await page.locator('[data-action="personal-adopt"]').count(),0,'editing the route name must invalidate the old preview, rather than adopt its old model name');
  assert.match(await page.locator('#lbb-route-preview').innerText(),/重新预览/);
  await preview();assert.equal(await page.locator('.personal-preview h2').innerText(),'预览后选择的新名称');
  assert.equal((await adopt()).name,'预览后选择的新名称');
  await newRoute();assert.equal(await page.locator('#lbb-personal-name').inputValue(),'预览后选择的新名称','new planning preserves a user-authored name');
  // Every real preset must carry its own name, goal and course order into the
  // adopted profile and top selector. Choosing later presets never reverts model.
  for(const [direction,preset] of Object.entries(presets)){
   await newRoute();await page.locator('#lbb-personal-name').fill(presets.model.name);await page.locator('#lbb-personal-direction').selectOption(direction);
   assert.equal(await page.locator('#lbb-personal-direction').inputValue(),direction);
   assert.equal(await page.locator('#lbb-personal-name').inputValue(),preset.name);assert.deepEqual(await queue(),preset.ids);
   await page.locator('#lbb-personal-days').fill('1');await preview();
   assert.equal(await page.locator('.personal-preview h2').innerText(),preset.name);
   const adopted=await adopt();assert.equal(adopted.direction,direction);assert.equal(adopted.name,preset.name);assert.equal(adopted.goal,preset.goal);assert.deepEqual(adopted.courseIds,preset.ids);
   assert.deepEqual(await page.locator('#lbb-current-learning-course option').evaluateAll(rows=>rows.map(row=>row.value)),preset.ids);
  }
  // New planning follows the current arm direction, and editing legacy profiles
  // infers their direction without mutating those saved profiles or tasks.
  await newRoute();assert.equal(await page.locator('#lbb-personal-direction').inputValue(),'arm');
  await page.locator('[data-action="personal-start"][data-value="'+seed.b.id+'"]').click();await header(seed.b);
  await openRoutes();await page.locator('[data-action="workspace-edit-route"]').click();
  assert.equal(await page.locator('#lbb-personal-direction').inputValue(),'mobile');assert.equal(await page.locator('#lbb-personal-name').inputValue(),seed.b.name);assert.deepEqual(await queue(),seed.b.courseIds);
  assert.equal((await active()).direction,undefined,'inferred draft direction must not rewrite a saved legacy route');
  await page.locator('#lbb-personal-direction').selectOption('agent');assert.equal(await page.locator('#lbb-personal-name').inputValue(),seed.b.name,'preserve a custom route name while changing its direction');
  // A late preview response must not overwrite a newer direction selection.
  await page.locator('#lbb-personal-name').fill(presets.agent.name);await page.locator('#lbb-personal-days').fill('1');
  await page.evaluate(()=>{window.originalRoutePreview=LBBLearningEngine.preview;LBBLearningEngine.preview=async body=>{const result=await window.originalRoutePreview(body);await new Promise(resolve=>window.releaseRoutePreview=resolve);window.routePreviewReleased=true;return result;};});
  await page.locator('[type="submit"][form="lbb-personal-form"]').click();await page.waitForFunction(()=>!!window.releaseRoutePreview);
  await page.locator('#lbb-personal-direction').selectOption('model');
  await page.evaluate(()=>window.releaseRoutePreview());await page.waitForFunction(()=>window.routePreviewReleased);
  assert.equal(await page.locator('#lbb-personal-direction').inputValue(),'model');assert.equal(await page.locator('[data-action="personal-adopt"]').count(),0,'ignore stale preview callbacks after direction changes');
  await page.evaluate(()=>{LBBLearningEngine.preview=window.originalRoutePreview;});
  await preview();
  // The adoption guard also validates the current form if an input change did
  // not dispatch a browser input event (autofill or restored form state).
  await page.evaluate(()=>{document.querySelector('#lbb-personal-name').value='采用前已变化';});
  await page.locator('[data-action="personal-adopt"]').click();
  await page.waitForFunction(()=>document.querySelector('#lbb-personal-error')?.textContent.includes('重新预览'));
  assert.equal((await active()).id,seed.b.id);assert.equal(await page.locator('[data-action="personal-adopt"]').count(),0);
  await preview();assert.equal((await adopt()).name,'采用前已变化');
  // An ambiguous old custom profile remains custom; adding courses keeps the
  // edited queue and custom name instead of silently restoring the model preset.
  await page.locator('#lbb-current-learning-route').selectOption(seed.c.id);await header(seed.c);
  await openRoutes();await page.locator('[data-action="workspace-edit-route"]').click();
  assert.equal(await page.locator('#lbb-personal-direction').inputValue(),'custom');assert.deepEqual(await queue(),seed.c.courseIds);
  await page.locator('.personal-course-extra summary').click();await page.locator('[data-action="personal-add"][data-value="cme295"]').click();
  assert.equal(await page.locator('#lbb-personal-direction').inputValue(),'custom');assert.equal(await page.locator('#lbb-personal-name').inputValue(),seed.c.name);assert.deepEqual(await queue(),[...seed.c.courseIds,'cme295']);
  const final=await page.evaluate(()=>LBBLearningEngine.backup()),originalIds=new Set(baseline.tables.tasks.map(task=>task.id));
  assert.deepEqual(final.tables.tasks.filter(task=>originalIds.has(task.id)),baseline.tables.tasks,'planning changes must preserve all earlier tasks and evidence');
  for(const key of Object.keys(baseline.tables).filter(key=>key!=='tasks'))assert.deepEqual(final.tables[key],baseline.tables[key]);
  const focus=await page.evaluate(key=>JSON.parse(localStorage.getItem(key+':focus-v2')),seed.key);assert.equal(focus.key,seed.focus.key);assert.equal(focus.taskId,seed.focus.taskId);assert.equal(focus.seconds,17);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:path.join(output,(source.startsWith('file:')?'offline':'http')+'-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);results.push({source:source.startsWith('file:')?'offline':'http',width,presets:4,stalePreviewInvalidation:true,latePreviewIgnored:true,adoptionGuard:true,currentDirectionContext:true,legacyDirection:true,customQueuePreserved:true,recordsAndTimerPreserved:true,errors});await context.close();
 }
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
 }catch(error){const page=browser.contexts().at(-1)?.pages().at(-1);if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
