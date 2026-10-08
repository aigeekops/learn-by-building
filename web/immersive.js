/* Reading position is navigation only. The shell never creates evidence or study time. */
(() => {
  const state = {enabled:studyStore.read('radar-immersive-enabled',false)===true,directory:false, route:'', dashboardOpen:false};
  const key = () => 'radar-reading-position:'+getSiteRoute();
  const rows = () => (currentCurriculum()?.months||[]).flatMap(month=>month.blocks.map(block=>({month,block})));
  const savedId = () => studyStore.read(key(),'');
  const current = () => {
    const all=rows(), requested=new URLSearchParams(location.search).get('block');
    const planned=S.learning_plan?.tasks?.find(task=>task.state!=='done'&&task.unit_id?.startsWith('curriculum:'))?.unit_id.slice(11);
    return all.find(row=>row.block.id===requested)||all.find(row=>row.block.id===savedId())||all.find(row=>row.block.id===planned)||all[0];
  };
  function selectBlock(id){
    studyStore.write(key(),id);
    const url=new URL(location.href);url.searchParams.set('block',id);history.replaceState(null,'',url);
  }
  let menu, menuButton, directoryButton, toggleButton, sidebarAnchor;
  function mount(){
    if(document.getElementById('immersive-menu'))return;
    const skip=document.createElement('a');skip.className='immersive-skip';skip.href='#content';skip.textContent='跳到学习内容';
    skip.addEventListener('click',event=>{event.preventDefault();document.getElementById('content').focus();});
    document.body.prepend(skip);document.getElementById('content').tabIndex=-1;
    const sidebar=document.querySelector('.sidebar');sidebarAnchor=document.createComment('sidebar-home');sidebar.before(sidebarAnchor);
    menu=document.createElement('dialog');menu.id='immersive-menu';menu.setAttribute('aria-labelledby','immersive-menu-title');
    menu.innerHTML='<div class="immersive-menu-top"><h2 id="immersive-menu-title">学习空间</h2><button type="button" class="btn" data-action="immersive-menu-close" aria-label="关闭菜单">关闭 ×</button></div>';
    document.body.append(menu);
    const header=document.querySelector('main > header');
    toggleButton=document.createElement('button');toggleButton.type='button';toggleButton.className='btn immersive-toggle';toggleButton.dataset.action='immersive-toggle';header.append(toggleButton);
    menuButton=document.createElement('button');menuButton.type='button';menuButton.className='btn immersive-menu-button';menuButton.dataset.action='immersive-menu-open';menuButton.setAttribute('aria-haspopup','dialog');menuButton.setAttribute('aria-controls',menu.id);menuButton.setAttribute('aria-expanded','false');menuButton.textContent='☰ 菜单';header.prepend(menuButton);
    const primary=document.createElement('nav');primary.className='immersive-nav';primary.setAttribute('aria-label','学习主导航');
    primary.innerHTML=[['today','今日学习'],['learn','课程'],['journal','记录']].map(([id,title])=>`<button type="button" data-page="${id}">${title}</button>`).join('');
    header.querySelector('.header-right').before(primary);
    directoryButton=document.createElement('button');directoryButton.type='button';directoryButton.id='immersive-directory-shortcut';directoryButton.className='btn';directoryButton.dataset.action='immersive-directory';directoryButton.setAttribute('aria-controls','content');directoryButton.hidden=true;primary.before(directoryButton);
    menu.addEventListener('close',()=>menuButton.setAttribute('aria-expanded','false'));
    menu.addEventListener('click',event=>{if(event.target===menu){const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)menu.close();}});
  }
  function applyMode(){
    document.body.classList.toggle('immersive',state.enabled);
    toggleButton.textContent=state.enabled?'退出沉浸':'进入沉浸';toggleButton.setAttribute('aria-pressed',String(state.enabled));
    menuButton.hidden=!state.enabled;document.querySelector('.immersive-nav').hidden=!state.enabled;
    const sidebar=document.querySelector('.sidebar');
    if(state.enabled){if(sidebar.parentElement!==menu)menu.append(sidebar);}
    else{
      if(menu.open)menu.close();sidebarAnchor.after(sidebar);directoryButton.hidden=true;
      document.querySelectorAll('.immersive-dashboard-more').forEach(wrapper=>wrapper.replaceWith(wrapper.querySelector('.study-layout')));
      document.querySelectorAll('.immersive-practice-more').forEach(wrapper=>wrapper.replaceWith(...wrapper.querySelector('.immersive-practice-resources').children));
      document.querySelectorAll('#immersive-reader,#immersive-reader-next,.immersive-enter').forEach(node=>node.remove());
      document.getElementById('content').classList.remove('immersive-directory','immersive-reading');
    }
  }
  function syncReader(){
    const content=document.getElementById('content'), picked=current();
    if(page!=='learn'||!picked||!content.querySelector('.curated-months'))return;
    const all=rows(),index=all.findIndex(row=>row.block.id===picked.block.id);
    directoryButton.textContent=state.directory?'返回阅读':'课程目录';directoryButton.setAttribute('aria-expanded',String(state.directory));
    content.classList.toggle('immersive-directory',state.directory);content.classList.toggle('immersive-reading',!state.directory);
    let bar=document.getElementById('immersive-reader');
    if(!bar){bar=document.createElement('section');bar.id='immersive-reader';bar.className='immersive-reader';bar.setAttribute('aria-label','当前课程');content.prepend(bar);}
    bar.innerHTML=`<div><span class="study-kicker">${state.directory?'六个月学习路线':'当前阅读'} · 第 ${picked.month.month} 阶段</span><h1>${esc(state.directory?'选择你的下一小步':picked.month.title)}</h1><p>${state.directory?'每个阶段保留主教材、跟练、验收与深入资料。':`学习块 ${index+1} / ${all.length} · ${esc(picked.block.title)}`}</p></div><button type="button" class="btn" data-action="immersive-directory" aria-expanded="${state.directory}">${state.directory?'返回当前学习块':'查看课程目录'}</button>`;
    content.querySelectorAll('.curated-month').forEach(el=>el.classList.toggle('immersive-current-month',el.id==='road-stage-'+picked.month.stage));
    content.querySelectorAll('.curated-block').forEach(el=>el.classList.toggle('immersive-current-block',el.id==='curated-'+picked.block.id));
    // These are existing course nodes. No cloning/re-rendering of lesson inputs or labs.
    const target=document.getElementById('curated-'+picked.block.id),month=target?.closest('.curated-month');
    if(!state.directory&&month)month.open=true;
    if(!state.directory&&target&&!target.dataset.immersiveOpened){
      const lesson=target.querySelector('.walkthrough'),practice=target.querySelector('.curated-practice');
      if(lesson)lesson.open=true;if(practice)practice.open=true;target.dataset.immersiveOpened='true';
    }
    if(state.directory){
      content.querySelectorAll('.curated-block').forEach(el=>{
        if(el.querySelector('.immersive-enter'))return;
        const id=el.id.replace('curated-',''),enter=document.createElement('button');enter.type='button';enter.className='btn primary immersive-enter';enter.dataset.action='curated-block';enter.dataset.id=id;enter.textContent='进入这一块';el.querySelector('h4')?.after(enter);
      });
    }
    let bottom=document.getElementById('immersive-reader-next');
    if(!bottom){bottom=document.createElement('section');bottom.id='immersive-reader-next';bottom.className='immersive-reader-next';content.append(bottom);}
    bottom.innerHTML=`<div><span class="study-kicker">按自己的节奏往前走</span><p>先按本块的验收条件独立做一次。卡住时，回看上面的排查与补课提示。</p></div><div class="actions">${index>0?btn('← 上一块','curated-block',all[index-1].block.id):''}${index<all.length-1?btn('继续下一块 →','curated-block',all[index+1].block.id,'primary'):btn('查看全路线与阶段作品','immersive-directory')}</div>`;
    window.WechatFollow?.mountCard(bottom);
    bottom.hidden=state.directory;
  }
  function sync(){
    mount();applyMode();if(!state.enabled)return;
    if(state.route!==getSiteRoute()){state.directory=false;state.route=getSiteRoute();}
    document.body.dataset.learningPage=page;
    directoryButton.hidden=page!=='learn'||!current();
    document.querySelectorAll('.immersive-nav [data-page]').forEach(button=>{
      const active=button.dataset.page===(['guides','textbook'].includes(page)?'learn':page);
      button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const content=document.getElementById('content');content.classList.remove('immersive-directory','immersive-reading');
    syncReader();
    if(page==='guides'&&getSiteRoute()==='robotics'){
      const lesson=content.querySelector(':scope > #interactive-lessons');
      if(lesson&&!content.querySelector(':scope > .immersive-practice-more')){
        const resources=Array.from(content.children).filter(node=>node!==lesson&&!node.classList.contains('page-head'));
        if(resources.length){
          const more=document.createElement('details');more.className='immersive-practice-more';
          more.innerHTML='<summary>更多练习、教材与参考资料</summary><div class="immersive-practice-resources"></div>';
          lesson.after(more);more.lastElementChild.append(...resources);
        }
      }
    }
    const layout=page==='today'?content.querySelector('.study-layout'):null;
    if(layout&&!layout.parentElement.classList.contains('immersive-dashboard-more')){
      const more=document.createElement('details');more.className='immersive-dashboard-more';more.open=state.dashboardOpen;
      more.innerHTML='<summary>学习安排与回顾 <span>任务、日历与统计</span></summary>';layout.before(more);more.append(layout);
      more.addEventListener('toggle',()=>{state.dashboardOpen=more.open;});
    }
  }
  // Set position before older navigation handlers render or scroll to a target.
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action],[data-page]');if(!button)return;
    const action=button.dataset.action;
    if(action==='immersive-toggle'){state.enabled=!state.enabled;studyStore.write('radar-immersive-enabled',state.enabled);sync();return;}
    if(menu?.open&&button.matches('[data-page]'))menu.close();
    if(action==='curated-block'&&rows().some(row=>row.block.id===button.dataset.id)){
      selectBlock(button.dataset.id);state.directory=false;
      if(page==='learn')syncReader();
    }
    if(action==='curated-month'){state.directory=true;if(page==='learn')syncReader();}
    if(action==='learning-stage'){
      const module=S.learning_links?.modules.find(row=>row.id===button.dataset.id),chosen=current();
      const row=module&&rows().find(row=>row.month.stage===module.stage);
      if(row&&chosen?.month.stage!==module.stage)selectBlock(row.block.id);
      state.directory=false;
    }
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    if(button.dataset.action==='immersive-menu-open'){menu.showModal();menuButton.setAttribute('aria-expanded','true');}
    if(button.dataset.action==='immersive-menu-close')menu.close();
    if(button.dataset.action==='immersive-directory'){
      const fromHeader=button===directoryButton;
      state.directory=!state.directory;syncReader();
      document.getElementById('immersive-reader')?.scrollIntoView({block:'start'});
      (fromHeader?directoryButton:document.querySelector('#immersive-reader [data-action="immersive-directory"]'))?.focus({preventScroll:true});
    }
    if(state.enabled&&button.dataset.action==='curated-block'&&page==='learn'){
      // Keep the block heading and directory affordance below the sticky header.
      requestAnimationFrame(()=>document.getElementById('immersive-reader')?.scrollIntoView({block:'start',behavior:'instant'}));
    }
  });
  // Route changes within the open drawer retain a reachable route selector.
  const baseRender=window.render;
  window.render=function(...args){const result=baseRender.apply(this,args);sync();return result;};
  window.ImmersiveLearning={sync,currentBlock:()=>current()?.block.id||''};
  mount();applyMode();
  if(S.roadmaps)sync();
})();
