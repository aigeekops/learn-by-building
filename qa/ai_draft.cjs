const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const draft=process.env.AI_DRAFT_FILE||path.resolve(root,'../../output/learning-unified-20261108/index.html');
// Verify the immutable packaged draft, even while another chat edits source courses.
const embedded=fs.readFileSync(draft,'utf8').match(/const aidData = (\{[^\n]*\});/);
const data=embedded?JSON.parse(embedded[1]):require('../config/ai_courses.json');
const output=path.join(path.dirname(draft),'ai-qa');fs.mkdirSync(output,{recursive:true});
async function checkLegacyDraftCompatibility(browser,url,errors){
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 try{
  await context.addInitScript(()=>{
   const key='lbb-ai-courseware-2026-drafts-v1';
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({attention:{params:{position:1,key:2,causal:'no'},reason:'保留旧注记'}}));
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,route=>route.abort());
  async function openAttention(){
   await page.locator('[data-action="node"][data-value="a3"]:visible').first().click();
   await page.locator('[data-action="course"][data-value="cme295"]:visible').first().click();
   await page.locator('#lbb-main [data-action="aid-open"][data-value="attention"]').first().click();
  }
  async function assertLegacy(){
   assert.equal(await page.locator('#aid-demo').inputValue(),'attention');
   for(const [id,value] of Object.entries({position:'1',key:'2',causal:'no'}))assert.equal(await page.locator(`[data-aid-param="${id}"]`).inputValue(),value);
   assert.equal(await page.locator('#aid-reason').inputValue(),'保留旧注记');
  }
  await page.goto(url+'?integration-qa=legacy-draft-compatibility');await openAttention();await assertLegacy();
  await page.locator('#aid-tab-lab').click();await page.locator('#aid-demo').selectOption('cme-representations');
  await page.locator('[data-aid-param="merges"]').evaluate(el=>{el.value='4';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#aid-demo').selectOption('attention');await assertLegacy();
  await page.reload();await openAttention();await assertLegacy();
  await page.locator('#aid-tab-lab').click();await page.locator('#aid-demo').selectOption('cme-representations');
  assert.equal(await page.locator('[data-aid-param="merges"]').inputValue(),'4');
  await page.locator('#aid-demo').selectOption('attention');await assertLegacy();
  const state=await page.evaluate(()=>LBBLearningEngine.snapshot());assert.equal(state.tasks.length,0);assert.equal(state.entries.length,0);
  return true;
 }finally{await context.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true});const errors=[],modelsChecked=new Set();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  // The draft's existing external icon script is optional. Courseware needs no network.
  await page.route(/^https?:/,route=>route.abort());
  const url='file://'+draft;
  async function openCourse(id){
   await page.goto(url);await page.locator('#lbb-main').waitFor();
   const node={cme295:'a3',cs336:'a4',cs146s:'b4'}[id];
   await page.locator(`[data-action="node"][data-value="${node}"]:visible`).first().click();
   await page.locator(`[data-action="course"][data-value="${id}"]:visible`).first().click();
   try{await page.locator('.aid-course-grid').waitFor({timeout:5000});}catch(error){
    await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});
    console.error(JSON.stringify({course:id,errors,visibleText:(await page.locator('#lbb-main').innerText()).slice(0,1600)}));throw error;
   }
   assert.equal(await page.locator('iframe').count(),0);
   assert.equal(await page.locator('.aid-course-unit:not(.is-pending)').count(),data.lessons.filter(l=>l.course===id).length);
  }
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});
   for(const course of data.courses){
    await openCourse(course.id);
    for(const l of data.lessons.filter(x=>x.course===course.id)){
     await page.locator(`#lbb-main [data-action="aid-open"][data-value="${l.id}"]`).first().click();
     await page.locator(`[data-aid-lesson="${l.id}"]`).waitFor();
     assert.equal(await page.locator('.aid-reading-section').count(),l.sections.length,l.id+' complete sections');
     assert.equal(await page.locator('.aid-section-code').count(),l.sections.filter(s=>s.code).length,l.id+' section code');
     assert.equal(await page.locator('.aid-section-exercise').count(),l.sections.filter(s=>s.exercise).length,l.id+' section tasks');
     for(const tab of ['explain','lab','exercise','sources']){
      await page.locator('#aid-tab-'+tab).click();assert.equal(await page.locator('#aid-panel-'+tab).isVisible(),true);
      const overflow=await page.evaluate(()=>{const r=document.getElementById('lbb-course-prototype'),m=document.getElementById('lbb-main');return {body:document.documentElement.scrollWidth>innerWidth+1,main:m.scrollWidth>m.clientWidth+2,root:r.scrollWidth>r.clientWidth+2}});
      assert.equal(overflow.body,false,`${width} ${l.id} ${tab} body overflow`);assert.equal(overflow.main,false,`${width} ${l.id} ${tab} main overflow`);
     }
     await page.locator('#aid-tab-lab').click();assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
     if(width===1440){
      for(const demo of l.demos||[{modelId:l.modelId||l.id}]){
       await page.locator('#aid-demo').selectOption(demo.modelId);
       let n=0;while(await page.locator('[data-action="aid-next"]').isEnabled()&&n++<100)await page.locator('[data-action="aid-next"]').click();
       assert.ok(n<100,l.id+' bounded steps');assert.equal(await page.locator('[data-aid-line].is-active').count(),1,demo.modelId+' active code');
       assert.equal(await page.evaluate(()=>{const m=document.getElementById('lbb-main');return m.scrollWidth>m.clientWidth+2;}),false,demo.modelId+' final overflow');
       modelsChecked.add(demo.modelId);
      }
     }
     await page.locator('[data-action="aid-recompute"]').click();
     const count=await page.locator('#aid-count').innerText();await page.locator('[data-action="aid-next"]').click();assert.notEqual(await page.locator('#aid-count').innerText(),count);await page.locator('[data-action="aid-prev"]').click();assert.equal(await page.locator('#aid-count').innerText(),count);
     await page.locator('#aid-tab-exercise').click();await page.locator('#aid-answer').fill(String(l.exercise.expected));await page.locator('[data-action="aid-check"]').click();assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'true');
     await page.locator('#aid-reason').fill('QA '+l.id+' 独立填写');
     await page.locator('#lbb-main [data-action="course"]').first().click();
    }
   }
  }
  await page.setViewportSize({width:1440,height:1000});await openCourse('cme295');
  await page.locator('#lbb-main [data-action="aid-open"][data-value="attention"]').first().click();await page.locator('#aid-tab-exercise').click();assert.equal(await page.locator('#aid-reason').inputValue(),'QA attention 独立填写');
  await page.locator('#aid-tab-lab').click();await page.locator('#aid-param-position').selectOption('1');
  await page.locator('[data-action="aid-play"]').click();await page.waitForTimeout(1650);await page.locator('[data-action="aid-play"]').click();
  const stopped=await page.locator('#aid-count').innerText();assert.ok(stopped.startsWith('2 /'));await page.waitForTimeout(1550);assert.equal(await page.locator('#aid-count').innerText(),stopped);
  await page.locator('[data-action="aid-play"]').click();await page.locator('#aid-tab-exercise').click();assert.equal(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed'),'false');
  const downloadReady=page.waitForEvent('download');await page.locator('[data-action="aid-export"]').click();const download=await downloadReady;await download.saveAs(path.join(output,download.suggestedFilename()));assert.ok(fs.readFileSync(path.join(output,download.suggestedFilename()),'utf8').includes('QA attention 独立填写'));
  // Cross-course navigation must preserve the original lesson's draft.
  await page.locator('[data-action="aid-open"][data-value="context"]').first().click();await page.locator('#aid-tab-exercise').click();assert.equal(await page.locator('#aid-reason').inputValue(),'QA context 独立填写');
  // Existing foundational teaching remains reachable from the same map.
  await page.locator('#lbb-main [data-action="course"]').first().click();await page.locator('#lbb-main [data-action="map"]').first().click();await page.locator('[data-action="node"][data-value="plan-cs50p"]:visible').first().click();await page.locator('[data-action="course"][data-value="cs50p"]:visible').first().click();if(await page.locator('.fid-legacy').count()){await page.locator('.fid-legacy').evaluate(el=>el.open=true);await page.locator('[data-action="fid-legacy"]').first().click();}else await page.locator('[data-action="teaching-open"]').first().click();await page.locator('.teaching-player').waitFor();
  // Captures retain the existing draft shell rather than a nested second application.
  for(const [course,id] of [['cme295','attention'],['cs336','compute'],['cs146s','agent']]){
   await openCourse(course);await page.locator(`#lbb-main [data-action="aid-open"][data-value="${id}"]`).first().click();await page.locator('#aid-tab-lab').click();for(let i=0;i<4&&await page.locator('[data-action="aid-next"]').isEnabled();i++)await page.locator('[data-action="aid-next"]').click();await page.screenshot({path:path.join(output,course+'-in-existing-draft.png'),fullPage:true});
  }
  const legacyDraftCompatibility=await checkLegacyDraftCompatibility(browser,url,errors);
  const engineStatus=await page.evaluate(async()=>({routes:(await LBBLearningEngine.routeIndex()).length}));assert.equal(engineStatus.routes,0);
  assert.deepEqual(errors,[]);
  const result={lectures:data.lessons.length,models:modelsChecked.size,sections:data.lessons.reduce((n,l)=>n+l.sections.length,0),courses:3,widths:[1440,390,320],entry:'existing map nodes',nativeCourseAndLessonViews:true,iframes:0,originalTeachingRetained:true,playPause:true,exerciseExport:true,crossCourseDraftPreserved:true,legacyDraftCompatibility,automaticPersonalRoutesCreated:0,errors};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
