"""Original teaching diagrams; all numbers use the article's ideal DC model."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[1] / 'web' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)
BLUE, INK, MUTED, ORANGE = '#4B6EF5', '#202B43', '#64748B', '#B45309'

def text(x, y, label, size=28, color=INK, anchor='start', weight=400):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{escape(label)}</text>'

def rect(x, y, w, h, fill='#F5F7FF', stroke='#DCE3FC', radius=16):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'

def line(x1, y1, x2, y2, color=INK, width=4):
    return f'<path d="M{x1},{y1} L{x2},{y2}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round"/>'

def dot(x, y, color=BLUE):
    return f'<circle cx="{x}" cy="{y}" r="6" fill="{color}"/>'

def resistor(x, top, color=INK):
    return f'<rect x="{x-12}" y="{top}" width="24" height="55" fill="white" stroke="{color}" stroke-width="4"/>'

def ground(x, y):
    return line(x,y,x,y+12)+line(x-20,y+12,x+20,y+12)+line(x-13,y+22,x+13,y+22)+line(x-5,y+32,x+5,y+32)

def arrow(x, y1, y2):
    return line(x,y1,x,y2,BLUE)+f'<path d="M{x-9},{y2-12} L{x},{y2} L{x+9},{y2-12}" fill="none" stroke="{BLUE}" stroke-width="4"/>'

def save(name, height, elements):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="750" height="{height}" viewBox="0 0 750 {height}"><rect width="750" height="{height}" fill="white"/><g font-family="PingFang SC, Microsoft YaHei, sans-serif">'+''.join(elements)+'</g></svg>'
    (OUT / f'{name}.svg').write_text(svg)

# 1. Physical topology, with explicit common reference and parallel load.
e=[text(30,52,'负载接入后，分压比例变了',36,weight=700),text(30,94,'理想直流模型 · 输入 5V · 原有电阻各 10kΩ',25,MUTED),rect(24,120,340,465),rect(386,120,340,465)]
e += [text(194,164,'没有额外负载',30,BLUE,'middle',700),text(556,164,'并联一个 10kΩ 负载',28,ORANGE,'middle',700)]
for x in [125,475]:
    e += [text(x,209,'5V',28,anchor='middle'),dot(x,224),line(x,224,x,245),resistor(x,245),line(x,300,x,350),dot(x,350),line(x,350,x,390),resistor(x,390),line(x,445,x,525),ground(x,525)]
e += [text(173,280,'R1 10kΩ',26),text(173,425,'R2 10kΩ',26),line(125,350,310,350),text(260,332,'2.50V',34,BLUE,'middle',700)]
e += [text(519,280,'R1 10kΩ',26),line(475,350,650,350),dot(650,350,ORANGE),line(650,350,650,390,ORANGE),resistor(650,390,ORANGE),line(650,445,650,525,ORANGE),line(475,525,650,525),text(600,332,'约 1.67V',34,ORANGE,'middle',700)]
e += [text(475,478,'R2 10kΩ',25,anchor='middle'),text(650,478,'RL 10kΩ',25,ORANGE,'middle'),text(194,624,'下方等效电阻：10kΩ',27,anchor='middle'),text(556,624,'下方等效电阻：5kΩ',27,ORANGE,'middle'),text(375,675,'读数均相对地；图示为计算模型，非实测',24,MUTED,'middle')]
save('divider-load',710,e)

# 2. Conditional checks, with claims deliberately framed as support, not proof.
e=[text(30,52,'输出约 1.67V，下一步查什么',34,weight=700),text(30,94,'每次检查，都要能区分候选原因',26,MUTED),rect(30,125,690,105),text(60,170,'① 故障出现时，测实际输入电压',29,BLUE,weight=700),text(60,210,'先确认测量位置与共同参考地',25,MUTED)]
e += [arrow(375,238,270),rect(30,284,330,130),rect(390,284,330,130),text(195,332,'输入约 3.33V',30,ORANGE,'middle',700),text(195,380,'继续检查输入端',27,anchor='middle'),text(555,332,'输入约 5V',30,BLUE,'middle',700),text(555,380,'继续区分负载与阻值',26,anchor='middle')]
e += [arrow(555,422,458),text(375,500,'以下只继续检查输入约 5V 的分支',26,MUTED,'middle'),rect(30,526,690,125),text(60,570,'② 在仿真中移除额外负载',29,BLUE,weight=700),text(60,615,'保持输入、原有电阻与接线不变',26,MUTED),arrow(375,659,690)]
e += [rect(30,705,330,145),rect(390,705,330,145),text(195,750,'恢复约 2.50V',30,BLUE,'middle',700),text(195,795,'支持负载影响的解释',26,anchor='middle'),text(555,750,'仍约 1.67V',30,ORANGE,'middle',700),text(555,795,'继续核对阻值与连接',26,anchor='middle'),text(375,905,'仅比较文中的三个候选原因；不符时扩大检查范围',24,MUTED,'middle')]
save('diagnosis-path',940,e)

# 3. Absolute values, no misleading shared axis for unlike units.
e=[text(30,52,'降低电阻，改善输出也增加耗电',34,weight=700),text(30,94,'输入同为 5V · 负载同为 10kΩ · 分压比例相同',25,MUTED),rect(24,120,340,540),rect(386,120,340,540)]
e += [text(194,169,'R1 = R2 = 10kΩ',28,BLUE,'middle',700),text(556,169,'R1 = R2 = 100Ω',28,ORANGE,'middle',700)]
for x,output,rout,current in [(194,'1.67V','5kΩ','0.25mA'),(556,'2.49V','50Ω','25mA')]:
    e += [text(x,222,'空载输出均为 2.50V',25,MUTED,'middle'),text(x,287,'接上负载后的输出',26,anchor='middle'),text(x,346,'约 '+output,43,BLUE if x==194 else ORANGE,'middle',700),text(x,410,'等效输出电阻',26,MUTED,'middle'),text(x,454,rout,35,anchor='middle',weight=700),text(x,520,'空载支路电流',26,MUTED,'middle'),text(x,573,current,39,anchor='middle',weight=700)]
e += [rect(30,689,690,108,'#FFF8ED','#F5D7A7'),text(375,733,'输出更接近 2.50V',29,ORANGE,'middle',700),text(375,775,'空载支路电流增加 100 倍',29,ORANGE,'middle',700),text(375,846,'理想模型计算；负载输出与空载电流为不同工况',24,MUTED,'middle')]
save('load-current-tradeoff',880,e)
print({'created': ['divider-load.svg','diagnosis-path.svg','load-current-tradeoff.svg']})
