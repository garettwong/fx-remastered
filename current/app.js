/* CURRENT — a photography studio whose work streams along a custom 3D path
   (matched to @DavidJason1820: Three.js + GSAP, camera FLIES ALONG a spline, a dotted line
   traces the path, image cards sit on the curve and swell as they approach, fade into the distance). r128. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const BG=0xf4f2ee; renderer.setClearColor(BG,1);
const scene=new THREE.Scene(); scene.fog=new THREE.Fog(BG,10,52);   // distant cards melt into cream = airy depth
const cam=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,0.1,120);

/* the custom path — an S-curve receding away from the viewer */
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const curve=new THREE.CatmullRomCurve3([
  V(0,0.2,8), V(1.8,1.1,2), V(-1.4,-0.9,-4), V(-2.8,1.3,-11),
  V(1.2,-0.6,-18), V(2.9,1.6,-25), V(-0.8,-1.1,-32), V(-2.4,0.9,-39),
  V(0.6,0.2,-46), V(1.6,1.2,-53)
], false, 'catmullrom', 0.5);

/* dotted path line — sample the curve, draw small round dots */
function dotTex(){ const c=document.createElement('canvas'); c.width=c.height=32; const g=c.getContext('2d');
  const rg=g.createRadialGradient(16,16,0,16,16,16); rg.addColorStop(0,'rgba(120,110,95,.9)'); rg.addColorStop(.5,'rgba(120,110,95,.4)'); rg.addColorStop(1,'rgba(120,110,95,0)');
  g.fillStyle=rg; g.fillRect(0,0,32,32); return new THREE.CanvasTexture(c); }
const DOTS=600, dpos=new Float32Array(DOTS*3), tmp=new THREE.Vector3();
for(let i=0;i<DOTS;i++){ curve.getPointAt(i/(DOTS-1),tmp); dpos[i*3]=tmp.x; dpos[i*3+1]=tmp.y; dpos[i*3+2]=tmp.z; }
const dgeo=new THREE.BufferGeometry(); dgeo.setAttribute('position',new THREE.BufferAttribute(dpos,3));
scene.add(new THREE.Points(dgeo,new THREE.PointsMaterial({size:0.12,map:dotTex(),transparent:true,depthWrite:false,sizeAttenuation:true,color:0x8a8172})));

/* image cards placed along the path */
const IMGS=['c1','c2','c3','c4','c5','c6','c7','c8'];
const loader=new THREE.TextureLoader();
const texs=IMGS.map(n=>{ const t=loader.load('img/'+n+'.jpg'); t.minFilter=THREE.LinearFilter; t.generateMipmaps=false; t.colorSpace&&(t.colorSpace=THREE.SRGBColorSpace); return t; });
const NUM=15, cards=[]; const U0=0.05, U1=0.97;
for(let i=0;i<NUM;i++){ const u=U0+(U1-U0)*(i/(NUM-1));
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,2.15),
    new THREE.MeshBasicMaterial({map:texs[i%texs.length],transparent:true,depthWrite:false,depthTest:true}));
  curve.getPointAt(u,tmp);
  const n=(i*2654435761%1000)/1000;                          // deterministic per-card perpendicular offset
  m.position.set(tmp.x+(n-0.5)*1.6, tmp.y+(((i*40503)%1000)/1000-0.5)*1.1, tmp.z);
  m.userData={u}; scene.add(m); cards.push(m);
}

/* scroll → progress along the path (eased) + idle drift */
let p=0, tp=0;
addEventListener('scroll',()=>{ const max=Math.max(1,document.documentElement.scrollHeight-innerHeight); tp=scrollY/max; },{passive:true});
function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){}

const embedded=(window.self!==window.top)||/[?&]demo/.test(location.search);
const pill=document.getElementById('pill');
const camPos=new THREE.Vector3(), look=new THREE.Vector3();
function frame(){ requestAnimationFrame(frame);
  p += (tp-p)*0.06; if(embedded){ p+=0.0009; if(p>1)p=0; }        // self-demo auto-travel in the hub card
  const camU=Math.max(0,Math.min(0.9, p*0.9));
  curve.getPointAt(camU,camPos); camPos.z+=3.2;                    // sit slightly behind the path point
  cam.position.lerp(camPos,0.12);
  curve.getPointAt(Math.min(1,camU+0.05),look); cam.lookAt(look);
  let nearest=0, nd=1e9;
  cards.forEach((m,i)=>{ m.quaternion.copy(cam.quaternion);        // billboard
    const dz=m.position.distanceTo(cam.position); m.renderOrder=Math.round(1000-dz*10);
    const ahead=m.userData.u-camU;
    if(ahead>-0.02 && ahead<nd){ nd=ahead; nearest=i; }
  });
  if(pill) pill.textContent=String(nearest+1).padStart(2,'0')+' / '+NUM;
  renderer.render(scene,cam);
}
frame();
window.__current=()=>({three:THREE.REVISION,cards:cards.length,dots:DOTS,
  loaded:texs.filter(t=>t.image&&t.image.width>0).length,webgl:!!renderer.getContext(),
  hasPath:!!scene.children.find(o=>o.type==='Points')});
})();
