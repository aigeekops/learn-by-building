#!/usr/bin/env python3
"""Package allowlisted courseware as one offline HTML plus original model source."""
import argparse
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent


def build(destination):
    destination = Path(destination).resolve()
    if destination == ROOT or destination in ROOT.parents or destination in (ROOT/'web', ROOT/'config'):
        raise ValueError('输出目录不能覆盖源码')
    if destination.exists() and not (destination/'.ai-courseware-build').is_file():
        raise ValueError('输出目录已存在且不是课件构建产物，请选择空目录')
    data = json.loads((ROOT/'config/ai_courses.json').read_text())
    if data.get('material_year') != 2026:
        raise ValueError('只打包 2026 年课程')
    html = (ROOT/'web/ai-courses.html').read_text().replace('href="./?route=agent#learn"', 'href="#attention"')
    css = (ROOT/'web/ai-courses.css').read_text()
    models = (ROOT/'web/ai-course-models.js').read_text()
    reader = (ROOT/'web/ai-courses.js').read_text()
    # Only original source and the public catalog enter this artifact, never source archives or records.
    html = html.replace('<link rel="stylesheet" href="./ai-courses.css">', '<style>\n'+css+'\n</style>')
    html = html.replace('<link rel="stylesheet" href="./attention-workbench.css">', '<style>\n'+(ROOT/'web/attention-workbench.css').read_text()+'\n</style>')
    html = html.replace('<link rel="stylesheet" href="./course-inspector.css">', '<style>\n'+(ROOT/'web/course-inspector.css').read_text()+'\n</style>')
    for name in ('course-inspector.js','course-inspectors/cme295.js','course-inspectors/cs336.js','course-inspectors/cs146s.js'):
        html=html.replace('<script src="./'+name+'"></script>','<script>\n'+(ROOT/'web'/name).read_text().replace('</script','<\\/script')+'\n</script>')
    html = html.replace('<script src="./ai-course-models.js"></script>', '<script id="aic-embedded-data" type="application/json">'+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+'</script>\n<script>\n'+models.replace('</script','<\\/script')+'\n</script>')
    html = html.replace('<script src="./ai-courses.js"></script>', '<script>\n'+reader.replace('</script','<\\/script')+'\n</script>')
    for name in ('attention-workbench.js','ai-cme295-2026.js','ai-cs336-2026.js','ai-cs146s-2026.js'):
        source=(ROOT/'web'/name).read_text()
        html=html.replace('<script src="./'+name+'"></script>', '<script>\n'+source.replace('</script','<\\/script')+'\n</script>')
    destination.mkdir(parents=True, exist_ok=True)
    (destination/'interactive-courseware.html').write_text(html)
    shutil.copy2(ROOT/'web/ai-course-models.js', destination/'ai-course-models.js')
    for name in ('course-inspector.js','course-inspectors/cme295.js','course-inspectors/cs336.js','course-inspectors/cs146s.js'):
        target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/'web'/name,target)
    for name in ('attention-workbench.js','ai-cme295-2026.js','ai-cs336-2026.js','ai-cs146s-2026.js'):
        shutil.copy2(ROOT/'web'/name,destination/name)
    shutil.copy2(ROOT/'docs/ai-courseware-2026.md', destination/'source-and-teaching-notes.md')
    for name in ('ai-cme295-2026-sources.md','ai-cs336-2026-sources.md','ai-cs146s-2026-sources.md','ai-courseware-coverage.json'):
        shutil.copy2(ROOT/'docs'/name,destination/name)
    shutil.copy2(ROOT/'scripts/run_ai_demo.cjs',destination/'run_ai_demo.cjs')
    (destination/'ai-courses.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    (destination/'RUNNING.md').write_text('# 2026 互动课件\n\n双击 interactive-courseware.html 即可离线使用。全部计算在本机进行。\n\n安装 Node.js 后，可用同一份教学代码复算：\n\n```sh\nnode run_ai_demo.cjs --list\nnode run_ai_demo.cjs compute \'{"mfu":0.25}\'\n```\n\n先用 --list 查看每讲和演示模型的 ID；命令输出包含参数、逐步变量和结果。完整官方训练与外部工具实验的要求请按每讲来源链接操作，浏览器教学模型不冒充 GPU 跑分或线上服务。\n')
    (destination/'.ai-courseware-build').write_text('Generated from public courseware sources only\n')
    return destination/'interactive-courseware.html'


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,default=ROOT/'dist-courseware')
    print(build(parser.parse_args().output))
