#!/usr/bin/env python3
"""Build the complete learning app from repository-owned public sources."""
import argparse
import base64
import contextlib
import hashlib
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
SOURCE = ROOT / 'web/learning-app'
MARKER = '.learning-app-build'
DEFAULT = ROOT / 'dist/learning'
TAGS = re.compile(r'<(style|script)\b([^>]*)>(.*?)</\1>', re.S)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')


def calendar_runtime(name):
    """Keep the draft's 1–366 day plans without changing the legacy workbench."""
    text = (ROOT / 'web' / name).read_text()
    replacements = {
        'static-plan.js': {"![7,14].includes(days)": "(!Number.isInteger(days)||days<1||days>366)"},
        'static-records.js': {
            '[7,14].includes(profile.days)': '(Number.isInteger(profile.days)&&profile.days>=1&&profile.days<=366)',
            'pt.day_index<=14': 'pt.day_index<=366',
        },
    }
    for before, after in replacements[name].items():
        if text.count(before) != 1:
            raise ValueError('个人路线日期校验已变化，请核对后更新构建适配：' + name)
        text = text.replace(before, after, 1)
    return text


def sidebar_branding():
    """Reuse the workbench's public repository link and verified author asset."""
    workbench = (ROOT / 'web/index.html').read_text()
    match = re.search(r'class="sidebar-repo" href="(https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)"', workbench)
    repository = ''
    if match:
        url = escape(match[1], quote=True)
        icon = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>'
        repository = '<a class="sidebar-repo" href="' + url + '" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 查看源码" title="' + url + '">' + icon + '</a>'
    content = ''
    author = json.loads((ROOT / 'web/author.json').read_text())
    if author.get('enabled') and author.get('name'):
        name = escape(author['name'])
        qr = ROOT / 'web/assets/wechat-qr.jpg'
        image = ''
        if author.get('qr_image') == '/assets/wechat-qr.jpg' and qr.is_file() and not qr.is_symlink():
            image = '<img width="72" height="72" src="data:image/jpeg;base64,' + base64.b64encode(qr.read_bytes()).decode() + '" alt="' + name + '微信公众号二维码">'
        content = image + '<div class="sidebar-author-copy"><b>' + name + '</b><span>' + ('微信扫码关注' if image else '微信搜索公众号') + '</span></div>'
    return '<section class="sidebar-links" aria-label="项目与作者"><div class="sidebar-author">' + content + repository + '</div></section>' if content or repository else ''


def assemble_source(destination):
    from scripts.build_static import public_configuration, public_value
    html = (SOURCE / 'layout.html').read_text()

    def expand(match):
        kind, name = match.groups()
        source = SOURCE / name
        if source.is_symlink() or not source.is_file():
            raise ValueError('页面模块必须为项目内普通文件：' + name)
        text = source.read_text().strip('\n')
        tag = 'style' if kind == 'STYLE' else 'script'
        return '<' + tag + '>\n' + text.replace('</script', '<\\/script') + '\n</' + tag + '>'

    html = html.replace('<!-- LEARNING_APP_BRANDING -->', sidebar_branding())
    html = re.sub(r'<!-- LEARNING_APP_(STYLE|SCRIPT) ([a-z][a-z0-9-]*\.(?:js|css)) -->', expand, html)
    if 'LEARNING_APP_' in html:
        raise ValueError('页面中仍有未展开的模块')
    (destination / 'learning-map-courses-integrated.html').write_text(html)
    engine = (SOURCE / 'data-engine.js').read_text()
    values = {
        '__LEARNING_APP_PUBLIC_CONFIG__': public_value(public_configuration()),
        '__LEARNING_APP_COURSE_LIST__': json.loads((ROOT / 'config/learning_app_catalog.json').read_text()),
    }
    for token, value in values.items():
        if engine.count(token) != 1:
            raise ValueError('记录引擎数据插槽缺失或重复：' + token)
        engine = engine.replace(token, encoded(value), 1)
    scripts = [calendar_runtime(name) for name in ('static-plan.js', 'static-records.js')]
    scripts += [(SOURCE / 'personal-schedule.js').read_text(), engine]
    engine_html = '<!doctype html><html><head><meta charset="utf-8"></head><body>'
    engine_html += ''.join('<script>\n' + js.replace('</script', '<\\/script') + '\n</script>' for js in scripts)
    engine_html += '</body></html>'
    (destination / 'learning-data-engine.html').write_text(engine_html)


