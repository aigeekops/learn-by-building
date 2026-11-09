#!/usr/bin/env python3
"""Rebase retained teaching onto the newest unified map without changing its authoring files."""
import argparse,hashlib,json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
RAW_LAYOUT_SOURCE=ROOT.parents[1]/'research/learning-map-20261108/layout-source'
DEFAULT=RAW_LAYOUT_SOURCE

def safe_json(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')

def upgrade_course_cards(html):
 """Resolve authored courses before rendering a map node's course cards."""
 start=html.index('  function renderNodeDetail(')
 end=html.index('  function filterMap(){',start)
 section=html[start:end]
 if '/* LOCAL_COURSE_CARDS */' not in section:
  node_match=re.search(r'    const n = nodes\[(state\.node|nodeId)\];',section)
  if not node_match:raise ValueError('地图节点详情结构变化，未覆盖原始课程入口')
  needle=node_match.group(0)
  replacement='''    /* LOCAL_COURSE_CARDS */
    const registered = nodes['''+node_match.group(1)+'''];
    const localCourses = (registered.planIds||[]).filter(id=>courses[id]?.localTeaching&&courses[id].lessons?.length);
    const n = {...registered,courses:[...new Set([...(registered.courses||[]),...localCourses])]};
    if(localCourses.length===1&&registered.code===expansionById[localCourses[0]]?.label)n.kicker='本站配套课件 · 已整理';'''
  if needle not in section:raise ValueError('地图节点详情结构变化，未覆盖原始课程入口')
  section=section.replace(needle,replacement,1)
 section=section.replace('本站配套小课 · 可操作教学','本站配套课件 · 已整理')
 section=section.replace("button('课程地图 →','course',id)","button(c.localTeaching?'进入本站课件 →':'课程地图 →','course',id,Boolean(c.localTeaching))")
 if "进入本站课件 →" not in section:raise ValueError('地图节点未生成本站课件入口')
 html=html[:start]+section+html[end:]
 from importlib.util import spec_from_file_location,module_from_spec
 spec=spec_from_file_location('course_map_status_sync',ROOT/'scripts/sync_course_map.py')
 sync_map=module_from_spec(spec);spec.loader.exec_module(sync_map)
 return sync_map.transform(html)

def update_course_data(text,marker,blocks):
 start=text.index(marker)+len(marker)
 course_data,length=json.JSONDecoder().raw_decode(text[start:])
 for course in course_data:
  units=[b for b in blocks if b['teaching']['map_course_id']==course['id']]
  if units:
   course['course']=course['id'];course['phase']='本站配套教学'
   course['units']=[{'title':b['title'],'goal':b.get('intuition') or b['teaching']['question'],'output':b.get('acceptance') or b.get('practice','')} for b in units]
 return text[:start]+safe_json(course_data)+text[start+length:]

def load_layout_source(source):
 source=source.resolve();current=source/'learning-map-courses-integrated.html';html=current.read_text()
 integrated=('/* AI_DRAFT_INTEGRATION_START */','/* FOUNDATION_DRAFT_START */','/* ROBOTICS_FOUNDATIONS_ADAPTER_START */','  const mappedTeaching = ')
 if any(marker in html for marker in integrated):
  source=RAW_LAYOUT_SOURCE.resolve();current=source/'learning-map-courses-integrated.html';html=current.read_text()
  if any(marker in html for marker in integrated):raise ValueError('保存的地图原稿已被集成内容覆盖，停止重复注入')
 return source,current,html

def build(source,dest):
 source,current,html=load_layout_source(source)
 dest=dest.resolve();dest.mkdir(parents=True,exist_ok=True);blocks=[]
 for route in ('agent','robotics'):
  data=json.loads((ROOT/'config'/f'{route}_curriculum.json').read_text())
  for month in data['months']:
   for b in month['blocks']:blocks.append({**b,'kind':'block'})
 ee=json.loads((ROOT/'config/ee_textbook.json').read_text())
 for lesson in ee['lessons']:blocks.append({**lesson,'id':'ee-'+lesson['id'],'kind':'ee'})
 from importlib.util import spec_from_file_location,module_from_spec
 spec=spec_from_file_location('teaching_resources',ROOT/'radar/resources.py');mod=module_from_spec(spec);spec.loader.exec_module(mod)
 resources=mod.build(ROOT)['resources']
 addon=(ROOT/'web/map-teaching.js').read_text().replace('__MAPPED_TEACHING__',safe_json(blocks)).replace('__MAPPED_RESOURCES__',safe_json(resources))
 marker='  const lessonInfo = {'
 if marker not in html:raise ValueError('地图课程结构已变化，请重新核对接入位置')
 html=html.replace(marker,addon+'\n'+marker,1)
 for function,guard in [('renderCourse','if(courses[state.course]?.localTeaching){renderTeachingCourse();return;}'),('renderLesson','if(courses[state.course]?.localTeaching){renderTeachingLesson();return;}')]:
  needle='  function '+function+'(){';assert needle in html
  html=html.replace(needle,needle+'\n    '+guard,1)
 needle='  function chrome(){';assert needle in html
 html=html.replace(needle,needle+"\n    if(['course','lesson'].includes(state.view)&&courses[state.course]?.localTeaching){renderTeachingChrome();return;}",1)
 html=html.replace('(n.planIds||[]).map(id=>{const p=expansionById[id];','(n.planIds||[]).filter(id=>!courses[id]?.localTeaching).map(id=>{const p=expansionById[id];')
 # Cards for local foundation lessons must not inherit the three Stanford course names.
 html=html.replace("${id==='cme295'?'Transformer 与大模型':id==='cs146s'?'AI 软件工程':'从零构建语言模型'}","${esc(c.localTeaching?c.english:id==='cme295'?'Transformer 与大模型':id==='cs146s'?'AI 软件工程':'从零构建语言模型')}")
 html=html.replace('当前专题 · 可体验样例</span><h4>${c.label}',"${c.localTeaching?'本站配套小课 · 可操作教学':'当前专题 · 可体验样例'}</span><h4>${c.label}")
 html=html.replace("${p.course?'当前专题 · 可体验':esc(p.phase)}","${p.teaching?'配套基础 · 动画小课':p.course?'当前专题 · 可体验':esc(p.phase)}")
 html=html.replace('if(lesson&&lesson<=courses[c.course].lessons.length){state.selected=lesson;renderLessonPreview();save();}',"if(lesson&&lesson<=courses[c.course].lessons.length){state.selected=lesson;if(courses[c.course].localTeaching)go('lesson');else renderLessonPreview();save();}")
 html=upgrade_course_cards(html)
 runtime=''.join('<script>\n'+(ROOT/'web'/name).read_text().replace('</script','<\\/script')+'\n</script>' for name in ('course-teaching-models.js','course-teaching.js'))
 html=html.replace('<script>\n(() => {',runtime+'\n<script>\n(() => {',1)
 html=html.replace('</head>','<style>'+ (ROOT/'web/course-teaching.css').read_text()+'</style></head>',1)
 # A hidden record engine keeps the same browser storage and backed-up record schema.
 engine=source/'learning-data-engine.html'
 if engine.exists():
  text=engine.read_text()
  text=update_course_data(text,'courseList=',blocks)
  needle='  const methods={'
  handler='''  async function teachingObservation(body){
    const p=clean(body.profile);if(!p.courseIds.includes(body.courseId))throw Error('课程不属于当前路线');
    const s=await snapshot(),task=s.tasks.find(t=>routeOf(t)===p.id&&courseOf(t)===body.courseId);
    return api('journal/automatic',{source_key:'lesson:teaching:'+p.id+':'+body.lessonId,entry:{title:'教学观察：'+body.title,track:p.goal,learning_route:p.goal,stage:task?.stage||'',task_id:task?.id||'',kind:'experiment',evidence_type:'calculation',body:'[个人路线 '+p.id+']\\n'+(body.snapshot.description||JSON.stringify(body.snapshot,null,2)),links:[]}});
  }
'''
  assert needle in text;text=text.replace(needle,handler+needle+'teachingObservation,',1)
  (dest/engine.name).write_text(text)
  # Bundle the data methods into the same document: no iframe or second file is
  # needed for the delivered local draft, and the IndexedDB namespace is unchanged.
  export_marker="  addEventListener('message',async event=>{"
  assert export_marker in text
  text=text.replace(export_marker,'  globalThis.LBBLearningEngine=methods;\n'+export_marker,1)
  scripts=re.findall(r'<script[^>]*>(.*?)</script>',text,re.S)
  engine_runtime=''.join('<script>\n'+js.replace('</script','<\\/script')+'\n</script>' for js in scripts)
  html=html.replace('<script>\n(() => {',engine_runtime+'<script>\n(() => {',1)
  direct_call="async function workbenchCall(method,args={}){const engine=globalThis.LBBLearningEngine;if(!engine||!Object.hasOwn(engine,method))throw Error('学习数据暂未就绪，请刷新后重试。');return engine[method](args);}"
  original_call='async function workbenchCall(method,args={}){await ensureWorkbench();return sendWorkbench(method,args);}'
  assert original_call in html
  html=html.replace(original_call,direct_call,1)
 legacy=source/'learning-workbench-standalone.html'
 if legacy.exists():
  text=legacy.read_text();needle='  const methods={'
  if '  const courseList = ' in text:text=update_course_data(text,'  const courseList = ',blocks)
  if needle in text:
   text=text.replace(needle,"  const methods={teachingObservation:async body=>{const p=clean(body.profile);const response=await api('journal/automatic',{source_key:'lesson:teaching:'+p.id+':'+body.lessonId,entry:{title:'教学观察：'+body.title,track:p.goal,learning_route:p.goal,stage:'',kind:'experiment',evidence_type:'calculation',body:'[个人路线 '+p.id+']\\n'+(body.snapshot.description||JSON.stringify(body.snapshot,null,2)),links:[]}});return response;},",1)
  (dest/legacy.name).write_text(text)
 (dest/'index.html').write_text(html)
 receipt={'base':str(current),'base_sha256':hashlib.sha256(current.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(html.encode()).hexdigest(),'retained_blocks':48,'ee_lessons':24,'map_groups_with_original_teaching':len({b['teaching']['map_course_id'] for b in blocks}),'removed_wrong_lab_links':6,'standalone':str(dest/'index.html'),'record_engine':'embedded' if engine.exists() else 'external'}
 (dest/'teaching-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(receipt,ensure_ascii=False))

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=DEFAULT);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.source,a.output)
