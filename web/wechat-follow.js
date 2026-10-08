/* Optional author invitation. It never records learning or gates course access. */
(() => {
  let account, dialog, opener;
  const qrPath='/assets/wechat-qr.jpg';
  const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hasQR=()=>account?.qr_image===qrPath;
  const picture=size=>`<img src="${qrPath}" width="${size}" height="${size}" alt="${safe(account.name)}微信公众号关注二维码">`;

  function mountCard(parent=document.getElementById('immersive-reader-next')){
    if(!parent||!account)return;
    let card=parent.querySelector('.wechat-follow-card');
    if(!card){card=document.createElement('aside');card.className='wechat-follow-card';parent.append(card);}
    card.setAttribute('aria-label','关注作者的公众号');
    const icon='<span class="wechat-follow-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.3 8.5 8.5 0 0 1-3.9-.9L3 21l1.2-3.6A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/><circle cx="8.5" cy="11" r="1"/><circle cx="15.5" cy="11" r="1"/></svg></span>';
    card.innerHTML=`${icon}<div class="wechat-follow-copy"><small>课外，继续一起探索</small><h2>${safe(account.name)}</h2><span class="wechat-follow-tag">微信公众号</span><p>${safe(account.description)}</p><button type="button" class="btn" data-action="wechat-follow-open" aria-haspopup="dialog">${hasQR()?'扫码关注公众号':'在微信关注公众号'}</button></div>${hasQR()?`<button type="button" class="wechat-follow-thumbnail" data-action="wechat-follow-open" aria-label="放大${safe(account.name)}关注二维码">${picture(132)}</button>`:''}`;
  }

  function renderSidebar(){
    const host=document.getElementById('sidebar-wechat');
    if(!host||!account)return;
    host.hidden=false;
    host.innerHTML=(hasQR()?`<button type="button" class="sidebar-wechat-qr" data-action="wechat-follow-open" aria-label="放大${safe(account.name)}关注二维码">${picture(72)}</button>`:'')+`<span><b>${safe(account.name)}</b><small>${hasQR()?'微信扫码关注':'微信搜一搜 · 公众号'}</small></span>`;
  }

  function body(){
    return `<div class="wechat-follow-heading"><div><small>微信公众号</small><h2 id="wechat-follow-title">${safe(account.name)}</h2></div><button type="button" class="btn" data-action="wechat-follow-close" aria-label="关闭关注窗口" autofocus>关闭 ×</button></div><p>${safe(account.description)}</p>${hasQR()?`<figure class="wechat-follow-qr">${picture(240)}<figcaption>微信扫一扫即可关注。</figcaption></figure>`:'<p class="wechat-follow-search">打开微信 → 搜一搜 → 公众号<br>搜索上方名称，查看账号简介后关注。</p>'}<small class="wechat-follow-optional">关注自愿，随时可以回到课程继续学习。</small>`;
  }

  function open(button){
    if(!account)return;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.id='wechat-follow-dialog';dialog.setAttribute('aria-labelledby','wechat-follow-title');document.body.append(dialog);
      dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
      dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
    }
    opener=button;dialog.innerHTML=body();dialog.showModal();
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');
    if(!button)return;
    if(button.dataset.action==='wechat-follow-open')open(button);
    if(button.dataset.action==='wechat-follow-close')dialog?.close();
  });
  // Missing or invalid QR assets fall back to the verified account name.
  document.addEventListener('error',event=>{
    if(event.target.tagName!=='IMG'||!event.target.closest('.wechat-follow-card,#wechat-follow-dialog')||!hasQR())return;
    account.qr_image='';mountCard();renderSidebar();if(dialog?.open){dialog.innerHTML=body();dialog.querySelector('[data-action="wechat-follow-close"]').focus();}
  },true);
  window.WechatFollow={mountCard};
  fetch('/author.json').then(response=>response.ok?response.json():null).then(data=>{
    if(data?.enabled!==true||typeof data.name!=='string'||!data.name.trim()||data.name.length>60)return;
    account={name:data.name.trim(),description:typeof data.description==='string'?data.description.slice(0,240):'',qr_image:data.qr_image===qrPath?qrPath:''};
    mountCard();renderSidebar();
  }).catch(()=>{});
})();
