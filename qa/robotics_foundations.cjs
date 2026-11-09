const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const standalone=process.env.ROBOTICS_FOUNDATIONS_FILE||path.resolve(root,'../../output/robotics-foundations-20261108/index.html');
const integrated=process.env.ROBOTICS_DRAFT_FILE||path.resolve(root,'../../output/learning-unified-20261108/index.html');
const output=path.join(path.dirname(standalone),'qa');fs.mkdirSync(output,{recursive:true});
const topics=['mechanics','kinematics','control','estimation','ros'].map(n=>JSON.parse(fs.readFileSync(path.join(root,'config','robotics_foundations_'+n+'.json'))));
const courseMap={mechanics:'mit2007',kinematics:'modern',control:'pid',estimation:'kalman',ros:'ros'};
(async()=>{
 const browser=await chromium.launch({headless:true});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,route=>route.abort());
  let checked=0;
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   console.log('Checking standalone lessons at width '+width);
   for(const topic of topics)for(const lesson of topic.lessons){
    await page.goto('file://'+standalone+'#'+lesson.id);await page.locator(`[data-rf-lesson="${lesson.id}"]`).waitFor();
    for(const tab of ['explain','lab','code','practice','verify']){
     await page.locator('#rf-tab-'+tab).click();assert.equal(await page.locator('#rf-panel-'+tab).isVisible(),true);
     const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth+1,main:document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth+2}));
     assert.equal(overflow.body,false,`${width} ${lesson.id} ${tab}: document overflow`);assert.equal(overflow.main,false,`${width} ${lesson.id} ${tab}: content overflow`);
    }
    await page.locator('#rf-tab-lab').click();assert.equal(await page.locator('.rf-visual svg').count(),1);
    const first=await page.locator('.rf-position').innerText();await page.locator('[data-rf-action="next"]').click();assert.notEqual(await page.locator('.rf-position').innerText(),first);await page.locator('[data-rf-action="previous"]').click();assert.equal(await page.locator('.rf-position').innerText(),first);
    await page.locator('#rf-tab-code').click();await page.locator('#rf-panel-code [data-rf-action="run"]').click();assert.match(await page.locator('.rf-execution-status').innerText(),/已在浏览器执行/);assert.ok((await page.locator('.rf-full-code').innerText()).includes('const simulate ='));
    await page.locator('#rf-tab-verify').click();await page.locator('[data-rf-field="answer"]').fill('');await page.locator('.rf-answer-form button').click();assert.equal(await page.locator('.rf-feedback').getAttribute('data-correct'),'false');
    await page.locator('[data-rf-field="answer"]').fill(String(lesson.verification.expected+100));await page.locator('.rf-answer-form button').click();assert.equal(await page.locator('.rf-feedback').getAttribute('data-correct'),'false');
    await page.locator('[data-rf-field="answer"]').fill(String(lesson.verification.expected));await page.locator('.rf-answer-form button').click();assert.equal(await page.locator('.rf-feedback').getAttribute('data-correct'),'true');
    await page.locator('[data-rf-field="reason"]').fill('QA 独立验证 '+lesson.id);checked++;
   }
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto('file://'+standalone+'#rf-gears');await page.locator('#rf-tab-verify').click();assert.equal(await page.locator('[data-rf-field="reason"]').inputValue(),'QA 独立验证 rf-gears');
  await page.locator('#rf-tab-lab').click();const control=page.locator('input[data-rf-param]').first();await control.evaluate(el=>{const details=el.closest('details');if(details)details.open=true;});await control.fill(await control.getAttribute('max'));await control.dispatchEvent('input');
  await page.locator('[data-rf-action="play"]').click();await page.waitForTimeout(1200);await page.locator('[data-rf-action="play"]').click();const paused=await page.locator('.rf-position').innerText();await page.waitForTimeout(1200);assert.equal(await page.locator('.rf-position').innerText(),paused);assert.notEqual(paused,'步骤 1 / 5');
  await page.locator('[data-rf-action="play"]').click();await page.locator('#rf-tab-code').click();assert.equal(await page.locator('[data-rf-action="play"]').getAttribute('aria-pressed'),'false');
  let pending=page.waitForEvent('download');await page.locator('[data-rf-action="source"]').click();let download=await pending;const downloaded=path.join(output,download.suggestedFilename());await download.saveAs(downloaded);let trace;vm.runInNewContext(fs.readFileSync(downloaded,'utf8'),{console:{log:s=>trace=JSON.parse(s)}});assert.ok(trace.frames.length>=4);
  await page.locator('#rf-tab-verify').click();pending=page.waitForEvent('download');await page.locator('[data-rf-action="export"]').click();download=await pending;const practice=path.join(output,download.suggestedFilename());await download.saveAs(practice);assert.match(fs.readFileSync(practice,'utf8'),/QA 独立验证 rf-gears/);
  // Verify that all new material uses the retained map shell and course IDs.
  for(const width of [1440,390])for(const topic of topics){
   console.log('Checking retained map topic '+topic.id+' at width '+width);await page.setViewportSize({width,height:1000});
   const course=courseMap[topic.id];await page.goto('file://'+integrated);await page.locator('#lbb-main').waitFor();
   await page.locator('[data-action="atlas-mode"][data-value="courses"]').click();await page.locator(`[data-action="node"][data-value="plan-${course}"]:visible`).first().click();await page.locator(`[data-action="course"][data-value="${course}"]:visible`).first().click();await page.locator('.rf-course-grid').waitFor();assert.equal(await page.locator('.rf-card').count(),topic.lessons.length);assert.equal(await page.locator('iframe').count(),0);
   await page.locator(`[data-rf-action="open"][data-rf-value="${topic.lessons[0].id}"]`).click();await page.locator(`[data-rf-lesson="${topic.lessons[0].id}"]`).waitFor();assert.equal(await page.locator('#lbb-context-nav button').count(),0);assert.equal(await page.locator('.app-sidebar nav .nav-item').count(),6);
   await page.locator('#rf-tab-lab').click();const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth+1,main:document.querySelector('#lbb-main').scrollWidth>document.querySelector('#lbb-main').clientWidth+2}));assert.equal(overflow.body,false);assert.equal(overflow.main,false);
   if(width===1440){const color=await page.locator('[data-rf-action="play"]').evaluate(el=>getComputedStyle(el).color);assert.equal(color,'rgb(255, 255, 255)');}
   await page.screenshot({path:path.join(output,topic.id+'-in-map'+(width===390?'-mobile':'')+'.png'),fullPage:true});
   if(width===1440){await page.locator('.rf-lesson-header [data-rf-action="course"]').click();const oldGroup=page.locator('.rf-originals');await oldGroup.locator('summary').click();await oldGroup.locator('[data-action="teaching-open"]').first().click();await page.locator('.teaching-player').waitFor();}
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const [course,node] of [['cme295','a3'],['cs336','a4'],['cs146s','b4'],['cs50p','plan-cs50p']]){
   await page.goto('file://'+integrated);await page.locator(`[data-action="node"][data-value="${node}"]:visible`).first().click();await page.locator(`[data-action="course"][data-value="${course}"]:visible`).first().click();await page.locator('#lbb-main [data-action="aid-open"]').first().click();await page.locator('[data-aid-lesson]').waitFor();
  }
  const routes=await page.evaluate(async()=>globalThis.LBBLearningEngine?(await LBBLearningEngine.routeIndex()).length:null);assert.equal(routes,0,'QA must not adopt personal routes');
  assert.deepEqual(errors,[]);
  const result={lessons:topics.reduce((n,t)=>n+t.lessons.length,0),topics:topics.length,widths:[1440,390],lessonVisits:checked,allFiveComponents:true,standaloneCodeDownload:true,independentCorrectAndIncorrectAnswers:true,playPause:true,nativeMapIntegration:true,originalUnitsRetained:true,nonRoboticsCoursesRetained:['cme295','cs336','cs146s','cs50p'],automaticRoutesCreated:0,errors};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }catch(error){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0]){await pages[0].screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});console.error((await pages[0].locator('body').innerText().catch(()=>'' )).slice(-1800));}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
