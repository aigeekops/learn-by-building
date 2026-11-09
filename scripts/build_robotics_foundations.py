#!/usr/bin/env python3
"""Bundle original robotics lessons and integrate them without rebuilding another draft."""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import zipfile

ROOT=Path(__file__).resolve().parent.parent
TOPICS=('mechanics','kinematics','control','estimation','ros')
MODEL_FILES=tuple(f'robotics-foundations-{topic}.js' for topic in TOPICS)
ASSETS=(*MODEL_FILES,'robotics-foundations.js','robotics-foundations.css','robotics-foundations.html')
DEFAULT_OUTPUT=ROOT.parents[1]/'output/robotics-foundations-20261108'
DEFAULT_DRAFT=ROOT.parents[1]/'output/learning-unified-20261108/index.html'

def sha(value):return hashlib.sha256(value).hexdigest()
def json_script(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def script(value):return value.replace('</script','<\\/script')

def lesson_data():
    topics=[];ids=set()
    for topic_id in TOPICS:
        topic=json.loads((ROOT/'config'/f'robotics_foundations_{topic_id}.json').read_text())
        if topic['id']!=topic_id or len(topic['lessons'])<3:raise ValueError('专题标识或课数不完整：'+topic_id)
        for field in ('title','subtitle','courseLabel','officialUrl','scope','boundary'):
            if not topic.get(field):raise ValueError('专题字段缺失：'+field)
        for lesson in topic['lessons']:
            if lesson['id'] in ids:raise ValueError('重复课程标识：'+lesson['id'])
            ids.add(lesson['id'])
            for field in ('title','question','modelId','prerequisites','objectives','explanation','practice','sources','verification'):
                if not lesson.get(field):raise ValueError('单课字段缺失：'+lesson['id']+' '+field)
            if len(lesson['explanation'])<3:raise ValueError('单课中文讲解不足：'+lesson['id'])
            verification=lesson['verification']
            if not isinstance(verification['expected'],(int,float)) or not math.isfinite(verification['expected']) or not math.isfinite(verification['tolerance']) or verification['tolerance']<=0:raise ValueError('独立题数值或容差无效')
            if any(not source['url'].startswith('https://') for source in lesson['sources']):raise ValueError('原始来源必须为HTTPS')
            for local in lesson.get('localFiles',[]):
                path=(ROOT/local['path']).resolve()
                if not path.is_relative_to(ROOT/'examples/robotics-foundations') or not path.is_file() or path.is_symlink():raise ValueError('本地示例路径不在公开允许范围内')
                local['content']=path.read_text()
        topics.append(topic)
    checked=max((source.get('accessed','2026-11-08') for topic in topics for lesson in topic['lessons'] for source in lesson['sources']),default='2026-11-08')
    return {'version':1,'checked':checked,'title':'机器人共同基础','topics':topics,'policy':'本站原创配套教学；计算、离线回放、真实ROS/Gazebo与硬件证据分别报告。'}

def code_archive():
    files=[ROOT/'web'/name for name in (*MODEL_FILES,'robotics-foundations.js','robotics-foundations-integration.js')]
    files += [ROOT/'web/course-inspector.js',ROOT/'web/course-inspector.css']
    files += [p for c in ('mit2007','modern','pid','kalman','ros') if (p:=ROOT/'web/course-inspectors'/f'{c}.js').is_file()]
    files += [ROOT/'config'/f'robotics_foundations_{name}.json' for name in TOPICS]
    files += sorted((ROOT/'tests').glob('robotics_foundations_*.test.cjs'))
    files += sorted((ROOT/'examples/robotics-foundations').rglob('*'))
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
        def add(name,value):
            info=zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
            archive.writestr(info,value)
        add('README.txt','机器人基础课代码包\n\n所有页面模型均为原创确定性小模型。\n安装 Node.js 后运行：\n  node --test tests/robotics_foundations_*.test.cjs\n\nPython示例与ROS环境步骤见 examples/robotics-foundations/ 下各专题说明。\nROS/Gazebo真实环境需要另备；离线模型检查不代表真实ROS、DDS、Gazebo或硬件已验证。\n')
        for path in files:
            if not path.is_file() or path.is_symlink() or '__pycache__' in path.parts or path.suffix in ('.pyc','.DS_Store'):continue
            if path.stat().st_size>2*1024*1024:raise ValueError('公开例子意外过大：'+str(path))
            add(path.relative_to(ROOT).as_posix(),path.read_bytes())
    return out.getvalue()

def collect_data(include_zip=True):
    data=lesson_data()
    if include_zip:data['examplesZip']=base64.b64encode(code_archive()).decode('ascii')
    return data

def runtime(data):
    return 'globalThis.RoboticsFoundationData='+json_script(data)+';\n'+'\n'.join((ROOT/'web'/name).read_text() for name in (*MODEL_FILES,'robotics-foundations.js'))

def standalone_html(data):
    html=(ROOT/'web/robotics-foundations.html').read_text()
    html=html.replace('<link rel="stylesheet" href="./course-inspector.css">','<style>'+(ROOT/'web/course-inspector.css').read_text()+'</style>')
    for name in ('course-inspector.js',*(f'course-inspectors/{c}.js' for c in ('mit2007','modern','pid','kalman','ros'))):
        html=html.replace('<script src="./'+name+'"></script>','<script>'+script((ROOT/'web'/name).read_text())+'</script>')
    html=html.replace('<link rel="stylesheet" href="./robotics-foundations.css">','<style>'+ (ROOT/'web/robotics-foundations.css').read_text()+'</style>')
    for name in (*MODEL_FILES,'robotics-foundations.js'):
        html=html.replace(f'<script src="./{name}"></script>','')
    return html.replace('</body>','<script>\n'+script(runtime(data))+'\n</script></body>')

def integrate_html(html,data=None):
    data=data or collect_data()
    # Replace only our own marked blocks; preserve every other course and map edit.
    html=re.sub(r'<style id="rf-foundation-style">.*?</style>\n?','',html,flags=re.S)
    html=re.sub(r'<script id="rf-foundation-runtime">.*?</script>\n?','',html,flags=re.S)
    html=re.sub(r'/\* ROBOTICS_FOUNDATIONS_ADAPTER_START \*/.*?/\* ROBOTICS_FOUNDATIONS_ADAPTER_END \*/\n?','',html,flags=re.S)
    marker='  const lessonInfo = {'
    if html.count(marker)!=1 or 'lbb-course-prototype' not in html:raise ValueError('未找到唯一的现有地图课程结构，停止接入')
    css=(ROOT/'web/robotics-foundations.css').read_text()
    html=html.replace('</head>','<style id="rf-foundation-style">'+css+'</style>\n<script id="rf-foundation-runtime">\n'+script(runtime(data))+'\n</script>\n</head>',1)
    adapter=(ROOT/'web/robotics-foundations-integration.js').read_text()
    html=html.replace(marker,'/* ROBOTICS_FOUNDATIONS_ADAPTER_START */\n'+adapter+'\n/* ROBOTICS_FOUNDATIONS_ADAPTER_END */\n'+marker,1)
    # Update only definitions used by future plans; saved tasks and records are untouched.
    catalog_marker=',courseList='
    if catalog_marker in html:
        start=html.index(catalog_marker)+len(catalog_marker)
        rows,length=json.JSONDecoder().raw_decode(html[start:])
        course_topics={'mit2007':'mechanics','modern':'kinematics','pid':'control','kalman':'estimation','ros':'ros'}
        by_id={t['id']:t for t in data['topics']}
        for row in rows:
            topic=by_id.get(course_topics.get(row['id']))
            if not topic:continue
            row['course']=row['id'];row['phase']='首批机器人基础 · 本站原创配套教学'
            row['units']=[{'lesson_id':l['id'],'title':l['title'],'goal':l['question'],'output':'；'.join(l['objectives'])} for l in topic['lessons']]
        html=html[:start]+json_script(rows)+html[start+length:]
    return html

def build(destination,integrate=None):
    destination=destination.resolve()
    if destination.exists() and not (destination/'.robotics-foundations-build').is_file():raise ValueError('输出目录已存在且不是本课程构建目录')
    destination.mkdir(parents=True,exist_ok=True)
    data=collect_data();html=standalone_html(data)
    (destination/'index.html').write_text(html)
    (destination/'robotics-foundations-code.zip').write_bytes(base64.b64decode(data['examplesZip']))
    (destination/'robotics-foundations.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    (destination/'.robotics-foundations-build').write_text('Generated by scripts/build_robotics_foundations.py\n')
    receipt={'checked':data['checked'],'topics':{t['id']:len(t['lessons']) for t in data['topics']},'lessons':sum(len(t['lessons']) for t in data['topics']),'standalone':str(destination/'index.html'),'standalone_sha256':sha(html.encode()),'model_sha256':{name:sha((ROOT/'web'/name).read_bytes()) for name in MODEL_FILES},'validation':'Build and source inventory only; numerical and browser validation have separate results.'}
    if integrate:
        target=integrate.resolve();before=target.read_bytes();text=before.decode();merged=integrate_html(text,data)
        if target.read_bytes()!=before:raise RuntimeError('现有草稿在接入期间变化，请重试以保留更新')
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');backups=target.parent/'backups';backups.mkdir(exist_ok=True)
        backup=backups/('before-robotics-foundations-'+stamp+'.html');shutil.copy2(target,backup)
        incoming=target.with_name('index.robotics-incoming.html');incoming.write_text(merged)
        if target.read_bytes()!=before:incoming.unlink();raise RuntimeError('草稿出现并发修改，未覆盖目标')
        os.replace(incoming,target)
        receipt['integration']={'target':str(target),'backup':str(backup),'previous_sha256':sha(before),'sha256':sha(merged.encode()),'existing_map_and_course_ids_preserved':True,'iframes_added':0}
        (target.parent/'robotics-integration-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    (destination/'build-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    return receipt

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=DEFAULT_OUTPUT);p.add_argument('--integrate',type=Path,nargs='?',const=DEFAULT_DRAFT);args=p.parse_args()
    print(json.dumps(build(args.output,args.integrate),ensure_ascii=False))
