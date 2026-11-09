#!/usr/bin/env python3
"""Refresh the existing map's content availability without rewriting courseware."""
import argparse
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil

ROOT=Path(__file__).resolve().parent.parent
DEFAULT=ROOT.parents[1]/'output/learning-unified-20261108/index.html'
START='/* COURSE_MAP_STATUS_START */'
END='/* COURSE_MAP_STATUS_END */'

def transform(html):
    html=re.sub(re.escape(START)+r'.*?'+re.escape(END)+r'\n?','',html,flags=re.S)
    html=re.sub(r'<style id="course-map-status-style">.*?</style>\n?','',html,flags=re.S)
    marker='  const lessonInfo = {'
    if html.count(marker)!=1 or '  function renderMap(){' not in html:raise ValueError('未找到唯一地图结构，停止同步')
    source=(ROOT/'web/course-map-status.js').read_text()
    html=html.replace(marker,START+'\n'+source+'\n'+END+'\n'+marker,1)
    css=(ROOT/'web/course-map-status.css').read_text()
    return html.replace('</head>','<style id="course-map-status-style">'+css+'</style>\n</head>',1)

def build(target=DEFAULT):
    target=target.resolve();before=target.read_bytes();html=transform(before.decode())
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup=target.parent/'backups'/('before-course-map-sync-'+stamp+'.html');backup.parent.mkdir(exist_ok=True)
    if target.read_bytes()!=before:raise RuntimeError('地图有并发修改，请重新同步')
    shutil.copy2(target,backup)
    incoming=target.with_name('index.map-sync-incoming.html');incoming.write_text(html)
    if target.read_bytes()!=before:incoming.unlink();raise RuntimeError('地图在写入前更新，未覆盖新内容')
    os.replace(incoming,target)
    receipt={'target':str(target),'backup':str(backup),'previous_sha256':hashlib.sha256(before).hexdigest(),'sha256':hashlib.sha256(html.encode()).hexdigest(),'availability_source':'authored lesson catalogs at runtime','lesson_content_rewritten':False,'saved_records_rewritten':False,'completed_utc':datetime.now(timezone.utc).isoformat()}
    (target.parent/'course-map-sync-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    return receipt

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--target',type=Path,default=DEFAULT);args=p.parse_args();print(json.dumps(build(args.target),ensure_ascii=False))