def render():
    from scripts import refresh_learning_delivery as delivery
    with tempfile.TemporaryDirectory(prefix='learning-app-source-') as temporary:
        work = Path(temporary)
        source = work / 'source'
        source.mkdir()
        assemble_source(source)
        with contextlib.redirect_stdout(io.StringIO()):
            delivery.build(work / 'delivery', source)
        html = (work / 'delivery/index.html').read_text()
    html = re.sub(r'<title>.*?</title>', '<title>动手学 · 课程学习工作台</title>', html, count=1, flags=re.S)
    return html


def split_assets(html, destination):
    assets = destination / 'assets'
    assets.mkdir()
    inventory = []

    def replace(match):
        kind, attributes, text = match.groups()
        if kind == 'script' and re.search(r'\bsrc\s*=', attributes):
            raise ValueError('完整学习站不得自动加载外部脚本')
        suffix = 'css' if kind == 'style' else 'js'
        raw = text.encode()
        checksum = digest(raw)
        name = f'assets/{kind}-{len(inventory)+1:02d}-{checksum[:12]}.{suffix}'
        (destination / name).write_bytes(raw)
        inventory.append({'path': name, 'kind': kind, 'sha256': checksum, 'bytes': len(raw)})
        return (f'<link rel="stylesheet" href="./{name}">' if kind == 'style'
                else f'<script src="./{name}"></script>')

    result = TAGS.sub(replace, html)
    return result, inventory


def build(destination=DEFAULT):
    from scripts.build_static import ASSETS
    from scripts.integrate_foundation_draft import catalog
    from scripts.integrate_application_draft import catalog as application_catalog
    from scripts.integrate_extension_draft import catalog as extension_catalog
    from scripts.build_robotics_foundations import lesson_data
    if destination.is_symlink():
        raise ValueError('构建目录不能是符号链接')
    destination = destination.resolve()
    # Refuse source folders and directories whose ownership is unknown.
    if destination == ROOT or destination in ROOT.parents or destination.is_relative_to(ROOT / 'web') or destination.is_relative_to(ROOT / 'config'):
        raise ValueError('构建目录不能覆盖项目源码')
    if destination.is_symlink() or (destination.exists() and not (destination / MARKER).is_file()):
        raise ValueError('目标目录不是本脚本的构建产物，未覆盖')
    destination.parent.mkdir(parents=True, exist_ok=True)
    html = render()
    with tempfile.TemporaryDirectory(prefix='learning-app-build-', dir=destination.parent) as temporary:
        stage = Path(temporary)
        index, assets = split_assets(html, stage)
        for name in ('index.html', 'learning-map-courses-integrated.html'):
            (stage / name).write_text(index)
        (stage / 'standalone.html').write_text(html)
        for name in ASSETS:
            source = ROOT / 'web/assets' / name
            if source.is_file() and not source.is_symlink():
                shutil.copy2(source, stage / 'assets' / name)
        shutil.copy2(ROOT / 'LICENSE', stage / 'LICENSE')
        (stage / '.nojekyll').touch()
        (stage / MARKER).write_text('Generated by scripts/build_learning_app.py\n')
        ai = json.loads((ROOT / 'config/ai_courses.json').read_text())
        foundation = catalog()
        application = application_catalog()
        extension = extension_catalog()
        robotics = lesson_data()
        courses = {c['id']: sum(l['course'] == c['id'] for l in data['lessons'])
                   for data in (ai, foundation, application, extension) for c in data['courses']}
        topic_courses = {'mechanics': 'mit2007', 'kinematics': 'modern', 'control': 'pid',
                         'estimation': 'kalman', 'ros': 'ros'}
        courses.update({topic_courses[t['id']]: len(t['lessons']) for t in robotics['topics']})
        manifest = {'format': 'learning-app-build', 'version': 1, 'courses': courses,
                    'authored_lessons': sum(courses.values()), 'original_blocks': 48, 'ee_lessons': 24,
                    'index_sha256': digest(index.encode()), 'standalone_sha256': digest(html.encode()),
                    'assets': assets, 'personal_data_included': False}
        (stage / 'build-info.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        # Build and validate everything before replacing our own previous output.
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(stage, destination)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT)
    parser.add_argument('--serve', action='store_true', help='Build and preview on this computer.')
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    manifest = build(args.output)
    print(f"Built {manifest['authored_lessons']} lessons: {args.output.resolve()}", flush=True)
    if args.serve:
        import functools
        handler = functools.partial(SimpleHTTPRequestHandler, directory=str(args.output.resolve()))
        with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
            print(f'Local: http://127.0.0.1:{server.server_port}/', flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass


if __name__ == '__main__':
    main()
