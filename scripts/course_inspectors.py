"""Embed course-owned, dependency-free inspectors in the complete public reader."""
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parent.parent
COURSES=('cme295','cs336','cs146s','cs50p','tools','d2l','linear','probability','cs229','hfagents','fsdl','mit2007','modern','pid','kalman','ros','cs234','bonn','manipulation','nav2','moveit','cs224r','underactuated','cs231n','arduino','lerobot')

def transform(html):
    marker='  render();\n  if(globalThis.Tweak)'
    if html.count(marker)!=1:raise ValueError('Missing inspector startup marker')
    paths=[ROOT/'web/course-inspectors'/f'{course}.js' for course in COURSES]
    manifests=[ROOT/'docs/course-inspectors'/f'{course}.json' for course in COURSES]
    missing=[str(p) for p in (*paths,*manifests) if not p.is_file()]
    if missing and os.environ.get('LBB_ALLOW_PARTIAL_INSPECTORS')!='1':raise ValueError('Course inspector missing: '+', '.join(missing))
    paths=[p for p in paths if p.is_file()]
    scripts=[(ROOT/'web/course-inspector.js').read_text()]+[p.read_text() for p in paths]
    runtime='<!-- COURSE_INSPECTORS_START -->\n'+''.join('<script>\n'+s.replace('</script','<\\/script')+'\n</script>\n' for s in scripts)
    runtime+='<style>\n'+(ROOT/'web/course-inspector.css').read_text()+'\n</style>\n<!-- COURSE_INSPECTORS_END -->'
    html=html.replace('</head>',runtime+'</head>',1)
    return html.replace(marker,(ROOT/'web/course-inspector-integration.js').read_text()+'\n'+marker,1)
