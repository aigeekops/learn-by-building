#!/usr/bin/env python3
"""Package source/config and a consistent SQLite snapshot for private delivery."""
import argparse
import hashlib
import json
import shutil
import sqlite3
import tarfile
import tempfile
from datetime import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
SKIP={'.git','.venv-x','node_modules','__pycache__','.pytest_cache','data','qa','dist'}

def package(destination,include_data=False):
    destination=destination.resolve();destination.parent.mkdir(parents=True,exist_ok=True)
    if destination.exists():raise ValueError('Archive already exists')
    with tempfile.TemporaryDirectory(prefix='learn-by-building-package-') as tmp:
        stage=Path(tmp)/'learn-by-building';stage.mkdir()
        for source in ROOT.rglob('*'):
            rel=source.relative_to(ROOT)
            if any(part in SKIP for part in rel.parts) or source.is_symlink() or not source.is_file():continue
            if source.name=='.DS_Store' or source.suffix=='.pyc':continue
            if rel.as_posix()=='DELIVERY.md':continue  # always regenerated below with sanitized placeholders
            if source.name.startswith('.env'):continue
            if rel.parts[0]=='qa' and source.suffix in {'.png','.json'}:continue
            target=stage/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
        db=ROOT/'data'/'radar.db'
        if include_data and db.exists():
            (stage/'data').mkdir()
            with sqlite3.connect(db.as_uri()+'?mode=ro',uri=True) as src,sqlite3.connect(stage/'data'/'radar.db') as dst:src.backup(dst)
        (stage/'DELIVERY.md').write_text('''# 动手学 · Learn by Building 源码与迁移包

包含项目源码和路线配置。若使用 --with-data，则额外包含 SQLite 一致性快照。
不包含虚拟环境、Git 元数据、API 密钥、浏览器 Cookie、调试输出。
使用 --with-data 的包含个人学习记录，用于个人电脑迁移。
浏览器中的每日目标和未保存计时不会随此包迁移。

启动：`python3 server.py`。需要 Python 3.11+。

本机访问 http://127.0.0.1:8765 。通过 SSH 隧道访问：
`ssh -N -L 8876:127.0.0.1:8765 USER@HOST`
然后打开 http://127.0.0.1:8876 。

首次验证可运行 `python3 -m unittest discover -s tests -q`。
''')
        files=sorted(p for p in stage.rglob('*') if p.is_file())
        manifest=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(stage).as_posix()+'\n' for p in files)
        (stage/'MANIFEST.sha256').write_text(manifest)
        with tarfile.open(destination,'w:gz') as archive:archive.add(stage,arcname='learn-by-building')
    digest=hashlib.sha256(destination.read_bytes()).hexdigest()
    destination.with_suffix(destination.suffix+'.sha256').write_text(digest+'  '+destination.name+'\n')
    print(f'Archive: {destination}\nFiles: {len(files)}\nBytes: {destination.stat().st_size}\nSHA256: {digest}')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT.parent/'output'/('learn-by-building-'+datetime.now().strftime('%Y%m%d-%H%M%S')+'.tar.gz'))
    parser.add_argument('--with-data',action='store_true',help='Include the local SQLite learning records; only for moving to another machine of your own')
    args=parser.parse_args();package(args.output,args.with_data)
