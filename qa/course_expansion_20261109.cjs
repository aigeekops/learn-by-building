/* New course content through actual map, reader, downloads and responsive layouts. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const build=path.resolve(process.env.EXPANSION_BUILD||'../../output/course-expansion-20261109/website');
const output=path.resolve(process.env.EXPANSION_QA_OUTPUT||'../../output/course-expansion-20261109/browser-qa');fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(build,'build-info.json'),'utf8'));
const modules=[
 ['d2l','foundation_d2l',8],['fsdl','application_fsdl',8],
 ['mit2007','robotics_foundations_mechanics',3],['modern','robotics_foundations_kinematics',3],
 ['pid','robotics_foundations_control',3],['kalman','robotics_foundations_estimation',3]
].map(([course,file,start])=>({course,data:require('../config/'+file+'.json'),start,robotics:file.startsWith('robotics_')}));
const server=http.createServer((req,res)=>{const filename=path.resolve(build,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!filename.startsWith(build+path.sep)||!fs.existsSync(filename)){res.writeHead(req.url==='/favicon.ico'?204:404);res.end();return;}res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(filename));});
const results=[];
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  for(const offline of [false,true])for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const base=offline?'file://'+path.join(build,'standalone.html'):`http://127.0.0.1:${server.address().port}/index.html`;
   const url=base+'?integration-qa=expansion-'+width+'-'+Number(offline);
   await page.goto(url);await page.locator('.learning-atlas').waitFor();
   const initial=await page.evaluate(()=>LBBLearningEngine.backup());
   const catalog=await page.evaluate(()=>CourseMapStatus.snapshot());
   for(const item of modules)assert.equal(catalog.find(row=>row.id===item.course).count,item.data.lessons.length,item.course+' map count');
   assert.equal(catalog.filter(row=>row.kind==='authored').reduce((sum,row)=>sum+row.count,0),manifest.authored_lessons);
   let checked=0,panelVisits=0,frames=0,downloads=0;
   for(const item of modules){
    // Verify the map's node and course action before opening its new lessons.
    await page.goto(url+'#learn/map');await page.locator('.learning-atlas').waitFor();
    const close=page.locator('#lbb-node-detail [data-action="close-node"]');
    if(await close.isVisible()){await close.click();await close.waitFor({state:'hidden'});}
    if(await page.locator('#atlas-expand-control').getAttribute('aria-expanded')!=='true')await page.locator('#atlas-expand-control').click();
    const node=page.locator('.learning-atlas [data-action="node"][data-value="plan-'+item.course+'"]:visible').first();
    await node.click();await page.locator('#lbb-node-detail [data-action="course"][data-value="'+item.course+'"]').click();
    await page.locator(item.robotics?'.rf-course-grid':'.aid-course-overview').waitFor();
    assert.equal(await page.locator(item.robotics?'.rf-course-grid [data-rf-action="open"]':'.aid-course-unit [data-action="aid-open"]').count(),item.data.lessons.length);
    for(const lesson of item.data.lessons.slice(item.start)){
     await page.goto(url+'#learn/course/'+item.course);await page.locator(item.robotics?'.rf-course-grid':'.aid-course-overview').waitFor();
     await page.locator(item.robotics?'[data-rf-action="open"][data-rf-value="'+lesson.id+'"]':'#lbb-main [data-action="aid-open"][data-value="'+lesson.id+'"]').click();
     await page.locator(item.robotics?'[data-rf-lesson="'+lesson.id+'"]':'[data-aid-lesson="'+lesson.id+'"]').waitFor();
     for(const tab of item.robotics?['explain','lab','code','practice','verify']:['explain','lab','exercise','sources']){
      await page.locator('#'+(item.robotics?'rf':'aid')+'-tab-'+tab).click();panelVisits++;
      assert.equal(await page.locator('#'+(item.robotics?'rf':'aid')+'-panel-'+tab).isVisible(),true);
      const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+2,main:document.querySelector('#lbb-main').scrollWidth>document.querySelector('#lbb-main').clientWidth+2}));
      assert.equal(overflow.page,false,lesson.id+' '+tab+' page overflow');assert.equal(overflow.main,false,lesson.id+' '+tab+' main overflow');
     }
     await page.locator('#'+(item.robotics?'rf':'aid')+'-tab-lab').click();
     const scene=item.robotics?'.rf-visual svg':item.course==='d2l'?'#fid-motion-scene svg':'#app-teaching-scene svg';
     await page.locator(scene).waitFor();
     if(!item.robotics){const note=await page.locator('.aid-model-note').innerText();assert.ok(!note.includes('Agent 决策是预设策略'),lesson.id+' keeps its course-specific execution explanation');}
     const play=page.locator(item.robotics?'[data-rf-action="play"]':'[data-action="aid-play"]');
     if(await play.count())assert.equal(await play.getAttribute('aria-pressed'),'false',lesson.id+' default paused');
     for(let step=0;step<3;step++){
      if(step)await page.locator(item.robotics?'[data-rf-action="next"]':'[data-action="aid-next"]').click();
      const markup=await page.locator(scene).evaluate(el=>el.outerHTML);assert.doesNotMatch(markup,/undefined|NaN|Infinity/);frames++;
      const bounds=await page.evaluate(robotics=>{const workspace=document.querySelector(robotics?'.rf-lab-workspace':'.aid-workspace'),main=document.querySelector('#lbb-main'),children=[...(robotics?workspace.querySelector('.rf-lab-grid'):workspace).children].map(el=>el.getBoundingClientRect());return {bottom:workspace.getBoundingClientRect().bottom,mainBottom:main.getBoundingClientRect().bottom,sideBySide:children.length>=2&&children[1].left>=children[0].right-2};},item.robotics);
      assert.ok(bounds.bottom<=bounds.mainBottom+3,lesson.id+' bounded workspace');assert.ok(bounds.sideBySide,lesson.id+' two-column workspace');
     }
     if(['d2l-convolution','fsdl-ethics','rf-beam-design','rf-rotation3d','rf-cascade-control','rf-kalman-2d'].includes(lesson.id)&&!offline){
      await page.screenshot({path:path.join(output,lesson.id+'-'+width+'.png')});
     }
     if(lesson.programs?.length){
      await page.locator('#aid-tab-explain').click();assert.match(await page.locator('.aid-programs').innerText(),/运行与验证/);
      const pending=page.waitForEvent('download');await page.locator('.aid-programs button').first().click();const download=await pending;
      const name=width+'-'+Number(offline)+'-'+lesson.id+'-'+download.suggestedFilename();const file=path.join(output,name);await download.saveAs(file);
      assert.equal(fs.readFileSync(file,'utf8'),fs.readFileSync(path.resolve(__dirname,'..',lesson.programs[0].path),'utf8'));downloads++;
     }
     checked++;
    }
   }
   const after=await page.evaluate(()=>LBBLearningEngine.backup());assert.deepEqual(after.tables,initial.tables,'browsing cannot certify or create learning records');assert.deepEqual(errors,[]);
   results.push({offline,width,newLessons:checked,panelVisits,inspectedFrames:frames,programDownloads:downloads,courses:manifest.courses,authoredLessons:manifest.authored_lessons,errors});
   await context.close();
  }
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,index_sha256:manifest.index_sha256,standalone_sha256:manifest.standalone_sha256,results},null,2)+'\n');console.log(JSON.stringify({passed:true,results:results.map(({courses,...row})=>row)},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
