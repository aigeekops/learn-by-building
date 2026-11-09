"""Embed only explicitly named original course programs; never inspect runtime data."""
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
ALLOWED={
    'examples/foundation-d2l/train.py',
    'examples/foundation-d2l/distributed_train.py',
    'examples/application-fsdl/full_project.py',
}


def embed_programs(lessons):
    for lesson in lessons:
        for program in lesson.get('programs',[]):
            relative=program['path']
            if relative not in ALLOWED:
                raise ValueError('课程程序不在公开允许清单：'+relative)
            path=ROOT/relative
            if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(ROOT/'examples'):
                raise ValueError('课程程序路径无效：'+relative)
            program['content']=path.read_text()
            program['filename']=path.name
    return lessons
