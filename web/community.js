/* GitHub participation starts with a learner-reviewed draft; no posting or private-record export. */
const LearningCommunity={
 repository(value){
  if(typeof value!=='string')return '';
  const raw=value.trim();
  const match=raw.match(/^(?:https:\/\/github\.com\/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100})$/);
  return match&&!match[1].includes('--')&&!['.','..'].includes(match[2])?'https://github.com/'+match[1]+'/'+match[2]:'';
 },
 locator(route,id){return '/?'+new URLSearchParams({route,block:id}).toString()+'#learn';},
 topic(route,id){return route+'/'+id;},
 draft(route,block,kind='help'){
  const topic=this.topic(route,block.id),title=`[${topic}] ${kind==='share'?'我的练习过程':kind==='correction'?'课程勘误':'我卡在这一步'}：${block.title}`;
  const intro=`课程：${block.title}\n课程编号：${topic}\n站内定位：${this.locator(route,block.id)}\n（使用各自的平台地址加上上述路径，不要分享本机文件路径。）`;
  const sections=kind==='share'?['我尝试完成什么','使用的环境与方式（计算 / 网页模型 / 实物）','实际做了什么，观察到什么','一次失败或改动，以及我的解释','还没验证的部分与下一步']:kind==='correction'?['有问题的原句或步骤','实际结果 / 正确依据','建议怎样修改（附来源或复现步骤）']:['卡在第几步，想弄懂什么','设备、软件版本与练习方式','我预期看到什么','实际看到什么（最小错误信息）','已经尝试了什么'];
  return {title,body:intro+'\n\n'+sections.map(s=>'## '+s+'\n\n（请填写）').join('\n\n')};
 },
 links(config,route,block,draft){
  const repo=this.repository(config?.repository);if(!repo)return {};
  const token=this.topic(route,block.id),q=new URLSearchParams({q:'"'+token+'"'});
  return {repository:repo,discussions:config.discussions_enabled===true?repo+'/discussions?'+q:'',newDiscussion:config.discussions_enabled===true?repo+'/discussions/new':'',issues:repo+'/issues?'+q,correction:repo+'/issues/new?'+new URLSearchParams({template:'course-correction.yml',title:draft.title,course:token+' '+this.locator(route,block.id)}),contribute:repo+'/blob/HEAD/CONTRIBUTING.md'};
 }
};
if(typeof module!=='undefined')module.exports=LearningCommunity;
if(typeof document!=='undefined'){
 const anchor=(url,title)=>url?`<a class="btn small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`:'';
 function renderBlockCommunity(b){
  const route=getSiteRoute(),draft=LearningCommunity.draft(route,b),links=LearningCommunity.links(S.community,route,b,draft);
  return `<details class="course-community"><summary>一起学 · 提问、分享与纠错</summary><p>基础问题也欢迎。说清卡在哪一步、预期和实际有什么不同；一次失败的排查过程也值得分享。</p><p class="note">讨论标记：${esc(LearningCommunity.topic(route,b.id))}</p><div class="actions">${btn('整理学习问题','community-draft',b.id+':help','small')}${btn('分享练习过程','community-draft',b.id+':share','small')}${btn('指出课程问题','community-draft',b.id+':correction','small')}${anchor(links.discussions,'看看本课讨论')}</div>${!links.repository?'<p class="note">GitHub 社区尚未连接，可以先保存提问草稿。</p>':!links.discussions?'<p class="note">当前未启用 Discussions；学习讨论接通后可从这里进入。</p>':''}</details>`;
 }
 function renderCommunitySettings(){
  const repo=LearningCommunity.repository(S.community?.repository);
  return `<section class="panel community-settings"><h2>一起完善课程</h2><p>学习求助和作品交流使用 GitHub Discussions，课程错误使用 Issues，内容改进使用 Pull Request。不会编程也能参与。</p><p class="note">${repo?'当前仓库：'+esc(repo)+(S.community.discussions_enabled?' · 已配置讨论入口':' · 讨论入口未启用'):'尚未连接 GitHub 仓库；课程中的提问提纲仍可使用。'}</p><div class="actions">${btn('配置 GitHub 社区','community-settings')}${btn('了解怎样参与','community-overview','','small')}</div></section>`;
 }
 function communitySettings(){
  if(window.StaticSite)return;
  const c=S.community||{};
  openModal('连接课程的 GitHub 社区',`<p>填写这份课程所属的仓库。这里只保存链接，不创建仓库或发布内容。</p>${field('GitHub 仓库',`<input name="repository" value="${esc(c.repository||'')}" placeholder="https://github.com/owner/repository" autocomplete="off">`)}<label class="toggle-line"><input name="discussions_enabled" type="checkbox" ${c.discussions_enabled?'checked':''}> 仓库已启用 Discussions，显示讨论入口</label><p class="note">请先在 GitHub 确认仓库和 Discussions 可访问。清空地址可断开；提问模板和贡献指南需放到仓库默认分支。</p>`,async(d,f)=>{await api('community',{repository:d.repository,discussions_enabled:f.discussions_enabled.checked});return 'GitHub 社区设置已保存';});
 }
 function communityOverview(){
  const repo=LearningCommunity.repository(S.community?.repository);
  openModal('学习过程中，也可以帮助下一位同学',`<ol><li><b>卡住了：</b>进入当前学习块的“一起学”，先查相同问题，再整理自己做到哪一步。</li><li><b>做出来了：</b>分享过程、实际输出和一次失败；说明是计算、仿真还是实物。</li><li><b>发现问题：</b>通过 Issue 指出具体步骤与复现方式；有修改方案可以提交 Pull Request。</li><li><b>收到帮助：</b>验证后补上结果，并在 GitHub 标记有帮助的回答，让后来的同学也能找到。</li></ol><p>提问不需要先学会 Git。浏览讨论无需在本站登录，发帖需要 GitHub 账户。草稿由你检查后，在 GitHub 手动发布。</p><p class="note">只分享必要的代码与错误信息，删除密钥、个人笔记和个人路径。本站不会自动读取学习记录填入公开帖子。</p>${repo?`<div class="actions">${anchor(S.community.discussions_enabled?repo+'/discussions':'','进入讨论区')}${anchor(repo+'/issues','查看课程问题')}${anchor(repo+'/blob/HEAD/CONTRIBUTING.md','贡献指南')}</div>`:'<p class="note">社区尚未连接仓库，暂时可在每课保存提问草稿。</p>'}`,async()=>false);
  $('#form button[type=submit]').textContent='知道了';
 }
 function communityDraft(id,kind){
  const found=RoboticsCurriculum.find(currentCurriculum(),id);if(!found)return;
  const route=getSiteRoute(),b=found.block,draft=LearningCommunity.draft(route,b,kind),links=LearningCommunity.links(S.community,route,b,draft);
  openModal(kind==='share'?'分享自己的练习过程':kind==='correction'?'把课程问题说清楚':'整理一个容易得到帮助的问题',`<p>${esc(b.title)} · ${esc(LearningCommunity.topic(route,id))}</p><p>先检查同课讨论，再补全下方提纲。只需描述最小问题，不必写长文。</p><div class="actions">${anchor(links.discussions,'查找同课讨论')}${anchor(links.issues,'查找已有勘误')}</div>${field('帖子标题',`<input name="community_title" maxlength="160" value="${esc(draft.title)}">`)}${field('可编辑的提问提纲',`<textarea name="community_body" rows="13" maxlength="8000">${esc(draft.body)}</textarea>`)}<div class="actions">${btn('复制标题和提纲','community-copy','','small')}${kind==='correction'?anchor(links.correction,'到 GitHub 勘误表单粘贴提纲'):anchor(links.newDiscussion,'到 GitHub 选择分类并粘贴')}</div><p class="note">${links.repository?'内容由你在 GitHub 最后检查并发布，本站不会自动发帖。':'仓库尚未连接；可以先复制或下载草稿，待社区开放后再发布。'} 请删除密钥、个人笔记和个人路径。</p>`,async(_d,f)=>{downloadText('learning-question-'+id+'.md','# '+f.community_title.value+'\n\n'+f.community_body.value);return '草稿已下载，尚未发布到 GitHub';});
  $('#form button[type=submit]').textContent='下载草稿';
  $('#form').dataset.communityBlock=id;$('#form').dataset.communityRoute=route;
 }
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action^="community-"]');if(!b)return;
  try{
   if(b.dataset.action==='community-settings')communitySettings();
   if(b.dataset.action==='community-overview')communityOverview();
   if(b.dataset.action==='community-draft'){const [id,kind]=b.dataset.id.split(':');communityDraft(id,kind);}
   if(b.dataset.action==='community-copy'){
    const f=$('#form');try{await navigator.clipboard.writeText('# '+f.community_title.value+'\n\n'+f.community_body.value);toast('已复制，请在 GitHub 检查后粘贴');}catch{f.community_body.select();toast('复制不可用，已选中提纲，可手动复制或下载草稿');}
   }
  }catch(err){toast(err.message);}
 });
 Object.assign(window,{renderBlockCommunity,renderCommunitySettings});
}
