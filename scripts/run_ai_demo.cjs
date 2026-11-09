#!/usr/bin/env node
/* Run the same original teaching computations used by the browser, without a browser. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const inRepository=fs.existsSync(path.join(__dirname,'../web/ai-course-models.js'));
const codeDir=inRepository?path.join(__dirname,'../web'):__dirname;
const configFile=inRepository?path.join(__dirname,'../config/ai_courses.json'):path.join(__dirname,'ai-courses.json');
const M=require(path.join(codeDir,'ai-course-models.js'));
for(const name of ['cme295','cs336','cs146s']){const extension=require(path.join(codeDir,`ai-${name}-2026.js`));(typeof extension==='function'?extension:extension.register)(M);}
const data=JSON.parse(fs.readFileSync(configFile,'utf8'));
try{
 const id=process.argv[2];
 if(!id||id==='--list'){
  console.log(data.lessons.map(l=>`${l.id}\t${l.course} ${l.unit}\t${l.title}\t${(l.demos||[{modelId:l.modelId||l.id}]).map(d=>d.modelId).join(', ')}`).join('\n'));
 }else{
  const lesson=data.lessons.find(l=>l.id===id),model=lesson?(lesson.modelId||lesson.demos?.[0]?.modelId||lesson.id):id;
  const params=process.argv[3]?JSON.parse(process.argv[3]):undefined;
  const trace=M.run(model,params);
  console.log(JSON.stringify({lecture:lesson?.title||null,...trace},null,2));
 }
}catch(e){console.error(e.message);process.exitCode=1;}
