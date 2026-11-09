/* Verify the local Python allowlist and strict CSP without initializing a database. */
const {spawn}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source="from http.server import ThreadingHTTPServer\nfrom server import Handler\ns=ThreadingHTTPServer(('127.0.0.1',0),Handler)\nprint(s.server_port,flush=True)\ns.serve_forever()";
(async()=>{
 const server=spawn(process.env.PYTHON||'python3',['-u','-c',source],{stdio:['ignore','pipe','pipe']});let browser;
 try{
  const port=await new Promise((resolve,reject)=>{const deadline=setTimeout(()=>reject(Error('Server readiness timeout')),8000);server.once('error',reject);server.stdout.once('data',b=>{clearTimeout(deadline);resolve(Number(b.toString().trim()))});server.once('exit',code=>reject(Error('Server exited '+code)))});
  assert.ok(Number.isInteger(port)&&port>0);browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:950},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const response=await page.goto(`http://127.0.0.1:${port}/ai-courses.html#compute`);assert.ok(response.headers()['content-security-policy'].includes("style-src 'self'"));
  await page.locator('#aic-tab-watch').click();let steps=0;while(await page.locator('#aic-next').isEnabled()&&steps++<20)await page.locator('#aic-next').click();
  const widths=await page.locator('.aic-segment').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width));assert.equal(widths.length,5);assert.ok(widths.every(w=>w>10));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pythonAllowlist:true,strictCSP:true,visualWidths:widths,errors}));
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
