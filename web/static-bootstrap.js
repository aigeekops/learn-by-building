/* Loaded only by the public build: no server API or model requests. */
(() => {
 const base=new URL('.',location.href),namespace='learn-by-building-static:'+base.pathname;
 const ready=fetch(new URL('public-config.json',base)).then(r=>{if(!r.ok)throw Error('公开课程配置加载失败');return r.json();}).then(config=>new StaticRecords.Records(config,new StaticRecords.IndexedRecords(namespace),StaticPlan.preview));
 window.StaticSite={storagePrefix:namespace+':',request:async(path,body)=>(await ready).request(path,body)};
})();
