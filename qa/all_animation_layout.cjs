const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),draft=path.resolve(root,'../../output/learning-unified-20261108/index.html');
const ai=require('../config/ai_courses.json'),foundation=require('../config/foundation_courses.json');
const output=path.join(path.dirname(draft),'split-layout-qa');fs.mkdirSync(output,{recursive:true});
const companionsOnly=process.argv.includes('--companions-only');
const previous=companionsOnly?JSON.parse(fs.readFileSync(path.join(output,'results.json'),'utf8')):{};
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
  let visits=0,demos=0,compactChecks=0;
  async function openCourse(id){
   await page.goto('file://'+draft+(foundation.courses.some(c=>c.id===id)?'?foundation='+id:''));
   if(!foundation.courses.some(c=>c.id===id)){
    await page.locator('.nav-item[data-action="map"]').first().click();
    await page.locator(`[data-action="node"][data-value="${{cme295:'a3',cs336:'a4',cs146s:'b4'}[id]}"]:visible`).first().click();
    await page.locator(`#lbb-main [data-action="course"][data-value="${id}"]`).first().click();
   }
   await page.locator('.aid-course-grid').waitFor();
  }
  async function checkLayout(label,width){
   const r=await page.evaluate(()=>{
    const main=document.querySelector('#lbb-main'),m=main.getBoundingClientRect(),w=document.querySelector('.aid-workspace').getBoundingClientRect(),a=document.querySelector('.aid-workspace-left').getBoundingClientRect(),b=document.querySelector('.aid-workspace-right').getBoundingClientRect();
    return {two:a.right<=b.left+1&&Math.abs(a.top-b.top)<2,fit:w.top>=m.top-2&&w.bottom<=m.bottom+2,body:document.documentElement.scrollWidth>innerWidth+1,main:main.scrollWidth>main.clientWidth+2,left:a.width,right:b.width};
   });
   assert.equal(r.two,true,label+' side by side');assert.equal(r.fit,true,label+' one viewport');assert.equal(r.body,false,label+' body overflow');assert.equal(r.main,false,label+' main overflow');assert.ok(r.left>250&&r.right>250,label+' readable columns');
   assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
  }
  for(const [width,height] of (companionsOnly?[]:[[1280,800],[1440,900],[390,844]])){
   await page.setViewportSize({width,height});
   for(const c of [...ai.courses,...foundation.courses]){
    await openCourse(c.id);
    for(const l of [...ai.lessons,...foundation.lessons].filter(l=>l.course===c.id)){
     await page.locator(`#lbb-main [data-action="aid-open"][data-value="${l.id}"]`).first().click();await page.locator('#aid-tab-lab').click();await checkLayout(width+' '+l.id,width);visits++;
     if(width===1280&&l.modelId==='cs336-bpe'){
      const words=page.locator('#aid-vars dt').filter({hasText:/^words$/}),value=words.locator('xpath=following-sibling::dd[1]');
      assert.equal(await value.locator('.aid-value-rows>div').count(),3);assert.ok((await value.innerText()).includes('["l","o","w"]'));assert.ok((await value.boundingBox()).height<140);
      const variableWidth=await page.locator('.aid-variables').evaluate(el=>el.getBoundingClientRect().width),paneWidth=await page.locator('.aid-workspace-right').evaluate(el=>el.clientWidth);
      assert.ok(variableWidth>paneWidth-50,'variables occupy the right pane rather than shrinking into a narrow column');compactChecks++;
      await page.screenshot({path:path.join(output,'bpe-compact-variables.png'),fullPage:true});
     }
     if(width===1280&&l.demos?.length>1){
      const settings=page.locator('.aid-parameter-settings,.fid-motion-settings').first();await settings.evaluate(el=>el.open=true);
      for(const demo of l.demos){await page.locator('#aid-demo').selectOption(demo.modelId);await checkLayout(demo.modelId,width);demos++;if(demo.modelId==='cs336-bpe'){
       const words=page.locator('#aid-vars dt').filter({hasText:/^words$/});const value=words.locator('xpath=following-sibling::dd[1]');assert.equal(await value.locator('.aid-value-rows>div').count(),3);assert.ok((await value.innerText()).includes('["l","o","w"]'));assert.ok((await value.boundingBox()).height<140);
       await page.screenshot({path:path.join(output,'bpe-compact-variables.png'),fullPage:true});
      }}
     }
     await page.locator('#lbb-main [data-action="course"]').first().click();
    }
   }
  }
  // Capture a foundation model with both its scene and compact variables visible.
  await page.setViewportSize({width:1280,height:800});await openCourse('cs50p');await page.locator('#lbb-main [data-action="aid-open"]').first().click();await page.locator('#aid-tab-lab').click();await page.locator('[data-action="aid-next"]').click();await checkLayout('foundation capture',1280);await page.screenshot({path:path.join(output,'foundation-two-column.png'),fullPage:true});
  let roboticsChecks=0,legacyChecks=0;
  for(const [width,height] of [[1280,800],[1440,900],[390,844]]){
   await page.setViewportSize({width,height});
   for(const id of ['mit2007','modern','pid','kalman','ros']){
    await page.goto('file://'+draft);await page.locator('.nav-item[data-action="map"]').first().click();
    const expand=page.locator('[data-action="atlas-mode"][data-value="courses"]');if(await expand.count())await expand.click();
    await page.locator(`[data-action="node"][data-value="plan-${id}"]:visible`).first().click();await page.locator(`#lbb-main [data-action="course"][data-value="${id}"]:visible`).first().click();
    await page.locator('.rf-course-grid [data-rf-action="open"]').first().click();await page.locator('#rf-tab-lab').click();
    const geometry=await page.evaluate(()=>{const m=document.getElementById('lbb-main').getBoundingClientRect(),w=document.querySelector('.rf-lab-workspace').getBoundingClientRect(),a=document.querySelector('.rf-lab-left').getBoundingClientRect(),b=document.querySelector('.rf-step-copy').getBoundingClientRect();return {two:a.right<=b.left+1&&Math.abs(a.top-b.top)<2,fit:w.top>=m.top-2&&w.bottom<=m.bottom+2,overflow:document.documentElement.scrollWidth>innerWidth+1};});
    assert.equal(geometry.two,true,id+' robot columns');assert.equal(geometry.fit,true,id+' robot viewport');assert.equal(geometry.overflow,false);roboticsChecks++;
    if(width===1280&&id==='pid')await page.screenshot({path:path.join(output,'robotics-two-column.png'),fullPage:true});
   }
   await openCourse('cs50p');await page.locator('.fid-legacy').evaluate(el=>el.open=true);await page.locator('[data-action="fid-legacy"]').first().click();await page.locator('.teaching-grid').waitFor();await page.evaluate(()=>new Promise(requestAnimationFrame));
   const legacy=await page.evaluate(()=>{const m=document.getElementById('lbb-main').getBoundingClientRect(),g=document.querySelector('.teaching-grid').getBoundingClientRect(),a=document.querySelector('.teaching-visual').getBoundingClientRect(),b=document.querySelector('.teaching-explanation').getBoundingClientRect();return {two:a.right<=b.left+1&&Math.abs(a.top-b.top)<2,fit:g.top>=m.top-2&&g.bottom<=m.bottom+2,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   assert.equal(legacy.two,true,'legacy columns');assert.equal(legacy.fit,true,'legacy viewport');assert.equal(legacy.overflow,false);legacyChecks++;
  }
  assert.deepEqual(errors,[]);if(!companionsOnly)assert.ok(compactChecks>0);const result={AIAndFoundationLessonVisits:visits||previous.AIAndFoundationLessonVisits,demoVisits:demos||previous.demoVisits,roboticsTopicVisits:roboticsChecks,legacyVisits:legacyChecks,widths:[1280,1440,390],sameViewport:true,sideBySide:true,compactNestedVariables:true,compactBPEChecks:compactChecks||previous.compactBPEChecks,errors};fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
