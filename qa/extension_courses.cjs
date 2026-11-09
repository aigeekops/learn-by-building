/* Isolated browser QA of the public build; no personal browser profile. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/bytedance/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const directory=process.env.EXTENSION_BUILD||path.resolve(__dirname,'../../../output/course-gap-completion-20261109/site');
const output=process.env.EXTENSION_QA_OUTPUT||path.join(path.dirname(directory),'browser-qa');fs.mkdirSync(output,{recursive:true});
const modules=require('../scripts/integrate-extension-qa-data.cjs');
const M=require('../web/ai-course-models.js'),E=require('../web/extension-course-models.js');E.register(M);
const result={courses:modules.length,lessons:modules.reduce((n,m)=>n+m.lessons.length,0),panels:0,frames:0,recomputations:0,errors:[],network:[],widths:[1440,390],modes:['offline','http']};
const server=http.createServer((req,res)=>{const relative=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(directory,'.'+relative+(relative.endsWith('/')?'index.html':''));if(!file.startsWith(directory+path.sep)){res.writeHead(403).end();return;}try{const body=fs.readFileSync(file);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(body);}catch{res.writeHead(404).end();}});
let current='startup';
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 try{
  for(const mode of result.modes){const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();page.on('pageerror',e=>result.errors.push({current,message:e.message}));
   await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith('http')&&!u.startsWith(origin)){result.network.push(u);return route.abort();}return route.continue();});
   const base=mode==='offline'?'file://'+path.join(directory,'standalone.html'):origin+'/index.html';
   async function visit(course,lesson,inspect=false){await page.goto(base+'?'+new URLSearchParams({extension:course,...(lesson?{lesson}:{}),...(inspect?{inspect:'1'}:{})}));await page.locator(lesson?'[data-aid-lesson="'+lesson+'"]':'[data-aid-course="'+course+'"]').waitFor();}
   for(const width of result.widths){await page.setViewportSize({width,height:1000});for(const module of modules){current=mode+' '+width+' '+module.course.id;await visit(module.course.id);assert.equal(await page.locator('.aid-course-unit').count(),8,current+' directory');
     const courseWidth=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(courseWidth<=1,current+' page overflow '+courseWidth);
     for(const lesson of module.lessons){current=mode+' '+width+' '+lesson.id;await visit(lesson.course,lesson.id);
      for(const tab of ['explain','lab','exercise','sources']){await page.locator('#aid-tab-'+tab).click();await page.locator('#aid-panel-'+tab).waitFor({state:'visible'});result.panels++;}
      await page.locator('#aid-tab-lab').click();const trace=M.run(lesson.modelId);for(let i=0;i<trace.steps.length;i++){
       const frame=trace.steps[i];assert.equal(await page.locator('#aid-step-title').innerText(),frame.title,current+' title');assert.equal(await page.locator('[data-aid-line].is-active').getAttribute('data-aid-line'),String(frame.line));assert.equal(await page.locator('#aid-visual').getAttribute('data-extension-frame'),lesson.modelId+':'+i);result.frames++;
       if(i+1<trace.steps.length)await page.locator('[data-action="aid-next"]').click();
      }
      const first=E.definitions[lesson.modelId].params[0],settings=page.locator('.aid-parameter-settings');await settings.evaluate(el=>el.open=true);const input=page.locator('[data-aid-param="'+first.id+'"]'),value=first.type==='range'?(first.value===first.min?first.max:first.min):first.options.find(x=>String(x[0])!==String(first.value))[0];
      if(first.type==='select')await input.selectOption(String(value));else{await input.fill(String(value));await input.dispatchEvent('input');}assert.equal(await page.locator('#aid-visual').getAttribute('data-extension-frame'),lesson.modelId+':0');result.recomputations++;await settings.evaluate(el=>el.open=false);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,current+' lab page overflow');
      await page.locator('#aid-tab-exercise').click();await page.locator('#aid-answer').fill(String(lesson.exercise.expected));await page.locator('[data-action="aid-check"]').click();assert.match(await page.locator('#aid-feedback').innerText(),/通过/);await page.locator('#aid-reason').fill('QA '+lesson.id+' '+width);
     }
     const sample=module.lessons[0];await visit(sample.course,sample.id,true);await page.screenshot({path:path.join(output,mode+'-'+module.course.id+'-'+width+'.png'),fullPage:true});
   }}
   current=mode+' draft/history/download';await visit('cs234','cs234-return');await page.locator('#aid-tab-exercise').click();assert.equal(await page.locator('#aid-reason').inputValue(),'QA cs234-return 390');await page.reload();await page.locator('#aid-panel-exercise').waitFor();assert.equal(await page.locator('#aid-reason').inputValue(),'QA cs234-return 390');
   await page.locator('#aid-tab-lab').click();const stable=await page.locator('#aid-visual').getAttribute('data-extension-frame');await page.waitForTimeout(1200);assert.equal(await page.locator('#aid-visual').getAttribute('data-extension-frame'),stable,'no auto progression');
   await page.locator('[data-action="aid-play"]').click();await page.waitForFunction(frame=>document.querySelector('#aid-visual')?.dataset.extensionFrame!==frame,stable,{timeout:3000});await page.locator('[data-action="aid-play"]').click();
   const [downloaded]=await Promise.all([page.waitForEvent('download'),page.locator('[data-action="ext-code"]').click()]);assert.equal(downloaded.suggestedFilename(),'cs234-return.cjs');await downloaded.saveAs(path.join(output,mode+'-download.cjs'));
   for(const id of ['cs231n','arduino','lerobot']){await visit(id);const old=page.locator('.ext-originals');assert.ok(await old.count()>0,id+' prerequisites retained');await old.locator('summary').click();await old.locator('[data-action="ext-legacy"]').first().click();await page.locator('.teaching-player').waitFor();assert.match(page.url(),/\/legacy\//);await page.reload();await page.locator('.teaching-player').waitFor();}
   current=mode+' map';await page.goto(base);await page.locator('#lbb-course-prototype .nav-item[data-action="map"]').first().click();await page.waitForTimeout(100);const catalog=await page.evaluate(()=>CourseMapStatus.snapshot());for(const m of modules){const c=catalog.find(c=>c.id===m.course.id);assert.equal(c.kind,'authored',c.id);assert.equal(c.count,8,c.id);assert.equal(c.first,m.lessons[0].id,c.id);}
   current=mode+' existing courses';for(const [kind,id,lesson]of [['foundation','cs50p','cs50p-functions'],['application','hfagents','hfagents-loop']]){await page.goto(base+'?'+new URLSearchParams({[kind]:id,lesson}));await page.locator('[data-aid-lesson="'+lesson+'"]').waitFor();}
   const snapshot=await page.evaluate(()=>globalThis.LBBLearningEngine.snapshot());assert.equal(snapshot.tasks.length,0,'course visits do not adopt tasks');assert.equal(snapshot.sessions.length,0,'course visits do not add time');assert.equal(snapshot.entries.length,0,'no fabricated evidence');
   await context.close();
  }
  assert.equal(result.errors.length,0,JSON.stringify(result.errors));assert.equal(result.network.length,0,'no external runtime');fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }catch(e){fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({current,message:e.message,stack:e.stack,errors:result.errors},null,2));throw e;}finally{await browser.close();server.close();}
})().catch(e=>{console.error(current+'\n'+e.stack);server.close();process.exitCode=1;});
