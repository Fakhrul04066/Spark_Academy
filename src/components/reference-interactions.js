// DOM behavior for the supplied static landing markup. All listeners and frames
// are owned by this mount and are removed on navigation or React Strict Mode cleanup.
export const ORBIT_SPEED = 0.12; // radians / second: about 52 seconds per revolution.
export function mountReferenceLanding(root) {
  const controller = new AbortController();
  const on = (target, type, listener, options = {}) => target?.addEventListener(type, listener, {...options, signal:controller.signal});
  const one = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollToCourses = () => one('#courses')?.scrollIntoView({behavior:motion.matches?'auto':'smooth'});
  let category='all', grade='';
  const search=one('#courseSearch');
  function filterCourses(){
    const query=(search?.value||'').trim().toLowerCase();let visible=0;
    all('.course-grid .course').forEach(card=>{
      const grades=(card.dataset.grade||'').split(' ');
      const show=(!grade||grades.includes(grade))&&(!!grade||category==='all'||card.dataset.category===category)&&(!query||(card.dataset.search||'').includes(query));
      card.hidden=!show;if(show)visible++;
    });
    one('#count').textContent=visible+' courses available';
    one('#noCourses').style.display=visible?'none':'block';
    all('[data-filter]').forEach(button=>{button.classList.toggle('active',button.dataset.filter===category);button.setAttribute('aria-pressed',String(button.dataset.filter===category));});
  }
  all('.faq-item').forEach((item,i)=>{const button=item.querySelector('.faq-q'),answer=item.querySelector('.faq-a');answer.id='spark-faq-answer-'+i;button.setAttribute('aria-controls',answer.id);button.querySelector('span')?.setAttribute('aria-hidden','true');});
  on(search,'input',()=>{category='all';grade='';filterCourses();});
  on(one('#program-search'),'submit',event=>{event.preventDefault();scrollToCourses();});
  on(root,'click',event=>{
    const button=event.target.closest('button,a');if(!button)return;
    if(button.matches('[data-filter]')){category=button.dataset.filter;grade='';filterCourses();}
    if(button.matches('[data-go-grade]')){grade=button.dataset.goGrade;category=grade==='hsc'?'hsc':'ssc';search.value='';filterCourses();scrollToCourses();}
    if(button.matches('[data-feature]')){all('[data-feature]').forEach(b=>{const active=b===button;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});}
    if(button.matches('.faq-q')){
      const item=button.closest('.faq-item'),open=!item.classList.contains('open');
      all('.faq-item').forEach(other=>{const expanded=other===item&&open;other.classList.toggle('open',expanded);other.querySelector('.faq-q').setAttribute('aria-expanded',String(expanded));});
    }
    if(button.matches('[data-course]')){one('#programTitle').textContent=button.dataset.course;one('#courseDialog').showModal();}
    if(button.matches('#closeDialog'))one('#courseDialog').close();
    if(button.matches('#menuBtn')){const open=one('#navlinks').classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');}
    if(button.closest('#navlinks')){one('#navlinks').classList.remove('open');one('#menuBtn').setAttribute('aria-expanded','false');}
  });
  on(one('#courseDialog'),'click',event=>{if(event.target===one('#courseDialog'))one('#courseDialog').close();});
  const stopOrbits=mountOrbits(root,on,motion);
  filterCourses();
  return ()=>{controller.abort();stopOrbits();one('#courseDialog')?.close();};
}
function mountDesktopOrbits(page,on,motion){
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const states=[],observers=[],controls=[];
  let frame=0,previous=0,disposed=false;
  function start(){if(!frame&&!disposed&&!document.hidden){previous=performance.now();frame=requestAnimationFrame(animate);}}
  const configs=[['.storm-course-stack','.storm-course-tile','courses',1],['.storm-feature-stack','.storm-feature-tile','features',-1]];
  for(const [selector,cardSelector,label,direction] of configs){
    const root=page.querySelector(selector);if(!root)continue;
    const cards=[...root.querySelectorAll(cardSelector)];if(!cards.length)continue;
    const originals=cards.map(card=>({style:card.getAttribute('style'),className:card.className,tabIndex:card.getAttribute('tabindex')}));
    const state={root,cards,originals,direction,label,angle:Math.PI/2,velocity:0,inertia:0,target:null,running:!motion.matches,visible:true,hover:false,keyboard:false,dragging:false,moved:false,activeIndex:-1,width:0,height:0,manualUntil:0,blockUntil:0,radius:90,startX:0,startY:0,lastX:0,lastY:0,lastT:0};
    states.push(state);root.dataset.orbitSpeed=String(ORBIT_SPEED);root.tabIndex=0;root.setAttribute('role','group');root.setAttribute('aria-label',label+' circular cards. Drag or use previous and next.');
    function measure(){state.width=root.clientWidth;state.height=root.clientHeight;state.radius=clamp(Math.min(state.width*.245,state.height*.31),72,103);cards.forEach(card=>{card.style.setProperty('left','50%','important');card.style.setProperty('top','50%','important');});render(state);start();}
    const resize=new ResizeObserver(measure);resize.observe(root);observers.push(resize);
    const intersection=new IntersectionObserver(entries=>{state.visible=entries[0]?.isIntersecting??true;start();},{rootMargin:'50px'});intersection.observe(root);observers.push(intersection);
    const row=document.createElement('div');row.className='ring-instruction';
    const hint=document.createElement('span');hint.textContent='Drag or use arrows';
    const prev=document.createElement('button'),next=document.createElement('button'),pause=document.createElement('button');
    prev.className=next.className='orbit-arrow';pause.className='ring-control';
    for(const button of [prev,next,pause])button.type='button';
    prev.textContent='‹';next.textContent='›';prev.setAttribute('aria-label','Previous '+label);next.setAttribute('aria-label','Next '+label);pause.setAttribute('aria-label','Pause or play '+label);
    function updatePlay(){pause.textContent=motion.matches?'Reduced motion':state.running?'Ⅱ Pause':'▶ Play';pause.disabled=motion.matches;pause.setAttribute('aria-pressed',String(!state.running));}
    updatePlay();row.append(hint,prev,next,pause);root.insertAdjacentElement('afterend',row);controls.push(row);
    function focus(index){const target=Math.PI/2-index*TAU/cards.length;state.target=target+Math.round((state.angle-target)/TAU)*TAU;state.manualUntil=performance.now()+8000;state.inertia=state.velocity=0;if(motion.matches){state.angle=state.target;state.target=null;render(state);}else start();}
    on(prev,'click',()=>focus((state.activeIndex-1+cards.length)%cards.length));on(next,'click',()=>focus((state.activeIndex+1)%cards.length));
    on(pause,'click',()=>{state.running=!state.running;state.velocity=state.inertia=0;updatePlay();start();});
    on(motion,'change',()=>{if(motion.matches){state.running=false;state.velocity=state.inertia=0;if(state.target!==null){state.angle=state.target;state.target=null;}}updatePlay();render(state);start();});
    cards.forEach((card,i)=>on(card,'click',event=>{if(performance.now()<state.blockUntil){event.preventDefault();event.stopImmediatePropagation();return;}if(i!==state.activeIndex){event.preventDefault();event.stopImmediatePropagation();focus(i);}},{capture:true}));
    on(root,'pointerenter',event=>{if(event.pointerType==='mouse'){state.hover=true;}});
    on(root,'pointerleave',event=>{if(event.pointerType==='mouse'&&!state.dragging){state.hover=false;start();}});
    on(root,'focusin',()=>{state.keyboard=true;});on(root,'focusout',event=>{if(!root.contains(event.relatedTarget)){state.keyboard=false;start();}});
    on(root,'keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();focus((state.activeIndex+(event.key==='ArrowRight'?1:-1)+cards.length)%cards.length);}else if(event.key===' '&&event.target===root){event.preventDefault();state.running=!state.running;updatePlay();start();}});
    on(root,'pointerdown',event=>{if(event.button!==0||motion.matches)return;state.dragging=true;state.moved=false;state.startX=state.lastX=event.clientX;state.startY=state.lastY=event.clientY;state.lastT=performance.now();state.inertia=0;state.target=null;state.manualUntil=performance.now()+8000;start();});
    on(root,'pointermove',event=>{if(!state.dragging)return;const dx=event.clientX-state.lastX,dy=event.clientY-state.lastY;
      if(!state.moved&&Math.abs(event.clientY-state.startY)>Math.abs(event.clientX-state.startX)+6){state.dragging=false;return;}
      if(Math.hypot(event.clientX-state.startX,event.clientY-state.startY)>6)state.moved=true;
      if(state.moved){root.classList.add('is-dragging');try{root.setPointerCapture(event.pointerId);}catch{}const delta=dx*.0045;state.angle+=delta;state.inertia=state.inertia*.75+(delta/clamp((performance.now()-state.lastT)/1000,.01,.05))*.25;render(state);}
      state.lastX=event.clientX;state.lastY=event.clientY;state.lastT=performance.now();
    });
    const release=event=>{if(!state.dragging)return;state.dragging=false;root.classList.remove('is-dragging');state.inertia=state.moved?clamp(state.inertia,-.5,.5):0;if(state.moved)state.blockUntil=performance.now()+350;try{if(root.hasPointerCapture(event.pointerId))root.releasePointerCapture(event.pointerId);}catch{}start();};
    on(window,'pointerup',release);on(window,'pointercancel',release);on(root,'lostpointercapture',()=>{state.dragging=false;root.classList.remove('is-dragging');});measure();
  }
  function render(state){
    let nearest=0,depthMax=-1;const mobile=innerWidth<=1120;
    state.cards.forEach((card,i)=>{const theta=state.angle+i*TAU/state.cards.length,x=state.radius*Math.cos(theta),y=(mobile?.78:1)*state.radius*Math.sin(theta)+(mobile?-6:0),depth=(Math.sin(theta)+1)/2;
      const scale=mobile?.72+.42*depth:.53+.67*depth*depth;
      card.style.transform=`translate3d(calc(-50% + ${x.toFixed(3)}px),calc(-50% + ${y.toFixed(3)}px),${mobile?'0':(-48+100*depth).toFixed(3)}px) scale(${scale.toFixed(5)})`;
      card.style.opacity=(.72+.28*depth*depth).toFixed(4);
      const layer=String(10+Math.round(depth*1000));if(card.style.zIndex!==layer)card.style.zIndex=layer;
      const interactive=depth>.26?'auto':'none';if(card.style.pointerEvents!==interactive)card.style.pointerEvents=interactive;
      if(depth>depthMax){depthMax=depth;nearest=i;}
    });
    if(state.activeIndex!==nearest){state.activeIndex=nearest;state.cards.forEach((card,i)=>{card.classList.toggle('is-orbit-current',i===nearest);card.tabIndex=i===nearest?0:-1;});}
  }
  function animate(now){frame=0;if(disposed||document.hidden)return;const dt=clamp((now-previous)/1000,0,.042);previous=now;let moving=false;
    for(const state of states){if(!state.visible&&state.target===null&&!state.dragging)continue;
      if(state.target!==null){const omega=6,offset=state.angle-state.target,decay=Math.exp(-omega*dt),step=(state.velocity+omega*offset)*dt;state.angle=state.target+(offset+step)*decay;state.velocity=(state.velocity-omega*step)*decay;if(Math.abs(state.target-state.angle)<.0008&&Math.abs(state.velocity)<.003){state.angle=state.target;state.target=null;state.velocity=0;}moving=true;}
      else if(state.dragging){state.velocity=0;moving=true;}
      else if(!motion.matches&&Math.abs(state.inertia)>.003){const decay=Math.exp(-5.2*dt);state.angle+=state.inertia*(1-decay)/5.2;state.inertia*=decay;moving=true;}
      else{state.inertia=0;const automatic=state.running&&!motion.matches&&!state.keyboard&&!state.hover&&now>state.manualUntil;const desired=automatic?state.direction*ORBIT_SPEED:0;const decay=Math.exp(-3*dt),oldVelocity=state.velocity;state.velocity=desired+(oldVelocity-desired)*decay;state.angle+=desired*dt+(oldVelocity-desired)*(1-decay)/3;moving=moving||automatic||Math.abs(state.velocity)>.0001||(state.running&&!state.hover&&!state.keyboard&&!motion.matches);}
      render(state);
    }
    if(moving)frame=requestAnimationFrame(animate);
  }
  on(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;states.forEach(s=>s.velocity=0);}else start();});start();
  return ()=>{disposed=true;cancelAnimationFrame(frame);observers.forEach(observer=>observer.disconnect());controls.forEach(control=>control.remove());states.forEach(state=>{delete state.root.dataset.orbitSpeed;state.cards.forEach((card,i)=>{const old=state.originals[i];if(old.style===null)card.removeAttribute('style');else card.setAttribute('style',old.style);card.className=old.className;if(old.tabIndex===null)card.removeAttribute('tabindex');else card.setAttribute('tabindex',old.tabIndex);});});};
}

