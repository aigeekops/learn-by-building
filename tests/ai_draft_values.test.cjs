const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../web/ai-draft-integration.js'),'utf8');
const start=source.indexOf('  function aidValueHTML(value){'),end=source.indexOf('  function aidMountWorkspace()',start);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ctx={aidEscape:esc,aidNumber:String};vm.createContext(ctx);vm.runInContext(source.slice(start,end)+';globalThis.formatValue=aidValueHTML',ctx);
test('word groups remain three compact rows instead of one line per character',()=>{
 const html=ctx.formatValue([['l','o','w'],['l','o','w'],['l','o','w','e','r']]);
 assert.equal((html.match(/<small>\[/g)||[]).length,3);assert.ok(html.includes('[&quot;l&quot;,&quot;o&quot;,&quot;w&quot;]'));
 assert.ok(html.includes('[&quot;l&quot;,&quot;o&quot;,&quot;w&quot;,&quot;e&quot;,&quot;r&quot;]'));assert.equal(html.includes('\n'),false);
});
test('flat arrays and scalars stay compact; nested values are complete and escaped',()=>{
 assert.equal(ctx.formatValue([1,2,3]),'<code>[1,2,3]</code>');assert.equal(ctx.formatValue(0),'<code>0</code>');assert.equal(ctx.formatValue(false),'<code>false</code>');
 const html=ctx.formatValue({title:'<script>alert(1)</script>',items:[1,2,3]});
 assert.ok(html.includes('&lt;script&gt;'));assert.equal(html.includes('<script>'),false);assert.ok(html.includes('[1,2,3]'));
});
