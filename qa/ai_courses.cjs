/* Isolated browser contexts only; never open or edit an existing study store. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const data=require('../config/ai_courses.json');
const base=process.env.AI_COURSE_BASE||'http://127.0.0.1:8912';
const output=process.env.AI_COURSE_QA_OUTPUT||path.resolve(__dirname,'../../../output/ai-courseware-20261108/qa');
fs.mkdirSync(output,{recursive:true});
async function chooseDemo(page,id){
 const settings=page.locator('.aic-parameter-panel');
 if(!await settings.evaluate(el=>el.open))await settings.locator('summary').click();
 await page.locator('#aic-demo-picker').selectOption(id);
 if(!await settings.evaluate(el=>el.open))await settings.locator('summary').click();
}
(async()=>{
 const browser=await chromium.launch({headless:true});const errors=[],failures=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.status()+' '+r.url())});
  await page.goto(base+'/ai-courses.html#attention');await page.locator('#aic-tab-read').waitFor();
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const lesson of data.lessons){
    await page.goto(base+'/ai-courses.html#'+lesson.id);
    await page.getByRole('heading',{name:lesson.title,exact:true}).waitFor();
    for(const tab of ['read','watch','practice','sources']){
     await page.locator('#aic-tab-'+tab).click();
     assert.equal(await page.locator('#aic-panel-'+tab).isVisible(),true);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}px ${lesson.id} ${tab} overflow`);
    }
    await page.locator('#aic-tab-watch').click();
    if(width===1440 && lesson.demos?.length){
     for(const demo of lesson.demos){
      await chooseDemo(page,demo.modelId);
      let n=0;while(await page.locator('#aic-next').isEnabled()&&n++<100)await page.locator('#aic-next').click();
      assert.equal(await page.locator('.aic-code-active').count(),1,`${lesson.id} ${demo.modelId}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${lesson.id} ${demo.modelId} final overflow`);
     }
     await page.locator('#aic-recompute').click();
    }
    assert.equal(await page.locator('.aic-code-active').count(),1);
    const initial=await page.locator('#aic-count').innerText();await page.locator('#aic-next').click();assert.notEqual(await page.locator('#aic-count').innerText(),initial);
    await page.locator('#aic-prev').click();assert.equal(await page.locator('#aic-count').innerText(),initial);
    await page.locator('#aic-tab-practice').click();
    await page.locator('#aic-answer').fill(String(lesson.exercise.expected));await page.locator('#aic-check').click();
    assert.equal(await page.locator('#aic-feedback').getAttribute('data-correct'),'true');
    await page.locator('#aic-answer').fill('');await page.locator('#aic-check').click();
    assert.equal(await page.locator('#aic-feedback').getAttribute('data-correct'),'false');
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/ai-courses.html#compute');await page.locator('.aic-skip').focus();await page.locator('.aic-skip').click();await page.getByRole('heading',{name:data.lessons.find(l=>l.id==='compute').title,exact:true}).waitFor();
  await page.goto(base+'/ai-courses.html#sampling');await page.locator('#aic-tab-watch').click();await chooseDemo(page,'sampling');
  await page.locator('#aic-param-temperature').fill('0.5');
  await page.locator('#aic-tab-practice').click();await page.locator('#aic-prediction').fill('QA: 先预测分布变化');
  await page.reload();await page.locator('#aic-tab-watch').click();assert.equal(await page.locator('#aic-param-temperature').inputValue(),'0.5');
  await page.locator('#aic-play').click();await page.waitForTimeout(1650);await page.locator('#aic-play').click();
  assert.ok((await page.locator('#aic-count').innerText()).startsWith('2 /'));
  const paused=await page.locator('#aic-count').innerText();await page.waitForTimeout(1550);assert.equal(await page.locator('#aic-count').innerText(),paused);
  await page.locator('#aic-play').click();await page.locator('#aic-tab-read').click();assert.equal(await page.locator('#aic-play').getAttribute('aria-pressed'),'false');
  await page.locator('#aic-tab-practice').click();assert.equal(await page.locator('#aic-prediction').inputValue(),'QA: 先预测分布变化');
  await page.locator('#aic-answer').fill('0.5');const downloadPromise=page.waitForEvent('download');await page.locator('#aic-export').click();const download=await downloadPromise;await download.saveAs(path.join(output,download.suggestedFilename()));
  assert.ok(fs.readFileSync(path.join(output,download.suggestedFilename()),'utf8').includes('QA: 先预测分布变化'));
  for(const [id,filename] of [['attention','cme295-attention.png'],['compute','cs336-resources.png'],['agent','cs146s-agent-loop.png']]){
   await page.goto(base+'/ai-courses.html#'+id);await page.locator('#aic-tab-watch').click();
   let count=0;while(await page.locator('#aic-next').isEnabled()&&count++<60)await page.locator('#aic-next').click();
   await page.screenshot({path:path.join(output,filename),fullPage:true});
  }
  // Main-site entry is part of the AI route, rather than a new global learning route.
  await page.goto(base+'/?route=agent#learn');await page.getByRole('link',{name:'打开互动课件 →',exact:true}).waitFor();
  await page.getByRole('link',{name:'打开互动课件 →',exact:true}).click();await page.locator('#aic-tab-read').waitFor();
  const offline=await browser.newContext({offline:true,viewport:{width:390,height:844}}),offlinePage=await offline.newPage();
  offlinePage.on('pageerror',e=>errors.push('offline: '+e.message));
  const packagePath=path.resolve(output,'../interactive-courseware.html');
  await offlinePage.goto('file://'+packagePath+'#tools');await offlinePage.locator('#aic-tab-watch').click();await chooseDemo(offlinePage,'tools');
  await offlinePage.locator('#aic-param-mode').selectOption('write');
  let steps=0;while(await offlinePage.locator('#aic-next').isEnabled()&&steps++<20)await offlinePage.locator('#aic-next').click();
  assert.ok((await offlinePage.locator('#aic-variables').innerText()).includes('replayed'));
  await offlinePage.screenshot({path:path.join(output,'mobile-offline-tools.png'),fullPage:true});
  assert.equal(await offlinePage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const result={lectures:data.lessons.length,modelCount:new Set(data.lessons.flatMap(l=>(l.demos||[{modelId:l.modelId||l.id}]).map(d=>d.modelId))).size,widths:[1440,390,320],panelsPerSample:4,numericChecks:true,playPause:true,draftRestore:true,exportReadBack:true,aiRouteEntry:true,offlinePackage:true,errors,failedRequests:failures};
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
