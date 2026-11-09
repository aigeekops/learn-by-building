/* Course-specific inspection joins the existing player, drafts and navigation. */
  const ciAPI=globalThis.CourseInspectorWorkbench;
  const ciOldDraw=aidDraw;
  aidDraw=function(announceStep=true){
    ciOldDraw(announceStep);
    if(!aidActive())return;const s=aidSession();
    const stages=main.querySelector('#course-inspector-panel .ci-stages');if(stages&&s.ci)s.ci.stagesOpen=stages.open;
    const previousGrid=main.querySelector('#course-inspector-panel .ci-cells');if(previousGrid&&s.ci)s.ci.gridScroll=previousGrid.scrollTop;
    main.querySelector('#course-inspector-panel')?.remove();
    // The original Attention matrix reader is already the fully expanded sample.
    if(s.trace.model==='attention'||!ciAPI.descriptor(state.course,s.trace))return;
    const anchor=main.querySelector('#aid-step-detail');if(!anchor)return;
    const panel=document.createElement('div');panel.id='course-inspector-panel';panel.innerHTML=ciAPI.render(state.course,s);anchor.after(panel);
    panel.querySelector('.ci-cells').scrollTop=s.ci.gridScroll||0;
  };
  root.addEventListener('click',event=>{
    const b=event.target.closest('#course-inspector-panel [data-ci-action]');if(!b)return;
    event.preventDefault();event.stopImmediatePropagation();aidPause();
    const s=aidSession(),run=params=>aidM.run(s.trace.model,params);
    if(!ciAPI.perform(state.course,s,b.dataset.ciAction,b.dataset.ciValue,run))return;
    main.querySelectorAll('[data-aid-param]').forEach(el=>{el.value=s.trace.params[el.dataset.aidParam];const out=main.querySelector('#aid-value-'+el.dataset.aidParam),spec=aidM.specs[s.trace.model].find(c=>c.id===el.dataset.aidParam);if(out)out.textContent=aidNumber(s.trace.params[el.dataset.aidParam])+' '+(spec?.unit||'');});
    aidDraw(false);aidPersist();
    const selector='[data-ci-action="'+b.dataset.ciAction+'"]'+(b.dataset.ciValue?'[data-ci-value="'+CSS.escape(b.dataset.ciValue)+'"]':'');
    main.querySelector('#course-inspector-panel '+selector)?.focus({preventScroll:true});
  },true);
