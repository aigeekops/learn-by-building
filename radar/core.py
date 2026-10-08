"""Storage, configuration and shared helpers. Standard library only."""
import contextlib
import json
import os
from pathlib import Path
import sqlite3
import threading
import urllib.parse
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get('RADAR_DATA_DIR', ROOT / 'data'))
CONFIG = Path(os.environ.get('RADAR_CONFIG_DIR', ROOT / 'config'))
CONFIG_LOCK = threading.Lock()
UTC = timezone.utc

def now(): return datetime.now(UTC).isoformat()
def config(name):
    return json.loads((CONFIG / (name + '.json')).read_text())
def save_config(name, value):
    with CONFIG_LOCK:
        p = CONFIG / (name + '.json'); tmp = p.with_suffix('.tmp')
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n'); tmp.replace(p)
@contextlib.contextmanager
def connect():
    DATA.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATA / 'radar.db', timeout=30)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()

def init():
    from . import journal, plans, routes
    with connect() as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, track TEXT NOT NULL, stage TEXT DEFAULT '', due TEXT DEFAULT '', minutes INTEGER DEFAULT 30, state TEXT DEFAULT 'todo', evidence TEXT DEFAULT '', note TEXT DEFAULT '', source_url TEXT DEFAULT '', created_at TEXT, completed_at TEXT);
        CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, minutes INTEGER, note TEXT, created_at TEXT);
        ''')
        if 'electronics_unit' not in {r['name'] for r in db.execute('PRAGMA table_info(tasks)')}:
            db.execute("ALTER TABLE tasks ADD COLUMN electronics_unit TEXT DEFAULT ''")
        if 'ee_lesson' not in {r['name'] for r in db.execute('PRAGMA table_info(tasks)')}:
            db.execute("ALTER TABLE tasks ADD COLUMN ee_lesson TEXT DEFAULT ''")
        journal.init(db)
        plans.init(db)
        routes.init(db)

def canonical(url):
    """Normalize a resource link without fetching it."""
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ('https','http') or not p.netloc: raise ValueError('条目缺少有效原文链接')
    q = [(k,v) for k,v in urllib.parse.parse_qsl(p.query) if not k.lower().startswith('utm_') and k not in ('fbclid','gclid')]
    return urllib.parse.urlunsplit((p.scheme,p.netloc.lower(),p.path,urllib.parse.urlencode(q),''))