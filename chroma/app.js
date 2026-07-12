/* CHROMA — a field of rings/washers tumbling in 3D, with switchable real materials
   (chrome / gold / glass-transmission / matte) reflecting a studio environment. Three.js r128. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
const bg=new THREE.Color(0xeceae4); scene.background=bg;
const cam=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.1,100); cam.position.set(0,0,12);

/* studio environment (equirect gradient) for reflections */
function envTex(){ const c=document.createElement('canvas'); c.width=512; c.height=256; const g=c.getContext('2d');
  const lg=g.createLinearGradient(0,0,0,256); lg.addColorStop(0,'#ffffff'); lg.addColorStop(.42,'#eef0f4'); lg.addColorStop(.62,'#e6ded2'); lg.addColorStop(1,'#c9ccd4');
  g.fillStyle=lg; g.fillRect(0,0,512,256);
  // soft light blobs for interesting reflections
  [['#ffffff',150,60,90],['#ffe9cf',380,80,70],['#dfe6ff',260,180,80]].forEach(b=>{ const rg=g.createRadialGradient(b[1],b[2],0,b[1],b[2],b[3]); rg.addColorStop(0,b[0]); rg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=rg; g.beginPath(); g.arc(b[1],b[2],b[3],0,7); g.fill(); });
  const t=new THREE.CanvasTexture(c); t.mapping=THREE.EquirectangularReflectionMapping; t.encoding=THREE.sRGBEncoding; return t; }
const _pm=new THREE.PMREMGenerator(renderer); const _eq=envTex();
scene.environment=_pm.fromEquirectangular(_eq).texture; _eq.dispose(); _pm.dispose();

/* lights */
scene.add(new THREE.HemisphereLight(0xffffff,0x999a9e,0.5));
const key=new THREE.DirectionalLight(0xffffff,1.2); key.position.set(5,8,6); scene.add(key);

/* objects: rings (torus) + washers (open cylinders) */
const world=new THREE.Group(); scene.add(world);
const geos=[ new THREE.TorusGeometry(0.62,0.24,20,48), new THREE.CylinderGeometry(0.6,0.6,0.5,44,1,true), new THREE.TorusGeometry(0.5,0.16,18,44) ];
const MATS={
  chrome:()=>new THREE.MeshStandardMaterial({color:0xf4f5f7,metalness:1,roughness:0.06,envMapIntensity:1.3}),
  gold:  ()=>new THREE.MeshStandardMaterial({color:0xffce85,metalness:1,roughness:0.14,envMapIntensity:1.25}),
  glass: ()=>new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:0.04,transmission:1,ior:1.45,thickness:1.4,envMapIntensity:1,transparent:true}),
  matte: ()=>new THREE.MeshStandardMaterial({color:0x15503a,metalness:0,roughness:0.55,envMapIntensity:.4})
};
let curMat=MATS.chrome();
const N=innerWidth<720?24:38, meshes=[];
for(let i=0;i<N;i++){ const g=geos[i%geos.length]; const m=new THREE.Mesh(g,curMat);
  const s=0.6+Math.random()*1.1; m.scale.setScalar(s);
  m.position.set((Math.random()-0.5)*15,(Math.random()-0.5)*11,(Math.random()-0.5)*8);
  m.rotation.set(Math.random()*6.28,Math.random()*6.28,Math.random()*6.28);
  m.userData={sx:(Math.random()-0.5)*0.4,sy:(Math.random()-0.5)*0.4,sz:(Math.random()-0.5)*0.4,ph:Math.random()*6.28,drift:0.3+Math.random()*0.5};
  world.add(m); meshes.push(m); }
function setMat(name){ curMat=MATS[name](); meshes.forEach(m=>m.material=curMat); bg.set(name==='matte'?0xe4e7e2:0xeceae4); }
setMat('chrome');

document.getElementById('mats').addEventListener('click',e=>{ const b=e.target.closest('.mbtn'); if(!b)return;
  [...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b)); setMat(b.dataset.m); });

/* drag orbit + auto tumble */
let yaw=0,pitch=0,vyaw=0,drag=false,lx=0,ly=0;
const isUI=t=>!!(t&&t.closest&&t.closest('a,button'));
addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||isUI(e.target))return; drag=true; lx=e.clientX; ly=e.clientY; canvas.classList.add('grab'); });
addEventListener('pointermove',e=>{ if(!drag)return; const dx=e.clientX-lx,dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; yaw+=dx*0.005; vyaw=dx*0.005; pitch=Math.max(-0.8,Math.min(0.8,pitch+dy*0.004)); },{passive:true});
addEventListener('pointerup',()=>{ if(drag){drag=false;canvas.classList.remove('grab');} });

function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();

let last=performance.now();
function frame(now){ requestAnimationFrame(frame); const dt=Math.min(0.05,(now-last)/1000); last=now; const t=now/1000;
  if(!drag){ yaw+=0.0008+vyaw; vyaw*=0.94; }
  world.rotation.y=yaw; world.rotation.x=pitch;
  for(const m of meshes){ m.rotation.x+=m.userData.sx*dt; m.rotation.y+=m.userData.sy*dt; m.rotation.z+=m.userData.sz*dt;
    m.position.y+=Math.sin(t*m.userData.drift+m.userData.ph)*0.0025; }
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__chroma=()=>({three:THREE.REVISION,objects:meshes.length,material:curMat.type,transmission:curMat.transmission||0,webgl:!!renderer.getContext()});
})();
