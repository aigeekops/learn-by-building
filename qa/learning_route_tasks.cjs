const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const build=path.resolve(process.env.ROUTE_TASKS_BUILD||path.join(__dirname,'../dist/learning'));
const output=path.resolve(process.env.ROUTE_TASKS_QA_OUTPUT||path.join(build,'route-tasks-qa'));
const courseIds=['cs50p','tools','linear','probability','cs229','d2l','cme295','cs336','fsdl'];
const labels={cs50p:'CS50P',tools:'Missing Semester',linear:'MIT 18.06',probability:'MIT 18.05',cs229:'CS229',d2l:'动手学深度学习',cme295:'CME 295',cs336:'CS336',fsdl:'Full Stack Deep Learning'};
fs.mkdirSync(output,{recursive:true});
const rowIds=group=>group.locator('.workspace-task [data-action="workspace-task-edit"]').evaluateAll(rows=>rows.map(row=>Number(row.dataset.value)));
const capture=(page,key)=>page.evaluate(async key=>({records:(await LBBLearningEngine.backup()).tables,registry:localStorage.getItem(key),focus:JSON.parse(localStorage.getItem(key+':focus-v2'))}),key);

(async()=>{
 const server=http.createServer((req,res)=>{
  let file;
  try{file=path.resolve(build,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 const results=[];
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  for(const source of [origin+'/index.html','file://'+build+'/standalone.html'])for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   const kind=source.startsWith('file:')?'offline':'http';
   page.on('pageerror',error=>errors.push(error.message));
   await page.route(/^https?:/,route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const qa='route-tasks-'+width+'-'+Date.now();
   await page.goto(source+'?integration-qa='+qa+'#learn/today');
   await page.waitForFunction(()=>!!globalThis.LBBLearningEngine);
   const seed=await page.evaluate(async ({qa,courseIds})=>{
    const start=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const base={goal:'agent',courseIds,startCourseId:'cs50p',currentCourseId:'cs50p',minutes:30,days:180,start,device:'browser',status:'active'};
    const sequential={...base,id:crypto.randomUUID(),name:'180天研发路线',progression:'sequential'};
    const current={...base,id:crypto.randomUUID(),name:'旧的只排当前课路线',progression:'current'};
    const middle={...base,id:crypto.randomUUID(),name:'从线代开始的路线',startCourseId:'linear',currentCourseId:'linear',progression:'sequential'};
    const profiles=[sequential,current,middle];
    for(const profile of profiles)profile.taskIds=(await LBBLearningEngine.adopt(profile)).taskIds;
    const snapshot=await LBBLearningEngine.snapshot();
    const describe=profile=>{
     const rows=snapshot.tasks.filter(task=>profile.taskIds.includes(task.id));
     const grouped=Object.fromEntries(courseIds.map(id=>[id,rows.filter(task=>task.note.includes('[课程id '+id+']')).sort((a,b)=>a.due.localeCompare(b.due)).map(task=>({id:task.id,due:task.due}))]));
     return {...profile,grouped};
    };
    const key='lbb-personal-routes-v1:qa:'+qa;
    const focus={key:crypto.randomUUID(),taskId:sequential.taskIds[0],routeId:sequential.id,seconds:17,running:false,started:0};
    localStorage.setItem(key,JSON.stringify({version:1,activeId:sequential.id,items:profiles}));
    localStorage.setItem(key+':focus-v2',JSON.stringify(focus));
    return {key,sequential:describe(sequential),current:describe(current),middle:describe(middle),focus};
   },{qa,courseIds});
   assert.equal(seed.sequential.taskIds.length,180,'the fixture must reproduce a real 180-day, 30-minute sequential schedule');
   assert(seed.sequential.grouped.cs50p.length>40,'first course must exceed the former 40-task truncation');
   await page.reload();
   const ready=()=>page.waitForFunction(()=>document.querySelector('.workspace-status')?.textContent==='');
   await ready();
   const showAll=async()=>{
    await page.locator('[data-action="workspace-task-scope"][data-value="all"]').click();
    await page.locator('details.workspace-task-group').first().waitFor();
   };
   const group=id=>page.locator('details.workspace-task-group[data-course="'+id+'"]');
   const waitGroupRows=(id,count)=>page.waitForFunction(({id,count})=>{
    const element=document.querySelector('details.workspace-task-group[data-course="'+id+'"]');
    return element?.open&&element.querySelectorAll('.workspace-task').length===count&&
      (count>0||!!element.querySelector('.workspace-task-group-body')?.textContent.trim());
   },{id,count});
   const openGroup=async(id,count)=>{
    if(!await group(id).evaluate(element=>element.open))await group(id).locator(':scope > summary').click();
    await waitGroupRows(id,count);
   };
   const closeGroup=async id=>{
    if(await group(id).evaluate(element=>element.open))await group(id).locator(':scope > summary').click();
    await page.waitForFunction(id=>{
     const element=document.querySelector('details.workspace-task-group[data-course="'+id+'"]');
     return !!element&&!element.open;
    },id);
   };
   const assertOverview=async(profile,{unarranged=[]}={})=>{
    assert.deepEqual(await page.locator('details.workspace-task-group').evaluateAll(rows=>rows.map(row=>row.dataset.course)),courseIds,'all selected courses must remain represented, including those without scheduled tasks');
    assert.equal(await page.locator('details.workspace-task-group[open]').count(),0,'a long current course must not hide the rest of the route on entry');
    assert.equal(await page.locator('details.workspace-task-group .workspace-task').count(),0,'collapsed groups must not eagerly render hundreds of task cards');
    for(const id of courseIds){
     const summary=group(id).locator(':scope > summary'),text=await summary.innerText();
     assert.equal(await summary.isVisible(),true,id+' course summary must be available');
     // Match public catalog labels where stable; these three demonstrate the
     // beginning, second course and end of the real route without relying on titles.
     if(['cs50p','tools','cs336'].includes(id))assert(text.includes(labels[id]),id+' label must identify the course');
     assert(text.includes(String(profile.grouped[id].length)),id+' summary must show its actual task count');
    }
    for(const id of unarranged){
     assert.equal(profile.grouped[id].length,0,id+' fixture must have no adopted tasks');
     assert.match(await group(id).locator(':scope > summary').innerText(),/尚未安排|未排入|未安排|起点之前/,id+' must explicitly explain why it has no scheduled tasks');
    }
    assert.match(await page.locator('#lbb-task-scope-description').innerText(),new RegExp(String(profile.taskIds.length)),'route total must describe all adopted tasks');
   };
   const sequentialBefore=await capture(page,seed.key);
   await showAll();
   await assertOverview(seed.sequential);
   assert.match(await group('cs50p').locator(':scope > summary').innerText(),new RegExp(seed.sequential.grouped.cs50p[0].due),'scheduled courses retain their date range');
   assert.match(await group('cs50p').locator(':scope > summary').innerText(),new RegExp(seed.sequential.grouped.cs50p.at(-1).due));
   await page.screenshot({path:path.join(output,'overview-'+kind+'-'+width+'.png'),fullPage:true});
   await group('fsdl').locator(':scope > summary').scrollIntoViewIfNeeded();
   assert.equal(await group('fsdl').locator(':scope > summary').isVisible(),true,'the final selected course remains reachable while the first group is collapsed');

   const first=group('cs50p'),expected=seed.sequential.grouped.cs50p.map(task=>task.id);
   await openGroup('cs50p',20);
   assert.deepEqual(await rowIds(first),expected.slice(0,20),'opening a group renders only its first 20 real tasks');
   const more=()=>first.locator('[data-action="workspace-task-more"][data-value="cs50p"]');
   await more().click();
   await waitGroupRows('cs50p',40);
   assert.deepEqual(await rowIds(first),expected.slice(0,40));
   await more().click();
   await waitGroupRows('cs50p',Math.min(60,expected.length));
   assert.deepEqual(await rowIds(first),expected.slice(0,60),'the 41st task must be reachable rather than permanently truncated');
   assert((await rowIds(first)).includes(expected[40]));
   while((await rowIds(first)).length<expected.length){
    const before=(await rowIds(first)).length;
    await more().click();
    await waitGroupRows('cs50p',Math.min(before+20,expected.length));
    const after=await rowIds(first);
    assert.equal(after.length,Math.min(before+20,expected.length),'load more advances one finite page');
   }
   assert.deepEqual(await rowIds(first),expected,'all first-course tasks including the last must be reachable');
   assert.equal(await more().count(),0,'no useless load-more button remains after the last task');
   await closeGroup('cs50p');
   assert.deepEqual(await capture(page,seed.key),sequentialBefore,'expanding and paging through the route cannot write plans, evidence, progress, receipts, focus or active course');
   await openGroup('tools',Math.min(20,seed.sequential.grouped.tools.length));
   assert.deepEqual((await rowIds(group('tools'))).slice(0,20),seed.sequential.grouped.tools.slice(0,20).map(task=>task.id),'a later course exposes its own tasks');
   await closeGroup('tools');

   // The same old sequential route must also expose every task through the
   // ungrouped current-course filter, which has a separate 40-item page size.
   const courseBefore=await capture(page,seed.key);
   assert(expected.length>80,'the real first-course fixture must span at least three 40-item pages');
   await page.locator('[data-action="workspace-task-scope"][data-value="course"]').click();
   const courseList=page.locator('#lbb-main .workspace-task-list');
   const waitCourseRows=count=>page.waitForFunction(count=>
    document.querySelector('[data-action="workspace-task-scope"][data-value="course"]')?.getAttribute('aria-pressed')==='true'&&
    document.querySelectorAll('#lbb-main .workspace-task-list .workspace-task').length===count,count);
   await waitCourseRows(40);
   assert.equal(await page.locator('details.workspace-task-group').count(),0,'course mode uses the flat task list');
   assert.equal(await page.locator('#lbb-current-learning-course').inputValue(),'cs50p','changing task scope cannot switch the active course');
   assert.deepEqual(await rowIds(courseList),expected.slice(0,40),'the current-course filter begins with 40 saved tasks');
   const moreCourse=()=>page.locator('[data-action="workspace-task-list-more"]');
   await moreCourse().click();
   await waitCourseRows(80);
   assert.deepEqual(await rowIds(courseList),expected.slice(0,80),'the second current-course page exposes tasks 41 through 80');
   while((await rowIds(courseList)).length<expected.length){
    const before=(await rowIds(courseList)).length,next=Math.min(before+40,expected.length);
    await moreCourse().click();
    await waitCourseRows(next);
    assert.deepEqual(await rowIds(courseList),expected.slice(0,next),'current-course pagination preserves all real tasks in order');
   }
   assert.deepEqual(await rowIds(courseList),expected,'the last current-course task remains accessible');
   assert.equal(await moreCourse().count(),0,'current-course pagination ends once all tasks are shown');
   assert.deepEqual(await capture(page,seed.key),courseBefore,'current-course pagination cannot write records, registry, progress or focus');
   await page.screenshot({path:path.join(output,'course-pages-'+kind+'-'+width+'.png'),fullPage:true});
   await showAll();await assertOverview(seed.sequential);
   assert.deepEqual(await capture(page,seed.key),courseBefore,'returning to the route overview is also read-only');

   const chooseRoute=async profile=>{
    await page.locator('#lbb-current-learning-route').selectOption(profile.id);
    await ready();
    await page.waitForFunction(id=>document.querySelector('#lbb-current-learning-route')?.value===id,profile.id);
    await showAll();
   };
   await chooseRoute(seed.current);
   const currentBefore=await capture(page,seed.key);
   await assertOverview(seed.current,{unarranged:courseIds.slice(1)});
   await openGroup('tools',0);
   assert.equal(await group('tools').locator('.workspace-task').count(),0,'a current-only legacy route must not acquire fabricated tasks for later courses');
   await closeGroup('tools');
   assert.deepEqual(await capture(page,seed.key),currentBefore);
   await page.screenshot({path:path.join(output,'current-only-'+kind+'-'+width+'.png'),fullPage:true});

   await chooseRoute(seed.middle);
   const middleBefore=await capture(page,seed.key);
   await assertOverview(seed.middle,{unarranged:['cs50p','tools']});
   assert(seed.middle.grouped.linear.length>0,'the selected middle starting course must actually have tasks');
   assert.deepEqual(await capture(page,seed.key),middleBefore,'viewing an intermediate starting point cannot rewrite excluded prior courses');

   // Simulate one old route-wide review without course metadata using only the
   // isolated engine's validated backup API. Real user records are never opened.
   await chooseRoute(seed.sequential);
   const fallback=await page.evaluate(async profile=>{
    const engine=LBBLearningEngine;
    const created=await engine.createTask({profile,courseId:'cs50p',requestId:crypto.randomUUID(),title:'路线通用复盘（无课程标记）',due:profile.start,minutes:15,note:'隔离测试的历史复盘任务。'});
    const backup=await engine.backup();
    const task=backup.tables.tasks.find(task=>task.id===created.id);
    task.note=task.note.replace(/^\[课程id [a-z0-9-]+\]\n?/m,'');
    const preview=await engine.backupPreview({backup});
    await engine.backupRestore({backup,...preview,confirmation:'replace-learning-records'});
    return created.id;
   },seed.sequential);
   await page.reload();await ready();await showAll();
   assert.equal(await page.locator('details.workspace-task-group').count(),10,'unclassified route-wide tasks get a separate fallback group');
   const fallbackBefore=await capture(page,seed.key);
   await openGroup('__route__',1);
   assert.deepEqual(await rowIds(group('__route__')),[fallback]);
   assert.match(await group('__route__').innerText(),/路线通用复盘/);
   assert.match(await page.locator('#lbb-task-scope-description').innerText(),/181/,'fallback tasks must be counted rather than discarded');
   assert.deepEqual(await capture(page,seed.key),fallbackBefore,'reading a legacy fallback task cannot modify its restored records');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,'the route overview must fit narrow and wide viewports');
   await page.screenshot({path:path.join(output,'fallback-'+kind+'-'+width+'.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   results.push({source:kind,width,days:180,dailyMinutes:30,sequentialTasks:seed.sequential.taskIds.length,firstCourseTasks:expected.length,allNineCoursesVisible:true,task41AndLastReachable:true,lazyPagesOf20:true,currentCoursePages40ToLast:true,currentOnlyZeroGroups:true,middleStartZeroGroups:true,fallbackTaskVisible:true,displayWritesNothing:true,errors});
   await context.close();
  }
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
 }catch(error){
  const page=browser?.contexts().at(-1)?.pages().at(-1);
  if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
  throw error;
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
