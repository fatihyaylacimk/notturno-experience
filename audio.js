import {SCENES,clamp} from './timeline.js';
export class StoryAudio{
 constructor(notify){this.notify=notify;this.enabled=false;this.context=null;this.bus=null;this.noiseBuffer=null;this.current={index:0,lang:'tr'};this.key='';this.generation=0;this.timer=0;this.lastStep=-1;this.lastStepAt=0;this.voice=document.createElement('audio');this.voice.id='narration-track';this.voice.hidden=true;this.voice.preload='none';this.voice.setAttribute('playsinline','');this.voice.volume=.88;document.body.append(this.voice);}
 ensureContext(){
  if(this.context)return;
  const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
  this.context=new AudioContext();this.bus=this.context.createGain();this.bus.gain.value=.32;this.bus.connect(this.context.destination);
  const count=Math.floor(this.context.sampleRate*2);this.noiseBuffer=this.context.createBuffer(1,count,this.context.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<count;i++)data[i]=Math.random()*2-1;
 }
 setEnabled(enabled){
  this.enabled=enabled;this.cancelVoice();
  if(enabled){this.ensureContext();this.context?.resume().catch(()=>{});if(this.bus)this.bus.gain.setTargetAtTime(.32,this.context.currentTime,.02);this.key=this.current.lang+':'+this.current.index;this.playCurrent();this.cue(this.current.index);}
  else{if(this.bus)this.bus.gain.setTargetAtTime(0,this.context.currentTime,.02);setTimeout(()=>{if(!this.enabled)this.context?.suspend().catch(()=>{});},90);}
 }
 cancelVoice(){this.generation++;clearTimeout(this.timer);this.voice.pause();try{this.voice.currentTime=0;}catch{}if('speechSynthesis'in window)window.speechSynthesis.cancel();}
 setScene(index,lang){this.current={index,lang};const key=lang+':'+index;if(key===this.key)return;this.key=key;this.cancelVoice();this.lastStep=-1;if(!this.enabled||document.hidden)return;this.timer=setTimeout(()=>{if(!this.enabled||document.hidden)return;this.playCurrent();this.cue(index);},230);}
 playCurrent(){
  if(!this.enabled||document.hidden)return;
  const {index,lang}=this.current,token=this.generation,url='assets/audio/'+lang+'/'+String(index).padStart(2,'0')+'.mp3';
  this.voice.src=url;this.voice.preload='auto';
  const playback=this.voice.play();if(playback&&typeof playback.catch==='function')playback.catch(error=>{if(token!==this.generation||!this.enabled)return;if(error.name==='NotAllowedError'){this.notify?.('audioBlocked');return;}this.speakFallback(SCENES[index].line[lang],lang);});
 }
 speakFallback(text,lang){if(!this.enabled||!('speechSynthesis'in window))return;const voice=window.speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith(lang));if(!voice)return;const phrase=new SpeechSynthesisUtterance(text);phrase.lang=lang==='tr'?'tr-TR':'en-US';phrase.voice=voice;phrase.rate=.87;phrase.pitch=.85;window.speechSynthesis.speak(phrase);}
 noise(duration=.35,frequency=500,gain=.08,filterType='lowpass'){
  if(!this.enabled||!this.context||this.context.state!=='running')return;
  const c=this.context,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),envelope=c.createGain();source.buffer=this.noiseBuffer;filter.type=filterType;filter.frequency.setValueAtTime(frequency,t);filter.Q.value=.7;envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(gain,t+.018);envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(envelope);envelope.connect(this.bus);source.start(t);source.stop(t+duration+.04);source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();};
 }
 tone(frequency=100,duration=.3,gain=.12,type='sine'){
  if(!this.enabled||!this.context||this.context.state!=='running')return;
  const c=this.context,t=c.currentTime,osc=c.createOscillator(),env=c.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.64,t+duration);env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(gain,t+.009);env.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(env);env.connect(this.bus);osc.start();osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();env.disconnect();};
 }
 cue(index){
  const id=SCENES[index].id;
  if(id==='intro'||id==='desert')this.noise(1.1,320,.08);
  if(id==='portal'){this.tone(80,.75,.2);this.noise(.7,600,.09);}
  if(id==='colonnade'){this.noise(.7,1700,.055);this.tone(66,.8,.1);}
  if(id==='bottles'){this.tone(1800,.5,.055);this.tone(2700,.32,.025);}
  if(id==='pour'){this.noise(1,1600,.07,'bandpass');this.tone(2100,.32,.025);}
  if(id==='eyes')this.tone(92,.22,.16);
  if(id==='vortex'){this.noise(1.1,1000,.1);this.tone(58,1.1,.14);}
  if(id==='ruins'){this.noise(.65,260,.12);this.tone(74,.4,.13);}
  if(id==='collection')this.tone(1000,.6,.035);
 }
 scrub(index,phase,velocity){if(!this.enabled||document.hidden||Math.abs(velocity)<.000004)return;const step=Math.floor(clamp(phase)*5),now=performance.now();if(!['desert','stairs','colonnade'].includes(SCENES[index].id))return;if(step!==this.lastStep&&now-this.lastStepAt>170){this.lastStep=step;this.lastStepAt=now;this.noise(.13,330,.11);this.tone(110,.13,.09);}}
 suspend(){this.cancelVoice();this.context?.suspend().catch(()=>{});}
 resume(){if(!this.enabled)return;this.context?.resume().catch(()=>{});this.timer=setTimeout(()=>this.playCurrent(),250);}
}
