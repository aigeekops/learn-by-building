const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844}});
 let taskId;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8765/#learn');await page.waitForSelector('.practice');
  if(await page.locator('.stage').count()!==6)throw Error('Missing stages');
  await page.locator('.curriculum-details summary').first().click();
  if(await page.locator('.resource-list a:visible').count()!==18)throw Error('Missing first-month resources');
  await page.locator('[data-action=plan-task]').first().click();
  if(await page.locator('[name=evidence]').inputValue())throw Error('Invented evidence');
  if(!(await page.locator('[name=note]').inputValue()).includes('阶段验收'))throw Error('No acceptance note');
  await page.locator('[name=title]').fill('QA 路线实践');
  await page.locator('#form button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('dialog').open);
  let s=await page.request.get('http://127.0.0.1:8765/api/state').then(r=>r.json());
  const t=s.tasks.find(x=>x.title==='QA 路线实践');taskId=t.id;
  if(t.stage!=='agent-1'||t.state!=='todo'||t.evidence)throw Error('Template persistence failed');
  await page.locator('[data-action=track][data-id=robotics]').click();
  if(await page.locator('.practice').count()!==19)throw Error('Missing robotics practices');
  await page.locator('.curriculum-details summary').last().click();
  if(await page.getByRole('link',{name:'LeRobot 文档 ↗',exact:true}).count()!==1)throw Error('Missing LeRobot');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Expanded resource overflow');
  await page.screenshot({path:'learning-radar/qa/curriculum.png',fullPage:false});
  if(errors.length)throw Error(errors.join('\n'));
  console.log(JSON.stringify({templateSave:true,evidenceEmpty:true,resourcesVisible:true,mobileExpandedOverflow:false,errors}));
 }finally{if(taskId)await page.request.post('http://127.0.0.1:8765/api/tasks/delete',{data:{id:taskId}});await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
