#!/usr/bin/env python3
"""Build one complete learning page from the saved raw layout and current courses."""
import argparse
import contextlib
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import tempfile
import uuid

ROOT=Path(__file__).resolve().parent.parent
PAM=ROOT.parents[1]
RAW_SOURCE=PAM/'research/learning-map-20261108/layout-source'
DEFAULT_STAGE=PAM/'output/learning-delivery-staging-20261108'
DELIVERY_NAME='learning-map-courses-integrated.html'
PUBLISH_TARGETS=(
 PAM/'output/learning-unified-20261108/index.html',
 Path('/Users/bytedance/.codex/visualizations/2026/11/08/01a1ba7a-aa05-7d22-b7d8-d43060f03248')/DELIVERY_NAME,
 Path('/Users/bytedance/.codex/visualizations/2026/11/08/01a1bb29-4d02-7ee2-9841-644b864031b5')/DELIVERY_NAME,
)
MARKERS=('AI_DRAFT_INTEGRATION_START','FOUNDATION_DRAFT_START','APPLICATION_DRAFT_START','EXTENSION_DRAFT_START','ROBOTICS_FOUNDATIONS_ADAPTER_START','COURSE_MAP_STATUS_START')
RAW_EXCLUDE_MARKERS=(*MARKERS,'  const mappedTeaching = ','globalThis.LBBLearningEngine=methods;')

def sha(value):return hashlib.sha256(value).hexdigest()

def refresh_raw_snapshot(source=RAW_SOURCE,candidates=None):
 """Capture a newer unintegrated design; published deliveries are never raw input."""
 source=source.resolve();current=source/DELIVERY_NAME
 original=current.read_bytes()
 receipt_path=source/'source-receipt.json'
 receipt=json.loads(receipt_path.read_text()) if receipt_path.is_file() else {'files':[]}
 prior=next((row for row in receipt.get('files',[]) if row.get('name')==DELIVERY_NAME),{})
 prior_mtime=prior.get('source_mtime_ns',current.stat().st_mtime_ns)
 choices=[]
 for candidate in candidates if candidates is not None else PUBLISH_TARGETS[1:]:
  candidate=Path(candidate)
  if not candidate.is_file():continue
  payload=candidate.read_bytes();text=payload.decode()
  if any(marker in text for marker in RAW_EXCLUDE_MARKERS):continue
  if text.count('  const lessonInfo = {')!=1 or '  function renderMap(){' not in text:continue
  choices.append((candidate.stat().st_mtime_ns,candidate,payload))
 if not choices:return {'updated':False,'source_sha256':sha(original),'reason':'no unintegrated canonical design'}
 mtime,candidate,payload=max(choices,key=lambda row:row[0])
 if sha(payload)==sha(original) or mtime<=prior_mtime:return {'updated':False,'source_sha256':sha(original),'reason':'saved raw is current'}
 if candidate.read_bytes()!=payload:raise RuntimeError('地图原稿在快照期间变化，请重新构建')
 stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
 backups=source/'backups';backups.mkdir(exist_ok=True)
 backup=backups/(current.stem+'-'+sha(original)[:12]+'-'+stamp+current.suffix);backup.write_bytes(original)
 if receipt_path.is_file():shutil.copy2(receipt_path,backups/('source-receipt-'+stamp+'.json'))
 incoming=source/'.layout-source-incoming.html';incoming.write_bytes(payload)
 if current.read_bytes()!=original:incoming.unlink();raise RuntimeError('项目地图原稿出现并发修改，未覆盖')
 os.replace(incoming,current)
 row={'name':DELIVERY_NAME,'source':str(candidate),'bytes':len(payload),'sha256':sha(payload),'source_mtime_ns':mtime}
 receipt['files']=[r for r in receipt.get('files',[]) if r.get('name')!=DELIVERY_NAME]+[row]
 receipt['purpose']='Unintegrated layout source preserved before publishing complete courseware'
 receipt['last_updated_utc']=datetime.now(timezone.utc).isoformat()
 receipt['previous_layout_backup']=str(backup)
 receipt_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
 return {'updated':True,'source':str(candidate),'source_sha256':sha(payload),'backup':str(backup)}

def module(name):
 spec=importlib.util.spec_from_file_location('learning_delivery_'+name,ROOT/'scripts'/f'{name}.py')
 result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result

