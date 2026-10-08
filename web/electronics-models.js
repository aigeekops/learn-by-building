/* Small, explicit teaching models; no component datasheets or hardware claims. */
const ElectronicsModels = {
  breadboardGroup(hole) {
    const match=/^([LR])([12])-([1-5])$/.exec(hole);
    if(!match)throw Error('孔位无效');
    return match[1]+match[2];
  },
  meter({mode,red,black,power,broken}) {
    const nodes=['P','A','M','G'];
    if(!nodes.includes(red)||!nodes.includes(black)||!['V','R','I'].includes(mode))throw Error('测量参数无效');
    const same=red===black||(!broken&&[red,black].every(n=>['P','A'].includes(n)));
    if(mode==='R') {
      if(power)return {value:null,label:'先断电',reason:'电阻档使用表内电源。断开外部供电后再测量。',valid:false};
      if(same)return {value:0,label:'0 Ω',reason:'两支表笔在同一电气节点。',valid:true};
      if(broken&&[red,black].includes('P'))return {value:null,label:'OL · 开路',reason:'P 与电阻网络断开，没有闭合测量路径。',valid:true};
      const positions={P:0,A:0,M:1000,G:3000},value=Math.abs(positions[red]-positions[black]);
      return {value,label:value+' Ω',reason:'已移除外部电源；仅剩串联的 1 kΩ 与 2 kΩ。',valid:true};
    }
    if(mode==='I') {
      if(!broken||!([red,black].includes('P')&&[red,black].includes('A')))return {value:null,label:'接法不正确',reason:'电流档应串入断口 P—A；并到不同电位节点会改变电路，甚至短路。本练习不计算错误接法的电流。',valid:false};
      const value=power?(red==='P'?1:-1)*5/3000:0;
      return {value,label:(value*1000).toFixed(3)+' mA',reason:'表笔桥接 P—A 断口，形成串联路径；理想表内阻为零。',valid:true};
    }
    const voltages=power?{P:5,A:broken?0:5,M:broken?0:10/3,G:0}:{P:0,A:0,M:0,G:0};
    if(!power&&broken&&[red,black].includes('P')&&!same)return {value:null,label:'参考不确定',reason:'已移除电源，P 悬空，不能确定其相对电位。',valid:false};
    const value=voltages[red]-voltages[black];
    return {value,label:value.toFixed(3)+' V',reason:'电压为红表笔电位减黑表笔电位；理想表输入阻抗无限大。',valid:true};
  },
  driver({on,rb,load,ground}) {
    if(![rb,load].every(v=>Number.isFinite(v)&&v>0))throw Error('驱动参数无效');
    const base=on?2.6/rb:0,required=4.8/load,budget=base*10;
    return {base:ground?base:null,required,budget:ground?budget:null,valid:ground,saturated:ground&&on&&budget>=required,gpioOver:ground?base>.008:null,
      current:!ground?null:!on?0:budget>=required?required:null};
  },
  gate(kind,a,b) {
    const operations={and:a&&b,or:a||b,xor:a!==b,nand:!(a&&b)};
    if(!(kind in operations))throw Error('逻辑门无效');
    return Number(operations[kind]);
  },
  latch(s,r,q) {return s&&r?null:s?1:r?0:q;},
  bounce(delay,end=130) {
    if(!Number.isFinite(delay)||delay<0||!Number.isFinite(end)||end<0)throw Error('去抖参数无效');
    const events=[[0,0],[10,1],[14,0],[18,1],[23,0],[27,1],[80,0],[83,1],[88,0]].filter(([t])=>t<=end);
    const filtered=[[0,0]];let candidate=0,since=0,state=0;
    const settle=t=>{if(candidate!==state&&since+delay<=t){state=candidate;filtered.push([since+delay,state]);}};
    for(const [t,value] of events){settle(t);if(value!==candidate){candidate=value;since=t;}if(delay===0)settle(t);}
    settle(end);
    const rises=series=>series.slice(1).filter(([,v],i)=>v===1&&series[i][1]===0).length;
    return {raw:events,filtered,rawCount:rises(events),count:rises(filtered)};
  },
  sample({voltage,reference,threshold,ground,input}) {
    if(![voltage,reference,threshold].every(Number.isFinite)||reference<=0||voltage<0||threshold<0||threshold>1023)throw Error('输入输出参数无效');
    if(!ground||!input||voltage>reference)return {valid:false,code:null,output:null};
    const code=Math.min(1023,Math.floor(voltage/reference*1024));
    return {valid:true,code,output:code>=threshold,step:reference/1024};
  },
  induction(turns,previous,position,dt,polarity=1) {
    if(![turns,previous,position,dt,polarity].every(Number.isFinite)||turns<=0||dt<=0||Math.abs(polarity)!==1)throw Error('感应参数无效');
    const flux=x=>polarity*.001*Math.exp(-x*x);
    return {flux:flux(position),emf:-turns*(flux(position)-flux(previous))/dt||0};
  }
};
if(typeof module!=='undefined')module.exports=ElectronicsModels;
