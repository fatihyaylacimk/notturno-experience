export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(x)?x:a));
export const lerp=(a,b,t)=>a+(b-a)*clamp(t);
export const smooth=t=>{const v=clamp(t);return v*v*(3-2*v);};
export const SCENES=[
 {id:'intro',art:'01_intro_ink',tone:'dark',color:'#090a0d',zoom:[1,1.08],pan:[0,-.012],effect:0,title:{tr:'BAŞLANGIÇ',en:'THE BEGINNING'},line:{tr:'Geceye açılan bir yolculuk.',en:'A journey into the night.'}},
 {id:'desert',art:'02_desert_walker',tone:'light',color:'#efebe1',zoom:[1.04,1.15],pan:[-.016,.012],effect:1,title:{tr:'BEYAZ SESSİZLİK',en:'WHITE SILENCE'},line:{tr:'Beyaz sessizliğin içinde, bir yolcu ilerliyor.',en:'Through the white silence, a traveler moves forward.'}},
 {id:'stairs',art:'13_staircase_clean',fallback:'03_staircase_moon',sprite:'12_character_ochre_alpha',spriteKind:1,tone:'light',color:'#efebe1',zoom:[1.01,1.25],pan:[.015,.03],effect:0,title:{tr:'YÜKSELİŞ',en:'THE ASCENT'},line:{tr:'Merdivenler, bilinmeyene yükseliyor.',en:'The stairs rise toward the unknown.'}},
 {id:'portal',art:'04_circular_portal',tone:'light',color:'#efebe1',zoom:[1.01,1.3],pan:[0,.035],effect:2,title:{tr:'EŞİK',en:'THE THRESHOLD'},line:{tr:'Bir dokunuş. Ve eşik açılıyor.',en:'A touch. And the threshold opens.'}},
 {id:'colonnade',art:'14_colonnade_clean',fallback:'05_red_colonnade',sprite:'12_character_ochre_alpha',spriteKind:2,tone:'red',color:'#d70713',zoom:[1,1.32],pan:[0,.018],effect:0,title:{tr:'KIRMIZI ODA',en:'THE RED ROOM'},line:{tr:'Kırmızı sütunların arasında, yol devam ediyor.',en:'Between the red columns, the journey continues.'}},
 {id:'bottles',art:'06_three_bottles',tone:'red',color:'#d70713',zoom:[1.01,1.15],pan:[.028,.01],effect:0,title:{tr:'SEÇİM',en:'THE CHOICE'},line:{tr:'Üç şişe. Tek bir seçim.',en:'Three bottles. One choice.'}},
 {id:'pour',art:'07_blue_pour',tone:'red',color:'#d70713',zoom:[1.01,1.12],pan:[.015,.005],effect:3,title:{tr:'BİR YUDUM',en:'A SINGLE SIP'},line:{tr:'Mavi, bardağa akıyor.',en:'Blue flows into the glass.'}},
 {id:'eyes',art:'08_eye_closeup',tone:'dark',color:'#090a0d',zoom:[1,1.13],pan:[0,0],effect:0,captionBottom:true,title:{tr:'BİR AN',en:'A MOMENT'},line:{tr:'Bir anlığına, her şey değişiyor.',en:'For a moment, everything changes.'}},
 {id:'vortex',art:'15_vortex_clean',fallback:'09_blue_vortex',sprite:'16_blue_character_alpha',spriteKind:3,tone:'dark',color:'#090a0d',zoom:[1,1.14],pan:[0,0],effect:4,title:{tr:'DÖNÜŞÜM',en:'TRANSFORMATION'},line:{tr:'Çizgiler dönüyor. Zaman çözülüyor.',en:'Lines turn. Time unravels.'}},
 {id:'ruins',art:'10_red_sky_ruins',tone:'red',color:'#d70713',zoom:[1.02,1.18],pan:[0,.03],effect:1,title:{tr:'AÇILAN GÖKYÜZÜ',en:'THE OPEN SKY'},line:{tr:'Sütunlar ayrılıyor. Gökyüzü açılıyor.',en:'The columns separate. The sky opens.'}},
 {id:'collection',art:'11_collection_blue_bottle',tone:'red',color:'#d70713',zoom:[1,1.02],pan:[0,0],effect:0,title:{tr:'KOLEKSİYON',en:'COLLECTION'},line:{tr:'Yolculuğun sonunda, yeni bir başlangıç.',en:'At the end of the journey, a new beginning.'}}
];
export const COPY={
 tr:{the:'THE',experience:'DENEYİMİ',tagline:'GECEYE AÇILAN BİR YOLCULUK',navExperience:'DENEYİM',navCollection:'KOLEKSİYON',scroll:'KEŞFETMEK İÇİN KAYDIR',ending:'YOLCULUK YENİDEN BAŞLAR.',restart:'Başa dön',soundOn:'SESİ AÇ',soundOff:'SESİ KAPAT',loading:'Sahne hazırlanıyor…',retry:'Sahne yüklenemedi. Yeniden denemek için dokun.',audioBlocked:'Sesi başlatmak için yeniden dokun.',previous:'Önceki sahne',next:'Sonraki sahne',home:'Başlangıca dön',stage:'Notturno görsel yolculuğu',skip:'Sahne kontrollerine geç',navLabel:'Bölümler',controlsLabel:'Sahne kontrolleri',localeLabel:'Dil seçimi'},
 en:{the:'THE',experience:'EXPERIENCE',tagline:'A JOURNEY INTO THE NIGHT',navExperience:'EXPERIENCE',navCollection:'COLLECTION',scroll:'SCROLL TO EXPLORE',ending:'THE JOURNEY BEGINS AGAIN.',restart:'Back to the beginning',soundOn:'SOUND ON',soundOff:'SOUND OFF',loading:'Preparing the scene…',retry:'The scene could not load. Tap to try again.',audioBlocked:'Tap again to enable sound.',previous:'Previous scene',next:'Next scene',home:'Back to the beginning',stage:'The Notturno illustrated journey',skip:'Skip to scene controls',navLabel:'Chapters',controlsLabel:'Scene controls',localeLabel:'Choose language'}
};
export function timeline(progress,reduced=false){
 const p=clamp(progress),position=p*(SCENES.length-1),a=Math.min(SCENES.length-1,Math.floor(position)),b=Math.min(a+1,SCENES.length-1),local=position-a;
 const mix=a===b?0:smooth((local-.69)/.31);
 return {progress:p,a,b,mix,phaseA:clamp(local/.69),phaseB:0,chapter:mix>=.5?b:a,reduced};
}
export function progressForScene(index){const i=clamp(index,0,SCENES.length-1);return i===0?0:i===SCENES.length-1?1:(i+.16)/(SCENES.length-1);}
export function scenePose(index,phase,reduced=false){
 const scene=SCENES[index],p=smooth(phase),zoom=reduced?1:lerp(scene.zoom[0],scene.zoom[1],p);
 const pose={zoom,panX:reduced?0:scene.pan[0]*p,panY:reduced?0:scene.pan[1]*p,effect:reduced?0:scene.effect,phase:p,sprite:null};
 if(scene.spriteKind===1)pose.sprite={x:lerp(.445,.51,p),y:lerp(.445,.575,p),height:lerp(.34,.245,p),angle:0};
 if(scene.spriteKind===2)pose.sprite={x:lerp(.445,.5,p),y:lerp(.3,.43,p),height:lerp(.34,.235,p),angle:0};
 if(scene.spriteKind===3)pose.sprite={x:.53+Math.sin(p*Math.PI)*.035,y:lerp(.45,.54,p),height:lerp(.37,.4,p),angle:reduced?0:lerp(-.07,.13,p)};
 return pose;
}