def bootstrap_ai(html,ai):
 """Install the first AI runtime; later refreshes use its incremental transform."""
 marker='  const lessonInfo = {'
 if html.count(marker)!=1 or 'AI_DRAFT_INTEGRATION_START' in html:raise ValueError('需要尚未接入AI的唯一原始课程结构')
 data=json.loads((ROOT/'config/ai_courses.json').read_text())
 adapter=(ROOT/'web/ai-draft-integration.js').read_text().replace('__AI_COURSE_DATA__',ai.encoded(data))
 html=html.replace(marker,'/* AI_DRAFT_INTEGRATION_START */\n'+adapter+'\n/* AI_DRAFT_INTEGRATION_END */\n'+marker,1)
 runtime='<!-- AI_COURSE_RUNTIME_START -->\n'
 for name in ai.MODULES:runtime+='<script>\n'+(ROOT/'web'/name).read_text().replace('</script','<\\/script')+'\n</script>\n'
 runtime+='<style>\n'+(ROOT/'web/ai-draft-integration.css').read_text()+'\n</style>\n<!-- AI_COURSE_RUNTIME_END -->'
 html=html.replace('</head>',runtime+'</head>',1)
 return ai.transform(html,data)

def validate(html):
 if html.count('<!-- COURSE_INSPECTORS_START -->')!=1 or html.count('<!-- COURSE_INSPECTORS_END -->')!=1:raise ValueError('逐格教学运行时缺失或重复')
 for marker in MARKERS:
  if html.count('/* '+marker+' */')!=1:raise ValueError('课件或地图模块缺失/重复：'+marker)
 for marker in ('  const mappedTeaching = ','globalThis.LBBLearningEngine=methods;','id="rf-foundation-runtime"'):
  if html.count(marker)!=1:raise ValueError('原教学、记录引擎或机器人运行时缺失/重复：'+marker)
 if '<iframe' in html:raise ValueError('完整交付不得产生嵌套页面')
 for feature in ('preserveFullscreen:true','data-atlas-fullscreen','lbb-map-search'):
  if feature not in html:raise ValueError('最新地图布局功能丢失：'+feature)
 if 'fid-map-motion' in html:raise ValueError('已移除的地图动画大横幅重新出现')

