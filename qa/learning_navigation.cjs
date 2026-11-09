// Isolated browser-history regression. Build first; never use a saved browser profile.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const build=path.resolve(process.env.NAVIGATION_BUILD||'/tmp/pam-navigation-build-20261108');
const cases=[['cme295','a3','authored'],['cs50p','plan-cs50p','authored'],['fsdl','plan-fsdl','authored'],['mit2007','plan-mit2007','robotics'],['cs231n','plan-cs231n','authored'],['nav2','plan-nav2','authored'],['linear','plan-linear','authored']];
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(build,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(build+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true}),results=[];
 try{for(const source of [origin+'/index.html','file://'+build+'/standalone.html'])for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:/,r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const base=source+'?integration-qa=nav-'+width+'-'+Date.now();
  const view=async v=>p.waitForFunction(v=>document.querySelector('#lbb-course-prototype')?.dataset.view===v,v);
  const location=()=>p.evaluate(()=>({hash:location.hash,length:history.length,state:history.state,title:document.querySelector('#lbb-main h1')?.textContent,tab:document.querySelector('#lbb-main [role="tab"][aria-selected="true"]')?.id}));
  async function click(selector){await p.locator(selector).first().evaluate(b=>b.click());await p.waitForTimeout(30);}
  async function map(){await click('.nav-item[data-action="map"]');await view('map');}
  async function course(id,node){await map();if(await p.locator('#atlas-expand-control').getAttribute('aria-expanded')!=='true')await click('#atlas-expand-control');await click('[data-action="node"][data-value="'+node+'"]');await click('#lbb-node-detail [data-action="course"][data-value="'+id+'"]');await view('course');}
  await p.goto('data:text/html,<h1>Previous site</h1>');await p.goto(base);await view('map');
  assert.equal((await location()).hash,'#learn/map');
  const initial=await p.evaluate(()=>LBBLearningEngine.backup());
  for(const [id,node,kind] of cases){
   await course(id,node);const directory=await location();assert.equal(directory.hash,'#learn/course/'+id);
   await click('#lbb-breadcrumbs [data-action="course"]');assert.equal((await location()).length,directory.length);
   await click(kind==='robotics'?'#lbb-main [data-rf-action="open"]':kind==='legacy'?'#lbb-main [data-action="teaching-open"]':'#lbb-main [data-action="aid-open"]');await view('lesson');
   const lesson=await location();assert.match(lesson.hash,new RegExp('^#learn/lesson/'+id+'/'+kind+'/'));
   if(kind!=='legacy'){
    const tabSelector=kind==='robotics'?'#rf-tab-practice':'#aid-tab-exercise';await click(tabSelector);const tab=await location();assert.notEqual(tab.hash,lesson.hash);
    await p.evaluate(()=>{const original=history.replaceState.bind(history);window.navigationReplaceCalls=0;history.replaceState=(...args)=>{window.navigationReplaceCalls++;return original(...args);};});
    await click(tabSelector);assert.equal((await location()).length,tab.length);assert.equal(await p.evaluate(()=>window.navigationReplaceCalls),0,'unchanged clicks must not write history');
    const draft=kind==='robotics'?'[data-rf-field="prediction"]':'#aid-reason';await p.locator(draft).fill('private-draft-do-not-put-in-url');
    await p.goBack();assert.equal((await location()).hash,lesson.hash);assert.equal((await location()).tab,lesson.tab);
    await p.goForward();assert.equal((await location()).hash,tab.hash);assert.equal((await location()).tab,tab.tab);assert.equal(await p.locator(draft).inputValue(),'private-draft-do-not-put-in-url');
    await p.reload();await view('lesson');assert.equal((await location()).hash,tab.hash);assert.equal((await location()).tab,tab.tab);assert.equal(await p.locator(draft).inputValue(),'private-draft-do-not-put-in-url');
    assert(!JSON.stringify((await location()).state).includes('private-draft'));
    await p.goBack();assert.equal((await location()).hash,lesson.hash);
   }else{await p.reload();await view('lesson');assert.equal((await location()).title,lesson.title);}
   await p.goBack();await view('course');assert.equal((await location()).hash,directory.hash);
   await p.goBack();await view('map');assert.equal(await p.locator('#atlas-expand-control').getAttribute('aria-expanded'),'true');
   await p.goForward();await view('course');await p.goForward();await view('lesson');assert.equal((await location()).title,lesson.title);
  }
  // Original exercises in upgraded courses must not turn into authored lessons.
  for(const [id,node,selector] of [['fsdl','plan-fsdl','app-legacy'],['cs50p','plan-cs50p','fid-legacy'],['mit2007','plan-mit2007','teaching-open']]){
   await course(id,node);await click('#lbb-main [data-action="'+selector+'"]');await view('lesson');const before=await location();assert.match(before.hash,/\/legacy\//);await p.reload();await view('lesson');assert.equal((await location()).title,before.title);await p.goBack();await view('course');await p.goForward();await view('lesson');assert.equal((await location()).title,before.title);
  }
  // Back from records returns to map; an open modal cannot survive navigation.
  await map();await click('.nav-item[data-action="records"]');await view('records');await click('[data-action="workspace-backup"]');await p.goBack();await view('map');assert.equal(await p.locator('#lbb-workspace-dialog').evaluate(d=>d.open),false);await p.goForward();await view('records');
  await click('[data-action="workspace-backup"]');await click('[data-action="workspace-dialog-close"]');await p.goBack();await view('map');
  for(const action of ['workspace','route-view','resources','projects']){
   await click('.nav-item[data-action="'+action+'"]');const before=await location();await p.reload();assert.equal((await location()).hash,before.hash);await p.goBack();await view('map');
  }
  const after=await p.evaluate(()=>LBBLearningEngine.backup());assert.deepEqual(after.tables,initial.tables,'navigation cannot create records, tasks, sessions or receipts');
  // Query entry remains usable, but canonical hash is authoritative on refresh.
  await p.goto(base+'&application=fsdl');await view('course');assert.equal((await location()).hash,'#learn/course/fsdl');await click('#lbb-main [data-action="aid-open"]');const queryLesson=await location();await map();await p.reload();await view('map');assert.equal((await location()).hash,'#learn/map');
  const lessonId=queryLesson.hash.split('/')[4];await p.goto(base+'&application=fsdl&lesson='+lessonId+'&inspect=1');await view('lesson');assert.equal((await location()).tab,'aid-tab-lab');
  await p.goto(base+'#learn/lesson/fsdl/authored/not-a-lesson/exercise');await view('course');assert.equal((await location()).hash,'#learn/course/fsdl');
  await p.evaluate(()=>{history.pushState(null,'','#foreign-anchor');history.pushState(null,'','#learn/course/fsdl');});await p.goBack();await view('map');assert.equal((await location()).hash,'#learn/map');
  // A real isolated personal route and pending timer make accidental activity
  // on restoration observable, rather than merely testing an empty database.
  await p.goto(base+queryLesson.hash);await view('lesson');
  const seeded=await p.evaluate(async()=>{
   const profile={id:crypto.randomUUID(),name:'Navigation regression',goal:'agent',courseIds:['fsdl'],startCourseId:'fsdl',currentCourseId:'fsdl',minutes:30,days:7,start:'2026-11-08',progression:'current',device:'browser',status:'active'};
   const adopted=await LBBLearningEngine.adopt(profile);profile.taskIds=adopted.taskIds;
   const key='lbb-personal-routes-v1:qa:'+new URLSearchParams(location.search).get('integration-qa');
   const focus={key:crypto.randomUUID(),taskId:adopted.taskIds[0],routeId:profile.id,seconds:17,running:false,started:0};
   localStorage.setItem(key,JSON.stringify({version:1,activeId:profile.id,items:[profile]}));localStorage.setItem(key+':focus-v2',JSON.stringify(focus));return {key,focus};
  });
  await p.reload();await p.waitForFunction(()=>document.querySelector('#lbb-personal-focus')?.textContent.includes('00:17'));
  const saved=await p.evaluate(()=>LBBLearningEngine.backup());await map();await p.goBack();await view('lesson');await p.goForward();await view('map');await p.reload();await view('map');
  assert.deepEqual((await p.evaluate(()=>LBBLearningEngine.backup())).tables,saved.tables,'restoration must not log activity for an adopted route');
  const retained=await p.evaluate(key=>JSON.parse(localStorage.getItem(key+':focus-v2')),seeded.key);assert.equal(retained.key,seeded.focus.key);assert.equal(retained.seconds,17);assert.equal(retained.running,false);
  assert.deepEqual(errors,[]);results.push({source:source.startsWith('file:')?'standalone-file':'http-assets',width,courses:cases.length,errors});await ctx.close();
 }
 console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
