const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const adapterSource=fs.readFileSync(path.join(root,'web/robotics-foundations-integration.js'),'utf8');
const playerSource=fs.readFileSync(path.join(root,'web/robotics-foundations.js'),'utf8');
const topicIds=['mechanics','kinematics','control','estimation','ros'];
const topics=topicIds.map(id=>JSON.parse(fs.readFileSync(path.join(root,'config','robotics_foundations_'+id+'.json'),'utf8')));
const courseTopics={mit2007:'mechanics',modern:'kinematics',pid:'control',kalman:'estimation',ros:'ros'};
const storageKey='lbb-robotics-foundations-drafts-v1';

function mapHarness(){
  const calls=[],capture=[];
  const context={
    console,calls,state:{course:'mit2007',node:'mechanics',selected:1,view:'map'},
    courses:Object.fromEntries([...Object.entries(courseTopics),['cs50p','shared']].map(([id,node])=>[id,{node,localTeaching:true,sample:1,lessons:[['原有前置课']]}])),
    expansionById:Object.fromEntries(Object.keys(courseTopics).map(id=>[id,{course:id,node:courseTopics[id]}])),
    teachingUnits:Object.fromEntries(Object.keys(courseTopics).map(id=>[id,[{id:'old-'+id,title:'原有前置课'}]])),
    root:{addEventListener(type,callback,useCapture){if(type==='click'&&useCapture)capture.push(callback);}},
    main:{insertAdjacentHTML(){}},breadcrumbs:{},contextNav:{},
    button(){return '';},teachingButton(){return '';},esc:s=>s,
    activePersonal(){return null;},workbenchCall(){},
    renderCourse(){calls.push({kind:'original-course'});},
    renderLesson(){calls.push({kind:'original-lesson',course:context.state.course});},
    chrome(){},
    RoboticsFoundations:{
      configure(){},destroy(){},
      topicFor:id=>topics.find(topic=>topic.id===id),
      lessonFor:id=>{
        for(const topic of topics){const lesson=topic.lessons.find(l=>l.id===id);if(lesson)return {topic,lesson};}
        return null;
      },
      mountCourse(_host,topic){calls.push({kind:'foundation-course',topic:topic.id});},
      mountLesson(_host,topic,lesson){calls.push({kind:'foundation-lesson',topic:topic.id,lesson:lesson.id});}
    }
  };
  // Existing map navigation contract: indexed workspace links pass selected;
  // explicit original-unit links and sample links pass through captured clicks.
  context.go=(view,course)=>{
    context.state.view=view;
    if(course){context.state.course=course;context.state.selected=context.courses[course].sample;}
    context.chrome();
    if(view==='course')context.renderCourse();
    if(view==='lesson')context.renderLesson();
  };
  vm.createContext(context);vm.runInContext(adapterSource,context);
  function click(action,value){
    const button={dataset:{action,value}};
    const event={
      target:{closest:selector=>selector===`[data-action="${action}"]`?button:null},
      preventDefault(){},stopImmediatePropagation(){this.stopped=true;}
    };
    for(const handler of capture)handler(event);
    return event;
  }
  return {context,calls,click};
}

test('indexed workspace links select the matching new robotics lesson, not an original prerequisite',()=>{
  const {context,calls}=mapHarness();
  for(const [courseId,topicId]of Object.entries(courseTopics)){
    const topic=topics.find(t=>t.id===topicId);
    for(let index=0;index<topic.lessons.length;index++){
      // This is the retained openWorkspaceCourse(course,index) call sequence.
      context.go('course',courseId);
      context.state.selected=index+1;
      context.go('lesson');
      assert.equal(calls.at(-1).kind,'foundation-lesson');
      assert.equal(calls.at(-1).lesson,topic.lessons[index].id);
      assert.equal(context.state.rfLesson,topic.lessons[index].id);
    }
  }
});

test('original prerequisite links stay explicit while course, new-lesson and sample links clear legacy mode',()=>{
  const {context,calls,click}=mapHarness();
  context.go('course','mit2007');
  click('teaching-open','old-mit2007');context.state.selected=1;context.go('lesson');
  assert.equal(calls.at(-1).kind,'original-lesson');assert.equal(context.state.rfOriginal,true);

  click('rf-open','rf-motor-load');
  assert.equal(calls.at(-1).lesson,'rf-motor-load');assert.equal(context.state.rfOriginal,false);

  click('teaching-open','old-mit2007');context.go('lesson');
  assert.equal(calls.at(-1).kind,'original-lesson');
  context.go('course','mit2007');context.go('lesson');
  assert.equal(calls.at(-1).lesson,'rf-gears');

  click('teaching-open','old-mit2007');context.go('lesson');
  click('sample','mit2007');context.go('lesson','mit2007');
  assert.equal(calls.at(-1).lesson,'rf-gears');assert.equal(context.state.rfOriginal,false);

  context.go('lesson','cs50p');
  assert.equal(calls.at(-1).kind,'original-lesson');assert.equal(calls.at(-1).course,'cs50p');
});

test('saving an observation uses the active route and rejects courses outside that route',async()=>{
  const {context,click}=mapHarness(),writes=[];
  let profile={id:'route-a',courseIds:['mit2007']};
  context.activePersonal=()=>profile;
  context.workbenchCall=async(method,args)=>writes.push({method,args});
  click('rf-open','rf-gears');
  await context.rfRecord(topics[0].lessons[0],{description:'明确提交的计算观察'});
  assert.equal(writes.length,1);assert.equal(writes[0].args.profile.id,'route-a');assert.equal(writes[0].args.courseId,'mit2007');assert.equal(writes[0].args.lessonId,'rf-gears');
  profile={id:'route-b',courseIds:['modern']};
  await assert.rejects(()=>context.rfRecord(topics[0].lessons[0],{description:'不属于这条路线'}),/包含本课程/);
  assert.equal(writes.length,1);
});

function sharedStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),values};
}
function playerTab(storage){
  const context={
    console,localStorage:storage,
    RoboticsFoundationModels:require('../web/robotics-foundations-mechanics.js'),
    AbortController,setTimeout,clearTimeout,URL,
    addEventListener(){},document:{addEventListener(){}}
  };
  vm.createContext(context);vm.runInContext(playerSource,context);
  context.RoboticsFoundations.configure({topics:[topics[0]]});
  return context.RoboticsFoundations;
}
function host(){
  const elements=new Map(),listeners=new Map();let markup='';
  const decode=value=>value.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  const make=(selector,value='')=>{
    const field=selector.match(/^\[data-rf-field="([^"]+)"\]$/)?.[1];
    return {value,textContent:'',innerHTML:'',dataset:field?{rfField:field}:{},setAttribute(){},matches:query=>query==='[data-rf-field]'&&!!field};
  };
  return {
    set innerHTML(value){
      markup=value;elements.clear();
      for(const match of value.matchAll(/<textarea\b[^>]*data-rf-field="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g)){
        const selector=`[data-rf-field="${match[1]}"]`;elements.set(selector,make(selector,decode(match[2])));
      }
      for(const match of value.matchAll(/<input\b[^>]*data-rf-field="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g)){
        const selector=`[data-rf-field="${match[1]}"]`;elements.set(selector,make(selector,decode(match[2])));
      }
    },
    get innerHTML(){return markup;},
    querySelector(selector){if(!elements.has(selector))elements.set(selector,make(selector));return elements.get(selector);},
    addEventListener(type,callback,options={}){
      if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(callback);
      options.signal?.addEventListener('abort',()=>listeners.get(type)?.delete(callback),{once:true});
    },
    fill(field,value){
      const element=this.querySelector(`[data-rf-field="${field}"]`);element.value=value;
      for(const callback of listeners.get('input')||[])callback({target:element});
    },
    field(field){return this.querySelector(`[data-rf-field="${field}"]`).value;},
    result(){return JSON.parse(this.querySelector('.rf-result').textContent);}
  };
}

test('two concurrently loaded tabs retain different lessons, fields and parameters',()=>{
  const initialGear={params:{driver:30},prediction:'旧的齿轮预测',answer:'0.8',reason:'旧的解释'};
  const storage=sharedStorage({[storageKey+':rf-gears']:JSON.stringify(initialGear)});
  // Both tabs load before either writes, reproducing the stale whole-object race.
  const tabA=playerTab(storage),tabB=playerTab(storage),hostA=host(),hostB=host();
  tabA.mountLesson(hostA,topics[0],topics[0].lessons[0]);
  assert.equal(hostA.field('prediction'),'旧的齿轮预测');assert.equal(hostA.result().ratio,2);
  hostA.fill('prediction','A页的齿轮预测');hostA.fill('reason','A页的新解释');
  tabB.mountLesson(hostB,topics[0],topics[0].lessons[2]);hostB.fill('prediction','B页的配合预测');hostB.fill('answer','0.13');

  const freshA=playerTab(storage),restoredA=host();freshA.mountLesson(restoredA,topics[0],topics[0].lessons[0]);
  assert.equal(restoredA.field('prediction'),'A页的齿轮预测');assert.equal(restoredA.field('reason'),'A页的新解释');assert.equal(restoredA.field('answer'),'0.8');assert.equal(restoredA.result().ratio,2);
  const freshB=playerTab(storage),restoredB=host();freshB.mountLesson(restoredB,topics[0],topics[0].lessons[2]);
  assert.equal(restoredB.field('prediction'),'B页的配合预测');assert.equal(restoredB.field('answer'),'0.13');
  assert.equal(storage.getItem(storageKey),null,'no stale aggregate write');
  for(const tab of [tabA,tabB,freshA,freshB])tab.destroy();
});

test('legacy aggregate drafts migrate per lesson without changing another lesson or overwriting newer data',()=>{
  const legacy={
    'rf-gears':{params:{driver:25},prediction:'旧聚合预测',reason:'旧聚合解释'},
    'rf-fit':{prediction:'另一节尚未迁移的草稿'}
  };
  const legacyText=JSON.stringify(legacy),storage=sharedStorage({[storageKey]:legacyText});
  const first=playerTab(storage),oldHost=host();first.mountLesson(oldHost,topics[0],topics[0].lessons[0]);
  assert.equal(oldHost.field('prediction'),'旧聚合预测');assert.equal(oldHost.result().ratio,2.4);
  oldHost.fill('prediction','已迁移后的新预测');first.destroy();
  assert.equal(storage.getItem(storageKey),legacyText,'legacy aggregate remains available for unmigrated lessons');
  const second=playerTab(storage),newHost=host();second.mountLesson(newHost,topics[0],topics[0].lessons[0]);
  assert.equal(newHost.field('prediction'),'已迁移后的新预测','per-lesson entry wins over old aggregate');second.destroy();
  const third=playerTab(storage),fitHost=host();third.mountLesson(fitHost,topics[0],topics[0].lessons[2]);
  assert.equal(fitHost.field('prediction'),'另一节尚未迁移的草稿');third.destroy();
});
