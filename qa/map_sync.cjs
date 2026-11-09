const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const draft=process.env.MAP_DRAFT_FILE||path.resolve(__dirname,'../../../output/learning-unified-20261108/index.html');
const output=path.join(path.dirname(draft),'map-qa');fs.mkdirSync(output,{recursive:true});
const foundations=require('../config/foundation_courses.json');
const counts=Object.fromEntries(foundations.courses.map(c=>[c.id,foundations.lessons.filter(l=>l.course===c.id).length]));
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
    await page.goto('file://'+draft);await page.locator('#atlas-expand-control').waitFor();
    
    async function map(mode){
      await page.locator('#lbb-course-prototype .nav-item[data-action="map"]').first().click();
      const toggle=page.locator('#atlas-expand-control');
      if((await toggle.getAttribute('aria-expanded')==='true')!==(mode==='courses'))await toggle.click();
      await page.locator('.cms-foundation-group').waitFor();
      const close=page.locator('#lbb-node-detail .detail-close');if(await close.isVisible())await close.click();
    }
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      for(const mode of ['overview','courses']){
        await map(mode);
        assert.equal(await page.locator('[data-map-foundation]').count(),3);
        for(const [id,count] of Object.entries(counts)){
          assert.ok((await page.locator(`[data-map-foundation="${id}"]`).innerText()).includes(count+'讲'));
          const node=mode==='overview'&&id==='d2l'?'a2':'plan-'+id;
          const point=page.locator(`.learning-atlas [data-action="node"][data-value="${node}"]`).first();
          assert.equal(await point.getAttribute('data-lesson-count'),String(count));
          assert.match(await point.innerText(),new RegExp(count+'\\s*(?:讲|课)'));
          await point.click();
          const row=page.locator(`#lbb-node-detail .course-row[data-cms-course="${id}"]`);
          assert.match(await row.locator('.atlas-detail-status').innerText(),new RegExp(count+'\\s*(?:讲|课)'));
          assert.equal(await row.locator('[data-action="course"]').count(),1);
          assert.equal(await row.locator('[data-action="fid-motion"]').count(),1);
          await row.locator('[data-action="course"]').click();await page.locator('.aid-course-grid').waitFor();
          assert.equal(await page.locator('.aid-course-unit').count(),count);
          await map(mode);await point.click();
          await page.locator(`#lbb-node-detail .course-row[data-cms-course="${id}"] [data-action="fid-motion"]`).click();
          await page.locator('#fid-motion-scene svg,#fid-motion-scene .fid-execution').first().waitFor();
          assert.equal(await page.locator('[data-aid-lesson]').getAttribute('data-aid-lesson'),foundations.lessons.find(l=>l.course===id).id);
          // Stop the deliberately opened playback before continuing the navigation audit.
          if(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed')==='true')await page.locator('[data-action="aid-play"]').click();await map(mode);
        }
        const overflow=await page.evaluate(()=>{const m=document.getElementById('lbb-main');return document.documentElement.scrollWidth>innerWidth+1||m.scrollWidth>m.clientWidth+2;});
        assert.equal(overflow,false,`${width} ${mode} horizontal overflow`);
        const originalPoints=await page.locator('.learning-atlas [data-map-key]').count();assert.ok(originalPoints>10);
        await page.screenshot({path:path.join(output,`${mode}-${width}.png`),fullPage:true});
      }
    }
    await map('courses');const pending=page.locator('[data-map-key="cs224r"]');
    assert.equal(await pending.getAttribute('data-lesson-count'),'0');assert.equal(await pending.getAttribute('data-content-status'),'planned');
    await page.locator('#lbb-map-search').fill('CS50P');assert.equal(await page.locator('.origin-topics [data-value="plan-cs50p"]').evaluate(el=>el.classList.contains('is-dimmed')),false);
    await page.locator('#lbb-map-search').fill('');assert.match(await page.locator('#lbb-map-results').innerText(),/其余保留候选或选读状态/);
    
    // Entering an animation may persist empty local exercise drafts; no saved route or study record is created.
    assert.equal(await page.evaluate(async()=>(await LBBLearningEngine.routeIndex()).length),0);
    assert.deepEqual(errors,[]);
    const result={widths:[1440,390],mapModes:['overview','courses'],foundationCounts:counts,nodeToCourse:true,nodeToAnimation:true,pendingCoursesRetained:true,search:true,originalMapPointsRetained:true,horizontalOverflow:false,automaticRoutesCreated:0,errors};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }catch(error){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