// Use native touch scrolling on phones/tablets, while retaining desktop orbits.
function mountOrbits(page,on,motion){
 const compact=matchMedia('(max-width:1120px)');let cleanup=()=>{};
 function refresh(){cleanup();const controller=new AbortController();const listen=(target,type,listener,options={})=>target?.addEventListener(type,listener,{...options,signal:controller.signal});
  const stop=compact.matches?mountMobileSliders(page,listen,motion):mountDesktopOrbits(page,listen,motion);
  cleanup=()=>{controller.abort();stop();};
 }
 refresh();on(compact,'change',refresh);return ()=>cleanup();
}
function mountMobileSliders(page,on,motion){
 const cleanups=[];
 for(const [selector,cardSelector,label] of [['.storm-course-stack','.storm-course-tile','courses'],['.storm-feature-stack','.storm-feature-tile','features']]){
  const root=page.querySelector(selector);if(!root)continue;
  const cards=[...root.querySelectorAll(cardSelector)];
  const originalStyle=root.getAttribute('style'),originalLabel=root.getAttribute('aria-label');
  const originals=cards.map(card=>({style:card.getAttribute('style'),className:card.className,tabIndex:card.getAttribute('tabindex')}));
  root.classList.add('mobile-card-slider');root.dataset.carouselMode='swipe';root.removeAttribute('data-orbit-speed');
  root.setAttribute('role','region');root.setAttribute('aria-roledescription','carousel');root.setAttribute('aria-label',label+' swipe cards');root.tabIndex=0;
  cards.forEach(card=>{card.classList.remove('is-orbit-current');card.tabIndex=0;for(const [key,value] of Object.entries({position:'relative',left:'auto',top:'auto',transform:'none',opacity:'1',zIndex:'auto',pointerEvents:'auto',width:'calc(100% - 42px)',height:'auto',minHeight:'184px',maxWidth:'none',padding:'20px',flex:'0 0 calc(100% - 42px)',transition:'background .22s ease,border-color .22s ease'}))card.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');});
  let index=0,playing=!motion.matches,visible=false,pauseUntil=0,direction=1,scrollTimer;
  const controls=document.createElement('div');controls.className='ring-instruction mobile-slider-controls';
  const count=document.createElement('span'),prev=document.createElement('button'),next=document.createElement('button'),pause=document.createElement('button');
  count.className='mobile-slider-count';prev.className=next.className='orbit-arrow';pause.className='ring-control';
  for(const button of [prev,next,pause])button.type='button';
  prev.textContent='‹';next.textContent='›';prev.setAttribute('aria-label','Previous '+label);next.setAttribute('aria-label','Next '+label);pause.setAttribute('aria-label','Pause or play '+label);
  function update(){count.textContent=(index+1)+' / '+cards.length;prev.disabled=index===0;next.disabled=index===cards.length-1;pause.disabled=motion.matches;pause.textContent=motion.matches?'Swipe to explore':playing?'Ⅱ Pause':'▶ Play';pause.setAttribute('aria-pressed',String(!playing));cards.forEach((card,i)=>card.classList.toggle('is-mobile-current',i===index));}
  function go(nextIndex,manual=true){index=Math.max(0,Math.min(cards.length-1,nextIndex));if(manual)pauseUntil=performance.now()+9000;root.scrollTo({left:cards[index].offsetLeft-cards[0].offsetLeft,behavior:motion.matches?'auto':'smooth'});update();}
  controls.append(count,prev,next,pause);root.insertAdjacentElement('afterend',controls);update();
  on(prev,'click',()=>go(index-1));on(next,'click',()=>go(index+1));on(pause,'click',()=>{playing=!playing;pauseUntil=0;update();});
  on(root,'keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();go(index+(event.key==='ArrowRight'?1:-1));}});
  on(root,'pointerdown',()=>{pauseUntil=performance.now()+9000;},{passive:true});
  on(root,'focusin',()=>{pauseUntil=Infinity;});on(root,'focusout',event=>{if(!root.contains(event.relatedTarget))pauseUntil=performance.now()+9000;});
  on(root,'scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const center=root.scrollLeft+root.clientWidth/2;index=cards.reduce((nearest,card,i)=>Math.abs(card.offsetLeft+card.offsetWidth/2-center)<Math.abs(cards[nearest].offsetLeft+cards[nearest].offsetWidth/2-center)?i:nearest,0);update();},100);},{passive:true});
  on(motion,'change',()=>{if(motion.matches)playing=false;update();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;},{threshold:.35});observer.observe(root);
  const timer=setInterval(()=>{if(!playing||motion.matches||!visible||document.hidden||performance.now()<pauseUntil)return;if(index===cards.length-1)direction=-1;if(index===0)direction=1;go(index+direction,false);},6000);
  cleanups.push(()=>{clearInterval(timer);clearTimeout(scrollTimer);observer.disconnect();controls.remove();root.classList.remove('mobile-card-slider');delete root.dataset.carouselMode;root.scrollLeft=0;if(originalStyle===null)root.removeAttribute('style');else root.setAttribute('style',originalStyle);if(originalLabel===null)root.removeAttribute('aria-label');else root.setAttribute('aria-label',originalLabel);cards.forEach((card,i)=>{const old=originals[i];card.className=old.className;if(old.style===null)card.removeAttribute('style');else card.setAttribute('style',old.style);if(old.tabIndex===null)card.removeAttribute('tabindex');else card.setAttribute('tabindex',old.tabIndex);});});
 }
 return ()=>cleanups.forEach(cleanup=>cleanup());
}
