const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),draft=process.env.COURSE_MAP_FILE||path.resolve(root,'../../output/learning-unified-20261108/index.html');
const out=path.join(path.dirname(draft),'map-sync-qa');fs.mkdirSync(out,{recursive:true});
const expected={mit2007:['mechanics',3,'rf-gears'],modern:['kinematics',3,'rf-transform'],pid:['control',3,'rf-p-feedback'],kalman:['estimation',3,'rf-noisy-measurements'],ros:['ros',4,'rf-ros-pubsub']};
(async()=>{
 const browser=await chromium.launch({headless:true});const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
  for(const width of [1440,390]){
   console.log('Checking map synchronization at width '+width);await page.setViewportSize({width,height:1000});
   await page.goto('file://'+draft);await page.locator('[data-robotics-lesson-count="12"]').waitFor();
   assert.equal(await page.locator('[data-action="node"][data-value="c3"]').getAttribute('data-robotics-lesson-count'),'12');
   assert.equal(await page.locator('[data-action="node"][data-value="c4"]').getAttribute('data-robotics-lesson-count'),'4');
   assert.equal(await page.locator('iframe').count(),0);
   await page.screenshot({path:path.join(out,'overview-'+width+'.png'),fullPage:true});
   await page.locator('[data-action="atlas-mode"][data-value="courses"]').click();
   await page.locator('.cms-robot-group .cms-robot-title').waitFor();
   assert.match(await page.locator('.cms-robot-group .cms-robot-title').innerText(),/5 专题 16 课/);
   assert.equal(await page.locator('.cms-robot-group .cms-robot-chip:visible').count(),5);
   for(const [id,[topic,count]] of Object.entries(expected)){
    await page.locator(`.cms-robot-chip[data-value="${id}"]`).click();await page.locator(`.rf-course[data-rf-topic="${topic}"]`).waitFor();assert.equal(await page.locator('.rf-card').count(),count);
    await page.locator('#lbb-main [data-action="map"]').first().click();await page.locator('.cms-robot-group .cms-robot-title').waitFor();
   }
   for(const [id,[topic,count,first]] of Object.entries(expected)){
    const card=page.locator(`.atlas-course-node[data-map-key="${id}"]`);assert.equal(await card.getAttribute('data-content-status'),'authored');assert.equal(await card.getAttribute('data-lesson-count'),String(count));assert.match(await card.locator('.atlas-course-phase').innerText(),new RegExp(count+' 课已整理'));
    await card.click();await page.locator(`[data-cms-first="${id}"]`).click();await page.locator(`[data-rf-lesson="${first}"]`).waitFor();
    await page.locator('[data-rf-action="course"]').click();await page.locator('#lbb-main [data-action="map"]').first().click();
   }
   await page.locator('#lbb-map-search').fill('孔轴配合');assert.ok(!(await page.locator('.atlas-course-node[data-map-key="mit2007"]').getAttribute('class')).includes('is-dimmed'));await page.locator('#lbb-map-search').fill('');
   assert.equal(await page.locator('.atlas-course-node[data-map-key="nav2"]').getAttribute('data-content-status'),'planned');assert.match(await page.locator('.atlas-course-node[data-map-key="nav2"] .atlas-course-phase').innerText(),/待整理/);
   const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth+1,root:document.getElementById('lbb-course-prototype').scrollWidth>document.getElementById('lbb-course-prototype').clientWidth+2}));assert.equal(overflow.body,false);assert.equal(overflow.root,false);
   await page.screenshot({path:path.join(out,'full-map-'+width+'.png'),fullPage:true});
  }
  const catalog=await page.evaluate(()=>CourseMapStatus.snapshot()),authored=catalog.filter(x=>x.kind==='authored');assert.equal(authored.length,13);assert.equal(authored.reduce((n,x)=>n+x.count,0),87);
  const routes=await page.evaluate(async()=>LBBLearningEngine.routeIndex());assert.equal(routes.length,0);assert.deepEqual(errors,[]);
  const result={roboticsTopics:5,roboticsLessons:16,authoredCourses:authored.length,authoredLessons:87,widths:[1440,390],roboticsShortcuts:true,directFirstLessonLinks:true,searchNewLessonTopics:true,pendingBranchesRemainPending:true,automaticRoutesCreated:0,errors,catalog};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }catch(error){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0]){await pages[0].screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error(errors);}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
