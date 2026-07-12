/* MIRAGE — real Three.js fragment-shader liquid morph between full-screen images */
const NAMES = ['dunes','forest','aurora','neon','ocean','salt'];
const CAPS = [['01 / Dunes','Golden Hour'],['02 / Forest','Blue Hour'],['03 / Aurora','Nightfall'],
              ['04 / Neon','After Rain'],['05 / Ocean','Last Light'],['06 / Salt','Dusk']];

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uA, uB;
uniform float uProg, uTime;
uniform vec2 uRes, uImgA, uImgB, uMouse;
varying vec2 vUv;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.02; a*=0.5; } return v; }
vec2 coverUv(vec2 uv, vec2 img){
  float sa=uRes.x/uRes.y, ia=img.x/img.y; vec2 c=uv;
  if(sa>ia){ c.y=(uv.y-0.5)*(ia/sa)+0.5; } else { c.x=(uv.x-0.5)*(sa/ia)+0.5; }
  return c;
}
void main(){
  float p=uProg, t=uTime*0.045;
  float n = fbm(vUv*3.0 + vec2(t,-t*0.6) + uMouse*0.3);
  float n2= fbm(vUv*3.0 + 11.3 - vec2(t*0.7,t));
  float amp = 0.007 + 0.09*sin(p*3.14159);
  vec2 disp = (vec2(n,n2)-0.5)*amp;
  vec2 uvA = coverUv(vUv + disp, uImgA);
  vec2 uvB = coverUv(vUv - disp, uImgB);
  float band=0.17;
  float pp = p*(1.0+2.0*band) - band;
  float m = smoothstep(pp+band, pp-band, n);
  float ca = 0.006*sin(p*3.14159);
  vec3 a = texture2D(uA, uvA).rgb;
  vec3 b = vec3(texture2D(uB, uvB+vec2(ca,0.0)).r, texture2D(uB, uvB).g, texture2D(uB, uvB-vec2(ca,0.0)).b);
  vec3 col = mix(a, b, clamp(m,0.0,1.0));
  float vig = smoothstep(1.3,0.35,length(vUv-0.5));
  col *= mix(0.8,1.05,vig);
  col += (hash(vUv*uRes+t)-0.5)*0.028;
  gl_FragColor = vec4(col,1.0);
}`;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const U = {
  uA:{value:null}, uB:{value:null}, uProg:{value:0}, uTime:{value:0},
  uRes:{value:new THREE.Vector2(1,1)}, uImgA:{value:new THREE.Vector2(1,1)},
  uImgB:{value:new THREE.Vector2(1,1)}, uMouse:{value:new THREE.Vector2(0,0)}
};
const mat = new THREE.ShaderMaterial({ uniforms:U, vertexShader:VERT, fragmentShader:FRAG });
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat));

function resize(){ renderer.setSize(innerWidth, innerHeight); U.uRes.value.set(innerWidth, innerHeight); }
addEventListener('resize', resize); resize();
try { renderer.compile(scene, cam); } catch(e){ console.error('MIRAGE shader compile failed:', e); }

const mouse = new THREE.Vector2(0,0);
addEventListener('pointermove', e=>{ mouse.set((e.clientX/innerWidth-0.5)*2, (0.5-e.clientY/innerHeight)*2); });

const loader = new THREE.TextureLoader();
const texs = new Array(NAMES.length).fill(null);
let loadedCount = 0;
NAMES.forEach((n,i)=> loader.load('img/'+n+'.jpg', t=>{
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  texs[i] = t; loadedCount++;
  if(loadedCount===1) firstReady();
}));
function setSlot(texU, imgU, tex){ texU.value = tex; imgU.value.set(tex.image.width, tex.image.height); }

let A=0, B=1, started=false, transStart=-1, lastAdvance=0;
const ADVANCE=4200, MORPH=1650;
function firstReady(){
  setSlot(U.uA,U.uImgA,texs[0]); setSlot(U.uB,U.uImgB,texs[0]);
  buildDots(); updateCap(0);
  const intro=document.getElementById('intro'); if(intro) intro.classList.add('gone');
  started=true; lastAdvance=performance.now();
}
const ease=x=> x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;

function updateCap(i){
  document.getElementById('cap').textContent = CAPS[i][0];
  document.getElementById('sub').textContent = CAPS[i][1];
  [].forEach.call(document.querySelectorAll('.dot'), (d,k)=> d.classList.toggle('on', k===i));
}
function buildDots(){
  const wrap=document.getElementById('dots'); wrap.innerHTML='';
  NAMES.forEach((_,i)=>{ const b=document.createElement('button'); b.className='dot'; b.setAttribute('aria-label','Slide '+(i+1));
    b.addEventListener('click',()=>jumpTo(i)); wrap.appendChild(b); });
}
function jumpTo(i){ if(transStart>=0 || i===A || !texs[i]) return; B=i; setSlot(U.uA,U.uImgA,texs[A]); setSlot(U.uB,U.uImgB,texs[B]); transStart=performance.now(); updateCap(B); }

function tick(ts){
  requestAnimationFrame(tick);
  U.uTime.value = ts*0.001;
  U.uMouse.value.lerp(mouse, 0.05);
  if(started){
    if(transStart<0 && ts-lastAdvance>ADVANCE){
      const nb=(A+1)%NAMES.length;
      if(texs[nb]){ B=nb; setSlot(U.uA,U.uImgA,texs[A]); setSlot(U.uB,U.uImgB,texs[B]); transStart=ts; updateCap(B); }
      else lastAdvance=ts;
    }
    if(transStart>=0){
      let p=(ts-transStart)/MORPH;
      if(p>=1){ p=1; A=B; transStart=-1; lastAdvance=ts; U.uProg.value=0; setSlot(U.uA,U.uImgA,texs[A]); }
      else U.uProg.value = ease(p);
    }
  }
  renderer.render(scene, cam);
}
requestAnimationFrame(tick);
