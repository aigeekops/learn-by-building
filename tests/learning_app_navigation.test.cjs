const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/learning-app/navigation.js'),'utf8');
// Exercise the production location codec without browser APIs or runtime data.
function codec(){
 const context=vm.createContext({location:{hash:''},state:{view:'map'},rpById:{'robot-coordinates':{},'so101-bom-audit':{}},courses:{fsdl:{},pid:{}},nodes:{a3:{}},teachingUnits:{fsdl:[{id:'old-unit'}]},aidById:{'fsdl-one':{course:'fsdl'}},aidTabs:[['explain'],['lab'],['exercise'],['sources']],rfCourseTopics:{pid:'control'},rfAPI:{lessonFor:id=>id==='rf-one'?{topic:{id:'control'}}:null}});
 vm.runInContext(source.slice(0,source.indexOf('  function navigationTransient()'))+'\nglobalThis.parse=navigationParse;globalThis.hash=navigationHash;',context);
 return context;
}
test('public location codec accepts stable authored, robotics, legacy and global IDs',()=>{
 const c=codec();for(const hash of ['#learn/map','#learn/records','#learn/personal','#learn/projects/robot-coordinates','#learn/projects/so101-bom-audit','#learn/course/fsdl','#learn/lesson/fsdl/authored/fsdl-one/exercise','#learn/lesson/fsdl/legacy/old-unit','#learn/lesson/pid/robotics/rf-one/verify'])assert.equal(c.hash(c.parse(hash)),hash);
});
test('invalid, cross-course and prototype locations fall back without interpreting user data',()=>{
 const c=codec();for(const hash of ['#learn/not-a-view','#learn/course/__proto__','#learn/%E0%A4%A','#learn/map/private-note','#learn/map/a/b/c/d/e'])assert.equal(c.hash(c.parse(hash)),'#learn/map');
 for(const hash of ['#learn/lesson/fsdl/authored/unknown/exercise','#learn/lesson/fsdl/robotics/rf-one/lab','#learn/lesson/fsdl/legacy/old-unit/private-note'])assert.equal(c.hash(c.parse(hash)),'#learn/course/fsdl');
 assert.equal(c.parse('#old-anchor'),null);
});
test('location serialization excludes notes, personal routes and timer fields',()=>{
 const c=codec();assert.equal(c.hash({view:'records',note:'secret',routeId:'private',focus:{seconds:12},search:'private'}),'#learn/records');
});
