#!/usr/bin/env python3
"""Attach original teaching examples to the existing map, preserving stable IDs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# id: map course, model, model variant, concrete question
BLOCKS = {
 'python-first': ('cs50p','python','variables','修改 minutes 后，打印出来的值怎样变？'),
 'python-branches': ('cs50p','python','branches','循环里哪一个数会通过条件判断？'),
 'python-functions': ('cs50p','python','functions','参数进入函数后，返回值流向哪里？'),
 'python-files': ('cs50p','python','files','保存后再读取，为什么不能把字符串直接相加？'),
 'llm-basics': ('hfagents','retrieval','grounding','资料没有答案时，系统应该返回什么？'),
 'prompt-contract': ('hfagents','contract','prompt','任务、输入与验收条件怎样组成一份约定？'),
 'api-data': ('hfagents','contract','json','缺少必需字段时，请求应该在哪一步停下？'),
 'chat-state': ('hfagents','agent','history','工具失败后，是重试、停止还是继续编造结果？'),
 'search-baseline': ('hfagents','retrieval','keyword','查找关键词时，哪些片段真的命中？'),
 'search-chunks': ('hfagents','chunks','chunks','片段变长会怎样影响命中范围和来源？'),
 'search-answer': ('hfagents','retrieval','citation','回答中的判断能否回到具体证据？'),
 'search-evaluate': ('hfagents','retrieval','evaluation','召回更多片段是否一定提高答案质量？'),
 'tools-functions': ('hfagents','contract','tool','工具参数无效时，函数是否应该执行？'),
 'tools-workflow': ('hfagents','agent','workflow','固定流程与自行选择工具，哪里不同？'),
 'agent-loop': ('hfagents','agent','loop','给循环设预算后，它在哪一步停止？'),
 'agent-eval': ('hfagents','agent','evaluation','同一输入的成功轨迹与失败轨迹怎样对照？'),
 'service-first': ('fsdl','contract','service','本地接口如何把输入变成响应？'),
 'service-validation': ('fsdl','contract','validation','输入越界时为什么要在业务逻辑之前返回？'),
 'service-tests': ('fsdl','delivery','tests','只检查正常输入，会漏掉什么？'),
 'service-package': ('tools','delivery','environment','另一个目录缺依赖时，复现会停在哪？'),
 'project-scope': ('fsdl','delivery','scope','把作品缩小到一个问题，会减少哪些依赖？'),
 'project-reproduce': ('fsdl','delivery','reproduce','从空目录重放，怎样定位缺少的一步？'),
 'project-case': ('fsdl','delivery','case','失败案例如何限制结论的适用范围？'),
 'project-demo': ('fsdl','delivery','demo','演示一次成功与可重复交付有什么区别？'),
 'circuit-foundation': ('arduino','circuit','led','断开回路或增加电阻，LED 模型的电流怎样变？'),
 'measurement-basics': ('arduino','measurement','meter','测电压和测电流为什么不能使用相同接法？'),
 'python-data': ('cs50p','python','data','同一组读数怎样经过循环变成平均值？'),
 'engineering-tools': ('tools','delivery','environment','命令、路径与输入文件缺一项会怎样？'),
 'gpio': ('arduino','digital','button','按钮抖动为什么会被当成多次按下？'),
 'sensor-input': ('arduino','adc','sensor','模拟电压怎样变成离散的数字？'),
 'motor-drive': ('arduino','switch','motor','GPIO 控制信号与电机供电路径怎样分工？'),
 'nonblocking-control': ('arduino','digital','scheduler','等待时间较长时，程序还能及时检查按钮吗？'),
 'cad-sketch': ('mit2007','cad','sketch','尺寸变化后，孔的位置是否仍由约束确定？'),
 'cad-solid': ('mit2007','cad','solid','拉伸与去除材料怎样改变零件？'),
 'design-for-print': ('mit2007','cad','clearance','名义尺寸相等，为什么不一定装得进去？'),
 'assembly-review': ('mit2007','cad','assembly','间隙太小或壁厚不足，应修改哪一个尺寸？'),
 'ros-messages': ('ros','ros','topics','发布者、话题与订阅者怎样传递一条消息？'),
 'ros-frames': ('ros','transform','frames','传感器局部坐标怎样变到机器人坐标？'),
 'ros-simulation': ('ros','ros','simulation','控制命令、模型与传感器反馈怎样闭环？'),
 'ros-replay': ('ros','ros','replay','保留时间戳后，日志怎样重放同一事件？'),
 'robot-math': ('modern','transform','point','先旋转再平移，与先平移再旋转一样吗？'),
 'feedback': ('pid','pid','control','改变比例增益，响应速度与误差怎样变？'),
 'state-estimation': ('kalman','kalman','filter','测量更不可信时，估计应该更相信谁？'),
 'camera-calibration': ('cs231n','camera','projection','焦距与深度怎样改变同一个点的像素位置？'),
 'robot-learning': ('lerobot','dataset','policy','示范数据里，观测与动作应如何对应？'),
 'dataset-inspection': ('lerobot','dataset','alignment','动作错开一帧，会怎样破坏训练样本？'),
 'imitation-experiment': ('lerobot','imitation','fit','只看训练误差，能否判断策略对新输入有效？'),
 'portfolio': ('fsdl','delivery','robot','仿真结果、硬件测量和演示视频分别能证明什么？'),
}
EE = {
 'units':('circuit','units'), 'circuit':('circuit','loop'), 'meter':('measurement','meter'),
 'ohm':('circuit','ohm'), 'networks':('circuit','parallel'), 'divider':('circuit','divider'),
 'thevenin':('circuit','thevenin'), 'power':('power','battery'), 'rc':('rc','charge'),
 'inductor':('inductor','switch'), 'wave':('wave','sine'), 'filter':('filter','lowpass'),
 'diode':('circuit','led'), 'switch':('switch','gpio'), 'opamp':('opamp','saturation'),
 'motor':('switch','motor'), 'levels':('levels','levels'), 'logic':('logic','logic'),
 'state':('digital','button'), 'adc':('adc','sensor'), 'pwm':('pwm','duty'),
 'reference':('circuit','divider'), 'debug':('measurement','debug'), 'project':('digital','scheduler'),
}

def write(path,value):
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def main():
 report={'version':1,'date':'2026-11-08','retained_blocks':[], 'removed_associations':[],
         'principle':'保留能支撑地图的课程与资料，删除不相关的配套入口；不改写任务和成果历史。'}
 wrong={'assembly-review':'soldering','ros-simulation':'interface','ros-replay':'interface','state-estimation':'rc','dataset-inspection':'dc','portfolio':'interface'}
 for route in ('agent','robotics'):
  path=ROOT/'config'/f'{route}_curriculum.json'; data=json.loads(path.read_text())
  for month in data['months']:
   for b in month['blocks']:
    course,model,variant,question=BLOCKS[b['id']]
    b['teaching']={'id':b['id'],'map_course_id':course,'model':model,'variant':variant,
                   'question':question,'stage':month['stage'],'route':route,
                   'attribution':'本站原创算例与教学演示；原始课程作为配套阅读。'}
    if b['id'] in wrong:
     report['removed_associations'].append({'block':b['id'],'old_lab':wrong[b['id']],'reason':'原练习主题与当前学习目标不对应'})
     b['lab']=''
    report['retained_blocks'].append({'id':b['id'],'title':b['title'],'map_course_id':course,'model':model})
  write(path,data)
 path=ROOT/'config/ee_textbook.json'; data=json.loads(path.read_text())
 for lesson in data['lessons']:
  model,variant=EE[lesson['id']]
  lesson['teaching']={'id':'ee-'+lesson['id'],'map_course_id':'arduino','model':model,
   'variant':variant,'question':lesson['question'],'stage':'robotics-1','route':'robotics',
   'attribution':'本站原创理想模型；按本节公式理解适用条件，实物结果另行测量。'}
 write(path,data)
 index=ROOT/'study-resources/index.json'; data=json.loads(index.read_text())
 for r in data['resources']:
  if r['id']=='agentic-llm-textbook-chapter-map':
   r.update(map_course_ids=['hfagents','cme295','cs336'],reading_scope='当前路线优先第 9–13 章（Agent、工具与检索）；语言模型基础按需回补，行为与社会模拟不进入主线。',role='按需参考')
  elif r['id']=='cs146s-modern-software-dev-2026':
   r.update(map_course_ids=['cs146s','fsdl','tools'],reading_scope='历史整理稿，事实截止 2026-10-24；当前已发布课件与动画以 2026 课程专栏为准，不另建重复课程。',role='历史课程地图')
 write(index,data)
 report['retained_ee_lessons']=len(EE)
 report['resources']=[{'id':r['id'],'courses':r['map_course_ids'],'scope':r['reading_scope']} for r in data['resources']]
 write(ROOT/'docs/teaching-alignment-audit.json',report)
 print(json.dumps({'blocks':len(report['retained_blocks']),'ee_lessons':len(EE),'removed_associations':len(report['removed_associations'])}))

if __name__=='__main__':main()
