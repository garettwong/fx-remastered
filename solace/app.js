/* NOCTURNE — a procedural noir cityscape in Three.js (matched to the @jasonsturges ref):
   instanced buildings with lit-window emissive textures, fog, banking camera flythrough. r128. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.setClearColor(0x05060a,1);
const scene=new THREE.Scene(); scene.fog=new THREE.Fog(0x05060a,60,340);
const cam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.5,600);

/* window emissive texture (colored windows on black) */
function winTex(){ const w=64,h=128,c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d');
  g.fillStyle='#000'; g.fillRect(0,0,w,h);
  const cols=5, rows=14, mx=6, my=4, cw=(w-mx*2)/cols, ch=(h-my*2)/rows;
  for(let r=0;r<rows;r++)for(let cc=0;cc<cols;cc++){ const q=Math.random();
    let col=null; if(q<0.5) col=null; else if(q<0.9) col='rgba(255,'+(170+Math.random()*50|0)+',90,1)'; else if(q<0.97) col='rgba(150,190,255,1)'; else col='rgba(255,70,70,1)';
    if(col){ g.fillStyle=col; g.fillRect(mx+cc*cw+1.5, my+r*ch+1.5, cw-3, ch-3); } }
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }

/* buildings */
function hash(x,y){ let h=(x|0)*374761393+(y|0)*668265263; h=(h^(h>>13))*1274126177; return ((h^(h>>16))>>>0)/4294967295; }
const geo=new THREE.BoxGeometry(1,1,1);
const mat=new THREE.MeshStandardMaterial({color:0x0a0b12, emissive:0xffffff, emissiveMap:winTex(), emissiveIntensity:1.15, roughness:1, metalness:0});
const CELL=14, GRID=46, HALF=GRID*CELL/2;
const dummy=new THREE.Object3D(); const items=[];
for(let gz=0;gz<GRID;gz++)for(let gx=0;gx<GRID;gx++){
  if(gx%3===0||gz%3===0) continue;                       // roads
  const cx=(gx-GRID/2)*CELL, cz=(gz-GRID/2)*CELL;
  const dist=Math.min(1,Math.hypot(cx,cz)/(HALF*0.9));
  if(hash(gx*7,gz*13) < dist*0.55) continue;             // sparser outskirts
  const w=5+hash(gx,gz)*5, d=5+hash(gx+9,gz+3)*5, hgt=(7+hash(gx*3,gz*5)*46)*(1-dist*0.62)+4;
  items.push({cx,cz,w,d,h:hgt});
}
const mesh=new THREE.InstancedMesh(geo,mat,items.length);
items.forEach((b,i)=>{ dummy.position.set(b.cx,b.h/2,b.cz); dummy.scale.set(b.w,b.h,b.d); dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix); });
mesh.instanceMatrix.needsUpdate=true; scene.add(mesh);
/* ground */
const ground=new THREE.Mesh(new THREE.PlaneGeometry(HALF*3,HALF*3), new THREE.MeshStandardMaterial({color:0x070810,roughness:1}));
ground.rotation.x=-Math.PI/2; ground.position.y=0; scene.add(ground);
/* lights: dim moonlight so silhouettes read */
scene.add(new THREE.HemisphereLight(0x2a3350,0x05060a,0.5));
const moon=new THREE.DirectionalLight(0x9fb4e0,0.5); moon.position.set(-40,80,-30); scene.add(moon);

/* fly + bank */
let yaw=0,tyaw=0,drag=false,lx=0, flyZ=-HALF*0.9, scrollBoost=0;
const isUI=t=>!!(t&&t.closest&&t.closest('a,button'));
addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||isUI(e.target))return; drag=true; lx=e.clientX; canvas.classList.add('grab'); });
addEventListener('pointermove',e=>{ if(!drag)return; tyaw+=(e.clientX-lx)*0.0016; lx=e.clientX; },{passive:true});
addEventListener('pointerup',()=>{ if(drag){drag=false;canvas.classList.remove('grab');} });
addEventListener('scroll',()=>{ scrollBoost=1; },{passive:true});
function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){ console.error('NOCTURNE compile',e); }

const tgt=new THREE.Vector3(); let t0=performance.now();
function frame(now){ requestAnimationFrame(frame); const dt=Math.min(0.05,(now-t0)/1000); t0=now; const t=now/1000;
  yaw+=(tyaw-yaw)*0.05;
  flyZ += (14 + scrollBoost*40)*dt; scrollBoost*=0.9;
  if(flyZ>HALF*0.9){ flyZ=-HALF*0.9; }                    // loop the flight
  const camY=46+Math.sin(t*0.25)*3;
  cam.position.set(Math.sin(yaw)*18, camY, flyZ);
  tgt.set(Math.sin(yaw)*60, 14, flyZ+90); cam.lookAt(tgt);
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__nocturne=()=>({three:THREE.REVISION,buildings:items.length,webgl:!!renderer.getContext(),flyZ:Math.round(flyZ)});
})();
