import {SCENES,clamp,scenePose} from './timeline.js';
const ART_ASPECT=941/1672;
const rgb=hex=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255);
export class ArtAssets{
 constructor(onChange){this.items=new Map();this.onChange=onChange;this.failed=new Set();this.bounds={};this.keep=new Set();}
 async init(){try{this.bounds=await fetch('assets/layer-bounds.json').then(r=>{if(!r.ok)throw Error();return r.json();});}catch{this.bounds={};}await this.request(SCENES[0].art);}
 request(name){
  const existing=this.items.get(name);if(existing){existing.used=performance.now();return existing.promise;}
  const item={image:null,used:performance.now(),promise:null};this.items.set(name,item);
  item.promise=new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=async()=>{try{if(image.decode)await image.decode();}catch{}item.image=image;this.failed.delete(name);resolve(image);this.onChange?.();};image.onerror=()=>{this.failed.add(name);reject(new Error('Image unavailable: '+name));this.onChange?.();};image.src='assets/'+name+'.webp';});
  item.promise.catch(()=>{});return item.promise;
 }
 get(name){const item=this.items.get(name);if(item){item.used=performance.now();return item.image;}return null;}
 names(index){const s=SCENES[index];return [s.art,...(s.sprite?[s.sprite]:[])];}
 ready(index){return this.names(index).every(n=>!!this.get(n));}
 warm(a,b){this.keep=new Set([...this.names(a),...this.names(b)]);const indexes=new Set([a,b,Math.max(a-1,0),Math.min(b+1,SCENES.length-1)]);for(const i of indexes)for(const n of this.names(i))this.request(n).catch(()=>{});this.prune();}
 prune(){const loaded=[...this.items].filter(([,v])=>v.image).sort((a,b)=>a[1].used-b[1].used);while(loaded.length>9){const candidate=loaded.findIndex(([n])=>!this.keep.has(n));if(candidate<0)break;const [name]=loaded.splice(candidate,1)[0];this.items.delete(name);}}
 retry(a,b){for(const n of [...this.names(a),...this.names(b)])if(this.failed.has(n)){this.items.delete(n);this.failed.delete(n);}this.warm(a,b);}
 frame(index,phase,reduced){const scene=SCENES[index];return {scene,index,image:this.get(scene.art),layer:scene.sprite?this.get(scene.sprite):null,bounds:this.bounds[scene.sprite],pose:scenePose(index,phase,reduced)};}
}
const VERTEX=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const FRAGMENT=`precision highp float;
varying vec2 vUv;
uniform sampler2D uImageA;uniform sampler2D uImageB;uniform sampler2D uLayerA;uniform sampler2D uLayerB;
uniform float uAspect;uniform float uMix;uniform float uReduced;
uniform vec4 uPoseA;uniform vec4 uPoseB;uniform vec3 uColorA;uniform vec3 uColorB;
uniform vec4 uRectA;uniform vec4 uRectB;uniform vec3 uLayerPoseA;uniform vec3 uLayerPoseB;
uniform vec2 uEffects;uniform vec2 uHasLayers;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
vec4 frame(sampler2D image,sampler2D layer,vec2 screen,vec4 pose,vec3 outside,vec4 rect,vec3 layerPose,float hasLayer,float effect){
 vec2 uv=(screen-.5)*vec2(uAspect/${ART_ASPECT.toFixed(8)},1.);
 uv=uv/pose.x+.5+pose.yz;
 if(effect>1.5&&effect<2.5){vec2 d=uv-vec2(.5,.62);float r=length(d);uv+=normalize(d+vec2(.0001))*sin(r*88.-pose.w*15.)*.0038*exp(-r*4.)*pose.w;}
 if(effect>3.5){vec2 d=uv-.5;float a=sin(pose.w*3.14159)*.045;uv=mat2(cos(a),-sin(a),sin(a),cos(a))*d+.5;}
 float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
 vec4 c=vec4(mix(outside,texture2D(image,clamp(uv,0.,1.)).rgb,inside),1.);
 if(hasLayer>.5){
  vec2 d=uv-layerPose.xy;d.x*=${ART_ASPECT.toFixed(8)};
  float a=layerPose.z;d=mat2(cos(a),sin(a),-sin(a),cos(a))*d;d.x/=${ART_ASPECT.toFixed(8)};
  vec2 luv=(d+layerPose.xy-rect.xy)/rect.zw;
  float li=step(0.,luv.x)*step(luv.x,1.)*step(0.,luv.y)*step(luv.y,1.);
  vec4 l=texture2D(layer,clamp(luv,0.,1.));c.rgb=mix(c.rgb,l.rgb,l.a*li);
 }
 return c;
}
void main(){
 vec4 a=frame(uImageA,uLayerA,vUv,uPoseA,uColorA,uRectA,uLayerPoseA,uHasLayers.x,uEffects.x);
 if(uMix<=.00001){gl_FragColor=a;return;}
 vec4 b=frame(uImageB,uLayerB,vUv,uPoseB,uColorB,uRectB,uLayerPoseB,uHasLayers.y,uEffects.y);
 float edge=mix(-.19,1.19,uMix)+(noise(vec2(vUv.x*24.,vUv.y*10.))-.5)*.15+sin(vUv.x*25.)*.014;
 float m=1.-smoothstep(edge-.01,edge+.01,vUv.y);
 if(uReduced>.5)m=step(.5,uMix);
 vec3 color=mix(a.rgb,b.rgb,m);
 float outline=(1.-smoothstep(.008,.029,abs(vUv.y-edge)))*step(.001,uMix)*step(uMix,.999)*(1.-uReduced);
 float hatch=.65+.35*step(.45,fract(vUv.x*370.+noise(vUv*80.)*3.));color=mix(color,vec3(.025,.025,.03),outline*hatch*.8);
 gl_FragColor=vec4(color,1.);
}`;
function layerRect(frame){
 const b=frame.bounds??{bbox:[.13,.04,.84,.97],aspect:ART_ASPECT};const p=frame.pose.sprite;if(!p)return {rect:[0,0,1,1],center:[0,0,0]};
 const [x0,y0,x1,y1]=b.bbox,h=p.height/Math.max(.05,y1-y0),w=h*(b.aspect/ART_ASPECT),cx=(x0+x1)/2,cy=1-(y0+y1)/2;
 return {rect:[p.x-cx*w,p.y-cy*h,w,h],center:[p.x,p.y,p.angle]};
}
export class ArtworkRenderer{
 constructor(canvas,assets,onFallback){this.canvas=canvas;this.assets=assets;this.onFallback=onFallback;this.width=0;this.height=0;this.textures=new Map();this.tick=0;this.mode='webgl';try{this.startGL();}catch(error){console.warn('Using 2D rendering',error.message);this.start2D();}document.documentElement.dataset.renderer=this.mode;}
 startGL(){
  const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:false});if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  const vertex=compile(gl.VERTEX_SHADER,VERTEX),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(vertex);gl.deleteShader(fragment);gl.useProgram(program);this.program=program;this.uniforms={};
  for(const n of ['uImageA','uImageB','uLayerA','uLayerB','uAspect','uMix','uReduced','uPoseA','uPoseB','uColorA','uColorB','uRectA','uRectB','uLayerPoseA','uLayerPoseB','uEffects','uHasLayers'])this.uniforms[n]=gl.getUniformLocation(program,n);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.start2D();this.onFallback?.();},{once:true});
 }
 start2D(){const old=this.canvas,newCanvas=old.cloneNode(false);old.replaceWith(newCanvas);this.canvas=newCanvas;this.gl=null;this.textures.clear();this.mode='canvas2d';this.ctx=newCanvas.getContext('2d',{alpha:false});document.documentElement.dataset.renderer=this.mode;this.width=0;this.height=0;}
 resize(width,height){const ratio=Math.min(window.devicePixelRatio||1,1.6),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));if(this.width===w&&this.height===h)return;this.width=this.canvas.width=w;this.height=this.canvas.height=h;if(this.gl)this.gl.viewport(0,0,w,h);}
 texture(name,image,unit){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);let stored=this.textures.get(name);if(!stored){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);stored={texture,used:this.tick};this.textures.set(name,stored);}stored.used=this.tick;gl.bindTexture(gl.TEXTURE_2D,stored.texture);}
 draw(state){const a=this.assets.frame(state.a,state.phaseA,state.reduced),b=this.assets.frame(state.b,state.phaseB,state.reduced);if(!a.image||(!b.image&&state.mix>0))return false;this.tick++;if(this.gl)this.drawGL(a,b.image?b:a,state);else this.draw2D(a,b.image?b:a,state);return true;}
 drawGL(a,b,state){
  const gl=this.gl,u=this.uniforms,ra=layerRect(a),rb=layerRect(b);gl.useProgram(this.program);
  this.texture(a.scene.art,a.image,0);this.texture(b.scene.art,b.image,1);this.texture(a.scene.sprite??a.scene.art,a.layer??a.image,2);this.texture(b.scene.sprite??b.scene.art,b.layer??b.image,3);
  gl.uniform1i(u.uImageA,0);gl.uniform1i(u.uImageB,1);gl.uniform1i(u.uLayerA,2);gl.uniform1i(u.uLayerB,3);gl.uniform1f(u.uAspect,this.width/this.height);gl.uniform1f(u.uMix,state.mix);gl.uniform1f(u.uReduced,state.reduced?1:0);
  for(const [suffix,frame,rect] of [['A',a,ra],['B',b,rb]]){const p=frame.pose;gl.uniform4f(u['uPose'+suffix],p.zoom,p.panX,p.panY,p.phase);gl.uniform3fv(u['uColor'+suffix],rgb(frame.scene.color));gl.uniform4fv(u['uRect'+suffix],rect.rect);gl.uniform3fv(u['uLayerPose'+suffix],rect.center);}
  gl.uniform2f(u.uEffects,a.pose.effect,b.pose.effect);gl.uniform2f(u.uHasLayers,a.layer?1:0,b.layer?1:0);gl.drawArrays(gl.TRIANGLES,0,6);
  if(this.textures.size>6)for(const [key,value] of [...this.textures].sort((x,y)=>x[1].used-y[1].used)){if(this.textures.size<=6)break;if(value.used!==this.tick){gl.deleteTexture(value.texture);this.textures.delete(key);}}
 }
 paint2D(frame){
  const g=this.ctx,w=this.width,h=this.height,aw=h*ART_ASPECT,p=frame.pose;g.fillStyle=frame.scene.color;g.fillRect(0,0,w,h);g.save();g.translate(w/2-p.panX*aw*p.zoom,h/2+p.panY*h*p.zoom);g.scale(p.zoom,p.zoom);g.translate(-aw/2,-h/2);g.drawImage(frame.image,0,0,aw,h);
  if(frame.layer&&p.sprite){const r=layerRect(frame),pos=p.sprite;g.save();g.translate(pos.x*aw,(1-pos.y)*h);g.rotate(-pos.angle);g.translate(-pos.x*aw,-(1-pos.y)*h);g.drawImage(frame.layer,r.rect[0]*aw,(1-r.rect[1]-r.rect[3])*h,r.rect[2]*aw,r.rect[3]*h);g.restore();}g.restore();
 }
 draw2D(a,b,state){const g=this.ctx,w=this.width,h=this.height;this.paint2D(a);if(state.mix<=0)return;g.save();g.beginPath();if(state.reduced){if(state.mix>=.5)g.rect(0,0,w,h);}else{const edge=state.mix*1.24-.12;g.moveTo(0,h);for(let x=0;x<=w+20;x+=20){const noise=Math.sin(x*.027)*.025+Math.sin(x*.071)*.012;g.lineTo(x,h-(edge+noise)*h);}g.lineTo(w,h);g.closePath();}g.clip();this.paint2D(b);g.restore();}
}
