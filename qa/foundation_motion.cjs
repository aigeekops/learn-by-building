const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const draft=process.env.FOUNDATION_DRAFT_FILE||path.resolve(__dirname,'../../../output/learning-unified-20261108/index.html');
const output=path.join(path.dirname(draft),'foundation-qa');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
  for(const id of ['cs50p','tools','d2l']){
   await page.goto('file://'+draft+'?foundation='+id);await page.locator('.aid-course-grid').waitFor();
   await page.locator('.aid-course-start [data-action="aid-open"]').click();
   await page.locator('#aid-tab-lab').click();
   assert.equal(await page.locator('#fid-motion-stage').getAttribute('data-playing'),'false');
   const frame=await page.locator('#fid-motion-scene').getAttribute('data-frame');
   const markup=await page.locator('#fid-motion-scene').innerHTML();await page.locator('[data-action="aid-next"]').click();
   assert.notEqual(await page.locator('#fid-motion-scene').getAttribute('data-frame'),frame);
   assert.notEqual(await page.locator('#fid-motion-scene').innerHTML(),markup);
   const animations=await page.locator('#fid-motion-stage').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
   assert.equal(animations,0,id+' computed state does not require looping decoration');
   await page.locator('[data-action="aid-play"]').click();
   assert.equal(await page.locator('#fid-motion-stage').getAttribute('data-playing'),'true');
   await page.locator('[data-action="aid-play"]').click();
   assert.equal(await page.locator('#fid-motion-stage').getAttribute('data-playing'),'false');
   assert.equal(await page.locator('#fid-motion-stage').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0,id+' paused motion');
   await page.screenshot({path:path.join(output,id+'-visible-animation.png'),fullPage:true});
  }
  // Reproduce the user's scroll path: the explanation bottom used to hide playback.
  for(const width of [1100,390]){
   await page.setViewportSize({width,height:1000});
   await page.goto('file://'+draft+'?foundation=cs50p&lesson=cs50p-functions');await page.locator('#aid-tab-lab').waitFor();
   await page.locator('#lbb-main').evaluate(el=>el.scrollTop=el.scrollHeight);
   await page.locator('#aid-panel-explain [data-action="aid-tab"][data-value="lab"]').click();
   const visible=await page.evaluate(()=>{const m=document.getElementById('lbb-main').getBoundingClientRect(),p=document.querySelector('.aid-player').getBoundingClientRect(),s=document.getElementById('fid-motion-stage').getBoundingClientRect();return p.top>=m.top&&s.top>=m.top&&s.bottom<=m.bottom;});
   assert.equal(visible,true,width+' long-reading-to-visible-animation');
   await page.screenshot({path:path.join(output,'visible-animation-'+width+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);const result={courses:3,unnecessaryCSSAnimations:false,stepAndStateChange:true,manualPlayback:true,longReadingScrollRecovery:[1100,390],errors};
  fs.writeFileSync(path.join(output,'motion-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
