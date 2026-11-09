/* Fresh browser contexts; no personal browser, services or learning records. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const appDir=process.env.MATH_BUILD||path.resolve(__dirname,'../../../output/learning-math-batch2-20261109/site');
const output=process.env.MATH_QA||path.join(path.dirname(appDir),'qa');fs.mkdirSync(output,{recursive:true});
const modules=['linear','probability','cs229'].map(n=>require('../config/foundation_'+n+'.json'));
const expectedCourses=JSON.parse(fs.readFileSync(path.join(appDir,'build-info.json'),'utf8')).courses;
const M=require('../web/ai-course-models.js');require('../web/foundation-math.js')(M);
const result={widths:[1440,390],formats:['index.html','standalone.html'],lessons:18,panelVisits:0,frames:0,recomputations:0,errors:[]};
(async()=>{
  const browser=await chromium.launch({headless:true});let page;
  try{
    for(const file of result.formats){
      const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
      const url=q=>'file://'+path.join(appDir,file)+(q?'?'+new URLSearchParams(q):'');
      async function frame(l,index){
        const params=await page.locator('[data-aid-param]').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.aidParam,e.value])));
        const trace=M.run(l.id,params),s=trace.steps[index];
        assert.equal(await page.locator('#fid-motion-scene').getAttribute('data-frame'),l.id+':'+index);
        assert.equal(await page.locator('#fid-motion-scene svg').getAttribute('data-fid-stage'),String(index));
        assert.equal(await page.locator('#aid-step-title').textContent(),s.title);
        assert.equal(await page.locator('[data-aid-line].is-active').getAttribute('data-aid-line'),String(s.line));
        assert.equal(await page.locator('[data-aid-line].is-active code').textContent(),trace.code[s.line-1]);
        assert.equal(await page.locator('#fid-motion-scene svg').evaluate(e=>e.getAnimations({subtree:true}).length),0);
        result.frames++;return trace;
      }
      for(const width of result.widths){
        await page.setViewportSize({width,height:1000});
        for(const module of modules){
          await page.goto(url({foundation:module.course.id}));await page.locator('.aid-course-grid').waitFor();
          assert.equal(await page.locator('.aid-course-unit').count(),6);
          for(const l of module.lessons){
            await page.locator(`#lbb-main [data-action="aid-open"][data-value="${l.id}"]`).first().click();
            await page.locator(`[data-aid-lesson="${l.id}"]`).waitFor();
            assert.ok(await page.locator('.fid-local-code').count()>0);
            for(const tab of ['explain','lab','exercise','sources']){
              await page.locator('#aid-tab-'+tab).click();assert.equal(await page.locator('#aid-panel-'+tab).isVisible(),true);
              const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth+1,main:document.querySelector('#lbb-main').scrollWidth>document.querySelector('#lbb-main').clientWidth+2}));
              assert.deepEqual(overflow,{body:false,main:false},file+' '+width+' '+l.id+' '+tab);result.panelVisits++;
            }
            await page.locator('#aid-tab-lab').click();assert.equal(await page.locator('[data-action="aid-play"]').getAttribute('aria-pressed'),'false');
            const layout=await page.evaluate(()=>{
              const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
              return {left:rect('.aid-workspace-left'),right:rect('.aid-workspace-right'),workspace:rect('.aid-workspace'),main:rect('#lbb-main'),sceneInLeft:!!document.querySelector('.aid-workspace-left #fid-motion-stage')};
            });
            assert.equal(layout.sceneInLeft,true,l.id+' diagram shares the left workspace with controls');
            assert.ok(layout.right.left>=layout.left.right-1,l.id+' panes stay side by side');
            assert.ok(Math.abs(layout.left.top-layout.right.top)<2,l.id+' panes align');
            assert.ok(layout.workspace.bottom<=layout.main.bottom+2,l.id+' workspace fits the viewport');
            await frame(l,0);await page.locator('[data-action="aid-next"]').click();await frame(l,1);
            const input=page.locator('[data-aid-param]').first();await input.evaluate(e=>{e.closest('details').open=true;});
            const old=await input.inputValue();
            if(await input.evaluate(e=>e.tagName)==='SELECT'){
              const opts=await input.locator('option').evaluateAll(es=>es.map(e=>e.value));await input.selectOption(opts.find(x=>x!==old));
            }else{const max=await input.getAttribute('max');await input.fill(old===max?await input.getAttribute('min'):max);await input.dispatchEvent('input');}
            let trace=await frame(l,0);for(let i=1;i<trace.steps.length;i++)await page.locator('[data-action="aid-next"]').click();
            await frame(l,trace.steps.length-1);result.recomputations++;
            if(file==='standalone.html'&&['linear-projection','probability-test','cs229-kmeans'].includes(l.id))await page.screenshot({path:path.join(output,l.id+'-'+width+'.png')});
            await page.locator('#aid-tab-exercise').click();
            await page.locator('#aid-answer').fill(String(l.exercise.expected+10));await page.locator('[data-action="aid-check"]').click();assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'false');
            await page.locator('#aid-answer').fill(String(l.exercise.expected));await page.locator('[data-action="aid-check"]').click();assert.equal(await page.locator('#aid-feedback').getAttribute('data-correct'),'true');
            await page.locator('#aid-reason').fill('isolated math QA '+l.id);
            await page.locator(`[data-action="course"][data-value="${l.course}"]:visible`).first().click();await page.locator('.aid-course-grid').waitFor();
          }
        }
        await page.goto(url());await page.locator('.learning-atlas').waitFor();
        const catalog=await page.evaluate(()=>CourseMapStatus.snapshot());
        assert.equal(catalog.filter(x=>x.kind==='authored').length,Object.keys(expectedCourses).length);
        for(const [id,count] of Object.entries(expectedCourses))assert.equal(catalog.find(x=>x.id===id)?.count,count,id+' matches the public build manifest');
        const pending=['cs234','bonn','manipulation','nav2','moveit','cs224r','underactuated'].filter(id=>!Object.hasOwn(expectedCourses,id));
        const prerequisite=['cs231n','arduino','lerobot'].filter(id=>!Object.hasOwn(expectedCourses,id));
        assert.deepEqual(catalog.filter(x=>x.kind==='planned').map(x=>x.id),pending);
        assert.deepEqual(catalog.filter(x=>x.kind==='prerequisite').map(x=>x.id),prerequisite);
        for(const id of ['linear','probability','cs229'])assert.equal(catalog.find(x=>x.id===id).count,6);
        assert.equal(await page.locator('.cms-map-audit summary').textContent(),Object.keys(expectedCourses).length+' 门已整理 · '+pending.length+' 门待整理');
        assert.equal(await page.locator('.cms-map-audit-panel [data-action="node"]').count(),pending.length+prerequisite.length);
        await page.screenshot({path:path.join(output,'map-'+file.replace('.html','')+'-'+width+'.png')});
        result.catalog=catalog;
      }
      const snapshot=await page.evaluate(()=>LBBLearningEngine.snapshot());
      assert.equal(snapshot.tasks.length,0);assert.equal(snapshot.sessions.length,0);assert.equal(snapshot.entries.length,0);result.automaticLearningRecords=0;
      await context.close();
    }
    assert.deepEqual(result.errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }catch(error){
    if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
    fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:error.stack,result},null,2));throw error;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
