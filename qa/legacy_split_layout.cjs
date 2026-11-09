const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'config',n+'.json')));
const lessons=[...['agent','robotics'].flatMap(r=>read(r+'_curriculum').months.flatMap(m=>m.blocks)),...read('ee_textbook').lessons];
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<style>body{margin:0}#fixture{width:calc(100% - 48px);max-width:1100px;margin:20px auto;min-width:0}</style><main id="fixture"></main>');
  await page.addStyleTag({path:path.join(root,'web/course-teaching.css')});
  for(const name of ['course-teaching-models.js','course-teaching.js'])await page.addScriptTag({path:path.join(root,'web',name)});
  for(const [width,height] of [[1440,900],[1280,800],[390,844]]){
   await page.setViewportSize({width,height});
   for(const lesson of lessons){
    await page.evaluate(l=>{const host=document.getElementById('fixture');host.innerHTML=CourseTeaching.render(l.teaching,l.title);CourseTeaching.bind(host);},lesson);
    const layout=await page.evaluate(()=>{
     const left=document.querySelector('.teaching-visual').getBoundingClientRect(),right=document.querySelector('.teaching-explanation').getBoundingClientRect(),grid=document.querySelector('.teaching-grid').getBoundingClientRect(),workspace=document.querySelector('.teaching-workspace'),player=document.querySelector('.teaching-player');
     return {leftRight:right.left>=left.right-1,sameTop:Math.abs(left.top-right.top)<2,height:grid.height,bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,internalPan:workspace.scrollWidth>workspace.clientWidth+1,playerHeight:player.getBoundingClientRect().height};
    });
    assert.equal(layout.leftRight,true,lesson.id+' left/right');assert.equal(layout.sameTop,true,lesson.id+' shared top');assert.ok(layout.height<=420.1,lesson.id+' bounded workspace');assert.equal(layout.bodyOverflow,false,lesson.id+' page overflow');
    if(width===390)assert.equal(layout.internalPan,true,lesson.id+' internal horizontal view');
    await page.locator('[data-teach="reset"]').click();const before=await page.locator('.teaching-position').innerText();await page.locator('[data-teach="next"]').click();assert.notEqual(await page.locator('.teaching-position').innerText(),before,lesson.id+' step advances');
   }
  }
  // Nested values remain compact rows, rather than one array element per line.
  await page.evaluate(()=>{
   const vars={scalar:3,flat:['low','lower'],nested:[['low','lower'],['alpha','beta']],record:{words:['low','lower'],flags:{valid:true}}};
   TeachingModels.models.layoutFixture={controls:[],run(){return{controls:[],frames:[{title:'fixture',text:'layout fixture',code:'const words = input;',vars,scene:{kind:'flow',labels:['input','result'],current:0}}],exercise:{question:'result?',expected:3,unit:'',tolerance:0},boundary:'fixture'};}};
   const host=document.getElementById('fixture');host.innerHTML=CourseTeaching.render({id:'layout-fixture',model:'layoutFixture'},'nested values');CourseTeaching.bind(host);
  });
  const values=await page.locator('.teaching-variables dd').allTextContents();
  assert.equal(values[0],'3');assert.equal(values[1],'["low","lower"]');assert.equal(values[2],'[\n  ["low","lower"],\n  ["alpha","beta"]\n]');assert.equal(values[3],'{\n  "words": ["low","lower"],\n  "flags": {"valid":true}\n}');
  const whiteSpace=await page.locator('.teaching-variables dd').last().evaluate(el=>getComputedStyle(el).whiteSpace);assert.equal(whiteSpace,'pre');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({lessons:72,widths:[1440,1280,390],sideBySideAtAllWidths:true,boundedWorkspace:true,internalNarrowScreenPan:true,stepControls:true,compactCompleteValues:true,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
