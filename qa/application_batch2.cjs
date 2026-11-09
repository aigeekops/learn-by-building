/* Exercise the second batch in an isolated, offline browser context. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const appDir=process.env.APPLICATION_APP_DIR||path.resolve(__dirname,'../../../output/learning-app-batch2-20261108');
const draft=process.env.APPLICATION_DRAFT_FILE||path.join(appDir,'index.html');
const output=process.env.APPLICATION_QA_OUTPUT||path.join(path.dirname(draft),'batch2-qa');fs.mkdirSync(output,{recursive:true});
for(const name of ['results.json','failure.json','failure.png'])fs.rmSync(path.join(output,name),{force:true});
const modules=['hfagents','fsdl'].map(n=>require('../config/application_'+n+'.json'));
const lessons=modules.flatMap(x=>x.lessons),M=require('../web/ai-course-models.js');
for(const name of ['hfagents','fsdl'])require('../web/application-'+name+'.js')(M);
const fmt=n=>!Number.isFinite(n)?String(n):n===0?'0':Math.abs(n)>1e7||Math.abs(n)<.0001?n.toExponential(3):Number(n.toFixed(4)).toLocaleString('en-US');
const expectedCodes=value=>Array.isArray(value)&&value.length&&value.some(x=>x&&typeof x==='object')?value.map(x=>JSON.stringify(x)):
 value&&typeof value==='object'&&!Array.isArray(value)?Object.values(value).map(x=>typeof x==='string'?x:JSON.stringify(x)):
 [typeof value==='number'?fmt(value):typeof value==='string'?value:JSON.stringify(value)];
const result={courses:2,lessons:lessons.length,widths:[1440,390],panelVisits:0,checkedFrames:0,parameterRecomputations:0,errors:[]};
let current='starting';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',acceptDownloads:true}),page=await context.newPage();
  page.on('pageerror',e=>result.errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
  const url=query=>'file://'+draft+(query?'?'+new URLSearchParams(query):'');
  async function openCourse(id){await page.goto(url({application:id}));await page.locator(`.aid-course-overview[data-aid-course="${id}"]`).waitFor();assert.equal(await page.locator('.aid-course-unit').count(),8);}
  async function openLesson(l,inspect=false){await page.goto(url({application:l.course,lesson:l.id,...(inspect?{inspect:'1'}:{})}));await page.locator(`[data-aid-lesson="${l.id}"]`).waitFor();}
  async function noPageOverflow(label){
   const overflow=await page.evaluate(()=>{const m=document.getElementById('lbb-main');return {body:document.documentElement.scrollWidth>innerWidth+1,main:m.scrollWidth>m.clientWidth+2};});
   assert.equal(overflow.body,false,label+' body overflow');assert.equal(overflow.main,false,label+' main overflow');
  }
  async function currentTrace(l){
   const params=await page.locator('[data-aid-param]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.dataset.aidParam,el.value])));
   return M.run(l.modelId||l.id,params);
  }
  async function frame(l,trace,index){
   const expected=trace.steps[index],label=current+' frame '+index;
   assert.equal(await page.locator('#app-teaching-scene').getAttribute('data-frame'),trace.model+':'+index,label+' scene frame');
   assert.equal(await page.locator('#app-teaching-scene svg').getAttribute('data-fid-stage'),String(index),label+' svg frame');
   assert.equal(await page.locator('#app-scene-title').innerText(),expected.title,label+' scene title');
   assert.equal(await page.locator('#aid-step-title').innerText(),expected.title,label+' explanation title');
   const active=page.locator('[data-aid-line].is-active');assert.equal(await active.count(),1,label+' one current code line');
   assert.equal(await active.getAttribute('data-aid-line'),String(expected.line),label+' code line number');
   assert.equal(await active.locator('code').textContent(),trace.code[expected.line-1],label+' code text');
   const values=await page.locator('#aid-vars').evaluate(el=>[...el.querySelectorAll('dt')].map(dt=>({key:dt.textContent,codes:[...dt.nextElementSibling.querySelectorAll('code')].map(c=>c.textContent)})));
   assert.deepEqual(values.map(x=>x.key),Object.keys(expected.variables),label+' variable keys');
   for(const variable of values)assert.deepEqual(variable.codes,expectedCodes(expected.variables[variable.key]),label+' variable '+variable.key);
   assert.equal(await page.locator('#app-teaching-stage').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,label+' no decorative running animations');
   result.checkedFrames++;
  }
  async function advanceToLast(l,trace){
   for(let i=1;i<trace.steps.length;i++)await page.locator('[data-action="aid-next"]').click();
   await frame(l,trace,trace.steps.length-1);
  }
  for(const width of result.widths){
   await page.setViewportSize({width,height:1000});
   for(const module of modules){
    await openCourse(module.course.id);
    assert.equal(await page.locator('.aid-course-overview .button.primary').count(),1,module.course.id+' one primary directory action');
    for(const l of module.lessons){
     current=width+' '+l.id;
     await page.locator(`#lbb-main [data-action="aid-open"][data-value="${l.id}"]`).first().click();await page.locator(`[data-aid-lesson="${l.id}"]`).waitFor();
     assert.ok(await page.locator('.app-local-code').count()>0,current+' executable local code');
     for(const tab of ['explain','lab','exercise','sources']){
      await page.locator('#aid-tab-'+tab).click();assert.equal(await page.locator('#aid-panel-'+tab).isVisible(),true,current+' panel '+tab);await noPageOverflow(current+' '+tab);result.panelVisits++;
      if(tab==='explain')assert.ok(await page.locator('.app-local-code').first().isVisible(),current+' local Python displayed');
     }
     await page.locator('#aid-tab-lab').click();
     assert.equal(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed'),'false',current+' default paused');
     const layout=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};};return {workspace:rect('.aid-workspace'),left:rect('.aid-workspace-left'),right:rect('.aid-workspace-right'),main:rect('#lbb-main'),code:rect('.aid-code'),vars:rect('.aid-variables'),scroll:document.querySelector('.aid-workspace-scroll').scrollWidth>document.querySelector('.aid-workspace-scroll').clientWidth};});
     assert.ok(layout.right.left>=layout.left.right-1,current+' side-by-side panes');assert.ok(Math.abs(layout.left.top-layout.right.top)<2,current+' aligned panes');
     assert.ok(layout.workspace.bottom<=layout.main.bottom+2,current+' workspace stays within viewport');assert.ok(layout.code.height>70&&layout.vars.height>60,current+' bounded readable inspection');
     if(width===390)assert.equal(layout.scroll,true,current+' narrow screen scroll is confined to workspace');
     let trace=await currentTrace(l);await frame(l,trace,0);
     await page.locator('[data-action="aid-next"]').click();await frame(l,trace,1);
     await page.locator('[data-action="aid-prev"]').click();await frame(l,trace,0);
     const input=page.locator('[data-aid-param]').first();
     await input.evaluate(el=>{const details=el.closest('details');if(details)details.open=true;});
     const before=await input.inputValue(),tag=await input.evaluate(el=>el.tagName);
     if(tag==='SELECT'){
      const options=await input.locator('option').evaluateAll(els=>els.map(e=>e.value));await input.selectOption(options.find(x=>x!==before));
     }else{await input.fill(await input.getAttribute('max')===before?await input.getAttribute('min'):await input.getAttribute('max'));await input.dispatchEvent('input');}
     assert.notEqual(await input.inputValue(),before,current+' changed parameter');trace=await currentTrace(l);await frame(l,trace,0);await advanceToLast(l,trace);result.parameterRecomputations++;
     await page.locator('#aid-tab-exercise').click();
     await page.locator('#aid-answer').fill('');await page.locator('[data-action="aid-check"]').click();assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'false',current+' blank answer');
     await page.locator('#aid-answer').fill(String(l.exercise.expected+100));await page.locator('[data-action="aid-check"]').click();assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'false',current+' wrong answer');
     await page.locator('#aid-answer').fill(String(l.exercise.expected));await page.locator('[data-action="aid-check"]').click();assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'true',current+' correct independent number');
     await page.locator('#aid-reason').fill('batch2 QA '+width+' '+l.id);await page.locator('#aid-prediction').fill('prediction '+l.id);
     await page.locator(`[data-action="course"][data-value="${l.course}"]:visible`).first().click();await page.locator('.aid-course-grid').waitFor();
    }
   }
  }
  // Same file origin, different courses: exercise answers and parameters stay isolated.
  for(const module of modules){
   const l=module.lessons[0];current='draft '+l.id;await openLesson(l);await page.locator('#aid-tab-exercise').click();
   assert.equal(await page.locator('#aid-reason').inputValue(),'batch2 QA 390 '+l.id);assert.equal(await page.locator('#aid-prediction').inputValue(),'prediction '+l.id);
   await page.reload();await page.locator('#aid-tab-exercise').click();assert.equal(await page.locator('#aid-reason').inputValue(),'batch2 QA 390 '+l.id);
   await page.locator('#aid-tab-lab').click();let trace=await currentTrace(l);await frame(l,trace,0);
   const initially=await page.locator('#app-teaching-scene').getAttribute('data-frame');await page.waitForTimeout(1600);assert.equal(await page.locator('#app-teaching-scene').getAttribute('data-frame'),initially,l.id+' no automatic progression');
   await page.locator('[data-action="aid-play"]').click();await page.waitForTimeout(1650);assert.notEqual(await page.locator('#app-teaching-scene').getAttribute('data-frame'),initially,l.id+' optional continuous steps');
   await page.locator('[data-action="aid-play"]').click();const stopped=await page.locator('#app-teaching-scene').getAttribute('data-frame');await page.waitForTimeout(1600);assert.equal(await page.locator('#app-teaching-scene').getAttribute('data-frame'),stopped,l.id+' paused steps stable');
   assert.equal(await page.locator('#app-teaching-stage').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,l.id+' no continuing decoration');
   for(const width of result.widths){await page.setViewportSize({width,height:1000});await page.screenshot({path:path.join(output,module.course.id+'-'+width+'.png'),fullPage:true});}
   await page.setViewportSize({width:1440,height:1000});await openCourse(module.course.id);
   const group=page.locator('.app-originals');assert.ok(await group.count()>0,module.course.id+' original lessons retained');await group.locator(':scope > summary').click();await group.locator('[data-action="app-legacy"]').first().click();await page.locator('.teaching-player').waitFor();
  }
  async function map(mode){
   await page.goto(url());await page.locator('#lbb-course-prototype .nav-item[data-action="map"]').first().click();
   const toggle=page.locator('#atlas-expand-control');if((await toggle.getAttribute('aria-expanded')==='true')!==(mode==='courses'))await toggle.click();
   const close=page.locator('#lbb-node-detail .detail-close');if(await close.isVisible())await close.click();
  }
  for(const width of result.widths){await page.setViewportSize({width,height:1000});for(const mode of ['overview','courses'])for(const module of modules){
   const id=module.course.id;current=`map ${width} ${mode} ${id}`;await map(mode);
   const node=mode==='overview'?(id==='hfagents'?'b1':'b5'):'plan-'+id;
   const point=page.locator(`.learning-atlas [data-action="node"][data-value="${node}"]`).first();assert.equal(await point.getAttribute('data-lesson-count'),'8');
   await point.click();const row=page.locator(`#lbb-node-detail .course-row[data-cms-course="${id}"]`);assert.equal(await row.getAttribute('data-lesson-count'),'8');assert.equal(await row.getAttribute('data-content-status'),'authored');
   await row.locator('[data-action="course"]').click();await page.locator(`.aid-course-overview[data-aid-course="${id}"]`).waitFor();assert.equal(await page.locator('.aid-course-unit').count(),8);
   await map(mode);await point.click();await page.locator(`#lbb-node-detail [data-cms-first="${id}"]`).click();await page.locator(`[data-aid-lesson="${module.lessons[0].id}"]`).waitFor();assert.equal(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed'),'false');
  }}
  current='existing course regressions';await page.setViewportSize({width:1440,height:1000});
  await page.goto(url({foundation:'cs50p',lesson:'cs50p-functions'}));await page.locator('#aid-tab-lab').click();await page.locator('#fid-motion-scene .fid-execution').waitFor();assert.equal(await page.locator('#fid-motion-scene').getAttribute('data-frame'),'cs50p-functions:0');assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
  assert.equal(await page.locator('.fid-execution-stack [aria-current="step"]').innerText(),'调用处');await page.locator('[data-action="aid-next"]').click();assert.equal(await page.locator('#fid-motion-scene').getAttribute('data-frame'),'cs50p-functions:1');assert.equal(await page.locator('.fid-execution-pending').isVisible(),true);
  await map('overview');await page.locator('.learning-atlas [data-action="node"][data-value="a3"]').click();await page.locator('#lbb-node-detail [data-action="course"][data-value="cme295"]').click();await page.locator('#lbb-main [data-action="aid-open"]').first().click();await page.locator('#aid-tab-lab').click();assert.equal(await page.locator('[data-aid-line].is-active').count(),1);
  await map('courses');await page.locator('.learning-atlas [data-action="node"][data-value="plan-pid"]').click();await page.locator('#lbb-node-detail [data-action="course"][data-value="pid"]').click();await page.locator('.rf-course-grid [data-rf-action="open"]').first().click();await page.locator('#rf-tab-lab').click();await page.locator('.rf-visual svg').waitFor();
  await map('courses');const catalog=await page.evaluate(()=>CourseMapStatus.snapshot());for(const id of ['hfagents','fsdl'])assert.deepEqual(catalog.find(x=>x.id===id)&&{...catalog.find(x=>x.id===id),first:undefined},{id,kind:'authored',family:'application',count:8,first:undefined});
  assert.equal(catalog.find(x=>x.id==='nav2').kind,'planned');assert.equal(catalog.filter(x=>x.kind==='authored').length,13);assert.equal(catalog.filter(x=>x.kind==='authored').reduce((n,x)=>n+x.count,0),87);
  // Keep a few causally useful screenshots, rather than photographing decorative motion.
  const screenshots=[];
  async function resetParams(l){
   const settings=page.locator('.aid-parameter-settings');await settings.evaluate(el=>el.open=true);
   for(const spec of M.specs[l.modelId||l.id]){
    const input=page.locator(`[data-aid-param="${spec.id}"]`);
    if(spec.type==='select')await input.selectOption(String(spec.value));else{await input.fill(String(spec.value));await input.dispatchEvent('input');}
   }
   await settings.evaluate(el=>el.open=false);
   return currentTrace(l);
  }
  async function photograph(name){await noPageOverflow(name);await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});screenshots.push(name+'.png');}
  const loopLesson=lessons.find(l=>l.id==='hfagents-loop');
  for(const width of result.widths){
   current='teaching screenshots '+width;await page.setViewportSize({width,height:1000});await openLesson(loopLesson,true);const trace=await resetParams(loopLesson);
   const target=trace.steps.findIndex(s=>s.variables.feedback?.kind==='ok');for(let i=0;i<target;i++)await page.locator('[data-action="aid-next"]').click();await frame(loopLesson,trace,target);await photograph('hfagents-tool-feedback-'+width);
   const metricLesson=lessons.find(l=>l.id==='fsdl-metrics');await openLesson(metricLesson,true);let metricTrace=await resetParams(metricLesson);assert.equal(metricTrace.result.penalty,7);await advanceToLast(metricLesson,metricTrace);await photograph('fsdl-cost-threshold-05-'+width);
   await page.locator('.aid-parameter-settings').evaluate(el=>el.open=true);await page.locator('[data-aid-param="threshold"]').fill('0.8');await page.locator('[data-aid-param="threshold"]').dispatchEvent('input');await page.locator('.aid-parameter-settings').evaluate(el=>el.open=false);
   metricTrace=await currentTrace(metricLesson);assert.equal(metricTrace.result.penalty,10);await advanceToLast(metricLesson,metricTrace);await photograph('fsdl-cost-threshold-08-'+width);
  }
  assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.evaluate(async()=>(await LBBLearningEngine.routeIndex()).length),0);assert.deepEqual(result.errors,[]);
  Object.assign(result,{allFourPanels:true,localPythonCodeVisible:true,frameCodeVariablesMatch:true,sideBySideWorkspace:true,workspaceOnlyHorizontalScroll:true,defaultPaused:true,continuousViewingOptional:true,pauseStopsProgress:true,noDecorativeInfiniteAnimation:true,draftsIsolatedAndRecovered:true,legacyLessons:true,mapModes:['overview','courses'],mapCourseAndFirstLessonEntrances:true,existingRegressions:['foundation','AI','robotics'],authoredCourses:13,authoredLessons:87,automaticPersonalRoutesCreated:0,screenshots});
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }catch(error){const page=browser.contexts()[0]?.pages()[0];if(page){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});console.error((await page.locator('body').innerText().catch(()=>'' )).slice(-1800));}fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({current,error:String(error),errors:result.errors},null,2)+'\n');throw error;}finally{await browser.close();}
})().catch(error=>{console.error(current,error);process.exitCode=1;});
