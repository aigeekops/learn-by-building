#!/usr/bin/env node
/* Run the exact deterministic models used by the foundation animations. */
const M=require('../web/ai-course-models.js');
for(const name of ['cs50p','missing','d2l','math'])require('../web/foundation-'+name+'.js')(M);
const modules=['cs50p','missing','d2l','linear','probability','cs229'].map(name=>require('../config/foundation_'+name+'.json'));
const lessons=modules.flatMap(x=>x.lessons),ids=new Set(lessons.map(l=>l.modelId||l.id));
try{
  const [id='--list',raw='{}']=process.argv.slice(2);
  if(id==='--list')console.log(JSON.stringify(modules.map(m=>({course:m.course.label,edition:m.course.edition,lessons:m.lessons.map(l=>({id:l.id,model:l.modelId||l.id,title:l.title}))})),null,2));
  else{
    if(!ids.has(id))throw Error('未知基础课模型；先运行 --list 查看可用模型。');
    const params=JSON.parse(raw);if(!params||typeof params!=='object'||Array.isArray(params))throw Error('参数必须为 JSON 对象。');
    console.log(JSON.stringify(M.run(id,params),null,2));
  }
}catch(error){console.error(error.message);process.exitCode=1;}
