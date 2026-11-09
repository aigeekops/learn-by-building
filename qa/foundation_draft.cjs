const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=require('../config/foundation_courses.json');
const draft=process.env.FOUNDATION_DRAFT_FILE||path.resolve(root,'../../output/learning-unified-20261108/index.html');
const output=path.join(path.dirname(draft),'foundation-qa');fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true}),errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
    async function openCourse(id){
      await page.goto('file://'+draft+'?foundation='+id);await page.locator('.aid-course-grid').waitFor();
      assert.equal(await page.locator('.aid-course-unit').count(),data.lessons.filter(l=>l.course===id).length);
    }
    const courseLayoutChecks=[];
    // The course directory must be useful before any scrolling or lesson opens.
    for(const viewport of [{width:1440,height:900},{width:390,height:844}])for(const course of data.courses){
      await page.setViewportSize(viewport);await openCourse(course.id);
      const overview=page.locator('.aid-course-overview');await overview.waitFor();
      assert.equal(await overview.locator('.button.primary').count(),1,course.id+' has one primary course action');
      assert.equal(await overview.locator('.hero-sketch,.fid-course-switcher').count(),0,course.id+' has no decorative hero or cross-course switcher');
      assert.equal(await page.locator('#lbb-context-nav [data-action="aid-open"]').count(),0,course.id+' directory is not duplicated in the sidebar');
      const layout=await page.evaluate(()=>{
        const main=document.getElementById('lbb-main'),m=main.getBoundingClientRect();
        const cards=[...document.querySelectorAll('.aid-course-overview .aid-course-unit')].map(el=>el.getBoundingClientRect());
        const first=cards[0],row=cards.filter(r=>Math.abs(r.top-first.top)<2);
        return {mainTop:m.top,mainBottom:m.bottom,mainHeight:main.clientHeight,firstTop:first.top,firstBottom:first.bottom,firstRowBottom:Math.max(...row.map(r=>r.bottom)),firstRowCards:row.length,scrollTop:main.scrollTop};
      });
      const label=`${viewport.width}×${viewport.height} ${course.id}: ${JSON.stringify(layout)}`;
      assert.ok(layout.firstTop>=layout.mainTop-1,label+' first card starts inside main');
      if(viewport.width===1440){
        assert.ok(layout.firstTop-layout.mainTop<=300,label+' first lecture begins within 300px');
        assert.ok(layout.firstRowBottom<=layout.mainBottom+1,label+' first row is fully visible');
      }else{
        assert.ok(layout.firstBottom<=layout.mainBottom+1,label+' first card is fully visible without scrolling');
      }
      courseLayoutChecks.push({course:course.id,...viewport,...layout});
      const lessons=data.lessons.filter(l=>l.course===course.id);
      await overview.locator('.button.primary').click();await page.locator(`[data-aid-lesson="${lessons[0].id}"]`).waitFor();
      const lessonNav=page.locator('#lbb-context-nav [data-action="aid-open"]');
      assert.equal(await lessonNav.count(),lessons.length,course.id+' lesson navigation appears in a lesson');
      if(viewport.width===1440){
        await lessonNav.last().click();await page.locator(`[data-aid-lesson="${lessons.at(-1).id}"]`).waitFor();
      }
      assert.ok(await page.locator('.fid-motion-entrance [data-action="fid-motion"]').count()>0,course.id+' retains lesson playback');
    }
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      for(const course of data.courses){
        await openCourse(course.id);
        for(const l of data.lessons.filter(x=>x.course===course.id)){
          await page.locator(`#lbb-main [data-action="aid-open"][data-value="${l.id}"]`).first().click();
          await page.locator(`[data-aid-lesson="${l.id}"]`).waitFor();
          assert.ok(await page.locator('.fid-local-code').count()>0,l.id+' local code');
          for(const tab of ['explain','lab','exercise','sources']){
            await page.locator('#aid-tab-'+tab).click();assert.equal(await page.locator('#aid-panel-'+tab).isVisible(),true);
            const overflow=await page.evaluate(()=>{const m=document.getElementById('lbb-main');return document.documentElement.scrollWidth>innerWidth+1||m.scrollWidth>m.clientWidth+2;});
            assert.equal(overflow,false,`${width} ${l.id} ${tab} overflow`);
          }
          await page.locator('#aid-tab-lab').click();assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
          assert.equal(await page.locator('#fid-motion-scene svg').count(),1,l.id+' graphical scene');
          const visibleStage=await page.evaluate(()=>{const m=document.getElementById('lbb-main').getBoundingClientRect(),s=document.getElementById('fid-motion-stage').getBoundingClientRect(),p=document.querySelector('.aid-player').getBoundingClientRect();return s.top>=m.top-2&&s.bottom<=m.bottom+2&&p.top>=m.top-2&&p.bottom<=m.bottom+2;});
          assert.equal(visibleStage,true,`${width} ${l.id} playback and scene in viewport`);
          const initial=await page.locator('#aid-count').innerText();
          await page.locator('[data-action="aid-next"]').click();assert.notEqual(await page.locator('#aid-count').innerText(),initial);
          await page.locator('[data-action="aid-prev"]').click();assert.equal(await page.locator('#aid-count').innerText(),initial);
          const param=page.locator('[data-aid-param]').first();
          if(await param.count()){
            await page.locator('.fid-motion-settings').evaluate(el=>el.open=true);
            const before=await param.inputValue(),tag=await param.evaluate(el=>el.tagName);
            if(tag==='SELECT')await param.selectOption({index:before===await param.locator('option').first().getAttribute('value')?1:0});
            else await param.fill(await param.getAttribute('max')===before?await param.getAttribute('min'):await param.getAttribute('max'));
            if(tag!=='SELECT')await param.dispatchEvent('input');
            assert.notEqual(await param.inputValue(),before,l.id+' parameter change');
            assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
          }
          await page.locator('#aid-tab-exercise').click();await page.locator('#aid-answer').fill(String(l.exercise.expected));await page.locator('[data-action="aid-check"]').click();
          assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'true');
          await page.locator('#aid-reason').fill('QA '+l.id+' 独立验证');
          await page.locator('#lbb-main [data-action="course"]').first().click();
        }
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    // A long explanation must not leave the animation scrolled out of sight.
    await openCourse('cs50p');
    await page.locator('#lbb-main [data-action="aid-open"]').first().click();
    await page.locator('#lbb-main').evaluate(el=>el.scrollTop=el.scrollHeight);
    await page.locator('#aid-panel-explain [data-action="aid-tab"][data-value="lab"]').click();
    assert.ok(await page.locator('#fid-motion-stage').isVisible());
    assert.ok(await page.locator('.aid-player').evaluate(el=>{const r=el.getBoundingClientRect(),m=document.getElementById('lbb-main').getBoundingClientRect();return r.top>=m.top&&r.bottom<=m.bottom;}));
    // Foundations follow the same map-node → course link flow as other courses.
    for(const width of [1440,390])for(const mode of ['overview','courses'])for(const c of data.courses){
      await page.setViewportSize({width,height:1000});await page.goto('file://'+draft);
      await page.locator('#lbb-course-prototype .nav-item[data-action="map"]').first().click();
      assert.equal(await page.locator('.fid-map-motion').count(),0);
      if(mode==='courses')await page.locator('[data-action="atlas-mode"][data-value="courses"]').click();
      const node=mode==='overview'&&c.id==='d2l'?'a2':'plan-'+c.id;
      await page.locator(`[data-action="node"][data-value="${node}"]:visible`).first().click();
      const entrance=page.locator(`#lbb-node-detail [data-action="course"][data-value="${c.id}"]`);
      const lessons=data.lessons.filter(l=>l.course===c.id),row=page.locator('#lbb-node-detail .course-row').filter({has:page.locator(`[data-action="course"][data-value="${c.id}"]`)});
      assert.equal(await entrance.count(),1,`${width} ${mode} ${c.id}: local entrance`);
      assert.equal((await entrance.innerText()).trim(),'进入本站课件 →');
      const cardText=await row.innerText();
      assert.match(cardText,new RegExp(lessons.length+'\\s*(?:讲|节)'),`${width} ${mode} ${c.id}: actual lesson count`);
      assert.doesNotMatch(cardText,/本站后续课程规划/);
      await entrance.click();await page.locator('.aid-course-grid').waitFor();
      assert.equal(await page.locator('.aid-course-unit').count(),lessons.length);
      await page.locator(`#lbb-main [data-action="aid-open"][data-value="${lessons[0].id}"]`).first().click();
      await page.locator(`[data-aid-lesson="${lessons[0].id}"]`).waitFor();
    }
    await page.setViewportSize({width:1440,height:1000});await openCourse('cs50p');
    await page.locator('#lbb-main [data-action="aid-open"]').first().click();
    await page.locator('.fid-motion-entrance [data-action="fid-motion"]').first().click();
    assert.equal(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed'),'true');
    const beforeFrame=await page.locator('#fid-motion-scene').getAttribute('data-frame');await page.waitForTimeout(1650);
    assert.notEqual(await page.locator('#fid-motion-scene').getAttribute('data-frame'),beforeFrame);
    await page.locator('[data-action="aid-play"]').click();
    for(const c of data.courses){
      await openCourse(c.id);const l=data.lessons.find(l=>l.course===c.id);
      await page.locator(`#lbb-main [data-action="aid-open"][data-value="${l.id}"]`).first().click();
      await page.locator('#aid-tab-exercise').click();assert.equal(await page.locator('#aid-reason').inputValue(),'QA '+l.id+' 独立验证');
      await page.locator('#aid-tab-lab').click();await page.locator('[data-action="aid-play"]').click();await page.waitForTimeout(1650);await page.locator('[data-action="aid-play"]').click();
      const stopped=await page.locator('#aid-count').innerText();await page.waitForTimeout(1550);assert.equal(await page.locator('#aid-count').innerText(),stopped);
      for(let i=0;i<2&&await page.locator('[data-action="aid-next"]').isEnabled();i++)await page.locator('[data-action="aid-next"]').click();
      await page.screenshot({path:path.join(output,c.id+'-desktop.png'),fullPage:true});
      await page.setViewportSize({width:390,height:1000});await page.screenshot({path:path.join(output,c.id+'-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
    }
    // Earlier foundation companions, AI lessons and saved drafts remain reachable.
    await openCourse('cs50p');await page.locator('.fid-legacy').evaluate(el=>el.open=true);await page.locator('[data-action="fid-legacy"]').first().click();await page.locator('.teaching-player').waitFor();
    await page.locator('#lbb-main [data-action="course"]').first().click();await page.locator('.aid-course-grid').waitFor();
    const first=data.lessons[0];await page.locator(`[data-action="aid-open"][data-value="${first.id}"]`).first().click();await page.locator('#aid-tab-exercise').click();
    const downloaded=page.waitForEvent('download');await page.locator('[data-action="aid-export"]').click();const dl=await downloaded;await dl.saveAs(path.join(output,dl.suggestedFilename()));assert.ok(fs.readFileSync(path.join(output,dl.suggestedFilename()),'utf8').includes('QA '+first.id));
    await page.goto('file://'+draft);await page.locator('#lbb-main').waitFor();await page.locator('[data-action="node"][data-value="a3"]:visible').first().click();await page.locator('[data-action="course"][data-value="cme295"]:visible').first().click();await page.locator('.aid-course-grid').waitFor();
    await page.locator('#lbb-main [data-action="aid-open"]').first().click();await page.locator('#aid-tab-lab').click();assert.ok(await page.locator('[data-aid-line].is-active').count());
    assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.evaluate(async()=>(await LBBLearningEngine.routeIndex()).length),0);assert.deepEqual(errors,[]);
    const result={courses:3,lessons:data.lessons.length,widths:[1440,390],compactCourseOverview:true,singlePrimaryCourseAction:true,directoryVisibleInFirstViewport:true,courseSidebarDoesNotDuplicateDirectory:true,courseLayoutChecks,everyLessonFourPanels:true,graphicalScenes:21,mapNodeCourseLinks:3,overviewAndFullMapLinks:true,localCoursePrimaryLinks:true,mapAnimationBanner:false,animationViewportRecovery:true,stepControls:true,parameterChanges:true,playPause:true,draftRecovery:true,export:true,legacyCompanions:true,existingAI:true,automaticRoutesCreated:0,errors};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
