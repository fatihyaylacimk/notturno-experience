import {SCENES,COPY,clamp,timeline,progressForScene} from './timeline.js';
import {ArtAssets,ArtworkRenderer} from './renderer.js';
import {StoryAudio} from './audio.js';
const $=id=>document.getElementById(id),media=matchMedia('(prefers-reduced-motion: reduce)');
let lang='tr';try{const saved=localStorage.getItem('notturno-language');if(saved==='en'||saved==='tr')lang=saved;}catch{}
const ui={intro:$('intro-title'),caption:$('caption'),captionWrap:$('caption-wrap'),cue:$('scroll-cue'),end:$('end-card'),chapter:$('chapter-number'),name:$('chapter-name'),count:$('scene-count'),fill:$('progress-fill'),status:$('asset-status'),toast:$('toast')};
let maxScroll=1,target=0,current=0,raf=0,previousTime=0,lastPainted=null,lastChapter=-1,toastTimer=0,resizeTimer=0,lastWarm='',statusTimer=0,started=false,lastScroll=0;
const assets=new ArtAssets(wake),audio=new StoryAudio(key=>showToast(COPY[lang][key]));
const renderer=new ArtworkRenderer($('artwork'),assets,wake);
function showToast(message){ui.toast.textContent=message;ui.toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.hidden=true,3300);}
function setLanguage(next){lang=next;document.documentElement.lang=lang;document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=COPY[lang][el.dataset.i18n]);document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));$('home').setAttribute('aria-label',COPY[lang].home);$('previous').setAttribute('aria-label',COPY[lang].previous);$('next').setAttribute('aria-label',COPY[lang].next);$('stage').setAttribute('aria-label',COPY[lang].stage);document.querySelector('.top-nav').setAttribute('aria-label',COPY[lang].navLabel);$('story-navigation').setAttribute('aria-label',COPY[lang].controlsLabel);document.querySelector('.locale-switch').setAttribute('aria-label',COPY[lang].localeLabel);document.querySelector('.skip-link').textContent=COPY[lang].skip;audio.setScene(lastChapter<0?0:lastChapter,lang);syncSound();lastChapter=-1;try{localStorage.setItem('notturno-language',lang);}catch{}wake();}
function syncSound(){const label=audio.enabled?COPY[lang].soundOff:COPY[lang].soundOn;$('sound-label').textContent=label;$('sound-toggle').setAttribute('aria-label',label);$('sound-toggle').setAttribute('aria-pressed',String(audio.enabled));}
function resize(preserve=false){const progress=target;const h=window.innerHeight,w=window.innerWidth;maxScroll=Math.max(1,h*(SCENES.length-1)*1.45);document.documentElement.style.setProperty('--story-height',Math.round(maxScroll+h)+'px');renderer.resize(w,h);if(preserve&&started){scrollTo({top:progress*maxScroll,behavior:'instant'});target=clamp(scrollY/maxScroll);current=target;}else target=clamp(scrollY/maxScroll);wake();}
function wake(){if(!raf)raf=requestAnimationFrame(tick);}
function loading(waiting,state){clearTimeout(statusTimer);if(!waiting){ui.status.hidden=true;return;}const failed=[...assets.names(state.a),...assets.names(state.b)].some(n=>assets.failed.has(n));if(failed){ui.status.textContent=COPY[lang].retry;ui.status.hidden=false;ui.status.style.pointerEvents='auto';return;}if(ui.status.hidden)statusTimer=setTimeout(()=>{ui.status.textContent=COPY[lang].loading;ui.status.hidden=false;},450);}
function updateUI(state,velocity){
 const index=state.chapter,scene=SCENES[index];
 if(index!==lastChapter){lastChapter=index;document.body.dataset.tone=scene.tone;document.body.dataset.scene=scene.id;ui.chapter.textContent=String(index+1).padStart(2,'0');ui.name.textContent=scene.title[lang];ui.count.innerHTML=String(index+1).padStart(2,'0')+' <span>/ 11</span>';ui.caption.textContent=scene.line[lang];ui.captionWrap.classList.toggle('is-bottom',!!scene.captionBottom);$('announcement').textContent=String(index+1)+' / '+SCENES.length+'. '+scene.line[lang];$('previous').disabled=index===0;$('next').disabled=index===SCENES.length-1;if(index<10){$('experience-nav').setAttribute('aria-current','page');$('collection-nav').removeAttribute('aria-current');}else{$('collection-nav').setAttribute('aria-current','page');$('experience-nav').removeAttribute('aria-current');}audio.setScene(index,lang);}
 const introOpacity=state.a===0?1-state.mix:0;ui.intro.style.opacity=String(introOpacity);ui.intro.style.transform='translate(-50%,-50%) translateY('+(-state.phaseA*15)+'px) scale('+(1+state.phaseA*.035)+')';ui.intro.style.visibility=introOpacity<.005?'hidden':'visible';
 const captionOpacity=index===0||index===10?0:1-Math.sin(state.mix*Math.PI)*.88;ui.captionWrap.style.setProperty('--caption-opacity',String(captionOpacity));
 ui.cue.style.opacity=String(1-clamp(state.progress*27));ui.cue.style.transform='translateX(-50%) translateY('+(-clamp(state.progress*27)*12)+'px)';ui.fill.style.transform='scaleY('+state.progress+')';ui.end.hidden=index!==10;
 audio.scrub(index,state.a===index?state.phaseA:state.phaseB,velocity);
}
function tick(time){
 raf=0;const dt=Math.min(64,previousTime?time-previousTime:16);previousTime=time;const old=current;current=media.matches?target:current+(target-current)*(1-Math.exp(-dt/68));if(Math.abs(current-target)<.000015)current=target;
 const state=timeline(current,media.matches),warmKey=state.a+':'+state.b;if(warmKey!==lastWarm){assets.warm(state.a,state.b);lastWarm=warmKey;}
 const ready=assets.ready(state.a)&&(state.mix<=0||assets.ready(state.b));
 if(ready){loading(false,state);if(renderer.draw(state)){started=true;lastPainted=state;updateUI(state,(current-old)/Math.max(dt,1));document.querySelector('.initial-art')?.classList.add('is-ready');}}
 else{loading(true,state);if(lastPainted)renderer.draw(lastPainted);}
 if(current!==target)wake();
}
function jump(index,instant=true){const p=progressForScene(index),direct=instant||media.matches||Math.abs(p-target)>.27;if(direct){target=current=p;lastWarm='';}scrollTo({top:p*maxScroll,behavior:direct?'instant':'smooth'});wake();}
addEventListener('scroll',()=>{target=clamp(scrollY/maxScroll);lastScroll=performance.now();wake();},{passive:true});
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>resize(true),100);},{passive:true});
addEventListener('orientationchange',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>resize(true),180);},{passive:true});
media.addEventListener?.('change',()=>wake());
document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.lang)));
$('sound-toggle').addEventListener('click',()=>{audio.setEnabled(!audio.enabled);syncSound();});
$('home').addEventListener('click',()=>jump(0));$('experience-nav').addEventListener('click',()=>jump(0));$('collection-nav').addEventListener('click',()=>jump(10));$('restart').addEventListener('click',()=>jump(0));
$('previous').addEventListener('click',()=>jump(Math.max(0,(lastChapter<0?0:lastChapter)-1)));$('next').addEventListener('click',()=>jump(Math.min(SCENES.length-1,(lastChapter<0?0:lastChapter)+1)));
ui.status.addEventListener('click',()=>{const state=timeline(target);assets.retry(state.a,state.b);lastWarm='';wake();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.suspend();else{audio.resume();wake();}});
addEventListener('pagehide',()=>audio.suspend());
addEventListener('hashchange',()=>{const hash=location.hash.match(/^#scene-(\d{1,2})$/);if(hash)jump(clamp(Number(hash[1])-1,0,10),true);});
addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;if(event.key==='ArrowRight'){event.preventDefault();jump(Math.min(10,lastChapter+1));}if(event.key==='ArrowLeft'){event.preventDefault();jump(Math.max(0,lastChapter-1));}});
setLanguage(lang);resize();
try{await assets.init();started=true;const hash=location.hash.match(/^#scene-(\d{1,2})$/);if(hash)jump(clamp(Number(hash[1])-1,0,10),true);wake();}catch{ui.status.textContent=COPY[lang].retry;ui.status.hidden=false;}
