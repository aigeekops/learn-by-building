/* Verify the appended lessons in both the maintained site and offline delivery. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const build=process.env.FOUNDATION_COMPLETION_BUILD||path.join(root,'dist/learning');
const output=process.env.FOUNDATION_COMPLETION_QA||path.resolve(root,'../../output/foundation-completion-20261109/browser-qa');
const modules=['cs50p','missing'].map(name=>JSON.parse(fs.readFileSync(path.join(root,'config/foundation_'+name+'.json'),'utf8')));
const additions=new Set(['cs50p-regex','cs50p-oop','cs50p-etcetera','cs50p-project','missing-packaging','missing-agentic','missing-beyond']);
const widths=[1440,390],receipts=[];
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const file of ['index.html','standalone.html']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[],requests=[];
   page.setDefaultTimeout(15000);
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(/^https?:/,route=>{requests.push(route.request().url());return route.abort();});
   const base='file://'+path.join(build,file);
   for(const width of widths){
    await page.setViewportSize({width,height:1000});
    for(const mode of ['overview','courses'])for(const module of modules){
     const course=module.course;
     await page.goto(base);
     await page.locator('#lbb-course-prototype .nav-item[data-action="map"]').first().click();
     if(mode==='courses')await page.locator('[data-action="atlas-mode"][data-value="courses"]').click();
     await page.locator(`[data-action="node"][data-value="plan-${course.id}"]:visible`).first().click();
     const entrance=page.locator(`#lbb-node-detail [data-action="course"][data-value="${course.id}"]`);
     const card=page.locator('#lbb-node-detail .course-row').filter({has:page.locator(`[data-action="course"][data-value="${course.id}"]`)});
     assert.match(await card.innerText(),new RegExp(module.lessons.length+'\\s*(?:讲|节)'));
     await entrance.click();await page.locator(`[data-aid-course="${course.id}"]`).waitFor();
     assert.equal(await page.locator('.aid-course-unit').count(),module.lessons.length);
    }
    for(const module of modules){
     const course=module.course;
     await page.goto(base+'?foundation='+course.id);
     await page.locator(`[data-aid-course="${course.id}"]`).waitFor();
     assert.equal(await page.locator('.aid-course-unit').count(),module.lessons.length);
     assert.equal(await page.locator('.aid-course-overview .button.primary').count(),1);
     assert.equal(await page.locator('#lbb-context-nav [data-action="aid-open"]').count(),0);
     await page.locator('.aid-published>summary').click();
     assert.equal(await page.locator('.fid-coverage>li').count(),course.coverage.items.length);
     for(const id of additions){
      const lesson=module.lessons.find(l=>l.id===id);if(!lesson)continue;
      const target=page.locator(`.fid-coverage [data-action="aid-open"][data-value="${id}"]`).first();
      assert.ok(await target.isVisible(),id+' official-topic entrance');
      await target.click();await page.locator(`[data-aid-lesson="${id}"]`).waitFor();
      for(const tab of ['explain','lab','exercise','sources']){
       await page.locator('#aid-tab-'+tab).click();
       assert.equal(await page.locator('#aid-panel-'+tab).isVisible(),true);
       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${file} ${width} ${id} ${tab} page overflow`);
      }
      assert.ok((await page.locator('.aid-sources').innerText()).includes('2026-11-09'));
      await page.locator('#aid-tab-lab').click();
      assert.equal(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed'),'false');
      const svg=page.locator('#fid-motion-scene>svg');
      assert.equal(await svg.count(),1,id+' has a computed state diagram');
      assert.equal(await svg.getAttribute('data-fid-scene'),lesson.modelId||id);
      const before=await svg.getAttribute('data-fid-stage');
      await page.locator('[data-action="aid-next"]').click();
      assert.notEqual(await svg.getAttribute('data-fid-stage'),before,id+' next step');
      assert.equal(await page.locator('[data-aid-line].is-active').count(),1,id+' one executing code line');
      await page.locator('[data-action="aid-prev"]').click();
      assert.equal(await svg.getAttribute('data-fid-stage'),before,id+' previous step');
      assert.equal(await page.locator('#fid-motion-stage').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
      const bounds=await page.locator('.aid-workspace').evaluate(el=>{
       const r=el.getBoundingClientRect(),m=document.getElementById('lbb-main').getBoundingClientRect();
       return {top:r.top,bottom:r.bottom,mainTop:m.top,mainBottom:m.bottom};
      });
      assert.ok(bounds.top>=bounds.mainTop-2&&bounds.bottom<=bounds.mainBottom+2,`${file} ${width} ${id} workspace is within the reading viewport: ${JSON.stringify(bounds)}`);
      const control=page.locator('[data-aid-param]').first();
      if(await control.count()){
       await page.locator('.fid-motion-settings').evaluate(el=>el.open=true);
       const old=await control.inputValue();
       if(await control.evaluate(el=>el.tagName)==='SELECT'){
        const values=await control.locator('option').evaluateAll(options=>options.map(x=>x.value));
        await control.selectOption(values.find(x=>x!==old));
       }else{
        const min=await control.getAttribute('min'),max=await control.getAttribute('max');
        await control.fill(old===max?min:max);await control.dispatchEvent('input');
       }
       assert.notEqual(await control.inputValue(),old,id+' adjustable input');
       assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
      }
      await page.locator('#aid-tab-exercise').click();
      await page.locator('#aid-answer').fill('');await page.locator('[data-action="aid-check"]').click();
      assert.notEqual(await page.locator('#aid-feedback').getAttribute('data-correct'),'true');
      await page.locator('#aid-answer').fill(String(lesson.exercise.expected));
      await page.locator('[data-action="aid-check"]').click();
      assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'true');
      await page.locator('#aid-reason').fill('QA '+file+' '+id+'：独立核对输入与状态。');
      await page.locator('#aid-tab-lab').click();
      if(['cs50p-regex','cs50p-project','missing-packaging','missing-agentic'].includes(id))
       await page.screenshot({path:path.join(output,file.replace('.html','')+'-'+width+'-'+id+'.png'),fullPage:true});
      // The course return and coverage links must work after inputs have changed.
      await page.locator(`#lbb-breadcrumbs [data-action="course"][data-value="${course.id}"]`).click();
      await page.locator(`[data-aid-course="${course.id}"]`).waitFor();
      await page.locator('.aid-published>summary').click();
      await page.locator(`.fid-coverage [data-action="aid-open"][data-value="${id}"]`).first().click();
      await page.locator('#aid-tab-exercise').click();
      assert.equal(await page.locator('#aid-reason').inputValue(),'QA '+file+' '+id+'：独立核对输入与状态。');
      receipts.push({file,width,course:course.id,lesson:id,fourPanels:true,computedScene:true,codeAndVariables:true,parameterChange:true,draftRecovery:true});
      await page.goto(base+'?foundation='+course.id);
      await page.locator('.aid-published>summary').click();
     }
     await page.screenshot({path:path.join(output,file.replace('.html','')+'-'+width+'-'+course.id+'-coverage.png'),fullPage:true});
    }
   }
   // New content does not fabricate any personal route, task or study time.
   const catalog=await page.evaluate(()=>CourseMapStatus.snapshot());
   for(const module of modules){
    const entry=catalog.find(x=>x.id===module.course.id);
    assert.equal(entry.kind,'authored');assert.equal(entry.count,module.lessons.length);
   }
   assert.equal(await page.evaluate(async()=>(await LBBLearningEngine.routeIndex()).length),0);
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
   await context.close();
  }
  const result={addedLessons:additions.size,courseCounts:Object.fromEntries(modules.map(m=>[m.course.id,m.lessons.length])),widths,formats:['index.html','standalone.html'],mapModes:['overview','courses'],mapEntrances:true,visits:receipts.length,automaticRoutesCreated:0,externalRequests:0,errors:[],checks:receipts};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({...result,checks:undefined}));
 }catch(error){
  const page=browser.contexts().flatMap(context=>context.pages()).at(-1);
  if(page){
   await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
   fs.writeFileSync(path.join(output,'failure.html'),await page.content().catch(()=>''));
  }
  throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