def sync_plan_estimates(html):
 """Keep public future-plan estimates aligned with the installed lesson IDs."""
 rows,start,length=module('integrate_ai_draft').plan_rows(html)
 for row in rows:
  ids=[u['lesson_id'] for u in row.get('units',[]) if u.get('lesson_id')]
  if not ids:continue
  load=row.setdefault('study_load',{});prior=load.get('lesson_minutes',{})
  load['lesson_minutes']={key:prior.get(key,load.get('core_minutes',180)) for key in ids}
 return html[:start]+json.dumps(rows,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+html[start+length:]

def build(destination=DEFAULT_STAGE,source=RAW_SOURCE):
 destination=destination.resolve();source=source.resolve()
 if destination.exists() and not (destination/'.learning-delivery-build').is_file():raise ValueError('目标不是本脚本的生成目录，未覆盖')
 snapshot=refresh_raw_snapshot(source) if source==RAW_SOURCE.resolve() else {'updated':False,'reason':'explicit source'}
 before={str(p):sha(p.read_bytes()) for p in PUBLISH_TARGETS if p.is_file()}
 destination.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='learning-delivery-stage-',dir=destination.parent) as temporary:
  work=Path(temporary)
  preview=module('build_teaching_preview')
  with contextlib.redirect_stdout(io.StringIO()):preview.build(source,work)
  html=(work/'index.html').read_text()
  html=bootstrap_ai(html,module('integrate_ai_draft'))
  html=module('integrate_foundation_draft').transform(html)
  html=module('integrate_application_draft').transform(html)
  html=module('integrate_extension_draft').transform(html)
  html=module('build_robotics_foundations').integrate_html(html)
  html=module('refresh_animation_layout').replace_legacy(html)
  html=module('sync_course_map').transform(html)
  status_sources=(ROOT/'web/learning-map-course-status.js',ROOT/'web/learning-map-course-status.css')
  if all(p.is_file() for p in status_sources):html=module('sync_learning_map').transform(html)
  marker='  render();\n  if(globalThis.Tweak)'
  if html.count(marker)!=1:raise ValueError('Navigation startup marker missing or repeated')
  html=html.replace(marker,(ROOT/'web/learning-app/navigation.js').read_text()+'\n'+marker,1)
  html=module('course_inspectors').transform(html)
  html=sync_plan_estimates(html)
  validate(html)
  destination.mkdir(parents=True,exist_ok=True)
  (destination/'index.html').write_text(html)
  (destination/DELIVERY_NAME).write_text(html)
  for name in ('learning-data-engine.html','learning-workbench-standalone.html'):
   if (work/name).is_file():shutil.copy2(work/name,destination/name)
  (destination/'.learning-delivery-build').write_text('Generated by scripts/refresh_learning_delivery.py\n')
  receipt={'source':str(source/DELIVERY_NAME),'source_sha256':sha((source/DELIVERY_NAME).read_bytes()),
   'target':str(destination/DELIVERY_NAME),'sha256':sha(html.encode()),'bytes':len(html.encode()),
   'delivery_targets_at_build':before,'raw_snapshot':snapshot,'modules':list(MARKERS),'original_blocks':48,'ee_lessons':24,
   'iframe_count':0,'saved_learning_records_read_or_rewritten':False,
   'built_utc':datetime.now(timezone.utc).isoformat()}
  (destination/'delivery-build-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
  return receipt

def publish(destination=DEFAULT_STAGE,targets=None,allowed_targets=None):
 """Publish the reviewed stage only; preserve every previous file with a backup."""
 destination=destination.resolve()
 receipt=json.loads((destination/'delivery-build-receipt.json').read_text())
 payload=(destination/DELIVERY_NAME).read_bytes();validate(payload.decode())
 if sha(payload)!=receipt['sha256']:raise ValueError('staging在构建后变化，需重新构建与检查')
 allowed={p.resolve() for p in (allowed_targets or PUBLISH_TARGETS)}
 chosen=tuple(p.resolve() for p in (targets or PUBLISH_TARGETS))
 if len(set(chosen))!=len(chosen) or any(p not in allowed for p in chosen):raise ValueError('发布目标不在明确允许的交付文件清单内')
 records=[];incoming=[];committed=[]
 stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
 try:
  for target in chosen:
   if not target.is_file() or target.is_symlink():raise ValueError('发布目标必须是已有普通交付文件')
   previous=target.read_bytes();current=sha(previous)
   expected=receipt.get('delivery_targets_at_build',{}).get(str(target))
   if expected and current not in (expected,receipt['sha256']):raise RuntimeError('交付文件在staging构建后更新，未覆盖：'+str(target))
   if previous==payload:records.append({'target':str(target),'sha256':current,'unchanged':True});continue
   backup_dir=target.parent/'backups';backup_dir.mkdir(exist_ok=True)
   backup=backup_dir/(target.stem+'-before-learning-delivery-'+stamp+target.suffix);backup.write_bytes(previous)
   temp=target.with_name('.'+target.name+'.delivery-'+uuid.uuid4().hex+'.tmp');temp.write_bytes(payload);incoming.append(temp)
   records.append({'target':str(target),'previous_sha256':current,'sha256':receipt['sha256'],'backup':str(backup),'unchanged':False,'_previous':previous,'_incoming':temp})
  # Check the entire group before replacing the first file.
  for record in records:
   if not record['unchanged'] and sha(Path(record['target']).read_bytes())!=record['previous_sha256']:raise RuntimeError('交付文件发生并发修改，未发布')
  for record in records:
   if record['unchanged']:continue
   target=Path(record['target'])
   if sha(target.read_bytes())!=record['previous_sha256']:raise RuntimeError('发布前发生并发修改')
   os.replace(record['_incoming'],target);committed.append(record)
  if any(Path(r['target']).read_bytes()!=payload for r in records):raise RuntimeError('交付回读校验失败')
 except Exception:
  # Roll back only our own committed bytes, preserving a later concurrent edit.
  for record in reversed(committed):
   target=Path(record['target'])
   if target.read_bytes()==payload:
    rollback=target.with_name('.'+target.name+'.rollback-'+uuid.uuid4().hex+'.tmp');rollback.write_bytes(record['_previous']);os.replace(rollback,target)
  raise
 finally:
  for temp in incoming:
   if temp.exists():temp.unlink()
 public=[{k:v for k,v in r.items() if not k.startswith('_')} for r in records]
 result={'stage_sha256':receipt['sha256'],'targets':public,'verified_identical':True,'published_utc':datetime.now(timezone.utc).isoformat()}
 (destination/'delivery-publish-receipt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 return result

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--output',type=Path,default=DEFAULT_STAGE)
 p.add_argument('--source',type=Path,default=RAW_SOURCE)
 p.add_argument('--repository-source',action='store_true',help='Build the stage from the maintained web/learning-app sources.')
 p.add_argument('--publish',action='store_true',help='Publish an already built and reviewed stage; does not rebuild.')
 p.add_argument('--target',type=Path,action='append',help='Exact allowlisted delivery path; requires --publish.')
 args=p.parse_args()
 if args.target and not args.publish:p.error('--target requires --publish')
 if args.repository_source and args.publish:p.error('--repository-source builds a stage; publish the validated stage separately')
 if args.repository_source:
  with tempfile.TemporaryDirectory(prefix='learning-delivery-repository-') as temporary:
   source=Path(temporary)
   module('build_learning_app').assemble_source(source)
   result=build(args.output,source)
   result['source_kind']='repository'
   result['source_directory']=str(ROOT/'web/learning-app')
   (args.output/'delivery-build-receipt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 else:result=publish(args.output,args.target) if args.publish else build(args.output,args.source)
 print(json.dumps(result,ensure_ascii=False))
