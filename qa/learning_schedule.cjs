// Isolated browser regression for personal budgets and the full-viewport shell.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const build=path.resolve(process.env.SCHEDULE_BUILD||'dist/learning');
const output=path.resolve(process.env.SCHEDULE_QA_OUTPUT||'/tmp/lbb-schedule-browser');
fs.mkdirSync(output,{recursive:true});
// Public catalog after all delivery transforms; source catalog alone omits appended lessons.
const embeddedCatalog=fs.readFileSync(path.join(build,'standalone.html'),'utf8').match(/,courseList=(\[.*?\]),byId=Object\.fromEntries/);
assert(embeddedCatalog,'build contains its public course catalog');
const catalog=JSON.parse(embeddedCatalog[1]);
const estimatedMinutes=id=>{const course=catalog.find(c=>c.id===id);assert(course,'current catalog contains '+id);return course.units.reduce((sum,u)=>sum+(u.study_load?.core_minutes??course.study_load?.lesson_minutes?.[u.lesson_id]??course.study_load?.core_minutes??180),0);};
(async()=>{
  const server=http.createServer((req,res)=>{
    const file=path.resolve(build,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return;}
    try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),results=[];
  try{
    for(const offline of [false,true])for(const width of [1440,390]){
      const ctx=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
      p.on('pageerror',e=>errors.push(e.message));
      await p.route(/^https?:/,r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
      await p.goto((offline?'file://'+build+'/standalone.html':origin+'/index.html')+'?integration-qa=schedule-'+width+'-'+Date.now()+'#learn/personal');
      await p.waitForSelector('#lbb-personal-form');
      const shell=await p.locator('.app-frame').boundingBox();
      assert.equal(shell.x,0);assert.equal(shell.y,0);assert.equal(shell.width,width);assert.equal(shell.height,950);
      assert.equal(await p.locator('.sidebar-repo').getAttribute('href'),'https://github.com/aigeekops/learn-by-building');
      assert.match(await p.locator('.sidebar-author').textContent(),/极客行动/);
      assert(await p.locator('.sidebar-author img').evaluate(img=>img.complete&&img.naturalWidth>0));
      const before=await p.evaluate(()=>LBBLearningEngine.backup());
      await p.selectOption('#lbb-personal-direction','agent');
      await p.fill('#lbb-personal-days','60');await p.fill('#lbb-personal-date','2026-11-09');
      const previews=[];
      for(const minutes of [30,60,360]){
        await p.fill('#lbb-personal-minutes',String(minutes));
        await p.locator('button[form="lbb-personal-form"]').click();
        await p.waitForFunction(()=>document.querySelector('.personal-preview')?.textContent.includes('课程排入情况'));
        const statuses=await p.locator('.route-coverage-course').evaluateAll(rows=>rows.map(r=>[r.dataset.course,r.dataset.coverage]));
        // Independent budget arithmetic uses current authored lesson estimates, not old course lengths.
        let remaining=(60-Math.floor(60/7))*minutes;
        const expected=statuses.map(([id])=>{const total=estimatedMinutes(id),allocated=Math.min(remaining,total);remaining-=allocated;return allocated===total?'full':allocated?'partial':'not-scheduled';});
        assert.deepEqual(statuses.map(s=>s[1]),expected);
        assert.match(await p.locator('.route-calendar-detail>summary').textContent(),/全部 60 天/);
        await p.screenshot({path:path.join(output,(offline?'offline':'http')+'-'+width+'-'+minutes+'.png')});
        previews.push({minutes,statuses});
      }
      const after=await p.evaluate(()=>LBBLearningEngine.backup());
      assert.deepEqual(after.tables,before.tables,'preview must never create records');
      await p.locator('[data-action="personal-adopt"]').click();
      await p.waitForFunction(()=>document.querySelector('#lbb-course-prototype')?.dataset.view==='today');
      const adopted=await p.evaluate(()=>LBBLearningEngine.backup());
      const totalEstimate=previews.at(-1).statuses.reduce((sum,[id])=>sum+estimatedMinutes(id),0);
      assert.equal(adopted.tables.tasks.reduce((n,t)=>n+t.minutes,0),Math.min(totalEstimate,52*360)+8*360);
      assert.equal(adopted.tables.tasks.filter(t=>t.title.endsWith('每周复盘与调整')).length,8);
      assert(adopted.tables.tasks.every(t=>t.state==='todo'&&t.evidence===''));
      const daily=new Map();for(const t of adopted.tables.tasks)daily.set(t.due,(daily.get(t.due)||0)+t.minutes);
      assert([...daily.values()].every(n=>n<=360));
      const lastCourse=previews.at(-1).statuses.at(-1);
      if(lastCourse[1]==='full'){const lastLesson=catalog.find(c=>c.id===lastCourse[0]).units.at(-1);assert(adopted.tables.tasks.some(t=>t.title.includes(lastLesson.title)),'fully scheduled route includes its current final lesson');}
      const horizontal=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(horizontal<=1);
      assert.deepEqual(errors,[]);results.push({mode:offline?'offline':'http',width,previews,tasks:adopted.tables.tasks.length,errors});await ctx.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
