/* Execute every course-owned inspector against real models and parameter bounds. */
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const M=require('../web/ai-course-models.js');
const UI=require('../web/course-inspector.js');
for(const name of ['ai-cme295-2026','ai-cs336-2026','ai-cs146s-2026','foundation-cs50p','foundation-missing','foundation-d2l','foundation-math','application-hfagents','application-fsdl','extension-course-models']){
 const api=require('../web/'+name+'.js');(typeof api==='function'?api:api.register)(M);
}
for(const name of ['mechanics','kinematics','control','estimation','ros'])require('../web/robotics-foundations-'+name+'.js');
const files={cme295:'ai_cme295_2026',cs336:'ai_cs336_2026',cs146s:'ai_cs146s_2026',cs50p:'foundation_cs50p',tools:'foundation_missing',d2l:'foundation_d2l',linear:'foundation_linear',probability:'foundation_probability',cs229:'foundation_cs229',hfagents:'application_hfagents',fsdl:'application_fsdl',mit2007:'robotics_foundations_mechanics',modern:'robotics_foundations_kinematics',pid:'robotics_foundations_control',kalman:'robotics_foundations_estimation',ros:'robotics_foundations_ros'};
const robotics=new Set(['mit2007','modern','pid','kalman','ros']);
function catalog(course){return JSON.parse(fs.readFileSync(path.join(root,'config',(files[course]||'extension_'+course)+'.json')));}
function modelIds(course){return [...new Set(catalog(course).lessons.flatMap(l=>l.demos?.map(d=>d.modelId)||[l.modelId||l.id]))];}
function specs(course,id){return robotics.has(course)?globalThis.RoboticsFoundationModels[id].controls.map(c=>({id:c.key,type:c.options?'select':'range',min:c.min,max:c.max,options:c.options?.map((x,i)=>[i,x]),value:c.value})):M.specs[id];}
function run(course,id,params={}){
 if(!robotics.has(course))return M.run(id,params);
 const model=globalThis.RoboticsFoundationModels[id],p=Object.fromEntries(model.controls.map(c=>[c.key,params[c.key]??c.value]));
 return {...model.run(p),params:p,model:id};
}
function checkCourse(course){
 const provider=require('../web/course-inspectors/'+course+'.js');assert.equal(provider.courseId,course);
 (globalThis.CourseInspectorProviders ||= {})[course]=provider;
 const ids=modelIds(course);let frames=0,cells=0,experiments=0;
 for(const id of ids){
  const model=provider.models[id];assert.ok(model,course+' missing '+id);assert.ok(model.intuition);
  const controls=specs(course,id),low=Object.fromEntries(controls.map(s=>[s.id,s.type==='range'?s.min:s.options[0][0]])),high=Object.fromEntries(controls.map(s=>[s.id,s.type==='range'?s.max:s.options.at(-1)[0]]));
  const cases=[{},low,high,...controls.flatMap(s=>s.type==='range'?[{[s.id]:s.min},{[s.id]:s.max}]:[{[s.id]:s.options[0][0]},{[s.id]:s.options.at(-1)[0]}])];
  for(const p of cases){
   const t=run(course,id,p),before=JSON.stringify(t),steps=t.steps||t.frames;
   steps.forEach((_,index)=>{
    const view=model.inspect(t,index);assert.ok(view.title&&view.cells?.length,course+'/'+id+' frame '+index);
    const finite=x=>{if(typeof x==='number')assert.ok(Number.isFinite(x),id+' nonfinite cell');else if(x&&typeof x==='object')Object.values(x).forEach(finite);};
    const unique=new Set();for(const c of view.cells){assert.ok(c.id&&!unique.has(c.id),id+' repeated cell');unique.add(c.id);assert.ok(c.label&&c.formula,id+' lacks semantic formula');assert.ok(Object.hasOwn(c,'value')&&c.value!==undefined,id+' undefined value '+c.id);finite(c);cells++;}frames++;
   });assert.equal(JSON.stringify(t),before,id+' inspector mutated trace');
  }
  assert.ok(model.experiments?.length||model.experimentBoundary,id+' lacks validation experiment');
  for(const e of model.experiments||[]){
    assert.ok(e.label&&e.prediction&&e.expectation&&typeof e.verify==='function',id+' incomplete experiment');const a=run(course,id,e.before),b=run(course,id,e.after);assert.equal(e.verify(a,b),true,course+'/'+id+'/'+e.id+' experiment mismatch');
    const allowed=new Set(specs(course,id).map(s=>s.id));for(const key of [...Object.keys(e.before||{}),...Object.keys(e.after||{})])assert.ok(allowed.has(key),id+' unknown experimental control '+key);
    assert.notDeepEqual(a.params,b.params,id+' experiment did not change any actual input');
    const s={trace:a,index:0};UI.render(course,s);UI.perform(course,s,'prepare',e.id,p=>run(course,id,p));UI.render(course,s);UI.perform(course,s,'apply','',p=>run(course,id,p));assert.ok(UI.render(course,s).includes('data-ci-verified="true"'),id+' UI experiment failed');experiments++;
  }
 }
 return {course,models:ids.length,lessons:catalog(course).lessons.length,framesChecked:frames,cellsChecked:cells,experiments};
}
const courses=Object.keys(files).concat(['cs234','bonn','manipulation','nav2','moveit','cs224r','underactuated','cs231n','arduino','lerobot']);
module.exports={checkCourse,modelIds,run,specs,catalog,courses};
if(require.main===module){
 const args=process.argv.slice(2),report=args[0]==='--report'?args[1]:null,chosen=report||!args.length?courses:args;
 const rows=chosen.map(checkCourse);
 if(report){const result={courses:rows.length,lessons:rows.reduce((n,c)=>n+c.lessons,0),models:rows.reduce((n,c)=>n+c.models,0),framesChecked:rows.reduce((n,c)=>n+c.framesChecked,0),cellsChecked:rows.reduce((n,c)=>n+c.cellsChecked,0),experiments:rows.reduce((n,c)=>n+c.experiments,0),courseReports:rows.map(r=>({...r,agent:'course_'+r.course}))};fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,courseReports:undefined}));}
 else rows.forEach(r=>console.log(JSON.stringify(r)));
}
