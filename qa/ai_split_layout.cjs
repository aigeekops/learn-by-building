/* Layout and interaction checks in isolated offline browser contexts. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),data=require('../config/ai_courses.json');
const output=process.env.AI_SPLIT_QA_OUTPUT||path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ai-split-layout-')),'courseware');
execFileSync(process.env.PYTHON||'python3',['scripts/build_ai_courseware.py','--output',output],{cwd:root,stdio:'pipe'});
const url='file://'+path.join(output,'interactive-courseware.html');
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of [[1440,900],[1280,800],[390,844]]){
   await page.setViewportSize({width,height});
   for(const lesson of data.lessons){
    await page.goto(url+'#'+lesson.id);await page.locator('#aic-tab-watch').click();
    const geometry=await page.evaluate(()=>{
     const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};};
     return {workspace:rect('.aic-workspace'),left:rect('.aic-motion-column'),right:rect('.aic-inspection-column'),code:rect('.aic-code-block'),vars:rect('.aic-vars'),bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,viewport:innerHeight};
    });
    assert.equal(geometry.bodyOverflow,false,`${width} ${lesson.id} body overflow`);
    assert.ok(geometry.right.left>geometry.left.right,`${width} ${lesson.id} two columns`);
    assert.ok(Math.abs(geometry.left.top-geometry.right.top)<2,`${width} ${lesson.id} same top`);
    assert.ok(geometry.workspace.bottom<=height+1,`${width} ${lesson.id} fits viewport`);
    assert.ok(geometry.code.height>80&&geometry.vars.height>80,`${width} ${lesson.id} usable inspection panes`);
    assert.ok(geometry.code.bottom<=geometry.workspace.bottom&&geometry.vars.bottom<=geometry.workspace.bottom,`${width} ${lesson.id} bounded inspection`);
    assert.ok(await page.locator('.aic-parameter-panel>summary').evaluate(el=>el.getBoundingClientRect().height>18),`${width} ${lesson.id} readable parameter entrance`);
    const before=await page.locator('#aic-count').innerText();await page.locator('#aic-next').click();assert.notEqual(await page.locator('#aic-count').innerText(),before);
    assert.equal(await page.locator('.aic-code-active').count(),1);
   }
  }
  await page.setViewportSize({width:1280,height:800});
  await page.goto(url+'#attention');await page.locator('#aic-tab-watch').click();
  await page.locator('.aic-parameter-panel>summary').click();await page.locator('#aic-demo-picker').selectOption('cme-representations');
  const values=await page.locator('#aic-variables').innerText();
  assert.ok(values.includes('[0] ["l","o","w"]'),'nested arrays keep one compact row per word');
  await page.screenshot({path:path.join(output,'standalone-ai-split-1280.png'),fullPage:true});
  await page.locator('#aic-play').click();await page.waitForTimeout(1650);await page.locator('#aic-play').click();
  const paused=await page.locator('#aic-count').innerText();await page.waitForTimeout(1550);assert.equal(await page.locator('#aic-count').innerText(),paused);
  await page.locator('#aic-tab-practice').click();await page.locator('#aic-reason').fill('split-layout draft');await page.reload();await page.locator('#aic-tab-practice').click();assert.equal(await page.locator('#aic-reason').inputValue(),'split-layout draft');
  assert.deepEqual(errors,[]);
  const result={lectures:data.lessons.length,widths:[1440,1280,390],twoColumns:true,workspaceFitsViewport:true,boundedCodeAndVariables:true,compactNestedValues:true,playPause:true,draftsPreserved:true,errors,output};
  fs.writeFileSync(path.join(output,'split-layout-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
