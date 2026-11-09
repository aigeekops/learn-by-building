#!/usr/bin/env python3
"""Produce reviewable per-lecture coverage from the actual public curriculum."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent

def report():
    data=json.loads((ROOT/'config/ai_courses.json').read_text())
    lectures=data['lessons']
    demos={d['modelId'] for l in lectures for d in l.get('demos',[{'modelId':l.get('modelId',l['id'])}])}
    sections=sum(len(l.get('sections',[])) for l in lectures)
    lines=['# 2026 AI 课程：逐讲课件与素材核对','',f"材料核对：{data['checked']}。当前共 {len(lectures)} 讲配套课件、{sections} 个知识展开段落、{len(demos)} 个独立教学模型。",'',
      '本轮从首批九个知识点样章扩展为已公开材料的逐讲配套。统一采用 2026 年版；未公开或尚无可核实正文的场次留在待补清单。配套课件为原创中文教学，不是官方逐字翻译，也不等于已执行完整的 GPU 训练或线上 Agent 工程。','',
      '## 使用入口','',
      '- 主站 AI 学习路线 → 互动课件；静态站和本地 Python 服务均提供 `ai-courses.html`。',
      '- `python3 scripts/build_ai_courseware.py` 生成单文件离线课件和配套模型源码。打开 `interactive-courseware.html` 即可使用。',
      '- `node scripts/run_ai_demo.cjs --list` 列出所有讲次与模型；`node scripts/run_ai_demo.cjs compute \'{"mfu":0.25}\'` 用同一计算代码复算，输出步骤、变量和结果。离线交付目录内可用 `node run_ai_demo.cjs`。',
      '- 每讲依次提供通俗讲解、知识分节、带步骤算例、可播放/暂停/前后单步的计算与代码轨迹、参数控制、独立数值题、迁移验证和来源定位。一讲有多个演示时可直接切换。',
      '- 草稿按稳定讲次 ID 和演示模型分别保留，只在当前浏览器存储；不自动写主站学习完成记录、不累计时长、不生成掌握证明。原九个样章 ID 保留。','',
      '## 逐讲覆盖清单','']
    coverage=[]
    for course in data['courses']:
        lessons=[l for l in lectures if l['course']==course['id']]
        lines += [f"### {course['label']} · {course['edition']} · {len(lessons)} 讲",'', '| 原课讲次 | 配套课件 | 知识分节 | 演示 | 独立检验 |','| --- | --- | --- | --- | --- |']
        for l in lessons:
            names='、'.join(d.get('title',d['modelId']) for d in l.get('demos',[]))
            lines.append(f"| {l['unit']} | {l['title']} | {len(l.get('sections',[]))} | {names} | 数值复算 + 迁移任务 |")
            coverage.append({'id':l['id'],'course':l['course'],'unit':l['unit'],'title':l['title'],'sections':[s['title'] for s in l.get('sections',[])],
              'models':[d['modelId'] for d in l.get('demos',[])],'exercise':l['exercise']['prompt'],'independent_validation':l['exercise']['transfer'],
              'official_sources':[{'id':s,'url':data['sources'][s]['url'],'locator':data['sources'][s].get('locator',''),'status':data['sources'][s]['status']} for s in l['sources'] if data['sources'][s]['role']=='official']})
        lines+=['',course['pending'],'']
    lines += ['## 原始材料与访问边界','',
      '- [CME 295 来源核对](ai-cme295-2026-sources.md)：L1–L6 公开 PDF，L1–L5 视频/字幕；L6 视频仍待发布。',
      '- [CS336 来源核对](ai-cs336-2026-sources.md)：2026 官方代码或 PDF 与字幕；嘉宾讲座按实际取得的公开材料另列，未取得内容不补写成已发布课程。',
      '- [CS146S 来源核对](ai-cs146s-2026-sources.md)：按具体授课日期核对课件和官方转录；[CS146S_CN](https://github.com/Lucaswang81/CS146S_CN)仅为非官方中文辅助索引，2025 存档不混入 2026 制作。',
      '- 每讲“对照原课”标注页码、字幕时间点或代码小节，以及实际取得/未取得状态。未取得正文的官方代码入口不声称复现通过。',
      '- 原始 PDF、全文字幕与用户存档留在课件项目之外的本地素材目录，公开构建只包含原创内容和来源元数据。第三方材料保持各自权利。','',
      '## 计算、动画和真实实验的区别','',
      '浏览器运行确定性、小规模的原创数学或内存状态模型，并回放实际计算出的步骤快照。代码区显示对应核心摘录；完整可运行代码与命令行入口随包提供。预设 Agent 决策、人工 token 费用、硬件成本估计均在具体演示中明确说明。', '',
      'GPU 性能模型不是跑分；小型训练目标计算不是完整模型训练；内存工具不是线上服务；状态回放不是实际部署日志。动手练习给出新输入、明确结果和独立验证条件，完整官方实验通过每讲来源连接。','',
      '## 验证','',
      '模型独立测试核对黄金数值、数学不变性、停止/失败分支和控件边界。统一检查确保每讲具备知识分节、演示、可对应的代码、数值练习、迁移任务和官方来源。浏览器检查覆盖三种屏宽、多演示切换、前后单步、播放/暂停、草稿恢复、练习导出、离线打开和 Python 服务的严格 CSP。实际运行结果随交付目录中的 `validation.json` 保存。','']
    (ROOT/'docs/ai-courseware-2026.md').write_text('\n'.join(lines))
    payload={'checked':data['checked'],'material_year':2026,'lectures':len(lectures),'sections':sections,'unique_models':len(demos),'coverage':coverage}
    (ROOT/'docs/ai-courseware-coverage.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    return {k:payload[k] for k in ('lectures','sections','unique_models')}

if __name__=='__main__': print(json.dumps(report(),ensure_ascii=False))
