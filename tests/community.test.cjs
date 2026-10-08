const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../web/community.js');
test('community targets accept only a repository and hide unconfigured features',()=>{
 assert.equal(C.repository('owner/course'),'https://github.com/owner/course');
 for(const url of ['https://evil.test/a/b','https://github.com/a/b/issues','https://u:p@github.com/a/b','https://github.com/a/b?q=x','https://github.com/a/b#x','https://github.com:443/a/b','a--b/repo',null])assert.equal(C.repository(url),'');
 const block={id:'python-data',title:'Python 数据'};
 assert.deepEqual(C.links({},'robotics',block,C.draft('robotics',block)),{});
 const links=C.links({repository:'owner/course',discussions_enabled:false},'robotics',block,C.draft('robotics',block));
 assert.equal(links.discussions,'');assert.equal(links.newDiscussion,'');assert(links.correction.startsWith('https://github.com/owner/course/issues/new?'));
});
test('course participation preserves its route and never embeds personal notes in URLs',()=>{
 const block={id:'python-data',title:'Python 数据',private_note:'DO NOT SHARE'},d=C.draft('robotics',block);
 assert(d.title.includes('robotics/python-data'));assert(d.body.includes('/?route=robotics&block=python-data#learn'));assert(!d.body.includes('DO NOT SHARE'));
 d.body+='PRIVATE DRAFT';
 const links=C.links({repository:'owner/course',discussions_enabled:true},'robotics',block,d),url=new URL(links.correction);
 assert.equal(url.searchParams.get('template'),'course-correction.yml');assert(url.searchParams.get('course').includes('robotics/python-data'));assert(!links.correction.includes('PRIVATE'));
 assert.equal(new URL(links.discussions).searchParams.get('q'),'"robotics/python-data"');
 for(const kind of ['help','share','correction'])assert(C.draft('robotics',block,kind).body.includes('（请填写）'));
});
